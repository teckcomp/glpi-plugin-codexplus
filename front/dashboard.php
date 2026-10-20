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

// B1 (Claudio, 26/09/2026): quem só lê (e o Self-Service) não tem Painel:
// entra direto na Biblioteca.
if (!Rights::isProducer()) {
    Html::redirect($CFG_GLPI['root_doc'] . '/plugins/codexplus/front/library.php');
}

Wiki::pageHeader(); // S1: Self-Service usa o cabeçalho da interface simplificada

// 0.6.6 (Claudio, 20/09/2026): o Painel lê o MODELO NOVO. O quadro
// provisório da R3b1 saiu; "Novo documento" cria direto no modelo novo.
$docs = Dashboard::loadAllNew();

$canCreate = Document::canCreate();

$diagrams = Dashboard::getRecent(array_filter($docs, static fn ($d) => $d['doctype'] === 'DIA'), 6);
if ($diagrams !== []) {
    $kinds = [];
    foreach ($DB->request([
        'SELECT' => ['plugin_codexplus_documents_id', 'subtype'],
        'FROM'   => \GlpiPlugin\Codexplus\Diagram::getTable(),
        'WHERE'  => ['plugin_codexplus_documents_id' => array_map(static fn ($d) => (int) $d['id'], $diagrams)],
    ]) as $row) {
        $kinds[(int) $row['plugin_codexplus_documents_id']] = (string) $row['subtype'];
    }
    foreach ($diagrams as &$d) {
        $k = $kinds[(int) $d['id']] ?? '';
        $d['kind'] = in_array($k, ['fluxograma', 'cronograma', 'raci', 'organograma'], true) ? $k : 'organograma';
    }
    unset($d);
}

// UI-2: "Terça-feira, 20 de outubro" no idioma da sessão (intl é exigida pelo GLPI).
$contextDate = '';
try {
    $fmt = new IntlDateFormatter(
        str_replace('_', '-', (string) ($_SESSION['glpilanguage'] ?? 'pt_BR')),
        IntlDateFormatter::FULL,
        IntlDateFormatter::NONE,
        date_default_timezone_get(),
        IntlDateFormatter::GREGORIAN,
        "EEEE, d 'de' MMMM"
    );
    $contextDate = (string) $fmt->format(time());
    $contextDate = mb_strtoupper(mb_substr($contextDate, 0, 1)) . mb_substr($contextDate, 1);
} catch (\Throwable $e) {
    $contextDate = date('d/m/Y');
}

TemplateRenderer::getInstance()->display('@codexplus/dashboard.html.twig', [
    'counters'   => Dashboard::getCounters($docs),
    'by_type'    => Dashboard::getByType($docs),
    'attention'  => Dashboard::getAttention($docs),
    'recent'     => Dashboard::getRecent($docs, 8),
    // Etapa 9: os diagramas mais recentes, para o quadro "Diagramas".
    // UI-2: cada um leva o subtipo (coluna `subtype` da tabela de diagramas),
    // para a miniatura em traço do quadro; sem linha, organograma.
    'diagrams'   => $diagrams,
    'diagram_total' => count(array_filter($docs, static fn ($d) => $d['doctype'] === 'DIA')),
    // UI-2: linha de contexto sob a barra (data por extenso, total, entidade).
    'context'    => [
        'date'   => $contextDate,
        'total'  => count($docs),
        'entity' => (string) ($_SESSION['glpiactive_entity_name'] ?? ''),
    ],
    'can_create' => $canCreate,
    // R3d-1: o que espera por quem está logado (gestor ou auditor).
    'pending'    => Dashboard::pendingForMe(),
    'form_url'   => $CFG_GLPI['root_doc'] . '/plugins/codexplus/front/document.form.php',
    'reader_only' => Session::getCurrentInterface() === 'helpdesk',
    'can_templates' => Session::haveRight(Rights::NAME, Rights::TEMPLATES),
    'can_config'    => Session::haveRight('config', UPDATE),
    // R4: aviso ao Super-Admin enquanto houver documento no modelo antigo.
    'legacy_count'  => \GlpiPlugin\Codexplus\LegacyMigration::canRun()
        ? count(\GlpiPlugin\Codexplus\LegacyMigration::candidates()) : 0,
]);

Wiki::pageFooter();
