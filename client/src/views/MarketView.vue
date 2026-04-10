<template>
<div class="page">
<div class="location-bar"><div class="location-name">🏪 {{ city?.name||'' }}市场</div><div class="location-path">📍{{ regionName }} · 💰<span class="text-gold">{{ formatMoney(money) }}</span>铜</div></div>
<div v-if="msg" class="card" :style="{borderColor:msgType==='error'?'#73281c':'#2e5a3b',padding:'6px 10px',marginBottom:'6px'}">
<p :style="{color:msgType==='error'?'#b85a3a':'#2e5a3b',fontSize:'12px',margin:0}">{{ msg }}</p>
</div>
<template v-if="ship">
<div class="card" style="padding:6px 10px;margin-bottom:6px;background:linear-gradient(135deg,rgba(41,128,185,0.08),rgba(41,128,185,0.03));">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
<span style="font-size:11px;color:#8b784e;">🚢 {{ ship.name }}</span>
<span style="font-size:11px;">货舱 <b :style="{color:cargoUsed/cargoMax>0.8?'#73281c':'#35573f'}">{{ cargoUsed }}</b>/{{ cargoMax }}</span>
</div>
<div style="background:#2a3525;border-radius:4px;height:6px;overflow:hidden;"><div :style="{background:cargoUsed/cargoMax>0.8?'#73281c':'#35573f',height:'100%',width:Math.min(100,Math.round(cargoUsed/cargoMax*100))+'%'}"></div></div>
</div>
</template>
<template v-else>
<div class="card" style="padding:8px;margin-bottom:6px;text-align:center;"><span style="font-size:12px;color:#73281c;">⚠️ 没有船只，无法贸易。请先到码头购买。</span></div>
</template>
<div style="font-size:11px;color:#7a6848;margin-bottom:6px;">📅 今日价格（每天变化一次）</div>
<div v-for="g in goodsList" :key="g.id" class="card" style="padding:6px 10px;">
<div style="display:flex;justify-content:space-between;align-items:center;">
<div style="flex:1;min-width:0;">
<div><span style="font-size:13px;font-weight:600;">{{ g.name }}</span> <span style="font-size:10px;color:#7a6848;">· {{ g.description }}</span> <span v-if="g.hold>0" style="font-size:10px;color:#35573f;"> 📦×{{ g.hold }}</span></div>
<div style="display:flex;gap:10px;margin-top:2px;">
<span style="font-size:13px;color:#6f5632;font-weight:600;">{{ g.price }}<span style="font-size:10px;color:#7a6848;"> 铜/{{ g.unit }}</span></span>
<span style="font-size:10px;color:#cfc19e;">⏱{{ g.weight }}舱位</span>
</div>
</div>
<div v-if="ship" style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
<div style="display:inline-flex;align-items:center;border:1px solid #ddd;border-radius:4px;overflow:hidden;">
<button style="width:26px;height:26px;border:none;background:#f5f5f5;cursor:pointer;font-size:14px;" @click="setQty(g.id,-1)">−</button>
<input type="number" v-model.number="qtyMap[g.id]" min="1" :max="g.hold||99" style="width:36px;height:26px;border:none;border-left:1px solid #ddd;border-right:1px solid #ddd;text-align:center;font-size:12px;outline:none;">
<button style="width:26px;height:26px;border:none;background:#f5f5f5;cursor:pointer;font-size:14px;" @click="setQty(g.id,1)">+</button>
</div>
<button class="btn btn-success" @click="buyGoods(g)" style="padding:5px 10px;font-size:11px;">🛒买</button>
<button v-if="g.hold>0" class="btn btn-danger" @click="sellGoods(g)" style="padding:5px 10px;font-size:11px;">💰卖</button>
</div>
</div>
</div>
<div class="card" style="padding:8px 10px;margin-top:8px;">
<div style="font-size:12px;font-weight:600;color:#ddd0b6;margin-bottom:6px;">📊 走商参考（其他区域均价）</div>
<div v-for="h in priceHints" :key="h.name" style="margin-bottom:3px;">
<span style="font-size:11px;font-weight:500;">{{ h.name }}:</span>
<span v-for="r in h.regions" :key="r.rid" style="font-size:10px;color:#8b784e;">{{ r.rname }}{{ r.avgp }} ·</span>
</div>
<div style="font-size:10px;color:#7a6848;margin-top:4px;">💡 卖出价为买入价的90%，注意货舱容量和价格波动</div>
</div>
</div>
</template>
<script setup>
import { ref, reactive, onMounted } from 'vue';
import { Api } from '../composables/useApi';
const city=ref(null); const regionName=ref(''); const ship=ref(null); const cargoUsed=ref(0); const cargoMax=ref(0);
const goodsList=ref([]); const priceHints=ref([]); const money=ref(0);
const msg=ref(''); const msgType=ref('');
const qtyMap=reactive({});
function formatMoney(n){if(!n)return'0';if(n>=100000000)return(n/100000000).toFixed(1)+'亿';if(n>=10000)return(n/10000).toFixed(1)+'万';return n.toLocaleString();}
function setQty(id,delta){qtyMap[id]=Math.max(1,(qtyMap[id]||1)+delta);}
async function load(){try{const d=await Api.get('/market/info');city.value=d.city;regionName.value=d.regionName;ship.value=d.ship;cargoUsed.value=d.cargoUsed;cargoMax.value=d.cargoMax;goodsList.value=d.goodsList||[];priceHints.value=d.priceHints||[];money.value=d.money;}catch(e){msg=e.message;msgType='error';}}
async function buyGoods(g){const qty=qtyMap[g.id]||1;try{const d=await Api.post('/market/buy',{goods_id:g.id,quantity:qty});msg=d.msg;msgType='success';await load();}catch(e){msg=e.message;msgType='error';}}
async function sellGoods(g){const qty=qtyMap[g.id]||1;try{const d=await Api.post('/market/sell',{goods_id:g.id,quantity:qty});msg=d.msg;msgType='success';await load();}catch(e){msg=e.message;msgType='error';}}
onMounted(load);
</script>
