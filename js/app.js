// ============================================
// CONFIGURAÇÕES E ESTADO GLOBAL
// ============================================

let config = JSON.parse(localStorage.getItem('config') || '{}');
let transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
let editingId = null;

// ============================================
// CALENDÁRIO
// ============================================

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let selectedDate = null;

function renderCalendar(month, year) {
    const daysContainer = document.getElementById('calendar-days');
    const monthYearDisplay = document.getElementById('calendar-month-year');
    const monthDaysCount = document.getElementById('month-days-count');
    const monthTotal = document.getElementById('month-total');
    
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    monthYearDisplay.textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const workedDays = JSON.parse(localStorage.getItem('workedDays') || '{}');
    const dailyRate = parseFloat(config.rate) || 0;
    
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
    
    // Preenche dias restantes do próximo mês
    const totalCells = daysContainer.children.length;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
        const cell = createDayCell(i, year, month + 1, 'other-month');
        daysContainer.appendChild(cell);
    }
    
    // Atualiza estatísticas
    monthDaysCount.textContent = workedCount;
    monthTotal.textContent = `R$ ${monthTotalAmount.toFixed(2).replace('.', ',')}`;
    
    const dayButtons = document.getElementById('day-buttons');
    if (workedCount > 0 || Object.keys(workedDays).length > 0) {
        dayButtons.style.display = 'block';
    }
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
            day: day,
            month: month,
            year: year,
            isWorked: isWorked
        };
        
        updateSelectedDayInfo(selectedDate);
        
        const dayButtons = document.getElementById('day-buttons');
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
        const selectedDate = new Date(selected.year, selected.month, selected.day);
        const isFuture = selectedDate > today;
        
        if (isFuture) {
            addBtn.textContent = '⏳ Dia futuro';
            addBtn.style.opacity = '0.5';
            addBtn.style.cursor = 'default';
            addBtn.disabled = true;
        } else if (isWorked) {
            addBtn.textContent = '✅ Já está marcado';
            addBtn.style.opacity = '0.5';
            addBtn.style.cursor = 'default';
            addBtn.disabled = true;
        } else {
            addBtn.textContent = '✅ Marcar como trabalhado';
            addBtn.style.opacity = '1';
            addBtn.style.cursor = 'pointer';
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
        showToast('Este dia já está marcado como trabalhado!', 'info');
        return;
    }
    
    const today = new Date();
    const selectedDateObj = new Date(selectedDate.year, selectedDate.month, selectedDate.day);
    if (selectedDateObj > today) {
        showToast('Não é possível marcar dias futuros!', 'error');
        return;
    }
    
    workedDays[dateKey] = true;
    localStorage.setItem('workedDays', JSON.stringify(workedDays));
    
    renderCalendar(currentMonth, currentYear);
    updateDashboard();
    
    showToast('✅ Dia marcado como trabalhado!', 'success');
}

