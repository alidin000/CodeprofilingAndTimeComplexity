import os
import re
import subprocess
import sys

def run_instrumented_python_code(user_code, number_of_inputs, size_array):
    def extract_function_name(code):
        match = re.search(r"def (\w+)\(", code)
        if match:
            return match.group(1)
        else:
            raise ValueError("No function definition found in the provided code.")

    function_name = extract_function_name(user_code)

    python_prolog = """
import time
import random
import os
from collections import defaultdict

class Prototype:
    def __init__(self):
        self.line_info_total = defaultdict(float)
"""

    python_epilog = f"""
    def generate_input(self, size):
        return [random.randint(0, 1000) for _ in range(size)]

    def run(self):
        output_file = os.path.join(os.path.dirname(__file__), "output_python_{size_array}.txt")
        with open(output_file, "w") as pw:
            for size in range(1, {number_of_inputs} + 1): 
                input_array = self.generate_input({size_array})
                start_time = time.perf_counter()
                self.{function_name}(input_array)
                end_time = time.perf_counter()
                exec_time = (end_time - start_time) * 1e9

                pw.write(f"test case = {{size}}\\n")
                pw.write(f"Function execution time: {{exec_time:.0f}} ns\\n")
                line_output = {{}}
                for line_num, count in sorted(self.line_info_total.items()):
                    line_output[line_num] = int(count * 1e9)  
                pw.write(f"{{line_output}}\\n")
"""

    instrumented_code = python_prolog
    lines = user_code.strip().split("\n")
    lines[0] = f"def {function_name}(self, " + lines[0].split("(", 1)[1]
    for i, line in enumerate(lines):
        stripped_line = line.strip()
        if i != 0:
            line = re.sub(r"\b{}\b".format(function_name), f"self.{function_name}", line)
        if line.endswith(':'):
            instrumented_code += f"    {line}\n"
            continue
        elif 'return' in stripped_line:
            instrumented_code += f"    {line}\n"
            continue
        indent = '    ' + re.match(r"\s*", lines[i+1] if line.endswith(':') else lines[i]).group(0)
        instrumented_code += f"{indent}start_time_{i} = time.perf_counter()\n"
        instrumented_code += f"    {line}\n"
        instrumented_code += (
            f"{indent}self.line_info_total[{i}] += time.perf_counter() - start_time_{i}\n"
        )

    instrumented_code += python_epilog
    instrumented_code += "p = Prototype()\n"
    instrumented_code += "p.run()\n"
    python_file = os.path.join(os.path.dirname(__file__),"python_Prototype.py")
    with open(python_file, "w") as f:
        f.write(instrumented_code)
    subprocess.run([sys.executable, python_file], capture_output=True, text=True)
