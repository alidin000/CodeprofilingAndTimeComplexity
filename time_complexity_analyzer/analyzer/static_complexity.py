"""
Static (AST-based) structure hints for Python submissions.

Empirical fitting remains the headline Big-O label; this module adds a conservative
``structural_bound_model`` from loop nesting so the UI can compare structure vs benches.
"""

from __future__ import annotations

import ast
import re
import sys
import textwrap
from typing import Any, Optional


def _extract_python_function_name(code: str) -> Optional[str]:
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
        elif sys.version_info >= (3, 10) and isinstance(st, ast.Match):
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
        elif sys.version_info >= (3, 10) and isinstance(st, ast.Match):
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


def _structural_bound_model(max_nesting: int) -> str:
    """Conservative polynomial-style bound from counted loop depth (Python hints only)."""
    if max_nesting <= 0:
        return "constant"
    if max_nesting == 1:
        return "linear"
    if max_nesting == 2:
        return "quadratic"
    return "cubic"


def _stmt_end_lineno(node: ast.AST) -> int:
    return int(getattr(node, "end_lineno", None) or getattr(node, "lineno", 1) or 1)


def _collect_loop_intervals(body: list[ast.stmt], base_depth: int, out: list[tuple[int, int, int]]) -> None:
    """Append (start_lineno, end_lineno, depth) for each loop region (1-based inclusive, same frame as ``ast.parse``)."""
    for st in body:
        if isinstance(st, (ast.For, ast.While, ast.AsyncFor)):
            depth = base_depth + 1
            lo = int(getattr(st, "lineno", 1) or 1)
            hi = _stmt_end_lineno(st)
            out.append((lo, hi, depth))
            _collect_loop_intervals(st.body, depth, out)
            if isinstance(st, ast.For):
                _collect_loop_intervals(st.orelse, base_depth, out)
            elif isinstance(st, ast.AsyncFor):
                _collect_loop_intervals(st.orelse, base_depth, out)
            elif isinstance(st, ast.While):
                _collect_loop_intervals(st.orelse, base_depth, out)
        elif isinstance(st, ast.If):
            _collect_loop_intervals(st.body, base_depth, out)
            _collect_loop_intervals(st.orelse, base_depth, out)
        elif isinstance(st, ast.With):
            _collect_loop_intervals(st.body, base_depth, out)
        elif isinstance(st, ast.Try):
            _collect_loop_intervals(st.body, base_depth, out)
            for h in st.handlers:
                _collect_loop_intervals(h.body, base_depth, out)
            _collect_loop_intervals(st.orelse, base_depth, out)
            _collect_loop_intervals(st.finalbody, base_depth, out)
        elif sys.version_info >= (3, 10) and isinstance(st, ast.Match):
            for case in st.cases:
                _collect_loop_intervals(case.body, base_depth, out)
        elif isinstance(st, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            _collect_loop_intervals(st.body, base_depth, out)


def _per_line_loop_bounds(
    target: ast.FunctionDef, intervals: list[tuple[int, int, int]]
) -> dict[str, dict[str, Any]]:
    """
    Max enclosing loop depth per source line (1-based lineno in parsed block).

    Keys are **0-based string indices** into ``textwrap.dedent(code).strip().splitlines()`` so they align
    with Python harness ``line_info_total`` keys in ``analyzer_python``.
    """
    per_line: dict[str, dict[str, Any]] = {}
    lo = int(getattr(target, "lineno", 1) or 1)
    hi = _stmt_end_lineno(target)
    for ln in range(lo, hi + 1):
        max_d = 0
        for s, e, d in intervals:
            if s <= ln <= e:
                max_d = max(max_d, d)
        idx = ln - 1
        per_line[str(idx)] = {
            "max_loop_nesting": max_d,
            "structural_bound_model": _structural_bound_model(max_d),
        }
    return per_line


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

    block = textwrap.dedent(code).strip()
    try:
        tree = ast.parse(block)
    except SyntaxError as e:
        return {"ok": False, "language": "python", "error": str(e)}

    target: Optional[ast.FunctionDef] = None
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

    structural_bound_model = _structural_bound_model(max_nest)

    loop_intervals: list[tuple[int, int, int]] = []
    _collect_loop_intervals(target.body, 0, loop_intervals)
    per_line = _per_line_loop_bounds(target, loop_intervals)

    return {
        "ok": True,
        "language": "python",
        "function": target.name,
        "max_loop_nesting": max_nest,
        "structural_bound_model": structural_bound_model,
        "for_loops": for_loops,
        "while_loops": while_loops,
        "recursion_direct": rec.seen,
        "hints": hints,
        "per_line": per_line,
        "per_line_indexing": "0_based_dedented_body",
    }