function unmarkDayWorked() {
    if (!selectedDate) return;
    
    const dateKey = selectedDate.date;
    const workedDays = JSON.parse(localStorage.getItem('workedDays') || '{}');
    
    if (!workedDays[dateKey]) {
        showToast('Este dia não está marcado como trabalhado!', 'info');
        return;
    }
    
    delete workedDays[dateKey];
    localStorage.setItem('workedDays', JSON.stringify(workedDays));
    
    renderCalendar(currentMonth, currentYear);
    updateDashboard();
    
    showToast('❌ Dia desmarcado!', 'success');
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

// ============================================
// DASHBOARD
// ============================================

function updateDashboard() {
    const config = JSON.parse(localStorage.getItem('config') || '{}');
    const workedDays = JSON.parse(localStorage.getItem('workedDays') || '{}');
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    const dailyRate = parseFloat(config.rate) || 0;
    
    // Calcula dias trabalhados
    const totalWorkedDays = Object.keys(workedDays).filter(key => workedDays[key] === true).length;
    const totalGross = totalWorkedDays * dailyRate;
    
    // Calcula descontos
    let totalDiscounts = 0;
    let totalToReceive = 0;
    let totalRecovered = 0;
    
    transactions.forEach(t => {
        if (t.type === 'personal_discount') {
            totalDiscounts += parseFloat(t.amount) || 0;
        } else if (t.type === 'third_party') {
            if (t.status === 'pending') {
                totalToReceive += parseFloat(t.amount) || 0;
            } else if (t.status === 'received') {
                totalRecovered += parseFloat(t.amount) || 0;
            }
        }
    });
    
    const netBalance = totalGross - totalDiscounts;
    const realBalance = netBalance - totalToReceive;
    
    // Atualiza cards
    document.getElementById('total-gross').textContent = `R$ ${totalGross.toFixed(2).replace('.', ',')}`;
    document.getElementById('total-discounts').textContent = `R$ ${totalDiscounts.toFixed(2).replace('.', ',')}`;
    document.getElementById('total-to-receive').textContent = `R$ ${totalToReceive.toFixed(2).replace('.', ',')}`;
    document.getElementById('total-recovered').textContent = `R$ ${totalRecovered.toFixed(2).replace('.', ',')}`;
    document.getElementById('net-balance').textContent = `R$ ${netBalance.toFixed(2).replace('.', ',')}`;
    document.getElementById('real-balance').textContent = `R$ ${realBalance.toFixed(2).replace('.', ',')}`;
    
    // Atualiza work info
    document.getElementById('work-info').textContent = `${totalWorkedDays} dias trabalhados · R$ ${dailyRate.toFixed(2).replace('.', ',')}/dia`;
    
    // Atualiza summary banner
    const banner = document.getElementById('summary-banner');
    banner.innerHTML = `
        <div class="summary-title">📊 Resumo Financeiro</div>
        <div class="summary-values">
            <span>💰 Bruto: R$ ${totalGross.toFixed(2).replace('.', ',')}</span>
            <span>➖ Descontos: R$ ${totalDiscounts.toFixed(2).replace('.', ',')}</span>
            <span>⚖️ Líquido: R$ ${netBalance.toFixed(2).replace('.', ',')}</span>
            <span>💳 Real: R$ ${realBalance.toFixed(2).replace('.', ',')}</span>
        </div>
    `;
    
    // Atualiza lista de transações
    renderTransactions();
}

function renderTransactions(filter = '') {
    const list = document.getElementById('transactions-list');
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    
    // Ordena por data (mais recente primeiro)
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
        list.innerHTML = `
            <div class="empty-state">
                <p>📭 Nenhuma movimentação encontrada</p>
                <p style="margin-top: 8px; font-size: 14px;">
                    Clique em <strong>Nova Movimentação</strong> para começar
                </p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = filtered.map(t => {
        const typeLabel = t.type === 'personal_discount' ? '👤 Desconto Pessoal' : '👥 Terceiro';
        const statusLabel = t.status === 'received' ? '✅ Recebido' : '⏳ Pendente';
        const dateFormatted = new Date(t.date).toLocaleDateString('pt-BR');
        
        return `
            <div class="transaction-item" data-id="${t.id}">
                <div class="transaction-info">
                    <div class="transaction-desc">${t.description}</div>
                    ${t.person ? `<div class="transaction-person">👤 ${t.person}</div>` : ''}
                    <div class="transaction-date">${dateFormatted} · ${typeLabel} · ${statusLabel}</div>
                </div>
                <div class="transaction-amount">- R$ ${parseFloat(t.amount).toFixed(2).replace('.', ',')}</div>
                <div class="transaction-actions">
                    <button class="action-btn" onclick="editTransaction('${t.id}')">✏️</button>
                    <button class="action-btn" onclick="deleteTransaction('${t.id}')">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// TRANSACTIONS CRUD
// ============================================

function openModal(editData = null) {
    const modal = document.getElementById('modal');
    modal.classList.add('active');
    
    if (editData) {
        document.getElementById('modal-title').textContent = 'Editar Movimentação';
        document.getElementById('modal-description').value = editData.description || '';
        document.getElementById('modal-amount').value = editData.amount || '';
        document.getElementById('modal-person').value = editData.person || '';
        editingId = editData.id;
        
        // Define o tipo
        document.querySelectorAll('.btn-type').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === editData.type);
        });
        
        // Define o status
        if (editData.type === 'third_party') {
            document.getElementById('person-group').style.display = 'block';
            document.getElementById('status-group').style.display = 'block';
            document.querySelectorAll('.btn-status').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.status === editData.status);
            });
        } else {
            document.getElementById('person-group').style.display = 'none';
            document.getElementById('status-group').style.display = 'none';
        }
    } else {
        document.getElementById('modal-title').textContent = 'Nova Movimentação';
        document.getElementById('modal-description').value = '';
        document.getElementById('modal-amount').value = '';
        document.getElementById('modal-person').value = '';
        editingId = null;
        document.querySelectorAll('.btn-type').forEach((btn, index) => {
            btn.classList.toggle('active', index === 0);
        });
        document.getElementById('person-group').style.display = 'none';
        document.getElementById('status-group').style.display = 'none';
    }
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    editingId = null;
}

