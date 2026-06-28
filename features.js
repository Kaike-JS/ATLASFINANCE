// ============================================================
//  ATLAS FINANCE — features.js
//  Módulo de funcionalidades profissionais avançadas.
//
//  FUNCIONALIDADES:
//  1. Modo Escuro (Dark Mode) com persistência
//  2. Gráfico de Linha — Evolução do Saldo ao Longo do Tempo
//  3. Gráfico Radar — Gastos por Categoria vs. Orçamento
//  4. Sistema de Orçamentos por Categoria
//  5. Importação de CSV (padrão bancário brasileiro)
//  6. Atalhos de Teclado Profissionais
//  7. Modo Foco no Formulário (slide-in animado)
//  8. Skeleton Loading nas tabelas
//  9. Partículas de Sucesso (confetti náutico)
// 10. Painel de Metas Financeiras
// ============================================================

// ── Paleta de cores do Atlas Finance ──
const ATLAS = {
    navy:   '#0a192f',
    teal:   '#2a9d8f',
    gold:   '#c5a059',
    red:    '#e63946',
    blue:   '#457b9d',
    orange: '#f4a261',
    white:  '#ffffff',
};

function escapeHTML(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

// ============================================================
//  1. DARK MODE
// ============================================================

const DARK_KEY = 'atlas_dark_mode';

export function initDarkMode() {
    const saved = localStorage.getItem(DARK_KEY);
    if (saved === 'true') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    _injectDarkToggle();
    _injectDarkStyles();
}

function _injectDarkToggle() {
    const btn = document.createElement('button');
    btn.id = 'btn-dark-toggle';
    btn.title = 'Alternar Modo Escuro (Alt+D)';
    btn.innerHTML = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
    btn.setAttribute('aria-label', 'Alternar modo escuro');
    Object.assign(btn.style, {
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid rgba(197,160,89,0.5)',
        background: 'transparent',
        color: '#c5a059',
        fontSize: '1rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        lineHeight: '1',
    });
    btn.addEventListener('click', toggleDarkMode);
    btn.addEventListener('mouseover', () => { btn.style.background = 'rgba(197,160,89,0.12)'; });
    btn.addEventListener('mouseout', () => { btn.style.background = 'transparent'; });

    const actions = document.querySelector('.header-actions');
    if (actions) actions.insertBefore(btn, actions.firstChild);
}

function toggleDarkMode() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem(DARK_KEY, 'false');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem(DARK_KEY, 'true');
    }
    const btn = document.getElementById('btn-dark-toggle');
    if (btn) btn.innerHTML = !isDark ? '☀️' : '🌙';

    // Anima a transição
    document.body.style.transition = 'background-color 0.4s ease, color 0.4s ease';
    setTimeout(() => { document.body.style.transition = ''; }, 500);

    // Atualiza o gráfico para refletir as novas cores
    if (window.updateChart) {
        setTimeout(() => window.updateChart(), 100);
    }
}

function _injectDarkStyles() {
    const style = document.createElement('style');
    style.id = 'atlas-dark-styles';
    style.textContent = `
        [data-theme="dark"] {
            --sea-mist: #0d1b2e;
            --glass-bg: rgba(14, 28, 50, 0.97);
            --glass-border: rgba(197,160,89,0.25);
            --text-dark: #e2e8f0;
            --border-light: #1e3a5f;
            --card-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        [data-theme="dark"] body {
            background-color: #050d1a;
            color: #e2e8f0;
            background-image:
                radial-gradient(circle at 20% 80%, rgba(42,157,143,0.06) 0%, transparent 50%),
                radial-gradient(rgba(197,160,89,0.04) 1px, transparent 0);
            background-size: 100% 100%, 24px 24px;
        }
        [data-theme="dark"] .card,
        [data-theme="dark"] .form-section,
        [data-theme="dark"] .dashboard-section,
        [data-theme="dark"] .history-section,
        [data-theme="dark"] #smart-insights {
            background: rgba(14, 28, 50, 0.98);
            border-color: rgba(197,160,89,0.2);
            color: #e2e8f0;
        }
        [data-theme="dark"] .card h3 { color: #94a3b8; }
        [data-theme="dark"] h2 { color: #e2e8f0; }
        [data-theme="dark"] input,
        [data-theme="dark"] select,
        [data-theme="dark"] textarea {
            background: #0a1929 !important;
            color: #e2e8f0 !important;
            border-color: #1e3a5f !important;
        }
        [data-theme="dark"] input:focus,
        [data-theme="dark"] select:focus,
        [data-theme="dark"] textarea:focus {
            border-color: #c5a059 !important;
            box-shadow: 0 0 0 3px rgba(197,160,89,0.12) !important;
        }
        [data-theme="dark"] input::placeholder,
        [data-theme="dark"] textarea::placeholder { color: #4a6080 !important; }
        [data-theme="dark"] label { color: #94a3b8; }
        [data-theme="dark"] table thead th {
            background: #061020;
            color: #c5a059;
        }
        [data-theme="dark"] table tbody tr:hover { background: rgba(42,157,143,0.07); }
        [data-theme="dark"] .badge-category {
            background: rgba(197,160,89,0.15);
            color: #c5a059;
        }
        [data-theme="dark"] .atlas-alert {
            background: rgba(14, 28, 50, 0.98);
            border-color: rgba(197,160,89,0.3);
        }
        [data-theme="dark"] .insight-card {
            background: rgba(10,25,47,0.8);
            border-color: rgba(197,160,89,0.2);
        }
        [data-theme="dark"] .insight-info h4 { color: #94a3b8; }
        [data-theme="dark"] .insight-info p { color: #e2e8f0; }
        [data-theme="dark"] #search-input {
            background: #0a1929 !important;
            color: #e2e8f0 !important;
        }
        [data-theme="dark"] #budget-panel,
        [data-theme="dark"] #goals-panel,
        [data-theme="dark"] #import-panel {
            background: rgba(14, 28, 50, 0.98);
            border-color: rgba(197,160,89,0.25);
            color: #e2e8f0;
        }
        [data-theme="dark"] .modal-overlay { background: rgba(2, 10, 25, 0.85); }
        [data-theme="dark"] .modal-box {
            background: #0d1b2e;
            border-color: rgba(197,160,89,0.3);
            color: #e2e8f0;
        }
        [data-theme="dark"] .modal-box h3 { color: #c5a059; }
        [data-theme="dark"] .modal-box label { color: #94a3b8; }
        [data-theme="dark"] .modal-box input,
        [data-theme="dark"] .modal-box select {
            background: #0a1929 !important;
            color: #e2e8f0 !important;
            border-color: #1e3a5f !important;
        }
        [data-theme="dark"] .kbd-hint {
            background: #061020;
            border-color: rgba(197,160,89,0.3);
            color: #94a3b8;
        }
        [data-theme="dark"] .chart-container canvas { filter: brightness(0.9); }
        /* Elementos de valor em modo escuro */
        [data-theme="dark"] #total-balance,
        [data-theme="dark"] #total-income,
        [data-theme="dark"] #total-expense,
        [data-theme="dark"] #future-balance-value {
            color: #ffffff !important;
        }
        [data-theme="dark"] .card p { color: #ffffff !important; }
        [data-theme="dark"] .card strong { color: #ffffff !important; }
        /* Estilos para modal de depósito em modo escuro */
        [data-theme="dark"] .quick-deposit-btn {
            border-color: rgba(42,157,143,0.4) !important;
            color: #2a9d8f !important;
        }
        [data-theme="dark"] .quick-deposit-btn:hover {
            background: rgba(42,157,143,0.15) !important;
        }
        [data-theme="dark"] #deposit-amount {
            background: #0a1929 !important;
            color: #e2e8f0 !important;
            border-color: #1e3a5f !important;
        }
        [data-theme="dark"] #deposit-amount:focus {
            border-color: #2a9d8f !important;
            box-shadow: 0 0 0 3px rgba(42,157,143,0.18) !important;
        }
        /* Estilos para modal de meta em modo escuro */
        [data-theme="dark"] #goal-target {
            background: #0a1929 !important;
            color: #e2e8f0 !important;
            border-color: #1e3a5f !important;
        }
        [data-theme="dark"] #goal-target:focus {
            border-color: #c5a059 !important;
            box-shadow: 0 0 0 3px rgba(197,160,89,0.12) !important;
        }
        [data-theme="dark"] #goal-target-preview {
            background: rgba(197,160,89,0.1) !important;
            border-color: rgba(197,160,89,0.3) !important;
        }
        [data-theme="dark"] #target-preview-value {
            color: #c5a059 !important;
        }
        /* Estilos para nomes de categorias em orçamento */
        [data-theme="dark"] .budget-category-name {
            color: #e2e8f0 !important;
        }
        [data-theme="dark"] .budget-category-value {
            color: var(--slate-light) !important;
        }
    `;
    document.head.appendChild(style);
}

// ============================================================
//  2. GRÁFICO DE LINHA — EVOLUÇÃO DO SALDO
// ============================================================

let trendChartInstance = null;

export function renderTrendChart(transactions) {
    const container = document.getElementById('trend-chart-container');
    if (!container) return;

    // Agrupa por dia e calcula saldo acumulado
    const sorted = [...transactions]
        .filter(t => t.status !== 'pending')
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    if (sorted.length < 2) {
        container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100%;
                        color:var(--slate-light);font-size:0.85rem;font-family:'Montserrat',sans-serif;flex-direction:column;gap:8px;">
                <span style="font-size:2rem">📈</span>
                <span>Registre mais transações para ver a evolução do saldo</span>
            </div>`;
        return;
    }

    // Agrega por data
    const dailyMap = {};
    sorted.forEach(t => {
        const dateStr = new Date(t.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
        if (!dailyMap[dateStr]) dailyMap[dateStr] = 0;
        dailyMap[dateStr] += t.type === 'income' ? t.amount : -t.amount;
    });

    const labels = Object.keys(dailyMap);
    let runningBalance = 0;
    const balanceData = Object.values(dailyMap).map(v => {
        runningBalance += v;
        return parseFloat(runningBalance.toFixed(2));
    });

    const ctx = container.querySelector('canvas')?.getContext('2d');
    if (!ctx) return;

    if (trendChartInstance) trendChartInstance.destroy();

    // Gradiente de preenchimento
    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(42,157,143,0.35)');
    gradient.addColorStop(1, 'rgba(42,157,143,0.0)');

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Saldo Acumulado',
                data: balanceData,
                borderColor: ATLAS.teal,
                backgroundColor: gradient,
                borderWidth: 2.5,
                pointRadius: balanceData.length > 20 ? 0 : 5,
                pointHoverRadius: 7,
                pointBackgroundColor: ATLAS.gold,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                fill: true,
                tension: 0.42,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            animation: {
                duration: 900,
                easing: 'easeOutQuart',
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10,25,47,0.95)',
                    titleColor: '#c5a059',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(197,160,89,0.4)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: (ctx) => ` Saldo: ${ctx.parsed.y.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
                        labelColor: (ctx) => ({
                            borderColor: ATLAS.teal,
                            backgroundColor: ctx.parsed.y >= 0 ? ATLAS.teal : ATLAS.red,
                        }),
                    },
                },
            },
            scales: {
                x: {
                    ticks: { font: { family: 'Montserrat', size: 10 }, color: '#94a3b8', maxRotation: 45 },
                    grid: { color: 'rgba(0,0,0,0.04)' },
                },
                y: {
                    ticks: {
                        font: { family: 'Montserrat', size: 10 },
                        color: '#94a3b8',
                        callback: v => `R$ ${(v/1000).toFixed(0)}k`,
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' },
                },
            },
        },
    });
}

