<template>
<div class="map-page" :class="'scene-type-'+scenePlaceType" v-if="scene">
  <!-- 动态背景层 -->
  <div class="scene-bg-layer"></div>
  <!-- 粒子装饰层 -->
  <div class="particles-layer">
    <span v-for="(p,i) in particles" :key="i" class="particle" :style="p.style">{{ p.char }}</span>
  </div>

  <!-- 顶部浮动状态栏 HUD -->
  <div class="hud-bar">
    <div class="hud-left">
      <div class="hud-stat">
        <div class="hud-icon">❤️</div>
        <div class="hud-bars">
          <div class="hud-bar-track">
            <div class="hud-bar-fill hp-fill" :style="{width: hpPct+'%'}"></div>
          </div>
          <span class="hud-num">{{ user.hp }}/{{ user.hp_max }}</span>
        </div>
      </div>
      <div class="hud-stat">
        <div class="hud-icon">⭐</div>
        <div class="hud-bars">
          <div class="hud-bar-track">
            <div class="hud-bar-fill exp-fill" :style="{width: expPct+'%'}"></div>
          </div>
          <span class="hud-num">{{ user.exp }}/{{ user.exp_max }}</span>
        </div>
      </div>
    </div>
    <div class="hud-right">
      <div class="hud-stat hud-money">
        <div class="hud-icon">💰</div>
        <span class="hud-num">{{ formatMoney(user.money) }}</span>
      </div>
      <div class="hud-stat" v-if="user.gold>0">
        <div class="hud-icon">🪙</div>
        <span class="hud-num gold">{{ user.gold }}</span>
      </div>
    </div>
  </div>

  <!-- 任务提示横幅 -->
  <div class="quest-banner" v-if="claimableQuests > 0">
    <span class="banner-icon">🎉</span>
    <span class="banner-text"><strong>{{ claimableQuests }}</strong>个任务可领奖！</span>
    <router-link to="/quest" class="banner-btn">去领取 →</router-link>
  </div>

  <!-- 主场景面板 -->
  <div class="scene-main-card">
    <div class="scene-title-row">
      <span class="scene-icon-lg">{{ sceneEmoji }}</span>
      <div class="scene-name-group">
        <div class="scene-name">{{ scene.place.name }}</div>
        <div class="scene-sub" v-if="scene.city">{{ scene.city.name }}</div>
      </div>
      <button class="btn-refresh" @click="loadScene" title="刷新">🔄</button>
    </div>
    <div class="scene-desc-box">
      <template v-if="scene.place.notice">{{ scene.place.notice }}</template>
      <span v-else class="empty-hint">四周一片安静，没有什么特别之处。</span>
    </div>
    <div class="scene-action-btns">
      <router-link v-if="hasMarketNpc" to="/market" class="sc-btn sc-btn-market">🏪 进入市场</router-link>
      <router-link v-if="scene.place.type === 1" to="/sail" class="sc-btn sc-btn-sail">⛵ 航海</router-link>
    </div>
  </div>

  <!-- 怪物 & NPC 双栏网格 -->
  <div class="entities-grid" v-if="scene.monsters.length || scene.npcs.length">
    <!-- 怪物区 -->
    <div class="entity-col" v-if="scene.monsters.length">
      <div class="col-header">
        <span>👹 怪物</span>
        <span class="col-count">{{ scene.monsters.length }}</span>
      </div>
      <div class="entity-cards">
        <div v-for="m in scene.monsters" :key="m.id" class="entity-card monster-card" @click="openMonster(m)">
          <div class="ec-avatar">{{ getMonsterEmoji(m.atk_min) }}</div>
          <div class="ec-info">
            <div class="ec-name" :style="{color: dangerColor(m.hp)}">{{ m.name }}</div>
            <div class="ec-meta">
              <span class="ec-hp">❤️ {{ m.hp }}</span>
              <span class="ec-danger" :style="{color: dangerColor(m.hp)}">{{ dangerLabel(m.hp) }}</span>
            </div>
          </div>
          <div class="ec-action">⚔️</div>
        </div>
      </div>
    </div>
    <!-- 分隔线 -->
    <div class="col-divider" v-if="scene.monsters.length && scene.npcs.length"></div>
    <!-- NPC区 -->
    <div class="entity-col" v-if="scene.npcs.length">
      <div class="col-header">
        <span>👤 NPC</span>
        <span class="col-count">{{ scene.npcs.length }}</span>
      </div>
      <div class="entity-cards">
        <div v-for="n in scene.npcs" :key="n.id" class="entity-card npc-card" @click="openPreview(n)">
          <div class="ec-avatar npc-av" :class="npcTypeClass(n.type)">{{ npcIcon(n.type) }}</div>
          <div class="ec-info">
            <div class="ec-name" :style="{color: npcColor(n.type)}">{{ n.name }}</div>
            <div class="ec-meta">
              <span class="ec-type-label">{{ getNpcActionLabel(n.type) }}</span>
            </div>
          </div>
          <div class="ec-action">›</div>
        </div>
      </div>
    </div>
  </div>

  <!-- 附近玩家 -->
  <div class="nearby-bar">
    <div class="nearby-label">👥 附近 {{ scene.onlineUsers.length }} 人在线</div>
    <div class="nearby-scroll">
      <template v-if="scene.onlineUsers.length">
        <a v-for="p in scene.onlineUsers" :key="p.id" class="nearby-chip" href="javascript:void(0)" @click.prevent="viewPlayer(p.id)">
          <span class="chip-sex">{{ p.sex === 2 ? '♀' : '♂' }}</span>
          <span class="chip-name">{{ p.username }}</span>
          <span class="chip-lv">Lv.{{ p.level }}</span>
        </a>
      </template>
      <span v-else class="nearby-empty">附近暂无其他冒险者</span>
    </div>
  </div>

  <!-- 圆形罗盘导航 -->
  <div class="compass-wrap">
    <div class="compass-rose">
      <div class="cr-center">
        <div class="cr-dot"></div>
      </div>
      <!-- 北 -->
      <div class="cr-dir cr-n">
        <a v-if="scene.exits.n" href="javascript:void(0)" class="cr-btn" @click.prevent="move('n')">
          <div class="cr-arrow">⬆️</div>
          <div class="cr-name">{{ scene.exits.n.name }}</div>
        </a>
        <div v-else class="cr-btn cr-empty">—</div>
      </div>
      <!-- 东 -->
      <div class="cr-dir cr-e">
        <a v-if="scene.exits.e" href="javascript:void(0)" class="cr-btn" @click.prevent="move('e')">
          <div class="cr-arrow">➡️</div>
          <div class="cr-name">{{ scene.exits.e.name }}</div>
        </a>
        <div v-else class="cr-btn cr-empty">—</div>
      </div>
      <!-- 南 -->
      <div class="cr-dir cr-s">
        <a v-if="scene.exits.s" href="javascript:void(0)" class="cr-btn" @click.prevent="move('s')">
          <div class="cr-arrow">⬇️</div>
          <div class="cr-name">{{ scene.exits.s.name }}</div>
        </a>
        <div v-else class="cr-btn cr-empty">—</div>
      </div>
      <!-- 西 -->
      <div class="cr-dir cr-w">
        <a v-if="scene.exits.w" href="javascript:void(0)" class="cr-btn" @click.prevent="move('w')">
          <div class="cr-arrow">⬅️</div>
          <div class="cr-name">{{ scene.exits.w.name }}</div>
        </a>
        <div v-else class="cr-btn cr-empty">—</div>
      </div>
      <!-- 中心刷新 -->
      <div class="cr-refresh" @click="loadScene">🔄</div>
    </div>
    <div class="move-error-msg" v-if="moveError">⚠️ {{ moveError }}</div>
  </div>

  <!-- 右下角 Mini 小地图 -->
  <div class="mini-map" v-if="scene.city">
    <div class="mm-title">🏛️ {{ scene.city.name }}</div>
    <div class="mm-grid">
      <div class="mm-cell mm-n" @click.prevent="move('n')">
        <span v-if="scene.exits.n" class="mm-dir">⬆️</span>
        <span v-else class="mm-none">·</span>
      </div>
      <div class="mm-cell mm-w" @click.prevent="move('w')">
        <span v-if="scene.exits.w" class="mm-dir">⬅️</span>
        <span v-else class="mm-none">·</span>
      </div>
      <div class="mm-cell mm-center">
        <div class="mm-pin">📍</div>
        <div class="mm-here">{{ scene.place.name.substring(0,4) }}</div>
      </div>
      <div class="mm-cell mm-e" @click.prevent="move('e')">
        <span v-if="scene.exits.e" class="mm-dir">➡️</span>
        <span v-else class="mm-none">·</span>
      </div>
      <div class="mm-cell mm-s" @click.prevent="move('s')">
        <span v-if="scene.exits.s" class="mm-dir">⬇️</span>
        <span v-else class="mm-none">·</span>
      </div>
    </div>
    <router-link v-if="scene.city" :to="'/citymap/' + scene.city.id" class="mm-city-btn">进城</router-link>
  </div>

  <!-- 城市入口按钮（右上角浮动） -->
  <router-link v-if="scene.city && scene.city.type === 1" :to="'/citymap/' + scene.city.id" class="float-city-btn">
    🏛️ 进入城市
  </router-link>

  <Teleport to="body">
  <!-- Toast -->
  <div class="map-toast" :class="{active:toastVisible}">
    <span style="font-size:22px;margin-right:8px;">{{ msgIcon }}</span>
    <span :style="{color:msgColor,fontSize:'14px',fontWeight:'600'}">{{ msgText }}</span>
  </div>
  <div class="modal-overlay" :class="{active: modal}" @click.self="closeModal" v-if="modal">
    <!-- NPC预览弹窗 -->
    <div class="modal-card" v-if="modalType==='preview' && previewNpc">
      <div class="modal-header">
        <div class="modal-avatar" :style="'background:'+previewBg+';border:2px solid '+npcColor(previewNpc.type)">{{ npcIcon(previewNpc.type) }}</div>
        <div><div class="modal-title" :style="{color: npcColor(previewNpc.type)}">{{ previewNpc.name }}</div>
        <div class="modal-subtitle">{{ getNpcActionLabel(previewNpc.type) }}</div></div>
      </div>
      <div class="modal-body">
        <div class="modal-dialog" v-if="previewNpc.dialog">{{ previewNpc.dialog }}</div>
        <div id="npcQuestArea" v-if="previewNpc.quest_count > 0" style="margin-top:6px;text-align:center;">
          <a href="javascript:void(0)" @click.prevent="previewOpenQuests" style="display:inline-block;background:linear-gradient(135deg,#5f4a31,#4a3a28);color:#fff;padding:6px 16px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;cursor:pointer;">📋 任务({{ previewNpc.quest_count }})</a>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-primary" @click="handleNpcAction(previewNpc)">{{ getNpcActionLabel(previewNpc.type) }}</button>
        <a href="javascript:void(0)" class="modal-btn modal-btn-close" @click.prevent="closeModal">关闭</a>
      </div>
    </div>

    <!-- 任务弹窗 -->
    <div class="modal-overlay-2" v-if="modalType==='questList'" @click.self="backToPreview">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-avatar" style="background:rgba(95,74,49,0.15);border:2px solid #5f4a31;">📋</div>
          <div><div class="modal-title" style="color:#5f4a31;">{{ previewNpc?.name }} · 任务</div>
          <div class="modal-subtitle">任务接取与奖励领取</div></div>
        </div>
        <div class="modal-body" style="max-height:60vh;overflow-y:auto;-webkit-overflow-scrolling:touch;">
          <div v-if="previewAvailableQuests.length">
            <div style="font-size:12px;font-weight:600;color:#2e5a3b;margin-bottom:6px;">📋 可接任务</div>
            <div v-for="q in previewAvailableQuests" :key="'pa-'+q.id" style="background:rgba(46,90,59,0.06);border:1px solid rgba(46,90,59,0.15);border-radius:8px;padding:8px 10px;margin-bottom:6px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:13px;font-weight:600;">{{ q.name }}</span>
                <span style="font-size:10px;color:#7a6848;">Lv.{{ q.lv||'?' }}</span>
              </div>
              <div style="font-size:11px;color:#8b784e;margin:3px 0;">{{ q.desc||'' }}</div>
              <div style="font-size:10px;color:#6f5632;">🎁 {{ q.reward||'' }}</div>
              <button @click="acceptQuest(q.id)" style="margin-top:6px;background:linear-gradient(135deg,#2e5a3b,#253b21);color:#fff;border:none;padding:6px 16px;border-radius:6px;font-size:12px;cursor:pointer;width:100%;">✅ 接取任务</button>
            </div>
          </div>
          <div v-if="previewActiveQuests.length">
            <div style="font-size:12px;font-weight:600;color:#c9a758;margin-bottom:6px;" :style="previewAvailableQuests.length?'margin-top:10px;':''">🔄 进行中</div>
            <div v-for="q in previewActiveQuests" :key="'pb-'+q.id" :style="'background:'+(q.status==1?'rgba(46,90,59,0.08)':'rgba(169,119,78,0.06)')+';border:1px solid '+(q.status==1?'rgba(46,90,59,0.2)':'rgba(169,119,78,0.12)')+';border-radius:8px;padding:8px 10px;margin-bottom:6px;'">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:13px;">{{ q.status==1?'✅':'🔄' }} {{ q.name }}</span>
                <span style="font-size:11px;" :style="{color:q.status==1?'#2e5a3b':'#c9a758'}">{{ q.status==1?'已完成':q.progress+'/'+q.require_value }}</span>
              </div>
              <div v-if="q.status!=1" style="background:#2a3525;border-radius:4px;height:6px;margin-top:6px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#c9a758,#8b6843);height:100%;" :style="{width:Math.min(100,Math.round(q.progress/Math.max(1,q.require_value)*100))+'%'}"></div>
              </div>
              <div v-if="q.status==1" style="margin-top:6px;text-align:center;color:#2e5a3b;font-size:12px;font-weight:600;">✅ 可在任务页面领取奖励</div>
            </div>
          </div>
          <div v-if="!previewAvailableQuests.length && !previewActiveQuests.length" style="text-align:center;padding:20px;color:#8b784e;">暂无任务</div>
        </div>
        <div class="modal-footer"><a href="javascript:void(0)" class="modal-btn modal-btn-close" @click.prevent="backToPreview">返回</a></div>
      </div>
    </div>

    <!-- 怪物弹窗 -->
    <div class="modal-card" v-if="modalType==='monster' && modalData">
      <div class="modal-header">
        <div class="modal-avatar" style="background:rgba(115,40,28,0.12);border:2px solid #73281c">👹</div>
        <div><div class="modal-title" :style="{color:dangerColor(modalData.hp)}">{{ modalData.name }}</div>
        <div class="modal-subtitle" :style="{color:dangerColor(modalData.hp)}">{{ dangerLabel(modalData.hp) }}</div></div>
      </div>
      <div class="modal-body">
        <div class="modal-dialog" v-if="modalData.description">{{ modalData.description }}</div>
        <div class="modal-stats">
          <div class="modal-stat"><span class="modal-stat-label">❤️ 生命</span><span class="modal-stat-val">{{ modalData.hp }}</span></div>
          <div class="modal-stat"><span class="modal-stat-label">⚔️ 攻击</span><span class="modal-stat-val">{{ modalData.atk_min }}-{{ modalData.atk_max }}</span></div>
          <div class="modal-stat"><span class="modal-stat-label">🛡️ 防御</span><span class="modal-stat-val">{{ modalData.def }}</span></div>
          <div class="modal-stat"><span class="modal-stat-label">✨ 经验</span><span class="modal-stat-val">{{ modalData.exp_reward }}</span></div>
          <div class="modal-stat"><span class="modal-stat-label">💰 铜币</span><span class="modal-stat-val">{{ modalData.money_reward_min }}-{{ modalData.money_reward_max }}</span></div>
        </div>
      </div>
      <div class="modal-footer">
        <a href="javascript:void(0)" class="modal-btn modal-btn-danger" @click.prevent="fight(modalData)">⚔️ 战斗</a>
        <a href="javascript:void(0)" class="modal-btn modal-btn-close" @click.prevent="closeModal">关闭</a>
      </div>
    </div>

    <!-- NPC交谈弹窗 -->
    <div class="modal-card" v-if="modalType==='chat'">
      <div class="modal-header">
        <div class="modal-avatar" style="background:rgba(63,106,74,0.12);border:2px solid #3f6a4a">💬</div>
        <div><div class="modal-title" style="color:#3f6a4a;">{{ chatNpcName }}</div>
        <div class="modal-subtitle">NPC对话</div></div>
      </div>
      <div class="modal-body">
          <div class="chat-bubbles" ref="chatBubblesRef">
            <div class="chat-bubble npc-bubble">
              <div class="bubble-name">{{ chatNpcName }}</div>
              <div class="bubble-text">「{{ chatDialog }}」</div>
            </div>
            <div v-if="chatDefaultChat" class="chat-bubble npc-bubble">
              <div class="bubble-text small">💬 {{ chatDefaultChat }}</div>
            </div>
            <div v-for="(topic,i) in chatUsedTopics" :key="'used-'+i" class="chat-bubble npc-bubble">
              <div class="bubble-text">💬 {{ topic.text }}</div>
            </div>
          </div>
          <div style="text-align:center;padding:8px 0 4px;">
            <button v-if="chatTopics.length>0" @click="chatNextTopic" class="chat-next-btn">🎲 换个话题</button>
            <div v-else style="font-size:10px;color:#8b784e;">暂无更多话题</div>
          </div>
      </div>
      <div class="modal-footer"><a href="javascript:void(0)" class="modal-btn modal-btn-close" @click.prevent="closeModal">关闭</a></div>
    </div>

    <!-- 商店弹窗 -->
    <div class="modal-card" v-if="modalType==='shop'">
      <div class="modal-header">
        <div class="modal-avatar" style="background:rgba(169,119,78,0.12);border:2px solid #c9a758">🏪</div>
        <div><div class="modal-title" style="color:#c9a758">{{ shopNpcName }} · 商店</div>
        <div class="modal-subtitle">💰 {{ formatMoney(user.money) }} 铜</div></div>
      </div>
      <div class="modal-body" style="max-height:50vh;overflow-y:auto;">
        <div v-if="!shopItems.length" style="text-align:center;padding:20px;color:#8b784e;">这个商人暂时没有货物出售</div>
        <div v-for="item in shopItems" :key="item.id" class="shop-item">
          <div class="shop-item-info">
            <div class="shop-item-name">{{ itemIcon(item) }} {{ item.name }} <span v-if="item.level_req>1" class="level-req">Lv.{{ item.level_req }}</span></div>
            <div class="shop-item-desc">{{ item.description }} {{ itemStats(item) }}</div>
            <div class="shop-item-price">{{ formatMoney(item.price_buy) }} 铜</div>
          </div>
          <div class="shop-item-action">
            <div class="qty-control">
              <button @click="shopQty[item.id]=Math.max(1,(shopQty[item.id]||1)-1)">-</button>
              <input type="number" :value="shopQty[item.id]||1" @input="shopQty[item.id]=Math.max(1,$event.target.value*1||1)" min="1" max="99">
              <button @click="shopQty[item.id]=Math.min(99,(shopQty[item.id]||1)+1)">+</button>
            </div>
            <button class="btn-buy" @click="buyItem(item)">购买</button>
          </div>
        </div>
      </div>
      <div class="modal-footer"><a href="javascript:void(0)" class="modal-btn modal-btn-close" @click.prevent="closeModal">返回</a></div>
    </div>

    <!-- 铁匠铺弹窗 -->
    <div class="modal-card" v-if="modalType==='smith'">
      <div class="modal-header">
        <div class="modal-avatar" style="background:rgba(111,86,50,0.12);border:2px solid #6f5632">⚒️</div>
        <div><div class="modal-title" style="color:#6f5632">{{ smithNpcName }} · 铁匠铺</div>
        <div class="modal-subtitle">💰 {{ formatMoney(user.money) }} 铜</div></div>
      </div>
      <div class="modal-body">
        <div style="font-size:10px;color:#cfc19e;padding:4px 8px;background:rgba(111,86,50,0.06);border:1px solid rgba(111,86,50,0.15);border-radius:6px;margin-bottom:6px;">
          +1~5成功率<span style="color:#2e5a3b;">90%</span> · +6~8<span style="color:#6f5632;">70%</span> · +9~10<span style="color:#b85a3a;">30%</span> · ⚠️+7以上失败<span style="color:#b85a3a;">降级</span> · 💰费用=(等级+1)×200
        </div>
        <div v-if="!smithItems.length" style="text-align:center;padding:20px;color:#8b784e;">背包中没有可强化的装备</div>
        <div v-for="item in smithItems" :key="item.inv_id" style="padding:6px 10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;margin-bottom:4px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:12px;color:#f7efdb;font-weight:600;">{{ item.subtype==='weapon'?'🗡️':'🛡️' }} {{ item.name }} <span v-if="item.enhance_level>0" style="font-weight:bold;">+{{ item.enhance_level }}</span></span>
            <span style="font-size:10px;color:#cfc19e;">
              <template v-if="item.atk>0">⚔️{{ item.atk }}→{{ item.eff_atk }}</template>
              <template v-if="item.def_val>0">🛡️{{ item.def_val }}→{{ item.eff_def }}</template>
            </span>
          </div>
          <div v-if="item.is_max" style="margin-top:4px;">
            <span style="color:#c9a758;font-size:11px;font-weight:bold;">👑 已满级</span>
          </div>
          <div v-else>
            <div style="font-size:10px;color:#cfc19e;margin-top:2px;">💰{{ item.cost }}铜 · 成功率<span :style="{color:item.rate>=70?'#2e5a3b':'#b85a3a'}">{{ item.rate }}%</span></div>
            <button @click="smithEnhance(item)" style="background:rgba(111,86,50,0.15);border:1px solid rgba(111,86,50,0.3);color:#6f5632;padding:4px 12px;font-size:11px;border-radius:4px;cursor:pointer;margin-top:4px;">⚒️ 强化</button>
          </div>
        </div>
      </div>
      <div class="modal-footer"><a href="javascript:void(0)" class="modal-btn modal-btn-close" @click.prevent="closeModal">返回</a></div>
    </div>

    <!-- 银行弹窗 -->
    <div class="modal-card" v-if="modalType==='bank'">
      <div class="modal-header">
        <div class="modal-avatar" style="background:rgba(46,90,59,0.12);border:2px solid #2e5a3b">🏦</div>
        <div><div class="modal-title" style="color:#2e5a3b">{{ bankNpcName }} · 银行</div>
        <div class="modal-subtitle">最安全的资金保管</div></div>
      </div>
      <div class="modal-body">
        <div class="bank-summary">
          <div><div class="bank-label">携带</div><div class="bank-val gold">{{ formatMoney(bankData.money) }}</div></div>
          <div><div class="bank-label">存款</div><div class="bank-val green">{{ formatMoney(bankData.bank_money) }}</div></div>
          <div><div class="bank-label">总资产</div><div class="bank-val gold big">{{ formatMoney(bankData.money + bankData.bank_money) }}</div></div>
        </div>
        <div class="bank-section">
          <div class="bank-title">💰 存款</div>
          <div class="bank-row">
            <input type="number" v-model.number="depositAmt" min="1" placeholder="金额" class="bank-input">
            <button class="btn-bank green" @click="bankDeposit">存入</button>
          </div>
          <div class="bank-quick">
            <button @click="bankQuickDeposit(Math.floor(bankData.money*0.5))">存50%</button>
            <button @click="bankQuickDeposit(bankData.money)">全存</button>
          </div>
        </div>
        <div class="bank-section">
          <div class="bank-title">💰 取款</div>
          <div class="bank-row">
            <input type="number" v-model.number="withdrawAmt" min="1" placeholder="金额" class="bank-input">
            <button class="btn-bank gold" @click="bankWithdraw">取出</button>
          </div>
          <div class="bank-quick">
            <button @click="bankQuickWithdraw(Math.floor(bankData.bank_money*0.5))">取50%</button>
            <button @click="bankQuickWithdraw(bankData.bank_money)">全取</button>
          </div>
        </div>
        <div style="padding:4px 8px;background:rgba(63,106,74,0.06);border:1px solid rgba(63,106,74,0.15);border-radius:6px;margin-top:6px;">
          <div style="font-size:10px;color:#3f6a4a;">💡 战斗失败损失5%携带铜币，建议多余铜币存入银行</div>
        </div>
      </div>
      <div class="modal-footer"><a href="javascript:void(0)" class="modal-btn modal-btn-close" @click.prevent="closeModal">返回</a></div>
    </div>

    <!-- 赌场弹窗 -->
    <div class="modal-card" v-if="modalType==='casino'">
      <div class="modal-header">
        <div class="modal-avatar" style="background:rgba(115,40,28,0.12);border:2px solid #73281c">🎰</div>
        <div><div class="modal-title" style="color:#73281c">{{ casinoNpcName }} · 赌场</div>
        <div class="modal-subtitle">{{ casinoInfo }}</div></div>
      </div>
      <div class="modal-body">
        <div style="font-size:10px;color:#cfc19e;margin-bottom:8px;">🎰 两个骰子 ⚽ 小(2~6) ⚽ 大(7~12) · 猜对赢双倍</div>
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          <div @click="casinoChoice='big'" :style="'flex:1;padding:10px 0;text-align:center;border-radius:8px;font-size:15px;font-weight:bold;cursor:pointer;transition:all 0.2s;background:linear-gradient(135deg,#73281c,#5c1f15);color:#fff;border:3px solid '+(casinoChoice==='big'?'#b85a3a':'transparent')+';opacity:'+(casinoChoice==='big'?'1':'0.5')+';'">⚫ 大(7-12)</div>
          <div @click="casinoChoice='small'" :style="'flex:1;padding:10px 0;text-align:center;border-radius:8px;font-size:15px;font-weight:bold;cursor:pointer;transition:all 0.2s;background:linear-gradient(135deg,#3f6a4a,#35573f);color:#fff;border:3px solid '+(casinoChoice==='small'?'#5f8a6f':'transparent')+';opacity:'+(casinoChoice==='small'?'1':'0.5')+';'">⚫ 小(2-6)</div>
        </div>
        <div style="display:flex;gap:4px;margin-bottom:6px;">
          <input type="number" v-model.number="casinoBetAmt" min="1" :max="casinoMaxBet" placeholder="下注金额" style="flex:1;padding:6px 8px;background:rgba(0,0,0,0.2);border:1px solid rgba(169,119,78,0.2);border-radius:4px;color:#f7efdb;font-size:12px;outline:none;">
          <button @click="casinoBet" style="background:rgba(46,90,59,0.15);border:1px solid rgba(46,90,59,0.3);color:#2e5a3b;padding:6px 14px;font-size:12px;border-radius:4px;cursor:pointer;">🎰 下注</button>
        </div>
        <div style="display:flex;gap:4px;">
          <button @click="casinoQuick(100)" style="flex:1;padding:4px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;color:#cfc19e;font-size:10px;cursor:pointer;">⚡ 100</button>
          <button @click="casinoQuick(500)" style="flex:1;padding:4px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;color:#cfc19e;font-size:10px;cursor:pointer;">⚡ 500</button>
          <button @click="casinoQuick(casinoMaxBet)" style="flex:1;padding:4px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;color:#cfc19e;font-size:10px;cursor:pointer;">⚡ 全押</button>
        </div>
        <div v-if="casinoResult" style="margin-top:8px;text-align:center;padding:10px;border-radius:8px;" :style="'background:rgba('+casinoResultColor+',0.08);border:1px solid rgba('+casinoResultColor+',0.2);'">
          <div style="font-size:36px;">{{ casinoResult.dice1 }} + {{ casinoResult.dice2 }} = <span style="font-size:22px;color:#c9a758;font-weight:bold;">{{ casinoResult.total }}</span></div>
          <div style="font-size:13px;margin-top:4px;color:#cfc19e;">
            🔵 {{ casinoResult.isBig?'大':'小' }} · 你选了{{ casinoResult.choice==='big'?'大':'小' }}
            <span v-if="casinoResult.isWin" style="color:#2e5a3b;"> → 猜对了！</span>
            <span v-else style="color:#b85a3a;"> → 猜错了</span>
          </div>
        </div>
      </div>
      <div class="modal-footer"><a href="javascript:void(0)" class="modal-btn modal-btn-close" @click.prevent="closeModal">返回</a></div>
    </div>

    <!-- 消息提示弹窗 -->
    <div class="modal-card" v-if="modalType==='message'">
      <div class="modal-body" style="text-align:center;padding:24px;">
        <div style="font-size:36px;margin-bottom:8px;">{{ msgIcon }}</div>
        <div style="font-size:13px;" :style="{color:msgColor}">{{ msgText }}</div>
      </div>
      <div class="modal-footer"><a href="javascript:void(0)" class="modal-btn modal-btn-close" @click.prevent="closeModal">确定</a></div>
    </div>
  </div>
  </Teleport>
