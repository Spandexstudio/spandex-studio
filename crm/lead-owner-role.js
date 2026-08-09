(function(){
  if(window.__tfLeadOwnerRoleLoaded)return;
  window.__tfLeadOwnerRoleLoaded=true;

  function norm(v){return String(v||'').trim().toLowerCase();}
  function users(){try{return Array.isArray(crmUsers)?crmUsers:[]}catch(e){return []}}
  function profile(){try{return crmCurrentProfile||null}catch(e){return null}}
  function salesExecs(){
    const seen=new Set();
    return users().filter(u=>u&&u.role==='Sales Executive'&&u.status==='Active').map(u=>({
      id:String(u.id||''),
      name:String(u.name||u.full_name||u.loginId||u.login_id||'').trim(),
      loginId:String(u.loginId||u.login_id||'').trim()
    })).filter(u=>{
      if(!u.id||!u.name)return false;
      const k=u.id.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;
    });
  }
  function personById(id){const k=String(id||'');return salesExecs().find(u=>u.id===k)||null;}
  function personByName(name){const k=norm(name);return k?salesExecs().find(u=>norm(u.name)===k||norm(u.loginId)===k)||null:null;}
  function personForLead(l){return personById(l?.salespersonId||l?.salesperson_id)||personByName(l?.salesperson);}

  window.crmActiveSalesExecutives=salesExecs;
  window.crmLeadOwnerPerson=personForLead;
  window.crmNormalizeLeadOwner=function(l){
    if(!l)return l;
    const p=personForLead(l);
    if(p){l.salespersonId=p.id;l.salesperson=p.name;}
    else{l.salespersonId='';l.salesperson='';}
    return l;
  };
  window.crmSetLeadOwner=function(l,p){
    if(!l)return l;
    if(!p){l.salespersonId='';l.salesperson='';return l;}
    const person=typeof p==='string'?(personById(p)||personByName(p)):p;
    if(!person||person.role&&person.role!=='Sales Executive'){l.salespersonId='';l.salesperson='';return l;}
    l.salespersonId=String(person.id||'');
    l.salesperson=String(person.name||person.full_name||person.loginId||person.login_id||'').trim();
    return l;
  };

  function normalizeAll(){
    try{(leads||[]).forEach(window.crmNormalizeLeadOwner);}catch(e){}
  }

  // Persist both stable user id and display name. Name is always derived from the active Sales Executive profile.
  try{
    const oldDbLeadToUi=dbLeadToUi;
    dbLeadToUi=function(r){
      const l=oldDbLeadToUi.apply(this,arguments);
      l.salespersonId=String(r?.salesperson_id||'');
      return l;
    };
  }catch(e){}
  try{
    const oldUiLeadToDb=uiLeadToDb;
    uiLeadToDb=function(l){
      window.crmNormalizeLeadOwner(l);
      const r=oldUiLeadToDb.apply(this,arguments);
      r.salesperson_id=l?.salespersonId||null;
      r.salesperson_name=l?.salesperson||null;
      return r;
    };
  }catch(e){}

  window.crmLeadVisibleForUser=function(l){
    const me=profile();
    if(!me||me.status!=='Active')return true;
    if(me.role==='Super Admin')return true;
    if(me.role!=='Sales Executive')return true;
    const myId=String(me.id||'');
    const myName=norm(me.name||me.full_name||me.loginId||me.login_id||'');
    const p=personForLead(l);
    if(p&&myId)return p.id===myId;
    return !l?.salespersonId&&myName&&norm(l?.salesperson)===myName;
  };

  // Lead Management queues respect Sales Executive ownership. Super Admin continues to see every lead.
  try{
    const oldGetLeadCategoryItems=getLeadCategoryItems;
    getLeadCategoryItems=function(category){
      const list=oldGetLeadCategoryItems.apply(this,arguments)||[];
      return list.filter(window.crmLeadVisibleForUser);
    };
  }catch(e){}

  function ownerSelects(){
    const me=profile();
    const isAdmin=me?.role==='Super Admin'&&me?.status==='Active';
    ['luSalesperson'].forEach(id=>{
      const el=document.getElementById(id);if(!el)return;
      el.disabled=!isAdmin;
      el.title=isAdmin?'Lead owner can be assigned by Super Admin.':'Lead owner is controlled by Super Admin assignment.';
    });
    const add=document.querySelector('#leadForm select[name="salesperson"]');
    if(add){add.disabled=!isAdmin;add.title=isAdmin?'Assign an active Sales Executive.':'Lead owner is controlled by Super Admin assignment.';}
  }

  function refreshOwnerUi(){
    normalizeAll();
    ownerSelects();
    try{populateSalespersonSelects();}catch(e){}
    try{renderLeadDashboard();}catch(e){}
    try{renderCallNow();}catch(e){}
    try{if(document.getElementById('leadAssignmentModal')?.classList.contains('open'))renderLeadAssign();}catch(e){}
  }

  // Call Now assignment stores both ID and Full Name.
  window.callNowAssign=function(id,select){
    const l=(leads||[]).find(x=>String(x.id)===String(id));if(!l)return;
    const before=l.salesperson||'Unassigned';
    const p=personByName(select?.value||'');
    window.crmSetLeadOwner(l,p);
    try{addLeadLog(l.id,'Lead assigned',`${before} → ${l.salesperson||'Unassigned'}.`,'Assignment');}catch(e){}
    try{save();renderLeadDashboard();renderPipeline();}catch(e){}
    try{renderCallNow();}catch(e){}
  };

  // Super Admin manual assignment: selected lead rows -> exact active Sales Executive profile.
  window.manualAssignNow=function(){
    const me=profile();if(me?.role!=='Super Admin'||me?.status!=='Active')return alert('Only Super Admin can assign leads.');
    const chosenName=document.getElementById('assignPerson')?.value||'';
    const p=personByName(chosenName);if(!p)return alert('Select an active Salesperson.');
    const ids=[...document.querySelectorAll('#assignRows input[data-id]:checked')].map(x=>String(x.dataset.id||''));
    if(!ids.length)return alert('Select at least one lead.');
    let n=0;
    ids.forEach(id=>{
      const l=(leads||[]).find(x=>String(x.id)===id);if(!l)return;
      const before=l.salesperson||'Unassigned';window.crmSetLeadOwner(l,p);n++;
      try{addLeadLog(l.id,'Lead manually assigned',`${before} → ${p.name} by Super Admin.`,'Assignment');}catch(e){}
    });
    try{save();renderLeadDashboard();renderPipeline();renderNotifications();renderCallNow();}catch(e){}
    try{renderLeadAssign();}catch(e){}
    alert(n+' lead'+(n===1?'':'s')+' assigned to '+p.name+'.');
  };

  // Super Admin on-demand auto assignment uses stable user IDs and balanced current workload.
  window.autoAssignNow=function(){
    const me=profile();if(me?.role!=='Super Admin'||me?.status!=='Active')return alert('Only Super Admin can auto assign leads.');
    const people=salesExecs();
    const open=(leads||[]).filter(l=>!['Order Confirmed','Lost'].includes(String(l.status||'')));
    open.forEach(window.crmNormalizeLeadOwner);
    const ua=open.filter(l=>!l.salespersonId);
    if(!people.length)return alert('No active Sales Executive found.');
    if(!ua.length)return alert('There are no unassigned open leads.');
    if(!confirm('Auto assign '+ua.length+' unassigned lead'+(ua.length===1?'':'s')+' across '+people.length+' active Sales Executive'+(people.length===1?'':'s')+'?'))return;
    const load=new Map(people.map(p=>[p.id,0]));
    open.forEach(l=>{const p=personForLead(l);if(p)load.set(p.id,(load.get(p.id)||0)+1);});
    const count=new Map(people.map(p=>[p.id,0]));
    ua.forEach(l=>{
      const p=[...people].sort((a,b)=>(load.get(a.id)||0)-(load.get(b.id)||0)||a.name.localeCompare(b.name))[0];
      window.crmSetLeadOwner(l,p);load.set(p.id,(load.get(p.id)||0)+1);count.set(p.id,(count.get(p.id)||0)+1);
      try{addLeadLog(l.id,'Lead auto assigned','Assigned to '+p.name+' by Super Admin · On-demand balanced assignment.','Assignment');}catch(e){}
    });
    try{save();renderLeadDashboard();renderPipeline();renderNotifications();renderCallNow();}catch(e){}
    try{renderLeadAssign();}catch(e){}
    alert('Auto assignment completed.\n\n'+people.filter(p=>count.get(p.id)).map(p=>p.name+': '+count.get(p.id)).join('\n'));
  };

  // Any save/import that contains a legacy or typed owner is normalized before cloud persistence.
  try{
    const oldSave=save;
    save=function(){normalizeAll();return oldSave.apply(this,arguments);};
  }catch(e){}

  // Re-normalize after cloud users and leads have loaded.
  try{
    const oldCloudLoadAll=cloudLoadAll;
    cloudLoadAll=async function(){
      const r=await oldCloudLoadAll.apply(this,arguments);
      normalizeAll();refreshOwnerUi();
      return r;
    };
  }catch(e){}

  // Re-apply lock/owner label whenever Update Lead is opened.
  try{
    const oldOpenById=openLeadUpdateById;
    openLeadUpdateById=function(){const r=oldOpenById.apply(this,arguments);setTimeout(ownerSelects,0);return r;};
  }catch(e){}
  try{
    const oldOpenByCustomer=openLeadUpdateByCustomer;
    openLeadUpdateByCustomer=function(){const r=oldOpenByCustomer.apply(this,arguments);setTimeout(ownerSelects,0);return r;};
  }catch(e){}

  normalizeAll();setTimeout(refreshOwnerUi,0);
})();