export function injectTrendChartSection() {
    const historySection = document.querySelector('.history-section');
    if (!historySection || document.getElementById('trend-chart-container')) return;

    const section = document.createElement('section');
    section.className = 'dashboard-section';
    section.style.marginBottom = '1.5rem';
    section.setAttribute('aria-label', 'Evolução do saldo');
    section.innerHTML = `
        <h2 style="display:flex;align-items:center;gap:10px;">
            📈 Evolução do Saldo
            <span style="font-size:0.7rem;color:var(--slate-light);font-weight:400;font-family:'Montserrat',sans-serif;">
                Transações realizadas ao longo do tempo
            </span>
        </h2>
        <div id="trend-chart-container" class="chart-container" style="height:220px;position:relative;">
            <canvas></canvas>
        </div>
    `;
    historySection.parentNode.insertBefore(section, historySection);
}

// ============================================================
//  3. GRÁFICO RADAR — GASTOS VS ORÇAMENTO
// ============================================================

let radarChartInstance = null;

export function renderRadarChart(transactions) {
    const container = document.getElementById('radar-chart-container');
    if (!container) return;

    const budgets = getBudgets();
    const categories = ['Alimentação', 'Transporte', 'Lazer', 'Contas', 'Salário', 'Outros'];
    const now = new Date();

    const monthExpenses = {};
    categories.forEach(c => monthExpenses[c] = 0);

    transactions
        .filter(t => t.type === 'expense' && t.status !== 'pending')
        .filter(t => {
            const d = new Date(t.created_at);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .forEach(t => {
            const cat = categories.includes(t.category) ? t.category : 'Outros';
            monthExpenses[cat] += t.amount;
        });

    const labels = categories.filter(c => monthExpenses[c] > 0 || budgets[c] > 0);
    
    if (labels.length === 0) {
        container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100%;
                        color:var(--slate-light);font-size:0.85rem;font-family:'Montserrat',sans-serif;text-align:center;">
                Sem dados suficientes para o gráfico radar no mês atual.
            </div>`;
        return;
    }

    const dataSpent = labels.map(c => monthExpenses[c] || 0);
    const dataBudget = labels.map(c => budgets[c] || 0);

    const ctx = container.querySelector('canvas')?.getContext('2d');
    if (!ctx) return;

    if (radarChartInstance) radarChartInstance.destroy();

    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Gastos Atuais',
                    data: dataSpent,
                    backgroundColor: 'rgba(230, 57, 70, 0.25)',
                    borderColor: ATLAS.red,
                    pointBackgroundColor: ATLAS.red,
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: ATLAS.red,
                    borderWidth: 2,
                },
                {
                    label: 'Orçamento Definido',
                    data: dataBudget,
                    backgroundColor: 'rgba(42, 157, 143, 0.25)',
                    borderColor: ATLAS.teal,
                    pointBackgroundColor: ATLAS.teal,
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: ATLAS.teal,
                    borderWidth: 2,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(197,160,89,0.15)' },
                    grid: { color: 'rgba(197,160,89,0.15)' },
                    pointLabels: { 
                        font: { family: 'Montserrat', size: 10 }, 
                        color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#94a3b8' : '#475569' 
                    },
                    ticks: { display: false }
                }
            },
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#94a3b8' : '#475569', 
                        font: { family: 'Montserrat', size: 11 } 
                    } 
                },
                tooltip: {
                    backgroundColor: 'rgba(10,25,47,0.95)',
                    titleColor: '#c5a059',
                    bodyColor: '#e2e8f0',
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.r.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                    }
                }
            }
        }
    });
}

export function injectRadarChartSection() {
    const budgetPanel = document.getElementById('budget-panel');
    if (!budgetPanel || document.getElementById('radar-chart-container')) return;

    const chartDiv = document.createElement('div');
    chartDiv.id = 'radar-chart-container';
    chartDiv.className = 'chart-container';
    chartDiv.style.cssText = 'height:260px; position:relative; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-light);';
    chartDiv.innerHTML = '<canvas></canvas>';
    budgetPanel.appendChild(chartDiv);
}

// ============================================================
//  4. SISTEMA DE ORÇAMENTOS POR CATEGORIA
// ============================================================

// Budgets: Supabase como fonte de verdade + cache local
let _budgetsCache = {};

export function getBudgets() { return _budgetsCache; }

export async function loadBudgetsFromDB(supabase, userId) {
    try {
        const { data, error } = await supabase
            .from('user_budgets')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
        if (!error && data) {
            let b = data.budgets;
            if (typeof b === 'string') {
                try { b = JSON.parse(b); } catch (e) { console.warn('loadBudgetsFromDB: budgets JSON parse failed', e); b = {}; }
            }
            _budgetsCache = b || {};
            console.info('loadBudgetsFromDB: budgets loaded', _budgetsCache);
        }
    } catch (e) { console.warn('loadBudgetsFromDB:', e); }
}

async function saveBudgets(budgets) {
    const supabase = _dbSupabase;
    const userId   = _dbUserId;
    _budgetsCache = budgets;
    if (!supabase || !userId) return;
    try {
        // Validação: garante chaves permitidas e valores numéricos
        const allowed = ['Alimentação', 'Transporte', 'Lazer', 'Contas', 'Salário', 'Outros'];
        const cleanBudgets = {};
        Object.keys(budgets || {}).forEach(k => {
            if (!allowed.includes(k)) return;
            const v = Number(budgets[k]);
            if (!isNaN(v) && v > 0) cleanBudgets[k] = v;
        });

        const payload = [{ user_id: userId, budgets: cleanBudgets }];
        const { data, error, status, statusText } = await supabase
            .from('user_budgets')
            .upsert(payload, { onConflict: 'user_id' })
            .select();

        if (error) {
            console.error('saveBudgets: erro ao upsert', { error, status, statusText, payload });
            _showMiniToast('Erro ao salvar orçamentos: ' + (error.message || 'unknown'), 'error');
        } else {
            // Atualiza cache com o que veio do banco (data pode ser array)
            if (Array.isArray(data) && data.length > 0) {
                _budgetsCache = data[0].budgets || {};
            }
        }
    } catch (e) { console.warn('saveBudgets:', e); }
}

export function injectBudgetSection(transactions) {
    if (document.getElementById('budget-panel')) {
        updateBudgetPanel(transactions);
        renderRadarChart(transactions); // Atualiza o radar
        return;
    }

    const panel = document.createElement('section');
    panel.id = 'budget-panel';
    panel.className = 'dashboard-section';
    panel.style.cssText = 'margin-bottom:1.5rem;';
    panel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem;flex-wrap:wrap;gap:10px;">
            <h2 style="margin:0;display:flex;align-items:center;gap:10px;">
                🎯 Orçamentos por Categoria
                <span style="font-size:0.7rem;color:var(--slate-light);font-weight:400;font-family:'Montserrat',sans-serif;">
                    Mês atual
                </span>
            </h2>
            <button id="btn-configure-budgets"
                style="padding:7px 14px;border-radius:6px;border:1px solid var(--gold-brass);
                       background:transparent;color:var(--gold-brass);font-family:'Montserrat',sans-serif;
                       font-size:0.75rem;font-weight:600;cursor:pointer;transition:all 0.2s;"
                onmouseover="this.style.background='rgba(197,160,89,0.12)'"
                onmouseout="this.style.background='transparent'">
                ⚙️ Configurar Limites
            </button>
        </div>
        <div id="budget-bars"></div>
    `;

    const anchor = document.getElementById('dynamic-panels-anchor');
    if (anchor) {
        anchor.appendChild(panel);
    } else {
        // Fallback caso o anchor não exista
        const historySection = document.querySelector('.history-section');
        if (historySection) historySection.parentNode.insertBefore(panel, historySection);
    }

    document.getElementById('btn-configure-budgets').addEventListener('click', () => openBudgetModal());
    
    updateBudgetPanel(transactions);
    injectRadarChartSection(); // Injeta a div do radar no final do painel de orçamento
    renderRadarChart(transactions);
}

function updateBudgetPanel(transactions) {
    const barsEl = document.getElementById('budget-bars');
    if (!barsEl) return;

    const budgets = getBudgets();
    const categories = ['Alimentação', 'Transporte', 'Lazer', 'Contas', 'Salário', 'Outros'];
    const now = new Date();

    // Filtra gastos do mês corrente
    const monthExpenses = {};
    transactions
        .filter(t => t.type === 'expense' && t.status !== 'pending')
        .filter(t => {
            const d = new Date(t.created_at);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .forEach(t => {
            const cat = categories.includes(t.category) ? t.category : 'Outros';
            monthExpenses[cat] = (monthExpenses[cat] || 0) + t.amount;
        });

    const activeCats = categories.filter(c => monthExpenses[c] > 0 || budgets[c] > 0);

    if (activeCats.length === 0) {
        barsEl.innerHTML = `
            <p style="color:var(--slate-light);font-size:0.85rem;font-family:'Montserrat',sans-serif;text-align:center;padding:1rem 0;">
                Sem despesas no mês atual. Adicione limites de orçamento para acompanhar seus gastos.
            </p>`;
        return;
    }

    barsEl.innerHTML = activeCats.map(cat => {
        const spent = monthExpenses[cat] || 0;
        const budget = budgets[cat] || 0;
        const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
        const overBudget = budget > 0 && spent > budget;
        const barColor = overBudget ? ATLAS.red : pct > 75 ? ATLAS.orange : ATLAS.teal;
        const fmt = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        return `
            <div class="budget-bar-item" style="margin-bottom:1rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <span class="budget-category-name" style="font-family:'Montserrat',sans-serif;font-size:0.82rem;font-weight:600;">
                        ${cat}
                    </span>
                    <span class="budget-category-value" style="font-family:'Montserrat',sans-serif;font-size:0.78rem;color:${overBudget ? ATLAS.red : 'var(--slate-light)'};">
                        ${fmt(spent)} ${budget > 0 ? `/ ${fmt(budget)}` : '(sem limite)'}
                        ${overBudget ? ' ⚠️ Excedido!' : ''}
                    </span>
                </div>
                <div style="height:8px;background:var(--border-light);border-radius:99px;overflow:hidden;">
                    <div class="budget-fill" style="
                        width:0%;
                        height:100%;
                        background:${barColor};
                        border-radius:99px;
                        transition:width 0.9s cubic-bezier(0.22,1,0.36,1);
                        box-shadow:0 0 8px ${barColor}55;
                    " data-target="${pct}"></div>
                </div>
            </div>`;
    }).join('');

    // Anima as barras
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.querySelectorAll('.budget-fill').forEach(el => {
                el.style.width = el.dataset.target + '%';
            });
        });
    });
}

function openBudgetModal() {
    const categories = ['Alimentação', 'Transporte', 'Lazer', 'Contas', 'Outros'];
    const budgets = getBudgets();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(2,10,25,0.75);z-index:10000;
        display:flex;align-items:center;justify-content:center;
        animation:fadeInOverlay 0.25s ease;
    `;

    const box = document.createElement('div');
    box.className = 'modal-box';
    box.style.cssText = `
        background:var(--glass-bg);border:1px solid var(--glass-border);
        border-top:3px solid var(--gold-brass);border-radius:16px;
        padding:2rem;width:100%;max-width:420px;
        box-shadow:0 24px 80px rgba(0,0,0,0.25);
        animation:slideUpModal 0.3s cubic-bezier(0.22,1,0.36,1);
    `;

    box.innerHTML = `
        <h3 style="font-family:'Cinzel',serif;font-size:1.1rem;margin-bottom:1.5rem;color:var(--gold-brass);">
            ⚙️ Configurar Orçamentos Mensais
        </h3>
        <p style="font-family:'Montserrat',sans-serif;font-size:0.8rem;color:var(--slate-light);margin-bottom:1.2rem;">
            Defina o limite de gastos para cada categoria. Deixe em branco para sem limite.
        </p>
        ${categories.map(cat => `
            <div style="margin-bottom:1rem;">
                <label style="font-family:'Montserrat',sans-serif;font-size:0.8rem;font-weight:600;
                              color:var(--text-dark);display:block;margin-bottom:5px;">${cat}</label>
                <input type="number" id="budget-input-${cat}" value="${budgets[cat] || ''}"
                    placeholder="Sem limite" min="0" step="10"
                    style="width:100%;padding:8px 12px;border-radius:8px;border:1.5px solid var(--border-light);
                           font-family:'Montserrat',sans-serif;font-size:0.85rem;outline:none;
                           background:#f8fafc;color:var(--text-dark);transition:border 0.2s;"
                    onfocus="this.style.borderColor='#c5a059'"
                    onblur="this.style.borderColor='var(--border-light)'">
            </div>
        `).join('')}
        <div style="display:flex;gap:10px;margin-top:1.5rem;">
            <button id="btn-save-budgets"
                style="flex:1;padding:10px;border-radius:8px;border:none;
                       background:linear-gradient(135deg,#c5a059,#b38f46);
                       color:#0a192f;font-family:'Montserrat',sans-serif;
                       font-size:0.85rem;font-weight:700;cursor:pointer;">
                ⚓ Salvar Limites
            </button>
            <button id="btn-close-modal"
                style="padding:10px 18px;border-radius:8px;border:1px solid var(--border-light);
                       background:transparent;color:var(--slate);font-family:'Montserrat',sans-serif;
                       font-size:0.85rem;cursor:pointer;">
                Cancelar
            </button>
        </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    document.getElementById('btn-close-modal').addEventListener('click', () => overlay.remove());
    document.getElementById('btn-save-budgets').addEventListener('click', () => {
        const newBudgets = {};
        categories.forEach(cat => {
            const val = parseFloat(document.getElementById(`budget-input-${cat}`).value);
            if (!isNaN(val) && val > 0) newBudgets[cat] = val;
        });
        saveBudgets(newBudgets);
        overlay.remove();
        // Dispara evento para script.js atualizar o painel
        window.dispatchEvent(new CustomEvent('atlas:budgets-updated'));
        _showMiniToast('Orçamentos salvos! 🎯', 'success');
    });

    _injectModalStyles();
}

function _injectModalStyles() {
    if (document.getElementById('atlas-modal-styles')) return;
    const s = document.createElement('style');
    s.id = 'atlas-modal-styles';
    s.textContent = `
        @keyframes fadeInOverlay { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUpModal  {
            from { opacity:0; transform:translateY(24px) scale(0.97); }
            to   { opacity:1; transform:translateY(0) scale(1); }
        }
    `;
    document.head.appendChild(s);
}

// ============================================================
//  5. IMPORTAÇÃO DE CSV BANCÁRIO
// ============================================================

export function injectCSVImportButton() {
    if (document.getElementById('btn-import-csv')) return;

    const btn = document.createElement('button');
    btn.id = 'btn-import-csv';
    btn.title = 'Importar extrato CSV (Alt+I)';
    btn.innerHTML = '📥 Importar CSV';
    Object.assign(btn.style, {
        padding: '8px 14px',
        borderRadius: '6px',
        border: '1px solid var(--emerald-sea)',
        background: 'transparent',
        color: 'var(--emerald-sea, #2a9d8f)',
        fontFamily: "'Montserrat', sans-serif",
        fontSize: '0.8rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    });
    btn.addEventListener('mouseover', () => { btn.style.background = '#2a9d8f'; btn.style.color = '#fff'; });
    btn.addEventListener('mouseout', () => { btn.style.background = 'transparent'; btn.style.color = '#2a9d8f'; });
    btn.addEventListener('click', openCSVImportModal);

    const actions = document.querySelector('.header-actions');
    if (actions) {
        const excelBtn = document.getElementById('btn-export-excel');
        if (excelBtn) actions.insertBefore(btn, excelBtn);
        else actions.appendChild(btn);
    }
}

export function openCSVImportModal(onImportCallback) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(2,10,25,0.75);z-index:10000;
        display:flex;align-items:center;justify-content:center;
        animation:fadeInOverlay 0.25s ease;
    `;

    const box = document.createElement('div');
    box.className = 'modal-box';
    box.style.cssText = `
        background:var(--glass-bg);border:1px solid var(--glass-border);
        border-top:3px solid #2a9d8f;border-radius:16px;
        padding:2rem;width:100%;max-width:500px;
        box-shadow:0 24px 80px rgba(0,0,0,0.25);
        animation:slideUpModal 0.3s cubic-bezier(0.22,1,0.36,1);
    `;

    box.innerHTML = `
        <h3 style="font-family:'Cinzel',serif;font-size:1.1rem;margin-bottom:0.5rem;color:#2a9d8f;">
            📥 Importar Extrato CSV
        </h3>
        <p style="font-family:'Montserrat',sans-serif;font-size:0.78rem;color:var(--slate-light);margin-bottom:1.2rem;line-height:1.6;">
            Importe um arquivo <strong>.csv</strong> com colunas: <code>data,descricao,valor,tipo</code><br>
            O tipo pode ser: <em>entrada / receita / credito</em> ou <em>saida / despesa / debito</em>
        </p>
        <div id="csv-drop-zone"
            style="border:2px dashed rgba(42,157,143,0.5);border-radius:12px;padding:2rem;
                   text-align:center;cursor:pointer;transition:all 0.25s;margin-bottom:1.2rem;
                   font-family:'Montserrat',sans-serif;color:var(--slate-light);font-size:0.85rem;">
            <div style="font-size:2.5rem;margin-bottom:0.5rem;">📂</div>
            <strong>Arraste o arquivo aqui</strong> ou clique para selecionar
            <input type="file" id="csv-file-input" accept=".csv,.txt" style="display:none;">
        </div>
        <div id="csv-preview" style="display:none;max-height:180px;overflow-y:auto;
             border:1px solid var(--border-light);border-radius:8px;margin-bottom:1rem;font-size:0.78rem;"></div>
        <div id="csv-summary" style="display:none;padding:0.75rem;background:rgba(42,157,143,0.08);
             border-radius:8px;margin-bottom:1rem;font-family:'Montserrat',sans-serif;font-size:0.82rem;
             color:var(--text-dark);"></div>
        <div style="display:flex;gap:10px;">
            <button id="btn-confirm-import" disabled
                style="flex:1;padding:10px;border-radius:8px;border:none;
                       background:linear-gradient(135deg,#2a9d8f,#21786c);
                       color:#fff;font-family:'Montserrat',sans-serif;
                       font-size:0.85rem;font-weight:700;cursor:not-allowed;opacity:0.5;transition:all 0.2s;">
                ⚓ Confirmar Importação
            </button>
            <button id="btn-close-csv-modal"
                style="padding:10px 18px;border-radius:8px;border:1px solid var(--border-light);
                       background:transparent;color:var(--slate);font-family:'Montserrat',sans-serif;
                       font-size:0.85rem;cursor:pointer;">
                Cancelar
            </button>
        </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    _injectModalStyles();

    const dropZone = box.querySelector('#csv-drop-zone');
    const fileInput = box.querySelector('#csv-file-input');
    let parsedRows = [];

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#2a9d8f';
        dropZone.style.background = 'rgba(42,157,143,0.07)';
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'rgba(42,157,143,0.5)';
        dropZone.style.background = '';
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) processCSVFile(file);
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) processCSVFile(fileInput.files[0]);
    });

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    box.querySelector('#btn-close-csv-modal').addEventListener('click', () => overlay.remove());

    function processCSVFile(file) {
        if (!/(\.csv|\.txt)$/i.test(file.name) || file.size > 1024 * 1024) {
            const preview = box.querySelector('#csv-preview');
            preview.style.display = 'block';
            preview.innerHTML = `<p style="padding:1rem;color:#e63946;font-family:'Montserrat',sans-serif;">
                Arquivo inválido. Use CSV/TXT com até 1 MB.</p>`;
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            parsedRows = parseCSV(text);

            const preview = box.querySelector('#csv-preview');
            const summary = box.querySelector('#csv-summary');
            const confirmBtn = box.querySelector('#btn-confirm-import');

            if (parsedRows.length === 0) {
                preview.style.display = 'block';
                preview.innerHTML = `<p style="padding:1rem;color:#e63946;font-family:'Montserrat',sans-serif;">
                    Nenhuma transação válida encontrada. Verifique o formato do arquivo.</p>`;
                return;
            }

            // Preview tabela
            preview.style.display = 'block';
            preview.innerHTML = `
                <table style="width:100%;border-collapse:collapse;font-family:'Montserrat',sans-serif;">
                    <thead>
                        <tr style="background:#0a192f;color:#c5a059;">
                            <th style="padding:6px 8px;text-align:left;font-size:0.72rem;">Descrição</th>
                            <th style="padding:6px 8px;text-align:right;font-size:0.72rem;">Valor</th>
                            <th style="padding:6px 8px;text-align:left;font-size:0.72rem;">Tipo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${parsedRows.slice(0, 8).map((r, i) => `
                            <tr style="background:${i%2===0?'#f8fafc':'white'}">
                                <td style="padding:5px 8px;font-size:0.72rem;">${escapeHTML(r.desc)}</td>
                                <td style="padding:5px 8px;font-size:0.72rem;text-align:right;
                                    color:${r.type==='income'?'#2a9d8f':'#e63946'};">
                                    ${r.type==='income'?'+':'-'} R$ ${r.amount.toFixed(2)}
                                </td>
                                <td style="padding:5px 8px;font-size:0.72rem;">${r.type==='income'?'Entrada':'Saída'}</td>
                            </tr>`).join('')}
                        ${parsedRows.length > 8 ? `
                            <tr><td colspan="3" style="padding:6px 8px;font-size:0.7rem;color:var(--slate-light);text-align:center;">
                                + ${parsedRows.length - 8} transações a mais...
                            </td></tr>` : ''}
                    </tbody>
                </table>`;

            const income = parsedRows.filter(r=>r.type==='income').reduce((s,r)=>s+r.amount,0);
            const expense = parsedRows.filter(r=>r.type==='expense').reduce((s,r)=>s+r.amount,0);
            summary.style.display = 'block';
            summary.innerHTML = `
                <strong>✅ ${parsedRows.length} transações encontradas</strong><br>
                Entradas: <strong style="color:#2a9d8f;">${income.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong> &nbsp;|&nbsp;
                Saídas: <strong style="color:#e63946;">${expense.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong>
            `;

            dropZone.innerHTML = `<div style="font-size:2rem">✅</div><strong>${escapeHTML(file.name)}</strong><br><small>${parsedRows.length} transações prontas</small>`;
            dropZone.style.borderColor = '#2a9d8f';
            dropZone.style.background = 'rgba(42,157,143,0.05)';

            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.style.cursor = 'pointer';
        };
        reader.readAsText(file, 'UTF-8');
    }

    box.querySelector('#btn-confirm-import').addEventListener('click', () => {
        if (parsedRows.length > 0 && typeof onImportCallback === 'function') {
            onImportCallback(parsedRows);
        }
        overlay.remove();
    });
}

