let map = L.map('map').setView([-2.5, 117], 5); // posisi awal Indonesia

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let routeLayer = null;
let startMarker = null;
let endMarker = null;
let trukMarker = null;
let animasiInterval = null;

// Ikon truk
const trukIcon = L.icon({
  iconUrl: 'Icon Truck.png', // Pastikan file ini ada
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

async function cariRute() {
  const start = document.getElementById('start').value.trim();
  const end = document.getElementById('end').value.trim();
  const beratBarang = parseFloat(document.getElementById('berat').value);
  const biayaPerKg = parseFloat(document.getElementById('biaya').value);

  if (!start || !end || isNaN(beratBarang) || isNaN(biayaPerKg)) {
    alert('Harap isi lokasi awal, tujuan, berat barang, dan biaya per kg!');
    return;
  }

  try {
    const [startLoc, endLoc] = await Promise.all([
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(start)}`).then(res => res.json()),
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(end)}`).then(res => res.json())
    ]);

    if (!startLoc.length || !endLoc.length) {
      alert('Gagal menemukan lokasi. Periksa kembali nama kota atau lokasi.');
      return;
    }

    const startCoord = [parseFloat(startLoc[0].lat), parseFloat(startLoc[0].lon)];
    const endCoord = [parseFloat(endLoc[0].lat), parseFloat(endLoc[0].lon)];

    const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${startCoord[1]},${startCoord[0]};${endCoord[1]},${endCoord[0]}?overview=full&geometries=geojson`);
    const routeData = await routeRes.json();

    if (!routeData.routes.length) {
      alert('Rute tidak ditemukan. Silakan coba lokasi lain.');
      return;
    }

    const route = routeData.routes[0];
    const coords = route.geometry.coordinates.map(c => [c[1], c[0]]); // [lat, lon]
    const distanceKm = (route.distance / 1000).toFixed(2);
    const durationJam = (route.duration / 3600).toFixed(2);
    const biayaTotal = (beratBarang * biayaPerKg).toLocaleString('id-ID');

    // Tampilkan info
    document.getElementById('info').innerHTML = `
      <p>🧭 <strong>Jarak:</strong> ${distanceKm} km</p>
      <p>⏱️ <strong>Durasi:</strong> ${durationJam} jam</p>
      <p>📦 <strong>Berat Barang:</strong> ${beratBarang} kg</p>
      <p>💸 <strong>Biaya Pengiriman:</strong> Rp ${biayaTotal}</p>
    `;

    // Bersihkan layer dan marker sebelumnya
    if (routeLayer) map.removeLayer(routeLayer);
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);
    if (trukMarker) map.removeLayer(trukMarker);
    if (animasiInterval) clearInterval(animasiInterval);

    // Gambar rute
    routeLayer = L.geoJSON(route.geometry).addTo(map);
    map.fitBounds(routeLayer.getBounds());

    // Tambahkan marker tetap
    startMarker = L.marker(startCoord).addTo(map).bindPopup(`<b>Awal</b><br>${start}`);
    endMarker = L.marker(endCoord).addTo(map).bindPopup(`<b>Tujuan</b><br>${end}`);

    // Tambahkan marker truk dengan animasi
    let index = 0;
    trukMarker = L.marker(coords[0], { icon: trukIcon }).addTo(map).bindPopup("🚛 Truk Berangkat").openPopup();

    animasiInterval = setInterval(() => {
      index++;
      if (index >= coords.length) {
        clearInterval(animasiInterval);
        trukMarker.bindPopup("📍 Truk Tiba di Tujuan").openPopup();
        return;
      }
      trukMarker.setLatLng(coords[index]);
    }, 80); // kecepatan animasi (semakin kecil = semakin cepat)

  } catch (err) {
    console.error('Terjadi kesalahan:', err);
    alert('Terjadi kesalahan saat memproses rute. Periksa koneksi internet Anda.');
  }
}
