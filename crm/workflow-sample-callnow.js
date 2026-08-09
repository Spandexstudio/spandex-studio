(function(){
  let workflowSyncGuard=false;
  let activeCallNowTab='today';

  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function prettyToday(){return new Date().toLocaleDateString([], {day:'2-digit',month:'short',year:'numeric'});}
  function normalizeName(v){return String(v||'').trim().toLowerCase();}
  function sampleLinkMarker(id){return `[AUTO-LINK] Lead ID: ${id}`;}
  function sampleHasLeadId(sample,id){return String(sample?.notes||'').toLowerCase().includes(`lead id: ${String(id||'').toLowerCase()}`);}

  function leadToSampleStatus(stage){
    return ({
      'Sample Requested':'Requested',
      'Sample Sent':'Sent',
      'Sample Approved':'Approved'
    })[stage]||'';
  }
  function sampleToLeadStatus(stage){
    return ({
      'Requested':'Sample Requested',
      'Preparing':'Sample Requested',
      'Sent':'Sample Sent',
      'Dispatched':'Sample Sent',
      'Delivered':'Sample Sent',
      'Waiting for Feedback':'Sample Sent',
      'Approved':'Sample Approved',
      'Rejected':'On Hold'
    })[stage]||'';
  }

  function findSampleForLead(lead){
    if(!lead)return null;
    let s=(sampleData||[]).find(x=>sampleHasLeadId(x,lead.id));
    if(s)return s;
    const company=normalizeName(lead.company||lead.customer);
    const customer=normalizeName(lead.customer);
    const fabric=normalizeName(lead.fabric);
    return (sampleData||[]).find(x=>{
      const sn=normalizeName(x.customer||x.company);
      const sameParty=sn===company||sn===customer;
      const sameFabric=!fabric||fabric==='-'||normalizeName(x.article)===fabric;
      return sameParty&&sameFabric;
    })||null;
  }

  function findLeadForSample(sample){
    if(!sample)return null;
    const marker=String(sample.notes||'').match(/Lead ID:\s*([A-Za-z0-9_-]+)/i);
    if(marker){
      const byId=(leads||[]).find(l=>String(l.id)===marker[1]);
      if(byId)return byId;
    }
    const party=normalizeName(sample.customer||sample.company);
    const article=normalizeName(sample.article);
    return (leads||[]).find(l=>{
      const sameParty=[l.company,l.customer].some(v=>normalizeName(v)===party);
      const sameArticle=!article||article==='-'||normalizeName(l.fabric)===article;
      return sameParty&&sameArticle;
    })||null;
  }

  function saveSamplesNow(){
    try{localStorage.setItem('textileflow_samples',JSON.stringify(sampleData||[]));}catch(e){}
    try{if(typeof cloudSaveSamples==='function')cloudSaveSamples();}catch(e){}
    try{renderSampleDashboard();}catch(e){}
    try{if(document.getElementById('sampleResultsPanel')?.classList.contains('open'))refreshSampleResults();}catch(e){}
    try{renderNotifications();}catch(e){}
  }

  function syncLeadToSample(lead,reason='Lead Pipeline'){
    if(workflowSyncGuard||!lead)return;
    const target=leadToSampleStatus(lead.status);
    if(!target)return;

    workflowSyncGuard=true;
    try{
      let sample=findSampleForLead(lead);
      const created=!sample;
      if(!sample){
        sample={
          id:'SMP-'+String(Date.now()).slice(-6),
          customer:lead.company||lead.customer||'Lead Customer',
          company:lead.company||'',
          contact:lead.customer||'',
          mobile:lead.mobile||'',
          whatsapp:lead.whatsapp||lead.mobile||'',
          address:lead.address||'',
          city:lead.city||'',
          state:lead.state||'',
          pincode:lead.pincode||'',
          country:lead.country||'India',
          article:(lead.fabric&&lead.fabric!=='-')?lead.fabric:'',
          shade:'-',qty:'-',requested:prettyToday(),dispatch:'-',courier:'-',tracking:'-',
          salesperson:lead.salesperson||'',status:target,feedback:'',notes:sampleLinkMarker(lead.id)
        };
        sampleData.unshift(sample);
      }else{
        sample.customer=lead.company||lead.customer||sample.customer;
        sample.company=lead.company||sample.company||'';
        sample.contact=lead.customer||sample.contact||'';
        sample.mobile=lead.mobile||sample.mobile||'';
        sample.whatsapp=lead.whatsapp||lead.mobile||sample.whatsapp||'';
        sample.article=(lead.fabric&&lead.fabric!=='-')?lead.fabric:(sample.article||'');
        sample.salesperson=lead.salesperson||sample.salesperson||'';
        sample.status=target;
        if(!sampleHasLeadId(sample,lead.id)) sample.notes=[sample.notes,sampleLinkMarker(lead.id)].filter(Boolean).join('\n');
      }
      saveSamplesNow();
      try{addLeadLog(lead.id,created?'Sample request auto-created':'Sample stage auto-synced',`${reason}: Lead stage ${lead.status} → Sample Management ${target}.`,'Workflow Sync');}catch(e){}
    }finally{
      workflowSyncGuard=false;
    }
  }

  function syncSampleToLead(sample){
    if(workflowSyncGuard||!sample)return;
    const target=sampleToLeadStatus(sample.status);
    if(!target)return;
    const lead=findLeadForSample(sample);
    if(!lead)return;
    const before=lead.status||'New Lead';
    if(before===target)return;

    workflowSyncGuard=true;
    try{
      lead.status=target;
      if(sample.salesperson&&!lead.salesperson)lead.salesperson=sample.salesperson;
      try{addLeadLog(lead.id,'Pipeline auto-synced from Sample',`Sample ${sample.id||''}: ${sample.status} → Lead Pipeline ${target}.`,'Workflow Sync');}catch(e){}
      try{save();}catch(e){try{localStorage.setItem('textileflow_leads',JSON.stringify(leads||[]));}catch(_){} }
      try{renderPipeline();renderLeadDashboard();renderNotifications();}catch(e){}
    }finally{
      workflowSyncGuard=false;
    }
  }

  // Exact sync whenever the Lead Update form is saved, even if the stage was already selected earlier.
  const leadUpdateForm=document.getElementById('leadUpdateForm');
  leadUpdateForm?.addEventListener('submit',function(){
    const id=document.getElementById('luLeadId')?.value||'';
    const original=document.getElementById('luOriginalCustomer')?.value||'';
    setTimeout(()=>{
      const lead=(leads||[]).find(l=>l.id===id)||((typeof findLeadForCustomerName==='function')?findLeadForCustomerName(original):null);
      if(lead)syncLeadToSample(lead,'Lead Update');
      renderCallNow();
    },180);
  },true);

  // Detect pipeline drag/drop or any other lead stage change that calls save().
  let leadStageSnapshot=new Map((leads||[]).map(l=>[String(l.id),String(l.status||'')]));
  try{
    const oldSave=save;
    save=function(){
      const changed=(leads||[]).filter(l=>leadStageSnapshot.get(String(l.id))!==String(l.status||''));
      const r=oldSave.apply(this,arguments);
      leadStageSnapshot=new Map((leads||[]).map(l=>[String(l.id),String(l.status||'')]));
      if(!workflowSyncGuard)changed.forEach(l=>{if(leadToSampleStatus(l.status))syncLeadToSample(l,'Lead Pipeline');});
      setTimeout(renderCallNow,0);
      return r;
    };
  }catch(e){}

  // Sample Management → Lead Pipeline automatic sync.
  try{
    const oldSaveSample=saveSampleDetail;
    saveSampleDetail=function(){
      const sampleId=typeof activeSampleDetailId!=='undefined'?activeSampleDetailId:'';
      const r=oldSaveSample.apply(this,arguments);
      setTimeout(()=>{
        const sample=(sampleData||[]).find(s=>s.id===sampleId);
        if(sample)syncSampleToLead(sample);
        renderCallNow();
      },80);
      return r;
    };
  }catch(e){}

  function salespeople(){
    const seen=new Set();
    let list=[];
    try{list=(crmUsers||[]).filter(u=>u&&u.role==='Sales Executive'&&u.status==='Active').map(u=>String(u.name||u.loginId||'').trim()).filter(Boolean);}catch(e){}
    return list.filter(x=>{const k=x.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;});
  }

  function reminderLeadIds(){
    const today=todayISO();
    const ids=new Set();
    (leads||[]).forEach(l=>{if(String(l.followup||'')===today)ids.add(l.id);});
    (dashboardData?.followups||[]).forEach(f=>{
      if(f.status==='Completed')return;
      const due=String(f.date||'')===today||String(f.reminderDate||'')===today||f.status==='Due Today';
      if(!due)return;
      const l=(typeof findLeadForCustomerName==='function')?findLeadForCustomerName(f.customer):null;
      if(l)ids.add(l.id);
    });
    return ids;
  }

  function callNowItems(tab){
    const reminderIds=reminderLeadIds();
    if(tab==='today')return (leads||[]).filter(l=>reminderIds.has(l.id));
    if(tab==='notcontacted')return (leads||[]).filter(l=>l.status==='New Lead'||l.contactStatus==='Uncontacted'||l.contactStatus==='Not Connected'||l.status==='On Hold');
    if(tab==='unassigned')return (leads||[]).filter(l=>!String(l.salesperson||'').trim()||String(l.salesperson).toLowerCase()==='unassigned');
    return (leads||[]);
  }

  function ensureCallNowUI(){
    if(!document.getElementById('crm-call-now-style')){
      const st=document.createElement('style');st.id='crm-call-now-style';st.textContent=`
        .callnow-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.callnow-tab{border:1px solid var(--line);background:#fff;border-radius:999px;padding:8px 12px;font-size:10px;font-weight:800;color:#556176}.callnow-tab.active{background:#eef3ff;border-color:#d8e2ff;color:#3157d5}.callnow-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:15px}.callnow-card{border:1px solid var(--line);background:#fff;border-radius:14px;padding:14px}.callnow-card .k{font-size:8px;letter-spacing:.07em;text-transform:uppercase;color:#8d98aa;font-weight:850}.callnow-card .v{font-size:22px;font-weight:900;margin-top:5px}.callnow-mobile{color:#3157d5;font-weight:800;text-decoration:none}.callnow-mobile:hover{text-decoration:underline}.callnow-assign{min-width:150px;border:1px solid var(--line);border-radius:9px;padding:7px 9px;background:#fff;font-size:10px}.callnow-actions{display:flex;gap:6px;flex-wrap:wrap}.callnow-empty{padding:36px;text-align:center;color:var(--muted);font-size:11px}@media(max-width:760px){.callnow-summary{grid-template-columns:1fr}.callnow-table{overflow:auto}.callnow-table table{min-width:930px}}
      `;document.head.appendChild(st);
    }

    if(!document.querySelector('.nav-item[data-view="callnow"]')){
      const follow=document.querySelector('.nav-item[data-view="followups"]');
      const a=document.createElement('a');a.className='nav-item';a.dataset.view='callnow';a.innerHTML='<span class="ico">☎</span><span>Call Now</span>';
      a.addEventListener('click',()=>{navigate('callnow');renderCallNow();});
      if(follow)follow.insertAdjacentElement('afterend',a);else document.querySelector('.sidebar')?.appendChild(a);
    }

    if(!document.getElementById('callnow')){
      const main=document.querySelector('main.main');
      const sec=document.createElement('section');sec.className='view';sec.id='callnow';sec.innerHTML=`
        <div class="hero"><div><h2>Call Now</h2><p>Today reminders, not-contacted leads and quick salesperson assignment in one calling workspace.</p></div><button class="btn btn-light" type="button" onclick="renderCallNow()">Refresh</button></div>
        <div class="callnow-summary">
          <div class="callnow-card"><div class="k">Today Reminders</div><div class="v" id="callNowTodayCount">0</div></div>
          <div class="callnow-card"><div class="k">Not Contacted</div><div class="v" id="callNowNotCount">0</div></div>
          <div class="callnow-card"><div class="k">Unassigned</div><div class="v" id="callNowUnassignedCount">0</div></div>
        </div>
        <div class="callnow-tabs">
          <button class="callnow-tab active" data-calltab="today" onclick="setCallNowTab('today')">Today Reminders</button>
          <button class="callnow-tab" data-calltab="notcontacted" onclick="setCallNowTab('notcontacted')">Not Contacted</button>
          <button class="callnow-tab" data-calltab="unassigned" onclick="setCallNowTab('unassigned')">Unassigned</button>
        </div>
        <div class="card table-card callnow-table"><table><thead><tr><th>Lead</th><th>Customer</th><th>Company</th><th>Mobile</th><th>Stage</th><th>Next Follow-up</th><th>Assigned To</th><th>Actions</th></tr></thead><tbody id="callNowRows"></tbody></table></div>`;
      main?.appendChild(sec);
    }
  }

  window.setCallNowTab=function(tab){activeCallNowTab=tab;renderCallNow();};
  window.callNowDial=function(id){
    const l=(leads||[]).find(x=>x.id===id);if(!l)return;
    const n=String(l.mobile||'').replace(/\D/g,'');if(!n)return alert('Mobile number is not available.');
    l.contactStatus='In Progress';
    try{addLeadLog(l.id,'Call started from Call Now',`Calling ${l.company||l.customer} on ${l.mobile||''}.`,'Call');}catch(e){}
    try{save();}catch(e){}
    window.location.href='tel:'+n;
  };
  window.callNowOpen=function(id){if(typeof openLeadUpdateById==='function')openLeadUpdateById(id);};
  window.callNowAssign=function(id,select){
    const l=(leads||[]).find(x=>x.id===id);if(!l)return;
    const before=l.salesperson||'Unassigned';
    l.salesperson=select.value||'';
    try{addLeadLog(l.id,'Lead assigned',`${before} → ${l.salesperson||'Unassigned'}.`,'Assignment');}catch(e){}
    try{save();renderLeadDashboard();renderPipeline();}catch(e){}
    renderCallNow();
  };

  window.renderCallNow=function(){
    ensureCallNowUI();
    const today=callNowItems('today'),notc=callNowItems('notcontacted'),unassigned=callNowItems('unassigned');
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('callNowTodayCount',today.length);set('callNowNotCount',notc.length);set('callNowUnassignedCount',unassigned.length);
    document.querySelectorAll('.callnow-tab').forEach(b=>b.classList.toggle('active',b.dataset.calltab===activeCallNowTab));
    const body=document.getElementById('callNowRows');if(!body)return;
    const people=salespeople();
    const items=callNowItems(activeCallNowTab);
    body.innerHTML=items.length?items.map(l=>{
      const current=String(l.salesperson||'');
      const opts=['',...people.filter(x=>x!==current),...(current&&!people.includes(current)?[current]:[])];
      return `<tr>
        <td><b>${esc(l.id)}</b></td>
        <td class="link" onclick="callNowOpen('${esc(l.id)}')">${esc(l.customer||'-')}</td>
        <td>${esc(l.company||'-')}</td>
        <td>${l.mobile?`<a class="callnow-mobile" href="tel:${esc(String(l.mobile).replace(/\D/g,''))}">${esc(l.mobile)}</a>`:'-'}</td>
        <td><span class="badge ${typeof badgeClass==='function'?badgeClass(l.status):''}">${esc(l.status||'New Lead')}</span></td>
        <td>${esc(l.followup||'Not scheduled')}</td>
        <td><select class="callnow-assign" onchange="callNowAssign('${esc(l.id)}',this)">${opts.map(x=>`<option value="${esc(x)}" ${x===current?'selected':''}>${esc(x||'Unassigned')}</option>`).join('')}</select></td>
        <td><div class="callnow-actions"><button class="action-mini primary" onclick="callNowDial('${esc(l.id)}')">Call</button><button class="action-mini" onclick="callNowOpen('${esc(l.id)}')">Update</button></div></td>
      </tr>`;
    }).join(''):`<tr><td colspan="8"><div class="callnow-empty">No leads in this Call Now queue.</div></td></tr>`;
  };

  ensureCallNowUI();
  renderCallNow();

  try{
    const oldNavigate=navigate;
    navigate=function(id){
      const r=oldNavigate.apply(this,arguments);
      if(id==='callnow'){
        const title=document.getElementById('pageTitle');if(title)title.textContent='Call Now';
        renderCallNow();
      }
      return r;
    };
  }catch(e){}
  try{
    const oldRenderAll=renderAll;
    renderAll=function(){const r=oldRenderAll.apply(this,arguments);setTimeout(renderCallNow,0);return r;};
  }catch(e){}
  try{
    const oldFollowSave=saveFollowups;
    saveFollowups=function(){const r=oldFollowSave.apply(this,arguments);setTimeout(renderCallNow,0);return r;};
  }catch(e){}
  try{
    const oldCloudLoad=cloudLoadAll;
    cloudLoadAll=async function(){const r=await oldCloudLoad.apply(this,arguments);leadStageSnapshot=new Map((leads||[]).map(l=>[String(l.id),String(l.status||'')]));ensureCallNowUI();renderCallNow();return r;};
  }catch(e){}
})();
