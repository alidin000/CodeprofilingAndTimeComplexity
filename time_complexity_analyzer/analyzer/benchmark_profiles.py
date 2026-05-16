"""
Shared benchmark input profiles for Python / Java / C++ harnesses.

Profiles describe how synthetic int[] / vector<int> / list[int] inputs are built at each size n.
"""

from __future__ import annotations

VALID_BENCHMARK_PROFILES = frozenset(
    {
        "random",
        "sorted_ascending",
        "sorted_descending",
        "all_equal",
        "alternating_high_low",
    }
)

# Python: body of generate_input(self, size) after the "def" line (8-space indent inside class).
PYTHON_GENERATE_BODY: dict[str, str] = {
    "random": "        return [random.randint(0, 1000) for _ in range(size)]",
    "sorted_ascending": "        return list(range(size))",
    "sorted_descending": "        return list(range(size - 1, -1, -1))",
    "all_equal": "        return [42] * size",
    "alternating_high_low": "        return [1000 if i % 2 == 0 else 0 for i in range(size)]",
}

# Java: full static generateInput method (8-space base indent inside class).
JAVA_GENERATE_METHOD: dict[str, str] = {
    "random": """        public static int[] generateInput(int size) {
            Random rand = new Random();
            int[] input = new int[size];
            for (int i = 0; i < size; i++) {
                input[i] = rand.nextInt(1000);
            }
            return input;
        }""",
    "sorted_ascending": """        public static int[] generateInput(int size) {
            int[] input = new int[size];
            for (int i = 0; i < size; i++) {
                input[i] = i;
            }
            return input;
        }""",
    "sorted_descending": """        public static int[] generateInput(int size) {
            int[] input = new int[size];
            for (int i = 0; i < size; i++) {
                input[i] = size - 1 - i;
            }
            return input;
        }""",
    "all_equal": """        public static int[] generateInput(int size) {
            int[] input = new int[size];
            for (int i = 0; i < size; i++) {
                input[i] = 42;
            }
            return input;
        }""",
    "alternating_high_low": """        public static int[] generateInput(int size) {
            int[] input = new int[size];
            for (int i = 0; i < size; i++) {
                input[i] = (i % 2 == 0) ? 1000 : 0;
            }
            return input;
        }""",
}

# C++: member generateInput inside class (4-space indent for method, 8 for body).
CPP_GENERATE_METHOD: dict[str, str] = {
    "random": """    std::vector<int> generateInput(int size) {
        std::vector<int> input(size);
        srand(static_cast<unsigned>(time(nullptr)));
        for (int i = 0; i < size; ++i) {
            input[i] = rand() % 1000;
        }
        return input;
    }""",
    "sorted_ascending": """    std::vector<int> generateInput(int size) {
        std::vector<int> input(size);
        for (int i = 0; i < size; ++i) {
            input[i] = i;
        }
        return input;
    }""",
    "sorted_descending": """    std::vector<int> generateInput(int size) {
        std::vector<int> input(size);
        for (int i = 0; i < size; ++i) {
            input[i] = size - 1 - i;
        }
        return input;
    }""",
    "all_equal": """    std::vector<int> generateInput(int size) {
        std::vector<int> input(size);
        for (int i = 0; i < size; ++i) {
            input[i] = 42;
        }
        return input;
    }""",
    "alternating_high_low": """    std::vector<int> generateInput(int size) {
        std::vector<int> input(size);
        for (int i = 0; i < size; ++i) {
            input[i] = (i % 2 == 0) ? 1000 : 0;
        }
        return input;
    }""",
}


def normalize_benchmark_profile(name: str) -> str:
    key = (name or "random").strip().lower().replace("-", "_")
    return key if key in VALID_BENCHMARK_PROFILES else "random"
