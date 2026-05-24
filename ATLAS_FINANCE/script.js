// ============================================================
//  ATLAS FINANCE — script.js
//  Lógica de negócio, autenticação e CRUD com Supabase.
//  Toda estilização/animação fica em style.js
// ============================================================

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
    isValidEmail,
    isValidAmount,
    isWhitelisted,
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
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Whitelists de valores permitidos nos campos SELECT ──
const ALLOWED_TYPES      = ['income', 'expense'];
const ALLOWED_CATEGORIES = ['Alimentação', 'Transporte', 'Lazer', 'Contas', 'Salário', 'Outros'];

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

// ============================================================
//  AUTENTICAÇÃO
// ============================================================

async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();

    if (session?.user) {
        if (!isSessionValid()) {
            console.warn('[Atlas Security] Token expirado no checkSession. Forçando logout.');
            await _forceLogoutInternal();
            return;
        }
        currentUser = session.user;
        _initSessionSystem();
        showAppScreen();
    }
}

loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const btnSubmit = loginForm.querySelector('.btn-submit');
    const email     = document.getElementById('username').value.trim();
    const pass      = document.getElementById('password').value.trim();

    // ── 1. Verifica se o login está bloqueado por tentativas excessivas ──
    const lockStatus = checkLoginBlocked();
    if (lockStatus.blocked) {
        showLockoutFeedback(lockStatus.remainingMs, btnSubmit);
        return;
    }

    // ── 2. Anti-bot: delay mínimo entre submissões ──
    if (!isSubmitAllowed()) {
        showToast('Aguarde um momento antes de tentar novamente.', 'error');
        return;
    }
    recordSubmitTimestamp();

    // ── 3. Validação de formato de e-mail ──
    if (!isValidEmail(email)) {
        showToast('Formato de e-mail inválido.', 'error');
        return;
    }

    // ── 4. Scan de SQL Injection e XSS nos campos ──
    const scan = scanFields({ email, senha: pass });
    if (!scan.safe) {
        console.error(`[Atlas Security] Payload malicioso detectado no campo "${scan.field}" (${scan.type})`);
        showToast('Entrada inválida detectada. Acesso negado.', 'error');
        return;
    }

    // ── 5. Tentativa de login no Supabase ──
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password: pass });

    if (!error && data.user) {
        // Login OK — reseta contadores de segurança
        resetLoginAttempts();
        clearSecurityAlerts();
        currentUser = data.user;

        const token = generateSessionToken();
        console.info(`[Atlas Security] Login bem-sucedido. Token: ${token}`);

        _initSessionSystem();
        showAppScreen();
    } else {
        // Login falhou — registra tentativa e exibe feedback
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

async function showAppScreen() {
    loginView.classList.add('hidden');
    appView.classList.remove('hidden');

    // Exibe o nome — sanitizado para evitar XSS via metadados
    const rawName = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    displayUser.innerText = sanitizeString(rawName);

    animateDashboardSections();
    highlightNewRow();
    setupButtonFeedback('transaction-form', 'Lançar no Diário');

    await fetchTransactions();
    animateSummaryCards();
}

// ============================================================
//  CRUD — Supabase com validação e sanitização completas
// ============================================================

async function fetchTransactions() {
    _requireValidSession();

    const { data, error } = await _supabase
        .from('transactions')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (!error) {
        transactions = data || [];
        updateAppInterface();
    } else {
        console.error('[Atlas] Erro ao buscar transações:', error.message);
    }
}

form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!currentUser) {
        showToast('Sessão inválida. Faça login novamente.', 'error');
        return;
    }

    try { _requireValidSession(); } catch { return; }

    // ── Captura os valores brutos ──
    const rawDesc  = document.getElementById('desc').value;
    const rawAmt   = document.getElementById('amount').value;
    const rawType  = document.getElementById('type').value;
    const rawCat   = document.getElementById('category').value;
    const rawObs   = document.getElementById('observation').value;

    // ── 1. Scan de SQL Injection / XSS ──
    const scan = scanFields({
        descricao:    rawDesc,
        observacao:   rawObs,
    });
    if (!scan.safe) {
        showToast('Entrada inválida no campo "' + scan.field + '". Tente novamente.', 'error');
        console.error(`[Atlas Security] ${scan.type} detectado no formulário de transação.`);
        return;
    }

    // ── 2. Validação de whitelist nos campos SELECT ──
    if (!isWhitelisted(rawType, ALLOWED_TYPES)) {
        showToast('Tipo de transação inválido.', 'error');
        return;
    }
    if (!isWhitelisted(rawCat, ALLOWED_CATEGORIES)) {
        showToast('Categoria inválida.', 'error');
        return;
    }

    // ── 3. Validação do valor numérico ──
    if (!isValidAmount(rawAmt)) {
        showToast('Valor inválido. Informe um número positivo.', 'error');
        return;
    }

    // ── 4. Sanitização dos campos de texto livre ──
    const safeDesc = sanitizeText(rawDesc, ' .,!?-\'');
    const safeObs  = sanitizeText(rawObs,  ' .,!?-\'');

    const newTransaction = {
        user_id:     currentUser.id,
        desc:        safeDesc,
        amount:      parseFloat(parseFloat(rawAmt).toFixed(2)),
        type:        rawType,
        category:    rawCat,
        observation: safeObs,
        date:        new Date().toISOString(),
    };

    const { error } = await _supabase.from('transactions').insert([newTransaction]);

    if (!error) {
        form.reset();
        showToast('Transação registrada com sucesso!', 'success');
        await fetchTransactions();
    } else {
        showToast('Falha ao registrar: ' + error.message, 'error');
    }
});

