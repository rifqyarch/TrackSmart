let map = L.map('map').setView([-2.5, 117], 5); // posisi awal Indonesia
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let routeLayer = null;

async function cariRute() {
  const start = document.getElementById('start').value;
  const end = document.getElementById('end').value;
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
      alert('Gagal menemukan lokasi. Coba cek ejaan kota.');
      return;
    }

    const startCoord = [parseFloat(startLoc[0].lat), parseFloat(startLoc[0].lon)];
    const endCoord = [parseFloat(endLoc[0].lat), parseFloat(endLoc[0].lon)];

    const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${startCoord[1]},${startCoord[0]};${endCoord[1]},${endCoord[0]}?overview=full&geometries=geojson`);
    const routeData = await routeRes.json();

    if (!routeData.routes.length) {
      alert('Rute tidak ditemukan.');
      return;
    }

    const route = routeData.routes[0];
    const distanceKm = (route.distance / 1000).toFixed(2);
    const durationJam = (route.duration / 3600).toFixed(2);
    const biayaTotal = (beratBarang * biayaPerKg).toLocaleString();

    // Tampilkan info
    document.getElementById('info').innerHTML =
      `Jarak: ${distanceKm} km<br>` +
      `Durasi: ${durationJam} jam<br>` +
      `Berat Barang: ${beratBarang} kg<br>` +
      `Biaya Pengiriman: Rp ${biayaTotal}`;

    // Gambar rute
    if (routeLayer) map.removeLayer(routeLayer);
    routeLayer = L.geoJSON(route.geometry).addTo(map);
    map.fitBounds(routeLayer.getBounds());

    // Tambahkan penanda
    L.marker(startCoord).addTo(map).bindPopup("Awal").openPopup();
    L.marker(endCoord).addTo(map).bindPopup("Tujuan");

  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan saat memproses rute.');
  }
}
