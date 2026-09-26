<?php

/**
 * Codex+ — Painel (Etapa 6b). Implementa a Parte 1.1 do documento de layout.
 */

use Glpi\Application\View\TemplateRenderer;
use GlpiPlugin\Codexplus\Dashboard;
use GlpiPlugin\Codexplus\Document;
use GlpiPlugin\Codexplus\Rights;
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

// 0.6.6 (Claudio, 20/09/2026): o Painel lê o MODELO NOVO. O quadro
// provisório da R3b1 saiu; "Novo documento" cria direto no modelo novo.
$docs = Dashboard::loadAllNew();

$canCreate = Document::canCreate();

TemplateRenderer::getInstance()->display('@codexplus/dashboard.html.twig', [
    'counters'   => Dashboard::getCounters($docs),
    'by_type'    => Dashboard::getByType($docs),
    'attention'  => Dashboard::getAttention($docs),
    'recent'     => Dashboard::getRecent($docs, 8),
    // Etapa 9: os diagramas mais recentes, para o quadro "Diagramas".
    'diagrams'   => Dashboard::getRecent(array_filter($docs, static fn ($d) => $d['doctype'] === 'DIA'), 6),
    'can_create' => $canCreate,
    // R3d-1: o que espera por quem está logado (gestor ou auditor).
    'pending'    => Dashboard::pendingForMe(),
    'form_url'   => $CFG_GLPI['root_doc'] . '/plugins/codexplus/front/document.form.php',
]);

Html::footer();
