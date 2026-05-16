import logging
import os
import re
import subprocess
import sys
import textwrap

from analyzer.benchmark_profiles import PYTHON_GENERATE_BODY, normalize_benchmark_profile
from analyzer.measurement_config import WARMUP_RUNS


def run_instrumented_python_code(
    user_code, number_of_inputs, size_array, work_dir, benchmark_profile="random"
):
    def extract_function_name(code):
        match = re.search(r"def (\w+)\(", code)
        if match:
            return match.group(1)
        raise ValueError("No function definition found in the provided code.")

    function_name = extract_function_name(user_code)
    work_dir_repr = repr(os.path.abspath(work_dir))
    profile = normalize_benchmark_profile(benchmark_profile)
    generate_body = PYTHON_GENERATE_BODY[profile]

    python_prolog = """
import gc
import os
import random
import time
from collections import defaultdict


class Prototype:
    def __init__(self):
        self.line_info_total = defaultdict(int)
"""

    python_epilog = f"""
    def generate_input(self, size):
{generate_body}

    def run(self):
        output_file = os.path.join({work_dir_repr}, "output_python_{size_array}.txt")
        gc_was_enabled = gc.isenabled()
        gc.disable()
        try:
            with open(output_file, "w") as pw:
                for _ in range({WARMUP_RUNS}):
                    self.line_info_total.clear()
                    input_array = self.generate_input({size_array})
                    self.{function_name}(input_array)
                for tc in range(1, {number_of_inputs} + 1):
                    self.line_info_total.clear()
                    input_array = self.generate_input({size_array})
                    start_time = time.perf_counter()
                    self.{function_name}(input_array)
                    end_time = time.perf_counter()
                    exec_time = (end_time - start_time) * 1e9

                    pw.write(f"test case = {{tc}}\\n")
                    pw.write(f"Function execution time: {{exec_time:.0f}} ns\\n")
                    line_output = {{}}
                    for line_num, count in sorted(self.line_info_total.items()):
                        line_output[line_num] = int(count)
                    pw.write(f"{{line_output}}\\n")
        finally:
            if gc_was_enabled:
                gc.enable()
"""

    instrumented_code = python_prolog
    block = textwrap.dedent(user_code).strip()
    raw_lines = block.split("\n")
    raw_lines[0] = f"def {function_name}(self, " + raw_lines[0].split("(", 1)[1]
    raw_lines = [("    " + ln) if ln.strip() else ln for ln in raw_lines]

    for i, line in enumerate(raw_lines):
        stripped = line.strip()
        if not stripped:
            instrumented_code += line + "\n"
            continue
        if stripped.startswith("#"):
            instrumented_code += line + "\n"
            continue

        line_body = line
        if i != 0:
            line_body = re.sub(rf"\b{re.escape(function_name)}\b", f"self.{function_name}", line_body)

        if stripped.endswith(":"):
            instrumented_code += line_body + "\n"
            continue
        if stripped.startswith("return"):
            instrumented_code += line_body + "\n"
            continue

        indent = re.match(r"^(\s*)", line_body)
        prefix = indent.group(1) if indent else ""
        instrumented_code += f"{prefix}self.line_info_total[{i}] += 1\n"
        instrumented_code += f"{line_body}\n"

    instrumented_code += python_epilog
    instrumented_code += "p = Prototype()\n"
    instrumented_code += "p.run()\n"
    python_file = os.path.join(work_dir, "python_Prototype.py")
    with open(python_file, "w", encoding="utf-8") as f:
        f.write(instrumented_code)
    proc = subprocess.run(
        [sys.executable, python_file],
        capture_output=True,
        text=True,
        cwd=work_dir,
    )
    if proc.returncode != 0:
        logging.error(
            "Python instrumented run failed rc=%s stderr=%s stdout=%s",
            proc.returncode,
            proc.stderr,
            proc.stdout,
        )
        raise RuntimeError(
            f"Instrumented Python subprocess failed with code {proc.returncode}: "
            f"{proc.stderr or proc.stdout or 'no output'}"
        )
