/* ============ Mr Spin — Portal Internal (Karyawan + Owner) ============ */
const STAFF = {
  owner:   {pass:'123', name:'Pak Owner',    role:'owner'},
  budi:    {pass:'123', name:'Budi Santoso', role:'karyawan'},
  agus:    {pass:'123', name:'Agus Pratama', role:'karyawan'},
  sari:    {pass:'123', name:'Sari Wulan',   role:'karyawan'},
  dewi:    {pass:'123', name:'Dewi Lestari', role:'karyawan'},
  monitor: {pass:'123', name:'Monitor Outlet', role:'monitor'}
};
const OUTLET_NAME = 'Cabang Utama';
const SHIFT = '08:00\u201316:00';
let session = null;
let driverTab = 'pickup';
let view = 'home';        // current screen id for karyawan/owner
let viewArg = null;       // argument (mis. order id)
let weighBuf = '';        // numpad buffer

function esc(s){ return String(s||'').replace(/[<>&"]/g, c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])); }
function fmt(f){ return String(f).replace('.', ','); }
function rp(n){ return 'Rp ' + Number(n||0).toLocaleString('id-ID'); }
function showToast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.style.display='block'; clearTimeout(showToast._t); showToast._t=setTimeout(()=>t.style.display='none',1700); }
function timeAgo(ts){ const m=Math.floor((Date.now()-ts)/60000); return m<1?'baru saja':m+' menit lalu'; }
const STATUS = ['menunggu_pickup','dijemput','proses_cuci','siap_kirim','selesai'];
const STLABEL = {menunggu_pickup:'Menunggu Dijemput',dijemput:'Dijemput Kurir',proses_cuci:'Sedang Dicuci',siap_kirim:'Siap Diantar',selesai:'Selesai'};

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
  session = null; view='home'; viewArg=null;
  try{ localStorage.removeItem('mrspin_staff'); }catch(e){}
  document.getElementById('app').classList.remove('monitormode');
  document.getElementById('monScreen').classList.add('hide');
  document.getElementById('shell').classList.add('hide');
  document.getElementById('loginScreen').classList.remove('hide');
  document.getElementById('loginUser').value='';
  document.getElementById('loginPass').value='';
}
function roleLabel(r){ return r==='owner'?'\ud83d\udc51 Owner / Manajemen':r==='karyawan'?'\ud83d\udc77 Karyawan':'\ud83d\udcfa Monitor'; }

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
  view='home'; viewArg=null;
  render();
}

/* ---------- ROUTER ---------- */
function go(v,arg){ view=v; viewArg=arg||null; if(v==='timbang') weighBuf=''; render(); }
function back(){
  // simple back mapping
  const map={detail:'orders',timbang:'detail',rute:'home',absensi:'home',orders:'home',
             ownerDash:'home',ownerTrx:'home',ownerLayanan:'home',ownerKaryawan:'home',ownerLaporan:'home',ownerCabang:'home'};
  go(map[view]||'home', view==='timbang'?viewArg:null);
}
function render(){
  const el = document.getElementById('shellBody');
  const tabs = document.getElementById('driverTabs');
  tabs.classList.add('hide');
  if(session.role==='owner'){ renderOwner(el); return; }
  // karyawan
  switch(view){
    case 'home':    renderKaryawanHome(el); break;
    case 'orders':  tabs.classList.remove('hide'); renderOrders(el); break;
    case 'detail':  renderDetail(el); break;
    case 'timbang': renderTimbang(el); break;
    case 'rute':    renderRute(el); break;
    case 'absensi': renderAbsensi(el); break;
    default:        renderKaryawanHome(el);
  }
}

