import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/WLNL-breathing-and-heartbeat/', // 必须以 / 开头和结尾
  plugins: [vue()],
})

