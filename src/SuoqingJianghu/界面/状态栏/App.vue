<template>
  <main class="lockbook-shell">
    <header class="book-header">
      <div>
        <p class="book-kicker">SUOQING REGISTER</p>
        <h1>锁情册</h1>
      </div>
      <p class="world-mark">{{ store.data.世界.日期 }} · {{ store.data.世界.时辰 }}<br />{{ store.data.世界.当前地点 }}</p>
    </header>

    <div class="book-layout">
      <SignerList :names="signerNames" :selected="selectedName" @select="selectedName = $event" />
      <ContractDetail :record="selectedRecord" />
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ContractDetail from './components/ContractDetail.vue';
import SignerList from './components/SignerList.vue';
import { useDataStore } from './store';

const store = useDataStore();
const selectedName = ref('');

const signerNames = computed(() => Object.keys(store.data.锁情册.签契者));
const selectedRecord = computed(() => store.data.锁情册.签契者[selectedName.value] ?? null);

watch(
  signerNames,
  names => {
    if (!names.includes(selectedName.value)) selectedName.value = names[0] ?? '';
  },
  { immediate: true },
);
</script>

<style scoped>
.lockbook-shell {
  width: min(100%, 820px);
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid var(--c-border-strong);
  border-radius: 4px;
  background: var(--c-surface);
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.08);
}

.book-header {
  min-height: 76px;
  padding: 15px 20px;
  border-bottom: 1px solid var(--c-border-strong);
  background: var(--c-surface);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.book-kicker {
  color: var(--c-text-faint);
  font-family: ui-monospace, 'Cascadia Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.22em;
}

h1 {
  margin-top: 3px;
  font-size: 21px;
  font-weight: 600;
  letter-spacing: 0.2em;
}

.world-mark {
  color: var(--c-text-secondary);
  font-size: 11px;
  line-height: 1.7;
  text-align: right;
}

.book-layout {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  min-height: 420px;
}

@media (max-width: 640px) {
  .book-header {
    align-items: flex-start;
  }

  .world-mark {
    max-width: 58%;
  }

  .book-layout {
    grid-template-columns: 1fr;
  }
}
</style>
