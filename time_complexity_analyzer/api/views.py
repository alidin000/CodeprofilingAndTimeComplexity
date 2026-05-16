import logging
import os
import re
import shutil
import tempfile

import numpy as np
from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes as perm_classes
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import Code
from api.serializers import *

from analyzer.analyzer import instrument_java_function, run_java_program, write_and_compile_java
from analyzer.benchmark_profiles import normalize_benchmark_profile
from analyzer.analyzer_python import run_instrumented_python_code
from analyzer.analyzer_cpp import instrument_cpp_function, write_and_compile_cpp, run_cpp_program
from analyzer.graph_fitting import parse_and_analyze
from analyzer.static_complexity import analyze_python_static


def get_iteration_size(n, defsize=1000000):
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


def _analyse_code_permissions():
    """
    Allow unauthenticated analysis when Django DEBUG is on, or when
    settings.TCA_ALLOW_ANONYMOUS_ANALYSIS is True (default: true for local UX).
    """
    if getattr(settings, "DEBUG", False):
        return [permissions.AllowAny]
    if getattr(settings, "TCA_ALLOW_ANONYMOUS_ANALYSIS", False):
        return [permissions.AllowAny]
    return [permissions.IsAuthenticated]


@api_view(['POST'])
@perm_classes(_analyse_code_permissions())
def analyse_code(request):
    code_data = request.data
    code_serializer = CodeSerializer(data=code_data)

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
                benchmark_profile = normalize_benchmark_profile(
                    str(request.data.get("benchmark_profile") or "random")
                )
                analysis_result = language_map[language](
                    user_code, call_template, benchmark_profile=benchmark_profile
                )

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
                logging.exception("Error during analysis")
                return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({"error": f"Language '{language}' not supported for analysis."}, status=status.HTTP_400_BAD_REQUEST)
    else:
        logging.warning("Validation errors: %s", code_serializer.errors)
        return Response(code_serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@api_view(['GET'])
@perm_classes([permissions.IsAuthenticated])
def get_code_history(request, username):
    if request.user.username != username:
        return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
    codes = Code.objects.filter(username=username).order_by('-created_at')
    serializer = CodeSerializer(codes, many=True)
    return Response(serializer.data)

def handle_java_code(user_code, call_template, benchmark_profile="random"):
    work_dir = tempfile.mkdtemp(prefix="tca_java_")
    profile = normalize_benchmark_profile(benchmark_profile)
    try:
        sizes = [10, 50, 100, 200, 500, 1000, 5000, 10000, 50000, 100000]
        output_file_paths = []

        for size in sizes:
            output_file_path = os.path.join(work_dir, f"output_java_{size}.txt")
            output_file_paths.append(output_file_path)

            if os.path.exists(output_file_path):
                os.remove(output_file_path)

            java_code = instrument_java_function(
                user_code,
                call_template,
                get_iteration_size(size),
                size,
                benchmark_profile=profile,
            )
            write_and_compile_java(java_code, work_dir)
            run_java_program(work_dir)

        best_fits = parse_and_analyze(output_file_paths)
        best_fits["benchmark_profile"] = profile
        return Response(best_fits)
    except Exception as e:
        logging.exception("Java analysis failed")
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def handle_cpp_code(user_code, call_template, benchmark_profile="random"):
    work_dir = tempfile.mkdtemp(prefix="tca_cpp_")
    profile = normalize_benchmark_profile(benchmark_profile)
    try:
        sizes = [10, 50, 100, 200, 500, 1000]
        output_file_paths = []

        for size in sizes:
            output_file_path = os.path.join(work_dir, f"output_cpp_{size}.txt")
            output_file_paths.append(output_file_path)

            if os.path.exists(output_file_path):
                os.remove(output_file_path)

            cpp_code = instrument_cpp_function(
                user_code,
                call_template,
                get_iteration_size(size, 10000),
                size,
                benchmark_profile=profile,
            )

            try:
                write_and_compile_cpp(cpp_code, work_dir)
                run_cpp_program(work_dir)
            except Exception as e:
                logging.warning("C++ compilation/execution failed for size %d: %s", size, e)
                continue

            if not os.path.exists(output_file_path):
                logging.warning("Output file not found for size %d: %s", size, output_file_path)
                continue

        best_fits = parse_and_analyze(output_file_paths)
        best_fits["benchmark_profile"] = profile
        return Response(best_fits)
    except Exception as e:
        logging.exception("C++ analysis failed")
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def handle_python_code(user_code, call_template, benchmark_profile="random"):
    work_dir = tempfile.mkdtemp(prefix="tca_py_")
    profile = normalize_benchmark_profile(benchmark_profile)
    try:
        sizes = [10, 50, 100, 200, 500, 1000, 5000, 10000, 50000, 100000]
        output_file_paths = []

        for size in sizes:
            output_file_path = os.path.join(work_dir, f"output_python_{size}.txt")
            output_file_paths.append(output_file_path)

            if os.path.exists(output_file_path):
                os.remove(output_file_path)

            run_instrumented_python_code(
                user_code, get_iteration_size(size), size, work_dir, benchmark_profile=profile
            )

        best_fits = parse_and_analyze(output_file_paths)
        best_fits["static_analysis"] = analyze_python_static(user_code)
        best_fits["benchmark_profile"] = profile
        return Response(best_fits)
    except Exception as e:
        logging.exception("Python analysis failed")
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)



class CodeViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Code.objects.all()
    serializer_class = CodeSerializer

    def list(self, request):
        codes = self.queryset.filter(username=request.user.username)
        serializer = self.serializer_class(codes, many=True)
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
            code = self.queryset.get(id=pk, username=request.user.username)
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
            code = self.queryset.get(id=pk, username=request.user.username)
        except Code.DoesNotExist:
            raise NotFound("Code not found.")
        code.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserViewSet(viewsets.ViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action in ('create', 'login'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def list(self, request):
        serializer = self.serializer_class([request.user], many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, pk=None):
        if str(request.user.id) != str(pk):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.serializer_class(request.user)
        return Response(serializer.data)

    def update(self, request, pk=None):
        if str(request.user.id) != str(pk):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.serializer_class(request.user, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        if str(request.user.id) != str(pk):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def login(self, request):
        username = request.data.get('username', None)
        password = request.data.get('password', None)

        if not username or not password:
            return Response({"detail": "Username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=username, password=password)

        if user is not None:
            refresh = RefreshToken.for_user(user)
            serializer = self.serializer_class(user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": serializer.data,
            })
        else:
            return Response({"detail": "Invalid username or password"}, status=status.HTTP_401_UNAUTHORIZED)
