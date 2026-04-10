<template>
<div class="citymap-page">
  <div class="location-bar">
    <div class="location-name">🗺️ {{ city?.name }} - 城内地图</div>
    <div class="location-path">点击地点可快速传送</div>
  </div>
  <div class="card">
    <div class="card-title">📍 地点列表（{{ places.length }}个）</div>
    <ul class="city-places">
      <li v-for="p in places" :key="p.id">
        <a href="javascript:void(0)" @click="goto(p.id)"
           :class="{'current-place': p.id === currentPlaceId}">
          {{ placeIcon(p.type) }} {{ p.name }}
          <span v-if="p.id === currentPlaceId" class="current-tag">← 当前</span>
        </a>
      </li>
    </ul>
  </div>
  <router-link to="/map" class="btn btn-secondary btn-block mt-10">
    ← 返回地图
  </router-link>
</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Api } from '../composables/useApi';

const route = useRoute();
const router = useRouter();
const city = ref(null);
const places = ref([]);
const currentPlaceId = ref(0);

const buildings = computed(() => (places.value || []).filter(p => p.type !== 0));
const wildAreas = computed(() => (places.value || []).filter(p => p.type === 0));

function placeIcon(t) {
  if (t === 1) return '⚓';
  if (t === 2) return '⛩️';
  if (t === 3) return '🛃';
  return '🏠';
}

async function load() {
  try {
    const d = await Api.get(`/user/citymap/${route.params.cityId || ''}`);
    city.value = d.city;
    places.value = d.places || [];
    currentPlaceId.value = d.currentPlaceId || 0;
  } catch (e) {}
}

async function goto(placeId) {
  try {
    await Api.post('/user/teleport', { place_id: placeId });
    router.push('/map');
  } catch (e) {}
}

onMounted(load);
</script>

<style scoped>
.citymap-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 4px 6px;
}

.citymap-page::-webkit-scrollbar {
  width: 2px;
}
.citymap-page::-webkit-scrollbar-track {
  background: transparent;
}
.citymap-page::-webkit-scrollbar-thumb {
  background: #3a4f2e;
  border-radius: 1px;
}

.city-places {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.city-places li a {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px 4px;
  background: #1e2a1c;
  border: 1px solid #3a4f2e;
  border-radius: 4px;
  color: #f7efdb;
  text-decoration: none;
  font-size: 11px;
  text-align: center;
  transition: all 0.15s;
  gap: 2px;
}

.city-places li a:hover,
.city-places li a:active {
  border-color: #c9a758;
  color: #c9a758;
}

.city-places li a.current-place {
  border-color: #c9a758;
  color: #c9a758;
}

.current-tag {
  font-size: 10px;
  white-space: nowrap;
}
</style>
