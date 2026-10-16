
// 1. BASE DE DATOS ESTRUCTURADA DE LA RIOJA (Datos reales aproximados para gráficos)
const dptosData = [
    { id: 1, nombre: "Capital", cabecera: "La Rioja", intendente: "Armando Molina", pob: 215000, sup: 13638, lat: -29.4134, lng: -66.8564 },
    { id: 2, nombre: "Chilecito", cabecera: "Chilecito", intendente: "Rodrigo Brizuela y Doria", pob: 50000, sup: 4815, lat: -29.1619, lng: -67.4953 },
    { id: 3, nombre: "Arauco", cabecera: "Aimogasta", intendente: "Virginia López", pob: 15400, sup: 1992, lat: -28.5615, lng: -66.8066 },
    { id: 4, nombre: "Rosario Vera Peñaloza", cabecera: "Chepes", intendente: "Laura Carrizo", pob: 14000, sup: 6114, lat: -31.3396, lng: -66.5985 },
    { id: 5, nombre: "Chamical", cabecera: "Chamical", intendente: "Dora Rodríguez", pob: 14100, sup: 5549, lat: -30.3601, lng: -66.3140 },
    { id: 6, nombre: "Gral. Felipe Varela", cabecera: "Villa Unión", intendente: "Yamil Sarruff", pob: 9600, sup: 9184, lat: -29.2785, lng: -68.2274 },
    { id: 7, nombre: "Gral. Belgrano", cabecera: "Olta", intendente: "Carlos Romero", pob: 7300, sup: 2556, lat: -30.6318, lng: -66.2625 },
    { id: 8, nombre: "Famatina", cabecera: "Famatina", intendente: "Alberto Godoy", pob: 5800, sup: 4587, lat: -28.9248, lng: -67.5204 },
    { id: 9, nombre: "Gral. Ocampo", cabecera: "Villa Santa Rita de Catuna", intendente: "Jorge Salomón", pob: 7100, sup: 2135, lat: -30.9575, lng: -66.2081 },
    { id: 10, nombre: "Gral. San Martín", cabecera: "Ulapes", intendente: "Uriel Pérez", pob: 4900, sup: 5034, lat: -31.5721, lng: -66.2415 },
    { id: 11, nombre: "Castro Barros", cabecera: "Aminga", intendente: "Marcelo del Moral", pob: 4200, sup: 1420, lat: -28.8475, lng: -66.9452 },
    { id: 12, nombre: "San Blas de los Sauces", cabecera: "San Blas", intendente: "Antonio Sotomayor", pob: 3900, sup: 1590, lat: -28.4116, lng: -67.0945 },
    { id: 13, nombre: "Gral. J.F. Quiroga", cabecera: "Malanzán", intendente: "Ariel Bejarano", pob: 4100, sup: 3584, lat: -30.8228, lng: -66.6025 },
    { id: 14, nombre: "Vinchina", cabecera: "Villa San José de Vinchina", intendente: "Adriana Olima", pob: 2700, sup: 10334, lat: -28.7562, lng: -68.1995 },
    { id: 15, nombre: "Sanagasta", cabecera: "Villa Sanagasta", intendente: "Federico Sbiroli", pob: 2300, sup: 1711, lat: -29.3006, lng: -67.0425 },
    { id: 16, nombre: "Gral. Ángel V. Peñaloza", cabecera: "Tama", intendente: "Ricardo Romero", pob: 3000, sup: 3106, lat: -30.5057, lng: -66.5411 },
    { id: 17, nombre: "Independencia", cabecera: "Patquía", intendente: "Eduardo de la Vega", pob: 2400, sup: 7120, lat: -30.0435, lng: -66.8837 },
    { id: 18, nombre: "Gral. Lamadrid", cabecera: "Villa Castelli", intendente: "Luis Orquera", pob: 1700, sup: 6179, lat: -29.0157, lng: -68.2234 }
];

// Variables Globales
let map;
let markers = [];
let chartPob = null;
let chartSup = null;

const totalPob = dptosData.reduce((acc, curr) => acc + curr.pob, 0);
const promPob = Math.round(totalPob / 18);
const totalSup = dptosData.reduce((acc, curr) => acc + curr.sup, 0);

