<template>
  <div class="pro-table">
    <!-- 搜索栏 -->
    <div v-if="searchColumns.length > 0" class="search-bar">
      <template v-for="col in searchColumns" :key="col.prop">
        <el-input
          v-if="col.formType === 'input' || col.formType === 'number'"
          v-model="searchParams[col.prop]"
          :placeholder="`搜索${col.label}`"
          :type="col.formType === 'number' ? 'number' : 'text'"
          clearable
          style="width: 180px"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-else-if="col.formType === 'select' && col.enumGroup"
          v-model="searchParams[col.prop]"
          :placeholder="`全部${col.label}`"
          clearable filterable
          style="width: 160px"
        >
          <el-option
            v-for="item in getEnumOptions(col.enumGroup)"
            :key="item.key_value"
            :label="item.label"
            :value="Number(item.key_value)"
          />
        </el-select>
        <el-select
          v-else-if="col.formType === 'select' && col.options"
          v-model="searchParams[col.prop]"
          :placeholder="`全部${col.label}`"
          clearable filterable
          style="width: 160px"
        >
          <el-option
            v-for="item in col.options"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-else-if="col.formType === 'switch'"
          v-model="searchParams[col.prop]"
          :placeholder="`全部${col.label}`"
          clearable
          style="width: 120px"
        >
          <el-option label="是" :value="1" />
          <el-option label="否" :value="0" />
        </el-select>
        <el-input
          v-else
          v-model="searchParams[col.prop]"
          :placeholder="`搜索${col.label}`"
          clearable
          style="width: 180px"
          @keyup.enter="handleSearch"
        />
      </template>
      <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
      <el-button :icon="Refresh" @click="handleReset">重置</el-button>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <slot name="toolbar-left" />
      </div>
      <div class="toolbar-right">
        <el-button v-if="showAdd !== false" type="primary" :icon="Plus" @click="handleAdd">
          新增
        </el-button>
        <el-button
          v-if="batchActions && batchActions.length > 0 && selectedRows.length > 0"
          type="danger"
          :icon="Delete"
          @click="handleBatchAction"
        >
          批量操作 ({{ selectedRows.length }})
        </el-button>
        <el-button :icon="Refresh" circle @click="refresh" />
      </div>
    </div>

    <!-- 表格 -->
    <el-table
      v-loading="loading"
      :data="tableData"
      :border="true"
      stripe
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column v-if="showSelection" type="selection" width="45" align="center" />
      <el-table-column type="index" label="#" width="55" align="center" />

      <template v-for="col in columns" :key="col.prop">
        <el-table-column
          v-if="col.enumGroup"
          :prop="col.prop"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
          :fixed="col.fixed"
          :show-overflow-tooltip="true"
        >
          <template #default="{ row }">
            <el-tag
              :type="getEnumTagType(col.enumGroup, row[col.prop])"
              size="small"
              effect="dark"
            >
              {{ getEnumLabel(col.enumGroup, row[col.prop]) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          v-else-if="col.formatter"
          :prop="col.prop"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
          :fixed="col.fixed"
          :show-overflow-tooltip="true"
        >
          <template #default="{ row }">
            {{ col.formatter(row) }}
          </template>
        </el-table-column>

        <el-table-column
          v-else-if="col.formType === 'switch'"
          :prop="col.prop"
          :label="col.label"
          :width="col.width || 80"
          align="center"
        >
          <template #default="{ row }">
            <el-tag :type="row[col.prop] ? 'success' : 'info'" size="small" effect="dark">
              {{ row[col.prop] ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          v-else-if="col.slot"
          :prop="col.prop"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
          :fixed="col.fixed"
          :show-overflow-tooltip="true"
        >
          <template #default="scope">
            <slot :name="col.slot" v-bind="scope" />
          </template>
        </el-table-column>

        <el-table-column
          v-else
          :prop="col.prop"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth || 120"
          :fixed="col.fixed"
          :show-overflow-tooltip="true"
        />
      </template>

      <!-- 操作列 -->
      <el-table-column
        v-if="rowActions && rowActions.length > 0"
        label="操作"
        :width="actionWidth"
        :fixed="actionFixed"
        align="center"
      >
        <template #default="{ row }">
          <template v-for="action in rowActions" :key="action.label">
            <el-button
              v-if="!action.show || action.show(row)"
              :type="action.type || 'primary'"
              link
              size="small"
              @click="handleRowAction(action, row)"
            >
              <el-icon v-if="action.icon" style="margin-right:2px"><component :is="action.icon" /></el-icon>
              {{ action.label }}
            </el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        background
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 编辑抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="drawerTitle"
      size="520px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div v-if="drawerVisible" class="drawer-body">
        <el-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          label-width="100px"
          label-position="right"
        >
          <template v-for="col in formColumns" :key="col.prop">
            <el-form-item v-if="col.formType === 'input' || col.formType === 'number'" :label="col.label" :prop="col.prop">
              <el-input
                v-model="formData[col.prop]"
                :type="col.formType === 'number' ? 'number' : 'text'"
                :placeholder="`请输入${col.label}`"
                :disabled="col.disabled"
                :min="col.min"
                :max="col.max"
                :step="col.step || 1"
              />
            </el-form-item>

            <el-form-item v-else-if="col.formType === 'textarea'" :label="col.label" :prop="col.prop">
              <el-input
                v-model="formData[col.prop]"
                type="textarea"
                :rows="3"
                :placeholder="`请输入${col.label}`"
              />
            </el-form-item>

            <el-form-item v-else-if="col.formType === 'enum-select' && col.enumGroup" :label="col.label" :prop="col.prop">
              <el-select v-model="formData[col.prop]" :placeholder="`请选择${col.label}`" style="width: 100%">
                <el-option
                  v-for="item in getEnumOptions(col.enumGroup)"
                  :key="item.key_value"
                  :label="item.label"
                  :value="Number(item.key_value)"
                />
              </el-select>
            </el-form-item>

            <el-form-item v-else-if="col.formType === 'select'" :label="col.label" :prop="col.prop">
              <el-select v-model="formData[col.prop]" :placeholder="`请选择${col.label}`" style="width: 100%" :filterable="!!col.filterable">
                <el-option
                  v-for="item in col.options"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item v-else-if="col.formType === 'switch'" :label="col.label" :prop="col.prop">
              <el-switch v-model="formData[col.prop]" :active-value="1" :inactive-value="0" />
            </el-form-item>

            <el-form-item v-else-if="col.formType === 'date'" :label="col.label" :prop="col.prop">
              <el-date-picker v-model="formData[col.prop]" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
            </el-form-item>

            <el-form-item v-else-if="col.slot" :label="col.label" :prop="col.prop">
              <slot :name="`form-${col.slot}`" :form="formData" :column="col" />
            </el-form-item>
          </template>
        </el-form>
        <div class="drawer-footer">
          <el-button @click="drawerVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
            {{ isEdit ? '保存修改' : '确认新增' }}
          </el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { Search, Refresh, Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getEnumsByGroup } from '@/api/enums'

const props = defineProps({
  columns: { type: Array, required: true, default: () => [] },
  fetchData: { type: Function, required: true },
  onSubmit: { type: Function, default: null },
  rowActions: { type: Array, default: () => [] },
  batchActions: { type: Array, default: () => [] },
  showSelection: { type: Boolean, default: false },
  showAdd: { type: Boolean, default: true },
  formRules: { type: Object, default: () => ({}) },
  initFormData: { type: Function, default: null },
  actionWidth: { type: [String, Number], default: 200 },
  actionFixed: { type: [String, Boolean], default: 'right' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['add', 'edit'])

const loading = ref(false)
const tableData = ref([])
const selectedRows = ref([])
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const searchParams = reactive({})

const drawerVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const formData = reactive({})
const formRef = ref(null)
const submitLoading = ref(false)
const enumCache = ref({})

const searchColumns = computed(() => props.columns.filter(col => col.searchable))
const formColumns = computed(() => props.columns.filter(col => col.formType || col.slot))

const drawerTitle = computed(() => {
  if (props.title) {
    return isEdit.value ? `编辑${props.title}` : `新增${props.title}`
  }
  return isEdit.value ? '编辑' : '新增'
})

async function loadEnum(groupName) {
  if (enumCache.value[groupName]) return
  try {
    const res = await getEnumsByGroup(groupName)
    enumCache.value[groupName] = res.data || []
  } catch (e) {
    enumCache.value[groupName] = []
  }
}

function getEnumOptions(groupName) {
  return enumCache.value[groupName] || []
}

function getEnumLabel(groupName, value) {
  const list = enumCache.value[groupName] || []
  const found = list.find(item => String(item.key_value) === String(value))
  return found ? found.label : (value !== undefined && value !== null ? value : '-')
}

function getEnumTagType(groupName, value) {
  const list = enumCache.value[groupName] || []
  const idx = list.findIndex(item => String(item.key_value) === String(value))
  const types = ['', 'success', 'warning', 'danger', 'info']
  return types[idx % types.length]
}

function initSearchParams() {
  searchColumns.value.forEach(col => {
    searchParams[col.prop] = col.defaultSearchValue !== undefined ? col.defaultSearchValue : ''
  })
}

async function getList() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...searchParams
    }
    // Map searchable text input params to 'keyword' (all backends use 'keyword')
    searchColumns.value.forEach(col => {
      if (col.searchable && params[col.prop] !== undefined && params[col.prop] !== '') {
        const key = col.searchKey || 'keyword'
        params[key] = params[col.prop]
        if (key !== col.prop) delete params[col.prop]
      }
    })
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key]
      }
    })
    const res = await props.fetchData(params)
    tableData.value = res.data.list || []
    pagination.total = res.data.total || 0
  } catch (e) {
    tableData.value = []
  } finally {
    loading.value = false
  }
}

