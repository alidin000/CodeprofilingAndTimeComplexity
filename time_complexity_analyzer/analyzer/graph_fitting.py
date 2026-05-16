import ast
import logging
from typing import Optional

import numpy as np
from scipy.optimize import least_squares
from scipy.special import factorial

# Keep exp / exp2 arguments in range so least_squares never sees inf residuals at the initial point.
_EXP_CLIP = 709.0
_EXP2_CLIP = 1020.0

from analyzer.measurement_config import (
    BIC_AMBIGUITY_MARGIN,
    BIC_PARAMETER_PENALTY_GAMMA,
    PER_SIZE_AGGREGATION,
    WARMUP_RUNS,
)

def constant(x, c):
    return c

def inverse_ackermann(x, a):
    return a * np.log(np.log(np.log(x + 1) + 1) + 1)

def iterated_logarithmic(x, a, b):
    return a * np.log(np.log(x + 1)) + b

def log_logarithmic(x, a, b):
    return a * np.log(np.log(x)) + b

def logarithmic(x, a, b):
    return a * np.log(x) + b

def polylogarithmic(x, a, b, c):
    return a * (np.log(x)**b) + c

def fractional_power(x, a, b):
    return a * (x ** b)

def linear(x, m, c):
    return m * x + c

def log_linear(x, a, b):
    return a * x * np.log(x) + b

def quasilinear(x, a, b, c):
    return a * x * (np.log(x) ** b) + c

def quadratic(x, a, b, c):
    return a * x**2 + b * x + c

def cubic(x, a, b, c, d):
    return a * x**3 + b * x**2 + c * x + d

def polynomial(x, *coeffs):
    return sum(c * x**i for i, c in enumerate(reversed(coeffs)))

def quasi_polynomial(x, a, b):
    lx = np.log(np.asarray(x, dtype=float))
    expo = np.clip(lx ** np.asarray(b, dtype=float), -_EXP_CLIP, _EXP_CLIP)
    return np.asarray(a, dtype=float) * np.exp(expo)

def subexponential(x, a, b):
    inner = np.asarray(x, dtype=float) ** np.asarray(b, dtype=float)
    inner = np.clip(inner, -_EXP_CLIP, _EXP_CLIP)
    return np.asarray(a, dtype=float) * np.exp(inner)

def exponential(x, a, b):
    t = np.clip(np.asarray(b, dtype=float) * np.asarray(x, dtype=float), -_EXP_CLIP, _EXP_CLIP)
    return np.asarray(a, dtype=float) * np.exp(t)

def factorial_complexity(x, a):
    return a * factorial(x)

def polynomial_linear_exponent(x, a, b):
    """a * 2^(b x); clip exponent so optimizers never hit inf for large n."""
    t = np.clip(np.asarray(b, dtype=float) * np.asarray(x, dtype=float), -_EXP2_CLIP, _EXP2_CLIP)
    return np.asarray(a, dtype=float) * np.exp2(t)

def double_exponential(x, a, b):
    """a * 2^(2^x); clip so float64 stays finite on typical bench sizes."""
    xa = np.asarray(x, dtype=float)
    xa_c = np.clip(xa, -100.0, 9.5)
    inner = np.exp2(xa_c)
    inner_c = np.clip(inner, 0.0, 1022.0)
    return np.asarray(a, dtype=float) * np.exp2(inner_c)

def error_function(params, x, y, model):
    return model(x, *params) - y

