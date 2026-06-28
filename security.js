// ============================================================
//  ATLAS FINANCE — security.js
//  Camada de segurança do lado do cliente.
//
//  PROTEÇÕES IMPLEMENTADAS:
//  1. Rate Limiting — bloqueia tentativas de login excessivas
//  2. Lockout progressivo — tempo de espera cresce a cada falha
//  3. Detecção de SQL Injection — bloqueia padrões maliciosos
//  4. Detecção de XSS — sanitiza entradas antes de enviar
//  5. Sanitização geral de inputs — remove caracteres perigosos
//  6. Validação de e-mail rigorosa
//  7. CAPTCHA por tempo — delay mínimo obrigatório entre submissões
// ============================================================

// ── Constantes de Rate Limiting ──
const MAX_ATTEMPTS        = 5;      // Tentativas antes do bloqueio
const BASE_LOCKOUT_MS     = 30_000; // 30s de bloqueio inicial
const MAX_LOCKOUT_MS      = 15 * 60_000; // Máximo 15 minutos
const ATTEMPT_WINDOW_MS   = 10 * 60_000; // Janela de 10 min para contar tentativas
const MIN_SUBMIT_DELAY_MS = 800;    // Tempo mínimo entre submissões (anti-bot)

// ── Chaves no sessionStorage ──
const KEY_ATTEMPTS   = 'atlas_login_attempts';
const KEY_LOCKOUT    = 'atlas_login_lockout';
const KEY_LAST_FAIL  = 'atlas_last_fail_ts';
const KEY_LAST_SUB   = 'atlas_last_submit_ts';

// ============================================================
//  PADRÕES MALICIOSOS
// ============================================================

