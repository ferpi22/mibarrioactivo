
// 1. IMPORTAR FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

// 2. CREDENCIALES
const firebaseConfig = {
  apiKey: "AIzaSyCvbpU5Ay7XUApX-L55CWjW4nSOCvPzxKg",
  authDomain: "territorio-la-rioja.firebaseapp.com",
  projectId: "territorio-la-rioja",
  storageBucket: "territorio-la-rioja.firebasestorage.app",
  messagingSenderId: "278625846524",
  appId: "1:278625846524:web:c863002c6ce33d131b4379"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const reclamosCiudadanosRef = collection(db, "reclamos_ciudadanos");

let miDeviceId = localStorage.getItem('vecino_device_id');
if(!miDeviceId) {
    miDeviceId = 'vecino_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('vecino_device_id', miDeviceId);
}

let misVotos = JSON.parse(localStorage.getItem('mis_votos')) || [];
let reportesGlobales = [];
let map = null;
let markers = [];

// 4. ESCUCHADOR EN TIEMPO REAL
const q = query(reclamosCiudadanosRef, orderBy("fecha", "desc"));
onSnapshot(q, (snapshot) => {
    reportesGlobales = [];
    snapshot.forEach((doc) => {
        reportesGlobales.push({ id: doc.id, ...doc.data() });
    });
    
    renderFeed();
    renderMisReclamos();
    
    if (document.getElementById('mapSection').className.includes('section-active') && map) {
        renderMap();
    }
    // Si el panel de admin está abierto, refrescarlo en tiempo real
    if (document.getElementById('adminDashboardSection').className.includes('section-active')) {
        renderAdmin();
    }
});

// 5. NAVEGACIÓN
window.showSection = function(sectionId) {
    ['homeSection', 'formSection', 'feedSection', 'mapSection', 'misReclamosSection', 'adminLoginSection', 'adminDashboardSection'].forEach(id => {
        document.getElementById(id).className = 'section-hidden';
    });
    document.getElementById(sectionId).className = 'section-active';
    
    document.querySelectorAll('.nav-item-bottom').forEach(el => el.classList.remove('active'));
    
    // El botón activo para Admin
    if(sectionId === 'adminLoginSection' || sectionId === 'adminDashboardSection') {
        document.getElementById('nav-adminLogin').classList.add('active');
    } else {
        let navId = 'nav-' + sectionId.replace('Section','');
        let navElement = document.getElementById(navId);
        if(navElement) navElement.classList.add('active');
    }
    
    if(sectionId === 'mapSection') {
        if(!map) {
            map = L.map('map').setView([-29.4134, -66.8564], 13); 
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
                attribution: '© OpenStreetMap' 
            }).addTo(map);
        }
        setTimeout(() => { if(map) { map.invalidateSize(); } }, 100);
        setTimeout(() => { if(map) { map.invalidateSize(); renderMap(); } }, 500);
    }
}

// 6. GEOLOCALIZACIÓN Y FOTOS (Omitido código estándar ya existente para acortar, se mantiene igual funcionalmente)
window.getLocation = function() {
    const status = document.getElementById('locationStatus');
    const btn = document.getElementById('btnGPS');
    status.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Buscando GPS...";
    status.className = "status-text fw-bold";
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.getElementById('lat').value = position.coords.latitude;
                document.getElementById('lng').value = position.coords.longitude;
                status.innerHTML = `✅ Ubicación detectada`;
                status.classList.add("success");
                btn.classList.add('active-gps');
                btn.innerHTML = `<i class="fa-solid fa-check"></i> Ubicación Lista`;
            },
            (error) => { status.innerHTML = "❌ Active el GPS de su celular."; },
            { enableHighAccuracy: true }
        );
    }
}

document.getElementById('fotoInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 500;
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const base64Data = canvas.toDataURL('image/jpeg', 0.6);
            document.getElementById('fotoBase64').value = base64Data;
            const preview = document.getElementById('fotoPreview');
            preview.src = base64Data;
            preview.classList.remove('d-none');
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
});

