(function(){
  function ensureStructure(){
    const modal=document.querySelector('#leadUpdateModal .modal');
    const form=document.getElementById('leadUpdateForm');
    if(!modal||!form||modal.dataset.uxV3==='1')return;
    modal.dataset.uxV3='1';

    const hiddenIds=['luLeadId','luOriginalCustomer'];
    hiddenIds.forEach(id=>{
      const el=document.getElementById(id);
      if(el && el.parentElement!==form) form.prepend(el);
    });

    const head=modal.querySelector('.modal-head');
    if(head){
      head.innerHTML=`
        <div class="lu3-header">
          <div class="lu3-title-block">
            <div class="lu3-kicker">SALES LEAD</div>
            <div class="lu3-title-row">
              <b id="leadUpdateTitle">Update Lead</b>
              <span class="lu3-pill" id="luHeadPriority">Warm</span>
              <span class="lu3-pill stage" id="luHeadStage">New Lead</span>
            </div>
            <div class="lu3-sub" id="leadUpdateSub">Lead details</div>
          </div>
          <div class="lu3-actions">
            <button type="button" class="lu3-action" onclick="luQuickCall()">☎ <span>Call</span></button>
            <button type="button" class="lu3-action whatsapp" onclick="luQuickWhatsApp()">◉ <span>WhatsApp</span></button>
            <button type="button" class="lu3-action follow" onclick="switchLeadUpdateTab('follow')">◷ <span>Follow-up</span></button>
            <button type="button" class="lu3-close" onclick="closeLeadUpdate()">×</button>
          </div>
        </div>`;
    }

    const body=form.querySelector('.modal-body');
    const foot=form.querySelector('.modal-foot');
    if(!body||!foot)return;

    const field=id=>body.querySelector('#'+id)?.closest('.field');
    const take=id=>{const el=field(id);if(el)el.remove();return el;};
    const basic=['luCustomer','luCompany','luMobile','luWhatsapp','luEmail','luWebsite','luGST'].map(take).filter(Boolean);
    const lead=['luSource','luFabric','luQty','luPriority','luStatus','luSalesperson','luNotes'].map(take).filter(Boolean);
    const follow=['luFollowup','luFuTime','luFuType','luFuStatus','luFuDiscussion','luFuNextAction','luFuReminderDate','luFuReminderTime','luFuNotes'].map(take).filter(Boolean);
    const activity=body.querySelector('.lead-log-panel');
    if(activity)activity.remove();

    hiddenIds.forEach(id=>{const el=body.querySelector('#'+id);if(el)form.prepend(el);});
    body.remove();
    foot.remove();

    const workspace=document.createElement('div');
    workspace.className='lu3-workspace';
    workspace.innerHTML=`
      <aside class="lu3-nav">
        <div class="lu3-nav-summary">
          <div class="lu3-avatar" id="lu3Avatar">L</div>
          <div class="lu3-nav-name" id="lu3ClientName">Lead</div>
          <div class="lu3-nav-company" id="lu3CompanyName">Company</div>
        </div>
        <div class="lu3-nav-list">
          <button type="button" class="lu3-nav-item active" data-lutab="basic" onclick="switchLeadUpdateTab('basic')"><span>01</span><div><b>Client</b><small>Contact & company</small></div></button>
          <button type="button" class="lu3-nav-item" data-lutab="lead" onclick="switchLeadUpdateTab('lead')"><span>02</span><div><b>Requirement</b><small>Fabric & pipeline</small></div></button>
          <button type="button" class="lu3-nav-item" data-lutab="follow" onclick="switchLeadUpdateTab('follow')"><span>03</span><div><b>Follow-up</b><small>Next sales action</small></div></button>
          <button type="button" class="lu3-nav-item" data-lutab="activity" onclick="switchLeadUpdateTab('activity')"><span>04</span><div><b>Activity</b><small>Lead history</small></div></button>
        </div>
        <div class="lu3-nav-meta">
          <div><span>Next Follow-up</span><b id="luSummaryNext">Not scheduled</b></div>
          <div><span>Assigned To</span><b id="luSummarySales">Unassigned</b></div>
        </div>
      </aside>
      <section class="lu3-main">
        <div class="lu3-topstrip">
          <div><span>Priority</span><b id="luSummaryPriority">-</b></div>
          <div><span>Pipeline Stage</span><b id="luSummaryStage">-</b></div>
          <div><span>Last Activity</span><b id="luSummaryLast">No activity</b></div>
        </div>
        <div class="lu3-scroll">
          <div class="lu3-panel active" data-panel="basic"><div class="lu3-panel-head"><div><h3>Client & Company Details</h3><p>Only essential contact information for sales communication.</p></div></div><div class="lu3-grid" id="lu3Basic"></div></div>
          <div class="lu3-panel" data-panel="lead"><div class="lu3-panel-head"><div><h3>Requirement & Sales Status</h3><p>Qualification, fabric requirement, priority and current pipeline stage.</p></div></div><div class="lu3-grid" id="lu3Lead"></div></div>
          <div class="lu3-panel" data-panel="follow"><div class="lu3-panel-head"><div><h3>Follow-up & Next Action</h3><p>Record the discussion and schedule exactly what happens next.</p></div></div><div class="lu3-grid" id="lu3Follow"></div></div>
          <div class="lu3-panel" data-panel="activity"><div class="lu3-panel-head"><div><h3>Activity History</h3><p>Chronological lead history and follow-up actions.</p></div><span class="badge gray" id="leadLogCount">0 logs</span></div><div class="lu3-activity" id="leadUpdateLog"><div class="log-empty">No activity yet.</div></div></div>
        </div>
      </section>`;

    form.appendChild(workspace);
    const basicGrid=workspace.querySelector('#lu3Basic');
    const leadGrid=workspace.querySelector('#lu3Lead');
    const followGrid=workspace.querySelector('#lu3Follow');
    basic.forEach(f=>basicGrid.appendChild(f));
    lead.forEach(f=>{if(f.querySelector('#luNotes'))f.classList.add('wide');leadGrid.appendChild(f);});
    follow.forEach(f=>{if(['luFuDiscussion','luFuNextAction','luFuNotes'].some(id=>f.querySelector('#'+id)))f.classList.add('wide');followGrid.appendChild(f);});

    const footer=document.createElement('div');
    footer.className='lu3-footer';
    footer.innerHTML=`<div class="lu3-save-note">Shared CRM record · changes save for all users</div><div class="lu3-footer-actions"><button type="button" class="btn btn-light" onclick="closeLeadUpdate()">Cancel</button><button type="submit" class="btn btn-primary">Update Lead</button></div>`;
    form.appendChild(footer);
  }

  window.switchLeadUpdateTab=function(tab){
    document.querySelectorAll('#leadUpdateModal .lu3-nav-item').forEach(b=>b.classList.toggle('active',b.dataset.lutab===tab));
    document.querySelectorAll('#leadUpdateModal .lu3-panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===tab));
    const sc=document.querySelector('#leadUpdateModal .lu3-scroll');if(sc)sc.scrollTop=0;
  };
  window.luQuickCall=function(){const n=(document.getElementById('luMobile')?.value||'').replace(/\D/g,'');if(!n)return alert('Mobile number is not available.');window.location.href='tel:'+n;};
  window.luQuickWhatsApp=function(){let n=(document.getElementById('luWhatsapp')?.value||document.getElementById('luMobile')?.value||'').replace(/\D/g,'');if(!n)return alert('WhatsApp number is not available.');if(n.length===10)n='91'+n;window.open('https://wa.me/'+n,'_blank','noopener,noreferrer');};

  function refreshSummary(){
    const val=id=>document.getElementById(id)?.value||'';
    const priority=val('luPriority')||'Warm';
    const stage=val('luStatus')||'New Lead';
    const sales=val('luSalesperson')||'Unassigned';
    const customer=val('luCustomer')||'Lead';
    const company=val('luCompany')||'Company';
    const next=[val('luFollowup'),val('luFuTime')].filter(Boolean).join(' · ')||'Not scheduled';
    const log=document.querySelector('#leadUpdateLog .log-item');
    const last=log?.querySelector('.log-meta')?.textContent||log?.querySelector('.log-title')?.textContent||'No activity';
    const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text;};
    set('luSummaryNext',next);set('luSummarySales',sales);set('luSummaryPriority',priority);set('luSummaryStage',stage);set('luSummaryLast',last);
    set('lu3ClientName',customer);set('lu3CompanyName',company);set('lu3Avatar',(customer||company||'L').charAt(0).toUpperCase());
    const hp=document.getElementById('luHeadPriority');if(hp){hp.textContent=priority;hp.className='lu3-pill '+priority.toLowerCase();}
    const hs=document.getElementById('luHeadStage');if(hs)hs.textContent=stage;
  }

  document.addEventListener('input',e=>{if(['luCustomer','luCompany','luPriority','luStatus','luSalesperson','luFollowup','luFuTime'].includes(e.target?.id))refreshSummary();});
  document.addEventListener('change',e=>{if(['luCustomer','luCompany','luPriority','luStatus','luSalesperson','luFollowup','luFuTime'].includes(e.target?.id))refreshSummary();});

  try{
    const old=openLeadUpdateByCustomer;
    openLeadUpdateByCustomer=function(){ensureStructure();const r=old.apply(this,arguments);switchLeadUpdateTab('basic');setTimeout(refreshSummary,60);return r;};
  }catch(e){}
  try{
    const old=openLeadUpdateById;
    openLeadUpdateById=function(){ensureStructure();const r=old.apply(this,arguments);switchLeadUpdateTab('basic');setTimeout(refreshSummary,60);return r;};
  }catch(e){}

  ensureStructure();
})();