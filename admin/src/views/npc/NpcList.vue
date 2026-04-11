<template>
  <div class="page-container">
    <PageHeader title="NPC管理" desc="管理游戏中的NPC角色" />
    <ProTable
      ref="tableRef"
      :columns="columns"
      :fetch-data="getNpcList"
      :on-submit="handleSubmit"
      :row-actions="rowActions"
      :form-rules="formRules"
      title="NPC"
    >
      <template #toolbar-left>
        <el-select v-model="filterPlace" placeholder="按场景筛选" clearable filterable style="width:180px" @change="handlePlaceFilter">
          <el-option v-for="p in placeOptions" :key="p.value" :label="p.label" :value="p.value" />
        </el-select>
      </template>
    </ProTable>

    <!-- 对话编辑抽屉 -->
    <el-drawer
      v-model="dialogDrawerVisible"
      :title="currentNpc ? `${currentNpc.avatar} ${currentNpc.name} - 对话编辑` : '对话编辑'"
      size="800px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div v-if="dialogDrawerVisible && currentNpc" class="dialog-editor">
        <div class="npc-info-bar">
          <span class="npc-info-item">📍 {{ currentNpc.place_name || '-' }}</span>
          <span class="npc-info-item">🏙️ {{ currentNpc.city_name || '-' }}</span>
        </div>

        <el-tabs v-model="dialogActiveTab" @tab-change="loadDialogs">
          <el-tab-pane v-for="tab in dialogTabs" :key="tab.key" :label="tab.label" :name="tab.key">
            <div class="dialog-list">
              <el-card v-for="dlg in currentDialogs" :key="dlg.id" class="dialog-card" shadow="hover">
                <div class="dialog-card-header">
                  <span class="dialog-order">#{{ dlg.sort_order || 0 }}</span>
                  <div class="dialog-actions">
                    <el-button type="primary" link size="small" :icon="Check" @click="saveDialog(dlg)">保存</el-button>
                    <el-button type="danger" link size="small" :icon="Delete" @click="removeDialog(dlg)">删除</el-button>
                  </div>
                </div>
                <el-input
                  v-model="dlg.content"
                  type="textarea"
                  :rows="2"
                  placeholder="对话内容"
                />
                <div class="dialog-meta">
                  <el-input-number v-model="dlg.sort_order" size="small" :min="0" :max="999" placeholder="排序" />
                </div>
              </el-card>
              <el-empty v-if="currentDialogs.length === 0" description="暂无对话" />
            </div>
          </el-tab-pane>
        </el-tabs>

        <div class="dialog-footer">
          <el-button type="primary" :icon="Plus" @click="addDialog">添加对话</el-button>
          <el-button @click="dialogDrawerVisible = false">关闭</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Check, Delete } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import ProTable from '@/components/ProTable.vue'
import { getNpcList, createNpc, updateNpc, deleteNpc, getNpcDialogs, createNpcDialog, updateNpcDialog, deleteNpcDialog } from '@/api/npcs'
import { getPlaceList } from '@/api/places'

const tableRef = ref()
const filterPlace = ref('')
const placeOptions = ref([])

// 对话编辑
const dialogDrawerVisible = ref(false)
const currentNpc = ref(null)
const dialogActiveTab = ref('idle')
const currentDialogs = ref([])

const dialogTabs = [
  { key: 'idle', label: '闲置对话' },
  { key: 'quest_available', label: '可接任务' },
  { key: 'quest_active', label: '任务进行中' },
  { key: 'quest_ready', label: '任务完成' },
  { key: 'all_done', label: '全部完成' }
]

