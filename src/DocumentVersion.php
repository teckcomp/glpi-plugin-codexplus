<?php
namespace GlpiPlugin\Codexplus;

use Session;

/**
 * Versões publicadas do documento (R6-a, Claudio, 21/09/2026).
 *
 * Uma linha por revisão publicada (:00, :01…) em
 * glpi_plugin_codexplus_documentversions (tabela da R1): título, corpo,
 * diagrama (JSON), resumo do que mudou, quem validou e quando. É o que os
 * leitores veem enquanto a revisão seguinte está em andamento, e a base do
 * histórico de revisões no PDF (R6-b).
 *
 * Não é CommonDBTM: a permissão é sempre a do documento, checada antes (como
 * em Diagram). Por isso também não entra em getDatabaseRelations (achado 38:
 * "DocumentVersion" não seria achado a partir do nome da tabela); a limpeza
 * vai no cleanDBonPurge do Document.
 *
 * Gravada: ao publicar (Document::approve) e, se faltar, ao abrir a revisão —
 * documento publicado antes da R6 ganha a cópia da versão em vigor nesse
 * momento, antes de qualquer alteração.
 */
class DocumentVersion
{
    public static function getTable(): string
    {
        return Install::VERSIONS_TABLE;
    }

    /** Grava (ou regrava) a revisão atual do documento como versão publicada. */
    public static function snapshot(Document $doc): bool
    {
        /** @var \DBmysql $DB */
        global $DB;

        $id  = (int) $doc->fields['id'];
        $rev = (int) $doc->fields['revision'];
        $raw = null;
        foreach ($DB->request([
            'SELECT' => ['data'],
            'FROM'   => Diagram::getTable(),
            'WHERE'  => ['plugin_codexplus_documents_id' => $id],
            'LIMIT'  => 1,
        ]) as $row) {
            $raw = (string) $row['data'];
        }
        $linha = [
            'name'           => (string) $doc->fields['name'],
            'content'        => (string) ($doc->fields['content'] ?? ''),
            'diagram'        => $raw,
            'summary'        => $doc->fields['revision_summary'] ?? null,
            'users_id'       => (int) ($doc->fields['users_id_validator'] ?? 0),
            'date_published' => $doc->fields['date_published'] ?: ($_SESSION['glpi_currenttime'] ?? date('Y-m-d H:i:s')),
        ];
        $existe = self::get($id, $rev);
        if ($existe !== null) {
            return (bool) $DB->update(self::getTable(), $linha, ['id' => (int) $existe['id']]);
        }
        return (bool) $DB->insert(self::getTable(), $linha + [
            'plugin_codexplus_documents_id' => $id,
            'revision'                      => $rev,
            'date_creation'                 => $_SESSION['glpi_currenttime'] ?? date('Y-m-d H:i:s'),
        ]);
    }

    /** @return array<string, mixed>|null */
    public static function get(int $documentId, int $revision): ?array
    {
        /** @var \DBmysql $DB */
        global $DB;

        foreach ($DB->request([
            'FROM'  => self::getTable(),
            'WHERE' => ['plugin_codexplus_documents_id' => $documentId, 'revision' => $revision],
            'LIMIT' => 1,
        ]) as $row) {
            return $row;
        }
        return null;
    }

    /**
     * Diagrama guardado na versão, validado como o de trabalho (ou null).
     *
     * @return array<string, mixed>|null
     */
    public static function diagramOf(array $version): ?array
    {
        if (empty($version['diagram'])) {
            return null;
        }
        return Diagram::validate(json_decode((string) $version['diagram'], true));
    }

    /** Apaga as versões de uma revisão em diante (cancelar revisão não usa; purga usa 0). */
    public static function purgeDocument(int $documentId): void
    {
        /** @var \DBmysql $DB */
        global $DB;
        $DB->delete(self::getTable(), ['plugin_codexplus_documents_id' => $documentId]);
    }
}
