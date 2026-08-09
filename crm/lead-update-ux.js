(function(){
  function safeText(v){return String(v||'').trim()||'-';}
  function escAttr(v){return String(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
  function formatNow(){try{return new Date().toLocaleString([], {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}catch(e){return 'Now';}}

  function ensureStructure(){
    const modal=document.querySelector('#leadUpdateModal .modal');
    const form=document.getElementById('leadUpdateForm');
    if(!modal||!form||modal.dataset.uxReady==='1')return;
    modal.dataset.uxReady='1';

    const head=modal.querySelector('.modal-head');
    if(head){
      head.innerHTML=`<div class="lu-head-wrap">
        <div class="lu-head-main">
          <div class="lu-head-title-row"><b id="leadUpdateTitle">Update Lead</b><span class="lu-chip" id="luHeadPriority">Priority</span><span class="lu-chip stage" id="luHeadStage">Stage</span></div>
          <div class="lu-head-sub" id="leadUpdateSub">Lead details</div>
        </div>
        <div class="lu-head-actions">
          <button type="button" class="lu-quick-btn" onclick="luQuickCall()">☎ <span>Call</span></button>
          <button type="button" class="lu-quick-btn wa" onclick="luQuickWhatsApp()">◉ <span>WhatsApp</span></button>
          <button type="button" class="lu-quick-btn primary-soft" onclick="luGoFollowup()">◷ <span>Reminder</span></button>
          <button type="button" class="lu-x" onclick="closeLeadUpdate()">×</button>
        </div>
      </div>`;
    }

    const originalBody=form.querySelector('.modal-body');
    const originalFoot=form.querySelector('.modal-foot');
    if(!originalBody||!originalFoot)return;

    const byId=id=>originalBody.querySelector('#'+id)?.closest('.field');
    const take=id=>{const el=byId(id);if(el)el.remove();return el;};
    const basicIds=['luCustomer','luCompany','luMobile','luWhatsapp','luEmail','luWebsite','luGST'];
    const leadIds=['luSource','luFabric','luQty','luPriority','luStatus','luSalesperson','luNotes'];
    const followIds=['luFollowup','luFuTime','luFuType','luFuStatus','luFuDiscussion','luFuNextAction','luFuReminderDate','luFuReminderTime','luFuNotes'];
    const basics=basicIds.map(take).filter(Boolean);
    const leadFields=leadIds.map(take).filter(Boolean);
    const followFields=followIds.map(take).filter(Boolean);
    const activity=originalBody.querySelector('.lead-log-panel');
    if(activity)activity.remove();

    originalBody.remove();
    originalFoot.remove();

    const summary=document.createElement('div');summary.className='lu-summary';summary.id='luSummary';summary.innerHTML=`
      <div class="lu-summary-item"><div class="lu-summary-k">Last Activity</div><div class="lu-summary-v" id="luSummaryLast">-</div></div>
      <div class="lu-summary-item"><div class="lu-summary-k">Next Follow-up</div><div class="lu-summary-v" id="luSummaryNext">-</div></div>
      <div class="lu-summary-item"><div class="lu-summary-k">Priority</div><div class="lu-summary-v" id="luSummaryPriority">-</div></div>
      <div class="lu-summary-item"><div class="lu-summary-k">Stage</div><div class="lu-summary-v" id="luSummaryStage">-</div></div>
      <div class="lu-summary-item"><div class="lu-summary-k">Assigned To</div><div class="lu-summary-v" id="luSummarySales">Unassigned</div></div>`;

    const tabs=document.createElement('div');tabs.className='lu-tabs-wrap';tabs.innerHTML=`<div class="lu-tabs">
      <button type="button" class="lu-tab active" data-lutab="basic" onclick="switchLeadUpdateTab('basic')">1 · Basic Details</button>
      <button type="button" class="lu-tab" data-lutab="lead" onclick="switchLeadUpdateTab('lead')">2 · Lead Details</button>
      <button type="button" class="lu-tab" data-lutab="follow" onclick="switchLeadUpdateTab('follow')">3 · Follow-up & Activity</button>
    </div>`;

    const scroll=document.createElement('div');scroll.className='lu-scroll';
    const basicPanel=document.createElement('div');basicPanel.className='lu-panel active';basicPanel.dataset.panel='basic';basicPanel.innerHTML=`<div class="lu-card"><div class="lu-section-title"><div><h3>Client & Company</h3><p>Keep only essential contact information here.</p></div></div><div class="lu-grid" id="luBasicGrid"></div></div>`;
    const leadPanel=document.createElement('div');leadPanel.className='lu-panel';leadPanel.dataset.panel='lead';leadPanel.innerHTML=`<div class="lu-card"><div class="lu-section-title"><div><h3>Requirement & Sales Status</h3><p>Everything your sales team needs to qualify and move the lead.</p></div></div><div class="lu-grid" id="luLeadGrid"></div><div class="lu-help-strip"><span class="lu-help-dot"></span>Pipeline, priority and salesperson are visible together so updates are faster.</div></div>`;
    const followPanel=document.createElement('div');followPanel.className='lu-panel';followPanel.dataset.panel='follow';followPanel.innerHTML=`<div class="lu-follow-grid"><div class="lu-card"><div class="lu-section-title"><div><h3>Follow-up</h3><p>Schedule the next customer action without leaving this window.</p></div></div><div class="lu-grid" id="luFollowGrid"></div></div><div class="lu-card lu-activity-card"><div class="lu-activity-head"><div><h3>Activity Log</h3><div class="lu-empty-note">Lead history in one clean timeline.</div></div><span class="badge gray" id="leadLogCount">0 logs</span></div><div class="lead-log-list" id="leadUpdateLog"><div class="log-empty">No activity yet.</div></div></div></div>`;
    scroll.append(basicPanel,leadPanel,followPanel);
    const basicGrid=basicPanel.querySelector('#luBasicGrid'),leadGrid=leadPanel.querySelector('#luLeadGrid'),followGrid=followPanel.querySelector('#luFollowGrid');
    basics.forEach((f,i)=>{if(i===6)f.classList.add('full');basicGrid.appendChild(f);});
    leadFields.forEach(f=>{if(f.querySelector('#luNotes'))f.classList.add('full');leadGrid.appendChild(f);});
    followFields.forEach(f=>{if(['luFuDiscussion','luFuNextAction','luFuNotes'].some(id=>f.querySelector('#'+id)))f.classList.add('full');followGrid.appendChild(f);});

    const footer=document.createElement('div');footer.className='lu-footer';footer.innerHTML=`<div class="lu-footer-note">Changes save to the shared CRM when you click Update Lead.</div><div class="lu-footer-actions"><button type="button" class="btn btn-light" onclick="closeLeadUpdate()">Cancel</button><button type="button" class="btn btn-light" onclick="luSaveDraft()">Save Draft</button><button type="submit" class="btn btn-primary lu-save">Update Lead</button></div>`;
    form.append(summary,tabs,scroll,footer);
  }

  window.switchLeadUpdateTab=function(tab){
    document.querySelectorAll('#leadUpdateModal .lu-tab').forEach(b=>b.classList.toggle('active',b.dataset.lutab===tab));
    document.querySelectorAll('#leadUpdateModal .lu-panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===tab));
    const scroll=document.querySelector('#leadUpdateModal .lu-scroll');if(scroll)scroll.scrollTop=0;
  };
  window.luGoFollowup=function(){switchLeadUpdateTab('follow');setTimeout(()=>document.getElementById('luFollowup')?.focus(),60);};
  window.luQuickCall=function(){const n=(document.getElementById('luMobile')?.value||'').replace(/\D/g,'');if(!n)return alert('Mobile number is not available.');window.location.href='tel:'+n;};
  window.luQuickWhatsApp=function(){let n=(document.getElementById('luWhatsapp')?.value||document.getElementById('luMobile')?.value||'').replace(/\D/g,'');if(!n)return alert('WhatsApp number is not available.');if(n.length===10)n='91'+n;window.open('https://wa.me/'+n,'_blank','noopener,noreferrer');};
  window.luSaveDraft=function(){try{const id=document.getElementById('luLeadId')?.value;const lead=id?(leads||[]).find(l=>l.id===id):null;if(!lead)return alert('Open an existing lead to save draft.');lead.notes=document.getElementById('luNotes')?.value.trim()||lead.notes||'';lead.followup=document.getElementById('luFollowup')?.value||lead.followup||'-';lead.followupTime=document.getElementById('luFuTime')?.value||'';lead.followupDiscussion=document.getElementById('luFuDiscussion')?.value.trim()||'';save();localStorage.setItem('textileflow_leads',JSON.stringify(leads));alert('Draft saved.');}catch(e){alert('Could not save draft.');}};

  function refreshSummary(){
    const val=id=>document.getElementById(id)?.value||'';
    const priority=val('luPriority')||'Warm',stage=val('luStatus')||'New Lead',sales=val('luSalesperson')||'Unassigned';
    const next=[val('luFollowup'),val('luFuTime')].filter(Boolean).join(' · ')||'Not scheduled';
    const log=document.querySelector('#leadUpdateLog .log-item');
    const last=log?.querySelector('.log-meta')?.textContent||log?.querySelector('.log-title')?.textContent||'No activity';
    const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text;};
    set('luSummaryLast',last);set('luSummaryNext',next);set('luSummaryPriority',priority);set('luSummaryStage',stage);set('luSummarySales',sales);
    const hp=document.getElementById('luHeadPriority');if(hp){hp.textContent=priority;hp.className='lu-chip '+priority.toLowerCase();}
    const hs=document.getElementById('luHeadStage');if(hs)hs.textContent=stage;
  }

  ['luPriority','luStatus','luSalesperson','luFollowup','luFuTime'].forEach(id=>document.addEventListener('change',e=>{if(e.target?.id===id)refreshSummary();}));
  const observer=new MutationObserver(()=>{if(document.getElementById('leadUpdateModal')?.classList.contains('open'))refreshSummary();});
  const modal=document.getElementById('leadUpdateModal');if(modal)observer.observe(modal,{attributes:true,attributeFilter:['class']});

  try{
    const oldOpen=openLeadUpdateByCustomer;
    openLeadUpdateByCustomer=function(){ensureStructure();const r=oldOpen.apply(this,arguments);switchLeadUpdateTab('basic');setTimeout(refreshSummary,40);return r;};
  }catch(e){}
  try{
    const oldById=openLeadUpdateById;
    openLeadUpdateById=function(){ensureStructure();const r=oldById.apply(this,arguments);switchLeadUpdateTab('basic');setTimeout(refreshSummary,40);return r;};
  }catch(e){}

  ensureStructure();
})();