(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const CONFIG=window.COC_CONFIG||{};
let sources=[],edges=[],current='',intent='',isTest=false;

document.addEventListener('DOMContentLoaded',()=>{
  const custom=window.COC_CUSTOM;
  if(custom&&Array.isArray(custom.sources)&&Array.isArray(custom.edges)){sources=custom.sources;edges=custom.edges}else{sources=window.COC_SOURCES||[];edges=window.COC_EDGES||[]}
  renderSources();renderRequestSourceSuggestions();renderStats();initCandidateFields();bind();
  const q=new URLSearchParams(location.search);
  isTest=q.get('test')==='1';
  if(isTest){$('#testBanner').classList.remove('hidden');$('#feedback').classList.remove('hidden')}
  const s=q.get('scenario');
  if(s&&sources.some(x=>x.n===s)){$('#source').value=s;search()}
});

function renderSources(){sources.slice().sort((a,b)=>a.n.localeCompare(b.n,'ja')).forEach(x=>{const o=document.createElement('option');o.value=x.n;o.textContent=x.n;$('#source').append(o)})}
function renderRequestSourceSuggestions(){const dl=$('#requestSourceList');sources.slice().sort((a,b)=>a.n.localeCompare(b.n,'ja')).forEach(x=>{const o=document.createElement('option');o.value=x.n;dl.append(o)})}
function renderStats(){const targets=new Set(edges.map(e=>e.t));const linked=edges.filter(e=>Array.isArray(e.d)&&e.d.length).length;$('#heroStats').innerHTML=`<span><b>${sources.length}</b> 元シナリオ</span><span><b>${edges.length}</b> 継続実例</span><span><b>${targets.size}</b> 継続先</span><span><b>${linked}</b> 配布先確認済み</span>`}

function bind(){
  $('#go').onclick=search;
  $('#source').onchange=search;
  $('#scope').onchange=()=>current&&render();
  $('#caution').onchange=()=>current&&render();
  $('#requestSource').addEventListener('input',()=>{$('#requestSource').dataset.auto='0'});
  $$('[data-intent]').forEach(b=>b.onclick=()=>{intent=b.dataset.intent;$$('[data-intent]').forEach(x=>x.classList.toggle('active',x===b))});
  $('#sendFeedback').onclick=feedback;
  $('#sendRequest').onclick=requestCandidate;
}

function scopeType(v){if(!v)return'';if(/ペア/.test(v))return'pair';if(/1人|HO単位/.test(v))return'solo';return'group'}
function search(){
  current=$('#source').value;
  const q=new URLSearchParams(location.search);
  if(current)q.set('scenario',current);else q.delete('scenario');
  history.replaceState(null,'',`${location.pathname}${q.toString()?`?${q}`:''}`);
  const requestSource=$('#requestSource');
  if(current&&(!requestSource.value.trim()||requestSource.dataset.auto==='1')){requestSource.value=current;requestSource.dataset.auto='1'}
  render();
}

function render(){
  if(!current){$('#summary').textContent='元シナリオを選んでください。';$('#results').className='empty';$('#results').textContent='ここに継続先候補が表示されます。';return}
  let rows=edges.filter(e=>e.s===current);
  const sc=$('#scope').value;if(sc)rows=rows.filter(e=>scopeType(e.c)===sc);
  if(!$('#caution').checked)rows=rows.filter(e=>e.st!=='注意');
  rows.sort((a,b)=>(a.st==='注意')-(b.st==='注意'));
  $('#summary').textContent=`${current} · ${rows.length}件`;
  if(!rows.length){$('#results').className='empty';$('#results').textContent='この条件では候補がありません。';return}
  $('#results').className='cards';$('#results').innerHTML=rows.map(card).join('');
}

function card(e){
  const caution=e.st==='注意';
  const markets=e.d&&e.d.length?`<div class="markets"><b>販売・配布元</b>${e.d.map(x=>`<a href="${escA(x[1])}" target="_blank" rel="noopener noreferrer">${esc(x[0])}<span>↗</span></a>`).join('')}</div>`:`<div class="markets"><b>販売・配布元</b><span class="pending">確認中</span></div>`;
  return `<article class="card${caution?' caution':''}"><div class="cardtop"><h3>${esc(e.t)}</h3><span class="status-dot ${caution?'warn':'good'}"></span></div><div class="badges"><span class="badge ${caution?'warn':'good'}">${esc(e.st)}</span><span class="badge">${esc(e.c)}</span><span class="badge">${esc(e.e)}</span></div><p class="reason">${esc(e.r)}</p>${markets}</article>`
}

function initCandidateFields(){addCandidateInput();updateRequestCount()}
function addCandidateInput(value=''){
  const container=$('#candidateFields');
  const row=document.createElement('div');row.className='candidate-row';
  const number=document.createElement('span');number.className='candidate-number';
  const input=document.createElement('input');input.type='text';input.maxLength=160;input.autocomplete='off';input.className='candidate-input';input.placeholder='継続先シナリオの正式名称';input.value=value;
  const remove=document.createElement('button');remove.type='button';remove.className='candidate-remove';remove.setAttribute('aria-label','この入力欄を削除');remove.textContent='×';
  input.addEventListener('input',maintainCandidateFields);
  remove.addEventListener('click',()=>{row.remove();if(!$('.candidate-row'))addCandidateInput();maintainCandidateFields()});
  row.append(number,input,remove);container.append(row);renumberCandidateFields();
}
function maintainCandidateFields(){
  let inputs=$$('.candidate-input');
  if(inputs.length&&inputs[inputs.length-1].value.trim()&&inputs.length<11)addCandidateInput();
  let rows=$$('.candidate-row');
  while(rows.length>1){const last=rows[rows.length-1].querySelector('.candidate-input');const prev=rows[rows.length-2].querySelector('.candidate-input');if(!last.value.trim()&&!prev.value.trim()){rows[rows.length-1].remove();rows=$$('.candidate-row')}else break}
  renumberCandidateFields();updateRequestCount();
}
function renumberCandidateFields(){const rows=$$('.candidate-row');rows.forEach((row,i)=>{row.querySelector('.candidate-number').textContent=String(i+1).padStart(2,'0');const input=row.querySelector('.candidate-input');const remove=row.querySelector('.candidate-remove');remove.classList.toggle('invisible',rows.length===1||i===rows.length-1&&!input.value.trim())})}
function getCandidates(){const seen=new Set();const result=[];for(const input of $$('.candidate-input')){const v=input.value.trim();if(v&&!seen.has(v)){seen.add(v);result.push(v)}if(result.length>=10)break}return result}
function updateRequestCount(){const n=getCandidates().length;$('#requestCount').textContent=`${n}件`;const button=$('#sendRequest');button.classList.toggle('ready',n>0)}
function resetCandidateFields(){$('#candidateFields').innerHTML='';addCandidateInput();updateRequestCount()}

async function requestCandidate(){
  const source=$('#requestSource').value.trim();const candidates=getCandidates();
  if(!source){toast('元シナリオ名を入力してください');$('#requestSource').focus();return}
  if(!candidates.length){toast('継続先候補を1件以上入力してください');const first=$('.candidate-input');if(first)first.focus();return}
  const button=$('#sendRequest');const endpoint=String(CONFIG.candidateRequestEndpoint||'').trim();
  if(endpoint){
    button.disabled=true;$('#requestStatus').textContent=`${candidates.length}件を送信中…`;
    try{
      await Promise.all(candidates.map(candidate=>{const payload={action:'candidateRequest',data:{source,candidate,mode:isTest?'test':'public'}};const body=new URLSearchParams({payload:JSON.stringify(payload)}).toString();return fetch(endpoint,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body,keepalive:true})}));
      resetCandidateFields();$('#requestStatus').textContent=`${candidates.length}件の候補を送信しました。ありがとうございます。`;toast(`${candidates.length}件を送信しました`)
    }catch(err){$('#requestStatus').textContent='送信に失敗しました。時間を置いてもう一度お試しください。';toast('送信できませんでした')}finally{button.disabled=false}
    return;
  }
  const text=['【継続先候補の要望】',`元シナリオ：${source}`,'出てほしい継続先：',...candidates.map((x,i)=>`${i+1}. ${x}`)].join('\n');
  try{if(navigator.share){await navigator.share({title:'継続先候補の要望',text});$('#requestStatus').textContent='共有画面を開きました。';toast('共有画面を開きました')}else{await navigator.clipboard.writeText(text);$('#requestStatus').textContent='要望文をコピーしました。';toast('コピーしました')}}catch(err){if(err&&err.name==='AbortError')return;try{await navigator.clipboard.writeText(text);$('#requestStatus').textContent='要望文をコピーしました。';toast('コピーしました')}catch{$('#requestStatus').textContent=text}}
}

async function feedback(){if(!intent){toast('利用意向を選んでください');return}const text=['【継続先検索テスト回答】',`利用意向：${intent}`,`元シナリオ：${current||'未選択'}`,`コメント：${$('#comment').value.trim()||'なし'}`].join('\n');try{await navigator.clipboard.writeText(text);$('#feedbackStatus').textContent='回答文をコピーしました。Discordなどで送ってください。';toast('コピーしました')}catch{$('#feedbackStatus').textContent=text}}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function escA(v){return esc(v)}
function toast(t){const x=$('#toast');x.textContent=t;x.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>x.classList.remove('show'),2200)}
})();
