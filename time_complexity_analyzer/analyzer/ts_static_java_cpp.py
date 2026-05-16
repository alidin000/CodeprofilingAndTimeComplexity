"""
Tree-sitter static hints for Java / C++ (optional dependency).

Returns the same payload shape as ``static_java_cpp._scan_brace_style`` or
``None`` so callers can fall back to the brace/keyword lexer.
"""

from __future__ import annotations

import re
from typing import Any, Callable, Optional

from analyzer.static_complexity import _structural_bound_model

PER_LINE_INDEXING_JAVA_CPP = "1_based_stripped_body"

JAVA_LOOP_TYPES = frozenset(
    {
        "for_statement",
        "enhanced_for_statement",
        "while_statement",
        "do_statement",
    }
)
CPP_LOOP_TYPES = frozenset({"for_statement", "while_statement", "do_statement"})


def _ts_available() -> bool:
    try:
        import tree_sitter_cpp  # noqa: F401
        import tree_sitter_java  # noqa: F401
        from tree_sitter import Language, Parser  # noqa: F401
    except ImportError:
        return False
    return True


def _line_1based(node) -> int:
    return int(node.start_point[0]) + 1


def _java_method_name(md, source: bytes) -> Optional[str]:
    name_node = md.child_by_field_name("name")
    if name_node is None or name_node.type != "identifier":
        return None
    return source[name_node.start_byte : name_node.end_byte].decode("utf-8")


def _find_java_method(root, source: bytes, want: str):
    found = []

    def visit(n):
        if n.type == "method_declaration":
            got = _java_method_name(n, source)
            if got == want:
                found.append(n)
        for c in n.children:
            visit(c)

    visit(root)
    if len(found) == 1:
        return found[0]
    if len(found) > 1:
        return None
    if len(found) == 0 and root.type == "program" and len(root.children) == 1:
        only = root.children[0]
        if only.type == "method_declaration":
            return only
    return None


def _cpp_name_from_declarator(n, source: bytes) -> Optional[str]:
    if n is None:
        return None
    if n.type == "identifier":
        return source[n.start_byte : n.end_byte].decode("utf-8")
    if n.type == "qualified_identifier":
        for c in reversed(n.children):
            if c.type == "identifier":
                return source[c.start_byte : c.end_byte].decode("utf-8")
        return None
    if n.type == "field_identifier":
        return source[n.start_byte : n.end_byte].decode("utf-8")
    return None


def _cpp_function_simple_name(fd, source: bytes) -> Optional[str]:
    decl = fd.child_by_field_name("declarator")
    if decl is None:
        return None
    stack = [decl]
    while stack:
        n = stack.pop()
        if n.type == "function_declarator":
            inner = n.child_by_field_name("declarator")
            name = _cpp_name_from_declarator(inner, source)
            if name:
                return name
            if inner is not None:
                stack.append(inner)
            continue
        for c in reversed(n.children):
            stack.append(c)
    return None


def _find_cpp_function(root, source: bytes, want: str):
    found = []

    def visit(n):
        if n.type == "function_definition":
            got = _cpp_function_simple_name(n, source)
            if got == want:
                found.append(n)
        for c in n.children:
            visit(c)

    visit(root)
    if len(found) == 1:
        return found[0]
    if len(found) > 1:
        return None
    if (
        len(found) == 0
        and root.type == "translation_unit"
        and len(root.children) == 1
    ):
        only = root.children[0]
        if only.type == "function_definition":
            return only
    return None


def _visit_shallow_first(
    node,
    loop_ancestor_depth: int,
    loop_types: frozenset[str],
    state: dict[str, Any],
    recurse: Callable[..., None],
) -> None:
    for child in node.children:
        if child.type in loop_types:
            d = loop_ancestor_depth + 1
            ln = _line_1based(child)
            key = str(ln)
            prev = state["per_line"].get(key, {}).get("max_loop_nesting", 0)
            state["per_line"][key] = {
                "max_loop_nesting": max(prev, d),
                "structural_bound_model": _structural_bound_model(max(prev, d)),
            }
            state["max_loop_nesting"] = max(state["max_loop_nesting"], d)
            if child.type in ("for_statement", "enhanced_for_statement"):
                state["for_loops"] += 1
            else:
                state["while_loops"] += 1
            recurse(child, d, loop_types, state, recurse)
        else:
            recurse(child, loop_ancestor_depth, loop_types, state, recurse)


