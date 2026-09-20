<?php

/**
 * Codex+ — gravação do diagrama sem recarregar a página (bloco 1b).
 *
 * Serve ao salvamento automático do rascunho e ao botão Salvar da tela cheia,
 * onde recarregar derrubaria a tela cheia (o navegador não deixa voltar a ela
 * sem um clique do usuário).
 *
 * Grava SÓ o diagrama. Título, categorias, responsável e o resto do documento
 * continuam sendo gravados pelo Salvar do formulário.
 *
 * As regras são as mesmas de front/document.form.php — `can($id, UPDATE)` já
 * exige rascunho mais editor ou gestor do setor. Nada é reimplementado aqui.
 *
 * CSRF: o núcleo valida o POST sozinho (nunca chamar Session::checkCSRF à mão)
 * e CONSOME o token ao validar (Session::validateCSRF, confirmado no fonte do
 * 11.0.6). Por isso a resposta devolve um token novo: sem isso, o segundo
 * salvamento da mesma página falharia.
 */

use GlpiPlugin\Codexplus\Diagram;
use GlpiPlugin\Codexplus\Document;
use GlpiPlugin\Codexplus\DocumentContributor;
use Symfony\Component\HttpFoundation\JsonResponse;

include('../../../inc/includes.php');

// Achado 9: arquivo de plugin roda em escopo de função.
global $DB;

$responder = static function (array $corpo, int $status = 200): JsonResponse {
    return new JsonResponse($corpo, $status);
};

$id = (int) ($_POST['id'] ?? 0);

if (!Document::canView() || $id <= 0) {
    return $responder(['erro' => 'sem_acesso'], 403);
}

$doc = new Document();
if (!$doc->getFromDB($id) || $doc->fields['doctype'] !== 'DIA') {
    return $responder(['erro' => 'nao_encontrado'], 404);
}

if (!$doc->can($id, UPDATE)) {
    return $responder(['erro' => 'sem_permissao'], 403);
}

$dados = Diagram::validate(json_decode((string) ($_POST['_diagram'] ?? ''), true));
if ($dados === null) {
    return $responder(['erro' => 'conteudo_invalido'], 422);
}

// Mudou o desenho: conta como alteração do documento (quem editou não valida)
// e atualiza a data — mesmo tratamento do Salvar do formulário.
if (Diagram::save($id, $dados)) {
    DocumentContributor::record($id, (int) $doc->fields['revision'], (int) Session::getLoginUserID());
    $DB->update(Document::getTable(), ['date_mod' => date('Y-m-d H:i:s')], ['id' => $id]);
}

return $responder([
    'ok'   => true,
    'csrf' => Session::getNewCSRFToken(true),
    'hora' => date('H:i'),
]);
