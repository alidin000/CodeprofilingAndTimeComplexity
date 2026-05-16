import os
import shutil
import subprocess
import tempfile
from django.test import TestCase
from django.urls import reverse
from api.models import Code, UserProfile
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient
from api.serializers import CodeSerializer, UserSerializer
from analyzer.analyzer import instrument_java_function, run_java_program, write_and_compile_java
from analyzer.analyzer_python import run_instrumented_python_code
from analyzer.analyzer_cpp import instrument_cpp_function, write_and_compile_cpp, run_cpp_program

class APITests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='testpassword')
        self.user_profile = UserProfile.objects.create(user=self.user, username=self.user.username, email=self.user.email)

    def test_create_code(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('codes-list')
        data = {
            'username': self.user.username,
            'code': 'def example(arr):\n    return sum(arr)',
            'language': 'Python',
            'time_complexity': 'O(1)',
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Code.objects.count(), 1)

    def test_create_code_missing_fields(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('codes-list')
        data = {
            'username': self.user.username,
            'code': 'def example(arr):\n    return sum(arr)',
            'language': 'Python',
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('time_complexity', response.data)

    def test_retrieve_code(self):
        code = Code.objects.create(
            username=self.user.username,
            code='def example(arr):\n    return sum(arr)',
            language='Python',
            time_complexity='O(1)',
        )
        self.client.force_authenticate(user=self.user)
        url = reverse('codes-detail', args=[code.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], code.code)

    def test_retrieve_nonexistent_code(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('codes-detail', args=[999])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_code(self):
        code = Code.objects.create(
            username=self.user.username,
            code='def example(arr):\n    return sum(arr)',
            language='Python',
            time_complexity='O(1)',
        )
        self.client.force_authenticate(user=self.user)
        url = reverse('codes-detail', args=[code.id])
        data = {
            'username': self.user.username,
            'code': 'def example_updated(arr):\n    return sum(arr)',
            'language': 'Python',
            'time_complexity': 'O(1)',
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        code.refresh_from_db()
        self.assertEqual(code.code, data['code'])

    def test_update_code_invalid_data(self):
        code = Code.objects.create(
            username=self.user.username,
            code='def example(arr):\n    return sum(arr)',
            language='Python',
            time_complexity='O(1)',
        )
        self.client.force_authenticate(user=self.user)
        url = reverse('codes-detail', args=[code.id])
        data = {
            'username': self.user.username,
            'code': '',
            'language': 'Python',
            'time_complexity': 'O(1)',
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('code', response.data)

    def test_delete_code(self):
        code = Code.objects.create(
            username=self.user.username,
            code='def example(arr):\n    return sum(arr)',
            language='Python',
            time_complexity='O(1)',
        )
        self.client.force_authenticate(user=self.user)
        url = reverse('codes-detail', args=[code.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Code.objects.count(), 0)

    def test_delete_nonexistent_code(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('codes-detail', args=[999])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_analyse_code(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('analyse-code')
        data = {
            'username': self.user.username,
            'code': 'def example(arr):\n    return sum(arr)',
            'language': 'Python'
        }
        response = self.client.post(url, data, format='json')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

    def test_user_registration(self):
        url = reverse('users-list')
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'newpassword'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 2)

    def test_user_registration_missing_fields(self):
        url = reverse('users-list')
        data = {
            'username': 'newuser',
            'email': '',
            'password': 'newpassword'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_user_login(self):
        url = reverse('login')
        data = {
            'username': self.user.username,
            'password': 'testpassword'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_user_login_invalid_credentials(self):
        url = reverse('login')
        data = {
            'username': self.user.username,
            'password': 'wrongpassword'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        payload = response.data
        if isinstance(payload, dict) and 'detail' in payload:
            self.assertIn('Invalid username or password', str(payload['detail']))
        else:
            self.assertIn('Invalid username or password', payload)

    def test_user_login_missing_credentials(self):
        url = reverse('login')
        data = {
            'username': self.user.username,
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
        self.assertEqual(response.data['detail'], 'Username and password are required.')

    def test_code_history(self):
        Code.objects.create(
            username=self.user.username,
            code='def example(arr):\n    return sum(arr)',
            language='Python',
            time_complexity='O(1)'
        )

        self.client.force_authenticate(user=self.user)

        url = reverse('code_history', args=[self.user.username])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)



    def test_analysis_result_saved(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('analyse-code')

        data = {
            'username': self.user.username,
            'code': 'def example(arr):\n    return sum(arr)',
            'language': 'Python',
            'time_complexity': 'O(1)',
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        saved_code = Code.objects.get(username=self.user.username, code=data['code'])
        self.assertIsNotNone(saved_code.analysis_result)



class SerializerTests(TestCase):

    def test_code_serializer(self):
        data = {
            'username': 'testuser',
            'code': 'def example(arr):\n    return sum(arr)',
            'language': 'Python',
            'time_complexity': 'O(1)',
        }
        serializer = CodeSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        code = serializer.save()
        self.assertEqual(code.username, data['username'])

    def test_code_serializer_missing_fields(self):
        data = {
            'username': 'testuser',
            'code': 'def example(arr):\n    return sum(arr)',
            'language': 'Python',
        }
        serializer = CodeSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('time_complexity', serializer.errors)

    def test_user_serializer(self):
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpassword'
        }
        serializer = UserSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        user = serializer.save()
        self.assertEqual(user.username, data['username'])
        self.assertTrue(user.check_password(data['password']))

    def test_user_serializer_missing_fields(self):
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
        }
        serializer = UserSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)


class UtilityFunctionTests(TestCase):

    def test_extract_call_template(self):
        from api.views import extract_call_template

        python_code = 'def example(arr):\n    return sum(arr)'
        call_template = extract_call_template(python_code, 'python')
        self.assertEqual(call_template, 'example(generate_input(size))')

        java_code = 'int example(int[] arr) {\n    return sum(arr);\n}'
        call_template = extract_call_template(java_code, 'java')
        self.assertEqual(call_template, 'p.example(input);')

        cpp_code = 'void example(std::vector<int>& arr) {\n    return sum(arr);\n}'
        call_template = extract_call_template(cpp_code, 'cpp')
        self.assertEqual(call_template, 'p.example($$size$$);')



class InstrumentedCodeTests(TestCase):

    def test_instrument_python_function(self):
        user_code = """
def example(arr):
    return sum(arr)
"""
        work_dir = tempfile.mkdtemp(prefix="tca_test_py_")
        try:
            output_path = os.path.join(work_dir, "output_python_50.txt")
            run_instrumented_python_code(user_code, 50, 50, work_dir)

            self.assertTrue(os.path.exists(output_path))

            with open(output_path, 'r') as file:
                content = file.read()
                self.assertIn('Function execution time:', content)
                self.assertIn('{', content)
                self.assertIn('}', content)
        finally:
            shutil.rmtree(work_dir, ignore_errors=True)

    def test_instrument_java_function(self):
        user_code = """
public int example(int[] arr) {
    int sum = 0;
    for (int i = 0; i < arr.length; i++) {
        sum += arr[i];
    }
    return sum;
}
"""
        work_dir = tempfile.mkdtemp(prefix="tca_test_java_")
        try:
            output_path = os.path.join(work_dir, "output_java_50.txt")
            java_code = instrument_java_function(user_code, "p.example(input);", 50, 50)
            write_and_compile_java(java_code, work_dir)
            java_file_path = os.path.join(work_dir, "InstrumentedPrototype.java")
            self.assertTrue(os.path.exists(java_file_path))

            compile_result = subprocess.run(
                ["javac", java_file_path], capture_output=True, text=True, cwd=work_dir
            )
            self.assertEqual(compile_result.returncode, 0)

            run_java_program(work_dir)

            self.assertTrue(os.path.exists(output_path))

            with open(output_path, 'r') as file:
                content = file.read()
                self.assertIn('Function execution time:', content)
                self.assertIn('{', content)
                self.assertIn('}', content)
        finally:
            shutil.rmtree(work_dir, ignore_errors=True)

    def test_instrument_cpp_function(self):
        user_code = """
void example(std::vector<int>& arr) {
    int sum = 0;
    for (int i = 0; i < arr.size(); ++i) {
        sum += arr[i];
    }
}
"""
        work_dir = tempfile.mkdtemp(prefix="tca_test_cpp_")
        try:
            output_path = os.path.join(work_dir, "output_cpp_50.txt")
            cpp_code = instrument_cpp_function(user_code, "p.example($$size$$);", 50, 50)
            cpp_file_path = os.path.join(work_dir, "InstrumentedPrototype.cpp")
            write_and_compile_cpp(cpp_code, work_dir)

            self.assertTrue(os.path.exists(cpp_file_path))

            compile_result = subprocess.run(
                [
                    "g++",
                    "-std=c++14",
                    cpp_file_path,
                    "-o",
                    os.path.join(work_dir, "InstrumentedPrototype"),
                ],
                capture_output=True,
                text=True,
                cwd=work_dir,
            )
            self.assertEqual(compile_result.returncode, 0)

            run_cpp_program(work_dir)

            self.assertTrue(os.path.exists(output_path))

            with open(output_path, 'r') as file:
                content = file.read()
                self.assertIn('Function execution time:', content)
                self.assertIn('{', content)
                self.assertIn('}', content)
        finally:
            shutil.rmtree(work_dir, ignore_errors=True)

    def test_instrument_python_function_complex(self):
        user_code = """
def merge_sort(arr):
    if len(arr) > 1:
        mid = len(arr) // 2
        left_half = arr[:mid]
        right_half = arr[mid:]
        merge_sort(left_half)
        merge_sort(right_half)
        i = j = k = 0
        while i < len(left_half) and j < len(right_half):
            if left_half[i] < right_half[j]:
                arr[k] = left_half[i]
                i += 1
            else:
                arr[k] = right_half[j]
                j += 1
            k += 1
        while i < len(left_half):
            arr[k] = left_half[i]
            i += 1
            k += 1
        while j < len(right_half):
            arr[k] = right_half[j]
            j += 1
            k += 1
"""
        work_dir = tempfile.mkdtemp(prefix="tca_test_py_c_")
        try:
            output_path = os.path.join(work_dir, "output_python_50.txt")
            run_instrumented_python_code(user_code, 50, 50, work_dir)

            self.assertTrue(os.path.exists(output_path))

            with open(output_path, 'r') as file:
                content = file.read()
                self.assertIn('Function execution time:', content)
                self.assertIn('{', content)
                self.assertIn('}', content)
        finally:
            shutil.rmtree(work_dir, ignore_errors=True)

    def test_instrument_java_function_complex(self):
        user_code = """
public int example(int[] arr) {
    if (arr.length > 1) {
        int mid = arr.length / 2;
        int[] left_half = new int[mid];
        int[] right_half = new int[arr.length - mid];

        System.arraycopy(arr, 0, left_half, 0, mid);
        System.arraycopy(arr, mid, right_half, 0, arr.length - mid);

        example(left_half);
        example(right_half);

        int i = 0, j = 0, k = 0;
        while (i < left_half.length && j < right_half.length) {
            if (left_half[i] < right_half[j]) {
                arr[k++] = left_half[i++];
            } else {
                arr[k++] = right_half[j++];
            }
        }

        while (i < left_half.length) {
            arr[k++] = left_half[i++];
        }

        while (j < right_half.length) {
            arr[k++] = right_half[j++];
        }
    }
    return 0;
}
"""
        work_dir = tempfile.mkdtemp(prefix="tca_test_java_c_")
        try:
            output_path = os.path.join(work_dir, "output_java_50.txt")
            java_code = instrument_java_function(user_code, "p.example(input);", 50, 50)
            write_and_compile_java(java_code, work_dir)
            java_file_path = os.path.join(work_dir, "InstrumentedPrototype.java")
            self.assertTrue(os.path.exists(java_file_path))

            compile_result = subprocess.run(
                ["javac", java_file_path], capture_output=True, text=True, cwd=work_dir
            )
            self.assertEqual(compile_result.returncode, 0)

            run_java_program(work_dir)

            self.assertTrue(os.path.exists(output_path))

            with open(output_path, 'r') as file:
                content = file.read()
                self.assertIn('Function execution time:', content)
                self.assertIn('{', content)
                self.assertIn('}', content)
        finally:
            shutil.rmtree(work_dir, ignore_errors=True)

    def test_instrument_cpp_function_complex(self):
        user_code = """
void example(std::vector<int>& arr) {
    if (arr.size() > 1) {
        int mid = arr.size() / 2;
        std::vector<int> left_half(arr.begin(), arr.begin() + mid);
        std::vector<int> right_half(arr.begin() + mid, arr.end());

        example(left_half);
        example(right_half);

        int i = 0, j = 0, k = 0;
        while (i < left_half.size() && j < right_half.size()) {
            if (left_half[i] < right_half[j]) {
                arr[k++] = left_half[i++];
            } else {
                arr[k++] = right_half[j++];
            }
        }

        while (i < left_half.size()) {
            arr[k++] = left_half[i++];
        }

        while (j < right_half.size()) {
            arr[k++] = right_half[j++];
        }
    }
}
"""
        work_dir = tempfile.mkdtemp(prefix="tca_test_cpp_c_")
        try:
            output_path = os.path.join(work_dir, "output_cpp_50.txt")
            cpp_code = instrument_cpp_function(user_code, "p.example($$size$$);", 50, 50)
            cpp_file_path = os.path.join(work_dir, "InstrumentedPrototype.cpp")
            write_and_compile_cpp(cpp_code, work_dir)

            self.assertTrue(os.path.exists(cpp_file_path))

            compile_result = subprocess.run(
                [
                    "g++",
                    "-std=c++14",
                    cpp_file_path,
                    "-o",
                    os.path.join(work_dir, "InstrumentedPrototype"),
                ],
                capture_output=True,
                text=True,
                cwd=work_dir,
            )
            self.assertEqual(compile_result.returncode, 0)

            run_cpp_program(work_dir)

            self.assertTrue(os.path.exists(output_path))

            with open(output_path, 'r') as file:
                content = file.read()
                self.assertIn('Function execution time:', content)
                self.assertIn('{', content)
                self.assertIn('}', content)
        finally:
            shutil.rmtree(work_dir, ignore_errors=True)
