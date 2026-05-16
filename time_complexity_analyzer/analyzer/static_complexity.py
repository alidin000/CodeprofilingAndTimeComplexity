"""
Static (AST-based) structure hints for Python submissions.

Empirical fitting (Phase 1) stays the source of truth for Big-O labels; this
module adds complementary structure signals for the UI and future ranking.
"""

from __future__ import annotations

import ast
import re
from typing import Any


def _extract_python_function_name(code: str) -> str | None:
    m = re.search(r"def\s+(\w+)\s*\(", code)
    return m.group(1) if m else None


def _max_loop_nesting_in_body(body: list[ast.stmt], base: int = 0) -> int:
    best = base
    for st in body:
        if isinstance(st, (ast.For, ast.While, ast.AsyncFor)):
            best = max(best, base + 1)
            best = max(best, _max_loop_nesting_in_body(st.body, base + 1))
            if isinstance(st, ast.For):
                best = max(best, _max_loop_nesting_in_body(st.orelse, base))
            elif isinstance(st, ast.AsyncFor):
                best = max(best, _max_loop_nesting_in_body(st.orelse, base))
            elif isinstance(st, ast.While):
                best = max(best, _max_loop_nesting_in_body(st.orelse, base))
        elif isinstance(st, ast.If):
            best = max(best, _max_loop_nesting_in_body(st.body, base))
            best = max(best, _max_loop_nesting_in_body(st.orelse, base))
        elif isinstance(st, ast.With):
            best = max(best, _max_loop_nesting_in_body(st.body, base))
        elif isinstance(st, ast.Try):
            best = max(best, _max_loop_nesting_in_body(st.body, base))
            for h in st.handlers:
                best = max(best, _max_loop_nesting_in_body(h.body, base))
            best = max(best, _max_loop_nesting_in_body(st.orelse, base))
            best = max(best, _max_loop_nesting_in_body(st.finalbody, base))
        elif isinstance(st, ast.Match):
            for case in st.cases:
                best = max(best, _max_loop_nesting_in_body(case.body, base))
        elif isinstance(st, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            best = max(best, _max_loop_nesting_in_body(st.body, base))
    return best


def _count_loops_in_body(body: list[ast.stmt]) -> tuple[int, int]:
    fors = whiles = 0
    for st in body:
        if isinstance(st, ast.For):
            fors += 1
            fb, wb = _count_loops_in_body(st.body)
            fo, wo = _count_loops_in_body(st.orelse)
            fors += fb + fo
            whiles += wb + wo
        elif isinstance(st, ast.AsyncFor):
            fors += 1
            fb, wb = _count_loops_in_body(st.body)
            fo, wo = _count_loops_in_body(st.orelse)
            fors += fb + fo
            whiles += wb + wo
        elif isinstance(st, ast.While):
            whiles += 1
            fb, wb = _count_loops_in_body(st.body)
            fo, wo = _count_loops_in_body(st.orelse)
            fors += fb + fo
            whiles += wb + wo
        elif isinstance(st, ast.If):
            fb, wb = _count_loops_in_body(st.body)
            fo, wo = _count_loops_in_body(st.orelse)
            fors += fb + fo
            whiles += wb + wo
        elif isinstance(st, ast.With):
            fb, wb = _count_loops_in_body(st.body)
            fors += fb
            whiles += wb
        elif isinstance(st, ast.Try):
            for sub in [st.body, st.orelse, st.finalbody]:
                fb, wb = _count_loops_in_body(sub)
                fors += fb
                whiles += wb
            for h in st.handlers:
                fb, wb = _count_loops_in_body(h.body)
                fors += fb
                whiles += wb
        elif isinstance(st, ast.Match):
            for case in st.cases:
                fb, wb = _count_loops_in_body(case.body)
                fors += fb
                whiles += wb
        elif isinstance(st, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            fb, wb = _count_loops_in_body(st.body)
            fors += fb
            whiles += wb
    return fors, whiles


class _RecursionVisitor(ast.NodeVisitor):
    def __init__(self, name: str) -> None:
        self.name = name
        self.seen = False

    def visit_Call(self, node: ast.Call) -> None:
        func = node.func
        if isinstance(func, ast.Name) and func.id == self.name:
            self.seen = True
        self.generic_visit(node)


def analyze_python_static(code: str) -> dict[str, Any]:
    """
    Parse Python source and return structural hints.

    Returns a dict with ``ok: bool``; on failure ``error`` explains why.
    """
    fn = _extract_python_function_name(code)
    if not fn:
        return {
            "ok": False,
            "language": "python",
            "error": "No top-level function definition (def name(...)) found.",
        }

    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return {"ok": False, "language": "python", "error": str(e)}

    target: ast.FunctionDef | None = None
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name == fn:
            target = node
            break
    if target is None:
        for node in tree.body:
            if isinstance(node, ast.FunctionDef):
                target = node
                break

    if target is None:
        return {
            "ok": False,
            "language": "python",
            "error": "No function body found in module AST.",
        }

    max_nest = _max_loop_nesting_in_body(target.body, 0)
    for_loops, while_loops = _count_loops_in_body(target.body)
    rec = _RecursionVisitor(target.name)
    rec.visit(target)

    hints: list[str] = []
    if max_nest >= 2:
        hints.append(
            "Nested loops detected; worst-case growth often scales with "
            "n raised to the nesting depth (subject to loop bounds)."
        )
    elif max_nest == 1 and (for_loops + while_loops) == 1:
        hints.append(
            "Single loop over input; many correct implementations are O(n) "
            "per call unless the body hides extra passes."
        )
    if rec.seen:
        hints.append(
            "Direct recursion detected; empirical cost may reflect recursion "
            "depth and call count, not only loop structure."
        )

    return {
        "ok": True,
        "language": "python",
        "function": target.name,
        "max_loop_nesting": max_nest,
        "for_loops": for_loops,
        "while_loops": while_loops,
        "recursion_direct": rec.seen,
        "hints": hints,
    }
