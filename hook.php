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

/**
 * Listas suspensas do Codex+ (Etapa R2): aparecem em Configurar > Listas
 * suspensas, no grupo "Codex+". O GLPI filtra cada uma por canView().
 */
function plugin_codexplus_getDropdown(): array
{
    return [
        \GlpiPlugin\Codexplus\Sector::class   => \GlpiPlugin\Codexplus\Sector::getTypeName(2),
        \GlpiPlugin\Codexplus\Category::class => \GlpiPlugin\Codexplus\Category::getTypeName(2),
    ];
}

/**
 * Relações entre tabelas do plugin, usadas pelo núcleo em isUsed() (aviso
 * "este item está em uso" e "substituir por" ao excluir setor/categoria).
 *
 * Só entram tabelas que JÁ têm classe: o GLPI emite aviso para relação cuja
 * tabela não corresponde a um itemtype (DbUtils::getDbRelations, achado 31).
 * A ligação documento–categoria entrou na R3a, junto com Document_Category:
 * categoria usada por documento passa a dar o aviso "em uso".
 */
function plugin_codexplus_getDatabaseRelations(): array
{
    return [
        'glpi_plugin_codexplus_sectors' => [
            'glpi_plugin_codexplus_categories' => 'plugin_codexplus_sectors_id',
        ],
        'glpi_plugin_codexplus_categories' => [
            'glpi_plugin_codexplus_categories'           => 'plugin_codexplus_categories_id',
            'glpi_plugin_codexplus_documents_categories' => 'plugin_codexplus_categories_id',
        ],
    ];
}
