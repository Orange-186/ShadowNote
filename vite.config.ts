import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages 需要子路径；本地 dev 用根路径，避免打开 localhost:5173 空白
  base: command === 'build' ? '/XS-Note/' : '/',
}))
