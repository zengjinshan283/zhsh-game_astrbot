<template>
  <div class="page-container">
    <PageHeader title="怪物管理" desc="管理游戏中的怪物" />
    <ProTable
      ref="tableRef"
      :columns="tableColumns"
      :fetch-data="getMonsterList"
      :row-actions="rowActions"
      :show-add="false"
      title="怪物"
    >
      <template #toolbar-left>
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增怪物</el-button>
      </template>
      <template #cell-money="{ row }">
        <span v-if="row.money_reward_min && row.money_reward_max">
          {{ row.money_reward_min }} ~ {{ row.money_reward_max }}
        </span>
        <span v-else style="color:#666">-</span>
      </template>
      <template #cell-capture="{ row }">
        <template v-if="row.captureable">
          <el-tag type="success" size="small" effect="dark">可捕捉 {{ row.capture_rate }}%</el-tag>
        </template>
        <template v-else>
          <el-tag type="info" size="small">不可捕捉</el-tag>
        </template>
      </template>
    </ProTable>

    <!-- 自定义编辑抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="isEdit ? '编辑怪物' : '新增怪物'"
      size="600px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div v-if="drawerVisible" class="monster-drawer">
        <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px" label-position="right">
          <el-form-item label="名称" prop="name">
            <el-input v-model="formData.name" placeholder="请输入怪物名称" />
          </el-form-item>
          <el-form-item label="所在场景">
            <el-select v-model="formData.place_id" placeholder="选择场景" filterable clearable style="width:100%">
              <el-option v-for="p in placeList" :key="p.id" :label="p.id + ': ' + p.name + (p.city_name ? ' (' + p.city_name + ')' : '')" :value="p.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="所属区域">
            <el-select v-model="formData.region_id" placeholder="选择地图" filterable clearable style="width:100%">
              <el-option v-for="m in mapList" :key="m.id" :label="m.id + ': ' + m.name" :value="m.id" />
            </el-select>
          </el-form-item>

          <!-- 属性面板 -->
          <div class="stat-section">
            <div class="section-title">⚔️ 战斗属性</div>
            <el-form-item label="生命值 (HP)">
              <el-input-number v-model="formData.hp" :min="1" :max="999999" :step="50" style="width:200px" />
              <el-progress :percentage="hpPercent" :stroke-width="10" style="flex:1;margin-left:16px" :color="'#66bb6a'" />
            </el-form-item>
            <el-form-item label="攻击力">
              <div class="range-input">
                <el-input-number v-model="formData.atk_min" :min="0" :max="99999" size="small" />
                <span class="range-sep">~</span>
                <el-input-number v-model="formData.atk_max" :min="0" :max="99999" size="small" />
              </div>
              <el-progress
                v-if="formData.atk_max > 0"
                :percentage="Math.round(((formData.atk_min + formData.atk_max) / 2) / atkMax * 100)"
                :stroke-width="10"
                style="flex:1;margin-left:16px"
                :color="'#ef5350'"
              />
            </el-form-item>
            <el-form-item label="防御">
              <el-input-number v-model="formData.def" :min="0" :max="99999" style="width:200px" />
            </el-form-item>
          </div>

          <!-- 奖励面板 -->
          <div class="stat-section">
            <div class="section-title">🎁 击杀奖励</div>
            <el-form-item label="经验值">
              <el-input-number v-model="formData.exp_reward" :min="0" :max="999999" :step="10" style="width:200px" />
            </el-form-item>
            <el-form-item label="铜币范围">
              <div class="range-input">
                <el-input-number v-model="formData.money_reward_min" :min="0" :max="99999" size="small" />
                <span class="range-sep">~</span>
                <el-input-number v-model="formData.money_reward_max" :min="0" :max="99999" size="small" />
              </div>
            </el-form-item>
          </div>

          <!-- 捕捉设置 -->
          <div class="stat-section">
            <div class="section-title">🐾 捕捉设置</div>
            <el-form-item label="可捕捉">
              <el-switch v-model="formData.captureable" :active-value="1" :inactive-value="0" />
            </el-form-item>
            <el-form-item v-if="formData.captureable" label="捕捉率">
              <el-slider v-model="formData.capture_rate" :min="1" :max="100" :step="1" show-input style="width:100%" />
            </el-form-item>
          </div>

          <el-form-item label="描述">
            <el-input v-model="formData.description" type="textarea" :rows="3" placeholder="怪物描述" />
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
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import ProTable from '@/components/ProTable.vue'
import { getMonsterList, createMonster, updateMonster, deleteMonster } from '@/api/monsters'
import { getPlaceList } from '@/api/places'
import { getMapList } from '@/api/maps'

const tableRef = ref()
const formRef = ref()
const placeList = ref([])
const mapList = ref([])
const drawerVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const submitLoading = ref(false)

const formData = reactive({
  name: '', hp: 50, atk_min: 1, atk_max: 10, def: 0,
  exp_reward: 10, money_reward_min: 1, money_reward_max: 10,
  place_id: null, region_id: null,
  description: '', captureable: 0, capture_rate: 10
})

const atkMax = ref(1000)
const hpMax = ref(10000)

const hpPercent = computed(() => Math.min(100, Math.round((formData.hp / hpMax.value) * 100)))

const tableColumns = [
  { prop: 'id', label: 'ID', width: 60 },
  { prop: 'name', label: '怪物名称', minWidth: 120, searchable: true },
  { prop: 'hp', label: '生命值', width: 80 },
  { prop: 'atk_min', label: '最小攻击', width: 80 },
  { prop: 'atk_max', label: '最大攻击', width: 80 },
  { prop: 'def', label: '防御', width: 70 },
  { prop: 'exp_reward', label: '经验', width: 70 },
  { prop: 'money_reward', label: '铜币', width: 120, slot: 'money' },
  { prop: 'place_name', label: '所在场景', width: 100 },
  { prop: 'city_name', label: '城市', width: 80 },
  { prop: 'captureable', label: '捕捉', width: 100, slot: 'capture' },
  { prop: 'description', label: '描述', minWidth: 120 }
]

const formRules = {
  name: [{ required: true, message: '请输入怪物名称', trigger: 'blur' }]
}

const rowActions = [
  { label: '编辑', type: 'primary', icon: 'Edit', handler: (row) => openDrawer(row) },
  {
    label: '删除', type: 'danger', icon: 'Delete',
    confirm: '确定要删除该怪物吗？',
    handler: async (row) => {
      await deleteMonster(row.id)
      ElMessage.success('删除成功')
      tableRef.value.getList()
    }
  }
]

function resetForm() {
  Object.assign(formData, {
    name: '', hp: 50, atk_min: 1, atk_max: 10, def: 0,
    exp_reward: 10, money_reward_min: 1, money_reward_max: 10,
    place_id: null, region_id: null,
    description: '', captureable: 0, capture_rate: 10
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
      await updateMonster(editId.value, { ...formData })
    } else {
      await createMonster({ ...formData })
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
    const [placeRes, mapRes] = await Promise.all([
      getPlaceList({ pageSize: 500 }),
      getMapList({ pageSize: 200 })
    ])
    placeList.value = placeRes.data.list || []
    mapList.value = mapRes.data.list || []
  } catch (e) {}
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.monster-drawer {
  padding: 0 20px 20px;
}

.stat-section {
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
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}

.range-input {
  display: flex;
  align-items: center;
  gap: 8px;
  .range-sep {
    color: $text-secondary;
    font-weight: bold;
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
