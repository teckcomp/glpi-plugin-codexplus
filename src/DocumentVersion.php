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
            // M-2: a marca com que foi publicada.
            'plugin_codexplus_brands_id' => (int) ($doc->fields['plugin_codexplus_brands_id'] ?? 0),
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

    /**
     * R6-b2: linhas do histórico de revisões impresso no fim do PDF — uma por
     * publicação (revisão, data, resumo, quem publicou) e uma por "Revisado
     * sem alteração", em ordem de data, até a revisão $upTo (a que está sendo
     * impressa). Revisão cancelada não entra (não foi publicada).
     * $current: o documento, para o publicado antes da R6 que ainda não tem
     * a cópia da versão (entra a publicação atual).
     *
     * @return array<int, array{rev: string, date: string, what: string, who: string}>
     */
    public static function history(int $documentId, int $upTo, ?Document $current = null): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $rows = [];
        $fmt  = static fn (string $d) => $d === '' ? '' : date('d/m/Y', strtotime($d));
        $who  = static fn (int $u) => $u > 0 ? getUserName($u) : '';
        $revs = [];
        foreach ($DB->request([
            'SELECT' => ['revision', 'summary', 'users_id', 'date_published'],
            'FROM'   => self::getTable(),
            'WHERE'  => ['plugin_codexplus_documents_id' => $documentId, 'revision' => ['<=', $upTo]],
            'ORDER'  => ['revision ASC'],
        ]) as $r) {
            $rev = (int) $r['revision'];
            $revs[$rev] = true;
            $sum = trim((string) ($r['summary'] ?? ''));
            $rows[] = [
                'sort' => (string) ($r['date_published'] ?? '') . sprintf('|%04d|0', $rev),
                'rev'  => sprintf(':%02d', $rev),
                'date' => $fmt((string) ($r['date_published'] ?? '')),
                'what' => $sum !== '' ? $sum : ($rev === 0 ? __('Emissão inicial', 'codexplus') : __('Revisão publicada', 'codexplus')),
                'who'  => $who((int) $r['users_id']),
            ];
        }
        // Publicado antes da R6, sem a cópia da versão: a publicação atual.
        if ($current !== null && !isset($revs[$upTo])
            && in_array((string) ($current->fields['status'] ?? ''), [Document::STATUS_PUBLISHED, Document::STATUS_OBSOLETE], true)
            && (int) $current->fields['revision'] === $upTo
            && !empty($current->fields['date_published'])) {
            $rows[] = [
                'sort' => (string) $current->fields['date_published'] . sprintf('|%04d|0', $upTo),
                'rev'  => sprintf(':%02d', $upTo),
                'date' => $fmt((string) $current->fields['date_published']),
                'what' => $upTo === 0 ? __('Emissão inicial', 'codexplus') : __('Revisão publicada', 'codexplus'),
                'who'  => $who((int) ($current->fields['users_id_validator'] ?? 0)),
            ];
        }
        foreach (RevisionEvent::listFor($documentId, [RevisionEvent::NO_CHANGE]) as $e) {
            if ($e['revision'] > $upTo) {
                continue;
            }
            $rows[] = [
                'sort' => $e['date'] . sprintf('|%04d|1', $e['revision']),
                'rev'  => sprintf(':%02d', $e['revision']),
                'date' => $fmt($e['date']),
                'what' => __('Revisado sem alteração', 'codexplus'),
                'who'  => $e['user'],
            ];
        }
        usort($rows, static fn ($a, $b) => strcmp($a['sort'], $b['sort']));
        return array_map(static function ($r) {
            unset($r['sort']);
            return $r;
        }, $rows);
    }

    /**
     * HV-1: publicações do documento (sem corpo nem diagrama), para o
     * Histórico.
     *
     * @return array<int, array{revision: int, summary: ?string, users_id: int, date_published: string}>
     */
    public static function listFor(int $documentId): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $out = [];
        foreach ($DB->request([
            'SELECT' => ['revision', 'summary', 'users_id', 'date_published'],
            'FROM'   => self::getTable(),
            'WHERE'  => ['plugin_codexplus_documents_id' => $documentId],
            'ORDER'  => ['revision ASC'],
        ]) as $r) {
            $out[] = [
                'revision'       => (int) $r['revision'],
                'summary'        => $r['summary'],
                'users_id'       => (int) $r['users_id'],
                'date_published' => (string) ($r['date_published'] ?? ''),
            ];
        }
        return $out;
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
