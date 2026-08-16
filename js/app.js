// ============================================
// CONFIGURAÇÕES E ESTADO GLOBAL
// ============================================

let config = JSON.parse(localStorage.getItem('config') || '{}');
let transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
let editingId = null;
let currentMode = config.mode || null; // 'daily' ou 'monthly'

// ============================================
// CALENDÁRIO
// ============================================

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let selectedDate = null;

// ============================================
// ANIMAÇÃO — helpers
// ============================================

function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function animateNumber(el, endValue, formatter, duration = 550) {
    if (!el) return;
    const startValue = parseFloat(el.dataset.rawValue || '0');

    if (prefersReducedMotion() || Math.abs(endValue - startValue) < 0.005) {
        el.textContent = formatter(endValue);
        el.dataset.rawValue = String(endValue);
        return;
    }

    const startTime = performance.now();

    function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cúbico
        const current = startValue + (endValue - startValue) * eased;
        el.textContent = formatter(current);

        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            el.textContent = formatter(endValue);
            el.dataset.rawValue = String(endValue);
        }
    }

    requestAnimationFrame(tick);
}

function createRipple(event, target) {
    if (prefersReducedMotion()) return;
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'fab-ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${(event.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2}px`;
    ripple.style.top = `${(event.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2}px`;
    target.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
}

function renderCalendar(month, year) {
    const daysContainer = document.getElementById('calendar-days');
    const monthYearDisplay = document.getElementById('calendar-month-year');
    const monthDaysCount = document.getElementById('month-days-count');

    if (!daysContainer) return;

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    monthYearDisplay.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const workedDays = JSON.parse(localStorage.getItem('workedDays') || '{}');

    daysContainer.innerHTML = '';

    // Dias do mês anterior
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const cell = createDayCell(day, year, month - 1, 'other-month');
        daysContainer.appendChild(cell);
    }

    // Dias do mês atual
    const today = new Date();
    const isToday = (d, m, y) => d === today.getDate() && m === today.getMonth() && y === today.getFullYear();

    let workedCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isWorked = workedDays[dateKey] === true;

        if (isWorked) workedCount++;

        const cell = createDayCell(d, year, month, '', isWorked, isToday(d, month, year));
        daysContainer.appendChild(cell);
    }

    // Preenche dias restantes do próximo mês
    const totalCells = daysContainer.children.length;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
        const cell = createDayCell(i, year, month + 1, 'other-month');
        daysContainer.appendChild(cell);
    }

    animateNumber(monthDaysCount, workedCount, (v) => String(Math.round(v)), 420);
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

        const dayButtons = document.getElementById('day-buttons');
        const wasSelected = cell.classList.contains('selected');

        document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));

        if (wasSelected) {
            selectedDate = null;
            dayButtons.style.display = 'none';
            return;
        }

        cell.classList.add('selected');

        selectedDate = {
            date: dateKey,
            day: day,
            month: month,
            year: year,
            isWorked: isWorked
        };

        updateSelectedDayInfo(selectedDate);
        dayButtons.style.display = 'block';
    });

    return cell;
}

function updateSelectedDayInfo(selected) {
    const display = document.getElementById('selected-date-display');
    const addBtn = document.getElementById('add-day');
    const removeBtn = document.getElementById('remove-day');

    if (selected) {
        const date = new Date(selected.year, selected.month, selected.day);
        const formatted = date.toLocaleDateString('pt-BR');
        display.textContent = formatted;

        const workedDays = JSON.parse(localStorage.getItem('workedDays') || '{}');
        const isWorked = workedDays[selected.date] === true;

        const today = new Date();
        const selectedDateObj = new Date(selected.year, selected.month, selected.day);
        const isFuture = selectedDateObj > today;

        if (isFuture) {
            addBtn.textContent = 'Dia ainda não chegou';
            addBtn.disabled = true;
        } else if (isWorked) {
            addBtn.textContent = 'Já marcado como trabalhado';
            addBtn.disabled = true;
        } else {
            addBtn.textContent = 'Marcar como trabalhado';
            addBtn.disabled = false;
        }

        removeBtn.style.display = isWorked ? 'block' : 'none';
    }
}

