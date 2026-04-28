import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

const LOOP_FADE_MS = 600;

/** Public story: Confusion → Leak → Diagnose → Rebuild → Trust → Convert */
export const scenes = [
  {
    id: 'chaos',
    label: 'Confusion',
    timeline: 'Confusion',
    description: 'Unclear story, competing blocks, and a CTA people never find.',
    ms: 5000,
  },
  {
    id: 'hook',
    label: 'Leak',
    timeline: 'Leak',
    description: 'Visitors arrive — most leave before they act.',
    ms: 3500,
  },
  {
    id: 'diagnosis',
    label: 'Diagnose',
    timeline: 'Diagnose',
    description: 'We map what blocks the path — message, proof, flow, and the ask.',
    ms: 6500,
  },
  {
    id: 'rebuild',
    label: 'Rebuild',
    timeline: 'Rebuild',
    description: 'One obvious path and a CTA that is impossible to miss.',
    ms: 6500,
  },
  {
    id: 'trust',
    label: 'Trust',
    timeline: 'Trust',
    description: 'Proof before the ask so the CTA feels safe, not desperate.',
    ms: 5000,
  },
  {
    id: 'result',
    label: 'Convert',
    timeline: 'Convert',
    description: 'Same traffic — more leads, calls, and customers.',
    ms: 3500,
  },
] as const;

const TOTAL_MS = scenes.reduce((a, s) => a + s.ms, 0);

const DIAG_FINDINGS = [
  'Message unclear',
  'CTA lacks urgency',
  'Proof appears too late',
  'Path to action is weak',
];

const CHAOS_CALLOUTS = ['Confusing', 'Hidden CTA', 'Friction'] as const;
const WIN_CALLOUTS = ['Clear', 'Action', 'Trust'] as const;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function syncHeroLabel(sceneIndex: number) {
  const el = document.getElementById('heroBuildStepLabel');
  if (!el) return;
  const s = scenes[sceneIndex];
  if (s) el.textContent = `${sceneIndex + 1} · ${s.label}`;
}