// Padrões de SQL Injection conhecidos
const SQL_INJECTION_PATTERNS = [
    /(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TRUNCATE|REPLACE)\s/i,
    /(-{2}|\/\*|\*\/)/,          // Comentários SQL: -- e /* */
    /(;|\bOR\b|\bAND\b)\s*['"\d]/i, // OR/AND com aspas ou números
    /'\s*(OR|AND)\s*'[^']*'=/i,  // ' OR 'x'='x
    /xp_\w+/i,                   // SQL Server stored procs
    /SLEEP\s*\(\d+\)/i,          // Time-based blind injection
    /BENCHMARK\s*\(/i,
    /LOAD_FILE\s*\(/i,
    /INTO\s+OUTFILE/i,
    /INFORMATION_SCHEMA/i,
    /CHAR\s*\(\d/i,              // CHAR() encoding trick
];

// Padrões de XSS
const XSS_PATTERNS = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript\s*:/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi,   // onclick=, onerror=, etc.
    /<\s*iframe/gi,
    /<\s*object/gi,
    /<\s*embed/gi,
    /expression\s*\(/gi,
    /vbscript\s*:/gi,
    /data\s*:\s*text\/html/gi,
];

// ============================================================
//  1. DETECÇÃO DE SQL INJECTION
// ============================================================

/**
 * Verifica se uma string contém padrões de SQL Injection.
 * @param {string} value
 * @returns {boolean} true se detectou ataque
 */
export function hasSQLInjection(value) {
    if (typeof value !== 'string') return false;
    return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Verifica se uma string contém padrões de XSS.
 * @param {string} value
 * @returns {boolean} true se detectou ataque
 */
export function hasXSS(value) {
    if (typeof value !== 'string') return false;
    return XSS_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Verifica todos os campos de um objeto em busca de payloads maliciosos.
 * @param {Object} fields — { nomeCampo: valorString }
 * @returns {{ safe: boolean, field: string|null, type: string|null }}
 */
export function scanFields(fields) {
    for (const [name, value] of Object.entries(fields)) {
        if (hasSQLInjection(String(value))) {
            return { safe: false, field: name, type: 'sql_injection' };
        }
        if (hasXSS(String(value))) {
            return { safe: false, field: name, type: 'xss' };
        }
    }
    return { safe: true, field: null, type: null };
}

// ============================================================
//  2. SANITIZAÇÃO DE INPUTS
// ============================================================

/**
 * Remove tags HTML e escapa caracteres especiais.
 * Uso: antes de exibir qualquer dado do usuário no DOM.
 * @param {string} str
 * @returns {string}
 */
export function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .trim();
}

/**
 * Limita tamanho e remove controles invisíveis que podem quebrar UI/logs.
 * Use antes de salvar qualquer texto livre.
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function normalizeUserText(str, maxLength = 140) {
    if (typeof str !== 'string') return '';
    return str
        .normalize('NFKC')
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

/**
 * Sanitiza um campo para uso seguro em texto puro (sem HTML).
 * Remove qualquer caractere não alfanumérico além dos permitidos.
 * @param {string} str
 * @param {string} [allowed=''] — regex de chars extras permitidos. Ex: '@._- '
 * @returns {string}
 */
export function sanitizeText(str, allowed = ' ') {
    if (typeof str !== 'string') return '';
    // Escapa metacaracteres de regex, mas NÃO escapa espaço (\s transformaria ' ' em '\ ', quebrando textos)
    const escapedAllowed = allowed.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&');
    const regex = new RegExp(`[^a-zA-Z0-9À-ÿ${escapedAllowed}]`, 'g');
    return normalizeUserText(str.replace(regex, ''), 180);
}

/**
 * Valida formato de e-mail de forma rigorosa.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
    if (typeof email !== 'string') return false;
    // RFC 5322 simplificado — rejeita formatos abusados em injection
    const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return re.test(email.trim()) && email.length <= 254;
}

/**
 * Valida que um valor numérico é um número finito positivo.
 * @param {any} value
 * @returns {boolean}
 */
export function isValidAmount(value) {
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num) && num > 0 && num <= 999_999;
}

/**
 * Valida que um valor está dentro de uma lista permitida (whitelist).
 * Evita que alguém injete valores arbitrários em campos SELECT.
 * @param {string} value
 * @param {string[]} allowed
 * @returns {boolean}
 */
export function isWhitelisted(value, allowed) {
    return allowed.includes(value);
}

export function isValidStatus(value) {
    return ['paid', 'pending'].includes(value);
}

export function isValidRecurrence(value) {
    return ['unique', 'fixed', 'installment'].includes(value);
}

export function isValidISODate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return false;
    return date.toISOString().slice(0, 10) === value;
}

export function isSafeRecordId(value) {
    if (typeof value !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
        || /^[0-9]+$/.test(value);
}

export function validateTransactionPayload(payload, allowedTypes, allowedCategories) {
    const errors = [];

    const desc = normalizeUserText(payload.desc, 90);
    const observation = normalizeUserText(payload.observation || '', 220);
    const amount = Number(payload.amount);

    if (!desc || desc.length < 2) errors.push('descrição');
    if (!isValidAmount(amount)) errors.push('valor');
    if (!isWhitelisted(payload.type, allowedTypes)) errors.push('tipo');
    if (!isWhitelisted(payload.category, allowedCategories)) errors.push('categoria');
    if (!isValidStatus(payload.status)) errors.push('status');
    if (!isValidRecurrence(payload.recurrence || 'unique')) errors.push('recorrência');
    if (payload.due_date && !isValidISODate(payload.due_date)) errors.push('data');

    const scan = scanFields({ desc, observation });
    if (!scan.safe) errors.push(scan.field);

    return {
        safe: errors.length === 0,
        errors,
        value: {
            ...payload,
            desc,
            observation,
            amount: Number(amount.toFixed(2)),
            recurrence: payload.recurrence || 'unique',
        },
    };
}

// ============================================================
//  3. RATE LIMITING — PROTEÇÃO CONTRA BRUTE FORCE
// ============================================================

/**
 * Retorna o estado atual das tentativas de login.
 * @returns {{ attempts: number, lockoutUntil: number, lastFail: number }}
 */
function _getLoginState() {
    return {
        attempts:    parseInt(sessionStorage.getItem(KEY_ATTEMPTS)  || '0', 10),
        lockoutUntil: parseInt(sessionStorage.getItem(KEY_LOCKOUT)   || '0', 10),
        lastFail:    parseInt(sessionStorage.getItem(KEY_LAST_FAIL)  || '0', 10),
    };
}

/**
 * Verifica se o login está atualmente bloqueado.
 * @returns {{ blocked: boolean, remainingMs: number, remainingFormatted: string }}
 */
export function checkLoginBlocked() {
    const { attempts, lockoutUntil, lastFail } = _getLoginState();

    // Reseta contador se a janela de tempo expirou sem bloqueio
    if (lastFail > 0 && (Date.now() - lastFail) > ATTEMPT_WINDOW_MS && lockoutUntil <= Date.now()) {
        _resetLoginAttempts();
        return { blocked: false, remainingMs: 0, remainingFormatted: '' };
    }

    if (lockoutUntil > Date.now()) {
        const remaining = lockoutUntil - Date.now();
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        const fmt  = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        return { blocked: true, remainingMs: remaining, remainingFormatted: fmt };
    }

    return { blocked: false, remainingMs: 0, remainingFormatted: '' };
}

/**
 * Registra uma tentativa de login fracassada.
 * Aplica lockout progressivo: 30s → 1min → 2min → ... → 15min.
 * @returns {{ locked: boolean, lockoutMs: number, attemptsLeft: number }}
 */
export function recordFailedAttempt() {
    const state = _getLoginState();
    const newAttempts = state.attempts + 1;

    sessionStorage.setItem(KEY_ATTEMPTS,  String(newAttempts));
    sessionStorage.setItem(KEY_LAST_FAIL, String(Date.now()));

    if (newAttempts >= MAX_ATTEMPTS) {
        // Lockout progressivo: dobra a cada bloqueio, limitado ao máximo
        const previousLockout = parseInt(sessionStorage.getItem('atlas_last_lockout_ms') || String(BASE_LOCKOUT_MS), 10);
        const lockoutMs = Math.min(previousLockout * (newAttempts - MAX_ATTEMPTS + 1), MAX_LOCKOUT_MS);

        sessionStorage.setItem(KEY_LOCKOUT, String(Date.now() + lockoutMs));
        sessionStorage.setItem('atlas_last_lockout_ms', String(lockoutMs));

        console.warn(`[Atlas Security] Login bloqueado por ${lockoutMs / 1000}s após ${newAttempts} tentativas.`);
        return { locked: true, lockoutMs, attemptsLeft: 0 };
    }

    const attemptsLeft = MAX_ATTEMPTS - newAttempts;
    console.warn(`[Atlas Security] Tentativa falha ${newAttempts}/${MAX_ATTEMPTS}. Restam ${attemptsLeft}.`);
    return { locked: false, lockoutMs: 0, attemptsLeft };
}

/**
 * Reseta o contador de tentativas após um login bem-sucedido.
 */
export function resetLoginAttempts() {
    _resetLoginAttempts();
}

function _resetLoginAttempts() {
    sessionStorage.removeItem(KEY_ATTEMPTS);
    sessionStorage.removeItem(KEY_LOCKOUT);
    sessionStorage.removeItem(KEY_LAST_FAIL);
    sessionStorage.removeItem('atlas_last_lockout_ms');
}

// ============================================================
//  4. CAPTCHA POR TEMPO — ANTI-BOT
// ============================================================

/**
 * Registra o timestamp da última submissão.
 * Deve ser chamado no início de cada tentativa de login.
 */
export function recordSubmitTimestamp() {
    sessionStorage.setItem(KEY_LAST_SUB, String(Date.now()));
}

/**
 * Verifica se passou tempo suficiente desde a última submissão.
 * Impede bots que submetem formulários em milissegundos.
 * @returns {boolean} true se pode submeter
 */
export function isSubmitAllowed() {
    const last = parseInt(sessionStorage.getItem(KEY_LAST_SUB) || '0', 10);
    return (Date.now() - last) >= MIN_SUBMIT_DELAY_MS;
}

// ============================================================
//  5. UI — FEEDBACK DE SEGURANÇA NO FORMULÁRIO DE LOGIN
// ============================================================

let _lockoutInterval = null;

/**
 * Exibe o estado de bloqueio na tela de login com contador regressivo.
 * @param {number} lockoutMs — duração do bloqueio em ms
 * @param {HTMLButtonElement} btnEl — botão de submit a desabilitar
 */
export function showLockoutFeedback(lockoutMs, btnEl) {
    if (btnEl) {
        btnEl.disabled = true;
        btnEl.style.opacity = '0.5';
        btnEl.style.cursor  = 'not-allowed';
    }

    // Container de aviso
    let alertEl = document.getElementById('security-lockout-alert');
    if (!alertEl) {
        alertEl = document.createElement('div');
        alertEl.id = 'security-lockout-alert';
        alertEl.style.cssText = `
            background: rgba(230, 57, 70, 0.08);
            border: 1px solid rgba(230, 57, 70, 0.4);
            border-radius: 10px;
            padding: 0.85rem 1.1rem;
            margin-bottom: 1rem;
            font-family: 'Montserrat', sans-serif;
            font-size: 0.8rem;
            font-weight: 600;
            color: #e63946;
            text-align: center;
            line-height: 1.5;
        `;

        // Insere antes do botão de submit
        const btn = document.querySelector('#login-form .btn-submit');
        if (btn) btn.parentNode.insertBefore(alertEl, btn);
    }

    // Contador regressivo
    if (_lockoutInterval) clearInterval(_lockoutInterval);

    const _tick = () => {
        const { blocked, remainingFormatted } = checkLoginBlocked();
        if (!blocked) {
            clearInterval(_lockoutInterval);
            alertEl.remove();
            if (btnEl) {
                btnEl.disabled = false;
                btnEl.style.opacity = '';
                btnEl.style.cursor  = '';
                btnEl.textContent   = 'Embarcar';
            }
            return;
        }
        alertEl.innerHTML = `
            🔒 Muitas tentativas incorretas.<br>
            Aguarde <strong>${remainingFormatted}</strong> para tentar novamente.
        `;
    };

    _tick();
    _lockoutInterval = setInterval(_tick, 1000);
}

/**
 * Exibe quantas tentativas restam antes do bloqueio.
 * @param {number} attemptsLeft
 */
export function showAttemptsWarning(attemptsLeft) {
    let el = document.getElementById('security-attempts-warning');
    if (!el) {
        el = document.createElement('div');
        el.id = 'security-attempts-warning';
        el.style.cssText = `
            background: rgba(197, 160, 89, 0.1);
            border: 1px solid rgba(197, 160, 89, 0.4);
            border-radius: 10px;
            padding: 0.7rem 1rem;
            margin-bottom: 1rem;
            font-family: 'Montserrat', sans-serif;
            font-size: 0.78rem;
            font-weight: 600;
            color: #b38f46;
            text-align: center;
        `;
        const btn = document.querySelector('#login-form .btn-submit');
        if (btn) btn.parentNode.insertBefore(el, btn);
    }
    el.innerHTML = `⚠️ Credenciais inválidas. Você tem mais <strong>${attemptsLeft} tentativa${attemptsLeft > 1 ? 's' : ''}</strong> antes do bloqueio.`;

    // Remove após 4s
    setTimeout(() => el?.remove(), 4000);
}

/**
 * Limpa todos os alertas de segurança da tela.
 */
export function clearSecurityAlerts() {
    document.getElementById('security-lockout-alert')?.remove();
    document.getElementById('security-attempts-warning')?.remove();
}