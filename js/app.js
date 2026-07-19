// js/app.js - Versão Completa com Filtro e Exportação CSV

// ============================================
// PARTE 1: STORAGE
// ============================================

class Storage {
    constructor() {
        this.key = 'finance_data';
    }

    getData() {
        try {
            const data = localStorage.getItem(this.key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Erro ao ler dados:', e);
            return null;
        }
    }

    saveData(data) {
        try {
            localStorage.setItem(this.key, JSON.stringify(data));
        } catch (e) {
            console.error('Erro ao salvar dados:', e);
        }
    }

    getConfig() {
        const data = this.getData();
        return data ? data.config : null;
    }

    saveConfig(config) {
        const data = this.getData() || { transactions: [] };
        data.config = config;
        this.saveData(data);
    }

    getTransactions() {
        const data = this.getData();
        return data ? data.transactions : [];
    }

    saveTransaction(transaction) {
        const data = this.getData() || { config: null };
        if (!data.transactions) data.transactions = [];
        data.transactions.push(transaction);
        this.saveData(data);
    }

    updateTransaction(id, updatedFields) {
        const data = this.getData();
        if (!data) return;
        const index = data.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            data.transactions[index] = { ...data.transactions[index], ...updatedFields };
            this.saveData(data);
        }
    }

    deleteTransaction(id) {
        const data = this.getData();
        if (!data) return;
        data.transactions = data.transactions.filter(t => t.id !== id);
        this.saveData(data);
    }

    resetApp() {
        localStorage.removeItem(this.key);
    }
}

const storage = new Storage();

const themeSettings = {
    key: 'finance_theme',
    default: 'light'
};

function setTheme(theme) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem(themeSettings.key, theme);

    const button = document.getElementById('theme-toggle');
    if (button) {
        button.textContent = theme === 'dark' ? '☀️' : '🌙';
        button.title = theme === 'dark' ? 'Modo claro' : 'Modo escuro';
    }
}

function loadTheme() {
    const saved = localStorage.getItem(themeSettings.key) || themeSettings.default;
    setTheme(saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || themeSettings.default;
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
}

class Analytics {
    constructor(transactions, config) {
        this.transactions = transactions || [];
        this.config = config || { rate: 0, daysWorked: 0 };
    }

    parseDate(dateString) {
        const [day, month, year] = dateString.split('/');
        return new Date(`${year}-${month}-${day}`);
    }

    getMonthKey(dateString) {
        const [day, month, year] = dateString.split('/');
        return `${year}-${month.padStart(2, '0')}`;
    }

    getSpendingTrend() {
        const monthlyData = {};
        const monthKeys = new Set();
        const currentMonth = this.getMonthKey(new Date().toLocaleDateString('pt-BR'));
        monthKeys.add(currentMonth);

        [...this.transactions]
            .filter(t => t.type === 'personal_discount')
            .sort((a, b) => this.parseDate(a.date) - this.parseDate(b.date))
            .forEach(t => {
                const month = this.getMonthKey(t.date);
                monthKeys.add(month);
                if (!monthlyData[month]) {
                    monthlyData[month] = { discounts: 0, gross: 0 };
                }
                monthlyData[month].discounts += t.amount;
            });

        const grossValue = this.config.rate * (this.config.daysWorked || 0);

        Array.from(monthKeys)
            .sort()
            .forEach(month => {
                if (!monthlyData[month]) {
                    monthlyData[month] = { discounts: 0, gross: 0 };
                }
                monthlyData[month].gross = grossValue;
            });

        return monthlyData;
    }

    getTopCategories(limit = 5) {
        const categories = {};

        this.transactions
            .filter(t => t.type === 'personal_discount')
            .forEach(t => {
                const category = t.description ? t.description.trim() : 'Outros';
                const key = category || 'Outros';

                if (!categories[key]) {
                    categories[key] = { count: 0, total: 0 };
                }
                categories[key].count += 1;
                categories[key].total += t.amount;
            });

        return Object.entries(categories)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, limit);
    }

    calculateCurrentBalance() {
        const gross = this.config.rate * (this.config.daysWorked || 0);

        const discounts = this.transactions
            .filter(t => t.type === 'personal_discount')
            .reduce((sum, t) => sum + t.amount, 0);

        const received = this.transactions
            .filter(t => t.type === 'third_party' && t.status === 'received')
            .reduce((sum, t) => sum + t.amount, 0);

        return gross - discounts + received;
    }

    getDailyAverage() {
        const discounts = this.transactions
            .filter(t => t.type === 'personal_discount')
            .reduce((sum, t) => sum + t.amount, 0);

        const days = this.config.daysWorked || 1;
        return discounts / days;
    }
}


