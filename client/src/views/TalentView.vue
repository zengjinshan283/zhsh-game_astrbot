<template>
  <div class="page-wrap talent-page">

  <div class="page-hud"><div class="page-hud-title">💫 天赋</div></div>    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-left">
        <div class="hud-icon">⚡</div>
        <div class="hud-title">天赋系统</div>
      </div>
      <div class="hud-points">可用 {{ talentPoints }} 点</div>
    </div>

    <!-- 天赋概览 -->
    <div class="overview-card">
      <div class="ov-left">
        <div class="ov-num">{{ talentPoints }}</div>
        <div class="ov-label">剩余点数</div>
      </div>
      <div class="ov-right">
        <div class="ov-stat">
          <div class="ov-val green">{{ learnedCount }}</div>
          <div class="ov-key">已学</div>
        </div>
        <div class="ov-stat">
          <div class="ov-val gold">{{ totalLearnedLevel }}</div>
          <div class="ov-key">总等级</div>
        </div>
        <div class="ov-stat">
          <div class="ov-val blue">{{ bonusesActive }}</div>
          <div class="ov-key">激活效果</div>
        </div>
      </div>
    </div>

    <!-- 战斗天赋 -->
    <div class="cat-section">
      <div class="cat-title">⚔️ 战斗系</div>
      <div class="talent-grid">
        <div
          v-for="t in category0" :key="t.id"
          class="talent-card"
          :class="{ learned: myTalents[t.id], maxed: myTalents[t.id] >= t.max_level }"
        >
          <div class="tc-icon">{{ iconMap[t.icon] || '✨' }}</div>
          <div class="tc-name">{{ t.name }}</div>
          <div class="tc-desc">{{ t.description }}</div>
          <div class="tc-effect">
            <span v-if="t.effect_type === 'atk_pct'" class="effect-red">⚔️ 攻击 +{{ t.effect_value }}%/级</span>
            <span v-else-if="t.effect_type === 'def_pct'" class="effect-blue">🛡️ 防御 +{{ t.effect_value }}%/级</span>
            <span v-else-if="t.effect_type === 'agi_pct'" class="effect-green">💨 敏捷 +{{ t.effect_value }}%/级</span>
            <span v-else-if="t.effect_type === 'hp_pct'" class="effect-red">❤️ 生命 +{{ t.effect_value }}%/级</span>
            <span v-else-if="t.effect_type === 'mp_pct'" class="effect-blue">💠 魔力 +{{ t.effect_value }}%/级</span>
            <span v-else-if="t.effect_type === 'crit_pct'" class="effect-yellow">💥 暴击 +{{ t.effect_value }}%/级</span>
            <span v-else-if="t.effect_type === 'damage_reduce'" class="effect-blue">🛡️ 减伤 +{{ t.effect_value }}%/级</span>
            <span v-else-if="t.effect_type === 'counter_pct'" class="effect-yellow">⚡ 反击 +{{ t.effect_value }}%/级</span>
            <span v-else class="effect-gray">{{ t.effect_type }} +{{ t.effect_value }}/级</span>
          </div>
          <div v-if="myTalents[t.id]" class="tc-level">
            <div class="tl-bar">
              <div class="tl-fill" :style="{ width: (myTalents[t.id] / t.max_level * 100) + '%' }"></div>
            </div>
            <span class="tl-text">Lv.{{ myTalents[t.id] }}/{{ t.max_level }}</span>
          </div>
          <div v-if="!myTalents[t.id] || myTalents[t.id] < t.max_level" class="tc-cost">
            <span :class="talentPoints >= t.cost_points ? 'cost-gold' : 'cost-gray'">💠 {{ t.cost_points }}点</span>
          </div>
          <div v-else class="tc-maxed">已满级</div>
          <button
            v-if="(!myTalents[t.id] || myTalents[t.id] < t.max_level) && talentPoints >= t.cost_points"
            class="tc-btn" @click="learn(t.id)"
          >学习</button>
          <button
            v-else-if="(!myTalents[t.id] || myTalents[t.id] < t.max_level) && talentPoints < t.cost_points"
            class="tc-btn tc-btn-disabled" disabled
          >点数不足</button>
          <div v-else style="height: 30px;"></div>
        </div>
      </div>
    </div>

    <!-- 航海天赋 -->
    <div class="cat-section">
      <div class="cat-title">⛵ 航海系</div>
      <div class="talent-grid">
        <div
          v-for="t in category1" :key="t.id"
          class="talent-card"
          :class="{ learned: myTalents[t.id], maxed: myTalents[t.id] >= t.max_level }"
        >
          <div class="tc-icon">{{ iconMap[t.icon] || '✨' }}</div>
          <div class="tc-name">{{ t.name }}</div>
          <div class="tc-desc">{{ t.description }}</div>
          <div class="tc-effect">
            <span v-if="t.effect_type === 'sail_speed'" class="effect-blue">帆速 +{{ t.effect_value }}%/级</span>
            <span v-else-if="t.effect_type === 'treasure_rate'" class="effect-gold">宝图 +{{ t.effect_value }}%/级</span>
            <span v-else-if="t.effect_type === 'pirate_avoid'" class="effect-gray">海盗躲避 +{{ t.effect_value }}%/级</span>
            <span v-else-if="t.effect_type === 'ocean_speed'" class="effect-blue">远洋 +{{ t.effect_value }}%/级</span>
            <span v-else-if="t.effect_type === 'fish_rate'" class="effect-green">渔业 +{{ t.effect_value }}%/级</span>
            <span v-else class="effect-gray">{{ t.effect_type }} +{{ t.effect_value }}/级</span>
          </div>
          <div v-if="myTalents[t.id]" class="tc-level">
            <div class="tl-bar"><div class="tl-fill" :style="{ width: (myTalents[t.id] / t.max_level * 100) + '%' }"></div></div>
            <span class="tl-text">Lv.{{ myTalents[t.id] }}/{{ t.max_level }}</span>
          </div>
          <div v-if="!myTalents[t.id] || myTalents[t.id] < t.max_level" class="tc-cost">
            <span :class="talentPoints >= t.cost_points ? 'cost-gold' : 'cost-gray'">💠 {{ t.cost_points }}点</span>
          </div>
          <div v-else class="tc-maxed">已满级</div>
          <button
            v-if="(!myTalents[t.id] || myTalents[t.id] < t.max_level) && talentPoints >= t.cost_points"
            class="tc-btn" @click="learn(t.id)"
          >学习</button>
          <button
            v-else-if="(!myTalents[t.id] || myTalents[t.id] < t.max_level) && talentPoints < t.cost_points"
            class="tc-btn tc-btn-disabled" disabled
          >点数不足</button>
          <div v-else style="height: 30px;"></div>
        </div>
      </div>
    </div>

    <!-- 贸易天赋 -->
    <div class="cat-section">
      <div class="cat-title">💰 贸易系</div>
      <div class="talent-grid">
        <div
          v-for="t in category2" :key="t.id"
          class="talent-card"
          :class="{ learned: myTalents[t.id], maxed: myTalents[t.id] >= t.max_level }"
        >
          <div class="tc-icon">{{ iconMap[t.icon] || '✨' }}</div>
          <div class="tc-name">{{ t.name }}</div>
          <div class="tc-desc">{{ t.description }}</div>
          <div class="tc-effect">
            <span v-if="t.effect_type === 'sell_price'" class="effect-gold">售价 +{{ t.effect_value }}%/级</span>
            <span v-else-if="t.effect_type === 'buy_price'" class="effect-gray">进货 -{{ t.effect_value }}%/级</span>
            <span v-else-if="t.effect_type === 'tax_reduce'" class="effect-blue">税务 -{{ t.effect_value }}%/级</span>
            <span v-else-if="t.effect_type === 'trade_profit'" class="effect-gold">贸易 +{{ t.effect_value }}%/级</span>
            <span v-else-if="t.effect_type === 'luxury_sell'" class="effect-gold">奢侈品 +{{ t.effect_value }}%/级</span>
            <span v-else-if="t.effect_type === 'carry_capacity'" class="effect-green">仓库 +{{ t.effect_value }}/级</span>
            <span v-else class="effect-gray">{{ t.effect_type }} +{{ t.effect_value }}/级</span>
          </div>
          <div v-if="myTalents[t.id]" class="tc-level">
            <div class="tl-bar"><div class="tl-fill" :style="{ width: (myTalents[t.id] / t.max_level * 100) + '%' }"></div></div>
            <span class="tl-text">Lv.{{ myTalents[t.id] }}/{{ t.max_level }}</span>
          </div>
          <div v-if="!myTalents[t.id] || myTalents[t.id] < t.max_level" class="tc-cost">
            <span :class="talentPoints >= t.cost_points ? 'cost-gold' : 'cost-gray'">💠 {{ t.cost_points }}点</span>
          </div>
          <div v-else class="tc-maxed">已满级</div>
          <button
            v-if="(!myTalents[t.id] || myTalents[t.id] < t.max_level) && talentPoints >= t.cost_points"
            class="tc-btn" @click="learn(t.id)"
          >学习</button>
          <button
            v-else-if="(!myTalents[t.id] || myTalents[t.id] < t.max_level) && talentPoints < t.cost_points"
            class="tc-btn tc-btn-disabled" disabled
          >点数不足</button>
          <div v-else style="height: 30px;"></div>
        </div>
      </div>
    </div>

    <!-- 重置按钮 -->
    <div class="reset-card">
      <button class="reset-btn" @click="showReset = true">🔄 重置天赋</button>
    </div>

    <!-- 重置确认弹窗 -->
    <Teleport to="body">
      <div v-if="showReset" class="overlay" @click.self="showReset = false">
        <div class="reset-dialog">
          <div class="reset-title">🔄 确认重置天赋？</div>
          <div class="reset-desc">重置后返还所有天赋点<br>消耗 100 金币</div>
          <div class="reset-actions">
            <button class="reset-cancel" @click="showReset = false">取消</button>
            <button class="reset-confirm" @click="reset">确认重置</button>
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
const talents = ref({});
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
  for (const [tid, d] of Object.entries(talents.value)) m[Number(tid)] = d.level;
  return m;
});

