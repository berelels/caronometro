// ==========================================
// DATA
// ==========================================
let ridesData = JSON.parse(localStorage.getItem('ridesData')) || {};
let students = JSON.parse(localStorage.getItem('students')) || [];
let routes      = JSON.parse(localStorage.getItem('routes'))      || [];
let appSettings = JSON.parse(localStorage.getItem('appSettings')) || { gasolinePrice: 6.20, carEfficiency: 10 };


let currentDate    = new Date();
let selectedDay    = null;
let selectedDriver = null;
let currentRideTripType = 'round';

const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const dayHeaders  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

// ==========================================
// SAVE
// ==========================================
function saveData() {
    localStorage.setItem('ridesData',    JSON.stringify(ridesData));
    localStorage.setItem('students',     JSON.stringify(students));
    localStorage.setItem('routes',       JSON.stringify(routes));
    localStorage.setItem('appSettings',  JSON.stringify(appSettings));
}
function getMonthKey() { return `${currentDate.getFullYear()}-${currentDate.getMonth()}`; }
function initMonthData() { const k = getMonthKey(); if (!ridesData[k]) ridesData[k] = {}; }

// ==========================================
// HELPERS
// ==========================================
function getStudentById(id) { return students.find(s => s.id === id); }
function getRouteById(id)   { return routes.find(r => r.id === id); }

/** Normalises legacy string entries to object format */
function normalizeEntry(raw) {
    if (!raw) return null;
    if (typeof raw === 'string') return { driver: raw, passengers: null, routeId: null, tripType: 'round' };
    return raw;
}

/** Returns array of passenger IDs (null → everyone except driver) */
function getPassengerIds(entry) {
    if (entry.passengers === null)
        return students.filter(s => s.id !== entry.driver).map(s => s.id);
    return entry.passengers;
}

/**
 * Cost calculation:
 *   distância total = route km × (ida+volta → 2 | 1 viagem → 1)
 *   litros usados   = distância total ÷ km por litro
 *   custo total     = litros usados × preço por litro
 *   custo/pessoa    = custo total ÷ total de pessoas (motorista + passageiros)
 */
function calculateCost(routeId, tripType, totalPeople) {
    const route = getRouteById(routeId);
    if (!route || totalPeople < 1) return null;
    const distTotal  = route.distanceKm * (tripType === 'round' ? 2 : 1);
    const litros     = distTotal / appSettings.carEfficiency;
    const total      = litros * appSettings.gasolinePrice;
    return { total, perPerson: total / totalPeople, distTotal, litros };
}

function formatBRL(v) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

// ==========================================
// TAB NAVIGATION
// ==========================================
function switchTab(tab) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const pane = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    const btn  = document.getElementById('nav'  + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (pane) pane.classList.add('active');
    if (btn)  btn.classList.add('active');
    if (tab === 'routes') renderRoutesTab();
    if (tab === 'stats')  renderStatsTab();
    if (tab === 'about')  renderAboutTab();
}

