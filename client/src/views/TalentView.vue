<template>
<div class="page">
<div class="location-bar">
  <div class="location-name">⚡ 天赋系统</div>
  <div class="location-path">可用 {{ talentPoints }} 点</div>
</div>

<div class="card" style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
  <div style="text-align:center;">
    <div style="font-size:28px;color:#c9a758;">{{ talentPoints }}</div>
    <div style="font-size:10px;color:#8b784e;">剩余点数</div>
  </div>
  <div style="flex:1;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
    <div style="text-align:center;padding:6px;background:rgba(60,120,60,0.15);border-radius:6px;">
      <div style="font-size:12px;color:#70c070;">{{ learnedCount }}</div>
      <div style="font-size:9px;color:#8b784e;">已学</div>
    </div>
    <div style="text-align:center;padding:6px;background:rgba(100,80,40,0.15);border-radius:6px;">
      <div style="font-size:12px;color:#c9a758;">{{ totalLearnedLevel }}</div>
      <div style="font-size:9px;color:#8b784e;">总等级</div>
    </div>
    <div style="text-align:center;padding:6px;background:rgba(80,80,160,0.15);border-radius:6px;">
      <div style="font-size:12px;color:#8888cc;">{{ bonusesActive }}</div>
      <div style="font-size:9px;color:#8b784e;">激活效果</div>
    </div>
  </div>
</div>

<!-- 战斗天赋 -->
<div class="talent-category">
  <div class="talent-cat-title">⚔️ 战斗系</div>
  <div class="talent-grid">
    <div v-for="t in category0" :key="t.id" class="talent-card" :class="{'talent-learned':myTalents[t.id],'talent-maxed':myTalents[t.id]>=t.max_level}">
      <div class="talent-icon">{{ iconMap[t.icon] || '✨' }}</div>
      <div class="talent-name">{{ t.name }}</div>
      <div class="talent-desc">{{ t.description }}</div>
      <div class="talent-effect">
        <span v-if="t.effect_type==='atk_pct'" class="text-red">⚔️ 攻击 +{{ t.effect_value }}%/级</span>
        <span v-else-if="t.effect_type==='def_pct'" class="text-blue">🛡️ 防御 +{{ t.effect_value }}%/级</span>
        <span v-else-if="t.effect_type==='agi_pct'" class="text-green">💨 敏捷 +{{ t.effect_value }}%/级</span>
        <span v-else-if="t.effect_type==='hp_pct'" class="text-red">❤️ 生命 +{{ t.effect_value }}%/级</span>
        <span v-else-if="t.effect_type==='mp_pct'" class="text-blue">💠 魔力 +{{ t.effect_value }}%/级</span>
        <span v-else-if="t.effect_type==='crit_pct'" class="text-yellow">💥 暴击 +{{ t.effect_value }}%/级</span>
        <span v-else-if="t.effect_type==='damage_reduce'" class="text-blue">🛡️ 减伤 +{{ t.effect_value }}%/级</span>
        <span v-else-if="t.effect_type==='counter_pct'" class="text-yellow">⚡ 反击 +{{ t.effect_value }}%/级</span>
        <span v-else class="text-gray">{{ t.effect_type }} +{{ t.effect_value }}/级</span>
      </div>
      <div class="talent-level-bar" v-if="myTalents[t.id]">
        <div class="talent-level-fill" :style="{width:(myTalents[t.id]/t.max_level*100)+'%'}"></div>
        <span class="talent-level-text">Lv.{{ myTalents[t.id] }}/{{ t.max_level }}</span>
      </div>
      <div class="talent-cost" v-if="!myTalents[t.id]||myTalents[t.id]<t.max_level">
        <span :class="talentPoints>=t.cost_points?'text-gold':'text-gray'">💠 {{ t.cost_points }}点</span>
      </div>
      <div class="talent-max-badge" v-else>已满级</div>
      <button v-if="(!myTalents[t.id]||myTalents[t.id]<t.max_level)&&talentPoints>=t.cost_points"
        class="talent-btn" @click="learn(t.id)">学习</button>
      <button v-else-if="(!myTalents[t.id]||myTalents[t.id]<t.max_level)&&talentPoints<t.cost_points"
        class="talent-btn talent-btn-disabled" disabled>点数不足</button>
      <div v-else-if="myTalents[t.id]>=t.max_level" style="height:30px;"></div>
    </div>
  </div>
</div>

