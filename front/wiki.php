<?php

/**
 * Codex+ — tela principal da wiki / Documentos (Etapa 0 → 2b).
 */

use Glpi\Application\View\TemplateRenderer;
use GlpiPlugin\Codexplus\DocumentMeta;
use GlpiPlugin\Codexplus\Wiki;

include('../../../inc/includes.php');

// GLPI 11: os arquivos de front/ são carregados por
// Glpi\Controller\LegacyFileLoadController::__invoke() via require() DENTRO
// de um método — ou seja, rodam em escopo de FUNÇÃO, não global. Sem declarar
// `global` aqui, $CFG_GLPI e $DB chegam como null.
global $CFG_GLPI;

Session::checkRight('plugin_codexplus_wiki', READ);

Html::header(
    Wiki::getMenuName(),
    $_SERVER['PHP_SELF'],
    'tools',
    Wiki::class
);

// Categoria selecionada (opcional)
$categoryId = isset($_GET['cat']) && ctype_digit((string) $_GET['cat'])
    ? (int) $_GET['cat']
    : null;

// Filtros da tela Documentos (Etapa 2b)
$doctype = isset($_GET['doctype']) && in_array($_GET['doctype'], DocumentMeta::DOCTYPE_KEYS, true)
    ? (string) $_GET['doctype']
    : '';
$status = isset($_GET['status']) && in_array($_GET['status'], DocumentMeta::STATUS_KEYS, true)
    ? (string) $_GET['status']
    : '';
$search = isset($_GET['q']) ? trim((string) $_GET['q']) : '';

$shelves      = Wiki::getShelves();
$documents    = Wiki::getDocuments([
    'category' => $categoryId,
    'doctype'  => $doctype,
    'status'   => $status,
    'q'        => $search,
]);
$categoryName = $categoryId !== null ? Wiki::getCategoryName($categoryId) : '';

// Plugin::getWebDir() está DEPRECIADO no GLPI 11 (gera aviso no log a cada
// carregamento). Os recursos do plugin agora vivem sempre em /plugins/<key>/.
TemplateRenderer::getInstance()->display('@codexplus/wiki.html.twig', [
    'glpi_root'      => $CFG_GLPI['root_doc'],
    'shelves'        => $shelves,
    'documents'      => $documents,
    'category_id'    => $categoryId,
    'category_name'  => $categoryName,
    'doctypes'       => DocumentMeta::getDoctypes(),
    'statuses'       => DocumentMeta::getStatuses(),
    'f_doctype'      => $doctype,
    'f_status'       => $status,
    'f_q'            => $search,
    'diag_total_kb'  => Wiki::countAllArticlesRaw(),
]);

Html::footer();
