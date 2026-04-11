import request from './index'

export function getLogs(params) {
  return request.get('/logs', { params })
}

export function getChangelogs(params) {
  return request.get('/changelogs', { params })
}

export function getAdminList() {
  return request.get('/logs/admins')
}
