(()=>{'use strict';
function renderUniqueScenarioStats(){
  const custom=window.COC_CUSTOM;
  const edges=custom&&Array.isArray(custom.edges)?custom.edges:(window.COC_EDGES||[]);
  const sourceNames=new Set();
  const targetNames=new Set();
  for(const edge of edges){
    const source=String(edge?.s??'').trim();
    const target=String(edge?.t??'').trim();
    if(source)sourceNames.add(source);
    if(target)targetNames.add(target);
  }
  const box=document.querySelector('#heroStats');
  if(!box)return;
  box.innerHTML=`<span><b>${sourceNames.size}</b> 元シナリオ</span><span><b>${targetNames.size}</b> 継続先シナリオ</span>`;
}
document.addEventListener('DOMContentLoaded',renderUniqueScenarioStats);
})();
