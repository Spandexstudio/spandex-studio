(function(){
  const form=document.getElementById('leadUpdateForm');
  if(!form)return;
  if(!document.getElementById('luOriginalCustomer')){
    const input=document.createElement('input');
    input.type='hidden';input.id='luOriginalCustomer';input.name='originalCustomer';
    form.prepend(input);
  }
  if(!document.getElementById('luLeadId')){
    const input=document.createElement('input');
    input.type='hidden';input.id='luLeadId';input.name='id';
    form.prepend(input);
  }
})();