models = {
    'constant': {'func': constant, 'initial_guess': [1]},
    'inverse_ackermann': {'func': inverse_ackermann, 'initial_guess': [0.1]},
    'iterated_logarithmic': {'func': iterated_logarithmic, 'initial_guess': [1, 1]},
    'log_logarithmic': {'func': log_logarithmic, 'initial_guess': [1, 1]},
    'logarithmic': {'func': logarithmic, 'initial_guess': [1, 1]},
    'polylogarithmic': {'func': polylogarithmic, 'initial_guess': [1, 1, 1]},
    'fractional_power': {'func': fractional_power, 'initial_guess': [1, 0.5]},
    'linear': {'func': linear, 'initial_guess': [10, 0]},
    'log_linear': {'func': log_linear, 'initial_guess': [1, 1]},
    'quasilinear': {'func': quasilinear, 'initial_guess': [1, 1, 1]},
    'quadratic': {'func': quadratic, 'initial_guess': [1, 1, 1]},
    'cubic': {'func': cubic, 'initial_guess': [1, 1, 1, 1]},
    'polynomial': {'func': polynomial, 'initial_guess': [1, 1, 1, 1]},
    'quasi_polynomial': {'func': quasi_polynomial, 'initial_guess': [1, 1]},
    'subexponential': {'func': subexponential, 'initial_guess': [1, 0.5]},
    'exponential': {'func': exponential, 'initial_guess': [1, 1e-6]},
    'factorial': {'func': factorial_complexity, 'initial_guess': [1]},
    'polynomial_linear_exponent': {'func': polynomial_linear_exponent, 'initial_guess': [1, 1e-8]},
    'double_exponential': {'func': double_exponential, 'initial_guess': [1, 1]},
}

time_complexity_notation = {
    'constant': 'O(1)',
    'inverse_ackermann': 'O(α(n))',
    'iterated_logarithmic': 'O(log* n)',
    'log_logarithmic': 'O(log log n)',
    'logarithmic': 'O(log n)',
    'polylogarithmic': 'O((log n)^k)',
    'fractional_power': 'O(n^c)',
    'linear': 'O(n)',
    'log_linear': 'O(n log n)',
    'quasilinear': 'O(n log^k n)',
    'quadratic': 'O(n^2)',
    'cubic': 'O(n^3)',
    'polynomial': 'O(n^k)',
    'quasi_polynomial': 'O(exp((log n)^k))',
    'subexponential': 'O(exp(n^c))',
    'exponential': 'O(2^n)',
    'factorial': 'O(n!)',
    'polynomial_linear_exponent': 'O(2^(O(n)))',
    'double_exponential': 'O(2^(2^n))',
}

def parse_output_file(file_path):
    """
    Parse analyzer output: per-line execution counts (dict lines) and function wall-clock times (ns).
    """
    line_exec_times = {}
    function_exec_times = []

    with open(file_path, 'r', encoding='utf-8') as file:
        for line in file:
            stripped_line = line.strip()

            if not stripped_line:
                continue

            if stripped_line.startswith('Average Function execution time:') or stripped_line.startswith(
                'Function execution time:'
            ):
                try:
                    token = stripped_line.split(': ', 1)[1].split()[0]
                    function_exec_times.append(float(token))
                except (ValueError, IndexError):
                    logging.warning("Skipping invalid execution time entry: %s", line.strip())
                continue

            if stripped_line.startswith('{') and stripped_line.endswith('}'):
                try:
                    exec_times = ast.literal_eval(stripped_line.replace('=', ':'))
                    for line_num, count in exec_times.items():
                        if line_num not in line_exec_times:
                            line_exec_times[line_num] = []
                        line_exec_times[line_num].append(float(count))
                except (SyntaxError, ValueError):
                    logging.warning("Skipping invalid line execution entry: %s", line.strip())
                continue

    return line_exec_times, function_exec_times



