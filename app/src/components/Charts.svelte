<script lang="ts">
  import { onMount } from 'svelte';
  import echarts from '../lib/echarts';
  import type { EChartsType } from 'echarts/core';
  import type { Point } from '../lib/calc';
  import { toUnits } from '../lib/calc';
  import { theme } from '../lib/theme.svelte';

  let { points }: { points: Point[] } = $props();

  let balanceEl: HTMLDivElement;
  let interestEl: HTMLDivElement;
  let balanceChart: EChartsType | undefined;
  let interestChart: EChartsType | undefined;

  // Chart colours come from the same CSS tokens as the rest of the page, so
  // light and dark can never drift apart.
  function tokens() {
    const s = getComputedStyle(document.documentElement);
    const v = (n: string) => s.getPropertyValue(n).trim();
    return {
      ink: v('--c-ink'), muted: v('--c-muted'), faint: v('--c-faint'),
      hairline: v('--c-hairline'), surface: v('--c-surface'),
      patina: v('--c-patina'), brass: v('--c-brass'), dial: v('--c-dial'),
    };
  }

  const FONT = '"IBM Plex Sans Variable", system-ui, sans-serif';
  const usdt = (v: number) => `${v.toFixed(4)} USDT`;

  function axisCommon(t: ReturnType<typeof tokens>) {
    return {
      axisLabel: { color: t.faint, fontFamily: FONT, fontSize: 11 },
      axisLine: { lineStyle: { color: t.hairline } },
      axisTick: { show: false },
    };
  }

  function tooltipCommon(t: ReturnType<typeof tokens>) {
    return {
      trigger: 'axis' as const,
      backgroundColor: t.surface,
      borderColor: t.hairline,
      textStyle: { color: t.ink, fontFamily: FONT, fontSize: 12 },
      extraCssText: 'box-shadow:none;border-radius:8px;',
    };
  }

  function balanceOption(t: ReturnType<typeof tokens>) {
    // Axis bounds follow the data. Left alone, ECharts anchors at 0 and the
    // daily rise (about 0.16 on 1,400) flattens into a straight line.
    const values = points.map((p) => toUnits(p.balance));
    const lo = Math.min(...values), hi = Math.max(...values);
    const pad = Math.max((hi - lo) * 0.05, 0.02);
    return {
      animation: false,
      grid: { left: 8, right: 12, top: 16, bottom: 8, containLabel: true },
      tooltip: { ...tooltipCommon(t), valueFormatter: (v: number) => usdt(Number(v)) },
      xAxis: { type: 'category', boundaryGap: false, data: points.map((p) => p.date), ...axisCommon(t) },
      yAxis: {
        type: 'value', min: +Math.max(0, lo - pad).toFixed(4), max: +(hi + pad).toFixed(4), ...axisCommon(t),
        axisLine: { show: false },
        splitLine: { lineStyle: { color: t.hairline, type: [3, 4] } },
      },
      series: [{
        name: 'Balance', type: 'line', smooth: 0.25, symbol: 'none',
        data: points.map((p) => toUnits(p.balance)),
        lineStyle: { width: 2, color: t.patina },
      }],
    };
  }

  function interestOption(t: ReturnType<typeof tokens>) {
    let running = 0;
    const cumulative = points.map((p) => (running += toUnits(p.interest)));
    return {
      animation: false,
      grid: { left: 8, right: 12, top: 16, bottom: 8, containLabel: true },
      tooltip: { ...tooltipCommon(t), valueFormatter: (v: number) => usdt(Number(v)) },
      xAxis: { type: 'category', data: points.map((p) => p.date), ...axisCommon(t) },
      yAxis: [
        { type: 'value', ...axisCommon(t), axisLine: { show: false }, splitLine: { lineStyle: { color: t.hairline, type: [3, 4] } } },
        { type: 'value', ...axisCommon(t), axisLine: { show: false }, splitLine: { show: false } },
      ],
      series: [
        {
          name: 'Earned that day', type: 'bar', barMaxWidth: 22,
          // The running day is brass so it is not misread as a full day that
          // happened to earn little.
          data: points.map((p) => ({
            value: toUnits(p.interest),
            itemStyle: { color: p.partial ? t.brass : t.patina, borderRadius: [3, 3, 0, 0] },
          })),
        },
        {
          name: 'Running total', type: 'line', yAxisIndex: 1, smooth: 0.25, symbol: 'none',
          data: cumulative,
          lineStyle: { width: 1.5, color: t.muted, type: [5, 4] },
        },
      ],
    };
  }

  onMount(() => {
    balanceChart = echarts.init(balanceEl);
    interestChart = echarts.init(interestEl);
    const ro = new ResizeObserver(() => {
      balanceChart?.resize();
      interestChart?.resize();
    });
    ro.observe(balanceEl);
    ro.observe(interestEl);
    return () => {
      ro.disconnect();
      balanceChart?.dispose();
      interestChart?.dispose();
    };
  });

  $effect(() => {
    theme.isDark; // redraw when the theme changes
    if (!balanceChart || !interestChart) return;
    if (points.length === 0) {
      balanceChart.clear();
      interestChart.clear();
      return;
    }
    const t = tokens();
    balanceChart.setOption(balanceOption(t), true);
    interestChart.setOption(interestOption(t), true);
  });
</script>

<section class="grid gap-4 lg:grid-cols-2">
  <div class="rounded-xl border border-hairline bg-surface px-4 pb-3 pt-4">
    <div class="mb-1 flex items-baseline justify-between">
      <h2 class="font-display text-base font-medium">Balance</h2>
      <span class="text-xs text-faint">USDT supplied</span>
    </div>
    <div bind:this={balanceEl} class="h-60 w-full sm:h-72"></div>
  </div>

  <div class="rounded-xl border border-hairline bg-surface px-4 pb-3 pt-4">
    <div class="mb-1 flex items-baseline justify-between">
      <h2 class="font-display text-base font-medium">Interest</h2>
      <span class="text-xs text-faint">Bars are days, line is the running total</span>
    </div>
    <div bind:this={interestEl} class="h-60 w-full sm:h-72"></div>
  </div>
</section>
