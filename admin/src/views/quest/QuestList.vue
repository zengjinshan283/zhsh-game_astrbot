<template>
  <div class="page-container">
    <PageHeader title="任务管理" desc="管理游戏中的任务" />
    <ProTable
      ref="tableRef"
      :columns="tableColumns"
      :fetch-data="getQuestList"
      :row-actions="rowActions"
      :show-add="false"
      title="任务"
    >
      <template #toolbar-left>
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增任务</el-button>
        <el-button type="success" :icon="Share" @click="openQuestChain">任务链</el-button>
      </template>
    </ProTable>

    <!-- 任务链 Dialog -->
    <el-dialog
      v-model="chainDialogVisible"
      title="任务前置关系 - 任务链可视化"
      width="90vw"
      top="3vh"
      fullscreen
      destroy-on-close
    >
      <div class="quest-chain-wrapper">
        <div class="chain-controls">
          <el-select v-model="chainNpcFilter" placeholder="全部NPC" clearable filterable style="width:200px" @change="renderChainChart">
            <el-option v-for="n in npcListForFilter" :key="n.id" :label="n.npc_name || n.name" :value="n.id" />
          </el-select>
          <el-button type="primary" size="small" :icon="Refresh" @click="renderChainChart">刷新</el-button>
        </div>
        <div ref="chainChartRef" class="chain-chart" />
      </div>
    </el-dialog>

    <!-- 自定义编辑抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="isEdit ? '编辑任务' : '新增任务'"
      size="650px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div v-if="drawerVisible" class="quest-drawer">
        <el-form ref="formRef" :model="formData" :rules="formRules" label-width="110px" label-position="right">
          <el-form-item label="任务名称" prop="name">
            <el-input v-model="formData.name" placeholder="请输入任务名称" />
          </el-form-item>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="类型">
                <el-select v-model="formData.type" placeholder="请选择类型" style="width:100%">
                  <el-option v-for="item in questTypeEnum" :key="item.key_value" :label="item.label" :value="Number(item.key_value)" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="分类">
                <el-select v-model="formData.category" placeholder="请选择分类" style="width:100%">
                  <el-option v-for="item in questCategoryEnum" :key="item.key_value" :label="item.label" :value="Number(item.key_value)" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="发布NPC">
            <el-select v-model="formData.npc_id" placeholder="搜索选择NPC" filterable clearable style="width:100%">
              <el-option v-for="n in npcList" :key="n.id" :label="n.name + ' - ' + (n.place_name || '未分配')" :value="n.id" />
            </el-select>
          </el-form-item>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="需求等级">
                <el-input-number v-model="formData.level_req" :min="1" :max="99" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="排序">
                <el-input-number v-model="formData.sort_order" :min="0" :max="9999" style="width:100%" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="前置任务">
            <el-select v-model="formData.pre_quest_id" placeholder="搜索选择任务" filterable clearable style="width:100%">
              <el-option v-for="q in questList" :key="q.id" :label="q.id + ': ' + q.name" :value="q.id" />
            </el-select>
          </el-form-item>

          <!-- 任务要求 -->
          <div class="quest-section">
            <div class="section-title">📋 任务要求</div>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="需求值">
                  <el-input-number v-model="formData.require_value" :min="0" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="目标ID">
                  <el-input-number v-model="formData.target_id" :min="0" style="width:100%" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- 奖励 -->
          <div class="quest-section">
            <div class="section-title">🏆 任务奖励</div>
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="经验">
                  <el-input-number v-model="formData.reward_exp" :min="0" :step="10" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="金币">
                  <el-input-number v-model="formData.reward_money" :min="0" :step="5" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="金币">
                  <el-input-number v-model="formData.reward_gold" :min="0" style="width:100%" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="奖励物品">
                  <el-select v-model="formData.reward_item_id" placeholder="搜索选择物品" filterable clearable style="width:100%">
                    <el-option v-for="i in itemList" :key="i.id" :label="i.id + ': ' + i.name" :value="i.id" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="物品数量">
                  <el-input-number v-model="formData.reward_item_qty" :min="0" :max="9999" style="width:100%" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- 重复设置 -->
          <div class="quest-section">
            <div class="section-title">🔄 重复设置</div>
            <el-form-item label="可重复">
              <el-switch v-model="formData.repeatable" :active-value="1" :inactive-value="0" />
            </el-form-item>
            <el-form-item v-if="formData.repeatable" label="重置类型">
              <el-select v-model="formData.reset_type" placeholder="请选择重置类型" style="width:100%">
                <el-option v-for="item in questResetTypeEnum" :key="item.key_value" :label="item.label" :value="Number(item.key_value)" />
              </el-select>
            </el-form-item>
          </div>

          <el-form-item label="描述">
            <el-input v-model="formData.description" type="textarea" :rows="3" placeholder="任务描述" />
          </el-form-item>
        </el-form>

        <div class="drawer-footer">
          <el-button @click="drawerVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="handleSubmit">保存</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Share, Refresh } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import ProTable from '@/components/ProTable.vue'
