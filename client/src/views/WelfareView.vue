<template>
  <div class="page">
    <div class="location-bar">
      <div class="location-name">🎁 福利中心</div>
    </div>

    <div v-if="loading" class="card" style="text-align:center;color:#888;padding:20px;">加载中...</div>
    <div v-else>

      <!-- 注册礼包 -->
      <div class="card" style="border-color:#c9a84c;margin-bottom:12px;">
        <div class="card-title">🎁 注册礼包</div>
        <div style="font-size:13px;color:#ddd;margin-bottom:12px;">
          5000铜币 + 铁剑×1 + 小HP药×3 + 港口地图×1
        </div>
        <button
          v-if="!status.starter_claimed"
          @click="claimStarter"
          class="btn btn-primary btn-block"
          :disabled="claiming"
        >{{ claiming ? '领取中...' : '立即领取' }}</button>
        <div v-else style="text-align:center;color:#4fc3f7;padding:8px;">✅ 已领取</div>
      </div>

      <!-- 7日登录 -->
      <div class="card" style="margin-bottom:12px;">
        <div class="card-title">📅 7日登录礼包 · 连续 {{ status.login_days || 1 }} 天</div>
        <div class="sign-week" style="display:flex;gap:6px;justify-content:space-between;margin:12px 0;">
          <div
            v-for="d in 7"
            :key="d"
            :class="['sign-day', {
              'signed': status.login_map && status.login_map[d],
              'today': d === (status.login_days || 1) && !status.login_map?.[d],
              'claimable': d === (status.login_days || 1) && !status.login_map?.[d],
              'future': d > (status.login_days || 1)
            }]"
            style="flex:1;text-align:center;padding:8px 2px;border-radius:6px;background:#1a1a2e;border:1px solid #333;font-size:11px;"
          >
            <div style="color:#888;font-size:10px;">第{{ d }}天</div>
            <div style="font-size:12px;margin:3px 0;">
              <template v-if="d === 1">💰500</template>
              <template v-else-if="d === 2">💰1000</template>
              <template v-else-if="d === 3">💰1500</template>
              <template v-else-if="d === 4">💰2000</template>
              <template v-else-if="d === 5">💰3000</template>
              <template v-else-if="d === 6">💰5000</template>
              <template v-else>💰10000</template>
            </div>
            <div style="font-size:10px;color:#666;">
              <template v-if="status.login_map && status.login_map[d]">✅</template>
              <template v-else-if="d === (status.login_days || 1)">可领</template>
              <template v-else-if="d > (status.login_days || 1)">🔒</template>
              <template v-else>-</template>
            </div>
          </div>
        </div>
        <button
          v-if="status.login_map && !status.login_map[status.login_days || 1]"
          @click="claimLogin"
          class="btn btn-primary btn-block"
          :disabled="claiming"
        >{{ claiming ? '领取中...' : `领取第${status.login_days || 1}日奖励` }}</button>
        <div v-else-if="(status.login_days || 1) > 7" style="text-align:center;color:#4fc3f7;padding:8px;">🎉 7日奖励已全部领取完毕！</div>
        <div v-else style="text-align:center;color:#888;padding:8px;">明日再来领取第{{ (status.login_days || 1) + 1 }}天奖励</div>
      </div>

      <!-- 成长里程碑 -->
      <div class="card">
        <div class="card-title">🏆 成长里程碑</div>
        <div style="margin-top:12px;">
          <div
            v-for="m in milestones"
            :key="m.id"
            :class="['milestone-item', { claimed: m.claimed, can_claim: m.can_claim }]"
            style="padding:12px;border-radius:8px;background:#1a1a2e;border:1px solid #333;margin-bottom:8px;"
          >
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:14px;color:#ddd;">Lv.{{ m.level }} 里程碑</div>
                <div style="font-size:12px;color:#888;margin-top:4px;">
                  {{ milestoneRewards[m.id].desc }}
                </div>
              </div>
              <button
                v-if="m.can_claim"
                @click="claimMilestone(m.id)"
                class="btn btn-primary"
                style="padding:6px 16px;"
                :disabled="claiming"
              >领取</button>
              <span v-else-if="m.claimed" style="color:#4fc3f7;font-size:13px;">✅</span>
              <span v-else style="color:#555;font-size:12px;">升到Lv.{{ m.level }}领取</span>
            </div>
          </div>
        </div>
      </div>

      <button @click="$router.back()" class="btn btn-secondary btn-block mt-10">返回</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Api } from '../composables/useApi';

const loading = ref(true);
const claiming = ref(false);
const status = ref({});
const milestones = ref([]);

const milestoneRewards = {
  lv10: { desc: '铜币2000 + 经验500 + 长剑×1 + 中HP药×5' },
  lv20: { desc: '铜币5000 + 经验1500 + 钢剑×1 + 中HP药×10' },
  lv30: { desc: '铜币10000 + 经验3000 + 锋剑×1 + 大HP药×5' },
  lv40: { desc: '铜币20000 + 经验5000 + 港口地图×1 + 船舶修复包×2' },
  lv50: { desc: '铜币30000 + 经验8000' }
};

async function load() {
  try {
    const d = await Api.get('/welfare/status');
    status.value = d;
    milestones.value = d.milestones || [];
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function claimStarter() {
  claiming.value = true;
  try {
    const d = await Api.post('/welfare/claim-starter');
    alert(d.msg);
    await load();
  } catch (e) {
    alert(e.message);
  } finally {
    claiming.value = false;
  }
}

async function claimLogin() {
  claiming.value = true;
  try {
    const d = await Api.post('/welfare/claim-login');
    alert(d.msg);
    await load();
  } catch (e) {
    alert(e.message);
  } finally {
    claiming.value = false;
  }
}

async function claimMilestone(id) {
  claiming.value = true;
  try {
    const d = await Api.post('/welfare/claim-milestone', { milestone_id: id });
    alert(d.msg);
    await load();
  } catch (e) {
    alert(e.message);
  } finally {
    claiming.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.milestone-item.can_claim {
  border-color: #c9a84c !important;
  background: #1f1a0e !important;
}
.milestone-item.claimed {
  opacity: 0.6;
}
</style>