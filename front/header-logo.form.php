<?php

/**
 * Codex+ — upload da logo pelo slot do cabeçalho, direto da edição do
 * documento (Etapa 4f).
 *
 * NÃO reimplementa validação/armazenamento: chama Branding::storeLogo(),
 * o mesmo método já usado por front/config.form.php desde a Etapa 4a. Só
 * existe como arquivo separado porque o redirecionamento é diferente — de
 * volta para o documento que estava sendo editado, não para a tela de
 * configuração — e front/config.form.php usa Html::back() (referer), cujo
 * comportamento exato não foi possível confirmar no código-fonte do GLPI
 * 11.0.6 nesta análise. Em vez de depender disso, este arquivo recebe o
 * destino explicitamente (`back`) e valida que ele aponta para dentro do
 * próprio plugin antes de redirecionar.
 *
 * DIREITO: `config` (UPDATE) — o MESMO exigido para trocar a logo na tela
 * de configuração. De propósito: a logo é da marca do sistema inteiro, não
 * do documento aberto. Quem só tem direito de editar documentos não vê o
 * controle de upload no slot (ver front/article.form.php / template).
 */

use GlpiPlugin\Codexplus\Branding;

include('../../../inc/includes.php');

global $CFG_GLPI;

Session::checkRight('config', UPDATE);

$back = isset($_POST['back']) ? (string) $_POST['back'] : '';
$pluginBase = $CFG_GLPI['root_doc'] . '/plugins/codexplus/';
$safeBack = str_starts_with($back, $pluginBase)
    ? $back
    : $pluginBase . 'front/wiki.php';

if (isset($_FILES['logo']) && ($_FILES['logo']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
    [$ok, $msg] = Branding::storeLogo($_FILES['logo']);
    Session::addMessageAfterRedirect($msg, false, $ok ? INFO : ERROR);
}

Html::redirect($safeBack);
