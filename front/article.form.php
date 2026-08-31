<?php

/**
 * Codex+ — edição embutida do artigo (Etapa 4d).
 *
 * Antes, o botão "Editar" mandava o usuário para a ficha nativa
 * (front/knowbaseitem.form.php). Esta etapa passa a editar SEM sair do
 * Codex+: título, corpo (TinyMCE nativo) e cabeçalho (TinyMCE nativo, campo
 * novo do Codex+) na mesma tela; rodapé em texto simples com marcadores,
 * igual ao padrão já usado em Branding::footer_text, só que por documento.
 *
 * NÃO reimplementa o TinyMCE: usa Html::textarea(['enable_richtext' => true])
 * duas vezes (corpo e cabeçalho), o mesmo helper nativo que a ficha do GLPI
 * usa por baixo. Cada instância tem 'editor_id' próprio para não colidir.
 *
 * O SALVAMENTO chama KnowbaseItem::update() diretamente — o mesmo método
 * público que o controller nativo chama por baixo dos panos — em vez de
 * fazer POST para front/knowbaseitem.form.php. Motivo: não foi possível
 * confirmar, no código-fonte desse arquivo nativo, para onde ele redireciona
 * depois de salvar; chamar update() aqui dá controle total do redirecionamento
 * (de volta para article.php) sem depender de um contrato não verificado.
 *
 * Categoria, FAQ e anexos CONTINUAM só na ficha nativa — não são reconstruídos
 * aqui de propósito (decisão registrada na Etapa 4d). A tela de leitura tem um
 * link "Mais opções" para quem precisar mexer nisso.
 */

use Glpi\Application\View\TemplateRenderer;
use GlpiPlugin\Codexplus\DocumentMeta;
use GlpiPlugin\Codexplus\Wiki;

include('../../../inc/includes.php');

global $CFG_GLPI;

Session::checkRight('plugin_codexplus_wiki', READ);

$id = isset($_GET['id']) ? (int) $_GET['id'] : (isset($_POST['id']) ? (int) $_POST['id'] : 0);

$kb = new KnowbaseItem();
if ($id <= 0 || !$kb->getFromDB($id) || !$kb->canUpdateItem()) {
    Html::displayRightError();
}

$articleUrl = $CFG_GLPI['root_doc'] . '/plugins/codexplus/front/article.php?id=' . $id;

// -----------------------------------------------------------------------
// POST — grava e volta para a leitura.
// -----------------------------------------------------------------------
if (isset($_POST['update'])) {
    $kb->update([
        'id'     => $id,
        'name'   => (string) ($_POST['name'] ?? $kb->fields['name']),
        'answer' => (string) ($_POST['answer'] ?? $kb->fields['answer']),
    ]);

    // Upsert dos campos do Codex+ (cabeçalho/rodapé) — mesmo padrão de
    // front/documentmeta.form.php: um metadado por artigo, chave única em
    // knowbaseitems_id decide entre add/update.
    $metaInput = [
        'knowbaseitems_id' => $id,
        'header_html'      => (string) ($_POST['header_html'] ?? ''),
        'footer_text'      => (string) ($_POST['footer_text'] ?? ''),
    ];
    $existing = new DocumentMeta();
    if ($existing->getFromDBByCrit(['knowbaseitems_id' => $id])) {
        $metaInput['id'] = $existing->getID();
        $existing->update($metaInput);
    } else {
        $meta = new DocumentMeta();
        $meta->add($metaInput);
    }

    Html::redirect($articleUrl);
}

// -----------------------------------------------------------------------
// GET — mostra o formulário.
// -----------------------------------------------------------------------
Html::header(
    Wiki::getMenuName(),
    $_SERVER['PHP_SELF'],
    'tools',
    Wiki::class
);

$meta = DocumentMeta::getForKnowbaseItem($id);

// Valor bruto (não o de leitura tratada por getAnswer()): edição precisa do
// HTML original, sem a resolução de âncoras/imagens que a leitura aplica.
$rawTitle  = KnowbaseItemTranslation::getTranslatedValue($kb, 'name');
$rawAnswer = KnowbaseItemTranslation::getTranslatedValue($kb, 'answer');

// Html::textarea() pode ecoar OU retornar a string, dependendo da versão —
// não foi possível confirmar a assinatura exata no código-fonte do GLPI
// 11.0.6 (arquivo não disponível para leitura nesta análise). Capturamos
// dos dois jeitos, então funciona independente do comportamento real.
ob_start();
$answerReturn = Html::textarea([
    'name'            => 'answer',
    'value'           => $rawAnswer,
    'rand'            => mt_rand(),
    'editor_id'       => 'codexplus-editor-answer',
    'enable_richtext' => true,
    'rows'            => 20,
]);
$answerCaptured   = ob_get_clean();
$answerEditorHtml = $answerCaptured !== '' ? $answerCaptured : (string) $answerReturn;

ob_start();
$headerReturn = Html::textarea([
    'name'            => 'header_html',
    'value'           => (string) ($meta->fields['header_html'] ?? ''),
    'rand'            => mt_rand(),
    'editor_id'       => 'codexplus-editor-header',
    'enable_richtext' => true,
    'rows'            => 6,
]);
$headerCaptured   = ob_get_clean();
$headerEditorHtml = $headerCaptured !== '' ? $headerCaptured : (string) $headerReturn;

TemplateRenderer::getInstance()->display('@codexplus/article-edit.html.twig', [
    'glpi_root'   => $CFG_GLPI['root_doc'],
    'article_id'  => $id,
    'article_url' => $articleUrl,
    'title'       => $rawTitle,
    'answer_editor_html' => $answerEditorHtml,
    'header_editor_html' => $headerEditorHtml,
    'footer_text' => (string) ($meta->fields['footer_text'] ?? ''),
    // Mesmo padrão de front/documentmeta.form.php (token embutido no
    // formulário). Session::getNewCSRFToken() é o helper nativo padrão.
    'csrf_token'  => Session::getNewCSRFToken(),
]);

Html::footer();
