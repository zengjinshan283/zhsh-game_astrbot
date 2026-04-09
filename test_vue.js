const puppeteer = require('puppeteer');
const http = require('http');

function api(method, path, body) {
  return new Promise((res, rej) => {
    const d = body ? JSON.stringify(body) : null;
    const r = http.request({hostname:'127.0.0.1',port:3000,path,method,headers:{'Content-Type':'application/json'}}, resp => {
      let b=''; resp.on('data',c=>b+=c); resp.on('end',()=>{try{res(JSON.parse(b))}catch(e){res({raw:b})}});
    });
    r.on('error',rej); if(d) r.write(d); r.end();
  });
}

(async () => {
  // Get token
  const tokenResp = await api('POST', '/api/auth/login', {username:'testnpc01',password:'test1234'});
  if (!tokenResp.token) { console.log('Login fail'); process.exit(1); }
  console.log('Token OK');
  
  const browser = await puppeteer.launch({headless: 'new', args: ['--no-sandbox', '--disable-web-security']});
  const page = await browser.newPage();
  await page.setViewport({width: 375, height: 812});
  
  await page.goto('http://127.0.0.1:3001/', {waitUntil: 'domcontentloaded'});
  await page.evaluate((t) => { localStorage.setItem('zhsh_token', t); }, tokenResp.token);
  await page.goto('http://127.0.0.1:3001/', {waitUntil: 'networkidle2'});
  await new Promise(r => setTimeout(r, 800));
  
  console.log('URL:', page.url());
  await page.waitForSelector('.scene-npc-row', {timeout: 5000}).catch(() => {});
  const npcRows = await page.$$('.scene-npc-row');
  console.log('NPCs found:', npcRows.length);
  
  if (npcRows.length === 0) {
    const text = await page.evaluate(() => document.body?.innerText?.substring(0, 200));
    console.log('Page:', text);
    await page.screenshot({path: '/tmp/vue_no_npc.png'});
    await browser.close(); process.exit(0);
  }
  
  const info = await npcRows[0].evaluate(el => ({
    name: el.querySelector('.npc-name-text')?.textContent,
    action: el.querySelector('.npc-action')?.textContent,
  }));
  console.log('Clicking:', JSON.stringify(info));
  
  // Step 1: Preview
  await npcRows[0].click();
  await new Promise(r => setTimeout(r, 600));
  
  const p = await page.evaluate(() => ({
    active: !!document.querySelector('.modal-overlay.active'),
    title: document.querySelector('.modal-title')?.textContent,
    subtitle: document.querySelector('.modal-subtitle')?.textContent,
    dialog: document.querySelector('.modal-dialog')?.textContent?.substring(0, 80),
    actionBtn: document.querySelector('.modal-btn-primary')?.textContent,
    questArea: document.getElementById('npcQuestArea')?.textContent?.trim() || 'NONE',
  }));
  console.log('Step1 Preview:', JSON.stringify(p));
  await page.screenshot({path: '/tmp/vue_preview.png'});
  
  if (p.actionBtn) {
    await page.click('.modal-btn-primary');
    await new Promise(r => setTimeout(r, 600));
    
    const c = await page.evaluate(() => ({
      title: document.querySelector('.modal-title')?.textContent,
      bubbles: document.querySelectorAll('.chat-bubble').length,
      b0: document.querySelector('.chat-bubble')?.textContent?.substring(0, 80),
      b1: document.querySelectorAll('.chat-bubble')[1]?.textContent?.substring(0, 80) || 'NONE',
      tabs: !!document.querySelector('.chat-tabs'),
      nextBtn: !!document.querySelector('.chat-next-btn'),
      badge: document.querySelector('.chat-tab-badge')?.textContent || 'NONE',
    }));
    console.log('Step2 Chat:', JSON.stringify(c));
    await page.screenshot({path: '/tmp/vue_chat.png'});
    
    if (c.nextBtn) {
      await page.click('.chat-next-btn');
      await new Promise(r => setTimeout(r, 300));
      const after = await page.evaluate(() => {
        const all = document.querySelectorAll('.chat-bubble');
        return {count: all.length, last: all[all.length-1]?.textContent?.substring(0, 60)};
      });
      console.log('Step3 Topic switch:', JSON.stringify(after));
    }
    
    // Quest tab
    await page.evaluate(() => {
      document.querySelectorAll('.chat-tab-btn').forEach(t => { if(t.getAttribute('data-tab')==='quest') t.click(); });
    });
    await new Promise(r => setTimeout(r, 300));
    const qt = await page.evaluate(() => {
      const panels = document.querySelectorAll('.chat-panel');
      for (const p of panels) { if (p.style.display !== 'none') return p.textContent.substring(0, 150); }
      return 'EMPTY';
    });
    console.log('Step4 Quest tab:', qt);
  }
  
  await browser.close();
  console.log('DONE');
})();
