(()=>{'use strict';
const CONFIG=window.COC_CONFIG||{};
const ENABLED=CONFIG.recommendationFeedbackEnabled===true;
const ENDPOINT=String(CONFIG.candidateRequestEndpoint||'').trim();
const VOTE_LABELS={fit:'しっくりくる',doubt:'違うかも'};

if(!ENABLED)return;

document.addEventListener('DOMContentLoaded',()=>{
  const results=document.querySelector('#results');
  if(!results)return;
  const enhance=()=>enhanceCards(results);
  enhance();
  new MutationObserver(enhance).observe(results,{childList:true,subtree:true});
  document.addEventListener('coc-source-selected',()=>requestAnimationFrame(enhance));
  document.querySelector('#source')?.addEventListener('change',()=>requestAnimationFrame(enhance));
  document.querySelector('#go')?.addEventListener('click',()=>setTimeout(enhance,0));
  document.querySelector('#scope')?.addEventListener('change',()=>setTimeout(enhance,0));
  document.querySelector('#caution')?.addEventListener('change',()=>setTimeout(enhance,0));
  results.addEventListener('click',event=>{
    const button=event.target.closest('[data-rec-vote]');
    if(button)sendVote(button);
  });
});

function currentSource(){
  return document.querySelector('#source')?.value?.trim()
    ||new URLSearchParams(location.search).get('scenario')?.trim()
    ||document.querySelector('#sourceSearch')?.value?.trim()
    ||'';
}

function enhanceCards(root){
  const source=currentSource();
  if(!source)return;
  root.querySelectorAll('.card').forEach(card=>{
    if(card.querySelector('.recommendation-feedback'))return;
    const title=card.querySelector('h3')?.textContent?.trim();
    if(!title)return;
    const saved=getSavedVote(source,title);
    const box=document.createElement('div');
    box.className='recommendation-feedback';
    box.dataset.source=source;
    box.dataset.target=title;
    box.innerHTML=`<div class="recommendation-feedback-copy"><span>この候補、どう？</span><small>候補判定の改善に使います</small></div><div class="recommendation-feedback-actions"><button type="button" class="rec-vote rec-vote-fit${saved==='fit'?' selected':''}" data-rec-vote="fit"${saved?' disabled':''}>しっくりくる</button><button type="button" class="rec-vote rec-vote-doubt${saved==='doubt'?' selected':''}" data-rec-vote="doubt"${saved?' disabled':''}>違うかも</button></div><div class="recommendation-feedback-status">${saved?'フィードバック済み。ありがとう。':''}</div>`;
    card.append(box);
  });
}

async function sendVote(button){
  const box=button.closest('.recommendation-feedback');
  const source=box?.dataset.source||'';
  const target=box?.dataset.target||'';
  const verdict=button.dataset.recVote||'';
  if(!source||!target||!VOTE_LABELS[verdict])return;
  if(getSavedVote(source,target))return;
  if(!ENDPOINT){setStatus(box,'現在フィードバックを受け付けていません。','error');return}

  const buttons=[...box.querySelectorAll('.rec-vote')];
  buttons.forEach(b=>b.disabled=true);
  setStatus(box,'送信中…','');
  const params=new URLSearchParams(location.search);
  const mode=params.get('test')==='1'?'test':'public';
  const payload={action:'recommendationFeedback',data:{source,target,verdict,mode}};
  const body=new URLSearchParams({payload:JSON.stringify(payload)}).toString();
  try{
    await fetch(ENDPOINT,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body,keepalive:true});
    saveVote(source,target,verdict);
    buttons.forEach(b=>b.classList.toggle('selected',b.dataset.recVote===verdict));
    setStatus(box,'送信しました。候補判定を育てる材料にします。','success');
  }catch(err){
    buttons.forEach(b=>b.disabled=false);
    setStatus(box,'送信できませんでした。もう一度お試しください。','error');
  }
}

function key(source,target){return `coc-rec-vote::${source}::${target}`}
function getSavedVote(source,target){try{return localStorage.getItem(key(source,target))||''}catch{return''}}
function saveVote(source,target,verdict){try{localStorage.setItem(key(source,target),verdict)}catch{}}
function setStatus(box,text,state){const el=box?.querySelector('.recommendation-feedback-status');if(!el)return;el.textContent=text;el.dataset.state=state||''}
})();
