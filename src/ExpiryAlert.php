<?php

namespace GlpiPlugin\Codexplus;

use CommonGLPI;
use CronTask;
use User;

/**
 * Alerta de vencimento (Etapa 7, bloco 7a — Claudio, 04/10/2026).
 *
 * Ação automática do GLPI (`codexplusexpiry`, uma vez por dia) que encontra
 * os documentos em situação de alerta e grava a marca de "já avisado" em
 * Install::EXPIRY_ALERTS_TABLE, para não repetir:
 *
 *   - avencer  publicado, faltando até 30 dias para o fim da validade
 *              (DocumentMeta::EXPIRY_WINDOW_DAYS, a mesma janela do Painel):
 *              UMA vez;
 *   - vencido  publicado com a validade passada: uma vez e depois um lembrete
 *              a cada 7 dias enquanto continuar vencido;
 *   - revisao  revisão aberta com o prazo estourado (R6-b): como o vencido.
 *
 * Validade 0 (proposta, diversos) nunca vence. Rascunho e obsoleto não
 * entram (só a revisão atrasada olha documento em revisão).
 *
 * Cada marca é presa ao CICLO (a data de vencimento, ou revisão + prazo):
 * quando a validade se renova (nova publicação, "revisado sem alteração",
 * janela mudada à mão) ou o prazo da revisão muda, o ciclo é outro e o aviso
 * volta a valer, sem precisar apagar nada.
 *
 * Quem recebe: responsável, revisor e auditor do documento (decisão de
 * Claudio — não existe mais gestor do setor desde o P1), só usuários
 * ativos e não excluídos, sem repetir a mesma pessoa.
 *
 * O 7a só encontra, marca e registra no log da ação automática; o e-mail
 * (notificação nativa do GLPI) entra no 7b, em deliver().
 */
final class ExpiryAlert extends CommonGLPI
{
    public const CRON_NAME   = 'codexplusexpiry';
    public const KIND_SOON   = 'avencer';
    public const KIND_DUE    = 'vencido';
    public const KIND_REVIEW = 'revisao';
    /** Lembrete enquanto vencido ou com a revisão atrasada. */
    public const REPEAT_DAYS = 7;

    public static function getTypeName($nb = 0)
    {
        return __('Alerta de vencimento (Codex+)', 'codexplus');
    }

    public static function getTable(): string
    {
        return Install::EXPIRY_ALERTS_TABLE;
    }

    /** @return array{description: string} */
    public static function cronInfo($name): array
    {
        return ['description' => __('Codex+: avisa documentos a vencer, vencidos e com revisão atrasada', 'codexplus')];
    }

    /** Ação automática: uma linha no log por aviso. */
    public static function cronCodexplusexpiry(CronTask $task): int
    {
        $feitos = self::run();
        foreach ($feitos as $a) {
            $task->log(sprintf(
                '%s %s → %s',
                $a['code'],
                self::label($a['kind']) . ($a['times'] > 1 ? ' (lembrete ' . $a['times'] . ')' : ''),
                $a['names'] !== [] ? implode(', ', $a['names']) : __('sem destinatário', 'codexplus')
            ));
        }
        $task->addVolume(count($feitos));
        return $feitos === [] ? 0 : 1;
    }

    public static function label(string $kind): string
    {
        return [
            self::KIND_SOON   => __('a vencer', 'codexplus'),
            self::KIND_DUE    => __('vencido', 'codexplus'),
            self::KIND_REVIEW => __('revisão atrasada', 'codexplus'),
        ][$kind] ?? $kind;
    }