import { getQuestList, createQuest, updateQuest, deleteQuest, getQuestTree } from '@/api/quests'
import { searchNpcs } from '@/api/npcs'
import { searchItems } from '@/api/items'
import { getEnumsByGroup } from '@/api/enums'
import * as echarts from 'echarts'

const tableRef = ref()
const formRef = ref()
const drawerVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const submitLoading = ref(false)

// Quest chain
const chainDialogVisible = ref(false)
const chainChartRef = ref(null)
const chainNpcFilter = ref(null)
const chainData = ref([])
let chainChartInstance = null

const questTypeEnum = ref([])
const questCategoryEnum = ref([])
const questResetTypeEnum = ref([])
const npcList = ref([])
const npcListForFilter = ref([])
const questList = ref([])
const itemList = ref([])

const formData = reactive({
  name: '', description: '',
  type: 0, category: 0,
  repeatable: 0, reset_type: 0,
  require_value: 1, target_id: 0,
  reward_exp: 0, reward_money: 0, reward_gold: 0,
  reward_item_id: null, reward_item_qty: 0,
  level_req: 1, pre_quest_id: null,
  npc_id: null, sort_order: 0
})

const tableColumns = [
  { prop: 'id', label: 'ID', width: 60 },
  { prop: 'name', label: '任务名称', minWidth: 120, searchable: true },
  { prop: 'type', label: '类型', width: 80, enumGroup: 'quest_type' },
  { prop: 'category', label: '分类', width: 80, enumGroup: 'quest_category' },
  { prop: 'npc_name', label: 'NPC', width: 100 },
  { prop: 'level_req', label: '等级需求', width: 90 },
  { prop: 'repeatable', label: '可重复', width: 80, formType: 'switch' },
  { prop: 'reset_type', label: '重置类型', width: 90, enumGroup: 'quest_reset_type' },
  { prop: 'reward_exp', label: '经验', width: 70 },
  { prop: 'reward_money', label: '金币', width: 70 },
  { prop: 'sort_order', label: '排序', width: 70 },
  { prop: 'description', label: '描述', minWidth: 150 }
]

const formRules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }]
}

const rowActions = [
  { label: '编辑', type: 'primary', icon: 'Edit', handler: (row) => openDrawer(row) },
  {
    label: '删除', type: 'danger', icon: 'Delete',
    confirm: '确定要删除该任务吗？玩家进行中的任务数据也会被删除。',
    handler: async (row) => {
      await deleteQuest(row.id)
      ElMessage.success('删除成功')
      tableRef.value.getList()
    }
  }
]

// Quest chain methods
const typeColors = {
  0: '#42a5f5', // 主线-蓝
  1: '#66bb6a', // 支线-绿
  2: '#ffd54f', // 日常-黄
  3: '#ab47bc'  // 成就-紫
}

function buildTreeData(flatList) {
  let filtered = flatList
  if (chainNpcFilter.value) {
    filtered = flatList.filter(q => q.npc_id === chainNpcFilter.value)
  }
  if (filtered.length === 0) return { name: '无数据', children: [] }

  const map = new Map()
  const roots = []
  filtered.forEach(q => {
    map.set(q.id, { name: `${q.name}\n(${q.npc_name || '无NPC'})`, value: q.id, itemStyle: { color: typeColors[q.type] || '#42a5f5' }, children: [] })
  })
  filtered.forEach(q => {
    if (q.pre_quest_id && map.has(q.pre_quest_id)) {
      map.get(q.pre_quest_id).children.push(map.get(q.id))
    } else {
      roots.push(map.get(q.id))
    }
  })
  return roots.length > 0 ? { name: '任务链', children: roots } : { name: '无前置关系的孤立任务', children: roots }
}

async function openQuestChain() {
  chainDialogVisible.value = true
  chainNpcFilter.value = null
  try {
    const res = await getQuestTree()
    chainData.value = res.data || []
    npcListForFilter.value = [...new Map(chainData.value.map(q => [q.npc_id, q])).values()]
    await nextTick()
    renderChainChart()
  } catch (e) {}
}

