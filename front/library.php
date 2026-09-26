<?php
/**
 * Codex+ — Biblioteca (bloco B1): prateleira dos documentos publicados que a
 * pessoa lê, Setor → Categoria. Entrada de quem só lê; aba do Painel para
 * quem produz. Regras em Library/Dashboard/Document; aqui só a tela.
 */
use Glpi\Application\View\TemplateRenderer;
use GlpiPlugin\Codexplus\DocumentMeta;
use GlpiPlugin\Codexplus\Library;
use GlpiPlugin\Codexplus\Rights;
use GlpiPlugin\Codexplus\Wiki;

include('../../../inc/includes.php');

// Achado 9: escopo de função.
global $DB, $CFG_GLPI;

Session::checkRight(Rights::NAME, READ);

Wiki::pageHeader();

$shelf = Library::shelf();
TemplateRenderer::getInstance()->display('@codexplus/library.html.twig', [
    'shelf'     => $shelf,
    'doctypes'  => DocumentMeta::getDoctypes(),
    // Cliente só nos tipos que têm cliente (dado antigo em outro tipo fica fora).
    'client_types' => array_merge(DocumentMeta::CLIENT_TEXT_TYPES, DocumentMeta::CLIENT_LINK_TYPES),
    'producer'  => Rights::isProducer(),
    'can_templates' => Session::haveRight(Rights::NAME, Rights::TEMPLATES),
    'form_url'  => $CFG_GLPI['root_doc'] . '/plugins/codexplus/front/document.form.php',
]);

Wiki::pageFooter();
