import request from './index'

export function getEnumGroups() {
  return request.get('/enums/groups')
}

export function getEnumsByGroup(groupName) {
  return request.get(`/enums/group/${groupName}`)
}

export function getEnumList(params) {
  return request.get('/enums', { params })
}

export function createEnum(data) {
  return request.post('/enums', data)
}

export function updateEnum(id, data) {
  return request.put(`/enums/${id}`, data)
}

export function deleteEnum(id) {
  return request.delete(`/enums/${id}`)
}
