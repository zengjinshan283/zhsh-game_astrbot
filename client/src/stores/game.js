import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGameStore = defineStore('game', () => {
  const scene = ref(null);
  const inBattle = ref(false);
  const battleData = ref(null);
  const onlineCount = ref(0);
  const npcDialog = ref(null); // { npcId, placeName }

  function setScene(data) { scene.value = data; }
  function setBattle(data) { inBattle.value = true; battleData.value = data; }
  function clearBattle() { inBattle.value = false; battleData.value = null; }
  function setOnlineCount(n) { onlineCount.value = n; }
  function showNpcDialog(npcId, placeName) { npcDialog.value = { npcId, placeName }; }
  function closeNpcDialog() { npcDialog.value = null; }

  return { scene, inBattle, battleData, onlineCount, npcDialog, setScene, setBattle, clearBattle, setOnlineCount, showNpcDialog, closeNpcDialog };
});