def simplify_model(name, params, tol=1e-6):
    """
    Simplifies a model by reducing its complexity if leading coefficients are negligible.

    :param name: Name of the model (e.g., 'cubic', 'quadratic').
    :param params: Parameters of the model (list of coefficients).
    :param tol: Tolerance for considering a parameter negligible.
    :return: Simplified model name and its parameters.
    """
    if params is None:
        return name, params
    # Avoid truthiness on ndarray (ambiguous); normalize to a flat list of floats.
    p = np.asarray(params, dtype=float).ravel().tolist()
    if len(p) == 0:
        return name, p

    # Model simplifications
    if name == 'cubic' and np.isclose(p[0], 0, atol=tol):
        return simplify_model('quadratic', p[1:], tol)
    if name == 'quadratic' and np.isclose(p[0], 0, atol=tol):
        return simplify_model('linear', p[1:], tol)
    if name == 'linear' and np.isclose(p[0], 0, atol=tol):
        return simplify_model('constant', p[1:], tol)
    if name == 'exponential' and len(p) > 1 and np.isclose(p[1], 0, atol=tol):
        return simplify_model('constant', p[:1], tol)
    if name == 'polylogarithmic' and len(p) > 1 and np.isclose(p[1], 0, atol=tol):
        return simplify_model('logarithmic', p[:2], tol)
    if name == 'polynomial' and len(p) > 1 and np.isclose(p[0], 0, atol=tol):
        return simplify_model('polynomial', p[1:], tol)
    if name == 'factorial' and np.isclose(p[0], 0, atol=tol):
        return simplify_model('constant', p[:1], tol)
    if name == 'double_exponential' and len(p) > 1 and np.isclose(p[1], 0, atol=tol):
        return simplify_model('exponential', p[:1], tol)
    if name == 'polynomial_linear_exponent' and len(p) > 1 and np.isclose(p[1], 0, atol=tol):
        return simplify_model('polynomial', p[:1], tol)
    if name == 'log_logarithmic' and np.isclose(p[0], 0, atol=tol):
        return simplify_model('constant', p[1:], tol)
    if name == 'logarithmic' and np.isclose(p[0], 0, atol=tol):
        return simplify_model('constant', p[1:], tol)
    if name == 'quasi_polynomial' and len(p) > 1 and np.isclose(p[1], 0, atol=tol):
        return simplify_model('constant', p[:1], tol)
    if name == 'subexponential' and len(p) > 1 and np.isclose(p[1], 0, atol=tol):
        return simplify_model('exponential', p[:1], tol)
    if name == 'log_linear' and np.isclose(p[0], 0, atol=tol):
        return simplify_model('constant', p[1:], tol)
    if name == 'quasilinear' and np.isclose(p[0], 0, atol=tol):
        return simplify_model('logarithmic', p[1:], tol)

    return name, p


def _bic_gaussian(n: int, rss: float, k: int, gamma: float = BIC_PARAMETER_PENALTY_GAMMA) -> float:
    """
    Gaussian linear-model BIC (same n across candidates): n*ln(RSS/n) + gamma*k*ln(n).

    Lower is better. Constant terms omitted (identical for fixed n).
    ``gamma`` > 1 slightly prefers simpler (fewer-parameter) growth laws on noisy benches.
    """
    if n <= 0 or k < 0:
        return np.inf
    denom = max(n, 1)
    rss = max(float(rss), 1e-300)
    return float(n * np.log(rss / denom) + float(gamma) * k * np.log(max(n, 2)))


def _fitting_bounds(name, n_params, x_max):
    """Tighten slope parameters on explosive models so |b| * x_max stays in float range."""
    x_max = max(float(x_max), 1.0)
    lo = [-1e6] * n_params
    hi = [1e6] * n_params
    if name == 'exponential' and n_params == 2:
        lim = _EXP_CLIP / x_max
        lo[1] = -lim
        hi[1] = lim
    elif name == 'polynomial_linear_exponent' and n_params == 2:
        lim = _EXP2_CLIP / x_max
        lo[1] = -lim
        hi[1] = lim
    return lo, hi


def _attach_fit_calibration(sorted_candidates, n, *, bic_ambiguity_margin=None):
    """
    Attach runner-up BIC, clearance, RSS comparison, and ambiguity flag to the winning fit dict.

    ``sorted_candidates`` is sorted by (bic, k) ascending (lower BIC is better).
    """
    margin = float(bic_ambiguity_margin) if bic_ambiguity_margin is not None else float(BIC_AMBIGUITY_MARGIN)
    if not sorted_candidates:
        raise ValueError('sorted_candidates must be non-empty')
    winner = dict(sorted_candidates[0])
    runner = sorted_candidates[1] if len(sorted_candidates) > 1 else None
    clearance = float(runner['bic'] - winner['bic']) if runner else None
    winner['fit_n_points'] = int(n)
    winner['runner_up_model'] = runner['model'] if runner else None
    winner['runner_up_bic'] = float(runner['bic']) if runner else None
    winner['runner_up_rss'] = float(runner['rss']) if runner and runner.get('rss') is not None else None
    wrss = winner.get('rss')
    rrss = winner.get('runner_up_rss')
    if wrss is not None and rrss is not None and float(wrss) > 1e-300:
        winner['rss_relative_runner_up'] = float(rrss) / float(wrss)
    else:
        winner['rss_relative_runner_up'] = None
    if clearance is not None and np.isfinite(clearance):
        winner['bic_clearance'] = clearance
    else:
        winner['bic_clearance'] = None
    winner['ambiguous'] = bool(
        runner is not None
        and clearance is not None
        and np.isfinite(clearance)
        and clearance < margin
    )
    return winner


