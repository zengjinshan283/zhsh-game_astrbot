<template>
  <div class="page-container">
    <PageHeader title="操作日志" desc="管理员操作记录" />
    <ProTable
      ref="tableRef"
      :columns="columns"
      :fetch-data="getLogs"
      :show-add="false"
    >
      <template #toolbar-left>
        <el-select
          v-model="filterAdmin"
          placeholder="全部管理员"
          filterable
          clearable
          style="width:150px"
          @change="handleAdminFilter"
        >
          <el-option v-for="a in adminList" :key="a.id" :label="a.nickname || a.username" :value="a.id" />
        </el-select>
        <el-input
          v-model="filterAction"
          placeholder="搜索操作类型"
          clearable
          style="width:150px"
          @keyup.enter="handleActionFilter"
        />
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import ProTable from '@/components/ProTable.vue'
import { getLogs } from '@/api/logs'
import { getAdminList } from '@/api/logs'

const tableRef = ref()
const filterAction = ref('')
const filterAdmin = ref(null)
const dateRange = ref(null)
const adminList = ref([])

const actionTagMap = {
  create: { label: '新增', type: 'success' },
  update: { label: '修改', type: '' },
  delete: { label: '删除', type: 'danger' },
  ban: { label: '封禁', type: 'warning' },
  kick: { label: '踢出', type: 'warning' },
  unban: { label: '解封', type: 'info' }
}

const columns = [
  { prop: 'id', label: 'ID', width: 60 },
  { prop: 'username', label: '管理员', width: 100 },
  {
    prop: 'action', label: '操作', width: 90,
    formatter: (row) => {
      const map = actionTagMap[row.action]
      return map ? map.label : row.action
    }
  },
  { prop: 'module', label: '模块', width: 90 },
  { prop: 'detail', label: '详情', minWidth: 200, showOverflowTooltip: true },
  { prop: 'ip', label: 'IP', width: 130 },
  { prop: 'created_at', label: '时间', width: 160 }
]

function handleActionFilter() {
  tableRef.value.searchParams.action = filterAction.value
  tableRef.value.handleSearch()
}

function handleAdminFilter() {
  tableRef.value.searchParams.adminId = filterAdmin.value || ''
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

onMounted(async () => {
  try {
    const res = await getAdminList()
    adminList.value = res.data || []
  } catch (e) {}
})
</script>
