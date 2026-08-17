(()=>{'use strict';
const nativeFetch=window.fetch.bind(window);

function createOption(value,label){const o=document.createElement('option');o.value=value;o.textContent=label;return o}
function setField(label,input,title,placeholder){label.className='mini-field';const span=document.createElement('span');span.textContent=title;input.type='text';input.maxLength=80;input.placeholder=placeholder;label.append(span,input)}
function renumber(){const rows=[...document.querySelectorAll('.candidate-row')];rows.forEach((row,i)=>{const n=row.querySelector('.candidate-number');if(n)n.textContent=String(i+1).padStart(2,'0')})}
function toast(text){const el=document.querySelector('#toast');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)}
function collectCandidates(){const seen=new Set(),rows=[];for(const input of document.querySelectorAll('.candidate-input')){const name=input.value.trim();if(!name||seen.has(name))continue;seen.add(name);rows.push({name,row:input.closest('.candidate-row')});if(rows.length>=10)break}return rows}
function updateLiveCount(){const n=collectCandidates().length;const count=document.querySelector('#requestCount');if(count)count.textContent=`${n}件`;document.querySelector('#sendRequest')?.classList.toggle('ready',n>0)}
function bindCandidateInput(input){if(!input||input.dataset.countBound==='1')return;input.dataset.countBound='1';input.addEventListener('input',updateLiveCount);input.addEventListener('change',updateLiveCount)}
function ensureCandidateRow(){
  const container=document.querySelector('#candidateFields');
  if(!container||container.querySelector('.candidate-input'))return;
  const row=document.createElement('div');row.className='candidate-row';
  const number=document.createElement('span');number.className='candidate-number';number.textContent='01';
  const input=document.createElement('input');input.type='text';input.maxLength=160;input.autocomplete='off';input.className='candidate-input';input.placeholder='継続先シナリオの正式名称';
  const remove=document.createElement('button');remove.type='button';remove.className='candidate-remove invisible';remove.setAttribute('aria-label','この入力欄を削除');remove.textContent='×';
  bindCandidateInput(input);
  input.addEventListener('input',()=>{
    if(!input.value.trim())return;
    const rows=[...container.querySelectorAll('.candidate-row')];
    if(rows.length===1&&rows.length<10){
      const next=document.createElement('div');next.className='candidate-row';
      const nn=document.createElement('span');nn.className='candidate-number';
      const ni=document.createElement('input');ni.type='text';ni.maxLength=160;ni.autocomplete='off';ni.className='candidate-input';ni.placeholder='継続先シナリオの正式名称';bindCandidateInput(ni);
      const nr=document.createElement('button');nr.type='button';nr.className='candidate-remove';nr.textContent='×';nr.setAttribute('aria-label','この入力欄を削除');
      nr.addEventListener('click',()=>{next.remove();renumber();updateLiveCount()});
      next.append(nn,ni,nr);container.append(next);augmentRow(next);renumber();updateLiveCount();
    }
  },{once:true});
  row.append(number,input,remove);container.append(row);renumber();updateLiveCount();
}

function updateDetailUI(row){
  const scope=row.querySelector('.candidate-scope-select');
  const detail=row.querySelector('.candidate-detail-fields');
  const pairFields=row.querySelector('.candidate-pair-fields');
  const tiebreakFields=row.querySelector('.candidate-tiebreak-fields');
  const soloField=row.querySelector('.candidate-solo-field');
  if(!scope||!detail)return;
  const value=scope.value;
  const showPair=value==='ペア';
  const showTiebreak=value==='タイマン';
  const showSolo=value==='1人・HO単位';
  detail.classList.toggle('hidden',!showPair&&!showTiebreak&&!showSolo);
  if(pairFields)pairFields.classList.toggle('hidden',!showPair);
  if(tiebreakFields)tiebreakFields.classList.toggle('hidden',!showTiebreak);
  if(soloField)soloField.classList.toggle('hidden',!showSolo);
}

function augmentRow(row){
  if(!row)return;
  const input=row.querySelector('.candidate-input');
  if(!input)return;
  bindCandidateInput(input);
  if(row.dataset.scopeReady==='1')return;
  row.dataset.scopeReady='1';
  const main=document.createElement('div');main.className='candidate-main';
  input.parentNode.insertBefore(main,input);main.appendChild(input);
  const scopeWrap=document.createElement('label');scopeWrap.className='candidate-scope-wrap';
  const scopeTitle=document.createElement('span');scopeTitle.className='candidate-inline-label';scopeTitle.textContent='継続形態';
  const scope=document.createElement('select');scope.className='candidate-scope-select';scope.setAttribute('aria-label','この候補の継続形態');
  scope.append(createOption('','指定なし'),createOption('自陣全員・複数人','複数人'),createOption('ペア','ペア（PC＋PC）'),createOption('タイマン','タイマン（KPC＋PC）'),createOption('1人・HO単位','ソロ・HO単位'));
  scopeWrap.append(scopeTitle,scope);main.appendChild(scopeWrap);
  const detail=document.createElement('div');detail.className='candidate-detail-fields hidden';
  const detailTitle=document.createElement('div');detailTitle.className='candidate-target-title';detailTitle.textContent='継続対象';
  const pairFields=document.createElement('div');pairFields.className='candidate-pair-fields hidden';
  const pc1Label=document.createElement('label'),pc1=document.createElement('input');pc1.className='candidate-pc1';setField(pc1Label,pc1,'PC①のHO・役割','例：HO1 / 怪盗');
  const pc2Label=document.createElement('label'),pc2=document.createElement('input');pc2.className='candidate-pc2';setField(pc2Label,pc2,'PC②のHO・役割','例：HO2 / 贋作師');pairFields.append(pc1Label,pc2Label);
  const tiebreakFields=document.createElement('div');tiebreakFields.className='candidate-tiebreak-fields hidden';
  const kpcLabel=document.createElement('label'),kpc=document.createElement('input');kpc.className='candidate-kpc';setField(kpcLabel,kpc,'KPCにするHO・役割','例：HO1 / 怪盗');
  const pcLabel=document.createElement('label'),pc=document.createElement('input');pc.className='candidate-pc';setField(pcLabel,pc,'PCにするHO・役割','例：HO2 / 贋作師');tiebreakFields.append(kpcLabel,pcLabel);
  const soloField=document.createElement('label');soloField.className='mini-field candidate-solo-field hidden';const soloTitle=document.createElement('span');soloTitle.textContent='使用するHO・対象';const solo=document.createElement('input');solo.type='text';solo.maxLength=80;solo.className='candidate-solo';solo.placeholder='例：HO2 / 残されたPC';soloField.append(soloTitle,solo);
  detail.append(detailTitle,pairFields,tiebreakFields,soloField);row.append(detail);scope.addEventListener('change',()=>updateDetailUI(row));updateDetailUI(row);
}
function augmentAll(){ensureCandidateRow();document.querySelectorAll('.candidate-row').forEach(augmentRow);updateLiveCount()}
function findCandidateRow(name){return [...document.querySelectorAll('.candidate-row')].find(row=>{const input=row.querySelector('.candidate-input');return input&&input.value.trim()===name})}
function detailFromRow(row){if(!row)return{scope:'',scopeDetail:''};const scope=String(row.querySelector('.candidate-scope-select')?.value||'').trim();let detail='';if(scope==='ペア'){const pc1=String(row.querySelector('.candidate-pc1')?.value||'').trim();const pc2=String(row.querySelector('.candidate-pc2')?.value||'').trim();detail=[pc1&&`PC1: ${pc1}`,pc2&&`PC2: ${pc2}`].filter(Boolean).join('／')}else if(scope==='タイマン'){const kpc=String(row.querySelector('.candidate-kpc')?.value||'').trim();const pc=String(row.querySelector('.candidate-pc')?.value||'').trim();detail=[kpc&&`KPC: ${kpc}`,pc&&`PC: ${pc}`].filter(Boolean).join('／')}else if(scope==='1人・HO単位'){const solo=String(row.querySelector('.candidate-solo')?.value||'').trim();if(solo)detail=`HO: ${solo}`}return{scope,scopeDetail:detail}}

async function fallbackSubmit(){
  const source=String(document.querySelector('#requestSource')?.value||'').trim();
  const candidates=collectCandidates();
  if(!source){toast('元シナリオ名を入力してください');document.querySelector('#requestSource')?.focus();return}
  if(!candidates.length){toast('継続先候補を1件以上入力してください');document.querySelector('.candidate-input')?.focus();return}
  const endpoint=String((window.COC_CONFIG&&window.COC_CONFIG.candidateRequestEndpoint)||'').trim();
  const button=document.querySelector('#sendRequest');
  const status=document.querySelector('#requestStatus');
  if(!endpoint){if(status)status.textContent='現在送信先を確認できません。';toast('送信先を確認できません');return}
  if(button)button.disabled=true;if(status)status.textContent=`${candidates.length}件を送信中…`;
  try{
    await Promise.all(candidates.map(({name,row})=>{
      const extra=detailFromRow(row);const data={source,candidate:name,mode:new URLSearchParams(location.search).get('test')==='1'?'test':'public'};
      if(extra.scope)data.scope=extra.scope;if(extra.scopeDetail)data.scopeDetail=extra.scopeDetail;
      const payload={action:'candidateRequest',data};
      const body=new URLSearchParams({payload:JSON.stringify(payload)}).toString();
      return nativeFetch(endpoint,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body,keepalive:true});
    }));
    document.querySelector('#candidateFields').innerHTML='';ensureCandidateRow();augmentAll();
    if(status)status.textContent=`${candidates.length}件の候補を送信しました。ありがとうございます。`;toast(`${candidates.length}件を送信しました`);
  }catch(err){if(status)status.textContent='送信に失敗しました。もう一度お試しください。';toast('送信できませんでした')}finally{if(button)button.disabled=false}
}

