const express = require('./server/node_modules/express');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer');

function apiReq(method, urlPath, body) {
  return new Promise((res, rej) => {
    const d = body ? JSON.stringify(body) : null;
    const r = http.request({hostname:'127.0.0.1',port:3000,path:urlPath,method,headers:{'Content-Type':'application/json'}}, resp => {
      let b=''; resp.on('data',c=>b+=c); resp.on('end',()=>{try{res(JSON.parse(b))}catch(e){res({raw:b.substring(0,100)})}});
    });
    r.on('error',rej); if(d) r.write(d); r.end();
  });
}

(async () => {
  const tokenResp = await apiReq('POST', '/api/auth/login', {username:'testnpc01',password:'test1234'});
  if (!tokenResp.token) { console.log('Login fail:', JSON.stringify(tokenResp)); process.exit(1); }
  console.log('Token OK');
  
  const app = express();
  // API proxy MUST be before static and catch-all
  app.all('/api/*', (req, res) => {
    const r = http.request({hostname:'127.0.0.1',port:3000,path:req.url,method:req.method,headers:{...req.headers}}, pr => {
      res.writeHead(pr.statusCode, pr.headers); pr.pipe(res);
    });
    req.pipe(r);
  });
  app.use(express.static(path.join(__dirname, 'client/dist')));
  app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'client/dist/index.html')); });
  
  await new Promise((resolve) => app.listen(3099, resolve));
  console.log('Test server on :3099');
  
  // Verify API proxy works
  const meResp = await apiReq('GET', '/api/user/me', null);
  console.log('/api/user/me status: meResp has token?', !!meResp.token);
  
  const browser = await puppeteer.launch({headless:'new', args:['--no-sandbox','--disable-web-security']});
  const page = await browser.newPage();
  await page.setViewport({width:375, height:812});
  
  // Collect console errors
  page.on('console', msg => { if(msg.type()==='error') console.log('PAGE_ERR:', msg.text()); });
  page.on('requestfailed', req => console.log('REQ_FAIL:', req.url()));
  
  await page.goto('http://127.0.0.1:3099/', {waitUntil:'domcontentloaded'});
  await page.evaluate((t) => { localStorage.setItem('zhsh_token', t); }, tokenResp.token);
  await page.goto('http://127.0.0.1:3099/map', {waitUntil:'networkidle2', timeout:10000});
  await new Promise(r => setTimeout(r, 1500));
  console.log('URL:', page.url());
  
  await page.waitForSelector('.scene-npc-row', {timeout:5000}).catch(()=>{});
  const npcRows = await page.$$('.scene-npc-row');
  console.log('NPCs:', npcRows.length);
  
  if (npcRows.length === 0) {
    const text = await page.evaluate(() => document.body?.innerText?.substring(0,300));
    console.log('Page:', text);
    await page.screenshot({path:'/tmp/vue_no_npc.png'});
    await browser.close(); app.close(); process.exit(1);
  }
  
  for (let i = 0; i < npcRows.length; i++) {
    const n = await npcRows[i].evaluate(el => ({
      name: el.querySelector('.npc-name-text')?.textContent,
      action: el.querySelector('.npc-action')?.textContent,
    }));
    console.log('  NPC'+i+':', JSON.stringify(n));
  }
  
  // Step 1: Preview
  await npcRows[0].click();
  await new Promise(r => setTimeout(r, 700));
  const p = await page.evaluate(() => ({
    active: !!document.querySelector('.modal-overlay.active'),
    title: document.querySelector('.modal-title')?.textContent,
    subtitle: document.querySelector('.modal-subtitle')?.textContent,
    dialog: document.querySelector('.modal-dialog')?.textContent?.substring(0,80),
    actionBtn: document.querySelector('.modal-btn-primary')?.textContent,
    questArea: document.getElementById('npcQuestArea')?.textContent?.trim() || 'NONE',
  }));
  console.log('Step1 Preview:', JSON.stringify(p));
  await page.screenshot({path:'/tmp/vue_preview.png'});
  
  if (!p.actionBtn) { await browser.close(); app.close(); process.exit(0); }
  
  // Step 2: Chat
  await page.click('.modal-btn-primary');
  await new Promise(r => setTimeout(r, 700));
  const c = await page.evaluate(() => ({
    title: document.querySelector('.modal-title')?.textContent,
    bubbles: document.querySelectorAll('.chat-bubble').length,
    b0: document.querySelector('.chat-bubble')?.textContent?.substring(0,80),
    b1: document.querySelectorAll('.chat-bubble')[1]?.textContent?.substring(0,80) || 'NONE',
    tabs: !!document.querySelector('.chat-tabs'),
    nextBtn: !!document.querySelector('.chat-next-btn'),
    badge: document.querySelector('.chat-tab-badge')?.textContent || 'NONE',
  }));
  console.log('Step2 Chat:', JSON.stringify(c));
  await page.screenshot({path:'/tmp/vue_chat.png'});
  
  if (c.nextBtn) {
    await page.click('.chat-next-btn');
    await new Promise(r => setTimeout(r, 300));
    const after = await page.evaluate(() => {
      const all = document.querySelectorAll('.chat-bubble');
      return {count:all.length, last:all[all.length-1]?.textContent?.substring(0,60)};
    });
    console.log('Step3 Topic:', JSON.stringify(after));
  }
  
  await page.evaluate(() => {
    document.querySelectorAll('.chat-tab-btn').forEach(t => { if(t.getAttribute('data-tab')==='quest') t.click(); });
  });
  await new Promise(r => setTimeout(r, 300));
  const qt = await page.evaluate(() => {
    const panels = document.querySelectorAll('.chat-panel');
    for (const p of panels) { if(p.style.display !== 'none') return p.textContent.substring(0,150); }
    return 'EMPTY';
  });
  console.log('Step4 Quest:', qt);
  
  app.close();
  await browser.close();
  console.log('\nDONE');
})();