</div>
<div class="map-page" v-else style="text-align:center;padding:60px 20px;">
  <p v-if="loading" style="color:#cfc19e;">加载中...</p>
  <p v-else style="color:#b85a3a;">{{ error }}</p>
</div>
</template>

<script setup>
import { globalConfirm, globalAlert } from '../composables/useConfirm';
import { ref, computed, reactive, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useGameStore } from '../stores/game'
import { Api } from '../composables/useApi'

const router = useRouter()
const userStore = useUserStore()
const gameStore = useGameStore()
const user = computed(() => userStore.user || {})

const scene = ref(null)
const loading = ref(true)
const error = ref('')
const moveError = ref('')
const claimableQuests = ref(0)

// Modal
const modal = ref(false)
const modalType = ref('')
const modalData = ref(null)

// Preview
const previewNpc = ref(null)
const previewAvailableQuests = ref([])
const previewActiveQuests = ref([])

const previewBg = computed(() => {
  if (!previewNpc.value) return 'rgba(63,106,74,0.15)'
  const bgMap = { talk:'rgba(63,106,74,0.15)', shop:'rgba(169,119,78,0.12)',
    craft:'rgba(111,86,50,0.12)', quest:'rgba(46,90,59,0.15)', danger:'rgba(115,40,28,0.12)', bank:'rgba(46,90,59,0.15)' }
  return bgMap[npcTypeClass(previewNpc.value.type)] || bgMap.talk
})