/* ============ KARYAWAN ============ */
function backbar(title){
  return '<div class="backbar" onclick="back()"><span class="bk">\u2190</span> '+esc(title)+'</div>';
}
function renderKaryawanHome(el){
  const all = Store.getAll();
  const aktif = all.filter(o=>o.status!=='selesai').length;
  const jemput = all.filter(o=>o.status==='menunggu_pickup').length;
  const antar = all.filter(o=>o.status==='siap_kirim').length;
  const selesai = all.filter(o=>o.status==='selesai').length;
  const jm = all.filter(o=>o.status==='menunggu_pickup').slice(0,3);
  let html =
    '<div class="hello"><h2>Halo, '+esc(session.name.split(' ')[0])+' \ud83d\udc4b</h2>'+
    '<div class="shift">Shift: '+SHIFT+' \u2022 '+OUTLET_NAME+'</div></div>'+
    '<div class="stats">'+
      '<div class="stat"><div class="n">'+aktif+'</div><div class="l">Order Aktif</div></div>'+
      '<div class="stat"><div class="n">'+jemput+'</div><div class="l">Perlu Jemput</div></div>'+
      '<div class="stat"><div class="n">'+antar+'</div><div class="l">Siap Antar</div></div>'+
      '<div class="stat hl"><div class="n">'+selesai+'</div><div class="l">Selesai (semua)</div></div>'+
    '</div>'+
    '<div class="menugrid">'+
      mtile('\ud83d\udccb','Daftar Order','Jemput / Proses / Antar',"go('orders')")+
      mtile('\ud83d\uddfa\ufe0f','Rute Jemput/Antar','Urutan + navigasi',"go('rute')")+
      mtile('\u2696\ufe0f','Timbang & Foto','Berat aktual + bukti',"go('orders')")+
      mtile('\ud83d\udd51','Absensi & Kinerja','Clock in/out + rekap',"go('absensi')")+
    '</div>'+
    '<div class="sechd">Perlu Dijemput <a onclick="go(\'orders\')">Lihat Semua</a></div>'+
    '<div style="padding:0 16px 16px">';
  if(jm.length){
    html += jm.map(o=>orderMiniCard(o)).join('');
  } else {
    html += '<div class="empty">Tidak ada order menunggu jemput</div>';
  }
  html += '</div>';
  el.innerHTML = html;
}
function mtile(ic,t,d,act){
  return '<div class="mtile" onclick="'+act+'"><div class="ic">'+ic+'</div><div class="t">'+t+'</div><div class="d">'+d+'</div></div>';
}
function orderMiniCard(o){
  const badge = o.status==='menunggu_pickup'?'<span class="badge pickup">Perlu Jemput</span>':
                o.status==='siap_kirim'?'<span class="badge deliver">Siap Antar</span>':
                '<span class="badge proc">'+STLABEL[o.status]+'</span>';
  return '<div class="card clk" onclick="go(\'detail\',\''+o.id+'\')">'+
    '<div class="top"><div class="oid">#'+o.id+'</div>'+badge+'</div>'+
    '<div class="cust">'+esc(o.customer)+' \u2022 '+esc(o.service)+'</div>'+
    '<div class="addr">\ud83d\udccd '+esc(o.pickupAddr)+' \u2022 '+(o.km||'\u2013')+' km</div>'+
    '</div>';
}
function renderOrders(el){
  const all = Store.getAll();
  let items;
  if(driverTab==='pickup') items = all.filter(o=>o.status==='menunggu_pickup');
  else if(driverTab==='proses') items = all.filter(o=>o.status==='dijemput'||o.status==='proses_cuci');
  else items = all.filter(o=>o.status==='siap_kirim');
  let html='';
  if(!items.length){ html='<div class="empty">Tidak ada order di tab ini</div>'; }
  else html = items.map(o=>orderMiniCard(o)).join('');
  el.innerHTML = html;
}
function setDriverTab(t){ driverTab=t; document.querySelectorAll('.tab').forEach(el=>el.classList.toggle('on', el.dataset.dtab===t)); renderOrders(document.getElementById('shellBody')); }

