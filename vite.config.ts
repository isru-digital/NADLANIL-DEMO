import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base is relative to the GitHub Pages project path; override with VITE_BASE if the host changes.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/NADLANIL-DEMO/',
  plugins: [react()],
})
