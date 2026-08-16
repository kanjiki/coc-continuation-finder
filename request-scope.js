(()=>{'use strict';
const nativeFetch=window.fetch.bind(window);

function createOption(value,label){const o=document.createElement('option');o.value=value;o.textContent=label;return o}
function updateDetailUI(row){
  const scope=row.querySelector('.candidate-scope-select');
  const detail=row.querySelector('.candidate-detail-fields');
  const kpc=row.querySelector('.candidate-kpc');
  const pc=row.querySelector('.candidate-pc');
  const solo=row.querySelector('.candidate-solo');
  if(!scope||!detail)return;
  const value=scope.value;
  const showPair=value==='ペア'||value==='タイマン';
  const showSolo=value==='1人・HO単位';
  detail.classList.toggle('hidden',!showPair&&!showSolo);
  if(kpc)kpc.closest('label').classList.toggle('hidden',!showPair);
  if(pc)pc.closest('label').classList.toggle('hidden',!showPair);
  if(solo)solo.closest('label').classList.toggle('hidden',!showSolo);
  const toggle=row.querySelector('.candidate-condition-toggle');
  if(toggle){
    const has=value||[kpc,pc,solo].some(x=>x&&x.value.trim());
    toggle.textContent=has?'継続条件を編集':'継続条件を追加';
    toggle.classList.toggle('has-value',!!has);
  }
}
function augmentRow(row){
  if(!row||row.dataset.scopeReady==='1')return;
  row.dataset.scopeReady='1';
  const input=row.querySelector('.candidate-input');
  if(!input)return;
  const wrap=document.createElement('div');wrap.className='candidate-main';
  input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
  const toggle=document.createElement('button');toggle.type='button';toggle.className='candidate-condition-toggle';toggle.textContent='継続条件を追加';
  wrap.appendChild(toggle);
  const panel=document.createElement('div');panel.className='candidate-condition-panel hidden';
  const top=document.createElement('div');top.className='candidate-condition-top';
  const scopeLabel=document.createElement('label');scopeLabel.className='mini-field';
  const scopeTitle=document.createElement('span');scopeTitle.textContent='継続形態';
  const scope=document.createElement('select');scope.className='candidate-scope-select';
  scope.append(createOption('','わからない・指定なし'),createOption('自陣全員・複数人','自陣全員・複数人'),createOption('ペア','ペア'),createOption('タイマン','タイマン'),createOption('1人・HO単位','1人・HO単位'));
  scopeLabel.append(scopeTitle,scope);top.append(scopeLabel);panel.append(top);
  const detail=document.createElement('div');detail.className='candidate-detail-fields hidden';
  const kpcLabel=document.createElement('label');kpcLabel.className='mini-field';const kpcTitle=document.createElement('span');kpcTitle.textContent='KPC側のHO・役割';const kpc=document.createElement('input');kpc.type='text';kpc.maxLength=80;kpc.className='candidate-kpc';kpc.placeholder='例：HO1 / 怪盗';kpcLabel.append(kpcTitle,kpc);
  const pcLabel=document.createElement('label');pcLabel.className='mini-field';const pcTitle=document.createElement('span');pcTitle.textContent='PC側のHO・役割';const pc=document.createElement('input');pc.type='text';pc.maxLength=80;pc.className='candidate-pc';pc.placeholder='例：HO2 / 贋作師';pcLabel.append(pcTitle,pc);
  const soloLabel=document.createElement('label');soloLabel.className='mini-field hidden';const soloTitle=document.createElement('span');soloTitle.textContent='推奨HO・対象';const solo=document.createElement('input');solo.type='text';solo.maxLength=80;solo.className='candidate-solo';solo.placeholder='例：HO2 / 残されたPC';soloLabel.append(soloTitle,solo);
  detail.append(kpcLabel,pcLabel,soloLabel);panel.append(detail);
  row.append(panel);
  toggle.addEventListener('click',()=>{panel.classList.toggle('hidden');if(!panel.classList.contains('hidden'))scope.focus()});
  scope.addEventListener('change',()=>updateDetailUI(row));
  [kpc,pc,solo].forEach(el=>el.addEventListener('input',()=>updateDetailUI(row)));
  updateDetailUI(row);
}
function augmentAll(){document.querySelectorAll('.candidate-row').forEach(augmentRow)}
function findCandidateRow(name){return [...document.querySelectorAll('.candidate-row')].find(row=>{const input=row.querySelector('.candidate-input');return input&&input.value.trim()===name})}
function detailFromRow(row){
  if(!row)return{scope:'',scopeDetail:''};
  const scope=String(row.querySelector('.candidate-scope-select')?.value||'').trim();
  let detail='';
  if(scope==='ペア'||scope==='タイマン'){
    const kpc=String(row.querySelector('.candidate-kpc')?.value||'').trim();
    const pc=String(row.querySelector('.candidate-pc')?.value||'').trim();
    detail=[kpc&&`KPC: ${kpc}`,pc&&`PC: ${pc}`].filter(Boolean).join('／');
  }else if(scope==='1人・HO単位'){
    const solo=String(row.querySelector('.candidate-solo')?.value||'').trim();
    if(solo)detail=`HO: ${solo}`;
  }
  return{scope,scopeDetail:detail};
}

const observer=new MutationObserver(augmentAll);
document.addEventListener('DOMContentLoaded',()=>{
  const fields=document.querySelector('#candidateFields');
  if(fields)observer.observe(fields,{childList:true,subtree:true});
  augmentAll();
});

window.fetch=(input,init={})=>{
  try{
    const endpoint=String((window.COC_CONFIG&&window.COC_CONFIG.candidateRequestEndpoint)||'').trim();
    if(endpoint&&String(input)===endpoint&&typeof init.body==='string'){
      const params=new URLSearchParams(init.body);
      const raw=params.get('payload');
      if(raw){
        const payload=JSON.parse(raw);
        if(payload&&payload.action==='candidateRequest'){
          payload.data=payload.data||{};
          const candidate=String(payload.data.candidate||'').trim();
          const extra=detailFromRow(findCandidateRow(candidate));
          if(extra.scope)payload.data.scope=extra.scope;
          if(extra.scopeDetail)payload.data.scopeDetail=extra.scopeDetail;
          params.set('payload',JSON.stringify(payload));
          init={...init,body:params.toString()};
        }
      }
    }
  }catch(err){console.warn('candidate detail attach skipped',err)}
  return nativeFetch(input,init);
};
})();
