<template>
  <div class="page-container">
    <PageHeader title="数据日志" desc="游戏数据变更记录" />
    <ProTable
      ref="tableRef"
      :columns="columns"
      :fetch-data="getChangelogs"
      :row-actions="rowActions"
      :show-add="false"
    >
      <template #toolbar-left>
        <el-input
          v-model="filterTable"
          placeholder="搜索表名"
          clearable
          style="width:150px"
          @keyup.enter="handleTableFilter"
        />
        <el-select v-model="filterAction" placeholder="操作类型" clearable style="width:120px" @change="handleActionFilter">
          <el-option label="新增" value="create" />
          <el-option label="修改" value="update" />
          <el-option label="删除" value="delete" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width:240px"
          @change="handleDateFilter"
        />
      </template>
    </ProTable>

    <!-- 详情 Dialog -->
    <el-dialog v-model="detailDialogVisible" title="变更详情" width="80vw" top="5vh" destroy-on-close>
      <div class="diff-container">
        <div class="diff-header">
          <span class="diff-meta">
            {{ detailRow.table_name }} #{{ detailRow.row_id }}
            <el-tag :type="actionTagType(detailRow.action)" size="small" effect="dark">{{ detailRow.action }}</el-tag>
          </span>
          <span class="diff-time">{{ detailRow.created_at }}</span>
        </div>
        <div class="diff-body">
          <div class="diff-panel">
            <div class="diff-panel-title">旧数据</div>
            <div class="diff-content">
              <template v-if="diffFields.length > 0">
                <div v-for="field in diffFields" :key="field.key" class="diff-row" :class="field.changeType">
                  <span class="diff-key">{{ field.key }}:</span>
                  <span v-if="field.changeType === 'removed'" class="diff-old">{{ formatVal(field.oldVal) }}</span>
                  <span v-else-if="field.changeType === 'changed'" class="diff-old">{{ formatVal(field.oldVal) }}</span>
                  <span v-else class="diff-same">{{ formatVal(field.oldVal) }}</span>
                </div>
              </template>
              <div v-else class="diff-empty">无旧数据</div>
            </div>
          </div>
          <div class="diff-panel">
            <div class="diff-panel-title">新数据</div>
            <div class="diff-content">
              <template v-if="diffFields.length > 0">
                <div v-for="field in diffFields" :key="field.key" class="diff-row" :class="field.changeType">
                  <span class="diff-key">{{ field.key }}:</span>
                  <span v-if="field.changeType === 'added'" class="diff-new">{{ formatVal(field.newVal) }}</span>
                  <span v-else-if="field.changeType === 'changed'" class="diff-new">{{ formatVal(field.newVal) }}</span>
                  <span v-else class="diff-same">{{ formatVal(field.newVal) }}</span>
                </div>
              </template>
              <div v-else class="diff-empty">无新数据</div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import ProTable from '@/components/ProTable.vue'
import { getChangelogs } from '@/api/logs'

const tableRef = ref()
const filterTable = ref('')
const filterAction = ref('')
const dateRange = ref(null)

// Detail dialog
const detailDialogVisible = ref(false)
const detailRow = ref({})

function actionTagType(action) {
  const map = { create: 'success', update: '', delete: 'danger' }
  return map[action] || 'info'
}

function formatVal(val) {
  if (val === null || val === undefined) return '-'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

const columns = [
  { prop: 'id', label: 'ID', width: 60 },
  { prop: 'username', label: '管理员', width: 100 },
  { prop: 'table_name', label: '数据表', width: 120 },
  { prop: 'row_id', label: '记录ID', width: 80 },
  { prop: 'action', label: '操作', width: 80,
    formatter: (row) => ({ create: '新增', update: '修改', delete: '删除' }[row.action] || row.action)
  },
  { prop: 'old_value', label: '旧值', minWidth: 140, formatter: (row) => {
    try { return JSON.stringify(JSON.parse(row.old_value || '{}'), null, 2).substring(0, 100) }
    catch { return row.old_value || '-' }
  }},
  { prop: 'new_value', label: '新值', minWidth: 140, formatter: (row) => {
    try { return JSON.stringify(JSON.parse(row.new_value || '{}'), null, 2).substring(0, 100) }
    catch { return row.new_value || '-' }
  }},
  { prop: 'created_at', label: '时间', width: 160 }
]

const rowActions = [
  {
    label: '详情', type: 'primary', icon: 'View',
    handler: (row) => openDetail(row)
  }
]

const diffFields = computed(() => {
  let oldData = {}
  let newData = {}
  try { oldData = JSON.parse(detailRow.value.old_value || '{}') } catch {}
  try { newData = JSON.parse(detailRow.value.new_value || '{}') } catch {}

  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])
  const fields = []
  allKeys.forEach(key => {
    const oldVal = oldData[key] ?? null
    const newVal = newData[key] ?? null
    const oldStr = JSON.stringify(oldVal)
    const newStr = JSON.stringify(newVal)
    let changeType = 'same'
    if (oldStr === 'null' && newStr !== 'null') changeType = 'added'
    else if (oldStr !== 'null' && newStr === 'null') changeType = 'removed'
    else if (oldStr !== newStr) changeType = 'changed'
    fields.push({ key, oldVal, newVal, changeType })
  })
  return fields
})

function openDetail(row) {
  detailRow.value = row
  detailDialogVisible.value = true
}

function handleTableFilter() {
  tableRef.value.searchParams.tableName = filterTable.value
  tableRef.value.handleSearch()
}

function handleActionFilter() {
  tableRef.value.searchParams.action = filterAction.value
  tableRef.value.handleSearch()
}

function handleDateFilter(val) {
  if (val && val.length === 2) {
    tableRef.value.searchParams.startDate = val[0]
    tableRef.value.searchParams.endDate = val[1]
  } else {
    tableRef.value.searchParams.startDate = ''
    tableRef.value.searchParams.endDate = ''
  }
  tableRef.value.handleSearch()
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.diff-container {
  .diff-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    .diff-meta {
      font-size: 14px;
      color: $text-primary;
      font-weight: 600;
    }
    .diff-time {
      font-size: 12px;
      color: $text-secondary;
    }
  }
}

.diff-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.diff-panel {
  border: 1px solid $border-color;
  border-radius: $radius-md;
  overflow: hidden;
  .diff-panel-title {
    padding: 8px 12px;
    font-weight: 600;
    font-size: 13px;
    background: $bg-hover;
    color: $text-primary;
    border-bottom: 1px solid $border-color;
  }
  .diff-content {
    padding: 8px 12px;
    max-height: 500px;
    overflow-y: auto;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 12px;
  }
}

.diff-row {
  padding: 3px 0;
  display: flex;
  gap: 6px;
  .diff-key {
    color: $color-primary;
    min-width: 120px;
    flex-shrink: 0;
    word-break: break-all;
  }
  .diff-same { color: $text-secondary; word-break: break-all; }
  .diff-old { color: $color-danger; text-decoration: line-through; word-break: break-all; }
  .diff-new { color: $color-success; word-break: break-all; }
}

.diff-row.added .diff-new { font-weight: bold; }
.diff-row.removed .diff-old { font-weight: bold; }
.diff-row.changed .diff-old { opacity: 0.7; }
.diff-row.changed .diff-new { font-weight: bold; }

.diff-empty {
  color: $text-secondary;
  text-align: center;
  padding: 20px;
}
</style>
