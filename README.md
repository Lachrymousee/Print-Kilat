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
├── keamanan.html     Penjelasan jaminan keamanan (apa yang aktif vs rencana)
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
│   ├── pricing.js    Rumus harga per file + total pesanan
│   ├── footer.js     Footer bersama (3 kolom tautan, ajakan memesan, sosial, bar legal)
│   ├── range.js      Parser rentang halaman ("1-5, 8, 11-13")
│   ├── orderview.js  Pembantu tampilan pesanan multi-file (admin, kurir, pelacakan)
│   ├── preview.js    Preview PDF (pdf.js) & DOCX (mammoth.js)
│   ├── order.js      Logika halaman pemesanan
│   ├── tracking.js   Pelacakan pelanggan (mengikuti aksi kurir)
│   ├── login.js  admin.js  courier.js  landing.js
└── assets
    ├── logo.svg
    ├── sepeda.jpg
```

## Fitur pemesanan (hasil masukan responden)

- **Banyak file**: sampai `maxFiles` (default 5) PDF/DOCX per pesanan. Tiap file punya kartu preview sendiri.
- **Rentang halaman**: kolom "Halaman yang dicetak" per file, contoh `1-5, 8, 11-13`. Kosong = semua halaman.
  Nomor di luar jumlah halaman, rentang terbalik, atau format salah akan ditolak dengan pesan jelas. Harga mengikuti jumlah halaman yang dicetak.
- **Pengaturan per file**: warna, sisi, ukuran kertas, jenis kertas, jilid, salinan. Saat ada lebih dari satu file muncul tab pemilih file dan tombol "Terapkan ke semua file".
  File berikutnya mewarisi pengaturan terakhir.
- **Ukuran kertas**: A5, B5, A4, F4/Folio, Letter, A3. **Jenis kertas**: HVS 70/80 gsm, art paper 120/150 gsm, art carton 260 gsm, kertas foto glossy.
  Semua harganya ada di `js/config.js` (`pricing.sizes` dan `pricing.paperTypes`). Kertas foto otomatis hanya berwarna dan 1 sisi (`colorOnly`, `singleOnly`).
- Ongkir dan biaya platform dihitung **sekali per pesanan**, bukan per file.
- Harga di `config.js` adalah contoh karangan. Sesuaikan dengan harga mitra percetakanmu.

## Keamanan

- **Kode serah terima 4 digit**: dibuat acak saat pembayaran, tampil hanya di halaman pelacakan pelanggan, TIDAK tampil di dashboard kurir atau admin.
  Kurir tidak bisa menandai "sudah sampai" tanpa kode yang benar.
- **keamanan.html** membedakan dengan jujur yang **sudah aktif** di prototype dan yang **baru rencana versi rilis**
  (penyimpanan terenkripsi, hapus otomatis 24 jam, akses file per petugas, amplop tertutup, dll.).
  Jangan ubah label "Rencana" menjadi "Aktif" sebelum fiturnya benar-benar ada.
- Isi `supportContact` di `config.js` agar kontak untuk pertanyaan keamanan/hapus data tampil di halaman keamanan.
- Data pesanan versi sebelumnya (kunci `printkilat.orders.v2`) tidak ikut terbawa karena struktur pesanan berubah. Percobaan lama di browser akan tampak kosong.

## Footer

Satu sumber di `js/footer.js`, dipakai beranda, pesan, pelacakan, dan keamanan (halaman staf tidak memakainya).

- Tautan ada di array `columns` pada `footer.js`: Layanan, Keamanan & privasi, Bantuan & staf.
- Isi `supportContact` (email) dan `social` (`instagram` URL lengkap, `whatsapp` nomor tanpa +) di `js/config.js`.
  Ikon dan tautan "Hubungi kami" hanya tampil jika diisi, jadi tidak ada tombol kosong.
- Tahun hak cipta terisi otomatis. Tanpa JavaScript, tampil versi tautan sederhana.

## Akun demo (ubah di js/config.js)

| Peran | Username            | Password   |
| ----- | ------------------- | ---------- |
| Admin | `admin`             | `admin123` |
| Kurir | `kurir1` / `kurir2` | `kurir123` |

Daftar ini juga tampil di halaman login selama `showDemoLoginHint: true`. **Ubah ke `false` sebelum dipublikasikan.**

## Alur status pesanan

`Menunggu pembayaran → Pembayaran diterima → Sedang dicetak → Diambil kurir → Dalam perjalanan → Selesai`

- Pesanan dibuat sebagai _Menunggu pembayaran_ saat popup QRIS muncul. Jika pelanggan batal, pesanan tetap terlihat di admin.
- Setelah "bayar", pesanan muncul di dashboard kurir. Kurir pertama yang menekan tombol "mengklaim" pesanan itu;
  kurir lain tidak melihatnya lagi.
- Empat tombol kurir: Mulai cetak dokumen → Ambil hasil cetak → Mulai antar → Tandai sudah sampai (tahap terakhir meminta kode serah terima dari penerima).
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
- File dokumen tidak diunggah ke mana pun; hanya nama, ukuran, jumlah halaman, rentang, dan pengaturan cetak yang disimpan. Artinya kurir di prototype ini belum bisa membuka file pelanggan.
