<?php

/**
 * Codex+ — catálogo do mapa de calor para o quadro (Q8-4a, Claudio 05/10/2026).
 *
 * GET, só leitura: modelos de AP e perfis de aparelho (WifiCatalog::forBoard).
 * Quem pode ver documentos do Codex+ pode ler (o quadro abre no editor do
 * documento); cadastrar continua só na Configuração.
 */

use GlpiPlugin\Codexplus\Document;
use GlpiPlugin\Codexplus\WifiCatalog;
use Symfony\Component\HttpFoundation\JsonResponse;

include('../../../inc/includes.php');

if (!Document::canView()) {
    return new JsonResponse(['erro' => 'sem_acesso'], 403);
}

return new JsonResponse(WifiCatalog::forBoard());