function renderDetail(el){
  const o = Store.find(viewArg);
  if(!o){ el.innerHTML = backbar('Detail Order')+'<div class="empty">Order tidak ditemukan</div>'; return; }
  const curIdx = STATUS.indexOf(o.status);
  const steps = [
    {k:'menunggu_pickup',l:'Pesanan Diterima'},
    {k:'dijemput',l:'Dijemput Kurir'},
    {k:'proses_cuci',l:'Timbang & Mulai Cuci'},
    {k:'siap_kirim',l:'Antar Balik'},
    {k:'selesai',l:'Selesai'}
  ];
  let stepHtml = steps.map(s=>{
    const i = STATUS.indexOf(s.k);
    const cls = i<curIdx?'done':(i===curIdx?'cur':'');
    const mark = i<curIdx?'\u2713':(i===curIdx?'\u25cf':(i+1));
    return '<div class="step '+cls+'"><div class="dot">'+mark+'</div><div class="lbl">'+s.l+'</div></div>';
  }).join('');
  // next action button
  let action='';
  if(o.status==='menunggu_pickup') action='<button class="btn primary full" onclick="advance(\''+o.id+'\')">Update \u2192 Dijemput</button>';
  else if(o.status==='dijemput')   action='<button class="btn primary full" onclick="go(\'timbang\',\''+o.id+'\')">\u2696\ufe0f Timbang & Mulai Cuci</button>';
  else if(o.status==='proses_cuci')action='<button class="btn primary full" onclick="advance(\''+o.id+'\')">Update \u2192 Siap Antar</button>';
  else if(o.status==='siap_kirim') action='<button class="btn primary full" onclick="advance(\''+o.id+'\')">Update \u2192 Selesai (Diantar)</button>';
  else action='<div class="empty">Order sudah selesai \u2705</div>';

  el.innerHTML = backbar('Detail Order')+
    '<div style="padding:14px">'+
      '<div class="dethd"><div class="oid">#'+o.id+'</div>'+
        '<div class="meta">'+esc(o.customer)+' \u2022 '+esc(o.service)+'<br>Est. '+(o.weight?fmt(o.weight)+' kg':'\u2013')+' \u2022 '+STLABEL[o.status]+'</div>'+
        '<div class="row"><div class="chip">\ud83d\udcde '+esc(o.phone||'\u2013')+'</div><div class="chip">\ud83d\udccd '+(o.km||'\u2013')+' km</div></div>'+
      '</div>'+
      '<div class="stepper"><div class="sthd">Update Status</div>'+stepHtml+'</div>'+
      action+
    '</div>';
}
function advance(id){
  const o = Store.find(id); if(!o) return;
  const i = STATUS.indexOf(o.status);
  if(i<0 || i>=STATUS.length-1){ showToast('Sudah tahap akhir'); return; }
  Store.update(id,{status:STATUS[i+1]});
  showToast('Status \u2192 '+STLABEL[STATUS[i+1]]);
  render();
}

/* ----- TIMBANG (numpad) ----- */
function renderTimbang(el){
  const o = Store.find(viewArg);
  const val = weighBuf || (o&&o.weight?String(o.weight).replace('.',','):'0');
  el.innerHTML = backbar('Timbang Berat')+
    '<div class="weighthd"><div class="val">'+val+'<span class="u">kg</span></div>'+
      '<div class="sub">#'+(o?o.id:'')+' \u2022 '+(o?esc(o.service):'')+'</div></div>'+
    '<div style="padding:0 14px"><div class="photobox" id="wpf" onclick="wPhoto()">'+((o&&o.proofPickup)?'\u2705 Foto tersimpan':'\ud83d\udcf7 Foto cucian (bukti kondisi)')+'</div></div>'+
    '<div class="numpad">'+
      npBtn('1')+npBtn('2')+npBtn('3')+npBtn('4')+npBtn('5')+npBtn('6')+npBtn('7')+npBtn('8')+npBtn('9')+
      npBtn(',')+npBtn('0')+'<button class="del" onclick="wKey(\'del\')">\u232b</button>'+
    '</div>'+
    '<div style="padding:4px 14px 20px"><button class="btn primary full" onclick="saveWeight()">Simpan Berat & Mulai Cuci</button></div>';
}
function npBtn(k){ return '<button onclick="wKey(\''+k+'\')">'+k+'</button>'; }
function wKey(k){
  if(k==='del'){ weighBuf = weighBuf.slice(0,-1); }
  else if(k===','){ if(!weighBuf.includes(',')) weighBuf += (weighBuf===''?'0,':','); }
  else { if(weighBuf==='0') weighBuf=k; else weighBuf += k; }
  renderTimbang(document.getElementById('shellBody'));
}
function wPhoto(){ const o=Store.find(viewArg); if(o){ Store.update(o.id,{proofPickup:true}); showToast('Foto bukti tersimpan'); } renderTimbang(document.getElementById('shellBody')); }
function saveWeight(){
  const o = Store.find(viewArg); if(!o) return;
  const w = parseFloat((weighBuf||'0').replace(',','.'));
  if(!w || w<=0){ showToast('Masukkan berat dulu'); return; }
  Store.update(o.id,{weight:w, status:'proses_cuci'});
  showToast('Berat '+fmt(w)+' kg tersimpan \u2192 mulai cuci');
  go('detail', o.id);
}

