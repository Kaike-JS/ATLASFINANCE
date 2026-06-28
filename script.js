// ============================================================
//  ATLAS FINANCE — script.js  (v2 — EmailJS + PDF + Excel)
//  Lógica de negócio, autenticação e CRUD com Supabase.
//  Relatório agora gera PDF com gráficos e envia via EmailJS.
//  Exportação de Excel via SheetJS.
// ============================================================

import {
    initDarkMode,
    renderTrendChart,
    injectTrendChartSection,
    injectBudgetSection,
    injectCSVImportButton,
    openCSVImportModal,
    initKeyboardShortcuts,
    fireConfetti,
    showTableSkeleton,
    injectGoalsPanel,
    enhanceTableRows,
    getBudgets,
    initAmountMask,
    getRawAmountValue,
    initMobileUX,
    initOnboarding,
    setSupabaseContext,
    loadGoalsFromDB,
    loadBudgetsFromDB
} from './features.js';

import {
    animateSummaryCards,
    animateDashboardSections,
    highlightNewRow,
    setupButtonFeedback,
    animateCounters,
    setRawValues,
    setupRipple,
    showToast,
} from './style.js';

import {
    generateSessionToken,
    destroySessionToken,
    isSessionValid,
    startSessionWatchdog,
    setupActivityRenewal,
    getSessionRemainingFormatted,
} from './sessionToken.js';

import {
    scanFields,
    sanitizeString,
    sanitizeText,
    normalizeUserText,
    isValidEmail,
    isValidAmount,
    isValidISODate,
    isValidRecurrence,
    isValidStatus,
    isSafeRecordId,
    isWhitelisted,
    validateTransactionPayload,
    checkLoginBlocked,
    recordFailedAttempt,
    resetLoginAttempts,
    recordSubmitTimestamp,
    isSubmitAllowed,
    showLockoutFeedback,
    showAttemptsWarning,
    clearSecurityAlerts,
} from './security.js';

// ── Configuração Supabase ──
const SUPABASE_URL = "https://agazyxktzrkoyrnxivab.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYXp5eGt0enJrb3lybnhpdmFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MDU1NzcsImV4cCI6MjA5NTA4MTU3N30.5MZnLVPPTP7VLelU8OX-0cxl6mYz6ck1RoxVH3mPumg";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        storage: window.sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
    },
});

// ── Whitelists de valores permitidos nos campos SELECT ──
const ALLOWED_TYPES      = ['income', 'expense'];
const ALLOWED_CATEGORIES = ['Alimentação', 'Transporte', 'Lazer', 'Contas', 'Salário', 'Outros'];

// ── Paleta de cores do Atlas Finance ──
const ATLAS_COLORS = {
    navy:    '#0a192f',
    teal:    '#2a9d8f',
    gold:    '#c5a059',
    red:     '#e63946',
    blue:    '#457b9d',
    orange:  '#f4a261',
    light:   '#f8f9fa',
    white:   '#ffffff',
};

const CATEGORY_COLORS = [
    ATLAS_COLORS.navy,
    ATLAS_COLORS.teal,
    ATLAS_COLORS.gold,
    ATLAS_COLORS.red,
    ATLAS_COLORS.blue,
    ATLAS_COLORS.orange,
];

// ── Estado ──
let currentUser = null;
let transactions = [];
let expenseChartInstance = null;

// ── Elementos DOM ──
const loginView       = document.getElementById('login-view');
const appView         = document.getElementById('app-view');
const loginForm       = document.getElementById('login-form');
const displayUser     = document.getElementById('display-user');
const form            = document.getElementById('transaction-form');
const transactionList = document.getElementById('transaction-list');
const balanceDisplay  = document.getElementById('total-balance');
const incomeDisplay   = document.getElementById('total-income');
const expenseDisplay  = document.getElementById('total-expense');

// ── Inicializa efeitos visuais globais ──
setupRipple();
initDarkMode();

// ============================================================
//  AUTENTICAÇÃO
// ============================================================

async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();

    if (session?.user) {
        currentUser = session.user;

        // Se não há token local (ex: recarregamento de página), gera um novo
        // para que _requireValidSession() e fetchTransactions funcionem corretamente.
        if (!isSessionValid()) {
            generateSessionToken();
        }

        _initSessionSystem();
        showAppScreen();
    }
}

loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const btnSubmit = loginForm.querySelector('.btn-submit');
    const email     = document.getElementById('username').value.trim();
    const pass      = document.getElementById('password').value.trim();

    const lockStatus = checkLoginBlocked();
    if (lockStatus.blocked) {
        showLockoutFeedback(lockStatus.remainingMs, btnSubmit);
        return;
    }

    if (!isSubmitAllowed()) {
        showToast('Aguarde um momento antes de tentar novamente.', 'error');
        return;
    }
    recordSubmitTimestamp();

    if (!isValidEmail(email)) {
        showToast('Formato de e-mail inválido.', 'error');
        return;
    }

    const scan = scanFields({ email, senha: pass });
    if (!scan.safe) {
        console.error(`[Atlas Security] Payload malicioso detectado no campo "${scan.field}" (${scan.type})`);
        showToast('Entrada inválida detectada. Acesso negado.', 'error');
        return;
    }

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password: pass });

    if (!error && data.user) {
        resetLoginAttempts();
        clearSecurityAlerts();
        currentUser = data.user;

        const token = generateSessionToken();
        console.info(`[Atlas Security] Login bem-sucedido. Token: ${token}`);

        _initSessionSystem();
        showAppScreen();
    } else {
        const result = recordFailedAttempt();

        if (result.locked) {
            showLockoutFeedback(result.lockoutMs, btnSubmit);
            showToast(`Acesso bloqueado por ${Math.round(result.lockoutMs / 1000)}s.`, 'error');
        } else {
            showAttemptsWarning(result.attemptsLeft);
            showToast('E-mail ou senha incorretos.', 'error');
        }
    }
});

function _initSessionSystem() {
    startSessionWatchdog(async (reason) => {
        console.warn('[Atlas Security] Sessão expirada:', reason);
        await _forceLogoutInternal();
    });
    setupActivityRenewal();
    _renderSessionTimer();
}

async function _forceLogoutInternal() {
    destroySessionToken();
    await _supabase.auth.signOut();
    currentUser    = null;
    transactions   = [];
    appView.classList.add('hidden');
}

window.logout = async function () {
    destroySessionToken();
    await _supabase.auth.signOut();
    currentUser  = null;
    transactions = [];

    const timerEl = document.getElementById('session-timer-display');
    if (timerEl) timerEl.remove();

    appView.classList.add('hidden');
    loginView.classList.remove('hidden');
    showToast('Você desembarcou com segurança.', 'info');
};

// ============================================================
//  TIMER DE SESSÃO NO HEADER
// ============================================================

function _renderSessionTimer() {
    const old = document.getElementById('session-timer-display');
    if (old) old.remove();

    const timerEl = document.createElement('div');
    timerEl.id = 'session-timer-display';
    timerEl.setAttribute('title', 'Tempo restante de sessão');
    timerEl.style.cssText = `
        font-family: 'Montserrat', sans-serif;
        font-size: 0.7rem;
        font-weight: 700;
        color: rgba(255,255,255,0.55);
        letter-spacing: 1px;
        display: flex;
        align-items: center;
        gap: 5px;
        cursor: default;
        user-select: none;
    `;
    timerEl.innerHTML = `<span style="opacity:0.7">⏱</span> <span id="session-timer-value">30:00</span>`;

    const greeting = document.querySelector('.greeting');
    if (greeting) {
        greeting.style.display    = 'flex';
        greeting.style.alignItems = 'center';
        greeting.style.gap        = '10px';
        greeting.appendChild(timerEl);
    }

    const valueEl = document.getElementById('session-timer-value');
    const _update = () => {
        if (!valueEl) return;
        valueEl.textContent = getSessionRemainingFormatted();
        const ms = parseInt(sessionStorage.getItem('atlas_session_expiry') || '0', 10) - Date.now();
        timerEl.style.color = (ms <= 5 * 60_000 && ms > 0) ? '#e63946' : 'rgba(255,255,255,0.55)';
    };
    _update();
    setInterval(_update, 1000);
}

