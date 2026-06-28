// js/app.js - Versão Completa e Autossuficiente

// ============================================
// PARTE 1: STORAGE (DEFINIDO PRIMEIRO)
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

const storage = window.storage || new Storage();
window.storage = storage;
window.Storage = storage;

// ============================================
// PARTE 2: STATE
// ============================================

const state = {
    config: null,
    transactions: [],
    modalType: 'personal_discount',
    modalStatus: 'pending',
    editingId: null
};

// ============================================
// PARTE 3: FUNÇÕES DO APP
// ============================================

// Inicialização
function init() {
    console.log('🚀 Iniciando app...');
    
    // Verificar se o Storage está disponível
    if (typeof storage === 'undefined') {
        console.error('❌ storage não definido!');
        alert('Erro ao carregar o app. Recarregue a página.');
        return;
    }
    
    loadData();
    setupEventListeners();
    updateUI();
    console.log('✅ App iniciado!');
}

// Carregar dados
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

// Configurar eventos
function setupEventListeners() {
    console.log('🔧 Configurando eventos...');

    // ===== Tela de Configuração =====
    // Botões de regime
    document.querySelectorAll('.btn-regime').forEach(btn => {
        btn.addEventListener('click', toggleRegime);
    });

    // Botão salvar configuração
    const saveConfigBtn = document.getElementById('save-config');
    if (saveConfigBtn) {
        saveConfigBtn.addEventListener('click', saveConfig);
        console.log('✅ Botão Salvar Configuração vinculado');
    } else {
        console.warn('⚠️ Botão Salvar Configuração não encontrado');
    }

    // ===== Dashboard =====
    // Botão reset
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetApp);
        console.log('✅ Botão Reset vinculado');
    }

    // Botão adicionar dia
    const addDayBtn = document.getElementById('add-day');
    if (addDayBtn) {
        addDayBtn.addEventListener('click', addDay);
        console.log('✅ Botão Adicionar Dia vinculado');
    }

    // Botão remover dia
    const removeDayBtn = document.getElementById('remove-day');
    if (removeDayBtn) {
        removeDayBtn.addEventListener('click', removeDay);
        console.log('✅ Botão Remover Dia vinculado');
    }

    // Botão nova transação
    const newTransactionBtn = document.getElementById('new-transaction');
    if (newTransactionBtn) {
        newTransactionBtn.addEventListener('click', () => openModal());
        console.log('✅ Botão Nova Movimentação vinculado');
    }

    // ===== Modal =====
    // Botão fechar modal
    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
        console.log('✅ Botão Fechar Modal vinculado');
    }

    // Botões de tipo
    document.querySelectorAll('.btn-type').forEach(btn => {
        btn.addEventListener('click', toggleType);
    });

    // Botões de status
    document.querySelectorAll('.btn-status').forEach(btn => {
        btn.addEventListener('click', toggleStatus);
    });

    // Botão salvar transação
    const saveTransactionBtn = document.getElementById('save-transaction');
    if (saveTransactionBtn) {
        saveTransactionBtn.addEventListener('click', saveTransaction);
        console.log('✅ Botão Salvar Transação vinculado');
    }

    // Fechar modal ao clicar fora
    const modal = document.getElementById('modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeModal();
        });
    }

    // ===== Preencher configuração inicial =====
    if (state.config) {
        const regime = state.config.regime || 'daily';
        const regimeBtn = document.querySelector(`.btn-regime[data-regime="${regime}"]`);
        if (regimeBtn) {
            document.querySelectorAll('.btn-regime').forEach(b => b.classList.remove('active'));
            regimeBtn.classList.add('active');
        }
        
        const rateInput = document.getElementById('rate-input');
        if (rateInput) rateInput.value = state.config.rate || '';
        
        const daysInput = document.getElementById('days-input');
        if (daysInput) daysInput.value = state.config.daysWorked || '';
        
        const daysGroup = document.getElementById('days-group');
        if (daysGroup) {
            daysGroup.style.display = regime === 'daily' ? 'block' : 'none';
        }
        
        const rateLabel = document.getElementById('rate-label');
        if (rateLabel) {
            rateLabel.textContent = regime === 'daily' ? 'Valor por Dia (R$)' : 'Salário Mensal (R$)';
        }
    }

    console.log('✅ Todos os eventos configurados!');
}

