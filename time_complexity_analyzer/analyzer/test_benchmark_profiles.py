import os
import shutil
import tempfile
import unittest

from analyzer.analyzer import instrument_java_function
from analyzer.analyzer_cpp import instrument_cpp_function
from analyzer.analyzer_python import run_instrumented_python_code
from analyzer.benchmark_profiles import normalize_benchmark_profile


class TestBenchmarkProfiles(unittest.TestCase):
    def test_normalize_benchmark_profile(self):
        self.assertEqual(normalize_benchmark_profile("random"), "random")
        self.assertEqual(normalize_benchmark_profile("SORTED_ASCENDING"), "sorted_ascending")
        self.assertEqual(normalize_benchmark_profile("sorted-ascending"), "sorted_ascending")
        self.assertEqual(normalize_benchmark_profile("nope"), "random")

    def test_each_profile_runs_python(self):
        code = """
def sum_array(arr):
    total = 0
    for num in arr:
        total += num
    return total
"""
        for profile in (
            "random",
            "sorted_ascending",
            "sorted_descending",
            "all_equal",
            "alternating_high_low",
        ):
            work_dir = tempfile.mkdtemp(prefix="tca_bench_")
            try:
                run_instrumented_python_code(
                    code, number_of_inputs=3, size_array=15, work_dir=work_dir, benchmark_profile=profile
                )
                out = os.path.join(work_dir, "output_python_15.txt")
                self.assertTrue(os.path.exists(out), msg=f"missing output for {profile}")
                with open(out, encoding="utf-8") as f:
                    body = f.read()
                self.assertIn("Function execution time:", body)
            finally:
                shutil.rmtree(work_dir, ignore_errors=True)

    def test_java_instrumentation_embeds_profile(self):
        user = """
        public int example(int[] arr) {
            return arr.length;
        }
        """
        src = instrument_java_function(
            user, "p.example(input);", 10, 10, benchmark_profile="sorted_ascending"
        )
        self.assertIn("input[i] = i;", src)

    def test_cpp_instrumentation_embeds_profile(self):
        user = """
        int example(std::vector<int>& arr) {
            return (int)arr.size();
        }
        """
        src = instrument_cpp_function(
            user, "p.example($$size$$);", 10, 10, benchmark_profile="sorted_descending"
        )
        self.assertIn("size - 1 - i", src)
