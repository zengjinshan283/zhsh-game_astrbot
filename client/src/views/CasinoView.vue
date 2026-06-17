<template>
  <div class="page-wrap casino-page">

  <div class="page-hud"><div class="page-hud-title">🎰 赌场</div></div>    <!-- 顶部 HUD -->
    <div class="top-hud">
      <div class="hud-title">🎰 赌场</div>
      <div class="hud-money">💰 {{ formatMoney(money) }}</div>
    </div>
    <!-- 结果提示 -->
    <div class="result-card" v-if="msg" :class="{ error: msgType === 'error', success: msgType !== 'error' }">
      <span class="result-icon">{{ msgType === 'error' ? '😞' : '🎉' }}</span>
      <span class="result-text">{{ msg }}</span>
    </div>

    <!-- 骰子结果展示 -->
    <div class="dice-card" v-if="result" :class="{ win: result.isWin, lose: !result.isWin }">
      <div class="dice-faces">
        <span class="dice-die">{{ diceFaces[result.dice1] }}</span>
        <span class="dice-plus">+</span>
        <span class="dice-die">{{ diceFaces[result.dice2] }}</span>
        <span class="dice-eq">=</span>
        <span class="dice-total">{{ result.total }}</span>
      </div>
      <div class="dice-info">
        <span class="dice-type">{{ result.isBig ? '🔵大' : '🔵小' }}</span>
        <span class="dice-choice">你选了 {{ result.choice === 'big' ? '大' : '小' }}</span>
        <span class="dice-result" :class="result.isWin ? 'win-text' : 'lose-text'">
          {{ result.isWin ? '→ 猜对了！' : '→ 猜错了' }}
        </span>
      </div>
    </div>

    <!-- 下注区域 -->
    <div class="bet-card">
      <div class="bet-title">🎲 猜大小</div>
      <div class="bet-rules">两个骰子 · 小(2~6) · 大(7~12) · 猜对赢双倍</div>

      <!-- 大小选择 -->
      <div class="choice-row">
        <div class="choice-btn choice-big" :class="{ active: choice === 'big' }" @click="choice = 'big'">
          <div class="cb-icon">🔺</div>
          <div class="cb-label">大</div>
          <div class="cb-range">7-12</div>
        </div>
        <div class="choice-btn choice-small" :class="{ active: choice === 'small' }" @click="choice = 'small'">
          <div class="cb-icon">🔻</div>
          <div class="cb-label">小</div>
          <div class="cb-range">2-6</div>
        </div>
      </div>

      <!-- 金额输入 -->
      <div class="bet-input-row">
        <input v-model.number="betAmount" type="number" min="1" placeholder="下注金额" class="bet-input" />
        <button class="bet-submit" @click="bet" :disabled="!choice || !betAmount">下注</button>
      </div>

      <!-- 快捷按钮 -->
      <div class="quick-row">
        <button class="quick-btn" @click="betAmount = 100">⚡ 100</button>
        <button class="quick-btn" @click="betAmount = 500">⚡ 500</button>
        <button class="quick-btn" @click="betAmount = Math.min(1000, money)">⚡ 全押</button>
      </div>
    </div>

    <!-- 返回按钮 -->
    <router-link to="/citymap" class="back-btn">← 返回地图</router-link>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';
import { formatMoney } from '../utils/formatters';

const userStore = useUserStore();
const money = ref(0);
const choice = ref('');
const betAmount = ref(null);
const result = ref(null);
const msg = ref('');
const msgType = ref('');

const diceFaces = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };

async function placeBet() {
  try {
    const d = await Api.post('/casino/bet', { amount: betAmount.value, choice: choice.value });
    result.value = { dice1: d.dice1, dice2: d.dice2, total: d.total, isBig: d.isBig, choice: d.choice, isWin: d.isWin };
    msg.value = d.msg;
    msgType.value = d.success ? 'success' : 'error';
    const me = await Api.get('/auth/me');
    userStore.updateUser(me.user);
    money.value = me.user.money;
  } catch (e) {
    msg.value = e.message;
    msgType.value = 'error';
  }
}

onMounted(async () => {
  try {
    const me = await Api.get('/auth/me');
    userStore.updateUser(me.user);
    money.value = me.user.money;
  } catch (e) {}
});
</script>

<style scoped>
.casino-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 10px;
  min-height: 100%;
  overflow-y: auto;
}

.top-hud {
  position: relative;
  z-index: 2;
  background: rgba(13, 17, 23, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hud-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.hud-money { font-size: 14px; font-weight: 700; color: #f1c40f; }

.result-card {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: center;
}
.result-card.success { border-color: rgba(39, 174, 96, 0.3); background: rgba(39, 174, 96, 0.08); }
.result-card.error { border-color: rgba(184, 90, 58, 0.3); background: rgba(184, 90, 58, 0.08); }
.result-icon { font-size: 20px; }
.result-text { font-size: 13px; font-weight: 600; color: #f0f0f0; }

.dice-card {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.dice-card.win { border-color: rgba(39, 174, 96, 0.4); }
.dice-card.lose { border-color: rgba(184, 90, 58, 0.4); }

.dice-faces {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 36px;
}
.dice-die { font-size: 40px; }
.dice-plus { font-size: 24px; color: #7f8c8d; }
.dice-eq { font-size: 20px; color: #7f8c8d; }
.dice-total {
  font-size: 32px;
  font-weight: 800;
  color: #c9a758;
}

.dice-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.dice-type { color: #f1c40f; font-weight: 600; }
.dice-choice { color: #bdc3c7; }
.win-text { color: #27ae60; font-weight: 600; }
.lose-text { color: #e74c3c; font-weight: 600; }

.bet-card {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bet-title { font-size: 15px; font-weight: 700; color: #f0f0f0; }
.bet-rules { font-size: 11px; color: #7f8c8d; margin-top: -6px; }

.choice-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.choice-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 12px;
  border-radius: 12px;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.2s;
  opacity: 0.5;
}
.choice-btn.active { opacity: 1; transform: scale(1.03); }
.choice-big {
  background: linear-gradient(135deg, #73281c, #5c1f15);
  color: #fff;
}
.choice-big.active { border-color: #b85a3a; box-shadow: 0 0 20px rgba(115, 40, 28, 0.5); }
.choice-small {
  background: linear-gradient(135deg, #3f6a4a, #35573f);
  color: #fff;
}
.choice-small.active { border-color: #5f8a6f; box-shadow: 0 0 20px rgba(63, 106, 74, 0.5); }
.cb-icon { font-size: 28px; }
.cb-label { font-size: 18px; font-weight: 700; }
.cb-range { font-size: 11px; opacity: 0.7; }

.bet-input-row {
  display: flex;
  gap: 8px;
}
.bet-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  color: #f0f0f0;
  outline: none;
}
.bet-input:focus { border-color: rgba(39, 174, 96, 0.4); }
.bet-submit {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
}
.bet-submit:hover { opacity: 0.9; }
.bet-submit:disabled { opacity: 0.4; cursor: not-allowed; }

.quick-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.quick-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #bdc3c7;
  border-radius: 8px;
  padding: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.quick-btn:hover { background: rgba(255, 255, 255, 0.1); color: #f0f0f0; }

.back-btn {
  position: relative;
  z-index: 2;
  display: block;
  text-align: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #95a5a6;
  padding: 10px;
  border-radius: 10px;
  font-size: 13px;
  text-decoration: none;
  transition: all 0.2s;
}
.back-btn:hover { background: rgba(255, 255, 255, 0.08); color: #bdc3c7; }
</style>