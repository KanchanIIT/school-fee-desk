let S=null,editing=null,lastPayment=null;const $=id=>document.getElementById(id),money=n=>(S?.settings.currency||'₹')+Number(n||0).toLocaleString('en-IN'),ym=()=>new Date().toISOString().slice(0,7),today=()=>new Date().toISOString().slice(0,10);
function toast(t){$('toast').textContent=t;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',2200)}
async function refresh(){S=await schoolAPI.getState();render()}
function pending(m=ym()){return S.students.filter(s=>s.active!==false&&!S.payments.some(p=>p.studentId===s.id&&p.feeType==='Monthly Fee'&&p.feeMonth===m))}
function render(){ $('schoolSide').textContent=S.settings.schoolName;$('subtitle').textContent=S.settings.academicYear;$('cloudBadge').textContent=S.cloud.signedIn?'☁ '+(S.cloud.role||'user')+' • Cloud connected':S.cloud.configured?'☁ Cloud configured':'☁ Cloud not connected';
 let m=ym(),ps=S.payments.filter(p=>p.paymentDate?.startsWith(m));$('monthTotal').textContent=money(ps.reduce((a,p)=>a+Number(p.amount),0));$('studentCount').textContent=S.students.filter(s=>s.active!==false).length;$('paymentCount').textContent=ps.length;$('pendingCount').textContent=pending(m).length;
 let max=1,vals=['PG','Nursery','Jr KG','Sr KG'].map(c=>[c,ps.filter(p=>p.className===c).reduce((a,p)=>a+Number(p.amount),0)]);max=Math.max(...vals.map(x=>x[1]),1);$('classSummary').innerHTML=vals.map(([c,v])=>'<div class="summary"><b>'+c+'</b><div class="bar"><i style="width:'+v/max*100+'%"></i></div><span>'+money(v)+'</span></div>').join('');
 renderStudents();renderPayments();renderPending();fillStudents();fillSettings();applyRole()}
function renderStudents(){let q=($('studentSearch')?.value||'').toLowerCase(),a=S.students.filter(s=>[s.name,s.admissionNo,s.parentName,s.phone,s.className].join(' ').toLowerCase().includes(q));$('studentRows').innerHTML=a.map(s=>'<tr'+(s.active===false?' style="opacity:.5"':'')+'><td>'+esc(s.admissionNo)+'</td><td><b>'+esc(s.name)+'</b></td><td>'+s.className+'</td><td>'+esc(s.parentName)+'</td><td>'+esc(s.phone)+'</td><td>'+money(s.monthlyFee)+'</td><td><button class="link" onclick="editStudent(\''+s.id+'\')">Edit</button><button class="link danger" onclick="delStudent(\''+s.id+'\')">Delete</button></td></tr>').join('')||'<tr><td colspan="7">No students yet.</td></tr>'}
function renderPayments(){let c=$('ledgerClass')?.value||'',m=$('ledgerMonth')?.value||'',sm=Object.fromEntries(S.students.map(s=>[s.id,s]));let a=[...S.payments].filter(p=>(!c||p.className===c)&&(!m||p.paymentDate?.startsWith(m))).sort((a,b)=>b.paymentDate.localeCompare(a.paymentDate));$('paymentRows').innerHTML=a.map(p=>'<tr><td>'+p.paymentDate+'</td><td>'+p.receiptNo+'</td><td>'+esc(sm[p.studentId]?.name)+'</td><td>'+p.className+'</td><td>'+p.feeType+'</td><td>'+(p.feeMonth||'-')+'</td><td>'+money(p.amount)+'</td><td>'+p.method+'</td><td><button class="link" onclick="openReceipt(\''+p.id+'\')">Receipt</button><button class="link" onclick="sendWA(\''+p.id+'\')">WhatsApp</button></td></tr>').join('')||'<tr><td colspan="9">No payments.</td></tr>'}
function renderPending(){let m=$('pendingMonth')?.value||ym();$('pendingRows').innerHTML=pending(m).map(s=>'<tr><td>'+esc(s.admissionNo)+'</td><td><b>'+esc(s.name)+'</b></td><td>'+s.className+'</td><td>'+esc(s.parentName)+'</td><td>'+esc(s.phone)+'</td><td>'+money(s.monthlyFee)+'</td><td><button class="link" onclick="remind(\''+s.id+'\')">WhatsApp Reminder</button></td></tr>').join('')||'<tr><td colspan="7">Everyone has paid for this month.</td></tr>'}
function fillStudents(){let cur=$('payStudent').value;$('payStudent').innerHTML='<option value="">Select student</option>'+S.students.filter(s=>s.active!==false).sort((a,b)=>a.name.localeCompare(b.name)).map(s=>'<option value="'+s.id+'">'+esc(s.name)+' — '+s.className+' ('+esc(s.admissionNo)+')</option>').join('');$('payStudent').value=cur}
function fillSettings(){for(let [id,k] of [['schoolName','schoolName'],['schoolAddress','schoolAddress'],['schoolPhone','schoolPhone'],['currency','currency'],['academicYear','academicYear'],['receiptPrefix','receiptPrefix'],['receiptFooter','receiptFooter'],['whatsappTemplate','whatsappTemplate'],['cloudEmail','cloudEmail']])$(id).value=S.settings[k]||'';$('cloudStatus').textContent=S.cloud.signedIn?'Signed in as '+S.cloud.email+(S.cloud.lastSyncAt?' • Last sync '+new Date(S.cloud.lastSyncAt).toLocaleString():''):S.cloud.configured?'Configured; please sign in.':'Cloud not configured.'}
function esc(x=''){return String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function page(id){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===id));document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===id));$('title').textContent={dashboard:'Dashboard',students:'Students',payment:'Record Payment',ledger:'Payment Ledger',pending:'Pending Fees',settings:'Settings & Cloud'}[id]}
window.editStudent=id=>{let s=S.students.find(x=>x.id===id);editing=id;$('modalTitle').textContent='Edit Student';$('sid').value=id;$('sAdmission').value=s.admissionNo||'';$('sName').value=s.name;$('sClass').value=s.className;$('sFee').value=s.monthlyFee||0;$('sParent').value=s.parentName||'';$('sPhone').value=s.phone||'';$('sActive').checked=s.active!==false;$('modal').classList.remove('hidden')}
window.delStudent=async id=>{if(!confirm('Delete this student?'))return;try{S=await schoolAPI.deleteStudent(id);render();toast('Student deleted')}catch(e){alert(e.message)}}
window.openReceipt=id=>{let p=S.payments.find(x=>x.id===id);if(p?.receiptPath)schoolAPI.openReceipt(p.receiptPath);else alert('Receipt PDF is not stored on this computer.')}
window.sendWA=id=>{let p=S.payments.find(x=>x.id===id);schoolAPI.openWhatsApp(p)}
window.remind=id=>{let s=S.students.find(x=>x.id===id),m=$('pendingMonth').value||ym();let fake={studentId:id,amount:s.monthlyFee,feeType:'Monthly Fee reminder',feeMonth:m,receiptNo:'Pending'};schoolAPI.openWhatsApp(fake)}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>page(b.dataset.page));
$('payDate').value=today();$('feeMonth').value=ym();$('pendingMonth').value=ym();
$('unlock').onclick=async()=>{let p=$('pin').value;if(!S)S=await schoolAPI.getState();try{if(!S.auth.pinConfigured){await schoolAPI.setupPin(p);S=await schoolAPI.getState()}else if(!await schoolAPI.verifyPin(p)){alert('Incorrect PIN');return}$('lock').classList.add('hidden');$('app').classList.remove('hidden');render()}catch(e){alert(e.message)}};
(async()=>{S=await schoolAPI.getState();$('lockText').textContent=S.auth.pinConfigured?'Enter staff PIN':'Create a staff PIN';$('lockHelp').textContent=S.auth.pinConfigured?'':'First launch: choose a 4–8 digit PIN.'})();
$('studentSearch').oninput=renderStudents;$('ledgerClass').onchange=renderPayments;$('ledgerMonth').onchange=renderPayments;$('pendingMonth').onchange=renderPending;
$('addStudent').onclick=()=>{editing=null;$('modalTitle').textContent='Add Student';['sid','sAdmission','sName','sParent','sPhone'].forEach(x=>$(x).value='');$('sFee').value='';$('sClass').value='PG';$('sActive').checked=true;$('modal').classList.remove('hidden')};$('cancelStudent').onclick=()=>$('modal').classList.add('hidden');
$('saveStudent').onclick=async()=>{if(!$('sName').value.trim())return alert('Student name is required.');try{S=await schoolAPI.saveStudent({id:editing||undefined,admissionNo:$('sAdmission').value.trim(),name:$('sName').value.trim(),className:$('sClass').value,parentName:$('sParent').value.trim(),phone:$('sPhone').value.trim(),monthlyFee:Number($('sFee').value||0),active:$('sActive').checked});$('modal').classList.add('hidden');render();toast('Student saved')}catch(e){alert(e.message)}};
$('payStudent').onchange=()=>{let s=S.students.find(x=>x.id===$('payStudent').value);if(s)$('amount').value=s.monthlyFee||''};
$('feeType').onchange=()=>{$('feeMonth').disabled=$('feeType').value!=='Monthly Fee'};
$('record').onclick=async()=>{try{let r=await schoolAPI.recordPayment({studentId:$('payStudent').value,feeType:$('feeType').value,feeMonth:$('feeType').value==='Monthly Fee'?$('feeMonth').value:'',amount:Number($('amount').value),paymentDate:$('payDate').value,method:$('method').value,referenceNo:$('reference').value.trim()});S=r.state;lastPayment=r.payment;$('receiptResult').innerHTML='<h3>Payment Recorded ✓</h3><p><b>'+r.payment.receiptNo+'</b><br>'+money(r.payment.amount)+'</p><button id="viewNow">Open PDF Receipt</button> <button id="waNow" class="primary">Send WhatsApp</button>';$('viewNow').onclick=()=>schoolAPI.openReceipt(r.payment.receiptPath);$('waNow').onclick=()=>schoolAPI.openWhatsApp(r.payment);render();toast('Payment recorded')}catch(e){alert(e.message)}};
$('saveSchool').onclick=async()=>{S=await schoolAPI.saveSettings({schoolName:$('schoolName').value,schoolAddress:$('schoolAddress').value,schoolPhone:$('schoolPhone').value,currency:$('currency').value,academicYear:$('academicYear').value,receiptPrefix:$('receiptPrefix').value,receiptFooter:$('receiptFooter').value,whatsappTemplate:$('whatsappTemplate').value});render();toast('Settings saved')};

