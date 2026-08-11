(function(){
  const CRM=window.CRM=window.CRM||{},U=CRM.utils;
  function recordMatches(row,excludeColumn=null){const S=CRM.state;
    for(const [column,selected] of Object.entries(S.filters)){if(column===excludeColumn||!selected?.size)continue;const value=U.cleanText(row[column]);if(!selected.has(value))return false}
    if(S.dateFilter&&S.mappings.date){const d=U.parseDate(row[S.mappings.date]);if(!d)return false;const t=d.getTime();if(S.dateFilter.start&&t<S.dateFilter.start.getTime())return false;if(S.dateFilter.end){const end=new Date(S.dateFilter.end);end.setHours(23,59,59,999);if(t>end.getTime())return false}}
    const q=U.normalizeHeader(S.searchQuery);if(q){const searchable=S.profile.filter(p=>['person/name','company/customer','geographic/location','product','long text','free text','categorical','email','phone'].includes(p.type)).map(p=>p.name);let found=false;for(const c of searchable){if(U.normalizeHeader(row[c]).includes(q)){found=true;break}}if(!found)return false}
    return true
  }
  function apply(){const S=CRM.state;S.filteredRows=S.rows.filter(r=>recordMatches(r));S.pagination.page=1;CRM.emit('filters:changed',{rows:S.filteredRows})}
  function optionCounts(column){const S=CRM.state,m=new Map();for(const r of S.rows){if(!recordMatches(r,column))continue;const v=U.cleanText(r[column]);if(v)m.set(v,(m.get(v)||0)+1)}return [...m.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))}
  function toggle(column,value){const S=CRM.state;if(!S.filters[column])S.filters[column]=new Set();const set=S.filters[column];set.has(value)?set.delete(value):set.add(value);if(!set.size)delete S.filters[column];apply()}
  function clearColumn(column){delete CRM.state.filters[column];apply()}
  function clearAll(){CRM.state.filters={};CRM.state.dateFilter=null;CRM.state.searchQuery='';CRM.state.chartSelections={};apply()}
  function setSearch(q){CRM.state.searchQuery=U.cleanText(q);apply()}
  function setDate(start,end,label='Custom Range'){CRM.state.dateFilter=start||end?{start:start||null,end:end||null,label}:null;apply()}
  function setSingle(column,value,source='chart'){CRM.state.filters[column]=new Set([U.cleanText(value)]);CRM.state.chartSelections[column]={value:U.cleanText(value),source};apply()}
  function activeCount(){let n=Object.values(CRM.state.filters).reduce((s,set)=>s+set.size,0);if(CRM.state.dateFilter)n++;if(CRM.state.searchQuery)n++;return n}
  CRM.filters={apply,recordMatches,optionCounts,toggle,clearColumn,clearAll,setSearch,setDate,setSingle,activeCount};
})();