// Shop
const shopItems = ref([])
const shopNpcName = ref('')
const shopQty = reactive({})

// Smith
const smithItems = ref([])
const smithNpcName = ref('')

// Bank
const bankData = reactive({ money: 0, bank_money: 0 })
const bankNpcName = ref('')
const depositAmt = ref('')
const withdrawAmt = ref('')

// Casino
const casinoNpcName = ref('')
const casinoInfo = ref('')
const casinoMaxBet = ref(0)
const casinoChoice = ref('')
const casinoBetAmt = ref(null)
const casinoResult = ref(null)
const casinoResultColor = ref('39,174,96')

// Chat
const chatNpcName = ref('')
const chatDialog = ref('')
const chatDefaultChat = ref('')
const chatTopics = ref([])
const chatUsedTopics = ref([])
const chatNpcId = ref(0)
const chatBubblesRef = ref(null)

// Message
const msgText = ref('')
const toastVisible = ref(false)
let toastTimer = null
const msgIcon = ref('')
const msgColor = ref('')

// Computed
const hpPct = computed(() => user.value.hp_max > 0 ? Math.round(user.value.hp / user.value.hp_max * 100) : 0)
const expPct = computed(() => user.value.exp_max > 0 ? Math.round(user.value.exp / user.value.exp_max * 100) : 0)

