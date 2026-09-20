<?php
namespace GlpiPlugin\Codexplus;

/**
 * Comum aos três alvos de leitura (perfil, grupo, usuário) — Etapa R3a.
 *
 * getForDocument() devolve no MESMO formato de KnowbaseItem_User::getUsers(),
 * Group_KnowbaseItem::getGroups() e KnowbaseItem_Profile::getProfiles():
 *   [id_do_alvo => [linha, linha…]]
 * que é o formato que CommonDBVisible::haveVisibilityAccess() percorre.
 */
trait TargetRelation
{
    /**
     * @return array<int, array<int, array<string, mixed>>>
     */
    public static function getForDocument(int $documentId): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $out = [];
        foreach ($DB->request([
            'FROM'  => static::getTable(),
            'WHERE' => [static::$items_id_1 => $documentId],
        ]) as $row) {
            $out[(int) $row[static::$items_id_2]][] = $row;
        }
        return $out;
    }

    /**
     * No formulário nativo, "sem restrição de entidade" chega como
     * entities_id = -1 (front/knowbaseitem.form.php, GLPI 11.0.6). Aqui a
     * mesma conversão vale para qualquer origem (console, R3b), e entidade
     * AUSENTE também vira "sem restrição" — com NULL e a flag zerada o alvo
     * não casaria com entidade nenhuma. Só perfil e grupo têm essas colunas.
     */
    public function prepareInputForAdd($input)
    {
        if (
            $this->isField('no_entity_restriction')
            && (!array_key_exists('entities_id', $input) || (int) $input['entities_id'] === -1)
        ) {
            $input['entities_id']           = null;
            $input['no_entity_restriction'] = 1;
        }
        return parent::prepareInputForAdd($input);
    }
}
