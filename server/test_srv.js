const express=require('express'),path=require('path'),http=require('http'),fs=require('fs'),app=express();
app.use(express.static(path.join(__dirname,'../client/dist')));
app.use('/api',(req,res)=>{
  const r=http.request({hostname:'127.0.0.1',port:3000,path:req.url,method:req.method,headers:{...req.headers}},pr=>{res.writeHead(pr.statusCode,pr.headers);pr.pipe(res)});
  req.pipe(r);
});
app.get('*',(req,res)=>{res.sendFile(path.join(__dirname,'../client/dist/index.html'))});
app.listen(3001,()=>console.log('TestSrv on 3001'));
