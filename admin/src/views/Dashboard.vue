<template>
  <div class="page-container">
    <!-- 统计卡片 - 10个 -->
    <div class="stats-grid stats-grid-10">
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(79,195,247,0.15); color: #4fc3f7;">
          <el-icon :size="24"><UserFilled /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-label">总玩家数</div>
          <div class="stat-value">{{ stats.totalPlayers }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(102,187,106,0.15); color: #66bb6a;">
          <el-icon :size="24"><CircleCheck /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-label">当前在线</div>
          <div class="stat-value">{{ stats.onlinePlayers }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(255,213,79,0.15); color: #ffd54f;">
          <el-icon :size="24"><Plus /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-label">今日注册</div>
          <div class="stat-value">
            {{ stats.todayReg }}
            <span class="stat-change" :class="todayRegChange >= 0 ? 'up' : 'down'">
              {{ todayRegChange >= 0 ? '↑' : '↓' }}{{ Math.abs(todayRegChange) }}
            </span>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(239,83,80,0.15); color: #ef5350;">
          <el-icon :size="24"><Goods /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-label">总物品</div>
          <div class="stat-value">{{ stats.totalItems }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(171,71,188,0.15); color: #ab47bc;">
          <el-icon :size="24"><KnifeFork /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-label">总怪物</div>
          <div class="stat-value">{{ stats.totalMonsters }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(66,165,245,0.15); color: #42a5f5;">
          <el-icon :size="24"><User /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-label">总NPC</div>
          <div class="stat-value">{{ stats.totalNpcs }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(129,199,132,0.15); color: #81c784;">
          <el-icon :size="24"><Location /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-label">总场景</div>
          <div class="stat-value">{{ stats.totalPlaces }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(255,167,38,0.15); color: #ffa726;">
          <el-icon :size="24"><List /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-label">总任务</div>
          <div class="stat-value">{{ extraStats.totalQuests }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(77,208,225,0.15); color: #4dd0e1;">
          <el-icon :size="24"><Orange /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-label">总宠物</div>
          <div class="stat-value">{{ extraStats.totalPets }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(149,117,205,0.15); color: #9575cd;">
          <el-icon :size="24"><Ship /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-label">总船舶</div>
          <div class="stat-value">{{ extraStats.totalShips }}</div>
        </div>
      </div>
    </div>

    <div class="dashboard-row">
      <!-- 图表区 -->
      <el-card class="dashboard-card chart-card">
        <template #header>
          <el-tabs v-model="chartTab" class="chart-tabs">
            <el-tab-pane label="玩家增长" name="trend" />
            <el-tab-pane label="经济概览" name="economy" />
          </el-tabs>
        </template>
        <div ref="chartRef" style="width: 100%; height: 300px;" />
      </el-card>

      <!-- 右侧面板 -->
      <div class="right-panel">
        <!-- 最近注册玩家 -->
        <el-card class="dashboard-card">
          <template #header>
            <span class="card-title">最近注册玩家</span>
          </template>
          <el-table :data="recentPlayers" size="small" stripe style="width: 100%">
            <el-table-column prop="id" label="ID" width="50" />
            <el-table-column prop="username" label="用户名" min-width="80" />
            <el-table-column prop="sex" label="性别" width="50" align="center">
              <template #default="{ row }">
                {{ row.sex == 1 ? '男' : row.sex == 2 ? '女' : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="level" label="等级" width="50" align="center" />
            <el-table-column prop="money" label="金币" width="80" align="right" />
          </el-table>
        </el-card>

        <!-- 最近操作日志 -->
        <el-card class="dashboard-card" style="margin-top:16px">
          <template #header>
            <span class="card-title">最近操作日志</span>
          </template>
          <div class="recent-logs">
            <div v-for="log in recentLogs" :key="log.id" class="log-item">
              <div class="log-header">
                <el-tag :type="getLogActionType(log.action)" size="small" effect="dark">{{ log.action }}</el-tag>
                <span class="log-admin">{{ log.nickname || log.username }}</span>
              </div>
              <div class="log-detail">{{ log.detail || '-' }}</div>
              <div class="log-time">{{ log.created_at }}</div>
            </div>
            <div v-if="recentLogs.length === 0" class="log-empty">暂无操作日志</div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { getStats, getPlayerTrend, getRecentPlayers, getExtraStats, getRecentLogs } from '@/api/dashboard'
import * as echarts from 'echarts'

const chartRef = ref(null)
let chartInstance = null
const chartTab = ref('trend')
const trendData = ref([])

const stats = reactive({
  totalPlayers: 0, onlinePlayers: 0, todayReg: 0,
  totalItems: 0, totalMonsters: 0, totalNpcs: 0,
  totalMaps: 0, totalPlaces: 0
})
const extraStats = reactive({ totalQuests: 0, totalPets: 0, totalShips: 0, economy: { total_money: 0, total_gold: 0, total_bank: 0 }, yesterdayReg: 0 })
const recentPlayers = ref([])
const recentLogs = ref([])
const todayRegChange = ref(0)

function getLogActionType(action) {
  const map = { create: 'success', update: '', delete: 'danger', ban: 'warning', kick: 'warning', unban: 'info' }
  return map[action] || 'info'
}

function initChart() {
  if (!chartRef.value) return
  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(chartRef.value)
  if (chartTab.value === 'trend') {
    renderTrendChart()
  } else {
    renderEconomyChart()
  }
}

function renderTrendChart() {
  if (!chartInstance) return
  chartInstance.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: '#1a2d3d', borderColor: '#2a4a5e', textStyle: { color: '#e8eaed' } },
    grid: { top: 20, right: 20, bottom: 30, left: 50 },
    xAxis: { type: 'category', data: trendData.value.map(d => d.date), axisLine: { lineStyle: { color: '#2a4a5e' } }, axisLabel: { color: '#78909c' } },
    yAxis: { type: 'value', minInterval: 1, axisLine: { show: false }, splitLine: { lineStyle: { color: '#1e3a4f' } }, axisLabel: { color: '#78909c' } },
    series: [{
      name: '新增玩家', type: 'line', data: trendData.value.map(d => d.count),
      smooth: true, symbol: 'circle', symbolSize: 8,
      lineStyle: { color: '#4fc3f7', width: 3 }, itemStyle: { color: '#4fc3f7' },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(79,195,247,0.3)' }, { offset: 1, color: 'rgba(79,195,247,0.02)' }]) }
    }]
  }, true)
}

function renderEconomyChart() {
  if (!chartInstance) return
  const eco = extraStats.economy
  chartInstance.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', backgroundColor: '#1a2d3d', borderColor: '#2a4a5e', textStyle: { color: '#e8eaed' } },
    legend: { bottom: 10, textStyle: { color: '#b0bec5' } },
    series: [{
      name: '经济概览', type: 'pie', radius: ['35%', '65%'], center: ['50%', '45%'],
      data: [
        { value: eco.total_money, name: '流通铜币', itemStyle: { color: '#ffd54f' } },
        { value: eco.total_gold, name: '总金币', itemStyle: { color: '#ab47bc' } },
        { value: eco.total_bank, name: '银行存款', itemStyle: { color: '#42a5f5' } }
      ],
      label: { color: '#e8eaed', formatter: '{b}\n{d}%' },
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
    }]
  }, true)
}

watch(chartTab, () => {
  nextTick(() => initChart())
})

onMounted(async () => {
  try {
    const [statsRes, extraRes, trendRes, recentRes, logsRes] = await Promise.all([
      getStats(),
      getExtraStats().catch(() => ({ data: { totalQuests: 0, totalPets: 0, totalShips: 0, economy: { total_money: 0, total_gold: 0, total_bank: 0 }, yesterdayReg: 0 } })),
      getPlayerTrend(7),
      getRecentPlayers(),
      getRecentLogs().catch(() => ({ data: [] }))
    ])
    Object.assign(stats, statsRes.data)
    Object.assign(extraStats, extraRes.data)
    trendData.value = trendRes.data || []
    recentPlayers.value = recentRes.data || []
    recentLogs.value = logsRes.data || []

    // Calculate today reg change vs yesterday
    const yReg = extraStats.yesterdayReg || 0
    todayRegChange.value = yReg > 0 ? stats.todayReg - yReg : 0

    await nextTick()
    initChart()
  } catch (e) {}
})

onBeforeUnmount(() => {
  if (chartInstance) chartInstance.dispose()
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.stats-grid-10 {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.dashboard-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 20px;
}

.dashboard-card {
  :deep(.el-card__header) {
    border-bottom: 1px solid $border-color;
    padding: 14px 20px;
  }
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
}

.chart-card {
  min-height: 400px;
}

.chart-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }
  :deep(.el-tabs__item) {
    color: $text-secondary;
    &.is-active { color: $color-primary; }
    &:hover { color: $color-primary; }
  }
}

.stat-change {
  font-size: 12px;
  font-weight: 400;
  &.up { color: $color-success; }
  &.down { color: $color-danger; }
}

.right-panel {
  display: flex;
  flex-direction: column;
}

.recent-logs {
  max-height: 280px;
  overflow-y: auto;
}

.log-item {
  padding: 8px 0;
  border-bottom: 1px solid $border-light;
  &:last-child { border-bottom: none; }
  .log-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    .log-admin {
      font-size: 13px;
      font-weight: 600;
      color: $text-primary;
    }
  }
  .log-detail {
    font-size: 12px;
    color: $text-regular;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .log-time {
    font-size: 11px;
    color: $text-secondary;
    margin-top: 2px;
  }
}

.log-empty {
  text-align: center;
  padding: 20px;
  color: $text-secondary;
}

@media (max-width: 1400px) {
  .stats-grid-10 {
    grid-template-columns: repeat(3, 1fr);
  }
  .dashboard-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .stats-grid-10 {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
