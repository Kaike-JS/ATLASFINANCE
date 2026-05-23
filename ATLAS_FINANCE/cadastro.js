// ============================================================
//  ATLAS FINANCE — cadastro.js
//  Registro de novo usuário via Supabase Auth
// ============================================================

const SUPABASE_URL = "https://agazyxktzrkoyrnxivab.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYXp5eGt0enJrb3lybnhpdmFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MDU1NzcsImV4cCI6MjA5NTA4MTU3N30.5MZnLVPPTP7VLelU8OX-0cxl6mYz6ck1RoxVH3mPumg";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Toast simples (sem dependência de style.js, pois este arquivo não usa módulos)
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        Object.assign(container.style, {
            position: 'fixed', bottom: '1.5rem', right: '1.5rem',
            zIndex: '9999', display: 'flex', flexDirection: 'column', gap: '0.5rem',
        });
        document.body.appendChild(container);
    }

    const colors = {
        success: '#0a192f',
        error:   '#e63946',
        info:    '#2a9d8f',
    };

    const icons = { success: '⚓', error: '🌊', info: '🧭' };

    const toast = document.createElement('div');
    toast.innerHTML = `<span>${icons[type]}</span> ${message}`;
    Object.assign(toast.style, {
        background: colors[type] || colors.success,
        color: '#fff',
        border: '1px solid #c5a059',
        borderRadius: '10px',
        padding: '0.85rem 1.25rem',
        fontSize: '0.85rem',
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: '600',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        maxWidth: '320px',
        opacity: '0', transform: 'translateX(20px)',
        transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)',
    });

    container.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }));

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// Efeito ripple nos botões
document.querySelectorAll('.btn-submit').forEach(btn => {
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.addEventListener('click', function (e) {
        const circle = document.createElement('span');
        const d = Math.max(btn.clientWidth, btn.clientHeight);
        const r = btn.getBoundingClientRect();
        Object.assign(circle.style, {
            width: `${d}px`, height: `${d}px`,
            left: `${e.clientX - r.left - d / 2}px`,
            top:  `${e.clientY - r.top  - d / 2}px`,
            position: 'absolute', borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            transform: 'scale(0)',
            animation: 'ripple 0.55s linear', pointerEvents: 'none',
        });
        btn.appendChild(circle);
        circle.addEventListener('animationend', () => circle.remove());
    });
});

const style = document.createElement('style');
style.textContent = `@keyframes ripple { to { transform: scale(3); opacity: 0; } }`;
document.head.appendChild(style);

// ── Cadastro ──
const cadastroForm = document.getElementById('cadastro-form');

cadastroForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const btn   = cadastroForm.querySelector('.btn-submit');
    const userRaw = document.getElementById('username').value.trim();
    const pass    = document.getElementById('password').value.trim();
    const email   = `${userRaw.toLowerCase()}@atlas.com`;

    btn.textContent = '⚓ Registrando...';
    btn.style.opacity = '0.7';
    btn.disabled = true;

    const { data, error } = await _supabase.auth.signUp({ email, password: pass });

    btn.textContent = 'Registrar na Frota';
    btn.style.opacity = '';
    btn.disabled = false;

    if (!error && data.user) {
        showToast('Tripulante registrado! Redirecionando...', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 1800);
    } else {
        showToast('Erro ao criar conta: ' + (error?.message || 'Tente novamente.'), 'error');
    }
});