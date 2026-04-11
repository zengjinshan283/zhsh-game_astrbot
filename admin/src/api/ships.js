import request from './index'

export function getShipList(params) {
  return request.get('/ships', { params })
}

export function createShip(data) {
  return request.post('/ships', data)
}

export function updateShip(id, data) {
  return request.put(`/ships/${id}`, data)
}

export function deleteShip(id) {
  return request.delete(`/ships/${id}`)
}

export function getShipOwners(id) {
  return request.get(`/ships/${id}/owners`)
}

export function getShipSailPreview(id) {
  return request.get(`/ships/${id}/sail-preview`)
}
