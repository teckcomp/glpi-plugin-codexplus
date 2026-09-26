<?php
/**
 * Codex+ — R4: migração dos documentos do modelo antigo (Base de
 * Conhecimento) para o modelo novo. Só Super-Admin. GET mostra a prévia;
 * POST migra os marcados. Regras em GlpiPlugin\Codexplus\LegacyMigration.
 */
use Glpi\Application\View\TemplateRenderer;
use GlpiPlugin\Codexplus\LegacyMigration;
use GlpiPlugin\Codexplus\Wiki;

include('../../../inc/includes.php');

/** @var array $CFG_GLPI */
global $DB, $CFG_GLPI; // achado 9

if (!LegacyMigration::canRun()) {
    Html::displayRightError();
}

$self = $CFG_GLPI['root_doc'] . '/plugins/codexplus/front/migrate.php';

if (isset($_POST['migrate'])) {
    $ids = array_values(array_filter(array_map('intval', (array) ($_POST['ids'] ?? []))));
    if ($ids === []) {
        Session::addMessageAfterRedirect(__('Marque ao menos um documento.', 'codexplus'), false, WARNING);
    }
    foreach ($ids as $docId) {
        $r = LegacyMigration::migrate($docId);
        Session::addMessageAfterRedirect(
            $r['code'] . ': ' . ($r['ok'] ? __('migrado.', 'codexplus') : __('não migrado.', 'codexplus'))
                . ($r['notes'] ? ' ' . implode(' ', $r['notes']) : ''),
            false,
            $r['ok'] ? ($r['notes'] ? WARNING : INFO) : ERROR
        );
    }
    Html::redirect($self);
}

Wiki::pageHeader();
TemplateRenderer::getInstance()->display('@codexplus/migrate.html.twig', [
    'rows'     => LegacyMigration::candidates(),
    'self'     => $self,
    'form_url' => $CFG_GLPI['root_doc'] . '/plugins/codexplus/front/document.form.php',
    'csrf'     => Session::getNewCSRFToken(),
]);
Wiki::pageFooter();
