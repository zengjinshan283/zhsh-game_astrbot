<template>
  <div class="page-container">
    <PageHeader title="宠物管理" desc="管理游戏中的宠物" />
    <ProTable
      ref="tableRef"
      :columns="columns"
      :fetch-data="getPetList"
      :on-submit="handleSubmit"
      :row-actions="rowActions"
      :form-rules="formRules"
      title="宠物"
    />

    <!-- 查看持有玩家 -->
    <el-dialog v-model="ownersDialogVisible" :title="`持有 [${ownersPetName}] 的玩家`" width="600px" destroy-on-close>
      <el-table :data="ownersList" size="small" stripe border v-loading="ownersLoading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="username" label="玩家名" min-width="120" />
        <el-table-column prop="level" label="等级" width="70" align="center" />
        <el-table-column prop="pet_level" label="宠物等级" width="90" align="center" />
        <el-table-column prop="lastdate" label="最后登录" width="160">
          <template #default="{ row }">{{ formatTime(row.lastdate) }}</template>
        </el-table-column>
      </el-table>
      <div v-if="ownersList.length === 0 && !ownersLoading" class="empty-tip">暂无玩家持有该宠物</div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import ProTable from '@/components/ProTable.vue'
import { getPetList, createPet, updatePet, deletePet, getPetOwners } from '@/api/pets'

const tableRef = ref()

// Owners dialog
const ownersDialogVisible = ref(false)
const ownersPetName = ref('')
const ownersList = ref([])
const ownersLoading = ref(false)

const columns = [
  { prop: 'id', label: 'ID', width: 60 },
  { prop: 'name', label: '宠物名称', minWidth: 120, searchable: true, formType: 'input', required: true },
  { prop: 'type', label: '类型', width: 80, enumGroup: 'pet_type', formType: 'enum-select' },
  { prop: 'atk', label: '攻击', width: 160, formType: 'number' },
  { prop: 'def_val', label: '防御', width: 160, formType: 'number' },
  { prop: 'hp', label: '生命', width: 160, formType: 'number' },
  { prop: 'capture_rate', label: '捕获率', width: 80, formType: 'number' }
]

const formRules = {
  name: [{ required: true, message: '请输入宠物名称', trigger: 'blur' }]
}

const rowActions = [
  {
    label: '持有者', type: 'info', icon: 'User',
    handler: async (row) => {
      ownersPetName.value = row.name
      ownersDialogVisible.value = true
      ownersLoading.value = true
      try {
        const res = await getPetOwners(row.id)
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
    confirm: '确定要删除该宠物吗？',
    handler: async (row) => {
      await deletePet(row.id)
      ElMessage.success('删除成功')
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

async function handleSubmit({ isEdit, id, formData }) {
  if (isEdit) {
    await updatePet(id, formData)
  } else {
    await createPet(formData)
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
