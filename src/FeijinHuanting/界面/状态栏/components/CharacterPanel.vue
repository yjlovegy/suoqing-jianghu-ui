<!-- eslint-disable better-tailwindcss/no-unknown-classes -->
<template>
  <section class="character-panel">
    <header class="section-head">
      <div><p class="fh-kicker">CURRENT COMPANY</p><h2>当前互动女性</h2></div>
      <span>{{ entries.length }} 人</span>
    </header>

    <template v-if="entries.length">
      <div class="name-desktop">
        <div class="fh-pills names">
          <button v-for="[id, woman] in paged" :key="id" type="button" class="fh-pill" :class="{ active: id === selectedId }" @click="selectedId = id">
            {{ woman.姓名 }}<small>{{ woman.角色类别 }}</small>
          </button>
        </div>
        <div v-if="pageCount > 1" class="pagination">
          <button type="button" :disabled="page === 0" @click="page--">‹</button><span>{{ page + 1 }} / {{ pageCount }}</span><button type="button" :disabled="page >= pageCount - 1" @click="page++">›</button>
        </div>
      </div>
      <label class="name-mobile fh-label">选择人物
        <select v-model="selectedId" class="fh-select">
          <option v-for="[id, woman] in entries" :key="id" :value="id">{{ woman.姓名 }} · {{ woman.身份 }}</option>
        </select>
      </label>

      <article v-if="selected" class="detail fh-card">
        <div class="identity">
          <div class="monogram">{{ selected.姓名.slice(0, 1) }}</div>
          <div><h3>{{ selected.姓名 }}</h3><p>{{ selected.身份 }} · {{ selected.角色类别 }}</p></div>
          <div class="measure"><strong>{{ selected.年龄 }}</strong><span>岁</span><strong>{{ selected.身高 }}</strong><span>cm</span></div>
        </div>
        <div class="detail-grid">
          <section><h4>衣着</h4><dl><dt>上衣</dt><dd>{{ selected.衣着.上衣 }}</dd><dt>下装</dt><dd>{{ selected.衣着.下装 }}</dd><dt>鞋子</dt><dd>{{ selected.衣着.鞋子 }}</dd><dt>内衣</dt><dd>{{ known(selected.衣着.内衣) }}</dd></dl></section>
          <section><h4>实时状态</h4><dl><dt>大筹码</dt><dd>{{ selected.所持筹码.大筹码 }}</dd><dt>小筹码</dt><dd>{{ selected.所持筹码.小筹码 }}</dd><dt>当前赌约</dt><dd>{{ selected.当前赌约ID || '无' }}</dd><dt>赌博风格</dt><dd>{{ selected.赌博风格 }}</dd></dl></section>
          <section class="private"><h4>已知细节</h4><div class="private-grid"><span>朱唇<b>{{ known(selected.私密信息.朱唇) }}</b></span><span>双峰<b>{{ selected.私密信息.双峰.是否已知 ? `${selected.私密信息.双峰.罩杯}杯 · ${selected.私密信息.双峰.描述}` : '未知' }}</b></span><span>幽谷<b>{{ known(selected.私密信息.幽谷) }}</b></span><span>双丘<b>{{ known(selected.私密信息.双丘) }}</b></span><span>玉足<b>{{ known(selected.私密信息.玉足) }}</b></span></div></section>
        </div>
      </article>
    </template>
    <p v-else class="empty">当前没有正在直接互动的女性。请通过剧情继续探索，或与场景中的女性交谈。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Schema as CasinoSchema } from '../../../schema';

const props = defineProps<{ characters: CasinoSchema['人物']['活动角色'] }>();
const selectedId = ref('');
const page = ref(0);
const pageSize = 6;
const entries = computed(() => Object.entries(props.characters));
const pageCount = computed(() => Math.max(1, Math.ceil(entries.value.length / pageSize)));
const paged = computed(() => entries.value.slice(page.value * pageSize, page.value * pageSize + pageSize));
const selected = computed(() => props.characters[selectedId.value]);
const known = (value: { 是否已知: boolean; 描述: string }) => value.是否已知 ? value.描述 : '未知';

watch(entries, list => {
  if (!list.some(([id]) => id === selectedId.value)) selectedId.value = list[0]?.[0] ?? '';
  page.value = Math.min(page.value, pageCount.value - 1);
}, { immediate: true });
</script>

<style scoped>
.section-head { display: flex; align-items: end; justify-content: space-between; margin-bottom: 11px; }
h2 { margin: 3px 0 0; font-size: 17px; font-weight: 500; letter-spacing: .12em; }
.section-head > span { color: var(--fh-gold); font-size: 11px; }
.names { min-height: 38px; }
.names button { display: grid; gap: 2px; text-align: left; }
.names small { color: var(--fh-muted); font-size: 8px; }
.pagination { margin: 7px 0 10px; display: flex; justify-content: flex-end; align-items: center; gap: 7px; color: var(--fh-muted); font-size: 10px; }
.pagination button { border: 1px solid var(--fh-line); background: transparent; color: var(--fh-gold); cursor: pointer; }
.name-mobile { display: none; margin-bottom: 10px; }
.identity { display: grid; grid-template-columns: 48px 1fr auto; gap: 12px; align-items: center; padding-bottom: 12px; border-bottom: 1px solid var(--fh-line); }
.monogram { width: 48px; aspect-ratio: 1; border: 1px solid var(--fh-gold); transform: rotate(45deg); display: grid; place-items: center; color: var(--fh-gold); font-family: Georgia, serif; }
.monogram::first-letter { transform: rotate(-45deg); }
h3 { margin: 0; font-family: Georgia, "Noto Serif SC", serif; font-size: 18px; letter-spacing: .12em; }
.identity p { margin: 4px 0 0; color: var(--fh-muted); font-size: 11px; }
.measure { display: grid; grid-template-columns: auto auto; gap: 1px 4px; align-items: baseline; text-align: right; }
.measure strong { color: var(--fh-gold); font-family: Georgia, serif; font-size: 16px; }.measure span { color: var(--fh-muted); font-size: 8px; }
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; padding-top: 12px; }
h4 { margin: 0 0 7px; color: var(--fh-gold); font-size: 10px; letter-spacing: .18em; font-weight: 500; }
dl { margin: 0; display: grid; grid-template-columns: 58px 1fr; gap: 5px 8px; font-size: 11px; line-height: 1.55; }dt { color: var(--fh-muted); }dd { margin: 0; }
.private { grid-column: 1 / -1; border-top: 1px solid var(--fh-line); padding-top: 10px; }
.private-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }.private-grid span { border: 1px solid rgba(209,173,98,.16); padding: 7px; color: var(--fh-muted); font-size: 9px; }.private-grid b { display: block; margin-top: 4px; color: var(--fh-text); font-size: 10px; font-weight: 400; }
.empty { border: 1px dashed var(--fh-line); padding: 24px; text-align: center; color: var(--fh-muted); font-size: 12px; }
@media (max-width: 620px) { .name-desktop { display: none; }.name-mobile { display: grid; }.detail-grid { grid-template-columns: 1fr; }.private { grid-column: auto; }.private-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.identity { grid-template-columns: 42px 1fr; }.measure { grid-column: 1 / -1; display: flex; justify-content: flex-end; }.monogram { width: 42px; } }
</style>