function markDayWorked() {
    if (!selectedDate) return;

    const dateKey = selectedDate.date;
    const workedDays = JSON.parse(localStorage.getItem('workedDays') || '{}');

    if (workedDays[dateKey]) {
        showToast('Esse dia já está marcado.', 'info');
        return;
    }

    const today = new Date();
    const selectedDateObj = new Date(selectedDate.year, selectedDate.month, selectedDate.day);
    if (selectedDateObj > today) {
        showToast('Não é possível marcar dias futuros.', 'error');
        return;
    }

    workedDays[dateKey] = true;
    localStorage.setItem('workedDays', JSON.stringify(workedDays));

    renderCalendar(currentMonth, currentYear);
    updateDashboard();
    updateSelectedDayInfo(selectedDate);

    showToast('Dia marcado como trabalhado.', 'success');
}

function unmarkDayWorked() {
    if (!selectedDate) return;

    const dateKey = selectedDate.date;
    const workedDays = JSON.parse(localStorage.getItem('workedDays') || '{}');

    if (!workedDays[dateKey]) {
        showToast('Esse dia ainda não está marcado.', 'info');
        return;
    }

    delete workedDays[dateKey];
    localStorage.setItem('workedDays', JSON.stringify(workedDays));

    renderCalendar(currentMonth, currentYear);
    updateDashboard();
    updateSelectedDayInfo(selectedDate);

    showToast('Dia desmarcado.', 'success');
}

function changeMonth(delta) {
    const daysContainer = document.getElementById('calendar-days');
    if (!daysContainer) return;
    
    const reduced = prefersReducedMotion();

    const advance = () => {
        currentMonth += delta;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        } else if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar(currentMonth, currentYear);

        selectedDate = null;
        const dayButtons = document.getElementById('day-buttons');
        if (dayButtons) dayButtons.style.display = 'none';

        if (!reduced && daysContainer) {
            daysContainer.classList.remove('slide-out-left', 'slide-out-right');
            daysContainer.style.transform = delta > 0 ? 'translateX(16px)' : 'translateX(-16px)';
            daysContainer.style.opacity = '0';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    daysContainer.style.transform = '';
                    daysContainer.style.opacity = '';
                });
            });
        }
    };

    if (reduced || !daysContainer) {
        advance();
        return;
    }

    daysContainer.classList.add(delta > 0 ? 'slide-out-left' : 'slide-out-right');
    setTimeout(advance, 160);
}

// ============================================
// MODE MANAGEMENT
// ============================================

function selectMode(mode) {
    currentMode = mode;
    config.mode = mode;
    localStorage.setItem('config', JSON.stringify(config));
    
    // Esconder todas as telas
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    // Mostrar tela de configuração apropriada
    if (mode === 'daily') {
        document.getElementById('daily-config-screen').classList.add('active');
    } else if (mode === 'monthly') {
        document.getElementById('monthly-config-screen').classList.add('active');
        
        // Definir mês atual como padrão
        const today = new Date();
        const monthInput = document.getElementById('salary-month-input');
        if (monthInput) {
            monthInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        }
    }
}

function switchMode() {
    if (confirm('Mudar o modo de controle? Os dados existentes serão preservados.')) {
        // Limpar config atual
        config = {};
        localStorage.setItem('config', JSON.stringify(config));
        localStorage.removeItem('workedDays');
        localStorage.removeItem('transactions');
        
        // Mostrar tela de seleção
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('mode-selection-screen').classList.add('active');
    }
}

