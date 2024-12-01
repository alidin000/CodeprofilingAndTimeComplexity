import os
import re
from django.shortcuts import render
import numpy as np
from rest_framework import viewsets, permissions
from api.models import Code
from api.serializers import *
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login
from rest_framework.decorators import api_view

from analyzer.analyzer import instrument_java_function, run_java_program, write_and_compile_java
from analyzer.analyzer_python import run_instrumented_python_code
from analyzer.analyzer_cpp import instrument_cpp_function, write_and_compile_cpp, run_cpp_program
from analyzer.graph_fitting import parse_and_analyze
def get_iteration_size(n, defsize = 1000000):
    return defsize//n

def extract_call_template(user_code, language):
    patterns = {
        'java': r"(?:public\s+)?(?:static\s+)?\w+\s+(\w+)\s*\(",
        'cpp': r"\b(?:\w+\s+)*(\w+)\s*\([^)]*\)\s*{",
        'python': r"def\s+(\w+)\s*\(",
    }
    regex = patterns.get(language.lower())
    if not regex:
        raise ValueError("Unsupported language for analysis.")

    match = re.search(regex, user_code)
    if not match:
        raise ValueError("No valid function name found in the provided code.")

    function_name = match.group(1)
    if language.lower() == 'cpp':
        call_template = f"p.{function_name}($$size$$);"
    elif language.lower() == 'java':
        call_template = f"p.{function_name}(input);"
    else:
        call_template = f"{function_name}(generate_input(size))"

    return call_template

@api_view(['POST'])
def analyse_code(request):
    code_data = request.data
    code_serializer = CodeSerializer(data=code_data)

    print("Incoming data: ", code_serializer.initial_data)
    if code_serializer.is_valid():
        validated_data = code_serializer.validated_data
        saved_code = Code.objects.create(**validated_data)

        user_code = validated_data.get('code')
        language = validated_data.get('language', 'java').lower()
        call_template = extract_call_template(user_code, language)

        language_map = {
            'java': handle_java_code,
            'cpp': handle_cpp_code,
            'python': handle_python_code
        }

        if language in language_map:
            try:
                analysis_result = language_map[language](user_code, call_template)

                if analysis_result.status_code == 200:
                    result_data = analysis_result.data

                    # Ensure result data is JSON-serializable
                    def ensure_serializable(obj):
                        if isinstance(obj, np.ndarray):
                            return obj.tolist()  # Convert ndarray to list
                        if isinstance(obj, dict):
                            return {k: ensure_serializable(v) for k, v in obj.items()}
                        if isinstance(obj, list):
                            return [ensure_serializable(item) for item in obj]
                        return obj

                    serialized_result = ensure_serializable(result_data)

                    saved_code.analysis_result = serialized_result
                    saved_code.save()

                return analysis_result
            except Exception as e:
                print("Error during analysis:", e)
                return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({"error": f"Language '{language}' not supported for analysis."}, status=status.HTTP_400_BAD_REQUEST)
    else:
        print("Validation errors: ", code_serializer.errors)
        return Response(code_serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@api_view(['GET'])
def get_code_history(request, username):
    codes = Code.objects.filter(username=username).order_by('-created_at')
    serializer = CodeSerializer(codes, many=True)
    return Response(serializer.data)

def handle_java_code(user_code, call_template):
    try:
        sizes = [10, 50, 100, 200, 500, 1000, 5000, 10000,50000, 100000]
        output_file_paths = []

        for size in sizes:
            output_file_path = os.path.join(os.getcwd(), f"output_java_{size}.txt")
            output_file_paths.append(output_file_path)

            if os.path.exists(output_file_path):
                os.remove(output_file_path)

            java_code = instrument_java_function(user_code, call_template, get_iteration_size(size), output_file_path, size)
            write_and_compile_java(java_code)
            run_java_program()

        best_fits = parse_and_analyze(output_file_paths)
        return Response(best_fits)
    except Exception as e:
        print("Running didn't work, or reading output file didn't work:", e.args)
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


def handle_cpp_code(user_code, call_template):
    try:
        sizes = [10, 50, 100, 200, 500, 1000]
        output_file_paths = []

        for size in sizes:
            output_file_path = os.path.join(os.getcwd(), f"output_cpp_{size}.txt")
            output_file_paths.append(output_file_path)

            if os.path.exists(output_file_path):
                os.remove(output_file_path)

            cpp_code = instrument_cpp_function(user_code, call_template, get_iteration_size(size, 10000), size)

            try:
                write_and_compile_cpp(cpp_code)
                run_cpp_program()
            except Exception as e:
                print(f"Error during C++ compilation/execution for size {size}: {e}")
                continue

            if not os.path.exists(output_file_path):
                print(f"Output file not found for size {size}: {output_file_path}")
                continue

        best_fits = parse_and_analyze(output_file_paths)
        return Response(best_fits)
    except Exception as e:
        print("Error in handle_cpp_code:", e)
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)



def handle_python_code(user_code, call_template):
    try:
        sizes = [10, 50, 100, 200, 500, 1000, 5000, 10000,50000, 100000]
        output_file_paths = []

        for size in sizes:
            output_file_path = os.path.join(os.getcwd(), "analyzer", f"output_python_{size}.txt")
            output_file_paths.append(output_file_path)

            if os.path.exists(output_file_path):
                os.remove(output_file_path)

            run_instrumented_python_code(user_code, get_iteration_size(size), size)

        best_fits = parse_and_analyze(output_file_paths)
        return Response(best_fits)
    except Exception as e:
        print("Running didn't work, or reading output file didn't work:", e.args)
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


from rest_framework.exceptions import NotFound, ValidationError

class CodeViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = Code.objects.all()
    serializer_class = CodeSerializer

    def list(self, request):
        query_set = self.queryset
        serializer = self.serializer_class(query_set, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, pk=None):
        try:
            code = self.queryset.get(id=pk)
        except Code.DoesNotExist:
            raise NotFound("Code not found.")
        serializer = self.serializer_class(code)
        return Response(serializer.data)

    def update(self, request, pk=None):
        try:
            code = self.queryset.get(id=pk)
        except Code.DoesNotExist:
            raise NotFound("Code not found.")
        serializer = self.serializer_class(code, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        try:
            code = self.queryset.get(id=pk)
        except Code.DoesNotExist:
            raise NotFound("Code not found.")
        code.delete()
        return Response({"message": "Code snippet deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


class UserViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def list(self, request):
        query_set = self.queryset
        serializer = self.serializer_class(query_set, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, pk=None):
        try:
            user = self.queryset.get(id=pk)
        except User.DoesNotExist:
            raise NotFound("User not found.")
        serializer = self.serializer_class(user)
        return Response(serializer.data)

    def update(self, request, pk=None):
        try:
            user = self.queryset.get(id=pk)
        except User.DoesNotExist:
            raise NotFound("User not found.")
        serializer = self.serializer_class(user, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        try:
            user = self.queryset.get(id=pk)
        except User.DoesNotExist:
            raise NotFound("User not found.")
        user.delete()
        return Response({"message": "User deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

    def login(self, request):
        username = request.data.get('username', None)
        password = request.data.get('password', None)

        if not username or not password:
            return Response({"detail": "Username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            serializer = self.serializer_class(user)
            return Response(f'successfully logged in :{serializer.data}')
        else:
            return Response("Invalid username or password", status=status.HTTP_401_UNAUTHORIZED)
