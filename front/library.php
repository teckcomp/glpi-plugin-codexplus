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

$producer = Rights::isProducer();
$self     = $CFG_GLPI['root_doc'] . '/plugins/codexplus/front/library.php';

// R5: restaurar da lixeira (quem pode excluir o documento pode restaurar).
if ($producer && isset($_POST['restore'])) {
    $doc = new \GlpiPlugin\Codexplus\Document();
    $rid = (int) ($_POST['id'] ?? 0);
    if ($doc->getFromDB($rid) && $doc->canDeleteItem() && $doc->restore(['id' => $rid])) {
        Session::addMessageAfterRedirect(sprintf(__('%s restaurado.', 'codexplus'), $doc->getCode()));
    } else {
        Session::addMessageAfterRedirect(__('Sem direito de restaurar este documento.', 'codexplus'), false, ERROR);
    }
    Html::redirect($self . '?situacao=lixeira');
}

Wiki::pageHeader();

$shelf = Library::shelf($producer);
TemplateRenderer::getInstance()->display('@codexplus/library.html.twig', [
    'shelf'     => $shelf,
    'doctypes'  => DocumentMeta::getDoctypes(),
    // Cliente só nos tipos que têm cliente (dado antigo em outro tipo fica fora).
    'client_types' => array_merge(DocumentMeta::CLIENT_TEXT_TYPES, DocumentMeta::CLIENT_LINK_TYPES),
    'producer'  => $producer,
    'statuses'  => \GlpiPlugin\Codexplus\Document::getStatuses(),
    'trash'     => $producer ? Library::trash() : [],
    'me'        => (int) Session::getLoginUserID(),
    'q'         => (string) ($_GET['q'] ?? ''),
    // Busca vinda do Painel procura em todas as situações.
    'situacao'  => (string) ($_GET['situacao'] ?? (($_GET['q'] ?? '') !== '' ? 'todos' : 'publicado')),
    'self'      => $self,
    'csrf'      => Session::getNewCSRFToken(),
    'can_templates' => Session::haveRight(Rights::NAME, Rights::TEMPLATES),
    'form_url'  => $CFG_GLPI['root_doc'] . '/plugins/codexplus/front/document.form.php',
]);

Wiki::pageFooter();
