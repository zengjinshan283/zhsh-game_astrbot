<template>
  <div class="page-wrap fashion-page">

  <div class="page-hud"><div class="page-hud-title">✨ 装扮</div></div>    <div class="header">
      <h2>✨ 装扮系统</h2>
      <p class="sub">坐骑 + 时装，外加战斗力</p>
    </div>

    <!-- 总加成 -->
    <div class="bonus-card">
      <div class="bonus-title">🛡️ 装备总加成</div>
      <div class="bonus-grid">
        <div class="bonus-cell">
          <div class="ico">⚔️</div>
          <div class="num">+{{ bonus.atk || 0 }}</div>
          <div class="lab">攻击</div>
        </div>
        <div class="bonus-cell">
          <div class="ico">🛡️</div>
          <div class="num">+{{ bonus.def || 0 }}</div>
          <div class="lab">防御</div>
        </div>
        <div class="bonus-cell">
          <div class="ico">❤️</div>
          <div class="num">+{{ bonus.hp || 0 }}</div>
          <div class="lab">生命</div>
        </div>
        <div class="bonus-cell">
          <div class="ico">💨</div>
          <div class="num">+{{ bonus.speed || 0 }}</div>
          <div class="lab">速度</div>
        </div>
      </div>
      <div class="cur-equip">
        <div v-if="bonus.mount" class="equipped-item">
          🐎 当前坐骑：<strong>{{ bonus.mount.name }}</strong>
        </div>
        <div v-else class="equipped-item empty-equip">未装备坐骑</div>
        <div v-if="bonus.outfits && bonus.outfits.length" class="equipped-item">
          ✨ 当前时装：<strong>{{ bonus.outfits.map(o => o.name).join('、') }}</strong>
        </div>
        <div v-else class="equipped-item empty-equip">未装备时装</div>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <div class="tab" :class="{ active: tab === 'mount' }" @click="tab = 'mount'">🐎 坐骑 ({{ myMounts.length }})</div>
      <div class="tab" :class="{ active: tab === 'outfit' }" @click="tab = 'outfit'">👕 时装 ({{ myOutfits.length }})</div>
    </div>

    <!-- 坐骑图鉴 -->
    <div v-show="tab === 'mount'" class="card-list">
      <div v-for="m in allMounts" :key="m.id" class="item-card" :class="{ owned: ownedMount(m.id) }">
        <div class="item-head">
          <span class="rarity-dot" :style="{background: rarityColor(m.rarity)}"></span>
          <span class="item-icon">{{ m.icon }}</span>
          <span class="item-name">{{ m.name }}</span>
          <span v-if="ownedMount(m.id)" class="owned-tag">已拥有</span>
          <span v-if="equippedMount === m.id" class="equipped-tag">装备中</span>
        </div>
        <div class="item-desc">{{ m.desc }}</div>
        <div class="attr-row">
          <span>⚔️+{{ m.atk_bonus }}</span>
          <span>🛡️+{{ m.def_bonus }}</span>
          <span>❤️+{{ m.hp_bonus }}</span>
          <span>💨+{{ m.speed_bonus }}</span>
        </div>
        <div class="item-foot">
          <span class="req">等级 {{ m.level_req }} | 银币 {{ m.price_silver }}</span>
          <div class="btns">
            <button v-if="!ownedMount(m.id) && !m.is_default" class="btn primary" @click="buyMount(m)">购买</button>
            <button v-else-if="equippedMount !== m.id" class="btn primary" @click="equipMount(m.id)">装备</button>
            <button v-else-if="equippedMount === m.id" class="btn ghost" @click="equipMount(0)">卸下</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 时装图鉴 -->
    <div v-show="tab === 'outfit'" class="card-list">
      <div v-for="o in allOutfits" :key="o.id" class="item-card" :class="{ owned: ownedOutfit(o.id) }">
        <div class="item-head">
          <span class="rarity-dot" :style="{background: rarityColor(o.rarity)}"></span>
          <span class="item-icon">{{ o.icon }}</span>
          <span class="item-name">{{ o.name }}</span>
          <span class="slot-tag">{{ slotName(o.slot) }}</span>
          <span v-if="ownedOutfit(o.id)" class="owned-tag">已拥有</span>
          <span v-if="equippedOutfitIds.includes(o.id)" class="equipped-tag">装备中</span>
        </div>
        <div class="item-desc">{{ o.desc }}</div>
        <div class="attr-row">
          <span>⚔️+{{ o.atk_bonus }}</span>
          <span>🛡️+{{ o.def_bonus }}</span>
          <span>❤️+{{ o.hp_bonus }}</span>
        </div>
        <div class="item-foot">
          <span class="req">等级 {{ o.level_req }} | 银币 {{ o.price_silver }}</span>
          <div class="btns">
            <button v-if="!ownedOutfit(o.id) && !o.is_default" class="btn primary" @click="buyOutfit(o)">购买</button>
            <template v-else>
              <button v-if="!equippedOutfitIds.includes(o.id)" class="btn primary" @click="equipOutfit(o, true)">装备</button>
              <button v-else class="btn ghost" @click="equipOutfit(o, false)">卸下</button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '../stores/user';
