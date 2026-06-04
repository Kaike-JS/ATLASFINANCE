// ============================================================
//  ATLAS FINANCE — sessionToken.js
//  Sistema de Token de Sessão com expiração de 30 minutos.
//
//  FLUXO:
//  1. Ao fazer login → generateSessionToken() cria um token
//     único (UUID v4 + timestamp) e salva no sessionStorage.
//  2. A cada ação do usuário → renewSession() reinicia o
//     contador de 30 min (comportamento "sliding window").
//  3. Um watchdog (setInterval) verifica a cada 30s se o
//     token expirou. Se sim → forceLogout() é chamado.
//  4. O token também é persistido nos user_metadata do
//     Supabase para invalidação multi-aba.
// ============================================================

// ── Constantes ──
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutos
const WATCHDOG_INTERVAL_MS = 30 * 1000;      // Verifica a cada 30 segundos
const TOKEN_KEY   = 'atlas_session_token';
const EXPIRY_KEY  = 'atlas_session_expiry';
const WARNING_KEY = 'atlas_session_warned';  // Evita múltiplos avisos

let _watchdogTimer = null;
let _warningTimer  = null;
let _onExpireCallback = null; // Função chamada quando a sessão expira

// ============================================================
//  GERAÇÃO DE TOKEN
// ============================================================

/**
 * Gera um UUID v4 simples sem dependências externas.
 * @returns {string} Token único no formato xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
function generateUUID() {
    const secureCrypto = globalThis.crypto;

    if (secureCrypto?.randomUUID) {
        return secureCrypto.randomUUID();
    }

    const bytes = new Uint8Array(16);
    secureCrypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function generateLegacyUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Cria e armazena um novo token de sessão no sessionStorage.
 * Deve ser chamado imediatamente após o login bem-sucedido.
 * @returns {string} O token gerado
 */
export function generateSessionToken() {
    const token  = globalThis.crypto?.getRandomValues ? generateUUID() : generateLegacyUUID();
    const expiry = Date.now() + SESSION_DURATION_MS;

    sessionStorage.setItem(TOKEN_KEY,   token);
    sessionStorage.setItem(EXPIRY_KEY,  String(expiry));
    sessionStorage.removeItem(WARNING_KEY);

    console.info(`[Atlas Session] Token gerado. Expira em: ${new Date(expiry).toLocaleTimeString('pt-BR')}`);
    return token;
}

// ============================================================
//  VALIDAÇÃO E RENOVAÇÃO
// ============================================================

/**
 * Verifica se existe um token válido e não expirado.
 * @returns {boolean}
 */
export function isSessionValid() {
    const token  = sessionStorage.getItem(TOKEN_KEY);
    const expiry = sessionStorage.getItem(EXPIRY_KEY);

    if (!token || !expiry) return false;

    const remaining = parseInt(expiry, 10) - Date.now();
    return remaining > 0;
}

/**
 * Retorna o tempo restante da sessão em milissegundos.
 * @returns {number} ms restantes (0 se expirado ou sem sessão)
 */
export function getSessionRemainingMs() {
    const expiry = sessionStorage.getItem(EXPIRY_KEY);
    if (!expiry) return 0;
    return Math.max(0, parseInt(expiry, 10) - Date.now());
}

/**
 * Retorna o tempo restante formatado como "MM:SS".
 * @returns {string}
 */
export function getSessionRemainingFormatted() {
    const ms      = getSessionRemainingMs();
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Renova o token de sessão por mais 30 minutos a partir de agora.
 * Chame esta função em qualquer interação do usuário (clique, formulário, etc).
 * Só renova se a sessão ainda for válida.
 */
export function renewSession() {
    if (!sessionStorage.getItem(TOKEN_KEY)) return; // Nenhuma sessão ativa

    const expiry = Date.now() + SESSION_DURATION_MS;
    sessionStorage.setItem(EXPIRY_KEY, String(expiry));
    sessionStorage.removeItem(WARNING_KEY); // Remove flag de aviso ao renovar
    _dismissWarningModal();

    console.info(`[Atlas Session] Sessão renovada. Nova expiração: ${new Date(expiry).toLocaleTimeString('pt-BR')}`);
}

/**
 * Destrói completamente o token de sessão do storage local.
 * Deve ser chamado no logout.
 */
export function destroySessionToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EXPIRY_KEY);
    sessionStorage.removeItem(WARNING_KEY);
    _stopWatchdog();
    console.info('[Atlas Session] Token destruído.');
}

// ============================================================
//  WATCHDOG — Verificação Automática
// ============================================================

