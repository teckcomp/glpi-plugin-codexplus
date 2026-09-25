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

    /**
     * Bloco A2 (Claudio, 25/09/2026): "Setor de auditoria". Nos documentos
     * cujos setores são todos de auditoria, quem aprovou a 1ª etapa pode
     * validar a 2ª (lá gestor e auditor costumam ser as mesmas pessoas).
     */
    public function getAdditionalFields()
    {
        $fields = parent::getAdditionalFields();
        $fields[] = [
            'name'  => 'is_audit',
            'label' => __('Setor de auditoria', 'codexplus'),
            'type'  => 'bool',
            'list'  => true,
        ];
        return $fields;
    }

    /** Opção de busca: coluna na lista e registro no Histórico (achado 33). */
    public function rawSearchOptions()
    {
        $tab = parent::rawSearchOptions();
        $tab[] = [
            'id'       => '10',
            'table'    => $this->getTable(),
            'field'    => 'is_audit',
            'name'     => __('Setor de auditoria', 'codexplus'),
            'datatype' => 'bool',
        ];
        return $tab;
    }

    /**
     * Setores de auditoria entre os informados.
     *
     * @param int[] $ids
     * @return int[]
     */
    public static function auditOnes(array $ids): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $ids = array_values(array_filter(array_map('intval', $ids)));
        if ($ids === []) {
            return [];
        }
        $out = [];
        foreach ($DB->request([
            'SELECT' => ['id'],
            'FROM'   => self::getTable(),
            'WHERE'  => ['id' => $ids, 'is_audit' => 1],
        ]) as $row) {
            $out[] = (int) $row['id'];
        }
        return $out;
    }

    /** Papéis do setor (R3c) saem junto com o setor. */
    public function cleanDBonPurge()
    {
        $this->deleteChildrenAndRelationsFromDb([SectorMember::class]);
    }
}