/* ----- RUTE ----- */
function renderRute(el){
  const all = Store.getAll();
  const jm = all.filter(o=>o.status==='menunggu_pickup');
  const an = all.filter(o=>o.status==='siap_kirim');
  let n=0, total=0, html='';
  jm.forEach(o=>{ n++; const km=Number(o.km||1.5); total+=km;
    html+='<div class="routeitem"><div class="num">'+n+'</div><div class="info"><div class="t">Jemput \u2014 '+esc(o.customer)+'</div><div class="a">'+esc(o.pickupAddr)+'</div></div><div class="km">'+fmt(km)+' km</div></div>';
  });
  an.forEach(o=>{ n++; const km=Number(o.km||2.0); total+=km;
    html+='<div class="routeitem deliver"><div class="num">'+n+'</div><div class="info"><div class="t">Antar \u2014 '+esc(o.customer)+'</div><div class="a">'+esc(o.deliverAddr||o.pickupAddr)+'</div></div><div class="km">'+fmt(km)+' km</div></div>';
  });
  if(!n) html='<div class="empty">Belum ada titik jemput/antar</div>';
  el.innerHTML = backbar('Rute Jemput/Antar')+
    '<div style="padding:14px">'+html+
    (n?'<div class="routesum">'+n+' titik \u2022 '+fmt(Math.round(total*10)/10)+' km total</div>'+
       '<div style="margin-top:10px"><button class="btn primary full" onclick="showToast(\'Membuka navigasi... (demo)\')">\ud83e\udded Mulai Navigasi</button></div>':'')+
    '</div>';
}

/* ----- ABSENSI ----- */
function absState(){ try{ return JSON.parse(localStorage.getItem('mrspin_absen_'+session.user)||'null'); }catch(e){ return null; } }
function renderAbsensi(el){
  const st = absState();
  const now = new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  const clockedIn = st && st.in && !st.out;
  const all = Store.getAll();
  const doneCount = all.filter(o=>o.status==='selesai').length;
  const totalKg = Math.round(all.reduce((s,o)=>s+(Number(o.weight)||0),0));
  el.innerHTML = backbar('Absensi & Kinerja')+
    '<div style="padding:14px">'+
      '<div class="clockbox"><div class="big" id="absClock">'+now+'</div>'+
        '<div class="st">'+(clockedIn?('Masuk sejak '+st.in+' \u2022 aktif'):(st&&st.out?('Kemarin '+st.in+' \u2013 '+st.out):'Belum absen masuk'))+'</div>'+
        (clockedIn?'<button class="abtn out" onclick="clockOut()">Absen Pulang</button>':'<button class="abtn in" onclick="clockIn()">Absen Masuk</button>')+
      '</div>'+
      '<div style="font-weight:800;font-size:13px;margin:6px 0 8px">Riwayat Minggu Ini</div>'+
      '<div class="histrow"><div class="d">Sen, 04 Agu</div><div class="h">08:00 \u2014 16:05</div></div>'+
      '<div class="histrow"><div class="d">Sel, 05 Agu</div><div class="h">08:03 \u2014 16:12</div></div>'+
      '<div class="histrow"><div class="d">Rab, 06 Agu</div><div class="h">07:58 \u2014 16:00</div></div>'+
      '<div class="histrow"><div class="d">Hari Ini</div><div class="h">'+(clockedIn?st.in+' \u2014 aktif':'\u2013')+'</div></div>'+
      '<div class="kpi"><div class="k"><div class="n">'+doneCount+'</div><div class="l">Order selesai</div></div>'+
        '<div class="k"><div class="n">'+totalKg+' kg</div><div class="l">Total diproses</div></div></div>'+
    '</div>';
}
function clockIn(){ const t=new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}); try{localStorage.setItem('mrspin_absen_'+session.user,JSON.stringify({in:t,out:null}));}catch(e){} showToast('Absen masuk '+t); renderAbsensi(document.getElementById('shellBody')); }
function clockOut(){ const st=absState()||{}; const t=new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}); try{localStorage.setItem('mrspin_absen_'+session.user,JSON.stringify({in:st.in||'-',out:t}));}catch(e){} showToast('Absen pulang '+t); renderAbsensi(document.getElementById('shellBody')); }

