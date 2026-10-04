<?php
namespace GlpiPlugin\Codexplus;

/**
 * Aprovadores do diagrama (bloco A-2a, Claudio 04/10/2026). Etapa nova no
 * fluxo, ANTES do responsável: depois do envio, cada aprovador clica
 * Aprovar, em qualquer ordem; só quando todos aprovaram o responsável pode
 * aprovar a 1ª etapa. Qualquer aprovador devolve (com motivo) e a devolução
 * zera as aprovações. Sem aprovador, o fluxo é o de antes.
 *
 * Só usuários. O status do documento continua "aprovacao" durante a etapa
 * (trava, visibilidade e revisão não mudam); quem decide se a vez é dos
 * aprovadores ou do responsável é pending().
 * Sem classe CommonDBTM de propósito, como DocumentContributor.
 */
final class DocumentApprover
{
    /** @var array<int, array<int, ?string>> doc => [users_id => date_approved] */
    private static array $cache = [];

    /** @return array<int, ?string> users_id => data em que aprovou (null = pendente), na ordem escolhida */
    public static function rows(int $documentId): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        if ($documentId <= 0) {
            return [];
        }
        if (!isset(self::$cache[$documentId])) {
            $out = [];
            foreach ($DB->request([
                'SELECT' => ['users_id', 'date_approved'],
                'FROM'   => Install::DOC_APPROVERS_TABLE,
                'WHERE'  => ['plugin_codexplus_documents_id' => $documentId, 'users_id' => ['>', 0]],
                'ORDER'  => ['id ASC'],
            ]) as $row) {
                $out[(int) $row['users_id']] = $row['date_approved'] ? (string) $row['date_approved'] : null;
            }
            self::$cache[$documentId] = $out;
        }
        return self::$cache[$documentId];
    }

    /** @return int[] */
    public static function ids(int $documentId): array
    {
        return array_keys(self::rows($documentId));
    }

    public static function has(int $documentId, int $userId): bool
    {
        return $userId > 0 && array_key_exists($userId, self::rows($documentId));
    }

    /** @return int[] quem ainda não aprovou */
    public static function pending(int $documentId): array
    {
        return array_keys(array_filter(self::rows($documentId), static fn ($d) => $d === null));
    }

    public static function hasApproved(int $documentId, int $userId): bool
    {
        $r = self::rows($documentId);
        return $userId > 0 && isset($r[$userId]);
    }

    /**
     * Grava a lista (diferença com a gravada). Quem continua mantém a data.
     *
     * @param int[] $userIds
     * @return array{0: int[], 1: int[]} [antes, depois]
     */
    public static function set(int $documentId, array $userIds): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $antes  = self::ids($documentId);
        $depois = DocumentEditor::normalize($userIds);
        foreach (array_diff($antes, $depois) as $uid) {
            $DB->delete(Install::DOC_APPROVERS_TABLE, ['plugin_codexplus_documents_id' => $documentId, 'users_id' => $uid]);
        }
        $now = $_SESSION['glpi_currenttime'] ?? date('Y-m-d H:i:s');
        foreach (array_diff($depois, $antes) as $uid) {
            $DB->insert(Install::DOC_APPROVERS_TABLE, [
                'plugin_codexplus_documents_id' => $documentId,
                'users_id'                      => $uid,
                'date_approved'                 => null,
                'date_creation'                 => $now,
            ]);
        }
        unset(self::$cache[$documentId]);
        return [$antes, self::ids($documentId)];
    }

    /** Registra a aprovação de um aprovador (agora). */
    public static function approve(int $documentId, int $userId): bool
    {
        /** @var \DBmysql $DB */
        global $DB;

        $ok = $DB->update(Install::DOC_APPROVERS_TABLE, [
            'date_approved' => $_SESSION['glpi_currenttime'] ?? date('Y-m-d H:i:s'),
        ], ['plugin_codexplus_documents_id' => $documentId, 'users_id' => $userId]);
        unset(self::$cache[$documentId]);
        return (bool) $ok;
    }

    /** Zera as aprovações (envio para validação e devolução). */
    public static function reset(int $documentId): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $DB->update(Install::DOC_APPROVERS_TABLE, ['date_approved' => null], ['plugin_codexplus_documents_id' => $documentId]);
        unset(self::$cache[$documentId]);
    }

    /**
     * AP-1: quem aprovou na rodada que está valendo, na ordem da lista
     * (users_id => data). Gravado na versão no momento da publicação: as
     * datas só são zeradas no envio e na devolução, então na publicação
     * ainda são as da rodada que publicou.
     *
     * @return array<int, string>
     */
    public static function approved(int $documentId): array
    {
        return array_filter(self::rows($documentId), static fn ($d) => $d !== null);
    }

    /**
     * AP-1: "Ana (05/10/2026), Bruno (pendente)" a partir de users_id => data
     * (null = pendente). $comStatus false = só os nomes.
     *
     * @param array<int, ?string> $rows
     */
    public static function format(array $rows, bool $comStatus = true): string
    {
        $out = [];
        foreach ($rows as $uid => $quando) {
            $nome = getUserName((int) $uid);
            if ($comStatus) {
                $nome .= $quando
                    ? ' (' . date('d/m/Y', strtotime((string) $quando)) . ')'
                    : ' (' . __('pendente', 'codexplus') . ')';
            }
            $out[] = $nome;
        }
        return implode(', ', $out);
    }

    public static function purgeDocument(int $documentId): void
    {
        /** @var \DBmysql $DB */
        global $DB;
        $DB->delete(Install::DOC_APPROVERS_TABLE, ['plugin_codexplus_documents_id' => $documentId]);
        unset(self::$cache[$documentId]);
    }
}
