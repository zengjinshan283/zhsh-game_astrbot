<template>
  <div class="page-container">
    <PageHeader title="枚举管理" desc="管理游戏枚举定义">
      <template #extra>
        <el-button type="success" :icon="Upload" size="small" @click="showImportDialog">批量导入</el-button>
      </template>
    </PageHeader>

    <div v-loading="loading" class="enum-container">
      <!-- 分组折叠面板 -->
      <el-collapse v-model="activeGroups" class="enum-collapse">
        <el-collapse-item v-for="group in groupedList" :key="group.group_name" :name="group.group_name">
          <template #title>
            <div class="group-title">
              <span class="group-name">{{ group.group_name }}</span>
              <el-tag size="small" type="info" class="group-count">{{ group.items.length }} 项</el-tag>
            </div>
          </template>
          <el-table :data="group.items" size="small" stripe border class="enum-table">
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="key_value" label="键值" width="80" />
            <el-table-column prop="label" label="标签" min-width="120" />
            <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
            <el-table-column prop="sort_order" label="排序" width="70" align="center" />
            <el-table-column label="操作" width="180" align="center">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="openEditDrawer(row)">编辑</el-button>
                <el-button type="info" link size="small" @click="moveEnum(row, 'up')" :disabled="row._index === 0">↑</el-button>
                <el-button type="info" link size="small" @click="moveEnum(row, 'down')" :disabled="row._index === group.items.length - 1">↓</el-button>
                <el-button type="danger" link size="small" @click="handleDeleteEnum(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-collapse-item>
      </el-collapse>

      <el-empty v-if="groupedList.length === 0 && !loading" description="暂无枚举数据" />
    </div>

    <!-- 新增枚举 -->
    <div class="enum-add-section">
      <el-divider content-position="left">新增枚举项</el-divider>
      <el-form ref="addFormRef" :model="addForm" :rules="addRules" :inline="true" label-width="80px" size="default">
        <el-form-item label="分组" prop="group_name">
          <el-select v-model="addForm.group_name" placeholder="选择或输入" filterable allow-create style="width:160px">
            <el-option v-for="g in allGroups" :key="g" :label="g" :value="g" />
          </el-select>
        </el-form-item>
        <el-form-item label="键值" prop="key_value">
          <el-input v-model="addForm.key_value" placeholder="如: 1" style="width:80px" />
        </el-form-item>
        <el-form-item label="标签" prop="label">
          <el-input v-model="addForm.label" placeholder="如: 武器" style="width:120px" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="addForm.description" placeholder="描述" style="width:180px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="addLoading" @click="handleAdd">新增</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 编辑抽屉 -->
    <el-drawer v-model="editVisible" title="编辑枚举" size="450px" destroy-on-close>
      <div v-if="editVisible" class="edit-drawer">
        <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="80px">
          <el-form-item label="分组" prop="group_name">
            <el-input v-model="editForm.group_name" />
          </el-form-item>
          <el-form-item label="键值" prop="key_value">
            <el-input v-model="editForm.key_value" />
          </el-form-item>
          <el-form-item label="标签" prop="label">
            <el-input v-model="editForm.label" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="editForm.description" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="editForm.sort_order" :min="0" />
          </el-form-item>
        </el-form>
        <div class="drawer-footer">
          <el-button @click="editVisible = false">取消</el-button>
          <el-button type="primary" :loading="saveLoading" @click="handleSaveEdit">保存</el-button>
        </div>
      </div>
    </el-drawer>

    <!-- 批量导入 -->
    <el-dialog v-model="importDialogVisible" title="批量导入枚举" width="650px" destroy-on-close>
      <div class="import-body">
        <p class="import-tip">JSON格式，每个对象包含 group_name, key_value, label, description, sort_order 字段</p>
        <el-input v-model="importJson" type="textarea" :rows="12" placeholder='[
  {"group_name": "item_type", "key_value": "10", "label": "新类型", "description": "说明", "sort_order": 10}
]' />
      </div>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="importLoading" @click="handleImport">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import { getEnumList, createEnum, updateEnum, deleteEnum } from '@/api/enums'

const loading = ref(false)
const addLoading = ref(false)
const saveLoading = ref(false)
const enumList = ref([])
const activeGroups = ref([])
const addFormRef = ref()

const addForm = reactive({
  group_name: '',
  key_value: '',
  label: '',
  description: '',
  sort_order: 0
})
const addRules = {
  group_name: [{ required: true, message: '请输入分组', trigger: 'blur' }],
  key_value: [{ required: true, message: '请输入键值', trigger: 'blur' }],
  label: [{ required: true, message: '请输入标签', trigger: 'blur' }]
}

// Edit drawer
const editVisible = ref(false)
const editFormRef = ref()
const editForm = reactive({ id: null, group_name: '', key_value: '', label: '', description: '', sort_order: 0 })
const editRules = {
  group_name: [{ required: true, message: '请输入分组', trigger: 'blur' }],
  key_value: [{ required: true, message: '请输入键值', trigger: 'blur' }],
  label: [{ required: true, message: '请输入标签', trigger: 'blur' }]
}