/* ============ OWNER ============ */
function renderOwner(el){
  switch(view){
    case 'ownerDash':     ownerDash(el); break;
    case 'ownerTrx':      ownerTrx(el); break;
    case 'ownerLayanan':  ownerLayanan(el); break;
    case 'ownerKaryawan': ownerKaryawan(el); break;
    case 'ownerLaporan':  ownerLaporan(el); break;
    case 'ownerCabang':   ownerCabang(el); break;
    default:              ownerHome(el);
  }
}
function ownerHome(el){
  const all = Store.getAll();
  const omzet = all.filter(o=>o.paid).reduce((s,o)=>s+(Number(o.price)||0),0);
  el.innerHTML =
    '<div class="hello"><h2>Halo, '+esc(session.name)+' \ud83d\udc51</h2><div class="shift">Manajemen \u2022 '+OUTLET_NAME+'</div></div>'+
    '<div style="padding:0 16px"><div class="omzet"><div class="lbl">Omzet Hari Ini (demo)</div><div class="big">'+rp(omzet)+'</div><div class="sub">\u25b2 dari '+all.length+' order tercatat</div></div></div>'+
    '<div class="menugrid">'+
      mtile('\ud83d\udcca','Dashboard & Omzet','Ringkasan performa',"go('ownerDash')")+
      mtile('\ud83e\uddfe','Transaksi','Riwayat order & bayar',"go('ownerTrx')")+
      mtile('\u2699\ufe0f','Layanan & Harga','Kelola paket laundry',"go('ownerLayanan')")+
      mtile('\ud83d\udc65','Data Karyawan','Staf & kinerja',"go('ownerKaryawan')")+
      mtile('\ud83d\udcc8','Laporan Keuangan','Pemasukan & rekap',"go('ownerLaporan')")+
      mtile('\ud83c\udfea','Cabang & Franchise','Outlet & mitra',"go('ownerCabang')")+
    '</div>';
}
function ownerDash(el){
  const all = Store.getAll();
  const omzet = all.filter(o=>o.paid).reduce((s,o)=>s+(Number(o.price)||0),0);
  const totalKg = Math.round(all.reduce((s,o)=>s+(Number(o.weight)||0),0));
  const selesai = all.filter(o=>o.status==='selesai').length;
  const aktif = all.filter(o=>o.status!=='selesai').length;
  el.innerHTML = backbar('Dashboard & Omzet')+'<div style="padding:14px">'+
    '<div class="omzet"><div class="lbl">Total Omzet (demo)</div><div class="big">'+rp(omzet)+'</div><div class="sub">'+all.length+' order \u2022 '+totalKg+' kg diproses</div></div>'+
    '<div class="stats" style="padding:0"><div class="stat"><div class="n">'+aktif+'</div><div class="l">Order Aktif</div></div>'+
      '<div class="stat"><div class="n">'+selesai+'</div><div class="l">Selesai</div></div>'+
      '<div class="stat"><div class="n">'+totalKg+'</div><div class="l">Total kg</div></div>'+
      '<div class="stat hl"><div class="n">'+all.length+'</div><div class="l">Total Order</div></div></div>'+
    '<div style="font-weight:800;margin:16px 0 8px">Status Order</div>'+
    STATUS.map(s=>{ const c=all.filter(o=>o.status===s).length; const pct=all.length?Math.round(c/all.length*100):0;
      return '<div class="listrow" style="display:block"><div style="display:flex;justify-content:space-between"><div class="l">'+STLABEL[s]+'</div><div class="r">'+c+'</div></div><div class="bar"><span style="width:'+pct+'%"></span></div></div>';
    }).join('')+
    '</div>';
}
function ownerTrx(el){
  const all = Store.getAll();
  el.innerHTML = backbar('Transaksi')+'<div style="padding:14px">'+
    (all.length?all.map(o=>'<div class="listrow"><div><div class="l">#'+o.id+' \u2022 '+esc(o.customer)+'</div><div class="s">'+esc(o.service)+' \u2022 '+STLABEL[o.status]+'</div></div><div class="r">'+rp(o.price)+(o.paid?' \u2705':' \u23f3')+'</div></div>').join(''):'<div class="empty">Belum ada transaksi</div>')+
    '</div>';
}
function ownerLayanan(el){
  const svc=[['Cuci Setrika','Rp 7.000/kg'],['Cuci Kering','Rp 5.000/kg'],['Setrika Saja','Rp 4.000/kg'],['Express 6 Jam','+50% dari tarif'],['Cuci Sepatu','Rp 25.000/pasang'],['Bed Cover','Rp 20.000/pcs']];
  el.innerHTML = backbar('Kelola Layanan & Harga')+'<div style="padding:14px">'+
    svc.map(s=>'<div class="listrow"><div class="l">'+s[0]+'</div><div class="r">'+s[1]+'</div></div>').join('')+
    '<button class="btn primary full" style="margin-top:6px" onclick="showToast(\'Tambah layanan (demo)\')">+ Tambah Layanan</button>'+
    '</div>';
}
function ownerKaryawan(el){
  const list = Object.keys(STAFF).filter(k=>STAFF[k].role==='karyawan'||STAFF[k].role==='monitor');
  el.innerHTML = backbar('Data Karyawan')+'<div style="padding:14px">'+
    list.map(k=>{ const s=STAFF[k]; return '<div class="listrow"><div><div class="l">'+esc(s.name)+'</div><div class="s">@'+k+' \u2022 '+roleLabel(s.role)+'</div></div><div class="r">Aktif</div></div>'; }).join('')+
    '<button class="btn primary full" style="margin-top:6px" onclick="showToast(\'Tambah karyawan (demo)\')">+ Tambah Karyawan</button>'+
    '</div>';
}
function ownerLaporan(el){
  const all = Store.getAll();
  const omzet = all.filter(o=>o.paid).reduce((s,o)=>s+(Number(o.price)||0),0);
  const lunas = all.filter(o=>o.paid).length, belum = all.filter(o=>!o.paid).length;
  el.innerHTML = backbar('Laporan Keuangan')+'<div style="padding:14px">'+
    '<div class="omzet"><div class="lbl">Pemasukan (Lunas)</div><div class="big">'+rp(omzet)+'</div><div class="sub">'+lunas+' lunas \u2022 '+belum+' belum bayar</div></div>'+
    '<div class="kpi"><div class="k"><div class="n">'+lunas+'</div><div class="l">Order Lunas</div></div><div class="k"><div class="n">'+belum+'</div><div class="l">Belum Bayar</div></div></div>'+
    '<div style="font-weight:800;margin:16px 0 8px">Rekap 7 Hari (demo)</div>'+
    [['Sen','Rp 420.000'],['Sel','Rp 385.000'],['Rab','Rp 510.000'],['Kam','Rp 298.000'],['Jum','Rp 640.000'],['Sab','Rp 720.000'],['Min','Rp 305.000']].map(d=>'<div class="listrow"><div class="l">'+d[0]+'</div><div class="r">'+d[1]+'</div></div>').join('')+
    '</div>';
}
function ownerCabang(el){
  const cab=[['Cabang Utama','Jl. Merdeka No.1','Aktif'],['Cabang Sudirman','Jl. Sudirman 45','Aktif'],['Mitra Franchise \u2014 Griya','Perum Griya B2','Mitra']];
  el.innerHTML = backbar('Cabang & Franchise')+'<div style="padding:14px">'+
    cab.map(c=>'<div class="listrow"><div><div class="l">'+c[0]+'</div><div class="s">'+c[1]+'</div></div><div class="r">'+c[2]+'</div></div>').join('')+
    '<button class="btn primary full" style="margin-top:6px" onclick="showToast(\'Ajukan cabang/franchise baru (demo)\')">+ Cabang / Franchise</button>'+
    '</div>';
}

