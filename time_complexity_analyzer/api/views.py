import logging
import os
import re
import shutil
import tempfile
import threading
import uuid

import numpy as np
from django.conf import settings
from django.contrib.auth import authenticate
from django.core.cache import cache
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
from analyzer.measurement_config import TEACHING_MODEL_ALLOWLIST
from analyzer.static_complexity import analyze_python_static
from analyzer.static_java_cpp import analyze_cpp_static, analyze_java_static
from analyzer.fit_static_alignment import attach_fit_static_alignment


def _coerce_truthy(val):
    if val is True:
        return True
    if val is False or val is None:
        return False
    return str(val).strip().lower() in ('1', 'true', 'yes', 'on')


def fitting_options_from_request_payload(data):
    """Parse optional teaching mode + BIC gamma from JSON body (not stored on Code rows)."""
    if not isinstance(data, dict):
        data = {}
    teaching = _coerce_truthy(data.get('teaching_mode')) or bool(
        getattr(settings, 'TCA_TEACHING_MODE_DEFAULT', False)
    )
    opts = {}
    if teaching:
        opts['model_allowlist'] = set(TEACHING_MODEL_ALLOWLIST)
    bg = data.get('bic_gamma')
    if bg is not None and bg != '':
        try:
            g = float(bg)
            if g > 0:
                opts['bic_gamma'] = g
        except (TypeError, ValueError):
            pass
    return opts


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


