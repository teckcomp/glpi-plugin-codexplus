<?php

namespace GlpiPlugin\Codexplus;

/**
 * Situação das tarefas do cronograma com datas (bloco Q7b-4, Claudio,
 * 04/10/2026).
 *
 * O PLANEJAMENTO (tarefas, datas, responsáveis) fica no JSON do diagrama e
 * só muda com revisão. O ACOMPANHAMENTO fica aqui: uma linha por tarefa
 * (documento + id fixo da linha do JSON), marcada no documento publicado sem
 * abrir revisão, com quem e quando. Sobrevive às revisões: tarefa que
 * continua existindo (mesmo id) mantém a situação.
 *
 * Nada calculado é gravado: atrasada, concluída com atraso, % da fase,
 * marco atrasado e o resumo saem na hora, no navegador
 * (public/js/codexplus-grid.js).
 *
 * Sem CommonDBTM de propósito, como DocumentContributor: registro técnico,
 * sem tela própria e sem Histórico.
 */
final class ScheduleStatus
{
    public const STATE_STARTED = 'andamento';
    public const STATE_DONE    = 'concluida';
    public const ACTIONS       = ['iniciar', 'concluir', 'reabrir'];

    public static function getTable(): string
    {
        return Install::SCHEDULE_TABLE;
    }

    /**
     * Situação gravada de um documento, por id da linha.
     *
     * @return array<string, array<string, mixed>>
     */
    public static function load(int $documentId): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $out = [];
        if ($documentId <= 0 || !$DB->tableExists(self::getTable())) {
            return $out;
        }
        $nomes = [];
        foreach ($DB->request([
            'FROM'  => self::getTable(),
            'WHERE' => ['plugin_codexplus_documents_id' => $documentId],
        ]) as $row) {
            $uid = (int) $row['users_id'];
            if ($uid > 0 && !isset($nomes[$uid])) {
                $nomes[$uid] = (string) getUserName($uid);
            }
            $out[(string) $row['row_key']] = [
                'state' => (string) $row['state'],
                'start' => $row['date_start'] ? substr((string) $row['date_start'], 0, 10) : '',
                'done'  => $row['date_done'] ? substr((string) $row['date_done'], 0, 10) : '',
                'user'  => $uid > 0 ? $nomes[$uid] : '',
                'when'  => (string) ($row['date_mod'] ?? ''),
            ];
        }
        return $out;
    }

    /**
     * Diagrama que a leitura mostra: o atual se publicado; durante uma
     * revisão, a versão publicada guardada (R6-a).
     *
     * @return array<string, mixed>|null
     */
    public static function shownDiagram(Document $doc): ?array
    {
        $id = (int) $doc->fields['id'];
        if ($doc->isInRevision()) {
            $v = DocumentVersion::get($id, (int) $doc->fields['revision'] - 1);
            return $v !== null ? DocumentVersion::diagramOf($v) : null;
        }
        $d = Diagram::load($id);
        return $d['data'] ?? null;
    }

    /**
     * Ids das TAREFAS de um cronograma com datas (fase e marco não se marcam).
     *
     * @return string[]
     */
    public static function taskKeys(?array $data): array
    {
        if (!is_array($data) || ($data['mode'] ?? '') !== Diagram::SCHEDULE_MODE_DATES) {
            return [];
        }
        $out = [];
        foreach ((array) ($data['rows'] ?? []) as $r) {
            if (is_array($r) && !isset($r['type']) && ($r['id'] ?? '') !== '') {
                $out[] = (string) $r['id'];
            }
        }
        return $out;
    }

    /**
     * Iniciar: em andamento, com a data de início real (a que já houver ou
     * hoje); tarefa concluída fica como está.
     * Concluir: concluída na data informada (o início real fica, ou vira essa data).
     * Reabrir: volta a em andamento (se já tinha início) ou a não iniciada.
     *
     * @param string[] $keys
     * @return int quantas linhas mudaram
     */
    public static function apply(int $documentId, array $keys, string $action, string $date, int $userId): int
    {
        /** @var \DBmysql $DB */
        global $DB;

        $now  = $_SESSION['glpi_currenttime'] ?? date('Y-m-d H:i:s');
        $hoje = substr($now, 0, 10);
        $atual = self::load($documentId);
        $n = 0;
        foreach ($keys as $k) {
            $k   = (string) $k;
            $cur = $atual[$k] ?? null;
            $where = ['plugin_codexplus_documents_id' => $documentId, 'row_key' => $k];
            if ($action === 'reabrir') {
                if ($cur === null) {
                    continue;
                }
                if ($cur['start'] !== '') {
                    if ($cur['state'] === self::STATE_STARTED) {
                        continue;
                    }
                    $DB->update(self::getTable(), ['state' => self::STATE_STARTED, 'date_done' => null, 'users_id' => $userId, 'date_mod' => $now], $where);
                } else {
                    $DB->delete(self::getTable(), $where);
                }
                $n++;
                continue;
            }
            if ($action === 'iniciar') {
                if ($cur !== null && $cur['state'] === self::STATE_DONE) {
                    continue;
                }
                if ($cur !== null && $cur['state'] === self::STATE_STARTED) {
                    continue;
                }
                $ini    = $cur !== null && $cur['start'] !== '' ? $cur['start'] : $hoje;
                $campos = ['state' => self::STATE_STARTED, 'date_start' => $ini, 'date_done' => null];
            } else {
                $campos = ['state' => self::STATE_DONE, 'date_start' => ($cur['start'] ?? '') !== '' ? $cur['start'] : $date, 'date_done' => $date];
            }
            $campos += ['users_id' => $userId, 'date_mod' => $now];
            if ($cur === null) {
                $DB->insert(self::getTable(), $where + $campos);
            } else {
                $DB->update(self::getTable(), $campos, $where);
            }
            $n++;
        }
        return $n;
    }

    /** Data AAAA-MM-DD válida, de 1990 até amanhã (conclusão não fica no futuro). */
    public static function validDate(string $s): bool
    {
        if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $s, $m) || !checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
            return false;
        }
        $amanha = date('Y-m-d', strtotime(substr((string) ($_SESSION['glpi_currenttime'] ?? date('Y-m-d')), 0, 10) . ' +1 day'));
        return $s >= '1990-01-01' && $s <= $amanha;
    }

    public static function purgeDocument(int $documentId): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        if ($DB->tableExists(self::getTable())) {
            $DB->delete(self::getTable(), ['plugin_codexplus_documents_id' => $documentId]);
        }
    }
}
