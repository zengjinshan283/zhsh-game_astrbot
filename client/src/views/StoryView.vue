<template>
<div class="story-page">
  <div class="story-bg-layer"></div>

  <div class="story-content">
    <!-- Top HUD -->
    <div class="top-hud">
      <h1 class="game-title">{{ stories[step].title }}</h1>
      <div class="progress-info">STEP {{ step }} / 7</div>
    </div>

    <!-- Progress Bar -->
    <div class="progress-bar">
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: (step / 7 * 100) + '%' }"></div>
      </div>
    </div>

    <!-- Story Box -->
    <div class="story-box">
      <p class="story-text">{{ stories[step].text }}</p>
      <p class="story-bg" v-if="stories[step].bg">{{ stories[step].bg }}</p>
    </div>

    <!-- Action Buttons -->
    <div class="btn-group">
      <button v-if="step > 1" class="btn btn-secondary" @click="step--">← 上一页</button>
      <button class="btn btn-primary" :class="{ 'btn-full': step <= 1 }" @click="next">
        {{ step >= 7 ? '⚓ 进入游戏' : '继续 →' }}
      </button>
    </div>

    <!-- Skip Link -->
    <a href="javascript:void(0)" @click.prevent="skip" class="skip-link">跳过剧情 →</a>
  </div>
</div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
const step = ref(1);
const stories = {
  1: { title: '序章：威尼斯的黎明', text: '1453年的春天，威尼斯的清晨笼罩在一层薄薄的雾气中。圣马可广场的钟声在远处回荡，运河上已有船只开始忙碌起来。', bg: '你站在威尼斯酒店门口，海风带着咸味拂过你的面庞。昨夜，你做了一个决定——成为一名航海冒险者。' },
  2: { title: '第一幕：远方的消息', text: '"听说了吗？君士坦丁堡陷落了！"酒店里，一个水手激动地拍着桌子。', bg: '奥斯曼帝国的军队攻破了拜占庭帝国的首都，东西方贸易路线被彻底切断。从此，通往东方的香料、丝绸和瓷器变得无比珍贵……' },
  3: { title: '第二幕：航海家的号召', text: '威尼斯总督府发布了告示：招募勇敢的航海家，开辟新的贸易航线！丰厚报酬，荣耀加身！', bg: '你站在告示牌前，心跳加速。这就是你等待已久的机会。你决定从地中海出发，寻找通往东方的新航路。' },
  4: { title: '第三幕：启程准备', text: '你走进了威尼斯的铁匠铺，挑选了一把结实的木剑。又到商店买了几瓶回复药，为即将到来的冒险做好了准备。', bg: '"年轻人，大海是残酷的，但也是最公平的。"老铁匠看着你，眼中闪过一丝赞赏。"祝你好运，孩子。"' },
  5: { title: '第四幕：地中海的召唤', text: '你来到了威尼斯的码头，无数帆船停泊在海湾中。地中海的海水在阳光下闪耀着金色的光芒。', bg: '从这里出发，你可以前往里斯本、伦敦、北非的港口……也可以沿着古老的贸易路线，向东航行到亚历山大和大和伊斯坦布尔。' },
  6: { title: '第五幕：未知的旅途', text: '大海的深处隐藏着无数的宝藏和危险——海盗、风暴、神秘的岛屿……但同样也有无尽的荣耀和财富等待着你。', bg: '你深吸一口气，感受着海风的气息。纵横四海的冒险，从今天开始！' },
  7: { title: '尾声：新的开始', text: '你回到了威尼斯酒店，这里将是你的起点。走出酒店，去探索这个广阔的世界吧！', bg: '威尼斯城中有许多可以去的地方——广场、商店、铁匠铺、码头……城外还有森林、荒野等着你去冒险。祝你一路顺风，年轻的冒险者！' }
};
function next(){ if(step.value>=7)router.push('/map');else step.value++; }
function skip(){ router.push('/map'); }
</script>

<style scoped>
.story-page {
  position: fixed;
  inset: 0;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  box-sizing: border-box;
}

.story-bg-layer {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: linear-gradient(135deg, #0d1117 0%, #1a2a3a 100%);
  backdrop-filter: blur(10px);
}

.story-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.top-hud {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.game-title {
  font-size: 16px;
  font-weight: 600;
  color: #f0f0f0;
  margin: 0;
}

.progress-info {
  font-size: 12px;
  color: #7f8c8d;
  font-weight: 500;
}

.progress-bar {
  width: 100%;
}

.progress-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1a4a2a, #27ae60);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.story-box {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(201, 167, 88, 0.3);
  border-radius: 12px;
  padding: 16px;
  backdrop-filter: blur(10px);
}

.story-text {
  font-size: 16px;
  line-height: 1.8;
  color: #e0d8c8;
  margin: 0 0 12px 0;
}

.story-bg {
  font-size: 13px;
  font-style: italic;
  color: #95a5a6;
  margin: 0;
  line-height: 1.6;
}

.btn-group {
  display: flex;
  gap: 8px;
}

.btn {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.btn:hover {
  opacity: 0.9;
}

.btn-primary {
  background: linear-gradient(135deg, #1a4a2a, #27ae60);
  color: #ffffff;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #bdc3c7;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.btn-full {
  flex: unset;
  width: 100%;
}

.skip-link {
  display: block;
  text-align: right;
  font-size: 12px;
  color: #7f8c8d;
  text-decoration: none;
  padding: 4px 0;
  transition: color 0.2s ease;
}

.skip-link:hover {
  color: #bdc3c7;
}
</style>