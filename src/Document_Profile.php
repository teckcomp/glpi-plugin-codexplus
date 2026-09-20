<?php
namespace GlpiPlugin\Codexplus;

use CommonDBRelation;
use Profile;

/**
 * Alvo de leitura: perfil (Etapa R3a).
 *
 * Espelho de KnowbaseItem_Profile (GLPI 11.0.6). Tabela criada na R1:
 * glpi_plugin_codexplus_documents_profiles. entities_id NULL +
 * no_entity_restriction = 1 significa "o perfil em qualquer entidade",
 * igual à base nativa.
 */
class Document_Profile extends CommonDBRelation
{
    use TargetRelation;

    public static $itemtype_1 = Document::class;
    public static $items_id_1 = 'plugin_codexplus_documents_id';
    public static $itemtype_2 = Profile::class;
    public static $items_id_2 = 'profiles_id';

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
