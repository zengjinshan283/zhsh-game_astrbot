<template>
<div class="page">
<div class="location-bar"><div class="location-name">{{ target.sex===2?'♀':'♂' }} {{ target.username }}</div><div class="location-path">Lv.{{ target.level }} · {{ target.sex===2?'女':'男' }}</div></div>
<div class="card">
<div class="card-title">📊 角色属性</div>
<table style="width:100%;font-size:14px;">
<tr><td style="padding:6px 0;color:#cfc19e;">❤️ 生命值</td><td style="text-align:right;">{{ target.hp }}/{{ target.hp_max }}</td></tr>
<tr><td style="padding:6px 0;color:#cfc19e;">⚔️ 攻击力</td><td style="text-align:right;">{{ target.atk_min }} - {{ target.atk_max }}</td></tr>
<tr><td style="padding:6px 0;color:#cfc19e;">🛡️ 防御力</td><td style="text-align:right;">{{ target.def }}</td></tr>
<tr><td style="padding:6px 0;color:#cfc19e;">💨 敏捷</td><td style="text-align:right;">{{ target.agility }}</td></tr>
</table>
</div>
<div v-if="equipped.length" class="card">
<div class="card-title">🗡️ 已装备</div>
<div v-for="eq in equipped" :key="eq.id" style="padding:4px 0;font-size:14px;">
{{ eq.name }}
<span v-if="eq.atk>0" style="color:#2e5a3b;"> 攻+{{ eq.atk }}</span>
<span v-if="eq.def_val>0" style="color:#2e5a3b;"> 防+{{ eq.def_val }}</span>
</div>
</div>
<div class="card">
<div class="card-title">📊 统计</div>
<p style="font-size:14px;color:#cfc19e;">⚔️ 总战斗 {{ battleCount }} 场 · 🏆 胜利 {{ winCount }} 场</p>
</div>
<router-link to="/map" class="btn btn-secondary btn-block mt-10">← 返回地图</router-link>
</div>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Api } from '../composables/useApi';
const route=useRoute();
const target=ref({});const equipped=ref([]);const winCount=ref(0);const battleCount=ref(0);
async function load(){try{const d=await Api.get(`/user/view/${route.params.id}`);target.value=d.target||{};equipped.value=d.equipped||[];winCount.value=d.winCount||0;battleCount.value=d.battleCount||0;}catch(e){}}
onMounted(load);
</script>