function applyModeToInterface() {
    const isMonthly = currentMode === 'monthly';
    
    // Elementos do dashboard
    const dashboardEyebrow = document.getElementById('dashboard-eyebrow');
    const workInfo = document.getElementById('work-info');
    const receiptTitle = document.getElementById('receipt-title');
    const dailySummary = document.getElementById('daily-summary');
    const monthlySummary = document.getElementById('monthly-summary');
    const balanceLabel = document.getElementById('balance-label');
    const realBalanceRow = document.getElementById('real-balance-row');
    const calendarSection = document.getElementById('calendar-section');
    const transactionsTitle = document.getElementById('transactions-title');
    const searchInput = document.getElementById('transaction-search');
    const typeGroup = document.getElementById('type-group');
    
    if (isMonthly) {
        dashboardEyebrow.textContent = 'Caderneta digital · Mensal';
        receiptTitle.textContent = 'Resumo do mês';
        dailySummary.style.display = 'none';
        monthlySummary.style.display = 'block';
        balanceLabel.textContent = 'Saldo disponível';
        realBalanceRow.style.display = 'none';
        calendarSection.style.display = 'none';
        transactionsTitle.textContent = 'Gastos do mês';
        searchInput.placeholder = 'Buscar por descrição';
        typeGroup.style.display = 'none';
        
        // Atualizar info do salário
        const monthlySalary = config.monthlySalary || 0;
        workInfo.textContent = `Salário: ${formatMoney(monthlySalary)}`;
    } else {
        dashboardEyebrow.textContent = 'Caderneta digital';
        receiptTitle.textContent = 'Resumo do período';
        dailySummary.style.display = 'block';
        monthlySummary.style.display = 'none';
        balanceLabel.textContent = 'Saldo líquido';
        realBalanceRow.style.display = 'flex';
        calendarSection.style.display = 'block';
        transactionsTitle.textContent = 'Últimos lançamentos';
        searchInput.placeholder = 'Buscar por descrição ou nome';
        typeGroup.style.display = 'block';
    }
}

// ============================================
// DASHBOARD
// ============================================

function formatMoney(value) {
    return `R$ ${(parseFloat(value) || 0).toFixed(2).replace('.', ',')}`;
}

function updateDashboard() {
    const config = JSON.parse(localStorage.getItem('config') || '{}');
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    currentMode = config.mode || 'daily';

    if (currentMode === 'monthly') {
        updateMonthlyDashboard(config, transactions);
    } else {
        updateDailyDashboard(config, transactions);
    }
    
    renderTransactions(document.getElementById('transaction-search')?.value || '');
}

function updateDailyDashboard(config, transactions) {
    const workedDays = JSON.parse(localStorage.getItem('workedDays') || '{}');
    const dailyRate = parseFloat(config.rate) || 0;

    const totalWorkedDays = Object.keys(workedDays).filter(key => workedDays[key] === true).length;
    const totalGross = totalWorkedDays * dailyRate;

    let totalPersonalDiscount = 0;
    let totalThirdParty = 0;

    transactions.forEach(t => {
        const amount = parseFloat(t.amount) || 0;
        if (t.type === 'personal_discount') {
            totalPersonalDiscount += amount;
        } else if (t.type === 'third_party') {
            totalThirdParty += amount;
        }
    });

    const netBalance = totalGross - totalPersonalDiscount;
    const realBalance = netBalance - totalThirdParty;

    const signedMoney = (v) => `− ${formatMoney(v)}`;

    animateNumber(document.getElementById('ledger-gross'), totalGross, formatMoney);
    animateNumber(document.getElementById('ledger-discounts'), totalPersonalDiscount, signedMoney);
    animateNumber(document.getElementById('ledger-net'), netBalance, formatMoney);
    animateNumber(document.getElementById('ledger-real'), realBalance, formatMoney, 650);

    const thirdRow = document.getElementById('ledger-third-row');
    if (totalThirdParty > 0) {
        thirdRow.style.display = 'flex';
        animateNumber(document.getElementById('ledger-third-party'), totalThirdParty, signedMoney);
    } else {
        thirdRow.style.display = 'none';
    }

    document.getElementById('work-info').textContent = `${totalWorkedDays} ${totalWorkedDays === 1 ? 'dia' : 'dias'} · ${formatMoney(dailyRate)}/dia`;
}

function updateMonthlyDashboard(config, transactions) {
    const monthlySalary = parseFloat(config.monthlySalary) || 0;
    
    let totalExpenses = 0;
    transactions.forEach(t => {
        const amount = parseFloat(t.amount) || 0;
        if (t.type === 'personal_discount') {
            totalExpenses += amount;
        }
    });

    const netBalance = monthlySalary - totalExpenses;
    const signedMoney = (v) => `− ${formatMoney(v)}`;

    animateNumber(document.getElementById('monthly-salary-display'), monthlySalary, formatMoney);
    animateNumber(document.getElementById('monthly-expenses'), totalExpenses, signedMoney);
    animateNumber(document.getElementById('ledger-net'), netBalance, formatMoney);
    
    document.getElementById('work-info').textContent = `Salário: ${formatMoney(monthlySalary)}`;
}