// ==========================================
// CALENDAR
// ==========================================
function generateCalendar() {
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';
    document.getElementById('currentMonth').textContent =
        `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    dayHeaders.forEach(d => {
        const h = document.createElement('div');
        h.className = 'day-header';
        h.textContent = d;
        calendar.appendChild(h);
    });

    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today       = new Date();

    initMonthData();
    const monthKey = getMonthKey();

    for (let i = 0; i < firstDay; i++) {
        const e = document.createElement('div');
        e.className = 'day-cell empty';
        calendar.appendChild(e);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell';

        const numSpan = document.createElement('span');
        numSpan.className = 'day-number';
        numSpan.textContent = day;
        cell.appendChild(numSpan);

        if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate())
            cell.classList.add('today');

        const rawEntry = ridesData[monthKey]?.[day];
        if (rawEntry) {
            const entry  = normalizeEntry(rawEntry);
            const driver = getStudentById(entry.driver);
            if (driver) {
                cell.classList.add('has-ride');
                cell.style.backgroundColor = driver.color;

                const passengerIds = getPassengerIds(entry);
                const allIds       = students.filter(s => s.id !== entry.driver).map(s => s.id);
                const isPartial    = entry.passengers !== null && passengerIds.length < allIds.length;

                if (isPartial && passengerIds.length > 0) {
                    const bubblesDiv = document.createElement('div');
                    bubblesDiv.className = 'passenger-bubbles';
                    passengerIds.slice(0, 4).forEach(pid => {
                        const s = getStudentById(pid);
                        if (!s) return;
                        const b = document.createElement('div');
                        b.className = 'bubble';
                        b.style.backgroundColor = s.color;
                        b.title = s.name;
                        bubblesDiv.appendChild(b);
                    });
                    cell.appendChild(bubblesDiv);
                }
            }
        }

        cell.addEventListener('click', () => openRideModal(day));
        calendar.appendChild(cell);
    }

    renderStats();
}

// ==========================================
// STATS BAR (footer do calendário)
// ==========================================
function renderStats() {
    const container = document.getElementById('statsContainer');
    container.innerHTML = '';
    const monthData = ridesData[getMonthKey()] || {};
    const counts = {};
    students.forEach(s => counts[s.id] = 0);
    Object.values(monthData).forEach(raw => {
        const e = normalizeEntry(raw);
        if (e && counts[e.driver] !== undefined) counts[e.driver]++;
    });
    students.forEach(student => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.style.backgroundColor = student.color;
        card.innerHTML = `<div class="stat-name">${student.name}</div><div class="stat-count">${counts[student.id]}</div>`;
        container.appendChild(card);
    });
}

// ==========================================
// STATS TAB
// ==========================================
function renderStatsTab() {
    const monthKey  = getMonthKey();
    const monthData = ridesData[monthKey] || {};

    document.getElementById('statsMonthName').textContent =
        `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    // Per-student accumulators
    const st = {};
    students.forEach(s => st[s.id] = { total: 0, round: 0, oneWay: 0 });

    let totalRides = 0;
    let totalRound = 0;
    let totalOneWay = 0;

    Object.values(monthData).forEach(raw => {
        const e = normalizeEntry(raw);
        if (!e || !st[e.driver]) return;
        totalRides++;
        st[e.driver].total++;
        if (e.tripType === 'round') { st[e.driver].round++;  totalRound++;  }
        else                        { st[e.driver].oneWay++; totalOneWay++; }
    });

    // Totals grid
    document.getElementById('statsTotals').innerHTML = `
        <div class="total-pill total-pill-primary">
            <span class="tp-num">${totalRides}</span>
            <span class="tp-label">Caronas no mês</span>
        </div>
        <div class="total-pill total-pill-round">
            <span class="tp-num">${totalRound}</span>
            <span class="tp-label">Ida e Volta</span>
        </div>
        <div class="total-pill total-pill-one">
            <span class="tp-num">${totalOneWay}</span>
            <span class="tp-label">1 Viagem</span>
        </div>
    `;

    // Ranking
    const sorted  = [...students].sort((a, b) => st[b.id].total - st[a.id].total);
    const maxRides = Math.max(...students.map(s => st[s.id].total), 1);
    const medals   = ['🥇', '🥈', '🥉'];

    const rankingEl = document.getElementById('statsRanking');
    if (totalRides === 0) {
        rankingEl.innerHTML = '<p class="empty-hint">Nenhuma carona registrada neste mês ainda.</p>';
    } else {
        rankingEl.innerHTML = sorted.map((student, idx) => {
            const s   = st[student.id];
            const pct = (s.total / maxRides) * 100;
            return `
                <div class="ranking-item">
                    <div class="ranking-header">
                        <span class="ranking-medal">${medals[idx] || `${idx + 1}º`}</span>
                        <div class="ranking-dot" style="background:${student.color}"></div>
                        <span class="ranking-name">${student.name}</span>
                        <span class="ranking-count">${s.total} carona${s.total !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="ranking-bar-bg">
                        <div class="ranking-bar" style="width:${pct}%;background:${student.color}"></div>
                    </div>
                </div>`;
        }).join('');
    }

    // Trip breakdown
    const breakdownEl = document.getElementById('statsTripBreakdown');
    breakdownEl.innerHTML = sorted.map(student => {
        const s = st[student.id];
        if (s.total === 0) return '';
        return `
            <div class="breakdown-row">
                <div class="breakdown-who">
                    <div class="breakdown-dot" style="background:${student.color}"></div>
                    <span class="breakdown-name">${student.name}</span>
                </div>
                <div class="breakdown-tags">
                    <span class="breakdown-tag tag-round">🔄 ${s.round} Ida e Volta</span>
                    <span class="breakdown-tag tag-one">➡️ ${s.oneWay} 1 Viagem</span>
                </div>
            </div>`;
    }).join('') || '<p class="empty-hint">Nenhuma carona registrada.</p>';
}