// ============================================
// FUNÇÕES DE REGIME E CONFIGURAÇÃO
// ============================================

function toggleRegime(e) {
    console.log('🔄 Toggle Regime:', e.target.dataset.regime);
    document.querySelectorAll('.btn-regime').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    
    const regime = e.target.dataset.regime;
    const daysGroup = document.getElementById('days-group');
    if (daysGroup) {
        daysGroup.style.display = regime === 'daily' ? 'block' : 'none';
    }
    
    const rateLabel = document.getElementById('rate-label');
    if (rateLabel) {
        rateLabel.textContent = regime === 'daily' ? 'Valor por Dia (R$)' : 'Salário Mensal (R$)';
    }
}

function saveConfig() {
    console.log('💾 Salvando configuração...');
    
    const activeRegime = document.querySelector('.btn-regime.active');
    if (!activeRegime) {
        alert('Por favor, selecione um regime.');
        return;
    }

    const regime = activeRegime.dataset.regime;
    const rateInput = document.getElementById('rate-input');
    const daysInput = document.getElementById('days-input');
    
    const rate = parseFloat(rateInput ? rateInput.value : '0');
    const days = parseInt(daysInput ? daysInput.value : '0') || 0;

    console.log('📊 Dados:', { regime, rate, days });

    if (!rate || rate <= 0) {
        alert('Por favor, insira um valor válido.');
        return;
    }

    if (regime === 'daily' && days <= 0) {
        alert('Por favor, insira a quantidade de dias trabalhados.');
        return;
    }

    const config = {
        regime,
        rate,
        daysWorked: regime === 'daily' ? days : 0
    };

    storage.saveConfig(config);
    state.config = config;
    alert('✅ Configurações salvas!');
    showDashboard();
}

// ============================================
// NAVEGAÇÃO
// ============================================

function showDashboard() {
    console.log('📱 Mostrando Dashboard...');
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const dashboard = document.getElementById('dashboard-screen');
    if (dashboard) dashboard.classList.add('active');
    updateUI();
}

function showConfig() {
    console.log('⚙️ Mostrando Configuração...');
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const configScreen = document.getElementById('config-screen');
    if (configScreen) configScreen.classList.add('active');
}

// ============================================
// ATUALIZAR UI
// ============================================