const scenePlaceType = computed(() => scene.value?.place?.type || 0)

const hasMarketNpc = computed(() => {
  if (!scene.value || !scene.value.place) return false
  return scene.value.place.is_market === 1
})

const sceneEmoji = computed(() => {
  if (!scene.value) return '🗺️'
  const p = scene.value.place
  if (p.type === 1) return '⚓'
  if (p.id === 1029) return '🏪'
  if (p.id === 1024) return '🏦'
  if (p.id === 1031) return '⚒️'
  if (p.id === 1013) return '🎰'
  if (p.id === 1011 || p.id === 1036) return '🍺'
  if (scene.value.monsters.length) return '🌳'
  return '🗺️'
})

// 粒子装饰
const particles = computed(() => {
  if (!scene.value) return []
  const t = scenePlaceType.value
  const sets = {
    0: ['🌳','🍃','🌿','🐾','🍂'],
    1: ['⚓','🌊','🚢','🐬','🦈'],
    2: ['🏠','🏢','🏪','🌿'],
    9: ['🏛️','📦','🏪','✨'],
  }
  const chars = sets[t] || sets[0]
  return Array.from({length: 8}, (_, i) => ({
    char: chars[i % chars.length],
    style: {
      position: 'absolute',
      fontSize: (12 + Math.random() * 16) + 'px',
      opacity: 0.15 + Math.random() * 0.25,
      top: (5 + Math.random() * 85) + '%',
      left: (5 + Math.random() * 85) + '%',
      animation: `float-particle ${6 + Math.random() * 8}s ease-in-out infinite alternate`,
      animationDelay: Math.random() * 5 + 's',
      pointerEvents: 'none',
      userSelect: 'none',
    }
  }))
})

