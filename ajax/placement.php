<?php

/**
 * Codex+ — criar setor ou categoria pelo seletor do formulário (bloco SC1).
 *
 * Decisão de Claudio (27/09/2026): só o Super-Admin cria pelo "+" do
 * formulário; os outros escolhem da lista. Desde o PL-1 (08/10/2026) cria
 * também quem tem "Gerenciar modelos, setores e categorias"
 * (Rights::canCreatePlacement). A categoria nasce raiz, já no
 * setor escolhido. Nome repetido no mesmo lugar devolve o que já existe (não
 * cria duplicado). Renomear e excluir continuam em Configurar > Listas
 * suspensas > Codex+.
 *
 * CSRF: o núcleo valida e consome o token do POST; a resposta leva um novo
 * (mesmo padrão de ajax/icons.php).
 */

use GlpiPlugin\Codexplus\Category;
use GlpiPlugin\Codexplus\Document;
use GlpiPlugin\Codexplus\Rights;
use GlpiPlugin\Codexplus\Sector;
use Symfony\Component\HttpFoundation\JsonResponse;

include('../../../inc/includes.php');

// Achado 9: arquivo de plugin roda em escopo de função.
global $DB;

$responder = static function (array $corpo, int $status = 200): JsonResponse {
    return new JsonResponse($corpo, $status);
};

if (!Document::canView() || ($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    return $responder(['erro' => 'sem_acesso'], 403);
}

$csrf = Session::getNewCSRFToken(true);

if (!Rights::canCreatePlacement()) {
    return $responder(['erro' => __('Seu perfil não pode criar setor e categoria (falta "Gerenciar modelos, setores e categorias").', 'codexplus'), 'csrf' => $csrf], 403);
}

$nome = trim((string) ($_POST['name'] ?? ''));
if ($nome === '' || mb_strlen($nome) > 255) {
    return $responder(['erro' => __('Informe um nome (até 255 caracteres).', 'codexplus'), 'csrf' => $csrf], 422);
}
$entidade = (int) ($_SESSION['glpiactive_entity'] ?? 0);

// Mesmo nome (sem diferenciar maiúsculas) já visível: devolve o existente.
$existente = static function (string $tabela, array $onde) use ($DB, $nome): ?array {
    foreach ($DB->request([
        'SELECT' => ['id', 'name'],
        'FROM'   => $tabela,
        'WHERE'  => $onde + [getEntitiesRestrictCriteria($tabela, '', '', true)],
    ]) as $r) {
        if (mb_strtolower(trim((string) $r['name'])) === mb_strtolower($nome)) {
            return ['id' => (int) $r['id'], 'name' => (string) $r['name']];
        }
    }
    return null;
};

$acao = (string) ($_POST['action'] ?? '');

if ($acao === 'sector') {
    if (($ja = $existente(Sector::getTable(), [])) !== null) {
        return $responder(['ok' => true, 'item' => $ja, 'existing' => true, 'csrf' => $csrf]);
    }
    $setor = new Sector();
    $id    = $setor->add(['name' => $nome, 'entities_id' => $entidade, 'is_recursive' => 1]);
    if (!$id) {
        return $responder(['erro' => __('Não foi possível criar o setor.', 'codexplus'), 'csrf' => $csrf], 500);
    }
    return $responder(['ok' => true, 'item' => ['id' => (int) $id, 'name' => $nome], 'csrf' => $csrf]);
}

if ($acao === 'category') {
    $sid   = (int) ($_POST['sector'] ?? 0);
    $setor = new Sector();
    if ($sid <= 0 || !$setor->getFromDB($sid)) {
        return $responder(['erro' => __('Escolha o setor antes de criar a categoria.', 'codexplus'), 'csrf' => $csrf], 422);
    }
    $raiz = [Category::SECTOR_FIELD => $sid, Category::getForeignKeyField() => 0];
    if (($ja = $existente(Category::getTable(), $raiz)) !== null) {
        return $responder(['ok' => true, 'item' => $ja, 'existing' => true, 'csrf' => $csrf]);
    }
    $cat = new Category();
    $id  = $cat->add($raiz + ['name' => $nome, 'entities_id' => $entidade, 'is_recursive' => 1]);
    if (!$id) {
        return $responder(['erro' => __('Não foi possível criar a categoria.', 'codexplus'), 'csrf' => $csrf], 500);
    }
    $cat->getFromDB($id);
    return $responder(['ok' => true, 'item' => ['id' => (int) $id, 'name' => (string) ($cat->fields['completename'] ?? $nome)], 'csrf' => $csrf]);
}

return $responder(['erro' => 'acao_invalida', 'csrf' => $csrf], 400);
