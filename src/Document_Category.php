<?php
namespace GlpiPlugin\Codexplus;

use CommonDBRelation;

/**
 * Documento <-> categoria, N:N (Etapa R3a). Tabela criada na R1:
 * glpi_plugin_codexplus_documents_categories (única por par).
 *
 * Categoria NÃO é controle de acesso: ligar/desligar exige poder atualizar o
 * documento (checagem padrão do CommonDBRelation sobre o item 1); da
 * categoria só se exige que exista.
 */
class Document_Category extends CommonDBRelation
{
    public static $itemtype_1 = Document::class;
    public static $items_id_1 = 'plugin_codexplus_documents_id';
    public static $itemtype_2 = Category::class;
    public static $items_id_2 = 'plugin_codexplus_categories_id';

    public static $checkItem_2_Rights = self::DONT_CHECK_ITEM_RIGHTS;
    public static $logs_for_item_2    = false;

    /**
     * IDs das categorias de um documento.
     *
     * @return int[]
     */
    public static function getCategoryIds(int $documentId): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $ids = [];
        foreach ($DB->request([
            'SELECT' => [static::$items_id_2],
            'FROM'   => static::getTable(),
            'WHERE'  => [static::$items_id_1 => $documentId],
        ]) as $row) {
            $ids[] = (int) $row[static::$items_id_2];
        }
        return $ids;
    }
}
