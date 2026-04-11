import request from './index'

export function getPlaceList(params) {
  return request.get('/places', { params })
}

export function createPlace(data) {
  return request.post('/places', data)
}

export function updatePlace(id, data) {
  return request.put(`/places/${id}`, data)
}

export function deletePlace(id) {
  return request.delete(`/places/${id}`)
}

export function searchPlaces(keyword) {
  return request.get('/places/search', { params: { keyword } })
}
