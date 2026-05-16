import os
import re
import subprocess

from analyzer.benchmark_profiles import JAVA_GENERATE_METHOD, normalize_benchmark_profile
from analyzer.measurement_config import WARMUP_RUNS


def instrument_java_function(
    user_function, call_template, num_inputs, size_array, benchmark_profile="random"
):
    function_name = re.search(r"public\s+(?:static\s+)?\w+\s+(\w+)\(", user_function).group(1)
    profile = normalize_benchmark_profile(benchmark_profile)
    java_generate = JAVA_GENERATE_METHOD[profile]

    java_prolog = """
    import java.io.PrintWriter;
    import java.io.File;
    import java.io.IOException;
    import java.util.HashMap;
    import java.util.Random;

    public class InstrumentedPrototype {
        public HashMap<Integer, Long> lineInfoTotal = new HashMap<>();
    """

    java_epilog = f"""
{java_generate}

        public static void main(String[] args) {{
            try (PrintWriter pw = new PrintWriter(new File("output_java_{size_array}.txt"))) {{
                for (int w = 0; w < {WARMUP_RUNS}; w++) {{
                    InstrumentedPrototype warm = new InstrumentedPrototype();
                    int[] input = generateInput({size_array});
                    {call_template.replace("p.", "warm.")}
                }}
                for (int tc = 1; tc <= {num_inputs}; tc++) {{
                    InstrumentedPrototype p = new InstrumentedPrototype();
                    long startTime = System.nanoTime();
                    int[] input = generateInput({size_array});
                    {call_template}
                    long endTime = System.nanoTime();
                    long execTime = endTime - startTime;
                    pw.printf("test case = %d\\n", tc);
                    pw.printf("Function execution time: %d ns\\n", execTime);
                    pw.println(p.lineInfoTotal.toString());
                }}
            }} catch (IOException ex) {{
                ex.printStackTrace();
            }}
        }}
    }}
    """

    lines = user_function.strip().splitlines()
    instrumented_user_function = lines[0]
    last_line_index = len(lines) - 1
    for i, line in enumerate(lines[1:], start=2):
        trimmed_line = line.strip()
        line = re.sub(r"\b{}\b".format(function_name), f"this.{function_name}", line)
        if not trimmed_line or trimmed_line == '}' or i == last_line_index:
            instrumented_line = line
        elif "return" in trimmed_line:
            instrumented_line = line
        else:
            instrumented_line = (
                f"this.lineInfoTotal.put({i}, this.lineInfoTotal.getOrDefault({i}, 0L) + 1);\n"
                + line
            )
        instrumented_user_function += "\n" + instrumented_line

    return java_prolog + instrumented_user_function + java_epilog


def write_and_compile_java(java_code, work_dir):
    java_file_path = os.path.join(work_dir, "InstrumentedPrototype.java")
    with open(java_file_path, "w", encoding="utf-8") as java_file:
        java_file.write(java_code)

    subprocess.run(["javac", java_file_path], check=True, cwd=work_dir)


def run_java_program(work_dir):
    subprocess.run(
        ["java", "-cp", work_dir, "InstrumentedPrototype"],
        check=True,
        cwd=work_dir,
    )
