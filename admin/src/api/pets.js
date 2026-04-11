import request from './index'

export function getPetList(params) {
  return request.get('/pets', { params })
}

export function createPet(data) {
  return request.post('/pets', data)
}

export function updatePet(id, data) {
  return request.put(`/pets/${id}`, data)
}

export function deletePet(id) {
  return request.delete(`/pets/${id}`)
}

export function getPetOwners(id) {
  return request.get(`/pets/${id}/owners`)
}
