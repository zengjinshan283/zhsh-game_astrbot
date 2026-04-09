import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGameStore = defineStore('game', () => {
  const scene = ref(null);
  const inBattle = ref(false);
  const battleData = ref(null);
  const onlineCount = ref(0);

  function setScene(data) { scene.value = data; }
  function setBattle(data) { inBattle.value = true; battleData.value = data; }
  function clearBattle() { inBattle.value = false; battleData.value = null; }
  function setOnlineCount(n) { onlineCount.value = n; }

  return { scene, inBattle, battleData, onlineCount, setScene, setBattle, clearBattle, setOnlineCount };
});