<!-- 航海天赋 -->
<div class="talent-category">
  <div class="talent-cat-title">⛵ 航海系</div>
  <div class="talent-grid">
    <div v-for="t in category1" :key="t.id" class="talent-card" :class="{'talent-learned':myTalents[t.id],'talent-maxed':myTalents[t.id]>=t.max_level}">
      <div class="talent-icon">{{ iconMap[t.icon] || '✨' }}</div>
      <div class="talent-name">{{ t.name }}</div>
      <div class="talent-desc">{{ t.description }}</div>
      <div class="talent-effect">
        <span v-if="t.effect_type==='sail_speed'" class="text-blue">帆速 +{{ t.effect_value }}%/级</span>
        <span v-else-if="t.effect_type==='treasure_rate'" class="text-gold">宝图 +{{ t.effect_value }}%/级</span>
        <span v-else-if="t.effect_type==='pirate_avoid'" class="text-gray">海盗躲避 +{{ t.effect_value }}%/级</span>
        <span v-else-if="t.effect_type==='ocean_speed'" class="text-blue">远洋 +{{ t.effect_value }}%/级</span>
        <span v-else-if="t.effect_type==='fish_rate'" class="text-green">渔业 +{{ t.effect_value }}%/级</span>
        <span v-else class="text-gray">{{ t.effect_type }} +{{ t.effect_value }}/级</span>
      </div>
      <div class="talent-level-bar" v-if="myTalents[t.id]">
        <div class="talent-level-fill" :style="{width:(myTalents[t.id]/t.max_level*100)+'%'}"></div>
        <span class="talent-level-text">Lv.{{ myTalents[t.id] }}/{{ t.max_level }}</span>
      </div>
      <div class="talent-cost" v-if="!myTalents[t.id]||myTalents[t.id]<t.max_level">
        <span :class="talentPoints>=t.cost_points?'text-gold':'text-gray'">💠 {{ t.cost_points }}点</span>
      </div>
      <div class="talent-max-badge" v-else>已满级</div>
      <button v-if="(!myTalents[t.id]||myTalents[t.id]<t.max_level)&&talentPoints>=t.cost_points"
        class="talent-btn" @click="learn(t.id)">学习</button>
      <button v-else-if="(!myTalents[t.id]||myTalents[t.id]<t.max_level)&&talentPoints<t.cost_points"
        class="talent-btn talent-btn-disabled" disabled>点数不足</button>
      <div v-else-if="myTalents[t.id]>=t.max_level" style="height:30px;"></div>
    </div>
  </div>
</div>

<!-- 贸易天赋 -->
<div class="talent-category">
  <div class="talent-cat-title">💰 贸易系</div>
  <div class="talent-grid">
    <div v-for="t in category2" :key="t.id" class="talent-card" :class="{'talent-learned':myTalents[t.id],'talent-maxed':myTalents[t.id]>=t.max_level}">
      <div class="talent-icon">{{ iconMap[t.icon] || '✨' }}</div>
      <div class="talent-name">{{ t.name }}</div>
      <div class="talent-desc">{{ t.description }}</div>
      <div class="talent-effect">
        <span v-if="t.effect_type==='sell_price'" class="text-gold">售价 +{{ t.effect_value }}%/级</span>
        <span v-else-if="t.effect_type==='buy_price'" class="text-gray">进货 -{{ t.effect_value }}%/级</span>
        <span v-else-if="t.effect_type==='tax_reduce'" class="text-blue">税务 -{{ t.effect_value }}%/级</span>
        <span v-else-if="t.effect_type==='trade_profit'" class="text-gold">贸易 +{{ t.effect_value }}%/级</span>
        <span v-else-if="t.effect_type==='luxury_sell'" class="text-gold">奢侈品 +{{ t.effect_value }}%/级</span>
        <span v-else-if="t.effect_type==='carry_capacity'" class="text-green">仓库 +{{ t.effect_value }}/级</span>
        <span v-else class="text-gray">{{ t.effect_type }} +{{ t.effect_value }}/级</span>
      </div>
      <div class="talent-level-bar" v-if="myTalents[t.id]">
        <div class="talent-level-fill" :style="{width:(myTalents[t.id]/t.max_level*100)+'%'}"></div>
        <span class="talent-level-text">Lv.{{ myTalents[t.id] }}/{{ t.max_level }}</span>
      </div>
      <div class="talent-cost" v-if="!myTalents[t.id]||myTalents[t.id]<t.max_level">
        <span :class="talentPoints>=t.cost_points?'text-gold':'text-gray'">💠 {{ t.cost_points }}点</span>
      </div>
      <div class="talent-max-badge" v-else>已满级</div>
      <button v-if="(!myTalents[t.id]||myTalents[t.id]<t.max_level)&&talentPoints>=t.cost_points"
        class="talent-btn" @click="learn(t.id)">学习</button>
      <button v-else-if="(!myTalents[t.id]||myTalents[t.id]<t.max_level)&&talentPoints<t.cost_points"
        class="talent-btn talent-btn-disabled" disabled>点数不足</button>
      <div v-else-if="myTalents[t.id]>=t.max_level" style="height:30px;"></div>
    </div>
  </div>
</div>

<div class="card" style="margin-top:12px;">
  <div style="display:flex;gap:6px;">
    <button class="btn btn-secondary" style="flex:1;" @click="showReset=true">🔄 重置天赋</button>
  </div>
</div>