function saveTransaction() {
    const description = document.getElementById('modal-description').value.trim();
    const amount = parseFloat(document.getElementById('modal-amount').value);
    const type = document.querySelector('.btn-type.active')?.dataset.type || 'personal_discount';
    const person = document.getElementById('modal-person').value.trim();
    const status = document.querySelector('.btn-status.active')?.dataset.status || 'pending';
    
    if (!description) {
        showToast('Por favor, preencha a descrição!', 'error');
        return;
    }
    
    if (isNaN(amount) || amount <= 0) {
        showToast('Por favor, insira um valor válido!', 'error');
        return;
    }
    
    if (type === 'third_party' && !person) {
        showToast('Por favor, informe o nome da pessoa!', 'error');
        return;
    }
    
    let transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    
    if (editingId) {
        // Editando
        const index = transactions.findIndex(t => t.id === editingId);
        if (index !== -1) {
            transactions[index] = {
                ...transactions[index],
                description,
                amount,
                type,
                person: type === 'third_party' ? person : '',
                status: type === 'third_party' ? status : 'pending'
            };
        }
        showToast('✅ Movimentação atualizada!', 'success');
    } else {
        // Nova
        const newTransaction = {
            id: Date.now().toString(),
            description,
            amount,
            type,
            person: type === 'third_party' ? person : '',
            status: type === 'third_party' ? status : 'pending',
            date: new Date().toISOString()
        };
        transactions.push(newTransaction);
        showToast('✅ Movimentação adicionada!', 'success');
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
    if (!confirm('Tem certeza que deseja excluir esta movimentação?')) return;
    
    let transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    transactions = transactions.filter(t => t.id !== id);
    localStorage.setItem('transactions', JSON.stringify(transactions));
    
    updateDashboard();
    showToast('🗑️ Movimentação excluída!', 'success');
}

// ============================================
// CONFIGURAÇÃO INICIAL
// ============================================

function saveConfig() {
    const rate = parseFloat(document.getElementById('rate-input').value);
    
    if (isNaN(rate) || rate <= 0) {
        showToast('Por favor, insira um valor de diária válido!', 'error');
        return;
    }
    
    const config = {
        rate: rate
    };
    
    localStorage.setItem('config', JSON.stringify(config));
    
    document.getElementById('config-screen').classList.remove('active');
    document.getElementById('dashboard-screen').classList.add('active');
    
    // Inicializa dados
    if (!localStorage.getItem('workedDays')) {
        localStorage.setItem('workedDays', '{}');
    }
    if (!localStorage.getItem('transactions')) {
        localStorage.setItem('transactions', '[]');
    }
    
    updateDashboard();
    renderCalendar(currentMonth, currentYear);
    showToast('✅ Configuração salva!', 'success');
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
    document.getElementById('theme-toggle').textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

// ============================================
// RESET
// ============================================

function resetApp() {
    if (!confirm('Tem certeza que deseja resetar todos os dados?')) return;
    if (!confirm('Esta ação não pode ser desfeita. Deseja continuar?')) return;
    
    localStorage.clear();
    location.reload();
}

// ============================================
// NOTIFICATIONS
// ============================================

function requestNotifications() {
    if (!('Notification' in window)) {
        showToast('Este navegador não suporta notificações', 'error');
        return;
    }
    
    if (Notification.permission === 'granted') {
        showToast('Notificações já estão ativadas!', 'info');
        return;
    }
    
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            showToast('🔔 Notificações ativadas!', 'success');
            new Notification('Finance App', {
                body: 'Notificações ativadas com sucesso!',
                icon: '💰'
            });
        } else {
            showToast('❌ Permissão de notificação negada', 'error');
        }
    });
}

