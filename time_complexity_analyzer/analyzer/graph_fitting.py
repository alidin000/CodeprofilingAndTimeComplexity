import ast
import logging

import numpy as np
from scipy.optimize import least_squares
from scipy.special import factorial

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
    return a * np.exp(np.log(x)**b)

def subexponential(x, a, b):
    return a * np.exp(x ** b)

def subexponential_variant(x, a, b):
    return a * np.exp(x ** b)

def exponential(x, a, b):
    return a * np.exp(b * x)

def factorial_complexity(x, a):
    return a * factorial(x)

def polynomial_linear_exponent(x, a, b):
    return a * 2**(b * x)

def double_exponential(x, a, b):
    return a * 2**(2**x)

def exponential_poly(x, a, b):
    return a * 2**(b * x)

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
    'subexponential_variant': {'func': subexponential_variant, 'initial_guess': [1, 0.5]},
    'exponential': {'func': exponential, 'initial_guess': [1, 0.01]},
    'factorial': {'func': factorial_complexity, 'initial_guess': [1]},
    'polynomial_linear_exponent': {'func': polynomial_linear_exponent, 'initial_guess': [1, 1]},
    'double_exponential': {'func': double_exponential, 'initial_guess': [1, 1]},
    'exponential_poly': {'func': exponential_poly, 'initial_guess': [1, 1]}
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
    'subexponential_variant': '2^(o(n))',
    'exponential': 'O(2^n)',
    'factorial': 'O(n!)',
    'polynomial_linear_exponent': 'O(2^(O(n)))',
    'double_exponential': 'O(2^(2^n))',
    'exponential_poly': 'O(2^(poly(n)))'
}

def parse_output_file(file_path):
    """
    Parses the output file to extract execution times for each line and the function as a whole.
    Handles C++ files differently by replacing 0 or negative execution times with small non-zero values.

    Args:
        file_path (str): Path to the output file.

    Returns:
        tuple: A dictionary with line execution times and a list of function execution times.
    """
    line_exec_times = {}
    function_exec_times = []

    is_cpp = 'cpp' in file_path.lower()

    with open(file_path, 'r') as file:
        for line in file:
            stripped_line = line.strip()

            if not stripped_line:
                continue

            if stripped_line.startswith('Average Function execution time:') or stripped_line.startswith('Function execution time:'):
                try:
                    exec_time = int(stripped_line.split(': ')[1].split(' ')[0])
                    if is_cpp and exec_time <= 0:
                        exec_time = 10
                    function_exec_times.append(exec_time)
                except (ValueError, IndexError):
                    logging.warning("Skipping invalid execution time entry: %s", line.strip())
                continue

            if stripped_line.startswith('{') and stripped_line.endswith('}'):
                try:
                    exec_times = ast.literal_eval(stripped_line.replace('=', ':'))
                    for line_num, time in exec_times.items():
                        if is_cpp:
                            time = max(time, 10)
                        if line_num not in line_exec_times:
                            line_exec_times[line_num] = []
                        line_exec_times[line_num].append(time)
                except (SyntaxError, ValueError):
                    logging.warning("Skipping invalid line execution entry: %s", line.strip())
                continue

    if is_cpp:
        for line_num in line_exec_times:
            line_exec_times[line_num] = [max(time, 10) for time in line_exec_times[line_num]]

    return line_exec_times, function_exec_times



def simplify_model(name, params, tol=1e-6):
    """
    Simplifies a model by reducing its complexity if leading coefficients are negligible.

    :param name: Name of the model (e.g., 'cubic', 'quadratic').
    :param params: Parameters of the model (list of coefficients).
    :param tol: Tolerance for considering a parameter negligible.
    :return: Simplified model name and its parameters.
    """
    # Ensure params has valid length
    if not params or len(params) == 0:
        return name, params

    # Model simplifications
    if name == 'cubic' and np.isclose(params[0], 0, atol=tol):
        return simplify_model('quadratic', params[1:], tol)
    if name == 'quadratic' and np.isclose(params[0], 0, atol=tol):
        return simplify_model('linear', params[1:], tol)
    if name == 'linear' and np.isclose(params[0], 0, atol=tol):
        return simplify_model('constant', params[1:], tol)
    if name == 'exponential' and len(params) > 1 and np.isclose(params[1], 0, atol=tol):
        return simplify_model('constant', params[:1], tol)
    if name == 'polylogarithmic' and len(params) > 1 and np.isclose(params[1], 0, atol=tol):
        return simplify_model('logarithmic', params[:2], tol)
    if name == 'polynomial' and len(params) > 1 and np.isclose(params[0], 0, atol=tol):
        return simplify_model('polynomial', params[1:], tol)
    if name == 'factorial' and np.isclose(params[0], 0, atol=tol):
        return simplify_model('constant', params[:1], tol)
    if name == 'double_exponential' and len(params) > 1 and np.isclose(params[1], 0, atol=tol):
        return simplify_model('exponential', params[:1], tol)
    if name == 'exponential_poly' and len(params) > 1 and np.isclose(params[1], 0, atol=tol):
        return simplify_model('polynomial', params[:1], tol)
    if name == 'log_logarithmic' and np.isclose(params[0], 0, atol=tol):
        return simplify_model('constant', params[1:], tol)
    if name == 'logarithmic' and np.isclose(params[0], 0, atol=tol):
        return simplify_model('constant', params[1:], tol)
    if name == 'quasi_polynomial' and len(params) > 1 and np.isclose(params[1], 0, atol=tol):
        return simplify_model('constant', params[:1], tol)
    if name == 'subexponential' and len(params) > 1 and np.isclose(params[1], 0, atol=tol):
        return simplify_model('exponential', params[:1], tol)
    if name == 'subexponential_variant' and len(params) > 1 and np.isclose(params[1], 0, atol=tol):
        return simplify_model('exponential', params[:1], tol)
    if name == 'log_linear' and np.isclose(params[0], 0, atol=tol):
        return simplify_model('constant', params[1:], tol)
    if name == 'quasilinear' and np.isclose(params[0], 0, atol=tol):
        return simplify_model('logarithmic', params[1:], tol)

    return name, params


