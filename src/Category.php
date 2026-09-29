<?php
namespace GlpiPlugin\Codexplus;

use CommonTreeDropdown;

/**
 * Categoria em árvore (Etapa R2), ligada a um setor.
 *
 * Regra de herança (decisão de 19/09/2026): o setor pertence à categoria
 * RAIZ; toda subcategoria herda o setor da raiz. Na prática:
 *   - subcategoria grava o setor do pai (que já é o da raiz), ignorando o
 *     que vier no formulário;
 *   - mudar o setor de uma raiz, ou mover uma categoria para outro pai,
 *     reaplica o setor em todos os descendentes;
 *   - categoria que deixa de ter pai (vira raiz) mantém o setor que tinha.
 *
 * Telas genéricas do GLPI 11, como em Sector. Um documento pode estar em
 * várias categorias (tabela de ligação criada na R1, usada a partir da R3).
 */
class Category extends CommonTreeDropdown
{
    use StructureRights;

    public const SECTOR_FIELD = 'plugin_codexplus_sectors_id';

    public static $rightname = Rights::NAME;

    public $dohistory = true;

    public static function getTypeName($nb = 0)
    {
        return $nb > 1 ? __('Categorias', 'codexplus') : __('Categoria', 'codexplus');
    }

    public static function getIcon()
    {
        return 'ti ti-folders';
    }

    public function getAdditionalFields()
    {
        $fields = parent::getAdditionalFields();
        $fields[] = [
            'name'  => self::SECTOR_FIELD,
            'label' => __('Setor (subcategorias herdam o da raiz)', 'codexplus'),
            'type'  => 'dropdownValue',
            'list'  => true,
        ];
        return $fields;
    }

    public function rawSearchOptions()
    {
        $tab = parent::rawSearchOptions();
        $tab[] = [
            'id'       => '10',
            'table'    => Sector::getTable(),
            'field'    => 'name',
            'name'     => Sector::getTypeName(1),
            'datatype' => 'dropdown',
        ];
        return $tab;
    }

    public function prepareInputForAdd($input)
    {
        $input = parent::prepareInputForAdd($input);
        if ($input === false) {
            return false;
        }
        return $this->applyInheritedSector($input);
    }

    public function prepareInputForUpdate($input)
    {
        $input = parent::prepareInputForUpdate($input);
        if ($input === false) {
            return false;
        }
        return $this->applyInheritedSector($input);
    }

    public function post_updateItem($history = true)
    {
        parent::post_updateItem($history);

        if (
            in_array(self::SECTOR_FIELD, $this->updates, true)
            || in_array(static::getForeignKeyField(), $this->updates, true)
        ) {
            self::propagateSector((int) $this->getID(), (int) $this->fields[self::SECTOR_FIELD]);
        }
    }

    /**
     * Subcategoria: força o setor do pai. Raiz: mantém o informado.
     */
    private function applyInheritedSector(array $input): array
    {
        $fkey   = static::getForeignKeyField();
        $parent = (int) ($input[$fkey] ?? $this->fields[$fkey] ?? 0);

        if ($parent > 0) {
            $input[self::SECTOR_FIELD] = self::getSectorOf($parent);
        } elseif (isset($input[self::SECTOR_FIELD])) {
            $input[self::SECTOR_FIELD] = max(0, (int) $input[self::SECTOR_FIELD]);
        }

        return $input;
    }

    /**
     * SC1 (Claudio, 27/09/2026): setores visíveis na entidade, cada um com as
     * suas categorias (nome completo, em ordem), para o seletor Setor /
     * Categorias do formulário. Categoria sem setor não entra (não teria
     * onde morar na estante).
     *
     * @return array<int, array{id: int, name: string, categories: array<int, array{id: int, name: string}>}>
     */
    public static function placementTree(): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $st      = Sector::getTable();
        $sectors = [];
        foreach ($DB->request([
            'SELECT' => ['id', 'name'],
            'FROM'   => $st,
            'WHERE'  => [getEntitiesRestrictCriteria($st, '', '', true)],
            'ORDER'  => ['name'],
        ]) as $r) {
            $sectors[(int) $r['id']] = ['id' => (int) $r['id'], 'name' => (string) $r['name'], 'categories' => []];
        }
        $ct = static::getTable();
        foreach ($DB->request([
            'SELECT' => ['id', 'completename', self::SECTOR_FIELD],
            'FROM'   => $ct,
            'WHERE'  => [getEntitiesRestrictCriteria($ct, '', '', true)],
            'ORDER'  => ['completename'],
        ]) as $r) {
            $sid = (int) $r[self::SECTOR_FIELD];
            if (isset($sectors[$sid])) {
                $sectors[$sid]['categories'][] = ['id' => (int) $r['id'], 'name' => (string) $r['completename']];
            }
        }
        return array_values($sectors);
    }

    /**
     * SC1: setor de cada categoria, numa consulta (0 = sem setor).
     *
     * @param int[] $ids
     * @return array<int, int> id da categoria => id do setor
     */
    public static function sectorsOf(array $ids): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        $out = [];
        if (!$ids) {
            return $out;
        }
        foreach ($DB->request([
            'SELECT' => ['id', self::SECTOR_FIELD],
            'FROM'   => static::getTable(),
            'WHERE'  => ['id' => $ids],
        ]) as $r) {
            $out[(int) $r['id']] = (int) $r[self::SECTOR_FIELD];
        }
        return $out;
    }

    /** Setor gravado numa categoria (0 = sem setor ou inexistente). */
    public static function getSectorOf(int $categoryId): int
    {
        /** @var \DBmysql $DB */
        global $DB;

        foreach ($DB->request([
            'SELECT' => [self::SECTOR_FIELD],
            'FROM'   => static::getTable(),
            'WHERE'  => ['id' => $categoryId],
            'LIMIT'  => 1,
        ]) as $row) {
            return (int) $row[self::SECTOR_FIELD];
        }
        return 0;
    }

    /**
     * Reaplica o setor em todos os descendentes. UPDATE direto (sem
     * CommonDBTM::update em cada filho): o setor da subcategoria é
     * derivado, não uma edição de alguém, e não deve encher o Histórico.
     */
    public static function propagateSector(int $categoryId, int $sectorId): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $descendants = array_values(array_diff(
            array_map('intval', getSonsOf(static::getTable(), $categoryId)),
            [$categoryId]
        ));
        if ($descendants === []) {
            return;
        }

        $DB->update(
            static::getTable(),
            [self::SECTOR_FIELD => $sectorId],
            ['id' => $descendants]
        );
    }
}
