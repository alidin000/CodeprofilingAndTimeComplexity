import os
import shutil
import tempfile
import unittest

import numpy as np
from analyzer.graph_fitting import (
    select_best_fitting_model,
    parse_output_file,
    parse_and_analyze,
    simplify_model,
    models,
    time_complexity_notation
)

class TestGraphFitting(unittest.TestCase):

    def setUp(self):
        """Set up mock data for testing."""
        self._mock_dir = tempfile.mkdtemp(prefix="tca_graph_fit_")
        self.mock_file_paths = [
            os.path.join(self._mock_dir, "mock_output_10.txt"),
            os.path.join(self._mock_dir, "mock_output_20.txt"),
        ]
        self.mock_data_10 = """
        test case = 1
        Function execution time: 100 ns
        {1=100, 2=200}
        test case = 2
        Function execution time: 200 ns
        {1=150, 2=250}
        """
        self.mock_data_20 = """
        test case = 1
        Function execution time: 400 ns
        {1=400, 2=500}
        test case = 2
        Function execution time: 600 ns
        {1=450, 2=550}
        """

        # Write mock data to files
        with open(self.mock_file_paths[0], "w") as f:
            f.write(self.mock_data_10)
        with open(self.mock_file_paths[1], "w") as f:
            f.write(self.mock_data_20)


    def tearDown(self):
        """Remove mock files after testing."""
        shutil.rmtree(self._mock_dir, ignore_errors=True)

    def test_parse_output_file(self):
        """Test parsing of an output file."""
        line_exec_times, function_exec_times = parse_output_file(self.mock_file_paths[0])
        self.assertEqual(len(function_exec_times), 2)
        self.assertEqual(function_exec_times, [100, 200])

        self.assertIn(1, line_exec_times)
        self.assertIn(2, line_exec_times)
        self.assertEqual(line_exec_times[1], [100, 150])
        self.assertEqual(line_exec_times[2], [200, 250])

    def test_simplify_model(self):
        """Test model simplification."""
        simplified_name, simplified_params = simplify_model('cubic', [0.0001, 1, 2, 3], tol=1e-3)
        self.assertEqual(simplified_name, 'quadratic')

        simplified_name, simplified_params = simplify_model('quadratic', [0.0001, 2, 3], tol=1e-3)
        self.assertEqual(simplified_name, 'linear')

        simplified_name, simplified_params = simplify_model('linear', [0.0001, 3], tol=1e-3)
        self.assertEqual(simplified_name, 'constant')

    def test_simplify_model_accepts_ndarray(self):
        """ndarray params must not trigger ambiguous truth-value errors."""
        import numpy as np

        name, params = simplify_model('cubic', np.array([0.0001, 1.0, 2.0, 3.0]), tol=1e-3)
        self.assertEqual(name, 'quadratic')
        self.assertIsInstance(params, list)

    def test_parse_and_analyze(self):
        """Test parsing and analyzing multiple output files."""
        results = parse_and_analyze(self.mock_file_paths)

        self.assertIn(1, results['lines'])
        self.assertIn(2, results['lines'])

        line_1_results = results['lines'][1]['average_exec_times']
        line_2_results = results['lines'][2]['average_exec_times']

        self.assertEqual(line_1_results[10], 125)
        self.assertEqual(line_1_results[20], 425)
        self.assertEqual(line_2_results[10], 225)
        self.assertEqual(line_2_results[20], 525)

        self.assertIsNotNone(results['function'])
        function_results = results['function']['average_exec_times']

        self.assertEqual(function_results[10], 150)
        self.assertEqual(function_results[20], 500)

        best_fit = results['function']['best_fit']
        self.assertIn(best_fit['model'], time_complexity_notation)

        self.assertIn('series', results['function'])
        fs = results['function']['series']
        self.assertIsNotNone(fs)
        self.assertEqual(fs['n'], [10, 20])
        self.assertEqual(fs['observed'], [150.0, 500.0])
        self.assertIsInstance(fs.get('fitted'), (list, type(None)))

        inst = results.get('instrumentation')
        self.assertIsInstance(inst, dict)
        self.assertIn('per_size_aggregation', inst)
        self.assertIn('bic_parameter_penalty_gamma', inst)
        self.assertEqual(inst.get('sizes'), [10, 20])


    def test_inverse_ackermann_model(self):
        """Ultra-slow growth should map to an inverse-Ackermann-like or near-tied log family (BIC)."""
        import numpy as np

        x_data = np.array([10**3, 10**6, 10**9, 10**12, 10**15])

        def approximate_inverse_ackermann(x):
            return np.log(np.log(np.log(x + 1) + 1) + 1) + 1

        y_data = approximate_inverse_ackermann(x_data)

        best_fit = select_best_fitting_model(x_data, y_data)

        acceptable = {
            'inverse_ackermann',
            'log_logarithmic',
            'iterated_logarithmic',
            'logarithmic',
        }
        self.assertIn(
            best_fit['model'],
            acceptable,
            f"Expected a very slowly growing family, got {best_fit['model']!r} (bic={best_fit.get('bic')}).",
        )