// 2. INICIALIZAR MAPA (Leaflet) - CON FIX DE RENDERIZADO
function initMap() {
    map = L.map('map').setView([-30.0000, -67.0000], 7);
    
    // FIX MAPA: Cambiado a OpenStreetMap estándar (CartoDB a veces falla o es bloqueado)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const customIcon = L.divIcon({
        className: 'custom-pin',
        html: '<i class="fa-solid fa-location-dot fa-2x" style="color: #4338ca; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));"></i>',
        iconSize: [30, 42], iconAnchor: [15, 42], popupAnchor: [0, -40]
    });

    dptosData.forEach(dpto => {
        let m = L.marker([dpto.lat, dpto.lng], {icon: customIcon}).addTo(map);
        m.bindPopup(`
            <div class="text-center">
                <h6 class="fw-bold mb-1 text-primary">${dpto.nombre}</h6>
                <p class="small text-muted mb-2">${dpto.cabecera}</p>
                <button class="btn btn-sm btn-primary rounded-pill px-3" onclick="seleccionarDpto(${dpto.id})">Ver Análisis</button>
            </div>
        `);
        markers.push({ id: dpto.id, marker: m });
    });

    // FIX MAPA: Forzar a Leaflet a recalcular el tamaño del contenedor tras cargar el DOM
    setTimeout(() => {
        map.invalidateSize();
    }, 500);
}

// 3. RENDERIZAR TABLA / BUSCADOR
function renderTabla(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    data.sort((a,b) => a.nombre.localeCompare(b.nombre)).forEach(dpto => {
        let tr = document.createElement('tr');
        tr.id = `row-${dpto.id}`;
        tr.onclick = () => seleccionarDpto(dpto.id);
        tr.innerHTML = `
            <td class="ps-4 fw-bold text-dark">${dpto.nombre}</td>
            <td class="text-muted small">${dpto.cabecera}</td>
            <td class="text-end pe-4"><i class="fa-solid fa-chevron-right text-muted"></i></td>
        `;
        tbody.appendChild(tr);
    });
}

window.filtrarTabla = function() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const filtrados = dptosData.filter(d => 
        d.nombre.toLowerCase().includes(q) || d.cabecera.toLowerCase().includes(q)
    );
    renderTabla(filtrados);
}

// 4. SELECCIONAR Y ACTUALIZAR DASHBOARD
window.seleccionarDpto = function(id) {
    const dpto = dptosData.find(d => d.id === id);
    if(!dpto) return;

    document.querySelectorAll('#tableBody tr').forEach(tr => tr.classList.remove('active-row'));
    const activeRow = document.getElementById(`row-${id}`);
    if(activeRow) activeRow.classList.add('active-row');

    map.flyTo([dpto.lat, dpto.lng], 9, { duration: 1 });
    const targetMarker = markers.find(m => m.id === id).marker;
    targetMarker.openPopup();

    document.getElementById('empty-state').classList.add('d-none');
    document.getElementById('data-dashboard').classList.remove('d-none');

    document.getElementById('dash-nombre').innerText = dpto.nombre;
    document.getElementById('dash-cabecera').innerText = dpto.cabecera;
    document.getElementById('dash-intendente').innerText = dpto.intendente;
    document.getElementById('dash-pob').innerText = dpto.pob.toLocaleString('es-AR');
    document.getElementById('dash-sup').innerText = dpto.sup.toLocaleString('es-AR');
    
    let densidad = (dpto.pob / dpto.sup).toFixed(2);
    document.getElementById('dash-den').innerText = densidad;

    renderCharts(dpto);
    
    if(window.innerWidth < 992) {
        document.getElementById('dashboard-section').scrollIntoView({behavior: 'smooth'});
    }
}

// 5. RENDERIZAR GRÁFICOS (Chart.js)
function renderCharts(dpto) {
    if(chartPob) chartPob.destroy();
    if(chartSup) chartSup.destroy();

    const ctxPob = document.getElementById('chartPoblacion').getContext('2d');
    chartPob = new Chart(ctxPob, {
        type: 'bar',
        data: {
            labels: [dpto.nombre, 'Promedio Prov.'],
            datasets: [{
                label: 'Habitantes',
                data: [dpto.pob, promPob],
                backgroundColor: ['#4338ca', '#94a3b8'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });

    const ctxSup = document.getElementById('chartSuperficie').getContext('2d');
    let restoSup = totalSup - dpto.sup;
    let porcentaje = ((dpto.sup / totalSup) * 100).toFixed(1);
    
    chartSup = new Chart(ctxSup, {
        type: 'doughnut',
        data: {
            labels: [`${dpto.nombre} (${porcentaje}%)`, 'Resto Provincia'],
            datasets: [{
                data: [dpto.sup, restoSup],
                backgroundColor: ['#14b8a6', '#e2e8f0'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '70%',
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    renderTabla(dptosData);
});
