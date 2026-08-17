(()=>{'use strict';
const VERSION='0.14.0';
const STORAGE_KEY='cocContinuationSessionId';
const endpoint=()=>String((window.COC_CONFIG&&window.COC_CONFIG.candidateRequestEndpoint)||'').trim();

function sessionId(){
  try{
    let id=sessionStorage.getItem(STORAGE_KEY);
    if(!id){id=(crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`);sessionStorage.setItem(STORAGE_KEY,id)}
    return id;
  }catch{return `${Date.now()}-${Math.random().toString(36).slice(2)}`}
}
function deviceClass(){const w=Math.max(document.documentElement.clientWidth||0,window.innerWidth||0);return w<720?'mobile':w<1100?'tablet':'desktop'}
function coarseReferrer(){try{return document.referrer?new URL(document.referrer).hostname:'direct'}catch{return 'other'}}
function mode(){return new URLSearchParams(location.search).get('test')==='1'?'test':'public'}
function sourceScenario(){return new URLSearchParams(location.search).get('scenario')||document.querySelector('#source')?.value||''}
function scopeLabel(){return document.querySelector('#scope')?.selectedOptions?.[0]?.textContent||''}
function post(event,extra={}){
  const url=endpoint();if(!url)return;
  const data={event,sessionId:sessionId(),sourceScenario:sourceScenario(),mode:mode(),referrer:coarseReferrer(),deviceClass:deviceClass(),appVersion:VERSION,...extra};
  if((event==='search_commit'||event==='result_view'||event==='scope_filter')&&!String(data.sourceScenario||'').trim())return;
  try{
    const body=new URLSearchParams({payload:JSON.stringify({action:'usageEvent',data})}).toString();
    fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body,keepalive:true}).catch(()=>{});
  }catch{}
}
function targetFrom(el){return el?.closest('.card')?.querySelector('h3')?.textContent?.trim()||''}
function nonEmptyCandidates(){return [...document.querySelectorAll('.candidate-input')].map(x=>x.value.trim()).filter(Boolean)}

let lastResultKey='';
let lastSearchSource='';
function observeResults(){
  const summary=document.querySelector('#summary'),results=document.querySelector('#results');if(!summary||!results)return;
  const fire=()=>{
    const source=sourceScenario();if(!source||results.classList.contains('empty'))return;
    if(source!==lastSearchSource){lastSearchSource=source;post('search_commit',{sourceScenario:source,note:'resolved'})}
    const key=`${source}|${document.querySelector('#scope')?.value||''}|${summary.textContent}`;
    if(key===lastResultKey)return;lastResultKey=key;
    post('result_view',{scope:scopeLabel(),note:summary.textContent.trim()});
  };
  new MutationObserver(fire).observe(results,{childList:true,subtree:true,attributes:true});
  new MutationObserver(fire).observe(summary,{childList:true,subtree:true,characterData:true});
  fire();
}

let pendingSubmit=null;
function observeCandidateSubmit(){
  const status=document.querySelector('#requestStatus');if(!status)return;
  new MutationObserver(()=>{
    if(!pendingSubmit)return;
    const text=status.textContent||'';
    if(/件の候補を送信しました/.test(text)){
      post('candidate_submit',{sourceScenario:pendingSubmit.source,note:`candidates:${pendingSubmit.count}`,success:true});
      pendingSubmit=null;
    }else if(/送信に失敗/.test(text)){
      pendingSubmit=null;
    }
  }).observe(status,{childList:true,subtree:true,characterData:true});
}

document.addEventListener('DOMContentLoaded',()=>{
  post('page_view');observeResults();observeCandidateSubmit();
  document.querySelector('#scope')?.addEventListener('change',e=>{
    const source=sourceScenario();if(source)post('scope_filter',{sourceScenario:source,scope:e.target.selectedOptions?.[0]?.textContent||''});
  });
  document.addEventListener('click',e=>{
    const market=e.target.closest?.('.markets a');if(market)post('market_click',{targetScenario:targetFrom(market),market:market.textContent.replace('↗','').trim(),success:true});
    const vote=e.target.closest?.('button');
    if(vote){
      const text=vote.textContent.trim();
      if(text.includes('しっくりくる'))post('recommendation_vote',{targetScenario:targetFrom(vote),verdict:'fit'});
      else if(text.includes('違うかも'))post('recommendation_vote',{targetScenario:targetFrom(vote),verdict:'doubt'});
    }
  });
  document.querySelector('#sendRequest')?.addEventListener('click',()=>{
    const source=document.querySelector('#requestSource')?.value.trim()||'';
    const count=nonEmptyCandidates().length;
    pendingSubmit=source&&count?{source,count}:null;
  });
});
})();