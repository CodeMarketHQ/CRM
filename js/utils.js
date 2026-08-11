(function(){
  const CRM=window.CRM=window.CRM||{};
  const AR=/[\u0600-\u06FF]/;
  const stopWords=new Set(`a an the and or of to in on for with from by is are was were be been it this that these those as at into about over under between after before during not no yes can could would should will may might has have had do does did ثم أو و في من على إلى عن أن إن كان كانت هو هي هذا هذه ذلك تلك مع ما لا نعم تم لدى عند بعد قبل خلال حيث كما أي كل حتى بين اكثر أكثر جدا جداً الذي التي الذين لما لم لن سوف قد يتم هناك هنا يا اذا إذا ضمن عبر لدى عنده عندها فيه فيها عليها منه منها them their our your his her its we you they i customer customers visit visits report reports`.split(/\s+/));
  function cleanText(v){return v==null?'':String(v).replace(/[\u200E\u200F\u202A-\u202E]/g,'').replace(/\s+/g,' ').trim()}
  function normalizeHeader(v){return cleanText(v).toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[\n\r\t]+/g,' ').replace(/[^\p{L}\p{N}%@]+/gu,' ').replace(/\s+/g,' ').trim()}
  function isBlank(v){return v==null||v===''||(typeof v==='string'&&!v.trim())||(typeof v==='number'&&Number.isNaN(v))}
  function detectDirection(v){const s=cleanText(v);return AR.test(s)?'rtl':'ltr'}
  function numberValue(v){if(typeof v==='number'&&Number.isFinite(v))return v;if(v instanceof Date)return NaN;const s=cleanText(v).replace(/[,\s]/g,'').replace(/[٪%]/g,'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٬،]/g,'').replace(/[^0-9.+-]/g,'');if(!s||!/[0-9]/.test(s))return NaN;const n=Number(s);return Number.isFinite(n)?n:NaN}
  function excelSerialToDate(serial){if(typeof serial!=='number'||serial<1)return null;const ms=Math.round((serial-25569)*86400*1000);const d=new Date(ms);return Number.isNaN(d.getTime())?null:d}
  function parseDate(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return v;
    if(typeof v==='number'&&v>20000&&v<80000)return excelSerialToDate(v);
    const s=cleanText(v);if(!s)return null;
    const iso=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if(iso){const d=new Date(+iso[1],+iso[2]-1,+iso[3],+(iso[4]||0),+(iso[5]||0),+(iso[6]||0));return Number.isNaN(d.getTime())?null:d}
    const dmy=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if(dmy){let y=+dmy[3];if(y<100)y+=2000;const d=new Date(y,+dmy[2]-1,+dmy[1],+(dmy[4]||0),+(dmy[5]||0),+(dmy[6]||0));return Number.isNaN(d.getTime())?null:d}
    const t=Date.parse(s);return Number.isNaN(t)?null:new Date(t)
  }
  function formatNumber(v,digits=0){if(!Number.isFinite(v))return '—';return new Intl.NumberFormat(undefined,{maximumFractionDigits:digits}).format(v)}
  function compactNumber(v){if(!Number.isFinite(v))return '—';return new Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:1}).format(v)}
  function formatPercent(v,digits=0){if(!Number.isFinite(v))return '—';return `${new Intl.NumberFormat(undefined,{maximumFractionDigits:digits}).format(v)}%`}
  function formatDate(v,withTime=false){const d=parseDate(v);if(!d)return cleanText(v)||'—';return new Intl.DateTimeFormat(undefined,withTime?{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}:{year:'numeric',month:'short',day:'numeric'}).format(d)}
  function formatCurrency(v,currency='USD'){if(!Number.isFinite(v))return '—';try{return new Intl.NumberFormat(undefined,{style:'currency',currency,maximumFractionDigits:0}).format(v)}catch(e){return formatNumber(v)}}
  function formatBytes(bytes){if(!Number.isFinite(bytes))return '';const units=['B','KB','MB','GB'];let i=0,n=bytes;while(n>=1024&&i<units.length-1){n/=1024;i++}return `${n.toFixed(i?1:0)} ${units[i]}`}
  function safeUrl(v){const s=cleanText(v);if(!s)return null;try{const u=new URL(s);return ['http:','https:','mailto:','tel:'].includes(u.protocol)?u.href:null}catch(e){return null}}
  function safePhone(v){const s=cleanText(v);if(!s||/[A-Za-z@:/]/.test(s)||!/^\+?[0-9٠-٩() .-]{6,24}$/.test(s))return null;const p=s.replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^+\d]/g,'');return /^\+?\d{6,18}$/.test(p)?p:null}
  function safeEmail(v){const s=cleanText(v);return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)?s:null}
  function debounce(fn,wait=180){let t;return function(...args){clearTimeout(t);t=setTimeout(()=>fn.apply(this,args),wait)}}
  function groupCount(rows,key){const m=new Map();rows.forEach(r=>{const v=cleanText(r[key]);if(v)m.set(v,(m.get(v)||0)+1)});return [...m.entries()].sort((a,b)=>b[1]-a[1])}
  function groupSum(rows,key,valueKey){const m=new Map();rows.forEach(r=>{const k=cleanText(r[key]);const v=numberValue(r[valueKey]);if(k&&Number.isFinite(v))m.set(k,(m.get(k)||0)+v)});return [...m.entries()].sort((a,b)=>b[1]-a[1])}
  function median(values){const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return NaN;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
  function unique(values){return [...new Set(values.filter(v=>!isBlank(v)).map(cleanText))]}
  function escapeCsv(v){const s=v==null?'':String(v);return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
  function downloadText(text,name,type='text/csv;charset=utf-8'){const blob=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0)}
  function csvFromRows(rows,columns){const lines=[columns.map(escapeCsv).join(',')];for(const r of rows)lines.push(columns.map(c=>escapeCsv(r[c])).join(','));return '\uFEFF'+lines.join('\r\n')}
  function tokenize(text){return cleanText(text).toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[]}
  function topTerms(rows,keys,limit=12){const m=new Map();rows.forEach(r=>keys.forEach(k=>tokenize(r[k]).forEach(w=>{const n=normalizeHeader(w);if(n&&!stopWords.has(n)&&!/^\d+$/.test(n))m.set(n,(m.get(n)||0)+1)})));return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,limit)}
  function dom(tag,attrs={},children=[]){const el=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>{if(k==='class')el.className=v;else if(k==='text')el.textContent=v;else if(k==='style')el.setAttribute('style',v);else if(k.startsWith('aria-'))el.setAttribute(k,v);else if(k==='dataset')Object.assign(el.dataset,v);else if(k in el)el[k]=v;else el.setAttribute(k,v)});(Array.isArray(children)?children:[children]).filter(Boolean).forEach(c=>el.append(c.nodeType?c:document.createTextNode(String(c))));return el}
  function setText(el,v){if(el)el.textContent=v==null?'':String(v)}
  function formatByMeta(v,meta){if(isBlank(v))return '—';if(!meta)return cleanText(v);if(['numeric','quantity'].includes(meta.type))return formatNumber(numberValue(v),2);if(meta.type==='monetary')return formatNumber(numberValue(v),0);if(meta.type==='percentage')return formatPercent(numberValue(v),1);if(meta.type==='date')return formatDate(v,false);if(meta.type==='datetime')return formatDate(v,true);return cleanText(v)}
  CRM.utils={cleanText,normalizeHeader,isBlank,detectDirection,numberValue,excelSerialToDate,parseDate,formatNumber,compactNumber,formatPercent,formatDate,formatCurrency,formatBytes,safeUrl,safePhone,safeEmail,debounce,groupCount,groupSum,median,unique,escapeCsv,downloadText,csvFromRows,topTerms,dom,setText,formatByMeta};
})();
