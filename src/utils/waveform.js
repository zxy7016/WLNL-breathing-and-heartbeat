/** 呼吸：慢正弦，breathsPerMinute 次/分钟 */
export function sampleBreathing(tSec, breathsPerMinute = 14) {
  const period = 60 / breathsPerMinute
  return Math.sin((2 * Math.PI * tSec) / period)
}

/**
 * 简化 ECG：每个心动周期内一段基线 + QRS 尖峰 + 回落
 * hrBpm: 每分钟心跳数
 */
export function sampleHeartbeat(tSec, hrBpm) {
  const bpm = Math.max(36, Math.min(200, hrBpm))
  const period = 60 / bpm
  const p = (tSec % period) / period
  let v = 0
  if (p < 0.12) {
    const x = p / 0.12
    v += 0.15 * Math.sin(Math.PI * x) * Math.sin(Math.PI * x)
  }
  if (p >= 0.14 && p < 0.22) {
    const x = (p - 0.14) / 0.08
    v += 1.2 * Math.exp(-((x - 0.35) ** 2) / 0.02)
  }
  if (p >= 0.22 && p < 0.32) {
    const x = (p - 0.22) / 0.1
    v -= 0.35 * Math.sin(Math.PI * x)
  }
  if (p >= 0.34 && p < 0.5) {
    const x = (p - 0.34) / 0.16
    v += 0.08 * Math.sin(Math.PI * x)
  }
  return v
}
