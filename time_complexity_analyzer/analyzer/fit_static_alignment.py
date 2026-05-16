"""
Compare empirical best-fit growth vs a conservative structural bound from static hints.

The bound comes from Python AST loop nesting, or a Java/C++ lexical loop/brace scan—not a
proof of worst-case Θ; it is a coarse prior so the UI can flag when benches and code shape disagree.
"""

from __future__ import annotations

from typing import Any, Optional

# Higher rank ≈ faster asymptotic growth on typical algorithm benches.
_MODEL_GROWTH_RANK: dict[str, int] = {
    "constant": 0,
    "inverse_ackermann": 2,
    "iterated_logarithmic": 4,
    "log_logarithmic": 6,
    "logarithmic": 10,
    "polylogarithmic": 14,
    "fractional_power": 18,
    "linear": 30,
    "log_linear": 34,
    "quasilinear": 36,
    "quadratic": 50,
    "cubic": 60,
    "polynomial": 65,
    "quasi_polynomial": 78,
    "subexponential": 88,
    "exponential": 95,
    "polynomial_linear_exponent": 96,
    "factorial": 105,
    "double_exponential": 110,
}


def _rank(model: Optional[str]) -> int:
    if not model:
        return 25
    return int(_MODEL_GROWTH_RANK.get(model, 40))


def _message_for_status(
    status: str,
    empirical: str,
    bound: str,
    recursion_direct: bool,
) -> str:
    if status == "unavailable":
        return "Structural comparison needs a successful static scan (Python AST or Java/C++ loop scan)."
    if status == "incomplete":
        return "Could not compare empirical fit to structure (missing model or bound)."
    if status == "aligned":
        base = (
            f"The empirical pick ({empirical}) is in the same ballpark as a nesting-based "
            f"bound ({bound}) for this snippet."
        )
        return base + (" Recursion is present — limits still depend on inputs and depth." if recursion_direct else "")
    if status == "empirical_milder":
        return (
            f"The bench curve looks gentler ({empirical}) than loop nesting alone would suggest "
            f"({bound}). Inner work may be bounded, the harness may not hit worst paths, or noise dominated."
        )
    if status == "empirical_harsher":
        return (
            f"The bench curve looks steeper ({empirical}) than nesting-only structure suggests ({bound}). "
            f"Check recursion depth, hidden library cost, or an unstable / sparse fit."
        )
    return ""


def attach_fit_static_alignment(payload: dict[str, Any]) -> None:
    """
    Mutate ``payload`` (parse_and_analyze + static_analysis shape) with key
    ``fit_static_alignment`` for the overall function fit.
    """
    static = payload.get("static_analysis") or {}
    fn = payload.get("function") or {}
    best = fn.get("best_fit") or {}
    empirical = best.get("model")

    if not static.get("ok"):
        payload["fit_static_alignment"] = {
            "status": "unavailable",
            "reason": "static_not_ok",
            "message": _message_for_status("unavailable", "", "", False),
        }
        return

    bound = static.get("structural_bound_model")
    if not empirical or not bound:
        payload["fit_static_alignment"] = {
            "status": "incomplete",
            "empirical_model": empirical,
            "structural_bound_model": bound,
            "message": _message_for_status("incomplete", empirical or "", bound or "", False),
        }
        return

    re = _rank(empirical)
    rb = _rank(bound)
    delta = re - rb
    recursion_direct = bool(static.get("recursion_direct"))

    # Wider "aligned" band when recursion blurs worst-case structure.
    mild_threshold = 18 if recursion_direct else 14
    harsh_threshold = 18 if recursion_direct else 14

    if delta <= -mild_threshold:
        status = "empirical_milder"
    elif delta >= harsh_threshold:
        status = "empirical_harsher"
    else:
        status = "aligned"

    payload["fit_static_alignment"] = {
        "status": status,
        "empirical_model": empirical,
        "structural_bound_model": bound,
        "rank_delta": delta,
        "recursion_direct": recursion_direct,
        "message": _message_for_status(status, empirical, bound, recursion_direct),
    }
