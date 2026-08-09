(function(){
  function getVal(id){return document.getElementById(id)?.value||'';}

  function ensureSidebarCards(){
    const list=document.querySelector('#leadUpdateModal .lu4-mini-list');
    if(!list)return;

    if(!document.getElementById('luSummaryMobileCard')){
      const assigned=document.getElementById('luSummarySales')?.closest('.lu4-mini');
      const mobile=document.createElement('div');
      mobile.className='lu4-mini';
      mobile.id='luSummaryMobileCard';
      mobile.setAttribute('role','button');
      mobile.setAttribute('tabindex','0');
      mobile.title='Click to call client';
      mobile.style.cursor='pointer';
      mobile.innerHTML='<span>Mobile Number</span><b id="luSummaryMobile">Not added</b>';
      mobile.onclick=function(){
        const n=(getVal('luMobile')||'').replace(/\D/g,'');
        if(!n)return alert('Mobile number is not available.');
        if(typeof window.luQuickCall==='function')return window.luQuickCall();
        window.location.href='tel:'+n;
      };
      mobile.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();mobile.click();}};
      if(assigned)assigned.insertAdjacentElement('afterend',mobile);else list.prepend(mobile);
    }

    const last=document.getElementById('luSummaryLast');
    const card=last?.closest('.lu4-mini');
    if(card){
      const label=card.querySelector('span');
      if(label)label.textContent='Recent Activity';
      card.setAttribute('role','button');
      card.setAttribute('tabindex','0');
      card.title='Click to view activity history';
      card.style.cursor='pointer';
      card.onclick=function(){if(typeof window.switchLeadUpdateTab==='function')window.switchLeadUpdateTab('activity');};
      card.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();card.click();}};
      if(!document.getElementById('luSummaryLastMeta')){
        const meta=document.createElement('small');
        meta.id='luSummaryLastMeta';
        meta.style.cssText='display:block;margin-top:4px;font-size:7.5px;line-height:1.25;color:#8d97a8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        card.appendChild(meta);
      }
    }
  }

  function refreshSidebarExtra(){
    ensureSidebarCards();

    const mobile=getVal('luMobile').trim();
    const mobileEl=document.getElementById('luSummaryMobile');
    if(mobileEl){
      mobileEl.textContent=mobile||'Not added';
      mobileEl.style.color=mobile?'#3157d5':'#2a3547';
      mobileEl.style.textDecoration=mobile?'underline':'none';
      mobileEl.style.textUnderlineOffset=mobile?'2px':'';
    }

    const firstLog=document.querySelector('#leadUpdateLog .log-item');
    const title=firstLog?.querySelector('.log-title')?.textContent?.trim()||'No activity';
    const meta=firstLog?.querySelector('.log-meta')?.textContent?.trim()||'';
    const last=document.getElementById('luSummaryLast');
    const lastMeta=document.getElementById('luSummaryLastMeta');
    if(last)last.textContent=title;
    if(lastMeta)lastMeta.textContent=meta;
  }

  document.addEventListener('input',function(e){
    if(e.target?.id==='luMobile')refreshSidebarExtra();
  });
  document.addEventListener('change',function(e){
    if(e.target?.id==='luMobile')refreshSidebarExtra();
  });

  try{
    const oldCustomer=window.openLeadUpdateByCustomer;
    if(typeof oldCustomer==='function'){
      window.openLeadUpdateByCustomer=function(){
        const r=oldCustomer.apply(this,arguments);
        setTimeout(refreshSidebarExtra,90);
        return r;
      };
    }
  }catch(e){}

  try{
    const oldId=window.openLeadUpdateById;
    if(typeof oldId==='function'){
      window.openLeadUpdateById=function(){
        const r=oldId.apply(this,arguments);
        setTimeout(refreshSidebarExtra,110);
        return r;
      };
    }
  }catch(e){}

  const observer=new MutationObserver(function(){
    if(document.querySelector('#leadUpdateModal.open .lu4-mini-list'))setTimeout(refreshSidebarExtra,20);
  });
  const modal=document.getElementById('leadUpdateModal');
  if(modal)observer.observe(modal,{attributes:true,attributeFilter:['class'],subtree:true,childList:true});

  setTimeout(refreshSidebarExtra,80);
})();