def _collect_from_body(
    body, *, dialect: str, function_name: Optional[str], text: str
) -> dict[str, Any]:
    loop_types = JAVA_LOOP_TYPES if dialect == "java" else CPP_LOOP_TYPES
    state: dict[str, Any] = {
        "max_loop_nesting": 0,
        "for_loops": 0,
        "while_loops": 0,
        "per_line": {},
    }
    _visit_shallow_first(body, 0, loop_types, state, _visit_shallow_first)

    max_nest = int(state["max_loop_nesting"])
    structural = _structural_bound_model(max_nest)
    for k in state["per_line"]:
        depth = state["per_line"][k]["max_loop_nesting"]
        state["per_line"][k]["structural_bound_model"] = _structural_bound_model(depth)

    hints: list[str] = []
    if max_nest >= 2:
        hints.append(
            "Nested loops detected (syntax tree); growth often scales with nesting depth "
            "unless loop bounds shrink the effective work."
        )
    elif max_nest == 1 and state["for_loops"] + state["while_loops"] == 1:
        hints.append(
            "Single explicit loop; many implementations are O(n) per call unless the body "
            "hides extra passes."
        )
    if max_nest == 0 and state["for_loops"] + state["while_loops"] == 0:
        hints.append(
            "No for/while/do loop nodes in the parsed body (unusual control flow may be missed)."
        )

    recursion = False
    if function_name:
        if dialect == "java":
            recursion = bool(
                re.search(rf"\bthis\.{re.escape(function_name)}\s*\(", text)
            )
        else:
            recursion = bool(re.search(rf"\b{re.escape(function_name)}\s*\(", text))
    if recursion:
        hints.append(
            "Possible direct recursion on the instrumented method name; empirical cost may "
            "reflect depth and call count."
        )

    return {
        "ok": True,
        "language": dialect,
        "function": function_name,
        "max_loop_nesting": max_nest,
        "structural_bound_model": structural,
        "for_loops": state["for_loops"],
        "while_loops": state["while_loops"],
        "recursion_direct": recursion,
        "hints": hints,
        "per_line": state["per_line"],
        "per_line_indexing": PER_LINE_INDEXING_JAVA_CPP,
        "scan_note": (
            "Tree-sitter syntax tree for loop nesting; falls back to brace/keyword scan "
            "when parsers are unavailable or the tree has errors."
        ),
    }


def analyze_java_tree_sitter(code: str, function_name: str) -> Optional[dict[str, Any]]:
    if not _ts_available():
        return None
    from tree_sitter import Language, Parser
    import tree_sitter_java as tsj

    text = code.strip()
    if not text:
        return None
    source = text.encode("utf-8")
    lang = Language(tsj.language())
    tree = Parser(lang).parse(source)
    if tree.root_node.has_error:
        return None
    md = _find_java_method(tree.root_node, source, function_name)
    if md is None:
        return None
    body = md.child_by_field_name("body")
    if body is None or body.type != "block":
        return None
    if body.has_error:
        return None
    return _collect_from_body(
        body, dialect="java", function_name=function_name, text=text
    )


def analyze_cpp_tree_sitter(code: str, function_name: str) -> Optional[dict[str, Any]]:
    if not _ts_available():
        return None
    from tree_sitter import Language, Parser
    import tree_sitter_cpp as tsc

    text = code.strip()
    if not text:
        return None
    source = text.encode("utf-8")
    lang = Language(tsc.language())
    tree = Parser(lang).parse(source)
    if tree.root_node.has_error:
        return None
    fd = _find_cpp_function(tree.root_node, source, function_name)
    if fd is None:
        return None
    body = fd.child_by_field_name("body")
    if body is None:
        return None
    if body.has_error:
        return None
    return _collect_from_body(
        body, dialect="cpp", function_name=function_name, text=text
    )