function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const rows = [];
    const incomeKeywords = /entrada|receita|credito|crédito|credit|income|deposito|depósito/i;
    const expenseKeywords = /saida|saída|despesa|debito|débito|debit|expense|pagamento|withdrawal/i;
    const ALLOWED_CATS = ['Alimentação', 'Transporte', 'Lazer', 'Contas', 'Salário', 'Outros'];

    // Detecta separador (vírgula ou ponto-e-vírgula)
    const sep = lines[0].includes(';') ? ';' : ',';

    // Tenta parsear cabeçalho
    const headers = lines[0].toLowerCase().split(sep).map(h => h.trim().replace(/"/g, ''));

    const colMap = {
        desc: headers.findIndex(h => /desc|nome|historico|histórico|lancamento|lançamento|memo/i.test(h)),
        amount: headers.findIndex(h => /valor|amount|value|quantia/i.test(h)),
        type: headers.findIndex(h => /tipo|type|natureza|credito|debito/i.test(h)),
        date: headers.findIndex(h => /data|date|dt/i.test(h)),
        category: headers.findIndex(h => /categoria|category/i.test(h)),
    };

    // Se não encontrou cabeçalho, assume posições padrão
    const hasHeader = Object.values(colMap).some(v => v >= 0);
    const startLine = hasHeader ? 1 : 0;

    for (let i = startLine; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cells = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
        if (cells.length < 2) continue;

        const rawDesc = colMap.desc >= 0 ? cells[colMap.desc] : cells[0];
        const rawAmt = colMap.amount >= 0 ? cells[colMap.amount] : cells[1];
        const rawType = colMap.type >= 0 ? cells[colMap.type] : '';
        const rawCat = colMap.category >= 0 ? cells[colMap.category] : '';

        // Limpa e converte o valor
        const amtStr = rawAmt.replace(/[R$\s.]/g, '').replace(',', '.');
        const amount = parseFloat(amtStr);
        if (isNaN(amount) || amount <= 0) continue;

        // Determina tipo
        let type = 'expense';
        if (incomeKeywords.test(rawType) || incomeKeywords.test(rawDesc)) type = 'income';
        if (expenseKeywords.test(rawType)) type = 'expense';

        // Infere categoria pelo texto
        const descLower = rawDesc.toLowerCase();
        let category = ALLOWED_CATS.includes(rawCat) ? rawCat : 'Outros';
        if (category === 'Outros') {
            if (/mercado|supermercado|restaurante|lanche|ifood|uber eats|aliment/i.test(descLower)) category = 'Alimentação';
            else if (/uber|99|taxi|táxi|combustivel|combustível|gasolina|transporte|onibus|ônibus/i.test(descLower)) category = 'Transporte';
            else if (/netflix|spotify|cinema|lazer|jogo|game|entretenimento/i.test(descLower)) category = 'Lazer';
            else if (/luz|energia|água|agua|internet|telefone|plano|conta|aluguel/i.test(descLower)) category = 'Contas';
            else if (/salario|salário|pagamento|holerite/i.test(descLower)) category = 'Salário';
        }

        rows.push({
            desc: rawDesc.replace(/[\u0000-\u001F\u007F<>]/g, '').slice(0, 80),
            amount,
            type,
            category,
            status: 'paid',
            recurrence: 'unique',
            due_date: new Date().toISOString().split('T')[0],
        });
    }

    return rows;
}

// ============================================================
//  6. ATALHOS DE TECLADO
// ============================================================

export function initKeyboardShortcuts(callbacks = {}) {
    // Injeta painel de dicas
    _injectShortcutsHint();

    document.addEventListener('keydown', (e) => {
        // Ignora se usuário está digitando em input/textarea
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            if (e.key === 'Escape') document.activeElement.blur();
            return;
        }

        const alt = e.altKey;
        const ctrl = e.ctrlKey || e.metaKey;

        // Alt+N — Foca no campo de nova transação
        if (alt && e.key === 'n') {
            e.preventDefault();
            const descField = document.getElementById('desc');
            if (descField) {
                descField.focus();
                descField.closest('.form-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                _pulseElement(descField);
            }
        }

        // Alt+D — Dark mode
        if (alt && e.key === 'd') {
            e.preventDefault();
            toggleDarkMode();
        }

        // Alt+I — Importar CSV
        if (alt && e.key === 'i') {
            e.preventDefault();
            if (callbacks.onImportCSV) callbacks.onImportCSV();
            else openCSVImportModal();
        }

        // Alt+B — Configurar orçamentos
        if (alt && e.key === 'b') {
            e.preventDefault();
            openBudgetModal();
        }

        // Alt+S — Busca
        if (alt && e.key === 's') {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
                _pulseElement(searchInput);
            }
        }

        // Alt+P — Download PDF
        if (alt && e.key === 'p') {
            e.preventDefault();
            if (callbacks.onDownloadPDF) callbacks.onDownloadPDF();
        }

        // Alt+E — Exportar Excel
        if (alt && e.key === 'e') {
            e.preventDefault();
            if (callbacks.onExportExcel) callbacks.onExportExcel();
        }

        // ? — Abre painel de atalhos
        if (e.key === '?' && !alt && !ctrl) {
            e.preventDefault();
            _toggleShortcutsPanel();
        }
    });
}

