<?php
namespace GlpiPlugin\Codexplus;

use CommonDBRelation;
use User;

/**
 * Alvo de leitura: usuário (Etapa R3a).
 *
 * Espelho de KnowbaseItem_User (GLPI 11.0.6). Tabela criada na R1:
 * glpi_plugin_codexplus_documents_users. Sem restrição de entidade.
 */
class Document_User extends CommonDBRelation
{
    use TargetRelation;

    public static $itemtype_1 = Document::class;
    public static $items_id_1 = 'plugin_codexplus_documents_id';
    public static $itemtype_2 = User::class;
    public static $items_id_2 = 'users_id';

    public static $checkItem_2_Rights = self::DONT_CHECK_ITEM_RIGHTS;
    public static $logs_for_item_2    = false;
}
