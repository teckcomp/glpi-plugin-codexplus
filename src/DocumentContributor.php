<?php
namespace GlpiPlugin\Codexplus;

/**
 * Quem alterou o documento em cada revisão (Etapa R3c). Existe para uma
 * regra só: quem editou não valida o próprio documento (decisão de Claudio,
 * 20/09/2026). Sem classe CommonDBTM de propósito: é registro técnico,
 * gravado por Document (criação e mudança de conteúdo), sem tela e sem
 * Histórico próprio.
 */
final class DocumentContributor
{
    public static function record(int $documentId, int $revision, int $userId): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        if ($documentId <= 0 || $userId <= 0) {
            return;
        }
        $now = $_SESSION['glpi_currenttime'] ?? date('Y-m-d H:i:s');
        $where = [
            'plugin_codexplus_documents_id' => $documentId,
            'revision'                      => $revision,
            'users_id'                      => $userId,
        ];
        if (countElementsInTable(Install::DOC_CONTRIB_TABLE, $where) > 0) {
            $DB->update(Install::DOC_CONTRIB_TABLE, ['date_mod' => $now], $where);
        } else {
            $DB->insert(Install::DOC_CONTRIB_TABLE, $where + ['date_mod' => $now]);
        }
    }

    public static function has(int $documentId, int $revision, int $userId): bool
    {
        if ($documentId <= 0 || $userId <= 0) {
            return false;
        }
        return countElementsInTable(Install::DOC_CONTRIB_TABLE, [
            'plugin_codexplus_documents_id' => $documentId,
            'revision'                      => $revision,
            'users_id'                      => $userId,
        ]) > 0;
    }

    public static function purgeDocument(int $documentId): void
    {
        /** @var \DBmysql $DB */
        global $DB;
        $DB->delete(Install::DOC_CONTRIB_TABLE, ['plugin_codexplus_documents_id' => $documentId]);
    }
}
