(()=>{'use strict';
const nativeFetch=window.fetch.bind(window);
window.fetch=(input,init={})=>{
  try{
    const endpoint=String((window.COC_CONFIG&&window.COC_CONFIG.candidateRequestEndpoint)||'').trim();
    if(endpoint&&String(input)===endpoint&&typeof init.body==='string'){
      const params=new URLSearchParams(init.body);
      const raw=params.get('payload');
      if(raw){
        const payload=JSON.parse(raw);
        if(payload&&payload.action==='candidateRequest'){
          const scopeEl=document.querySelector('#requestScope');
          const scope=scopeEl?String(scopeEl.value||'').trim():'';
          payload.data=payload.data||{};
          if(scope)payload.data.scope=scope;
          params.set('payload',JSON.stringify(payload));
          init={...init,body:params.toString()};
        }
      }
    }
  }catch(err){console.warn('candidate scope attach skipped',err)}
  return nativeFetch(input,init);
};
})();
