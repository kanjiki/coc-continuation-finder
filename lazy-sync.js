(()=>{'use strict';
const VERSION='0.16.0';
let loadPromise=null;

function loadScript(src){
  return new Promise((resolve,reject)=>{
    const existing=document.querySelector(`script[data-coc-lazy="${src}"]`);
    if(existing){
      if(existing.dataset.loaded==='1')return resolve();
      existing.addEventListener('load',resolve,{once:true});
      existing.addEventListener('error',reject,{once:true});
      return;
    }
    const script=document.createElement('script');
    script.src=src;
    script.async=true;
    script.dataset.cocLazy=src;
    script.addEventListener('load',()=>{script.dataset.loaded='1';resolve()},{once:true});
    script.addEventListener('error',reject,{once:true});
    document.head.append(script);
  });
}

function fullData(){
  const custom=window.COC_CUSTOM;
  return {
    sources:custom&&Array.isArray(custom.sources)?custom.sources:(window.COC_SOURCES||[]),
    edges:custom&&Array.isArray(custom.edges)?custom.edges:(window.COC_EDGES||[])
  };
}

function refreshUi(){
  const {sources,edges}=fullData();
  const native=document.querySelector('#source');
  const requestList=document.querySelector('#requestSourceList');
  const search=document.querySelector('#sourceSearch');
  const selected=native?.value||new URLSearchParams(location.search).get('scenario')||'';
  const sorted=sources.slice().filter(x=>x&&x.n).sort((a,b)=>a.n.localeCompare(b.n,'ja'));

  if(native){
    native.innerHTML='<option value="">正式名称を選択</option>';
    for(const item of sorted){
      const option=document.createElement('option');
      option.value=item.n;
      option.textContent=item.n;
      native.append(option);
    }
    if(selected&&sorted.some(x=>x.n===selected))native.value=selected;
  }

  if(requestList){
    requestList.innerHTML='';
    for(const item of sorted){
      const option=document.createElement('option');
      option.value=item.n;
      requestList.append(option);
    }
  }

  const sourceNames=new Set();
  const targetNames=new Set();
  for(const edge of edges){
    if(edge?.s)sourceNames.add(String(edge.s).trim());
    if(edge?.t)targetNames.add(String(edge.t).trim());
  }
  const stats=document.querySelector('#heroStats');
  if(stats)stats.innerHTML=`<span><b>${sourceNames.size}</b> 元シナリオ</span><span><b>${targetNames.size}</b> 継続先シナリオ</span>`;

  window.COC_FULL_DATA_READY=true;
  document.dispatchEvent(new CustomEvent('coc-full-data-ready',{detail:{sources:sources.length,edges:edges.length}}));

  if(selected&&sorted.some(x=>x.n===selected)){
    if(native)native.value=selected;
    if(search&&!search.value.trim())search.value=selected;
    document.querySelector('#go')?.click();
  }else if(search?.value.trim()){
    search.dispatchEvent(new Event('input',{bubbles:true}));
  }
}

function loadFullData(){
  if(loadPromise)return loadPromise;
  loadPromise=(async()=>{
    await loadScript(`data/sheet-sync.js?v=${VERSION}`);
    await loadScript(`data/sheet-sync-merge.js?v=${VERSION}`);
    refreshUi();
    await loadScript(`data/feedback-ranking-data.js?v=${VERSION}`);
    await loadScript(`feedback-ranking.js?v=${VERSION}`);
    return true;
  })().catch(error=>{
    console.warn('[continuation-finder] lazy data load failed',error);
    loadPromise=null;
    return false;
  });
  return loadPromise;
}

window.COC_LOAD_FULL_DATA=loadFullData;

function arm(){
  const trigger=()=>{loadFullData()};
  const source=document.querySelector('#sourceSearch');
  const request=document.querySelector('#requestSource');
  const go=document.querySelector('#go');

  source?.addEventListener('focus',trigger,{once:true,passive:true});
  source?.addEventListener('pointerdown',trigger,{once:true,passive:true});
  request?.addEventListener('focus',trigger,{once:true,passive:true});
  go?.addEventListener('pointerdown',trigger,{once:true,passive:true});

  if(new URLSearchParams(location.search).has('scenario')){
    trigger();
    return;
  }
  if('requestIdleCallback' in window){
    requestIdleCallback(trigger,{timeout:8000});
  }else{
    setTimeout(trigger,5000);
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arm,{once:true});
else arm();
})();
