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
