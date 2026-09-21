<?php

/**
 * Codex+ — alvos de leitura do documento pela tela (bloco R3b2-a).
 *
 * Adiciona ou tira um leitor (grupo, perfil ou usuário) sem recarregar a
 * página: a coluna "Permissões" vale também para documento publicado, fora
 * do formulário de edição, e recarregar no meio de uma edição perderia o que
 * não foi salvo.
 *
 * Nenhuma regra nova aqui. Quem pode é decidido pelas classes de ligação
 * (trait TargetRelation: gerir o documento = Atualizar + gestor do setor, ou
 * Ver todos, em qualquer status — decisão de Claudio, 20/09/2026). Sem
 * entidade informada, perfil e grupo entram "sem restrição de entidade"
 * (TargetRelation::prepareInputForAdd, achado 34).
 *
 * CSRF: o núcleo valida sozinho e CONSOME o token (achado 43); a resposta
 * devolve um novo, que o JS espalha por todos os campos da página.
 */

use GlpiPlugin\Codexplus\Document;
use GlpiPlugin\Codexplus\Document_Group;
use GlpiPlugin\Codexplus\Document_Profile;
use GlpiPlugin\Codexplus\Document_User;
use Symfony\Component\HttpFoundation\JsonResponse;

include('../../../inc/includes.php');

// Achado 9: arquivo de plugin roda em escopo de função.
global $DB;

/** Tipo de alvo => [classe de ligação, chave do alvo]. */
$tipos = [
    'group'   => [Document_Group::class, 'groups_id'],
    'profile' => [Document_Profile::class, 'profiles_id'],
    'user'    => [Document_User::class, 'users_id'],
];

$responder = static function (array $corpo, int $status = 200): JsonResponse {
    $corpo['csrf'] = Session::getNewCSRFToken(true);
    return new JsonResponse($corpo, $status);
};

$id = (int) ($_POST['id'] ?? 0);
if (!Document::canView() || $id <= 0) {
    return $responder(['erro' => 'sem_acesso'], 403);
}
$doc = new Document();
if (!$doc->getFromDB($id) || (int) $doc->fields['knowbaseitems_id'] !== 0 || !$doc->can($id, READ)) {
    return $responder(['erro' => 'nao_encontrado'], 404);
}

$acao = (string) ($_POST['acao'] ?? '');
$tipo = (string) ($_POST['tipo'] ?? '');

if ($acao === 'add') {
    if (!isset($tipos[$tipo])) {
        return $responder(['erro' => 'tipo_invalido'], 422);
    }
    [$classe, $chave] = $tipos[$tipo];
    $alvo = (int) ($_POST['alvo'] ?? 0);
    if ($alvo <= 0) {
        return $responder(['erro' => 'escolha_o_alvo'], 422);
    }
    $linha = [$classe::$items_id_1 => $id, $chave => $alvo];
    $rel   = new $classe();
    if (!$rel->can(-1, CREATE, $linha)) {
        return $responder(['erro' => 'sem_permissao'], 403);
    }
    // A tabela não tem chave única (espelha a nativa, que admite o mesmo
    // perfil em entidades diferentes); pela tela, o mesmo alvo entra uma vez.
    if (countElementsInTable($classe::getTable(), $linha) > 0) {
        return $responder(['erro' => 'ja_existe'], 409);
    }
    if (!$rel->add($linha)) {
        return $responder(['erro' => 'nao_gravou'], 500);
    }
} elseif ($acao === 'del') {
    if (!isset($tipos[$tipo])) {
        return $responder(['erro' => 'tipo_invalido'], 422);
    }
    [$classe] = $tipos[$tipo];
    $rel = new $classe();
    $lig = (int) ($_POST['ligacao'] ?? 0);
    // A ligação tem que ser DESTE documento: id solto não apaga alvo de outro.
    if (
        $lig <= 0
        || !$rel->getFromDB($lig)
        || (int) $rel->fields[$classe::$items_id_1] !== $id
    ) {
        return $responder(['erro' => 'nao_encontrado'], 404);
    }
    if (!$rel->can($lig, PURGE)) {
        return $responder(['erro' => 'sem_permissao'], 403);
    }
    if (!$rel->delete(['id' => $lig], true)) {
        return $responder(['erro' => 'nao_gravou'], 500);
    }
} elseif ($acao !== 'list') {
    return $responder(['erro' => 'acao_invalida'], 422);
}

return $responder(['ok' => true, 'alvos' => Document::listTargets($id)]);
