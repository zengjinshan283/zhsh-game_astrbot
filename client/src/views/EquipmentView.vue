<template>
<div class="equip-page">
  <div class="equip-bg"></div>

  <!-- 顶部 HUD -->
  <div class="equip-hud">
    <div class="eh-title">⚔️ 装备管理</div>
    <div class="eh-count">{{ equipped.length }} 件已装备</div>
  </div>

  <!-- 总属性 -->
  <div class="stats-card">
    <div class="sc-title">📊 总属性</div>
    <div class="sc-grid">
      <div class="sc-item">
        <div class="sci-icon">⚔️</div>
        <div class="sci-info">
          <div class="sci-label">攻击力</div>
          <div class="sci-val">{{ stats.atk_min }}-{{ stats.atk_max }}
            <span v-if="stats.bonusAtk > 0" class="sci-bonus">(+{{ stats.bonusAtk }})</span>
          </div>
        </div>
      </div>
      <div class="sc-item">
        <div class="sci-icon">🛡️</div>
        <div class="sci-info">
          <div class="sci-label">防御力</div>
          <div class="sci-val">{{ stats.def }}
            <span v-if="stats.bonusDef > 0" class="sci-bonus">(+{{ stats.bonusDef }})</span>
          </div>
        </div>
      </div>
      <div class="sc-item">
        <div class="sci-icon">❤️</div>
        <div class="sci-info">
          <div class="sci-label">生命</div>
          <div class="sci-val">{{ stats.hp_max || 0 }}
            <span v-if="stats.bonusHp > 0" class="sci-bonus">(+{{ stats.bonusHp }})</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 套装总览 -->
  <div class="set-overview" v-if="setOverview.length">
    <div class="so-title">🏆 套装总览</div>
    <div v-for="s in setOverview" :key="s.name" class="so-item" @click="openSetDetail(s)">
      <div class="so-header">
        <span class="so-name">{{ s.name }}</span>
        <span class="so-owned" :style="s.owned >= 2 ? 'color:#2ecc71' : 'color:#7f8c8d'">
          {{ s.owned }} 件{{ s.owned >= 2 ? ' ✅' : '' }}
        </span>
      </div>
      <div class="so-tiers">
        <div v-for="tier in s.tiers" :key="tier.piece_count" class="so-tier" :class="{active: s.owned >= tier.piece_count}">
          {{ tier.piece_count }}件
          <span v-if="tier.bonus_atk">⚔️+{{ tier.bonus_atk }}</span>
          <span v-if="tier.bonus_def"> 🛡️+{{ tier.bonus_def }}</span>
          <span v-if="tier.bonus_hp"> ❤️+{{ tier.bonus_hp }}</span>
          <span v-if="s.owned >= tier.piece_count" class="tier-active">✓</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 套装详情弹窗 -->
  <Teleport to="body">
    <div v-if="setDetail" class="set-modal-mask" @click.self="setDetail = null">
      <div class="set-modal">
        <div class="sm-header">
          <div class="sm-title">{{ setDetail.name }}</div>
          <button class="sm-close" @click="setDetail = null">×</button>
        </div>
        <div class="sm-progress">
          <span style="color:#2ecc71;">{{ setDetail.equippedCount }}件已装备</span>
          <span v-if="setDetail.backpackCount > 0" style="color:#95a5a6;"> + {{ setDetail.backpackCount }}件背包</span>
          <span style="color:#7f8c8d;"> = {{ setDetail.owned }}件</span>
        </div>
        <div class="sm-tiers">
          <div class="sm-tier-title">套装效果</div>
          <div v-for="tier in setDetail.tiers" :key="tier.piece_count" class="sm-tier-item" :class="{active: setDetail.owned >= tier.piece_count}">
            {{ tier.piece_count }}件：
            <span v-if="tier.bonus_atk">⚔️攻击+{{ tier.bonus_atk }}</span>
            <span v-if="tier.bonus_def"> 🛡️防御+{{ tier.bonus_def }}</span>
            <span v-if="tier.bonus_hp"> ❤️生命+{{ tier.bonus_hp }}</span>
            <span v-if="tier.description" style="color:#9a8a5a;margin-left:4px;">{{ tier.description }}</span>
            <span v-if="setDetail.owned >= tier.piece_count" class="tier-active">✓ 已激活</span>
          </div>
        </div>
        <div class="sm-pieces" v-if="setDetail.pieces && setDetail.pieces.length">
          <div class="sm-tier-title">套装部件</div>
          <div v-for="piece in setDetail.pieces" :key="piece.inv_id || piece.item_id" class="sm-piece" :class="{equipped: piece.equipped}">
            <span class="sp-icon">{{ piece.subtype === 'weapon' ? '🗡️' : piece.subtype === 'armor' ? '🛡️' : piece.subtype === 'boots' ? '👢' : piece.subtype === 'helmet' ? '⛑️' : piece.subtype === 'legs' ? '🦵' : '💎' }}</span>
            <span class="sp-name">{{ piece.name }}</span>
            <span v-if="piece.enhance_level > 0" class="sp-enh">+{{ piece.enhance_level }}</span>
            <span v-if="piece.equipped" class="sp-badge sp-equipped">已装备</span>
            <span v-else class="sp-badge sp-backpack">背包</span>
          </div>
        </div>
        <div v-else class="sm-empty">尚未获得任何部件</div>
      </div>
    </div>
  </Teleport>

  <!-- 激活套装提示 -->
  <div v-if="activeSets.length" class="active-set-banner">
    <div v-for="s in activeSets" :key="s.name" class="asb-item" @click="openSetDetail(s)">
      ✨ {{ s.name }} {{ s.count }}件 → {{ s.bonus.description }}
    </div>
  </div>

  <!-- 已装备列表 -->
  <div v-if="!equipped.length" class="eq-empty">没有装备任何物品</div>
  <div v-for="eq in equipped" :key="eq.inv_id" class="eq-card">
    <div class="eqc-left">
      <div class="eqc-icon">{{ eq.subtype === 'weapon' ? '🗡️' : '🛡️' }}</div>
    </div>
    <div class="eqc-body">
      <div class="eqc-name">
        {{ eq.name }}
        <span v-if="eq.enhance_level > 0" class="eqc-enh">+{{ eq.enhance_level }}</span>
        <span v-if="eq.set_name" class="eqc-set">[{{ eq.set_name }}]</span>
      </div>
      <div class="eqc-stats">
        <span v-if="eq.atk > 0">⚔️ {{ Math.round(eq.atk * (1 + eq.enhance_level * 0.03)) }}</span>
        <span v-if="eq.def_val > 0">🛡️ {{ Math.round(eq.def_val * (1 + eq.enhance_level * 0.03)) }}</span>
      </div>
    </div>
    <button class="eqc-unequip" @click="unequip(eq.inv_id)">卸下</button>
  </div>

  <!-- 底部导航 -->
  <div class="eq-nav">
    <router-link to="/inventory" class="eq-nav-btn">🎒 背包</router-link>
    <router-link to="/status" class="eq-nav-btn">👤 状态</router-link>
  </div>