// ============================================================
//  GUARD DE SESSÃO
// ============================================================

function _requireValidSession() {
    if (!isSessionValid()) {
        showToast('Sessão expirada. Faça login novamente.', 'error');
        _forceLogoutInternal();
        throw new Error('SESSION_EXPIRED');
    }
}

// ============================================================
//  NAVEGAÇÃO DE TELAS
// ============================================================

// ── Garante que as tabelas user_goals e user_budgets existam para o usuário ──
// As tabelas devem ser criadas no Supabase Dashboard com as SQLs abaixo:
// 
async function _ensureUserTables() {
    // Apenas verifica se já existe registro de orçamento; cria se não
    try {
        const { error } = await _supabase
            .from('user_budgets')
            .select('user_id')
            .eq('user_id', currentUser.id)
            .maybeSingle();
        // Se a tabela não existir, o erro aparece no console e o app continua
        if (error && error.code !== 'PGRST116') {
            console.warn('user_budgets não encontrada — crie as tabelas no Supabase Dashboard.', error.message);
        }
    } catch (e) { /* silencia */ }
}

async function showAppScreen() {
    loginView.classList.add('hidden');
    appView.classList.remove('hidden');

    const rawName = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    displayUser.innerText = sanitizeString(rawName);

    // ── Contexto Supabase para features.js (metas e orçamentos no banco) ──
    setSupabaseContext(_supabase, currentUser.id);
    await _ensureUserTables();
    await loadGoalsFromDB(_supabase, currentUser.id);
    await loadBudgetsFromDB(_supabase, currentUser.id);

    // ── Inicializa funcionalidades avançadas ──
    enhanceTableRows();
    injectTrendChartSection();
    injectGoalsPanel();

    animateDashboardSections();
    highlightNewRow();
    setupButtonFeedback('transaction-form', 'Lançar no Diário');

    // ── Inicializações Mobile, Máscaras de Entrada e Onboarding Guiado ──
    initAmountMask();
    initMobileUX();
    initOnboarding();

    // ── Botão de importar CSV no header ──
    injectCSVImportButton();

    // ── Atalhos de teclado ──
    initKeyboardShortcuts({
        onDownloadPDF:   () => window.downloadReportPDF?.(),
        onExportExcel:   () => window.exportToExcel?.(),
        onImportCSV:     () => openCSVImportModal(_handleCSVImport),
    });

    // ── Skeleton loading enquanto carrega ──
    showTableSkeleton('transaction-list', 6);

    // Passa callback de importação para o botão do header
    document.getElementById('btn-import-csv')
        ?.addEventListener('click', () => openCSVImportModal(_handleCSVImport), { once: true });

    // Ouve atualização de orçamentos
    window.addEventListener('atlas:budgets-updated', () => {
        injectBudgetSection(transactions);
    });

    await fetchTransactions();
    animateSummaryCards();
}

// ── Importação de CSV: insere as transações via Supabase ──
async function _handleCSVImport(parsedRows) {
    if (!currentUser || parsedRows.length === 0) return;
    try {
        _requireValidSession();
    } catch {
        return;
    }

    const toInsert = [];

    for (const r of parsedRows.slice(0, 500)) {
        const payload = {
            user_id: currentUser.id,
            desc: normalizeUserText(r.desc, 90),
            amount: Number(r.amount),
            type: r.type,
            category: isWhitelisted(r.category, ALLOWED_CATEGORIES) ? r.category : 'Outros',
            observation: 'Importado via CSV',
            status: 'paid',
            recurrence: 'unique',
            installment_info: null,
            due_date: isValidISODate(r.due_date) ? r.due_date : new Date().toISOString().split('T')[0],
        };

        const validation = validateTransactionPayload(payload, ALLOWED_TYPES, ALLOWED_CATEGORIES);
        if (validation.safe) {
            toInsert.push(validation.value);
        }
    }

    if (toInsert.length === 0) {
        showToast('Nenhuma transação segura foi encontrada no CSV.', 'error');
        return;
    }

    const { error } = await _supabase.from('transactions').insert(toInsert);
    if (!error) {
        fireConfetti();
        showToast(`⚓ ${toInsert.length} transações importadas com sucesso!`, 'success');
        await fetchTransactions();
    } else {
        showToast('Erro ao importar: ' + error.message, 'error');
    }
}

// ============================================================
//  CRUD — Supabase com validação e sanitização completas
// ============================================================

async function fetchTransactions() {
    _requireValidSession();

    // Ordena por created_at (gerado automaticamente pelo Supabase)
    let { data, error } = await _supabase
        .from('transactions')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (!error) {
        transactions = data || [];
        updateAppInterface();
    } else {
        console.error('[Atlas] Erro ao buscar transações:', error.message, error);
        showToast('Erro ao carregar transações: ' + error.message, 'error');
    }
}

// ============================================================
//  LÓGICA DE DATAS, PARCELAS E ALERTAS (Visual & Estrutural)
// ============================================================

// Controla a exibição dos campos de vencimento no formulário
window.toggleFutureFields = function() {
    const checkedStatus = document.querySelector('input[name="status"]:checked');
    const isPending = checkedStatus && checkedStatus.value === 'pending';
    const futureFields = document.getElementById('future-fields');
    const installmentGroup = document.getElementById('installment-group');
    const statusGroup = document.querySelector('.status-group');
    const formSection = document.querySelector('.form-section');
    
    if (futureFields) {
        futureFields.style.display = isPending ? 'flex' : 'none';
        futureFields.classList.toggle('future-fields-visible', isPending);
        futureFields.setAttribute('aria-hidden', String(!isPending));
    }

    statusGroup?.classList.toggle('is-pending', isPending);
    statusGroup?.classList.toggle('is-paid', !isPending);
    formSection?.classList.toggle('has-pending-route', isPending);

    // Se mudar para realizada, reseta os campos extras
    if (!isPending) {
        if (installmentGroup) {
            installmentGroup.style.display = 'none';
            installmentGroup.classList.remove('installment-visible');
            installmentGroup.setAttribute('aria-hidden', 'true');
        }

        const recurrenceSelect = document.getElementById('recurrence');
        if (recurrenceSelect) {
            recurrenceSelect.value = 'unique';
        }
    } else {
        window.setTimeout(() => document.getElementById('due-date')?.focus(), 120);
    }
};

// Controle do campo de parcelas
window.toggleInstallmentField = function() {
    const recurrenceSelect = document.getElementById('recurrence');
    const isInstallment = recurrenceSelect && recurrenceSelect.value === 'installment';

    const installmentGroup = document.getElementById('installment-group');

    if (installmentGroup) {
        installmentGroup.style.display = isInstallment ? 'flex' : 'none';
        installmentGroup.classList.toggle('installment-visible', isInstallment);
        installmentGroup.setAttribute('aria-hidden', String(!isInstallment));
    }
};

// ============================================================
//  SUBMIT INTELIGENTE — COM PARCELAMENTO E AGENDAMENTO
// ============================================================