// ENVIO DE REPORTE
document.getElementById('reporteForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const lat = document.getElementById('lat').value;
    const lng = document.getElementById('lng').value;
    if(!lat || !lng) { alert("⚠️ Es obligatorio obtener la ubicación GPS antes de enviar."); return; }
    
    const record = {
        dispositivo_id: miDeviceId,
        categoria: document.getElementById('categoria').value,
        descripcion: document.getElementById('descripcion').value,
        foto: document.getElementById('fotoBase64').value || null,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        apoyos: 0,
        estado: "Recibido 📥",
        fecha: new Date().toISOString()
    };
    
    const btnSubmit = this.querySelector('button[type="submit"]');
    const originalText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Enviando...";
    try {
        await addDoc(reclamosCiudadanosRef, record);
        alert("✅ ¡Reporte enviado!");
        this.reset();
        document.getElementById('fotoPreview').classList.add('d-none');
        document.getElementById('fotoBase64').value = "";
        document.getElementById('locationStatus').innerHTML = "⚠️ Requerido para enviar";
        document.getElementById('locationStatus').className = "status-text fw-bold";
        const btnGPS = document.getElementById('btnGPS');
        btnGPS.classList.remove('active-gps');
        btnGPS.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> Obtener Ubicación`;
        showSection('misReclamosSection');
    } catch(err) {
        alert("Error al enviar.");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalText;
    }
});

function getStatusBadge(estado) {
    let cls = "badge-recibido";
    if(estado.includes("Revisión")) cls = "badge-revision";
    if(estado.includes("Ejecución")) cls = "badge-ejecucion";
    if(estado.includes("Solucionado")) cls = "badge-solucionado";
    return `<span class="badge-status ${cls}">${estado}</span>`;
}

// RENDER MAPA PUBLICO
function renderMap() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    reportesGlobales.forEach(r => {
        if(r.lat && r.lng) {
            let pinColor = '#9333ea';
            if(r.categoria.includes('Bache')) pinColor = '#6c757d';
            if(r.categoria.includes('Luminaria')) pinColor = '#eab308';
            if(r.categoria.includes('Basura')) pinColor = '#198754';
            if(r.categoria.includes('Agua')) pinColor = '#0ea5e9';
            if(r.categoria.includes('Arbolado')) pinColor = '#15803d';

            const customIcon = L.divIcon({
                className: 'custom-pin',
                html: `<i class="fa-solid fa-location-dot fa-2x" style="color: ${pinColor}; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.3));"></i>`,
                iconSize: [30, 42], iconAnchor: [15, 42], popupAnchor: [0, -40]
            });
            let m = L.marker([r.lat, r.lng], {icon: customIcon}).addTo(map)
                     .bindPopup(`<div style="text-align:center;"><b>${r.categoria}</b><br><span style="color:${pinColor}; font-weight:bold;">Apoyos: ${r.apoyos}</span><br><div class="mt-1">${getStatusBadge(r.estado)}</div></div>`);
            markers.push(m);
        }
    });
}

function renderFeed() {
    const feed = document.getElementById('feedContainer');
    feed.innerHTML = '';
    if(reportesGlobales.length === 0) {
        feed.innerHTML = '<div class="text-center mt-4 text-muted">Aún no hay reportes en tu ciudad.</div>';
        return;
    }
    reportesGlobales.forEach(r => {
        let yaVote = misVotos.includes(r.id);
        let card = document.createElement('div');
        card.className = 'feed-card';
        let fotoHtml = r.foto ? `<img src="${r.foto}" class="feed-foto" alt="Problema">` : '';
        let badgeHtml = getStatusBadge(r.estado);
        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <strong style="color: var(--violet-main); font-size:1.05rem;">${r.categoria}</strong>
                ${badgeHtml}
            </div>
            <p class="mb-2 text-dark small" style="font-weight:500;">"${r.descripcion}"</p>
            <p class="mb-0 text-muted" style="font-size: 0.75rem;"><i class="fa-regular fa-clock"></i> ${new Date(r.fecha).toLocaleDateString()}</p>
            ${fotoHtml}
            <div class="mt-3 text-end border-top pt-3" style="border-color: rgba(0,0,0,0.05)!important;">
                <button class="btn-apoyar" onclick="apoyarReclamo('${r.id}', ${r.apoyos})" ${yaVote ? 'disabled' : ''}>
                    ${yaVote ? '<i class="fa-solid fa-check"></i> Apoyado' : '<i class="fa-solid fa-thumbs-up"></i> Apoyar'} (${r.apoyos})
                </button>
            </div>
        `;
        feed.appendChild(card);
    });
}

window.apoyarReclamo = async function(docId, apoyosActuales) {
    if(misVotos.includes(docId)) return;
    misVotos.push(docId);
    localStorage.setItem('mis_votos', JSON.stringify(misVotos));
    const docRef = doc(db, "reclamos_ciudadanos", docId);
    await updateDoc(docRef, { apoyos: apoyosActuales + 1 });
}

function renderMisReclamos() {
    const tbody = document.getElementById('misReclamosTabla');
    tbody.innerHTML = '';
    let misPropios = reportesGlobales.filter(r => r.dispositivo_id === miDeviceId);
    misPropios.forEach(r => {
        let tr = document.createElement('tr');
        tr.innerHTML = `<td class="py-3"><div style="font-weight:600;">${r.categoria}</div><div class="text-muted" style="font-size:0.75rem;">${new Date(r.fecha).toLocaleDateString()}</div></td><td class="text-end align-middle py-3">${getStatusBadge(r.estado)}</td>`;
        tbody.appendChild(tr);
    });
}