    /**
     * Passa por todos os documentos e devolve os avisos feitos agora.
     *
     * @return list<array{doc: int, code: string, name: string, kind: string, cycle: string, due: string, times: int, users: int[], names: string[]}>
     */
    public static function run(): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        if (!$DB->tableExists(self::getTable())) {
            return [];
        }
        $now = (string) ($_SESSION['glpi_currenttime'] ?? date('Y-m-d H:i:s'));
        $out = [];
        foreach ($DB->request([
            'FROM'  => Install::DOCUMENTS_TABLE,
            'WHERE' => ['is_deleted' => 0, 'NOT' => ['sequence' => 0]],
            'ORDER' => 'id',
        ]) as $row) {
            foreach (self::situations($row) as $sit) {
                $a = self::mark((int) $row['id'], $sit['kind'], $sit['cycle'], $now, $sit['kind'] !== self::KIND_SOON);
                if ($a === null) {
                    continue;
                }
                $users = self::recipients($row);
                self::deliver($row, $sit['kind'], $sit['due'], $users, $a);
                self::saveUsers($a['id'], $users);
                $out[] = [
                    'doc'   => (int) $row['id'],
                    'code'  => self::code($row),
                    'name'  => (string) ($row['name'] ?? ''),
                    'kind'  => $sit['kind'],
                    'cycle' => $sit['cycle'],
                    'due'   => $sit['due'],
                    'times' => $a['times'],
                    'users' => $users,
                    'names' => array_map(static fn ($u) => (string) getUserName($u), $users),
                ];
            }
        }
        return $out;
    }

    /**
     * Situações de alerta de um documento agora (zero, uma ou duas).
     *
     * @param array<string, mixed> $row
     * @return list<array{kind: string, cycle: string, due: string}>
     */
    public static function situations(array $row): array
    {
        $out = [];
        $exp = DocumentMeta::expiryState(
            $row['date_published'] ?? null,
            (int) ($row['validity_months'] ?? 0),
            (string) ($row['status'] ?? ''),
            $row['review_end'] ?? null
        );
        if (in_array($exp['state'], [self::KIND_SOON, self::KIND_DUE], true) && $exp['due'] !== null) {
            $due = date('Y-m-d', (int) $exp['due']);
            $out[] = ['kind' => $exp['state'], 'cycle' => $due, 'due' => $due];
        }
        // Revisão aberta (R6-a): revisão > 0 e status de etapa; prazo em revision_due.
        $emRevisao = (int) ($row['revision'] ?? 0) > 0
            && in_array((string) ($row['status'] ?? ''), [Document::STATUS_DRAFT, Document::STATUS_APPROVAL, Document::STATUS_VALIDATION], true);
        if ($emRevisao && !empty($row['revision_due'])) {
            $st = Document::dueState((string) $row['revision_due']);
            if ($st['state'] === 'atrasada') {
                $out[] = ['kind' => self::KIND_REVIEW, 'cycle' => 'r' . (int) $row['revision'] . ':' . $st['due'], 'due' => $st['due']];
            }
        }
        return $out;
    }

    /**
     * Grava a marca. Devolve null quando não é hora de avisar (já avisado
     * neste ciclo; ou, com repetição, avisado há menos de 7 dias).
     *
     * @return array{id: int, times: int}|null
     */
    private static function mark(int $docId, string $kind, string $cycle, string $now, bool $repeat): ?array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $where = ['plugin_codexplus_documents_id' => $docId, 'kind' => $kind, 'cycle' => $cycle];
        $cur = $DB->request(['FROM' => self::getTable(), 'WHERE' => $where, 'LIMIT' => 1])->current();
        if ($cur === null) {
            $DB->insert(self::getTable(), $where + ['times' => 1, 'date_first' => $now, 'date_last' => $now]);
            return ['id' => (int) $DB->insertId(), 'times' => 1];
        }
        if (!$repeat) {
            return null;
        }
        $limite = date('Y-m-d H:i:s', strtotime($now . ' -' . self::REPEAT_DAYS . ' days') + 3600); // 1 h de folga: a ação roda no mesmo horário todo dia
        if ((string) $cur['date_last'] > $limite) {
            return null;
        }
        $vezes = (int) $cur['times'] + 1;
        $DB->update(self::getTable(), ['times' => $vezes, 'date_last' => $now], ['id' => (int) $cur['id']]);
        return ['id' => (int) $cur['id'], 'times' => $vezes];
    }

    private static function saveUsers(int $id, array $users): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $DB->update(self::getTable(), ['users' => implode(',', $users)], ['id' => $id]);
    }

    /**
     * Responsável, revisor e auditor (ativos, não excluídos, sem repetir).
     *
     * @param array<string, mixed> $row
     * @return int[]
     */
    public static function recipients(array $row): array
    {
        $ids = [];
        foreach (['users_id_owner', 'users_id_reviewer', 'users_id_auditor'] as $f) {
            $u = (int) ($row[$f] ?? 0);
            if ($u <= 0 || isset($ids[$u])) {
                continue;
            }
            $user = new User();
            if ($user->getFromDB($u) && !empty($user->fields['is_active']) && empty($user->fields['is_deleted'])) {
                $ids[$u] = $u;
            }
        }
        return array_values($ids);
    }

    /**
     * Ponto do e-mail (7b): notificação nativa do GLPI aos destinatários.
     * No 7a não envia nada; o aviso fica marcado e no log da ação automática.
     *
     * @param array<string, mixed> $row
     * @param int[] $users
     * @param array{id: int, times: int} $alert
     */
    private static function deliver(array $row, string $kind, string $due, array $users, array $alert): void
    {
    }

    /** @param array<string, mixed> $row */
    private static function code(array $row): string
    {
        return sprintf('%s%04d:%02d', (string) $row['doctype'], (int) $row['sequence'], (int) ($row['revision'] ?? 0));
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
