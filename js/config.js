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
    // Ukuran kertas: mult = pengali harga terhadap A4
    sizes: {
      A5: { label: "A5 · kecil", mult: 0.6 },
      B5: { label: "B5", mult: 0.8 },
      A4: { label: "A4 · standar", mult: 1 },
      F4: { label: "F4 / Folio", mult: 1.1 },
      Letter: { label: "Letter", mult: 1 },
      A3: { label: "A3 · ukuran besar", mult: 2 },
    },
    // Jenis kertas: add = tambahan harga per halaman (sebelum pengali ukuran).
    // colorOnly / singleOnly = jenis kertas ini hanya bisa dicetak berwarna / 1 sisi.
    paperTypes: {
      hvs70: { label: "HVS 70 gsm · standar", add: 0 },
      hvs80: { label: "HVS 80 gsm", add: 100 },
      art120: { label: "Art paper 120 gsm", add: 700 },
      art150: { label: "Art paper 150 gsm", add: 1000 },
      carton260: { label: "Art carton 260 gsm · cover", add: 2000 },
      photo: {
        label: "Kertas foto glossy",
        add: 2500,
        colorOnly: true,
        singleOnly: true,
      },
    },
    // Potongan untuk cetak bolak-balik
    duplexDiscount: 0.1,
    // Harga jilid dihitung per salinan
    binding: {
      none: { label: "Tanpa jilid", price: 0 },
      staples: { label: "Staples", price: 1000 },
      spiral: { label: "Jilid spiral", price: 5000 },
    },
    deliveryFee: 5000,
    platformFee: 1000,
  },

  // ---------- Kode promo ----------
  // target : "platform" (biaya platform/admin) | "delivery" (ongkir)
  //          | "print" (biaya cetak + jilid) | "total" (seluruh tagihan)
  // type   : "percent" (value = persen) | "fixed" (value = rupiah)
  // opsional: maxDiscount (batas potongan, rupiah), minSubtotal (minimal biaya cetak + jilid),
  //           expires ("YYYY-MM-DD", berlaku sampai akhir hari itu),
  //           once (true = hanya bisa dipakai sekali per perangkat)
  // PENTING: daftar ini bisa dibaca siapa pun yang membuka situsmu dan batas pemakaian
  // hanya tercatat di browser. Cukup untuk demo; promo sungguhan harus divalidasi di server.
  promos: [
    {
      code: "HEMAT",
      label: "Gratis biaya platform",
      target: "platform",
      type: "percent",
      value: 100,
    },
    {
      code: "ONGKIR3",
      label: "Potongan ongkir Rp3.000",
      target: "delivery",
      type: "fixed",
      value: 3000,
    },
    {
      code: "KILAT10",
      label: "Diskon 10% biaya cetak (maks. Rp10.000)",
      target: "print",
      type: "percent",
      value: 10,
      maxDiscount: 10000,
      minSubtotal: 10000,
    },
    {
      code: "PERTAMA",
      label: "Potongan Rp5.000 untuk pesanan pertama",
      target: "total",
      type: "fixed",
      value: 5000,
      once: true,
    },
  ],

  maxFileMB: 10,
  maxFiles: 5, // jumlah file maksimal dalam satu pesanan
  maxCopies: 99,

  // Kontak untuk pertanyaan keamanan / permintaan hapus data (tampil di halaman keamanan.html jika diisi)
  supportContact: "",

  // Tautan sosial media di footer. Kosongkan yang tidak dipakai; ikon hanya tampil jika terisi.
  // instagram: alamat lengkap, mis. 'https://instagram.com/akunmu'
  // whatsapp : nomor dengan kode negara tanpa +, mis. '6281234567890'
  social: { instagram: "", whatsapp: "" },

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