<!-- 重置确认弹窗 -->
<Teleport to="body">
<div v-if="showReset" class="slot-picker-overlay" @click.self="showReset=false">
  <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:300;" @click="showReset=false"></div>
  <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:280px;background:rgba(26,26,46,0.97);border-radius:12px;padding:20px;z-index:301;">
    <div style="text-align:center;font-size:16px;color:#f7efdb;margin-bottom:8px;">🔄 确认重置天赋？</div>
    <div style="text-align:center;font-size:12px;color:#8b784e;margin-bottom:16px;">重置后返还所有天赋点<br>消耗 100 金币</div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-secondary" style="flex:1;" @click="showReset=false">取消</button>
      <button class="btn btn-primary" style="flex:1;" @click="reset">确认重置</button>
    </div>
  </div>
</div>
</Teleport>

<!-- Toast -->
<Teleport to="body">
<div v-if="toast" class="toast">{{ toast }}</div>
</Teleport>
</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Api } from '../composables/useApi';

const talentPoints = ref(0);
const talents = ref({}); // { tid: level }
const talentList = ref([]);
const showReset = ref(false);
const toast = ref('');

const iconMap = {
  atk: '⚔️', def: '🛡️', agi: '💨', hp: '❤️', mp: '💠',
  crit: '💥', shield: '🛡️', counter: '⚡',
  wind: '🌬️', treasure: '🗺️', avoid: '🏃', ocean: '🌊', fish: '🐟',
  sell: '💰', buy: '🛒', tax: '📋', trade: '🤝', gem: '💎', package: '🎒'
};

const category0 = computed(() => talentList.value.filter(t => t.category === 0));
const category1 = computed(() => talentList.value.filter(t => t.category === 1));
const category2 = computed(() => talentList.value.filter(t => t.category === 2));

const myTalents = computed(() => {
  const m = {};
  for (const [tid, d] of Object.entries(talents.value)) {
    m[Number(tid)] = d.level;
  }
  return m;
});

const learnedCount = computed(() => Object.keys(talents.value).length);
const totalLearnedLevel = computed(() => Object.values(talents.value).reduce((s, d) => s + (d.level || 0), 0));
const bonusesActive = computed(() => {
  const b = talents.value;
  return Object.keys(b).filter(k => b[k].level > 0).length;
});

function showToast(msg) {
  toast.value = msg;
  setTimeout(() => toast.value = '', 2000);
}

async function load() {
  try {
    const [my, list] = await Promise.all([
      Api.get('/talent/my'),
      Api.get('/talent/list')
    ]);
    talentPoints.value = my.talent_points || 0;
    talents.value = my.talents || {};
    talentList.value = list || [];
  } catch(e) {
    showToast('加载失败');
  }
}

async function learn(talent_id) {
  try {
    const res = await Api.post('/talent/learn', { talent_id });
    showToast(res.msg || '学习成功');
    await load();
  } catch(e) {
    showToast(e.msg || '学习失败');
  }
}

async function reset() {
  try {
    const res = await Api.post('/talent/reset', {});
    showToast(res.msg || '重置成功');
    showReset.value = false;
    await load();
  } catch(e) {
    showToast(e.msg || '重置失败');
  }
}

onMounted(load);
</script>

<style scoped>
.talent-category { margin-bottom: 16px; }
.talent-cat-title {
  font-size: 13px;
  color: #c9a758;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(201, 165, 88, 0.2);
}
.talent-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.talent-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.talent-learned {
  background: rgba(60, 120, 60, 0.1);
  border-color: rgba(80, 160, 80, 0.25);
}
.talent-maxed {
  background: rgba(201, 165, 88, 0.08);
  border-color: rgba(201, 165, 88, 0.3);
}
.talent-icon { font-size: 20px; text-align: center; }
.talent-name {
  text-align: center;
  font-size: 12px;
  color: #f7efdb;
  font-weight: bold;
}
.talent-desc {
  text-align: center;
  font-size: 9px;
  color: #8b784e;
  line-height: 1.3;
}
.talent-effect {
  text-align: center;
  font-size: 10px;
  margin: 2px 0;
}
.talent-level-bar {
  position: relative;
  height: 12px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  overflow: hidden;
}
.talent-level-fill {
  height: 100%;
  background: linear-gradient(90deg, #2e5a3b, #4a8a5a);
  border-radius: 6px;
}
.talent-level-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  color: #f7efdb;
}
.talent-cost {
  text-align: center;
  font-size: 10px;
}
.talent-max-badge {
  text-align: center;
  font-size: 9px;
  color: #c9a758;
}
.talent-btn {
  margin-top: 4px;
  padding: 4px 8px;
  background: linear-gradient(135deg, #2e5a3b, #3a6a4a);
  border: none;
  border-radius: 4px;
  color: #f7efdb;
  font-size: 11px;
  cursor: pointer;
}
.talent-btn-disabled {
  background: rgba(80, 80, 80, 0.3);
  color: #666;
  cursor: not-allowed;
}
.toast {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 30, 50, 0.95);
  color: #f7efdb;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  z-index: 9999;
  border: 1px solid rgba(201, 165, 88, 0.3);
}
</style>