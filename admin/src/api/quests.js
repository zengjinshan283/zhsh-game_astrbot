import request from './index'

export function getQuestList(params) {
  return request.get('/quests', { params })
}

export function createQuest(data) {
  return request.post('/quests', data)
}

export function updateQuest(id, data) {
  return request.put(`/quests/${id}`, data)
}

export function deleteQuest(id) {
  return request.delete(`/quests/${id}`)
}

export function searchQuests(keyword) {
  return request.get('/quests/search', { params: { keyword } })
}

export function getQuestTree() {
  return request.get('/quests/tree')
}
