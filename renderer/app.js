let S=null,editing=null,lastPayment=null,expenseReceiptPath='',editingInventoryItem=null;const $=id=>document.getElementById(id),money=n=>(S?.settings.currency||'₹')+Number(n||0).toLocaleString('en-IN'),ym=()=>new Date().toISOString().slice(0,7),today=()=>new Date().toISOString().slice(0,10);
function toast(t){$('toast').textContent=t;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',2200)}
async function refresh(){S=await schoolAPI.getState();render()}
function pending(m=ym()){return S.students.filter(s=>s.active!==false&&!S.payments.some(p=>p.studentId===s.id&&p.feeType==='Monthly Fee'&&p.feeMonth===m))}
function render(){ $('schoolSide').textContent=S.settings.schoolName;$('subtitle').textContent=S.settings.academicYear;$('cloudBadge').textContent=S.cloud.signedIn?'☁ '+(S.cloud.role||'user')+' • Cloud connected':S.cloud.configured?'☁ Cloud configured':'☁ Cloud not connected';
 renderDashboard();renderStudents();renderPayments();renderPending();renderExpenses();renderInventory();fillStudents();fillInventorySelectors();fillSettings();applyRole()}

function renderDashboard(){
  if(!$('dashboardMonth'))return;
  const m=$('dashboardMonth').value||ym();
  const active=(S.students||[]).filter(s=>s.active!==false);
  const monthPayments=(S.payments||[]).filter(p=>(p.paymentDate||'').startsWith(m));
  const monthExpenses=(S.expenses||[]).filter(x=>(x.expense_date||'').startsWith(m));
  const monthlyFeePayments=monthPayments.filter(p=>p.feeType==='Monthly Fee'&&p.feeMonth===m);
  const paidIds=new Set(monthlyFeePayments.map(p=>p.studentId));
  const pendingStudents=active.filter(s=>!paidIds.has(s.id));
  const collected=monthPayments.reduce((a,p)=>a+Number(p.amount||0),0);
  const monthlyCollected=monthlyFeePayments.reduce((a,p)=>a+Number(p.amount||0),0);
  const expected=active.reduce((a,s)=>a+Number(s.monthlyFee||0),0);
  const pendingAmount=pendingStudents.reduce((a,s)=>a+Number(s.monthlyFee||0),0);
  const expenses=monthExpenses.reduce((a,x)=>a+Number(x.amount||0),0);
  const allIncome=(S.payments||[]).reduce((a,p)=>a+Number(p.amount||0),0);
  const allExpenses=(S.expenses||[]).reduce((a,x)=>a+Number(x.amount||0),0);
  const rate=expected>0?Math.min(100,Math.round(monthlyCollected/expected*100)):0;

  $('monthTotal').textContent=money(collected);
  $('expectedMonthTotal').textContent=money(expected);
  $('pendingFeeAmount').textContent=money(pendingAmount);
  $('expenseMonthTotal').textContent=money(expenses);
  $('netMonthTotal').textContent=money(collected-expenses);
  $('accountBalance').textContent=money(allIncome-allExpenses);
  $('collectionRate').textContent=rate+'%';
  $('studentCount').textContent=active.length;
  $('pendingCount').textContent=pendingStudents.length;
  $('paidStudentCount').textContent=paidIds.size;
  $('pendingCountText').textContent=pendingStudents.length+' students pending';
  $('paymentCountText').textContent=monthPayments.length+' payments this month';
  $('collectionRingText').textContent=rate+'%';
  $('collectionRing').style.setProperty('--p',rate);

  const classes=['PG','Nursery','Jr KG','Sr KG'];
  $('classDashboardTable').innerHTML=
    '<div class="class-dash-row head"><span>Class</span><span>Students</span><span>Progress</span><span>Collected</span><span>Pending</span><span>Rate</span></div>'+
    classes.map(cls=>{
      const ss=active.filter(s=>s.className===cls);
      const ids=new Set(ss.map(s=>s.id));
      const cp=monthlyFeePayments.filter(p=>ids.has(p.studentId));
      const cPaid=new Set(cp.map(p=>p.studentId));
      const cExpected=ss.reduce((a,s)=>a+Number(s.monthlyFee||0),0);
      const cCollected=cp.reduce((a,p)=>a+Number(p.amount||0),0);
      const cPending=ss.filter(s=>!cPaid.has(s.id)).reduce((a,s)=>a+Number(s.monthlyFee||0),0);
      const cr=cExpected>0?Math.min(100,Math.round(cCollected/cExpected*100)):0;
      return '<div class="class-dash-row"><b>'+cls+'</b><span>'+ss.length+'</span><div class="progress"><i style="width:'+cr+'%"></i></div><strong>'+money(cCollected)+'</strong><span>'+money(cPending)+'</span><span class="badge '+(cr>=90?'good':cr>=70?'info':'warn')+'">'+cr+'%</span></div>';
    }).join('');

  const cat={};
  monthExpenses.forEach(x=>cat[x.category]=(cat[x.category]||0)+Number(x.amount||0));
  const top=Object.entries(cat).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxCat=Math.max(1,...top.map(x=>x[1]));
  $('expenseBreakdown').innerHTML=top.length?top.map(([k,v])=>'<div class="breakdown-row"><span>'+esc(k)+'</span><b>'+money(v)+'</b><div class="mini-bar"><i style="width:'+Math.round(v/maxCat*100)+'%"></i></div></div>').join(''):'<p class="muted">No expenses recorded for this month.</p>';

  const items=S.inventoryItems||[],si=S.studentInventory||[];
  const alerts=[];
  items.forEach(it=>{
    const waiting=si.filter(x=>x.item_id===it.id&&x.status==='Waiting').reduce((a,x)=>a+Number(x.quantity||1),0);
    const stock=Number(it.stock_on_hand||0),pending=Number(it.ordered_pending||0),reorder=Number(it.reorder_level||0);
    if(waiting>stock)alerts.push({label:it.name+(it.variant?' — '+it.variant:''),detail:(waiting-stock)+' units short for waiting students',kind:'danger'});
    else if(stock<=reorder)alerts.push({label:it.name+(it.variant?' — '+it.variant:''),detail:'Low stock: '+stock+' on hand',kind:'warn'});
    else if(pending>0)alerts.push({label:it.name+(it.variant?' — '+it.variant:''),detail:pending+' units pending delivery',kind:'info'});
  });
  $('inventoryAlerts').innerHTML=alerts.length?alerts.slice(0,6).map(a=>'<div class="alert-row"><span>'+esc(a.label)+'</span><span class="badge '+a.kind+'">'+esc(a.detail)+'</span></div>').join(''):'<div class="alert-row"><span>Inventory status</span><span class="badge good">No urgent alerts</span></div>';

  const kitIncluded=active.filter(s=>s.kit_included).length;
  const waitingStudents=new Set(si.filter(x=>x.status==='Waiting').map(x=>x.student_id)).size;
  const pendingOrders=(S.inventoryOrders||[]).filter(x=>x.status!=='Received'&&x.status!=='Cancelled').length;
  $('quickSummary').innerHTML=
    '<div class="quick-row"><span>Students with kit package</span><b>'+kitIncluded+'</b></div>'+
    '<div class="quick-row"><span>Students waiting for inventory</span><b>'+waitingStudents+'</b></div>'+
    '<div class="quick-row"><span>Pending inventory orders</span><b>'+pendingOrders+'</b></div>'+
    '<div class="quick-row"><span>Fee payments recorded</span><b>'+monthPayments.length+'</b></div>';
}

function renderStudents(){let q=($('studentSearch')?.value||'').toLowerCase(),a=S.students.filter(s=>[s.name,s.admissionNo,s.parentName,s.phone,s.className].join(' ').toLowerCase().includes(q)),role=S?.cloud?.role||'',canEdit=role==='admin'||role==='receptionist',canDelete=role==='admin';$('studentRows').innerHTML=a.map(s=>'<tr'+(s.active===false?' style="opacity:.5"':'')+'><td>'+esc(s.admissionNo)+'</td><td><b>'+esc(s.name)+'</b></td><td>'+s.className+'</td><td>'+esc(s.parentName)+'</td><td>'+esc(s.phone)+'</td><td>'+money(s.monthlyFee)+'</td><td>'+(canEdit?'<button class="link" onclick="editStudent(\''+s.id+'\')">Edit</button>':'')+(canDelete?'<button class="link danger" onclick="delStudent(\''+s.id+'\')">Delete</button>':'')+'</td></tr>').join('')||'<tr><td colspan="7">No students yet.</td></tr>'}
function renderPayments(){let c=$('ledgerClass')?.value||'',m=$('ledgerMonth')?.value||'',sm=Object.fromEntries(S.students.map(s=>[s.id,s]));let a=[...S.payments].filter(p=>(!c||p.className===c)&&(!m||p.paymentDate?.startsWith(m))).sort((a,b)=>b.paymentDate.localeCompare(a.paymentDate));$('paymentRows').innerHTML=a.map(p=>'<tr><td>'+p.paymentDate+'</td><td>'+p.receiptNo+'</td><td>'+esc(sm[p.studentId]?.name)+'</td><td>'+p.className+'</td><td>'+p.feeType+'</td><td>'+(p.feeMonth||'-')+'</td><td>'+money(p.amount)+'</td><td>'+p.method+'</td><td><button class="link" onclick="openReceipt(\''+p.id+'\')">Receipt</button><button class="link" onclick="sendWA(\''+p.id+'\')">WhatsApp</button></td></tr>').join('')||'<tr><td colspan="9">No payments.</td></tr>'}
function renderPending(){let m=$('pendingMonth')?.value||ym(),canAct=(S?.cloud?.role==='admin'||S?.cloud?.role==='receptionist');$('pendingRows').innerHTML=pending(m).map(s=>'<tr><td>'+esc(s.admissionNo)+'</td><td><b>'+esc(s.name)+'</b></td><td>'+s.className+'</td><td>'+esc(s.parentName)+'</td><td>'+esc(s.phone)+'</td><td>'+money(s.monthlyFee)+'</td><td>'+(canAct?'<button class="link" onclick="remind(\''+s.id+'\')">WhatsApp Reminder</button>':'')+'</td></tr>').join('')||'<tr><td colspan="7">Everyone has paid for this month.</td></tr>'}
function fillStudents(){let cur=$('payStudent').value;$('payStudent').innerHTML='<option value="">Select student</option>'+S.students.filter(s=>s.active!==false).sort((a,b)=>a.name.localeCompare(b.name)).map(s=>'<option value="'+s.id+'">'+esc(s.name)+' — '+s.className+' ('+esc(s.admissionNo)+')</option>').join('');$('payStudent').value=cur}
function fillSettings(){for(let [id,k] of [['schoolName','schoolName'],['schoolAddress','schoolAddress'],['schoolPhone','schoolPhone'],['currency','currency'],['academicYear','academicYear'],['receiptPrefix','receiptPrefix'],['receiptFooter','receiptFooter'],['whatsappTemplate','whatsappTemplate'],['cloudEmail','cloudEmail']])$(id).value=S.settings[k]||'';$('cloudStatus').textContent=S.cloud.signedIn?'Signed in as '+S.cloud.email+(S.cloud.lastSyncAt?' • Last sync '+new Date(S.cloud.lastSyncAt).toLocaleString():''):S.cloud.configured?'Configured; please sign in.':'Cloud not configured.'}
function esc(x=''){return String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function page(id){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===id));document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===id));$('title').textContent={dashboard:'Dashboard',students:'Students',payment:'Record Payment',ledger:'Payment Ledger',pending:'Pending Fees',expenses:'Expenses',inventory:'Inventory',settings:'Settings & Cloud'}[id]}
window.editStudent=id=>{let s=S.students.find(x=>x.id===id);editing=id;$('modalTitle').textContent='Edit Student';$('sid').value=id;$('sAdmission').value=s.admissionNo||'';$('sName').value=s.name;$('sClass').value=s.className;$('sFee').value=s.monthlyFee||0;$('sParent').value=s.parentName||'';$('sPhone').value=s.phone||'';$('sKitIncluded').value=String(!!s.kit_included);$('sActive').checked=s.active!==false;$('modal').classList.remove('hidden')}
window.delStudent=async id=>{if(!confirm('Delete this student?'))return;try{S=await schoolAPI.deleteStudent(id);render();toast('Student deleted')}catch(e){alert(e.message)}}
window.openReceipt=id=>{let p=S.payments.find(x=>x.id===id);if(p?.receiptPath)schoolAPI.openReceipt(p.receiptPath);else alert('Receipt PDF is not stored on this computer.')}
window.sendWA=id=>{let p=S.payments.find(x=>x.id===id);schoolAPI.openWhatsApp(p)}
window.remind=id=>{let s=S.students.find(x=>x.id===id),m=$('pendingMonth').value||ym();let fake={studentId:id,amount:s.monthlyFee,feeType:'Monthly Fee reminder',feeMonth:m,receiptNo:'Pending'};schoolAPI.openWhatsApp(fake)}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>page(b.dataset.page));
$('payDate').value=today();$('feeMonth').value=ym();$('pendingMonth').value=ym();if($('dashboardMonth'))$('dashboardMonth').value=ym();if($('expenseDate'))$('expenseDate').value=today();if($('orderDate'))$('orderDate').value=today();
$('unlock').onclick=async()=>{let p=$('pin').value;if(!S)S=await schoolAPI.getState();try{if(!S.auth.pinConfigured){await schoolAPI.setupPin(p);S=await schoolAPI.getState()}else if(!await schoolAPI.verifyPin(p)){alert('Incorrect PIN');return}$('lock').classList.add('hidden');$('app').classList.remove('hidden');render()}catch(e){alert(e.message)}};
(async()=>{S=await schoolAPI.getState();$('lockText').textContent=S.auth.pinConfigured?'Enter staff PIN':'Create a staff PIN';$('lockHelp').textContent=S.auth.pinConfigured?'':'First launch: choose a 4–8 digit PIN.'})();
$('studentSearch').oninput=renderStudents;$('ledgerClass').onchange=renderPayments;$('ledgerMonth').onchange=renderPayments;$('pendingMonth').onchange=renderPending;if($('dashboardMonth'))$('dashboardMonth').onchange=renderDashboard;
$('addStudent').onclick=()=>{editing=null;$('modalTitle').textContent='Add Student';['sid','sAdmission','sName','sParent','sPhone'].forEach(x=>$(x).value='');$('sFee').value='';$('sClass').value='PG';$('sKitIncluded').value='false';$('sActive').checked=true;$('modal').classList.remove('hidden')};$('cancelStudent').onclick=()=>$('modal').classList.add('hidden');
$('saveStudent').onclick=async()=>{if(!$('sName').value.trim())return alert('Student name is required.');try{S=await schoolAPI.saveStudent({id:editing||undefined,admissionNo:$('sAdmission').value.trim(),name:$('sName').value.trim(),className:$('sClass').value,parentName:$('sParent').value.trim(),phone:$('sPhone').value.trim(),monthlyFee:Number($('sFee').value||0),kit_included:$('sKitIncluded').value==='true',active:$('sActive').checked});$('modal').classList.add('hidden');render();toast('Student saved')}catch(e){alert(e.message)}};
$('payStudent').onchange=()=>{let s=S.students.find(x=>x.id===$('payStudent').value);if(s)$('amount').value=s.monthlyFee||''};
$('feeType').onchange=()=>{$('feeMonth').disabled=$('feeType').value!=='Monthly Fee'};
$('record').onclick=async()=>{try{let r=await schoolAPI.recordPayment({studentId:$('payStudent').value,feeType:$('feeType').value,feeMonth:$('feeType').value==='Monthly Fee'?$('feeMonth').value:'',amount:Number($('amount').value),paymentDate:$('payDate').value,method:$('method').value,referenceNo:$('reference').value.trim()});S=r.state;lastPayment=r.payment;$('receiptResult').innerHTML='<h3>Payment Recorded ✓</h3><p><b>'+r.payment.receiptNo+'</b><br>'+money(r.payment.amount)+'</p><button id="viewNow">Open PDF Receipt</button> <button id="waNow" class="primary">Send WhatsApp</button>';$('viewNow').onclick=()=>schoolAPI.openReceipt(r.payment.receiptPath);$('waNow').onclick=()=>schoolAPI.openWhatsApp(r.payment);render();toast('Payment recorded')}catch(e){alert(e.message)}};
$('saveSchool').onclick=async()=>{S=await schoolAPI.saveSettings({schoolName:$('schoolName').value,schoolAddress:$('schoolAddress').value,schoolPhone:$('schoolPhone').value,currency:$('currency').value,academicYear:$('academicYear').value,receiptPrefix:$('receiptPrefix').value,receiptFooter:$('receiptFooter').value,whatsappTemplate:$('whatsappTemplate').value});render();toast('Settings saved')};

