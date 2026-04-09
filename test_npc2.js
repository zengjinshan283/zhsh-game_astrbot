const puppeteer = require('puppeteer');
const http = require('http');
const BASE = 'http://zhsh.xinanc.cn';

function apiReq(path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({hostname: 'zhsh.xinanc.cn', port: 80, path, method: body ? 'POST' : 'GET', headers: {'Content-Type':'application/json'}}, res => {
      let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve(JSON.parse(b)); } catch(e) { resolve({error:b.substring(0,100)}); }});
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  // Verify API works
  const health = await apiReq('/api/auth/login', {username:'testnpc01',password:'test1234'});
  console.log('API health:', health.token ? 'OK' : 'FAIL');
  if (!health.token) { process.exit(1); }
  
  const browser = await puppeteer.launch({headless: 'new', args: ['--no-sandbox']});
  const page = await browser.newPage();
  await page.setViewport({width: 375, height: 812});
  
  // Navigate and set token
  await page.goto(BASE + '/', {waitUntil: 'domcontentloaded', timeout: 10000});
  await page.evaluate((t) => { localStorage.setItem('zhsh_token', t); }, health.token);
  console.log('Token set, reloading...');
  
  await page.goto(BASE + '/', {waitUntil: 'networkidle2', timeout: 10000});
  await new Promise(r => setTimeout(r, 1000));
  console.log('URL:', page.url());
  
  const pageText = await page.evaluate(() => document.body?.innerText?.substring(0, 100));
  console.log('Page text:', pageText);
  
  // If 502, wait and retry
  if (pageText.includes('502')) {
    console.log('502 detected, waiting...');
    await new Promise(r => setTimeout(r, 3000));
    await page.reload({waitUntil: 'networkidle2', timeout: 10000});
    await new Promise(r => setTimeout(r, 500));
    console.log('After retry:', await page.evaluate(() => document.body?.innerText?.substring(0, 100)));
  }
  
  await page.waitForSelector('.scene-npc-row', {timeout: 8000}).catch(() => {});
  const npcRows = await page.$$('.scene-npc-row');
  console.log('NPCs:', npcRows.length);
  
  if (npcRows.length > 0) {
    const info = await npcRows[0].evaluate(el => ({
      name: el.querySelector('.npc-name-text')?.textContent,
      action: el.querySelector('.npc-action')?.textContent,
    }));
    console.log('Clicking:', JSON.stringify(info));
    
    await npcRows[0].click();
    await new Promise(r => setTimeout(r, 600));
    
    const p = await page.evaluate(() => ({
      active: !!document.querySelector('.modal-overlay.active'),
      title: document.querySelector('.modal-title')?.textContent,
      subtitle: document.querySelector('.modal-subtitle')?.textContent,
      dialog: document.querySelector('.modal-dialog')?.textContent?.substring(0, 60),
      actionBtn: document.querySelector('.modal-btn-primary')?.textContent,
      questArea: document.getElementById('npcQuestArea')?.textContent?.trim() || 'NONE',
    }));
    console.log('Preview:', JSON.stringify(p));
    await page.screenshot({path: '/tmp/vue_preview.png'});
    
    if (p.actionBtn) {
      await page.click('.modal-btn-primary');
      await new Promise(r => setTimeout(r, 600));
      const c = await page.evaluate(() => ({
        title: document.querySelector('.modal-title')?.textContent,
        bubbles: document.querySelectorAll('.chat-bubble').length,
        b0: document.querySelector('.chat-bubble')?.textContent?.substring(0, 60),
        b1: document.querySelectorAll('.chat-bubble')[1]?.textContent?.substring(0, 60) || 'NONE',
        tabs: !!document.querySelector('.chat-tabs'),
        nextBtn: !!document.querySelector('.chat-next-btn'),
        badge: document.querySelector('.chat-tab-badge')?.textContent || 'NONE',
      }));
      console.log('Chat:', JSON.stringify(c));
      await page.screenshot({path: '/tmp/vue_chat.png'});
      
      if (c.nextBtn) {
        await page.click('.chat-next-btn');
        await new Promise(r => setTimeout(r, 300));
        const ab = await page.evaluate(() => document.querySelectorAll('.chat-bubble').length);
        console.log('After topic switch:', ab, 'bubbles');
        await page.screenshot({path: '/tmp/vue_topic.png'});
      }
    }
  } else {
    await page.screenshot({path: '/tmp/vue_no_npc.png'});
  }
  
  // Now backup comparison
  const page2 = await browser.newPage();
  await page2.setViewport({width: 375, height: 812});
  await page2.goto(BASE + '/备份/map/index.php', {waitUntil: 'networkidle2', timeout: 10000});
  await new Promise(r => setTimeout(r, 500));
  
  const bNpcs = await page2.$$('.scene-npc-row');
  console.log('Backup NPCs:', bNpcs ? bNpcs.length : 0);
  
  if (bNpcs && bNpcs.length > 0) {
    const bi = await bNpcs[0].evaluate(el => ({
      name: el.querySelector('.npc-name-text')?.textContent,
      action: el.querySelector('.npc-action')?.textContent,
    }));
    console.log('Backup clicking:', JSON.stringify(bi));
    await bNpcs[0].click();
    await new Promise(r => setTimeout(r, 600));
    
    const bp = await page2.evaluate(() => ({
      active: document.querySelector('#entityModal')?.classList?.contains('active'),
      title: document.querySelector('.modal-title')?.textContent,
      subtitle: document.querySelector('.modal-subtitle')?.textContent,
      dialog: document.querySelector('.modal-dialog')?.textContent?.substring(0, 60),
      actionBtn: document.querySelector('.modal-btn-primary')?.textContent,
      questArea: document.getElementById('npcQuestArea')?.textContent?.trim() || 'NONE',
    }));
    console.log('Backup Preview:', JSON.stringify(bp));
    await page2.screenshot({path: '/tmp/backup_preview.png'});
    
    if (bp.actionBtn) {
      await page2.click('.modal-btn-primary');
      await new Promise(r => setTimeout(r, 600));
      const bc = await page2.evaluate(() => ({
        title: document.querySelector('.modal-title')?.textContent,
        bubbles: document.querySelectorAll('.chat-bubble').length,
        b0: document.querySelector('.chat-bubble')?.textContent?.substring(0, 60),
        b1: document.querySelectorAll('.chat-bubble')[1]?.textContent?.substring(0, 60) || 'NONE',
        tabs: !!document.querySelector('.chat-tabs'),
        nextBtn: !!document.querySelector('.chat-next-btn'),
        badge: document.querySelector('.chat-tab-badge')?.textContent || 'NONE',
      }));
      console.log('Backup Chat:', JSON.stringify(bc));
      await page2.screenshot({path: '/tmp/backup_chat.png'});
    }
  }
  
  await browser.close();
  console.log('DONE');
})();
