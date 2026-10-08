<?php

/**
 * Codex+ — envio da foto de uma pessoa do organograma (PL-3a).
 *
 * Recebe as duas imagens já recortadas e reduzidas no navegador (JPEG em
 * base64: `thumb` 96 px e `image` 400 px) e devolve o token que o
 * organograma passa a guardar no nó. Mesma regra de quem grava o desenho
 * (ajax/diagram.save.php): documento DIA e can($id, UPDATE). A foto só
 * passa a valer no documento quando o organograma é salvo com o token.
 *
 * CSRF: o núcleo valida e consome o token; a resposta leva um novo (achado 43).
 */

use GlpiPlugin\Codexplus\Document;
use GlpiPlugin\Codexplus\OrgPhoto;
use Symfony\Component\HttpFoundation\JsonResponse;

include('../../../inc/includes.php');

$responder = static function (array $corpo, int $status = 200): JsonResponse {
    $corpo['csrf'] = Session::getNewCSRFToken(true);
    return new JsonResponse($corpo, $status);
};

$id = (int) ($_POST['id'] ?? 0);
if (!Document::canView() || $id <= 0 || ($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    return $responder(['erro' => 'sem_acesso'], 403);
}
$doc = new Document();
if (!$doc->getFromDB($id) || $doc->fields['doctype'] !== 'DIA') {
    return $responder(['erro' => 'nao_encontrado'], 404);
}
if (!$doc->can($id, UPDATE)) {
    return $responder(['erro' => 'sem_permissao'], 403);
}
$token = OrgPhoto::store($id, (string) ($_POST['thumb'] ?? ''), (string) ($_POST['image'] ?? ''), (int) Session::getLoginUserID());
if ($token === null) {
    return $responder(['erro' => 'imagem_invalida'], 422);
}
return $responder(['ok' => true, 'token' => $token]);
