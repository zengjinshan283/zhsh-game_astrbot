<template>
<div class="page-wrap inv-page">

  <!-- HUD -->
  <div class="page-hud">
    <div class="page-hud-title">🎒 背包</div>
    <div class="gbadge">{{ items.length }} 种</div>
  </div>

  <!-- 空背包 -->
  <div v-if="!items.length" class="empty-state">
    <div class="empty-state-icon">🎒</div>
    <div class="empty-state-text">背包空空如也</div>
  </div>

  <!-- 分类列表 -->
  <template v-for="cat in categories" :key="cat.key">
    <template v-if="filterItems(cat.key).length">
      <div class="section-title">
        <span class="ich-icon">{{ cat.icon }}</span>
        <span class="ich-name">{{ cat.name }}</span>
        <span class="ich-count">{{ filterItems(cat.key).length }}</span>
      </div>
      <div class="inv-grid">
        <div v-for="item in filterItems(cat.key)" :key="item.inv_id" class="list-item hover-lift">
          <div class="inc-icon">{{ cat.icon }}</div>
          <div class="inc-body">
            <div class="inc-name">{{ getItemName(item) }}<span v-if="item.enhance_level > 0" class="inc-enh">+{{ item.enhance_level }}</span></div>
            <div class="inc-stats">
              <template v-if="item.subtype === 'weapon' || item.subtype === 'armor'">
                <span class="is-atk">⚔️ {{ calcStat(item.atk, item.enhance_level) }}</span>
                <span class="is-def">🛡️ {{ calcStat(item.def_val, item.enhance_level) }}</span>
              </template>
              <template v-else>
                <span v-if="item.atk > 0">⚔️ +{{ item.atk }}</span>
                <span v-if="item.def_val > 0">🛡️ +{{ item.def_val }}</span>
                <span v-if="item.hp > 0">❤️ +{{ item.hp }}</span>
              </template>
            </div>
            <div v-if="item.quantity > 1" class="inc-qty">×{{ item.quantity }}</div>
          </div>
          <div class="inc-actions">
            <button v-if="item.subtype === 'consumable'" class="ina-btn ina-use" @click="useItem(item.inv_id)">使用</button>
            <button v-if="item.subtype === 'weapon' || item.subtype === 'armor'" class="ina-btn ina-equip" @click="equip(item.inv_id)">装备</button>
            <button class="ina-btn ina-discard" @click="discard(item.inv_id)">丢弃</button>
          </div>
        </div>
      </div>
    </template>
  </template>

  <!-- 底部导航 -->
  <div class="inv-nav">
    <router-link to="/equipment" class="inv-nav-btn">⚔️ 查看装备</router-link>
    <router-link to="/citymap" class="inv-nav-btn">← 返回</router-link>
  </div>
</div>
</template>

<script setup>
import { globalConfirm } from '../composables/useConfirm';
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';
import { useToast } from '../composables/useToast';

const userStore = useUserStore();
const items = ref([]);
const toast = useToast();
const categories = [
  {key:'weapon', name:'武器', icon:'🗡️', color:'#e74c3c'},
  {key:'armor', name:'防具', icon:'🛡️', color:'#3498db'},
  {key:'consumable', name:'消耗', icon:'🧪', color:'#27ae60'},
  {key:'material', name:'材料', icon:'📦', color:'#f1c40f'},
  {key:'pet_food', name:'宠物', icon:'🐾', color:'#9b59b6'},
  {key:'misc', name:'杂物', icon:'📋', color:'#95a5a6'},
];

function filterItems(key) {
  return items.value.filter(i =>
    i.subtype === key ||
    (key === 'misc' && !['weapon','armor','consumable','material','pet_food'].includes(i.subtype))
  );
}
const qualityPrefix = {0:'',1:'〖精良〗',2:'〖史诗〗',3:'〖传说〗'};
function getItemName(item) {
  const pre = qualityPrefix[item.quality] || '';
  return pre + item.name;
}
function calcStat(base, level) { return base ? Math.round(base * (1 + (level || 0) * 0.03)) : 0; }

async function load() { try { const d = await Api.get('/user/inventory'); items.value = (d.items || []).filter(i => !i.equipped); } catch (e) {} }
async function equip(invId) { try { await Api.post('/user/equip', {inventory_id: invId}); const me = await Api.get('/auth/me'); userStore.updateUser(me.user); await load(); } catch (e) {} }
async function useItem(invId) {
  try { const d = await Api.post('/user/use', {inventory_id: invId}); toast.success(`恢复 ${d.heal} HP`);
    const me = await Api.get('/auth/me'); userStore.updateUser(me.user);
    await load();
  } catch (e) {}
}
async function discard(invId) { if (!(await globalConfirm('确定丢弃？'))) return; try { await Api.post('/user/discard', {inventory_id: invId}); await load(); } catch (e) {} }

onMounted(load);
</script>

<style scoped>
.inv-page {
  position: relative; display: flex; flex-direction: column; gap: 10px;
  padding: 8px 10px; min-height: 100%; overflow-y: auto;
}
.inv-bg {
  position: fixed; inset: 0; z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #1a0d1a 50%, #0d1117 100%);
  pointer-events: none;
}

/* HUD */
.ih-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.ih-count { font-size: 11px; color: #7f8c8d; }

/* Toast */
.toast-ok { background: rgba(39,174,96,0.1); border: 1px solid rgba(39,174,96,0.3); color: #2ecc71; }

/* 空状态 */
/* 分类头 */
.inv-cat-header {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 6px;
  padding: 4px 2px;
}
.ich-icon { font-size: 14px; }
.ich-name { font-size: 11px; font-weight: 600; color: #95a5a6; }
.ich-count { font-size: 10px; color: #555; background: rgba(255,255,255,0.06); padding: 1px 6px; border-radius: 10px; }

/* 物品网格 */
.inv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.inc-icon {
  font-size: 22px; width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.06); border-radius: 10px; flex-shrink: 0;
}
.inc-body { flex: 1; min-width: 0; }
.inc-name { font-size: 13px; font-weight: 600; color: #f0f0f0; margin-bottom: 2px; }
.inc-enh { color: #f1c40f; }
.inc-stats { display: flex; gap: 8px; font-size: 11px; color: #7f8c8d; flex-wrap: wrap; }
.is-atk { color: #e74c3c; }
.is-def { color: #3498db; }
.inc-qty { font-size: 10px; color: #f1c40f; background: rgba(241,196,15,0.1); padding: 1px 5px; border-radius: 4px; display: inline-block; margin-top: 2px; }

.inc-actions { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
.ina-btn {
  padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 600;
  border: none; cursor: pointer; transition: opacity 0.2s; white-space: nowrap;
}
.ina-use { background: linear-gradient(135deg, #1a4a2a, #27ae60); color: #fff; }
.ina-equip { background: rgba(52,152,219,0.15); border: 1px solid rgba(52,152,219,0.4); color: #3498db; }
.ina-discard { background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.3); color: #e74c3c; }
.ina-btn:hover { opacity: 0.85; }

/* 导航 */
.inv-nav {
  position: relative; z-index: 2; display: flex; gap: 6px; margin-top: 4px;
}
.inv-nav-btn {
  flex: 1; text-align: center;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: #95a5a6; padding: 10px; border-radius: 10px;
  font-size: 12px; text-decoration: none; transition: all 0.2s;
}
.inv-nav-btn:hover { background: rgba(255,255,255,0.08); color: #bdc3c7; }
</style>