function renderTransactions(filter = '') {
    const list = document.getElementById('transactions-list');
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    const isMonthly = currentMode === 'monthly';

    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    let filtered = transactions;
    if (filter) {
        const search = filter.toLowerCase();
        filtered = transactions.filter(t =>
            t.description.toLowerCase().includes(search) ||
            (t.person && t.person.toLowerCase().includes(search))
        );
    }

    if (filtered.length === 0) {
        list.innerHTML = transactions.length === 0
            ? `<div class="empty-state">Nenhuma movimentação ainda.<br><strong>Toque no botão + para registrar a primeira.</strong></div>`
            : `<div class="empty-state">Nenhum resultado para essa busca.</div>`;
        return;
    }

    list.innerHTML = filtered.map((t, i) => {
        const typeLabel = isMonthly ? 'Gasto' : (t.type === 'personal_discount' ? 'Gasto pessoal' : 'Terceiro');
        const dateFormatted = new Date(t.date).toLocaleDateString('pt-BR');
        const delay = Math.min(i, 12) * 30;

        return `
            <div class="transaction-item" data-id="${t.id}" style="animation-delay:${delay}ms">
                <div class="transaction-info">
                    <div class="transaction-desc">${t.description}</div>
                    ${t.person ? `<div class="transaction-person">${t.person}</div>` : ''}
                    <div class="transaction-date">${dateFormatted} · ${typeLabel}</div>
                </div>
                <div class="transaction-amount">− ${formatMoney(t.amount)}</div>
                <div class="transaction-actions">
                    <button class="action-btn" onclick="editTransaction('${t.id}')" aria-label="Editar">✏️</button>
                    <button class="action-btn" onclick="deleteTransaction('${t.id}')" aria-label="Excluir">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// TRANSACTIONS CRUD
// ============================================

function setPersonFieldVisibility(type) {
    const field = document.getElementById('person-field');
    const personInput = document.getElementById('modal-person');
    const isThirdParty = type === 'third_party';

    if (isThirdParty) {
        field.style.display = 'block';
        if (!prefersReducedMotion()) {
            field.classList.remove('reveal');
            void field.offsetWidth;
            field.classList.add('reveal');
        }
    } else {
        field.style.display = 'none';
        personInput.value = '';
    }

    personInput.required = isThirdParty;
}

function openModal(editData = null) {
    const modal = document.getElementById('modal');
    modal.classList.add('active');
    
    const isMonthly = currentMode === 'monthly';
    const typeGroup = document.getElementById('type-group');
    
    if (isMonthly) {
        typeGroup.style.display = 'none';
    } else {
        typeGroup.style.display = 'block';
    }

    if (editData) {
        document.getElementById('modal-title').textContent = 'Editar movimentação';
        document.getElementById('modal-description').value = editData.description || '';
        document.getElementById('modal-amount').value = editData.amount || '';
        document.getElementById('modal-person').value = editData.person || '';
        editingId = editData.id;

        if (!isMonthly) {
            document.querySelectorAll('.btn-type').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === editData.type);
            });
            setPersonFieldVisibility(editData.type);
        }
    } else {
        document.getElementById('modal-title').textContent = 'Nova movimentação';
        document.getElementById('modal-description').value = '';
        document.getElementById('modal-amount').value = '';
        document.getElementById('modal-person').value = '';
        editingId = null;

        if (!isMonthly) {
            document.querySelectorAll('.btn-type').forEach((btn, index) => {
                btn.classList.toggle('active', index === 0);
            });
            setPersonFieldVisibility('personal_discount');
        }
    }
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    editingId = null;
}

function saveTransaction() {
    const description = document.getElementById('modal-description').value.trim();
    const amount = parseFloat(document.getElementById('modal-amount').value);
    const isMonthly = currentMode === 'monthly';
    
    // No modo mensal, o tipo é sempre personal_discount
    const type = isMonthly ? 'personal_discount' : 
                 (document.querySelector('.btn-type.active')?.dataset.type || 'personal_discount');
    const person = document.getElementById('modal-person').value.trim();

    if (!description) {
        showToast('Preencha a descrição.', 'error');
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        showToast('Informe um valor válido.', 'error');
        return;
    }

    if (type === 'third_party' && !person) {
        showToast('Informe o nome do terceiro.', 'error');
        return;
    }

    let transactions = JSON.parse(localStorage.getItem('transactions') || '[]');

    if (editingId) {
        const index = transactions.findIndex(t => t.id === editingId);
        if (index !== -1) {
            transactions[index] = {
                ...transactions[index],
                description,
                amount,
                type,
                person: type === 'third_party' ? person : ''
            };
        }
        showToast('Movimentação atualizada.', 'success');
    } else {
        const newTransaction = {
            id: Date.now().toString(),
            description,
            amount,
            type,
            person: type === 'third_party' ? person : '',
            date: new Date().toISOString()
        };
        transactions.push(newTransaction);
        showToast('Movimentação adicionada.', 'success');
    }

    localStorage.setItem('transactions', JSON.stringify(transactions));
    closeModal();
    updateDashboard();
}

function editTransaction(id) {
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
        openModal(transaction);
    }
}

function deleteTransaction(id) {
    if (!confirm('Excluir esta movimentação?')) return;

    let transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    transactions = transactions.filter(t => t.id !== id);
    localStorage.setItem('transactions', JSON.stringify(transactions));

    updateDashboard();
    showToast('Movimentação excluída.', 'success');
}

// ============================================
// CONFIGURAÇÃO
// ============================================

function saveDailyConfig() {
    const rate = parseFloat(document.getElementById('rate-input').value);

    if (isNaN(rate) || rate <= 0) {
        showToast('Informe um valor de diária válido.', 'error');
        return;
    }

    const config = { mode: 'daily', rate: rate };
    localStorage.setItem('config', JSON.stringify(config));
    currentMode = 'daily';

    document.getElementById('daily-config-screen').classList.remove('active');
    document.getElementById('dashboard-screen').classList.add('active');

    if (!localStorage.getItem('workedDays')) {
        localStorage.setItem('workedDays', '{}');
    }
    if (!localStorage.getItem('transactions')) {
        localStorage.setItem('transactions', '[]');
    }

    applyModeToInterface();
    updateDashboard();
    renderCalendar(currentMonth, currentYear);
    showToast('Configuração salva.', 'success');
}

function saveMonthlyConfig() {
    const salary = parseFloat(document.getElementById('salary-input').value);

    if (isNaN(salary) || salary <= 0) {
        showToast('Informe um valor de salário válido.', 'error');
        return;
    }

    const monthInput = document.getElementById('salary-month-input').value;
    const config = { 
        mode: 'monthly', 
        monthlySalary: salary,
        referenceMonth: monthInput || undefined
    };
    
    localStorage.setItem('config', JSON.stringify(config));
    currentMode = 'monthly';

    document.getElementById('monthly-config-screen').classList.remove('active');
    document.getElementById('dashboard-screen').classList.add('active');

    if (!localStorage.getItem('transactions')) {
        localStorage.setItem('transactions', '[]');
    }

    applyModeToInterface();
    updateDashboard();
    showToast('Configuração salva.', 'success');
}

// ============================================
// TOAST
// ============================================

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================
// TEMA
// ============================================

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    const btn = document.getElementById('theme-toggle');
    btn.textContent = newTheme === 'dark' ? '☀️' : '🌙';

    if (!prefersReducedMotion()) {
        btn.classList.remove('spin');
        void btn.offsetWidth;
        btn.classList.add('spin');
    }
}

// ============================================
// RESET
// ============================================

function resetApp() {
    if (!confirm('Apagar todos os dados salvos neste dispositivo?')) return;
    if (!confirm('Essa ação não pode ser desfeita. Continuar?')) return;

    localStorage.clear();
    location.reload();
}

// ============================================
// NOTIFICATIONS
// ============================================

function requestNotifications() {
    if (!('Notification' in window)) {
        showToast('Este navegador não tem suporte a notificações.', 'error');
        return;
    }

    if (Notification.permission === 'granted') {
        showToast('Lembretes já estão ativados.', 'info');
        return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            showToast('Lembretes ativados.', 'success');
            new Notification('Caderneta', {
                body: 'Lembretes ativados com sucesso.',
            });
        } else {
            showToast('Permissão de notificação negada.', 'error');
        }
    });
}

// ============================================
// BACKUP — exportar
// ============================================

function exportData() {
    const config = JSON.parse(localStorage.getItem('config') || '{}');
    const workedDaysRaw = JSON.parse(localStorage.getItem('workedDays') || '{}');
    const transactionsRaw = JSON.parse(localStorage.getItem('transactions') || '[]');

    const data = {
        app: 'Caderneta',
        exportadoEm: new Date().toLocaleString('pt-BR'),
        modo: config.mode === 'monthly' ? 'Salário Mensal' : 'Diária',
        dadosBrutos: {
            config: config,
            workedDays: workedDaysRaw,
            transactions: transactionsRaw
        }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caderneta_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Backup exportado.', 'success');
}

// ============================================
// BACKUP — restaurar
// ============================================

function restoreBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                const source = data.dadosBrutos || data;

                localStorage.setItem('config', JSON.stringify(source.config || {}));
                localStorage.setItem('workedDays', JSON.stringify(source.workedDays || {}));
                localStorage.setItem('transactions', JSON.stringify(source.transactions || []));
                showToast('Backup restaurado.', 'success');
                location.reload();
            } catch (error) {
                showToast('Erro ao restaurar backup.', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const config = JSON.parse(localStorage.getItem('config') || '{}');
    currentMode = config.mode || null;

    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('theme-toggle').textContent = savedTheme === 'dark' ? '☀️' : '🌙';

    // Configurar navegação
    if (currentMode) {
        // Já existe configuração
        if (currentMode === 'daily' && config.rate) {
            showDashboard();
        } else if (currentMode === 'monthly' && config.monthlySalary) {
            showDashboard();
        } else {
            // Config incompleta
            document.getElementById('mode-selection-screen').classList.add('active');
        }
    } else {
        // Primeira vez
        document.getElementById('mode-selection-screen').classList.add('active');
    }

    // Event listeners para seleção de modo
    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            selectMode(mode);
        });
    });

    // Event listeners para configuração
    document.getElementById('save-daily-config').addEventListener('click', saveDailyConfig);
    document.getElementById('save-monthly-config').addEventListener('click', saveMonthlyConfig);
    
    document.getElementById('back-to-modes-daily').addEventListener('click', () => {
        document.getElementById('daily-config-screen').classList.remove('active');
        document.getElementById('mode-selection-screen').classList.add('active');
    });
    
    document.getElementById('back-to-modes-monthly').addEventListener('click', () => {
        document.getElementById('monthly-config-screen').classList.remove('active');
        document.getElementById('mode-selection-screen').classList.add('active');
    });

    // Event listeners para ações do dashboard
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('notifications-btn').addEventListener('click', requestNotifications);
    document.getElementById('export-backup-btn').addEventListener('click', exportData);
    document.getElementById('restore-backup-btn').addEventListener('click', restoreBackup);
    document.getElementById('reset-btn').addEventListener('click', resetApp);
    document.getElementById('change-mode-btn').addEventListener('click', switchMode);

    // Event listeners para calendário (apenas modo diária)
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const addDayBtn = document.getElementById('add-day');
    const removeDayBtn = document.getElementById('remove-day');
    
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => changeMonth(1));
    if (addDayBtn) addDayBtn.addEventListener('click', markDayWorked);
    if (removeDayBtn) removeDayBtn.addEventListener('click', unmarkDayWorked);

    // Event listeners para transações
    document.getElementById('new-transaction').addEventListener('click', (e) => {
        createRipple(e, e.currentTarget);
        openModal();
    });
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('save-transaction').addEventListener('click', saveTransaction);

    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    // Event listeners para botões de tipo
    document.querySelectorAll('.btn-type').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-type').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setPersonFieldVisibility(btn.dataset.type);
        });
    });

    // Event listeners para busca
    document.getElementById('transaction-search').addEventListener('input', (e) => {
        renderTransactions(e.target.value);
    });

    // Event listeners para teclado
    document.getElementById('modal-amount').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveTransaction();
    });

    document.getElementById('modal-description').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('modal-amount').focus();
    });

    document.getElementById('rate-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveDailyConfig();
    });

    document.getElementById('salary-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveMonthlyConfig();
    });
});

function showDashboard() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('dashboard-screen').classList.add('active');
    applyModeToInterface();
    updateDashboard();
    
    if (currentMode === 'daily') {
        renderCalendar(currentMonth, currentYear);
    }
}