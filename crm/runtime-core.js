(function(){
  function resetFallbacks(){
    try{if(Array.isArray(leads))leads.splice(0,leads.length);}catch(e){}
    try{if(Array.isArray(fabricData))fabricData.splice(0,fabricData.length);}catch(e){}
    try{if(Array.isArray(sampleData))sampleData.splice(0,sampleData.length);}catch(e){}
    try{if(Array.isArray(quotationData))quotationData.splice(0,quotationData.length);}catch(e){}
    try{dashboardData.followups=[];dashboardData.orders=[];dashboardData.payments=[];dashboardData.monthlySales=[];}catch(e){}
  }
  try{cloudSeedIfEmpty=async function(){return;};}catch(e){}
  resetFallbacks();

  function emptySection(id,title,desc,empty){
    const s=document.getElementById(id);if(!s)return;
    s.innerHTML=`<div class="hero"><div><h2>${title}</h2><p>${desc}</p></div></div><div class="card"><div class="empty">${empty}</div></div>`;
  }
  function cleanStaticUi(){
    const d=document.getElementById('dashboard');
    if(d)d.innerHTML=`
      <div class="hero"><div><h2>CRM Dashboard</h2><p>Live workspace — only real CRM data is shown.</p></div><button class="btn btn-primary" onclick="openLeadModal()">+ New Lead</button></div>
      <div class="kpi-grid">
        <div class="kpi clickable" onclick="openDashboardData('totalLeads')"><div class="label">Total Leads</div><div class="value" id="kpiLeads">0</div></div>
        <div class="kpi"><div class="label">Hot Leads</div><div class="value" id="kpiHotLeads">0</div></div>
        <div class="kpi"><div class="label">Follow-ups Due</div><div class="value" id="kpiFollowups">0</div></div>
        <div class="kpi"><div class="label">Orders Confirmed</div><div class="value" id="kpiOrders">0</div></div>
        <div class="kpi"><div class="label">Pending Payments</div><div class="value" id="kpiPayments">₹0</div></div>
        <div class="kpi"><div class="label">Monthly Sales</div><div class="value" id="kpiSales">₹0</div></div>
      </div>
      <div class="card"><div class="empty">No business data yet. Add your first live lead to start.</div></div>`;
    emptySection('followups','Follow-up Management','Live follow-up records only.','No follow-up records.');
    emptySection('customers','Customers','Live customer records only.','No customers yet.');
    emptySection('orders','Order Management','Live confirmed orders only.','No orders yet.');
    emptySection('production','Production Tracking','Live production jobs only.','No production jobs yet.');
    emptySection('dispatch','Dispatch Management','Live dispatch records only.','No dispatch records yet.');
    emptySection('payments','Accounts & Payments','Live receivables and collections only.','No payment records yet.');
    emptySection('tasks','Internal Tasks','Live department tasks only.','No tasks yet.');
    emptySection('marketing','Marketing Lead Tracking','Live campaign records only.','No marketing records yet.');
    emptySection('reports','Reports','Reports will build from your live CRM data.','No report data yet.');
    emptySection('management','Management Command Center','Executive metrics will build from live CRM data.','No management data yet.');
  }

  try{
    const oldRenderLeadDashboard=renderLeadDashboard;
    renderLeadDashboard=function(){
      try{oldRenderLeadDashboard.apply(this,arguments);}catch(e){}
      const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
      set('kpiLeads',(leads||[]).length);
      set('kpiHotLeads',(leads||[]).filter(l=>l.priority==='Hot'&&!['Order Confirmed','Lost'].includes(l.status)).length);
      set('kpiFollowups',(dashboardData.followups||[]).filter(f=>f.status!=='Completed').length);
      set('kpiOrders',(dashboardData.orders||[]).length);
      set('kpiPayments','₹0');set('kpiSales','₹0');
    };
  }catch(e){}

  try{
    buildCrmNotifications=function(){
      const items=[];
      (dashboardData.followups||[]).forEach((f,i)=>{if(f.status==='Completed')return;items.push({id:notificationId(['followup',f.customer,f.status,f.date||f.time||i]),category:'followup',icon:f.status==='Overdue'?'⏰':'📞',priority:(f.status==='Overdue'||f.priority==='Hot')?'high':'warning',title:(f.status==='Overdue'?'Overdue follow-up: ':'Follow-up due: ')+f.customer,text:(f.type||'Follow-up')+' · '+(f.discussion||'Customer follow-up'),meta:f.status||'Follow-up',view:'followups',customer:f.customer,action:{type:'followup',customer:f.customer}});});
      (leads||[]).filter(l=>l.priority==='Hot'&&!['Order Confirmed','Lost'].includes(l.status)).forEach(l=>items.push({id:notificationId(['hotlead',l.id,l.status]),category:'sales',icon:'🔥',priority:'high',title:'Hot lead: '+(l.company||l.customer),text:(l.fabric||'Fabric enquiry')+' · '+(l.qty||'-')+' · Stage: '+l.status,meta:l.salesperson||'Sales',view:'leads',customer:l.company||l.customer,action:{type:'lead',id:l.id}}));
      (quotationData||[]).forEach(q=>{if(['Approved','Rejected','Expired'].includes(q.status))return;items.push({id:notificationId(['quote',q.id,q.status]),category:'sales',icon:'📄',priority:q.status==='Negotiation'?'warning':'normal',title:'Quotation '+q.status+': '+q.customer,text:q.id+' · '+q.article+' · '+formatINR(q.total),meta:'Quotation',view:'quotations',customer:q.customer,action:{type:'quotation',id:q.id}});});
      (sampleData||[]).forEach(s=>{if(['Delivered','Approved','Rejected'].includes(s.status))return;items.push({id:notificationId(['sample',s.id,s.status]),category:'samples',icon:'🧵',priority:s.status==='Requested'?'warning':'normal',title:'Sample '+s.status+': '+s.customer,text:(s.article||'-')+' · '+(s.shade||'-')+' · '+(s.qty||'-'),meta:s.id,view:'samples',customer:s.customer,action:{type:'sample',id:s.id}});});
      return items.map(n=>({...n,createdAt:n.createdAt||'Now',read:Boolean(notificationReadState[n.id])}));
    };
  }catch(e){}

  function activeSalespeople(){
    const seen=new Set();
    try{return (crmUsers||[]).filter(u=>u&&u.role==='Sales Executive'&&u.status==='Active').map(u=>String(u.name||u.loginId||'').trim()).filter(n=>n&&!seen.has(n.toLowerCase())&&seen.add(n.toLowerCase()));}catch(e){return [];}
  }
  function fillSales(el,filter){
    if(!el)return;const cur=el.value||'',p=activeSalespeople();
    el.innerHTML=(filter?'<option value="">All Salespeople</option>':'<option value="">Unassigned</option>');
    p.forEach(n=>{const o=document.createElement('option');o.value=n;o.textContent=n;el.appendChild(o);});
    el.value=p.includes(cur)?cur:'';
  }
  window.populateSalespersonSelects=function(){
    fillSales(document.getElementById('leadSalesFilter'),true);
    fillSales(document.getElementById('sampleSalesFilter'),true);
    fillSales(document.querySelector('#leadForm select[name="salesperson"]'),false);
    fillSales(document.getElementById('luSalesperson'),false);
    fillSales(document.getElementById('qtSalesperson'),false);
  };

  function ensureAdminUi(){
    const leadActions=document.querySelector('#leads .hero > div:last-child');
    if(leadActions&&!document.getElementById('clearAllLeadsBtn')){
      const b=document.createElement('button');b.id='clearAllLeadsBtn';b.className='btn btn-danger admin-only';b.textContent='Clear All Leads';b.onclick=clearAllLeadsAdmin;leadActions.prepend(b);
    }
    const settings=document.getElementById('settings');
    if(settings&&!document.getElementById('settingsDangerZone')){
      const z=document.createElement('div');z.className='card admin-only';z.id='settingsDangerZone';z.style.cssText='margin-top:16px;border-color:#f0c4ca;box-shadow:none';
      z.innerHTML=`<div class="card-head"><div><h3 style="color:#b53243">Danger Zone</h3><div class="muted" style="font-size:10px;margin-top:4px">Permanent data reset actions. Super Admin only.</div></div><span class="badge red">Super Admin</span></div>
      <div class="grid-2" style="grid-template-columns:1fr 1fr;margin:0">
        <div style="border:1px solid var(--line);border-radius:13px;padding:16px"><div style="font-size:13px;font-weight:850">Reset Business Data</div><div class="muted" style="font-size:10px;line-height:1.55;margin:7px 0 13px">Deletes business records but keeps users, company profile and role permissions.</div><button class="btn btn-light" style="border-color:#e2aeb6;color:#b53243" type="button" onclick="resetBusinessDataAdmin()">Reset Business Data</button></div>
        <div style="border:1px solid #efb8c0;border-radius:13px;padding:16px;background:#fff8f9"><div style="font-size:13px;font-weight:850;color:#b53243">Erase All CRM Data</div><div class="muted" style="font-size:10px;line-height:1.55;margin:7px 0 13px">Factory reset. Current Super Admin login is retained.</div><button class="btn btn-danger" type="button" onclick="eraseAllCrmDataAdmin()">Erase All CRM Data</button></div>
      </div>`;
      settings.appendChild(z);
    }
  }
  window.updateAdminControls=function(){
    let ok=false;try{ok=crmCurrentProfile?.role==='Super Admin'&&crmCurrentProfile?.status==='Active';}catch(e){}
    document.querySelectorAll('.admin-only').forEach(el=>el.style.display=ok?'':'none');
  };
  async function adminReset(mode){
    const {data:{session}}=await crmSb.auth.getSession();if(!session)throw new Error('Please login again.');
    const r=await fetch(CRM_SUPABASE_URL+'/functions/v1/admin-reset-crm',{method:'POST',headers:{'Content-Type':'application/json',apikey:CRM_SUPABASE_KEY,Authorization:'Bearer '+session.access_token},body:JSON.stringify({mode})});
    const d=await r.json();if(!r.ok)throw new Error(d.error||'Reset failed.');return d;
  }
  window.resetBusinessDataAdmin=async function(){
    if(crmCurrentProfile?.role!=='Super Admin')return alert('Only Super Admin can reset CRM data.');
    if(!confirm('Reset ALL business data? Users and settings will be kept.'))return;
    if(prompt('Type RESET BUSINESS DATA to confirm:')!=='RESET BUSINESS DATA')return alert('Reset cancelled.');
    try{await adminReset('business');resetFallbacks();['textileflow_leads','textileflow_fabrics','textileflow_samples','textileflow_quotations','textileflow_followups','textileflow_lead_logs','textileflow_notification_read'].forEach(k=>localStorage.removeItem(k));await cloudLoadAll();navigate('settings');alert('Business data reset successfully.');}catch(e){alert(e.message||String(e));}
  };
  window.eraseAllCrmDataAdmin=async function(){
    if(crmCurrentProfile?.role!=='Super Admin')return alert('Only Super Admin can erase CRM data.');
    if(!confirm('Factory reset all CRM data? Current Super Admin login will be kept.'))return;
    if(prompt('Type ERASE ALL CRM DATA to confirm:')!=='ERASE ALL CRM DATA')return alert('Erase cancelled.');
    try{await adminReset('factory');Object.keys(localStorage).filter(k=>k.startsWith('textileflow_')).forEach(k=>localStorage.removeItem(k));resetFallbacks();await cloudLoadAll();navigate('settings');alert('All CRM data erased successfully.');}catch(e){alert(e.message||String(e));}
  };
  window.clearAllLeadsAdmin=async function(){
    if(crmCurrentProfile?.role!=='Super Admin')return alert('Only Super Admin can clear all leads.');
    if(!confirm('Permanently delete ALL leads, follow-ups and lead activity?'))return;
    if(prompt('Type CLEAR ALL LEADS to confirm:')!=='CLEAR ALL LEADS')return alert('Cancelled.');
    try{const {data:{session}}=await crmSb.auth.getSession();const r=await fetch(CRM_SUPABASE_URL+'/functions/v1/admin-clear-leads',{method:'POST',headers:{apikey:CRM_SUPABASE_KEY,Authorization:'Bearer '+session.access_token}});const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not clear leads.');leads.splice(0,leads.length);dashboardData.followups=[];localStorage.setItem('textileflow_leads','[]');localStorage.setItem('textileflow_followups','[]');localStorage.removeItem('textileflow_lead_logs');renderAll();renderNotifications();alert((d.deleted||0)+' lead(s) cleared.');}catch(e){alert(e.message||String(e));}
  };

  function pinInputs(){
    ['crmLoginPassword','bootPassword','usrPassword','usrConfirmPassword'].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.inputMode='numeric';el.maxLength=4;el.pattern='[0-9]{4}';el.placeholder=id==='crmLoginPassword'?'Enter 4-digit PIN':'Exactly 4 numeric digits';el.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'').slice(0,4);});});
  }

  cleanStaticUi();ensureAdminUi();populateSalespersonSelects();pinInputs();updateAdminControls();
  try{renderAll();renderNotifications();}catch(e){}

  try{
    const oldCloudLoadAll=cloudLoadAll;
    cloudLoadAll=async function(){const r=await oldCloudLoadAll.apply(this,arguments);cleanStaticUi();ensureAdminUi();populateSalespersonSelects();updateAdminControls();try{renderAll();renderNotifications();}catch(e){}return r;};
  }catch(e){}
  try{
    const oldOpenLeadModal=openLeadModal;openLeadModal=function(){populateSalespersonSelects();return oldOpenLeadModal.apply(this,arguments);};
    const oldOpenQuotationModal=openQuotationModal;openQuotationModal=function(){populateSalespersonSelects();return oldOpenQuotationModal.apply(this,arguments);};
  }catch(e){}
})();