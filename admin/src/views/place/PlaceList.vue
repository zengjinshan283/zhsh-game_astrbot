<template>
  <div class="page-container">
    <PageHeader title="场景管理" desc="管理游戏中的场景/区域" />
    <ProTable
      ref="tableRef"
      :columns="tableColumns"
      :fetch-data="getPlaceList"
      :row-actions="rowActions"
      :show-add="false"
      title="场景"
    >
      <template #toolbar-left>
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增场景</el-button>
        <el-select v-model="searchCityId" placeholder="按城市筛选" clearable filterable style="width:160px" @change="handleCityFilter">
          <el-option v-for="c in cityOptions" :key="c.value" :label="c.label" :value="c.value" />
        </el-select>
      </template>
      <template #cell-directions="{ row }">
        <span class="dir-tags">
          <el-tag v-if="row.n" size="small" type="info" class="dir-tag">⬆️{{ getPlaceName(row.n) }}</el-tag>
          <el-tag v-if="row.s" size="small" type="info" class="dir-tag">⬇️{{ getPlaceName(row.s) }}</el-tag>
          <el-tag v-if="row.e" size="small" type="info" class="dir-tag">➡️{{ getPlaceName(row.e) }}</el-tag>
          <el-tag v-if="row.w" size="small" type="info" class="dir-tag">⬅️{{ getPlaceName(row.w) }}</el-tag>
        </span>
      </template>
    </ProTable>

    <!-- 自定义编辑抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="isEdit ? '编辑场景' : '新增场景'"
      size="700px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div v-if="drawerVisible" class="place-drawer">
        <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px" label-position="right">
          <!-- 基本信息 -->
          <div class="form-section">
            <div class="section-title">基本信息</div>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="场景名称" prop="name">
                  <el-input v-model="formData.name" placeholder="请输入场景名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="所属城市" prop="city_id">
                  <el-select v-model="formData.city_id" placeholder="请选择城市" filterable style="width:100%">
                    <el-option v-for="c in cityOptions" :key="c.value" :label="c.label" :value="c.value" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="类型" prop="type">
                  <el-select v-model="formData.type" placeholder="请选择类型" style="width:100%">
                    <el-option v-for="item in placeTypeEnums" :key="item.key_value" :label="item.label" :value="Number(item.key_value)" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="市场" prop="is_market">
                  <el-switch v-model="formData.is_market" :active-value="1" :inactive-value="0" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="公告">
              <el-input v-model="formData.notice" type="textarea" :rows="2" placeholder="场景公告内容" />
            </el-form-item>
          </div>

          <!-- 方向连接器 -->
          <div class="form-section">
            <div class="section-title">方向连接</div>
            <div class="direction-grid">
              <div class="dir-cell empty" />
              <div class="dir-cell dir-north">
                <span class="dir-arrow">⬆️ 北</span>
                <el-select v-model="formData.n" placeholder="选择场景" filterable clearable size="small" class="dir-select" @change="onDirChange">
                  <el-option v-for="p in placeList" :key="p.id" :label="p.id + ': ' + p.name" :value="p.id" />
                </el-select>
                <span v-if="formData.n" class="dir-target" :class="{ 'diff-city': getPlaceCity(formData.n) !== formData.city_id }">
                  {{ getPlaceName(formData.n) }}
                  <span v-if="getPlaceCity(formData.n) !== formData.city_id" class="city-hint">({{ getPlaceCityName(formData.n) }})</span>
                </span>
              </div>
              <div class="dir-cell empty" />

              <div class="dir-cell dir-west">
                <span class="dir-arrow">⬅️ 西</span>
                <el-select v-model="formData.w" placeholder="选择场景" filterable clearable size="small" class="dir-select" @change="onDirChange">
                  <el-option v-for="p in placeList" :key="p.id" :label="p.id + ': ' + p.name" :value="p.id" />
                </el-select>
                <span v-if="formData.w" class="dir-target" :class="{ 'diff-city': getPlaceCity(formData.w) !== formData.city_id }">
                  {{ getPlaceName(formData.w) }}
                  <span v-if="getPlaceCity(formData.w) !== formData.city_id" class="city-hint">({{ getPlaceCityName(formData.w) }})</span>
                </span>
              </div>
              <div class="dir-cell dir-center">
                <div class="center-name">{{ formData.name || '当前场景' }}</div>
              </div>
              <div class="dir-cell dir-east">
                <span class="dir-arrow">➡️ 东</span>
                <el-select v-model="formData.e" placeholder="选择场景" filterable clearable size="small" class="dir-select" @change="onDirChange">
                  <el-option v-for="p in placeList" :key="p.id" :label="p.id + ': ' + p.name" :value="p.id" />
                </el-select>
                <span v-if="formData.e" class="dir-target" :class="{ 'diff-city': getPlaceCity(formData.e) !== formData.city_id }">
                  {{ getPlaceName(formData.e) }}
                  <span v-if="getPlaceCity(formData.e) !== formData.city_id" class="city-hint">({{ getPlaceCityName(formData.e) }})</span>
                </span>
              </div>

              <div class="dir-cell empty" />
              <div class="dir-cell dir-south">
                <span class="dir-arrow">⬇️ 南</span>
                <el-select v-model="formData.s" placeholder="选择场景" filterable clearable size="small" class="dir-select" @change="onDirChange">
                  <el-option v-for="p in placeList" :key="p.id" :label="p.id + ': ' + p.name" :value="p.id" />
                </el-select>
                <span v-if="formData.s" class="dir-target" :class="{ 'diff-city': getPlaceCity(formData.s) !== formData.city_id }">
                  {{ getPlaceName(formData.s) }}
                  <span v-if="getPlaceCity(formData.s) !== formData.city_id" class="city-hint">({{ getPlaceCityName(formData.s) }})</span>
                </span>
              </div>
              <div class="dir-cell empty" />
            </div>
          </div>
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
import { getPlaceList, createPlace, updatePlace, deletePlace } from '@/api/places'
import { getMapList } from '@/api/maps'
import { getEnumsByGroup } from '@/api/enums'