// Import
const importDialogVisible = ref(false)
const importJson = ref('')
const importLoading = ref(false)

const allGroups = computed(() => {
  return [...new Set(enumList.value.map(e => e.group_name))].sort()
})

const groupedList = computed(() => {
  const map = new Map()
  enumList.value.forEach((item, idx) => {
    item._index = idx
    const g = item.group_name
    if (!map.has(g)) map.set(g, { group_name: g, items: [] })
    map.get(g).items.push(item)
  })
  return [...map.values()].sort((a, b) => a.group_name.localeCompare(b.group_name))
})

async function loadEnums() {
  loading.value = true
  try {
    const res = await getEnumList({ pageSize: 500 })
    enumList.value = res.data.list || []
    activeGroups.value = allGroups.value.slice(0, 5)
  } catch (e) {} finally {
    loading.value = false
  }
}

function openEditDrawer(row) {
  editForm.id = row.id
  editForm.group_name = row.group_name
  editForm.key_value = row.key_value
  editForm.label = row.label
  editForm.description = row.description || ''
  editForm.sort_order = row.sort_order || 0
  editVisible.value = true
}

async function handleSaveEdit() {
  const valid = await editFormRef.value.validate().catch(() => false)
  if (!valid) return
  saveLoading.value = true
  try {
    await updateEnum(editForm.id, { ...editForm })
    ElMessage.success('保存成功')
    editVisible.value = false
    loadEnums()
  } catch (e) {} finally {
    saveLoading.value = false
  }
}

async function moveEnum(row, direction) {
  const sorted = groupedList.value.find(g => g.group_name === row.group_name)
  if (!sorted) return
  const idx = sorted.items.findIndex(i => i.id === row.id)
  if (idx < 0) return
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= sorted.items.length) return
  const swapItem = sorted.items[swapIdx]
  try {
    await updateEnum(row.id, { sort_order: swapItem.sort_order || 0 })
    await updateEnum(swapItem.id, { sort_order: row.sort_order || 0 })
    loadEnums()
  } catch (e) {}
}

async function handleDeleteEnum(row) {
  try {
    await ElMessageBox.confirm(`确定删除枚举 [${row.group_name}/${row.label}] 吗？`, '提示', { type: 'warning' })
    await deleteEnum(row.id)
    ElMessage.success('删除成功')
    loadEnums()
  } catch (e) {}
}

async function handleAdd() {
  const valid = await addFormRef.value.validate().catch(() => false)
  if (!valid) return
  addLoading.value = true
  try {
    await createEnum({ ...addForm })
    ElMessage.success('新增成功')
    addForm.key_value = ''
    addForm.label = ''
    addForm.description = ''
    loadEnums()
  } catch (e) {} finally {
    addLoading.value = false
  }
}

function showImportDialog() {
  importJson.value = ''
  importDialogVisible.value = true
}

async function handleImport() {
  if (!importJson.value.trim()) {
    ElMessage.warning('请输入JSON数据')
    return
  }
  let items = []
  try {
    items = JSON.parse(importJson.value)
    if (!Array.isArray(items)) throw new Error('必须是数组')
  } catch (e) {
    ElMessage.error('JSON格式不正确: ' + e.message)
    return
  }
  importLoading.value = true
  let success = 0
  let failed = 0
  for (const item of items) {
    try {
      await createEnum({
        group_name: item.group_name || '',
        key_value: String(item.key_value || ''),
        label: item.label || '',
        description: item.description || '',
        sort_order: item.sort_order || 0
      })
      success++
    } catch (e) {
      failed++
    }
  }
  importLoading.value = false
  ElMessage.success(`导入完成: 成功 ${success}, 失败 ${failed}`)
  importDialogVisible.value = false
  loadEnums()
}

onMounted(() => {
  loadEnums()
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.enum-container {
  margin-bottom: 16px;
}

.enum-collapse {
  :deep(.el-collapse-item__header) {
    background: $bg-card;
    color: $text-primary;
    border-bottom-color: $border-color;
    &.is-active { border-bottom-color: $border-color; }
    &:hover { background: $bg-hover; }
  }
  :deep(.el-collapse-item__wrap) {
    background: $bg-card;
    border-bottom-color: $border-color;
  }
  :deep(.el-collapse-item__content) {
    padding-bottom: 8px;
  }
}

.group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  .group-name {
    font-weight: 600;
    font-size: 14px;
    color: $color-primary;
  }
  .group-count {
    font-weight: normal;
  }
}

.enum-table {
  margin: 0 16px;
}

.enum-add-section {
  margin-top: 20px;
  :deep(.el-divider__text) {
    background: $bg-primary;
    color: $text-secondary;
  }
}

.edit-drawer {
  padding: 0 20px 20px;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid $border-color;
}

.import-body {
  .import-tip {
    font-size: 12px;
    color: $text-secondary;
    margin-bottom: 12px;
  }
}
</style>
