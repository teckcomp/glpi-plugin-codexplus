<?php
namespace GlpiPlugin\Codexplus;

use CommonDBRelation;
use Group;

/**
 * Alvo de leitura: grupo (Etapa R3a).
 *
 * Espelho de Group_KnowbaseItem (GLPI 11.0.6). Tabela criada na R1:
 * glpi_plugin_codexplus_documents_groups. Mesma regra de entidade do
 * alvo por perfil.
 */
class Document_Group extends CommonDBRelation
{
    use TargetRelation;

    public static $itemtype_1 = Document::class;
    public static $items_id_1 = 'plugin_codexplus_documents_id';
    public static $itemtype_2 = Group::class;
    public static $items_id_2 = 'groups_id';

    public static $checkItem_2_Rights = self::DONT_CHECK_ITEM_RIGHTS;
    public static $logs_for_item_2    = false;

    /**
     * O entities_id desta tabela é a ENTIDADE DO ALVO, não a do registro.
     * Sem isto, CommonDBRelation::addNeededInfoToInput() copiaria a entidade
     * do documento (o KnowbaseItem não tem entidade, por isso lá não ocorre)
     * e o "sem restrição de entidade" seria trocado em silêncio.
     */
    public static $disableAutoEntityForwarding = true;
}