// ---------------------------------------------------------------------------------
// MÓDULO ADMINISTRADOR EXCLUSIVO
// ---------------------------------------------------------------------------------

// Login Admin
window.loginAdmin = function(e) {
    e.preventDefault();
    const pass = document.getElementById('adminPass').value;
    
    // Contraseña establecida para el equipo de gestión
    if(pass === 'admin2026') {
        document.getElementById('adminPass').value = '';
        showSection('adminDashboardSection');
        renderAdmin();
    } else {
        alert("Contraseña incorrecta. Acceso denegado.");
    }
}

// Renderizar Panel Admin
window.renderAdmin = function() {
    const grid = document.getElementById('adminGrid');
    grid.innerHTML = '';
    
    let filtro = document.getElementById('adminFiltroCategoria').value;
    let filtrados = reportesGlobales;
    
    if(filtro !== 'TODOS') {
        filtrados = reportesGlobales.filter(r => r.categoria === filtro);
    }
    
    // Actualizar Estadísticas Rápidas
    document.getElementById('adminTotal').innerText = reportesGlobales.length;
    let resueltos = reportesGlobales.filter(r => r.estado.includes('Solucionado')).length;
    document.getElementById('adminSolucionados').innerText = resueltos;
    document.getElementById('adminPendientes').innerText = reportesGlobales.length - resueltos;

    if(filtrados.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center text-muted mt-4">No hay reclamos en esta categoría.</div>';
        return;
    }

    filtrados.forEach(r => {
        let col = document.createElement('div');
        col.className = 'col-12 col-md-6';
        
        let fotoHtml = r.foto ? 
            `<img src="${r.foto}" class="w-100 rounded mb-3 shadow-sm" style="height:200px; object-fit:cover;">` : 
            `<div class="w-100 bg-light rounded mb-3 d-flex align-items-center justify-content-center border" style="height:100px; color:#aaa;"><i class="fa-solid fa-camera-slash"></i>&nbsp; Sin Foto</div>`;
            
        // Enlace inteligente a Google Maps con las coordenadas
        let linkMapa = `https://www.google.com/maps?q=${r.lat},${r.lng}`;

        col.innerHTML = `
            <div class="glass-card admin-card p-3 h-100 d-flex flex-column bg-white">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="badge bg-dark fs-6">${r.categoria}</span>
                    <span class="badge bg-danger rounded-pill"><i class="fa-solid fa-thumbs-up"></i> ${r.apoyos}</span>
                </div>
                <div class="text-muted small mb-2"><i class="fa-regular fa-calendar"></i> ${new Date(r.fecha).toLocaleString()}</div>
                
                ${fotoHtml}
                
                <p class="small mb-3 fw-bold flex-grow-1">"${r.descripcion}"</p>
                
                <div class="d-grid mb-3">
                    <a href="${linkMapa}" target="_blank" class="btn btn-outline-primary btn-sm fw-bold">
                        <i class="fa-solid fa-location-dot"></i> Ver en Google Maps
                    </a>
                </div>
                
                <div class="p-2 rounded bg-light border">
                    <label class="small fw-bold mb-1 text-danger">Actualizar Estado del Reclamo:</label>
                    <select class="form-select admin-status-select border-danger text-dark" onchange="cambiarEstadoAdmin('${r.id}', this.value, '${r.estado}')">
                        <option value="Recibido 📥" ${r.estado.includes('Recibido') ? 'selected' : ''}>📥 Recibido (Pendiente)</option>
                        <option value="En Revisión 🔍" ${r.estado.includes('Revisión') ? 'selected' : ''}>🔍 En Revisión</option>
                        <option value="En Ejecución 🚧" ${r.estado.includes('Ejecución') ? 'selected' : ''}>🚧 En Ejecución (Cuadrilla enviada)</option>
                        <option value="Solucionado ✅" ${r.estado.includes('Solucionado') ? 'selected' : ''}>✅ Solucionado</option>
                    </select>
                </div>
            </div>
        `;
        grid.appendChild(col);
    });
}

// Cambiar estado en Base de Datos
window.cambiarEstadoAdmin = async function(docId, nuevoEstado, estadoAnterior) {
    if(confirm(`¿Estás seguro de notificar a los vecinos que el estado pasa a: ${nuevoEstado}?`)) {
        try {
            const docRef = doc(db, "reclamos_ciudadanos", docId);
            await updateDoc(docRef, { estado: nuevoEstado });
            // Se actualiza solo vía onSnapshot
        } catch(err) {
            alert("Error al actualizar la base de datos.");
            renderAdmin(); // Revertir visual si falla
        }
    } else {
        renderAdmin(); // Revertir visualmente el 'select' si cancela
    }
}
