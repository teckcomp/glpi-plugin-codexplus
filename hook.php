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
 *
 * R3c: sectormembers e documenteditors NÃO entram aqui. As classes
 * (SectorMember, DocumentEditor) têm maiúscula no meio, e o GLPI deduz a
 * classe pela tabela em minúsculas ("Sectormember"), que o autoloader PSR-4
 * não acha em disco que diferencia maiúsculas (achado 38) — a relação daria
 * aviso. A limpeza é feita por Sector::cleanDBonPurge e
 * Document::cleanDBonPurge.
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

/**
 * B1 (Claudio, 26/09/2026): no Self-Service o Codex+ entra direto na barra,
 * ao lado de FAQ, abrindo a Biblioteca. Registrado em setup.php só para a
 * interface simplificada com o direito Ler; o menu da interface padrão
 * continua em Ferramentas.
 *
 * @param array<string, mixed> $menu
 * @return array<string, mixed>
 */
function plugin_codexplus_redefine_menus($menu)
{
    if (!is_array($menu) || Session::getCurrentInterface() !== 'helpdesk') {
        return $menu;
    }
    $entrada = [
        'default' => '/plugins/codexplus/front/library.php',
        'title'   => __('Codex+', 'codexplus'),
        'icon'    => 'ti ti-books',
    ];
    // Logo depois de FAQ, se existir; senão, no fim.
    $out = [];
    foreach ($menu as $k => $v) {
        $out[$k] = $v;
        if ($k === 'faq') {
            $out['codexplus'] = $entrada;
        }
    }
    if (!isset($out['codexplus'])) {
        $out['codexplus'] = $entrada;
    }
    return $out;
}
