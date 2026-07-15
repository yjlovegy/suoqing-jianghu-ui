<!-- eslint-disable better-tailwindcss/no-unknown-classes -->
<template>
  <section class="opening">
    <div class="mirror-emblem" aria-hidden="true"><span>FH</span></div>
    <p class="fh-kicker">MIDNIGHT ADMISSION</p>
    <h2>镜门大堂 · 午夜入场</h2>
    <p class="intro">镜门尚未为任何迎宾者命名。确认筹码后，第一位女性才会从接待区向你走来。</p>

    <div class="preset-grid">
      <button type="button" class="preset" :class="{ active: selected === '稳健100万美元' }" @click="selected = '稳健100万美元'">
        <strong>100万美元</strong><span>10枚大筹码</span>
      </button>
      <button type="button" class="preset" :class="{ active: selected === '豪客300万美元' }" @click="selected = '豪客300万美元'">
        <strong>300万美元</strong><span>30枚大筹码</span>
      </button>
      <button type="button" class="preset" :class="{ active: selected === '自定义' }" @click="selected = '自定义'">
        <strong>自定义</strong><span>以1万美元为单位</span>
      </button>
    </div>

    <label v-if="selected === '自定义'" class="fh-label custom">
      自定义金额（万美元）
      <input v-model.number="customUnits" class="fh-input" type="number" min="1" step="1" />
    </label>
    <p class="rate">大筹码 = 10万美元 · 小筹码 = 1万美元 · 1大 = 10小</p>
    <p v-if="error" class="fh-error">{{ error }}</p>
    <button type="button" class="fh-button primary enter" :disabled="busy" @click="confirm">
      {{ busy ? '镜门正在开启…' : '确认筹码并入场' }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { selectOpeningChips } from '../controller';

const selected = ref<'稳健100万美元' | '豪客300万美元' | '自定义'>('稳健100万美元');
const customUnits = ref(100);
const busy = ref(false);
const error = ref('');
const smallChips = computed(() => selected.value === '稳健100万美元' ? 100 : selected.value === '豪客300万美元' ? 300 : Math.max(1, Math.floor(customUnits.value)));

async function confirm() {
  busy.value = true; error.value = '';
  try { await selectOpeningChips(selected.value, smallChips.value); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : String(reason); }
  finally { busy.value = false; }
}
</script>

<style scoped>
.opening { padding: 28px 20px 24px; text-align: center; background: linear-gradient(90deg, transparent, rgba(255,255,255,.02), transparent); }
.mirror-emblem { width: 76px; aspect-ratio: 1; margin: 0 auto 15px; border: 1px solid var(--fh-gold); transform: rotate(45deg); display: grid; place-items: center; box-shadow: inset 0 0 20px rgba(209,173,98,.14), 0 0 24px rgba(95,16,29,.25); }
.mirror-emblem span { transform: rotate(-45deg); color: var(--fh-gold); font-family: Georgia, serif; letter-spacing: .12em; }
h2 { margin: 8px 0; font-family: Georgia, "Noto Serif SC", serif; font-weight: 500; letter-spacing: .14em; }
.intro { max-width: 560px; margin: 0 auto 20px; color: var(--fh-muted); font-size: 12px; line-height: 1.8; }
.preset-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; max-width: 650px; margin: auto; }
.preset { border: 1px solid var(--fh-line); background: #0c090a; color: var(--fh-text); padding: 15px 8px; cursor: pointer; display: grid; gap: 5px; }
.preset strong { color: var(--fh-gold); font-size: 14px; }
.preset span { color: var(--fh-muted); font-size: 10px; }
.preset.active { border-color: var(--fh-gold); background: linear-gradient(150deg, rgba(95,16,29,.55), #0d090a); box-shadow: inset 0 0 18px rgba(209,173,98,.08); }
.custom { max-width: 300px; margin: 14px auto 0; text-align: left; }
.rate { color: var(--fh-muted); font-size: 10px; margin: 16px 0 10px; }
.enter { min-width: 220px; margin-top: 4px; }
@media (max-width: 620px) { .opening { padding: 22px 11px; } .preset-grid { grid-template-columns: 1fr; } .preset { padding: 11px; } }
</style>
