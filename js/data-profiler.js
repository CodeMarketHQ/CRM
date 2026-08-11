(function(){
  const CRM=window.CRM=window.CRM||{},U=CRM.utils;
  const semantics={
    representative:['representative','representative name','sales rep','sales representative','employee','مندوب','اسم المندوب','المندوب','موظف'],
    customer:['customer','customer name','client','client name','العميل','اسم العميل','إسم العميل','عميل'],
    company:['project','project name','company','company name','organization','account','الشركة','اسم الشركة','إسم الشركة','المشروع','اسم المشروع','إسم المشروع'],
    location:['location','city','region','area','territory','district','الموقع','المنطقة','المدينة','المحافظة'],
    purpose:['purpose','purpose of visit','visit purpose','visit type','reason','نوع الزيارة','غرض الزيارة','غرض','الهدف من الزيارة'],
    amount:['expected amount','amount','potential','opportunity value','estimated value','value','expected value','المبلغ المتوقع','القيمة المتوقعة','القيمة','مبلغ'],
    product:['product','products required','item','items','sku','material','المنتجات','المنتج','الصنف','الاصناف','المواد المطلوبة'],
    quantity:['quantity','qty','required quantity','material required','how much material','الكمية','كمية','الكمية المطلوبة','كمية المواد'],
    issue:['issue','issues','observation','observations','problem','complaint','مشكلة','مشكلات','ملاحظات','المشكلات','الملاحظات والمشكلات'],
    notes:['customer notes','notes','note','comments','remarks','ملاحظات الزيارة','ملاحظات العميل','تعليقات'],
    date:['date','visit date','date of visit','تاريخ','تاريخ الزيارة'],
    datetime:['timestamp','date time','date & time','visit time','date and time of visit','تاريخ ووقت','وقت الزيارة','تاريخ ووقت الزيارة'],
    email:['email','email address','البريد','البريد الالكتروني','البريد الإلكتروني'],
    phone:['phone','mobile','contact number','telephone','رقم الهاتف','هاتف','الجوال','رقم الجوال'],
    map:['google map','google maps','map url','location url','maps','خريطة','رابط خريطة','خرائط جوجل'],
    status:['status','state','acknowledgment','acknowledgement','approval','approved','الحالة','اقرار','إقرار','الموافقة']
  };
  function similarity(a,b){a=U.normalizeHeader(a);b=U.normalizeHeader(b);if(!a||!b)return 0;if(a===b)return 1;if(a.includes(b)||b.includes(a))return .88;const A=new Set(a.split(' ')),B=new Set(b.split(' '));let inter=0;A.forEach(x=>{if(B.has(x))inter++});const union=new Set([...A,...B]).size;return union?inter/union:0}
  function headerSemanticScores(header){const scores={};for(const [concept,terms] of Object.entries(semantics)){scores[concept]=Math.max(...terms.map(t=>similarity(header,t)))}return scores}
  function sampleNonBlank(rows,key,max=140){const out=[];for(const r of rows){if(!U.isBlank(r[key]))out.push(r[key]);if(out.length>=max)break}return out}
  function inferType(header,values,rowCount){const hs=headerSemanticScores(header);const text=values.map(U.cleanText);const n=values.length||1;
    const dateRatio=values.filter(v=>U.parseDate(v)).length/n;const numericVals=values.map(U.numberValue).filter(Number.isFinite);const numericRatio=numericVals.length/n;
    const urlRatio=text.filter(v=>!!U.safeUrl(v)).length/n;const emailRatio=text.filter(v=>!!U.safeEmail(v)).length/n;const phoneRatio=text.filter(v=>!!U.safePhone(v)).length/n;
    const boolWords=new Set(['yes','no','true','false','done','تم','نعم','لا','approved','rejected','موافق','مرفوض']);const boolRatio=text.filter(v=>boolWords.has(U.normalizeHeader(v))).length/n;
    const avgLen=text.reduce((s,v)=>s+v.length,0)/n;const unique=new Set(text).size;const uniqRatio=unique/Math.max(1,values.length);
    let type='unknown';
    if(hs.map>.72&&urlRatio>.25)type='map/location URL';
    else if(emailRatio>.65||hs.email>.8&&emailRatio>.2)type='email';
    else if((hs.datetime>.78||hs.date>.78)&&dateRatio>.45)type=hs.datetime>=hs.date?'datetime':'date';
    else if((hs.phone>.8&&phoneRatio>.25)||phoneRatio>.72)type='phone';
    else if(urlRatio>.72)type='URL';
    else if(dateRatio>.82&&numericRatio<.6)type=text.some(v=>/:\d{2}/.test(v))?'datetime':'date';
    else if(hs.amount>.72&&numericRatio>.45)type='monetary';
    else if(hs.quantity>.76&&numericRatio>.35)type='quantity';
    else if((/%|٪/.test(header)||text.some(v=>/[٪%]/.test(v)))&&numericRatio>.55)type='percentage';
    else if(numericRatio>.9)type='numeric';
    else if(hs.product>.75)type='product';
    else if(hs.location>.75)type='geographic/location';
    else if((hs.notes>.70||hs.issue>.70)&&avgLen>24)type=avgLen>90?'long text':'free text';
    else if(hs.representative>.75&&unique>1)type='person/name';
    else if((hs.customer>.75||hs.company>.75)&&hs.notes<.70&&avgLen<80)type='company/customer';
    else if(hs.status>.68||boolRatio>.65||unique<=5&&values.length>3&&avgLen<30)type='boolean/status';
    else if(avgLen>90)type='long text';
    else if(avgLen>35&&uniqRatio>.55)type='free text';
    else if(uniqRatio<.45||unique<=20)type='categorical';
    else if(uniqRatio>.9&&values.length>10)type=/\bid\b|رقم معرف|معرف/.test(U.normalizeHeader(header))?'ID':'free text';
    else type='categorical';
    return{type,hs,dateRatio,numericRatio,urlRatio,emailRatio,phoneRatio,avgLen,uniqRatio}
  }
  function profile(rows,columns){const total=rows.length;return columns.map((name,index)=>{const vals=rows.map(r=>r[name]).filter(v=>!U.isBlank(v));const info=inferType(name,sampleNonBlank(rows,name),total);const uniqueCount=new Set(vals.map(U.cleanText)).size;const missing=total-vals.length;return{name,index,displayName:U.cleanText(name).replace(/\s*[|/]+\s*/g,' · '),type:info.type,records:total,nonEmpty:vals.length,missing,missingPct:total?missing/total*100:0,uniqueCount,uniquenessRatio:vals.length?uniqueCount/vals.length:0,samples:vals.slice(0,4).map(U.cleanText),semanticScores:info.hs,avgLength:info.avgLen}})}
  function valueEvidence(rows,col,concept){const vals=sampleNonBlank(rows,col,100),texts=vals.map(U.cleanText);if(!vals.length)return 0;switch(concept){case'email':return texts.filter(U.safeEmail).length/vals.length;case'phone':return texts.filter(U.safePhone).length/vals.length;case'map':return texts.filter(v=>/google\.[^/]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(v)).length/vals.length;case'date':case'datetime':return vals.filter(U.parseDate).length/vals.length;case'amount':return vals.map(U.numberValue).filter(Number.isFinite).length/vals.length;default:return 0}}
  function mapSemantics(rows,profiles){const concepts=['representative','customer','company','location','purpose','amount','product','quantity','issue','notes','date','datetime','email','phone','map','status'];const mappings={};for(const concept of concepts){let best=null;for(const p of profiles){let score=p.semanticScores?.[concept]||0;score+=valueEvidence(rows,p.name,concept)*.18;if(concept==='representative'){if(p.type==='person/name')score+=.22;if(p.uniqueCount<=1||p.type==='boolean/status')score-=.5;if((p.semanticScores?.status||0)>.65)score-=.22}if(concept==='customer'){if(p.type==='company/customer')score+=.18;if(['long text','free text'].includes(p.type)||(p.semanticScores?.notes||0)>.65)score-=.38;if(p.uniqueCount<=1)score-=.3}if(concept==='company'&&p.type==='company/customer')score+=.16;if(concept==='location'&&p.type==='geographic/location')score+=.15;if(concept==='amount'&&p.type==='monetary')score+=.18;if(concept==='product'&&p.type==='product')score+=.16;if((concept==='issue'||concept==='notes')&&['long text','free text'].includes(p.type))score+=.12;if(['date','datetime'].includes(concept)&&['date','datetime'].includes(p.type))score+=.14;if(score>(best?.score||.52))best={column:p.name,score:Math.min(score,1)}}if(best)mappings[concept]=best.column}
    if(mappings.issue&&mappings.notes&&mappings.issue===mappings.notes){let alt=null;for(const p of profiles){if(p.name===mappings.notes)continue;let score=(p.semanticScores?.issue||0)+(['long text','free text'].includes(p.type)?.12:0)-((p.semanticScores?.notes||0)>.72?.12:0);if(score>(alt?.score||.54))alt={column:p.name,score}}if(alt)mappings.issue=alt.column}if(mappings.datetime&&!mappings.date)mappings.date=mappings.datetime;return mappings}
  function detectDuplicateRows(rows,columns){const seen=new Set();let dup=0;for(const r of rows){const key=columns.map(c=>U.cleanText(r[c])).join('\u241f');if(seen.has(key))dup++;else seen.add(key)}return dup}
  function suitableFilters(profiles,mappings){return profiles.filter(p=>{if(p.nonEmpty<2||p.uniqueCount<=1)return false;if(['long text','free text','URL','map/location URL','email','phone','ID','unknown','numeric','monetary','percentage','date','datetime'].includes(p.type))return false;if(p.uniquenessRatio>.8&&p.uniqueCount>25&&!Object.values(mappings).includes(p.name))return false;return p.uniqueCount<=80||['person/name','geographic/location','product','boolean/status'].includes(p.type)}).map(p=>p.name)}
  CRM.profiler={profile,mapSemantics,detectDuplicateRows,suitableFilters,semantics};
})();
