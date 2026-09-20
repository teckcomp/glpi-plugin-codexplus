<?php

/**
 * Codex+ — Painel (Etapa 6b). Implementa a Parte 1.1 do documento de layout.
 */

use Glpi\Application\View\TemplateRenderer;
use GlpiPlugin\Codexplus\Dashboard;
use GlpiPlugin\Codexplus\Document;
use GlpiPlugin\Codexplus\Rights;
use GlpiPlugin\Codexplus\SectorMember;
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

// Etapa R3b1 — documentos do MODELO NOVO (em teste até a R5, quando a
// estante e o Painel passam a ler só dele). Lista curta, com a mesma
// visibilidade da R3c (Document::getVisibilityCriteria).
$newDocs = [];
if (Document::canView()) {
    $t   = Document::getTable();
    $vis = Document::getVisibilityCriteria();
    foreach ($DB->request([
        'SELECT'    => [$t . '.id', $t . '.name', $t . '.doctype', $t . '.sequence', $t . '.revision', $t . '.status', $t . '.date_mod'],
        'DISTINCT'  => true,
        'FROM'      => $t,
        'LEFT JOIN' => $vis['LEFT JOIN'],
        'WHERE'     => [$t . '.knowbaseitems_id' => 0, $t . '.is_deleted' => 0] + $vis['WHERE'],
        'ORDER'     => [$t . '.date_mod DESC'],
        'LIMIT'     => 10,
    ]) as $row) {
        $newDocs[] = [
            'id'     => (int) $row['id'],
            'name'   => $row['name'],
            'code'   => sprintf('%s%04d:%02d', $row['doctype'], $row['sequence'], $row['revision']),
            'status' => $row['status'],
            'status_label' => Document::getStatuses()[$row['status']] ?? $row['status'],
        ];
    }
}
$canCreateNew = Document::canCreate()
    && (Session::haveRight(Rights::NAME, Rights::VIEWALL) || SectorMember::mySectors(SectorMember::ROLE_MANAGER) !== []);

TemplateRenderer::getInstance()->display('@codexplus/dashboard.html.twig', [
    'glpi_root'  => $CFG_GLPI['root_doc'],
    'counters'   => Dashboard::getCounters($docs),
    'by_type'    => Dashboard::getByType($docs),
    'attention'  => Dashboard::getAttention($docs),
    'recent'     => Dashboard::getRecent($docs),
    'can_create' => KnowbaseItem::canCreate(),
    'new_docs'       => $newDocs,
    'can_create_new' => $canCreateNew,
]);

Html::footer();
