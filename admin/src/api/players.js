import request from './index'

export function getPlayerList(params) {
  return request.get('/players', { params })
}

export function getPlayerDetail(id) {
  return request.get(`/players/${id}`)
}

export function updatePlayer(id, data) {
  return request.put(`/players/${id}`, data)
}

export function banPlayer(id) {
  return request.post(`/players/${id}/ban`)
}

export function unbanPlayer(id) {
  return request.post(`/players/${id}/unban`)
}

export function kickPlayer(id) {
  return request.post(`/players/${id}/kick`)
}

export function resetPlayerPassword(id) {
  return request.post(`/players/${id}/reset-password`)
}

export function sendPlayerMessage(id, message) {
  return request.post(`/players/${id}/message`, { message })
}
