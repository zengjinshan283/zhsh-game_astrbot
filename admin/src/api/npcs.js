import request from './index'

export function getNpcList(params) {
  return request.get('/npcs', { params })
}

export function createNpc(data) {
  return request.post('/npcs', data)
}

export function updateNpc(id, data) {
  return request.put(`/npcs/${id}`, data)
}

export function deleteNpc(id) {
  return request.delete(`/npcs/${id}`)
}

export function getNpcDialogs(npcId) {
  return request.get(`/npcs/${npcId}/dialogs`)
}

export function createNpcDialog(npcId, data) {
  return request.post(`/npcs/${npcId}/dialogs`, data)
}

export function updateNpcDialog(dialogId, data) {
  return request.put(`/npcs/dialogs/${dialogId}`, data)
}

export function deleteNpcDialog(dialogId) {
  return request.delete(`/npcs/dialogs/${dialogId}`)
}

export function searchNpcs(keyword) {
  return request.get('/npcs/search', { params: { keyword } })
}
