/**
 * Mr Spin Laundry - Data Layer (Store)
 * ------------------------------------
 * Ini "jembatan" data antar 4 app: Customer, Driver, Outlet Dashboard, Monitor TV.
 * SEKARANG: pakai localStorage (per-browser) sebagai simulasi database, biar
 * bisa demo alur real-time (buka beberapa tab = beberapa "device" berbeda).
 * NANTI: cukup ganti isi fungsi di bawah ini jadi fetch() ke REST API backend
 * asli + WebSocket buat live update — struktur/nama fungsi TIDAK perlu diubah
 * di sisi app lain (index.html, driver.html, outlet.html, monitor.html).
 *
 * STATUS FLOW ORDER:
 *  menunggu_pickup -> dijemput -> proses_cuci -> siap_kirim -> selesai
 */
const STORE_KEY = 'mrspin_orders_v1';

function _read() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
  catch (e) { return []; }
}
function _write(list) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('mrspin:update'));
}

const Store = {
  STATUS_LABEL: {
    menunggu_pickup: 'Menunggu Dijemput',
    dijemput: 'Dijemput Kurir',
    proses_cuci: 'Sedang Dicuci',
    siap_kirim: 'Siap Diantar',
    selesai: 'Selesai'
  },

  getAll() { return _read(); },

  find(id) { return _read().find(o => o.id === id); },

  add(order) {
    const list = _read();
    list.unshift(order);
    _write(list);
    return order;
  },

  update(id, patch) {
    const list = _read();
    const idx = list.findIndex(o => o.id === id);
    if (idx > -1) {
      list[idx] = Object.assign({}, list[idx], patch, { updatedAt: Date.now() });
      _write(list);
      return list[idx];
    }
    return null;
  },

  byStatus(status) { return _read().filter(o => o.status === status); },

  // Cross-tab (real device simulation) + same-tab update listener
  subscribe(cb) {
    window.addEventListener('storage', e => { if (e.key === STORE_KEY) cb(_read()); });
    window.addEventListener('mrspin:update', () => cb(_read()));
  },

  // Seed dummy orders on first load so Driver/Outlet/Monitor aren't empty
  // before a real customer order is placed during demo.
  seed() {
    if (_read().length === 0) {
      const now = Date.now();
      _write([
        { id: 'SPIN1042', customer: 'Budi Santoso', phone: '0812-3456-7890', service: 'Cuci Setrika', weight: 4.5, price: 31500, outlet: 'Outlet Merdeka', pickupAddr: 'Jl. Merdeka No.12, Jambi', deliverAddr: 'Jl. Merdeka No.12, Jambi', paid: true, status: 'menunggu_pickup', createdAt: now - 20 * 60000 },
        { id: 'SPIN1041', customer: 'Sinta Dewi', phone: '0813-2211-8890', service: 'Express 6 Jam', weight: 2, price: 24000, outlet: 'Outlet Merdeka', pickupAddr: 'Jl. Sudirman No.5, Jambi', deliverAddr: 'Jl. Sudirman No.5, Jambi', paid: true, status: 'dijemput', createdAt: now - 55 * 60000 },
        { id: 'SPIN1039', customer: 'Rian Hidayat', phone: '0821-9987-1122', service: 'Cuci Kering', weight: 6, price: 21000, outlet: 'Outlet Merdeka', pickupAddr: 'Jl. Gajah Mada No.7, Jambi', deliverAddr: 'Jl. Gajah Mada No.7, Jambi', paid: true, status: 'proses_cuci', createdAt: now - 120 * 60000 },
        { id: 'SPIN1035', customer: 'Nadia Ayu', phone: '0852-4400-7712', service: 'Cuci Setrika', weight: 3, price: 21000, outlet: 'Outlet Merdeka', pickupAddr: 'Jl. Ahmad Yani No.9, Jambi', deliverAddr: 'Jl. Ahmad Yani No.9, Jambi', paid: true, status: 'siap_kirim', createdAt: now - 180 * 60000 }
      ]);
    }
  }
};
