import request from './index'

export function login(data) {
  return request.post('/auth/login', data)
}

export function getInfo() {
  return request.get('/auth/info')
}

export function changePassword(data) {
  return request.post('/auth/changePassword', data)
}
