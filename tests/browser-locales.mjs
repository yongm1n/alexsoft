// Real Chrome, isolated temporary profile, no third-party runtime dependency.
// CHROME_BIN=/path/to/chrome QA_ORIGIN=http://127.0.0.1:8074 node tests/browser-locales.mjs
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const origin=process.env.QA_ORIGIN || 'http://127.0.0.1:8074';
const out='.private/qa-bilingual'; await mkdir(out,{recursive:true});
const profile=await mkdtemp(join(tmpdir(),'alexsoft-locale-chrome-'));
const child=spawn(process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 ['--headless=new','--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--user-data-dir='+profile,
 '--no-first-run','--no-default-browser-check','--hide-scrollbars','--force-prefers-reduced-motion','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let ws;
const reports=[],errors=[];
try{
 let port;
 for(let i=0;i<100;i++){try{port=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break}catch{await sleep(100)}}
 if(!port)throw Error('Chrome did not start');
 const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
 let next=1; const pending=new Map();
 ws.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id){const p=pending.get(msg.id);if(p){pending.delete(msg.id);clearTimeout(p.timer);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result)}}else if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails)};
 function call(method,params={}){return new Promise((resolve,reject)=>{const id=next++,timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timeout'))},25000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}))})}
 async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
 async function waitFor(expression){for(let i=0;i<120;i++){try{if(await evaluate(expression))return}catch{}await sleep(80)}throw Error('Wait failed: '+expression)}
 async function visit(path, expected=path){await call('Page.navigate',{url:origin+path});await waitFor('location.href === '+JSON.stringify(origin+expected)+' && document.readyState === "complete"');}
 function pass(name,data={}){reports.push({name,...data});console.log('PASS',name,JSON.stringify(data));}
 await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Network.setCacheDisabled',{cacheDisabled:true});
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await visit('/?lang=ko'); await evaluate('localStorage.clear()');
 let languageScript;
 async function setBrowser(languages,blocked=false){
  if(languageScript)await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:languageScript});
  const source=`Object.defineProperty(navigator,'languages',{get:()=>${JSON.stringify(languages)}});Object.defineProperty(navigator,'language',{get:()=>${JSON.stringify(languages[0]||'')}});`+
    (blocked?`Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError')}});`:'');
  languageScript=(await call('Page.addScriptToEvaluateOnNewDocument',{source})).identifier;
 }
 for(const [languages,expected] of [[['ko-KR'],'/'],[['en-US'],'/en/'],[['en-GB'],'/en/'],[['fr-FR','ko-KR','en-US'],'/'],[['en-GB','ko-KR'],'/en/'],[['ja-JP'],'/en/']]){
  await setBrowser(languages);await visit('/',expected);pass('new visitor '+languages.join(','),{path:expected});
 }
 await setBrowser(['ko-KR']);await visit('/en/');pass('explicit English ignores Korean browser');
 await evaluate("localStorage.setItem('alexsoft.language','en')");await visit('/?lang=ko');await visit('/work/');pass('explicit Korean home/detail ignore English preference');
 await visit('/','/en/');pass('saved English precedes Korean browser');
 await evaluate("localStorage.setItem('alexsoft.language','ko')");await setBrowser(['en-US']);await visit('/');pass('saved Korean precedes English browser');
 await evaluate("localStorage.clear()");await setBrowser(['ko-KR']);await visit('/');
 await evaluate("document.querySelector('[data-language=en]').click()");await waitFor('location.pathname==="/en/" && document.readyState==="complete"');
 await evaluate('history.back()');await waitFor('location.pathname==="/" && document.readyState==="complete"');await sleep(200);assert.equal(await evaluate('location.pathname'),'/');pass('back to general Korean home does not loop after English selection');
 await visit('/work/?utm_source=qa#cloud-emr');await evaluate("document.querySelector('[data-language=en]').click()");
 await waitFor('location.pathname==="/en/work/" && location.hash==="#cloud-emr" && document.readyState==="complete"');
 assert.equal(await evaluate('location.search'),'?utm_source=qa');assert.equal(await evaluate("localStorage.getItem('alexsoft.language')"),'en');pass('manual switch keeps page/section/query and saves choice');
 await call('Page.reload');await waitFor('document.readyState==="complete" && location.pathname==="/en/work/"');pass('refresh keeps English detail');
 await evaluate('history.back()');await waitFor('location.pathname==="/work/" && document.readyState==="complete"');await sleep(200);assert.equal(await evaluate('location.pathname'),'/work/');pass('back keeps original explicit language');
 await evaluate('history.forward()');await waitFor('location.pathname==="/en/work/" && document.readyState==="complete"');pass('forward keeps switched page');
 await visit('/en/#en-founder','/en/#about');pass('legacy English founder link resolves');
 await visit('/work/');await evaluate("document.querySelector('#cloud-emr').scrollIntoView({behavior:'instant'})");await evaluate("document.querySelector('[data-language=en]').click()");await waitFor('location.pathname==="/en/work/" && document.readyState==="complete"');assert.equal(await evaluate('location.hash'),'#cloud-emr');pass('switch after scrolling preserves visible section');
 await setBrowser(['en-GB'],true);await visit('/','/en/');await evaluate("document.querySelector('[data-language=ko]').click()");await waitFor('location.search==="?lang=ko" && document.readyState==="complete"');
 await call('Page.reload');await waitFor('location.search==="?lang=ko" && document.readyState==="complete"');pass('blocked localStorage still switches and survives refresh');
 await setBrowser(['en-US']);await visit('/en/');await evaluate('localStorage.clear()');
 const articleDirs=(await readdir('insights',{withFileTypes:true})).filter(d=>d.isDirectory()).map(d=>d.name);
 const paths=['/','/work/','/diagnosis/','/healthcare/','/brand-website/','/e-invoicing/','/insights/',...articleDirs.map(x=>'/insights/'+x+'/'),'/insights/ai-business-website/slides.html','/404.html'];
 for(const lang of ['ko','en'])for(const path of paths){
  const url=lang==='en'?'/en'+path:path==='/'?'/?lang=ko':path;
  // Missing translation is a real failure; callers can run a partial matrix with QA_SKIP_SLIDES=1 during authoring.
  if(process.env.QA_SKIP_SLIDES && path.endsWith('slides.html'))continue;
  await visit(url);
  await evaluate('Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,5000))]).then(()=>true)');
  for(const width of [320,390,1440]){
   await call('Emulation.setDeviceMetricsOverride',{width,height:width===1440?1000:844,deviceScaleFactor:1,mobile:false});await sleep(80);
   const data=await evaluate(`(()=>{const sw=document.querySelector('.language-switch'),r=sw?.getBoundingClientRect();return {lang:document.documentElement.lang,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,switchVisible:!!r&&r.width>0&&r.left>=0&&r.right<=innerWidth,brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.getAttribute('src')),badElements:[...document.querySelectorAll('body *')].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&(b.left<-.5||b.right>innerWidth+.5)&&!e.closest('.ink,svg,.media-frame,.table-scroll,pre,.diagram-scroll,.screen-scroll')}).slice(0,6).map(e=>e.tagName+'.'+e.className)}})()`);
   assert.equal(data.lang,lang,url);assert.equal(data.overflow,0,url+' '+width+' '+JSON.stringify(data));assert.ok(data.switchVisible,url+' switch '+width);assert.deepEqual(data.brokenImages,[],url);
   pass('layout '+url+' '+width,data);
   if(['/','/work/','/diagnosis/','/insights/','/insights/ai-business-website/slides.html'].includes(path)){
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(out,lang+'-'+path.replaceAll('/','_').replace('.html','')+'-'+width+'.png'),Buffer.from(shot.data,'base64'));
   }
  }
 }
 for(const lang of ['ko','en']) {
  await visit(lang==='ko'?'/?lang=ko':'/en/');
  for(const width of [320,390,1440]){
   await call('Emulation.setDeviceMetricsOverride',{width,height:width===1440?1000:844,deviceScaleFactor:1,mobile:false});
   await evaluate("document.querySelector('.credential').scrollIntoView({block:'center',behavior:'instant'})");
   await waitFor("document.querySelector('.credential img').naturalWidth===600");
   const d=await evaluate(`(()=>{const a=document.querySelector('.credential'),i=a.querySelector('img'),r=i.getBoundingClientRect();return {natural:[i.naturalWidth,i.naturalHeight],size:[r.width,r.height],alt:i.alt,url:a.href,overflow:a.scrollWidth-a.clientWidth,owner:!!document.querySelector('.credential-owner')}})()`);
   assert.deepEqual(d.natural,[600,600]);assert.equal(d.size[0],d.size[1]);assert.ok(d.alt);assert.equal(d.overflow,0);assert.equal(d.owner,false);assert.equal(d.url,'https://www.credly.com/badges/d0c993e5-ae64-4601-b926-ca54c0c3af7d/public_url');pass('personal credential '+lang+' '+width,d);
   const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(out,lang+'-credential-'+width+'.png'),Buffer.from(shot.data,'base64'));
  }
 }
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 for(const path of ['/en/','/en/work/','/en/diagnosis/','/en/healthcare/','/en/brand-website/','/en/e-invoicing/']) {
  await visit(path);const count=await evaluate("document.querySelectorAll('.ink svg').length");
  for(let n=0;n<count;n++){
   await evaluate(`document.querySelectorAll('.ink svg')[${n}].scrollIntoView({block:'center',behavior:'instant'})`);await sleep(100);
   const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(out,'diagram-'+path.replaceAll('/','_')+'-'+n+'.png'),Buffer.from(shot.data,'base64'));
  }
 }
 await visit('/en/insights/ai-business-website/slides.html#slide-20');await evaluate("document.querySelector('[data-language=ko]').click()");await waitFor('location.pathname==="/insights/ai-business-website/slides.html" && location.hash==="#slide-20" && document.readyState==="complete"');
 assert.equal(await evaluate("document.querySelector('.slide.active').id"),'slide-20');pass('tutorial language switch retains slide');
 await call('Emulation.setScriptExecutionDisabled',{value:true});
 for(const path of ['/?lang=ko','/en/','/en/work/','/en/diagnosis/','/en/insights/ai-result-quality/','/en/insights/ai-business-website/slides.html']){
  if(process.env.QA_SKIP_SLIDES && path.endsWith('slides.html'))continue;
  await visit(path);const data=await evaluate(`({text:document.body.innerText.length,links:document.querySelectorAll('[data-language]').length,slides:[...document.querySelectorAll('.slide')].filter(e=>getComputedStyle(e).display!=='none').length})`);assert.ok(data.text>500);assert.equal(data.links,2);if(path.endsWith('slides.html'))assert.equal(data.slides,63);pass('JavaScript disabled '+path,data);
 }
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.deepEqual(errors,[],'browser runtime errors');
}finally{await writeFile(join(out,'browser-report.json'),JSON.stringify({reports,errors},null,2));ws?.close();child.kill('SIGTERM')}
