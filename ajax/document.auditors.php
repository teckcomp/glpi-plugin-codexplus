<?php

/**
 * Codex+ — auditores disponíveis para as categorias escolhidas (R3b2-b).
 *
 * O auditor responsável é escolhido entre os auditores do SETOR, e o setor
 * vem das categorias. Na criação (e na edição, se as categorias mudarem) a
 * lista precisa acompanhar o que está marcado no formulário, antes de
 * salvar: o JS chama este endpoint a cada troca de categoria.
 *
 * Só lê. Quem pede tem que poder criar nessas categorias (a mesma regra de
 * Document::canCreateIn, que é a de quem escolhe o auditor); fora disso a
 * lista volta vazia. A escolha é conferida de novo ao gravar
 * (Document::checkManagedFields).
 *
 * POST, não GET: o núcleo valida o token (achado 15) e o consome (achado
 * 43); a resposta devolve um novo, que o JS espalha pela página.
 */

use GlpiPlugin\Codexplus\Document;
use GlpiPlugin\Codexplus\SectorMember;
use Symfony\Component\HttpFoundation\JsonResponse;

include('../../../inc/includes.php');

// Achado 9: arquivo de plugin roda em escopo de função.
global $DB;

$responder = static function (array $corpo, int $status = 200): JsonResponse {
    $corpo['csrf'] = Session::getNewCSRFToken(true);
    return new JsonResponse($corpo, $status);
};

if (!Document::canView()) {
    return $responder(['erro' => 'sem_acesso'], 403);
}

$cats = array_values(array_unique(array_filter(array_map('intval', (array) ($_POST['categories'] ?? [])))));
if ($cats === [] || !Document::canCreateIn($cats)) {
    return $responder(['ok' => true, 'auditores' => []]);
}

$auditores = [];
foreach (SectorMember::usersOfRole(Document::sectorsOfCategories($cats), SectorMember::ROLE_VALIDATOR) as $uid) {
    $auditores[] = ['id' => $uid, 'nome' => (string) getUserName($uid)];
}

return $responder(['ok' => true, 'auditores' => $auditores]);