</div>
</template>

<script setup>
import { globalConfirm } from '../composables/useConfirm';
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';

const userStore = useUserStore();
const equipped = ref([]);
const stats = ref({atk_min:0,atk_max:0,def:0,bonusAtk:0,bonusDef:0,bonusHp:0,hp_max:0});
const activeSets = ref([]);
const setOverview = ref([]);
const setDetail = ref(null);

async function openSetDetail(s) {
  try { setDetail.value = await Api.get('/user/set-detail/' + encodeURIComponent(s.name)); }
  catch (e) { setDetail.value = null; }
}

async function load() {
  try {
    const d = await Api.get('/user/equipment');
    equipped.value = d.equipped || [];
    stats.value = d.stats || {};
    activeSets.value = d.activeSets || [];
    setOverview.value = d.setOverview || [];
  } catch (e) {}
}

async function unequip(invId) {
  if (!(await globalConfirm('确认卸下？'))) return;
  try {
    await Api.post('/user/equip', { inventory_id: invId });
    const me = await Api.get('/auth/me');
    userStore.updateUser(me.user);
    await load();
  } catch (e) {}
}

onMounted(load);
</script>

<style scoped>
.equip-page {
  position: relative;
  display: flex; flex-direction: column; gap: 10px;
  padding: 8px 10px; min-height: 100%; overflow-y: auto;
}
.equip-bg {
  position: fixed; inset: 0; z-index: 0;
  background: linear-gradient(160deg, #0d1117 0%, #1a0d1a 50%, #0d1117 100%);
  pointer-events: none;
}

/* HUD */
.equip-hud {
  position: relative; z-index: 2;
  display: flex; justify-content: space-between; align-items: center;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 10px 14px;
}
.eh-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.eh-count { font-size: 11px; color: #7f8c8d; }

/* 统计卡 */
.stats-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 12px;
}
.sc-title { font-size: 11px; font-weight: 600; color: #7f8c8d; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.sc-grid { display: flex; flex-direction: column; gap: 6px; }
.sc-item { display: flex; align-items: center; gap: 10px; }
.sci-icon { font-size: 18px; width: 28px; text-align: center; }
.sci-info { flex: 1; }
.sci-label { font-size: 10px; color: #7f8c8d; }
.sci-val { font-size: 14px; font-weight: 700; color: #f0f0f0; }
.sci-bonus { font-size: 10px; color: #2ecc71; font-weight: 500; }

/* 套装总览 */
.set-overview {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 12px;
}
.so-title { font-size: 11px; font-weight: 600; color: #7f8c8d; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.so-item { cursor: pointer; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 6px; transition: all 0.2s; }
.so-item:hover { background: rgba(255,255,255,0.06); }
.so-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.so-name { font-size: 12px; font-weight: 700; color: #f1c40f; }
.so-owned { font-size: 10px; }
.so-tiers { display: flex; flex-direction: column; gap: 2px; }
.so-tier { font-size: 10px; color: #555; padding: 2px 6px; border-radius: 4px; display: flex; gap: 4px; align-items: center; }
.so-tier.active { color: #f1c40f; background: rgba(241,196,15,0.08); }
.tier-active { color: #2ecc71; margin-left: auto; }

/* 套装弹窗 */
.set-modal-mask {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.7); display: flex; align-items: flex-end; justify-content: center;
}
.set-modal {
  width: 100%; max-width: 440px; max-height: 75vh;
  background: rgba(13,17,23,0.97); border-radius: 16px 16px 0 0;
  overflow-y: auto; padding: 16px;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.sm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.sm-title { font-size: 16px; font-weight: 700; color: #f1c40f; }
.sm-close { background: none; border: none; font-size: 22px; color: #7f8c8d; cursor: pointer; padding: 0 4px; }
.sm-progress { font-size: 11px; margin-bottom: 10px; }
.sm-tiers { margin-bottom: 10px; }
.sm-tier-title { font-size: 11px; color: #7f8c8d; margin-bottom: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.sm-tier-item { font-size: 11px; padding: 5px 8px; border-radius: 6px; margin-bottom: 4px; background: rgba(255,255,255,0.04); color: #555; }
.sm-tier-item.active { background: rgba(241,196,15,0.08); color: #f1c40f; }
.sm-pieces { }
.sm-piece { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; margin-bottom: 4px; }
.sm-piece.equipped { background: rgba(39,174,96,0.08); }
.sp-icon { font-size: 16px; }
.sp-name { flex: 1; font-size: 12px; color: #f0f0f0; }
.sp-enh { font-size: 10px; color: #f1c40f; }
.sp-badge { font-size: 9px; padding: 2px 6px; border-radius: 4px; }
.sp-equipped { background: rgba(39,174,96,0.15); color: #2ecc71; }
.sp-backpack { background: rgba(255,255,255,0.06); color: #7f8c8d; }
.sm-empty { text-align: center; font-size: 12px; color: #555; padding: 16px; }

/* 激活套装横幅 */
.active-set-banner {
  position: relative; z-index: 2;
  background: rgba(241,196,15,0.06);
  border: 1px solid rgba(241,196,15,0.2);
  border-radius: 10px; padding: 8px 10px;
}
.asb-item { font-size: 11px; color: #f1c40f; cursor: pointer; line-height: 1.6; }

/* 已装备列表 */
.eq-empty { position: relative; z-index: 2; text-align: center; font-size: 11px; color: #555; padding: 20px; }
.eq-card {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 10px 12px;
  transition: all 0.2s;
}
.eq-card:hover { background: rgba(255,255,255,0.06); }
.eqc-left { flex-shrink: 0; }
.eqc-icon { font-size: 26px; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.06); border-radius: 10px; }
.eqc-body { flex: 1; }
.eqc-name { font-size: 13px; font-weight: 600; color: #f0f0f0; margin-bottom: 3px; }
.eqc-enh { color: #f1c40f; }
.eqc-set { color: #8b6914; font-size: 10px; margin-left: 4px; }
.eqc-stats { display: flex; gap: 8px; font-size: 11px; color: #95a5a6; }
.eqc-unequip {
  background: rgba(231,76,60,0.12); border: 1px solid rgba(231,76,60,0.3);
  color: #e74c3c; padding: 5px 10px; border-radius: 6px;
  font-size: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.eqc-unequip:hover { background: rgba(231,76,60,0.2); }

/* 底部导航 */
.eq-nav {
  position: relative; z-index: 2;
  display: flex; gap: 6px;
}
.eq-nav-btn {
  flex: 1; text-align: center;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: #95a5a6; padding: 10px; border-radius: 10px;
  font-size: 12px; text-decoration: none; transition: all 0.2s;
}
.eq-nav-btn:hover { background: rgba(255,255,255,0.08); color: #bdc3c7; }
</style>