function getMonsterEmoji(atk) {
  if (atk >= 80) return '👹'
  if (atk >= 40) return '🐺'
  return '🐾'
}

function formatMoney(n) {
  if (!n) return '0'
  if (n >= 100000000) return (n/100000000).toFixed(1)+'亿'
  if (n >= 10000) return (n/10000).toFixed(1)+'万'
  return n.toLocaleString()
}
function truncate(s, n) { return s ? s.substring(0, n) : '' }
function dangerColor(hp) { return hp >= 100 ? '#e74c3c' : hp >= 50 ? '#f39c12' : '#27ae60' }
function dangerLabel(hp) { return hp >= 100 ? '危险' : hp >= 50 ? '普通' : '较弱' }

const npcTypes = {
  icon: { 0:'💬', 1:'🏪', 2:'⚒️', 3:'🏦', 4:'🎰', 5:'📋' },
  cls: { 0:'talk', 1:'shop', 2:'craft', 3:'bank', 4:'danger', 5:'quest' },
  action: { 0:'交谈', 1:'购物', 2:'锻造', 3:'兑换', 4:'挑战', 5:'交谈' },
  color: { 0:'#3498db', 1:'#c9a758', 2:'#6f5632', 3:'#2ecc71', 4:'#e74c3c', 5:'#9b59b6' },
}
function npcIcon(t) { return npcTypes.icon[t] || '💬' }
function npcTypeClass(t) { return npcTypes.cls[t] || 'talk' }
function getNpcActionLabel(t) { return npcTypes.action[t] || '查看' }
function npcColor(t) { return npcTypes.color[t] || '#bdc3c7' }