const learnedCount = computed(() => Object.keys(talents.value).length);
const totalLearnedLevel = computed(() => Object.values(talents.value).reduce((s, d) => s + (d.level || 0), 0));
const bonusesActive = computed(() => Object.keys(talents.value).filter(k => talents.value[k].level > 0).length);

function showToast(msg) { toast.value = msg; setTimeout(() => toast.value = '', 2000); }

async function load() {
  try {
    const [my, list] = await Promise.all([Api.get('/talent/my'), Api.get('/talent/list')]);
    talentPoints.value = my.talent_points || 0;
    talents.value = my.talents || {};
    talentList.value = list || [];
  } catch (e) { showToast('加载失败'); }
}

async function learn(talent_id) {
  try { const res = await Api.post('/talent/learn', { talent_id }); showToast(res.msg || '学习成功'); await load(); }
  catch (e) { showToast(e.msg || '学习失败'); }
}

async function reset() {
  try { const res = await Api.post('/talent/reset', {}); showToast(res.msg || '重置成功'); showReset.value = false; await load(); }
  catch (e) { showToast(e.msg || '重置失败'); }
}

onMounted(load);
</script>

<style scoped>
.talent-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}
.top-hud {
  position: relative; z-index: 2;
  background: rgba(13,17,23,0.88); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 14px;
  padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;
}
.hud-left { display: flex; align-items: center; gap: 8px; }
.hud-icon { font-size: 20px; }
.hud-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.hud-points { font-size: 12px; color: #7f8c8d; background: rgba(255,255,255,0.06); padding: 2px 10px; border-radius: 10px; }
.overview-card {
  position: relative; z-index: 2;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px 16px; display: flex; gap: 16px;
}
.ov-left { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.ov-num { font-size: 28px; font-weight: 700; color: #c9a758; }
.ov-label { font-size: 10px; color: #7f8c8d; }
.ov-right { flex: 1; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
.ov-stat { background: rgba(255,255,255,0.04); border-radius: 8px; padding: 8px 6px; text-align: center; }
.ov-val { font-size: 16px; font-weight: 700; }
.ov-val.green { color: #27ae60; }
.ov-val.gold { color: #c9a758; }
.ov-val.blue { color: #8888cc; }
.ov-key { font-size: 9px; color: #7f8c8d; margin-top: 2px; }
.cat-section { position: relative; z-index: 2; }
.cat-title {
  font-size: 13px; color: #c9a758; margin-bottom: 8px;
  padding-bottom: 4px; border-bottom: 1px solid rgba(201,168,76,0.2);
}
.talent-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.talent-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 3px;
}
.talent-card.learned { background: rgba(39,174,96,0.06); border-color: rgba(39,174,96,0.2); }
.talent-card.maxed { background: rgba(201,168,76,0.08); border-color: rgba(201,168,76,0.25); }
.tc-icon { font-size: 18px; text-align: center; }
.tc-name { text-align: center; font-size: 12px; color: #f0f0f0; font-weight: 700; }
.tc-desc { text-align: center; font-size: 9px; color: #7f8c8d; line-height: 1.3; }
.tc-effect { text-align: center; font-size: 10px; margin: 2px 0; }
.effect-red { color: #e74c3c; }
.effect-blue { color: #8888cc; }
.effect-green { color: #27ae60; }
.effect-gold { color: #c9a758; }
.effect-yellow { color: #f1c40f; }
.effect-gray { color: #7f8c8d; }
.tc-level { margin: 2px 0; }
.tl-bar { position: relative; height: 10px; background: rgba(255,255,255,0.06); border-radius: 5px; overflow: hidden; }
.tl-fill { height: 100%; background: linear-gradient(90deg, #3f6a4a, #27ae60); border-radius: 5px; }
.tl-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #f0f0f0; }
.tc-cost { text-align: center; font-size: 10px; }
.cost-gold { color: #c9a758; }
.cost-gray { color: #555; }
.tc-maxed { text-align: center; font-size: 10px; color: #c9a758; }
.tc-btn {
  margin-top: 4px; padding: 5px 8px;
  background: linear-gradient(135deg, #3f6a4a, #27ae60); border: none;
  border-radius: 6px; color: #fff; font-size: 11px; font-weight: 600; cursor: pointer;
}
.tc-btn-disabled { background: rgba(80,80,80,0.3); color: #555; cursor: not-allowed; }
.reset-card {
  position: relative; z-index: 2;
  margin-top: 4px;
}
.reset-btn {
  width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; color: #7f8c8d; font-size: 14px; padding: 12px; cursor: pointer;
  transition: all 0.2s;
}
.reset-btn:hover { background: rgba(255,255,255,0.1); color: #f0f0f0; }
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; backdrop-filter: blur(4px);
}
.reset-dialog {
  background: rgba(13,17,23,0.97); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px; padding: 24px 20px; width: 280px; text-align: center;
}
.reset-title { font-size: 16px; color: #f0f0f0; font-weight: 700; margin-bottom: 8px; }
.reset-desc { font-size: 12px; color: #7f8c8d; margin-bottom: 16px; line-height: 1.5; }
.reset-actions { display: flex; gap: 8px; }
.reset-cancel {
  flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; color: #7f8c8d; font-size: 14px; padding: 10px; cursor: pointer;
}
.reset-confirm {
  flex: 1; background: linear-gradient(135deg, #3f6a4a, #27ae60); border: none;
  border-radius: 8px; color: #fff; font-size: 14px; font-weight: 700; padding: 10px; cursor: pointer;
}
.toast {
  position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
  background: rgba(20,20,40,0.95); color: #f0f0f0; padding: 8px 16px;
  border-radius: 20px; font-size: 13px; z-index: 9999;
  border: 1px solid rgba(201,168,76,0.3);
}
</style>