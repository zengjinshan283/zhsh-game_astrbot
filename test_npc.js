const puppeteer = require('puppeteer');
const http = require('http');
const BASE = 'http://zhsh.xinanc.cn';

function fetchAPI(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const data = opts.body ? JSON.stringify(opts.body) : null;
    const req = http.request({hostname: url.hostname, port: 80, path: url.pathname, method: opts.method || 'GET', headers: {'Content-Type': 'application/json', ...opts.headers}}, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  // Get token via server-side
  const tokenResp = await fetchAPI('/api/auth/login', {method:'POST', body:{username:'testnpc01',password:'test1234'}});
  if (!tokenResp.token) { console.log('Login failed'); process.exit(1); }
  console.log('Token obtained');
  
  const browser = await puppeteer.launch({headless: 'new', args: ['--no-sandbox', '--ignore-certificate-errors']});
  const page = await browser.newPage();
  await page.setViewport({width: 375, height: 812});
  
  // Set token and navigate
  await page.goto(BASE + '/', {waitUntil: 'networkidle2'});
  await page.evaluate((t) => { localStorage.setItem('zhsh_token', t); }, tokenResp.token);
  await page.reload({waitUntil: 'networkidle2'});
  await new Promise(r => setTimeout(r, 800));
  
  await page.waitForSelector('.scene-npc-row', {timeout: 5000}).catch(() => {});
  const npcRows = await page.$$('.scene-npc-row');
  console.log('NPCs found:', npcRows.length);
  
  if (npcRows.length === 0) {
    const body = await page.evaluate(() => document.body?.innerText?.substring(0, 200));
    console.log('Page:', body);
    await page.screenshot({path: '/tmp/step0_no_npc.png'});
    await browser.close(); return;
  }
  
  // Get NPC info
  const info = await npcRows[0].evaluate(el => ({
    name: el.querySelector('.npc-name-text')?.textContent,
    action: el.querySelector('.npc-action')?.textContent,
  }));
  console.log('Clicking:', JSON.stringify(info));
  
  // Step 1: Preview
  await npcRows[0].click();
  await new Promise(r => setTimeout(r, 600));
  
  const preview = await page.evaluate(() => ({
    active: !!document.querySelector('.modal-overlay.active'),
    title: document.querySelector('.modal-title')?.textContent,
    subtitle: document.querySelector('.modal-subtitle')?.textContent,
    dialog: document.querySelector('.modal-dialog')?.textContent?.substring(0, 60),
    actionBtn: document.querySelector('.modal-btn-primary')?.textContent,
    questArea: document.getElementById('npcQuestArea')?.textContent?.trim() || 'NONE',
  }));
  console.log('Step1 Preview:', JSON.stringify(preview));
  await page.screenshot({path: '/tmp/step1_preview.png'});
  
  // Step 2: Action -> Chat
  if (preview.actionBtn) {
    await page.click('.modal-btn-primary');
    await new Promise(r => setTimeout(r, 600));
    
    const chat = await page.evaluate(() => ({
      title: document.querySelector('.modal-title')?.textContent,
      bubbles: document.querySelectorAll('.chat-bubble').length,
      bubble0: document.querySelector('.chat-bubble')?.textContent?.substring(0, 60),
      bubble1: document.querySelectorAll('.chat-bubble')[1]?.textContent?.substring(0, 60) || 'NONE',
      hasTabs: !!document.querySelector('.chat-tabs'),
      hasNextBtn: !!document.querySelector('.chat-next-btn'),
      badge: document.querySelector('.chat-tab-badge')?.textContent || 'NONE',
    }));
    console.log('Step2 Chat:', JSON.stringify(chat));
    await page.screenshot({path: '/tmp/step2_chat.png'});
    
    // Step 3: Topic switch
    if (chat.hasNextBtn) {
      await page.click('.chat-next-btn');
      await new Promise(r => setTimeout(r, 300));
      const after = await page.evaluate(() => document.querySelectorAll('.chat-bubble').length);
      const lastBubble = await page.evaluate(() => document.querySelectorAll('.chat-bubble')[after-1]?.textContent?.substring(0, 60));
      console.log('Step3 After topic switch: bubbles=' + after + ' last=' + lastBubble);
      await page.screenshot({path: '/tmp/step3_topic.png'});
    }
    
    // Step 4: Quest tab
    await page.evaluate(() => {
      document.querySelectorAll('.chat-tab-btn').forEach(t => { if (t.getAttribute('data-tab') === 'quest') t.click(); });
    });
    await new Promise(r => setTimeout(r, 300));
    const questText = await page.evaluate(() => {
      const panels = document.querySelectorAll('.chat-panel');
      for (const p of panels) { if (p.style.display !== 'none') return p.textContent.substring(0, 150); }
      return 'EMPTY';
    });
    console.log('Step4 Quest:', questText);
    await page.screenshot({path: '/tmp/step4_quest.png'});
  }
  
  // Step 5: Close and test backup for comparison
  await page.click('.modal-btn-close');
  await new Promise(r => setTimeout(r, 300));
  
  // Now test original backup
  const page2 = await browser.newPage();
  await page2.setViewport({width: 375, height: 812});
  await page2.goto(BASE + '/备份/map/index.php', {waitUntil: 'networkidle2'}).catch(() => {});
  await new Promise(r => setTimeout(r, 500));
  console.log('Backup URL:', page2.url());
  
  const backupNPCs = await page2.$$('.scene-npc-row');
  console.log('Backup NPCs:', backupNPCs ? backupNPCs.length : 0);
  
  if (backupNPCs && backupNPCs.length > 0) {
    const bInfo = await backupNPCs[0].evaluate(el => ({
      name: el.querySelector('.npc-name-text')?.textContent,
      action: el.querySelector('.npc-action')?.textContent,
    }));
    console.log('Backup clicking:', JSON.stringify(bInfo));
    
    await backupNPCs[0].click();
    await new Promise(r => setTimeout(r, 600));
    
    const bPreview = await page2.evaluate(() => ({
      active: !!document.querySelector('#entityModal.active') || !!document.querySelector('.modal-overlay.active') || !!document.querySelector('#entityModal')?.classList?.contains('active'),
      title: document.querySelector('.modal-title')?.textContent,
      subtitle: document.querySelector('.modal-subtitle')?.textContent,
      dialog: document.querySelector('.modal-dialog')?.textContent?.substring(0, 60),
      actionBtn: document.querySelector('.modal-btn-primary')?.textContent,
      questArea: document.getElementById('npcQuestArea')?.textContent?.trim() || 'NONE',
    }));
    console.log('Backup Step1 Preview:', JSON.stringify(bPreview));
    await page2.screenshot({path: '/tmp/step5_backup_preview.png'});
    
    // Click action to get to chat
    if (bPreview.actionBtn) {
      await page2.click('.modal-btn-primary');
      await new Promise(r => setTimeout(r, 600));
      
      const bChat = await page2.evaluate(() => ({
        title: document.querySelector('.modal-title')?.textContent,
        bubbles: document.querySelectorAll('.chat-bubble').length,
        bubble0: document.querySelector('.chat-bubble')?.textContent?.substring(0, 60),
        bubble1: document.querySelectorAll('.chat-bubble')[1]?.textContent?.substring(0, 60) || 'NONE',
        hasTabs: !!document.querySelector('.chat-tabs'),
        hasNextBtn: !!document.querySelector('.chat-next-btn'),
        badge: document.querySelector('.chat-tab-badge')?.textContent || 'NONE',
      }));
      console.log('Backup Step2 Chat:', JSON.stringify(bChat));
      await page2.screenshot({path: '/tmp/step6_backup_chat.png'});
    }
  }
  
  await browser.close();
  console.log('DONE');
})();
