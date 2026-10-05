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
use GlpiPlugin\Codexplus\Rights;
use GlpiPlugin\Codexplus\WifiCatalog;
use GlpiPlugin\Codexplus\Wiki;

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

// --- Q8-2: mapa de calor — modelos de AP e perfis de aparelho ---
// Sucesso volta para a lista (fecha o formulário); erro volta ao formulário.
$cxWifiBack = static function (bool $ok) use ($CFG_GLPI): void {
    if ($ok) {
        Html::redirect($CFG_GLPI['root_doc'] . '/plugins/codexplus/front/config.form.php#mapa-calor');
    } else {
        Html::back();
    }
    exit;
};
if (isset($_POST['wifimodel_save'])) {
    [$ok, $msg] = WifiCatalog::saveModel($_POST);
    Session::addMessageAfterRedirect($msg, false, $ok ? INFO : ERROR);
    $cxWifiBack($ok);
}
if (isset($_POST['wifimodel_delete'])) {
    [$ok, $msg] = WifiCatalog::deleteModel((int) $_POST['id']);
    Session::addMessageAfterRedirect($msg, false, $ok ? INFO : ERROR);
    $cxWifiBack(true);
}
if (isset($_POST['wifiprofile_save'])) {
    [$ok, $msg] = WifiCatalog::saveProfile($_POST);
    Session::addMessageAfterRedirect($msg, false, $ok ? INFO : ERROR);
    $cxWifiBack($ok);
}
if (isset($_POST['wifiprofile_delete'])) {
    [$ok, $msg] = WifiCatalog::deleteProfile((int) $_POST['id']);
    Session::addMessageAfterRedirect($msg, false, $ok ? INFO : ERROR);
    $cxWifiBack(true);
}
if (isset($_POST['wifiprofile_default'])) {
    WifiCatalog::setDefaultProfile((int) $_POST['id']);
    Session::addMessageAfterRedirect(__('Perfil padrão alterado.', 'codexplus'), false, INFO);
    $cxWifiBack(true);
}
if (isset($_POST['wifiprofile_reference'])) {
    [$ok, $msg] = WifiCatalog::loadReferenceProfiles();
    Session::addMessageAfterRedirect($msg, false, INFO);
    $cxWifiBack(true);
}

// Aba Configuração do Codex+ (Claudio, 05/10/2026): mesmo cabeçalho das
// outras telas (Ferramentas > Codex+), não mais Configurar > Plugins.
Wiki::pageHeader();

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
    'nav'            => [
        'painel'  => Rights::isProducer(),
        'modelos' => Rights::isProducer() && Session::haveRight(Rights::NAME, Rights::TEMPLATES),
    ],
    // Q8-2: uma variável associativa com tudo (Twig estrito).
    'wifi'           => [
        'bands'           => WifiCatalog::BANDS,
        'standards'       => WifiCatalog::standardOptions(),
        'models'          => WifiCatalog::models(),
        'profiles'        => WifiCatalog::profiles(),
        'model_edit'      => (int) ($_GET['wifimodel'] ?? 0),
        'model_editing'   => WifiCatalog::model((int) ($_GET['wifimodel'] ?? 0)),
        'profile_edit'    => (int) ($_GET['wifiprofile'] ?? 0),
        'profile_editing' => WifiCatalog::profile((int) ($_GET['wifiprofile'] ?? 0)),
    ],
]);

Wiki::pageFooter();