function _pulseElement(el) {
    el.style.transition = 'box-shadow 0.15s ease';
    el.style.boxShadow = '0 0 0 4px rgba(197,160,89,0.5)';
    setTimeout(() => { el.style.boxShadow = ''; }, 600);
}

function _injectShortcutsHint() {
    if (document.getElementById('kbd-hint-panel')) return;
    const hint = document.createElement('div');
    hint.id = 'kbd-hint-panel';
    hint.style.cssText = `
        position:fixed;bottom:1.5rem;right:1.5rem;z-index:999;
        background:var(--glass-bg);border:1px solid rgba(197,160,89,0.35);
        border-radius:10px;padding:0;font-family:'Montserrat',sans-serif;
        font-size:0.72rem;box-shadow:0 8px 32px rgba(0,0,0,0.15);
        max-width:280px;overflow:hidden;
        transition:all 0.3s cubic-bezier(0.22,1,0.36,1);
    `;
    hint.innerHTML = `
        <button id="kbd-hint-toggle"
            style="width:100%;padding:8px 14px;background:transparent;border:none;
                   cursor:pointer;display:flex;align-items:center;justify-content:space-between;
                   font-family:'Montserrat',sans-serif;font-size:0.72rem;font-weight:600;
                   color:var(--slate);gap:6px;"
            title="Atalhos de teclado (pressione ?)">
            <span>⌨️ Atalhos</span>
            <span id="kbd-hint-arrow" style="transition:transform 0.2s;">▲</span>
        </button>
        <div id="kbd-hint-content" style="padding:0 14px 12px;display:none;">
            ${[
                ['Alt+N', 'Nova transação'],
                ['Alt+S', 'Buscar'],
                ['Alt+D', 'Modo escuro'],
                ['Alt+I', 'Importar CSV'],
                ['Alt+B', 'Orçamentos'],
                ['Alt+P', 'Baixar PDF'],
                ['Alt+E', 'Exportar Excel'],
                ['?', 'Mostrar/ocultar atalhos'],
            ].map(([key, desc]) => `
                <div style="display:flex;justify-content:space-between;align-items:center;
                            padding:3px 0;border-bottom:1px solid rgba(0,0,0,0.04);">
                    <span style="color:var(--slate-light);">${desc}</span>
                    <kbd style="background:var(--sea-mist);border:1px solid var(--border-light);
                               border-radius:4px;padding:2px 6px;font-size:0.68rem;
                               font-family:monospace;color:var(--text-dark);">${key}</kbd>
                </div>`).join('')}
        </div>
    `;
    document.body.appendChild(hint);

    document.getElementById('kbd-hint-toggle').addEventListener('click', _toggleShortcutsPanel);
}

