<?php
// ============================================================
//  ATLAS FINANCE — report.php
//  Backend de envio de relatório por e-mail.
//
//  PROTEÇÕES IMPLEMENTADAS:
//  1. CORS restrito — só aceita origem conhecida
//  2. Rate limiting por IP — máx. 10 requisições/hora
//  3. Validação estrita de todos os campos recebidos
//  4. Sanitização contra SQL Injection e XSS
//  5. Whitelist de valores permitidos (type, category)
//  6. Escape de saída HTML no corpo do e-mail
//  7. Limite de tamanho de payload (anti-flood)
// ============================================================

// ── 1. CORS RESTRITO ──────────────────────────────────────────
// Troque para o domínio real em produção.
// Em desenvolvimento com Live Server, use http://127.0.0.1:5500
$allowed_origins = [
    'http://localhost',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8000',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
} else {
    // Origem não permitida — rejeita silenciosamente
    http_response_code(403);
    exit;
}

header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json; charset=utf-8");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── 2. SOMENTE POST ───────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido.']);
    exit;
}

// ── 3. RATE LIMITING POR IP ──────────────────────────────────
// Armazena tentativas em arquivo temporário (sem banco).
// Em produção, use Redis ou Memcached para maior performance.
$ip         = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$ip_hash    = hash('sha256', $ip);           // Não armazena o IP real
$rate_file  = sys_get_temp_dir() . "/atlas_rl_{$ip_hash}.json";
$max_req    = 10;        // Máximo de requisições
$window_sec = 3600;      // Janela de 1 hora

$rate_data = ['count' => 0, 'window_start' => time()];
if (file_exists($rate_file)) {
    $raw = file_get_contents($rate_file);
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        $rate_data = $decoded;
    }
}

// Reseta a janela se expirou
if ((time() - $rate_data['window_start']) > $window_sec) {
    $rate_data = ['count' => 0, 'window_start' => time()];
}

$rate_data['count']++;
file_put_contents($rate_file, json_encode($rate_data), LOCK_EX);

if ($rate_data['count'] > $max_req) {
    $retry_after = $window_sec - (time() - $rate_data['window_start']);
    header("Retry-After: {$retry_after}");
    http_response_code(429);
    echo json_encode(['error' => 'Muitas requisições. Tente novamente mais tarde.']);
    exit;
}

// ── 4. LIMITE DE TAMANHO DO PAYLOAD (anti-flood/DoS) ─────────
$max_payload_bytes = 50_000; // 50 KB
$raw_input = file_get_contents('php://input', false, null, 0, $max_payload_bytes + 1);

if (strlen($raw_input) > $max_payload_bytes) {
    http_response_code(413);
    echo json_encode(['error' => 'Payload muito grande.']);
    exit;
}

// ── 5. PARSE DO JSON ──────────────────────────────────────────
$data = json_decode($raw_input, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'JSON inválido.']);
    exit;
}

// ── 6. VALIDAÇÃO E SANITIZAÇÃO DOS CAMPOS PRINCIPAIS ─────────

require 'vendor/autoload.php';

/**
 * Remove tags HTML, escapa entidades e limpa espaços.
 */