form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!currentUser) {
        showToast('Sessão inválida. Faça login novamente.', 'error');
        return;
    }

    try {
        _requireValidSession();
    } catch {
        return;
    }

    const rawDesc = normalizeUserText(document.getElementById('desc').value, 90);
    const rawAmt = getRawAmountValue();
    const rawType = document.getElementById('type').value;
    const rawCat = document.getElementById('category').value;
    const rawObs = normalizeUserText(document.getElementById('observation').value, 220);

    // Segurança Atlas
    const scan = scanFields({
        descricao: rawDesc,
        observacao: rawObs
    });

    if (!scan.safe) {
        showToast(`Entrada inválida no campo "${scan.field}"`, 'error');
        return;
    }

    if (!isValidAmount(rawAmt)) {
        showToast('Informe um valor válido.', 'error');
        return;
    }

    if (!isWhitelisted(rawType, ALLOWED_TYPES)) {
        showToast('Tipo inválido.', 'error');
        return;
    }

    if (!isWhitelisted(rawCat, ALLOWED_CATEGORIES)) {
        showToast('Categoria inválida.', 'error');
        return;
    }

    const checkedStatus = document.querySelector('input[name="status"]:checked');

    if (!checkedStatus) {
        showToast('Selecione o status da transação.', 'error');
        return;
    }

    const status = checkedStatus.value;
    if (!isValidStatus(status)) {
        showToast('Status inválido.', 'error');
        return;
    }

    const recurrenceSelect = document.getElementById('recurrence');
    const recurrence = recurrenceSelect ? recurrenceSelect.value : 'unique';
    if (!isValidRecurrence(recurrence)) {
        showToast('Recorrência inválida.', 'error');
        return;
    }

    // ============================================================
    // DATA BASE
    // ============================================================

    let startDate = new Date();

    if (status === 'pending') {
        const dueInput = document.getElementById('due-date').value;

        if (!dueInput) {
            showToast('Informe a data de vencimento.', 'error');
            return;
        }

        if (!isValidISODate(dueInput)) {
            showToast('Data de vencimento inválida.', 'error');
            return;
        }

        startDate = new Date(dueInput + 'T12:00:00');
    }

    // ============================================================
    // PARCELAMENTO
    // ============================================================

    const installmentInput = document.getElementById('installments-total');

    const totalInstallments =
        recurrence === 'installment'
            ? parseInt(installmentInput?.value || '1', 10)
            : 1;

    if (totalInstallments <= 0 || totalInstallments > 120) {
        showToast('Quantidade de parcelas inválida.', 'error');
        return;
    }

    const transactionsToInsert = [];

    for (let i = 0; i < totalInstallments; i++) {

        const nextDueDate = new Date(startDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + i);

        let descWithInstallment = rawDesc;
        let installmentInfo = null;

        if (recurrence === 'installment') {
            descWithInstallment =
                `${rawDesc} (${i + 1}/${totalInstallments})`;

            installmentInfo =
                `${i + 1}/${totalInstallments}`;
        }

        const payload = {
            user_id: currentUser.id,

            desc: sanitizeText(descWithInstallment),

            amount: parseFloat(rawAmt.toFixed(2)),

            type: rawType,

            category: rawCat,

            observation: sanitizeText(rawObs),

            status: status,

            recurrence: recurrence,

            installment_info: installmentInfo,

            due_date:
                status === 'pending'
                    ? nextDueDate.toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0],
        };

        const validation = validateTransactionPayload(payload, ALLOWED_TYPES, ALLOWED_CATEGORIES);
        if (!validation.safe) {
            showToast(`Dados inválidos: ${validation.errors.join(', ')}.`, 'error');
            return;
        }

        transactionsToInsert.push(validation.value);
    }

    // ============================================================
    // INSERT EM LOTE
    // ============================================================

    const { error } = await _supabase
        .from('transactions')
        .insert(transactionsToInsert);

    if (!error) {

        form.reset();

        toggleFutureFields();

        showToast(
            transactionsToInsert.length > 1
                ? `⚓ ${transactionsToInsert.length} parcelas registradas!`
                : '⚓ Transação registrada!',
            'success'
        );

        await fetchTransactions();

    } else {

        console.error('[Atlas] Erro ao inserir:', error);

        showToast(
            'Erro ao salvar: ' + error.message,
            'error'
        );
    }
});

// ============================================================
//  RENDERIZAÇÃO — com sanitização dos dados do banco
// ============================================================

const formatCurrency = (value) =>
    Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function appendText(parent, tag, text, className = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = text;
    parent.appendChild(el);
    return el;
}

let currentSearchQuery = '';

// Listener para a barra de pesquisa
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.toLowerCase().trim();
        updateAppInterface(); // Re-renderiza a tabela em tempo real
    });
}

function calculateInsights(filteredTransactions) {
    const insightsContainer = document.getElementById('smart-insights');
    const expenses = filteredTransactions.filter(t => t.type === 'expense');

    if (expenses.length === 0) {
        insightsContainer.classList.add('hidden');
        return;
    }
    
    insightsContainer.classList.remove('hidden');

    // 1. Maior Despesa
    const highestExpense = expenses.reduce((max, t) => t.amount > max.amount ? t : max, expenses[0]);
    
    // 2. Categoria Vilã (Onde gastou mais)
    const categoryTotals = {};
    expenses.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
    const worstCategory = Object.keys(categoryTotals).reduce((a, b) => categoryTotals[a] > categoryTotals[b] ? a : b);
    
    // 3. Média Diária (Baseado nos dias que tiveram gastos)
    const uniqueDays = new Set(expenses.map(t => new Date(t.created_at).toLocaleDateString('pt-BR'))).size;
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const dailyAvg = totalExpense / (uniqueDays || 1);

    // Atualiza a UI
    document.getElementById('insight-highest-expense').textContent = formatCurrency(highestExpense.amount);
    document.getElementById('insight-highest-expense').title = highestExpense.desc; // Mostra o nome no hover
    document.getElementById('insight-daily-avg').textContent = formatCurrency(dailyAvg);
    document.getElementById('insight-worst-category').textContent = worstCategory;
}

