<?php

/**
 * Codex+ — Painel (Etapa 6b). Implementa a Parte 1.1 do documento de layout.
 */

use Glpi\Application\View\TemplateRenderer;
use GlpiPlugin\Codexplus\Dashboard;
use GlpiPlugin\Codexplus\Wiki;

include('../../../inc/includes.php');

// GLPI 11: front/ roda em escopo de FUNÇÃO (LegacyFileLoadController faz
// require() dentro de __invoke). Sem `global`, $DB e $CFG_GLPI são null.
global $DB, $CFG_GLPI;

Session::checkRight('plugin_codexplus_wiki', READ);

Html::header(
    Wiki::getMenuName(),
    $_SERVER['PHP_SELF'],
    'tools',
    Wiki::class
);

$docs = Dashboard::loadAll();

TemplateRenderer::getInstance()->display('@codexplus/dashboard.html.twig', [
    'glpi_root'  => $CFG_GLPI['root_doc'],
    'counters'   => Dashboard::getCounters($docs),
    'by_type'    => Dashboard::getByType($docs),
    'attention'  => Dashboard::getAttention($docs),
    'recent'     => Dashboard::getRecent($docs),
    'can_create' => KnowbaseItem::canCreate(),
]);

Html::footer();
