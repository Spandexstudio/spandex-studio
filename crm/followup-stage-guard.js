(function(){
  function byId(id){ return document.getElementById(id); }

  function findLead(){
    var id = byId('luLeadId') && byId('luLeadId').value;
    var originalCustomer = byId('luOriginalCustomer') && byId('luOriginalCustomer').value;
    var arr = Array.isArray(window.leads) ? window.leads : [];
    var lead = arr.find(function(x){ return String((x && x.id) || '') === String(id || ''); });
    if (!lead && originalCustomer) {
      lead = arr.find(function(x){ return String((x && x.customer) || '').trim() === String(originalCustomer).trim(); });
    }
    return lead || null;
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

  function wrapOpen(name){
    var old = window[name];
    if (typeof old !== 'function' || old.__tfPipelineGuardWrapped) return;
    function wrapped(){
      var r = old.apply(this, arguments);
      setTimeout(function(){ bind(); captureStage(); }, 0);
      return r;
    }
    wrapped.__tfPipelineGuardWrapped = true;
    window[name] = wrapped;
  }

  function init(){
    bind();
    wrapOpen('openLeadUpdateByCustomer');
    wrapOpen('openLeadUpdateById');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
