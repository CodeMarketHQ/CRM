(function(){
  const CRM=window.CRM=window.CRM||{};
  CRM.state={
    file:null,workbook:null,sheetNames:[],currentSheet:null,rawRows:[],rows:[],columns:[],profile:[],mappings:{},
    filters:{},dateFilter:null,searchQuery:'',filteredRows:[],chartSelections:{},sort:{column:null,direction:'asc'},pagination:{page:1,rowsPerPage:25},
    visibleColumns:new Set(),activeSection:'overview',charts:new Map(),datasetName:'',loadedAt:null,headerRow:0,duplicateRows:0
  };
  CRM.events=new EventTarget();
  CRM.emit=(name,detail={})=>CRM.events.dispatchEvent(new CustomEvent(name,{detail}));
})();