/* ============ MONITOR ============ */
let lastCount = {p:0,d:0};
function flash(){ const f=document.getElementById('flash'); f.classList.add('on'); setTimeout(()=>f.classList.remove('on'),400); }
function renderMonitor(){
  const all = Store.getAll();
  const pickup = all.filter(o=>o.status==='menunggu_pickup').sort((a,b)=>a.createdAt-b.createdAt);
  const deliver = all.filter(o=>o.status==='siap_kirim').sort((a,b)=>a.createdAt-b.createdAt);
  if(pickup.length>lastCount.p || deliver.length>lastCount.d) flash();
  lastCount = {p:pickup.length, d:deliver.length};
  const mp=document.getElementById('monPickup'), md=document.getElementById('monDeliver');
  if(!mp||!md) return;
  mp.innerHTML = pickup.length ? pickup.map(o=>{
    const mins=Math.floor((Date.now()-o.createdAt)/60000);
    return '<div class="mrow '+(mins>30?'urgent':'')+'"><div><div class="oid">#'+o.id+' \u2014 '+esc(o.customer)+'</div><div class="meta">'+esc(o.service)+' \u2022 '+esc(o.pickupAddr)+'</div></div><div class="agebadge">'+timeAgo(o.createdAt)+'</div></div>';
  }).join('') : '<div class="monempty">Tidak ada cucian menunggu dijemput</div>';
  md.innerHTML = deliver.length ? deliver.map(o=>'<div class="mrow"><div><div class="oid">#'+o.id+' \u2014 '+esc(o.customer)+'</div><div class="meta">'+esc(o.service)+' \u2022 '+esc(o.deliverAddr||o.pickupAddr)+'</div></div><div class="agebadge">Siap Kirim</div></div>').join('') : '<div class="monempty">Tidak ada cucian siap diantar</div>';
}
function tickClock(){ const e=document.getElementById('monClock'); if(e) e.textContent = new Date().toLocaleTimeString('id-ID'); const a=document.getElementById('absClock'); if(a) a.textContent=new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}); }
setInterval(tickClock,1000); tickClock();
setInterval(()=>{ if(session && session.role==='monitor') renderMonitor(); }, 5000);

/* ---------- LIVE REFRESH ---------- */
function refreshCurrent(){
  if(!session) return;
  if(session.role==='monitor'){ renderMonitor(); return; }
  // re-render current karyawan/owner view (kecuali numpad supaya buffer gak reset)
  if(view!=='timbang') render();
}

/* ---------- expose ---------- */
window.doLogin=doLogin; window.doLogout=doLogout; window.setDriverTab=setDriverTab;
window.go=go; window.back=back; window.advance=advance;
window.wKey=wKey; window.wPhoto=wPhoto; window.saveWeight=saveWeight;
window.clockIn=clockIn; window.clockOut=clockOut; window.showToast=showToast;

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
