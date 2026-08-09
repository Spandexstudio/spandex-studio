(function(){
  const state={active:false,category:'',ids:[],index:0,opening:false};

  function label(category){
    return ({all:'All Leads',uncontacted:'Uncontacted',inprogress:'In-Progress',followup:'Follow-up',notconnected:'Not Connected'})[category]||'Lead';
  }
  function findLead(id){return (leads||[]).find(l=>String(l.id)===String(id))||null;}
  function queuePositionFor(id){return state.ids.findIndex(x=>String(x)===String(id));}
  function clean(v){return String(v||'').trim().toLowerCase();}
  function sameParty(lead,name){
    const n=clean(name);
    return clean(lead?.company)===n || clean(lead?.customer)===n;
  }
  function latestCallOutcome(lead){
    if(!lead)return '';
    if(lead.callStatus)return lead.callStatus;
    const matches=(dashboardData?.followups||[]).filter(f=>sameParty(lead,f.customer) && String(f.type||'').toLowerCase()==='call' && f.customerResponse);
    if(matches.length)return String(matches[0].customerResponse||'');
    const cs=String(lead.contactStatus||'');
    if(cs==='Not Connected')return 'Call Not Connected';
    if(cs==='Contacted')return 'Call Connected';
    return '';
  }

  function ensureCallStatusField(){
    const follow=document.getElementById('lu4Follow');
    if(!follow || document.getElementById('luCallStatus'))return;

    const field=document.createElement('div');
    field.className='field';
    field.id='luCallStatusField';
    field.innerHTML='<label>Call Status *</label><select id="luCallStatus" name="callStatus"><option value="">Select Call Status</option><option>Call Connected</option><option>Call Not Connected</option></select>';
    const typeField=document.getElementById('luFuType')?.closest('.field');
    if(typeField)typeField.insertAdjacentElement('afterend',field); else follow.prepend(field);

    document.getElementById('luCallStatus')?.addEventListener('change',function(){
      const lead=findLead(document.getElementById('luLeadId')?.value||'');
      if(lead)lead.callStatus=this.value||'';
      updateCallStatusVisibility();
    });
    updateCallStatusVisibility();
  }

  function updateCallStatusVisibility(){
    ensureCallStatusField();
    const type=document.getElementById('luFuType');
    const field=document.getElementById('luCallStatusField');
    const select=document.getElementById('luCallStatus');
    if(!type||!field||!select)return;
    const isCall=type.value==='Call';
    field.style.display=isCall?'block':'none';
    select.required=isCall;
    if(!isCall)select.value='';
  }

  function loadCallStatus(){
    ensureCallStatusField();
    const lead=findLead(document.getElementById('luLeadId')?.value||'');
    const select=document.getElementById('luCallStatus');
    if(select)select.value=latestCallOutcome(lead)||'';
    updateCallStatusVisibility();
  }

  document.addEventListener('change',e=>{
    if(e.target?.id==='luFuType')updateCallStatusVisibility();
  });

  function persistOutcome(lead,outcome){
    if(!lead||!outcome)return;
    lead.callStatus=outcome;
    lead.contactStatus=outcome==='Call Not Connected'?'Not Connected':'Contacted';

    let fu=(dashboardData?.followups||[]).find(f=>sameParty(lead,f.customer) && String(f.type||'').toLowerCase()==='call');
    if(!fu){
      fu={
        customer:lead.company||lead.customer||'',
        type:'Call',
        discussion:lead.followupDiscussion||'',
        date:(lead.followup&&lead.followup!=='-')?lead.followup:'',
        time24:lead.followupTime||'',
        time:lead.followupTime && typeof formatTime12==='function'?formatTime12(lead.followupTime):'',
        priority:lead.priority||'Warm',
        status:document.getElementById('luFuStatus')?.value||'Upcoming',
        nextAction:lead.followupNextAction||'',
        notes:lead.followupNotes||''
      };
      dashboardData.followups.unshift(fu);
    }
    fu.customer=lead.company||lead.customer||fu.customer;
    fu.type='Call';
    fu.customerResponse=outcome;
    fu.priority=lead.priority||fu.priority||'Warm';
    try{saveFollowups();}catch(e){}
    try{
      addLeadLog(
        lead.id,
        outcome==='Call Not Connected'?'Call not connected':'Call connected',
        outcome==='Call Not Connected'
          ? 'Customer call was not connected. Lead moved to Not Connected calling category.'
          : 'Customer call connected successfully.',
        'Call'
      );
    }catch(e){}
    try{save();}catch(e){}
  }

  function refreshLeadCounts(){
    try{renderLeadDashboard();}catch(e){}
    try{if(document.getElementById('leadResultsPanel')?.classList.contains('open'))refreshLeadResults();}catch(e){}
  }

  function addProgress(){
    if(!state.active)return;
    const current=state.index+1,total=state.ids.length;
    const sub=document.getElementById('leadUpdateSub');
    if(sub){
      const cleanText=String(sub.textContent||'').replace(/\s·\sCalling\s\d+\sof\s\d+.*$/,'');
      sub.textContent=cleanText+' · Calling '+current+' of '+total+' · '+label(state.category);
    }
    const footer=document.querySelector('#leadUpdateModal .lu4-footer-note');
    if(footer)footer.textContent='Calling Queue '+current+'/'+total+' · Save this lead to automatically open the next lead';
  }

  function stopQueue(showMessage){
    const total=state.ids.length,category=state.category;
    state.active=false;state.category='';state.ids=[];state.index=0;state.opening=false;
    if(showMessage){
      try{navigate('leads');}catch(e){}
      refreshLeadCounts();
      setTimeout(()=>alert(label(category)+' calling queue completed. '+total+' lead'+(total===1?'':'s')+' processed.'),60);
    }
  }

  function openAt(index){
    if(!state.active||state.opening)return;
    let i=index;
    while(i<state.ids.length && !findLead(state.ids[i]))i++;
    if(i>=state.ids.length){stopQueue(true);return;}
    state.index=i;
    const lead=findLead(state.ids[i]);
    if(!lead){openAt(i+1);return;}

    state.opening=true;
    lead.contactStatus='In Progress';
    try{addLeadLog(lead.id,'Calling queue opened','Calling '+(i+1)+' of '+state.ids.length+' from '+label(state.category)+' queue.','Call Queue');}catch(e){}
    try{save();}catch(e){}
    try{navigate('leads');}catch(e){}

    try{openLeadUpdateByCustomer(lead.company||lead.customer||'','calling',lead.id);}
    catch(e){state.opening=false;throw e;}

    setTimeout(()=>{
      try{
        const type=document.getElementById('luFuType');
        if(type)type.value='Call';
        ensureCallStatusField();
        const status=document.getElementById('luCallStatus');
        if(status)status.value=latestCallOutcome(lead)||'';
        updateCallStatusVisibility();
        addProgress();
      }finally{state.opening=false;}
    },100);
  }

  window.startLeadCalling=function(category){
    const items=(typeof getLeadCategoryItems==='function'?getLeadCategoryItems(category):[]).slice();
    if(!items.length){alert('No leads available in this calling queue.');return;}
    state.active=true;state.category=category;state.ids=items.map(l=>l.id);state.index=0;state.opening=false;
    openAt(0);
  };

  try{
    const oldGet=getLeadCategoryItems;
    getLeadCategoryItems=function(category){
      if(category==='uncontacted'){
        return (leads||[]).filter(l=>{
          const outcome=latestCallOutcome(l);
          const cs=clean(l.contactStatus);
          if(outcome||['contacted','in progress','not connected'].includes(cs))return false;
          return l.status==='New Lead'||cs==='uncontacted'||!cs;
        });
      }
      if(category==='notconnected'){
        return (leads||[]).filter(l=>latestCallOutcome(l)==='Call Not Connected'||clean(l.contactStatus)==='not connected'||l.status==='On Hold');
      }
      return oldGet.apply(this,arguments);
    };
  }catch(e){}

  try{
    const oldCustomer=window.openLeadUpdateByCustomer;
    if(typeof oldCustomer==='function'){
      window.openLeadUpdateByCustomer=function(){
        const r=oldCustomer.apply(this,arguments);
        setTimeout(()=>{ensureCallStatusField();loadCallStatus();},120);
        return r;
      };
    }
  }catch(e){}
  try{
    const oldId=window.openLeadUpdateById;
    if(typeof oldId==='function'){
      window.openLeadUpdateById=function(){
        const r=oldId.apply(this,arguments);
        setTimeout(()=>{ensureCallStatusField();loadCallStatus();},140);
        return r;
      };
    }
  }catch(e){}

  const form=document.getElementById('leadUpdateForm');
  form?.addEventListener('submit',function(e){
    const type=document.getElementById('luFuType')?.value||'';
    const outcome=document.getElementById('luCallStatus')?.value||'';
    if(type==='Call'&&!outcome){
      e.preventDefault();
      e.stopImmediatePropagation();
      alert('Please select Call Connected or Call Not Connected.');
      document.getElementById('luCallStatus')?.focus();
      return;
    }

    const savingId=document.getElementById('luLeadId')?.value||'';
    const original=document.getElementById('luOriginalCustomer')?.value||'';
    const queuePos=state.active?queuePositionFor(savingId):-1;
    if(queuePos>=0)state.index=queuePos;

    setTimeout(()=>{
      const savedLead=findLead(savingId) || (typeof findLeadForCustomerName==='function'?findLeadForCustomerName(original):null);
      if(savedLead && type==='Call' && outcome)persistOutcome(savedLead,outcome);
      refreshLeadCounts();

      if(!state.active||queuePos<0)return;
      const modal=document.getElementById('leadUpdateModal');
      const stillSameOpen=modal?.classList.contains('open') && String(document.getElementById('luLeadId')?.value||'')===String(savingId);
      if(stillSameOpen)return;
      openAt(queuePos+1);
    },360);
  },true);

  document.addEventListener('click',e=>{
    if(!state.active)return;
    const modal=document.getElementById('leadUpdateModal');
    if(!modal?.classList.contains('open'))return;
    const target=e.target;
    if(target===modal){stopQueue(false);return;}
    const btn=target?.closest?.('button');
    if(!btn)return;
    const onclick=String(btn.getAttribute('onclick')||'');
    if(btn.classList.contains('lu4-close')||onclick.includes('closeLeadUpdate'))stopQueue(false);
  },true);

  window.getLeadCallingQueueState=function(){
    return {active:state.active,category:state.category,index:state.index,total:state.ids.length};
  };

  setTimeout(()=>{ensureCallStatusField();updateCallStatusVisibility();},200);
})();