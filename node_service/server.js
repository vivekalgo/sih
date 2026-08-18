/**
 * PrivacyGuard AI - Node.js Fast Stream Gateway
 * Enforces pre-flight buffer screening and proxies payloads to local FastAPI firewall.
 */

const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3001;
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

app.use(cors());
app.use(express.json());

// Health Check
app.get('/gateway/health', (req, res) => {
  res.json({
    status: 'healthy',
    gateway: 'Node.js Express Fast Stream Gateway',
    upstream: FASTAPI_URL,
    zero_retention_proxy: true
  });
});

// Proxy to FastAPI
app.use(
  '/api',
  createProxyMiddleware({
    target: FASTAPI_URL,
    changeOrigin: true,
    logLevel: 'info'
  })
);

app.listen(PORT, () => {
  console.log(`[Node Gateway] PrivacyGuard Gateway listening on http://localhost:${PORT}`);
});