const auth = useUserStore();
const tab = ref('mount');
const allMounts = ref([]);
const allOutfits = ref([]);
const myMounts = ref([]);
const myOutfits = ref([]);
const equippedOutfitIds = ref([]);
const equippedMount = ref(0);
const bonus = ref({ atk: 0, def: 0, hp: 0, speed: 0, mount: null, outfits: [] });

const RARITY_COLOR = { common: '#aaa', rare: '#3a8de0', epic: '#a64ac9', legend: '#ff8c00' };
const SLOT_NAME = { head: '头', body: '衣', leg: '腿', weapon: '武器' };
const rarityColor = (r) => RARITY_COLOR[r] || '#aaa';
const slotName = (s) => SLOT_NAME[s] || s;

const ownedMount = (id) => myMounts.value.some(x => x.id === id);
const ownedOutfit = (id) => myOutfits.value.some(x => x.id === id);

const headers = computed(() => ({ Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' }));

async function load() {
  const r1 = await fetch('/api/fashion/mounts', { headers: { Authorization: `Bearer ${auth.token}` } });
  const j1 = await r1.json();
  allMounts.value = j1.all;
  myMounts.value = j1.mine;
  equippedMount.value = j1.mine.find(m => m.id)?.id || 0;
  // 取 equipped from user
  const userR = await fetch('/api/user/info', { headers: { Authorization: `Bearer ${auth.token}` } });
  if (userR.ok) {
    const u = await userR.json();
    equippedMount.value = u.mount_id || 0;
    equippedOutfitIds.value = (u.equipped_outfits || '').split(',').map(s => parseInt(s)).filter(n => n > 0);
  }
  const r2 = await fetch('/api/fashion/outfits', { headers: { Authorization: `Bearer ${auth.token}` } });
  const j2 = await r2.json();
  allOutfits.value = j2.all;
  myOutfits.value = j2.mine;
  const r3 = await fetch('/api/fashion/bonus', { headers: { Authorization: `Bearer ${auth.token}` } });
  bonus.value = await r3.json();
}

async function buyMount(m) {
  const r = await fetch('/api/fashion/mount/buy', { method: 'POST', headers: headers.value, body: JSON.stringify({ mountId: m.id }) });
  const j = await r.json();
  if (r.ok && j.success) { toast.info(j.msg); await load(); auth.fetchUser && auth.fetchUser(); }
  else toast.error(j.error || '购买失败');
}

async function equipMount(mid) {
  const r = await fetch('/api/fashion/mount/equip', { method: 'POST', headers: headers.value, body: JSON.stringify({ mountId: mid }) });
  const j = await r.json();
  if (r.ok && j.success) { toast.info(j.msg); await load(); }
  else toast.error(j.error || '装备失败');
}

async function buyOutfit(o) {
  const r = await fetch('/api/fashion/outfit/buy', { method: 'POST', headers: headers.value, body: JSON.stringify({ outfitId: o.id }) });
  const j = await r.json();
  if (r.ok && j.success) { toast.info(j.msg); await load(); auth.fetchUser && auth.fetchUser(); }
  else toast.error(j.error || '购买失败');
}

async function equipOutfit(o, equip) {
  const r = await fetch('/api/fashion/outfit/equip', { method: 'POST', headers: headers.value, body: JSON.stringify({ outfitId: o.id, equip }) });
  const j = await r.json();
  if (r.ok && j.success) { toast.info(j.msg); await load(); }
  else toast.error(j.error || '操作失败');
}

onMounted(load);
</script>

<style scoped>
.fashion-view { max-width: 800px; margin: 0 auto; padding: 16px; }
.header { text-align: center; margin-bottom: 16px; }
.header h2 { color: #ffd700; margin: 0; }
.header .sub { color: #999; margin: 4px 0; font-size: 13px; }
.bonus-card { background: linear-gradient(135deg, rgba(212,175,55,0.15), rgba(155,89,182,0.15)); border: 1px solid #d4af37; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.bonus-title { font-size: 16px; font-weight: bold; color: #d4af37; margin-bottom: 12px; }
.bonus-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.bonus-cell { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 10px 4px; text-align: center; }
.bonus-cell .ico { font-size: 20px; }
.bonus-cell .num { font-size: 18px; font-weight: bold; color: #ffd700; margin: 4px 0; }
.bonus-cell .lab { font-size: 11px; color: #999; }
.cur-equip { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #5a4a2a; }
.equipped-item { color: #ccc; font-size: 13px; padding: 4px 0; }
.empty-equip { color: #777; font-style: italic; }
.tab-bar { display: flex; gap: 8px; margin-bottom: 12px; }
.tab { flex: 1; padding: 10px; text-align: center; background: rgba(255,255,255,0.05); border-radius: 8px; cursor: pointer; color: #aaa; font-size: 14px; transition: all 0.2s; }
.tab.active { background: linear-gradient(135deg, #d4af37, #b8941f); color: #1a1a1a; font-weight: bold; }
.card-list { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.item-card { background: rgba(20,20,30,0.6); border: 1px solid #333; border-radius: 8px; padding: 12px; transition: all 0.2s; }
.item-card.owned { border-color: #5a8f5a; background: rgba(40,80,40,0.15); }
.item-head { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
.rarity-dot { width: 8px; height: 8px; border-radius: 50%; }
.item-icon { font-size: 22px; }
.item-name { font-weight: bold; color: #fff; }
.slot-tag { background: #555; color: #ddd; padding: 1px 6px; border-radius: 3px; font-size: 10px; }
.owned-tag, .equipped-tag { font-size: 10px; padding: 1px 6px; border-radius: 3px; }
.owned-tag { background: #27ae60; color: #fff; }
.equipped-tag { background: #d4af37; color: #1a1a1a; font-weight: bold; }
.item-desc { color: #999; font-size: 12px; margin-bottom: 6px; }
.attr-row { display: flex; gap: 8px; font-size: 12px; color: #ffd700; margin-bottom: 8px; flex-wrap: wrap; }
.item-foot { display: flex; justify-content: space-between; align-items: center; }
.req { font-size: 11px; color: #888; }
.btns { display: flex; gap: 4px; }
.btn { padding: 5px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s; }
.btn.primary { background: #d4af37; color: #1a1a1a; font-weight: bold; }
.btn.primary:hover { filter: brightness(1.1); }
.btn.ghost { background: #555; color: #ddd; }
@media (max-width: 600px) { .card-list { grid-template-columns: 1fr; } .bonus-grid { grid-template-columns: repeat(2, 1fr); } }
</style>