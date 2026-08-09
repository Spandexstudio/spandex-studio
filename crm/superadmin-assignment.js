(function(){
  if(window.__crmSuperAdminAssignmentLoaded)return;
  window.__crmSuperAdminAssignmentLoaded=true;

  const style=document.createElement('style');
  style.id='crm-superadmin-assignment-style';
  style.textContent=`
    .assign-modal .modal{width:min(1080px,96vw);max-height:92vh}
    .assign-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}
    .assign-stat{border:1px solid var(--line);border-radius:13px;background:#fff;padding:13px}
    .assign-stat small{display:block;font-size:8px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);font-weight:850}
    .assign-stat strong{display:block;font-size:23px;margin-top:4px}
    .assign-tabs{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
    .assign-tab{border:1px solid var(--line);background:#fff;border-radius:999px;padding:9px 13px;font-size:10px;font-weight:850;color:#5b6678;cursor:pointer}
    .assign-tab.active{background:#edf2ff;color:#3157d5;border-color:#d3defe}
    .assign-toolbar{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
    .assign-toolbar>div{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .assign-check{width:17px;height:17px;accent-color:#3157d5}
    .assign-auto{border:1px solid var(--line);border-radius:14px;background:#fbfcff;padding:17px}
    .assign-note{margin-top:11px;border:1px solid #dce4ff;background:#f6f8ff;border-radius:11px;padding:11px;font-size:10px;line-height:1.55;color:#526078}
    .assign-load-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:13px}
    .assign-person{border:1px solid var(--line);border-radius:11px;background:#fff;padding:11px;display:flex;align-items:center;justify-content:space-between;gap:10px}
    .assign-person b{font-size:11px}.assign-person span{font-size:9px;color:var(--muted)}
    .assign-count{background:#eef2ff!important;color:#3157d5!important;border-radius:999px;padding:5px 8px;font-weight:850}
    .assign-empty{text-align:center;padding:28px;color:var(--muted);font-size:11px}
    @media(max-width:760px){.assign-stats,.assign-load-grid{grid-template-columns:1fr}.assign-modal .modal{width:98vw}}
  `;
  document.head.appendChild(style);

  let mode='manual';
  const selected=new Set();

  function admin(){return !!(window.crmCurrentProfile&&crmCurrentProfile.role==='Super Admin'&&crmCurrentProfile.status==='Active')}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function sales(){
    const seen=new Set();
    return (window.crmUsers||[]).filter(u=>u&&u.role==='Sales Executive'&&u.status==='Active').map(u=>({id:u.id,name:String(u.name||u.loginId||'').trim()})).filter(u=>{
      if(!u.name)return false;const k=u.name.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;
    });
  }
  function openLeads(){return (window.leads||[]).filter(l=>!['Order Confirmed','Lost'].includes(String(l.status||'')))}
  function unassigned(l){const s=String(l?.salesperson||'').trim().toLowerCase();return !s||s==='unassigned'||s==='none'||s==='-'}
  function unassignedLeads(){return openLeads().filter(unassigned)}
  function loads(){
    const people=sales(),m=new Map(people.map(p=>[p.name,0]));
    openLeads().forEach(l=>{const p=people.find(x=>x.name.toLowerCase()===String(l.salesperson||'').trim().toLowerCase());if(p)m.set(p.name,(m.get(p.name)||0)+1)});
    return m;
  }
  function persist(){
    try{save()}catch(e){
      try{localStorage.setItem('textileflow_leads',JSON.stringify(leads||[]))}catch(_){}
      try{if(typeof cloudSaveLeads==='function')cloudSaveLeads()}catch(_){}
    }
    try{renderLeadDashboard()}catch(e){}
    try{renderPipeline()}catch(e){}
    try{renderNotifications()}catch(e){}
    try{if(typeof renderCallNow==='function')renderCallNow()}catch(e){}
  }
  function log(l,title,text){try{if(typeof addLeadLog==='function')addLeadLog(l.id,title,text,'Assignment')}catch(e){}}

  function buttons(){
    const hero=document.querySelector('#leads .hero');if(!hero)return;
    let action=hero.querySelector(':scope > div:last-child');
    if(!action||action===hero.querySelector(':scope > div:first-child')){action=document.createElement('div');action.style.cssText='display:flex;gap:8px;flex-wrap:wrap';hero.appendChild(action)}
    if(!document.getElementById('manualAssignLeadsBtn')){
      const b=document.createElement('button');b.id='manualAssignLeadsBtn';b.className='btn btn-light';b.type='button';b.textContent='Manual Assign';b.onclick=()=>window.openLeadAssignmentCenter('manual');action.prepend(b)
    }
    if(!document.getElementById('autoAssignLeadsBtn')){
      const b=document.createElement('button');b.id='autoAssignLeadsBtn';b.className='btn btn-light';b.type='button';b.textContent='Auto Assign';b.onclick=()=>window.openLeadAssignmentCenter('auto');action.insertBefore(b,document.getElementById('manualAssignLeadsBtn'))
    }
    document.querySelectorAll('#manualAssignLeadsBtn,#autoAssignLeadsBtn').forEach(b=>b.style.display=admin()?'':'none');
  }

  function modal(){
    if(document.getElementById('leadAssignmentModal'))return;
    const x=document.createElement('div');x.id='leadAssignmentModal';x.className='modal-backdrop assign-modal';x.style.zIndex='180';
    x.innerHTML=`<div class="modal"><div class="modal-head"><div><b>Lead Assignment Center</b><div class="muted" style="font-size:10px;margin-top:3px">Super Admin only · Assign leads manually or distribute unassigned leads on demand.</div></div><button class="close" type="button" onclick="closeLeadAssignmentCenter()">✕</button></div><div class="modal-body">
      <div class="assign-stats"><div class="assign-stat"><small>Open Leads</small><strong id="asOpen">0</strong></div><div class="assign-stat"><small>Unassigned</small><strong id="asUnassigned">0</strong></div><div class="assign-stat"><small>Active Sales Executives</small><strong id="asSales">0</strong></div></div>
      <div class="assign-tabs"><button class="assign-tab active" data-amode="manual" onclick="setLeadAssignMode('manual')">Manual Assign</button><button class="assign-tab" data-amode="auto" onclick="setLeadAssignMode('auto')">Auto Assign On Demand</button></div>
      <div id="assignManual"><div class="assign-toolbar"><div><select class="filter" id="assignLeadFilter" onchange="renderLeadAssign()"><option value="unassigned">Unassigned Leads</option><option value="all">All Open Leads</option></select><input class="small-input" id="assignSearch" placeholder="Search lead, company or mobile" oninput="renderLeadAssign()"></div><div><select class="filter" id="assignPerson"></select><button class="btn btn-primary" type="button" onclick="manualAssignNow()">Assign Selected</button></div></div><div class="card table-card" style="max-height:420px;overflow:auto"><table><thead><tr><th><input id="assignAll" class="assign-check" type="checkbox" onchange="toggleAssignAll(this.checked)"></th><th>Lead</th><th>Customer</th><th>Company</th><th>Mobile</th><th>Stage</th><th>Assigned To</th></tr></thead><tbody id="assignRows"></tbody></table></div></div>
      <div id="assignAuto" style="display:none"><div class="assign-auto"><div style="font-size:13px;font-weight:900">Auto Assign On Demand</div><div class="muted" style="font-size:10px;line-height:1.55;margin-top:5px">This never runs automatically in the background. Super Admin must click <b>Auto Assign Now</b>. Only unassigned open leads are included.</div><div class="assign-note"><b>Balanced workload logic:</b> each lead goes to the active Sales Executive who currently has the fewest open leads. The workload is recalculated after every assignment.</div><div class="assign-load-grid" id="assignLoads"></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn btn-light" type="button" onclick="renderLeadAssign()">Refresh</button><button class="btn btn-primary" id="autoAssignNowBtn" type="button" onclick="autoAssignNow()">Auto Assign Now</button></div></div></div>
    </div><div class="modal-foot"><button class="btn btn-light" type="button" onclick="closeLeadAssignmentCenter()">Close</button></div></div>`;
    document.body.appendChild(x);x.addEventListener('click',e=>{if(e.target===x)window.closeLeadAssignmentCenter()})
  }

  window.openLeadAssignmentCenter=function(m='manual'){
    if(!admin())return alert('Only Super Admin can assign leads.');modal();mode=m==='auto'?'auto':'manual';selected.clear();window.renderLeadAssign();document.getElementById('leadAssignmentModal').classList.add('open')
  };
  window.closeLeadAssignmentCenter=function(){document.getElementById('leadAssignmentModal')?.classList.remove('open')};
  window.setLeadAssignMode=function(m){mode=m;window.renderLeadAssign()};
  window.toggleAssignLead=function(id,yes){yes?selected.add(String(id)):selected.delete(String(id));window.renderLeadAssign(false)};
  window.toggleAssignAll=function(yes){document.querySelectorAll('#assignRows input[data-id]').forEach(c=>{c.checked=yes;yes?selected.add(c.dataset.id):selected.delete(c.dataset.id)})};

  window.renderLeadAssign=function(){
    const people=sales(),op=openLeads(),ua=unassignedLeads();
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};set('asOpen',op.length);set('asUnassigned',ua.length);set('asSales',people.length);
    document.querySelectorAll('.assign-tab').forEach(b=>b.classList.toggle('active',b.dataset.amode===mode));
    const man=document.getElementById('assignManual'),aut=document.getElementById('assignAuto');if(man)man.style.display=mode==='manual'?'block':'none';if(aut)aut.style.display=mode==='auto'?'block':'none';
    const ps=document.getElementById('assignPerson');if(ps){const cur=ps.value;ps.innerHTML='<option value="">Select Salesperson</option>'+people.map(p=>`<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('');if(people.some(p=>p.name===cur))ps.value=cur}
    const filter=document.getElementById('assignLeadFilter')?.value||'unassigned',q=String(document.getElementById('assignSearch')?.value||'').trim().toLowerCase();let items=filter==='all'?op:ua;
    if(q)items=items.filter(l=>[l.id,l.customer,l.company,l.mobile,l.status,l.salesperson].some(v=>String(v||'').toLowerCase().includes(q)));
    const rows=document.getElementById('assignRows');if(rows)rows.innerHTML=items.length?items.map(l=>`<tr><td><input class="assign-check" type="checkbox" data-id="${esc(l.id)}" ${selected.has(String(l.id))?'checked':''} onchange="toggleAssignLead('${esc(l.id)}',this.checked)"></td><td><b>${esc(l.id)}</b></td><td>${esc(l.customer||'-')}</td><td>${esc(l.company||'-')}</td><td>${esc(l.mobile||'-')}</td><td><span class="badge">${esc(l.status||'New Lead')}</span></td><td>${esc(l.salesperson||'Unassigned')}</td></tr>`).join(''):'<tr><td colspan="7"><div class="assign-empty">No leads found.</div></td></tr>';
    const lm=loads(),lw=document.getElementById('assignLoads');if(lw)lw.innerHTML=people.length?people.map(p=>`<div class="assign-person"><div><b>${esc(p.name)}</b><span style="display:block;margin-top:3px">Current open workload</span></div><span class="assign-count">${lm.get(p.name)||0} lead${(lm.get(p.name)||0)===1?'':'s'}</span></div>`).join(''):'<div class="assign-empty" style="grid-column:1/-1">No active Sales Executive found. Create an active Sales Executive first.</div>';
    const ab=document.getElementById('autoAssignNowBtn');if(ab)ab.disabled=!people.length||!ua.length;
  };

  window.manualAssignNow=function(){
    if(!admin())return alert('Only Super Admin can assign leads.');const person=document.getElementById('assignPerson')?.value||'';if(!person)return alert('Select a Salesperson.');if(!selected.size)return alert('Select at least one lead.');let n=0;
    selected.forEach(id=>{const l=(leads||[]).find(x=>String(x.id)===String(id));if(!l)return;const before=l.salesperson||'Unassigned';l.salesperson=person;n++;log(l,'Lead manually assigned',before+' → '+person+' by Super Admin.')});selected.clear();persist();window.renderLeadAssign();alert(n+' lead'+(n===1?'':'s')+' assigned to '+person+'.')
  };

  window.autoAssignNow=function(){
    if(!admin())return alert('Only Super Admin can auto assign leads.');const people=sales(),ua=unassignedLeads();if(!people.length)return alert('No active Sales Executive found.');if(!ua.length)return alert('There are no unassigned open leads.');if(!confirm('Auto assign '+ua.length+' unassigned lead'+(ua.length===1?'':'s')+' across '+people.length+' active Sales Executive'+(people.length===1?'':'s')+'?'))return;
    const lm=loads(),count=new Map(people.map(p=>[p.name,0]));ua.forEach(l=>{const chosen=[...people].sort((a,b)=>{const x=lm.get(a.name)||0,y=lm.get(b.name)||0;return x!==y?x-y:a.name.localeCompare(b.name)})[0];l.salesperson=chosen.name;lm.set(chosen.name,(lm.get(chosen.name)||0)+1);count.set(chosen.name,(count.get(chosen.name)||0)+1);log(l,'Lead auto assigned','Assigned to '+chosen.name+' by Super Admin · On-demand balanced assignment.')});persist();window.renderLeadAssign();alert('Auto assignment completed.\n\n'+[...count].filter(([,n])=>n).map(([p,n])=>p+': '+n).join('\n'))
  };

  function refresh(){buttons();if(document.getElementById('leadAssignmentModal')?.classList.contains('open'))window.renderLeadAssign()}
  modal();refresh();
  try{const oldNav=navigate;navigate=function(id){const r=oldNav.apply(this,arguments);if(id==='leads')setTimeout(refresh,0);return r}}catch(e){}
  try{const oldLoad=cloudLoadAll;cloudLoadAll=async function(){const r=await oldLoad.apply(this,arguments);refresh();return r}}catch(e){}
})();