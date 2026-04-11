import request from './index'

export function getConfigList(params) {
  return request.get('/configs', { params })
}

export function getAllConfigs() {
  return request.get('/configs/all')
}

export function createConfig(data) {
  return request.post('/configs', data)
}

export function updateConfig(id, data) {
  return request.put(`/configs/${id}`, data)
}

export function deleteConfig(id) {
  return request.delete(`/configs/${id}`)
}