function _toggleShortcutsPanel() {
    const content = document.getElementById('kbd-hint-content');
    const arrow = document.getElementById('kbd-hint-arrow');
    if (!content || !arrow) return;
    const isOpen = content.style.display !== 'none';
    content.style.display = isOpen ? 'none' : 'block';
    arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
}

// ============================================================
//  7. MODO FOCO NO FORMULÁRIO
// ============================================================

export function initFocusMode() {
    const formInputs = document.querySelectorAll('.form-section input, .form-section select, .form-section textarea');
    const formSection = document.querySelector('.form-section');
    
    if (!formSection || formInputs.length === 0) return;

    // Cria o overlay esmaecido global
    const overlay = document.createElement('div');
    overlay.id = 'atlas-focus-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(2, 10, 25, 0.65);
        z-index: 90; opacity: 0; pointer-events: none;
        transition: opacity 0.3s ease; backdrop-filter: blur(3px);
    `;
    document.body.appendChild(overlay);

    // Ajusta o formulário para se sobrepor ao overlay
    formSection.style.position = 'relative';
    formSection.style.transition = 'transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease, z-index 0s';

    formInputs.forEach(input => {
        input.addEventListener('focus', () => {
            overlay.style.opacity = '1';
            formSection.style.zIndex = '100';
            formSection.style.transform = 'scale(1.02)';
            formSection.style.boxShadow = '0 24px 80px rgba(0,0,0,0.4)';
        });
        
        input.addEventListener('blur', () => {
            // Um pequeno delay garante que se o clique for em outro input do mesmo formulário, não pisque o fundo
            setTimeout(() => {
                const active = document.activeElement;
                if (!formSection.contains(active)) {
                    overlay.style.opacity = '0';
                    formSection.style.zIndex = '';
                    formSection.style.transform = 'scale(1)';
                    formSection.style.boxShadow = '';
                }
            }, 10);
        });
    });
}

// ============================================================
//  8. PARTÍCULAS DE CONFETTI NÁUTICO
// ============================================================

export function fireConfetti() {
    const symbols = ['⚓', '🧭', '⛵', '🌊', '💰', '⭐', '✨'];
    const colors = ['#c5a059', '#2a9d8f', '#e63946', '#457b9d', '#f4a261'];

    for (let i = 0; i < 18; i++) {
        setTimeout(() => {
            const el = document.createElement('div');
            el.textContent = symbols[Math.floor(Math.random() * symbols.length)];
            Object.assign(el.style, {
                position: 'fixed',
                top: '-20px',
                left: `${10 + Math.random() * 80}%`,
                fontSize: `${1 + Math.random() * 1.2}rem`,
                zIndex: '99999',
                pointerEvents: 'none',
                animation: `atlasConfetti ${1.5 + Math.random() * 1.5}s ease-in forwards`,
                opacity: '1',
                transform: `rotate(${Math.random() * 360}deg)`,
            });
            document.body.appendChild(el);
            el.addEventListener('animationend', () => el.remove());
        }, i * 60);
    }

    if (!document.getElementById('confetti-keyframes')) {
        const s = document.createElement('style');
        s.id = 'confetti-keyframes';
        s.textContent = `
            @keyframes atlasConfetti {
                0%   { top:-20px; opacity:1; transform:rotate(0deg) scale(1); }
                80%  { opacity:0.8; }
                100% { top:105vh; opacity:0; transform:rotate(720deg) scale(0.5); }
            }
        `;
        document.head.appendChild(s);
    }
}

// ============================================================
//  9. SKELETON LOADING
// ============================================================

export function showTableSkeleton(tbodyId = 'transaction-list', rows = 5) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    if (!document.getElementById('skeleton-styles')) {
        const s = document.createElement('style');
        s.id = 'skeleton-styles';
        s.textContent = `
            .skeleton-row td { padding: 12px 16px !important; }
            .skeleton-cell {
                height: 14px;
                background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
                background-size: 200% 100%;
                border-radius: 6px;
                animation: skeletonPulse 1.4s ease infinite;
            }
            [data-theme="dark"] .skeleton-cell {
                background: linear-gradient(90deg, #1e3a5f 25%, #0a192f 50%, #1e3a5f 75%);
                background-size: 200% 100%;
            }
            @keyframes skeletonPulse {
                0%   { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        `;
        document.head.appendChild(s);
    }

    tbody.innerHTML = Array.from({ length: rows }, (_, i) => `
        <tr class="skeleton-row">
            <td><div class="skeleton-cell" style="width:${60+Math.random()*30}%;animation-delay:${i*0.08}s"></div></td>
            <td><div class="skeleton-cell" style="width:70%;animation-delay:${i*0.08+0.05}s"></div></td>
            <td><div class="skeleton-cell" style="width:80%;animation-delay:${i*0.08+0.1}s"></div></td>
            <td><div class="skeleton-cell" style="width:60%;animation-delay:${i*0.08+0.15}s"></div></td>
            <td><div class="skeleton-cell" style="width:40%;margin:0 auto;animation-delay:${i*0.08+0.2}s"></div></td>
        </tr>
    `).join('');
}

// ============================================================
//  10. PAINEL DE METAS FINANCEIRAS E EXTRAS
// ============================================================

// Referências ao Supabase e userId, preenchidas pelo script.js via setSupabaseContext()
let _dbSupabase = null;
let _dbUserId   = null;
export function setSupabaseContext(supabase, userId) {
    _dbSupabase = supabase;
    _dbUserId   = userId;
}

// Goals: Supabase como fonte de verdade + cache local para renderização síncrona
let _goalsCache = [];

export function getGoals() { return _goalsCache; }

export async function loadGoalsFromDB(supabase, userId) {
    try {
        const { data, error } = await supabase
            .from('user_goals')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });
        if (!error && data) _goalsCache = data;
    } catch (e) { console.warn('loadGoalsFromDB:', e); }
}

async function saveGoals(goals) {
    const supabase = _dbSupabase;
    const userId   = _dbUserId;
    _goalsCache = goals;
    if (!supabase || !userId) return;
    try {
        // Apaga registros antigos do usuário (sincronização simples)
        const delRes = await supabase.from('user_goals').delete().eq('user_id', userId);
        if (delRes.error) {
            console.warn('saveGoals: erro ao deletar metas antigas', delRes.error);
        }

        if (goals.length > 0) {
            // Remove colunas gerenciadas pelo Supabase e força tipos antes de inserir
            const rows = goals.map(({ id, created_at, createdAt, ...rest }) => ({
                name: String(rest.name || ''),
                emoji: rest.emoji || '🎯',
                target: Number(rest.target) || 0,
                current: Number(rest.current) || 0,
                user_id: userId,
            }));

            // Validação mínima local para evitar payload inválido
            const invalid = rows.find(r => !r.name || typeof r.target !== 'number' || isNaN(r.target) || r.target < 0 || isNaN(r.current));
            if (invalid) {
                console.error('saveGoals: payload inválido detectado antes de inserir', invalid);
                _showMiniToast('Dados de meta inválidos. Verifique os campos.', 'error');
                return;
            }

            const { data: inserted, error: insertError, status, statusText } = await supabase.from('user_goals').insert(rows).select();
            if (insertError) {
                console.error('saveGoals: erro ao inserir metas', { insertError, status, statusText, rows });

                // Tratamento específico quando coluna não existe no esquema (ex: 'emoji')
                const msg = String(insertError.message || '').toLowerCase();
                if (msg.includes("could not find the 'emoji' column") || msg.includes('column "emoji" does not exist') || msg.includes("emoji")) {
                    try {
                        const rowsNoEmoji = rows.map(({ name, target, current, user_id }) => ({ name, target, current, user_id }));
                        const { data: retried, error: retryErr } = await supabase.from('user_goals').insert(rowsNoEmoji).select();
                        if (!retryErr) {
                            if (Array.isArray(retried) && retried.length > 0) _goalsCache = retried;
                            return;
                        } else {
                            console.error('saveGoals: retry sem emoji também falhou', retryErr);
                            _showMiniToast('Erro ao salvar metas: ' + (retryErr.message || 'unknown'), 'error');
                            return;
                        }
                    } catch (retryEx) {
                        console.error('saveGoals: exceção no retry sem emoji', retryEx);
                        _showMiniToast('Erro ao salvar metas.', 'error');
                        return;
                    }
                }

                _showMiniToast('Erro ao salvar metas: ' + (insertError.message || 'unknown'), 'error');
            } else {
                // Atualiza cache com valores retornados pelo banco, se houver
                if (Array.isArray(inserted) && inserted.length > 0) _goalsCache = inserted;
            }
        }
    } catch (e) { console.warn('saveGoals:', e); }
}

export function injectGoalsPanel() {
    if (document.getElementById('goals-panel')) return;

    const panel = document.createElement('section');
    panel.id = 'goals-panel';
    panel.className = 'dashboard-section';
    panel.style.marginBottom = '1.5rem';
    panel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem;flex-wrap:wrap;gap:10px;">
            <h2 style="margin:0;display:flex;align-items:center;gap:10px;">
                🏆 Metas Financeiras
                <span style="font-size:0.7rem;color:var(--slate-light);font-weight:400;font-family:'Montserrat',sans-serif;">
                    Seus objetivos de economia
                </span>
            </h2>
            <button id="btn-add-goal"
                style="padding:7px 14px;border-radius:6px;border:1px solid var(--gold-brass);
                       background:transparent;color:var(--gold-brass);font-family:'Montserrat',sans-serif;
                       font-size:0.75rem;font-weight:600;cursor:pointer;transition:all 0.2s;"
                onmouseover="this.style.background='rgba(197,160,89,0.12)'"
                onmouseout="this.style.background='transparent'">
                + Nova Meta
            </button>
        </div>
        <div id="goals-list"></div>
    `;

    const anchor = document.getElementById('dynamic-panels-anchor');
    if (anchor) {
        // Goals vai ANTES do budget dentro do anchor
        const budgetPanel = document.getElementById('budget-panel');
        if (budgetPanel && anchor.contains(budgetPanel)) {
            anchor.insertBefore(panel, budgetPanel);
        } else {
            anchor.insertBefore(panel, anchor.firstChild);
        }
    } else {
        // Fallback caso o anchor não exista
        const historySection = document.querySelector('.history-section');
        if (historySection) historySection.parentNode.insertBefore(panel, historySection);
    }

    document.getElementById('btn-add-goal').addEventListener('click', () => openGoalModal());
    renderGoals();
}

function renderGoals() {
    const listEl = document.getElementById('goals-list');
    if (!listEl) return;
    const goals = getGoals();

    if (goals.length === 0) {
        listEl.innerHTML = `
            <p style="color:var(--slate-light);font-size:0.85rem;font-family:'Montserrat',sans-serif;
                      text-align:center;padding:1rem 0;">
                Nenhuma meta definida. Clique em "+ Nova Meta" para começar!
            </p>`;
        return;
    }

    listEl.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem;">
            ${goals.map((g, i) => {
                const pct = Math.min((g.current / g.target) * 100, 100);
                const done = pct >= 100;
                return `
                    <div class="goal-card" style="
                        background:${done ? 'linear-gradient(135deg,rgba(42,157,143,0.12),rgba(42,157,143,0.06))' : 'var(--glass-bg)'};
                        border:1px solid ${done ? '#2a9d8f' : 'var(--glass-border)'};
                        border-radius:12px;padding:1rem;position:relative;
                        transition:transform 0.2s,box-shadow 0.2s;">
                        ${done ? '<div style="position:absolute;top:-8px;right:-8px;font-size:1.4rem;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2))">🏆</div>' : ''}
                        <div style="font-size:1.5rem;margin-bottom:0.5rem;">${g.emoji || '🎯'}</div>
                        <strong style="font-family:'Montserrat',sans-serif;font-size:0.85rem;color:var(--text-dark);display:block;margin-bottom:0.3rem;">
                            ${g.name}
                        </strong>
                        <div style="font-family:'Montserrat',sans-serif;font-size:0.78rem;color:var(--slate-light);margin-bottom:0.75rem;">
                            ${(g.current||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} /
                            ${g.target.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                        </div>
                        <div style="height:6px;background:var(--border-light);border-radius:99px;overflow:hidden;margin-bottom:0.75rem;">
                            <div style="width:${pct}%;height:100%;background:${done?'#2a9d8f':'#c5a059'};
                                 border-radius:99px;transition:width 0.8s ease;
                                 box-shadow:0 0 6px ${done?'rgba(42,157,143,0.5)':'rgba(197,160,89,0.4)'};">
                            </div>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-size:0.72rem;font-family:'Montserrat',sans-serif;
                                         font-weight:700;color:${done?'#2a9d8f':'var(--gold-brass)'};">
                                ${pct.toFixed(0)}% ${done ? '✅ Concluída!' : ''}
                            </span>
                            <div style="display:flex;gap:6px;">
                                <button onclick="window._atlasDepositGoal(${i})"
                                    style="font-size:0.68rem;padding:3px 8px;border-radius:5px;
                                           border:1px solid #2a9d8f;background:transparent;
                                           color:#2a9d8f;cursor:pointer;font-family:'Montserrat',sans-serif;font-weight:600;"
                                    title="Adicionar valor">+ Depositar</button>
                                <button onclick="window._atlasDeleteGoal(${i})"
                                    style="font-size:0.68rem;padding:3px 7px;border-radius:5px;
                                           border:1px solid rgba(230,57,70,0.4);background:transparent;
                                           color:#e63946;cursor:pointer;" title="Excluir meta">✕</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function openGoalModal(editIndex = null) {
    const goals = getGoals();
    const g = editIndex !== null ? goals[editIndex] : {};
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(2,10,25,0.75);z-index:10000;
        display:flex;align-items:center;justify-content:center;animation:fadeInOverlay 0.25s ease;`;
    const emojis = ['🏠','🚗','✈️','🎓','💰','💎','🏖️','🏋️','🎯','📱'];
    overlay.innerHTML = `
        <div class="modal-box" style="background:var(--glass-bg);border:1px solid var(--glass-border);
            border-top:3px solid var(--gold-brass);border-radius:16px;padding:2rem;
            width:100%;max-width:380px;box-shadow:0 24px 80px rgba(0,0,0,0.25);
            animation:slideUpModal 0.3s cubic-bezier(0.22,1,0.36,1);">
            <h3 style="font-family:'Cinzel',serif;font-size:1.1rem;margin-bottom:1.2rem;color:var(--gold-brass);">
                🏆 ${editIndex !== null ? 'Editar Meta' : 'Nova Meta'}
            </h3>
            <div style="margin-bottom:0.9rem;">
                <label style="font-family:'Montserrat',sans-serif;font-size:0.8rem;font-weight:600;
                              color:var(--text-dark);display:block;margin-bottom:5px;">Emoji</label>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    ${emojis.map(e => `
                        <button class="emoji-opt" data-emoji="${e}"
                            style="font-size:1.3rem;padding:4px 6px;border-radius:6px;border:1px solid var(--border-light);
                                   background:${g.emoji===e?'rgba(197,160,89,0.15)':'transparent'};cursor:pointer;
                                   transition:all 0.15s;">${e}</button>`).join('')}
                </div>
            </div>
            <div style="margin-bottom:0.9rem;">
                <label style="font-family:'Montserrat',sans-serif;font-size:0.8rem;font-weight:600;color:var(--text-dark);display:block;margin-bottom:5px;">Nome da Meta</label>
                <input id="goal-name" value="${g.name||''}" placeholder="Ex: Viagem para Europa"
                    style="width:100%;padding:8px 12px;border-radius:8px;border:1.5px solid var(--border-light);
                           font-family:'Montserrat',sans-serif;font-size:0.85rem;background:#f8fafc;color:var(--text-dark);"
                    onfocus="this.style.borderColor='#c5a059'" onblur="this.style.borderColor='var(--border-light)'">
            </div>
            <div style="margin-bottom:1.2rem;">
                <label style="font-family:'Montserrat',sans-serif;font-size:0.8rem;font-weight:600;color:var(--text-dark);display:block;margin-bottom:5px;">Valor Alvo (R$)</label>
                <input id="goal-target" type="text" placeholder="Ex: R$ 5.000,00"
                    style="width:100%;padding:8px 12px;border-radius:8px;border:1.5px solid var(--border-light);
                           font-family:'Montserrat',sans-serif;font-size:0.85rem;background:#f8fafc;color:var(--text-dark);"
                    onfocus="this.style.borderColor='#c5a059'" onblur="this.style.borderColor='var(--border-light)'">
                
                <div id="goal-target-preview" style="margin-top:0.6rem;padding:0.6rem;border-radius:6px;
                    background:rgba(197,160,89,0.08);border:1px dashed var(--gold-brass);display:none;text-align:center;">
                    <p style="margin:0;font-size:0.7rem;color:var(--slate-light);font-weight:600;">
                        Valor Alvo
                    </p>
                    <p style="margin:0.3rem 0 0;font-size:0.95rem;font-weight:700;color:var(--gold-brass);">
                        <span id="target-preview-value">R$ 0,00</span>
                    </p>
                </div>
            </div>
            <div style="display:flex;gap:10px;">
                <button id="btn-save-goal"
                    style="flex:1;padding:10px;border-radius:8px;border:none;
                           background:linear-gradient(135deg,#c5a059,#b38f46);
                           color:#0a192f;font-family:'Montserrat',sans-serif;font-size:0.85rem;font-weight:700;cursor:pointer;">
                    ⚓ Salvar Meta
                </button>
                <button id="btn-cancel-goal"
                    style="padding:10px 18px;border-radius:8px;border:1px solid var(--border-light);
                           background:transparent;color:var(--slate);font-family:'Montserrat',sans-serif;font-size:0.85rem;cursor:pointer;">
                    Cancelar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    _injectModalStyles();

    const targetInput = overlay.querySelector('#goal-target');
    const targetPreview = overlay.querySelector('#goal-target-preview');
    const targetPreviewValue = overlay.querySelector('#target-preview-value');

    // Função para aplicar máscara de moeda
    const applyTargetMask = (value) => {
        let cleanValue = String(value).replace(/\D/g, '');
        if (!cleanValue) return { display: '', raw: 0 };
        
        const raw = parseInt(cleanValue) / 100;
        const parts = raw.toFixed(2).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        const display = `R$ ${parts.join(',')}`;
        
        targetInput.value = display;
        return { display, raw };
    };

    // Função para extrair valor bruto do campo formatado
    const getTargetRawValue = () => {
        const cleanStr = targetInput.value
            .replace(/[R$\s.]/g, '')
            .replace(',', '.');
        return parseFloat(cleanStr) || 0;
    };

    // Pré-preenche se estiver editando
    if (g.target) {
        applyTargetMask((g.target * 100).toString());
        targetPreview.style.display = 'block';
        targetPreviewValue.textContent = g.target.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
    }

    // Aplica máscara ao digitar
    targetInput.addEventListener('input', (e) => {
        const result = applyTargetMask(e.target.value);
        if (result.raw > 0) {
            targetPreview.style.display = 'block';
            targetPreviewValue.textContent = result.raw.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
        } else {
            targetPreview.style.display = 'none';
        }
    });

    // Suporte para Enter confirmar
    targetInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            overlay.querySelector('#btn-save-goal').click();
        }
    });

    let selectedEmoji = g.emoji || '🎯';
    overlay.querySelectorAll('.emoji-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedEmoji = btn.dataset.emoji;
            overlay.querySelectorAll('.emoji-opt').forEach(b => b.style.background='transparent');
            btn.style.background = 'rgba(197,160,89,0.2)';
        });
    });

    overlay.querySelector('#btn-cancel-goal').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#btn-save-goal').addEventListener('click', async () => {
        const name = overlay.querySelector('#goal-name').value.trim();
        const target = getTargetRawValue();
        if (!name || isNaN(target) || target <= 0) {
            _showMiniToast('Preencha nome e valor alvo válido.', 'error');
            return;
        }
        const newGoal = { name, target, current: g.current || 0, emoji: selectedEmoji };
        if (editIndex !== null) goals[editIndex] = { ...newGoal };
        else goals.push(newGoal);
        overlay.remove();
        _showMiniToast('Salvando meta... ⚓', 'info');
        await saveGoals(goals);
        if (_dbSupabase && _dbUserId) await loadGoalsFromDB(_dbSupabase, _dbUserId);
        renderGoals();
        _showMiniToast('Meta salva! 🏆', 'success');
    });
}

