const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[PROXY] ${req.method} ${req.url} -> http://localhost:3000${req.url}`);
        
        // Forward Authorization header if present
        if (req.headers.authorization) {
          proxyReq.setHeader('Authorization', req.headers.authorization);
          console.log(`[PROXY] Forwarded Authorization header`);
        }
      }
    })
  );
  
  app.use(
    '/images',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
    })
  );
};