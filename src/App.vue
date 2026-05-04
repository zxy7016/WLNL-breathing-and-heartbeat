<template>
  <div class="page">
    <header class="hero">
      <h1>呼吸 · 心跳</h1>
      <p class="lead">本地模拟波形；订阅后可实时同步伴侣心率并刷新心跳曲线。</p>
    </header>

    <section class="card">
      <div class="card-head">
        <h2>呼吸</h2>
        <label class="field">
          <span>频率</span>
          <input v-model.number="myBreathsPerMin" type="range" min="8" max="22" step="1" />
          <output>{{ myBreathsPerMin }} 次/分</output>
        </label>
      </div>
      <WaveCanvas :sample-fn="breathSample" stroke="#3fb950" glow="rgba(63, 185, 80, 0.4)" />
    </section>

    <section class="card">
      <div class="card-head">
        <h2>我的心跳</h2>
        <label class="field">
          <span>BPM</span>
          <input v-model.number="myHeartBpm" type="range" min="48" max="160" step="1" />
          <output>{{ myHeartBpm }}</output>
        </label>
      </div>
      <WaveCanvas :sample-fn="myHeartSample" stroke="#58a6ff" glow="rgba(88, 166, 255, 0.45)" />
    </section>

    <section class="card partner">
      <div class="card-head">
        <div>
          <h2>伴侣心跳</h2>
          <p class="sub">{{ partnerHint }}</p>
        </div>
        <div class="actions">
          <button type="button" :class="{ on: subscribed }" @click="toggleSubscribe">
            {{ subscribed ? '已订阅' : '订阅伴侣数据' }}
          </button>
          <div class="push-group">
            <button type="button" class="ghost" @click="pushDemoPartnerVitals('manual')">手动推送 1 条</button>
          </div>
          <div class="push-group">
            <button type="button" :class="{ on: simulatingPartner }" @click="togglePartnerSimulator">
              {{ simulatingPartner ? '停止自动推送' : `每 ${AUTO_INTERVAL_MS / 1000}s 自动推送` }}
            </button>
          </div>
        </div>
        <p v-if="pushLog" class="push-log">{{ pushLog }}</p>
      </div>
      <div v-if="subscribed" class="partner-body">
        <div class="stat">
          <span class="label">当前 BPM</span>
          <strong>{{ partnerBpm }}</strong>
        </div>
        <WaveCanvas :sample-fn="partnerHeartSample" stroke="#f778ba" glow="rgba(247, 120, 186, 0.45)" />
      </div>
      <div v-else class="placeholder">订阅后显示伴侣心跳波形</div>
    </section>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue'
import WaveCanvas from './components/WaveCanvas.vue'
import { usePartnerChannel } from './composables/usePartnerChannel.js'
import { sampleBreathing, sampleHeartbeat } from './utils/waveform.js'

const { subscribe, publish } = usePartnerChannel()

const myBreathsPerMin = ref(14)
const myHeartBpm = ref(72)

const subscribed = ref(false)
const partnerBpm = ref(68)
const partnerOnline = ref(false)
let unsub = null

function onPartnerMessage(data) {
  if (data.type === 'vitals' && typeof data.bpm === 'number') {
    partnerBpm.value = data.bpm
    partnerOnline.value = true
  }
}

function toggleSubscribe() {
  subscribed.value = !subscribed.value
  if (subscribed.value) {
    unsub = subscribe(onPartnerMessage)
  } else {
    unsub?.()
    unsub = null
    partnerOnline.value = false
  }
}

onUnmounted(() => {
  unsub?.()
})

const breathSample = (t) => sampleBreathing(t, myBreathsPerMin.value)
const myHeartSample = (t) => sampleHeartbeat(t, myHeartBpm.value)
const partnerHeartSample = (t) => sampleHeartbeat(t, partnerBpm.value)

const pushLog = ref('')
const autoPushCount = ref(0)

