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

    // Upload é opcional: o campo pode vir vazio numa gravação que só mexeu
    // nos toggles.
    if (isset($_FILES['logo']) && ($_FILES['logo']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
        [$ok, $msg] = Branding::storeLogo($_FILES['logo']);
        Session::addMessageAfterRedirect($msg, false, $ok ? INFO : ERROR);
    }

    Html::back();
    exit;
}

if (isset($_POST['delete_logo'])) {
    Branding::deleteLogo();
    Session::addMessageAfterRedirect(__('Logo removido.', 'codexplus'), false, INFO);
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
    'has_logo'       => Branding::hasLogo(),
    'logo_url'       => Branding::getLogoUrl(),
    'logo_positions' => Branding::getLogoPositions(),
    'markers'        => Branding::getMarkers(),
    'max_mb'         => (int) (Branding::LOGO_MAX_BYTES / 1048576),
]);

Html::footer();
