import re
import subprocess
import os

def ensure_directory_exists(path):
    if not os.path.exists(path):
        os.makedirs(path)

def instrument_cpp_function(user_function, call_template, num_inputs, size_array):
    function_name = re.search(r"\b(?:\w+\s+)+(\w+)\s*\(", user_function).group(1)
    cpp_prolog = """
#include <iostream>
#include <fstream>
#include <chrono>
#include <map>
#include <vector>
#include <cstdlib>
#include <ctime>
#include <algorithm>
#include <cmath>

using Clock = std::chrono::steady_clock;

class InstrumentedPrototype {
public:
    std::map<int, Clock::time_point> lineInfoLastStart;
    std::map<int, long long> lineInfoTotal;

    InstrumentedPrototype() {
        // Constructor
    }

    Clock::time_point getLastLineInfo(int lineNumber) {
        auto it = lineInfoLastStart.find(lineNumber);
        if (it != lineInfoLastStart.end()) {
            return it->second;
        } else if (lineNumber > 1) {
            return getLastLineInfo(lineNumber - 1);
        }
        return Clock::now();
    }
    """

    cpp_epilog = f"""
    std::vector<int> generateInput(int size) {{
        std::vector<int> input(size);
        srand(time(0)); 

        for (int i = 0; i < size; ++i) {{
            input[i] = rand() % 1000;
        }}

        return input;
    }}

    void execute(int size) {{
        InstrumentedPrototype p;

        int num_iterations = 10;
        long long totalExecTime = 0;

        for (int iter = 0; iter < num_iterations; ++iter) {{
            std::vector<int> input = generateInput(size);
            auto startTime = Clock::now();
            {call_template.replace("$$size$$", "input")}
            auto endTime = Clock::now();
            totalExecTime += std::chrono::duration_cast<std::chrono::nanoseconds>(endTime - startTime).count();
        }}

        long long avgExecTime = totalExecTime / num_iterations;

        std::ofstream outFile("output_cpp_{size_array}.txt", std::ios_base::app);
        outFile << "test case = " << size << "\\n";
        outFile << "Average Function execution time: " << avgExecTime << " ns\\n";
        outFile << "{{";
        bool isFirst = true;
        for (auto it = p.lineInfoTotal.begin(); it != p.lineInfoTotal.end(); ++it) {{
            if (!isFirst) outFile << ", ";
            isFirst = false;
            outFile << it->first << "=" << it->second;
        }}
        outFile << "}}\\n";
        outFile.close();
    }}

    void run() {{
        for (int size = 10; size <= {num_inputs}; size += 10) {{
            execute(size);
        }}
    }}
}};

int main() {{
    InstrumentedPrototype prototype;
    prototype.run();
    return 0;
}}
"""

    lines = user_function.strip().splitlines()
    instrumented_user_function = lines[0]
    last_line_index = len(lines) - 1

    for i, line in enumerate(lines[1:], start=2):
        trimmed_line = line.strip()
        if not trimmed_line or trimmed_line == '}' or i == last_line_index:
            if "return" in trimmed_line or trimmed_line == '}':
                instrumented_line = line
            else:
                instrumented_line = (
                    f"this->lineInfoLastStart[{i}] = Clock::now();\n"
                    + line + f"\nthis->lineInfoTotal[{i}] += std::chrono::duration_cast<std::chrono::nanoseconds>(Clock::now() - this->getLastLineInfo({i})).count();"
                )
        else:
            instrumented_line = (
                f"this->lineInfoLastStart[{i}] = Clock::now();\n"
                + line + "\n"
                + f"this->lineInfoTotal[{i}] += std::chrono::duration_cast<std::chrono::nanoseconds>(Clock::now() - this->getLastLineInfo({i})).count();"
            )

        instrumented_user_function += "\n" + instrumented_line

    full_cpp_code = cpp_prolog + instrumented_user_function + cpp_epilog
    return full_cpp_code

def write_and_compile_cpp(cpp_code):
    cpp_file_dir = os.path.dirname(__file__)
    cpp_file_path = os.path.join(cpp_file_dir, "InstrumentedPrototype.cpp")

    with open(cpp_file_path, "w") as cpp_file:
        cpp_file.write(cpp_code)
    
    subprocess.run(["g++", "-std=c++14", cpp_file_path, "-o", os.path.join(cpp_file_dir, "InstrumentedPrototype")], check=True)

def run_cpp_program():
    cpp_file_dir = os.path.dirname(__file__)
    command = [os.path.join(cpp_file_dir, "InstrumentedPrototype")]
    subprocess.run(command, check=True)