import { TIME_COMPLEXITY_NOTATION } from '../constants/timeComplexityNotation';

const MODEL_BLURBS = {
  constant:
    'The harness picked a model with almost flat growth vs n. Constant-time claims are easy to fake with noise—trust the spread across sizes.',
  linear:
    'Growth looks roughly proportional to n. That matches a single dominant pass over the input, unless caching or branchy inner work distorts the curve.',
  quadratic:
    'Growth is consistent with two nested scales (e.g. n×n work). On sorted or adversarial profiles some algorithms bend toward linear—check the compare run if enabled.',
  cubic:
    'Very steep growth vs n—triple-nested structure or expensive inner kernels can land here on small n before noise dominates.',
  logarithmic:
    'Sub-linear growth often means divide-and-conquer halving (binary search style) or very cheap per-step work on the measured lines.',
  log_linear:
    'Typical of divide-and-conquer with linear merge work (merge sort style) or tree map/heap operations amortized over n.',
  exponential:
    'Extremely aggressive growth—often a misfit on bounded benches; treat as a red flag unless you truly expect combinatorial blow-up.',
  factorial:
    'Factorial-shaped growth is rare in practice on bounded n; verify with code inspection and a second benchmark profile.',
  polynomial:
    'Polynomial family without a fixed degree in the label—inspect which coefficient dominates at your largest n.',
  polylogarithmic:
    'Polylogarithmic growth sits between log and linear; common in heap-heavy inner loops or tree height effects.',
  fractional_power:
    'Fractional power between linear and quadratic can appear when sub-quadratic but super-linear structure is present.',
  quasilinear:
    'Close to n log n with extra log factors—often benign on small n but diverges from pure linear.',
  quasi_polynomial:
    'Uncommon in standard sorts; double-check the fit and JSON export before citing in interviews.',
  subexponential:
    'Between polynomial and exponential on the bench—usually a transitional misfit; cross-check static hints (Python).',
  polynomial_linear_exponent:
    'Very aggressive; on finite harness sizes this is often an overfit—prefer simpler models unless residuals justify it.',
  double_exponential:
    'Almost never the right story for array algorithms on this harness—treat as a fitting artifact unless proven otherwise.',
  inverse_ackermann:
    'Ultra-slow-growing union-find style curves can masquerade as logs on small n; needs many orders of magnitude to separate.',
  iterated_logarithmic:
    'Iterated log growth is extremely flat; easy to confuse with constant noise on short benches.',
  log_logarithmic:
    'Between log and log log—common when counting tree layers on exponentially growing n.',
};

function notationForModel(modelKey) {
  if (!modelKey) return '';
  return TIME_COMPLEXITY_NOTATION[modelKey] || '';
}

/**
 * Build "Why this Big-O?" copy from empirical fit + optional static hints (Python AST or Java/C++ scan).
 */
export function buildBigOExplainer({ language, fittedModelKey, staticAnalysis, fitStaticAlignment }) {
  const notation = notationForModel(fittedModelKey);
  const bullets = [];

  if (notation && fittedModelKey) {
    const blurb = MODEL_BLURBS[fittedModelKey];
    const humanModel = fittedModelKey.replace(/_/g, ' ');
    if (blurb) {
      bullets.push(`Empirical fit: ${notation} (${humanModel}). ${blurb}`);
    } else {
      bullets.push(`Empirical fit selected ${notation || fittedModelKey} — see Growth tab for residuals vs the curve.`);
    }
  }

  bullets.push(
    'Bench noise, JIT warmup, CPU frequency scaling, and the benchmark input profile all move points; Big-O is about limits, not one noisy run.'
  );

  let staticAlignment = 'n/a';
  if (fitStaticAlignment && fitStaticAlignment.status) {
    const st = fitStaticAlignment.status;
    if (st !== 'unavailable') {
      if (st === 'aligned') staticAlignment = 'aligned (structure vs bench)';
      else if (st === 'empirical_milder') staticAlignment = 'empirical milder than nesting bound';
      else if (st === 'empirical_harsher') staticAlignment = 'empirical harsher than nesting bound';
      else if (st === 'incomplete') staticAlignment = 'incomplete';
      else staticAlignment = st;
      if (fitStaticAlignment.message) {
        bullets.push(`Structure vs bench: ${fitStaticAlignment.message}`);
      }
    }
  }

  if (staticAnalysis && staticAnalysis.ok) {
    const lang = (staticAnalysis.language || '').toLowerCase();
    const hints = staticAnalysis.hints || [];
    if (lang === 'python') {
      const nest = staticAnalysis.max_loop_nesting ?? 0;
      bullets.push(
        `Python AST hints: max loop nesting ${nest}, recursion ${staticAnalysis.recursion_direct ? 'yes' : 'no'}.`
      );
      if (hints.length) {
        bullets.push(...hints.map((h) => `Structure: ${h}`));
      }
      if (staticAlignment === 'n/a') {
        if (fittedModelKey === 'quadratic' && nest >= 2) {
          staticAlignment = 'agrees';
        } else if (fittedModelKey === 'quadratic' && nest <= 1) {
          staticAlignment = 'nuanced';
          bullets.push(
            'Note: Fit suggests quadratic growth but AST shows shallow nesting—could be library calls, Python overhead, or line-level attribution effects.'
          );
        } else if (fittedModelKey === 'linear' && nest === 1) {
          staticAlignment = 'agrees';
        } else if (fittedModelKey === 'linear' && nest >= 2) {
          staticAlignment = 'nuanced';
          bullets.push(
            'Note: Nested loops in AST but linear-looking fit—inner loops may be bounded or dominated by a few lines.'
          );
        } else {
          staticAlignment = 'nuanced';
        }
      }
    } else if (lang === 'java' || lang === 'cpp') {
      const label = lang === 'java' ? 'Java' : 'C++';
      bullets.push(
        `${label} structure scan: max loop nesting ${staticAnalysis.max_loop_nesting ?? 0}, ` +
          `${staticAnalysis.for_loops ?? 0} for, ${staticAnalysis.while_loops ?? 0} while/do, recursion ` +
          `${staticAnalysis.recursion_direct ? 'yes' : 'no'}.`
      );
      if (staticAnalysis.scan_note) {
        bullets.push(`Structure note: ${staticAnalysis.scan_note}`);
      }
      if (hints.length) {
        bullets.push(...hints.map((h) => `Structure: ${h}`));
      }
      if (staticAlignment === 'n/a') {
        staticAlignment = 'nuanced';
      }
    } else if (hints.length) {
      bullets.push(...hints.map((h) => `Structure: ${h}`));
    }
  } else if (language && (!staticAnalysis || !staticAnalysis.ok)) {
    bullets.push('No static structure payload on this run (parse error or empty snippet).');
  }

  return {
    notation,
    bullets,
    staticAlignment,
  };
}
