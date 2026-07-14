<!-- eslint-disable better-tailwindcss/no-unknown-classes -->
<template>
  <section>
    <header class="section-head"><div><p class="fh-kicker">SIDE WAGER</p><h2>当前赌约</h2></div><span>{{ wager.状态 }}</span></header>
    <article v-if="wager.状态 !== '无'" class="current fh-card">
      <div class="parties"><span><small>甲方</small>{{ partyName(wager.双方.甲方) }}</span><b>VS</b><span><small>乙方</small>{{ partyName(wager.双方.乙方) }}</span></div>
      <dl><dt>甲方押注</dt><dd>{{ wager.各自押注.甲方 || '待填写' }}</dd><dt>乙方押注</dt><dd>{{ wager.各自押注.乙方 || '待填写' }}</dd><dt>胜负条件</dt><dd>{{ wager.胜负条件 || '待确认' }}</dd><dt>确认</dt><dd>{{ wager.确认状态.甲方 ? '甲方已确认' : '甲方待确认' }} · {{ wager.确认状态.乙方 ? '乙方已确认' : '乙方待确认' }}</dd><dt>结果</dt><dd>{{ wager.结果 || '尚未结算' }}</dd><dt>履行</dt><dd>{{ wager.履行状态 }}</dd></dl>
    </article>
    <div class="proposal fh-card">
      <h3>提出或修改赌约</h3>
      <label class="fh-label">对象<select v-model="opponentId" class="fh-select"><option value="">选择当前互动女性</option><option v-for="[id, woman] in characters" :key="id" :value="id">{{ woman.姓名 }} · {{ woman.身份 }}</option></select></label>
      <div class="fh-grid two"><label class="fh-label">你的押注<input v-model="userStake" class="fh-input" placeholder="中性自由文本" /></label><label class="fh-label">希望对方押注<input v-model="opponentStake" class="fh-input" placeholder="中性自由文本" /></label></div>
      <label class="fh-label">胜负条件<textarea v-model="condition" class="fh-textarea" placeholder="例如：本局最终胜者获得双方确认的附带赌约"></textarea></label>
      <p class="note">物品或口头承诺只绑定整局胜负；德州等桌内下注始终使用筹码。</p>
      <p v-if="error" class="fh-error">{{ error }}</p>
      <button type="button" class="fh-button primary" :disabled="busy || !valid || !isLatest" @click="submit">{{ busy ? '正在协商…' : '确认我的提议' }}</button>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Schema as CasinoSchema } from '../../../schema';
import { proposeWager } from '../controller';
const props = defineProps<{ data: CasinoSchema }>();
const wager = computed(() => props.data.赌约.当前赌约);const characters=computed(()=>Object.entries(props.data.人物.活动角色));
const opponentId=ref('');const userStake=ref('');const opponentStake=ref('');const condition=ref('');const busy=ref(false);const error=ref('');
const valid=computed(()=>opponentId.value&&userStake.value.trim()&&opponentStake.value.trim()&&condition.value.trim());const isLatest=computed(()=>getCurrentMessageId()===getLastMessageId());
watch(characters,list=>{if(!list.some(([id])=>id===opponentId.value))opponentId.value=list[0]?.[0]??''},{immediate:true});
const partyName=(id:string)=>id==='<user>'?'<user>':props.data.人物.活动角色[id]?.姓名??id??'未定';
async function submit(){busy.value=true;error.value='';try{await proposeWager(opponentId.value,userStake.value,opponentStake.value,condition.value)}catch(reason){error.value=reason instanceof Error?reason.message:String(reason)}finally{busy.value=false}}
</script>
<style scoped>.section-head{display:flex;align-items:end;justify-content:space-between;margin-bottom:10px}.section-head h2{margin:3px 0 0;font-size:17px;font-weight:500;letter-spacing:.12em}.section-head>span{color:var(--fh-gold);font-size:10px}.current{margin-bottom:10px}.parties{display:grid;grid-template-columns:1fr auto 1fr;text-align:center;align-items:center;border-bottom:1px solid var(--fh-line);padding-bottom:10px}.parties span{display:grid;gap:3px}.parties small{color:var(--fh-muted);font-size:8px}.parties b{color:var(--fh-gold);font:400 12px Georgia}dl{display:grid;grid-template-columns:85px 1fr;gap:7px;margin:11px 0 0;font-size:11px}dt{color:var(--fh-muted)}dd{margin:0}.proposal{display:grid;gap:10px}.proposal h3{margin:0;color:var(--fh-gold);font-size:12px;letter-spacing:.14em}.note{margin:0;color:var(--fh-muted);font-size:9px}</style>
