<?php

/**
 * Codex+ — tela Modelos (Etapa 3a). Lista os modelos por tipo e edita/cria
 * um modelo. O CRUD em si é gravado por front/template.form.php.
 */

use Glpi\Application\View\TemplateRenderer;
use GlpiPlugin\Codexplus\DocumentMeta;
use GlpiPlugin\Codexplus\Rights;
use GlpiPlugin\Codexplus\Template;
use GlpiPlugin\Codexplus\Wiki;

include('../../../inc/includes.php');

// GLPI 11: front/ roda em escopo de FUNÇÃO (LegacyFileLoadController faz
// require() dentro de __invoke). Sem `global`, $DB é null e qualquer
// $DB->request() estoura "Call to a member function request() on null".
global $DB, $CFG_GLPI;

// M1 (Claudio, 26/09/2026): Modelos é de quem tem "Gerenciar modelos,
// setores e categorias" (antes: o direito nativo da Base de Conhecimento).
Session::checkRight(Rights::NAME, Rights::TEMPLATES);

Wiki::pageHeader();

$canEdit = true;
// Diagrama não tem modelo de texto (o subtipo faz esse papel).
$tplDoctypes = array_diff_key(DocumentMeta::getDoctypes(), ['DIA' => true]);

$id  = isset($_GET['id']) && ctype_digit((string) $_GET['id']) ? (int) $_GET['id'] : 0;
$new = isset($_GET['new']);

if (($id > 0 || $new) && $canEdit) {
    // ---- modo edição ----
    $tpl = new Template();
    if ($id > 0) {
        $tpl->getFromDB($id);
    } else {
        $tpl->getEmpty();
    }

    // Editor rico do GLPI (TinyMCE) sem upload de imagem — devolvido como
    // HTML para o Twig injetar com |raw.
    $editor = Html::textarea([
        'name'              => 'content',
        'value'             => $tpl->fields['content'] ?? '',
        'enable_richtext'   => true,
        'enable_images'     => false,
        'enable_fileupload' => false,
        'editor_id'         => 'codexplus_tpl_content',
        'rows'              => 18,
        'display'           => false,
    ]);

    TemplateRenderer::getInstance()->display('@codexplus/templates.html.twig', [
        'glpi_root'   => $CFG_GLPI['root_doc'],
        'mode'        => 'edit',
        'can_edit'    => $canEdit,
        'tpl'         => $tpl->fields,
        'is_new'      => $id === 0,
        'doctypes'    => $tplDoctypes,
        'editor_html' => $editor,
        'csrf'        => Session::getNewCSRFToken(),
    ]);
} else {
    // ---- modo lista ----
    $templates = [];
    foreach ($DB->request([
        'FROM'  => Template::getTable(),
        'ORDER' => ['doctype', 'name'],
    ]) as $row) {
        $templates[] = $row;
    }

    TemplateRenderer::getInstance()->display('@codexplus/templates.html.twig', [
        'glpi_root' => $CFG_GLPI['root_doc'],
        'mode'      => 'list',
        'can_edit'  => $canEdit,
        'templates' => $templates,
        'doctypes'  => DocumentMeta::getDoctypes(),
        'csrf'      => Session::getNewCSRFToken(),
    ]);
}

Wiki::pageFooter();
