"""
Central tuning knobs for empirical complexity runs.

Warmup reduces JIT / allocator / branch-predictor cold-start bias.
BIC gamma > 1 slightly prefers simpler models when curves are noisy.
"""

# Executed per size before recorded trials (not written to output files).
WARMUP_RUNS = 3

# Multiplier on the parameter-count penalty in Gaussian BIC: k * gamma * log(n).
# 1.0 is classical; >1 favors lower-degree / fewer-parameter growth models.
BIC_PARAMETER_PENALTY_GAMMA = 1.12

# How repeated trials at the same (line, size) are collapsed for curve fitting.
PER_SIZE_AGGREGATION = "median"

# If the BIC gap (runner-up minus winner) is smaller than this, the pick is flagged ambiguous for UI.
# Units match Gaussian BIC used in graph_fitting (same n across candidates).
BIC_AMBIGUITY_MARGIN = 6.0

# Teaching / classroom mode: only these growth families participate in BIC selection.
TEACHING_MODEL_ALLOWLIST = frozenset(
    {
        "constant",
        "logarithmic",
        "linear",
        "log_linear",
        "quadratic",
        "cubic",
    }
)