// ==========================================
// RIDE MODAL – PASSO 1
// ==========================================
function renderModalOptions() {
    const container = document.getElementById('studentOptionsContainer');
    container.innerHTML = '';
    const arrowSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
    students.forEach(student => {
        const opt = document.createElement('div');
        opt.className = 'student-option';
        opt.style.backgroundColor = student.color;
        opt.innerHTML = `<span>🚗 ${student.name}</span>${arrowSvg}`;
        opt.onclick = () => openPassengerStep(student.id);
        container.appendChild(opt);
    });
}

function openRideModal(day) {
    selectedDay    = day;
    selectedDriver = null;
    currentRideTripType = 'round';
    document.getElementById('rideModalTitle').textContent = `Dia ${day} — Quem dirigiu?`;
    document.getElementById('modalStep1').classList.remove('step-hidden');
    document.getElementById('modalStep2').classList.add('step-hidden');
    document.getElementById('rideModal').classList.add('active');
}

// ==========================================
// RIDE MODAL – PASSO 2
// ==========================================
function openPassengerStep(driverId) {
    selectedDriver = driverId;
    const driver = getStudentById(driverId);
    document.getElementById('step2DriverName').textContent =
        `${driver?.name} dirigiu — Quem foi junto?`;

    const container = document.getElementById('passengerCheckboxes');
    container.innerHTML = '';
    const existing = normalizeEntry(ridesData[getMonthKey()]?.[selectedDay]);
    const existingPassengers = existing?.passengers ?? null;

    students.filter(s => s.id !== driverId).forEach(student => {
        const checked = existingPassengers === null || existingPassengers.includes(student.id);
        const row = document.createElement('label');
        row.className = 'passenger-row';
        row.innerHTML = `
            <input type="checkbox" class="passenger-check" value="${student.id}" ${checked ? 'checked' : ''}>
            <div class="passenger-dot" style="background-color:${student.color};"></div>
            <span>${student.name}</span>`;
        container.appendChild(row);
    });

    // Route selector
    const sel = document.getElementById('rideRouteSelect');
    sel.innerHTML = '<option value="">Nenhum (sem cálculo de custo)</option>';
    routes.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = `${r.name} (${r.distanceKm} km)`;
        if (existing?.routeId === r.id) opt.selected = true;
        sel.appendChild(opt);
    });

    currentRideTripType = existing?.tripType ?? 'round';
    updateRideTripButtons();
    updateRideCostPreview();

    document.getElementById('modalStep1').classList.add('step-hidden');
    document.getElementById('modalStep2').classList.remove('step-hidden');
}

function updateRideTripButtons() {
    document.getElementById('rideTripRound').classList.toggle('active', currentRideTripType === 'round');
    document.getElementById('rideTripOne').classList.toggle('active',   currentRideTripType === 'one-way');
}

function updateRideCostPreview() {
    const box     = document.getElementById('rideCostPreview');
    const routeId = document.getElementById('rideRouteSelect').value;
    if (!routeId) { box.style.display = 'none'; return; }

    const checked     = [...document.querySelectorAll('.passenger-check:checked')];
    const totalPeople = checked.length + 1; // +driver
    const cost        = calculateCost(routeId, currentRideTripType, totalPeople);
    if (!cost) { box.style.display = 'none'; return; }

    const route = getRouteById(routeId);
    box.style.display = 'block';
    box.innerHTML = `
        <div class="cost-row"><span>Percurso</span><strong>${route.name}</strong></div>
        <div class="cost-row"><span>Distância</span><strong>${cost.distTotal} km</strong></div>
        <div class="cost-row"><span>Litros usados</span><strong>${cost.litros.toFixed(2)} L</strong></div>
        <div class="cost-row"><span>Pessoas</span><strong>${totalPeople}</strong></div>
        <div class="cost-divider"></div>
        <div class="cost-row cost-total"><span>Total da gasolina</span><strong>${formatBRL(cost.total)}</strong></div>
        <div class="cost-row cost-per"><span>Por pessoa</span><strong>${formatBRL(cost.perPerson)}</strong></div>`;
}

function confirmRide() {
    if (selectedDay === null || !selectedDriver) return;
    initMonthData();
    const passengers = [...document.querySelectorAll('.passenger-check:checked')].map(cb => cb.value);
    const routeId    = document.getElementById('rideRouteSelect').value || null;
    ridesData[getMonthKey()][selectedDay] = {
        driver: selectedDriver,
        passengers,
        routeId,
        tripType: currentRideTripType
    };
    saveData();
    generateCalendar();
    closeAllModals();
}

function clearDay() {
    if (selectedDay === null) return;
    initMonthData();
    delete ridesData[getMonthKey()][selectedDay];
    saveData();
    generateCalendar();
    closeAllModals();
}