const observer=new MutationObserver(augmentAll);
document.addEventListener('DOMContentLoaded',()=>{
  const fields=document.querySelector('#candidateFields');if(fields)observer.observe(fields,{childList:true,subtree:true});
  augmentAll();setTimeout(augmentAll,100);setTimeout(augmentAll,600);
  const button=document.querySelector('#sendRequest');
  if(button&&!button.onclick)button.addEventListener('click',fallbackSubmit);
});

window.fetch=(input,init={})=>{try{const endpoint=String((window.COC_CONFIG&&window.COC_CONFIG.candidateRequestEndpoint)||'').trim();if(endpoint&&String(input)===endpoint&&typeof init.body==='string'){const params=new URLSearchParams(init.body);const raw=params.get('payload');if(raw){const payload=JSON.parse(raw);if(payload&&payload.action==='candidateRequest'){payload.data=payload.data||{};const candidate=String(payload.data.candidate||'').trim();const extra=detailFromRow(findCandidateRow(candidate));if(extra.scope)payload.data.scope=extra.scope;if(extra.scopeDetail)payload.data.scopeDetail=extra.scopeDetail;params.set('payload',JSON.stringify(payload));init={...init,body:params.toString()}}}}}catch(err){console.warn('candidate detail attach skipped',err)}return nativeFetch(input,init)};
})();