$('cloudLogin').onclick=async()=>{try{S=await schoolAPI.cloudSignIn($('cloudEmail').value.trim(),$('cloudPassword').value);render();toast('Cloud signed in')}catch(e){alert(e.message)}};$('cloudLogout').onclick=async()=>{S=await schoolAPI.cloudSignOut();render()};
$('sync').onclick=async()=>{try{S=await schoolAPI.cloudSync();render();toast('Cloud sync complete')}catch(e){alert(e.message)}};$('export').onclick=async()=>{let f=await schoolAPI.exportExcel();if(f)toast('Excel exported')};$('backup').onclick=async()=>{await schoolAPI.createBackup();toast('Backup created')};
$('changePin').onclick=async()=>{try{await schoolAPI.changePin($('oldPin').value,$('newPin').value);$('oldPin').value=$('newPin').value='';toast('PIN changed')}catch(e){alert(e.message)}};$('openInvoices').onclick=()=>schoolAPI.openInvoices();$('openBackups').onclick=()=>schoolAPI.openBackupFolder();

function renderExpenses(){
  if(!$('expenseRows'))return;
  const rows=[...(S.expenses||[])].sort((a,b)=>(b.expense_date||'').localeCompare(a.expense_date||''));
  $('expenseRows').innerHTML=rows.map(x=>'<tr><td>'+esc(x.expense_date)+'</td><td>'+esc(x.category)+'</td><td>'+esc(x.description)+'</td><td>'+esc(x.vendor||'')+'</td><td>'+money(x.amount)+'</td><td>'+esc(x.payment_method||'')+'</td><td>'+(x.receipt_path?'<button class="link" onclick="openExpenseReceipt(\''+x.id+'\')">View</button>':'-')+'</td></tr>').join('')||'<tr><td colspan="7">No expenses recorded.</td></tr>';
  const month=(S.expenses||[]).filter(x=>(x.expense_date||'').startsWith(ym())).reduce((a,x)=>a+Number(x.amount||0),0);
  const all=(S.expenses||[]).reduce((a,x)=>a+Number(x.amount||0),0);
  if($('expenseSummaryMonth'))$('expenseSummaryMonth').textContent=money(month);
  if($('expenseSummaryAll'))$('expenseSummaryAll').textContent=money(all);
}
function inventoryStats(itemId){
  const assigned=(S.studentInventory||[]).filter(x=>x.item_id===itemId);
  return {waiting:assigned.filter(x=>x.status==='Waiting').reduce((a,x)=>a+Number(x.quantity||1),0),issued:assigned.filter(x=>x.status==='Issued').reduce((a,x)=>a+Number(x.quantity||1),0)};
}
function renderInventory(){
  if(!$('inventoryRows'))return;
  const items=S.inventoryItems||[],orders=S.inventoryOrders||[],si=S.studentInventory||[],students=Object.fromEntries((S.students||[]).map(x=>[x.id,x]));
  $('inventoryStockTotal').textContent=items.reduce((a,x)=>a+Number(x.stock_on_hand||0),0);
  $('inventoryOrderedTotal').textContent=items.reduce((a,x)=>a+Number(x.ordered_pending||0),0);
  $('inventoryWaitingStudents').textContent=new Set(si.filter(x=>x.status==='Waiting').map(x=>x.student_id)).size;
  $('inventoryIssuedTotal').textContent=si.filter(x=>x.status==='Issued').reduce((a,x)=>a+Number(x.quantity||1),0);
  $('inventoryRows').innerHTML=items.map(x=>{let st=inventoryStats(x.id);return '<tr><td>'+esc(x.item_type)+'</td><td><b>'+esc(x.name)+'</b></td><td>'+esc(x.variant||'-')+'</td><td>'+Number(x.stock_on_hand||0)+'</td><td>'+Number(x.ordered_pending||0)+'</td><td>'+st.waiting+'</td><td>'+st.issued+'</td><td><button class="link" onclick="editInventoryItem(\''+x.id+'\')">Edit</button></td></tr>'}).join('')||'<tr><td colspan="8">No inventory items yet.</td></tr>';
  const im=Object.fromEntries(items.map(x=>[x.id,x]));
  $('orderRows').innerHTML=orders.filter(x=>x.status!=='Received'&&x.status!=='Cancelled').map(x=>{let pending=Math.max(0,Number(x.quantity)-Number(x.received_quantity||0));return '<tr><td>'+esc(im[x.item_id]?.name||'')+'</td><td>'+x.quantity+'</td><td>'+Number(x.received_quantity||0)+'</td><td>'+pending+'</td><td>'+esc(x.expected_date||'-')+'</td><td>'+(pending>0?'<button class="link" onclick="receiveOrder(\''+x.id+'\','+pending+')">Receive</button>':'')+'</td></tr>'}).join('')||'<tr><td colspan="6">No pending orders.</td></tr>';
  $('studentInventoryRows').innerHTML=si.map(x=>{let st=students[x.student_id]||{},it=im[x.item_id]||{};return '<tr><td>'+esc(st.name||'')+'</td><td>'+esc(st.className||'')+'</td><td>'+esc(it.name||'')+'</td><td>'+esc(it.variant||'-')+'</td><td>'+esc(x.status)+'</td><td>'+Number(x.quantity||1)+'</td><td>'+esc(x.issued_at||'-')+'</td><td>'+esc(x.notes||'')+'</td></tr>'}).join('')||'<tr><td colspan="8">No student distribution records.</td></tr>';
}
function fillInventorySelectors(){
  if(!$('orderItem'))return;
  const opts=(S.inventoryItems||[]).map(x=>'<option value="'+x.id+'">'+esc(x.item_type)+' — '+esc(x.name)+(x.variant?' ('+esc(x.variant)+')':'')+'</option>').join('');
  const o1=$('orderItem').value,o2=$('studentInventoryItem').value,os=$('studentInventoryStudent').value;
  $('orderItem').innerHTML='<option value="">Select item</option>'+opts;
  $('studentInventoryItem').innerHTML='<option value="">Select item</option>'+opts;
  $('studentInventoryStudent').innerHTML='<option value="">Select student</option>'+(S.students||[]).filter(x=>x.active!==false).map(x=>'<option value="'+x.id+'">'+esc(x.name)+' — '+esc(x.className)+'</option>').join('');
  $('orderItem').value=o1;$('studentInventoryItem').value=o2;$('studentInventoryStudent').value=os;
}
window.openExpenseReceipt=id=>{let x=(S.expenses||[]).find(e=>e.id===id);if(x?.receipt_path)schoolAPI.openExpenseReceipt(x.receipt_path)};
window.editInventoryItem=id=>{let x=(S.inventoryItems||[]).find(i=>i.id===id);if(!x)return;editingInventoryItem=id;$('inventoryItemId').value=id;$('inventoryType').value=x.item_type;$('inventoryName').value=x.name;$('inventoryVariant').value=x.variant||'';$('inventorySku').value=x.sku||'';$('inventoryStock').value=x.stock_on_hand||0;$('inventoryReorder').value=x.reorder_level||0};
window.receiveOrder=async(id,pending)=>{let qty=prompt('How many units were received?',String(pending));if(qty===null)return;try{S=await schoolAPI.receiveInventoryOrder(id,Number(qty));render();toast('Inventory received')}catch(e){alert(e.message)}};

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