// ==========================================
// SETTINGS MODAL (pessoas)
// ==========================================
function renderManageList() {
    const list = document.getElementById('manageList');
    list.innerHTML = '';
    students.forEach(student => {
        const item = document.createElement('div');
        item.className = 'manage-item';
        item.innerHTML = `
            <div class="manage-item-info">
                <div class="color-dot" style="background-color:${student.color}"></div>
                <span>${student.name}</span>
            </div>
            <button class="delete-btn" onclick="deleteStudent('${student.id}')">🗑️</button>`;
        list.appendChild(item);
    });
}

function addStudent() {
    const nameInput  = document.getElementById('newStudentName');
    const colorInput = document.getElementById('newStudentColor');
    const name = nameInput.value.trim();
    if (!name) { alert('Digite um nome!'); return; }
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '') + Date.now();
    students.push({ id, name, color: colorInput.value });
    saveData();
    nameInput.value = '';
    renderManageList();
    renderModalOptions();
    generateCalendar();
}

function deleteStudent(id) {
    if (confirm('Remover esta pessoa?')) {
        students = students.filter(s => s.id !== id);
        saveData();
        renderManageList();
        renderModalOptions();
        generateCalendar();
    }
}

// ==========================================
// ROUTES TAB
// ==========================================
function renderRoutesTab() {
    document.getElementById('gasolinePriceInput').value  = appSettings.gasolinePrice;
    document.getElementById('carEfficiencyInput').value  = appSettings.carEfficiency;

    const list = document.getElementById('routesList');
    list.innerHTML = routes.length === 0
        ? '<p class="empty-hint">Nenhum percurso cadastrado ainda.</p>'
        : routes.map(route => `
            <div class="route-card">
                <div class="route-card-info">
                    <div class="route-card-name">${route.name}</div>
                    <div class="route-card-dist">${route.distanceKm} km</div>
                </div>
                <button class="delete-btn" onclick="deleteRoute('${route.id}')">🗑️</button>
            </div>`).join('');

    const calcSel = document.getElementById('calcRouteSelect');
    const prev    = calcSel.value;
    calcSel.innerHTML = '<option value="">Selecione um percurso...</option>';
    routes.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = `${r.name} (${r.distanceKm} km)`;
        calcSel.appendChild(opt);
    });
    if (prev) calcSel.value = prev;
    updateQuickCalc();
}

function addRoute() {
    const name = document.getElementById('routeNameInput').value.trim();
    const dist = parseFloat(document.getElementById('routeDistanceInput').value);
    if (!name)           { alert('Digite o nome do percurso!'); return; }
    if (!dist || dist <= 0) { alert('Digite uma distância válida!'); return; }
    routes.push({ id: 'route-' + Date.now(), name, distanceKm: dist });
    saveData();
    document.getElementById('routeNameInput').value    = '';
    document.getElementById('routeDistanceInput').value = '';
    renderRoutesTab();
}

function deleteRoute(id) {
    if (confirm('Remover este percurso?')) {
        routes = routes.filter(r => r.id !== id);
        saveData();
        renderRoutesTab();
    }
}

function saveSettings() {
    const price = parseFloat(document.getElementById('gasolinePriceInput').value);
    const eff   = parseFloat(document.getElementById('carEfficiencyInput').value);
    if (!price || price <= 0 || !eff || eff <= 0) { alert('Preencha os valores corretamente!'); return; }
    appSettings.gasolinePrice  = price;
    appSettings.carEfficiency  = eff;
    saveData();
    updateQuickCalc();
    const btn = document.getElementById('saveSettingsBtn');
    btn.textContent = '✅ Salvo!';
    setTimeout(() => { btn.textContent = '💾 Salvar Configurações'; }, 1500);
}

let calcTripType = 'round';

function updateQuickCalc() {
    const result  = document.getElementById('calcResult');
    const routeId = document.getElementById('calcRouteSelect').value;
    const people  = parseInt(document.getElementById('calcPeople').value) || 1;
    if (!routeId) {
        result.innerHTML = '<p class="cost-hint">Selecione um percurso para ver o cálculo</p>';
        return;
    }
    const cost  = calculateCost(routeId, calcTripType, people);
    const route = getRouteById(routeId);
    if (!cost) { result.innerHTML = '<p class="cost-hint">Erro no cálculo</p>'; return; }
    result.innerHTML = `
        <div class="cost-row"><span>Percurso</span><strong>${route.name}</strong></div>
        <div class="cost-row"><span>Distância total</span><strong>${cost.distTotal} km</strong></div>
        <div class="cost-row"><span>Litros usados</span><strong>${cost.litros.toFixed(2)} L</strong></div>
        <div class="cost-row"><span>Pessoas</span><strong>${people}</strong></div>
        <div class="cost-divider"></div>
        <div class="cost-row cost-total"><span>Total da gasolina</span><strong>${formatBRL(cost.total)}</strong></div>
        <div class="cost-row cost-per"><span>Por pessoa</span><strong>${formatBRL(cost.perPerson)}</strong></div>`;
}