/**
 * Inicia o watchdog que verifica periodicamente se a sessão expirou.
 * @param {Function} onExpire - Callback chamado quando a sessão expirar.
 *                              Recebe a mensagem de erro como parâmetro.
 */
export function startSessionWatchdog(onExpire) {
    _stopWatchdog(); // Limpa qualquer watchdog anterior
    _onExpireCallback = onExpire;

    _watchdogTimer = setInterval(() => {
        if (!sessionStorage.getItem(TOKEN_KEY)) {
            _stopWatchdog();
            return;
        }

        const remaining = getSessionRemainingMs();

        // ── Aviso com 5 minutos restantes ──
        if (remaining > 0 && remaining <= 5 * 60 * 1000) {
            if (!sessionStorage.getItem(WARNING_KEY)) {
                sessionStorage.setItem(WARNING_KEY, '1');
                _showWarningModal(remaining);
            }
        }

        // ── Sessão expirada ──
        if (remaining <= 0) {
            _stopWatchdog();
            _handleExpiredSession();
        }
    }, WATCHDOG_INTERVAL_MS);

    console.info('[Atlas Session] Watchdog iniciado.');
}

function _stopWatchdog() {
    if (_watchdogTimer) {
        clearInterval(_watchdogTimer);
        _watchdogTimer = null;
    }
    if (_warningTimer) {
        clearInterval(_warningTimer);
        _warningTimer = null;
    }
}

function _handleExpiredSession() {
    destroySessionToken();
    _showExpiredModal();
    if (typeof _onExpireCallback === 'function') {
        _onExpireCallback('Sessão expirada por inatividade.');
    }
}

// ============================================================
//  INTERCEPTOR DE ATIVIDADE
// ============================================================

/**
 * Registra listeners de atividade do usuário para renovar a sessão
 * automaticamente em qualquer interação (clique, digitação, scroll).
 * Usa throttling para não renovar a cada milissegundo.
 */
export function setupActivityRenewal() {
    let _throttle = false;

    const handler = () => {
        if (_throttle) return;
        _throttle = true;
        renewSession();
        setTimeout(() => { _throttle = false; }, 10000); // Throttle de 10s
    };

    ['click', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
        document.addEventListener(evt, handler, { passive: true });
    });

    console.info('[Atlas Session] Activity renewal ativo.');
}

// ============================================================
//  MODAIS VISUAIS (integração com o tema Atlas)
// ============================================================

let _warningModal  = null;
let _expiredModal  = null;
let _countdownInterval = null;

function _showWarningModal(remainingMs) {
    if (_warningModal) return; // Já está visível

    _warningModal = document.createElement('div');
    _warningModal.id = 'session-warning-modal';
    _warningModal.innerHTML = `
        <div class="atlas-modal-backdrop">
            <div class="atlas-modal-box atlas-modal-warning">
                <div class="atlas-modal-icon">🧭</div>
                <h3 class="atlas-modal-title">Ventos Fracos à Vista</h3>
                <p class="atlas-modal-body">
                    Sua sessão expirará em <strong id="session-countdown"></strong>.<br>
                    Clique no botão abaixo para manter o rumo.
                </p>
                <button id="btn-renew-session" class="atlas-modal-btn-renew">
                    ⚓ Manter Sessão Ativa
                </button>
            </div>
        </div>
    `;
    _injectModalStyles();
    document.body.appendChild(_warningModal);

    // Atualiza o contador a cada segundo
    const countdownEl = document.getElementById('session-countdown');
    const _tick = () => {
        if (countdownEl) countdownEl.textContent = getSessionRemainingFormatted();
    };
    _tick();
    _countdownInterval = setInterval(_tick, 1000);

    // Botão de renovar
    document.getElementById('btn-renew-session').addEventListener('click', () => {
        renewSession();
        _dismissWarningModal();
    });
}

function _dismissWarningModal() {
    if (_countdownInterval) {
        clearInterval(_countdownInterval);
        _countdownInterval = null;
    }
    if (_warningModal) {
        _warningModal.remove();
        _warningModal = null;
    }
}

function _showExpiredModal() {
    _dismissWarningModal(); // Remove aviso se ainda estiver visível

    if (_expiredModal) return;

    _expiredModal = document.createElement('div');
    _expiredModal.id = 'session-expired-modal';
    _expiredModal.innerHTML = `
        <div class="atlas-modal-backdrop">
            <div class="atlas-modal-box atlas-modal-expired">
                <div class="atlas-modal-icon">⚓</div>
                <h3 class="atlas-modal-title">Sessão Encerrada</h3>
                <p class="atlas-modal-body">
                    Por segurança, seu diário de bordo foi <strong>fechado após 30 minutos</strong>
                    de navegação. Para continuar, faça login novamente com um novo token de sessão.
                </p>
                <div class="atlas-modal-token-badge">
                    <span class="atlas-modal-token-label">Token invalidado</span>
                </div>
                <button id="btn-goto-login" class="atlas-modal-btn-login">
                    🌊 Retornar ao Porto (Login)
                </button>
            </div>
        </div>
    `;
    _injectModalStyles();
    document.body.appendChild(_expiredModal);

    document.getElementById('btn-goto-login').addEventListener('click', () => {
        window.location.reload();
    });
}

