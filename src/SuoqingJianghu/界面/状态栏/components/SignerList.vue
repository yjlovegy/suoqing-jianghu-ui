<template>
  <aside class="signer-panel" aria-label="签契者名单">
    <div class="panel-heading">
      <span>签契者</span>
      <span class="count">{{ names.length }}</span>
    </div>

    <div v-if="names.length" class="signer-list" role="listbox" :aria-activedescendant="selected">
      <button
        v-for="name in names"
        :id="name"
        :key="name"
        type="button"
        class="signer-button"
        :class="{ selected: name === selected }"
        :aria-selected="name === selected"
        role="option"
        @click="$emit('select', name)"
      >
        <span class="seal" aria-hidden="true">契</span>
        <span>{{ name }}</span>
      </button>
    </div>

    <p v-else class="empty-state">尚无人写下愿望</p>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  names: string[];
  selected: string;
}>();

defineEmits<{
  select: [name: string];
}>();
</script>

<style scoped>
.signer-panel {
  min-width: 0;
  border-right: 1px solid var(--c-border);
  background: var(--c-surface);
}

.panel-heading {
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid var(--c-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--c-text-secondary);
  font-size: 12px;
  letter-spacing: 0.18em;
}

.count {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  color: var(--c-text-faint);
  letter-spacing: 0;
}

.signer-list {
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 4px;
}

.signer-button {
  width: 100%;
  min-height: 42px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 9px;
  text-align: left;
  cursor: pointer;
  transition: background-color 140ms ease, border-color 140ms ease;
}

.signer-button:hover {
  border-color: var(--c-border);
  background: var(--c-surface-subtle);
}

.signer-button.selected {
  border-color: var(--c-border-strong);
  background: var(--c-surface-selected);
  font-weight: 600;
}

.seal {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  border: 1px solid currentColor;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 400;
}

.empty-state {
  padding: 22px 16px;
  color: var(--c-text-faint);
  font-size: 12px;
  line-height: 1.7;
}

@media (max-width: 640px) {
  .signer-panel {
    border-right: 0;
    border-bottom: 1px solid var(--c-border);
  }

  .panel-heading {
    height: 40px;
  }

  .signer-list {
    flex-direction: row;
    overflow-x: auto;
  }

  .signer-button {
    width: auto;
    min-width: max-content;
  }
}
</style>