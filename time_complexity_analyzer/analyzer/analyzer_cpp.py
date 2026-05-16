import os
import re
import subprocess

from analyzer.benchmark_profiles import CPP_GENERATE_METHOD, normalize_benchmark_profile
from analyzer.measurement_config import WARMUP_RUNS


def instrument_cpp_function(
    user_function, call_template, num_inputs, size_array, benchmark_profile="random"
):
    function_name = re.search(r"\b(?:\w+\s+)+(\w+)\s*\(", user_function).group(1)
    call_line = call_template.replace("$$size$$", "input")
    profile = normalize_benchmark_profile(benchmark_profile)
    cpp_generate = CPP_GENERATE_METHOD[profile]

    cpp_prolog = """
#include <chrono>
#include <fstream>
#include <map>
#include <vector>
#include <cstdlib>
#include <ctime>
#include <algorithm>
#include <cmath>

class InstrumentedPrototype {
public:
    std::map<int, long long> lineInfoTotal;
"""

    cpp_epilog = f"""
{cpp_generate}
}};

int main() {{
    std::ofstream outFile("output_cpp_{size_array}.txt", std::ios::trunc);
    for (int w = 0; w < {WARMUP_RUNS}; ++w) {{
        InstrumentedPrototype warm;
        std::vector<int> input = warm.generateInput({size_array});
        {call_line.replace("p.", "warm.")}
    }}
    for (int tc = 1; tc <= {num_inputs}; ++tc) {{
        InstrumentedPrototype p;
        std::vector<int> input = p.generateInput({size_array});
        auto t0 = std::chrono::steady_clock::now();
        {call_line}
        auto t1 = std::chrono::steady_clock::now();
        long long execNs = std::chrono::duration_cast<std::chrono::nanoseconds>(t1 - t0).count();
        outFile << "test case = " << tc << "\\n";
        outFile << "Function execution time: " << execNs << " ns\\n";
        outFile << "{{";
        bool isFirst = true;
        for (const auto& kv : p.lineInfoTotal) {{
            if (!isFirst) outFile << ", ";
            isFirst = false;
            outFile << kv.first << "=" << kv.second;
        }}
        outFile << "}}\\n";
    }}
    outFile.close();
    return 0;
}}
"""

    lines = user_function.strip().splitlines()
    instrumented_user_function = lines[0]
    last_line_index = len(lines) - 1

    for i, line in enumerate(lines[1:], start=2):
        trimmed_line = line.strip()
        if not trimmed_line or trimmed_line == '}' or i == last_line_index:
            instrumented_line = line
        elif "return" in trimmed_line:
            instrumented_line = line
        else:
            instrumented_line = f"this->lineInfoTotal[{i}]++;\n" + line

        instrumented_user_function += "\n" + instrumented_line

    return cpp_prolog + instrumented_user_function + cpp_epilog


def write_and_compile_cpp(cpp_code, work_dir):
    cpp_file_path = os.path.join(work_dir, "InstrumentedPrototype.cpp")
    binary_path = os.path.join(work_dir, "InstrumentedPrototype")

    with open(cpp_file_path, "w", encoding="utf-8") as cpp_file:
        cpp_file.write(cpp_code)

    subprocess.run(
        ["g++", "-std=c++14", cpp_file_path, "-o", binary_path],
        check=True,
        cwd=work_dir,
    )


def run_cpp_program(work_dir):
    binary_path = os.path.join(work_dir, "InstrumentedPrototype")
    subprocess.run([binary_path], check=True, cwd=work_dir)