class NotificationSystem {
    constructor() {
        this.permission = 'default';
        this.init();
    }

    init() {
        if ('Notification' in window) {
            this.permission = Notification.permission;
        }
    }

    async requestPermission() {
        if ('Notification' in window && this.permission === 'default') {
            this.permission = await Notification.requestPermission();
        }
        return this.permission === 'granted';
    }

    send({ title, body, icon = '📱' }) {
        if (!('Notification' in window)) {
            console.log(`🔔 ${title}: ${body}`);
            return;
        }

        if (this.permission === 'granted') {
            new Notification(title, {
                body,
                icon,
                tag: Date.now().toString(),
                requireInteraction: true
            });
        } else {
            console.log(`🔔 ${title}: ${body}`);
        }
    }

    getTodayTransactions(transactions) {
        const today = new Date().toLocaleDateString('pt-BR');
        return transactions.filter(t => t.date === today);
    }

    isOverdue(date) {
        const [day, month, year] = date.split('/');
        const transactionDate = new Date(`${year}-${month}-${day}`);
        const now = new Date();
        const diffDays = Math.floor((now - transactionDate) / (1000 * 60 * 60 * 24));
        return diffDays > 7;
    }

    notifyLowBalance(balance, threshold = 100) {
        if (balance < threshold) {
            this.send({
                title: '⚠️ Saldo Baixo',
                body: `Seu saldo atual é R$ ${balance.toFixed(2)}. Considere reduzir gastos.`,
                icon: '🔴'
            });
        }
    }

    notifyDueThirdParty(transactions) {
        const due = transactions.filter(t =>
            t.type === 'third_party' &&
            t.status === 'pending' &&
            this.isOverdue(t.date)
        );

        if (due.length > 0) {
            this.send({
                title: '💰 Pagamentos Pendentes',
                body: `Você tem ${due.length} pagamentos atrasados.`,
                icon: '📢'
            });
        }
    }

    notifyDailyReport(balance, transactions) {
        const today = this.getTodayTransactions(transactions);
        if (today.length > 0) {
            const total = today.reduce((sum, t) => sum + t.amount, 0);
            this.send({
                title: `📊 Movimentações de Hoje (${today.length})`,
                body: `Total: R$ ${total.toFixed(2)} | Saldo: R$ ${balance.toFixed(2)}`,
                icon: '📊'
            });
        }
    }
}

class DataSync {
    constructor(storage) {
        this.storage = storage;
        this.backupInterval = null;
    }

    enableAutoBackup(intervalMinutes = 60) {
        this.createBackup();
        this.backupInterval = setInterval(() => {
            this.createBackup();
        }, intervalMinutes * 60 * 1000);
    }

    disableAutoBackup() {
        if (this.backupInterval) {
            clearInterval(this.backupInterval);
            this.backupInterval = null;
        }
    }

    createBackup() {
        const data = this.storage.getData();
        if (!data) return;

        const backup = {
            ...data,
            backupDate: new Date().toISOString(),
            version: '1.0'
        };

        try {
            localStorage.setItem('finance_backup', JSON.stringify(backup));
            console.log('💾 Backup automático realizado');
        } catch (e) {
            console.error('❌ Erro no backup:', e);
        }
    }