export function ConversionLeakRepairDemo() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [loopVisible, setLoopVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [sceneElapsed, setSceneElapsed] = useState(0);
  const [chaosCallout, setChaosCallout] = useState(0);
  const [winCallout, setWinCallout] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const scene = scenes[sceneIndex];
  const sceneId = scene?.id;
  const sceneMs = scenes[sceneIndex]?.ms ?? 3000;

  const t =
    sceneMs > 0 ? Math.min(1, sceneElapsed / sceneMs) : 0;

  useEffect(() => {
    syncHeroLabel(reducedMotion ? scenes.length - 1 : sceneIndex);
  }, [sceneIndex, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || paused) return;

    const timer = window.setTimeout(() => {
      if (sceneIndex >= scenes.length - 1) {
        setLoopVisible(false);
        window.setTimeout(() => {
          setSceneIndex(0);
          setLoopVisible(true);
        }, LOOP_FADE_MS);
      } else {
        setSceneIndex((i) => i + 1);
      }
    }, sceneMs);

    return () => window.clearTimeout(timer);
  }, [sceneIndex, paused, reducedMotion, sceneMs]);

  useEffect(() => {
    setSceneElapsed(0);
    if (reducedMotion) return;
    const start = performance.now();
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      setSceneElapsed(Math.min(sceneMs, performance.now() - start));
    }, 48);
    return () => window.clearInterval(id);
  }, [sceneIndex, sceneMs, reducedMotion]);

  useEffect(() => {
    if (sceneId !== 'chaos') {
      setChaosCallout(0);
      return;
    }
    const id = window.setInterval(() => {
      setChaosCallout((i) => (i + 1) % CHAOS_CALLOUTS.length);
    }, 1100);
    return () => window.clearInterval(id);
  }, [sceneId]);

  useEffect(() => {
    if (sceneId !== 'trust' && sceneId !== 'result') {
      setWinCallout(0);
      return;
    }
    const id = window.setInterval(() => {
      setWinCallout((i) => (i + 1) % WIN_CALLOUTS.length);
    }, 950);
    return () => window.clearInterval(id);
  }, [sceneId]);

  const overallProgress = useMemo(() => {
    let done = 0;
    for (let i = 0; i < sceneIndex; i++) done += scenes[i].ms;
    done += sceneElapsed;
    return Math.min(100, (done / TOTAL_MS) * 100);
  }, [sceneIndex, sceneElapsed]);

  if (reducedMotion) {
    return <ReducedMotionBeforeAfter />;
  }

  const isHook = sceneId === 'hook';
  const isChaos = sceneId === 'chaos';
  const isDiagnosis = sceneId === 'diagnosis';
  const isRebuild = sceneId === 'rebuild';
  const isTrust = sceneId === 'trust';
  const isResult = sceneId === 'result';

  const weakPhase = isHook || isChaos || isDiagnosis || (isRebuild && t < 0.5);
  const pathClear = isTrust || isResult || (isRebuild && t > 0.42);
  const strongCopy = isTrust || isResult || (isRebuild && t > 0.52);
  const fullTrustChrome = isTrust || isResult;
  const ctaMagnetic = isTrust || isResult || (isRebuild && t > 0.38);
  const showSnapEase = isRebuild;
  const showGuidedVisitors = isTrust || isResult || (isRebuild && t > 0.48);
  const showHookBanner = isHook;
  const showTrustBanner = isTrust && !isResult;
  const showPathLabel = pathClear && ((isRebuild && t > 0.4) || isTrust || isResult);
  const showResultOverlay = isResult && t > 0.22;

  const headline = strongCopy
    ? 'Turn the traffic you already have into more revenue'
    : 'Traffic shows up — but the next step is buried';
  const sub = strongCopy
    ? 'One offer, proof up front, and a next step your buyers can act on — without thinking twice.'
    : 'Weak headline, hidden CTA, and late trust — so visitors leave without becoming leads.';

  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center justify-center p-[2.5%] sm:p-[3.5%]',
        'transition-opacity duration-500 ease-out',
        loopVisible ? 'opacity-100' : 'opacity-0'
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="img"
      aria-label="Conversion story: visitors leak, friction exposed, expert diagnosis, path rebuilt, trust before the ask, stronger results. Pauses on hover."
    >
      <div className="relative flex h-full max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_24px_55px_-14px_rgba(15,23,42,0.22)]">
        <div
          className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-slate-50/90 px-3 py-2 sm:px-3.5"
          aria-hidden="true"
        >
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-300/90" />
            <span className="size-2.5 rounded-full bg-amber-200/90" />
            <span className="size-2.5 rounded-full bg-emerald-300/90" />
          </div>
          <div className="mx-auto h-6 min-w-0 max-w-[min(100%,14rem)] flex-1 rounded-md bg-white shadow-sm ring-1 ring-slate-200/80" />
        </div>

        <div className="shrink-0 border-b border-slate-100 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
          <div key={sceneId} className="transition-opacity duration-300">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-indigo-600 sm:text-xs">
              {sceneIndex + 1} / {scenes.length} · {scene?.label}
            </p>
            <p className="mt-1 text-[0.7rem] leading-snug text-slate-600 sm:text-sm sm:leading-relaxed">
              {scene?.description}
            </p>
          </div>
        </div>

        <div
          className={cn(
            'relative min-h-0 flex-1 overflow-hidden',
            fullTrustChrome &&
              'bg-gradient-to-b from-white via-white to-slate-50/[0.92]',
            !fullTrustChrome && 'bg-slate-50/45'
          )}
        >
          <div
            className={cn(
              'relative h-full overflow-hidden p-3 sm:p-5',
              isDiagnosis && 'bg-slate-200/55',
              showSnapEase &&
                'transition-[background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
              !showSnapEase && 'transition-[background-color] duration-500'
            )}
          >
            <DecisionPathGraphic clear={pathClear} />

            {isDiagnosis && (
              <div
                className="pointer-events-none absolute inset-x-4 top-[11%] z-30 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent diag-scan-motion sm:inset-x-6"
                aria-hidden="true"
              />
            )}

            {isHook && <VisitorFlowLayer mode="hook" />}
            {isChaos && <VisitorFlowLayer mode="chaos" />}
            {showGuidedVisitors && <VisitorFlowLayer mode="guided" />}

            {showHookBanner && (
              <div className="pointer-events-none absolute left-1/2 top-[12%] z-[36] max-w-[92%] -translate-x-1/2 text-center">
                <span className="rounded-full border border-rose-300/90 bg-white/95 px-3 py-1.5 text-[0.68rem] font-bold tracking-tight text-rose-900 shadow-md sm:text-sm">
                  Most visitors never convert
                </span>
              </div>
            )}

            {showPathLabel && (
              <div className="pointer-events-none absolute bottom-[11%] left-1/2 z-[33] -translate-x-1/2">
                <span className="rounded-full border border-indigo-200/90 bg-white/95 px-3 py-1 text-[0.62rem] font-bold text-indigo-900 shadow-sm sm:text-xs">
                  Clear path to action
                </span>
              </div>
            )}

            {showTrustBanner && (
              <div className="pointer-events-none absolute bottom-[20%] left-1/2 z-[34] -translate-x-1/2 sm:bottom-[22%]">
                <span className="rounded-full border border-emerald-300/90 bg-white/95 px-3 py-1 text-[0.62rem] font-bold text-emerald-900 shadow-sm sm:text-xs">
                  Trust before action
                </span>
              </div>
            )}

            {isChaos && (
              <div
                className="pointer-events-none absolute right-2 top-1/4 z-[35] sm:right-3"
                aria-hidden="true"
              >
                <span className="rounded-md border border-slate-200/90 bg-white/95 px-2 py-1 text-[0.62rem] font-bold uppercase tracking-wide text-slate-600 shadow-sm transition-opacity duration-200 sm:text-xs">
                  {CHAOS_CALLOUTS[chaosCallout]}
                </span>
              </div>
            )}

            {(isTrust || isResult) && (
              <div
                className="pointer-events-none absolute left-2 top-[30%] z-[35] sm:left-3"
                aria-hidden="true"
              >
                <span className="rounded-md border border-indigo-200/80 bg-indigo-50/95 px-2 py-1 text-[0.62rem] font-bold uppercase tracking-wide text-indigo-800 shadow-sm sm:text-xs">
                  {WIN_CALLOUTS[winCallout]}
                </span>
              </div>
            )}

            <div
              className={cn(
                'relative z-10 mx-auto flex h-full max-w-lg flex-col',
                weakPhase ? 'gap-2' : 'gap-4 sm:gap-5',
                weakPhase && 'opacity-[0.9]',
                showSnapEase
                  ? 'transition-[gap,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]'
                  : 'transition-[gap,opacity] duration-700 ease-out'
              )}
            >
              {(isChaos || isDiagnosis) && (
                <div
                  className="order-2 grid grid-cols-3 gap-1 sm:gap-1.5"
                  aria-hidden="true"
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-8 rounded-md bg-slate-200/75 sm:h-9',
                        isChaos && 'translate-y-px odd:-rotate-1 even:rotate-1'
                      )}
                    />
                  ))}
                </div>
              )}

              {isHook && (
                <div
                  className="order-2 flex gap-1 opacity-70 sm:gap-1.5"
                  aria-hidden="true"
                >
                  <div className="h-7 flex-1 rounded-md bg-slate-200/65 sm:h-8" />
                  <div className="h-7 flex-1 rounded-md bg-slate-200/55 sm:h-8" />
                  <div className="h-7 flex-1 rounded-md bg-slate-200/65 sm:h-8" />
                </div>
              )}

              <div
                className={cn(
                  'order-1',
                  isDiagnosis &&
                    'rounded-lg ring-2 ring-amber-500/85 ring-offset-2 ring-offset-transparent sm:ring-offset-[6px]',
                  showSnapEase && t > 0.35 && isRebuild && 'scale-[1.01]',
                  !showSnapEase && 'transition-transform duration-700',
                  showSnapEase && 'transition-transform duration-200'
                )}
              >
                <h2
                  className={cn(
                    'tracking-tight transition-all ease-out',
                    showSnapEase ? 'duration-200' : 'duration-700',
                    weakPhase &&
                      'text-sm font-medium leading-snug text-slate-500 sm:text-base',
                    !weakPhase &&
                      'text-lg font-bold leading-tight text-slate-950 sm:text-xl'
                  )}
                >
                  {headline}
                </h2>
                <p
                  className={cn(
                    'mt-1.5 transition-all ease-out sm:mt-2',
                    showSnapEase ? 'duration-200' : 'duration-700',
                    weakPhase &&
                      'text-[0.62rem] leading-relaxed text-slate-400 sm:text-[0.7rem]',
                    !weakPhase &&
                      'text-xs font-medium leading-relaxed text-slate-600 sm:text-sm'
                  )}
                >
                  {sub}
                </p>
              </div>

              {!fullTrustChrome && (weakPhase || (isRebuild && t < 0.55)) && (
                <div
                  className={cn(
                    'flex gap-1.5 sm:gap-2',
                    weakPhase && !isHook && 'order-5 opacity-40',
                    isHook && 'order-4 opacity-35',
                    isRebuild && t >= 0.5 && 'order-2 opacity-100',
                    isRebuild && t < 0.5 && 'order-5 opacity-45',
                    isDiagnosis &&
                      'rounded-md ring-2 ring-violet-500/70 ring-offset-2 ring-offset-transparent sm:ring-offset-[6px]'
                  )}
                  aria-hidden="true"
                >
                  <div className="h-6 flex-1 rounded-md bg-slate-200/55 sm:h-7" />
                  <div className="h-6 flex-1 rounded-md bg-slate-200/45 sm:h-7" />
                </div>
              )}

              {fullTrustChrome && (
                <div className="order-2 flex flex-col gap-2 sm:gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-amber-400 drop-shadow-sm" aria-hidden="true">
                      ★★★★★
                    </span>
                    <span className="text-[0.62rem] font-semibold text-slate-700 sm:text-xs">
                      4.9 avg. · 500+ programs
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {['+42% lift', '2–3 week launch', 'Conversion-focused'].map((x) => (
                      <span
                        key={x}
                        className="rounded-full border border-slate-200/90 bg-white px-2 py-0.5 text-[0.58rem] font-semibold text-slate-800 shadow-sm sm:text-[0.62rem]"
                      >
                        {x}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div
                className={cn(
                  'transition-all ease-out',
                  showSnapEase ? 'duration-200' : 'duration-700',
                  weakPhase && !isHook && 'order-6',
                  isHook && 'order-6',
                  !weakPhase && 'order-3',
                  isDiagnosis &&
                    'rounded-md ring-2 ring-red-400/80 ring-offset-2 ring-offset-transparent sm:ring-offset-[6px]'
                )}
              >
                <span
                  className={cn(
                    'inline-flex rounded-lg px-3 py-1.5 text-[0.65rem] font-bold transition-all ease-out sm:px-5 sm:py-2.5 sm:text-sm',
                    showSnapEase ? 'duration-200' : 'duration-700',
                    strongCopy
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200/90 text-slate-500',
                    ctaMagnetic && 'cta-magnetic',
                    !ctaMagnetic && strongCopy && 'shadow-md shadow-indigo-600/20',
                    weakPhase && 'opacity-70'
                  )}
                >
                  {strongCopy ? 'Book a conversion audit' : 'Learn more'}
                </span>
              </div>

              {fullTrustChrome && (
                <div className="order-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-indigo-100 bg-indigo-50/95 px-2 py-1 text-[0.58rem] font-bold text-indigo-900 shadow-sm sm:text-[0.62rem]">
                    Strategy-backed
                  </span>
                  <div className="flex gap-1 rounded-lg border border-slate-200/90 bg-white p-1 shadow-md">
                    <div className="w-[3.25rem] rounded bg-slate-100 px-1 py-1.5 text-center text-[0.48rem] font-medium leading-tight text-slate-500">
                      Before
                    </div>
                    <div className="w-[3.25rem] rounded bg-indigo-50 px-1 py-1.5 text-center text-[0.48rem] font-bold leading-tight text-indigo-900">
                      After
                    </div>
                  </div>
                </div>
              )}

              {(isRebuild && t > 0.45) || isTrust || isResult ? (
                <div
                  className={cn(
                    'grid grid-cols-2 gap-3 sm:gap-4',
                    fullTrustChrome ? 'order-5' : 'order-5',
                    'transition-opacity duration-200',
                    isRebuild && t > 0.45 && 'opacity-100'
                  )}
                  aria-hidden="true"
                >
                  <div className="h-14 rounded-2xl bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/90 sm:h-16" />
                  <div className="h-14 rounded-2xl bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/90 sm:h-16" />
                </div>
              ) : null}

              {isDiagnosis && (
                <div
                  className="pointer-events-none absolute bottom-[26%] left-[6%] right-[6%] z-20 h-9 rounded-lg border-2 border-dashed border-indigo-400/45 sm:bottom-[28%]"
                  aria-hidden="true"
                />
              )}
            </div>

            {isDiagnosis && (
              <div className="pointer-events-none absolute inset-y-4 right-1 z-40 flex w-[42%] max-w-[11rem] flex-col justify-center gap-1.5 sm:right-2 sm:max-w-[13rem] sm:gap-2">
                {DIAG_FINDINGS.map((text) => (
                  <div
                    key={text}
                    className="rounded-lg border border-amber-200/90 bg-white/95 px-2 py-1.5 text-[0.58rem] font-semibold leading-snug text-slate-800 shadow-md backdrop-blur-[1px] sm:text-[0.65rem]"
                  >
                    {text}
                  </div>
                ))}
              </div>
            )}

            {showResultOverlay && (
              <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-white/72 p-3 backdrop-blur-[3px] motion-reduce:backdrop-blur-none sm:p-4">
                <div className="max-w-xs rounded-2xl border border-slate-200/90 bg-white px-5 py-4 text-center shadow-[0_20px_50px_-12px_rgba(15,23,42,0.25)] sm:max-w-sm sm:px-6 sm:py-5">
                  <p className="text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl">
                    +42% more conversions
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-600 sm:text-sm">
                    More customers from the traffic you already have.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <TimelineFooter
          sceneIndex={sceneIndex}
          sceneMs={sceneMs}
          paused={paused}
          loopVisible={loopVisible}
          overallProgress={overallProgress}
        />
      </div>
    </div>
  );
}

function DecisionPathGraphic({ clear }: { clear: boolean }) {
  return (
    <div
      className="pointer-events-none absolute inset-3 z-[15] opacity-[0.55] sm:inset-4"
      aria-hidden="true"
    >
      <svg
        className="h-full w-full overflow-visible"
        viewBox="0 0 320 280"
        preserveAspectRatio="none"
      >
        {!clear ? (
          <polyline
            points="32,38 118,52 76,108 198,124 132,178 248,198 168,238"
            fill="none"
            stroke="rgb(148 163 184)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="7 6"
            className="path-dash-animate"
          />
        ) : (
          <line
            x1="160"
            y1="32"
            x2="160"
            y2="246"
            stroke="rgb(99 102 241)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity={0.45}
          />
        )}
      </svg>
    </div>
  );
}

function VisitorFlowLayer({ mode }: { mode: 'hook' | 'chaos' | 'guided' }) {
  const hookLeft = [4, 11, 18, 26, 34, 42, 52, 62, 72, 80];
  const chaosLeft = [3, 14, 22, 31, 40, 55, 63, 74, 82];
  const guidedLeft = [8, 22, 38, 52, 68, 78, 18];
  const guidedTx = ['32%', '22%', '12%', '2%', '-6%', '-14%', '26%'];

  if (mode === 'hook') {
    return (
      <div className="pointer-events-none absolute inset-0 z-[22] overflow-hidden" aria-hidden="true">
        {hookLeft.map((left, i) => (
          <span
            key={i}
            className="visitor-hook absolute top-[20%] size-1.5 rounded-full bg-indigo-600 sm:top-[22%] sm:size-2"
            style={
              {
                left: `${left}%`,
                animationDelay: `${i * 0.14}s`,
                ['--dy']: `${(i % 4) * 3}px`,
                ['--dy2']: `${8 + (i % 5) * 4}px`,
                ['--dy3']: `${14 + (i % 3) * 5}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    );
  }

  if (mode === 'chaos') {
    return (
      <div className="pointer-events-none absolute inset-0 z-[22] overflow-hidden" aria-hidden="true">
        {chaosLeft.map((left, i) => (
          <span
            key={i}
            className="visitor-chaos absolute top-[18%] size-1.5 rounded-full bg-indigo-500 sm:top-[20%] sm:size-2"
            style={
              {
                left: `${left}%`,
                animationDelay: `${i * 0.2}s`,
                ['--dy']: `${(i % 3) * 5 - 4}px`,
                ['--dy2']: `${12 + (i % 4) * 6}px`,
                ['--dy3']: `${20 + (i % 3) * 4}px`,
                ['--rot']: `${(i % 2 ? 1 : -1) * 2.5}deg`,
                ['--rot2']: `${(i % 2 ? -1 : 1) * 3}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[22] overflow-hidden" aria-hidden="true">
      {guidedLeft.map((left, i) => (
        <span
          key={i}
          className="visitor-guided absolute top-[16%] size-1.5 rounded-full bg-emerald-500 shadow-sm sm:size-2"
          style={
            {
              left: `${left}%`,
              animationDelay: `${i * 0.18}s`,
              ['--tx']: guidedTx[i] ?? '18%',
              ['--ty']: '6.25rem',
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function TimelineFooter({
  sceneIndex,
  sceneMs,
  paused,
  loopVisible,
  overallProgress,
}: {
  sceneIndex: number;
  sceneMs: number;
  paused: boolean;
  loopVisible: boolean;
  overallProgress: number;
}) {
  const barWidth = loopVisible ? overallProgress : Math.max(0, overallProgress - 2);

  return (
    <div className="shrink-0 border-t border-slate-100 bg-white px-1.5 py-2 sm:px-2">
      <div className="mb-1.5 flex gap-0.5 sm:gap-1">
        {scenes.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              'min-w-0 flex-1 text-center transition-colors duration-200',
              i === sceneIndex && 'text-indigo-700',
              i < sceneIndex && 'text-indigo-500/90',
              i > sceneIndex && 'text-slate-400'
            )}
          >
            <span className="block truncate text-[0.48rem] font-bold uppercase tracking-wide sm:text-[0.55rem]">
              {s.timeline}
            </span>
          </div>
        ))}
      </div>
      <div className="mb-1.5 flex gap-0.5 sm:gap-1">
        {scenes.map((s, i) => (
          <div
            key={`seg-${s.id}`}
            className={cn(
              'relative h-1 flex-1 overflow-hidden rounded-full bg-slate-100',
              i === sceneIndex && 'ring-1 ring-indigo-200'
            )}
          >
            {i < sceneIndex && <div className="absolute inset-0 bg-indigo-600" />}
            {i === sceneIndex && loopVisible && (
              <div
                key={`${sceneIndex}-${loopVisible}`}
                className="leak-repair-seg absolute inset-0 bg-indigo-600"
                style={
                  {
                    ['--seg-ms']: `${sceneMs}ms`,
                    animationPlayState: paused ? 'paused' : 'running',
                  } as CSSProperties
                }
              />
            )}
          </div>
        ))}
      </div>
      <div className="h-0.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-indigo-500/40 transition-[width] duration-150 ease-linear motion-reduce:transition-none"
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

function ReducedMotionBeforeAfter() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center p-[2.5%] sm:p-[3.5%]"
      role="img"
      aria-label="Before: leaking visitors and weak path. After: clear path, trust, and higher conversions."
    >
      <div className="grid w-full max-w-4xl gap-3 rounded-xl border border-slate-200/90 bg-white p-3 shadow-lg sm:grid-cols-2 sm:gap-4 sm:p-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">
            Before
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Traffic arrives but the path is broken — most people never reach your CTA.
          </p>
          <div className="mt-3 space-y-2 opacity-80" aria-hidden="true">
            <div className="h-2 w-[75%] rounded bg-slate-200" />
            <div className="h-2 w-full rounded bg-slate-200" />
            <div className="h-6 w-[50%] rounded bg-slate-200" />
          </div>
        </div>
        <div className="rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white p-3 shadow-sm">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-indigo-700">
            After
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            One clear decision path, proof before the ask, and a CTA that pulls the right visitors in.
          </p>
          <div className="mt-3 rounded-xl border border-white/80 bg-white px-3 py-2.5 text-center shadow-md">
            <p className="text-base font-extrabold text-slate-950">+42% more conversions</p>
            <p className="mt-1 text-xs font-medium text-slate-600">
              More customers from the traffic you already have.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
