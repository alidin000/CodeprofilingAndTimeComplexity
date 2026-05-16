import unittest

from analyzer.static_complexity import analyze_python_static


class TestStaticComplexity(unittest.TestCase):
    def test_single_loop_linear_scan(self):
        code = """
def find_max(arr):
    m = arr[0]
    for x in arr:
        if x > m:
            m = x
    return m
"""
        r = analyze_python_static(code)
        self.assertTrue(r["ok"])
        self.assertEqual(r["function"], "find_max")
        self.assertEqual(r["max_loop_nesting"], 1)
        self.assertGreaterEqual(r["for_loops"], 1)
        self.assertFalse(r["recursion_direct"])

    def test_nested_loops(self):
        code = """
def pairs(arr):
    c = 0
    for i in arr:
        for j in arr:
            c += 1
    return c
"""
        r = analyze_python_static(code)
        self.assertTrue(r["ok"])
        self.assertGreaterEqual(r["max_loop_nesting"], 2)
        self.assertTrue(any("Nested loops" in h for h in r.get("hints", [])))

    def test_recursion_flag(self):
        code = """
def fact(n):
    if n <= 1:
        return 1
    return n * fact(n - 1)
"""
        r = analyze_python_static(code)
        self.assertTrue(r["ok"])
        self.assertTrue(r["recursion_direct"])

    def test_syntax_error(self):
        r = analyze_python_static("def bad(:\n  pass\n")
        self.assertFalse(r["ok"])
        self.assertIn("error", r)