function safe_string(string $str, int $max_len = 255): string {
    $str = strip_tags($str);
    $str = htmlspecialchars($str, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $str = trim($str);
    return mb_substr($str, 0, $max_len);
}

/**
 * Verifica se uma string contém padrões típicos de SQL Injection.
 */
function has_sql_injection(string $str): bool {
    $patterns = [
        '/(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TRUNCATE)\s/i',
        '/(-{2}|\/\*|\*\/)/',
        '/\bOR\b\s*[\'"\d]/i',
        '/\bAND\b\s*[\'"\d]/i',
        '/SLEEP\s*\(\d+\)/i',
        '/BENCHMARK\s*\(/i',
        '/LOAD_FILE\s*\(/i',
        '/INTO\s+OUTFILE/i',
        '/INFORMATION_SCHEMA/i',
        '/xp_\w+/i',
    ];
    foreach ($patterns as $p) {
        if (preg_match($p, $str)) return true;
    }
    return false;
}

/**
 * Verifica se uma string contém padrões de XSS.
 */
function has_xss(string $str): bool {
    $patterns = [
        '/<script[\s\S]*?>/i',
        '/javascript\s*:/i',
        '/on\w+\s*=/i',
        '/<\s*(iframe|object|embed)/i',
        '/expression\s*\(/i',
        '/vbscript\s*:/i',
        '/data\s*:\s*text\/html/i',
    ];
    foreach ($patterns as $p) {
        if (preg_match($p, $str)) return true;
    }
    return false;
}

/**
 * Valida e-mail com filtro nativo do PHP.
 */
function is_valid_email(string $email): bool {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false && mb_strlen($email) <= 254;
}

// Whitelists dos campos de transação
$allowed_types      = ['income', 'expense'];
$allowed_categories = ['Alimentação', 'Transporte', 'Lazer', 'Contas', 'Salário', 'Outros'];

// ── Valida o e-mail do destinatário ──
$user_email = $data['email'] ?? '';
if (!is_string($user_email) || !is_valid_email($user_email)) {
    http_response_code(400);
    echo json_encode(['error' => 'E-mail inválido.']);
    exit;
}
if (has_sql_injection($user_email) || has_xss($user_email)) {
    http_response_code(400);
    echo json_encode(['error' => 'Entrada maliciosa detectada.']);
    exit;
}
$user_email = filter_var($user_email, FILTER_SANITIZE_EMAIL);

// ── Valida as transações ──
$transactions = $data['transactions'] ?? [];
if (!is_array($transactions) || empty($transactions)) {
    http_response_code(400);
    echo json_encode(['error' => 'Nenhuma transação recebida.']);
    exit;
}

// Limita o número de transações por requisição
if (count($transactions) > 500) {
    http_response_code(400);
    echo json_encode(['error' => 'Número de transações excede o limite.']);
    exit;
}

// ── 7. MONTA A TABELA HTML — com escape total de cada campo ──
$html_table_rows = '';
foreach ($transactions as $index => $t) {

    // Valida que cada transação é um array
    if (!is_array($t)) continue;

    // ── Valida e sanitiza desc ──
    $raw_desc = isset($t['desc']) ? (string)$t['desc'] : '';
    if (has_sql_injection($raw_desc) || has_xss($raw_desc)) continue;
    $desc = safe_string($raw_desc, 200);

    // ── Valida e sanitiza amount ──
    $raw_amount = $t['amount'] ?? 0;
    $amount = filter_var($raw_amount, FILTER_VALIDATE_FLOAT);
    if ($amount === false || $amount <= 0 || $amount > 999_999_999) continue;
    $amount_fmt = 'R$ ' . number_format($amount, 2, ',', '.');

    // ── Valida type via whitelist ──
    $type = (string)($t['type'] ?? '');
    if (!in_array($type, $allowed_types, true)) continue;
    $natureza = ($type === 'income') ? '⚓ Entrada' : '🌊 Saída';

    // ── Valida category via whitelist ──
    $category = (string)($t['category'] ?? '');
    if (!in_array($category, $allowed_categories, true)) $category = 'Outros';
    $category_safe = safe_string($category, 50);

    // ── Valida e sanitiza observation (campo opcional) ──
    $obs_html = '';
    if (!empty($t['observation'])) {
        $raw_obs = (string)$t['observation'];
        if (!has_sql_injection($raw_obs) && !has_xss($raw_obs)) {
            $obs_safe = safe_string($raw_obs, 500);
            $obs_html = "<br><small style='color:#666;font-size:11px;'>obs: {$obs_safe}</small>";
        }
    }

    $html_table_rows .= "
        <tr>
            <td style='padding:10px; border-bottom:1px solid #ddd; font-family:Arial,sans-serif;'>
                <strong>{$desc}</strong>{$obs_html}
            </td>
            <td style='padding:10px; border-bottom:1px solid #ddd; font-family:Arial,sans-serif;'>
                {$category_safe}
            </td>
            <td style='padding:10px; border-bottom:1px solid #ddd; font-family:Arial,sans-serif;'>
                {$natureza}
            </td>
            <td style='padding:10px; border-bottom:1px solid #ddd; font-family:Arial,sans-serif; font-weight:bold;'>
                {$amount_fmt}
            </td>
        </tr>";
}

if (empty(trim($html_table_rows))) {
    http_response_code(400);
    echo json_encode(['error' => 'Nenhuma transação válida para incluir no relatório.']);
    exit;
}

// ── 8. CORPO DO E-MAIL ────────────────────────────────────────
$email_body = "
    <div style='font-family:Arial,sans-serif; max-width:600px; margin:0 auto; border:1px solid #2a9d8f; padding:20px; border-radius:8px;'>
        <h2 style='color:#0a192f; border-bottom:2px solid #2a9d8f; padding-bottom:10px;'>
            ⚓ Atlas Finance — Seu Diário de Bordo
        </h2>
        <p>Olá, comandante!</p>
        <p>Aqui está o resumo financeiro das suas últimas rotas navegadas:</p>

        <table style='width:100%; border-collapse:collapse; margin-top:20px;'>
            <thead>
                <tr style='background-color:#2a9d8f; color:white;'>
                    <th style='padding:10px; text-align:left;'>Descrição</th>
                    <th style='padding:10px; text-align:left;'>Categoria</th>
                    <th style='padding:10px; text-align:left;'>Natureza</th>
                    <th style='padding:10px; text-align:left;'>Valor</th>
                </tr>
            </thead>
            <tbody>
                {$html_table_rows}
            </tbody>
        </table>

        <p style='margin-top:30px; font-size:12px; color:#777;'>
            Este é um relatório automatizado enviado por Atlas Finance.<br>
            Se você não solicitou este e-mail, ignore-o.
        </p>
    </div>
";

// ── 9. ENVIO VIA RESEND ───────────────────────────────────────
$apiKey = 're_HziHLvoy_FUFYgYQ4odSznbJNGHTwQELP';
$resend = Resend::client($apiKey);

try {
    $resend->emails->send([
        'from'    => 'onboarding@resend.dev',
        'to'      => $user_email,
        'subject' => '⚓ Seu Diário de Bordo — Atlas Finance',
        'html'    => $email_body,
    ]);

    echo json_encode(['success' => 'Relatório enviado com sucesso!']);
} catch (\Exception $e) {
    http_response_code(500);
    // Nunca expõe detalhes internos do erro para o cliente
    error_log('[Atlas Finance] Erro ao enviar e-mail: ' . $e->getMessage());
    echo json_encode(['error' => 'Falha ao enviar o e-mail. Tente novamente.']);
}
?>