// ==========================================
// ABOUT TAB
// ==========================================
function renderAboutTab() {
    // Nothing dynamic to render — support link is hardcoded
}

// ==========================================
// MODAL HELPERS
// ==========================================
function closeAllModals() {
    document.getElementById('rideModal').classList.remove('active');
    document.getElementById('settingsModal').classList.remove('active');
    selectedDay = null;
    selectedDriver = null;
}

function clearMonth() {
    if (confirm('Limpar todas as caronas deste mês?')) {
        ridesData[getMonthKey()] = {};
        saveData();
        generateCalendar();
    }
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    generateCalendar();
    // also refresh stats tab if visible
    const statsPane = document.getElementById('tabStats');
    if (statsPane.classList.contains('active')) renderStatsTab();
}

// ==========================================
// EVENT LISTENERS
// ==========================================

// Calendar
document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
document.getElementById('clearMonth').addEventListener('click', clearMonth);

// Stats month nav (synced with calendar)
document.getElementById('statsPrevMonth').addEventListener('click', () => changeMonth(-1));
document.getElementById('statsNextMonth').addEventListener('click', () => changeMonth(1));

// Ride modal
document.getElementById('clearDayOption').addEventListener('click', clearDay);
document.getElementById('confirmRideBtn').addEventListener('click', confirmRide);
document.getElementById('backToStep1').addEventListener('click', () => {
    document.getElementById('modalStep1').classList.remove('step-hidden');
    document.getElementById('modalStep2').classList.add('step-hidden');
});
document.getElementById('toggleAllPassengers').addEventListener('click', () => {
    const boxes    = document.querySelectorAll('.passenger-check');
    const allCheck = [...boxes].every(b => b.checked);
    boxes.forEach(b => { b.checked = !allCheck; });
    updateRideCostPreview();
});
document.getElementById('rideTripRound').addEventListener('click', () => {
    currentRideTripType = 'round';
    updateRideTripButtons();
    updateRideCostPreview();
});
document.getElementById('rideTripOne').addEventListener('click', () => {
    currentRideTripType = 'one-way';
    updateRideTripButtons();
    updateRideCostPreview();
});
document.getElementById('rideRouteSelect').addEventListener('change', updateRideCostPreview);
document.getElementById('passengerCheckboxes').addEventListener('change', updateRideCostPreview);

// Quick calc
document.getElementById('calcTripRound').addEventListener('click', () => {
    calcTripType = 'round';
    document.getElementById('calcTripRound').classList.add('active');
    document.getElementById('calcTripOne').classList.remove('active');
    updateQuickCalc();
});
document.getElementById('calcTripOne').addEventListener('click', () => {
    calcTripType = 'one-way';
    document.getElementById('calcTripOne').classList.add('active');
    document.getElementById('calcTripRound').classList.remove('active');
    updateQuickCalc();
});
document.getElementById('calcRouteSelect').addEventListener('change', updateQuickCalc);
document.getElementById('calcPeople').addEventListener('input', updateQuickCalc);

// Settings modal
document.getElementById('openSettings').addEventListener('click', () => {
    renderManageList();
    document.getElementById('settingsModal').classList.add('active');
});
document.getElementById('closeSettingsModal').addEventListener('click', closeAllModals);
document.getElementById('addStudentBtn').addEventListener('click', addStudent);
document.getElementById('newStudentName').addEventListener('keydown', e => { if (e.key === 'Enter') addStudent(); });

// Routes tab
document.getElementById('addRouteBtn').addEventListener('click', addRoute);
document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

// About tab


// Bottom nav
document.getElementById('navCalendar').addEventListener('click', () => switchTab('calendar'));
document.getElementById('navStats').addEventListener('click',    () => switchTab('stats'));
document.getElementById('navRoutes').addEventListener('click',   () => switchTab('routes'));
document.getElementById('navAbout').addEventListener('click',    () => switchTab('about'));

// Close modals on outside click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target.classList.contains('modal-overlay')) closeAllModals();
    });
});

// ==========================================
// INIT
// ==========================================
renderModalOptions();
generateCalendar();