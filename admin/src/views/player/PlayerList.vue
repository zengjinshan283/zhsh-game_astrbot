<template>
  <div class="page-container">
    <PageHeader title="玩家管理" desc="管理游戏中的玩家" />
    <ProTable
      ref="tableRef"
      :columns="columns"
      :fetch-data="getPlayerList"
      :row-actions="rowActions"
      title="玩家"
    >
      <template #toolbar-left>
        <el-switch
          v-model="onlineOnly"
          active-text="仅在线"
          inactive-text="全部"
          style="margin-right: 8px"
          @change="handleOnlineFilter"
        />
        <div class="range-search">
          <span class="range-label">等级:</span>
          <el-input-number v-model="levelMin" :min="0" size="small" controls-position="right" style="width:90px" placeholder="最小" />
          <span class="range-sep">~</span>
          <el-input-number v-model="levelMax" :min="0" size="small" controls-position="right" style="width:90px" placeholder="最大" />
        </div>
        <div class="range-search">
          <span class="range-label">铜币:</span>
          <el-input-number v-model="moneyMin" :min="0" size="small" controls-position="right" style="width:110px" placeholder="最小" />
          <span class="range-sep">~</span>
          <el-input-number v-model="moneyMax" :min="0" size="small" controls-position="right" style="width:110px" placeholder="最大" />
        </div>
        <el-button type="primary" size="small" @click="handleRangeSearch">搜索</el-button>
      </template>
      <template #online="{ row }">
        <el-tag :type="isOnline(row) ? 'success' : 'info'" size="small" effect="dark">
          {{ isOnline(row) ? '在线' : '离线' }}
        </el-tag>
      </template>
    </ProTable>

    <!-- 发送系统消息 Dialog -->
    <el-dialog v-model="msgDialogVisible" title="发送系统消息" width="480px" destroy-on-close>
      <div class="msg-dialog-body">
        <div class="msg-target">目标玩家: <b>{{ msgTarget?.username }}</b> (ID: {{ msgTarget?.id }})</div>
        <el-input
          v-model="msgContent"
          type="textarea"
          :rows="4"
          placeholder="请输入系统消息内容"
          maxlength="500"
          show-word-limit
        />
      </div>
      <template #footer>
        <el-button @click="msgDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="msgSending" @click="handleSendMessage">发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import ProTable from '@/components/ProTable.vue'
import { getPlayerList, banPlayer, unbanPlayer, kickPlayer, sendPlayerMessage } from '@/api/players'

const router = useRouter()
const tableRef = ref()
const onlineOnly = ref(false)
const levelMin = ref(null)
const levelMax = ref(null)
const moneyMin = ref(null)
const moneyMax = ref(null)

// Message dialog
const msgDialogVisible = ref(false)
const msgTarget = ref(null)
const msgContent = ref('')
const msgSending = ref(false)

const isBanned = (row) => row.sid && String(row.sid).startsWith('banned_')
const isOnline = (row) => {
  if (!row.lastdate) return false
  return (Date.now() / 1000 - row.lastdate) < 900
}

const columns = [
  { prop: 'id', label: 'ID', width: 60 },
  { prop: 'username', label: '用户名', minWidth: 120, searchable: true },
  { prop: 'sex', label: '性别', width: 60, enumGroup: 'user_sex' },
  { prop: 'level', label: '等级', width: 70 },
  { prop: 'money', label: '铜币', width: 100, align: 'right' },
  { prop: 'gold', label: '金币', width: 80, align: 'right' },
  { prop: 'place_name', label: '所在场景', width: 110 },
  { prop: 'online', label: '状态', width: 70, slot: 'online' },
  { prop: 'regdate', label: '注册时间', width: 140, formatter: (row) => formatTime(row.regdate) },
  { prop: 'lastdate', label: '最后登录', width: 140, formatter: (row) => formatTime(row.lastdate) }
]

const rowActions = [
  { label: '详情', type: 'primary', icon: 'View', handler: (row) => router.push(`/players/${row.id}`) },
  {
    label: '消息', type: 'warning', icon: 'ChatDotRound',
    handler: (row) => openMsgDialog(row)
  },
  {
    label: '封禁', type: 'danger', icon: 'Lock',
    show: (row) => !isBanned(row),
    confirm: (row) => `确定要封禁玩家 ${row.username} 吗？`,
    handler: async (row) => {
      await banPlayer(row.id)
      ElMessage.success('已封禁')
      tableRef.value.getList()
    }
  },
  {
    label: '解封', type: 'success', icon: 'Unlock',
    show: (row) => isBanned(row),
    handler: async (row) => {
      await unbanPlayer(row.id)
      ElMessage.success('已解封')
      tableRef.value.getList()
    }
  },
  {
    label: '踢下线', type: 'warning', icon: 'SwitchButton',
    confirm: (row) => `确定要将 ${row.username} 踢下线吗？`,
    handler: async (row) => {
      await kickPlayer(row.id)
      ElMessage.success('已踢下线')
      tableRef.value.getList()
    }
  }
]

function formatTime(timestamp) {
  if (!timestamp) return '-'
  const d = new Date(Number(timestamp) * 1000)
  if (isNaN(d.getTime())) return timestamp
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function handleOnlineFilter() {
  tableRef.value.searchParams.online = onlineOnly.value ? '1' : ''
  tableRef.value.handleSearch()
}

function handleRangeSearch() {
  tableRef.value.searchParams.levelMin = levelMin.value ?? ''
  tableRef.value.searchParams.levelMax = levelMax.value ?? ''
  tableRef.value.searchParams.moneyMin = moneyMin.value ?? ''
  tableRef.value.searchParams.moneyMax = moneyMax.value ?? ''
  tableRef.value.handleSearch()
}

function openMsgDialog(row) {
  msgTarget.value = row
  msgContent.value = ''
  msgDialogVisible.value = true
}

async function handleSendMessage() {
  if (!msgContent.value.trim()) {
    ElMessage.warning('消息内容不能为空')
    return
  }
  msgSending.value = true
  try {
    await sendPlayerMessage(msgTarget.value.id, msgContent.value)
    ElMessage.success('消息发送成功')
    msgDialogVisible.value = false
  } catch (e) {} finally {
    msgSending.value = false
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.range-search {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 8px;
  .range-label {
    font-size: 12px;
    color: $text-secondary;
  }
  .range-sep {
    color: $text-secondary;
    font-size: 13px;
  }
}

.msg-dialog-body {
  .msg-target {
    margin-bottom: 16px;
    font-size: 14px;
    color: $text-regular;
    b {
      color: $color-primary;
    }
  }
}
</style>
