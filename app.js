
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

// 3. IDENTIFICADOR ÚNICO DEL DISPOSITIVO
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
});

// 5. NAVEGACIÓN
window.showSection = function(sectionId) {
    ['homeSection', 'formSection', 'feedSection', 'mapSection', 'misReclamosSection'].forEach(id => {
        document.getElementById(id).className = 'section-hidden';
    });
    document.getElementById(sectionId).className = 'section-active';
    
    // Marcar menú inferior activo
    document.querySelectorAll('.nav-item-bottom').forEach(el => el.classList.remove('active'));
    // Si entramos a subsecciones, iluminamos su ícono correspondiente, sino el home
    let navId = 'nav-' + sectionId.replace('Section','');
    let navElement = document.getElementById(navId);
    if(navElement) navElement.classList.add('active');
    
    // Iniciar Mapa solo cuando se muestra
    if(sectionId === 'mapSection') {
        if(!map) {
            map = L.map('map').setView([-29.4134, -66.8564], 13); 
            // Capa clara estilo "Glass"
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { 
                attribution: '© OpenStreetMap' 
            }).addTo(map);
        }
        setTimeout(() => { map.invalidateSize(); renderMap(); }, 300);
    }
}

// 6. GEOLOCALIZACIÓN
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
            (error) => {
                status.innerHTML = "❌ Active el GPS de su celular.";
            },
            { enableHighAccuracy: true }
        );
    }
}

// 7. COMPRIMIR FOTO
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

// 8. ENVIAR REPORTE
document.getElementById('reporteForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const lat = document.getElementById('lat').value;
    const lng = document.getElementById('lng').value;
    
    if(!lat || !lng) {
        alert("⚠️ Es obligatorio obtener la ubicación GPS antes de enviar.");
        return;
    }
    
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
        alert("✅ ¡Reporte enviado! Gracias por mejorar tu barrio.");
        
        // Reset form visual
        this.reset();
        document.getElementById('fotoPreview').classList.add('d-none');
        document.getElementById('fotoBase64').value = "";
        
        const locStatus = document.getElementById('locationStatus');
        locStatus.innerHTML = "⚠️ Requerido para enviar";
        locStatus.className = "status-text fw-bold";
        
        const btnGPS = document.getElementById('btnGPS');
        btnGPS.classList.remove('active-gps');
        btnGPS.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> Obtener Ubicación`;
        
        showSection('misReclamosSection');
    } catch(err) {
        alert("Error al enviar. Intente de nuevo.");
        console.error(err);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalText;
    }
});

// Helper para colores de estado
function getStatusBadge(estado) {
    let cls = "badge-recibido";
    if(estado.includes("Revisión")) cls = "badge-revision";
    if(estado.includes("Ejecución")) cls = "badge-ejecucion";
    if(estado.includes("Solucionado")) cls = "badge-solucionado";
    return `<span class="badge-status ${cls}">${estado}</span>`;
}

// 9. RENDERIZAR FEED (Muro)
function renderFeed() {
    const feed = document.getElementById('feedContainer');
    feed.innerHTML = '';
    
    if(reportesGlobales.length === 0) {
        feed.innerHTML = '<div class="text-center mt-4 text-muted">Aún no hay reportes en tu ciudad. ¡Sé el primero!</div>';
        return;
    }

    reportesGlobales.forEach(r => {
        let yaVote = misVotos.includes(r.id);
        let card = document.createElement('div');
        card.className = 'feed-card';
        
        let fechaFormat = new Date(r.fecha).toLocaleDateString();
        let fotoHtml = r.foto ? `<img src="${r.foto}" class="feed-foto" alt="Problema">` : '';
        let badgeHtml = getStatusBadge(r.estado);

        // Icono dinámico según categoría
        let iconCat = '<i class="fa-solid fa-circle-exclamation text-danger"></i>';
        if(r.categoria.includes('Bache')) iconCat = '<i class="fa-solid fa-road text-secondary"></i>';
        if(r.categoria.includes('Luminaria')) iconCat = '<i class="fa-solid fa-lightbulb text-warning"></i>';
        if(r.categoria.includes('Basura')) iconCat = '<i class="fa-solid fa-trash text-success"></i>';
        if(r.categoria.includes('Agua')) iconCat = '<i class="fa-solid fa-droplet text-info"></i>';
        if(r.categoria.includes('Arbolado')) iconCat = '<i class="fa-solid fa-tree text-success"></i>';

        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <strong style="color: var(--violet-main); font-size:1.05rem;">${iconCat} ${r.categoria}</strong>
                ${badgeHtml}
            </div>
            <p class="mb-2 text-dark small" style="font-weight:500;">"${r.descripcion}"</p>
            <p class="mb-0 text-muted" style="font-size: 0.75rem;"><i class="fa-regular fa-clock"></i> Reportado: ${fechaFormat}</p>
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

// 10. FUNCION APOYAR (VOTAR)
window.apoyarReclamo = async function(docId, apoyosActuales) {
    if(misVotos.includes(docId)) return;
    
    misVotos.push(docId);
    localStorage.setItem('mis_votos', JSON.stringify(misVotos));
    
    const docRef = doc(db, "reclamos_ciudadanos", docId);
    await updateDoc(docRef, { apoyos: apoyosActuales + 1 });
}

// 11. RENDERIZAR MIS RECLAMOS
function renderMisReclamos() {
    const tbody = document.getElementById('misReclamosTabla');
    tbody.innerHTML = '';
    
    let misPropios = reportesGlobales.filter(r => r.dispositivo_id === miDeviceId);
    
    if(misPropios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted py-4">Aún no realizaste ningún reporte.</td></tr>';
        return;
    }

    misPropios.forEach(r => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="py-3">
                <div style="font-weight:600;">${r.categoria}</div>
                <div class="text-muted" style="font-size:0.75rem;"><i class="fa-regular fa-calendar"></i> ${new Date(r.fecha).toLocaleDateString()}</div>
            </td>
            <td class="text-end align-middle py-3">
                ${getStatusBadge(r.estado)}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 12. RENDERIZAR MAPA
function renderMap() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    
    // Icono violeta personalizado
    const customIcon = L.divIcon({
        className: 'custom-pin',
        html: '<i class="fa-solid fa-location-dot fa-2x" style="color: #9333ea; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.3));"></i>',
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -40]
    });

    reportesGlobales.forEach(r => {
        let m = L.marker([r.lat, r.lng], {icon: customIcon}).addTo(map)
                 .bindPopup(`<div style="text-align:center;"><b>${r.categoria}</b><br><span style="color:#6b21a8;">Apoyos: ${r.apoyos}</span><br>${getStatusBadge(r.estado)}</div>`);
        markers.push(m);
    });
}
