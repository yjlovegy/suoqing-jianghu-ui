<!-- eslint-disable better-tailwindcss/no-unknown-classes -->
<template>
  <section>
    <p class="fh-kicker">BANKROLL</p><h2>资产与筹码</h2>
    <div class="chip-grid">
      <article class="chip-card big"><div class="chip">大</div><span>大筹码</span><strong>{{ data.资产.玩家筹码.大筹码 }}</strong><small>每枚10万美元</small></article>
      <article class="chip-card small"><div class="chip">小</div><span>小筹码</span><strong>{{ data.资产.玩家筹码.小筹码 }}</strong><small>每枚1万美元</small></article>
    </div>
    <div class="summary fh-card"><span>入场预设</span><b>{{ data.资产.筹码预设 }}</b><span>总资产</span><b>${{ totalDollars.toLocaleString('en-US') }}</b><span>自动兑换</span><b>1大 = 10小</b></div>
    <p class="note">牌局引擎以小筹码为最小单位计算，并在显示时自动换算；不会产生第三种面额。</p>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { Schema as CasinoSchema } from '../../../schema';
const props = defineProps<{ data: CasinoSchema }>();
const totalDollars = computed(() => (props.data.资产.玩家筹码.大筹码 * 10 + props.data.资产.玩家筹码.小筹码) * 10_000);
</script>
<style scoped>h2{margin:4px 0 12px;font-size:17px;font-weight:500;letter-spacing:.12em}.chip-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.chip-card{border:1px solid var(--fh-line);padding:15px;display:grid;grid-template-columns:58px 1fr auto;align-items:center;gap:3px 12px;background:radial-gradient(circle at 20%,rgba(209,173,98,.11),transparent 35%),#0c090a}.chip{grid-row:1/4;width:58px;aspect-ratio:1;border:4px double var(--fh-gold);border-radius:50%;display:grid;place-items:center;color:var(--fh-gold);font:700 18px Georgia}.chip-card span{color:var(--fh-muted);font-size:10px}.chip-card strong{grid-row:1/3;grid-column:3;font:500 30px Georgia;color:var(--fh-gold)}.chip-card small{color:var(--fh-muted);font-size:9px}.summary{margin-top:10px;display:grid;grid-template-columns:110px 1fr;gap:7px;font-size:11px}.summary span{color:var(--fh-muted)}.summary b{font-weight:500}.note{color:var(--fh-muted);font-size:10px;line-height:1.7}@media(max-width:620px){.chip-grid{grid-template-columns:1fr}.summary{grid-template-columns:90px 1fr}}</style>