window.deleteTransaction = async function (id) {
    try { _requireValidSession(); } catch { return; }

    // ── Garante que o ID é um inteiro válido (evita injection via onclick) ──
    const safeId = parseInt(id, 10);
    if (isNaN(safeId) || safeId <= 0) {
        showToast('ID de transação inválido.', 'error');
        return;
    }

    const { error } = await _supabase
        .from('transactions')
        .delete()
        .eq('id', safeId);

    if (!error) {
        showToast('Registro removido.', 'info');
        await fetchTransactions();
    } else {
        showToast('Não foi possível excluir: ' + error.message, 'error');
    }
};

// ============================================================
//  RENDERIZAÇÃO — com sanitização dos dados do banco
// ============================================================

const formatCurrency = (value) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function updateAppInterface() {
    transactionList.innerHTML = '';

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
        if (t.type === 'income')  totalIncome  += t.amount;
        if (t.type === 'expense') totalExpense += t.amount;

        const dataOrigem    = t.date || t.created_at;
        const dataFormatada = dataOrigem ? new Date(dataOrigem).toLocaleDateString('pt-BR')                                    : '---';
        const horaFormatada = dataOrigem ? new Date(dataOrigem).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '---';

        // ── Sanitiza dados vindos do banco antes de inserir no DOM ──
        const safeDesc = sanitizeString(t.desc     || '');
        const safeCat  = sanitizeString(t.category || '');
        const safeObs  = sanitizeString(t.observation || '');
        const safeType = isWhitelisted(t.type, ALLOWED_TYPES) ? t.type : 'expense';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong>${safeDesc}</strong><br>
                <small style="color:#888;">📅 ${dataFormatada} às ${horaFormatada}</small>
                ${safeObs ? `<br><span class="transaction-obs" style="font-size:0.8rem;color:#2a9d8f;">⚓ ${safeObs}</span>` : ''}
            </td>
            <td><span class="badge-category">${safeCat}</span></td>
            <td class="type-${safeType}">${safeType === 'expense' ? '−' : '+'}&nbsp;${formatCurrency(t.amount)}</td>
            <td>${safeType === 'income' ? '⚓ Entrada' : '🌊 Saída'}</td>
            <td style="text-align:center;">
                <button class="btn-delete" onclick="deleteTransaction(${parseInt(t.id, 10)})" title="Excluir lançamento">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </td>
        `;
        transactionList.appendChild(row);
    });

    const balance = totalIncome - totalExpense;
    setRawValues(totalIncome, totalExpense, balance);
    incomeDisplay.textContent  = formatCurrency(totalIncome);
    expenseDisplay.textContent = formatCurrency(totalExpense);
    balanceDisplay.textContent = formatCurrency(balance);
    animateCounters();
    updateChart();
}

function updateChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const expenses = transactions.filter(t => t.type === 'expense');

    const categoryTotals = {};
    expenses.forEach(t => {
        // Sanitiza a categoria antes de usar como chave
        const cat = isWhitelisted(t.category, ALLOWED_CATEGORIES) ? t.category : 'Outros';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
    });

    const labels = Object.keys(categoryTotals);
    const data   = Object.values(categoryTotals);

    if (expenseChartInstance) expenseChartInstance.destroy();
    if (!data.length) return;

    expenseChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: ['#0a192f','#c5a059','#2a9d8f','#e63946','#457b9d','#f4a261'],
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
                        color: '#1e293b',
                        padding: 14,
                        usePointStyle: true,
                    },
                },
            },
            cutout: '68%',
        },
    });
}

// ============================================================
//  RELATÓRIO MENSAL
// ============================================================

async function sendMonthlyReport() {
    try { _requireValidSession(); } catch { return; }

    if (!currentUser || transactions.length === 0) {
        showToast('Nenhum dado para gerar o relatório.', 'error');
        return;
    }

    const selectMonth       = document.getElementById('select-report-month');
    const valorSelecionado  = selectMonth ? selectMonth.value : 'all';
    const nomeMesSelecionado = selectMonth ? selectMonth.options[selectMonth.selectedIndex].text : 'Mensal';

    let transacoesFiltradas = transactions;

    if (valorSelecionado !== 'all') {
        const mesIndex = parseInt(valorSelecionado, 10);
        if (isNaN(mesIndex) || mesIndex < 0 || mesIndex > 11) {
            showToast('Mês inválido selecionado.', 'error');
            return;
        }
        transacoesFiltradas = transactions.filter(t => {
            const dataOrigem = t.date || t.created_at;
            if (!dataOrigem) return false;
            return new Date(dataOrigem).getMonth() === mesIndex;
        });
    }

    if (transacoesFiltradas.length === 0) {
        showToast(`Nenhum lançamento encontrado para: ${nomeMesSelecionado}.`, 'error');
        return;
    }

    const btnReport    = document.getElementById('btn-send-report');
    const originalText = btnReport.innerText;
    btnReport.innerText = '⏳ Enviando Rota...';
    btnReport.disabled  = true;

    // ── CONSTRUÇÃO DO HTML DO CORPO DO E-MAIL DIRETO NO FRONT-END ──
    let htmlTableRows = "";
    transacoesFiltradas.forEach(t => {
        const valor = t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const natureza = (t.type === 'income') ? '⚓ Entrada' : '🌊 Saída';
        const obs = t.observation ? `<br><small style="color:#666;">obs: ${t.observation}</small>` : "";

        htmlTableRows += `
            <tr>
                <td style="padding:10px; border-bottom:1px solid #ddd;"><strong>${t.desc}</strong>${obs}</td>
                <td style="padding:10px; border-bottom:1px solid #ddd;">${t.category}</td>
                <td style="padding:10px; border-bottom:1px solid #ddd;">${natureza}</td>
                <td style="padding:10px; border-bottom:1px solid #ddd; font-weight:bold;">${valor}</td>
            </tr>`;
    });

    const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #2a9d8f; padding: 20px; border-radius: 8px;">
            <h2 style="color: #0a192f; border-bottom: 2px solid #2a9d8f; padding-bottom: 10px;">⚓ Atlas Finance — Diário de Bordo de ${nomeMesSelecionado}</h2>
            <p>Olá, comandante!</p>
            <p>Aqui está o resumo financeiro das suas últimas rotas navegadas:</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background-color: #2a9d8f; color: white;">
                        <th style="padding: 10px; text-align: left;">Descrição</th>
                        <th style="padding: 10px; text-align: left;">Categoria</th>
                        <th style="padding: 10px; text-align: left;">Natureza</th>
                        <th style="padding: 10px; text-align: left;">Valor</th>
                    </tr>
                </thead>
                <tbody>${htmlTableRows}</tbody>
            </table>
        </div>`;

    try {
        const URL_BACKEND = 'https://api-atlasfinance.infinityfree.me/report.php';

        // ── MONTA O FORMDATA PARA BURLAR A TRAVA DE PREFLIGHT (CORS) ──
        const formData = new FormData();
        formData.append('email', currentUser.email);
        formData.append('mes', nomeMesSelecionado);
        formData.append('html', emailBody);

        const response = await fetch(URL_BACKEND, {
            method: 'POST',
            body: formData // Enviado como formulário padrão
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showToast(`Relatório (${nomeMesSelecionado}) enviado com sucesso ao seu e-mail!`, 'success');
        } else {
            throw new Error(result.message || 'Falha no servidor PHP');
        }
    } catch (err) {
        console.error('[Atlas] Erro no relatório:', err);
        showToast('Falha ao enviar relatório por e-mail.', 'error');
    } finally {
        btnReport.innerText = originalText;
        btnReport.disabled  = false;
    }
}

document.getElementById('btn-send-report').addEventListener('click', sendMonthlyReport);

// ── Bootstrap ──
checkSession();