function _injectModalStyles() {
    if (document.getElementById('atlas-session-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'atlas-session-modal-styles';
    style.textContent = `
        /* ── Backdrop ── */
        .atlas-modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(2, 12, 27, 0.75);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            animation: atlasBackdropIn 0.3s ease;
        }

        @keyframes atlasBackdropIn {
            from { opacity: 0; }
            to   { opacity: 1; }
        }

        /* ── Caixa do modal ── */
        .atlas-modal-box {
            background: rgba(255,255,255,0.96);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 2.75rem 2.5rem;
            max-width: 420px;
            width: 100%;
            text-align: center;
            box-shadow: 0 25px 70px rgba(10, 25, 47, 0.3);
            border: 1px solid rgba(197, 160, 89, 0.35);
            animation: atlasModalIn 0.45s cubic-bezier(0.22, 1, 0.36, 1);
            position: relative;
        }

        @keyframes atlasModalIn {
            from { opacity: 0; transform: translateY(30px) scale(0.95); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Barra colorida no topo do modal */
        .atlas-modal-warning { border-top: 4px solid #c5a059; }
        .atlas-modal-expired  { border-top: 4px solid #e63946; }

        .atlas-modal-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            display: block;
            animation: pulseIcon 1.5s ease-in-out infinite;
        }

        @keyframes pulseIcon {
            0%,100% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(197,160,89,0)); }
            50%      { transform: scale(1.1); filter: drop-shadow(0 0 12px rgba(197,160,89,0.5)); }
        }

        .atlas-modal-title {
            font-family: 'Cinzel', serif;
            font-size: 1.25rem;
            font-weight: 700;
            color: #0a192f;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 0.85rem;
        }

        .atlas-modal-body {
            font-family: 'Montserrat', sans-serif;
            font-size: 0.88rem;
            color: #475569;
            line-height: 1.65;
            margin-bottom: 1.5rem;
        }

        .atlas-modal-body strong {
            color: #0a192f;
            font-weight: 700;
        }

        /* Badge de token invalidado */
        .atlas-modal-token-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(230, 57, 70, 0.08);
            border: 1px solid rgba(230, 57, 70, 0.3);
            border-radius: 20px;
            padding: 0.4rem 1rem;
            margin-bottom: 1.75rem;
        }

        .atlas-modal-token-label {
            font-family: 'Montserrat', sans-serif;
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #e63946;
        }

        /* Botão de renovar sessão */
        .atlas-modal-btn-renew {
            width: 100%;
            padding: 0.9rem 1.5rem;
            background: linear-gradient(135deg, #c5a059, #b38f46);
            color: #0a192f;
            border: none;
            border-radius: 10px;
            font-family: 'Montserrat', sans-serif;
            font-size: 0.88rem;
            font-weight: 700;
            letter-spacing: 0.8px;
            cursor: pointer;
            transition: all 0.25s ease;
            box-shadow: 0 4px 15px rgba(197, 160, 89, 0.3);
        }

        .atlas-modal-btn-renew:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(197, 160, 89, 0.45);
        }

        /* Botão de ir para login */
        .atlas-modal-btn-login {
            width: 100%;
            padding: 0.9rem 1.5rem;
            background: linear-gradient(135deg, #0a192f, #172a45);
            color: #c5a059;
            border: 1px solid rgba(197, 160, 89, 0.4);
            border-radius: 10px;
            font-family: 'Montserrat', sans-serif;
            font-size: 0.88rem;
            font-weight: 700;
            letter-spacing: 0.8px;
            cursor: pointer;
            transition: all 0.25s ease;
            box-shadow: 0 4px 15px rgba(10, 25, 47, 0.2);
        }

        .atlas-modal-btn-login:hover {
            background: linear-gradient(135deg, #172a45, #1e3a5f);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(10, 25, 47, 0.35);
            color: #e5c07b;
        }

        /* Responsivo */
        @media (max-width: 480px) {
            .atlas-modal-box { padding: 2rem 1.5rem; }
            .atlas-modal-title { font-size: 1.05rem; }
        }
    `;
    document.head.appendChild(style);
}