function itemIcon(item) {
  if (item.type === 1 || item.subtype === 'weapon') return '⚔️'
  if (item.type === 2 || item.subtype === 'armor') return '🛡️'
  return '💊'
}
function itemStats(item) {
  let s = ''
  if (item.atk > 0) s += ' ⚔️+' + item.atk
  if (item.def > 0 || item.def_val > 0) s += ' 🛡️+' + (item.def || item.def_val)
  if (item.hp > 0) s += ' ❤️回' + item.hp + 'HP'
  return s
}

function viewPlayer(id) { router.push('/player/' + id) }

async function loadScene() {
  loading.value = true
  error.value = ''
  try {
    const data = await Api.get('/map/scene')
    if (data.sailing) { error.value = '正在航海中...'; return }
    scene.value = data
    gameStore.setScene(data)
    const me = await Api.get('/auth/me')
    userStore.updateUser(me.user)
    try {
      const qData = await Api.get('/quest/list')
      claimableQuests.value = qData.active ? qData.active.filter(q => q.status === 1).length : 0
    } catch(e) {}
  } catch (e) { error.value = e.message }
  finally { loading.value = false }
}

async function move(dir) {
  moveError.value = ''
  try {
    const data = await Api.post('/map/move', { dir })
    scene.value = data
    gameStore.setScene(data)
  } catch (e) { moveError.value = e.message }
}

function openModal(type, data) { modalType.value = type; modalData.value = data; modal.value = true; document.body.style.overflow = 'hidden' }
function closeModal() { modal.value = false; modalType.value = ''; modalData.value = null; previewNpc.value = null; document.body.style.overflow = '' }
function showMsg(icon, text, color) { msgIcon.value = icon; msgText.value = text; msgColor.value = color || '#f7efdb'; toastVisible.value = true; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastVisible.value = false }, 3000) }

function openMonster(m) { openModal('monster', m) }

function openPreview(npc) {
  previewNpc.value = npc
  previewAvailableQuests.value = []
  previewActiveQuests.value = []
  openModal('preview', null)
}

async function previewOpenQuests() {
  if (!previewNpc.value) return
  const npcId = previewNpc.value.id
  try {
    const data = await Api.get('/npc/' + npcId + '/chat')
    previewAvailableQuests.value = (data.available_quests || []).map(q => ({
      id: q.id, name: q.name, desc: q.desc, lv: q.level_req, reward: q.reward
    }))
    previewActiveQuests.value = (data.active_quests || []).map(q => ({
      id: q.id, name: q.name, progress: q.progress||0, require_value: q.require_value, status: q.status
    }))
    modalType.value = 'questList'
  } catch (e) { showMsg('❌', e.message, '#e74c3c') }
}

function backToPreview() {
  modalType.value = 'preview'
  if (previewNpc.value) openPreview(previewNpc.value)
}

function handleNpcAction(npc) {
  const t = npc.type
  if (t === 1) return openShop(npc)
  if (t === 2) return openSmith(npc)
  if (t === 3) return openBank(npc)
  if (t === 4) return openCasino(npc)
  return openChat(npc)
}

async function openShop(npc) {
  shopNpcName.value = npc.name
  try {
    const data = await Api.get('/npc/' + npc.id + '/shop')
    shopItems.value = data.items || []
    openModal('shop', null)
  } catch (e) { showMsg('❌', e.message, '#e74c3c') }
}

async function buyItem(item) {
  const qty = shopQty[item.id] || 1
  try {
    const npc = scene.value.npcs.find(n => n.type === 1)
    await Api.post('/npc/buy', { npc_id: npc.id, item_id: item.id, quantity: qty })
    const me = await Api.get('/auth/me')
    userStore.updateUser(me.user)
    showMsg("✅", item.name+" x"+qty+" 购买成功", "#27ae60");
    await loadScene()
  } catch (e) { showMsg('❌', e.message, '#e74c3c') }
}

async function openSmith(npc) {
  smithNpcName.value = npc.name
  try {
    const data = await Api.get('/smith/items')
    smithItems.value = data.items || []
    openModal('smith', null)
  } catch (e) { showMsg('❌', e.message, '#e74c3c') }
}

async function smithEnhance(item) {
  if(!(await globalConfirm('确定要强化吗？费用' + item.cost + '铜')))return
  try {
    const data = await Api.post('/smith/enhance', { inventory_id: item.inv_id })
    const me = await Api.get('/auth/me')
    userStore.updateUser(me.user)
    showMsg(data.ok ? '✨' : '👿', data.msg, data.ok ? '#27ae60' : '#e74c3c')
    const smith = await Api.get('/smith/items')
    smithItems.value = smith.items || []
  } catch (e) { showMsg('❌', e.message, '#e74c3c') }
}

async function openBank(npc) {
  bankNpcName.value = npc.name
  try {
    const data = await Api.get('/npc/' + npc.id + '/bank')
    bankData.money = data.money
    bankData.bank_money = data.bank_money
    openModal('bank', null)
  } catch (e) { showMsg('❌', e.message, '#e74c3c') }
}

async function bankDeposit() {
  const amt = parseInt(depositAmt.value)
  if (!amt || amt <= 0) return
  try {
    const data = await Api.post('/npc/deposit', { amount: amt })
    bankData.money = data.money; bankData.bank_money = data.bank_money; depositAmt.value = ''
    const me = await Api.get('/auth/me'); userStore.updateUser(me.user)
  } catch (e) { showMsg('❌', e.message, '#e74c3c') }
}

async function bankWithdraw() {
  const amt = parseInt(withdrawAmt.value)
  if (!amt || amt <= 0) return
  try {
    const data = await Api.post('/npc/withdraw', { amount: amt })
    bankData.money = data.money; bankData.bank_money = data.bank_money; withdrawAmt.value = ''
    const me = await Api.get('/auth/me'); userStore.updateUser(me.user)
  } catch (e) { showMsg('❌', e.message, '#e74c3c') }
}

