(()=>{'use strict';
const CONFIG=window.COC_CONFIG||{};
const ENABLED=CONFIG.recommendationFeedbackEnabled===true;
const ENDPOINT=String(CONFIG.candidateRequestEndpoint||'').trim();
const VOTE_LABELS={fit:'しっくりくる',doubt:'違うかも'};
if(!ENABLED)return;

document.addEventListener('DOMContentLoaded',()=>{
  const results=document.querySelector('#results');if(!results)return;
  hydrate(results);
  new MutationObserver(()=>hydrate(results)).observe(results,{childList:true,subtree:true});
  document.addEventListener('coc-results-rendered',()=>hydrate(results));
  document.addEventListener('coc-source-selected',()=>hydrate(results));
  results.addEventListener('click',event=>{const button=event.target.closest('[data-rec-vote]');if(button)sendVote(button)});
});
function hydrate(root){root.querySelectorAll('.recommendation-feedback').forEach(box=>{const source=box.dataset.source||'',target=box.dataset.target||'',saved=getSavedVote(source,target);if(!saved)return;box.querySelectorAll('.rec-vote').forEach(b=>{b.disabled=true;b.classList.toggle('selected',b.dataset.recVote===saved)});setStatus(box,'フィードバック済み。ありがとう。','success')})}
async function sendVote(button){const box=button.closest('.recommendation-feedback');const source=box?.dataset.source||'',target=box?.dataset.target||'',verdict=button.dataset.recVote||'';if(!source||!target||!VOTE_LABELS[verdict]||getSavedVote(source,target))return;if(!ENDPOINT){setStatus(box,'現在フィードバックを受け付けていません。','error');return}const buttons=[...box.querySelectorAll('.rec-vote')];buttons.forEach(b=>b.disabled=true);setStatus(box,'送信中…','');const mode=new URLSearchParams(location.search).get('test')==='1'?'test':'public';const payload={action:'recommendationFeedback',data:{source,target,verdict,mode}};const body=new URLSearchParams({payload:JSON.stringify(payload)}).toString();try{await fetch(ENDPOINT,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body,keepalive:true});saveVote(source,target,verdict);buttons.forEach(b=>b.classList.toggle('selected',b.dataset.recVote===verdict));setStatus(box,'送信しました。候補判定を育てる材料にします。','success')}catch(err){buttons.forEach(b=>b.disabled=false);setStatus(box,'送信できませんでした。もう一度お試しください。','error')}}
function key(source,target){return `coc-rec-vote::${source}::${target}`}
function getSavedVote(source,target){try{return localStorage.getItem(key(source,target))||''}catch{return''}}
function saveVote(source,target,verdict){try{localStorage.setItem(key(source,target),verdict)}catch{}}
function setStatus(box,text,state){const el=box?.querySelector('.recommendation-feedback-status');if(!el)return;el.textContent=text;el.dataset.state=state||''}
})();