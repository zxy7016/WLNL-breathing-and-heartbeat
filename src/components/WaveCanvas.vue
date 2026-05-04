<template>
  <canvas ref="canvasRef" class="wave" width="900" height="220" />
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'

/** 相邻两列在「信号时间」上的间隔（秒），与原先整屏重算时一致 */
const SAMPLE_STEP = 1 / 60

const props = defineProps({
  sampleFn: { type: Function, required: true },
  stroke: { type: String, default: '#58a6ff' },
  glow: { type: String, default: 'rgba(88, 166, 255, 0.35)' },
  grid: { type: Boolean, default: true },
})

const canvasRef = ref(null)
const SAMPLE_COUNT = 480

let raf = 0
let buffer = new Float32Array(SAMPLE_COUNT)
let primed = false
let tRight = 0
let accum = 0
let lastNow = 0

function primeBuffer() {
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const t = -(SAMPLE_COUNT - 1 - i) * SAMPLE_STEP
    buffer[i] = props.sampleFn(t)
  }
  tRight = 0
  accum = 0
  primed = true
}

function loop() {
  const el = canvasRef.value
  if (!el) return
  const ctx = el.getContext('2d')
  const w = el.width
  const h = el.height
  const now = performance.now() / 1000
  if (!primed) {
    lastNow = now
    primeBuffer()
  }

  const dt = now - lastNow
  lastNow = now
  accum += dt

  while (accum >= SAMPLE_STEP) {
    accum -= SAMPLE_STEP
    tRight += SAMPLE_STEP
    buffer.copyWithin(0, 1)
    buffer[SAMPLE_COUNT - 1] = props.sampleFn(tRight)
  }

  const step = w / SAMPLE_COUNT
  ctx.fillStyle = 'rgba(13, 17, 23, 0.25)'
  ctx.fillRect(0, 0, w, h)

  if (props.grid) {
    ctx.strokeStyle = 'rgba(230, 237, 243, 0.06)'
    ctx.lineWidth = 1
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
  }

  ctx.beginPath()
  const mid = h * 0.52
  const scaleY = h * 0.38
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const yv = buffer[i]
    const x = i * step
    const y = mid - yv * scaleY
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = props.stroke
  ctx.shadowColor = props.glow
  ctx.shadowBlur = 12
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.shadowBlur = 0

  raf = requestAnimationFrame(loop)
}

onMounted(() => {
  raf = requestAnimationFrame(loop)
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
})

watch(
  () => props.sampleFn,
  () => {
    primed = false
  }
)
</script>

<style scoped>
.wave {
  width: 100%;
  height: auto;
  max-height: 240px;
  display: block;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(22, 27, 34, 0.9) 0%, rgba(13, 17, 23, 0.95) 100%);
  border: 1px solid rgba(230, 237, 243, 0.08);
}
</style>
