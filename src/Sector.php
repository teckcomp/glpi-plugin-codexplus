<?php
namespace GlpiPlugin\Codexplus;

use CommonDropdown;

/**
 * Setor (Etapa R2) — lista simples, acima da categoria.
 *
 * Setor é ORGANIZAÇÃO da estante, não controle de acesso (CONTEXTO §3.1).
 * Cadastro em Configurar > Listas suspensas > Codex+ > Setores. As telas
 * de lista e de formulário são as genéricas do GLPI 11 (DropdownFormController
 * e GenericListController, escolhidos pelo LegacyItemtypeRouteListener a
 * partir de /plugins/codexplus/front/sector[.form].php) — sem front/ próprio.
 */
class Sector extends CommonDropdown
{
    use StructureRights;

    public static $rightname = Rights::NAME;

    public $dohistory = true;

    public static function getTypeName($nb = 0)
    {
        return $nb > 1 ? __('Setores', 'codexplus') : __('Setor', 'codexplus');
    }

    public static function getIcon()
    {
        return 'ti ti-building';
    }
}
