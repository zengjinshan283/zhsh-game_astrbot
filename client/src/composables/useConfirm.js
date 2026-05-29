import { ref } from 'vue'

const visible = ref(false)
const title = ref('')
const message = ref('')
const isConfirm = ref(true)
const confirmExtraOpts = ref(null)
let resolveFn = null

function globalConfirm(msg, ttl, extraOpts) {
  message.value = msg
  title.value = ttl || ''
  isConfirm.value = true
  visible.value = true
  confirmExtraOpts.value = extraOpts || null
  return new Promise(resolve => { resolveFn = resolve })
}

function globalAlert(msg, ttl) {
  message.value = msg
  title.value = ttl || ''
  isConfirm.value = false
  visible.value = true
  confirmExtraOpts.value = null
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
  return { visible, title, message, isConfirm, confirmExtraOpts, confirmOk, confirmCancel }
}

export { globalConfirm, globalAlert, confirmOk, confirmCancel, visible, title, message, isConfirm, confirmExtraOpts }