function _parseDateInput(value) {
    if (!value) return null;
    // Garante que a data seja interpretada no meio do dia para evitar problemas de timezone
    const d = new Date(value + 'T12:00:00');
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function updateAppInterface() {
    transactionList.innerHTML = '';

    let totalIncome = 0;
    let totalExpense = 0;
    let pendingIncome = 0;
    let pendingExpense = 0;

    // Filtro de Busca em Tempo Real
    const displayTransactions = transactions.filter(t => {
        if (!currentSearchQuery) return true;
        const searchString = `${t.desc} ${t.category}`.toLowerCase();
        return searchString.includes(currentSearchQuery);
    });

    // Aplica filtro por intervalo de datas (se configurado no header)
    const fromInput = document.getElementById('report-from');
    const toInput   = document.getElementById('report-to');
    const fromDate = fromInput ? _parseDateInput(fromInput.value) : null;
    const toDateRaw = toInput ? _parseDateInput(toInput.value) : null;
    const toDate = toDateRaw ? new Date(toDateRaw.getFullYear(), toDateRaw.getMonth(), toDateRaw.getDate(), 23,59,59) : null;

    const filteredByDate = displayTransactions.filter(t => {
        const d = t.created_at ? new Date(t.created_at) : null;
        if (!d) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
    });

    filteredByDate.forEach(t => {
        // ✨ LÓGICA CORRIGIDA: Separa o dinheiro real da previsão futura
        if (t.status === 'pending') {
            if (t.type === 'income') pendingIncome += t.amount;
            if (t.type === 'expense') pendingExpense += t.amount;
        } else {
            if (t.type === 'income')  totalIncome  += t.amount;
            if (t.type === 'expense') totalExpense += t.amount;
        }

        const dataOrigem    = t.created_at;
        const dataFormatada = dataOrigem ? new Date(dataOrigem).toLocaleDateString('pt-BR') : '---';
        const horaFormatada = dataOrigem ? new Date(dataOrigem).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '---';

        const safeDesc = normalizeUserText(t.desc || '', 90);
        const safeCat  = isWhitelisted(t.category, ALLOWED_CATEGORIES) ? t.category : 'Outros';
        const safeObs  = normalizeUserText(t.observation || '', 220);
        const safeType = isWhitelisted(t.type, ALLOWED_TYPES) ? t.type : 'expense';
        const amount = Number.isFinite(Number(t.amount)) ? Number(t.amount) : 0;

        const row = document.createElement('tr');
        
        // Deixa a linha visualmente diferente se for pendente
        if (t.status === 'pending') {
            row.style.opacity = '0.6';
            row.style.background = 'rgba(197, 160, 89, 0.05)';
        }

        const descCell = document.createElement('td');
        appendText(descCell, 'strong', safeDesc || 'Sem descrição');
        if (t.status === 'pending') {
            const badge = appendText(descCell, 'span', ' ⏳ PREVISTO');
            badge.style.cssText = 'font-size:0.65rem;background:#c5a059;color:#fff;padding:2px 6px;border-radius:4px;margin-left:5px;';
        }
        descCell.appendChild(document.createElement('br'));
        const dateEl = appendText(descCell, 'small', `📅 ${dataFormatada} às ${horaFormatada}`);
        dateEl.style.color = '#888';
        if (safeObs) {
            descCell.appendChild(document.createElement('br'));
            const obsEl = appendText(descCell, 'span', `⚓ ${safeObs}`, 'transaction-obs');
            obsEl.style.cssText = 'font-size:0.8rem;color:#2a9d8f;';
        }

        const catCell = document.createElement('td');
        appendText(catCell, 'span', safeCat, 'badge-category');

        const amountCell = document.createElement('td');
        amountCell.className = `type-${safeType}`;
        amountCell.textContent = `${safeType === 'expense' ? '-' : '+'} ${formatCurrency(amount)}`;

        const typeCell = document.createElement('td');
        typeCell.textContent = safeType === 'income' ? '⚓ Entrada' : '🌊 Saída';

        const actionCell = document.createElement('td');
        actionCell.className = 'action-cell';
        actionCell.style.cssText = 'text-align:center; vertical-align: middle;';

        row.append(descCell, catCell, amountCell, typeCell, actionCell);


        // Cria o botão de Pagar (somente se estiver pendente)
        if (t.status === 'pending') {
            const btnPay = document.createElement('button');
            btnPay.className = 'btn-mark-paid';
            btnPay.style.cssText = 'padding:0.25rem 0.5rem; font-size:0.7rem; margin-bottom: 5px; width: 100%;';
            btnPay.title = 'Pagar agora';
            btnPay.textContent = 'Pagar';
            
            // Aqui está a MÁGICA: O evento fica amarrado direto à função sem depender do "window"
            btnPay.addEventListener('click', () => markAsPaid(t.id));
            
            actionCell.appendChild(btnPay);
            actionCell.appendChild(document.createElement('br'));
        }

        // Cria o botão de Excluir
        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn-delete';
        btnDelete.style.cssText = 'width: 100%;';
        btnDelete.title = 'Excluir lançamento';
        btnDelete.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        `;
        
        // Novamente, amarrado de forma nativa e segura
        btnDelete.addEventListener('click', () => deleteTransaction(t.id));
        
        actionCell.appendChild(btnDelete);

        // Anexa a linha pronta na tabela
        transactionList.appendChild(row);
    });

    // Atualiza os cards principais apenas com o que é REAL
    const balance = totalIncome - totalExpense;
    setRawValues(totalIncome, totalExpense, balance);
    incomeDisplay.textContent  = formatCurrency(totalIncome);
    expenseDisplay.textContent = formatCurrency(totalExpense);
    balanceDisplay.textContent = formatCurrency(balance);
    
    // ✨ CONTROLE DA CAIXINHA DE SALDO FUTURO
    const saldoFuturo = balance + pendingIncome - pendingExpense;
    const temPendencias = (pendingIncome > 0 || pendingExpense > 0);
    
    const futureContainer = document.getElementById('future-balance-container');
    const futureValue = document.getElementById('future-balance-value');
    
    if (futureContainer && futureValue) {
        if (temPendencias) {
            futureValue.textContent = formatCurrency(saldoFuturo);
            futureContainer.classList.remove('future-balance-hidden');
        } else {
            futureContainer.classList.add('future-balance-hidden');
        }
    }
    
    animateCounters();
    updateChart(filteredByDate);
    calculateInsights(filteredByDate);
    checkUpcomingDebts(transactions);

    // ── Gráfico de tendência e orçamentos (features.js) ──
    renderTrendChart(filteredByDate);
    injectBudgetSection(filteredByDate);

    // ── Confetti se saldo aumentou para positivo ──
    const prevBalance = parseFloat(balanceDisplay.dataset.lastBalance || '0');
    if (balance > 0 && prevBalance <= 0 && transactions.length > 0) {
        fireConfetti();
    }
    balanceDisplay.dataset.lastBalance = String(balance);
}

function updateChart(txList = transactions) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const expenses = txList.filter(t => t.type === 'expense');

    const categoryTotals = {};
    expenses.forEach(t => {
        const cat = isWhitelisted(t.category, ALLOWED_CATEGORIES) ? t.category : 'Outros';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
    });

    const labels = Object.keys(categoryTotals);
    const data   = Object.values(categoryTotals);

    if (expenseChartInstance) expenseChartInstance.destroy();
    if (!data.length) return;

    // Detecta se tema escuro está ativo
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    const labelColor = isDarkMode ? '#ffffff' : '#1e293b';

    expenseChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: CATEGORY_COLORS,
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverBorderWidth: 4,
            }],
        },
        options: {
            responsive: true,
            animation: { animateRotate: true, duration: 700 },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { family: 'Montserrat', size: 11 },
                        color: labelColor,
                        padding: 14,
                        usePointStyle: true,
                    },
                },
            },
            cutout: '68%',
        },
    });
}

// Expõe updateChart globalmente para que features.js possa chamar
window.updateChart = updateChart;

// ============================================================
//  GERADOR DE PDF — jsPDF + Chart.js offscreen
// ============================================================

/**
 * Renderiza um gráfico de doughnut em um canvas oculto e
 * retorna a imagem em base64 para incorporar no PDF.
 */
async function _renderChartToBase64(filteredTransactions) {
    return new Promise((resolve) => {
        const offscreen = document.createElement('canvas');
        offscreen.width  = 500;
        offscreen.height = 300;
        offscreen.style.display = 'none';
        document.body.appendChild(offscreen);

        const expenses = filteredTransactions.filter(t => t.type === 'expense');
        const categoryTotals = {};
        expenses.forEach(t => {
            const cat = isWhitelisted(t.category, ALLOWED_CATEGORIES) ? t.category : 'Outros';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
        });

        const labels = Object.keys(categoryTotals);
        const data   = Object.values(categoryTotals);

        if (!data.length) {
            offscreen.remove();
            resolve(null);
            return;
        }

        const chart = new Chart(offscreen.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: CATEGORY_COLORS,
                    borderWidth: 3,
                    borderColor: '#ffffff',
                }],
            },
            options: {
                responsive: false,
                animation: { duration: 0 },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { family: 'Montserrat', size: 13 },
                            color: '#1e293b',
                            padding: 14,
                            usePointStyle: true,
                        },
                    },
                },
                cutout: '60%',
            },
        });

        // Aguarda o Chart.js terminar de renderizar
        setTimeout(() => {
            const img = offscreen.toDataURL('image/png');
            chart.destroy();
            offscreen.remove();
            resolve(img);
        }, 300);
    });
}

/**
 * Renderiza um gráfico de barras mostrando receitas x despesas por categoria.
 */
async function _renderBarChartToBase64(filteredTransactions) {
    return new Promise((resolve) => {
        const offscreen = document.createElement('canvas');
        offscreen.width  = 560;
        offscreen.height = 280;
        offscreen.style.display = 'none';
        document.body.appendChild(offscreen);

        const incomeByCategory  = {};
        const expenseByCategory = {};
        const allCategories     = new Set();

        filteredTransactions.forEach(t => {
            const cat = isWhitelisted(t.category, ALLOWED_CATEGORIES) ? t.category : 'Outros';
            allCategories.add(cat);
            if (t.type === 'income')  incomeByCategory[cat]  = (incomeByCategory[cat]  || 0) + t.amount;
            if (t.type === 'expense') expenseByCategory[cat] = (expenseByCategory[cat] || 0) + t.amount;
        });

        const labels = [...allCategories];

        const chart = new Chart(offscreen.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Entradas',
                        data: labels.map(l => incomeByCategory[l] || 0),
                        backgroundColor: ATLAS_COLORS.teal + 'CC',
                        borderColor: ATLAS_COLORS.teal,
                        borderWidth: 2,
                        borderRadius: 4,
                    },
                    {
                        label: 'Saídas',
                        data: labels.map(l => expenseByCategory[l] || 0),
                        backgroundColor: ATLAS_COLORS.red + 'CC',
                        borderColor: ATLAS_COLORS.red,
                        borderWidth: 2,
                        borderRadius: 4,
                    },
                ],
            },
            options: {
                responsive: false,
                animation: { duration: 0 },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: { family: 'Montserrat', size: 12 },
                            color: '#1e293b',
                        },
                    },
                },
                scales: {
                    x: {
                        ticks: { font: { size: 11 }, color: '#475569' },
                        grid: { display: false },
                    },
                    y: {
                        ticks: {
                            font: { size: 10 },
                            color: '#475569',
                            callback: (v) => `R$ ${v.toLocaleString('pt-BR')}`,
                        },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                    },
                },
            },
        });

        setTimeout(() => {
            const img = offscreen.toDataURL('image/png');
            chart.destroy();
            offscreen.remove();
            resolve(img);
        }, 300);
    });
}

/**
 * Gera o PDF completo do relatório Atlas Finance.
 * Retorna o PDF como base64 string para envio por e-mail.
 */
async function generateReportPDF(filteredTransactions, nomeMes, userName) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const W = doc.internal.pageSize.getWidth();   // 210mm
    const H = doc.internal.pageSize.getHeight();  // 297mm
    const margin = 18;
    let y = 0; // cursor vertical

    // ─────────────────────────────────────────────
    // PÁGINA 1 — CAPA
    // ─────────────────────────────────────────────

    // Fundo azul marinho na capa
    doc.setFillColor(10, 25, 47);
    doc.rect(0, 0, W, H, 'F');

    // Faixa dourada decorativa no topo
    doc.setFillColor(197, 160, 89);
    doc.rect(0, 0, W, 6, 'F');

    // Faixa dourada na base
    doc.setFillColor(197, 160, 89);
    doc.rect(0, H - 6, W, 6, 'F');

    // Linha decorativa secundária no topo
    doc.setFillColor(42, 157, 143);
    doc.rect(0, 6, W, 2, 'F');

    // Círculo decorativo de fundo (marca d'água)
    doc.setFillColor(255, 255, 255);
    doc.setGState(new doc.GState({ opacity: 0.03 }));
    doc.circle(W / 2, H / 2, 95, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));

    // ── Âncora (emoji SVG via texto decorativo) ──
    doc.setFontSize(52);
    doc.setTextColor(197, 160, 89);
    doc.text('⚓', W / 2, 90, { align: 'center' });

    // ── Nome do app ──
    doc.setFontSize(34);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('ATLAS FINANCE', W / 2, 112, { align: 'center' });

    // ── Subtítulo ──
    doc.setFontSize(13);
    doc.setTextColor(197, 160, 89);
    doc.setFont('helvetica', 'normal');
    doc.text('DIÁRIO DE BORDO FINANCEIRO', W / 2, 124, { align: 'center' });

    // ── Linha divisória dourada ──
    doc.setDrawColor(197, 160, 89);
    doc.setLineWidth(0.6);
    doc.line(margin + 20, 132, W - margin - 20, 132);

    // ── Período ──
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(nomeMes.toUpperCase(), W / 2, 148, { align: 'center' });

    // ── Comandante ──
    doc.setFontSize(10);
    doc.setTextColor(180, 200, 220);
    doc.setFont('helvetica', 'normal');
    doc.text(`Comandante: ${userName}`, W / 2, 162, { align: 'center' });

    // ── Data de geração ──
    const now = new Date();
    const geradoEm = now.toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
    doc.setFontSize(9);
    doc.setTextColor(120, 150, 180);
    doc.text(`Gerado em ${geradoEm}`, W / 2, 170, { align: 'center' });

    // ── Totais na capa ──
    let totalIncome = 0, totalExpense = 0;
    filteredTransactions.forEach(t => {
        if (t.type === 'income')  totalIncome  += t.amount;
        if (t.type === 'expense') totalExpense += t.amount;
    });
    const balance = totalIncome - totalExpense;

    const summaryY = 200;
    const boxW = 50, boxH = 28, gap = 8;
    const startX = (W - (3 * boxW + 2 * gap)) / 2;

    const summaryBoxes = [
        { label: 'ENTRADAS', value: totalIncome, color: [42, 157, 143] },
        { label: 'SAÍDAS',   value: totalExpense, color: [230, 57, 70] },
        {
            label: 'SALDO',
            value: balance,
            color: balance >= 0 ? [197, 160, 89] : [230, 57, 70],
        },
    ];

    summaryBoxes.forEach((box, i) => {
        const bx = startX + i * (boxW + gap);

        // Fundo do card
        doc.setFillColor(255, 255, 255);
        doc.setGState(new doc.GState({ opacity: 0.07 }));
        _roundedRect(doc, bx, summaryY, boxW, boxH, 4, 'F');
        doc.setGState(new doc.GState({ opacity: 1 }));

        // Borda colorida superior
        doc.setFillColor(...box.color);
        _roundedRect(doc, bx, summaryY, boxW, 2, 2, 'F');

        // Label
        doc.setFontSize(7);
        doc.setTextColor(180, 200, 220);
        doc.setFont('helvetica', 'bold');
        doc.text(box.label, bx + boxW / 2, summaryY + 9, { align: 'center' });

        // Valor
        doc.setFontSize(9);
        doc.setTextColor(...box.color);
        doc.setFont('helvetica', 'bold');
        const valorStr = box.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        doc.text(valorStr, bx + boxW / 2, summaryY + 20, { align: 'center' });
    });

    // ── Rodapé da capa ──
    doc.setFontSize(8);
    doc.setTextColor(80, 110, 140);
    doc.text('Navegando com precisão desde 2025', W / 2, H - 12, { align: 'center' });

    // ─────────────────────────────────────────────
    // PÁGINA 2 — GRÁFICOS
    // ─────────────────────────────────────────────
    doc.addPage();
    _drawPageHeader(doc, W, margin, 'Análise Visual', nomeMes);
    y = 38;

    // Gera os dois gráficos offscreen
    const [donutImg, barImg] = await Promise.all([
        _renderChartToBase64(filteredTransactions),
        _renderBarChartToBase64(filteredTransactions),
    ]);

    // ── Gráfico de rosca ──
    doc.setFontSize(11);
    doc.setTextColor(10, 25, 47);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribuição de Gastos por Categoria', W / 2, y + 8, { align: 'center' });
    y += 14;

    if (donutImg) {
        const chartW = 100, chartH = 60;
        doc.addImage(donutImg, 'PNG', (W - chartW) / 2, y, chartW, chartH);
        y += chartH + 12;
    } else {
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text('Sem despesas registradas no período.', W / 2, y + 8, { align: 'center' });
        y += 20;
    }

    // ── Gráfico de barras ──
    doc.setFontSize(11);
    doc.setTextColor(10, 25, 47);
    doc.setFont('helvetica', 'bold');
    doc.text('Entradas vs. Saídas por Categoria', W / 2, y + 6, { align: 'center' });
    y += 12;

    if (barImg) {
        const bW = W - margin * 2, bH = Math.round(bW * 0.5);
        doc.addImage(barImg, 'PNG', margin, y, bW, bH);
        y += bH + 12;
    }

    // ── Mini tabela de resumo por categoria ──
    doc.setFontSize(10);
    doc.setTextColor(10, 25, 47);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo por Categoria', margin, y + 6);
    y += 12;

    const catSummary = {};
    filteredTransactions.forEach(t => {
        const cat = isWhitelisted(t.category, ALLOWED_CATEGORIES) ? t.category : 'Outros';
        if (!catSummary[cat]) catSummary[cat] = { income: 0, expense: 0 };
        if (t.type === 'income')  catSummary[cat].income  += t.amount;
        if (t.type === 'expense') catSummary[cat].expense += t.amount;
    });

    // Cabeçalho da mini-tabela
    _drawTableRow(doc, margin, y, W - margin * 2, ['Categoria', 'Entradas', 'Saídas', 'Saldo'], true);
    y += 8;

    Object.entries(catSummary).forEach(([cat, vals], idx) => {
        const saldo = vals.income - vals.expense;
        _drawTableRow(
            doc, margin, y, W - margin * 2,
            [
                cat,
                vals.income  > 0 ? formatCurrency(vals.income) : '—',
                vals.expense > 0 ? formatCurrency(vals.expense) : '—',
                formatCurrency(saldo),
            ],
            false,
            idx % 2 === 0,
            saldo < 0,
        );
        y += 8;
    });

    _drawPageFooter(doc, W, H);

    // ─────────────────────────────────────────────
    // PÁGINA 3 — TABELA DE TRANSAÇÕES
    // ─────────────────────────────────────────────
    doc.addPage();
    _drawPageHeader(doc, W, margin, 'Histórico de Transações', nomeMes);
    y = 38;

    // Cabeçalho da tabela de transações
    _drawTransactionHeader(doc, margin, y, W - margin * 2);
    y += 9;

    const pageH = H - 20;

    filteredTransactions.forEach((t, idx) => {
        if (y + 10 > pageH) {
            _drawPageFooter(doc, W, H);
            doc.addPage();
            _drawPageHeader(doc, W, margin, 'Histórico de Transações (cont.)', nomeMes);
            y = 38;
            _drawTransactionHeader(doc, margin, y, W - margin * 2);
            y += 9;
        }

        const dataOrigem = t.created_at;
        const dataStr = dataOrigem ? new Date(dataOrigem).toLocaleDateString('pt-BR') : '—';
        const isIncome = t.type === 'income';
        const valorStr = (isIncome ? '+' : '−') + ' ' +
            t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        // Linha zebrada
        if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, y - 5.5, W - margin * 2, 9, 'F');
        }

        const cols = [W * 0.30, W * 0.18, W * 0.14, W * 0.17, W * 0.17];
        let cx = margin;

        // Descrição
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(_truncate(t.desc || '', 32), cx + 2, y);
        cx += cols[0];

        // Categoria
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(_truncate(t.category || '', 18), cx + 2, y);
        cx += cols[1];

        // Tipo
        doc.setTextColor(isIncome ? 42 : 230, isIncome ? 157 : 57, isIncome ? 143 : 70);
        doc.setFont('helvetica', 'bold');
        doc.text(isIncome ? 'Entrada' : 'Saída', cx + 2, y);
        cx += cols[2];

        // Valor
        doc.text(valorStr, cx + 2, y);
        cx += cols[3];

        // Data
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(dataStr, cx + 2, y);

        y += 9;
    });

    // ── Totais finais ──
    y += 4;
    doc.setDrawColor(197, 160, 89);
    doc.setLineWidth(0.5);
    doc.line(margin, y, W - margin, y);
    y += 6;

    const summaryData = [
        ['Total de Entradas', formatCurrency(totalIncome)],
        ['Total de Saídas',   formatCurrency(totalExpense)],
        ['Saldo Final',       formatCurrency(balance)],
    ];

    summaryData.forEach(([label, val], i) => {
        const isLast = i === summaryData.length - 1;
        doc.setFontSize(isLast ? 10 : 9);
        doc.setFont('helvetica', isLast ? 'bold' : 'normal');
        doc.setTextColor(10, 25, 47);
        doc.text(label + ':', margin + 4, y);

        doc.setFont('helvetica', 'bold');
        if (isLast) {
            doc.setTextColor(balance >= 0 ? 42 : 230, balance >= 0 ? 157 : 57, balance >= 0 ? 143 : 70);
        } else {
            doc.setTextColor(i === 0 ? 42 : 230, i === 0 ? 157 : 57, i === 0 ? 143 : 70);
        }
        doc.text(val, W - margin - 4, y, { align: 'right' });
        y += 7;
    });

    _drawPageFooter(doc, W, H);

    // ── Retorna o PDF como base64 e como Blob para download ──
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    const pdfBlob   = doc.output('blob');

    return { pdfBase64, pdfBlob, doc };
}

// ─── Helpers para o PDF ──────────────────────────────────────

function _roundedRect(doc, x, y, w, h, r, style) {
    doc.roundedRect(x, y, w, h, r, r, style);
}

function _drawPageHeader(doc, W, margin, title, subtitle) {
    // Fundo azul marinho no header
    doc.setFillColor(10, 25, 47);
    doc.rect(0, 0, W, 26, 'F');

    // Faixa dourada
    doc.setFillColor(197, 160, 89);
    doc.rect(0, 0, W, 3, 'F');

    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('⚓ ATLAS FINANCE', margin, 17);

    doc.setFontSize(9);
    doc.setTextColor(197, 160, 89);
    doc.setFont('helvetica', 'normal');
    doc.text(`${title} — ${subtitle}`, W - margin, 17, { align: 'right' });

    // Linha teal separadora
    doc.setFillColor(42, 157, 143);
    doc.rect(0, 26, W, 1.5, 'F');
}

function _drawPageFooter(doc, W, H) {
    doc.setFillColor(10, 25, 47);
    doc.rect(0, H - 14, W, 14, 'F');
    doc.setFillColor(197, 160, 89);
    doc.rect(0, H - 14, W, 1.5, 'F');

    doc.setFontSize(7);
    doc.setTextColor(120, 150, 180);
    doc.setFont('helvetica', 'normal');
    doc.text('Atlas Finance — Documento confidencial', 18, H - 5);
    doc.text(`Página ${doc.internal.getCurrentPageInfo().pageNumber}`, W - 18, H - 5, { align: 'right' });
}

function _drawTableRow(doc, x, y, totalW, cols, isHeader = false, zebra = false, negative = false) {
    const colWidths = [totalW * 0.30, totalW * 0.25, totalW * 0.25, totalW * 0.20];

    if (isHeader) {
        doc.setFillColor(10, 25, 47);
        doc.rect(x, y - 6, totalW, 9, 'F');
        doc.setTextColor(197, 160, 89);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
    } else {
        if (zebra) {
            doc.setFillColor(248, 250, 252);
            doc.rect(x, y - 5.5, totalW, 8, 'F');
        }
        doc.setTextColor(negative ? 230 : 15, negative ? 57 : 23, negative ? 70 : 42);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
    }

    let cx = x + 2;
    cols.forEach((col, i) => {
        doc.text(String(col), cx, y);
        cx += colWidths[i];
    });
}

function _drawTransactionHeader(doc, x, y, totalW) {
    doc.setFillColor(10, 25, 47);
    doc.rect(x, y - 6, totalW, 9, 'F');
    doc.setTextColor(197, 160, 89);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    const cols  = ['Descrição', 'Categoria', 'Tipo', 'Valor', 'Data'];
    const widths = [totalW * 0.30, totalW * 0.18, totalW * 0.14, totalW * 0.17, totalW * 0.17];
    let cx = x + 2;
    cols.forEach((col, i) => {
        doc.text(col, cx, y);
        cx += widths[i];
    });
}

function _truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ============================================================
//  EXPORTAÇÃO EXCEL — SheetJS
// ============================================================

// ============================================================
//  FILTRO POR INTERVALO DE DATAS (UTILIDADES)
// ============================================================


function _formatLabelDate(d) {
    if (!d) return '';
    return d.toLocaleDateString('pt-BR');
}

function getTransactionsForReport() {
    const fromInput = document.getElementById('report-from');
    const toInput   = document.getElementById('report-to');

    const fromDate = fromInput ? _parseDateInput(fromInput.value) : null;
    const toDateRaw = toInput ? _parseDateInput(toInput.value) : null;
    // Inclui o dia inteiro no toDate
    const toDate = toDateRaw ? new Date(toDateRaw.getFullYear(), toDateRaw.getMonth(), toDateRaw.getDate(), 23, 59, 59) : null;

    let filtered = transactions.slice();

    if (fromDate) {
        filtered = filtered.filter(t => {
            const d = t.created_at ? new Date(t.created_at) : null;
            return d && d >= fromDate;
        });
    }

    if (toDate) {
        filtered = filtered.filter(t => {
            const d = t.created_at ? new Date(t.created_at) : null;
            return d && d <= toDate;
        });
    }

    let label = 'Todo o Histórico';
    if (fromDate || toDate) {
        const f = fromDate ? _formatLabelDate(fromDate) : '...';
        const tt = toDateRaw ? _formatLabelDate(toDateRaw) : '...';
        label = `${f} → ${tt}`;
    }

    return { filtered, label };
}


/**
 * Exporta as transações filtradas para um arquivo .xlsx
 * com formatação profissional (cabeçalhos, larguras de coluna).
 */
window.exportToExcel = function () {
    try { _requireValidSession(); } catch { return; }

    if (!currentUser || transactions.length === 0) {
        showToast('Nenhum dado para exportar.', 'error');
        return;
    }

    const { filtered, label: nomeMes } = getTransactionsForReport();

    if (filtered.length === 0) {
        showToast(`Nenhum lançamento no intervalo: ${nomeMes}.`, 'error');
        return;
    }

    // ── Monta os dados da planilha principal ──
    const rows = filtered.map(t => {
        const dataOrigem = t.created_at;
        return {
            'Descrição':    t.desc        || '',
            'Categoria':    t.category    || '',
            'Natureza':     t.type === 'income' ? 'Entrada' : 'Saída',
            'Valor (R$)':   t.amount,
            'Data':         dataOrigem ? new Date(dataOrigem).toLocaleDateString('pt-BR') : '—',
            'Hora':         dataOrigem ? new Date(dataOrigem).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—',
            'Observação':   t.observation || '',
        };
    });

    const ws = XLSX.utils.json_to_sheet(rows, { origin: 'A2' });

    // ── Linha de título (linha 1) ──
    XLSX.utils.sheet_add_aoa(ws, [[`⚓ ATLAS FINANCE — Diário de Bordo: ${nomeMes}`]], { origin: 'A1' });

    // ── Larguras de colunas ──
    ws['!cols'] = [
        { wch: 32 }, // Descrição
        { wch: 18 }, // Categoria
        { wch: 12 }, // Natureza
        { wch: 16 }, // Valor
        { wch: 14 }, // Data
        { wch: 10 }, // Hora
        { wch: 40 }, // Observação
    ];

    // ── Aba de resumo ──
    let totalIncome  = 0, totalExpense = 0;
    filtered.forEach(t => {
        if (t.type === 'income')  totalIncome  += t.amount;
        if (t.type === 'expense') totalExpense += t.amount;
    });

    const summaryData = [
        ['⚓ ATLAS FINANCE — Resumo', nomeMes],
        [''],
        ['Total de Entradas', totalIncome],
        ['Total de Saídas',   totalExpense],
        ['Saldo Final',       totalIncome - totalExpense],
        [''],
        ['Total de Transações', filtered.length],
        ['Gerado em', new Date().toLocaleString('pt-BR')],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 28 }, { wch: 22 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transações');
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

    const fileName = `atlas-finance-${nomeMes.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.xlsx`;
    XLSX.writeFile(wb, fileName);

    showToast(`Excel exportado: ${fileName}`, 'success');
};

// ============================================================
//  RELATÓRIO MENSAL — PDF por e-mail via EmailJS
// ============================================================

async function sendMonthlyReport() {
    try { _requireValidSession(); } catch { return; }

    if (!currentUser || transactions.length === 0) {
        showToast('Nenhum dado para gerar o relatório.', 'error');
        return;
    }

    const { filtered: transacoesFiltradas, label: nomeMesSelecionado } = getTransactionsForReport();

    if (transacoesFiltradas.length === 0) {
        showToast(`Nenhum lançamento no intervalo: ${nomeMesSelecionado}.`, 'error');
        return;
    }

    const btnReport     = document.getElementById('btn-send-report');
    const originalText  = btnReport.innerText;
    btnReport.innerText = '⏳ Gerando PDF...';
    btnReport.disabled  = true;

    try {
        // ── 1. Gera o PDF ──
        const userName = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
        const { pdfBase64 } = await generateReportPDF(
            transacoesFiltradas,
            nomeMesSelecionado,
            sanitizeString(userName),
        );

        // ── 2. Calcula totais para o corpo do e-mail ──
        let totalIncome = 0, totalExpense = 0;
        transacoesFiltradas.forEach(t => {
            if (t.type === 'income')  totalIncome  += t.amount;
            if (t.type === 'expense') totalExpense += t.amount;
        });
        const balance = totalIncome - totalExpense;

        // ── 3. Envia via EmailJS ──
        btnReport.innerText = '📧 Enviando...';

        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            to_email:          currentUser.email,
            user_name:         sanitizeString(userName),
            mes:               nomeMesSelecionado,
            total_income:      formatCurrency(totalIncome),
            total_expense:     formatCurrency(totalExpense),
            balance:           formatCurrency(balance),
            transaction_count: String(transacoesFiltradas.length),
            // pdf_attachment: pdfBase64, // Descomentar se seu plano suportar anexos
        });

        showToast(`Relatório de ${nomeMesSelecionado} enviado para ${currentUser.email}!`, 'success');

    } catch (err) {
        console.error('[Atlas] Erro no relatório:', err);
        showToast('Falha ao enviar relatório. Verifique as credenciais EmailJS.', 'error');
    } finally {
        btnReport.innerText = originalText;
        btnReport.disabled  = false;
    }
}

/**
 * Gera e faz o download local do PDF sem enviar por e-mail.
 * Útil como fallback ou ação alternativa.
 */
window.downloadReportPDF = async function () {
    try { _requireValidSession(); } catch { return; }

    if (!currentUser || transactions.length === 0) {
        showToast('Nenhum dado para gerar o relatório.', 'error');
        return;
    }

    const { filtered: transacoesFiltradas, label: nomeMesSelecionado } = getTransactionsForReport();

    if (transacoesFiltradas.length === 0) {
        showToast(`Nenhum lançamento no intervalo: ${nomeMesSelecionado}.`, 'error');
        return;
    }

    const btnPDF    = document.getElementById('btn-download-pdf');
    if (btnPDF) {
        btnPDF.innerText = '⏳ Gerando...';
        btnPDF.disabled  = true;
    }

    try {
        const userName = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
        const { doc } = await generateReportPDF(
            transacoesFiltradas,
            nomeMesSelecionado,
            sanitizeString(userName),
        );

        const fileName = `atlas-finance-${nomeMesSelecionado.toLowerCase().replace(/\s+/g, '-')}.pdf`;
        doc.save(fileName);
        showToast(`PDF baixado: ${fileName}`, 'success');
    } catch (err) {
        console.error('[Atlas] Erro ao gerar PDF:', err);
        showToast('Falha ao gerar PDF. Tente novamente.', 'error');
    } finally {
        if (btnPDF) {
            btnPDF.innerText = '📄 Baixar PDF';
            btnPDF.disabled  = false;
        }
    }
};

document.getElementById('btn-send-report')?.addEventListener('click', sendMonthlyReport);

// Garantir que listeners de filtro sejam registrados após o DOM estar pronto
window.addEventListener('DOMContentLoaded', () => {
    const applyBtn = document.getElementById('btn-apply-filter');
    const clearBtn = document.getElementById('btn-clear-filter');
    const from = document.getElementById('report-from');
    const to = document.getElementById('report-to');
    const headerToggle = document.getElementById('header-toggle');
    const headerActions = document.querySelector('.header-actions');

    applyBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        updateAppInterface();
        showToast('Filtro aplicado.', 'info');
    });

    clearBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        if (from) from.value = '';
        if (to) to.value = '';
        updateAppInterface();
        showToast('Filtro limpo.', 'info');
    });

    // Permitir aplicar filtro ao pressionar Enter nos campos de data
    [from, to].forEach(inp => {
        if (!inp) return;
        inp.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                updateAppInterface();
                showToast('Filtro aplicado.', 'info');
            }
        });
    });

    // header toggle for mobile: add/remove class to reveal actions
    if (headerToggle && headerActions) {
        headerToggle.addEventListener('click', () => {
            const open = headerActions.classList.toggle('actions-open');
            headerToggle.setAttribute('aria-expanded', String(open));
        });
    }
});

// ============================================================
//  LÓGICA DE DATAS, PARCELAS E ALERTAS
// ============================================================

// Controla a exibição dos campos no formulário
window.toggleFutureFields = function() {
    const checkedStatus = document.querySelector('input[name="status"]:checked');
    const isPending = checkedStatus && checkedStatus.value === 'pending';
    const futureFields = document.getElementById('future-fields');
    const installmentGroup = document.getElementById('installment-group');
    const statusGroup = document.querySelector('.status-group');
    const formSection = document.querySelector('.form-section');

    if (futureFields) {
        futureFields.style.display = isPending ? 'flex' : 'none';
        futureFields.classList.toggle('future-fields-visible', isPending);
        futureFields.setAttribute('aria-hidden', String(!isPending));
    }

    statusGroup?.classList.toggle('is-pending', isPending);
    statusGroup?.classList.toggle('is-paid', !isPending);
    formSection?.classList.toggle('has-pending-route', isPending);

    if (!isPending) {
        if (installmentGroup) {
            installmentGroup.style.display = 'none';
            installmentGroup.classList.remove('installment-visible');
            installmentGroup.setAttribute('aria-hidden', 'true');
        }

        const recurrenceSelect = document.getElementById('recurrence');
        if (recurrenceSelect) {
            recurrenceSelect.value = 'unique';
        }
    } else {
        window.setTimeout(() => document.getElementById('due-date')?.focus(), 120);
    }
};

window.toggleInstallmentField = function() {
    const recurrenceSelect = document.getElementById('recurrence');
    const isInstallment = recurrenceSelect && recurrenceSelect.value === 'installment';
    const installmentGroup = document.getElementById('installment-group');

    if (installmentGroup) {
        installmentGroup.style.display = isInstallment ? 'flex' : 'none';
        installmentGroup.classList.toggle('installment-visible', isInstallment);
        installmentGroup.setAttribute('aria-hidden', String(!isInstallment));
    }
};

// ── SISTEMA DE VERIFICAÇÃO E ALERTA (15 DIAS) ──
function checkUpcomingDebts(allTransactions) {
    const alertsContainer = document.getElementById('alerts-container');
    alertsContainer.innerHTML = ''; 
    let hasAlerts = false;

    const today = new Date();
    today.setHours(0,0,0,0);

    const pendingDebts = allTransactions.filter(t => t.status === 'pending' && t.type === 'expense');

    pendingDebts.forEach(t => {
        const dueDate = new Date(t.due_date + 'T12:00:00'); // Evita erro de fuso
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Se estiver vencendo nos próximos 15 dias ou se já estiver atrasado (negativo)
        if (diffDays <= 15) {
            hasAlerts = true;
            
            let statusText = '';
            let alertClass = '';

            if (diffDays < 0) {
                statusText = `Atrasada há ${Math.abs(diffDays)} dias`;
                alertClass = 'alert-danger';
            } else if (diffDays === 0) {
                statusText = `Vence HOJE!`;
                alertClass = 'alert-warning';
            } else {
                statusText = `Vence em ${diffDays} dias`;
                alertClass = 'alert-info';
            }

            const alertDiv = document.createElement('div');
            alertDiv.className = `atlas-alert ${alertClass}`;
            appendText(alertDiv, 'div', '⚠️', 'alert-icon');

            const alertContent = document.createElement('div');
            alertContent.className = 'alert-content';
            appendText(alertContent, 'strong', normalizeUserText(t.desc || 'Lançamento', 90));
            appendText(alertContent, 'span', `${statusText} - ${formatCurrency(t.amount)}`);
            alertDiv.appendChild(alertContent);
            
            const btnAlertPay = document.createElement('button');
            btnAlertPay.className = 'btn-mark-paid';
            btnAlertPay.textContent = 'Pagar';
            btnAlertPay.addEventListener('click', () => markAsPaid(t.id));
            
            alertDiv.appendChild(btnAlertPay);
            alertsContainer.appendChild(alertDiv);
        }
    });

    alertsContainer.classList.toggle('hidden', !hasAlerts);
}

// =========================================================
// FUNÇÕES DE AÇÃO DA TABELA
// =========================================================

async function markAsPaid(transactionId) {
    if (!currentUser || !isSafeRecordId(String(transactionId))) {
        showToast('Operação bloqueada por segurança.', 'error');
        return;
    }

    try {
        _requireValidSession();
        const { error } = await _supabase
            .from('transactions')
            .update({ status: 'paid' })
            .eq('id', transactionId)
            .eq('user_id', currentUser.id);

        if (!error) {
            showToast('Navegação confirmada. Dívida paga!', 'success');
            await fetchTransactions(); 
        } else {
            console.error("Erro do Supabase:", error);
            showToast('Erro ao atualizar pagamento.', 'error');
        }
    } catch (err) {
        console.error("Erro no código markAsPaid:", err);
    }
}

async function deleteTransaction(transactionId) {
    if (!confirm('Tem certeza que deseja lançar isso ao mar? (Excluir)')) return;
    if (!currentUser || !isSafeRecordId(String(transactionId))) {
        showToast('Operação bloqueada por segurança.', 'error');
        return;
    }

    try {
        _requireValidSession();
        const { error } = await _supabase
            .from('transactions')
            .delete()
            .eq('id', transactionId)
            .eq('user_id', currentUser.id);

        if (!error) {
            showToast('Lançamento excluído com sucesso!', 'success');
            await fetchTransactions();
        } else {
            console.error("Erro do Supabase:", error);
            showToast('Erro ao excluir lançamento.', 'error');
        }
    } catch (err) {
        console.error("Erro no código deleteTransaction:", err);
    }
}

// ✨ A MÁGICA: Registra no window para o caso de algum HTML externo precisar
window.markAsPaid = markAsPaid;
window.deleteTransaction = deleteTransaction;

// ── Bootstrap ──
checkSession();