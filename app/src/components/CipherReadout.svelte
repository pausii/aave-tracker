<script lang="ts">
  import { untrack } from 'svelte';
  // The encrypted balance is drawn as what it is: a row of shifting glyphs.
  // On unlock the slots fall into place one by one, left to right, like the
  // tumblers of a lock, settling on the real figure.
  let { target = null, onSettled }: { target?: string | null; onSettled?: () => void } = $props();

  const SHAPE = '1,401.3046';           // sets the slot count and separator positions only
  // Deliberately free of digits: with them, a random row sometimes reads like a
  // real balance. The comma and period stay, so the shape still says "a sum of
  // money lives here" while the glyphs say it cannot be read.
  const GLYPHS = 'ABCDEFGHJKMNPQRSTVWXYZ+/=';
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isSeparator = (c: string) => c === ',' || c === '.';
  const pick = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

  let chars = $state<string[]>([...SHAPE].map((c) => (isSeparator(c) ? c : reduced ? '█' : pick())));
  let settledUpTo = $state(-1);

  $effect(() => {
    if (target || reduced) return;
    const id = setInterval(() => {
      chars = chars.map((c, i) => (isSeparator(c) || i <= settledUpTo ? c : pick()));
    }, 70);
    return () => clearInterval(id);
  });

  $effect(() => {
    if (!target) return;
    const final = [...target];
    if (reduced) {
      chars = final;
      settledUpTo = final.length;
      onSettled?.();
      return;
    }
    // untrack: without it this effect would depend on `chars` and re-run on
    // every glyph change, so the animation would never finish.
    const width = untrack(() => chars.length);
    if (final.length !== width) chars = final.map((c) => (isSeparator(c) ? c : pick()));
    let i = 0;
    const id = setInterval(() => {
      settledUpTo = i;
      chars = chars.map((c, j) => (j <= i ? final[j] : isSeparator(c) ? c : pick()));
      i++;
      if (i >= final.length) {
        clearInterval(id);
        setTimeout(() => onSettled?.(), 420);
      }
    }, 55);
    return () => clearInterval(id);
  });
</script>

<div class="readout flex items-baseline gap-[0.02em] text-[clamp(2.6rem,11vw,4.1rem)] leading-none">
  {#each chars as c, i (i)}
    {#if isSeparator(c)}
      <span class="text-faint">{c}</span>
    {:else}
      <span
        class="inline-block w-[0.62em] text-center transition-colors duration-300"
        class:text-ink={i <= settledUpTo}
        class:text-dial={i > settledUpTo}
      >{c}</span>
    {/if}
  {/each}
  <span class="ml-3 font-sans text-[0.26em] font-medium tracking-wide text-faint">USDT</span>
</div>