def ensure_serializable(obj):
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, dict):
        return {k: ensure_serializable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [ensure_serializable(item) for item in obj]
    return obj


JOB_CACHE_TTL = 600


def _job_key(job_id):
    return f"tca_analysis_job:{job_id}"


def _job_merge_state(job_id, updates):
    key = _job_key(job_id)
    cur = cache.get(key) or {}
    cur.update(updates)
    cache.set(key, cur, JOB_CACHE_TTL)


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
                fitting_opts = fitting_options_from_request_payload(request.data)
                analysis_result = language_map[language](
                    user_code,
                    call_template,
                    benchmark_profile=benchmark_profile,
                    fitting_options=fitting_opts,
                )

                if analysis_result.status_code == 200:
                    result_data = analysis_result.data
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

def handle_java_code(
    user_code,
    call_template,
    benchmark_profile="random",
    progress_cb=None,
    job_id=None,
    fitting_options=None,
):
    work_dir = tempfile.mkdtemp(prefix="tca_java_")
    profile = normalize_benchmark_profile(benchmark_profile)
    cb = progress_cb or (lambda *a, **k: None)

    def cancelled():
        return bool(job_id and cache.get(f"{_job_key(job_id)}:cancel"))

    try:
        sizes = [10, 50, 100, 200, 500, 1000, 5000, 10000, 50000, 100000]
        output_file_paths = []

        cb("workspace", "Preparing Java workspace and compile…")
        for i, size in enumerate(sizes):
            if cancelled():
                return Response({"error": "Analysis was cancelled."}, status=200)
            cb(
                "benchmark",
                f"Running Java harness for n={size}…",
                {"current": i + 1, "total": len(sizes), "size": size},
            )
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

        if cancelled():
            return Response({"error": "Analysis was cancelled."}, status=200)
        cb("fitting", "Aggregating measurements and fitting growth models…")
        fo = fitting_options or {}
        best_fits = parse_and_analyze(
            output_file_paths,
            model_allowlist=fo.get("model_allowlist"),
            bic_gamma=fo.get("bic_gamma"),
        )
        best_fits["benchmark_profile"] = profile
        best_fits["static_analysis"] = analyze_java_static(user_code)
        attach_fit_static_alignment(best_fits)
        return Response(best_fits)
    except Exception as e:
        logging.exception("Java analysis failed")
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def handle_cpp_code(
    user_code,
    call_template,
    benchmark_profile="random",
    progress_cb=None,
    job_id=None,
    fitting_options=None,
):
    work_dir = tempfile.mkdtemp(prefix="tca_cpp_")
    profile = normalize_benchmark_profile(benchmark_profile)
    cb = progress_cb or (lambda *a, **k: None)

    def cancelled():
        return bool(job_id and cache.get(f"{_job_key(job_id)}:cancel"))

    try:
        sizes = [10, 50, 100, 200, 500, 1000]
        output_file_paths = []

        cb("workspace", "Preparing C++ workspace and compile…")
        for i, size in enumerate(sizes):
            if cancelled():
                return Response({"error": "Analysis was cancelled."}, status=200)
            cb(
                "benchmark",
                f"Running C++ harness for n={size}…",
                {"current": i + 1, "total": len(sizes), "size": size},
            )
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

        if cancelled():
            return Response({"error": "Analysis was cancelled."}, status=200)
        cb("fitting", "Aggregating measurements and fitting growth models…")
        fo = fitting_options or {}
        best_fits = parse_and_analyze(
            output_file_paths,
            model_allowlist=fo.get("model_allowlist"),
            bic_gamma=fo.get("bic_gamma"),
        )
        best_fits["benchmark_profile"] = profile
        best_fits["static_analysis"] = analyze_cpp_static(user_code)
        attach_fit_static_alignment(best_fits)
        return Response(best_fits)
    except Exception as e:
        logging.exception("C++ analysis failed")
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def handle_python_code(
    user_code,
    call_template,
    benchmark_profile="random",
    progress_cb=None,
    job_id=None,
    fitting_options=None,
):
    work_dir = tempfile.mkdtemp(prefix="tca_py_")
    profile = normalize_benchmark_profile(benchmark_profile)
    cb = progress_cb or (lambda *a, **k: None)

    def cancelled():
        return bool(job_id and cache.get(f"{_job_key(job_id)}:cancel"))

    try:
        sizes = [10, 50, 100, 200, 500, 1000, 5000, 10000, 50000, 100000]
        output_file_paths = []

        cb("workspace", "Preparing Python workspace…")
        for i, size in enumerate(sizes):
            if cancelled():
                return Response({"error": "Analysis was cancelled."}, status=200)
            cb(
                "benchmark",
                f"Running Python harness for n={size}…",
                {"current": i + 1, "total": len(sizes), "size": size},
            )
            output_file_path = os.path.join(work_dir, f"output_python_{size}.txt")
            output_file_paths.append(output_file_path)

            if os.path.exists(output_file_path):
                os.remove(output_file_path)

            run_instrumented_python_code(
                user_code, get_iteration_size(size), size, work_dir, benchmark_profile=profile
            )

        if cancelled():
            return Response({"error": "Analysis was cancelled."}, status=200)
        cb("fitting", "Aggregating measurements and fitting growth models…")
        fo = fitting_options or {}
        best_fits = parse_and_analyze(
            output_file_paths,
            model_allowlist=fo.get("model_allowlist"),
            bic_gamma=fo.get("bic_gamma"),
        )
        cb("finalize", "Computing static structure hints…")
        best_fits["static_analysis"] = analyze_python_static(user_code)
        best_fits["benchmark_profile"] = profile
        attach_fit_static_alignment(best_fits)
        return Response(best_fits)
    except Exception as e:
        logging.exception("Python analysis failed")
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def _run_analysis_job(job_id, validated_data, benchmark_profile, code_pk, fitting_options=None):
    """Background worker: runs the same analysis as synchronous ``analyse_code`` and updates cache + DB."""

    def progress(phase, message, extra=None):
        _job_merge_state(
            job_id,
            {
                "status": "running",
                "phase": phase,
                "message": message,
                "progress": extra or {},
            },
        )

    try:
        user_code = validated_data.get("code")
        language = validated_data.get("language", "java").lower()
        progress("workspace", f"Dispatching {language} analysis…")
        call_template = extract_call_template(user_code, language)

        language_map = {
            "java": handle_java_code,
            "cpp": handle_cpp_code,
            "python": handle_python_code,
        }
        if language not in language_map:
            _job_merge_state(
                job_id,
                {
                    "status": "error",
                    "phase": "error",
                    "message": f"Language '{language}' not supported.",
                    "error": f"Language '{language}' not supported for analysis.",
                },
            )
            return

        analysis_result = language_map[language](
            user_code,
            call_template,
            benchmark_profile=benchmark_profile,
            progress_cb=progress,
            job_id=job_id,
            fitting_options=fitting_options or {},
        )
        if analysis_result.status_code != 200:
            err_body = analysis_result.data
            msg = err_body.get("error", str(err_body)) if isinstance(err_body, dict) else str(err_body)
            _job_merge_state(job_id, {"status": "error", "phase": "error", "message": msg, "error": err_body})
            return

        data = analysis_result.data
        if isinstance(data, dict) and data.get("error") == "Analysis was cancelled.":
            _job_merge_state(
                job_id,
                {
                    "status": "cancelled",
                    "phase": "cancelled",
                    "message": "Analysis was cancelled.",
                    "result": None,
                },
            )
            return

        serialized = ensure_serializable(data)
        Code.objects.filter(pk=code_pk).update(analysis_result=serialized)
        _job_merge_state(
            job_id,
            {
                "status": "done",
                "phase": "done",
                "message": "Analysis complete.",
                "result": serialized,
            },
        )
    except Exception as e:
        logging.exception("Async analysis job failed for job_id=%s", job_id)
        _job_merge_state(job_id, {"status": "error", "phase": "error", "message": str(e), "error": str(e)})


@api_view(["POST"])
@perm_classes(_analyse_code_permissions())
def analyse_code_async_start(request):
    code_serializer = CodeSerializer(data=request.data)
    if not code_serializer.is_valid():
        logging.warning("Validation errors (async): %s", code_serializer.errors)
        return Response(code_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    validated_data = code_serializer.validated_data
    benchmark_profile = normalize_benchmark_profile(str(request.data.get("benchmark_profile") or "random"))
    fitting_opts = fitting_options_from_request_payload(request.data)
    saved_code = Code.objects.create(**validated_data)
    job_id = str(uuid.uuid4())
    _job_merge_state(
        job_id,
        {
            "status": "queued",
            "phase": "queued",
            "message": "Queued…",
            "progress": {},
            "code_id": saved_code.pk,
        },
    )
    thread = threading.Thread(
        target=_run_analysis_job,
        args=(job_id, validated_data, benchmark_profile, saved_code.pk, fitting_opts),
        daemon=True,
    )
    thread.start()
    return Response({"job_id": job_id}, status=status.HTTP_202_ACCEPTED)


@api_view(["GET"])
@perm_classes(_analyse_code_permissions())
def analyse_code_async_status(request, job_id):
    try:
        uuid.UUID(str(job_id))
    except ValueError:
        return Response({"detail": "Invalid job id"}, status=status.HTTP_400_BAD_REQUEST)
    state = cache.get(_job_key(job_id))
    if state is None:
        return Response({"detail": "Unknown or expired job"}, status=status.HTTP_404_NOT_FOUND)
    return Response(state)


@api_view(["POST"])
@perm_classes(_analyse_code_permissions())
def analyse_code_async_cancel(request, job_id):
    try:
        uuid.UUID(str(job_id))
    except ValueError:
        return Response({"detail": "Invalid job id"}, status=status.HTTP_400_BAD_REQUEST)
    if cache.get(_job_key(job_id)) is None:
        return Response({"detail": "Unknown or expired job"}, status=status.HTTP_404_NOT_FOUND)
    cache.set(f"{_job_key(job_id)}:cancel", True, JOB_CACHE_TTL)
    return Response({"ok": True, "message": "Cancel requested"})


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
