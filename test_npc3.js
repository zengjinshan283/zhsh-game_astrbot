const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: 'new', args: ['--no-sandbox', '--disable-web-security']});
  const page = await browser.newPage();
  await page.setViewport({width: 375, height: 812});
  
  // Use localhost:3000 directly to bypass nginx
  const BASE = 'http://127.0.0.1:3000';
  
  // But the frontend is served from nginx... we need both.
  // Alternative: serve the dist from node or test API only
  // Let's just test the API endpoints properly and screenshot the backup
  
  // Test 1: Backup site NPC interaction
  const page2 = await browser.newPage();
  await page2.setViewport({width: 375, height: 812});
  await page2.goto('http://127.0.0.1:3000/../备份/map/index.php', {waitUntil: 'networkidle2', timeout: 10000}).catch(() => {});
  await page2.goto('http://zhsh.xinanc.cn/备份/map/index.php', {waitUntil: 'networkidle2', timeout: 10000}).catch(() => {});
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
      dialog: document.querySelector('.modal-dialog')?.textContent?.substring(0, 80),
      actionBtn: document.querySelector('.modal-btn-primary')?.textContent,
      questArea: document.getElementById('npcQuestArea')?.textContent?.trim() || 'NONE',
    }));
    console.log('Backup Preview:', JSON.stringify(bp));
    await page2.screenshot({path: '/tmp/backup_preview.png'});
    
    if (bp.actionBtn) {
      await page2.click('.modal-btn-primary');
      await new Promise(r => setTimeout(r, 800));
      const bc = await page2.evaluate(() => ({
        title: document.querySelector('.modal-title')?.textContent,
        bubbles: document.querySelectorAll('.chat-bubble').length,
        b0: document.querySelector('.chat-bubble')?.textContent?.substring(0, 80),
        b1: document.querySelectorAll('.chat-bubble')[1]?.textContent?.substring(0, 80) || 'NONE',
        tabs: !!document.querySelector('.chat-tabs'),
        nextBtn: !!document.querySelector('.chat-next-btn'),
        badge: document.querySelector('.chat-tab-badge')?.textContent || 'NONE',
      }));
      console.log('Backup Chat:', JSON.stringify(bc));
      await page2.screenshot({path: '/tmp/backup_chat.png'});
      
      if (bc.nextBtn) {
        await page2.click('.chat-next-btn');
        await new Promise(r => setTimeout(r, 300));
        const ab = await page2.evaluate(() => ({
          count: document.querySelectorAll('.chat-bubble').length,
          last: document.querySelectorAll('.chat-bubble')[document.querySelectorAll('.chat-bubble').length-1]?.textContent?.substring(0, 60)
        }));
        console.log('Backup Topic switch:', JSON.stringify(ab));
      }
    }
  } else {
    await page2.screenshot({path: '/tmp/backup_no_npc.png'});
    const text = await page2.evaluate(() => document.body?.innerText?.substring(0, 200));
    console.log('Backup page:', text);
  }
  
  // Test 2: Vue frontend via localhost 
  // We need nginx to serve the frontend. Since 502/blocking issues, test API correctness only
  const http = require('http');
  function api(method, path, body) {
    return new Promise((res, rej) => {
      const d = body ? JSON.stringify(body) : null;
      const r = http.request({hostname:'127.0.0.1',port:3000,path,method,headers:{'Content-Type':'application/json','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTUsInVzZXJuYW1lIjoidGVzdG5wYzAxIiwiaWF0IjoxNzc1NTIwMzQwLCJleHAiOjE3NzYxMjUxNDB9.07-5XzyOTqpSX06ab0nFe5oAV_CQwG7gocPQfmAhWwQ'}}, resp => {
        let b=''; resp.on('data',c=>b+=c); resp.on('end',()=>{try{res(JSON.parse(b))}catch(e){res({raw:b.substring(0,100)})}});
      });
      r.on('error',rej); if(d) r.write(d); r.end();
    });
  }
  
  console.log('\n=== API Tests ===');
  const scene = await api('GET', '/api/map/scene');
  console.log('Scene NPCs:', scene.npcs?.length || 0);
  if (scene.npcs) {
    for (const n of scene.npcs) {
      console.log(`  NPC ${n.id}: ${n.name} quest_count=${n.quest_count} dialog=${(n.dialog||'').substring(0,30)}`);
    }
  }
  
  const chat1 = await api('GET', '/api/npc/1/chat');
  console.log('\nChat NPC1:', chat1.ok ? 'OK' : 'FAIL', 'trigger='+chat1.trigger_type);
  if (chat1.ok) {
    console.log('  dialog:', (chat1.dialog||'').substring(0, 50));
    console.log('  default_chat:', chat1.default_chat?.text?.substring(0, 50));
    console.log('  topics:', chat1.chat_topics?.length);
    console.log('  available_quests:', chat1.available_quests?.length);
    console.log('  active_quests:', chat1.active_quests?.length);
  }
  
  await browser.close();
  console.log('\nDONE');
})();
