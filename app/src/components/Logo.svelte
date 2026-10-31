<script lang="ts">
  // A ring of ticks: the milled edge of a coin, which also reads as the dial of
  // a measuring instrument. Inside it, the rising line the dial is measuring.
  let { size = 28, class: cls = '' }: { size?: number; class?: string } = $props();

  const ticks = Array.from({ length: 36 }, (_, i) => i * 10);
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 48 48"
  fill="none"
  role="img"
  aria-label="Aave Tracker"
  class={cls}
>
  <g stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.5">
    {#each ticks as angle (angle)}
      <!-- longer ticks every 90° mark the quadrants -->
      <line
        x1="24" y1={angle % 90 === 0 ? 3.5 : 5.5} x2="24" y2="9"
        transform={`rotate(${angle} 24 24)`}
      />
    {/each}
  </g>
  <path
    d="M14 31.5 L21 25.5 L27 28.5 L35 17.5"
    stroke="currentColor"
    stroke-width="2.6"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <circle cx="35" cy="17.5" r="3.2" fill="currentColor" />
</svg>
