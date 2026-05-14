<template>
<div class="page">
<div class="location-bar"><div class="location-name">🐕 宠物</div><div class="location-path">{{ pets.length }}/{{ MAX }} 只</div></div>

<div v-if="msg" class="card" :style="{borderColor:msgType==='error'?'#73281c':'#2e5a3b',padding:'3px 8px'}">
<p :style="{color:msgType==='error'?'#b85a3a':'#2e5a3b',fontSize:'11px',margin:0}">{{ msg }}</p>
</div>

<!-- Active Pet -->
<div v-if="activePet" class="card" :style="{borderColor:petColors[activePet.type]||'#cfc19e'}">
<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
<span style="font-size:36px;">{{ petEmojis[activePet.pet_id]||'🐕' }}</span>
<div>
<div style="font-size:15px;font-weight:bold;" :style="{color:petColors[activePet.type]}">{{ activePet.nickname }} <span style="font-size:10px;">⭐ 出战中</span></div>
<div style="font-size:11px;opacity:0.8;" :style="{color:petColors[activePet.type]}">{{ petTypeNames[activePet.type]||'普通' }}</div>
</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px;font-size:11px;">
<div><span style="color:#cfc19e;">⭐等级</span><br><span :style="{color:petColors[activePet.type],fontWeight:'bold'}">Lv.{{ activePet.level }}</span></div>
<div><span style="color:#cfc19e;">⚔️攻击</span><br><span style="color:#73281c;font-weight:bold;">{{ activePet.effective_atk }}</span></div>
<div><span style="color:#cfc19e;">❤️生命</span><br><span style="color:#2e5a3b;font-weight:bold;">{{ activePet.effective_hp }}</span></div>
</div>
<!-- EXP bar -->
<div class="status-bar bar-exp mt-4"><div class="bar-track"><div class="bar-fill" :style="{width:activePetExpPct+'%',background:petColors[activePet.type]||'#cfc19e'}"></div></div></div>
<!-- Satiety bar -->
<div style="margin-top:4px;font-size:10px;color:#cfc19e;">🍖 饱食度 {{ activePet.satiety || 0 }}/100</div>
<div class="status-bar" style="margin-top:2px;"><div class="bar-track"><div class="bar-fill" :style="{width:(activePet.satiety||0)+'%',background:satColor}"></div></div></div>
<div style="font-size:9px;color:#8b784e;margin-top:1px;">饱食度耗尽时宠物无法参战，战斗中每回合-2</div>
<!-- Feed buttons -->
<div style="margin-top:8px;">
<div style="font-size:11px;color:#cfc19e;margin-bottom:4px;">🍖 喂食口粮：</div>
<div v-if="petFoods && petFoods.length" style="display:flex;gap:6px;flex-wrap:wrap;">
<button v-for="food in petFoods" :key="food.item_id" class="btn btn-success" @click="feedPet(food.item_id)" style="font-size:12px;padding:6px 12px;">
{{ food.name }} ×{{ food.quantity }}
</button>
</div>
<div v-else style="font-size:13px;color:#b0a080;background:rgba(196,168,124,0.1);padding:6px 12px;border-radius:6px;border:1px dashed #8b784e;">🍖 暂无宠物食物，据说驯兽师处可以购买</div>
</div>
<div style="display:flex;gap:8px;margin-top:8px;justify-content:space-between;">
<button class="btn btn-danger" @click="releasePet(activePet)" style="font-size:13px;padding:8px 16px;flex:1;">放生</button>
<button class="btn btn-primary" @click="startRename(activePet)" style="font-size:13px;padding:8px 16px;flex:1;">✏️ 改名</button>
</div>
</div>

<!-- All my pets -->
<div v-if="pets.length" class="card">
<div class="card-title">🐾 我的宠物（{{ pets.length }}/{{ MAX }}）</div>
<div v-for="p in pets" :key="p.id" class="compact-row" :style="p.is_active?'background:rgba(169,119,78,0.05);':''">
<div style="flex:1;">
<span style="font-size:14px;">{{ petEmojis[p.pet_id]||'🐕' }}</span>
<span :style="{color:petColors[p.type]}">{{ p.nickname }}</span>
<span style="font-size:10px;color:#cfc19e;">Lv.{{ p.level }}</span>
<span v-if="p.is_active" style="font-size:10px;color:#c9a758;">⭐出战</span>
</div>
<button v-if="!p.is_active" class="btn btn-success btn-small" @click="setActive(p)" style="font-size:10px;padding:4px 8px;">出战</button>
<span v-else style="font-size:10px;color:#8b784e;padding:4px 8px;">已出战</span>
</div>
</div>

<!-- Rename input -->
<div v-if="renameTarget" class="card" style="padding:4px 8px;">
<div style="display:flex;gap:6px;">
<input v-model="newName" type="text" maxlength="20" :placeholder="renameTarget.nickname" class="form-input" style="flex:1;font-size:12px;padding:6px 10px;">
<button class="btn btn-primary btn-small" @click="doRename" style="font-size:11px;">确认</button>
<button class="btn btn-secondary btn-small" @click="renameTarget=null" style="font-size:11px;">取消</button>
</div>
</div>

