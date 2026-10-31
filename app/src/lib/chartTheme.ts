// Shared ECharts styling. Chart colours are read from the same CSS tokens as the
// rest of the page, so light and dark can never drift apart.
export const FONT = '"IBM Plex Sans Variable", system-ui, sans-serif';

export interface Tokens {
  ink: string; muted: string; faint: string; hairline: string;
  surface: string; patina: string; brass: string; dial: string;
}

export function tokens(): Tokens {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return {
    ink: v('--c-ink'), muted: v('--c-muted'), faint: v('--c-faint'),
    hairline: v('--c-hairline'), surface: v('--c-surface'),
    patina: v('--c-patina'), brass: v('--c-brass'), dial: v('--c-dial'),
  };
}

export function axisCommon(t: Tokens) {
  return {
    axisLabel: { color: t.faint, fontFamily: FONT, fontSize: 11 },
    axisLine: { lineStyle: { color: t.hairline } },
    axisTick: { show: false },
  };
}

export function tooltipCommon(t: Tokens) {
  return {
    trigger: 'axis' as const,
    backgroundColor: t.surface,
    borderColor: t.hairline,
    textStyle: { color: t.ink, fontFamily: FONT, fontSize: 12 },
    extraCssText: 'box-shadow:none;border-radius:8px;',
  };
}

export const splitLine = (t: Tokens) => ({ lineStyle: { color: t.hairline, type: [3, 4] as [number, number] } });