def select_best_fitting_model(x_data, y_data):
    """
    Attempts to fit the data with the best model with just rss comparing approach.
    If no valid model is found during the fitting process,
    the fallback approach ensures that a model is still selected

    Args:
        x_data (np.array): Input data sizes.
        y_data (np.array): Corresponding execution times.

    Returns:
        dict: Dictionary containing the best-fit model, parameters, and residual sum of squares (RSS).
    """
    best_fit = {'model': None, 'params': None, 'rss': np.inf}
    fallback_fit = {'model': 'linear', 'params': [0, np.mean(y_data)], 'rss': np.inf}
    y_scale = np.std(y_data) if not np.isclose(np.std(y_data), 0, atol=1e-12) else 1

    model_scores = []  # Track all residuals and penalties

    for name, model in models.items():
        try:
            # Skip models that can't handle the input range
            if name in ['logarithmic', 'log_logarithmic', 'log_linear', 'quasilinear'] and np.any(x_data <= 0):
                continue
            if name in ['factorial', 'double_exponential'] and np.any(x_data > 20):
                continue

            result = least_squares(
                error_function,
                model['initial_guess'],
                bounds=([-1e6] * len(model['initial_guess']), [1e6] * len(model['initial_guess'])),
                args=(x_data, y_data, model['func']),
                method='trf',
            )

            if not np.isfinite(result.fun).all():
                continue

            params = result.x
            rss = np.sum((result.fun / y_scale) ** 2)

            # Complexity penalty
            complexity_penalty = len(params) * 1e-3
            rss += complexity_penalty

            model_scores.append((rss, complexity_penalty, name, params))

            if rss < best_fit['rss']:
                simplified_name, simplified_params = simplify_model(name, params)
                best_fit = {'model': simplified_name, 'params': simplified_params, 'rss': rss}
        except Exception as e:
            logging.warning("Error fitting model %s: %s", name, e)

    # If the original logic fails, fallback to recalculation with updated logic
    if best_fit['model'] is None:
        logging.info("Original logic failed; falling back to updated logic.")
        if model_scores:
            model_scores.sort(key=lambda x: x[0] + x[1])  # Sort by RSS + penalty
            rss, _, name, params = model_scores[0]
            fallback_fit = {'model': name, 'params': params, 'rss': rss}
        return fallback_fit

    return best_fit


def parse_and_analyze(file_paths):
    sizes = [int(path.split('_')[-1].split('.')[0]) for path in file_paths]
    aggregated_line_exec_times = {}
    aggregated_function_exec_times = {size: [] for size in sizes}

    for file_path, size in zip(file_paths, sizes):
        line_exec_times, function_exec_times = parse_output_file(file_path)
        
        for line_num, times in line_exec_times.items():
            if line_num not in aggregated_line_exec_times:
                aggregated_line_exec_times[line_num] = {size: [] for size in sizes}
            aggregated_line_exec_times[line_num][size].extend(times)
        
        aggregated_function_exec_times[size].extend(function_exec_times)
    
    best_fits = {'lines': {}, 'function': None}

    for line_num, exec_times_by_size in aggregated_line_exec_times.items():
        avg_exec_times = [np.mean(exec_times_by_size[size]) for size in sizes if size in exec_times_by_size]
        x_data = np.array(sizes)
        y_data = np.array(avg_exec_times)
        best_fit = select_best_fitting_model(x_data, y_data)
        avg_exec_time = {size: np.mean(exec_times_by_size[size]) for size in sizes if size in exec_times_by_size}
        best_fits['lines'][line_num] = {'best_fit': best_fit, 'average_exec_times': avg_exec_time}

    avg_function_exec_times = [np.mean(aggregated_function_exec_times[size]) for size in sizes]
    if avg_function_exec_times:
        x_data = np.array(sizes)
        y_data = np.array(avg_function_exec_times)
        overall_best_fit = select_best_fitting_model(x_data, y_data)
        avg_exec_time = {size: np.mean(aggregated_function_exec_times[size]) for size in sizes}
        best_fits['function'] = {'best_fit': overall_best_fit, 'average_exec_times': avg_exec_time}

    return best_fits