def select_best_fitting_model(
    x_data,
    y_data,
    *,
    model_allowlist=None,
    bic_gamma=None,
    bic_ambiguity_margin=None,
):
    """
    Fit candidate growth models and pick the best by BIC (parsimony + fit).

    If no valid model is found during the fitting process,
    the fallback approach ensures that a model is still selected.

    Args:
        model_allowlist: optional set of model names to restrict candidates (teaching mode).
        bic_gamma: optional override for BIC parameter-count penalty (> 0).
        bic_ambiguity_margin: optional override for runner-up ambiguity margin.

    Returns:
        dict: best-fit model name, parameters, RSS, BIC, plus calibration keys:
        ``fit_n_points``, ``runner_up_model``, ``runner_up_bic``, ``runner_up_rss``,
        ``rss_relative_runner_up``, ``bic_clearance``,
        ``ambiguous`` (True when runner-up is within margin of winner).
    """
    gamma = BIC_PARAMETER_PENALTY_GAMMA
    if bic_gamma is not None:
        try:
            g = float(bic_gamma)
            if g > 0:
                gamma = g
        except (TypeError, ValueError):
            pass

    y_arr = np.asarray(y_data, dtype=float)
    if y_arr.size == 0:
        return {
            'model': 'constant',
            'params': [0.0],
            'rss': 0.0,
            'bic': 0.0,
            'k': 1,
            'fit_n_points': 0,
            'runner_up_model': None,
            'runner_up_bic': None,
            'runner_up_rss': None,
            'rss_relative_runner_up': None,
            'bic_clearance': None,
            'ambiguous': False,
        }
    if np.all(y_arr == 0):
        return {
            'model': 'constant',
            'params': [0.0],
            'rss': 0.0,
            'bic': 0.0,
            'k': 1,
            'fit_n_points': int(y_arr.size),
            'runner_up_model': None,
            'runner_up_bic': None,
            'runner_up_rss': None,
            'rss_relative_runner_up': None,
            'bic_clearance': None,
            'ambiguous': False,
        }
    if y_arr.size < 2:
        return _attach_fit_calibration(
            [
                {
                    'model': 'constant',
                    'params': [float(np.mean(y_arr))],
                    'rss': 0.0,
                    'bic': 0.0,
                    'k': 1,
                }
            ],
            int(y_arr.size),
            bic_ambiguity_margin=bic_ambiguity_margin,
        )

    n = int(y_arr.size)
    model_scores = []  # (bic, k, rss, name, params) pre-simplify
    fit_candidates = []

    for name, model in models.items():
        if model_allowlist is not None and name not in model_allowlist:
            continue
        try:
            if name in ['logarithmic', 'log_logarithmic', 'log_linear', 'quasilinear'] and np.any(x_data <= 0):
                continue
            if name in ['factorial', 'double_exponential'] and np.any(x_data > 20):
                continue

            x_max = float(np.max(np.asarray(x_data, dtype=float)))
            n_par = len(model['initial_guess'])
            b_lo, b_hi = _fitting_bounds(name, n_par, x_max)

            result = least_squares(
                error_function,
                model['initial_guess'],
                bounds=(b_lo, b_hi),
                args=(x_data, y_arr, model['func']),
                method='trf',
            )

            if not np.isfinite(result.fun).all():
                continue

            params = result.x
            rss_raw = float(np.sum(result.fun**2))
            k = int(len(params))
            bic = _bic_gaussian(n, rss_raw, k, gamma)
            if not np.isfinite(bic):
                continue

            model_scores.append((bic, k, rss_raw, name, params))

            simplified_name, simplified_params = simplify_model(name, params)
            k_s = len(simplified_params) if simplified_params is not None else k
            bic_s = _bic_gaussian(n, rss_raw, k_s, gamma)
            if not np.isfinite(bic_s):
                continue
            fit_candidates.append(
                {
                    'model': simplified_name,
                    'params': simplified_params,
                    'rss': rss_raw,
                    'bic': bic_s,
                    'k': k_s,
                }
            )
        except Exception as e:
            logging.debug("Model %s not usable for this series: %s", name, e)

    if not fit_candidates and model_scores:
        logging.info("No simplified candidates; rebuilding from raw model scores.")
        model_scores.sort(key=lambda t: (t[0], t[1]))
        for bic, k, rss_raw, name, params in model_scores:
            simplified_name, simplified_params = simplify_model(name, params)
            k_s = len(simplified_params) if simplified_params is not None else k
            bic_s = _bic_gaussian(n, rss_raw, k_s, gamma)
            if not np.isfinite(bic_s):
                continue
            fit_candidates.append(
                {
                    'model': simplified_name,
                    'params': simplified_params,
                    'rss': rss_raw,
                    'bic': bic_s,
                    'k': k_s,
                }
            )

    if not fit_candidates:
        logging.warning("No growth model produced a finite BIC; using linear placeholder.")
        return {
            'model': 'linear',
            'params': [0.0, float(np.mean(y_arr))],
            'rss': np.inf,
            'bic': np.inf,
            'k': 2,
            'fit_n_points': n,
            'runner_up_model': None,
            'runner_up_bic': None,
            'runner_up_rss': None,
            'rss_relative_runner_up': None,
            'bic_clearance': None,
            'ambiguous': True,
        }

    fit_candidates.sort(key=lambda d: (d['bic'], d['k']))
    return _attach_fit_calibration(
        fit_candidates, n, bic_ambiguity_margin=bic_ambiguity_margin
    )