const columns = [
  { prop: 'id', label: 'ID', width: 60 },
  { prop: 'name', label: 'NPC名称', minWidth: 120, searchable: true, formType: 'input', required: true },
  { prop: 'place_id', label: '所属场景', width: 100, formType: 'select', options: placeOptions, filterable: true },
  { prop: 'place_name', label: '场景', width: 120 },
  { prop: 'city_name', label: '城市', width: 100 },
  { prop: 'avatar', label: '头像', width: 80, enumGroup: 'npc_avatar', formType: 'enum-select' },
  { prop: 'type', label: '类型', width: 80, enumGroup: 'npc_type', formType: 'enum-select' },
  { prop: 'dialog', label: '对话', minWidth: 150, formType: 'textarea' }
]

const formRules = {
  name: [{ required: true, message: '请输入NPC名称', trigger: 'blur' }]
}

const rowActions = [
  { label: '编辑', type: 'primary', icon: 'Edit', handler: (row) => tableRef.value.openDrawer(row) },
  {
    label: '对话', type: 'primary', icon: 'ChatLineSquare',
    handler: (row) => openDialogEditor(row)
  },
  {
    label: '删除', type: 'danger', icon: 'Delete',
    confirm: '确定要删除该NPC吗？相关对话和商店数据也会被删除。',
    handler: async (row) => {
      await deleteNpc(row.id)
      ElMessage.success('删除成功')
      tableRef.value.getList()
    }
  }
]

function handlePlaceFilter() {
  tableRef.value.searchParams.placeId = filterPlace.value
  tableRef.value.handleSearch()
}

async function handleSubmit({ isEdit, id, formData }) {
  if (isEdit) {
    await updateNpc(id, formData)
  } else {
    await createNpc(formData)
  }
}

// 对话编辑功能
async function openDialogEditor(row) {
  currentNpc.value = row
  dialogActiveTab.value = 'idle'
  dialogDrawerVisible.value = true
  await loadDialogs()
}

async function loadDialogs() {
  if (!currentNpc.value) return
  try {
    const res = await getNpcDialogs(currentNpc.value.id)
    const all = res.data || []
    currentDialogs.value = all.filter(d => d.trigger_type === dialogActiveTab.value)
  } catch (e) {
    currentDialogs.value = []
  }
}

async function addDialog() {
  if (!currentNpc.value) return
  try {
    await createNpcDialog(currentNpc.value.id, {
      trigger_type: dialogActiveTab.value,
      content: '',
      sort_order: currentDialogs.value.length
    })
    ElMessage.success('已添加对话')
    await loadDialogs()
  } catch (e) {}
}

async function saveDialog(dlg) {
  try {
    await updateNpcDialog(dlg.id, {
      content: dlg.content,
      sort_order: dlg.sort_order,
      trigger_type: dlg.trigger_type
    })
    ElMessage.success('对话已保存')
  } catch (e) {}
}

async function removeDialog(dlg) {
  try {
    await ElMessageBox.confirm('确定删除该对话？', '提示', { type: 'warning' })
    await deleteNpcDialog(dlg.id)
    ElMessage.success('已删除')
    await loadDialogs()
  } catch (e) {}
}

onMounted(async () => {
  try {
    const res = await getPlaceList({ pageSize: 500 })
    placeOptions.value = (res.data.list || []).map(p => ({ label: p.name, value: p.id }))
  } catch (e) {}
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.dialog-editor {
  padding: 0 20px 20px;
}

.npc-info-bar {
  display: flex;
  gap: 16px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: $bg-input;
  border-radius: $radius-md;
  border: 1px solid $border-color;
  .npc-info-item {
    color: $text-regular;
    font-size: 14px;
  }
}

.dialog-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 120px;
}

.dialog-card {
  :deep(.el-card__body) {
    padding: 12px 16px;
  }
  background: $bg-input;
  border-color: $border-color;
}

.dialog-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  .dialog-order {
    color: $color-primary;
    font-weight: 600;
    font-size: 13px;
  }
  .dialog-actions {
    display: flex;
    gap: 4px;
  }
}

.dialog-meta {
  margin-top: 8px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 20px;
  border-top: 1px solid $border-color;
  margin-top: 16px;
}
</style>
