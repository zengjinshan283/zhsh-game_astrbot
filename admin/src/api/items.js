import request from './index'

export function getItemList(params) {
  return request.get('/items', { params })
}

export function createItem(data) {
  return request.post('/items', data)
}

export function updateItem(id, data) {
  return request.put(`/items/${id}`, data)
}

export function deleteItem(id) {
  return request.delete(`/items/${id}`)
}

export function searchItems(keyword) {
  return request.get('/items/search', { params: { keyword } })
}
