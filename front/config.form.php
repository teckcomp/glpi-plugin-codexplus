<?php

/**
 * Codex+ — tela de configuração de marca (Etapa 4a).
 *
 * Alcançada pelo ícone de engrenagem em Configurar > Plugins (hook
 * config_page) ou direto pela URL.
 *
 * ATENÇÃO (achado técnico nº 11 do projeto): arquivos front/*.php de plugin
 * no GLPI 11 são executados em ESCOPO DE FUNÇÃO, por
 * LegacyFileLoadController::__invoke(). As superglobais do GLPI precisam ser
 * declaradas explicitamente com `global` depois do include, senão vêm nulas
 * e o erro só aparece no log como "Call to a member function on null".
 */

use Glpi\Application\View\TemplateRenderer;
use GlpiPlugin\Codexplus\Brand;
use GlpiPlugin\Codexplus\Branding;

include('../../../inc/includes.php');

global $CFG_GLPI;

// Configurar a marca dos documentos é ato de administração da instância,
// não de escrita na base de conhecimento — daí `config`, e não `knowbase`.
Session::checkRight('config', UPDATE);

if (isset($_POST['update'])) {
    Branding::save($_POST);
    Session::addMessageAfterRedirect(
        __('Configuração salva.', 'codexplus'),
        false,
        INFO
    );
    Html::back();
    exit;
}

// --- M-1: marcas (nome da empresa, logo, altura, cor; uma é a padrão) ---
if (isset($_POST['brand_save'])) {
    [$ok, $msg, $id] = Brand::save($_POST);
    Session::addMessageAfterRedirect($msg, false, $ok ? INFO : ERROR);
    if ($ok && isset($_FILES['brand_logo']) && ($_FILES['brand_logo']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
        [$ok2, $msg2] = Brand::storeLogo($id, $_FILES['brand_logo']);
        Session::addMessageAfterRedirect($msg2, false, $ok2 ? INFO : ERROR);
    }
    Html::back();
    exit;
}

if (isset($_POST['brand_logo_delete'])) {
    Brand::deleteLogo((int) $_POST['id']);
    Session::addMessageAfterRedirect(__('Logo removida.', 'codexplus'), false, INFO);
    Html::back();
    exit;
}

if (isset($_POST['brand_default'])) {
    Brand::setDefault((int) $_POST['id']);
    Session::addMessageAfterRedirect(__('Marca padrão alterada.', 'codexplus'), false, INFO);
    Html::back();
    exit;
}

if (isset($_POST['brand_delete'])) {
    [$ok, $msg] = Brand::delete((int) $_POST['id']);
    Session::addMessageAfterRedirect($msg, false, $ok ? INFO : ERROR);
    Html::back();
    exit;
}

Html::header(
    __('Codex+', 'codexplus'),
    $_SERVER['PHP_SELF'],
    'config',
    'plugins'
);

TemplateRenderer::getInstance()->display('@codexplus/config.html.twig', [
    'glpi_root'      => $CFG_GLPI['root_doc'],
    'csrf'           => Session::getNewCSRFToken(),
    'cfg'            => Branding::getAll(),
    'brands'         => Brand::all(),
    'brand_edit'     => (int) ($_GET['brand'] ?? 0),
    'brand_editing'  => Brand::get((int) ($_GET['brand'] ?? 0)),
    'mm_min'         => Brand::MIN_MM,
    'mm_max'         => Brand::MAX_MM,
    'logo_positions' => Branding::getLogoPositions(),
    'markers'        => Branding::getMarkers(),
    'client_sources' => Branding::getClientSources(),
    'max_mb'         => (int) (Branding::LOGO_MAX_BYTES / 1048576),
]);

Html::footer();
