/**
 * 通用格式化工具函数
 * 所有 views 应从此文件导入，避免重复定义
 */

export function formatMoney(n) {
  if (!n) return '0';
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return n.toLocaleString();
}

export function formatDate(unixTs) {
  if (!unixTs) return '—';
  return new Date(unixTs * 1000).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

export function formatDuration(seconds) {
  if (!seconds) return '0秒';
  if (seconds >= 3600) return Math.floor(seconds / 3600) + '小时' + Math.floor((seconds % 3600) / 60) + '分钟';
  if (seconds >= 60) return Math.floor(seconds / 60) + '分' + (seconds % 60) + '秒';
  return seconds + '秒';
}