<!-- Wild capture section -->
<div v-if="!activePet && allSpecies.length" class="card" style="border-color:#5f4a31;">
<div class="card-title" style="color:#5f4a31;">🗺️ 野外探索（捕捉宠物）</div>
<div v-for="p in allSpecies" :key="p.id" class="compact-row">
<div><span style="font-size:14px;">{{ petEmojis[p.id]||'🐕' }}</span> <span :style="{color:petColors[p.type]}">{{ p.name }}</span> <span style="font-size:10px;color:#8b784e;">⚔️{{ p.atk }} ❤️{{ p.hp }}</span></div>
<button class="btn btn-success btn-small" :disabled="hasPet(p.id)||pets.length>=MAX" @click="capture(p)" style="font-size:10px;" :style="hasPet(p.id)||pets.length>=MAX?'opacity:0.4;':''">{{ hasPet(p.id)?'已拥有':'捕捉('+p.capture_rate+'%)' }}</button>
</div>
</div>
</div>
</template>
<script setup>
import { globalConfirm, globalAlert } from '../composables/useConfirm';
import { ref, computed, onMounted } from 'vue';
import { Api } from '../composables/useApi';
const MAX = 3;
const pets = ref([]);
const activePet = ref(null);
const allSpecies = ref([]);
const petFoods = ref([]);
const msg = ref('');
const msgType = ref('');
const newName = ref('');
const renameTarget = ref(null);
const petColors = {0:'#cfc19e',1:'#3f6a4a',2:'#9b59b6',3:'#c9a758'};
const petTypeNames = {0:'普通',1:'稀有',2:'史诗',3:'传说'};
const petEmojis = {1:'🐱',2:'🦅',3:'🦊',4:'🐻'};
const activePetExpPct = computed(() => activePet.value ? Math.round(activePet.value.exp / activePet.value.exp_max * 100) : 0);
const satColor = computed(() => {
  const s = activePet.value?.satiety || 0;
  if (s > 60) return '#2e5a3b';
  if (s > 30) return '#c9a758';
  return '#73281c';
});
const hasPetFood = computed(() => !!(petFoods.value && petFoods.value.length));
function hasPet(petId) { return pets.value.some(p => p.pet_id === petId); }
async function load() {
  try {
    const d = await Api.get('/pet/info');
    pets.value = d.pets || [];
    activePet.value = d.activePet || null;
    allSpecies.value = d.allSpecies || [];
    petFoods.value = d.petFoods || [];
  } catch(e) {}
}
async function capture(p) {
  if(!(await globalConfirm(`捕捉${p.name}? 概率:${p.capture_rate}%`)))return;
  try { const d = await Api.post('/pet/capture', {pet_id: p.id}); msg.value = d.msg; msgType.value = d.success?'success':'error'; await load(); } catch(e) { msg.value = e.message; msgType.value = 'error'; }
}
async function setActive(p) {
  try { const d = await Api.post('/pet/setActive', {user_pet_id: p.id}); msg.value = d.msg; msgType.value = 'success'; await load(); } catch(e) { msg.value = e.message; msgType.value = 'error'; }
}
function openFeed() {
  if (!petFoods.value || !petFoods.value.length) { msg.value = '暂无宠物食物，据说驯兽师处可以购买'; msgType.value = 'error'; return; }
}
async function feedPet(itemId) {
  try { const d = await Api.post('/pet/feed', {item_id: itemId}); msg.value = d.msg; msgType.value = d.success?'success':'error'; if(d.success) await load(); } catch(e) { msg.value=e.message||e.response?.data?.error||'喂食失败'; msgType.value = 'error'; }
}
async function releasePet(p) {
  if(!(await globalConfirm('确定放生?')))return;
  try { const d = await Api.post('/pet/release', {user_pet_id: p.id}); msg.value = d.msg; msgType.value = 'success'; await load(); } catch(e) { msg.value = e.message; msgType.value = 'error'; }
}
function startRename(p) { renameTarget.value = p; newName.value = p.nickname; }
async function doRename() {
  if (!newName.value || !renameTarget.value) return;
  try { const d = await Api.post('/pet/rename', {user_pet_id: renameTarget.value.id, name: newName.value}); msg.value = d.msg || '✅ 宠物改名成功'; msgType.value = 'success'; newName.value=''; renameTarget.value=null; await load(); } catch(e) { msg.value = e?.response?.data?.error || e.message || '❌ 宠物改名失败'; msgType.value = 'error'; }
}
onMounted(load);
</script>

<style scoped>
.feed-btn-disabled {
  background: #5a4d3a !important;
  color: #ffd58a !important;
  border: 1px dashed #c89b3c !important;
  text-shadow: none !important;
  cursor: not-allowed !important;
  filter: none !important;
}
</style>
