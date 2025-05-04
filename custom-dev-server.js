/**
 * Custom development server script that bypasses host checks
 * This script starts the application with more relaxed security settings for development
 */

import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  try {
    console.log('Starting custom Vite development server with relaxed host checks...');

    // Create Vite server with custom configuration
    const server = await createServer({
      // Use default vite.config.js/ts but override some options
      configFile: path.resolve(__dirname, 'vite.config.ts'),

      // Override specific options for development
      server: {
        port: 3000,
        strictPort: false,
        host: '0.0.0.0', // Allow connections from all hosts
        hmr: {
          port: 24678,
          host: '0.0.0.0'
        },
        proxy: {
          // Proxy API requests to backend server
          '/api': {
            target: 'http://0.0.0.0:3001',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path,
            onProxyReq: (proxyReq, req, res) => {
              console.log('Proxying request to:', req.url);
            },
            onProxyRes: (proxyRes, req, res) => {
              console.log('Received response from API server:', proxyRes.statusCode);
            }
          }
        },
        cors: {
          origin: ['*', 'https://0aa26b5c-e96a-4180-9ef2-54af0241b5ae-00-3p71wf260pg3u.spock.replit.dev']
        },
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
        }
      },

      // Other dev-friendly options
      clearScreen: false,

      // Apply various optimizations
      optimizeDeps: {
        force: true
      }
    });

    // Start the server
    await server.listen();

    // Log URLs
    server.printUrls();

    console.log('Development server started successfully with relaxed host validation');
    console.log('Remember to access API endpoints via the proxy at http://localhost:3000/api/...');

  } catch (error) {
    console.error('Failed to start custom development server:', error);
    process.exit(1);
  }
}

// Start server when this script is run directly
startServer();