// Expõe no window para os botões inline do HTML
window._atlasDepositGoal = function(index) {
    const goals = getGoals();
    const g = goals[index];
    if (!g) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(2,10,25,0.75);z-index:10000;
        display:flex;align-items:center;justify-content:center;animation:fadeInOverlay 0.25s ease;`;
    
    const remaining = Math.max(0, g.target - (g.current || 0));
    const progress = Math.min(100, ((g.current || 0) / g.target) * 100);
    const percentButtons = [
        { label: '25%', value: Math.round(g.target * 0.25) },
        { label: '50%', value: Math.round(g.target * 0.50) },
        { label: '100%', value: Math.round(g.target * 1.00) },
    ];

    overlay.innerHTML = `
        <div class="modal-box" style="background:var(--glass-bg);border:1px solid var(--glass-border);
            border-top:3px solid var(--emerald-sea);border-radius:16px;padding:2rem;
            width:100%;max-width:400px;box-shadow:0 24px 80px rgba(0,0,0,0.25);
            animation:slideUpModal 0.3s cubic-bezier(0.22,1,0.36,1);">
            
            <div style="text-align:center;margin-bottom:1.5rem;">
                <h2 style="font-size:2rem;margin:0;margin-bottom:0.5rem;">${g.emoji}</h2>
                <h3 style="font-family:'Cinzel',serif;font-size:1rem;margin:0;color:var(--gold-brass);">
                    Depositar em: ${g.name}
                </h3>
            </div>

            <div style="background:rgba(42,157,143,0.1);border-radius:12px;padding:1rem;margin-bottom:1.5rem;
                        border:1px solid var(--emerald-sea);">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                    <div>
                        <span style="font-size:0.75rem;font-weight:700;color:var(--slate-light);text-transform:uppercase;">
                            Saldo Atual
                        </span>
                        <p style="margin:0.3rem 0 0;font-size:1.2rem;font-weight:700;color:var(--gold-brass);">
                            ${(g.current || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
                        </p>
                    </div>
                    <div>
                        <span style="font-size:0.75rem;font-weight:700;color:var(--slate-light);text-transform:uppercase;">
                            Faltam
                        </span>
                        <p style="margin:0.3rem 0 0;font-size:1.2rem;font-weight:700;color:${remaining > 0 ? '#e63946' : '#2a9d8f'};">
                            ${remaining.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
                        </p>
                    </div>
                </div>
                
                <div style="margin-bottom:0.5rem;">
                    <div style="height:8px;background:rgba(0,0,0,0.1);border-radius:99px;overflow:hidden;">
                        <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,#2a9d8f,#e5c07b);
                                    transition:width 0.4s ease;"></div>
                    </div>
                </div>
                <p style="margin:0;font-size:0.75rem;color:var(--slate-light);text-align:center;">
                    ${progress.toFixed(0)}% atingido
                </p>
            </div>

            <div style="margin-bottom:1.2rem;">
                <label style="font-family:'Montserrat',sans-serif;font-size:0.75rem;font-weight:700;
                              color:var(--text-dark);display:block;margin-bottom:0.7rem;text-transform:uppercase;">
                    💰 Quanto deseja depositar?
                </label>
                <input id="deposit-amount" type="text" placeholder="R$ 0,00" 
                    style="width:100%;padding:12px 14px;border-radius:8px;border:2px solid var(--border-light);
                           font-family:'Montserrat',sans-serif;font-size:1.1rem;background:#f8fafc;color:var(--text-dark);
                           font-weight:600;transition:all 0.2s;"
                    onfocus="this.style.borderColor='var(--emerald-sea)';this.style.boxShadow='0 0 0 3px rgba(42,157,143,0.18)'"
                    onblur="this.style.borderColor='var(--border-light)';this.style.boxShadow=''">
                
                <div id="deposit-preview" style="margin-top:0.8rem;padding:0.8rem;border-radius:8px;
                    background:rgba(42,157,143,0.08);border:1px dashed var(--emerald-sea);display:none;">
                    <p style="margin:0;font-size:0.75rem;color:var(--slate-light);font-weight:600;">
                        📊 Novo Saldo da Meta
                    </p>
                    <p style="margin:0.4rem 0 0;font-size:1rem;font-weight:700;color:var(--emerald-sea);">
                        <span id="deposit-new-balance">R$ ${(g.current || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                    </p>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.6rem;margin-bottom:1.2rem;">
                ${percentButtons.map(pb => `
                    <button class="quick-deposit-btn" data-value="${pb.value}"
                        style="padding:10px;border-radius:8px;border:1.5px solid var(--emerald-sea);
                               background:transparent;color:var(--emerald-sea);
                               font-family:'Montserrat',sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer;
                               transition:all 0.2s;">
                        ${pb.label}
                    </button>
                `).join('')}
            </div>

            <div style="display:flex;gap:10px;">
                <button id="btn-deposit-confirm"
                    style="flex:1;padding:12px;border-radius:8px;border:none;
                           background:linear-gradient(135deg,#2a9d8f,#1f7d70);
                           color:#fff;font-family:'Montserrat',sans-serif;font-size:0.9rem;font-weight:700;cursor:pointer;
                           transition:all 0.2s;box-shadow:0 4px 15px rgba(42,157,143,0.3);">
                    ✅ Depositar
                </button>
                <button id="btn-deposit-cancel"
                    style="padding:12px 18px;border-radius:8px;border:1px solid var(--border-light);
                           background:transparent;color:var(--slate);font-family:'Montserrat',sans-serif;
                           font-size:0.9rem;font-weight:600;cursor:pointer;transition:all 0.2s;">
                    Cancelar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    _injectModalStyles();

    const depositInput = overlay.querySelector('#deposit-amount');
    const confirmBtn = overlay.querySelector('#btn-deposit-confirm');
    const previewEl = overlay.querySelector('#deposit-preview');
    const previewBalance = overlay.querySelector('#deposit-new-balance');
    let selectedBtn = null;

    // Função para aplicar máscara de moeda
    const applyMoneyMask = (value, el) => {
        let cleanValue = String(value).replace(/\D/g, '');
        if (!cleanValue) return { display: '', raw: 0 };
        
        const raw = parseInt(cleanValue) / 100;
        const parts = raw.toFixed(2).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        const display = `R$ ${parts.join(',')}`;
        
        el.value = display;
        return { display, raw };
    };

    // Função para extrair valor bruto do campo formatado
    const getRawValue = () => {
        const cleanStr = depositInput.value
            .replace(/[R$\s.]/g, '')
            .replace(',', '.');
        return parseFloat(cleanStr) || 0;
    };

    // Função para atualizar preview
    const updatePreview = () => {
        const rawAmount = getRawValue();
        if (rawAmount > 0) {
            const newBalance = g.current + rawAmount;
            previewEl.style.display = 'block';
            previewBalance.textContent = newBalance.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
        } else {
            previewEl.style.display = 'none';
        }
    };

    // Quick deposit buttons
    overlay.querySelectorAll('.quick-deposit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const value = parseFloat(btn.dataset.value);
            const valueStr = (value * 100).toString(); // Converte para centavos
            applyMoneyMask(valueStr, depositInput);
            
            // Resalta o botão selecionado
            overlay.querySelectorAll('.quick-deposit-btn').forEach(b => {
                b.style.background = 'transparent';
                b.style.boxShadow = '';
            });
            btn.style.background = 'rgba(42,157,143,0.25)';
            btn.style.boxShadow = '0 0 0 2px rgba(42,157,143,0.5)';
            selectedBtn = btn;
            
            updatePreview();
            depositInput.focus();
        });
    });

    // Máscara e preview ao digitar
    depositInput.addEventListener('input', (e) => {
        const result = applyMoneyMask(e.target.value, depositInput);
        
        if (selectedBtn && result.raw > 0) {
            overlay.querySelectorAll('.quick-deposit-btn').forEach(b => {
                b.style.background = 'transparent';
                b.style.boxShadow = '';
            });
            selectedBtn = null;
        }
        
        updatePreview();
    });

    // Confirm button
    confirmBtn.addEventListener('click', async () => {
        const amt = getRawValue();
        if (isNaN(amt) || amt <= 0) {
            _showMiniToast('Digite um valor válido', 'error');
            depositInput.focus();
            return;
        }
        
        g.current = (g.current || 0) + amt;
        goals[index] = g;
        overlay.remove();
        await saveGoals(goals);
        if (_dbSupabase && _dbUserId) await loadGoalsFromDB(_dbSupabase, _dbUserId);
        renderGoals();
        
        if (g.current >= g.target) {
            fireConfetti();
            _showMiniToast(`🏆 Meta "${g.name}" concluída! Parabéns!`, 'success');
        } else {
            _showMiniToast(`💰 Depositado ${amt.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})} na meta!`, 'success');
        }
    });

    // Suporte para Enter confirmar
    depositInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            confirmBtn.click();
        }
    });

    overlay.querySelector('#btn-deposit-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    depositInput.focus();
};

window._atlasDeleteGoal = async function(index) {
    if (!confirm('Excluir esta meta?')) return;
    const goals = getGoals();
    goals.splice(index, 1);
    await saveGoals(goals);
    if (_dbSupabase && _dbUserId) await loadGoalsFromDB(_dbSupabase, _dbUserId);
    renderGoals();
};

function _showMiniToast(msg, type = 'success') {
    // Usa o showToast global se disponível
    if (typeof window.showToast === 'function') {
        window.showToast(msg, type);
        return;
    }
    // Fallback
    const colors = { success: '#0a192f', error: '#e63946', info: '#2a9d8f' };
    const toast = document.createElement('div');
    toast.textContent = msg;
    Object.assign(toast.style, {
        position:'fixed', bottom:'2rem', left:'50%', transform:'translateX(-50%) translateY(20px)',
        background:colors[type]||colors.success, color:'#fff', padding:'10px 20px',
        borderRadius:'8px', fontSize:'0.85rem', fontFamily:"'Montserrat',sans-serif",
        fontWeight:'600', zIndex:'99999', opacity:'0',
        transition:'all 0.3s cubic-bezier(0.22,1,0.36,1)',
        border:'1px solid rgba(197,160,89,0.4)',
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }));
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

export function enhanceTableRows() {
    const style = document.createElement('style');
    style.id = 'atlas-row-enhancements';
    if (document.getElementById('atlas-row-enhancements')) return;
    style.textContent = `
        #transaction-list tr {
            transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
        }
        #transaction-list tr:hover {
            background: rgba(42,157,143,0.05) !important;
            transform: translateX(2px);
        }
        .type-income { color: #2a9d8f; font-weight: 700; }
        .type-expense { color: #e63946; font-weight: 700; }
        .badge-category {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 99px;
            background: rgba(197,160,89,0.12);
            color: #8a6d20;
            font-size: 0.73rem;
            font-weight: 600;
            letter-spacing: 0.3px;
        }
        .btn-mark-paid {
            background: linear-gradient(135deg, #2a9d8f, #21786c);
            color: white;
            border: none;
            padding: 5px 12px;
            border-radius: 6px;
            font-family: 'Montserrat', sans-serif;
            font-size: 0.72rem;
            font-weight: 700;
            cursor: pointer;
            transition: transform 0.15s, box-shadow 0.15s;
        }
        .btn-mark-paid:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(42,157,143,0.35);
        }
        .btn-delete {
            background: transparent;
            border: 1px solid rgba(230,57,70,0.3);
            color: #e63946;
            padding: 6px 10px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.15s;
            line-height: 0;
        }
        .btn-delete:hover {
            background: rgba(230,57,70,0.08);
            border-color: #e63946;
            transform: scale(1.05);
        }
        /* Linha destacada ao adicionar */
        @keyframes rowHighlight {
            0%   { background: rgba(197,160,89,0.2); }
            100% { background: transparent; }
        }
        .row-new td { animation: rowHighlight 1.4s ease forwards; }

        /* Insights animados */
        .insight-card {
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .insight-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 24px rgba(10,25,47,0.12);
        }
        /* Alerts container */
        .atlas-alert {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 10px;
            margin-bottom: 8px;
            font-family: 'Montserrat', sans-serif;
            font-size: 0.82rem;
            border: 1px solid;
            animation: slideInAlert 0.4s cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes slideInAlert {
            from { opacity:0; transform:translateY(-8px); }
            to   { opacity:1; transform:translateY(0); }
        }
        .alert-danger  { background:rgba(230,57,70,0.07);   border-color:rgba(230,57,70,0.3);  color:#c02030; }
        .alert-warning { background:rgba(197,160,89,0.08);  border-color:rgba(197,160,89,0.4); color:#8a6d20; }
        .alert-info    { background:rgba(42,157,143,0.07);  border-color:rgba(42,157,143,0.3); color:#1c6b62; }
        .alert-icon    { font-size:1.3rem; flex-shrink:0; }
        .alert-content { flex:1; }
        .alert-content strong { display:block; margin-bottom:2px; }

        /* Form section smoother */
        .form-section input:focus,
        .form-section select:focus {
            transform: translateY(-1px);
        }
    `;
    document.head.appendChild(style);
}

// ============================================================
//  11. MÁSCARA DE INPUT MONETÁRIO (BRL Currency Mask)
// ============================================================

export function initAmountMask() {
    const amountInput = document.getElementById('amount');
    if (!amountInput) return;

    // Altera para texto para suportar formatação visual sem travar o cursor
    amountInput.type = 'text';
    amountInput.placeholder = 'R$ 0,00';

    amountInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (!value) {
            e.target.value = '';
            return;
        }
        
        // Formata como moeda brasileira centavo por centavo
        value = (parseInt(value) / 100).toFixed(2);
        let parts = value.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        
        e.target.value = `R$ ${parts.join(',')}`;
    });
}

