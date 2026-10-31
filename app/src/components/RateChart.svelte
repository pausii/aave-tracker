<script lang="ts">
  import echarts from '../lib/echarts';
  import type { EChartsType } from 'echarts/core';
  import type { RatePoint } from '../lib/calc';
  import { theme } from '../lib/theme.svelte';
  import { tokens, axisCommon, tooltipCommon, splitLine, type Tokens } from '../lib/chartTheme';

  let { rates }: { rates: RatePoint[] } = $props();

  // The chart element lives inside a conditional branch, so it comes and goes;
  // both it and the instance have to be reactive for the effects below to track.
  let el = $state<HTMLDivElement | undefined>();
  let chart = $state<EChartsType | undefined>();

  const average = $derived(rates.length ? rates.reduce((a, r) => a + r.apr, 0) / rates.length : 0);
  const spread = $derived(
    rates.length ? { lo: Math.min(...rates.map((r) => r.apr)), hi: Math.max(...rates.map((r) => r.apr)) } : null,
  );

  function option(t: Tokens) {
    return {
      animation: false,
      grid: { left: 8, right: 12, top: 18, bottom: 8, containLabel: true },
      tooltip: {
        ...tooltipCommon(t),
        formatter: (params: { dataIndex: number }[]) => {
          const r = rates[params[0].dataIndex];
          const note = r.approximate ? '<br><span style="opacity:.65">estimated: funds moved that day</span>' : '';
          return `${r.date}<br><b>${r.apr.toFixed(2)}%</b> annualised${note}`;
        },
      },
      xAxis: { type: 'category', boundaryGap: false, data: rates.map((r) => r.date), ...axisCommon(t) },
      yAxis: {
        type: 'value', scale: true, ...axisCommon(t),
        axisLine: { show: false },
        axisLabel: { ...axisCommon(t).axisLabel, formatter: '{value}%' },
        splitLine: splitLine(t),
      },
      series: [{
        name: 'Rate earned',
        type: 'line',
        smooth: 0.2,
        data: rates.map((r) => r.apr),
        lineStyle: { width: 2, color: t.patina },
        // Days when money moved are estimates, so they are marked rather than
        // blended invisibly into the line.
        symbol: (_: unknown, params: { dataIndex: number }) =>
          (rates[params.dataIndex]?.approximate ? 'emptyCircle' : 'none'),
        symbolSize: 7,
        itemStyle: { color: t.brass, borderWidth: 1.6 },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [{ yAxis: average }],
          lineStyle: { color: t.muted, type: [4, 4], width: 1 },
          label: { formatter: `avg ${average.toFixed(2)}%`, color: t.faint, fontSize: 11, position: 'insideEndTop' },
        },
      }],
    };
  }

  $effect(() => {
    if (!el) return;
    const instance = echarts.init(el);
    chart = instance;
    const ro = new ResizeObserver(() => instance.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      instance.dispose();
      chart = undefined;
    };
  });

  $effect(() => {
    theme.isDark; // redraw when the theme changes
    if (!chart || rates.length === 0) return;
    chart.setOption(option(tokens()), true);
  });
</script>

<section class="rounded-xl border border-hairline bg-surface px-4 pb-3 pt-4">
  <div class="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
    <h2 class="font-display text-base font-medium">Rate earned</h2>
    {#if spread}
      <span class="text-xs text-faint">
        Ranged {spread.lo.toFixed(2)}% to {spread.hi.toFixed(2)}% annualised over {rates.length}
        full {rates.length === 1 ? 'day' : 'days'}
      </span>
    {/if}
  </div>
  {#if rates.length === 0}
    <p class="py-8 text-sm text-muted">A rate appears once a day has closed.</p>
  {:else}
    <div bind:this={el} class="h-44 w-full sm:h-52"></div>
  {/if}
</section>
