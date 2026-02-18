import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API calls to Laravel backend
      // Only proxy requests that are clearly API calls (POST/PUT/PATCH/DELETE or have JSON accept header)
      '^/(api|csrf-token|login|logout|me|services|stylists|appointments|dashboard|admin|inventory|sales|ratings|holidays|payment-accounts|locations|managers)': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Forward cookies
            if (req.headers.cookie) {
              proxyReq.setHeader('Cookie', req.headers.cookie);
            }
          });
        },
        bypass: (req, res, options) => {
          // Only proxy if it's an API call:
          // 1. POST/PUT/PATCH/DELETE methods (always API)
          // 2. GET with Accept: application/json header (API call)
          // 3. GET requests to specific API endpoints (like /csrf-token, /me)
          const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
          const hasJsonAccept = req.headers.accept?.includes('application/json');
          const isApiEndpoint = ['/csrf-token', '/me'].includes(req.url.split('?')[0]);
          
          if (isStateChanging || hasJsonAccept || isApiEndpoint) {
            // This is an API call, proxy it
            return null; // null means proxy
          }
          
          // This is likely a frontend route, don't proxy (let React Router handle it)
          return req.url;
        },
      },
    },
  },
})