// ============================================
// BACKUP
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
                localStorage.setItem('config', JSON.stringify(data.config || {}));
                localStorage.setItem('workedDays', JSON.stringify(data.workedDays || {}));
                localStorage.setItem('transactions', JSON.stringify(data.transactions || []));
                showToast('✅ Backup restaurado com sucesso!', 'success');
                location.reload();
            } catch (error) {
                showToast('❌ Erro ao restaurar backup', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ============================================
// EXPORT
// ============================================

function exportData() {
    const data = {
        config: JSON.parse(localStorage.getItem('config') || '{}'),
        workedDays: JSON.parse(localStorage.getItem('workedDays') || '{}'),
        transactions: JSON.parse(localStorage.getItem('transactions') || '[]')
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('💾 Backup exportado com sucesso!', 'success');
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se já tem configuração
    const config = JSON.parse(localStorage.getItem('config') || '{}');
    
    if (config.rate) {
        document.getElementById('config-screen').classList.remove('active');
        document.getElementById('dashboard-screen').classList.add('active');
        updateDashboard();
        renderCalendar(currentMonth, currentYear);
    }
    
    // Tema
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('theme-toggle').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    
    // Event listeners
    document.getElementById('save-config').addEventListener('click', saveConfig);
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('notifications-btn').addEventListener('click', requestNotifications);
    document.getElementById('restore-backup-btn').addEventListener('click', restoreBackup);
    document.getElementById('reset-btn').addEventListener('click', resetApp);
    
    document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeMonth(1));
    document.getElementById('add-day').addEventListener('click', markDayWorked);
    document.getElementById('remove-day').addEventListener('click', unmarkDayWorked);
    
    document.getElementById('new-transaction').addEventListener('click', () => openModal());
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('save-transaction').addEventListener('click', saveTransaction);
    
    // Fecha modal ao clicar fora
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
    
    // Tipo de transação
    document.querySelectorAll('.btn-type').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-type').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const type = btn.dataset.type;
            document.getElementById('person-group').style.display = type === 'third_party' ? 'block' : 'none';
            document.getElementById('status-group').style.display = type === 'third_party' ? 'block' : 'none';
        });
    });
    
    // Status da transação
    document.querySelectorAll('.btn-status').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-status').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Busca
    document.getElementById('transaction-search').addEventListener('input', (e) => {
        renderTransactions(e.target.value);
    });
    
    // Enter para salvar
    document.getElementById('modal-amount').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveTransaction();
    });
    
    document.getElementById('modal-description').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('modal-amount').focus();
    });
    
    // Enter na tela de configuração
    document.getElementById('rate-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveConfig();
    });
    
    // Cria botão de exportar
    const exportBtn = document.createElement('button');
    exportBtn.id = 'btn-export';
    exportBtn.textContent = '💾 Exportar Backup';
    exportBtn.addEventListener('click', exportData);
    document.querySelector('.transactions-section').appendChild(exportBtn);
});