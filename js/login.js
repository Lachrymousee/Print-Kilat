/* Print Kilat — halaman login staf */
(() => {
  'use strict';
  const C = window.KILAT_CONFIG;
  const $ = (s) => document.querySelector(s);

  // Sudah login? langsung ke dashboard sesuai peran.
  const existing = window.KilatAuth.current();
  if (existing) { window.location.replace(window.KilatAuth.home(existing.role)); return; }

  const form = $('#loginForm'), err = $('#loginError');
  const user = $('#username'), pass = $('#password');

  $('#pwToggle').addEventListener('click', (e) => {
    const show = pass.type === 'password';
    pass.type = show ? 'text' : 'password';
    e.currentTarget.textContent = show ? 'Sembunyi' : 'Lihat';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    if (!user.value.trim() || !pass.value) {
      err.textContent = 'Isi username dan password dulu.';
      err.hidden = false;
      (user.value.trim() ? pass : user).focus();
      return;
    }
    const btn = $('#btnLogin');
    btn.disabled = true;
    await new Promise((r) => setTimeout(r, 400)); // jeda singkat agar terasa seperti proses login
    const session = window.KilatAuth.login(user.value, pass.value);
    if (!session) {
      btn.disabled = false;
      err.textContent = 'Username atau password salah. Periksa lagi lalu coba masuk.';
      err.hidden = false;
      pass.select();
      return;
    }
    window.location.href = window.KilatAuth.home(session.role);
  });

  if (C.showDemoLoginHint) {
    $('#demoHint').hidden = false;
    $('#demoList').innerHTML = C.staff.map((s) =>
      `<li><span>${s.role === 'admin' ? 'Admin' : 'Kurir'} · <code>${s.username}</code> / <code>${s.password}</code></span>` +
      `<button type="button" data-u="${s.username}" data-p="${s.password}">Isi</button></li>`).join('');
    $('#demoList').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-u]');
      if (!b) return;
      user.value = b.dataset.u;
      pass.value = b.dataset.p;
      $('#btnLogin').focus();
    });
  }
})();