function refresh() {
  pagination.page = 1
  getList()
}

function handleSearch() {
  pagination.page = 1
  getList()
}

function handleReset() {
  initSearchParams()
  pagination.page = 1
  getList()
}

function handlePageChange(page) {
  pagination.page = page
  getList()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  getList()
}

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

async function handleBatchAction() {
  if (props.batchActions.length === 1) {
    const action = props.batchActions[0]
    if (action.confirm) {
      await ElMessageBox.confirm(action.confirm, '提示', { type: 'warning' })
    }
    try {
      await action.handler(selectedRows.value)
      ElMessage.success('操作成功')
      getList()
    } catch (e) { /* cancelled */ }
  }
}

async function handleRowAction(action, row) {
  if (action.confirm) {
    const msg = typeof action.confirm === 'function' ? action.confirm(row) : action.confirm
    await ElMessageBox.confirm(msg, '提示', { type: 'warning' })
  }
  action.handler(row)
}

function handleAdd() {
  emit('add')
  openDrawer(null)
}

function openDrawer(row = null) {
  isEdit.value = !!row
  editId.value = row ? row.id : null
  Object.keys(formData).forEach(key => delete formData[key])
  if (row) {
    Object.keys(row).forEach(key => {
      formData[key] = row[key]
    })
    emit('edit', row)
  } else if (props.initFormData) {
    const init = props.initFormData()
    Object.keys(init).forEach(key => {
      formData[key] = init[key]
    })
  }
  drawerVisible.value = true
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    if (props.onSubmit) {
      await props.onSubmit({ isEdit: isEdit.value, id: editId.value, formData: { ...formData } })
    }
    drawerVisible.value = false
    ElMessage.success(isEdit.value ? '修改成功' : '新增成功')
    getList()
  } catch (e) {
    // error already handled by API interceptor
  } finally {
    submitLoading.value = false
  }
}

function closeDrawer() {
  drawerVisible.value = false
}

defineExpose({
  handleSearch,
  searchParams,
  getList,
  refresh,
  openDrawer,
  closeDrawer,
  formRef,
  formData,
  submitLoading,
  getEnumLabel,
  getEnumOptions,
  getEnumTagType,
  enumCache
})

onMounted(async () => {
  initSearchParams()
  const enumGroups = new Set()
  props.columns.forEach(col => {
    if (col.enumGroup) enumGroups.add(col.enumGroup)
  })
  if (enumGroups.size > 0) {
    await Promise.all([...enumGroups].map(g => loadEnum(g)))
  }
  getList()
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.pro-table {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0;
  flex-shrink: 0;
}

.drawer-body {
  padding: 0 20px 20px;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid $border-color;
  margin-top: 20px;
}

.toolbar-left {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
