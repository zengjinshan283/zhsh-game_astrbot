<template>
  <div class="page-container">
    <PageHeader title="物品管理" desc="管理游戏中的物品" />
    <ProTable
      ref="tableRef"
      :columns="tableColumns"
      :fetch-data="getItemList"
      :row-actions="rowActions"
      :show-add="false"
      title="物品"
    >
      <template #toolbar-left>
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增物品</el-button>
      </template>
    <template #cell-subtype="{ row }">
        {{ getSubtypeLabel(row.type, row.subtype) }}
      </template>
    </ProTable>

    <!-- 自定义编辑抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="isEdit ? '编辑物品' : '新增物品'"
      size="600px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div v-if="drawerVisible" class="item-drawer">
        <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px" label-position="right">
          <el-form-item label="物品名称" prop="name">
            <el-input v-model="formData.name" placeholder="请输入物品名称" />
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="formData.type" placeholder="请选择类型" style="width:100%" @change="onTypeChange">
              <el-option v-for="item in itemTypeEnum" :key="item.key_value" :label="item.label" :value="Number(item.key_value)" />
            </el-select>
          </el-form-item>
          <el-form-item label="子类型">
            <el-select v-if="subtypeOptions.length > 0" v-model="formData.subtype" placeholder="请选择子类型" style="width:100%">
              <el-option v-for="item in subtypeOptions" :key="item.key_value" :label="item.label" :value="item.key_value" />
            </el-select>
            <el-input v-else v-model="formData.subtype" placeholder="子类型（无可用选项时手动输入）" />
          </el-form-item>
          <el-form-item label="需求等级">
            <el-slider v-model="formData.level_req" :min="1" :max="50" show-input />
          </el-form-item>

          <!-- 属性面板 -->
          <div class="attr-section">
            <div class="section-title">📊 物品属性</div>
            <el-form-item label="⚔️ 攻击">
              <el-input-number v-model="formData.atk" :min="0" :max="99999" style="width:200px" />
            </el-form-item>
            <el-form-item label="🛡️ 防御">
              <el-input-number v-model="formData.def_val" :min="0" :max="99999" style="width:200px" />
            </el-form-item>
            <el-form-item label="❤️ 生命">
              <el-input-number v-model="formData.hp" :min="0" :max="99999" style="width:200px" />
            </el-form-item>
          </div>

          <!-- 价格计算器 -->
          <div class="attr-section">
            <div class="section-title">💰 价格</div>
            <el-form-item label="买入价(铜)">
              <el-input-number v-model="formData.price_buy" :min="0" :max="99999999" :step="10" style="width:200px" @change="onBuyPriceChange" />
            </el-form-item>
            <el-form-item label="卖出价(铜)">
              <el-input-number v-model="formData.price_sell" :min="0" :max="99999999" :step="10" style="width:200px" />
              <el-button v-if="formData.price_buy > 0" type="info" link size="small" style="margin-left:8px" @click="autoSellPrice">
                自动建议(50%)
              </el-button>
            </el-form-item>
          </div>

          <el-form-item label="描述">
            <el-input v-model="formData.description" type="textarea" :rows="3" placeholder="物品描述" />
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
import { Plus } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import ProTable from '@/components/ProTable.vue'
import { getItemList, createItem, updateItem, deleteItem } from '@/api/items'
import { getEnumsByGroup } from '@/api/enums'

const tableRef = ref()
const formRef = ref()
const drawerVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const submitLoading = ref(false)
const itemTypeEnum = ref([])
const subtypeOptions = ref([])

const subtypeLabelCache = {}
function getSubtypeLabel(type, subtype) {
  if (!subtype) return '-'
  const key = type + ':' + subtype
  if (subtypeLabelCache[key]) return subtypeLabelCache[key]
  // Sync lookup from subtypeOptions if available
  const found = subtypeOptions.value.find(e => e.key_value === subtype)
  if (found) { subtypeLabelCache[key] = found.label; return found.label }
  // Fallback: try loading
  const groupName = subtypeMap[type]
  if (groupName) {
    import('@/api/enums').then(({ getEnumsByGroup }) => {
      getEnumsByGroup(groupName).then(res => {
        const item = (res.data || []).find(e => e.key_value === subtype)
        if (item) { subtypeLabelCache[key] = item.label }
      }).catch(() => {})
    })
  }
  return subtype
}

const subtypeMap = {
  1: 'item_subtype_weapon',
  2: 'item_subtype_armor',
  3: 'item_subtype_consumable',
  4: 'item_subtype_material',
  5: 'item_subtype_special'
}

const formData = reactive({
  name: '', type: 0, subtype: '',
  atk: 0, def_val: 0, hp: 0,
  price_buy: 0, price_sell: 0,
  level_req: 1, description: ''
})

const tableColumns = [
  { prop: 'id', label: 'ID', width: 60 },
  { prop: 'name', label: '物品名称', minWidth: 120, searchable: true },
  { prop: 'type', label: '类型', width: 90, enumGroup: 'item_type' },
  { prop: 'subtype', label: '子类型', width: 80, slot: 'subtype' },
  { prop: 'atk', label: '攻击', width: 70 },
  { prop: 'def_val', label: '防御', width: 70 },
  { prop: 'hp', label: '生命', width: 70 },
  { prop: 'price_buy', label: '买入价(铜)', width: 90 },
  { prop: 'price_sell', label: '卖出价(铜)', width: 90 },
  { prop: 'level_req', label: '等级需求', width: 90 },
  { prop: 'description', label: '描述', minWidth: 120 }
]

const formRules = {
  name: [{ required: true, message: '请输入物品名称', trigger: 'blur' }]
}

const rowActions = [
  { label: '编辑', type: 'primary', icon: 'Edit', handler: (row) => openDrawer(row) },
  {
    label: '删除', type: 'danger', icon: 'Delete',
    confirm: '确定要删除该物品吗？NPC商店关联也会被删除。',
    handler: async (row) => {
      await deleteItem(row.id)
      ElMessage.success('删除成功')
      tableRef.value.getList()
    }
  }
]

function resetForm() {
  Object.assign(formData, {
    name: '', type: 0, subtype: '',
    atk: 0, def_val: 0, hp: 0,
    price_buy: 0, price_sell: 0,
    level_req: 1, description: ''
  })
  subtypeOptions.value = []
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
  nextTick(() => {
    formRef.value?.clearValidate()
    loadSubtypes(formData.type)
  })
}

async function onTypeChange(type) {
  formData.subtype = ''
  await loadSubtypes(type)
}

async function loadSubtypes(type) {
  const groupName = subtypeMap[type]
  if (!groupName) {
    subtypeOptions.value = []
    return
  }
  try {
    const res = await getEnumsByGroup(groupName)
    subtypeOptions.value = res.data || []
  } catch (e) {
    subtypeOptions.value = []
  }
}

function onBuyPriceChange() {
  autoSellPrice()
}

function autoSellPrice() {
  formData.price_sell = Math.floor(formData.price_buy * 0.5)
}

async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    if (isEdit.value) {
      await updateItem(editId.value, { ...formData })
    } else {
      await createItem({ ...formData })
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
    const res = await getEnumsByGroup('item_type')
    itemTypeEnum.value = res.data || []
  } catch (e) {}
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.item-drawer {
  padding: 0 20px 20px;
}

.attr-section {
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
</style>
