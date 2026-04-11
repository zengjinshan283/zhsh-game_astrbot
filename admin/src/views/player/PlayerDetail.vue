<template>
  <div class="page-container">
    <PageHeader :title="`玩家详情 - ${playerData.user?.username || ''}`">
      <template #desc>
        <el-button :icon="ArrowLeft" link @click="router.push('/players')">返回列表</el-button>
      </template>
    </PageHeader>

    <div v-loading="loading">
      <!-- 基本信息 -->
      <el-card v-if="playerData.user" class="detail-card">
        <template #header>
          <div class="card-header">
            <span>基本信息</span>
            <div class="card-actions">
              <el-button type="danger" size="small" :icon="RefreshRight" @click="handleResetPwd">重置密码</el-button>
              <el-button type="primary" size="small" :icon="Edit" @click="openEditDrawer">编辑</el-button>
            </div>
          </div>
        </template>
        <el-descriptions :column="4" border size="small">
          <el-descriptions-item label="ID">{{ playerData.user.id }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ playerData.user.username }}</el-descriptions-item>
          <el-descriptions-item label="性别">
            <el-tag v-if="playerData.user.sex == 1" type="primary" size="small">男</el-tag>
            <el-tag v-else-if="playerData.user.sex == 2" type="danger" size="small">女</el-tag>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="等级">{{ playerData.user.level }}</el-descriptions-item>
          <el-descriptions-item label="经验">{{ playerData.user.exp }} / {{ playerData.user.exp_max }}</el-descriptions-item>
          <el-descriptions-item label="生命">{{ playerData.user.hp }} / {{ playerData.user.hp_max }}</el-descriptions-item>
          <el-descriptions-item label="攻击">{{ playerData.user.atk_min }} ~ {{ playerData.user.atk_max }}</el-descriptions-item>
          <el-descriptions-item label="防御">{{ playerData.user.def }}</el-descriptions-item>
          <el-descriptions-item label="敏捷">{{ playerData.user.agility }}</el-descriptions-item>
          <el-descriptions-item label="铜币">{{ formatMoney(playerData.user.money) }}</el-descriptions-item>
          <el-descriptions-item label="金币">{{ playerData.user.gold }}</el-descriptions-item>
          <el-descriptions-item label="银行存款">{{ formatMoney(playerData.user.bank_money) }}</el-descriptions-item>
          <el-descriptions-item label="所在场景">{{ playerData.user.place_name || playerData.user.place_id }}</el-descriptions-item>
          <el-descriptions-item label="宠物">{{ playerData.user.pet_name || '-' }} (Lv.{{ playerData.user.pet_level || 0 }})</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ formatTime(playerData.user.regdate) }}</el-descriptions-item>
          <el-descriptions-item label="最后登录">{{ formatTime(playerData.user.lastdate) }}</el-descriptions-item>
          <el-descriptions-item label="注册IP">{{ playerData.user.regip || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 航海状态 -->
      <el-card v-if="playerData.sailStatus" class="detail-card sail-card">
        <template #header>
          <div class="card-header">
            <span>🚢 航海中</span>
            <el-tag type="warning" effect="dark" size="small">{{ playerData.sailStatus.remaining_text }}</el-tag>
          </div>
        </template>
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="出发地">{{ playerData.sailStatus.from_place_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="目的地">{{ playerData.sailStatus.to_place_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="剩余时间">{{ playerData.sailStatus.remaining_text }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 宠物信息 -->
      <el-card v-if="playerData.petInfo" class="detail-card">
        <template #header><span>🐾 宠物信息</span></template>
        <el-descriptions :column="4" border size="small">
          <el-descriptions-item label="名称">{{ playerData.petInfo.name }}</el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag size="small">{{ playerData.petInfo.type }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="攻击">{{ playerData.petInfo.atk }}</el-descriptions-item>
          <el-descriptions-item label="防御">{{ playerData.petInfo.def_val }}</el-descriptions-item>
          <el-descriptions-item label="生命">{{ playerData.petInfo.hp }}</el-descriptions-item>
          <el-descriptions-item label="技能" :span="3">{{ playerData.petInfo.skill_name }} - {{ playerData.petInfo.skill_desc }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 好友列表 -->
      <el-card v-if="playerData.friends && playerData.friends.length > 0" class="detail-card">
        <template #header>
          <span>👥 好友列表 ({{ playerData.friends.length }})</span>
        </template>
        <el-table :data="playerData.friends" size="small" stripe border>
          <el-table-column prop="friend_id" label="ID" width="60" />
          <el-table-column prop="username" label="好友名" min-width="120" />
          <el-table-column prop="level" label="等级" width="70" align="center" />
          <el-table-column prop="lastdate" label="最后登录" width="160">
            <template #default="{ row }">{{ formatTime(row.lastdate) }}</template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 背包 -->
      <el-card v-if="playerData.inventory && playerData.inventory.length > 0" class="detail-card">
        <template #header>
          <span>🎒 背包物品 ({{ playerData.inventory.length }})</span>
        </template>
        <el-table :data="playerData.inventory" size="small" stripe border>
          <el-table-column prop="item_name" label="物品名称" min-width="120" />
          <el-table-column prop="item_type" label="类型" width="80">
            <template #default="{ row }">
              <el-tag v-if="getItemTypeLabel(row.item_type)" size="small" effect="dark">{{ getItemTypeLabel(row.item_type) }}</el-tag>
              <span v-else>{{ row.item_type || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="70" align="center" />
          <el-table-column prop="enhance_level" label="强化等级" width="90" align="center">
            <template #default="{ row }">
              <span v-if="row.enhance_level">{{ row.enhance_level }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="equipped" label="已装备" width="80" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.equipped" type="success" size="small">是</el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 进行中的任务 -->
      <el-card v-if="playerData.quests && playerData.quests.length > 0" class="detail-card">
        <template #header>
          <span>📜 进行中的任务 ({{ playerData.quests.length }})</span>
        </template>
        <el-table :data="playerData.quests" size="small" stripe border>
          <el-table-column prop="quest_name" label="任务名称" min-width="120" />
          <el-table-column prop="progress" label="进度" width="100" align="center" />
          <el-table-column prop="status" label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'warning' : 'success'" size="small">
                {{ row.status === 1 ? '进行中' : '已完成' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 战斗日志 -->
      <el-card v-if="playerData.battleLogs && playerData.battleLogs.length > 0" class="detail-card">
        <template #header>
          <span>⚔️ 最近战斗日志</span>
        </template>
        <el-table :data="playerData.battleLogs" size="small" stripe border>
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="result" label="结果" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.result === 'win' ? 'success' : 'danger'" size="small">
                {{ row.result === 'win' ? '胜利' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="enemy_name" label="对手" min-width="120" show-overflow-tooltip />
          <el-table-column label="奖励" width="180">
            <template #default="{ row }">
              <span v-if="row.exp_gained > 0" style="color:#67c23a">+{{ row.exp_gained }}经验 </span>
              <span v-if="row.money_gained > 0" style="color:#e6a23c">+{{ row.money_gained }}铜币</span>
              <span v-if="row.money_gained < 0" style="color:#f56c6c">{{ row.money_gained }}铜币</span>
              <span v-if="!row.exp_gained && !row.money_gained">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="时间" width="160" />
        </el-table>
      </el-card>
    </div>

    <!-- 编辑抽屉 -->
    <el-drawer v-model="editVisible" title="编辑玩家" size="520px" :close-on-click-modal="false" destroy-on-close>
      <el-form v-if="editVisible" ref="editFormRef" :model="editForm" :rules="editRules" label-width="90px">
        <el-form-item label="等级" prop="level">
          <el-input-number v-model="editForm.level" :min="1" :max="999" />
        </el-form-item>
        <el-form-item label="经验" prop="exp">
          <el-input-number v-model="editForm.exp" :min="0" />
        </el-form-item>
        <el-form-item label="经验上限" prop="exp_max">
          <el-input-number v-model="editForm.exp_max" :min="0" />
        </el-form-item>
        <el-form-item label="生命" prop="hp">
          <el-input-number v-model="editForm.hp" :min="0" />
        </el-form-item>
        <el-form-item label="生命上限" prop="hp_max">
          <el-input-number v-model="editForm.hp_max" :min="0" />
        </el-form-item>
        <el-form-item label="最小攻击" prop="atk_min">
          <el-input-number v-model="editForm.atk_min" :min="0" />
        </el-form-item>
        <el-form-item label="最大攻击" prop="atk_max">
          <el-input-number v-model="editForm.atk_max" :min="0" />
        </el-form-item>
        <el-form-item label="防御" prop="def">
          <el-input-number v-model="editForm.def" :min="0" />
        </el-form-item>
        <el-form-item label="敏捷" prop="agility">
          <el-input-number v-model="editForm.agility" :min="0" />
        </el-form-item>
        <el-form-item label="铜币" prop="money">
          <el-input-number v-model="editForm.money" :min="0" />
        </el-form-item>
        <el-form-item label="金币" prop="gold">
          <el-input-number v-model="editForm.gold" :min="0" />
        </el-form-item>
        <el-form-item label="银行存款" prop="bank_money">
          <el-input-number v-model="editForm.bank_money" :min="0" />
        </el-form-item>
        <el-form-item label="性别" prop="sex">
          <el-radio-group v-model="editForm.sex">
            <el-radio :value="1">男</el-radio>
            <el-radio :value="2">女</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 传送功能 -->
        <el-divider content-position="left">传送</el-divider>
        <el-form-item label="传送场景">
          <el-select v-model="editForm.place_id" placeholder="搜索选择场景" filterable clearable style="width:100%">
            <el-option v-for="p in placeList" :key="p.id" :label="p.name + ' - ' + (p.map_name || '')" :value="p.id" />
          </el-select>
        </el-form-item>

        <!-- 发送系统消息 -->
        <el-divider content-position="left">系统消息</el-divider>
        <el-form-item label="消息内容">
          <el-input v-model="editMsg" type="textarea" :rows="3" placeholder="请输入系统消息" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item>
          <el-button type="warning" :loading="msgSending" @click="handleSendMsgFromDrawer">发送消息</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Edit, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import { getPlayerDetail, updatePlayer, resetPlayerPassword, sendPlayerMessage } from '@/api/players'
import { searchPlaces } from '@/api/places'
import { getEnumsByGroup } from '@/api/enums'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const msgSending = ref(false)
const playerData = reactive({ user: null, inventory: [], quests: [], battleLogs: [], petInfo: null, friends: [], sailStatus: null })
const editVisible = ref(false)
const editFormRef = ref(null)
const editForm = reactive({})
const editMsg = ref('')
const placeList = ref([])
const itemTypeEnums = ref([])

const editRules = {
  level: [{ required: true, message: '请输入等级', trigger: 'blur' }]
}

function formatTime(timestamp) {
  if (!timestamp) return '-'
  const d = new Date(Number(timestamp) * 1000)
  if (isNaN(d.getTime())) return timestamp
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatMoney(val) {
  if (!val) return '0'
  return Number(val).toLocaleString()
}

function getItemTypeLabel(type) {
  const found = itemTypeEnums.value.find(e => String(e.key_value) === String(type))
  return found ? found.label : null
}

async function handleResetPwd() {
  try {
    await ElMessageBox.confirm('确定要将该玩家密码重置为 123456 吗？', '重置密码', { type: 'warning' })
    await resetPlayerPassword(route.params.id)
    ElMessage.success('密码已重置为 123456')
  } catch (e) {}
}

function openEditDrawer() {
  const u = playerData.user
  if (!u) return
  editForm.level = u.level
  editForm.exp = u.exp
  editForm.exp_max = u.exp_max
  editForm.hp = u.hp
  editForm.hp_max = u.hp_max
  editForm.atk_min = u.atk_min
  editForm.atk_max = u.atk_max
  editForm.def = u.def
  editForm.agility = u.agility
  editForm.money = u.money
  editForm.gold = u.gold
  editForm.bank_money = u.bank_money
  editForm.sex = u.sex
  editForm.place_id = u.place_id
  editMsg.value = ''
  editVisible.value = true
}

async function handleSave() {
  const valid = await editFormRef.value.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    await updatePlayer(route.params.id, { ...editForm })
    ElMessage.success('保存成功')
    editVisible.value = false
    loadPlayer()
  } finally {
    saving.value = false
  }
}

async function handleSendMsgFromDrawer() {
  if (!editMsg.value.trim()) {
    ElMessage.warning('消息内容不能为空')
    return
  }
  msgSending.value = true
  try {
    await sendPlayerMessage(route.params.id, editMsg.value)
    ElMessage.success('消息已发送')
    editMsg.value = ''
  } catch (e) {} finally {
    msgSending.value = false
  }
}

async function loadPlayer() {
  loading.value = true
  try {
    const res = await getPlayerDetail(route.params.id)
    playerData.user = res.data.user
    playerData.inventory = res.data.inventory || []
    playerData.quests = res.data.quests || []
    playerData.battleLogs = res.data.battleLogs || []
    playerData.petInfo = res.data.petInfo || null
    playerData.friends = res.data.friends || []
    playerData.sailStatus = res.data.sailStatus || null
  } catch (e) {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  loadPlayer()
  try {
    const [placeRes, enumRes] = await Promise.all([
      searchPlaces('').catch(() => ({ data: [] })),
      getEnumsByGroup('item_type').catch(() => ({ data: [] }))
    ])
    placeList.value = placeRes.data || []
    itemTypeEnums.value = enumRes.data || []
  } catch (e) {}
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.detail-card {
  margin-bottom: 16px;
  :deep(.el-card__header) {
    border-bottom: 1px solid var(--el-border-color);
    padding: 12px 20px;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.sail-card {
  border-left: 3px solid $color-warning;
}
</style>
