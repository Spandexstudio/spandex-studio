(function(){
  function isSuperAdmin(){
    try{return crmCurrentProfile?.role==='Super Admin'&&crmCurrentProfile?.status==='Active';}catch(e){return false;}
  }
  function sessionOrThrow(){
    return crmSb.auth.getSession().then(({data:{session}})=>{if(!session)throw new Error('Please login again.');return session;});
  }
  function setPinField(el){
    if(!el)return;
    el.type='password';el.inputMode='numeric';el.maxLength=4;el.pattern='[0-9]{4}';el.placeholder='4-digit PIN';
    el.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'').slice(0,4);});
  }
  function refreshUserCopy(){
    const help=document.getElementById('usrPasswordHelp');if(help)help.textContent='Use exactly 4 numeric digits.';
    const modal=document.getElementById('userModal');
    const notice=modal?.querySelector('.notice');
    if(notice)notice.innerHTML='<b>Secure CRM PIN:</b> Create a 4-digit numeric PIN. The PIN is transformed before Supabase authentication and is never stored as plain text in CRM records.';
    setPinField(document.getElementById('usrPassword'));
    setPinField(document.getElementById('usrConfirmPassword'));
    const meter=document.querySelector('#userModal .password-meter');if(meter)meter.style.display='none';
  }

  function installReliableUserForm(){
    const old=document.getElementById('userForm');
    if(!old||old.dataset.reliable==='1')return;
    const form=old.cloneNode(true);
    form.dataset.reliable='1';
    old.replaceWith(form);
    refreshUserCopy();

    form.addEventListener('submit',async e=>{
      e.preventDefault();
      if(!isSuperAdmin())return alert('Only Super Admin can create or update CRM users.');

      const id=document.getElementById('usrRecordId')?.value||'';
      const resetPassword=document.getElementById('userModal')?.dataset.resetPassword==='1';
      const full_name=document.getElementById('usrName')?.value.trim()||'';
      const login_id=document.getElementById('usrLoginId')?.value.trim()||'';
      const mobile=document.getElementById('usrMobile')?.value.trim()||'';
      const email=document.getElementById('usrEmail')?.value.trim().toLowerCase()||'';
      const role=document.getElementById('usrRole')?.value||'Sales Executive';
      const status=document.getElementById('usrStatus')?.value||'Active';
      const notes=document.getElementById('usrNotes')?.value.trim()||'';
      const password=document.getElementById('usrPassword')?.value||'';
      const confirm=document.getElementById('usrConfirmPassword')?.value||'';

      if(!full_name)return alert('User / Employee Name is required.');
      if(!login_id)return alert('Login ID is required.');
      if(!email||!/^\S+@\S+\.\S+$/.test(email))return alert('Valid email is required.');
      if((!id||resetPassword) && !/^\d{4}$/.test(password))return alert('PIN must be exactly 4 numeric digits.');
      if((!id||resetPassword) && password!==confirm)return alert('PIN and Confirm PIN do not match.');

      const saveBtn=document.getElementById('userSaveBtn');
      const oldText=saveBtn?.textContent||'Save User';
      if(saveBtn){saveBtn.disabled=true;saveBtn.textContent='Saving...';}
      try{
        const session=await sessionOrThrow();
        let endpoint,body;
        if(!id){
          endpoint='admin-create-user';
          body={full_name,login_id,mobile,email,role,status,notes,password};
        }else if(resetPassword){
          endpoint='admin-manage-user';
          body={action:'reset_password',user_id:id,password};
        }else{
          endpoint='admin-manage-user';
          body={action:'update',user_id:id,full_name,login_id,mobile,email,role,status,notes};
        }
        const res=await fetch(CRM_SUPABASE_URL+'/functions/v1/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:CRM_SUPABASE_KEY,Authorization:'Bearer '+session.access_token},body:JSON.stringify(body)});
        const data=await res.json().catch(()=>({}));
        if(!res.ok)throw new Error(data.error||'User save failed.');
        closeUserModal();
        await cloudLoadAll();
        try{populateSalespersonSelects();}catch(e){}
        alert(!id?'User created successfully.':resetPassword?'PIN reset successfully.':'User updated successfully.');
      }catch(err){
        alert(err?.message||String(err));
      }finally{
        if(saveBtn){saveBtn.disabled=false;saveBtn.textContent=oldText;}
      }
    });
  }

  try{
    const oldOpen=openUserModal;
    openUserModal=function(){
      if(!isSuperAdmin())return alert('Only Super Admin can manage CRM users.');
      const r=oldOpen.apply(this,arguments);
      refreshUserCopy();
      const reset=document.getElementById('userModal')?.dataset.resetPassword==='1';
      const p=document.getElementById('usrPassword'),c=document.getElementById('usrConfirmPassword');
      if(p)p.required=!document.getElementById('usrRecordId')?.value||reset;
      if(c)c.required=!document.getElementById('usrRecordId')?.value||reset;
      return r;
    };
  }catch(e){}

  window.toggleUserStatus=async function(id){
    if(!isSuperAdmin())return alert('Only Super Admin can enable or disable users.');
    const u=(crmUsers||[]).find(x=>x.id===id);if(!u)return;
    if(crmCurrentProfile?.id===id && u.status==='Active')return alert('You cannot disable your own active Super Admin account.');
    const next=u.status==='Active'?'Inactive':'Active';
    if(!confirm(`${next==='Inactive'?'Disable':'Enable'} ${u.name||u.loginId}?`))return;
    try{
      const session=await sessionOrThrow();
      const res=await fetch(CRM_SUPABASE_URL+'/functions/v1/admin-manage-user',{method:'POST',headers:{'Content-Type':'application/json',apikey:CRM_SUPABASE_KEY,Authorization:'Bearer '+session.access_token},body:JSON.stringify({action:'update',user_id:id,status:next})});
      const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'Could not update user.');
      await cloudLoadAll();
    }catch(err){alert(err?.message||String(err));}
  };

  function markAdminOnly(){
    const newUserBtn=document.querySelector('#settings .user-management-card .card-head .btn-primary');
    if(newUserBtn)newUserBtn.classList.add('admin-only');
    try{updateAdminControls();}catch(e){}
  }

  installReliableUserForm();
  refreshUserCopy();
  markAdminOnly();
  try{
    const oldLoad=cloudLoadAll;
    cloudLoadAll=async function(){const r=await oldLoad.apply(this,arguments);installReliableUserForm();refreshUserCopy();markAdminOnly();return r;};
  }catch(e){}
})();