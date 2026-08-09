(function(){
  const fieldIds={
    basic:['luCustomer','luCompany','luMobile','luWhatsapp','luEmail','luWebsite','luGST'],
    lead:['luSource','luFabric','luQty','luPriority','luStatus','luSalesperson','luNotes'],
    follow:['luFollowup','luFuTime','luFuType','luFuStatus','luFuDiscussion','luFuNextAction','luFuNotes']
  };

  function detachField(form,id){
    const input=form.querySelector('#'+id);
    const f=input?.closest('.field');
    if(f){f.remove();return f;}
    return null;
  }

  function enableNativePicker(id){
    const input=document.getElementById(id);
    if(!input||input.dataset.fullPicker==='1')return;
    input.dataset.fullPicker='1';
    input.style.cursor='pointer';
    const openPicker=()=>{
      try{if(typeof input.showPicker==='function')input.showPicker();}catch(e){}
    };
    input.addEventListener('click',openPicker);
    input.addEventListener('focus',openPicker);
  }

  function buildStructure(){
    const modal=document.querySelector('#leadUpdateModal .modal');
    const form=document.getElementById('leadUpdateForm');
    if(!modal||!form||modal.dataset.uxV4==='1')return;

    const fields={};
    Object.entries(fieldIds).forEach(([group,ids])=>{
      fields[group]=ids.map(id=>detachField(form,id)).filter(Boolean);
    });

    // Keep reminder values available for legacy save/sync code, but do not show them in the UI.
    const legacyHidden=[];
    ['luFuReminderDate','luFuReminderTime'].forEach(id=>{
      const field=detachField(form,id);
      const input=field?.querySelector('#'+id);
      if(input){
        input.type='hidden';
        input.removeAttribute('required');
        legacyHidden.push(input);
      }
    });

    const hidden=[];
    ['luLeadId','luOriginalCustomer'].forEach(id=>{
      const el=form.querySelector('#'+id)||document.getElementById(id);
      if(el){el.remove();hidden.push(el);}
    });

    modal.querySelectorAll('#leadUpdateLog,#leadLogCount').forEach(el=>el.remove());
    form.innerHTML='';
    hidden.forEach(el=>form.appendChild(el));
    legacyHidden.forEach(el=>form.appendChild(el));

    const head=modal.querySelector('.modal-head');
    if(head){
      head.innerHTML=`
        <div class="lu4-header">
          <div class="lu4-heading">
            <div class="lu4-eyebrow">SALES LEAD</div>
            <div class="lu4-titleline">
              <h2 id="leadUpdateTitle">Update Lead</h2>
              <span class="lu4-pill" id="luHeadPriority">Warm</span>
              <span class="lu4-pill stage" id="luHeadStage">New Lead</span>
            </div>
            <div class="lu4-sub" id="leadUpdateSub">Lead details</div>
          </div>
          <div class="lu4-actions">
            <button type="button" class="lu4-action" onclick="luQuickCall()">☎ <span>Call</span></button>
            <button type="button" class="lu4-action wa" onclick="luQuickWhatsApp()">◉ <span>WhatsApp</span></button>
            <button type="button" class="lu4-action follow" onclick="switchLeadUpdateTab('follow')">◷ <span>Follow-up</span></button>
            <button type="button" class="lu4-close" onclick="closeLeadUpdate()">×</button>
          </div>
        </div>`;
    }

    const workspace=document.createElement('div');
    workspace.className='lu4-workspace';
    workspace.innerHTML=`
      <aside class="lu4-profile">
        <div class="lu4-profile-top">
          <div class="lu4-avatar" id="lu4Avatar">L</div>
          <div>
            <div class="lu4-name" id="lu4ClientName">Lead</div>
            <div class="lu4-company" id="lu4CompanyName">Company</div>
          </div>
        </div>
        <div class="lu4-profile-divider"></div>
        <div class="lu4-mini-list">
          <div class="lu4-mini"><span>Priority</span><b id="luSummaryPriority">-</b></div>
          <div class="lu4-mini"><span>Pipeline Stage</span><b id="luSummaryStage">-</b></div>
          <div class="lu4-mini"><span>Assigned To</span><b id="luSummarySales">Unassigned</b></div>
          <div class="lu4-mini"><span>Next Follow-up</span><b id="luSummaryNext">Not scheduled</b></div>
          <div class="lu4-mini"><span>Last Activity</span><b id="luSummaryLast">No activity</b></div>
        </div>
        <div class="lu4-profile-actions">
          <button type="button" onclick="switchLeadUpdateTab('activity')">View Activity History</button>
          <button type="button" class="primary" onclick="switchLeadUpdateTab('follow')">Schedule Follow-up</button>
        </div>
      </aside>
      <section class="lu4-main">
        <div class="lu4-tabs">
          <button type="button" class="lu4-tab active" data-lutab="basic" onclick="switchLeadUpdateTab('basic')"><span class="num">01</span> Client</button>
          <button type="button" class="lu4-tab" data-lutab="lead" onclick="switchLeadUpdateTab('lead')"><span class="num">02</span> Requirement</button>
          <button type="button" class="lu4-tab" data-lutab="follow" onclick="switchLeadUpdateTab('follow')"><span class="num">03</span> Follow-up</button>
          <button type="button" class="lu4-tab" data-lutab="activity" onclick="switchLeadUpdateTab('activity')"><span class="num">04</span> Activity</button>
        </div>
        <div class="lu4-scroll">
          <div class="lu4-panel active" data-panel="basic">
            <div class="lu4-card">
              <div class="lu4-cardhead"><div><h3>Client & Company Details</h3><p>Keep the essential contact details clear and easy to update.</p></div></div>
              <div class="lu4-grid" id="lu4Basic"></div>
            </div>
          </div>
          <div class="lu4-panel" data-panel="lead">
            <div class="lu4-card">
              <div class="lu4-cardhead"><div><h3>Requirement & Sales Status</h3><p>Track fabric requirement, priority, owner and current pipeline stage.</p></div></div>
              <div class="lu4-grid" id="lu4Lead"></div>
            </div>
          </div>
          <div class="lu4-panel" data-panel="follow">
            <div class="lu4-card">
              <div class="lu4-cardhead"><div><h3>Follow-up & Next Action</h3><p>Select the next follow-up date and time, then record the sales action.</p></div></div>
              <div class="lu4-grid" id="lu4Follow"></div>
            </div>
          </div>
          <div class="lu4-panel" data-panel="activity">
            <div class="lu4-card">
              <div class="lu4-cardhead"><div><h3>Activity History</h3><p>Complete lead timeline from first enquiry to latest follow-up.</p></div><span class="badge gray" id="leadLogCount">0 logs</span></div>
              <div class="lu4-activity" id="leadUpdateLog"><div class="log-empty">No activity yet.</div></div>
            </div>
          </div>
        </div>
      </section>`;

    form.appendChild(workspace);

    const basic=workspace.querySelector('#lu4Basic');
    const lead=workspace.querySelector('#lu4Lead');
    const follow=workspace.querySelector('#lu4Follow');
    fields.basic.forEach(f=>basic.appendChild(f));
    fields.lead.forEach(f=>{if(f.querySelector('#luNotes'))f.classList.add('wide');lead.appendChild(f);});
    fields.follow.forEach(f=>{if(['luFuDiscussion','luFuNextAction','luFuNotes'].some(id=>f.querySelector('#'+id)))f.classList.add('wide');follow.appendChild(f);});

    enableNativePicker('luFollowup');
    enableNativePicker('luFuTime');

    const footer=document.createElement('div');
    footer.className='lu4-footer';
    footer.innerHTML=`
      <div class="lu4-footer-note">Shared CRM record · changes save for all users</div>
      <div class="lu4-footer-actions">
        <button type="button" class="btn btn-light" onclick="closeLeadUpdate()">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Lead</button>
      </div>`;
    form.appendChild(footer);

    modal.dataset.uxV4='1';
  }

  window.switchLeadUpdateTab=function(tab){
    document.querySelectorAll('#leadUpdateModal .lu4-tab').forEach(b=>b.classList.toggle('active',b.dataset.lutab===tab));
    document.querySelectorAll('#leadUpdateModal .lu4-panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===tab));
    const sc=document.querySelector('#leadUpdateModal .lu4-scroll');if(sc)sc.scrollTop=0;
    if(tab==='follow'){
      enableNativePicker('luFollowup');
      enableNativePicker('luFuTime');
    }
  };

  window.luQuickCall=function(){
    const n=(document.getElementById('luMobile')?.value||'').replace(/\D/g,'');
    if(!n)return alert('Mobile number is not available.');
    window.location.href='tel:'+n;
  };
  window.luQuickWhatsApp=function(){
    let n=(document.getElementById('luWhatsapp')?.value||document.getElementById('luMobile')?.value||'').replace(/\D/g,'');
    if(!n)return alert('WhatsApp number is not available.');
    if(n.length===10)n='91'+n;
    window.open('https://wa.me/'+n,'_blank','noopener,noreferrer');
  };

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
    set('luSummaryPriority',priority);set('luSummaryStage',stage);set('luSummarySales',sales);set('luSummaryNext',next);set('luSummaryLast',last);
    set('lu4ClientName',customer);set('lu4CompanyName',company);set('lu4Avatar',(customer||company||'L').charAt(0).toUpperCase());
    const hp=document.getElementById('luHeadPriority');if(hp){hp.textContent=priority;hp.className='lu4-pill '+priority.toLowerCase();}
    const hs=document.getElementById('luHeadStage');if(hs){hs.textContent=stage;hs.className='lu4-pill stage';}
  }

  document.addEventListener('input',e=>{
    if(['luCustomer','luCompany','luPriority','luStatus','luSalesperson','luFollowup','luFuTime'].includes(e.target?.id))refreshSummary();
  });
  document.addEventListener('change',e=>{
    if(['luCustomer','luCompany','luPriority','luStatus','luSalesperson','luFollowup','luFuTime'].includes(e.target?.id))refreshSummary();
  });

  buildStructure();

  try{
    const old=openLeadUpdateByCustomer;
    openLeadUpdateByCustomer=function(){
      buildStructure();
      const r=old.apply(this,arguments);
      switchLeadUpdateTab('basic');
      setTimeout(()=>{refreshSummary();enableNativePicker('luFollowup');enableNativePicker('luFuTime');},40);
      return r;
    };
  }catch(e){}

  try{
    const old=openLeadUpdateById;
    openLeadUpdateById=function(){
      buildStructure();
      const r=old.apply(this,arguments);
      setTimeout(()=>{refreshSummary();enableNativePicker('luFollowup');enableNativePicker('luFuTime');},40);
      return r;
    };
  }catch(e){}
})();
