<?php
namespace GlpiPlugin\Codexplus;

use Session;

/**
 * Eventos da revisão de um documento publicado (R6-b, Claudio, 04/10/2026).
 *
 * Uma linha por acontecimento em glpi_plugin_codexplus_revisionevents:
 *   - aberta        : revisão aberta, com o prazo (date_due);
 *   - prorrogada    : prazo mudou, com o novo prazo e o motivo (obrigatório);
 *   - sem_alteracao : "Revisado sem alteração" (renova a janela, a revisão não sobe);
 *   - cancelada     : revisão descartada.
 * A publicação não entra aqui: está em DocumentVersion (uma linha por revisão).
 *
 * Não é CommonDBTM (como DocumentVersion): a permissão é a do documento,
 * checada antes; a limpeza vai no cleanDBonPurge do Document.
 */
class RevisionEvent
{
    public const OPENED    = 'aberta';
    public const EXTENDED  = 'prorrogada';
    public const NO_CHANGE = 'sem_alteracao';
    public const CANCELED  = 'cancelada';

    public static function getTable(): string
    {
        return Install::REV_EVENTS_TABLE;
    }

    public static function add(int $docId, int $revision, string $event, ?string $due = null, string $reason = ''): bool
    {
        /** @var \DBmysql $DB */
        global $DB;

        if (!in_array($event, [self::OPENED, self::EXTENDED, self::NO_CHANGE, self::CANCELED], true)) {
            return false;
        }
        return (bool) $DB->insert(self::getTable(), [
            'plugin_codexplus_documents_id' => $docId,
            'revision'      => $revision,
            'event'         => $event,
            'date_due'      => $due === null || $due === '' ? null : substr($due, 0, 10),
            'reason'        => trim($reason) === '' ? null : trim($reason),
            'users_id'      => (int) Session::getLoginUserID(),
            'date_creation' => $_SESSION['glpi_currenttime'] ?? date('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Eventos do documento, em ordem de acontecimento. $events filtra o tipo;
     * $revision filtra a revisão.
     *
     * @param string[] $events
     * @return array<int, array<string, mixed>>
     */
    public static function listFor(int $docId, array $events = [], ?int $revision = null): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $where = ['plugin_codexplus_documents_id' => $docId];
        if ($events) {
            $where['event'] = $events;
        }
        if ($revision !== null) {
            $where['revision'] = $revision;
        }
        $out = [];
        foreach ($DB->request([
            'FROM'  => self::getTable(),
            'WHERE' => $where,
            'ORDER' => ['date_creation ASC', 'id ASC'],
        ]) as $r) {
            $uid   = (int) $r['users_id'];
            $out[] = [
                'revision' => (int) $r['revision'],
                'event'    => (string) $r['event'],
                'due'      => (string) ($r['date_due'] ?? ''),
                'reason'   => (string) ($r['reason'] ?? ''),
                'user'     => $uid > 0 ? getUserName($uid) : '',
                'date'     => (string) ($r['date_creation'] ?? ''),
            ];
        }
        return $out;
    }

    public static function purgeDocument(int $docId): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $DB->delete(self::getTable(), ['plugin_codexplus_documents_id' => $docId]);
    }
}
