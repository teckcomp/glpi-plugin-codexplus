<?php

/**
 * Codex+ — "Novo documento" (Etapa 3b): escolhe tipo + modelo + título.
 * A criação em si é feita por front/newdocument.form.php.
 */

use Glpi\Application\View\TemplateRenderer;
use GlpiPlugin\Codexplus\DocumentMeta;
use GlpiPlugin\Codexplus\Template;
use GlpiPlugin\Codexplus\Wiki;

include('../../../inc/includes.php');

// GLPI 11: front/ roda em escopo de FUNÇÃO (LegacyFileLoadController faz
// require() dentro de __invoke). Sem `global`, $DB e $CFG_GLPI são null.
global $DB, $CFG_GLPI;

Session::checkRight('plugin_codexplus_wiki', READ);

// Criar documento = criar artigo nativo: exige o direito nativo de criação.
if (!KnowbaseItem::canCreate()) {
    Html::displayRightError();
}

Html::header(
    Wiki::getMenuName(),
    $_SERVER['PHP_SELF'],
    'tools',
    Wiki::class
);

// Tipo pré-selecionado (vem dos atalhos "criar a partir de modelo").
$preset = isset($_GET['doctype']) && in_array($_GET['doctype'], DocumentMeta::DOCTYPE_KEYS, true)
    ? (string) $_GET['doctype']
    : '';

$templates = [];
foreach ($DB->request([
    'FROM'  => Template::getTable(),
    'ORDER' => ['doctype', 'name'],
]) as $row) {
    $templates[] = [
        'id'         => (int) $row['id'],
        'name'       => (string) $row['name'],
        'doctype'    => (string) $row['doctype'],
        'is_default' => (bool) $row['is_default'],
    ];
}

TemplateRenderer::getInstance()->display('@codexplus/newdocument.html.twig', [
    'glpi_root' => $CFG_GLPI['root_doc'],
    'doctypes'  => DocumentMeta::getDoctypes(),
    'templates' => $templates,
    'preset'    => $preset,
    'csrf'      => Session::getNewCSRFToken(),
]);

Html::footer();