async function bankQuickDeposit(amt) {
  if (amt <= 0) return
  try {
    const data = await Api.post('/npc/deposit', { amount: amt })
    bankData.money = data.money; bankData.bank_money = data.bank_money
    const me = await Api.get('/auth/me'); userStore.updateUser(me.user)
  } catch (e) {}
}

async function bankQuickWithdraw(amt) {
  if (amt <= 0) return
  try {
    const data = await Api.post('/npc/withdraw', { amount: amt })
    bankData.money = data.money; bankData.bank_money = data.bank_money
    const me = await Api.get('/auth/me'); userStore.updateUser(me.user)
  } catch (e) {}
}

async function openCasino(npc) {
  casinoNpcName.value = npc.name
  casinoResult.value = null
  casinoChoice.value = ''
  casinoBetAmt.value = null
  casinoMaxBet.value = Math.min(parseInt(user.value.money || 0), 10000)
  casinoInfo.value = '💰 铜币：' + formatMoney(user.value.money) + ' · 限额：10,000'
  openModal('casino', null)
}

function casinoQuick(amount) {
  if (!casinoChoice.value) casinoChoice.value = 'big'
  casinoBetAmt.value = amount
  casinoBet()
}

async function casinoBet() {
  if (!casinoChoice.value) { showMsg('⚠️', '请先选择大或小', '#f39c12'); return }
  const amount = parseInt(casinoBetAmt.value) || 0
  if (amount <= 0) return
  try {
    const data = await Api.post('/casino/bet', { amount: amount, choice: casinoChoice.value })
    if (data.ok && data.dice1) {
      casinoResult.value = data
      casinoResultColor.value = data.isWin ? '39,174,96' : '231,76,60'
      const me = await Api.get('/auth/me')
      userStore.updateUser(me.user)
      casinoMaxBet.value = Math.min(parseInt(me.user.money || 0), 10000)
      casinoInfo.value = '💰 铜币：' + formatMoney(me.user.money) + ' · 限额：10,000'
    } else {
      showMsg('❌', data.msg, '#e74c3c')
    }
  } catch (e) { showMsg('❌', e.message, '#e74c3c') }
}

async function openChat(npc) {
  chatNpcName.value = npc.name
  chatNpcId.value = npc.id
  chatDialog.value = npc.dialog || '你好，冒险者！'
  chatDefaultChat.value = ''
  chatTopics.value = []
  chatUsedTopics.value = []
  try {
    const data = await Api.get('/npc/' + npc.id + '/chat')
    if (data.ok) {
      chatDialog.value = data.dialog || npc.dialog || '你好！'
      if (data.default_chat) chatDefaultChat.value = data.default_chat.text
      chatTopics.value = data.chat_topics || []
    }
  } catch (e) {}
  openModal('chat', null)
}

function chatNextTopic() {
  const topics = chatTopics.value
  if (!topics.length) return
  const used = chatUsedTopics.value.map(t => t.key)
  let remaining = topics.filter(t => !used.includes(t.key))
  if (remaining.length === 0) { chatUsedTopics.value = []; remaining = topics }
  const pick = remaining[Math.floor(Math.random() * remaining.length)]
  chatUsedTopics.value.push(pick)
  nextTick(() => {
    if (chatBubblesRef.value) bubbles.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  })
}

async function acceptQuest(qid) {
  try {
    await Api.post('/quest/accept', { quest_id: qid })
    showMsg('✅', '任务接取成功！', '#27ae60')
    const npcId = previewNpc.value?.id || chatNpcId.value
    if (npcId) {
      const data = await Api.get('/npc/' + npcId + '/chat')
      if (data.ok) {
        previewAvailableQuests.value = (data.available_quests||[]).map(q => ({
          id:q.id, name:q.name, desc:q.description, lv:q.level_req,
          reward:'经验+'+(q.reward_exp||0)+' 铜+'+(q.reward_money||0),
          status:0, progress:0, require_value:q.require_value||0
        }))
        previewActiveQuests.value = (data.active_quests||[]).map(q => ({
          id:q.id, name:q.name, desc:q.description,
          status:q.status, progress:q.progress, require_value:q.require_value||0
        }))
      }
    }
  } catch (e) { showMsg('❌', e.message, '#e74c3c') }
}

async function fight(monster) {
  try {
    const data = await Api.post('/battle/start', { monster_id: monster.id })
    gameStore.setBattle(data)
    closeModal()
  } catch (e) { showMsg('❌', e.message, '#e74c3c') }
}

onMounted(loadScene)

watch(() => gameStore.inBattle, (val, oldVal) => {
  if (oldVal === true && val === false) loadScene()
})
</script>

<style>
@keyframes float-particle {
  0% { transform: translateY(0) rotate(0deg); }
  100% { transform: translateY(-20px) rotate(15deg); }
}

.map-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 6px;
  gap: 6px;
  background: #0d1117;
}