def _aggregate_trial_bucket(bucket):
    """Collapse repeated harness trials at one (entity, n) into one scalar for fitting."""
    arr = np.asarray(bucket, dtype=float)
    if arr.size == 0:
        return None
    if PER_SIZE_AGGREGATION == "median":
        return float(np.median(arr))
    return float(np.mean(arr))


def _xy_series_for_fit(order_sizes, value_lists_by_size):
    """Build (x, y) arrays only for sizes that have non-empty observations."""
    xs = []
    ys = []
    for size in order_sizes:
        if size not in value_lists_by_size:
            continue
        bucket = value_lists_by_size[size]
        if not bucket:
            continue
        y = _aggregate_trial_bucket(bucket)
        if y is None:
            continue
        xs.append(float(size))
        ys.append(y)
    return np.array(xs, dtype=float), np.array(ys, dtype=float)


def _safe_predict_model(model_name: str, params, xs: np.ndarray) -> np.ndarray:
    """Evaluate the fitted model on a 1-D size grid (for chart overlay)."""
    if model_name not in models:
        return np.full(np.asarray(xs).shape, np.nan, dtype=float)
    fn = models[model_name]['func']
    p = np.asarray(params, dtype=float).ravel()
    xa = np.asarray(xs, dtype=float).ravel()
    try:
        y = fn(xa, *p)
        return np.asarray(y, dtype=float).ravel()
    except Exception:
        out = []
        for x in xa:
            try:
                out.append(float(fn(float(x), *p)))
            except Exception:
                out.append(float('nan'))
        return np.asarray(out, dtype=float)


def build_fit_series(x_data, y_data, best_fit) -> Optional[dict]:
    """
    JSON-serializable points: input size n, observed mean, fitted curve (same grid as fitting).

    If the model blows up on the observed grid, ``fitted`` is null and ``note`` explains.
    """
    xs = np.asarray(x_data, dtype=float).ravel()
    ys = np.asarray(y_data, dtype=float).ravel()
    if xs.size == 0:
        return None
    bf = best_fit or {}
    name = bf.get('model')
    params = bf.get('params')
    if not name or params is None:
        return {
            'n': xs.tolist(),
            'observed': ys.tolist(),
            'fitted': None,
            'model': None,
        }

    y_hat = _safe_predict_model(name, params, xs)
    if not np.all(np.isfinite(y_hat)):
        return {
            'n': xs.tolist(),
            'observed': ys.tolist(),
            'fitted': None,
            'model': name,
            'note': 'Fitted curve not shown (non-finite on this n grid).',
        }
    return {
        'n': xs.tolist(),
        'observed': ys.tolist(),
        'fitted': y_hat.tolist(),
        'model': name,
    }