function renderChainChart() {
  if (!chainChartRef.value || chainData.value.length === 0) return
  if (chainChartInstance) chainChartInstance.dispose()
  chainChartInstance = echarts.init(chainChartRef.value)
  const treeData = buildTreeData(chainData.value)
  chainChartInstance.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1a2d3d',
      borderColor: '#2a4a5e',
      textStyle: { color: '#e8eaed' },
      formatter: (p) => {
        if (!p.data || !p.data.name) return ''
        const lines = p.data.name.split('\n')
        return `<b>${lines[0]}</b>${lines[1] ? '<br>' + lines[1] : ''}`
      }
    },
    series: [{
      type: 'tree',
      data: [treeData],
      top: '5%',
      left: '10%',
      bottom: '5%',
      right: '20%',
      symbolSize: 12,
      orient: 'TB',
      label: {
        position: 'top',
        verticalAlign: 'middle',
        align: 'center',
        fontSize: 11,
        color: '#e8eaed',
        formatter: (p) => {
          if (!p.data || !p.data.name) return ''
          const lines = p.data.name.split('\n')
          return `{name|${lines[0]}}\n{npc|${lines[1] || ''}}`
        },
        rich: {
          name: { fontSize: 12, fontWeight: 'bold', color: '#e8eaed', lineHeight: 18 },
          npc: { fontSize: 10, color: '#78909c', lineHeight: 16 }
        }
      },
      leaves: {
        label: { position: 'bottom', verticalAlign: 'middle', align: 'center' }
      },
      emphasis: { focus: 'descendant' },
      expandAndCollapse: true,
      animationDuration: 550,
      animationDurationUpdate: 750,
      lineStyle: {
        color: '#2a4a5e',
        width: 1.5,
        curveness: 0.5
      }
    }]
  })
}

function resetForm() {
  Object.assign(formData, {
    name: '', description: '',
    type: 0, category: 0,
    repeatable: 0, reset_type: 0,
    require_value: 1, target_id: 0,
    reward_exp: 0, reward_money: 0, reward_gold: 0,
    reward_item_id: null, reward_item_qty: 0,
    level_req: 1, pre_quest_id: null,
    npc_id: null, sort_order: 0
  })
}

function handleAdd() {
  resetForm()
  isEdit.value = false
  editId.value = null
  drawerVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

function openDrawer(row) {
  resetForm()
  isEdit.value = true
  editId.value = row.id
  Object.keys(row).forEach(k => {
    if (k in formData) formData[k] = row[k]
  })
  drawerVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    if (isEdit.value) {
      await updateQuest(editId.value, { ...formData })
    } else {
      await createQuest({ ...formData })
    }
    drawerVisible.value = false
    ElMessage.success(isEdit.value ? '修改成功' : '新增成功')
    tableRef.value.getList()
  } catch (e) {} finally {
    submitLoading.value = false
  }
}

onMounted(async () => {
  try {
    const [typeRes, catRes, resetRes, npcRes, questRes, itemRes] = await Promise.all([
      getEnumsByGroup('quest_type').catch(() => ({ data: [] })),
      getEnumsByGroup('quest_category').catch(() => ({ data: [] })),
      getEnumsByGroup('quest_reset_type').catch(() => ({ data: [] })),
      searchNpcs('').catch(() => ({ data: [] })),
      getQuestList({ pageSize: 500 }).catch(() => ({ data: { list: [] } })),
      searchItems('').catch(() => ({ data: [] }))
    ])
    questTypeEnum.value = typeRes.data || []
    questCategoryEnum.value = catRes.data || []
    questResetTypeEnum.value = resetRes.data || []
    npcList.value = npcRes.data || []
    questList.value = questRes.data.list || []
    itemList.value = itemRes.data || []
  } catch (e) {}
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.quest-drawer {
  padding: 0 20px 20px;
}

.quest-section {
  margin-bottom: 20px;
  padding: 12px 16px;
  background: $bg-input;
  border-radius: $radius-md;
  border: 1px solid $border-color;
  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: $color-primary;
    margin-bottom: 12px;
  }
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid $border-color;
}

.quest-chain-wrapper {
  height: calc(90vh - 80px);
  display: flex;
  flex-direction: column;
}

.chain-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.chain-chart {
  flex: 1;
  min-height: 500px;
}
</style>
