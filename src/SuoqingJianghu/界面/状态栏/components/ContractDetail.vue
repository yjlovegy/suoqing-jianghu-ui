<template>
  <section v-if="record" class="detail-panel">
    <header class="identity-header">
      <div>
        <p class="eyebrow">{{ record.档案来源 }}</p>
        <h2>{{ record.档案覆盖.姓名 }}</h2>
      </div>
      <span class="progress-badge" :class="progressClass">{{ record.当前契约.履约进度 }}</span>
    </header>

    <div class="profile-grid">
      <div class="profile-item"><span>性别</span><strong>{{ record.档案覆盖.性别 }}</strong></div>
      <div class="profile-item"><span>年龄</span><strong>{{ record.档案覆盖.年龄 }}岁</strong></div>
      <div class="profile-item"><span>身高</span><strong>{{ record.档案覆盖.身高 }}</strong></div>
      <div class="profile-item"><span>胸部</span><strong>{{ record.档案覆盖.胸部大小 }}</strong></div>
    </div>

    <div class="section-block">
      <p class="section-label">所属</p>
      <p class="section-value">{{ record.档案覆盖.宗门 }}</p>
    </div>

    <div class="section-block">
      <p class="section-label">武学</p>
      <p class="section-value">{{ record.档案覆盖.武学 }}</p>
    </div>

    <div class="contract-grid">
      <article class="contract-field">
        <p class="section-label">所求之愿</p>
        <p class="contract-copy">{{ record.当前契约.愿望 }}</p>
      </article>
      <article class="contract-field price-field">
        <p class="section-label">所定之价</p>
        <p class="contract-copy">{{ record.当前契约.代价 }}</p>
      </article>
    </div>

    <div class="section-block biography">
      <p class="section-label">人物小传</p>
      <p class="section-value long-copy">{{ record.档案覆盖.详细人物小传 }}</p>
    </div>

    <details v-if="historyEntries.length" class="history-block">
      <summary>历史契约 · {{ historyEntries.length }}</summary>
      <article v-for="[id, item] in historyEntries" :key="id" class="history-item">
        <p class="history-id">{{ id }} · {{ item.结契时间 }}</p>
        <p><span>愿：</span>{{ item.愿望 }}</p>
        <p><span>价：</span>{{ item.代价 }}</p>
        <p><span>果：</span>{{ item.结果 }}</p>
      </article>
    </details>
  </section>

  <section v-else class="detail-panel empty-detail">
    <p>选择左侧姓名以查看锁情册档案。</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Schema } from '../../../schema';

type SignerRecord = Schema['锁情册']['签契者'][string];

const props = defineProps<{
  record: SignerRecord | null;
}>();

const historyEntries = computed(() => Object.entries(props.record?.历史契约 ?? {}));

const progressClass = computed(() => {
  const progress = props.record?.当前契约.履约进度 ?? '';
  if (progress.includes('待')) return 'waiting';
  if (progress.includes('作废')) return 'voided';
  if (progress.includes('完成')) return 'completed';
  return 'active';
});
</script>

<style scoped>
.detail-panel {
  min-width: 0;
  padding: 22px 24px 26px;
  background: var(--c-surface);
}

.identity-header {
  padding-bottom: 18px;
  border-bottom: 1px solid var(--c-border);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.eyebrow,
.section-label {
  color: var(--c-text-faint);
  font-size: 11px;
  letter-spacing: 0.16em;
}

h2 {
  margin-top: 4px;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.progress-badge {
  max-width: 140px;
  padding: 5px 9px;
  border: 1px solid var(--c-border-strong);
  border-radius: 2px;
  color: var(--c-progress);
  background: var(--c-surface-subtle);
  font-size: 11px;
  text-align: center;
}

.progress-badge.waiting {
  color: var(--c-warning);
}

.progress-badge.voided {
  color: var(--c-text-faint);
  text-decoration: line-through;
}

.progress-badge.completed {
  color: var(--c-progress);
}

.profile-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid var(--c-border);
}

.profile-item {
  min-width: 0;
  padding: 10px 12px;
  border-right: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.profile-item:last-child {
  border-right: 0;
}

.profile-item span {
  color: var(--c-text-faint);
  font-size: 10px;
  letter-spacing: 0.12em;
}

.profile-item strong {
  font-size: 13px;
  font-weight: 500;
}

.section-block {
  margin-top: 18px;
}

.section-value,
.contract-copy {
  margin-top: 7px;
  color: var(--c-text);
  font-size: 13px;
  line-height: 1.75;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.contract-grid {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.contract-field {
  min-height: 112px;
  padding: 14px;
  border: 1px solid var(--c-border-strong);
  background: var(--c-surface);
}

.price-field {
  border-style: dashed;
}

.contract-copy {
  font-size: 14px;
}

.biography {
  padding-top: 18px;
  border-top: 1px solid var(--c-border);
}

.long-copy {
  color: var(--c-text-secondary);
}

.history-block {
  margin-top: 20px;
  border-top: 1px solid var(--c-border);
  padding-top: 14px;
  color: var(--c-text-secondary);
  font-size: 12px;
}

.history-block summary {
  cursor: pointer;
  color: var(--c-text);
}

.history-item {
  margin-top: 12px;
  padding: 12px;
  background: var(--c-surface-subtle);
  line-height: 1.65;
}

.history-id {
  margin-bottom: 5px;
  color: var(--c-text-faint);
}

.history-item span {
  color: var(--c-text);
}

.empty-detail {
  min-height: 260px;
  display: grid;
  place-items: center;
  color: var(--c-text-faint);
  font-size: 12px;
}

@media (max-width: 640px) {
  .detail-panel {
    padding: 18px 16px 22px;
  }

  .profile-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-item:nth-child(2) {
    border-right: 0;
  }

  .profile-item:nth-child(-n + 2) {
    border-bottom: 1px solid var(--c-border);
  }

  .contract-grid {
    grid-template-columns: 1fr;
  }
}
</style>