/* ===== 动态背景层 ===== */
.scene-bg-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  transition: background 0.6s ease;
}
.scene-type-0 .scene-bg-layer {
  background: linear-gradient(160deg, #0d1117 0%, #1a2e1a 50%, #0d1117 100%);
}
.scene-type-1 .scene-bg-layer {
  background: linear-gradient(160deg, #0d1117 0%, #0a1a2e 50%, #0d1117 100%);
}
.scene-type-2 .scene-bg-layer {
  background: linear-gradient(160deg, #0d1117 0%, #2a1a0d 50%, #0d1117 100%);
}
.scene-type-9 .scene-bg-layer {
  background: linear-gradient(160deg, #0d1117 0%, #1a1a2e 50%, #0d1117 100%);
}

/* ===== 粒子层 ===== */
.particles-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

/* ===== HUD 浮动状态栏 ===== */
.hud-bar {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(13,17,23,0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 8px 12px;
  gap: 8px;
}
.hud-left, .hud-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.hud-stat {
  display: flex;
  align-items: center;
  gap: 6px;
}
.hud-icon {
  font-size: 16px;
  line-height: 1;
}
.hud-bars {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 70px;
}
.hud-bar-track {
  height: 5px;
  background: rgba(255,255,255,0.08);
  border-radius: 3px;
  overflow: hidden;
}
.hud-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}
.hp-fill { background: linear-gradient(90deg, #e74c3c, #ff6b6b); }
.exp-fill { background: linear-gradient(90deg, #f39c12, #f1c40f); }
.hud-num {
  font-size: 10px;
  color: #bdc3c7;
  white-space: nowrap;
}
.hud-num.gold { color: #f1c40f; }

/* ===== 任务横幅 ===== */
.quest-banner {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, rgba(39,174,96,0.15), rgba(39,174,96,0.05));
  border: 1px solid rgba(39,174,96,0.3);
  border-radius: 10px;
  padding: 7px 12px;
}
.banner-icon { font-size: 18px; }
.banner-text { flex: 1; font-size: 13px; color: #a8e6cf; }
.banner-btn {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: #fff;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
}

/* ===== 场景主卡片 ===== */
.scene-main-card {
  position: relative;
  z-index: 2;
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 12px;
}
.scene-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.scene-icon-lg { font-size: 32px; line-height: 1; }
.scene-name-group { flex: 1; }
.scene-name { font-size: 17px; font-weight: 700; color: #f0f0f0; }
.scene-sub { font-size: 11px; color: #7f8c8d; margin-top: 2px; }
.btn-refresh {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  padding: 5px 8px;
  transition: background 0.2s;
}
.btn-refresh:hover { background: rgba(255,255,255,0.12); }
.scene-desc-box {
  font-size: 12px;
  color: #95a5a6;
  line-height: 1.6;
  margin-bottom: 8px;
}
.empty-hint { color: #7f8c8d; font-style: italic; }
.scene-action-btns { display: flex; gap: 8px; justify-content: center; }
.sc-btn {
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}
.sc-btn-market {
  background: rgba(201,167,88,0.12);
  border: 1px solid rgba(201,167,88,0.3);
  color: #c9a758;
}
.sc-btn-market:hover { background: rgba(201,167,88,0.2); }
.sc-btn-sail {
  background: rgba(46,90,59,0.2);
  border: 1px solid rgba(63,106,74,0.4);
  color: #5f8a6f;
}
.sc-btn-sail:hover { background: rgba(46,90,59,0.3); }

/* ===== 实体网格 ===== */
.entities-grid {
  position: relative;
  z-index: 2;
  display: flex;
  gap: 8px;
  flex: 1;
  min-height: 0;
}
.entity-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.col-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #7f8c8d;
  padding: 0 2px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.col-count {
  background: rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 1px 6px;
  font-size: 10px;
}
.col-divider {
  width: 1px;
  background: rgba(255,255,255,0.06);
  margin: 0 2px;
}
.entity-cards {
  display: flex;
  flex-direction: column;
  gap: 5px;
  overflow-y: auto;
  flex: 1;
}
.entity-card {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.entity-card:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.14);
  transform: translateX(2px);
}
.entity-card:active { transform: scale(0.98); }
.monster-card:hover { border-color: rgba(231,76,60,0.3); }
.npc-card:hover { border-color: rgba(52,152,219,0.3); }
.ec-avatar {
  font-size: 22px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.06);
  border-radius: 10px;
  flex-shrink: 0;
}
.npc-av.talk { background: rgba(52,152,219,0.12); }
.npc-av.shop { background: rgba(201,167,88,0.12); }
.npc-av.craft { background: rgba(111,86,50,0.12); }
.npc-av.bank { background: rgba(46,90,59,0.12); }
.npc-av.danger { background: rgba(115,40,28,0.12); }
.npc-av.quest { background: rgba(155,89,182,0.12); }
.ec-info { flex: 1; min-width: 0; }
.ec-name { font-size: 13px; font-weight: 600; }
.ec-meta { display: flex; gap: 6px; margin-top: 2px; font-size: 10px; color: #95a5a6; }
.ec-action { font-size: 14px; opacity: 0.5; flex-shrink: 0; }

/* ===== 附近玩家 ===== */
.nearby-bar {
  position: relative;
  z-index: 2;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 7px 10px;
}
.nearby-label { font-size: 11px; color: #7f8c8d; margin-bottom: 5px; font-weight: 600; }
.nearby-scroll { display: flex; gap: 5px; overflow-x: auto; padding-bottom: 2px; }
.nearby-scroll::-webkit-scrollbar { height: 2px; }
.nearby-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
.nearby-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 3px 8px;
  font-size: 11px;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.2s;
}
.nearby-chip:hover { background: rgba(255,255,255,0.1); }
.chip-sex { color: #e74c3c; }
.chip-name { color: #ecf0f1; }
.chip-lv { color: #7f8c8d; }
.nearby-empty { font-size: 11px; color: #555; }

/* ===== 罗盘导航 ===== */
.compass-wrap {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.compass-rose {
  position: relative;
  width: 140px;
  height: 140px;
  background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 50%;
}
.cr-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cr-dot {
  width: 8px;
  height: 8px;
  background: rgba(255,255,255,0.15);
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.2);
}
.cr-dir { position: absolute; }
.cr-n { top: 6px; left: 50%; transform: translateX(-50%); }
.cr-s { bottom: 6px; left: 50%; transform: translateX(-50%); }
.cr-e { right: 6px; top: 50%; transform: translateY(-50%); }
.cr-w { left: 6px; top: 50%; transform: translateY(-50%); }
.cr-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-decoration: none;
  transition: transform 0.15s;
}
.cr-btn:hover { transform: scale(1.1); }
.cr-btn.cr-empty { cursor: default; opacity: 0.2; }
.cr-arrow { font-size: 16px; line-height: 1; }
.cr-name { font-size: 9px; color: #bdc3c7; white-space: nowrap; max-width: 50px; overflow: hidden; text-overflow: ellipsis; text-align: center; }
.cr-refresh {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 13px;
  cursor: pointer;
  opacity: 0.4;
  transition: all 0.2s;
  padding: 6px;
}
.cr-refresh:hover { opacity: 0.8; transform: translate(-50%, -50%) rotate(180deg); }
.move-error-msg { font-size: 10px; color: #e74c3c; text-align: center; }

/* ===== Mini 小地图 ===== */
.mini-map {
  position: fixed;
  bottom: 12px;
  right: 12px;
  z-index: 3;
  background: rgba(13,17,23,0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 90px;
}
.mm-title { font-size: 9px; color: #7f8c8d; font-weight: 600; text-align: center; }
.mm-grid {
  display: grid;
  grid-template-columns: repeat(3, 22px);
  grid-template-rows: repeat(3, 22px);
  gap: 2px;
}
.mm-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.04);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.mm-cell:hover { background: rgba(255,255,255,0.1); }
.mm-center { background: rgba(39,174,96,0.15); cursor: default; }
.mm-pin { font-size: 14px; }
.mm-here { font-size: 7px; color: #27ae60; text-align: center; line-height: 1.1; }
.mm-dir { font-size: 11px; opacity: 0.7; }
.mm-none { color: rgba(255,255,255,0.15); font-size: 10px; }
.mm-city-btn {
  background: rgba(39,174,96,0.12);
  border: 1px solid rgba(39,174,96,0.25);
  color: #27ae60;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}
.mm-city-btn:hover { background: rgba(39,174,96,0.2); }

/* ===== 浮动城市入口 ===== */
.float-city-btn {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 3;
  background: rgba(39,174,96,0.15);
  border: 1px solid rgba(39,174,96,0.3);
  color: #2ecc71;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  backdrop-filter: blur(8px);
  transition: all 0.2s;
}
.float-city-btn:hover { background: rgba(39,174,96,0.25); }

/* ===== Toast ===== */
.map-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.8);
  background: rgba(20,20,30,0.95);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  pointer-events: none;
  transition: all 0.25s ease;
  z-index: 9999;
  backdrop-filter: blur(12px);
}
.map-toast.active {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
  pointer-events: auto;
}
</style>