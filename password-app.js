import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm';
const recovery = new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';
const db=createClient('https://glwsnuxtevnyompppzco.supabase.co','sb_publishable_TAd5teFCLS37wqAAtoTVbg_TWMKj-fL');const $=id=>document.getElementById(id);const el=(tag,t)=>{const x=document.createElement(tag);if(t!==undefined)x.textContent=t;return x};let role='',years=[],classes=[],coverage=[],assignments=[],lookup=new Map(),roster=[],records=[],dirty=new Map(),busy=false,loadVersion=0,view='1',context=null;
const notify=(s,bad=false)=>{$('notice').textContent=s;$('notice').className='status '+(bad?'bad':'')};const check=r=>{if(r.error)throw Error(r.error.message);return r.data};const opt=(s,v,t)=>s.append(new Option(t,v));const age=m=>m==null?'—':Math.floor(m/12)+'y '+m%12+'m';const gap=m=>m==null?'—':(m>0?'+':'')+m+'m';
function calc(score,a){if(score==null)return {m:null,d:null,c:'Pending',action:''};if(score<2)return {m:null,d:null,c:'Below lowest conversion point',action:'Conduct further assessment and provide support.'};let m=lookup.get(Math.round(score));if(m==null)return {m:null,d:null,c:'Conversion unavailable',action:''};if(a==null)return {m,d:null,c:'Age pending',action:''};let d=m-a*12,c=d>=24?'Well Above Expected Level':d>=12?'Above Expected Level':d>=-11?'At/Close to Expected Level':d>=-23?'Below Expected Level':'Significantly Below Expected Level';let action=d>=24?'Provide enrichment and challenging word-reading materials.':d>=12?'Continue development with appropriately challenging materials.':d>=-11?'Continue regular reading instruction and monitor progress.':d>=-23?'Provide targeted word recognition and decoding support.':'Provide intensive systematic reading intervention and further assessment.';return {m,d,c,action}}
function enable(on){$('save').disabled=!on||!dirty.size||busy;$('reload').disabled=busy;$('year').disabled=busy;$('class').disabled=busy;$('term').disabled=busy}
function options(){const y=$('year').value,old=$('class').value;$('class').replaceChildren();const list=classes.filter(c=>(role!=='teacher'||assignments.some(a=>a.academic_year_id===y&&a.class_id===c.id))&&coverage.some(g=>g.academic_year_id===y&&g.grade_level===c.grade_level&&g.enabled));for(const c of list)opt($('class'),c.id,'Grade '+c.grade_level+' – '+c.section_name);if(list.some(c=>c.id===old))$('class').value=old}
function renderCoverage(){ $('grades').replaceChildren();if(role!=='admin')return;for(const g of coverage.filter(g=>g.academic_year_id===$('year').value).sort((a,b)=>a.grade_level-b.grade_level)){const l=el('label','Grade '+g.grade_level+' '),i=el('input');i.type='checkbox';i.checked=g.enabled;i.onchange=async()=>{if(dirty.size){i.checked=g.enabled;return notify('Save or discard changes first.',true)}i.disabled=true;try{check(await db.from('grade_coverage').update({enabled:i.checked}).eq('academic_year_id',g.academic_year_id).eq('grade_level',g.grade_level).select().single());g.enabled=i.checked;options();await load()}catch(e){i.checked=g.enabled;notify(e.message,true)}finally{i.disabled=false}};l.append(i);$('grades').append(l)}}
async function start(session){if(!session)return;try{const staff=check(await db.from('staff').select('role,enabled,password_change_required').eq('user_id',session.user.id).maybeSingle());if(!staff?.enabled)throw Error('Contact the BURT administrator for access.');$('logout').hidden=false;if(staff.password_change_required||recovery){$('login').hidden=true;$('passwordChange').hidden=false;return}role=staff.role;const data=await Promise.all([db.from('academic_years').select('*').order('label',{ascending:false}),db.from('classes').select('*').eq('is_active',true).neq('class_code','TEST-G8-2026').order('grade_level'),db.from('grade_coverage').select('*'),db.from('burt_conversion').select('*'),db.from('class_access').select('class_id,academic_year_id').eq('user_id',session.user.id)]);assignments=check(data[4]);[years,classes,coverage]=data.slice(0,3).map(check);if(!years.length)throw Error('Sign in again with your BURT password.');lookup=new Map(check(data[3]).map(x=>[x.raw_score,x.reading_months]));$('year').replaceChildren();for(const y of years)opt($('year'),y.id,y.label);const active=years.find(y=>y.is_active);if(active)$('year').value=active.id;$('identity').textContent=session.user.email+' · '+role;$('login').hidden=true;$('app').hidden=false;$('logout').hidden=false;$('coverage').hidden=role!=='admin';$('manageTeachers').hidden=role!=='admin';options();renderCoverage();await load()}catch(e){notify('Access unavailable: '+e.message,true);await db.auth.signOut({scope:'local'});$('logout').hidden=true;$('login').hidden=false;$('app').hidden=true}}
function cell(tr,t){const c=el('td',t);tr.append(c);return c}
function input(tr,value,max,row,col,change){const c=cell(tr),i=el('input');i.type='number';i.min='0';i.max=max;i.step='1';i.value=value??'';i.dataset.row=row;i.dataset.col=col;i.setAttribute('aria-label',col===0?'Chronological age in years':'Burt raw score');i.oninput=()=>change(i);i.onkeydown=e=>{let r=row,k=col;if(e.key==='ArrowDown'||e.key==='Enter')r++;else if(e.key==='ArrowUp')r--;else if(e.key==='ArrowLeft')k--;else if(e.key==='ArrowRight')k++;else return;let target=$('rows').querySelector('input[data-row="'+r+'"][data-col="'+k+'"]');if(target){e.preventDefault();target.focus();try{target.select()}catch{}}};c.append(i);return i}
function number(i){return i.value===''?null:Number(i.value)}
function render(){let final=view==='final';$('thead').replaceChildren();let h=el('tr');for(const title of (final?['Student','Terms complete','Auto average','Manual average','Final score','Reading age','Difference','Interpretation','Action']:['Student','Age (years)','Raw score /110','Reading age','Difference','Interpretation','Recommended action']))h.append(el('th',title));$('thead').append(h);$('rows').replaceChildren();roster.forEach((r,j)=>{let tr=el('tr'),name=el('button',r.students?.full_name||'Student');name.onclick=()=>detail(r);cell(tr).append(name);let rec=records.find(x=>x.enrollment_id===r.id)||{};if(final){for(const v of [rec.terms_completed??0,rec.automatic_score??'—',rec.manual_score??'—',rec.final_score??'—',age(rec.reading_months),gap(rec.difference_months),rec.interpretation??'Pending'])cell(tr,String(v));const btn=el('button','Manual override');btn.disabled=role==='academic';btn.onclick=()=>override(r);cell(tr).append(btn)}else{let local=dirty.get(r.id)||{enrollment_id:r.id,class_id:r.class_id,academic_year_id:r.academic_year_id,term:Number(view),age_years:rec.age_years??null,raw_score:rec.raw_score??null};let a,s;const refresh=()=>{if(!a.validity.valid||!s.validity.valid){notify('Enter whole-number ages and scores from 0 to 110.',true);return}local={...local,age_years:number(a),raw_score:number(s)};dirty.set(r.id,local);const x=calc(local.raw_score,local.age_years);reading.textContent=age(x.m);diff.textContent=gap(x.d);cat.textContent=x.c;action.textContent=x.action;stats();enable(true)};a=input(tr,local.age_years,120,j,0,refresh);s=input(tr,local.raw_score,110,j,1,refresh);a.disabled=s.disabled=role==='academic';let x=calc(local.raw_score,local.age_years);var reading=cell(tr,age(x.m)),diff=cell(tr,gap(x.d)),cat=cell(tr,x.c),action=cell(tr,x.action)}$('rows').append(tr)});stats();enable(!final)}
function stats(){let counts={},done=0;for(const r of roster){let rec=records.find(x=>x.enrollment_id===r.id)||{},d=dirty.get(r.id)||rec,c=view==='final'?(rec.interpretation||'Pending'):calc(d.raw_score,d.age_years).c;if(c!=='Pending'&&c!=='Age pending'&&c!=='Conversion unavailable')done++;counts[c]=(counts[c]||0)+1}$('stats').replaceChildren();for(const [k,v] of Object.entries({'Enrolled':roster.length,'Interpreted':done,...counts})){let x=el('div',k);x.className='stat';x.append(el('strong',v));$('stats').append(x)}}
async function load(){let n=++loadVersion;busy=true;enable(false);dirty.clear();roster=[];records=[];const y=$('year').value,c=$('class').value;view=$('term').value;context={y,c,view};try{if(!c||!y){render();notify('No enabled assigned class. Ask an administrator to enable grade coverage.');return}const data=await Promise.all([db.from('enrollments').select('id,class_id,academic_year_id,students(full_name)').eq('academic_year_id',y).eq('class_id',c).eq('status','active'),view==='final'?db.from('final_results').select('*').eq('academic_year_id',y).eq('class_id',c):db.from('term_results').select('*').eq('academic_year_id',y).eq('class_id',c).eq('term',Number(view))]);if(n!==loadVersion)return;roster=check(data[0]).sort((a,b)=>(a.students?.full_name||'').localeCompare(b.students?.full_name||''));records=check(data[1]);$('heading').textContent=$('class').selectedOptions[0].text+' · '+$('term').selectedOptions[0].text;render();notify('Loaded '+roster.length+' active enrollments.')}catch(e){if(n===loadVersion){render();notify(e.message,true)}}finally{if(n===loadVersion){busy=false;enable(view!=='final')}}}
async function save(){if(!dirty.size||busy)return;if([...$('rows').querySelectorAll('input')].some(i=>!i.validity.valid))return notify('Correct invalid inputs before saving.',true);busy=true;enable(false);for(const i of $('rows').querySelectorAll('input,button'))i.disabled=true;try{let payload=[...dirty.values()];let data=check(await db.from('assessments').upsert(payload,{onConflict:'enrollment_id,term'}).select('enrollment_id'));if(data.length!==payload.length)throw Error('Not all rows were saved.');await load();notify('Saved '+data.length+' assessment records.')}catch(e){notify('Save failed: '+e.message,true)}finally{busy=false;render();enable(true)}}
async function detail(r){try{const rows=check(await db.from('term_results').select('*').eq('enrollment_id',r.id).order('term'));$('detailTitle').textContent=r.students?.full_name||'Student';$('detailBody').replaceChildren();for(let t=1;t<=3;t++){const z=rows.find(x=>x.term===t);$('detailBody').append(el('h3','Term '+t),el('p',z?'Score: '+(z.raw_score??'—')+' / 110 · Reading age: '+age(z.reading_months)+' · Difference: '+gap(z.difference_months)+' · '+z.interpretation:'Not assessed'),el('p',z?.recommended_action||''))}const first=rows.find(x=>x.raw_score!=null),last=[...rows].reverse().find(x=>x.raw_score!=null);if(first&&last&&first.term!==last.term)$('detailBody').append(el('p','Score change: '+(last.raw_score-first.raw_score)+' points'));await interventionPanel(r);$('detail').showModal()}catch(e){notify(e.message,true)}}
async function override(r){let s=prompt('Manual final score (0–110)');if(s===null||s.trim()==='')return;let n=Number(s);if(!Number.isFinite(n)||n<0||n>110)return notify('Invalid score.',true);let reason=prompt('Reason for override');if(!reason?.trim())return;try{check(await db.from('final_overrides').upsert({enrollment_id:r.id,class_id:r.class_id,academic_year_id:r.academic_year_id,manual_score:n,reason:reason.trim()},{onConflict:'enrollment_id'}).select().single());await load()}catch(e){notify(e.message,true)}}
function guard(){return !dirty.size||confirm('Discard unsaved changes?')}
for(const id of ['year','class','term'])$(id).onchange=()=>{if(!guard()){ $('year').value=context.y;options();$('class').value=context.c;$('term').value=context.view;return}if(id==='year'){options();renderCoverage()}load()};
$('reload').onclick=()=>{if(guard())load()};$('save').onclick=save;$('print').onclick=()=>{if(!dirty.size)window.print();else notify('Save changes before printing.',true)};$('closeDetail').onclick=()=>$('detail').close();
$('export').onclick=()=>{if(dirty.size)return notify('Save before exporting.',true);const csv=x=>'"'+String(x??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';let rows=[Array.from($('thead').querySelectorAll('th'),x=>x.textContent).filter((x,i)=>view!=='final'||i!==8),...roster.map(r=>{let z=records.find(x=>x.enrollment_id===r.id)||{};return view==='final'?[r.students?.full_name,z.terms_completed,z.automatic_score,z.manual_score,z.final_score,age(z.reading_months),gap(z.difference_months),z.interpretation]:[r.students?.full_name,z.age_years,z.raw_score,age(z.reading_months),gap(z.difference_months),z.interpretation,z.recommended_action]})];const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(csv).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));let a=el('a');a.href=url;a.download='BURT-results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
const website = 'https://upschool112-gif.github.io/BURT/';
const starterPassword = 'ups12345678';

async function requestPasswordSetup() {
  $('send').disabled = true;
  $('recover').disabled = true;
  try {
    check(await db.auth.resetPasswordForEmail($('email').value.trim(), {redirectTo: website}));
    notify('If your BURT account is registered, check your email for a link to set your password.');
  } catch {
    notify('The password setup link could not be requested. Try again later.', true);
  } finally {
    $('password').value = '';
    $('send').disabled = false;
    $('recover').disabled = false;
  }
}

$('loginForm').onsubmit = async event => {
  event.preventDefault();
  if ($('password').value === starterPassword) return requestPasswordSetup();
  $('send').disabled = true;
  try {
    const { session } = check(await db.auth.signInWithPassword({email: $('email').value.trim(), password: $('password').value}));
    await start(session);
  } catch {
    notify('Sign-in failed. Check your credentials and confirm your email if prompted.', true);
  } finally {
    $('password').value = '';
    $('send').disabled = false;
  }
};
$('recover').onclick = () => {
  if ($('email').reportValidity()) return requestPasswordSetup();
};
$('changeForm').onsubmit = async event => {
  event.preventDefault();
  const password = $('newPassword').value;
  if (password === starterPassword) return notify('Choose a password different from the starter password.', true);
  if (password !== $('confirmPassword').value) return notify('The passwords must match.', true);
  $('changePassword').disabled = true;
  try {
    check(await db.auth.updateUser({password}));
    const result = await db.auth.signOut({scope: 'global'});
    if (result.error) await db.auth.signOut({scope: 'local'});
    location.replace(website + '?passwordUpdated=1');
  } catch (error) { notify(error.message, true); }
  finally { $('changePassword').disabled = false; }
};
$('logout').onclick = async () => {
  if (guard()) {
    await db.auth.signOut({scope: 'local'});
    location.replace(website);
  }
};
window.addEventListener('beforeunload', event => {
  if (dirty.size) { event.preventDefault(); event.returnValue = ''; }
});

const dialog = $('teacherDialog');
let accountBusy = false;
async function loadTeacherClasses() {
  const id = $('teacher').value;
  $('teacherControls').hidden = !id;
  if (!id) return;
  const selected = $('teacher').selectedOptions[0];
  const assigned = new Set(check(await db.rpc('burt_teacher_classes', {teacher_id: id, school_year: $('assignmentYear').value})));
  $('assignmentClasses').replaceChildren();
  for (const item of classes) {
    const label = el('label');
    const input = el('input');
    input.type = 'checkbox';
    input.value = item.id;
    input.checked = assigned.has(item.id);
    label.append(input, ' Grade ' + item.grade_level + ' – ' + item.section_name);
    $('assignmentClasses').append(label);
  }
  $('toggleTeacher').textContent = selected.dataset.enabled === 'true' ? 'Disable account' : 'Enable account';
}
async function refreshTeachers() {
  const selected = $('teacher').value;
  const accounts = check(await db.rpc('burt_teacher_accounts'));
  $('teacher').replaceChildren(new Option('Select a teacher', ''));
  for (const account of accounts) {
    const status = !account.enabled ? ' · Disabled' : account.password_change_required ? ' · Password change pending' : '';
    const option = new Option(account.email + status, account.user_id);
    option.dataset.enabled = String(account.enabled);
    $('teacher').append(option);
  }
  if (accounts.some(account => account.user_id === selected)) $('teacher').value = selected;
  await loadTeacherClasses();
}
async function manage(action) {
  if (accountBusy) return;
  accountBusy = true;
  $('teacherFields').disabled = true;
  $('teacherStatus').textContent = '';
  try { await action(); }
  catch (error) { $('teacherStatus').textContent = error.message; }
  finally { $('teacherFields').disabled = false; accountBusy = false; }
}
async function issuePassword(body) {
  const {error} = await db.functions.invoke('burt-teacher-admin', {body});
  if (error) {
    const details = await error.context?.json?.().catch(() => null);
    throw Error(details?.error || error.message);
  }
  $('teacherStatus').textContent = body.action === 'create'
    ? 'Teacher account created. The teacher can use the shared starter password to request a setup email.'
    : 'Password reset. The teacher can use the shared starter password to request a setup email.';
  await refreshTeachers();
}
$('manageTeachers').onclick = () => {
  $('assignmentYear').replaceChildren();
  for (const year of years) opt($('assignmentYear'), year.id, year.label);
  $('assignmentYear').value = $('year').value;
  dialog.showModal();
  manage(refreshTeachers);
};
$('closeTeacher').onclick = () => { if (!accountBusy) dialog.close(); };
dialog.oncancel = event => { if (accountBusy) event.preventDefault(); };
for (const id of ['teacher','assignmentYear']) $(id).onchange = () => manage(loadTeacherClasses);
$('createTeacher').onsubmit = event => {
  event.preventDefault();
  manage(async () => {
    await issuePassword({action: 'create', email: $('newTeacherEmail').value.trim()});
    $('newTeacherEmail').value = '';
  });
};
$('resetTeacher').onclick = () => {
  if (confirm('Reset this teacher’s password and end their sessions?')) {
    manage(() => issuePassword({action: 'reset', teacherId: $('teacher').value}));
  }
};
$('toggleTeacher').onclick = () => manage(async () => {
  check(await db.rpc('burt_set_teacher_enabled', {
    teacher_id: $('teacher').value, allow_access: $('teacher').selectedOptions[0].dataset.enabled !== 'true',
  }));
  await refreshTeachers();
  $('teacherStatus').textContent = 'Account status updated.';
});
$('saveAssignments').onclick = () => manage(async () => {
  check(await db.rpc('burt_teacher_classes', {
    teacher_id: $('teacher').value, school_year: $('assignmentYear').value,
    replacement: Array.from($('assignmentClasses').querySelectorAll('input:checked'), input => input.value),
  }));
  $('teacherStatus').textContent = 'Class assignments saved.';
});

try {
  const {session} = check(await db.auth.getSession());
  if (session) await start(session);
  else if (new URLSearchParams(location.search).has('passwordUpdated')) notify('Password updated. Sign in with your new password.');
} catch { notify('Sign-in is temporarily unavailable.', true); }

async function interventionPanel(r){
const root=$('detailBody'),section=el('section');root.append(section);section.append(el('h3','Reading intervention records'));
async function refresh(){
section.replaceChildren(el('h3','Reading intervention records'));
const records=check(await db.from('interventions').select('*').eq('enrollment_id',r.id).order('start_date',{ascending:false}));
if(!records.length)section.append(el('p','No intervention records yet.'));
for(const item of records){const box=el('div');box.className='panel';box.append(el('p',item.strategy),el('p','Start: '+(item.start_date||'—')+' · Follow-up: '+(item.follow_up||'—')+' · '+item.status),el('p',item.notes||''));if(role!=='academic'){const edit=el('button','Update progress');edit.onclick=async()=>{let notes=prompt('Progress notes',item.notes||'');if(notes===null)return;let status=prompt('Status: Not Started, Ongoing, or Completed',item.status);if(!['Not Started','Ongoing','Completed'].includes(status))return;try{check(await db.from('interventions').update({notes,status}).eq('id',item.id).select().single());await refresh()}catch(e){notify(e.message,true)}};box.append(edit)}section.append(box)}
if(role!=='academic'){const add=el('button','Add intervention');add.onclick=async()=>{let strategy=prompt('Intervention strategy');if(!strategy?.trim())return;let follow=prompt('Follow-up date (YYYY-MM-DD), optional','');if(follow===null)return;if(follow&&!/^\d{4}-\d{2}-\d{2}$/.test(follow))return notify('Invalid date.',true);try{check(await db.from('interventions').insert({enrollment_id:r.id,class_id:r.class_id,academic_year_id:r.academic_year_id,strategy:strategy.trim(),start_date:new Date().toISOString().slice(0,10),follow_up:follow||null,status:'Ongoing'}).select().single());await refresh()}catch(e){notify(e.message,true)}};section.append(add)}
}await refresh()}
async function schoolSummary(){if(!guard())return;try{const y=$('year').value,t=$('term').value;const allowed=classes.filter(c=>coverage.some(g=>g.academic_year_id===y&&g.grade_level===c.grade_level&&g.enabled));const data=await Promise.all([db.from('enrollments').select('id,class_id').eq('academic_year_id',y).eq('status','active'),t==='final'?db.from('final_results').select('enrollment_id,class_id,interpretation').eq('academic_year_id',y):db.from('term_results').select('enrollment_id,class_id,interpretation').eq('academic_year_id',y).eq('term',Number(t))]);const enroll=check(data[0]),res=check(data[1]);const root=$('detailBody');$('detailTitle').textContent='School reading summary · '+(t==='final'?'Final results':'Term '+t);root.replaceChildren();const table=el('table'),head=el('tr');for(const k of ['Class','Enrolled','Interpreted','At/Above','Needs support','Pending'])head.append(el('th',k));table.append(head);let totals=[0,0,0,0,0];for(const c of allowed){const es=enroll.filter(e=>e.class_id===c.id);const cats=es.map(e=>res.find(r=>r.enrollment_id===e.id)?.interpretation);const ok=cats.filter(x=>['At/Close to Expected Level','Above Expected Level','Well Above Expected Level'].includes(x)).length;const support=cats.filter(x=>['Below Expected Level','Significantly Below Expected Level','Below lowest conversion point'].includes(x)).length;const ns=[es.length,ok+support,ok,support,es.length-ok-support];ns.forEach((v,i)=>totals[i]+=v);const tr=el('tr');cell(tr,'Grade '+c.grade_level+' – '+c.section_name);ns.forEach(v=>cell(tr,String(v)));table.append(tr)}const tr=el('tr');cell(tr,'Total');totals.forEach(v=>cell(tr,String(v)));table.append(tr);root.append(table,el('p','Performance percentages exclude pending assessments. At/above: '+(totals[1]?(100*totals[2]/totals[1]).toFixed(1)+'%':'—')));$('detail').showModal()}catch(e){notify(e.message,true)}}
const summaryButton=el('button','School summary');summaryButton.hidden=true;summaryButton.onclick=schoolSummary;$('export').after(summaryButton);
const observe=new MutationObserver(()=>{summaryButton.hidden=$('app').hidden||!['admin','academic'].includes(role)});observe.observe($('app'),{attributes:true,attributeFilter:['hidden']});summaryButton.hidden=$('app').hidden||!['admin','academic'].includes(role);
