<!-- eslint-disable better-tailwindcss/no-unknown-classes -->
<template>
  <section>
    <header class="section-head"><div><p class="fh-kicker">DIRECTORY</p><h2>设施与寻人</h2></div><span>{{ currentRegion }}</span></header>
    <div class="region-grid">
      <button v-for="region in regions" :key="region.name" type="button" :class="{ current: region.name === currentRegion }" :disabled="busy || !isLatest" @click="travel(region.name)">
        <span>{{ region.code }}</span><strong>{{ region.name }}</strong><small>{{ region.note }}</small>
      </button>
    </div>
    <article class="finder fh-card"><h3>在当前区域寻找</h3><p>新人物会符合所在区域职能；任何岗位女性都可以接受赌局邀请。</p><div class="fh-pills"><button v-for="role in roles" :key="role" type="button" class="fh-pill" :disabled="busy || !isLatest" @click="find(role)">{{ role }}</button></div><p v-if="error" class="fh-error">{{ error }}</p></article>
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Schema as CasinoSchema } from '../../../schema';
import { findRole, goToRegion } from '../controller';
defineProps<{currentRegion:CasinoSchema['系统']['当前区域']}>();
const regions=[{name:'镜门大堂',code:'I',note:'入场与筹码'},{name:'绯金主厅',code:'II',note:'开放式四玩法'},{name:'黑曜贵宾厅',code:'III',note:'隔音高额包间'},{name:'琥珀餐厅',code:'IV',note:'全天餐饮'},{name:'夜莺剧场',code:'V',note:'演出与酒吧'},{name:'月白水庭',code:'VI',note:'水疗与泳池'},{name:'鎏光艺廊',code:'VII',note:'展览与精品店'},{name:'皇冠套房区',code:'VIII',note:'总统套房'}] as const;
const roles=['荷官','安保','服务人员','其他工作人员','赌客'] as const;const busy=ref(false);const error=ref('');const isLatest=computed(()=>getCurrentMessageId()===getLastMessageId());
async function run(action:()=>Promise<void>){busy.value=true;error.value='';try{await action()}catch(reason){error.value=reason instanceof Error?reason.message:String(reason)}finally{busy.value=false}}
const travel=(region:typeof regions[number]['name'])=>run(()=>goToRegion(region));const find=(role:typeof roles[number])=>run(()=>findRole(role));
</script>
<style scoped>.section-head{display:flex;align-items:end;justify-content:space-between;margin-bottom:10px}.section-head h2{margin:3px 0 0;font-size:17px;font-weight:500;letter-spacing:.12em}.section-head>span{color:var(--fh-gold);font-size:10px}.region-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.region-grid button{border:1px solid var(--fh-line);background:#0d0a0b;color:var(--fh-text);padding:10px;display:grid;gap:4px;text-align:left;cursor:pointer}.region-grid button>span{color:var(--fh-gold-soft);font:10px Georgia}.region-grid strong{font-size:11px;font-weight:500}.region-grid small{color:var(--fh-muted);font-size:8px}.region-grid button.current{border-color:var(--fh-gold);background:linear-gradient(145deg,rgba(95,16,29,.5),#0d0a0b)}.region-grid button:disabled{opacity:.5}.finder{margin-top:10px}.finder h3{margin:0;color:var(--fh-gold);font-size:12px}.finder p{color:var(--fh-muted);font-size:10px}@media(max-width:620px){.region-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}</style>
