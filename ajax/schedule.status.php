<?php

/**
 * Codex+ — situação das tarefas do cronograma (bloco Q7b-4).
 *
 * Iniciar, Concluir e Reabrir tarefas no documento publicado, SEM abrir
 * revisão: grava em ScheduleStatus (não no diagrama). Só as tarefas da versão
 * que a leitura mostra (a publicada, também durante uma revisão).
 *
 * Quem pode: Document::canMarkSchedule() (responsável, revisor, autor e
 * Super-Admin; documento publicado ou em revisão).
 *
 * CSRF: o núcleo valida o POST sozinho e CONSOME o token (achado 43); a
 * resposta devolve um novo, que o motor distribui para a página.
 */

use GlpiPlugin\Codexplus\Document;
use GlpiPlugin\Codexplus\ScheduleStatus;
use Symfony\Component\HttpFoundation\JsonResponse;

include('../../../inc/includes.php');

$responder = static function (array $corpo, int $status = 200): JsonResponse {
    if (!isset($corpo['csrf'])) {
        $corpo['csrf'] = Session::getNewCSRFToken(true);
    }
    return new JsonResponse($corpo, $status);
};

$id = (int) ($_POST['id'] ?? 0);
if (!Document::canView() || $id <= 0) {
    return $responder(['erro' => 'sem_acesso'], 403);
}

$doc = new Document();
if (!$doc->getFromDB($id) || $doc->fields['doctype'] !== 'DIA' || !$doc->canViewItem()) {
    return $responder(['erro' => 'nao_encontrado'], 404);
}
if (!$doc->canMarkSchedule()) {
    return $responder(['erro' => 'sem_permissao'], 403);
}

$acao = (string) ($_POST['acao'] ?? '');
if (!in_array($acao, ScheduleStatus::ACTIONS, true)) {
    return $responder(['erro' => 'acao_invalida'], 422);
}

$data = '';
if ($acao === 'concluir') {
    $data = (string) ($_POST['data'] ?? '');
    if (!ScheduleStatus::validDate($data)) {
        return $responder(['erro' => 'data_invalida'], 422);
    }
}

$pedidas = json_decode((string) ($_POST['linhas'] ?? '[]'), true);
$validas = ScheduleStatus::taskKeys(ScheduleStatus::shownDiagram($doc));
$linhas  = is_array($pedidas)
    ? array_values(array_intersect(array_unique(array_map('strval', array_filter($pedidas, 'is_scalar'))), $validas))
    : [];
if ($linhas === []) {
    return $responder(['erro' => 'sem_tarefas'], 422);
}

$n = ScheduleStatus::apply($id, $linhas, $acao, $data, (int) Session::getLoginUserID());

return $responder([
    'ok'     => true,
    'n'      => $n,
    'status' => (object) ScheduleStatus::load($id),
    'hist'   => (object) ScheduleStatus::history($id), // Q7c-2
    'hora'   => date('H:i'),
]);
