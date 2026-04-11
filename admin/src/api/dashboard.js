import request from './index'

export function getStats() {
  return request.get('/dashboard/stats')
}

export function getExtraStats() {
  return request.get('/dashboard/extra-stats')
}

export function getRecentLogs() {
  return request.get('/dashboard/recent-logs')
}

export function getPlayerTrend(days = 7) {
  return request.get('/dashboard/playerTrend', { params: { days } })
}

export function getRecentPlayers() {
  return request.get('/dashboard/recentPlayers')
}
