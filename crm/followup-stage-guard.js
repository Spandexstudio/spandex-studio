(function(){
  function byId(id){ return document.getElementById(id); }

  function leadList(){
    try {
      if (typeof leads !== 'undefined' && Array.isArray(leads)) return leads;
    } catch(_e) {}
    return Array.isArray(window.leads) ? window.leads : [];
  }

  function findLead(){
    var id = byId('luLeadId') && byId('luLeadId').value;
    var originalCustomer = byId('luOriginalCustomer') && byId('luOriginalCustomer').value;
    var arr = leadList();
    var lead = arr.find(function(x){ return String((x && x.id) || '') === String(id || ''); });
    if (!lead && originalCustomer) {
      lead = arr.find(function(x){
        return String((x && (x.company || x.customer)) || '').trim() === String(originalCustomer).trim();
      });
    }
    return lead || null;
  }

  function findLeadById(id){
    return leadList().find(function(x){
      return String((x && x.id) || '') === String(id || '');
    }) || null;
  }

  function captureStage(){
    var form = byId('leadUpdateForm');
    var status = byId('luStatus');
    if (!form || !status) return;
    var lead = findLead();
    var original = (lead && lead.status) || status.value || '';
    form.dataset.originalPipelineStage = String(original || '');
    form.dataset.pipelineStageUserChanged = '0';
  }

  function preserveStageUnlessManuallyChanged(){
    var form = byId('leadUpdateForm');
    var status = byId('luStatus');
    if (!form || !status) return;
    var original = form.dataset.originalPipelineStage || '';
    if (form.dataset.pipelineStageUserChanged !== '1' && original) {
      status.value = original;
    }
  }

  function bind(){
    var form = byId('leadUpdateForm');
    var status = byId('luStatus');
    if (!form || !status || form.dataset.pipelineStageGuardBound === '1') return;
    form.dataset.pipelineStageGuardBound = '1';

    status.addEventListener('change', function(){
      var original = form.dataset.originalPipelineStage || '';
      form.dataset.pipelineStageUserChanged =
        String(status.value || '') !== String(original) ? '1' : '0';
    });

    form.addEventListener('submit', function(){
      preserveStageUnlessManuallyChanged();
    }, true);

    form.addEventListener('click', function(e){
      var btn = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!btn) return;
      var text = String(btn.textContent || '').trim().toLowerCase();
      var isSave = btn.type === 'submit' || text.indexOf('update lead') >= 0 || text.indexOf('save draft') >= 0;
      if (isSave) preserveStageUnlessManuallyChanged();
    }, true);
  }

  function afterOpen(){
    setTimeout(function(){ bind(); captureStage(); }, 0);
  }

  function wrapCustomerOpen(){
    var old = window.openLeadUpdateByCustomer;
    if (typeof old !== 'function' || old.__tfFollowupGuardWrapped) return;
    function wrapped(){
      var r = old.apply(this, arguments);
      afterOpen();
      return r;
    }
    wrapped.__tfFollowupGuardWrapped = true;
    window.openLeadUpdateByCustomer = wrapped;
  }

  function currentReturnContext(){
    var active = document.querySelector('.view.active, .page.active, [data-view].active');
    var id = String((active && (active.id || active.getAttribute('data-view'))) || '').toLowerCase();
    if (id.indexOf('pipeline') >= 0) return 'pipeline';
    if (id.indexOf('follow') >= 0) return 'followups';
    return 'leads';
  }

  function wrapIdOpen(){
    var old = window.openLeadUpdateById;
    if (typeof old !== 'function' || old.__tfFollowupGuardWrapped) return;
    function wrapped(id){
      var context = currentReturnContext();
      var lead = findLeadById(id);

      // The original openLeadUpdateById hard-codes the return context to Pipeline.
      // Bypass that behavior unless the user actually opened the lead from Pipeline.
      if (context !== 'pipeline' && lead && typeof window.openLeadUpdateByCustomer === 'function') {
        var r = window.openLeadUpdateByCustomer(lead.company || lead.customer, context, id);
        afterOpen();
        return r;
      }

      var result = old.apply(this, arguments);
      afterOpen();
      return result;
    }
    wrapped.__tfFollowupGuardWrapped = true;
    window.openLeadUpdateById = wrapped;
  }

  function init(){
    bind();
    wrapCustomerOpen();
    wrapIdOpen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
