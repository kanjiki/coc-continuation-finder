(()=>{'use strict';
const nativeFetch=window.fetch.bind(window);

function createOption(value,label){const o=document.createElement('option');o.value=value;o.textContent=label;return o}
function setField(label,input,title,placeholder){label.className='mini-field';const span=document.createElement('span');span.textContent=title;input.type='text';input.maxLength=80;input.placeholder=placeholder;label.append(span,input)}

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
  if(!row||row.dataset.scopeReady==='1')return;
  const input=row.querySelector('.candidate-input');
  if(!input)return;
  row.dataset.scopeReady='1';

  const main=document.createElement('div');main.className='candidate-main';
  input.parentNode.insertBefore(main,input);main.appendChild(input);

  const scope=document.createElement('select');
  scope.className='candidate-scope-select';
  scope.setAttribute('aria-label','この候補の継続形態');
  scope.append(
    createOption('','条件なし'),
    createOption('自陣全員・複数人','複数人'),
    createOption('ペア','ペア（PC＋PC）'),
    createOption('タイマン','タイマン（KPC＋PC）'),
    createOption('1人・HO単位','ソロ・HO単位')
  );
  main.appendChild(scope);

  const detail=document.createElement('div');detail.className='candidate-detail-fields hidden';

  const pairFields=document.createElement('div');pairFields.className='candidate-pair-fields hidden';
  const pc1Label=document.createElement('label'),pc1=document.createElement('input');pc1.className='candidate-pc1';
  setField(pc1Label,pc1,'PC①のHO・役割','例：HO1 / 怪盗');
  const pc2Label=document.createElement('label'),pc2=document.createElement('input');pc2.className='candidate-pc2';
  setField(pc2Label,pc2,'PC②のHO・役割','例：HO2 / 贋作師');
  pairFields.append(pc1Label,pc2Label);

  const tiebreakFields=document.createElement('div');tiebreakFields.className='candidate-tiebreak-fields hidden';
  const kpcLabel=document.createElement('label'),kpc=document.createElement('input');kpc.className='candidate-kpc';
  setField(kpcLabel,kpc,'KPCにするHO・役割','例：HO1 / 怪盗');
  const pcLabel=document.createElement('label'),pc=document.createElement('input');pc.className='candidate-pc';
  setField(pcLabel,pc,'PCにするHO・役割','例：HO2 / 贋作師');
  tiebreakFields.append(kpcLabel,pcLabel);

  const soloField=document.createElement('label');soloField.className='mini-field candidate-solo-field hidden';
  const soloTitle=document.createElement('span');soloTitle.textContent='使用するHO・対象';
  const solo=document.createElement('input');solo.type='text';solo.maxLength=80;solo.className='candidate-solo';solo.placeholder='例：HO2 / 残されたPC';
  soloField.append(soloTitle,solo);

  detail.append(pairFields,tiebreakFields,soloField);row.append(detail);
  scope.addEventListener('change',()=>updateDetailUI(row));
  updateDetailUI(row);
}

function augmentAll(){document.querySelectorAll('.candidate-row').forEach(augmentRow)}
function findCandidateRow(name){return [...document.querySelectorAll('.candidate-row')].find(row=>{const input=row.querySelector('.candidate-input');return input&&input.value.trim()===name})}
function detailFromRow(row){
  if(!row)return{scope:'',scopeDetail:''};
  const scope=String(row.querySelector('.candidate-scope-select')?.value||'').trim();
  let detail='';
  if(scope==='ペア'){
    const pc1=String(row.querySelector('.candidate-pc1')?.value||'').trim();
    const pc2=String(row.querySelector('.candidate-pc2')?.value||'').trim();
    detail=[pc1&&`PC1: ${pc1}`,pc2&&`PC2: ${pc2}`].filter(Boolean).join('／');
  }else if(scope==='タイマン'){
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
      const params=new URLSearchParams(init.body);const raw=params.get('payload');
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