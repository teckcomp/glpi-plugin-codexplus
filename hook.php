<?php

/**
 * Codex+ — hooks de instalação/desinstalação.
 * O GLPI exige estas funções globais; a lógica real fica em src/Install.php.
 */

use GlpiPlugin\Codexplus\Install;

function plugin_codexplus_install(): bool
{
    return Install::install();
}

function plugin_codexplus_uninstall(): bool
{
    return Install::uninstall();
}