    restoreBackup() {
        try {
            const backup = localStorage.getItem('finance_backup');
            if (!backup) {
                return { success: false, message: 'Nenhum backup encontrado' };
            }

            const data = JSON.parse(backup);
            if (!data.config || !data.transactions) {
                return { success: false, message: 'Backup inválido' };
            }

            this.storage.saveData({
                config: data.config,
                transactions: data.transactions
            });

            return { success: true, message: 'Backup restaurado com sucesso' };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    syncToCloud() {
        console.log('☁️ Sincronizando com a nuvem...');
    }
}

const notificationSystem = new NotificationSystem();
const dataSync = new DataSync(storage);

// ============================================
// PARTE 2: STATE
// ============================================

const state = {
    config: null,
    transactions: [],
    filterType: 'all', // Filtro: 'all', 'personal_discount', 'third_party'
    searchQuery: '',
    modalType: 'personal_discount',
    modalStatus: 'pending',
    editingId: null
};

const WORKED_DAYS_STORAGE_KEY = 'workedDays';
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;

function readWorkedDays() {
    try {
        return JSON.parse(localStorage.getItem(WORKED_DAYS_STORAGE_KEY) || '{}');
    } catch (e) {
        console.error('Erro ao ler dias trabalhados:', e);
        return {};
    }
}

function writeWorkedDays(workedDays) {
    localStorage.setItem(WORKED_DAYS_STORAGE_KEY, JSON.stringify(workedDays));
}

function getMonthName(month) {
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return monthNames[month] || monthNames[0];
}

function renderCalendar(month, year) {
    const daysContainer = document.getElementById('calendar-days');
    const monthYearDisplay = document.getElementById('calendar-month-year');
    const monthDaysCount = document.getElementById('month-days-count');
    const monthTotal = document.getElementById('month-total');

    if (!daysContainer || !monthYearDisplay || !monthDaysCount || !monthTotal) return;

    monthYearDisplay.textContent = `${getMonthName(month)} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const workedDays = readWorkedDays();
    const config = state.config || {};
    const dailyRate = parseFloat(config.rate) || 0;

    daysContainer.innerHTML = '';

    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const cell = createDayCell(day, year, month - 1, 'other-month');
        daysContainer.appendChild(cell);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = (d, m, y) => d === today.getDate() && m === today.getMonth() && y === today.getFullYear();

    let workedCount = 0;
    let monthTotalAmount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isWorked = workedDays[dateKey] === true;

        if (isWorked) {
            workedCount++;
            monthTotalAmount += dailyRate;
        }

        const cell = createDayCell(d, year, month, '', isWorked, isToday(d, month, year));
        daysContainer.appendChild(cell);
    }

    const totalCells = daysContainer.children.length;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
        const cell = createDayCell(i, year, month + 1, 'other-month');
        daysContainer.appendChild(cell);
    }

    monthDaysCount.textContent = workedCount;
    monthTotal.textContent = `R$ ${monthTotalAmount.toFixed(2).replace('.', ',')}`;
}

function createDayCell(day, year, month, className = '', isWorked = false, isToday = false) {
    const cell = document.createElement('div');
    cell.className = `calendar-day${className ? ' ' + className : ''}`;
    cell.textContent = day;

    if (isWorked) cell.classList.add('worked');
    if (isToday) cell.classList.add('today');

    const dateObj = new Date(year, month, day);
    const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    cell.dataset.date = dateKey;
    cell.dataset.day = day;
    cell.dataset.month = month;
    cell.dataset.year = year;

    cell.addEventListener('click', () => {
        if (cell.classList.contains('empty') || cell.classList.contains('other-month')) return;

        document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
        cell.classList.add('selected');

        selectedDate = {
            date: dateKey,
            day,
            month,
            year,
            isWorked
        };

        updateSelectedDayInfo(selectedDate);

        const dayButtons = document.getElementById('day-buttons');
        if (dayButtons) {
            dayButtons.style.display = 'block';
        }
    });

    return cell;
}

function updateSelectedDayInfo(selected) {
    const display = document.getElementById('selected-date-display');
    const addBtn = document.getElementById('add-day');
    const removeBtn = document.getElementById('remove-day');

    if (!display || !addBtn || !removeBtn) return;

    if (!selected) {
        display.textContent = '--/--/----';
        addBtn.style.display = 'none';
        removeBtn.style.display = 'none';
        return;
    }

    const date = new Date(selected.year, selected.month, selected.day);
    display.textContent = date.toLocaleDateString('pt-BR');

    const workedDays = readWorkedDays();
    const isWorked = workedDays[selected.date] === true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isFuture = date > today;

    if (isFuture) {
        addBtn.textContent = '⏳ Dia futuro';
        addBtn.disabled = true;
        addBtn.style.opacity = '0.55';
        addBtn.style.cursor = 'default';
        removeBtn.style.display = 'none';
        return;
    }

    if (isWorked) {
        addBtn.textContent = '✅ Já está marcado';
        addBtn.disabled = true;
        addBtn.style.opacity = '0.55';
        addBtn.style.cursor = 'default';
        removeBtn.style.display = 'block';
    } else {
        addBtn.textContent = '✅ Marcar como trabalhado';
        addBtn.disabled = false;
        addBtn.style.opacity = '1';
        addBtn.style.cursor = 'pointer';
        removeBtn.style.display = 'none';
    }
}

function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar(currentMonth, currentYear);
}

function migrateWorkedDaysFromConfig() {
    const config = state.config || {};
    const days = parseInt(config.daysWorked || 0, 10);
    const workedDays = readWorkedDays();

    if (Object.keys(workedDays).length === 0 && days > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const month = today.getMonth();
        const year = today.getFullYear();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let workDaysCount = 0;
        const newWorkedDays = {};

        for (let d = 1; d <= daysInMonth && workDaysCount < days; d++) {
            const date = new Date(year, month, d);
            if (date <= today) {
                const dayOfWeek = date.getDay();
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    newWorkedDays[key] = true;
                    workDaysCount++;
                }
            }
        }

        writeWorkedDays(newWorkedDays);
    }
}

// ============================================
// PARTE 3: FUNÇÕES DO APP
// ============================================

function init() {
    console.log('🚀 Iniciando app...');
    loadData();
    migrateWorkedDaysFromConfig();
    setupEventListeners();

    loadTheme();
    dataSync.enableAutoBackup(60);
    notificationSystem.requestPermission();

    if (state.config) {
        showDashboard();
    } else {
        showConfig();
        updateUI();
    }

    console.log('✅ App iniciado!');
}

function loadData() {
    try {
        state.config = storage.getConfig();
        state.transactions = storage.getTransactions();
        console.log('📦 Dados carregados:', { 
            config: state.config, 
            transactions: state.transactions.length 
        });
    } catch (e) {
        console.error('❌ Erro ao carregar dados:', e);
    }
}

function setupEventListeners() {
    console.log('🔧 Configurando eventos...');

    // ===== Tela de Configuração =====
    const saveConfigBtn = document.getElementById('save-config');
    if (saveConfigBtn) {
        saveConfigBtn.addEventListener('click', saveConfig);
    }

    // ===== Dashboard =====
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetApp);
    }

    const addDayBtn = document.getElementById('add-day');
    if (addDayBtn) {
        addDayBtn.addEventListener('click', addDay);
    }

    const removeDayBtn = document.getElementById('remove-day');
    if (removeDayBtn) {
        removeDayBtn.addEventListener('click', removeDay);
    }

    const prevMonthBtn = document.getElementById('prev-month');
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    }

    const nextMonthBtn = document.getElementById('next-month');
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => changeMonth(1));
    }

    const newTransactionBtn = document.getElementById('new-transaction');
    if (newTransactionBtn) {
        newTransactionBtn.addEventListener('click', () => openModal());
    }

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    const notificationBtn = document.getElementById('notifications-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', async () => {
            const granted = await notificationSystem.requestPermission();
            showToast(granted ? 'Notificações ativadas.' : 'Permissão de notificações não concedida.', granted ? 'success' : 'error');
        });
    }

    const restoreBackupBtn = document.getElementById('restore-backup-btn');
    if (restoreBackupBtn) {
        restoreBackupBtn.addEventListener('click', () => {
            const result = dataSync.restoreBackup();
            if (result.success) {
                state.config = storage.getConfig();
                state.transactions = storage.getTransactions();
                updateUI();
                showToast(result.message);
            } else {
                showToast(result.message, 'error');
            }
        });
    }

    // ===== Busca =====
    const searchInput = document.getElementById('transaction-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.trim().toLowerCase();
            renderTransactions();
            updateSummaryBanner();
        });
    }

    // ===== Filtros =====
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.filterType = e.target.dataset.filter;
            renderTransactions();
            updateSummaryBanner();
        });
    });

    // ===== Botão Exportar CSV =====
    const exportBtn = document.getElementById('export-csv');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
    }

    // ===== Modal =====
    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    document.querySelectorAll('.btn-type').forEach(btn => {
        btn.addEventListener('click', toggleType);
    });

    document.querySelectorAll('.btn-status').forEach(btn => {
        btn.addEventListener('click', toggleStatus);
    });

    const saveTransactionBtn = document.getElementById('save-transaction');
    if (saveTransactionBtn) {
        saveTransactionBtn.addEventListener('click', saveTransaction);
    }

    const modal = document.getElementById('modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeModal();
        });
    }

    // ===== Preencher configuração inicial =====
    if (state.config) {
        const rateInput = document.getElementById('rate-input');
        if (rateInput) rateInput.value = state.config.rate || '';
    }
}

// ============================================
// FUNÇÕES DE REGIME E CONFIGURAÇÃO
// ============================================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => {
        toast.className = 'toast';
    }, 2400);
}

function saveConfig() {
    const rateInput = document.getElementById('rate-input');
    const rate = parseFloat(rateInput ? rateInput.value : '0');

    if (!rate || rate <= 0) {
        showToast('Insira um valor válido.', 'error');
        return;
    }

    const config = {
        rate,
        daysWorked: 0
    };

    storage.saveConfig(config);
    state.config = config;
    dataSync.createBackup();
    showToast('Configurações salvas com sucesso!');
    showDashboard();
}

// ============================================
// NAVEGAÇÃO
// ============================================

function showDashboard() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const dashboard = document.getElementById('dashboard-screen');
    if (dashboard) dashboard.classList.add('active');
    updateUI();
}

function showConfig() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const configScreen = document.getElementById('config-screen');
    if (configScreen) configScreen.classList.add('active');
}

// ============================================
// ATUALIZAR UI
// ============================================

function updateUI() {
    if (!state.config) {
        showConfig();
        return;
    }

    // Atualizar informações de dias
    const workInfo = document.getElementById('work-info');
    if (workInfo) {
        workInfo.textContent = `${state.config.daysWorked} dias trabalhados · R$ ${formatBRL(state.config.rate)}/dia`;
    }

    const daysCount = document.getElementById('days-count');
    if (daysCount) {
        daysCount.textContent = state.config.daysWorked || 0;
    }

    const dayButtons = document.getElementById('day-buttons');
    if (dayButtons) {
        dayButtons.style.display = 'block';
    }

    // Calcular totais
    const totals = calculateTotals();

    updateSummaryBanner();

    // Atualizar cards
    const cardMap = {
        'total-gross': totals.gross,
        'total-discounts': totals.discounts,
        'total-to-receive': totals.toReceive,
        'total-recovered': totals.recovered,
        'net-balance': totals.netBalance,
        'real-balance': totals.realBalance
    };

    Object.entries(cardMap).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = formatBRL(value);
        }
    });

    // Renderizar transações
    renderTransactions();
    renderCalendar(currentMonth, currentYear);

    notificationSystem.notifyLowBalance(totals.netBalance, 100);
    notificationSystem.notifyDueThirdParty(state.transactions);
}

// ============================================
// CÁLCULOS
// ============================================

function calculateTotals() {
    const config = state.config;
    const transactions = state.transactions;

    if (!config) {
        return { gross: 0, discounts: 0, toReceive: 0, recovered: 0, netBalance: 0, realBalance: 0 };
    }

    const gross = config.rate * (config.daysWorked || 0);

    const discounts = transactions
        .filter(t => t.type === 'personal_discount')
        .reduce((sum, t) => sum + t.amount, 0);

    const toReceive = transactions
        .filter(t => t.type === 'third_party' && t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0);

    const recovered = transactions
        .filter(t => t.type === 'third_party' && t.status === 'received')
        .reduce((sum, t) => sum + t.amount, 0);

    const netBalance = gross - discounts - toReceive;
    const realBalance = gross - discounts;

    return { gross, discounts, toReceive, recovered, netBalance, realBalance };
}

// ============================================
// TRANSAÇÕES COM FILTRO
// ============================================

function renderTransactions() {
    const list = document.getElementById('transactions-list');
    if (!list) return;

    // Aplicar filtro
    let filtered = state.transactions;
    if (state.filterType !== 'all') {
        filtered = state.transactions.filter(t => t.type === state.filterType);
    }

    // Aplicar busca por descrição ou nome
    if (state.searchQuery) {
        filtered = filtered.filter(t => {
            const description = t.description ? t.description.toLowerCase() : '';
            const personName = t.personName ? t.personName.toLowerCase() : '';
            return description.includes(state.searchQuery) || personName.includes(state.searchQuery);
        });
    }

    if (filtered.length === 0) {
        const message = state.transactions.length === 0
            ? 'Adicione uma movimentação para acompanhar seus valores.'
            : state.searchQuery
                ? 'Nenhuma transação corresponde à busca atual.'
                : 'Tente ajustar o filtro aplicado.';

        list.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 28px; margin-bottom: 8px;">🧾</div>
                <strong>Nenhum lançamento encontrado</strong>
                <p style="margin-top: 6px;">${message}</p>
            </div>
        `;
        return;
    }

    const sorted = [...filtered].reverse();

    list.innerHTML = sorted.map(t => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-desc">
                    ${t.type === 'personal_discount' ? '👤' : '👥'} ${t.description}
                </div>
                ${t.personName ? `<div class="transaction-person">${t.personName} · ${t.status === 'pending' ? '⏳ Pendente' : '✅ Recebido'}</div>` : ''}
                <div class="transaction-date">${t.date}</div>
            </div>
            <div class="transaction-amount" style="color: ${t.type === 'personal_discount' ? '#EF4444' : '#10B981'}">
                ${t.type === 'personal_discount' ? '-' : '+'} ${formatBRL(t.amount)}
            </div>
            <div class="transaction-actions">
                ${t.type === 'third_party' ? `
                    <button onclick="window.toggleStatus('${t.id}')" title="Alterar status" class="action-btn">
                        ${t.status === 'pending' ? '✅' : '↩️'}
                    </button>
                ` : ''}
                <button onclick="window.editTransaction('${t.id}')" class="action-btn">✏️</button>
                <button onclick="window.deleteTransaction('${t.id}')" class="action-btn">🗑️</button>
            </div>
        </div>
    `).join('');
}

function updateSummaryBanner() {
    const banner = document.getElementById('summary-banner');
    if (!banner) return;

    if (!state.config) {
        banner.innerHTML = '<div class="summary-title">Resumo</div><div class="summary-values"><span>Configure seu app</span><span>para começar</span></div>';
        return;
    }

    const totals = calculateTotals();
    
    // Aplicar filtro para o resumo
    let filteredCount = state.transactions.length;
    if (state.filterType !== 'all' || state.searchQuery) {
        filteredCount = state.transactions.filter(t => {
            const typeMatches = state.filterType === 'all' || t.type === state.filterType;
            const description = t.description ? t.description.toLowerCase() : '';
            const personName = t.personName ? t.personName.toLowerCase() : '';
            const searchMatches = !state.searchQuery || description.includes(state.searchQuery) || personName.includes(state.searchQuery);
            return typeMatches && searchMatches;
        }).length;
    }

    banner.innerHTML = `
        <div class="summary-title">Resumo rápido</div>
        <div class="summary-values">
            <span>A receber: <strong>${formatBRL(totals.toReceive)}</strong></span>
            <span>Saldo: <strong>${formatBRL(totals.netBalance)}</strong></span>
            <span style="font-size: 0.7rem; opacity: 0.6;">${filteredCount} itens visíveis</span>
        </div>
    `;
}

// ============================================
// EXPORTAR CSV
// ============================================

function exportToCSV() {
    // Usar dados filtrados para exportação
    let dataToExport = state.transactions;
    if (state.filterType !== 'all') {
        dataToExport = state.transactions.filter(t => t.type === state.filterType);
    }

    if (dataToExport.length === 0) {
        showToast('Nenhum dado para exportar com o filtro atual.', 'error');
        return;
    }

    const headers = ['Data', 'Tipo', 'Descrição', 'Valor (R$)', 'Pessoa', 'Status'];
    
    const rows = dataToExport.map(t => {
        const typeLabel = t.type === 'personal_discount' ? 'Desconto Pessoal' : 'Terceiros';
        const statusLabel = t.status === 'pending' ? 'Pendente' : t.status === 'received' ? 'Recebido' : 'N/A';
        return [
            t.date,
            typeLabel,
            t.description,
            t.amount.toFixed(2),
            t.personName || '',
            statusLabel
        ];
    });
    
    let csvContent = [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');

    // Adicionar BOM para UTF-8
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_financeiro_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('CSV exportado com sucesso!');
}

// ============================================
// DIAS TRABALHADOS
// ============================================

function addDay() {
    if (!state.config) {
        showToast('Configure o app primeiro!', 'error');
        return;
    }

    if (!selectedDate) {
        showToast('Selecione um dia no calendário.', 'info');
        return;
    }

    const dateKey = selectedDate.date;
    const workedDays = readWorkedDays();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateObj = new Date(selectedDate.year, selectedDate.month, selectedDate.day);

    if (workedDays[dateKey]) {
        showToast('Este dia já está marcado como trabalhado.', 'info');
        return;
    }

    if (selectedDateObj > today) {
        showToast('Não é possível marcar dias futuros.', 'error');
        return;
    }

    workedDays[dateKey] = true;
    writeWorkedDays(workedDays);

    state.config.daysWorked = (parseInt(state.config.daysWorked || 0, 10) + 1);
    storage.saveConfig(state.config);

    updateUI();
    showToast('✅ Dia marcado como trabalhado!', 'success');
}

function removeDay() {
    if (!state.config) {
        showToast('Configure o app primeiro!', 'error');
        return;
    }

    if (!selectedDate) {
        showToast('Selecione um dia no calendário.', 'info');
        return;
    }

    const dateKey = selectedDate.date;
    const workedDays = readWorkedDays();

    if (!workedDays[dateKey]) {
        showToast('Este dia não está marcado como trabalhado.', 'info');
        return;
    }

    delete workedDays[dateKey];
    writeWorkedDays(workedDays);

    if (parseInt(state.config.daysWorked || 0, 10) > 0) {
        state.config.daysWorked = (parseInt(state.config.daysWorked || 0, 10) - 1);
        storage.saveConfig(state.config);
    }

    updateUI();
    showToast('❌ Dia desmarcado!', 'success');
}

// ============================================
// MODAL
// ============================================

function openModal(transactionId = null) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    
    if (!modal || !title) return;
    
    if (transactionId) {
        const transaction = state.transactions.find(t => t.id === transactionId);
        if (!transaction) {
            console.error('❌ Transação não encontrada:', transactionId);
            return;
        }
        
        title.textContent = '✏️ Editar Movimentação';
        state.editingId = transactionId;
        
        const descInput = document.getElementById('modal-description');
        const amountInput = document.getElementById('modal-amount');
        const personInput = document.getElementById('modal-person');
        
        if (descInput) descInput.value = transaction.description;
        if (amountInput) amountInput.value = transaction.amount;
        if (personInput) personInput.value = transaction.personName || '';
        
        document.querySelectorAll('.btn-type').forEach(b => {
            b.classList.toggle('active', b.dataset.type === transaction.type);
        });
        
        const type = transaction.type;
        const personGroup = document.getElementById('person-group');
        const statusGroup = document.getElementById('status-group');
        
        if (personGroup) personGroup.style.display = type === 'third_party' ? 'block' : 'none';
        if (statusGroup) statusGroup.style.display = type === 'third_party' ? 'block' : 'none';
        state.modalType = type;
        
        if (type === 'third_party') {
            document.querySelectorAll('.btn-status').forEach(b => {
                b.classList.toggle('active', b.dataset.status === transaction.status);
            });
            state.modalStatus = transaction.status || 'pending';
        }
    } else {
        title.textContent = '➕ Nova Movimentação';
        state.editingId = null;
        
        const descInput = document.getElementById('modal-description');
        const amountInput = document.getElementById('modal-amount');
        const personInput = document.getElementById('modal-person');
        
        if (descInput) descInput.value = '';
        if (amountInput) amountInput.value = '';
        if (personInput) personInput.value = '';
        
        document.querySelector('.btn-type.active')?.classList.remove('active');
        const defaultType = document.querySelector('.btn-type[data-type="personal_discount"]');
        if (defaultType) defaultType.classList.add('active');
        
        const personGroup = document.getElementById('person-group');
        const statusGroup = document.getElementById('status-group');
        
        if (personGroup) personGroup.style.display = 'none';
        if (statusGroup) statusGroup.style.display = 'none';
        state.modalType = 'personal_discount';
    }
    
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.remove('active');
    state.editingId = null;
}

function toggleType(e) {
    document.querySelectorAll('.btn-type').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    
    const type = e.target.dataset.type;
    const personGroup = document.getElementById('person-group');
    const statusGroup = document.getElementById('status-group');
    
    if (personGroup) personGroup.style.display = type === 'third_party' ? 'block' : 'none';
    if (statusGroup) statusGroup.style.display = type === 'third_party' ? 'block' : 'none';
    state.modalType = type;
}

function toggleStatus(e) {
    document.querySelectorAll('.btn-status').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    state.modalStatus = e.target.dataset.status;
}

function saveTransaction() {
    const descInput = document.getElementById('modal-description');
    const amountInput = document.getElementById('modal-amount');
    const personInput = document.getElementById('modal-person');
    
    const description = descInput ? descInput.value.trim() : '';
    const amount = amountInput ? parseFloat(amountInput.value) : 0;
    const personName = personInput ? personInput.value.trim() : '';
    const type = state.modalType;
    const status = state.modalStatus;

    if (!description) {
        showToast('Informe uma descrição.', 'error');
        return;
    }

    if (!amount || amount <= 0) {
        showToast('Informe um valor válido.', 'error');
        return;
    }

    if (type === 'third_party' && !personName) {
        showToast('Informe o nome da pessoa.', 'error');
        return;
    }

    const transaction = {
        id: state.editingId || Date.now().toString(),
        type,
        description,
        amount,
        date: new Date().toLocaleDateString('pt-BR'),
        ...(type === 'third_party' && { personName, status })
    };

    if (state.editingId) {
        storage.updateTransaction(state.editingId, transaction);
    } else {
        storage.saveTransaction(transaction);
    }

    state.transactions = storage.getTransactions();
    dataSync.createBackup();
    notificationSystem.notifyDailyReport(calculateTotals().netBalance, state.transactions);
    closeModal();
    updateUI();
    showToast('Movimentação salva com sucesso!');
}

// ============================================
// FUNÇÕES GLOBAIS (para onclick)
// ============================================

window.toggleStatus = function(id) {
    const transaction = state.transactions.find(t => t.id === id);
    if (!transaction) return;
    
    const newStatus = transaction.status === 'pending' ? 'received' : 'pending';
    storage.updateTransaction(id, { status: newStatus });
    state.transactions = storage.getTransactions();
    updateUI();
};

window.editTransaction = function(id) {
    openModal(id);
};

window.deleteTransaction = function(id) {
    const transaction = state.transactions.find(t => t.id === id);
    if (!transaction) return;
    
    if (confirm(`Remover "${transaction.description}"?`)) {
        storage.deleteTransaction(id);
        state.transactions = storage.getTransactions();
        updateUI();
    }
};

// ============================================
// RESET
// ============================================

function resetApp() {
    if (confirm('Tem certeza que deseja apagar todos os dados e recomeçar?\n\nEsta ação não pode ser desfeita!')) {
        storage.resetApp();
        state.config = null;
        state.transactions = [];
        showConfig();
        showToast('App reiniciado com sucesso.');
    }
}

// ============================================
// UTILITÁRIOS
// ============================================

function formatBRL(value) {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

// ============================================
// INICIAR APP
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

console.log('📱 App carregado!');