<?php

/**
 * Codex+ — edição embutida do artigo (Etapa 4d; cabeçalho estruturado
 * desde a Etapa 4f).
 *
 * Antes, o botão "Editar" mandava o usuário para a ficha nativa
 * (front/knowbaseitem.form.php). A Etapa 4d passou a editar SEM sair do
 * Codex+: título, corpo (TinyMCE nativo) e cabeçalho (TinyMCE nativo, campo
 * novo do Codex+) na mesma tela; rodapé em texto simples com marcadores,
 * igual ao padrão já usado em Branding::footer_text, só que por documento.
 *
 * A Etapa 4f REMOVEU o TinyMCE do cabeçalho: ele deixou de ser texto livre
 * e passou a ser 3 áreas fixas (título + logo lado a lado, e uma linha de
 * dados automáticos não editável) — sempre recomposto por
 * Branding::composeHeaderHtml() neste POST, nunca lido de $_POST diretamente.
 * O título continua sendo o mesmo campo `name` de sempre, só que agora
 * exibido visualmente dentro da zona de cabeçalho (ver
 * templates/article-edit.html.twig) — não existe um segundo campo de título.
 *
 * NÃO reimplementa o TinyMCE: usa Html::textarea(['enable_richtext' => true])
 * para o corpo, o mesmo helper nativo que a ficha do GLPI usa por baixo.
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
use GlpiPlugin\Codexplus\Branding;
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
    $title = (string) ($_POST['name'] ?? $kb->fields['name']);

    $kb->update([
        'id'     => $id,
        'name'   => $title,
        'answer' => (string) ($_POST['answer'] ?? $kb->fields['answer']),
    ]);

    // Etapa 4f: cabeçalho deixou de vir de $_POST — é sempre recomposto
    // aqui a partir do título que acabou de ser salvo + logo global (via
    // Branding) + código/revisão/data (Área 3, fixa). doctype/sequence/
    // revisão não são editados por este formulário, então lemos o estado
    // atual do metadado antes de recompor.
    $currentMeta = DocumentMeta::getForKnowbaseItem($id);
    $headerHtml  = Branding::composeHeaderHtml(
        $title,
        $currentMeta->getBareCode(),
        sprintf('%02d', (int) ($currentMeta->fields['revision'] ?? 0)),
        date('d/m/Y')
    );

    // Upsert dos campos do Codex+ (cabeçalho/rodapé) — mesmo padrão de
    // front/documentmeta.form.php: um metadado por artigo, chave única em
    // knowbaseitems_id decide entre add/update.
    $metaInput = [
        'knowbaseitems_id' => $id,
        'header_html'      => $headerHtml,
        'footer_text'      => (string) ($_POST['footer_text'] ?? ''),
    ];
    $existing = new DocumentMeta();
    if ($existing->getFromDBByCrit(['knowbaseitems_id' => $id])) {
        $metaInput['id'] = $existing->getID();
        $existing->update($metaInput);
    } else {
        $newMeta = new DocumentMeta();
        $newMeta->add($metaInput);
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

// Etapa 4f: cabeçalho deixou de ter TinyMCE — o slot de logo e a Área 3
// (linha 2, fixa) são compostos aqui só para PRÉVIA na tela; o valor que
// realmente vale é recomposto no POST, com o título já salvo.
$canManageLogo = Session::haveRight('config', UPDATE);

$headerBareCode = $meta->getBareCode();
$headerRevision = sprintf('%02d', (int) ($meta->fields['revision'] ?? 0));
$headerPreviewLine2 = Branding::composeArea3($headerBareCode, $headerRevision, date('d/m/Y'));

// Correção pós-4f: a prévia do slot de logo tinha um limite fixo de 40px no
// CSS, sem nenhuma relação com "Altura do logo (mm)" (Configurar → Codex+).
// Aqui convertemos o mesmo valor para px (96dpi, igual ao mmToPx() do PDF em
// codexplus.js) para a prévia mostrar exatamente o tamanho que sai no PDF.
$logoHeightMm = (int) Branding::get('header_logo_height');
$logoHeightMm = $logoHeightMm > 0 ? $logoHeightMm : 14;
$logoHeightPx = (int) round($logoHeightMm * 96 / 25.4);

TemplateRenderer::getInstance()->display('@codexplus/article-edit.html.twig', [
    'glpi_root'   => $CFG_GLPI['root_doc'],
    'article_id'  => $id,
    'article_url' => $articleUrl,
    'title'       => $rawTitle,
    'answer_editor_html' => $answerEditorHtml,
    'can_manage_logo'     => $canManageLogo,
    'logo_url'            => Branding::getLogoUrl(),
    'logo_height_px'      => $logoHeightPx,
    'header_preview_line2' => $headerPreviewLine2,
    'footer_text' => (string) ($meta->fields['footer_text'] ?? ''),
    // Mesmo padrão de front/documentmeta.form.php (token embutido no
    // formulário). Session::getNewCSRFToken() é o helper nativo padrão.
    'csrf_token'  => Session::getNewCSRFToken(),
]);

Html::footer();
