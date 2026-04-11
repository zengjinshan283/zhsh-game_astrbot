<template>
  <div class="page-container">
    <PageHeader title="船舶管理" desc="管理游戏中的船舶" />
    <ProTable
      ref="tableRef"
      :columns="columns"
      :fetch-data="getShipList"
      :on-submit="handleSubmit"
      :row-actions="rowActions"
      :form-rules="formRules"
      title="船舶"
    />

    <!-- 查看拥有玩家 -->
    <el-dialog v-model="ownersDialogVisible" :title="`拥有 [${ownersShipName}] 的玩家`" width="600px" destroy-on-close>
      <el-table :data="ownersList" size="small" stripe border v-loading="ownersLoading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="username" label="玩家名" min-width="120" />
        <el-table-column prop="level" label="等级" width="70" align="center" />
        <el-table-column prop="lastdate" label="最后登录" width="160">
          <template #default="{ row }">{{ formatTime(row.lastdate) }}</template>
        </el-table-column>
      </el-table>
      <div v-if="ownersList.length === 0 && !ownersLoading" class="empty-tip">暂无玩家拥有该船舶</div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import ProTable from '@/components/ProTable.vue'
import { getShipList, createShip, updateShip, deleteShip, getShipOwners } from '@/api/ships'

const tableRef = ref()

// Owners dialog
const ownersDialogVisible = ref(false)
const ownersShipName = ref('')
const ownersList = ref([])
const ownersLoading = ref(false)

const columns = [
  { prop: 'id', label: 'ID', width: 60 },
  { prop: 'name', label: '船舶名称', minWidth: 140, searchable: true, formType: 'input', required: true },
  { prop: 'speed', label: '速度', width: 120, formType: 'number', min: 1, max: 5,
    formatter: (row) => renderSpeed(row.speed)
  },
  { prop: 'capacity', label: '容量', width: 120, formType: 'number',
    formatter: (row) => `${row.capacity || 0} / 100`
  },
  { prop: 'price', label: '价格', width: 110, formType: 'number',
    formatter: (row) => formatPrice(row.price)
  },
  { prop: 'desc', label: '描述', minWidth: 150, formType: 'textarea' }
]

const formRules = {
  name: [{ required: true, message: '请输入船舶名称', trigger: 'blur' }],
  speed: [
    { required: true, message: '请输入速度', trigger: 'blur' },
    { type: 'number', min: 1, max: 5, message: '速度范围为 1-5', trigger: 'blur', transform: (v) => Number(v) }
  ]
}

const rowActions = [
  {
    label: '拥有者', type: 'info', icon: 'User',
    handler: async (row) => {
      ownersShipName.value = row.name
      ownersDialogVisible.value = true
      ownersLoading.value = true
      try {
        const res = await getShipOwners(row.id)
        ownersList.value = res.data || []
      } catch (e) {
        ownersList.value = []
      } finally {
        ownersLoading.value = false
      }
    }
  },
  { label: '编辑', type: 'primary', icon: 'Edit', handler: (row) => tableRef.value.openDrawer(row) },
  {
    label: '删除', type: 'danger', icon: 'Delete',
    confirm: '确定要删除该船舶吗？',
    handler: async (row) => {
      await deleteShip(row.id)
      ElMessage.success('删除成功')
      tableRef.value.getList()
    }
  }
]

function renderSpeed(speed) {
  const s = Math.min(5, Math.max(1, speed || 1))
  const filled = '★'.repeat(s)
  const empty = '☆'.repeat(5 - s)
  return `${filled}${empty} (${s}/5)`
}

function formatPrice(price) {
  if (!price && price !== 0) return '-'
  return `${Number(price).toLocaleString()} 铜币`
}

function formatTime(timestamp) {
  if (!timestamp) return '-'
  const d = new Date(Number(timestamp) * 1000)
  if (isNaN(d.getTime())) return timestamp
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function handleSubmit({ isEdit, id, formData }) {
  if (isEdit) {
    await updateShip(id, formData)
  } else {
    await createShip(formData)
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: $text-secondary;
}
</style>