function updateUI() {
    console.log('🔄 Atualizando UI...');
    
    if (!state.config) {
        showConfig();
        return;
    }

    // Atualizar informações de dias
    const workInfo = document.getElementById('work-info');
    if (workInfo) {
        workInfo.textContent = 
            state.config.regime === 'daily' 
                ? `${state.config.daysWorked} dias trabalhados · R$ ${formatBRL(state.config.rate)}/dia`
                : `Salário mensal · R$ ${formatBRL(state.config.rate)}`;
    }

    const daysCount = document.getElementById('days-count');
    if (daysCount) {
        daysCount.textContent = state.config.daysWorked || 0;
    }

    const dayButtons = document.getElementById('day-buttons');
    if (dayButtons) {
        dayButtons.style.display = state.config.regime === 'daily' ? 'block' : 'none';
    }

    // Calcular totais
    const totals = calculateTotals();

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

    const gross = config.regime === 'monthly' 
        ? config.rate 
        : config.rate * (config.daysWorked || 0);

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
// TRANSAÇÕES
// ============================================

function renderTransactions() {
    const list = document.getElementById('transactions-list');
    if (!list) return;

    const transactions = state.transactions;

    if (transactions.length === 0) {
        list.innerHTML = '<p style="color: #9CA3AF; text-align: center; padding: 20px;">Nenhum lançamento registrado</p>';
        return;
    }

    const sorted = [...transactions].reverse();

    list.innerHTML = sorted.map(t => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-desc">
                    ${t.type === 'personal_discount' ? '👤' : '👥'} ${t.description}
                </div>
                ${t.personName ? `<div class="transaction-person">${t.personName} · ${t.status === 'pending' ? '⏳ Pendente' : '✅ Recebido'}</div>` : ''}
                <div class="transaction-date">${t.date}</div>
            </div>
            <div class="transaction-amount">-${formatBRL(t.amount)}</div>
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

// ============================================
// DIAS TRABALHADOS
// ============================================

function addDay() {
    console.log('➕ Adicionando dia...');
    if (!state.config) {
        alert('Configure o app primeiro!');
        return;
    }
    state.config.daysWorked += 1;
    storage.saveConfig(state.config);
    updateUI();
    console.log('✅ Dia adicionado:', state.config.daysWorked);
}

function removeDay() {
    console.log('➖ Removendo dia...');
    if (!state.config) {
        alert('Configure o app primeiro!');
        return;
    }
    if (state.config.daysWorked <= 0) {
        alert('Não há dias para remover.');
        return;
    }
    if (confirm(`Deseja remover 1 dia trabalhado?\n\nVocê tem ${state.config.daysWorked} dia(s) registrado(s).`)) {
        state.config.daysWorked -= 1;
        storage.saveConfig(state.config);
        updateUI();
        console.log('✅ Dia removido:', state.config.daysWorked);
    }
}

// ============================================
// MODAL
// ============================================

function openModal(transactionId = null) {
    console.log('📝 Abrindo modal...', transactionId);
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
    console.log('✅ Modal aberto');
}

function closeModal() {
    console.log('❌ Fechando modal...');
    const modal = document.getElementById('modal');
    if (modal) modal.classList.remove('active');
    state.editingId = null;
}

function toggleType(e) {
    console.log('🔄 Toggle Type:', e.target.dataset.type);
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
    console.log('🔄 Toggle Status:', e.target.dataset.status);
    document.querySelectorAll('.btn-status').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    state.modalStatus = e.target.dataset.status;
}

function saveTransaction() {
    console.log('💾 Salvando transação...');
    
    const descInput = document.getElementById('modal-description');
    const amountInput = document.getElementById('modal-amount');
    const personInput = document.getElementById('modal-person');
    
    const description = descInput ? descInput.value.trim() : '';
    const amount = amountInput ? parseFloat(amountInput.value) : 0;
    const personName = personInput ? personInput.value.trim() : '';
    const type = state.modalType;
    const status = state.modalStatus;

    if (!description) {
        alert('Por favor, insira uma descrição.');
        return;
    }

    if (!amount || amount <= 0) {
        alert('Por favor, insira um valor válido.');
        return;
    }

    if (type === 'third_party' && !personName) {
        alert('Por favor, insira o nome da pessoa.');
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

    console.log('📊 Transação:', transaction);

    if (state.editingId) {
        storage.updateTransaction(state.editingId, transaction);
        console.log('✅ Transação atualizada');
    } else {
        storage.saveTransaction(transaction);
        console.log('✅ Transação salva');
    }

    state.transactions = storage.getTransactions();
    closeModal();
    updateUI();
}

// ============================================
// FUNÇÕES GLOBAIS (para onclick)
// ============================================

window.toggleStatus = function(id) {
    console.log('🔄 Toggling status:', id);
    const transaction = state.transactions.find(t => t.id === id);
    if (!transaction) return;
    
    const newStatus = transaction.status === 'pending' ? 'received' : 'pending';
    storage.updateTransaction(id, { status: newStatus });
    state.transactions = storage.getTransactions();
    updateUI();
};

window.editTransaction = function(id) {
    console.log('✏️ Editando:', id);
    openModal(id);
};

window.deleteTransaction = function(id) {
    console.log('🗑️ Deletando:', id);
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
    console.log('🔄 Resetando app...');
    if (confirm('Tem certeza que deseja apagar todos os dados e recomeçar?\n\nEsta ação não pode ser desfeita!')) {
        storage.resetApp();
        state.config = null;
        state.transactions = [];
        showConfig();
        console.log('✅ App resetado');
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

// Garantir que o DOM está carregado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM já carregado
    init();
}

console.log('📱 App carregado!');

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/finance/service-worker.js')
            .then(reg => console.log('SW registrado!', reg))
            .catch(err => console.error('Erro no registro:', err));
    });
}