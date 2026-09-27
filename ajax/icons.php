<?php

/**
 * Codex+ — ícones criados na instalação (bloco Q4a).
 *
 * GET  -> { icons: [...], can_create: bool }   (quem pode ver documentos)
 * POST action=add -> { ok, icon, csrf }         (só o Super-Admin)
 *
 * CSRF: o núcleo valida o POST sozinho e CONSOME o token (achado do
 * diagram.save.php); toda resposta de POST devolve um token novo, inclusive
 * a de erro, senão o próximo POST da página falharia.
 */

use GlpiPlugin\Codexplus\Document;
use GlpiPlugin\Codexplus\IconLibrary;
use GlpiPlugin\Codexplus\Rights;
use Symfony\Component\HttpFoundation\JsonResponse;

include('../../../inc/includes.php');

// Achado 9: arquivo de plugin roda em escopo de função.
global $DB;

$responder = static function (array $corpo, int $status = 200): JsonResponse {
    return new JsonResponse($corpo, $status);
};

if (!Document::canView()) {
    return $responder(['erro' => 'sem_acesso'], 403);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    return $responder([
        'icons'      => IconLibrary::all(),
        'can_create' => Rights::isSuperAdmin(),
    ]);
}

$csrf = Session::getNewCSRFToken(true);

if (!Rights::isSuperAdmin()) {
    return $responder(['erro' => __('Só o Super-Admin cria ícones.', 'codexplus'), 'csrf' => $csrf], 403);
}

if (($_POST['action'] ?? '') === 'add') {
    [$icon, $erro] = IconLibrary::add($_POST, (int) Session::getLoginUserID());
    if ($icon === null) {
        return $responder(['erro' => $erro, 'csrf' => $csrf], 422);
    }
    return $responder(['ok' => true, 'icon' => $icon, 'csrf' => $csrf]);
}

return $responder(['erro' => 'acao_invalida', 'csrf' => $csrf], 400);
