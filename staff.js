const STAFF = {
  budi:   {pass:'123', name:'Budi Santoso', role:'driver'},
  agus:   {pass:'123', name:'Agus Pratama', role:'driver'},
  sari:   {pass:'123', name:'Sari Wulan',   role:'operator'},
  dewi:   {pass:'123', name:'Dewi Lestari', role:'operator'},
  monitor:{pass:'123', name:'Monitor Outlet', role:'monitor'}
};
const OUTLET_NAME = 'Outlet Merdeka';
let session = null;
let driverTab = 'pickup';

function esc(s){ return String(s||'').replace(/[<>&"]/g, c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])); }
function fmt(f){ return String(f).replace('.', ','); }
function showToast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.style.display='block'; setTimeout(()=>t.style.display='none',1700); }
function timeAgo(ts){ const m=Math.floor((Date.now()-ts)/60000); return m<1?'baru saja':m+' menit lalu'; }

/* ---------- AUTH ---------- */
function doLogin(){
  const u = document.getElementById('loginUser').value.trim().toLowerCase();
  const p = document.getElementById('loginPass').value.trim();
  if(!u || !p){ showToast('Isi username & password dulu'); return; }
  const acc = STAFF[u];
  if(!acc || acc.pass !== p){ showToast('Username / password salah'); return; }
  session = {user:u, name:acc.name, role:acc.role};
  try{ localStorage.setItem('mrspin_staff', JSON.stringify(session)); }catch(e){}
  enterApp();
}
function doLogout(){
  session = null;
  try{ localStorage.removeItem('mrspin_staff'); }catch(e){}
  document.getElementById('app').classList.remove('monitormode');
  document.getElementById('monScreen').classList.add('hide');
  document.getElementById('shell').classList.add('hide');
  document.getElementById('loginScreen').classList.remove('hide');
  document.getElementById('loginUser').value='';
  document.getElementById('loginPass').value='';
}
function roleLabel(r){ return r==='driver'?'Driver / Kurir':r==='operator'?'Operator Outlet':'Monitor Display'; }

function enterApp(){
  document.getElementById('loginScreen').classList.add('hide');
  if(session.role === 'monitor'){
    document.getElementById('app').classList.add('monitormode');
    document.getElementById('shell').classList.add('hide');
    document.getElementById('monScreen').classList.remove('hide');
    document.getElementById('monOutlet').textContent = OUTLET_NAME;
    renderMonitor();
    return;
  }
  document.getElementById('shell').classList.remove('hide');
  document.getElementById('whoName').textContent = session.name;
  document.getElementById('whoRole').textContent = roleLabel(session.role).toUpperCase() + ' \u2022 ' + OUTLET_NAME;
  if(session.role === 'driver'){
    document.getElementById('driverTabs').classList.remove('hide');
    renderDriver();
  } else {
    document.getElementById('driverTabs').classList.add('hide');
    renderOperator();
  }
}

/* ---------- DRIVER ---------- */
function setDriverTab(t){ driverTab=t; document.querySelectorAll('.tab').forEach(el=>el.classList.toggle('on', el.dataset.dtab===t)); renderDriver(); }
function renderDriver(){
  const el = document.getElementById('shellBody');
  const all = Store.getAll();
  const items = driverTab==='pickup' ? all.filter(o=>o.status==='menunggu_pickup') : all.filter(o=>o.status==='siap_kirim');
  if(!items.length){ el.innerHTML = '<div class="empty">'+(driverTab==='pickup'?'Belum ada order baru untuk dijemput':'Belum ada cucian siap diantar')+'</div>'; return; }
  el.innerHTML = items.map(o=>{
    if(driverTab==='pickup'){
      return '<div class="card">'+
        '<div class="top"><div class="oid">#'+o.id+'</div><div class="badge pickup">Jemput '+timeAgo(o.createdAt)+'</div></div>'+
        '<div class="cust">'+esc(o.customer)+' \u2022 '+esc(o.phone)+'</div>'+
        '<div class="addr">\ud83d\udce6 '+esc(o.pickupAddr)+'</div>'+
        '<div class="addr">'+esc(o.service)+' \u2022 '+esc(o.outlet||'')+'</div>'+
        '<div class="photobox" id="pf-'+o.id+'">'+(o.proofPickup?'\u2705 Foto tersimpan':'\ud83d\udcf8 Ambil foto bukti pickup')+'</div>'+
        '<div class="btnrow">'+
          '<button class="btn ghost" onclick="takePhoto(\''+o.id+'\',\'pickup\')">\ud83d\udcf7 Foto Bukti</button>'+
          '<button class="btn primary" onclick="doPickup(\''+o.id+'\')">\u2713 Sudah Dijemput</button>'+
        '</div></div>';
    }
    return '<div class="card">'+
      '<div class="top"><div class="oid">#'+o.id+'</div><div class="badge deliver">Siap Diantar</div></div>'+
      '<div class="cust">'+esc(o.customer)+' \u2022 '+esc(o.phone)+'</div>'+
      '<div class="addr">\ud83c\udfe0 '+esc(o.deliverAddr)+'</div>'+
      '<div class="addr">'+esc(o.service)+' \u2022 '+esc(o.outlet||'')+'</div>'+
      '<div class="photobox" id="pf-'+o.id+'">'+(o.proofDeliver?'\u2705 Foto tersimpan':'\ud83d\udcf8 Ambil foto bukti antar')+'</div>'+
      '<div class="btnrow">'+
        '<button class="btn ghost" onclick="takePhoto(\''+o.id+'\',\'deliver\')">\ud83d\udcf7 Foto Bukti</button>'+
        '<button class="btn primary" onclick="doDeliver(\''+o.id+'\')">\u2713 Sudah Diantar</button>'+
      '</div></div>';
  }).join('');
}
function takePhoto(id,kind){ Store.update(id, kind==='pickup'?{proofPickup:true}:{proofDeliver:true}); showToast('Foto bukti berhasil diupload'); refreshCurrent(); }
function doPickup(id){ const o=Store.find(id); if(!o.proofPickup){ showToast('Wajib foto bukti dulu sebelum konfirmasi'); return; } Store.update(id,{status:'dijemput'}); showToast('Ditandai sudah dijemput \u2192 outlet dinotif'); renderDriver(); }
function doDeliver(id){ const o=Store.find(id); if(!o.proofDeliver){ showToast('Wajib foto bukti antar dulu'); return; } Store.update(id,{status:'selesai'}); showToast('Pesanan selesai diantar'); renderDriver(); }

/* ---------- OPERATOR ---------- */
function renderOperator(){
  const el = document.getElementById('shellBody');
  el.innerHTML = '<div class="cols">'+
    '<div class="col"><h3>Menunggu Jemput <span class="cnt" id="c1">0</span></h3><div class="colbody" id="col1"></div></div>'+
    '<div class="col"><h3>Masuk Outlet <span class="cnt" id="c2">0</span></h3><div class="colbody" id="col2"></div></div>'+
    '<div class="col"><h3>Sedang Dicuci <span class="cnt" id="c3">0</span></h3><div class="colbody" id="col3"></div></div>'+
    '<div class="col"><h3>Siap Diantar <span class="cnt" id="c4">0</span></h3><div class="colbody" id="col4"></div></div>'+
  '</div>';
  fillOperator();
}
function opCard(o, label, action){
  return '<div class="mini"><div class="oid">#'+o.id+'</div><div class="cust">'+esc(o.customer)+'</div><div class="svc">'+esc(o.service)+' \u2022 '+fmt(o.weight)+'kg</div>'+(action?'<button onclick="'+action+'(\''+o.id+'\')">'+label+'</button>':'')+'</div>';
}
function fillOperator(){
  const all = Store.getAll();
  const c1=all.filter(o=>o.status==='menunggu_pickup'), c2=all.filter(o=>o.status==='dijemput'), c3=all.filter(o=>o.status==='proses_cuci'), c4=all.filter(o=>o.status==='siap_kirim');
  const set=(id,v)=>{const e=document.getElementById(id); if(e) e.textContent=v;};
  set('c1',c1.length);set('c2',c2.length);set('c3',c3.length);set('c4',c4.length);
  const put=(id,arr,lbl,act,emp)=>{const e=document.getElementById(id); if(e) e.innerHTML=arr.length?arr.map(o=>opCard(o,lbl,act)).join(''):'<div class="emptc">'+emp+'</div>';};
  put('col1',c1,null,null,'Menunggu driver');
  put('col2',c2,'Mulai Cuci \u2192','startWash','Belum ada masuk');
  put('col3',c3,'Selesai \u2192','finishWash','Tidak ada');
  put('col4',c4,null,null,'Menunggu driver antar');
}
function startWash(id){ Store.update(id,{status:'proses_cuci'}); showToast('Order #'+id+' mulai dicuci'); fillOperator(); }
function finishWash(id){ Store.update(id,{status:'siap_kirim'}); showToast('#'+id+' siap dikirim \u2192 notif driver & monitor'); fillOperator(); }

/* ---------- MONITOR ---------- */
let lastCount = {p:0,d:0};
function flash(){ const f=document.getElementById('flash'); f.classList.add('on'); setTimeout(()=>f.classList.remove('on'),400); }
function renderMonitor(){
  const all = Store.getAll();
  const pickup = all.filter(o=>o.status==='menunggu_pickup').sort((a,b)=>a.createdAt-b.createdAt);
  const deliver = all.filter(o=>o.status==='siap_kirim').sort((a,b)=>a.createdAt-b.createdAt);
  if(pickup.length>lastCount.p || deliver.length>lastCount.d) flash();
  lastCount = {p:pickup.length, d:deliver.length};
  document.getElementById('monPickup').innerHTML = pickup.length ? pickup.map(o=>{
    const mins=Math.floor((Date.now()-o.createdAt)/60000);
    return '<div class="mrow '+(mins>30?'urgent':'')+'"><div><div class="oid">#'+o.id+' \u2014 '+esc(o.customer)+'</div><div class="meta">'+esc(o.service)+' \u2022 '+esc(o.pickupAddr)+'</div></div><div class="agebadge">'+timeAgo(o.createdAt)+'</div></div>';
  }).join('') : '<div class="monempty">Tidak ada cucian menunggu dijemput</div>';
  document.getElementById('monDeliver').innerHTML = deliver.length ? deliver.map(o=>'<div class="mrow"><div><div class="oid">#'+o.id+' \u2014 '+esc(o.customer)+'</div><div class="meta">'+esc(o.service)+' \u2022 '+esc(o.deliverAddr)+'</div></div><div class="agebadge">Siap Kirim</div></div>').join('') : '<div class="monempty">Tidak ada cucian siap diantar</div>';
}
function tickClock(){ const e=document.getElementById('monClock'); if(e) e.textContent = new Date().toLocaleTimeString('id-ID'); }
setInterval(tickClock,1000); tickClock();
setInterval(()=>{ if(session && session.role==='monitor') renderMonitor(); }, 5000);

/* ---------- LIVE REFRESH ---------- */
function refreshCurrent(){
  if(!session) return;
  if(session.role==='driver') renderDriver();
  else if(session.role==='operator') fillOperator();
  else if(session.role==='monitor') renderMonitor();
}

/* ---------- expose handlers to global ---------- */
window.doLogin=doLogin; window.doLogout=doLogout; window.setDriverTab=setDriverTab;
window.takePhoto=takePhoto; window.doPickup=doPickup; window.doDeliver=doDeliver;
window.startWash=startWash; window.finishWash=finishWash;

/* ---------- BOOT ---------- */
function boot(){
  try{ if(typeof Store!=='undefined' && Store.seed){ Store.seed(); Store.subscribe(refreshCurrent); } }catch(e){ console.error('store init',e); }
  var b=document.getElementById('btnLogin');
  if(b) b.addEventListener('click', doLogin);
  var pp=document.getElementById('loginPass');
  if(pp) pp.addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin(); });
  try{
    const saved = JSON.parse(localStorage.getItem('mrspin_staff')||'null');
    if(saved && STAFF[saved.user]){ session = saved; enterApp(); }
  }catch(e){}
}
if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
