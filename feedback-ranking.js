(()=>{'use strict';
function feedbackMap(){
  const sync=window.COC_SHEET_SYNC&&window.COC_SHEET_SYNC.feedback;
  return sync&&typeof sync==='object'?sync:(window.COC_FEEDBACK_RANK||{});
}
function stats(source,target){
  const row=feedbackMap()[`${source}\u0000${target}`]||{};
  const fit=Number(row.fit||0),doubt=Number(row.doubt||0),total=fit+doubt;
  return{fit,doubt,total,score:total?(fit-doubt)/(total+2):0};
}
function currentSource(){return document.querySelector('#source')?.value||new URLSearchParams(location.search).get('scenario')||''}
function rank(){
  const root=document.querySelector('#results');
  const source=currentSource();
  if(!root||!source||!root.classList.contains('cards'))return;
  const cards=[...root.querySelectorAll(':scope > .card')];
  if(cards.length<2)return;
  const decorated=cards.map((card,index)=>{
    const target=card.querySelector('h3')?.textContent?.trim()||'';
    const s=stats(source,target);
    const caution=card.classList.contains('caution')?1:0;
    return{card,index,caution,...s};
  });
  decorated.sort((a,b)=>{
    if(a.caution!==b.caution)return a.caution-b.caution;
    if(a.score!==b.score)return b.score-a.score;
    if(a.fit!==b.fit)return b.fit-a.fit;
    if(a.doubt!==b.doubt)return a.doubt-b.doubt;
    return a.index-b.index;
  });
  decorated.forEach(x=>root.appendChild(x.card));
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;rank()})}
document.addEventListener('DOMContentLoaded',()=>{
  const root=document.querySelector('#results');
  if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:false});
  document.querySelector('#scope')?.addEventListener('change',schedule);
  document.querySelector('#caution')?.addEventListener('change',schedule);
  schedule();
});
})();
