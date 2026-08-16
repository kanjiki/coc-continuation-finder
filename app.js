(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const CONFIG=window.COC_CONFIG||{};
let sources=[],edges=[],current='',intent='';
let isTest=false;
document.addEventListener('DOMContentLoaded',()=>{const custom=window.COC_CUSTOM;if(custom&&Array.isArray(custom.sources)&&Array.isArray(custom.edges)){sources=custom.sources;edges=custom.edges}else{sources=window.COC_SOURCES||[];edges=window.COC_EDGES||[]}renderSources();bind();const q=new URLSearchParams(location.search);isTest=q.get('test')==='1';if(isTest){$('#testBanner').classList.remove('hidden');$('#feedback').classList.remove('hidden')}const s=q.get('scenario');if(s&&sources.some(x=>x.n===s)){$('#source').value=s;search()}});
function renderSources(){sources.slice().sort((a,b)=>a.n.localeCompare(b.n,'ja')).forEach(x=>{const o=document.createElement('option');o.value=x.n;o.textContent=x.n;$('#source').append(o)})}
function bind(){$('#go').onclick=search;$('#source').onchange=search;$('#scope').onchange=()=>current&&render();$('#caution').onchange=()=>current&&render();$$('[data-intent]').forEach(b=>b.onclick=()=>{intent=b.dataset.intent;$$('[data-intent]').forEach(x=>x.classList.toggle('active',x===b))});$('#sendFeedback').onclick=feedback;$('#sendRequest').onclick=requestCandidate}
function scopeType(v){if(!v)return'';if(/ペア/.test(v))return'pair';if(/1人|HO単位/.test(v))return'solo';return'group'}
function search(){current=$('#source').value;const q=new URLSearchParams(location.search);if(current)q.set('scenario',current);else q.delete('scenario');history.replaceState(null,'',`${location.pathname}${q.toString()?`?${q}`:''}`);render()}
function render(){if(!current){$('#summary').textContent='元シナリオを選んでください。';$('#results').className='empty';$('#results').textContent='ここに候補が表示されます。';return}let rows=edges.filter(e=>e.s===current);const sc=$('#scope').value;if(sc)rows=rows.filter(e=>scopeType(e.c)===sc);if(!$('#caution').checked)rows=rows.filter(e=>e.st!=='注意');rows.sort((a,b)=>(a.st==='注意')-(b.st==='注意'));$('#summary').textContent=`${current}：${rows.length}件`;if(!rows.length){$('#results').className='empty';$('#results').textContent='この条件では候補がありません。';return}$('#results').className='cards';$('#results').innerHTML=rows.map(card).join('')}
function card(e){const caution=e.st==='注意';const markets=e.d&&e.d.length?`<div class="markets"><b>販売・配布元</b>${e.d.map(x=>`<a href="${escA(x[1])}" target="_blank" rel="noopener noreferrer">${esc(x[0])} ↗</a>`).join('')}</div>`:`<div class="markets"><b>販売・配布元</b><span class="pending">確認中</span></div>`;return `<article class="card${caution?' caution':''}"><div class="cardtop"><h3>${esc(e.t)}</h3></div><div class="badges"><span class="badge ${caution?'warn':'good'}">${esc(e.st)}</span><span class="badge">${esc(e.c)}</span><span class="badge">${esc(e.e)}</span></div><p class="reason">${esc(e.r)}</p>${markets}</article>`}
async function requestCandidate(){
  const candidate=$('#requestedCandidate').value.trim();
  if(!current){toast('先に元シナリオを選んでください');return}
  if(!candidate){toast('候補名を入力してください');return}
  const button=$('#sendRequest');
  const endpoint=String(CONFIG.candidateRequestEndpoint||'').trim();
  if(endpoint){
    button.disabled=true;
    $('#requestStatus').textContent='送信中…';
    const payload={action:'candidateRequest',data:{source:current,candidate,mode:isTest?'test':'public'}};
    try{
      const body=new URLSearchParams({payload:JSON.stringify(payload)}).toString();
      await fetch(endpoint,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body,keepalive:true});
      $('#requestedCandidate').value='';
      $('#requestStatus').textContent='送信しました。ありがとうございます。';
      toast('候補を送信しました');
    }catch(err){
      $('#requestStatus').textContent='送信に失敗しました。時間を置いてもう一度お試しください。';
      toast('送信できませんでした');
    }finally{button.disabled=false}
    return;
  }
  const text=['【継続先候補の要望】',`元シナリオ：${current}`,`出てほしい継続先：${candidate}`].join('\n');
  try{if(navigator.share){await navigator.share({title:'継続先候補の要望',text});$('#requestStatus').textContent='共有画面を開きました。';toast('共有画面を開きました')}else{await navigator.clipboard.writeText(text);$('#requestStatus').textContent='要望文をコピーしました。Discordなどで送ってください。';toast('コピーしました')}}catch(err){if(err&&err.name==='AbortError')return;try{await navigator.clipboard.writeText(text);$('#requestStatus').textContent='要望文をコピーしました。Discordなどで送ってください。';toast('コピーしました')}catch{$('#requestStatus').textContent=text}}
}
async function feedback(){if(!intent){toast('利用意向を選んでください');return}const text=['【継続先検索テスト回答】',`利用意向：${intent}`,`元シナリオ：${current||'未選択'}`,`コメント：${$('#comment').value.trim()||'なし'}`].join('\n');try{await navigator.clipboard.writeText(text);$('#feedbackStatus').textContent='回答文をコピーしました。Discordなどで送ってください。';toast('コピーしました')}catch{$('#feedbackStatus').textContent=text}}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}function escA(v){return esc(v)}function toast(t){const x=$('#toast');x.textContent=t;x.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>x.classList.remove('show'),2200)}
})();
