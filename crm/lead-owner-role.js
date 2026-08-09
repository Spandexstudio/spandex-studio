(function(){
  if(window.__tfLeadOwnerRoleV20)return;
  window.__tfLeadOwnerRoleV20=true;
  window.crmLeadScopeV20=true;

  function text(v){return String(v==null?'':v).trim();}
  function norm(v){return text(v).toLowerCase();}
  function users(){try{return Array.isArray(window.crmUsers)?window.crmUsers:[]}catch(e){return []}}
  function profile(){try{return window.crmCurrentProfile||null}catch(e){return null}}
  function userId(u){return text(u&&(u.id||u.user_id||u.auth_user_id));}
  function userName(u){return text(u&&(u.full_name||u.name||u.loginId||u.login_id||u.email));}
  function userRole(u){return text(u&&(u.role||u.crm_role));}
  function isActive(u){return !u||!u.status||norm(u.status)==='active';}
  function isSuper(){var me=profile();return !!(me&&norm(userRole(me))==='super admin'&&isActive(me));}
  function isSales(){var me=profile();return !!(me&&norm(userRole(me))==='sales executive'&&isActive(me));}

  function salesExecs(){
    var seen={};
    return users().filter(function(u){return u&&norm(userRole(u))==='sales executive'&&isActive(u);}).map(function(u){
      return {id:userId(u),name:userName(u),loginId:text(u.loginId||u.login_id),email:text(u.email),role:'Sales Executive',status:'Active'};
    }).filter(function(u){
      var k=norm(u.id);if(!k||!u.name||seen[k])return false;seen[k]=true;return true;
    });
  }

  function leadOwnerId(l){return text(l&&(l.salespersonId||l.salesperson_id||l.ownerId||l.owner_id||l.assigned_user_id));}
  function leadOwnerName(l){return text(l&&(l.salesperson||l.salespersonName||l.salesperson_name||l.ownerName||l.owner_name));}
  function personById(id){var k=text(id);return k?salesExecs().find(function(u){return u.id===k;})||null:null;}
  function personByName(name){
    var k=norm(name);if(!k)return null;
    return salesExecs().find(function(u){return norm(u.name)===k||norm(u.loginId)===k||norm(u.email)===k;})||null;
  }
  function personForLead(l){return l?(personById(leadOwnerId(l))||personByName(leadOwnerName(l))):null;}

  window.crmActiveSalesExecutives=salesExecs;
  window.crmSalesExecutives=salesExecs;
  window.crmLeadOwnerPerson=personForLead;
  window.crmLeadOwnerCanAssign=isSuper;

  // Keep the DB owner even when crmUsers has not loaded yet. Never erase a valid assignment during bootstrap.
  window.crmNormalizeLeadOwner=function(l){
    if(!l)return l;
    var id=leadOwnerId(l),name=leadOwnerName(l),p=personForLead(l);
    if(p){id=p.id;name=p.name;}
    l.salespersonId=id;
    l.salesperson_id=id;
    l.salesperson=name;
    l.salespersonName=name;
    l.salesperson_name=name;
    return l;
  };

  window.crmSetLeadOwner=function(l,p){
    if(!l)return l;
    if(!p){l.salespersonId='';l.salesperson_id='';l.salesperson='';l.salespersonName='';l.salesperson_name='';return l;}
    var person=typeof p==='string'?(personById(p)||personByName(p)):p;
    var id=userId(person),name=userName(person);
    if(!id||!name||norm(userRole(person))&&norm(userRole(person))!=='sales executive')return l;
    l.salespersonId=id;l.salesperson_id=id;
    l.salesperson=name;l.salespersonName=name;l.salesperson_name=name;
    return l;
  };

  function normalizeAll(){try{(window.leads||[]).forEach(window.crmNormalizeLeadOwner);}catch(e){}}

  // Preserve both owner ID and owner display name from Supabase when converting a DB lead to UI data.
  try{
    var oldDbLeadToUi=window.dbLeadToUi;
    if(typeof oldDbLeadToUi==='function'&&!window.__ownerV20DbLeadToUi){
      window.__ownerV20DbLeadToUi=oldDbLeadToUi;
      window.dbLeadToUi=function(r){
        var l=window.__ownerV20DbLeadToUi.apply(this,arguments)||{};
        if(r){
          if(r.salesperson_id!=null){l.salespersonId=text(r.salesperson_id);l.salesperson_id=text(r.salesperson_id);}
          if(r.salesperson_name!=null){l.salesperson=text(r.salesperson_name);l.salespersonName=text(r.salesperson_name);l.salesperson_name=text(r.salesperson_name);}
        }
        return window.crmNormalizeLeadOwner(l);
      };
    }
  }catch(e){}

  // Persist stable user ID + profile full name, even if the users list is still loading.
  try{
    var oldUiLeadToDb=window.uiLeadToDb;
    if(typeof oldUiLeadToDb==='function'&&!window.__ownerV20UiLeadToDb){
      window.__ownerV20UiLeadToDb=oldUiLeadToDb;
      window.uiLeadToDb=function(l){
        window.crmNormalizeLeadOwner(l);
        var r=window.__ownerV20UiLeadToDb.apply(this,arguments)||{};
        var p=personForLead(l),id=p?p.id:leadOwnerId(l),name=p?p.name:leadOwnerName(l);
        r.salesperson_id=id||null;
        r.salesperson_name=name||null;
        return r;
      };
    }
  }catch(e){}

  // Definitive role scope used by Lead Management. Sales Executive = only own assigned leads. Super Admin = all leads.
  window.crmLeadVisibleForUser=function(l){
    var me=profile();
    if(!me)return true; // do not blank the page while session/profile is bootstrapping
    if(isSuper())return true;
    if(!isSales())return true;

    var myId=userId(me),ownerId=leadOwnerId(l);
    if(myId&&ownerId)return ownerId===myId;

    // Legacy fallback only when a lead has no stable owner ID.
    if(!ownerId){
      var names=[userName(me),text(me.loginId||me.login_id),text(me.email)].map(norm).filter(Boolean);
      return names.indexOf(norm(leadOwnerName(l)))>=0;
    }
    return false;
  };

  // All five Lead Management cards, VIEW lists and START CALLING queues use this same scoped source.
  try{
    var oldGetLeadCategoryItems=window.getLeadCategoryItems;
    if(typeof oldGetLeadCategoryItems==='function'&&!window.__ownerV20GetLeadCategoryItems){
      window.__ownerV20GetLeadCategoryItems=oldGetLeadCategoryItems;
      window.getLeadCategoryItems=function(category){
        var list=[];
        try{list=window.__ownerV20GetLeadCategoryItems.apply(this,arguments)||[];}catch(e){list=Array.isArray(window.leads)?window.leads:[];}
        return (Array.isArray(list)?list:[]).filter(window.crmLeadVisibleForUser);
      };
    }
  }catch(e){}

  function ownerSelects(){
    var admin=isSuper();
    ['luSalesperson'].forEach(function(id){
      var el=document.getElementById(id);if(!el)return;
      el.disabled=!admin;
      el.title=admin?'Lead owner can be assigned by Super Admin.':'Lead owner is controlled by Super Admin assignment.';
    });
    var add=document.querySelector('#leadForm select[name="salesperson"]');
    if(add){add.disabled=!admin;add.title=admin?'Assign an active Sales Executive.':'Lead owner is controlled by Super Admin assignment.';}
  }

  function refreshOwnerUi(){
    normalizeAll();ownerSelects();
    try{if(typeof window.populateSalespersonSelects==='function')window.populateSalespersonSelects();}catch(e){}
    try{if(typeof window.renderLeadDashboard==='function')window.renderLeadDashboard();}catch(e){}
    try{if(typeof window.renderLeadsTable==='function')window.renderLeadsTable();}catch(e){}
    try{if(typeof window.renderCallNow==='function')window.renderCallNow();}catch(e){}
    try{if(document.getElementById('leadAssignmentModal')&&document.getElementById('leadAssignmentModal').classList.contains('open')&&typeof window.renderLeadAssign==='function')window.renderLeadAssign();}catch(e){}
  }

  // Re-render role-sensitive lead screens only after the latest cloud data/profile is available.
  ['renderLeadDashboard','renderLeadsTable','renderLeads','renderFollowups','renderPipeline'].forEach(function(fn){
    try{
      if(typeof window[fn]!=='function'||window['__ownerV20Render_'+fn])return;
      window['__ownerV20Render_'+fn]=window[fn];
      window[fn]=function(){normalizeAll();return window['__ownerV20Render_'+fn].apply(this,arguments);};
    }catch(e){}
  });

  // Call Now assignment stores both ID and Full Name.
  window.callNowAssign=function(id,select){
    var l=(window.leads||[]).find(function(x){return text(x.id)===text(id);});if(!l)return;
    var before=leadOwnerName(l)||'Unassigned';
    var p=personById(select&&select.value)||personByName(select&&select.value);
    if(!p)return alert('Select an active Sales Executive.');
    window.crmSetLeadOwner(l,p);
    try{if(typeof window.addLeadLog==='function')window.addLeadLog(l.id,'Lead assigned',before+' → '+p.name+'.','Assignment');}catch(e){}
    try{if(typeof window.save==='function')window.save();}catch(e){}
    refreshOwnerUi();
  };

  // Super Admin manual assignment: selected lead rows -> exact active Sales Executive profile.
  window.manualAssignNow=function(){
    if(!isSuper())return alert('Only Super Admin can assign leads.');
    var chosen=text((document.getElementById('assignPerson')||{}).value);
    var p=personById(chosen)||personByName(chosen);if(!p)return alert('Select an active Salesperson.');
    var ids=[].slice.call(document.querySelectorAll('#assignRows input[data-id]:checked')).map(function(x){return text(x.dataset.id);});
    if(!ids.length)return alert('Select at least one lead.');
    var count=0;
    ids.forEach(function(id){
      var l=(window.leads||[]).find(function(x){return text(x.id)===id;});if(!l)return;
      var before=leadOwnerName(l)||'Unassigned';window.crmSetLeadOwner(l,p);count++;
      try{if(typeof window.addLeadLog==='function')window.addLeadLog(l.id,'Lead manually assigned',before+' → '+p.name+' by Super Admin.','Assignment');}catch(e){}
    });
    try{if(typeof window.save==='function')window.save();}catch(e){}
    refreshOwnerUi();
    try{if(typeof window.renderLeadAssign==='function')window.renderLeadAssign();}catch(e){}
    alert(count+' lead'+(count===1?'':'s')+' assigned to '+p.name+'.');
  };

  // Balanced auto assignment uses stable IDs. A delayed users list can no longer make assigned leads look unassigned.
  window.autoAssignNow=function(){
    if(!isSuper())return alert('Only Super Admin can auto assign leads.');
    var people=salesExecs();
    var open=(window.leads||[]).filter(function(l){return ['order confirmed','lost'].indexOf(norm(l.status))<0;});
    open.forEach(window.crmNormalizeLeadOwner);
    var unassigned=open.filter(function(l){return !leadOwnerId(l)&&!leadOwnerName(l);});
    if(!people.length)return alert('No active Sales Executive found.');
    if(!unassigned.length)return alert('There are no unassigned open leads.');
    if(!confirm('Auto assign '+unassigned.length+' unassigned lead'+(unassigned.length===1?'':'s')+' across '+people.length+' active Sales Executive'+(people.length===1?'':'s')+'?'))return;

    var load={};people.forEach(function(p){load[p.id]=0;});
    open.forEach(function(l){var oid=leadOwnerId(l);if(oid&&load[oid]!=null)load[oid]++;});
    var assigned={};people.forEach(function(p){assigned[p.id]=0;});
    unassigned.forEach(function(l){
      var p=people.slice().sort(function(a,b){return (load[a.id]||0)-(load[b.id]||0)||a.name.localeCompare(b.name);})[0];
      window.crmSetLeadOwner(l,p);load[p.id]=(load[p.id]||0)+1;assigned[p.id]=(assigned[p.id]||0)+1;
      try{if(typeof window.addLeadLog==='function')window.addLeadLog(l.id,'Lead auto assigned','Assigned to '+p.name+' by Super Admin · On-demand balanced assignment.','Assignment');}catch(e){}
    });
    try{if(typeof window.save==='function')window.save();}catch(e){}
    refreshOwnerUi();
    try{if(typeof window.renderLeadAssign==='function')window.renderLeadAssign();}catch(e){}
    alert('Auto assignment completed.\n\n'+people.filter(function(p){return assigned[p.id];}).map(function(p){return p.name+': '+assigned[p.id];}).join('\n'));
  };

  // Normalize before every app save, while preserving DB owner values.
  try{
    var oldSave=window.save;
    if(typeof oldSave==='function'&&!window.__ownerV20Save){
      window.__ownerV20Save=oldSave;
      window.save=function(){normalizeAll();return window.__ownerV20Save.apply(this,arguments);};
    }
  }catch(e){}

  // After users + leads are loaded, immediately recalculate every Lead Management category for the logged-in role.
  try{
    var oldCloudLoadAll=window.cloudLoadAll;
    if(typeof oldCloudLoadAll==='function'&&!window.__ownerV20CloudLoadAll){
      window.__ownerV20CloudLoadAll=oldCloudLoadAll;
      window.cloudLoadAll=async function(){
        var r=await window.__ownerV20CloudLoadAll.apply(this,arguments);
        normalizeAll();refreshOwnerUi();
        return r;
      };
    }
  }catch(e){}

  function adaptLeadUpdate(){
    ownerSelects();
    var s=document.getElementById('luSalesperson');if(!s)return;
    var lead=(window.leads||[]).find(function(l){return text(l.id)===text((document.getElementById('luLeadId')||{}).value);});
    var oid=leadOwnerId(lead);if(oid)s.value=oid;
  }
  try{
    var oldOpenById=window.openLeadUpdateById;
    if(typeof oldOpenById==='function'&&!window.__ownerV20OpenById){window.__ownerV20OpenById=oldOpenById;window.openLeadUpdateById=function(){var r=window.__ownerV20OpenById.apply(this,arguments);setTimeout(adaptLeadUpdate,0);return r;};}
  }catch(e){}
  try{
    var oldOpenByCustomer=window.openLeadUpdateByCustomer;
    if(typeof oldOpenByCustomer==='function'&&!window.__ownerV20OpenByCustomer){window.__ownerV20OpenByCustomer=oldOpenByCustomer;window.openLeadUpdateByCustomer=function(){var r=window.__ownerV20OpenByCustomer.apply(this,arguments);setTimeout(adaptLeadUpdate,0);return r;};}
  }catch(e){}

  normalizeAll();setTimeout(refreshOwnerUi,0);
})();