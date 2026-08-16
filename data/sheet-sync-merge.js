(()=>{'use strict';
const sync=window.COC_SHEET_SYNC;
if(!sync||!Array.isArray(sync.edges)||!Array.isArray(sync.sources))return;
const custom=window.COC_CUSTOM;
const baseSources=custom&&Array.isArray(custom.sources)?custom.sources:(window.COC_SOURCES||[]);
const baseEdges=custom&&Array.isArray(custom.edges)?custom.edges:(window.COC_EDGES||[]);

const sourceMap=new Map();
baseSources.forEach(x=>{if(x&&x.n)sourceMap.set(x.n,x)});
sync.sources.forEach(x=>{
  if(!x||!x.n)return;
  const prev=sourceMap.get(x.n)||{};
  const aliases=[...(Array.isArray(prev.a)?prev.a:[]),...(Array.isArray(x.a)?x.a:[])];
  sourceMap.set(x.n,{...prev,...x,a:[...new Set(aliases)]});
});

const edgeMap=new Map();
baseEdges.forEach(e=>{if(e&&e.s&&e.t)edgeMap.set(`${e.s}\u0000${e.t}`,e)});
// スプレッドシートで「公開OK」にした内容を優先する。
sync.edges.forEach(e=>{if(e&&e.s&&e.t)edgeMap.set(`${e.s}\u0000${e.t}`,e)});

window.COC_CUSTOM={
  sources:[...sourceMap.values()],
  edges:[...edgeMap.values()]
};
})();