const tableRef = ref()
const formRef = ref()
const searchCityId = ref('')
const cityOptions = ref([])
const placeList = ref([])
const placeTypeEnums = ref([])
const drawerVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const submitLoading = ref(false)
const formData = reactive({
  name: '',
  city_id: null,
  type: 0,
  is_market: 0,
  notice: '',
  n: null,
  s: null,
  e: null,
  w: null
})

const tableColumns = [
  { prop: 'id', label: 'ID', width: 60 },
  { prop: 'name', label: '场景名称', minWidth: 140, searchable: true },
  { prop: 'city_name', label: '城市', width: 100 },
  { prop: 'type', label: '类型', width: 80, enumGroup: 'place_type' },
  { prop: 'is_market', label: '市场', width: 70, formType: 'switch' },
  { prop: 'directions', label: '方向连接', minWidth: 200, slot: 'directions' },
  { prop: 'notice', label: '公告', minWidth: 120 }
]

const formRules = {
  name: [{ required: true, message: '请输入场景名称', trigger: 'blur' }],
  city_id: [{ required: true, message: '请选择所属城市', trigger: 'change' }]
}

const rowActions = [
  { label: '编辑', type: 'primary', icon: 'Edit', handler: (row) => openDrawer(row) },
  {
    label: '删除', type: 'danger', icon: 'Delete',
    confirm: '确定要删除该场景吗？',
    handler: async (row) => {
      await deletePlace(row.id)
      ElMessage.success('删除成功')
      tableRef.value.getList()
    }
  }
]

function getPlaceName(id) {
  const p = placeList.value.find(x => x.id === id)
  return p ? p.name : (id || '-')
}

function getPlaceCity(id) {
  const p = placeList.value.find(x => x.id === id)
  return p ? p.city_id : null
}

function getPlaceCityName(id) {
  const p = placeList.value.find(x => x.id === id)
  if (!p) return ''
  const c = cityOptions.value.find(x => x.value === p.city_id)
  return c ? c.label : ''
}

function onDirChange() { /* no-op, reactive handles it */ }

function handleCityFilter() {
  tableRef.value.searchParams.cityId = searchCityId.value
  tableRef.value.handleSearch()
}

function resetForm() {
  Object.assign(formData, {
    name: '', city_id: null, type: 0, is_market: 0, notice: '',
    n: null, s: null, e: null, w: null
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
      await updatePlace(editId.value, { ...formData })
    } else {
      await createPlace({ ...formData })
    }
    drawerVisible.value = false
    ElMessage.success(isEdit.value ? '修改成功' : '新增成功')
    tableRef.value.getList()
  } catch (e) {
    // handled by interceptor
  } finally {
    submitLoading.value = false
  }
}

onMounted(async () => {
  try {
    const [mapRes, placeRes, enumRes] = await Promise.all([
      getMapList({ pageSize: 200 }),
      getPlaceList({ pageSize: 1000 }),
      getEnumsByGroup('place_type').catch(() => ({ data: [] }))
    ])
    cityOptions.value = (mapRes.data.list || []).map(m => ({ label: m.name, value: m.id }))
    placeList.value = (placeRes.data.list || []).map(p => ({ id: p.id, name: p.name, city_id: p.city_id }))
    placeTypeEnums.value = enumRes.data || []
  } catch (e) {}
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.dir-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.dir-tag {
  font-size: 12px;
}

.place-drawer {
  padding: 0 20px 20px;
}

.form-section {
  margin-bottom: 24px;
  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: $color-primary;
    margin-bottom: 16px;
    padding-left: 10px;
    border-left: 3px solid $color-primary;
  }
}

.direction-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  max-width: 520px;
}

.dir-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: $radius-md;
  min-height: 48px;
}
.dir-cell.empty {
  background: transparent;
}
.dir-cell.dir-north, .dir-cell.dir-south, .dir-cell.dir-east, .dir-cell.dir-west {
  background: $bg-input;
  border: 1px solid $border-color;
}
.dir-cell.dir-center {
  background: $bg-card;
  border: 2px solid $color-primary;
  justify-content: center;
  .center-name {
    font-size: 14px;
    font-weight: 600;
    color: $color-primary;
    text-align: center;
  }
}
.dir-arrow {
  white-space: nowrap;
  font-size: 14px;
  color: $text-primary;
  min-width: 50px;
}
.dir-select {
  flex: 1;
  min-width: 0;
}
.dir-target {
  font-size: 12px;
  color: $color-success;
  white-space: nowrap;
  &.diff-city {
    color: $color-warning;
  }
  .city-hint {
    color: $color-danger;
    font-size: 11px;
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
