"""
Static structure hints for Java / C++ submissions.

When ``tree-sitter`` and language grammars are installed, loop nesting is derived
from the syntax tree; otherwise (or on parse errors) analysis falls back to a
brace-aware keyword scan (not a full AST).

TCA snippets are usually a single method. Line keys match ``analyzer.analyzer`` /
``analyzer_cpp``: **1-based** indices into ``code.strip().splitlines()`` (same as
``lineInfoTotal`` keys in the harness).
"""

from __future__ import annotations

import re
from typing import Any, Optional

from analyzer.static_complexity import _structural_bound_model
from analyzer.ts_static_java_cpp import analyze_cpp_tree_sitter, analyze_java_tree_sitter

PER_LINE_INDEXING_JAVA_CPP = "1_based_stripped_body"


def _extract_java_method_name(code: str) -> Optional[str]:
    m = re.search(r"public\s+(?:static\s+)?\w+\s+(\w+)\s*\(", code)
    return m.group(1) if m else None


def _extract_cpp_method_name(code: str) -> Optional[str]:
    m = re.search(r"\b(?:\w+\s+)+(\w+)\s*\(", code)
    return m.group(1) if m else None


def _scan_brace_style(
    code: str,
    *,
    dialect: str,
    function_name: Optional[str],
) -> dict[str, Any]:
    text = code.strip()
    if not text:
        return {"ok": False, "language": dialect, "error": "Empty source."}

    n = len(text)
    i = 0
    brace_depth = 0
    fors = whiles = dos = 0
    # (1-based line number, brace_depth at keyword) for each loop header
    loop_hits: list[tuple[int, int]] = []

    state = "NORMAL"

    def line_no(pos: int) -> int:
        return text.count("\n", 0, pos) + 1

    def is_word_char(c: str) -> bool:
        return c.isalnum() or c == "_"

    while i < n:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < n else ""

        if state == "NORMAL":
            if ch == "/" and nxt == "/":
                state = "LINE_COMMENT"
                i += 2
                continue
            if ch == "/" and nxt == "*":
                state = "BLOCK_COMMENT"
                i += 2
                continue
            if ch == '"':
                state = "STRING_DQ"
                i += 1
                continue
            if ch == "'":
                state = "CHAR_LIT"
                i += 1
                continue

            if ch == "{":
                brace_depth += 1
                i += 1
                continue
            if ch == "}":
                brace_depth = max(0, brace_depth - 1)
                i += 1
                continue

            if ch.isalpha() or ch == "_":
                j = i
                while j < n and is_word_char(text[j]):
                    j += 1
                word = text[i:j]
                before = text[i - 1] if i > 0 else " "
                after = text[j] if j < n else " "
                if not is_word_char(before) and not is_word_char(after):
                    lw = word.lower()
                    if lw == "for":
                        fors += 1
                        loop_hits.append((line_no(i), brace_depth))
                    elif lw == "while":
                        whiles += 1
                        loop_hits.append((line_no(i), brace_depth))
                    elif lw == "do":
                        dos += 1
                        loop_hits.append((line_no(i), brace_depth))
                i = j
                continue

            i += 1
            continue

        if state == "LINE_COMMENT":
            if ch == "\n":
                state = "NORMAL"
            i += 1
            continue

        if state == "BLOCK_COMMENT":
            if ch == "*" and nxt == "/":
                state = "NORMAL"
                i += 2
                continue
            i += 1
            continue

        if state == "STRING_DQ":
            if ch == "\\" and i + 1 < n:
                i += 2
                continue
            if ch == '"':
                state = "NORMAL"
            i += 1
            continue

        if state == "CHAR_LIT":
            if ch == "\\" and i + 1 < n:
                i += 2
                continue
            if ch == "'":
                state = "NORMAL"
            i += 1
            continue

    max_nest = max((d for _, d in loop_hits), default=0)
    structural = _structural_bound_model(max_nest)

    per_line: dict[str, dict[str, Any]] = {}
    for ln, d in loop_hits:
        key = str(ln)
        prev = per_line.get(key, {}).get("max_loop_nesting", 0)
        md = max(prev, d)
        per_line[key] = {
            "max_loop_nesting": md,
            "structural_bound_model": _structural_bound_model(md),
        }

    hints: list[str] = []
    if max_nest >= 2:
        hints.append(
            "Nested loops detected (lexical scan); growth often scales with nesting depth "
            "unless loop bounds shrink the effective work."
        )
    elif max_nest == 1 and fors + whiles + dos == 1:
        hints.append(
            "Single explicit loop; many implementations are O(n) per call unless the body hides extra passes."
        )
    if max_nest == 0 and fors + whiles + dos == 0:
        hints.append("No for/while/do keywords in the scanned body (unusual control flow may be missed).")

    recursion = False
    if function_name:
        if dialect == "java":
            recursion = bool(re.search(rf"\bthis\.{re.escape(function_name)}\s*\(", text))
        else:
            recursion = bool(re.search(rf"\b{re.escape(function_name)}\s*\(", text))
    if recursion:
        hints.append(
            "Possible direct recursion on the instrumented method name; empirical cost may reflect depth and call count."
        )

    return {
        "ok": True,
        "language": dialect,
        "function": function_name,
        "max_loop_nesting": max_nest,
        "structural_bound_model": structural,
        "for_loops": fors,
        "while_loops": whiles + dos,
        "recursion_direct": recursion,
        "hints": hints,
        "per_line": per_line,
        "per_line_indexing": PER_LINE_INDEXING_JAVA_CPP,
        "scan_note": "Brace/keyword scan (not a full Java/C++ AST); for-without-brace bodies may be underestimated. "
        "AST chips on the runway appear only on lines that contain a loop keyword.",
    }


def analyze_java_static(code: str) -> dict[str, Any]:
    fn = _extract_java_method_name(code)
    if not fn:
        return {
            "ok": False,
            "language": "java",
            "error": "No Java method signature (public type name(...)) found.",
        }
    ts = analyze_java_tree_sitter(code, fn)
    if ts is not None:
        return ts
    return _scan_brace_style(code, dialect="java", function_name=fn)


def analyze_cpp_static(code: str) -> dict[str, Any]:
    fn = _extract_cpp_method_name(code)
    if not fn:
        return {
            "ok": False,
            "language": "cpp",
            "error": "No C++ function name (type name(...)) found.",
        }
    ts = analyze_cpp_tree_sitter(code, fn)
    if ts is not None:
        return ts
    return _scan_brace_style(code, dialect="cpp", function_name=fn)