// Auxiliar para ler o valor limpo antes de enviar ao Supabase
export function getRawAmountValue() {
    const amountInput = document.getElementById('amount');
    if (!amountInput) return 0;

    const cleanStr = amountInput.value
        .replace(/[R$\s.]/g, '')
        .replace(',', '.');

    return parseFloat(cleanStr) || 0;
}

// ============================================================
//  12. UX MOBILE AVANÇADA (formulário no fluxo da página)
// ============================================================

export function initMobileUX() {
    if (document.getElementById('atlas-mobile-ux-styles')) return;

    const style = document.createElement('style');
    style.id = 'atlas-mobile-ux-styles';
    style.textContent = `
        @media (max-width: 768px) {
            body { padding-bottom: env(safe-area-inset-bottom); }
            .main-content { display: flex; flex-direction: column; gap: 1.15rem; }

            .form-section {
                position: relative !important;
                inset: auto !important;
                width: 100% !important;
                max-height: none !important;
                overflow: visible !important;
                transform: none !important;
                z-index: auto !important;
                margin: 0 !important;
            }

            input, select, textarea, button { min-height: 46px; font-size: 16px !important; }
        }
        .fab-add-route, .drawer-close-bar { display: none; }
    `;
    document.head.appendChild(style);

    document.querySelector('.drawer-close-bar')?.remove();
    document.querySelector('.fab-add-route')?.remove();
    document.querySelector('.form-section')?.classList.remove('mobile-open');
}

