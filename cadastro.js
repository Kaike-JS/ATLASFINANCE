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
            position: 'fixed', top: '50%', right: '1.5rem', transform: 'translateY(-50%)',
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

// Procure pelo evento de submit do formulário de CADASTRO
cadastroForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    // 1. Captura os três campos agora
    const nome  = document.getElementById('cadastro-nome').value.trim();
    const email = document.getElementById('cadastro-email').value.trim(); 
    const pass  = document.getElementById('password').value.trim();

    // Validações locais: email e senha
    const normalizeEmail = (em) => (String(em || '').trim().toLowerCase());

    const isValidEmailStrict = (em) => {
        if (typeof em !== 'string') return false;
        const email = em.trim();
        if (email.length > 254 || email.length === 0) return false;
        // Local-part: 1-64 chars, domain: labels separated by dot, tld 2-63 letters
        const re = /^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;
        if (!re.test(email)) return false;
        // domain labels cannot start or end with hyphen and no consecutive dots
        const domain = email.split('@')[1];
        if (!domain || domain.includes('..')) return false;
        const labels = domain.split('.');
        for (const lbl of labels) {
            if (!/^[a-zA-Z0-9-]+$/.test(lbl)) return false;
            if (lbl.startsWith('-') || lbl.endsWith('-')) return false;
        }
        return true;
    };

    const isStrongPassword = (pw) => {
        if (typeof pw !== 'string') return false;
        if (pw.length < 10) return false; // mínimo recomendado
        if (pw.length > 256) return false;
        if (/[\s]/.test(pw)) return false; // sem espaços
        // Ao menos uma maiúscula, uma minúscula, um dígito e um símbolo
        const hasUpper = /[A-Z]/.test(pw);
        const hasLower = /[a-z]/.test(pw);
        const hasDigit = /[0-9]/.test(pw);
        const hasSymbol = /[^A-Za-z0-9]/.test(pw);
        return hasUpper && hasLower && hasDigit && hasSymbol;
    };

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmailStrict(normalizedEmail)) {
        showToast('E-mail inválido. Use um formato como usuario@gmail.com', 'error');
        return;
    }

    if (!isStrongPassword(pass)) {
        showToast('Senha fraca. Use ao menos 10 caracteres, incluindo maiúsculas, minúsculas, números e símbolos.', 'error');
        return;
    }

    // 2. Envia para o Supabase com os metadados (options)
    const { data, error } = await _supabase.auth.signUp({ 
        email: normalizedEmail, 
        password: pass,
        options: {
            data: {
                full_name: nome // O Supabase salva isso automaticamente nos metadados do usuário
            }
        }
    });

    if (!error) {
        showToast('Inscrição realizada! Preparando diário de bordo...', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    } else {
        showToast('Erro ao criar conta: ' + error.message, 'error');
    }
});