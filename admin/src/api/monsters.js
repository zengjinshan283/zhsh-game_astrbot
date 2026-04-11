import request from './index'

export function getMonsterList(params) {
  return request.get('/monsters', { params })
}

export function createMonster(data) {
  return request.post('/monsters', data)
}

export function updateMonster(id, data) {
  return request.put(`/monsters/${id}`, data)
}

export function deleteMonster(id) {
  return request.delete(`/monsters/${id}`)
}
