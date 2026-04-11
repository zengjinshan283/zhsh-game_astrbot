import request from './index'

export function getMapList(params) {
  return request.get('/maps', { params })
}

export function createMap(data) {
  return request.post('/maps', data)
}

export function updateMap(id, data) {
  return request.put(`/maps/${id}`, data)
}

export function deleteMap(id) {
  return request.delete(`/maps/${id}`)
}
