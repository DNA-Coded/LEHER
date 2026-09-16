import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import cesiumPlugin from 'vite-plugin-cesium'

const cesium = (cesiumPlugin as unknown as { default?: (options?: unknown) => Plugin }).default || (cesiumPlugin as unknown as (options?: unknown) => Plugin)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cesium()],
})


