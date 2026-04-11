<template>
  <div class="page-container">
    <PageHeader title="地图管理" desc="管理游戏中的城市/地图" />
    <ProTable
      ref="tableRef"
      :columns="columns"
      :fetch-data="getMapList"
      :on-submit="handleSubmit"
      :row-actions="rowActions"
      :form-rules="formRules"
      title="地图"
      @edit="row => {}"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import ProTable from '@/components/ProTable.vue'
import { getMapList, createMap, updateMap, deleteMap } from '@/api/maps'

const tableRef = ref()

const columns = [
  { prop: 'id', label: 'ID', width: 70 },
  { prop: 'name', label: '地图名称', minWidth: 140, searchable: true, formType: 'input', required: true },
  { prop: 'parent_id', label: '父级ID', width: 80, formType: 'number' },
  { prop: 'type', label: '类型', width: 100, enumGroup: 'map_type', formType: 'enum-select' },
  { prop: 'sort_order', label: '排序', width: 80, formType: 'number' },
  { prop: 'place_count', label: '场景数', width: 80 }
]

const formRules = {
  name: [{ required: true, message: '请输入地图名称', trigger: 'blur' }]
}

const rowActions = [
  { label: '编辑', type: 'primary', icon: 'Edit', handler: (row) => tableRef.value.openDrawer(row) },
  {
    label: '删除', type: 'danger', icon: 'Delete',
    confirm: '确定要删除该地图吗？',
    handler: async (row) => {
      await deleteMap(row.id)
      ElMessage.success('删除成功')
      tableRef.value.getList()
    }
  }
]

async function handleSubmit({ isEdit, id, formData }) {
  if (isEdit) {
    await updateMap(id, formData)
  } else {
    await createMap(formData)
  }
}
</script>
