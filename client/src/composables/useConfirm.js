import { ref } from 'vue'

const visible = ref(false)
const title = ref('')
const message = ref('')
const isConfirm = ref(true)
let resolveFn = null

function globalConfirm(msg, ttl) {
  message.value = msg
  title.value = ttl || ''
  isConfirm.value = true
  visible.value = true
  return new Promise(resolve => { resolveFn = resolve })
}

function globalAlert(msg, ttl) {
  message.value = msg
  title.value = ttl || ''
  isConfirm.value = false
  visible.value = true
  return new Promise(resolve => { resolveFn = resolve })
}

function confirmOk() {
  visible.value = false
  if (resolveFn) resolveFn(true)
  resolveFn = null
}

function confirmCancel() {
  visible.value = false
  if (resolveFn) resolveFn(false)
  resolveFn = null
}

export function useConfirm() {
  return { visible, title, message, isConfirm, confirmOk, confirmCancel }
}

export { globalConfirm, globalAlert, confirmOk, confirmCancel, visible, title, message, isConfirm }