// ============================================================
//  13. SISTEMA DE ONBOARDING AVANÇADO (5 Passos Guiados)
// ============================================================

export function initOnboarding() {
    if (localStorage.getItem('atlas_onboarding_completed') === 'true') return;
    
    // Dispara automaticamente após a remoção do preloader original do sistema
    setTimeout(() => {
        startGuidedTour();
    }, 3800);
}

function startGuidedTour() {
    const steps = [
        {
            title: "🧭 Bem-vindo a Bordo!",
            text: "Este é o seu Atlas Finance. Uma plataforma de alta precisão para gerenciar suas rotas financeiras corporativas e pessoais com segurança criptográfica.",
            target: "header"
        },
        {
            title: "📈 Painel de Indicadores",
            text: "Aqui você tem o controle absoluto sobre suas Entradas, Saídas e o Saldo de Bordo líquido, incluindo previsões automáticas para lançamentos pendentes.",
            target: ".summary-cards"
        },
        {
            title: "⚓ Lance Novas Rotas",
            text: "Utilize este painel inteligente para registrar fluxos financeiros. No mobile, você pode abrir este formulário a qualquer momento usando o botão flutuante (+).",
            target: ".form-section"
        },
        {
            title: "🎯 Metas e Orçamentos Dinâmicos",
            text: "Defina tetos de gastos por categoria e objetivos de economia de longo prazo. O sistema emitirá alertas visuais caso você se aproxime dos limites configurados.",
            target: "#budget-panel"
        },
        {
            title: "📥 Inteligência de Dados",
            text: "Importe extratos de qualquer banco via arquivos CSV na barra superior e faça conciliações imediatas, além de exportar relatórios consolidados em PDF e Excel.",
            target: ".header-actions"
        }
    ];

    let currentStep = 0;

    function renderStep(index) {
        const existingOverlay = document.getElementById('atlas-onboarding-overlay');
        if (existingOverlay) existingOverlay.remove();

        if (index >= steps.length) {
            localStorage.setItem('atlas_onboarding_completed', 'true');
            fireConfetti();
            return;
        }

        const step = steps[index];
        const element = document.querySelector(step.target);
        
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        const overlay = document.createElement('div');
        overlay.id = 'atlas-onboarding-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(2, 10, 25, 0.55); z-index: 99999;
            display: flex; align-items: center; justify-content: center; backdrop-filter: blur(3px);
            animation: fadeInOverlay 0.3s ease; font-family: 'Montserrat', sans-serif;
        `;

        const box = document.createElement('div');
        box.style.cssText = `
            background: var(--glass-bg, #0d1b2e); border: 1px solid var(--glass-border, rgba(197,160,89,0.3));
            border-top: 4px solid #c5a059; border-radius: 16px; padding: 2rem; width: 90%; max-width: 420px;
            box-shadow: 0 24px 80px rgba(0,0,0,0.6); text-align: center; color: #e2e8f0; position: relative;
        `;

        // Destaque temporário do elemento focado
        const originalShadow = element ? element.style.boxShadow : '';
        const originalTransition = element ? element.style.transition : '';
        if (element) {
            element.style.transition = 'box-shadow 0.3s ease';
            element.style.boxShadow = '0 0 0 5px #c5a059, 0 12px 40px rgba(0,0,0,0.4)';
        }

        box.innerHTML = `
            <div style="font-size: 0.7rem; color: #c5a059; font-weight: 700; margin-bottom: 0.6rem; letter-spacing: 2px;">LOG DE BORDO: ${index + 1} / ${steps.length}</div>
            <h3 style="font-family: 'Cinzel', serif; font-size: 1.2rem; color: #c5a059; margin-bottom: 1rem;">${step.title}</h3>
            <p style="font-size: 0.85rem; line-height: 1.6; color: #94a3b8; margin-bottom: 1.8rem;">${step.text}</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                ${index > 0 ? `<button id="btn-onb-prev" style="padding: 8px 16px; border: 1px solid rgba(197,160,89,0.3); background: transparent; color: #94a3b8; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">Voltar</button>` : ''}
                <button id="btn-onb-next" style="padding: 8px 24px; border: none; background: linear-gradient(135deg, #c5a059, #b38f46); color: #0a192f; font-weight: 700; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                    ${index === steps.length - 1 ? 'Iniciar Viagem ⚓' : 'Próximo'}
                </button>
            </div>
            <button id="btn-onb-skip" style="position: absolute; top: 12px; right: 14px; background: transparent; border: none; color: rgba(255,255,255,0.25); cursor: pointer; font-size: 0.75rem;">Pular Tour ✕</button>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const resetElementStyle = () => {
            if (element) {
                element.style.boxShadow = originalShadow;
                element.style.transition = originalTransition;
            }
        };

        box.querySelector('#btn-onb-next').addEventListener('click', () => {
            resetElementStyle();
            renderStep(index + 1);
        });

        if (index > 0) {
            box.querySelector('#btn-onb-prev').addEventListener('click', () => {
                resetElementStyle();
                renderStep(index - 1);
            });
        }

        box.querySelector('#btn-onb-skip').addEventListener('click', () => {
            resetElementStyle();
            localStorage.setItem('atlas_onboarding_completed', 'true');
            overlay.remove();
        });
    }

    renderStep(currentStep);
}