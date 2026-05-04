const CHANNEL_NAME = 'wlnl-partner-vitals'

/**
 * 同设备多标签页间同步「伴侣」心率等；本页也可 post 做自测。
 */
export function usePartnerChannel() {
  let channel = null
  const listeners = new Set()

  function ensureChannel() {
    if (typeof BroadcastChannel === 'undefined') return null
    if (!channel) {
      channel = new BroadcastChannel(CHANNEL_NAME)
      channel.onmessage = (ev) => {
        const data = ev.data
        if (!data || typeof data !== 'object') return
        listeners.forEach((fn) => fn(data))
      }
    }
    return channel
  }

  function subscribe(handler) {
    const ch = ensureChannel()
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
      if (listeners.size === 0 && channel) {
        channel.close()
        channel = null
      }
    }
  }

  function publish(payload) {
    const ch = ensureChannel()
    ch?.postMessage(payload)
    // 多数浏览器不会把 postMessage 再投递回「发送该消息的同一上下文」，
    // 本页订阅者需要立刻收到更新，因此对本地 listeners 同步派发一次。
    listeners.forEach((fn) => fn(payload))
  }

  return { subscribe, publish }
}
