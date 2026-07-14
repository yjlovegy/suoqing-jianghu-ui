<!-- eslint-disable better-tailwindcss/no-unknown-classes -->
<template>
  <main class="casino-shell">
    <header class="casino-header">
      <div>
        <p class="fh-kicker">FEIJIN HUANTING · PRIVATE CASINO</p>
        <h1 class="fh-title">绯金幻庭</h1>
      </div>
      <div class="location-mark">
        <strong>{{ store.data.系统.当前区域 }}</strong>
        <span>{{ store.data.系统.当前房间 }} · {{ store.data.系统.阶段 }}</span>
      </div>
    </header>

    <OpeningPanel v-if="store.data.资产.筹码预设 === '未选择'" />
    <template v-else>
      <nav class="tabbar" aria-label="状态栏页签">
        <button v-for="tab in tabs" :key="tab" type="button" :class="{ active: activeTab === tab }" @click="activeTab = tab">
          {{ tab }}
        </button>
      </nav>
      <section class="content-frame">
        <GamePanel v-if="activeTab === '牌桌'" :data="store.data" />
        <CharacterPanel v-else-if="activeTab === '人物'" :characters="store.data.人物.活动角色" />
        <WagerPanel v-else-if="activeTab === '赌约'" :data="store.data" />
        <AssetPanel v-else-if="activeTab === '资产'" :data="store.data" />
        <FacilityPanel v-else :current-region="store.data.系统.当前区域" />
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AssetPanel from './components/AssetPanel.vue';
import CharacterPanel from './components/CharacterPanel.vue';
import FacilityPanel from './components/FacilityPanel.vue';
import GamePanel from './components/GamePanel.vue';
import OpeningPanel from './components/OpeningPanel.vue';
import WagerPanel from './components/WagerPanel.vue';
import { useDataStore } from './store';

const store = useDataStore();
const tabs = ['牌桌', '人物', '赌约', '资产', '设施'] as const;
const activeTab = ref<(typeof tabs)[number]>('牌桌');
</script>

<style scoped>
.casino-shell { width: min(100%, 900px); margin: 0 auto; border: 1px solid rgba(209,173,98,.55); background: radial-gradient(circle at 80% 0, rgba(124,25,42,.18), transparent 34%), var(--fh-bg); box-shadow: 0 18px 52px rgba(0,0,0,.46), inset 0 0 42px rgba(0,0,0,.35); }
.casino-header { padding: 16px 19px; border-bottom: 1px solid var(--fh-line); display: flex; align-items: center; justify-content: space-between; gap: 18px; position: relative; }
.casino-header::after { content: "◆"; position: absolute; left: 50%; bottom: -7px; color: var(--fh-gold); background: var(--fh-bg); padding: 0 8px; font-size: 10px; }
.location-mark { display: grid; gap: 4px; text-align: right; }
.location-mark strong { color: var(--fh-gold); font-family: Georgia, "Noto Serif SC", serif; font-size: 13px; letter-spacing: .1em; }
.location-mark span { color: var(--fh-muted); font-size: 10px; }
.tabbar { display: grid; grid-template-columns: repeat(5, 1fr); border-bottom: 1px solid var(--fh-line); }
.tabbar button { border: 0; border-right: 1px solid var(--fh-line); background: #0c090a; color: var(--fh-muted); padding: 11px 6px; cursor: pointer; letter-spacing: .12em; }
.tabbar button:last-child { border-right: 0; }
.tabbar button.active { color: var(--fh-gold); background: linear-gradient(180deg, rgba(95,16,29,.5), rgba(20,13,15,.9)); box-shadow: inset 0 -2px var(--fh-gold); }
.content-frame { padding: 14px; }
@media (max-width: 620px) {
  .casino-header { padding: 13px; align-items: flex-start; }
  .fh-title { font-size: 17px; }
  .location-mark { max-width: 48%; }
  .tabbar button { padding: 10px 2px; font-size: 11px; letter-spacing: .04em; }
  .content-frame { padding: 9px; }
}
</style>