if($('pickExpenseReceipt'))$('pickExpenseReceipt').onclick=async()=>{expenseReceiptPath=await schoolAPI.chooseExpenseReceipt();$('expenseReceiptName').textContent=expenseReceiptPath?expenseReceiptPath.split(/[\\/]/).pop():'No file selected'};
if($('saveExpense'))$('saveExpense').onclick=async()=>{try{S=await schoolAPI.saveExpense({expense_date:$('expenseDate').value,category:$('expenseCategory').value,description:$('expenseDescription').value.trim(),vendor:$('expenseVendor').value.trim(),amount:Number($('expenseAmount').value),payment_method:$('expenseMethod').value,reference_no:$('expenseReference').value.trim(),localReceiptPath:expenseReceiptPath});expenseReceiptPath='';$('expenseReceiptName').textContent='No file selected';$('expenseDescription').value=$('expenseVendor').value=$('expenseAmount').value=$('expenseReference').value='';render();toast('Expense saved')}catch(e){alert(e.message)}};
if($('saveInventoryItem'))$('saveInventoryItem').onclick=async()=>{try{S=await schoolAPI.saveInventoryItem({id:editingInventoryItem||undefined,item_type:$('inventoryType').value,name:$('inventoryName').value.trim(),variant:$('inventoryVariant').value.trim(),sku:$('inventorySku').value.trim(),stock_on_hand:Number($('inventoryStock').value||0),reorder_level:Number($('inventoryReorder').value||0)});editingInventoryItem=null;$('inventoryItemId').value='';$('inventoryName').value=$('inventoryVariant').value=$('inventorySku').value='';$('inventoryStock').value=$('inventoryReorder').value=0;render();toast('Inventory item saved')}catch(e){alert(e.message)}};
if($('saveOrder'))$('saveOrder').onclick=async()=>{try{S=await schoolAPI.saveInventoryOrder({item_id:$('orderItem').value,quantity:Number($('orderQty').value),vendor:$('orderVendor').value.trim(),order_date:$('orderDate').value,expected_date:$('orderExpected').value||null,notes:$('orderNotes').value.trim(),status:'Ordered',received_quantity:0});$('orderQty').value=$('orderVendor').value=$('orderExpected').value=$('orderNotes').value='';render();toast('Pending order added')}catch(e){alert(e.message)}};
if($('saveStudentInventory'))$('saveStudentInventory').onclick=async()=>{try{let status=$('studentInventoryStatus').value;S=await schoolAPI.saveStudentInventory({student_id:$('studentInventoryStudent').value,item_id:$('studentInventoryItem').value,status,required:status!=='Not Required',quantity:Number($('studentInventoryQty').value||1),requested_at:today(),notes:$('studentInventoryNotes').value.trim()});$('studentInventoryNotes').value='';render();toast('Student inventory status saved')}catch(e){alert(e.message)}};
