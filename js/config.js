/* ============================================================
   Print Kilat — konfigurasi
   Ubah harga, titik kampus, dan radius di SINI saja.
   Semua halaman membaca angka dari file ini.
   ============================================================ */
window.KILAT_CONFIG = {
  brand: "Print Kilat",

  // Radius layanan dari titik kampus (km)
  radiusKm: 1,

  // Estimasi pengantaran (prototype):
  // jarak jalan ≈ jarak garis lurus × roadFactor, kecepatan kurir rata-rata,
  // ditambah waktu siap-antar (mencetak + serah terima ke kurir).
  roadFactor: 1.25,
  courierKmh: 12,
  prepMinutes: 7,

  // Tambah kampus baru = tambah satu objek di sini (tidak perlu ubah kode lain).
  // lat/lng adalah titik perkiraan, silakan disesuaikan.
  // defaultDistanceKm dipakai sebelum pelanggan membagikan lokasinya.
  campuses: [
    {
      id: "binus-anggrek",
      name: "BINUS University - Anggrek",
      address: "Jl. Kebon Jeruk Raya No. 27, Kemanggisan",
      lat: -6.2016,
      lng: 106.7815,
      defaultDistanceKm: 0.6,
    },
    {
      id: "binus-syahdan",
      name: "BINUS University - Syahdan",
      address: "Jl. K.H. Syahdan No. 9, Palmerah",
      lat: -6.2013,
      lng: 106.7845,
      defaultDistanceKm: 0.7,
    },
  ],

  pricing: {
    // Harga per halaman untuk kertas A4, 1 sisi
    perPage: { bw: 500, color: 1500 },
    // Pengali harga menurut ukuran kertas
    sizeMultiplier: { A5: 0.6, A4: 1, A3: 2 },
    // Potongan untuk cetak bolak-balik
    duplexDiscount: 0.1,
    // Harga jilid dihitung per salinan
    binding: {
      none: { label: "Tanpa jilid", price: 0 },
      staples: { label: "Staples", price: 2000 },
      spiral: { label: "Jilid spiral", price: 7000 },
    },
    deliveryFee: 6000,
    platformFee: 2000,
  },

  maxFileMB: 10,
  maxCopies: 99,

  // ---------- Akun staf (PROTOTYPE) ----------
  // PENTING: file ini bisa dibaca siapa pun yang membuka situsmu, jadi login ini
  // hanya pemisah tampilan untuk demo, BUKAN keamanan sungguhan.
  // Untuk produksi, pindahkan ke autentikasi server (mis. Supabase Auth).
  showDemoLoginHint: true, // tampilkan daftar akun demo di halaman login. Ubah ke false sebelum dipublikasikan.
  staff: [
    {
      username: "admin",
      password: "admin123",
      role: "admin",
      name: "Admin Print Kilat",
      label: "Admin Print Kilat",
    },
    {
      username: "kurir1",
      password: "kurir123",
      role: "courier",
      name: "Kurir 1",
      label: "Kurir 1 · Kurir Print Kilat",
    },
    {
      username: "kurir2",
      password: "kurir123",
      role: "courier",
      name: "Kurir 2",
      label: "Kurir 2 · Kurir Print Kilat",
    },
  ],

  statusLabels: {
    pending: "Menunggu pembayaran",
    paid: "Pembayaran diterima",
    printing: "Sedang dicetak",
    picked_up: "Diambil kurir",
    on_the_way: "Dalam perjalanan",
    delivered: "Selesai",
  },
};
