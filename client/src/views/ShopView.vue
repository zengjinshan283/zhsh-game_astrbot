<template>
<div class="page">
<div class="location-bar"><div class="location-name">🏪 商店</div><div class="location-path">💰铜币：<span class="text-gold">{{ formatMoney(userStore.money) }}</span></div></div>
<div v-if="error" class="card" style="border-color:#73281c;padding:3px 8px;">
<p style="color:#b85a3a;font-size:11px;margin:0;">❌ {{ error }}</p>
</div>
<div v-if="success" class="card" style="border-color:#2e5a3b;padding:3px 8px;">
<p style="color:#2e5a3b;font-size:11px;margin:0;">✅ {{ success }}</p>
</div>
<div class="tab-bar">
<a href="javascript:void(0)" :class="'btn '+(tab==='buy'?'btn-primary':'btn-secondary')" @click="tab='buy'">🛒 购买</a>
<a href="javascript:void(0)" :class="'btn '+(tab==='sell'?'btn-primary':'btn-secondary')" @click="loadInv();tab='sell'">💰 出售</a>
</div>
<template v-if="tab==='buy'">
<div class="card" v-for="item in items" :key="item.id" style="padding:4px 8px;">
<div style="display:flex;justify-content:space-between;align-items:center;">
<div>
<span class="item-name">{{ item.subtype==='weapon'?'⚔️':item.subtype==='armor'?'🛡️':'💊' }} {{ item.name }}</span><span v-if="item.level_req>1" class="text-muted" style="font-size:10px;"> Lv.{{ item.level_req }}</span>
<p class="item-desc">{{ item.description }}</p>
<p style="font-size:11px;">{{ item.atk>0?'攻+'+item.atk:'' }}{{ item.def_val>0?' 防+'+item.def_val:'' }}{{ item.hp>0?' HP+'+item.hp:'' }}</p>
</div>
<div style="text-align:right;">
<div class="text-gold" style="font-size:13px;font-weight:bold;">{{ item.price_buy }}💰</div>
<div style="display:flex;align-items:center;gap:3px;margin-top:3px;">
<div style="display:inline-flex;align-items:center;border:1px solid rgba(169,119,78,0.2);border-radius:3px;overflow:hidden;">
<button style="width:22px;height:22px;border:none;background:#f5f5f5;cursor:pointer;font-size:12px;" @click="qtyMap[item.id]=Math.max(1,(qtyMap[item.id]||1)-1)">−</button>
<input type="number" v-model.number="qtyMap[item.id]" min="1" max="99" style="width:32px;height:22px;border:none;border-left:1px solid #ddd;border-right:1px solid #ddd;text-align:center;font-size:11px;outline:none;">
<button style="width:22px;height:22px;border:none;background:#f5f5f5;cursor:pointer;font-size:12px;" @click="qtyMap[item.id]=Math.min(99,(qtyMap[item.id]||1)+1)">+</button>
</div>
</div>
<button class="btn btn-primary" style="font-size:10px;padding:4px 8px;margin-top:3px;" @click="buy(item)">购买</button>
</div>
</div>
</div>
</template>
<template v-if="tab==='sell'">
<div v-if="!invItems.length" class="card"><div class="empty-state">背包中没有可出售的物品</div></div>
<div v-for="item in invItems" :key="item.inv_id" class="card" style="padding:4px 8px;">
<div style="display:flex;justify-content:space-between;align-items:center;">
<div>
<span class="item-name">{{ item.name }}<span v-if="item.quantity>1" class="text-gold"> ×{{ item.quantity }}</span></span>
<p class="item-desc">{{ item.description }}</p>
</div>
<div style="text-align:right;">
<div class="text-gold" style="font-size:12px;">{{ item.price_sell||Math.floor((item.price_buy||0)*0.5) }}💰/个</div>
<div style="display:flex;align-items:center;gap:3px;margin-top:3px;">
<div style="display:inline-flex;align-items:center;border:1px solid rgba(169,119,78,0.2);border-radius:3px;overflow:hidden;">
<button style="width:22px;height:22px;border:none;background:#f5f5f5;cursor:pointer;font-size:12px;" @click="sellQtyMap[item.inv_id]=Math.max(1,(sellQtyMap[item.inv_id]||1)-1)">−</button>
<input type="number" v-model.number="sellQtyMap[item.inv_id]" min="1" :max="item.quantity" style="width:32px;height:22px;border:none;border-left:1px solid #ddd;border-right:1px solid #ddd;text-align:center;font-size:11px;outline:none;">
<button style="width:22px;height:22px;border:none;background:#f5f5f5;cursor:pointer;font-size:12px;" @click="sellQtyMap[item.inv_id]=Math.min(item.quantity,(sellQtyMap[item.inv_id]||1)+1)">+</button>
</div>
<button class="btn btn-danger" style="font-size:10px;padding:4px 8px;" @click="sell(item)">出售</button>
</div>
</div>
</div>
</div>
</template>
<router-link to="/map" class="btn btn-secondary btn-block mt-10">← 返回地图</router-link>
</div>
</template>
<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '../stores/user';
import { Api } from '../composables/useApi';
const route = useRoute();
const userStore = useUserStore();
const items = ref([]);
const invItems = ref([]);
const error = ref('');
const success = ref('');
const tab = ref('buy');
const qtyMap = reactive({});
const sellQtyMap = reactive({});
const npcId = route.params.npcId || 1;
function formatMoney(n){if(!n)return'0';if(n>=100000000)return(n/100000000).toFixed(1)+'亿';if(n>=10000)return(n/10000).toFixed(1)+'万';return n.toLocaleString();}
async function loadShop(){try{const d=await Api.get(`/npc/${npcId}/shop`);items.value=d.items||[];}catch(e){error.value=e.message;}}
async function loadInv(){try{const d=await Api.get('/user/inventory');invItems.value=(d.items||[]).filter(i=>!i.equipped);}catch(e){error.value=e.message;}}
async function buy(item){error.value='';success.value='';const qty=qtyMap[item.id]||1;try{const d=await Api.post('/npc/buy',{npc_id:npcId,item_id:item.id,quantity:qty});success.value=`购买 ${d.item_name}×${d.quantity}`;const me=await Api.get('/auth/me');userStore.updateUser(me.user);}catch(e){error.value=e.message;}}
async function sell(item){error.value='';success.value='';const qty=Math.min(sellQtyMap[item.inv_id]||1,item.quantity);success.value='';try{const price=item.price_sell||Math.floor((item.price_buy||0)*0.5);success.value=`出售 ${item.name}×${qty}，获得 ${price*qty} 铜币`;const me=await Api.get('/auth/me');userStore.updateUser(me.user);await loadInv();}catch(e){error.value=e.message;}}
onMounted(loadShop);
</script>
