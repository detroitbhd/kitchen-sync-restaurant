import { ref, computed } from 'vue'

export function useOrderTimers(globalPrepTime: any) {
  const hasOverdueOrders = ref(false)
  const currentTime = ref<string>('')
  let clockInterval: any = null
  let timerInterval: any = null

  const updateClock = () => {
    const d = new Date()
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    currentTime.value = `${hh}:${mm}`
  }

  const computeRemainingSeconds = (order: any) => {
    try {
      const createdMs = order.createdAt ?? (order.created_at ? new Date(order.created_at).getTime() : Date.now())
      const elapsedSec = Math.floor((Date.now() - createdMs) / 1000)
      const baseSec = (globalPrepTime.value ?? 10) * 60
      const extraMin = Number(order.additional_prep_time ?? order.prep_time ?? 0) || 0
      const totalAllowed = baseSec + (extraMin * 60)
      return Math.max(0, totalAllowed - elapsedSec)
    } catch {
      return 0
    }
  }

  const canonicalizeStatus = (status: any) => {
    const raw = (status || '').toString().trim().toUpperCase()
    if (!raw) return 'PENDING'
    if (raw.includes('ACCEP') || raw === 'ACCEPTED' || raw === 'ACCEPTEE' || raw === 'ACCEPTE') return 'ACCEPTED'
    if (raw.includes('PRET') || raw.includes('PRÊT') || raw.includes('READY') || raw.includes('PRÊTE')) return 'READY'
    if (raw.includes('CLOS') || raw.includes('FERM') || raw.includes('CLOT')) return 'CLOSED'
    if (raw.includes('NOUV') || raw.includes('NEW') || raw.includes('NUEV') || raw.includes('NOVA')) return 'PENDING'
    if (['PENDING','ACCEPTED','READY','CLOSED'].includes(raw)) return raw
    return 'PENDING'
  }

  const formatCountdown = (seconds: number) => {
    const s = Math.max(0, Math.floor(Number(seconds) || 0))
    if (s === 0) return 'Ready'
    if (s < 60) return '1 min'
    const minutes = Math.floor(s / 60)
    return `${minutes} min`
  }

  const updateTimers = (orders: any[], setOrders: (orders: any[]) => void) => {
    const now = Date.now()
    let foundOverdue = false
    
    const updatedOrders = orders.map((order: any) => {
      const status = canonicalizeStatus(order.status)
      if (status === 'PENDING' || status === 'ACCEPTED') {
        const createdMs = order.createdAt || (order.created_at ? new Date(order.created_at).getTime() : Date.now())
        const elapsedSeconds = Math.floor((now - createdMs) / 1000)
        const baseSeconds = (globalPrepTime.value || 10) * 60
        const extraMinutes = Number(order.additional_prep_time ?? order.prep_time ?? 0) || 0
        const totalAllowedSeconds = baseSeconds + (extraMinutes * 60)
        const remainingSeconds = Math.max(0, totalAllowedSeconds - elapsedSeconds)
        const isWarning = remainingSeconds === 0 && status !== 'READY'
        
        if (isWarning) foundOverdue = true

        const mins = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')
        const secs = (elapsedSeconds % 60).toString().padStart(2, '0')

        return {
          ...order,
          countdownSeconds: remainingSeconds,
          isWarning: isWarning,
          elapsedTime: `${mins}:${secs}`
        }
      }
      return order
    })
    
    setOrders(updatedOrders)
    hasOverdueOrders.value = foundOverdue
  }

  const startTimers = () => {
    try {
      updateClock()
      if (clockInterval) { clearInterval(clockInterval); clockInterval = null }
      clockInterval = setInterval(updateClock, 15_000)
    } catch (e) {}
  }

  const startOrderTimers = (orders: any[], setOrders: (orders: any[]) => void) => {
    try {
      updateTimers(orders, setOrders)
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
      timerInterval = setInterval(() => {
        try { updateTimers(orders, setOrders) } catch {}
      }, 1000)
    } catch (e) {}
  }

  const stopTimers = () => {
    try { if (clockInterval) { clearInterval(clockInterval); clockInterval = null } } catch {}
    try { if (timerInterval) { clearInterval(timerInterval); timerInterval = null } } catch {}
  }

  return {
    currentTime,
    hasOverdueOrders,
    computeRemainingSeconds,
    canonicalizeStatus,
    formatCountdown,
    updateTimers,
    startTimers,
    startOrderTimers,
    stopTimers
  }
}