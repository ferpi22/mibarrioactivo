
// 1. IMPORTAR FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

// 2. CREDENCIALES DE TU PROYECTO (Reutilizamos el mismo entorno pero con nueva colección)
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

// 3. IDENTIFICADOR ÚNICO DE ESTE DISPOSITIVO (Para "Mis Reclamos")
let miDeviceId = localStorage.getItem('vecino_device_id');
if(!miDeviceId) {
    miDeviceId = 'vecino_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('vecino_device_id', miDeviceId);
}

// Historial de votos para no votar dos veces el mismo
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
    
    // Actualizar vistas si están activas
    renderFeed();
    renderMisReclamos();
    if (document.getElementById('mapSection').className.includes('section-active') && map) {
        renderMap();
    }
});

// 5. NAVEGACIÓN
window.showSection = function(sectionId) {
    ['formSection', 'feedSection', 'mapSection', 'misReclamosSection'].forEach(id => {
        document.getElementById(id).className = 'section-hidden';
    });
    document.getElementById(sectionId).className = 'section-active';
    
    // Marcar menú inferior activo
    document.querySelectorAll('.nav-item-bottom').forEach(el => el.classList.remove('active'));
    document.getElementById('nav-' + sectionId.replace('Section','')).classList.add('active');
    
    if(sectionId === 'mapSection') {
        if(!map) {
            map = L.map('map').setView([-29.4134, -66.8564], 13); 
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OS' }).addTo(map);
        }
        setTimeout(() => { map.invalidateSize(); renderMap(); }, 300);
    }
}
// Iniciar con la primera pestaña activa visualmente
document.getElementById('nav-form').classList.add('active');

// 6. GEOLOCALIZACIÓN
window.getLocation = function() {
    const status = document.getElementById('locationStatus');
    const btn = document.getElementById('btnGPS');
    status.innerText = "Buscando GPS...";
    status.className = "text-warning fw-bold";
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.getElementById('lat').value = position.coords.latitude;
                document.getElementById('lng').value = position.coords.longitude;
                status.innerText = `✅ Ubicación detectada`;
                status.className = "text-success fw-bold";
                btn.classList.replace('btn-outline-success', 'btn-success');
            },
            (error) => {
                status.innerText = "❌ Active el GPS de su celular.";
                status.className = "text-danger fw-bold";
            },
            { enableHighAccuracy: true }
        );
    }
}

// 7. COMPRIMIR FOTO (Evitar colapsar la base de datos)
document.getElementById('fotoInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 500; // Reducimos tamaño
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const base64Data = canvas.toDataURL('image/jpeg', 0.6); // Comprimir 60%
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
        estado: "Recibido 📥", // Recibido, En Revisión, En Ejecución, Solucionado
        fecha: new Date().toISOString()
    };
    
    const btnSubmit = this.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.innerText = "Enviando...";
    
    try {
        await addDoc(reclamosCiudadanosRef, record);
        alert("✅ ¡Reporte enviado correctamente! Gracias por ayudar al barrio.");
        this.reset();
        document.getElementById('fotoPreview').classList.add('d-none');
        document.getElementById('fotoBase64').value = "";
        document.getElementById('locationStatus').innerText = "⚠️ Requerido para enviar";
        document.getElementById('locationStatus').className = "text-danger fw-bold";
        document.getElementById('btnGPS').classList.replace('btn-success', 'btn-outline-success');
        showSection('misReclamosSection'); // Redirigir para que vea su estado
    } catch(err) {
        alert("Error al enviar. Intente de nuevo.");
        console.error(err);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Enviar Reporte Ciudadano";
    }
});

// 9. RENDERIZAR FEED (Muro de Vecinos)
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
        
        // Colores de estado
        let badgeColor = "bg-secondary";
        if(r.estado.includes("Revisión")) badgeColor = "bg-warning text-dark";
        if(r.estado.includes("Ejecución")) badgeColor = "bg-primary";
        if(r.estado.includes("Solucionado")) badgeColor = "bg-success";

        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <strong>${r.categoria}</strong>
                <span class="badge ${badgeColor}">${r.estado}</span>
            </div>
            <p class="mb-1 text-muted small">📝 ${r.descripcion}</p>
            <p class="mb-1 text-muted" style="font-size: 0.75rem;">📅 Reportado: ${fechaFormat}</p>
            ${fotoHtml}
            <div class="mt-3 text-end border-top pt-2">
                <button class="btn ${yaVote ? 'btn-success disabled' : 'btn-outline-success'} btn-sm btn-apoyar fw-bold" 
                        onclick="apoyarReclamo('${r.id}', ${r.apoyos})" ${yaVote ? 'disabled' : ''}>
                    👍 Apoyar Reclamo (${r.apoyos})
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
    // La vista se actualizará automáticamente gracias al onSnapshot
}

// 11. RENDERIZAR MIS RECLAMOS
function renderMisReclamos() {
    const tbody = document.getElementById('misReclamosTabla');
    tbody.innerHTML = '';
    
    let misPropios = reportesGlobales.filter(r => r.dispositivo_id === miDeviceId);
    
    if(misPropios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">No has realizado reportes.</td></tr>';
        return;
    }

    misPropios.forEach(r => {
        let badgeColor = "bg-secondary";
        if(r.estado.includes("Revisión")) badgeColor = "bg-warning text-dark";
        if(r.estado.includes("Ejecución")) badgeColor = "bg-primary";
        if(r.estado.includes("Solucionado")) badgeColor = "bg-success";

        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <b>${r.categoria}</b><br>
                <small class="text-muted">Fecha: ${new Date(r.fecha).toLocaleDateString()}</small>
            </td>
            <td class="align-middle">
                <span class="badge ${badgeColor}">${r.estado}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 12. RENDERIZAR MAPA
function renderMap() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    
    reportesGlobales.forEach(r => {
        let color = r.estado.includes("Solucionado") ? "green" : "red";
        
        // Usar un pin de color básico de leaflet (simulado con HTML/CSS si es necesario, o genérico)
        let m = L.marker([r.lat, r.lng]).addTo(map)
                 .bindPopup(`<b>${r.categoria}</b><br>Apoyos: ${r.apoyos}<br>Estado: ${r.estado}`);
        markers.push(m);
    });
}
