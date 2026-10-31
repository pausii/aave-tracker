<script lang="ts">
  import { onMount } from 'svelte';
  import echarts from '../lib/echarts';
  import type { EChartsType } from 'echarts/core';
  import type { Point } from '../lib/calc';
  import { toUnits } from '../lib/calc';
  import { theme } from '../lib/theme.svelte';
  import { tokens, axisCommon, tooltipCommon, splitLine, FONT, type Tokens } from '../lib/chartTheme';

  let { points }: { points: Point[] } = $props();

  let balanceEl: HTMLDivElement;
  let interestEl: HTMLDivElement;
  let balanceChart: EChartsType | undefined;
  let interestChart: EChartsType | undefined;

  function usdt(v: number) { return `${v.toFixed(4)} USDT`; }

  function balanceOption(t: Tokens) {
    // Axis bounds follow the data. Left alone, ECharts anchors at 0 and the
    // daily rise (about 0.16 on 1,400) flattens into a straight line.
    const values = points.map((p) => toUnits(p.balance));
    const lo = Math.min(...values), hi = Math.max(...values);
    const span = (hi - lo) || 1;
    // Round outward to a round step, otherwise the pinned bounds produce axis
    // labels like "1,468.8751".
    const step = 10 ** Math.floor(Math.log10(span)) / 2;
    const min = Math.max(0, Math.floor((lo - span * 0.05) / step) * step);
    const max = Math.ceil((hi + span * 0.05) / step) * step;
    return {
      animation: false,
      grid: { left: 8, right: 12, top: 16, bottom: 8, containLabel: true },
      tooltip: { ...tooltipCommon(t), valueFormatter: (v: number) => usdt(Number(v)) },
      xAxis: { type: 'category', boundaryGap: false, data: points.map((p) => p.date), ...axisCommon(t) },
      yAxis: {
        type: 'value', min, max, ...axisCommon(t),
        axisLine: { show: false },
        splitLine: splitLine(t),
      },
      series: [{
        name: 'Balance', type: 'line', smooth: 0.25, symbol: 'none',
        data: points.map((p) => toUnits(p.balance)),
        lineStyle: { width: 2, color: t.patina },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: t.brass, type: [4, 4], width: 1 },
          label: {
            color: t.brass, fontFamily: FONT, fontSize: 11,
            formatter: (m: { name: string }) => m.name,
            // ECharts rotates labels on vertical mark lines by default, which
            // left them standing on end against the axis.
            rotate: 0,
            position: 'insideEndTop',
            distance: 4,
          },
          data: points
            .filter((p) => p.netFlow !== 0n)
            .map((p) => ({
              xAxis: p.date,
              name: `${p.netFlow > 0n ? '+' : '−'}${Math.abs(toUnits(p.netFlow)).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
            })),
        },
      }],
    };
  }

  function interestOption(t: Tokens) {
    let running = 0;
    const cumulative = points.map((p) => (running += toUnits(p.interest)));
    return {
      animation: false,
      grid: { left: 8, right: 12, top: 16, bottom: 8, containLabel: true },
      tooltip: { ...tooltipCommon(t), valueFormatter: (v: number) => usdt(Number(v)) },
      xAxis: { type: 'category', data: points.map((p) => p.date), ...axisCommon(t) },
      yAxis: [
        { type: 'value', ...axisCommon(t), axisLine: { show: false }, splitLine: splitLine(t) },
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
