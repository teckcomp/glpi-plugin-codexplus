<?php
namespace GlpiPlugin\Codexplus;

use CommonDBRelation;
use Session;

/**
 * Documento <-> categoria, N:N (Etapa R3a). Tabela criada na R1:
 * glpi_plugin_codexplus_documents_categories (única por par).
 *
 * Desde a R3c a categoria define o SETOR do documento, e o setor define
 * gestores e validadores. Por isso ligar/desligar categoria:
 *   - é de quem gere o documento (Document::canManage: gestor ou Ver todos);
 *   - só em rascunho (trocar de setor no meio da validação mudaria quem
 *     valida);
 *   - a categoria nova precisa estar em setor que o usuário gere (senão um
 *     gestor jogaria o documento para o setor de outro).
 * Na criação, as categorias entram por Document::post_addItem, já checadas.
 */
class Document_Category extends CommonDBRelation
{
    public static $itemtype_1 = Document::class;
    public static $items_id_1 = 'plugin_codexplus_documents_id';
    public static $itemtype_2 = Category::class;
    public static $items_id_2 = 'plugin_codexplus_categories_id';

    public static $checkItem_2_Rights = self::DONT_CHECK_ITEM_RIGHTS;
    public static $logs_for_item_2    = false;

    private function linkedDocument(): ?Document
    {
        $key = static::$items_id_1;
        $id  = (int) ($this->fields[$key] ?? $this->input[$key] ?? 0);
        $doc = new Document();
        return ($id > 0 && $doc->getFromDB($id)) ? $doc : null;
    }

    public function canCreateItem(): bool
    {
        $doc = $this->linkedDocument();
        if ($doc === null || !$doc->canManage() || $doc->fields['status'] !== Document::STATUS_DRAFT) {
            return false;
        }
        $cid = (int) ($this->fields[static::$items_id_2] ?? $this->input[static::$items_id_2] ?? 0);
        if (Session::haveRight(Rights::NAME, Rights::VIEWALL)) {
            return $cid > 0;
        }
        $sector = Category::getSectorOf($cid);
        return $sector > 0 && in_array($sector, SectorMember::mySectors(SectorMember::ROLE_MANAGER), true);
    }

    public function canPurgeItem(): bool
    {
        $doc = $this->linkedDocument();
        return $doc !== null && $doc->canManage() && $doc->fields['status'] === Document::STATUS_DRAFT;
    }

    public function canUpdateItem(): bool
    {
        return false;
    }

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
