import unittest

from analyzer.fit_static_alignment import attach_fit_static_alignment


class TestFitStaticAlignment(unittest.TestCase):
    def test_python_aligned_linear_single_loop(self):
        payload = {
            "function": {"best_fit": {"model": "linear"}},
            "static_analysis": {
                "ok": True,
                "max_loop_nesting": 1,
                "structural_bound_model": "linear",
                "recursion_direct": False,
            },
        }
        attach_fit_static_alignment(payload)
        self.assertEqual(payload["fit_static_alignment"]["status"], "aligned")

    def test_python_empirical_milder_than_nesting(self):
        payload = {
            "function": {"best_fit": {"model": "linear"}},
            "static_analysis": {
                "ok": True,
                "max_loop_nesting": 3,
                "structural_bound_model": "cubic",
                "recursion_direct": False,
            },
        }
        attach_fit_static_alignment(payload)
        self.assertEqual(payload["fit_static_alignment"]["status"], "empirical_milder")

    def test_java_unavailable_without_static(self):
        payload = {"function": {"best_fit": {"model": "linear"}}, "benchmark_profile": "random"}
        attach_fit_static_alignment(payload)
        self.assertEqual(payload["fit_static_alignment"]["status"], "unavailable")