$('cloudLogin').onclick=async()=>{try{S=await schoolAPI.cloudSignIn($('cloudEmail').value.trim(),$('cloudPassword').value);render();toast('Cloud signed in')}catch(e){alert(e.message)}};$('cloudLogout').onclick=async()=>{S=await schoolAPI.cloudSignOut();render()};
$('sync').onclick=async()=>{try{S=await schoolAPI.cloudSync();render();toast('Cloud sync complete')}catch(e){alert(e.message)}};$('export').onclick=async()=>{let f=await schoolAPI.exportExcel();if(f)toast('Excel exported')};$('backup').onclick=async()=>{await schoolAPI.createBackup();toast('Backup created')};
$('changePin').onclick=async()=>{try{await schoolAPI.changePin($('oldPin').value,$('newPin').value);$('oldPin').value=$('newPin').value='';toast('PIN changed')}catch(e){alert(e.message)}};$('openInvoices').onclick=()=>schoolAPI.openInvoices();$('openBackups').onclick=()=>schoolAPI.openBackupFolder();
function applyRole(){
  const role=S?.cloud?.role||'';
  const signed=!!S?.cloud?.signedIn;
  const canEdit=role==='admin'||role==='receptionist';
  const isAdmin=role==='admin';
  if($('addStudent')) $('addStudent').style.display=signed&&!canEdit?'none':'';
  document.querySelectorAll('[data-page="payment"]').forEach(x=>x.style.display=signed&&!canEdit?'none':'');
  if($('userManagement')) $('userManagement').style.display=isAdmin?'block':'none';
  if($('saveSchool')) $('saveSchool').style.display=signed&&!isAdmin?'none':'';
  ['schoolName','schoolAddress','schoolPhone','currency','academicYear','receiptPrefix','receiptFooter','whatsappTemplate'].forEach(id=>{if($(id))$(id).disabled=signed&&!isAdmin});
}

$('createUser').onclick=async()=>{
  try{
    const email=$('newUserEmail').value.trim();
    const password=$('newUserPassword').value;
    const role=$('newUserRole').value;
    if(!email||password.length<8)return alert('Enter a valid email and a password of at least 8 characters.');
    const r=await schoolAPI.createUser({email,password,role});
    $('userCreateStatus').textContent='Created '+r.role+' login: '+r.email;
    $('newUserEmail').value='';
    $('newUserPassword').value='';
    toast('New login created');
  }catch(e){alert(e.message)}
};
