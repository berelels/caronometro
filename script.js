// Data storage - Now using LocalStorage automatically
let ridesData = JSON.parse(localStorage.getItem('ridesData')) || {};

// Dynamic Students System
let students = JSON.parse(localStorage.getItem('students')) || [
    { id: 'camila', name: 'Camila', color: '#84cc16' },
    { id: 'luna', name: 'Luna', color: '#ec4899' },
    { id: 'manu', name: 'Manu', color: '#ef4444' }
];

let currentDate = new Date(); // Pega a data, mês e ano atuais automaticamente
let selectedDay = null;

const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const dayHeaders = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Save Functions
function saveData() {
    localStorage.setItem('ridesData', JSON.stringify(ridesData));
    localStorage.setItem('students', JSON.stringify(students));
}

function getMonthKey() {
    return `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
}

function initMonthData() {
    const key = getMonthKey();
    if (!ridesData[key]) { ridesData[key] = {}; }
}

// Find student object by ID
function getStudentById(id) {
    return students.find(s => s.id === id);
}

// Render functions (Dynamic DOM creation)
function renderUI() {
    generateCalendar();
    renderStats();
    renderModalOptions();
    renderManageList();
}

function renderStats() {
    const container = document.getElementById('statsContainer');
    container.innerHTML = '';

    const monthKey = getMonthKey();
    const monthData = ridesData[monthKey] || {};

    // Count rides
    const counts = {};
    students.forEach(s => counts[s.id] = 0);
    Object.values(monthData).forEach(studentId => {
        if (counts[studentId] !== undefined) counts[studentId]++;
    });

    // Build UI
    students.forEach(student => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.style.backgroundColor = student.color;
        card.innerHTML = `
            <div class="stat-name">${student.name}</div>
            <div class="stat-count">${counts[student.id]}</div>
        `;
        container.appendChild(card);
    });
}

function renderModalOptions() {
    const container = document.getElementById('studentOptionsContainer');
    container.innerHTML = '';

    // SVG seta padronizada para as opções
    const arrowSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;

    students.forEach(student => {
        const option = document.createElement('div');
        option.className = 'student-option';
        option.style.backgroundColor = student.color;
        option.innerHTML = `
            <span>🚗 ${student.name}</span>
            ${arrowSvg}
        `;
        option.onclick = () => setRide(student.id);
        container.appendChild(option);
    });
}

function renderManageList() {
    const list = document.getElementById('manageList');
    list.innerHTML = '';

    students.forEach(student => {
        const item = document.createElement('div');
        item.className = 'manage-item';
        item.innerHTML = `
            <div class="manage-item-info">
                <div class="color-dot" style="background-color: ${student.color}"></div>
                <span>${student.name}</span>
            </div>
            <button class="delete-btn" onclick="deleteStudent('${student.id}')" title="Remover">🗑️</button>
        `;
        list.appendChild(item);
    });
}

function generateCalendar() {
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';

    document.getElementById('currentMonth').textContent =
        `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'day-header';
        header.textContent = day;
        calendar.appendChild(header);
    });

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    initMonthData();
    const monthKey = getMonthKey();

    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell empty';
        calendar.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        dayCell.textContent = day;

        if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
            dayCell.classList.add('today');
        }

        if (ridesData[monthKey] && ridesData[monthKey][day]) {
            const studentId = ridesData[monthKey][day];
            const student = getStudentById(studentId);

            if (student) {
                dayCell.classList.add('has-ride');
                dayCell.style.backgroundColor = student.color;
            }
        }

        dayCell.addEventListener('click', () => openRideModal(day));
        calendar.appendChild(dayCell);
    }

    renderStats(); // Update stats whenever calendar is drawn
}

// Modal Handlers
function openRideModal(day) {
    selectedDay = day;
    document.getElementById('rideModal').classList.add('active');
}

function closeAllModals() {
    document.getElementById('rideModal').classList.remove('active');
    document.getElementById('settingsModal').classList.remove('active');
    selectedDay = null;
}

function setRide(studentId) {
    if (selectedDay === null) return;
    const monthKey = getMonthKey();
    initMonthData();

    if (studentId) {
        ridesData[monthKey][selectedDay] = studentId;
    } else {
        delete ridesData[monthKey][selectedDay];
    }

    saveData();
    generateCalendar();
    closeAllModals();
}

// Student Management Actions
function addStudent() {
    const nameInput = document.getElementById('newStudentName');
    const colorInput = document.getElementById('newStudentColor');
    const name = nameInput.value.trim();
    const color = colorInput.value;

    if (name === '') {
        alert('Digite um nome!');
        return;
    }

    // Create safe ID from name
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '') + Date.now();

    students.push({ id, name, color });
    saveData();

    nameInput.value = '';

    renderUI();
}

function deleteStudent(id) {
    if (confirm('Remover esta pessoa? Isso não apaga o histórico dela, mas ela sumirá da lista.')) {
        students = students.filter(s => s.id !== id);
        saveData();
        renderUI();
    }
}

function clearMonth() {
    if (confirm('Tem certeza que deseja limpar todas as caronas deste mês?')) {
        const monthKey = getMonthKey();
        ridesData[monthKey] = {};
        saveData();
        generateCalendar();
    }
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    generateCalendar();
}

// Event Listeners
document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
document.getElementById('clearMonth').addEventListener('click', clearMonth);
document.getElementById('clearDayOption').addEventListener('click', () => setRide(null));

// Settings Listeners
document.getElementById('openSettings').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.add('active');
});
document.getElementById('closeSettingsModal').addEventListener('click', closeAllModals);
document.getElementById('addStudentBtn').addEventListener('click', addStudent);

// Close modals when clicking outside
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeAllModals();
        }
    });
});

// Initial Startup
renderUI();