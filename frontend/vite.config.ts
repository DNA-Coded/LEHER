import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, type Plugin } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function earthRoutePlugin(): Plugin {
  return {
    name: 'earth-route-plugin',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url) {
          const url = new URL(req.url, 'http://localhost');
          if (url.pathname === '/earth' || url.pathname === '/earth/') {
            req.url = '/earth/index.html' + url.search + url.hash;
          }
          if (url.pathname === '/globe' || url.pathname === '/globe/') {
            req.url = '/globe/index.html' + url.search + url.hash;
          }
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), earthRoutePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json']
  },
})