/** @param {'manual' | 'auto'} source */
function pushDemoPartnerVitals(source = 'manual') {
  const bpm = Math.round(58 + Math.random() * 42)
  publish({ type: 'vitals', bpm })
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  if (source === 'manual') {
    pushLog.value = `手动：本次发 1 条 → BPM ${bpm}（${time}）`
  } else {
    autoPushCount.value += 1
    pushLog.value = `自动：约每 2 秒 1 条，已累计 ${autoPushCount.value} 条 → 最近 BPM ${bpm}（${time}）`
  }
}

const AUTO_INTERVAL_MS = 2000

let simTimer = null
const simulatingPartner = ref(false)

function togglePartnerSimulator() {
  simulatingPartner.value = !simulatingPartner.value
  if (simTimer) {
    clearInterval(simTimer)
    simTimer = null
  }
  if (simulatingPartner.value) {
    autoPushCount.value = 0
    pushDemoPartnerVitals('auto')
    simTimer = setInterval(() => {
      pushDemoPartnerVitals('auto')
    }, AUTO_INTERVAL_MS)
  } else {
    pushLog.value = pushLog.value ? `${pushLog.value} · 已停止自动` : ''
  }
}

onUnmounted(() => {
  if (simTimer) clearInterval(simTimer)
})

const partnerHint = computed(() => {
  if (!subscribed.value) return '开启后将接收同浏览器其他标签页或本页的模拟推送。'
  if (partnerOnline.value) {
    return '已收到数据。手动 = 点一次发一条；自动 = 定时连续发，BPM 数字会规律跳动，日志区可区分。'
  }
  return '等待数据中… 订阅后可用手动/自动模拟，或另开标签页发送。'
})
</script>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
}

.hero {
  margin-bottom: 1.75rem;
}

.hero h1 {
  margin: 0 0 0.35rem;
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 650;
  letter-spacing: -0.02em;
}

.lead {
  margin: 0;
  color: #8b949e;
  font-size: 0.95rem;
  line-height: 1.5;
}

.card {
  margin-bottom: 1.25rem;
  padding: 1.1rem 1.25rem 1.25rem;
  border-radius: 14px;
  background: rgba(22, 27, 34, 0.55);
  border: 1px solid rgba(230, 237, 243, 0.08);
  backdrop-filter: blur(8px);
}

.card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

.card-head h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #8b949e;
}

.field input[type='range'] {
  width: min(200px, 42vw);
  accent-color: #58a6ff;
}

.field output {
  min-width: 4.5rem;
  color: #e6edf3;
  font-variant-numeric: tabular-nums;
}

.partner .card-head {
  align-items: flex-start;
}

.sub {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  color: #8b949e;
  max-width: 52ch;
  line-height: 1.45;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.75rem 1rem;
}

.push-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  max-width: 200px;
}

.push-hint {
  font-size: 0.72rem;
  line-height: 1.35;
  color: #6e7681;
}

.push-log {
  margin: 0.65rem 0 0;
  padding: 0.5rem 0.65rem;
  font-size: 0.78rem;
  line-height: 1.45;
  color: #c9d1d9;
  background: rgba(240, 246, 252, 0.04);
  border-radius: 8px;
  border: 1px solid rgba(230, 237, 243, 0.08);
  font-variant-numeric: tabular-nums;
}

button {
  cursor: pointer;
  border: 1px solid rgba(230, 237, 243, 0.18);
  background: rgba(240, 246, 252, 0.06);
  color: #e6edf3;
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  font-size: 0.85rem;
}

button:hover {
  background: rgba(240, 246, 252, 0.1);
}

button.on {
  border-color: #f778ba;
  background: rgba(247, 120, 186, 0.12);
  color: #ffd7e8;
}

button.ghost {
  border-style: dashed;
}

.partner-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.stat {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  font-size: 0.9rem;
}

.stat .label {
  color: #8b949e;
}

.stat strong {
  font-size: 1.35rem;
  font-variant-numeric: tabular-nums;
  color: #f778ba;
}

.placeholder {
  padding: 2rem 1rem;
  text-align: center;
  color: #6e7681;
  font-size: 0.9rem;
  border-radius: 12px;
  border: 1px dashed rgba(230, 237, 243, 0.12);
}
</style>
