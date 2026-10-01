/* ============================================================
   Print Kilat — login staf (PROTOTYPE, hanya di sisi browser)
   Session disimpan di sessionStorage: berlaku per tab, hilang saat tab ditutup.
   Jadi admin dan kurir bisa login bersamaan di dua tab berbeda untuk demo.

   PERINGATAN: ini bukan keamanan sungguhan. Siapa pun bisa membaca daftar
   akun di config.js dan mengubah sessionStorage lewat DevTools.
   Untuk produksi gunakan autentikasi server (Supabase Auth, Firebase Auth, dll.)
   ============================================================ */
window.KilatAuth = (() => {
  const KEY = 'printkilat.session.v1';
  const C = window.KILAT_CONFIG;

  const current = () => {
    try { return JSON.parse(sessionStorage.getItem(KEY)); }
    catch { return null; }
  };

  return {
    current,
    home: (role) => (role === 'admin' ? 'admin.html' : 'courier.html'),

    login(username, password) {
      const u = C.staff.find((s) => s.username === String(username).trim().toLowerCase() && s.password === password);
      if (!u) return null;
      const session = { username: u.username, role: u.role, name: u.name, label: u.label };
      sessionStorage.setItem(KEY, JSON.stringify(session));
      return session;
    },

    logout() {
      sessionStorage.removeItem(KEY);
      window.location.replace('login.html');
    },

    /** Panggil di <head> halaman terlindungi. Mengalihkan ke login bila peran tidak sesuai. */
    guard(role) {
      const s = current();
      if (!s || s.role !== role) {
        window.location.replace('login.html');
        return null;
      }
      return s;
    }
  };
})();
