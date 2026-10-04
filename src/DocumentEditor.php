<?php
namespace GlpiPlugin\Codexplus;

/**
 * Editores da Proposta e do Laudo (bloco A-1, Claudio 04/10/2026): mais de um
 * editor por documento, só usuários. Usa a tabela documenteditors, criada na
 * R3c e sem uso até aqui (a coluna groups_id fica sempre 0).
 *
 * É o mesmo papel do E6 (editar o rascunho, bit Revisar e editar, não
 * publica). O campo users_id_reviewer do documento continua com o PRIMEIRO
 * editor: espelho para o Histórico, a busca e o console. A lista completa é
 * esta tabela, gravada só por Document (post_addItem / post_updateItem).
 * Sem classe CommonDBTM de propósito, como DocumentContributor.
 */
final class DocumentEditor
{
    /** @var array<int, int[]> */
    private static array $cache = [];

    /** @return int[] ids dos editores, na ordem em que foram escolhidos */
    public static function ids(int $documentId): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        if ($documentId <= 0) {
            return [];
        }
        if (!isset(self::$cache[$documentId])) {
            $out = [];
            foreach ($DB->request([
                'SELECT' => ['users_id'],
                'FROM'   => Install::DOC_EDITORS_TABLE,
                'WHERE'  => ['plugin_codexplus_documents_id' => $documentId, 'groups_id' => 0, 'users_id' => ['>', 0]],
                'ORDER'  => ['id ASC'],
            ]) as $row) {
                $out[] = (int) $row['users_id'];
            }
            self::$cache[$documentId] = $out;
        }
        return self::$cache[$documentId];
    }

    public static function has(int $documentId, int $userId): bool
    {
        return $userId > 0 && in_array($userId, self::ids($documentId), true);
    }

    /**
     * Normaliza o que veio do formulário: '' (lista vazia, o hidden do
     * Dropdown múltiplo do GLPI), um id solto ou um array de ids.
     *
     * @param mixed $raw
     * @return int[]
     */
    public static function normalize($raw): array
    {
        $list = is_array($raw) ? $raw : [$raw];
        $out = [];
        foreach ($list as $v) {
            $v = (int) $v;
            if ($v > 0 && !in_array($v, $out, true)) {
                $out[] = $v;
            }
        }
        return $out;
    }

    /**
     * Grava a lista (diferença com a gravada). Devolve [antes, depois].
     *
     * @param int[] $userIds
     * @return array{0: int[], 1: int[]}
     */
    public static function set(int $documentId, array $userIds): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $antes  = self::ids($documentId);
        $depois = self::normalize($userIds);
        foreach (array_diff($antes, $depois) as $uid) {
            $DB->delete(Install::DOC_EDITORS_TABLE, [
                'plugin_codexplus_documents_id' => $documentId,
                'users_id'                      => $uid,
                'groups_id'                     => 0,
            ]);
        }
        $now = $_SESSION['glpi_currenttime'] ?? date('Y-m-d H:i:s');
        foreach (array_diff($depois, $antes) as $uid) {
            $DB->insert(Install::DOC_EDITORS_TABLE, [
                'plugin_codexplus_documents_id' => $documentId,
                'users_id'                      => $uid,
                'groups_id'                     => 0,
                'date_creation'                 => $now,
            ]);
        }
        unset(self::$cache[$documentId]);
        // A ordem gravada é a do id: quem já estava fica na frente.
        return [$antes, self::ids($documentId)];
    }

    /** Nomes separados por vírgula, para a tela e o Histórico. */
    public static function names(array $userIds): string
    {
        return implode(', ', array_map(static fn ($u) => getUserName((int) $u), $userIds));
    }

    public static function purgeDocument(int $documentId): void
    {
        /** @var \DBmysql $DB */
        global $DB;
        $DB->delete(Install::DOC_EDITORS_TABLE, ['plugin_codexplus_documents_id' => $documentId]);
        unset(self::$cache[$documentId]);
    }
}
