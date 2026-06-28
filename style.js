/* ============================================================
   ATLAS FINANCE — Style.js
   Responsável por: animações de entrada, feedback visual,
   efeitos de UI e quaisquer estilos aplicados via JavaScript.
   NÃO contém lógica de negócio ou acesso ao banco de dados.
   ============================================================ */

/* ── 1. Animação staggered nos cards de resumo ── */
export function animateSummaryCards() {
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `opacity 0.45s ease ${i * 0.1}s, transform 0.45s ease ${i * 0.1}s`;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            });
        });
    });
}

/* ── 2. Animação de entrada das sections do dashboard ── */
export function animateDashboardSections() {
    const sections = document.querySelectorAll('#app-view section, #app-view .summary-cards');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('section-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    const style = document.createElement('style');
    style.textContent = `
        .section-animate {
            opacity: 0;
            transform: translateY(18px);
            transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .section-visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);

    sections.forEach(s => {
        s.classList.add('section-animate');
        observer.observe(s);
    });
}

/* ── 3. Highlight de linha nova na tabela ── */
export function highlightNewRow() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes rowFlash {
            0%   { background: rgba(197,160,89,0.18); }
            100% { background: transparent; }
        }
        .row-new td { animation: rowFlash 1.4s ease forwards; }
    `;
    document.head.appendChild(style);

    const tbody = document.getElementById('transaction-list');
    if (!tbody) return;

    const observer = new MutationObserver(() => {
        const firstRow = tbody.querySelector('tr:first-child');
        if (firstRow && !firstRow.classList.contains('row-new')) {
            firstRow.classList.add('row-new');
            setTimeout(() => firstRow.classList.remove('row-new'), 1500);
        }
    });
    observer.observe(tbody, { childList: true });
}

/* ── 4. Feedback visual no botão ao submeter formulário ── */
export function setupButtonFeedback(formId, buttonText = 'Lançar no Diário') {
    const form = document.getElementById(formId);
    if (!form) return;

    const btn = form.querySelector('.btn-submit');
    if (!btn) return;

    form.addEventListener('submit', () => {
        btn.textContent = '⚓ Registrando...';
        btn.style.opacity = '0.7';
        btn.style.pointerEvents = 'none';

        // Restaura após breve espera (a lógica real do script.js controla o fluxo)
        setTimeout(() => {
            btn.textContent = buttonText;
            btn.style.opacity = '';
            btn.style.pointerEvents = '';
        }, 1800);
    });
}

/* ── 5. Contador animado nos valores dos cards ── */
export function animateCounters() {
    const targets = [
        document.getElementById('total-income'),
        document.getElementById('total-expense'),
        document.getElementById('total-balance'),
    ];

    targets.forEach(el => {
        if (!el) return;

        const raw = el.dataset.rawValue;
        if (!raw) return;

        const target = parseFloat(raw);
        const duration = 700;
        const start = performance.now();

        const tick = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const current = target * ease;

            el.textContent = current.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });

            if (progress < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    });
}

/* ── 6. Aplica raw-value nos displays para o contador usar ── */
export function setRawValues(income, expense, balance) {
    const map = {
        'total-income':  income,
        'total-expense': expense,
        'total-balance': balance,
    };
    Object.entries(map).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.dataset.rawValue = val;
    });
}

/* ── 7. Efeito ripple no botão submit ── */
export function setupRipple() {
    document.querySelectorAll('.btn-submit').forEach(btn => {
        btn.addEventListener('click', function (e) {
            const circle = document.createElement('span');
            const diameter = Math.max(btn.clientWidth, btn.clientHeight);
            const radius = diameter / 2;
            const rect = btn.getBoundingClientRect();

            Object.assign(circle.style, {
                width:    `${diameter}px`,
                height:   `${diameter}px`,
                left:     `${e.clientX - rect.left - radius}px`,
                top:      `${e.clientY - rect.top  - radius}px`,
                position: 'absolute',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                transform: 'scale(0)',
                animation: 'ripple 0.55s linear',
                pointerEvents: 'none',
            });

            btn.style.position = 'relative';
            btn.style.overflow = 'hidden';
            btn.appendChild(circle);
            circle.addEventListener('animationend', () => circle.remove());
        });
    });

    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to { transform: scale(3); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

/* ── 8. Toast de notificação (substitui alert nativo) ── */
let _toastContainer = null;

export function showToast(message, type = 'success') {
    // Reutiliza container existente no DOM (ex: criado pelo cadastro.js) ou cria um novo
    if (!_toastContainer) {
        _toastContainer = document.getElementById('toast-container');
    }
    if (!_toastContainer) {
        _toastContainer = document.createElement('div');
        _toastContainer.id = 'toast-container';
        document.body.appendChild(_toastContainer);
    }
    // Garante posição lateral mesmo que o container tenha sido criado por outro módulo
    Object.assign(_toastContainer.style, {
        position:      'fixed',
        top:           '50%',
        right:         '1.5rem',
        bottom:        '',
        transform:     'translateY(-50%)',
        zIndex:        '9999',
        display:       'flex',
        flexDirection: 'column',
        gap:           '0.5rem',
        maxHeight:     '90vh',
        overflowY:     'auto',
    });

    const colors = {
        success: { bg: '#0a192f', border: '#c5a059', icon: '⚓' },
        error:   { bg: '#e63946', border: '#c5a059', icon: '🌊' },
        info:    { bg: '#2a9d8f', border: '#c5a059', icon: '🧭' },
    };

    const c = colors[type] || colors.success;

    const toast = document.createElement('div');
    toast.innerHTML = `<span style="font-size:1rem">${c.icon}</span> ${message}`;
    Object.assign(toast.style, {
        background:   c.bg,
        color:        '#fff',
        border:       `1px solid ${c.border}`,
        borderRadius: '10px',
        padding:      '0.85rem 1.25rem',
        fontSize:     '0.85rem',
        fontFamily:   "'Montserrat', sans-serif",
        fontWeight:   '600',
        letterSpacing:'0.3px',
        boxShadow:    '0 8px 24px rgba(0,0,0,0.25)',
        display:      'flex',
        alignItems:   'center',
        gap:          '0.6rem',
        maxWidth:     '320px',
        opacity:      '0',
        transform:    'translateX(20px)',
        transition:   'all 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
    });

    _toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}