<?php

/**
 * Codex+ — criação do documento (Etapa 3b).
 *
 * Cria o artigo NATIVO (glpi_knowbaseitems) com o conteúdo do modelo e, na
 * sequência, o registro de metadados do Codex+ — que gera o sequencial e,
 * portanto, o código (POP0001:00). Depois manda o usuário para a edição
 * nativa, para ele escrever o documento.
 */

use GlpiPlugin\Codexplus\DocumentMeta;
use GlpiPlugin\Codexplus\Template;

include('../../../inc/includes.php');

global $CFG_GLPI;

Session::checkRight('plugin_codexplus_wiki', READ);

if (!KnowbaseItem::canCreate()) {
    Html::displayRightError();
}

$doctype = isset($_POST['doctype']) && in_array($_POST['doctype'], DocumentMeta::DOCTYPE_KEYS, true)
    ? (string) $_POST['doctype']
    : '';
$templateId = isset($_POST['templates_id']) ? (int) $_POST['templates_id'] : 0;
$title      = isset($_POST['name']) ? trim((string) $_POST['name']) : '';

if ($doctype === '' || $title === '') {
    Session::addMessageAfterRedirect(
        __('Informe o tipo e o título do documento.', 'codexplus'),
        false,
        ERROR
    );
    Html::back();
}

// Conteúdo inicial: o do modelo escolhido (vazio se nenhum).
$content = '';
if ($templateId > 0) {
    $tpl = new Template();
    if ($tpl->getFromDB($templateId)) {
        $content = (string) $tpl->fields['content'];
    }
}

// 1) Artigo nativo.
$kb    = new KnowbaseItem();
$newId = $kb->add([
    'name'   => $title,
    'answer' => $content,
]);

if (!$newId) {
    Session::addMessageAfterRedirect(
        __('Não foi possível criar o documento.', 'codexplus'),
        false,
        ERROR
    );
    Html::back();
}

// 2) Metadados do Codex+ — o sequencial (e o código) sai daqui.
// Proposta não vence: validade 0. Os demais usam o padrão de 12 meses.
$meta = new DocumentMeta();
$meta->add([
    'knowbaseitems_id' => $newId,
    'doctype'          => $doctype,
    'status'           => 'rascunho',
    'revision'         => 0,
    'users_id_owner'   => Session::getLoginUserID(),
    'validity_months'  => $doctype === 'PRP' ? 0 : DocumentMeta::DEFAULT_VALIDITY_MONTHS,
    'client_name'      => '',
]);

// 3) Vai direto para a edição nativa, para escrever o documento.
Html::redirect($CFG_GLPI['root_doc'] . '/front/knowbaseitem.form.php?id=' . $newId);
