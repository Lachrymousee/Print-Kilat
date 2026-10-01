# Print Kilat (prototype)

Platform antar-jemput print: pelanggan upload dokumen → atur cetak → bayar QRIS (dummy) → pantau kurir.
Staf punya login sendiri: **admin** (dashboard pesanan & pendapatan) dan **kurir** (tugas pengantaran).
Murni HTML + CSS + JavaScript, tanpa build step, tanpa server.

## Struktur folder

```
print-kilat/
├── index.html        Landing + tombol "Mulai pesanan" (link "Masuk staf" ada di footer)
├── order.html        Form tujuan, upload + preview, detail cetak, ringkasan, popup QRIS
├── tracking.html     Pelacakan pesanan untuk pelanggan
├── login.html        Login staf (admin / kurir)
├── admin.html        Dashboard admin
├── courier.html      Dashboard kurir
├── css/
│   ├── style.css     Gaya umum (token warna di bagian atas)
│   └── staff.css     Gaya login, admin, kurir
├── js/
│   ├── config.js     Harga, kampus, radius, AKUN STAF  ← ubah di sini
│   ├── db.js         Penyimpanan pesanan + alur status (localStorage)
│   ├── auth.js       Login/logout/guard staf
│   ├── pricing.js    Rumus harga (dipakai order & data contoh admin)
│   ├── preview.js    Preview PDF (pdf.js) & DOCX (mammoth.js)
│   ├── order.js      Logika halaman pemesanan
│   ├── tracking.js   Pelacakan pelanggan (mengikuti aksi kurir)
│   ├── login.js  admin.js  courier.js  landing.js
└── assets/logo.svg
```

## Akun demo (ubah di js/config.js)

| Peran | Username        | Password   |
| ----- | --------------- | ---------- |
| Admin | `admin`         | `admin123` |
| Kurir | `kurir1` / `kurir2` | `kurir123` |

Daftar ini juga tampil di halaman login selama `showDemoLoginHint: true`. **Ubah ke `false` sebelum dipublikasikan.**

## Alur status pesanan

`Menunggu pembayaran → Pembayaran diterima → Sedang dicetak → Diambil kurir → Dalam perjalanan → Selesai`

- Pesanan dibuat sebagai _Menunggu pembayaran_ saat popup QRIS muncul. Jika pelanggan batal, pesanan tetap terlihat di admin.
- Setelah "bayar", pesanan muncul di dashboard kurir. Kurir pertama yang menekan tombol "mengklaim" pesanan itu;
  kurir lain tidak melihatnya lagi.
- Empat tombol kurir: Mulai cetak dokumen → Ambil hasil cetak → Mulai antar → Tandai sudah sampai.
  (Tahap cetak dikerjakan kurir karena baru ada dua peran. Bisa dipisah jadi peran operator printer nanti.)
- Halaman pelacakan pelanggan ikut berubah mengikuti tombol kurir.
- Pendapatan di admin = jumlah total semua pesanan yang sudah dibayar (tidak termasuk _Menunggu pembayaran_).

## Cara mencoba semua peran sekaligus

Login staf memakai `sessionStorage`, jadi berlaku per tab. Buka beberapa tab di browser yang SAMA:

1. Tab 1: `index.html` → pesan dan "bayar".
2. Tab 2: `login.html` → masuk sebagai kurir → tekan tombol progres.
3. Tab 3: `login.html` → masuk sebagai admin → lihat angka dan riwayat berubah.
   Tab pelacakan pelanggan akan ikut bergerak.

## Keterbatasan penting (baca sebelum dipublikasikan)

- **Login ini bukan keamanan sungguhan.** Username dan password ada di `config.js` yang bisa dibaca siapa pun
  yang membuka situsmu, dan session bisa diubah lewat DevTools. Cukup untuk demo, tidak aman untuk data nyata.
- **Data pesanan hanya ada di browser tempat pesanan dibuat** (localStorage). Admin dan kurir di perangkat lain
  tidak akan melihat pesanan pelanggan. Agar benar-benar berfungsi lintas perangkat, perlu database server (lihat bawah).
- Tombol **Isi data contoh** dan **Hapus semua data** di dashboard admin ada untuk demo.
- Pembayaran QRIS, jarak awal, data kurir (plat nomor), dan hapus file 1×24 jam masih simulasi.
- File dokumen tidak diunggah ke mana pun; hanya nama, ukuran, dan jumlah halaman yang disimpan.

## Menjalankan lokal

Buka `index.html` di browser, atau jalankan `python3 -m http.server 8000` lalu buka http://localhost:8000
(fitur "Gunakan lokasiku" hanya jalan di HTTPS atau localhost).

## Deploy gratis

1. Upload semua isi folder ke repo GitHub (`index.html` di root).
2. **Netlify**: Add new site → Import from Git. Build command kosong, publish directory `/`.
   **Vercel**: Add New → Project, framework "Other", tanpa build command.

## Naik kelas: database + login sungguhan (Supabase)

Supabase gratis dan cocok untuk pemula (Postgres + Auth + Storage):

1. Tabel `orders` (kolom: id, created_at, paid_at, status, campus, address, distance_km, price, options jsonb, file jsonb, courier jsonb, history jsonb) dan bucket `documents` untuk file.
2. **Auth**: buat pengguna admin/kurir di Supabase Auth, simpan peran di tabel `profiles`. Ganti `auth.js`.
3. **Row Level Security**: pelanggan hanya boleh membuat dan membaca pesanannya sendiri; kurir hanya membaca/mengubah status;
   admin membaca semua. Inilah yang membuat keamanan nyata, bukan JavaScript di browser.
4. Ganti isi `db.js` dengan versi Supabase. Nama fungsinya (`createOrder`, `markPaid`, `advance`, `getOrder`,
   `listOrders`, `subscribe`, dll.) sudah sama dan async, jadi halaman lain tidak perlu diubah.
   `subscribe` bisa memakai Supabase Realtime.
5. Pembayaran nyata: payment gateway QRIS (Midtrans, Xendit, dll.) butuh backend kecil untuk membuat transaksi dan
   menerima webhook. Jangan taruh secret key di JavaScript frontend.
