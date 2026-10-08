<?php

/**
 * Codex+ — entrega da foto do organograma (PL-3a).
 *
 * ?doc=ID&t=TOKEN&s=t (miniatura) | s=f (ampliada). Só para quem lê o
 * documento (can READ: mesma regra da página, inclusive Leitura "Todos") e
 * só foto DESTE documento. Foto não muda depois de gravada (token novo a cada
 * troca), então o navegador pode guardar por muito tempo.
 *
 * Achado 10: arquivo que entrega binário devolve um Response do Symfony.
 */

use GlpiPlugin\Codexplus\Document;
use GlpiPlugin\Codexplus\OrgPhoto;
use Symfony\Component\HttpFoundation\Response;

include('../../../inc/includes.php');

$id    = (int) ($_GET['doc'] ?? 0);
$token = (string) ($_GET['t'] ?? '');
$doc   = new Document();
if (
    $id <= 0
    || !OrgPhoto::isToken($token)
    || !Document::canView()
    || !$doc->getFromDB($id)
    || !$doc->can($id, READ)
) {
    return new Response('', 404);
}
$bin = OrgPhoto::get($id, $token, ($_GET['s'] ?? 't') !== 'f');
if ($bin === null) {
    return new Response('', 404);
}
// A sessão do PHP já mandou "no-store" (session_cache_limiter): sem tirar,
// o navegador não guardaria a foto e baixaria de novo a cada desenho.
header_remove('Cache-Control');
header_remove('Pragma');
header_remove('Expires');
return new Response($bin, 200, [
    'Content-Type'           => 'image/jpeg',
    'Content-Length'         => (string) strlen($bin),
    'Cache-Control'          => 'private, max-age=31536000, immutable',
    'X-Content-Type-Options' => 'nosniff',
]);
