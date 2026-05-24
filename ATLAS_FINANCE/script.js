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

// ── Configuração Supabase ──
const SUPABASE_URL = "https://agazyxktzrkoyrnxivab.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYXp5eGt0enJrb3lybnhpdmFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MDU1NzcsImV4cCI6MjA5NTA4MTU3N30.5MZnLVPPTP7VLelU8OX-0cxl6mYz6ck1RoxVH3mPumg";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Inicialização do EmailJS (Substitua pelo seu Public Key do painel do EmailJS)
emailjs.init({ publicKey: "SEU_PUBLIC_KEY_AQUI" });

const btnReport = document.getElementById('btn-send-report');

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
        currentUser = session.user;
        showAppScreen();
    }
}

loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const userRaw = document.getElementById('username').value.trim();
    const pass    = document.getElementById('password').value.trim();
    const email   = `${userRaw.toLowerCase()}@atlas.com`;

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password: pass });

    if (!error && data.user) {
        currentUser = data.user;
        showAppScreen();
    } else {
        showToast('Usuário ou senha incorretos.', 'error');
    }
});

window.logout = async function () {
    await _supabase.auth.signOut();
    currentUser = null;
    transactions = [];
    appView.classList.add('hidden');
    loginView.classList.remove('hidden');
};

// ============================================================
//  NAVEGAÇÃO DE TELAS
// ============================================================

async function showAppScreen() {
    loginView.classList.add('hidden');
    appView.classList.remove('hidden');

    displayUser.innerText = currentUser.email.split('@')[0];

    // Efeitos visuais de entrada
    animateDashboardSections();
    highlightNewRow();
    setupButtonFeedback('transaction-form', 'Lançar no Diário');

    await fetchTransactions();
    animateSummaryCards();
}

// ============================================================
//  CRUD — Supabase
// ============================================================

async function fetchTransactions() {
    const { data, error } = await _supabase
        .from('transactions')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (!error) {
        transactions = data || [];
        updateAppInterface();
    } else {
        console.error('Erro ao buscar transações:', error.message);
    }
}

form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!currentUser) {
        showToast('Sessão inválida. Faça login novamente.', 'error');
        return;
    }

 const newTransaction = {
        user_id:  currentUser.id,
        desc:     document.getElementById('desc').value,
        amount:   parseFloat(document.getElementById('amount').value),
        type:     document.getElementById('type').value,
        category: document.getElementById('category').value,
        // ADICIONE ESTA LINHA ABAIXO:
        observation: document.getElementById('observation').value
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
    const { error } = await _supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (!error) {
        showToast('Registro removido.', 'info');
        await fetchTransactions();
    } else {
        showToast('Não foi possível excluir: ' + error.message, 'error');
    }
};

// ============================================================
//  RENDERIZAÇÃO
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

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong>${t.desc}</strong>
                ${t.observation ? `<span class="transaction-obs">⚓ ${t.observation}</span>` : ''}
            </td>
            <td><span class="badge-category">${t.category}</span></td>
            <td class="type-${t.type}">${t.type === 'expense' ? '−' : '+'}&nbsp;${formatCurrency(t.amount)}</td>
            <td>${t.type === 'income' ? '⚓ Entrada' : '🌊 Saída'}</td>
            <td style="text-align:center;">
                <button class="btn-delete" onclick="deleteTransaction(${t.id})" title="Excluir lançamento">
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

    // Passa os valores brutos para o animador de contadores
    setRawValues(totalIncome, totalExpense, balance);

    // Define os valores finais e dispara a animação
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
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
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

// ── Bootstrap ──
checkSession();
