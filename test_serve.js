const express = require('express');
const path = require('path');
const app = express();
// Serve Vue dist as static
app.use(express.static(path.join(__dirname, 'client/dist')));
// Proxy API
const http = require('http');
app.use('/api', (req, res) => {
  const proxyReq = http.request({hostname:'127.0.0.1',port:3000,path:req.url,method:req.method,headers:req.headers}, proxyRes => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  req.pipe(proxyReq);
});
app.listen(3001, () => console.log('Test server on :3001'));
