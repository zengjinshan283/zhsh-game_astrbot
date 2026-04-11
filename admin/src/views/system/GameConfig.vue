<template>
  <div class="page-container">
    <PageHeader title="游戏配置" desc="管理游戏参数配置" />

    <div class="config-container">
      <el-tabs v-model="activeTab" type="border-card" @tab-change="handleTabChange">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="战斗 (combat)" name="combat" />
        <el-tab-pane label="经济 (economy)" name="economy" />
        <el-tab-pane label="聊天 (chat)" name="chat" />
        <el-tab-pane label="系统 (system)" name="system" />
      </el-tabs>

      <div class="config-list">
        <el-table :data="filteredConfigs" stripe border v-loading="loading">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="category" label="分类" width="120">
            <template #default="{ row }">
              <el-tag size="small" effect="dark">{{ row.category }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="config_key" label="配置键" width="180" />
          <el-table-column label="配置值" min-width="250">
            <template #default="{ row }">
              <div class="config-value-cell">
                <!-- string -->
                <el-input v-if="editingId === row.id && row.value_type === 'string'" v-model="editValue" size="small" />
                <!-- number -->
                <el-input-number v-else-if="editingId === row.id && row.value_type === 'number'" v-model="editValueNum" size="small" style="width:160px" />
                <!-- boolean -->
                <el-switch v-else-if="editingId === row.id && row.value_type === 'boolean'" v-model="editValueBool" />
                <!-- json -->
                <el-input v-else-if="editingId === row.id && row.value_type === 'json'" v-model="editValue" type="textarea" :rows="3" size="small" />
                <!-- display -->
                <span v-else class="config-value-text">
                  <el-tag v-if="row.value_type === 'boolean'" :type="row.config_value === 'true' ? 'success' : 'danger'" size="small">
                    {{ row.config_value === 'true' ? '是' : '否' }}
                  </el-tag>
                  <el-tag v-else-if="row.value_type === 'number'" type="info" size="small">{{ row.config_value }}</el-tag>
                  <el-tag v-else-if="row.value_type === 'json'" type="warning" size="small">JSON</el-tag>
                  <span v-else>{{ row.config_value }}</span>
                </span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="value_type" label="值类型" width="80">
            <template #default="{ row }">
              <el-tag :type="valueTypeColor(row.value_type)" size="small">{{ row.value_type }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
          <el-table-column label="操作" width="160" align="center" fixed="right">
            <template #default="{ row }">
              <template v-if="editingId === row.id">
                <el-button type="success" link size="small" @click="handleSaveEdit(row)">保存</el-button>
                <el-button link size="small" @click="cancelEdit">取消</el-button>
              </template>
              <template v-else>
                <el-button type="primary" link size="small" @click="startEdit(row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 新增配置 -->
      <div class="config-add-section">
        <el-divider content-position="left">新增配置</el-divider>
        <el-form ref="addFormRef" :model="addForm" :rules="addRules" :inline="true" label-width="80px" size="default">
          <el-form-item label="分类" prop="category">
            <el-select v-model="addForm.category" placeholder="分类" filterable allow-create style="width:130px">
              <el-option v-for="cat in categoryOptions" :key="cat" :label="cat" :value="cat" />
            </el-select>
          </el-form-item>
          <el-form-item label="配置键" prop="config_key">
            <el-input v-model="addForm.config_key" placeholder="如: drop_rate" style="width:150px" />
          </el-form-item>
          <el-form-item label="配置值" prop="config_value">
            <el-input v-model="addForm.config_value" placeholder="值" style="width:150px" />
          </el-form-item>
          <el-form-item label="值类型" prop="value_type">
            <el-select v-model="addForm.value_type" placeholder="类型" style="width:100px">
              <el-option label="字符串" value="string" />
              <el-option label="数字" value="number" />
              <el-option label="布尔" value="boolean" />
              <el-option label="JSON" value="json" />
            </el-select>
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="addForm.description" placeholder="描述" style="width:180px" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="addLoading" @click="handleAdd">新增</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import { getConfigList, createConfig, updateConfig, deleteConfig } from '@/api/configs'

const activeTab = ref('all')
const loading = ref(false)
const addLoading = ref(false)
const configList = ref([])
const categoryOptions = ref([])
const addFormRef = ref()

// Editing state
const editingId = ref(null)
const editValue = ref('')
const editValueNum = ref(0)
const editValueBool = ref(false)
const editOrigRow = ref(null)

const addForm = reactive({
  category: 'system',
  config_key: '',
  config_value: '',
  value_type: 'string',
  description: ''
})

const addRules = {
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  config_key: [{ required: true, message: '请输入配置键', trigger: 'blur' }],
  value_type: [{ required: true, message: '请选择类型', trigger: 'change' }]
}

const filteredConfigs = computed(() => {
  if (activeTab.value === 'all') return configList.value
  return configList.value.filter(c => c.category === activeTab.value)
})

function valueTypeColor(type) {
  const map = { string: '', number: 'info', boolean: 'success', json: 'warning' }
  return map[type] || ''
}

function handleTabChange() {
  cancelEdit()
}

async function loadConfigs() {
  loading.value = true
  try {
    const res = await getConfigList({ pageSize: 500 })
    configList.value = res.data.list || []
    categoryOptions.value = [...new Set((res.data.list || []).map(c => c.category).filter(Boolean))]
  } catch (e) {} finally {
    loading.value = false
  }
}

function startEdit(row) {
  editingId.value = row.id
  editOrigRow.value = row
  if (row.value_type === 'number') {
    editValueNum.value = Number(row.config_value) || 0
  } else if (row.value_type === 'boolean') {
    editValueBool.value = row.config_value === 'true'
  } else {
    editValue.value = row.config_value || ''
  }
}

function cancelEdit() {
  editingId.value = null
  editOrigRow.value = null
}

async function handleSaveEdit(row) {
  let newVal = ''
  if (row.value_type === 'number') {
    newVal = String(editValueNum.value)
    if (isNaN(Number(newVal))) {
      ElMessage.error('请输入有效数字')
      return
    }
  } else if (row.value_type === 'boolean') {
    newVal = editValueBool.value ? 'true' : 'false'
  } else if (row.value_type === 'json') {
    try {
      JSON.parse(editValue.value)
      newVal = editValue.value
    } catch (e) {
      ElMessage.error('JSON格式不正确')
      return
    }
  } else {
    newVal = editValue.value
  }

  try {
    await updateConfig(row.id, { config_value: newVal })
    ElMessage.success('保存成功')
    editingId.value = null
    loadConfigs()
  } catch (e) {}
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除配置 ${row.config_key} 吗？`, '提示', { type: 'warning' })
    await deleteConfig(row.id)
    ElMessage.success('删除成功')
    loadConfigs()
  } catch (e) {}
}

async function handleAdd() {
  const valid = await addFormRef.value.validate().catch(() => false)
  if (!valid) return
  addLoading.value = true
  try {
    await createConfig({ ...addForm })
    ElMessage.success('新增成功')
    addForm.config_key = ''
    addForm.config_value = ''
    addForm.description = ''
    loadConfigs()
  } catch (e) {} finally {
    addLoading.value = false
  }
}

onMounted(() => {
  loadConfigs()
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.config-container {
  :deep(.el-tabs--border-card) {
    background: $bg-card;
    border-color: $border-color;
    .el-tabs__header {
      background: $bg-hover;
      border-bottom-color: $border-color;
      .el-tabs__item {
        color: $text-regular;
        border-color: transparent;
        &.is-active {
          color: $color-primary;
          background: $bg-card;
          border-color: $border-color;
          border-bottom-color: $bg-card;
        }
        &:hover { color: $color-primary; }
      }
    }
    .el-tabs__content { padding: 0; }
  }
}

.config-list {
  margin-top: 16px;
}

.config-value-cell {
  .config-value-text {
    font-size: 13px;
    color: $text-regular;
  }
}

.config-add-section {
  margin-top: 20px;
  :deep(.el-divider__text) {
    background: $bg-primary;
    color: $text-secondary;
  }
}
</style>
