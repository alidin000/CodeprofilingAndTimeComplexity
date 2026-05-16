import os
import shutil
import tempfile
import unittest

import pytest
from analyzer.analyzer import (
    instrument_java_function,
    run_java_program,
    write_and_compile_java,
)
from analyzer.analyzer_cpp import (
    instrument_cpp_function,
    write_and_compile_cpp,
    run_cpp_program,
)
from analyzer.analyzer_python import run_instrumented_python_code


class TestInstrumentation(unittest.TestCase):
    @pytest.mark.skipif("CI" in os.environ, reason="Skipping in CI environment")
    def test_java_instrumentation(self):
        user_function = """
        public int sumArray(int[] arr) {
            int sum = 0;
            for (int i = 0; i < arr.length; i++) {
                sum += arr[i];
            }
            return sum;
        }
        """
        call_template = "p.sumArray(input);"
        work_dir = tempfile.mkdtemp(prefix="tca_java_inst_")
        try:
            java_code = instrument_java_function(
                user_function,
                call_template,
                num_inputs=50,
                size_array=50,
            )
            java_path = os.path.join(work_dir, "InstrumentedPrototype.java")
            write_and_compile_java(java_code, work_dir)
            self.assertTrue(os.path.exists(java_path))
            run_java_program(work_dir)
        finally:
            shutil.rmtree(work_dir, ignore_errors=True)

    @pytest.mark.skipif("CI" in os.environ, reason="Skipping in CI environment")
    def test_cpp_instrumentation(self):
        user_function = """
        void sumArray(std::vector<int>& arr) {
            int sum = 0;
            for (int num : arr) {
                sum += num;
            }
        }
        """
        call_template = "p.sumArray($$size$$);"
        work_dir = tempfile.mkdtemp(prefix="tca_cpp_inst_")
        try:
            cpp_code = instrument_cpp_function(user_function, call_template, num_inputs=50, size_array=50)
            cpp_path = os.path.join(work_dir, "InstrumentedPrototype.cpp")
            write_and_compile_cpp(cpp_code, work_dir)
            self.assertTrue(os.path.exists(cpp_path))
            run_cpp_program(work_dir)
        finally:
            shutil.rmtree(work_dir, ignore_errors=True)

    @pytest.mark.skipif("CI" in os.environ, reason="Skipping in CI environment")
    def test_python_instrumentation(self):
        user_code = """
        def sum_array(arr):
            total = 0
            for num in arr:
                total += num
            return total
        """
        work_dir = tempfile.mkdtemp(prefix="tca_py_inst_")
        try:
            run_instrumented_python_code(user_code, number_of_inputs=50, size_array=50, work_dir=work_dir)
            output_path = os.path.join(work_dir, "output_python_50.txt")
            self.assertTrue(os.path.exists(output_path))
        finally:
            shutil.rmtree(work_dir, ignore_errors=True)