def parse_and_analyze(file_paths, *, model_allowlist=None, bic_gamma=None, bic_ambiguity_margin=None):
    sizes = [int(path.split('_')[-1].split('.')[0]) for path in file_paths]
    aggregated_line_exec_times = {}
    aggregated_function_exec_times = {size: [] for size in sizes}

    for file_path, size in zip(file_paths, sizes):
        line_exec_times, function_exec_times = parse_output_file(file_path)

        for line_num, times in line_exec_times.items():
            if line_num not in aggregated_line_exec_times:
                aggregated_line_exec_times[line_num] = {s: [] for s in sizes}
            aggregated_line_exec_times[line_num][size].extend(times)

        aggregated_function_exec_times[size].extend(function_exec_times)

    gamma_reported = float(BIC_PARAMETER_PENALTY_GAMMA)
    if bic_gamma is not None:
        try:
            g_try = float(bic_gamma)
            if g_try > 0:
                gamma_reported = g_try
        except (TypeError, ValueError):
            pass

    margin_reported = float(BIC_AMBIGUITY_MARGIN)
    if bic_ambiguity_margin is not None:
        try:
            m_try = float(bic_ambiguity_margin)
            if m_try > 0:
                margin_reported = m_try
        except (TypeError, ValueError):
            pass

    best_fits = {
        'lines': {},
        'function': None,
        'measurement': 'line_executions',
        'instrumentation': {
            'warmup_runs_per_size': WARMUP_RUNS,
            'per_size_aggregation': PER_SIZE_AGGREGATION,
            'bic_parameter_penalty_gamma': gamma_reported,
            'bic_ambiguity_margin': margin_reported,
            'bic_gamma_override_requested': bic_gamma is not None,
            'teaching_mode': bool(model_allowlist),
            'fitting_model_allowlist': sorted(model_allowlist) if model_allowlist else None,
            'sizes': list(sizes),
            'curve_fit_notes': (
                'Line keys are execution-hit totals per timed invocation; '
                'function metric is wall-clock ns per invocation. '
                'Fits use scipy least_squares with BIC model selection.'
            ),
        },
    }

    for line_num, exec_times_by_size in aggregated_line_exec_times.items():
        x_data, y_data = _xy_series_for_fit(sizes, exec_times_by_size)
        best_fit = select_best_fitting_model(
            x_data,
            y_data,
            model_allowlist=model_allowlist,
            bic_gamma=bic_gamma,
            bic_ambiguity_margin=bic_ambiguity_margin,
        )
        avg_exec_time = {}
        for size in sizes:
            if size not in exec_times_by_size or not exec_times_by_size[size]:
                continue
            agg = _aggregate_trial_bucket(exec_times_by_size[size])
            if agg is not None:
                avg_exec_time[size] = agg
        best_fits['lines'][line_num] = {
            'best_fit': best_fit,
            'average_exec_times': avg_exec_time,
            'series': build_fit_series(x_data, y_data, best_fit),
        }

    if any(aggregated_function_exec_times[s] for s in sizes):
        x_data, y_data = _xy_series_for_fit(sizes, aggregated_function_exec_times)
        overall_best_fit = select_best_fitting_model(
            x_data,
            y_data,
            model_allowlist=model_allowlist,
            bic_gamma=bic_gamma,
            bic_ambiguity_margin=bic_ambiguity_margin,
        )
        avg_exec_time = {}
        for size in sizes:
            if not aggregated_function_exec_times[size]:
                continue
            agg = _aggregate_trial_bucket(aggregated_function_exec_times[size])
            if agg is not None:
                avg_exec_time[size] = agg
        best_fits['function'] = {
            'best_fit': overall_best_fit,
            'average_exec_times': avg_exec_time,
            'metric': 'wall_clock_ns',
            'series': build_fit_series(x_data, y_data, overall_best_fit),
        }

    return best_fits