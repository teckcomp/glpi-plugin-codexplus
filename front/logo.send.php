<?php

/**
 * Codex+ — entrega o logo configurado (Etapa 4a).
 *
 * POR QUE ISTO EXISTE: o logo mora em GLPI_VAR_DIR/_plugins/codexplus/, fora
 * da raiz web. O roteador do GLPI 11 só serve estáticos de
 * plugins/<nome>/public/ — e ali o logo seria apagado a cada `unzip -o` de
 * um deploy novo. Então o arquivo é entregue por PHP.
 *
 * POR QUE `return` E NÃO `readfile()` + `exit`: no GLPI 11 os front/*.php
 * rodam dentro de LegacyFileLoadController::__invoke(), que faz
 * `$response = require($arquivo)` cercado por um ob_start(). Se o script
 * devolve um Response do Symfony, ele é usado como está; se em vez disso
 * mexer no buffer de saída, o GLPI dispara E_USER_WARNING
 * ("Unexpected output detected") e cai num modo de compatibilidade.
 * Toolbox::getFileAsResponse() é o mesmo helper usado por
 * front/document.send.php do núcleo — traz ETag, 304 e cabeçalhos prontos.
 *
 * SEGURANÇA: nenhum parâmetro da requisição escolhe QUAL arquivo é lido. O
 * caminho vem só da configuração gravada, e Branding aplica basename() nele.
 * O `?v=` da URL é ignorado aqui: serve apenas para furar o cache do
 * navegador quando o logo é trocado.
 */

use Glpi\Exception\Http\NotFoundHttpException;
use GlpiPlugin\Codexplus\Branding;

include('../../../inc/includes.php');

// Quem pode ler documentos do Codex+ pode ver o logo — é a marca que sai no
// cabeçalho desses mesmos documentos.
Session::checkRight('plugin_codexplus_wiki', READ);

$path = Branding::getLogoPath();

if ($path === null) {
    throw new NotFoundHttpException();
}

return Toolbox::getFileAsResponse(
    $path,
    'logo.' . pathinfo($path, PATHINFO_EXTENSION),
    Branding::getLogoMime(),
    true // cabeçalhos de expiração: o ?v=filemtime já invalida na troca
);
