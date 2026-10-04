<?php
namespace GlpiPlugin\Codexplus;

use Session;

/**
 * Histórico do documento (HV-1, Claudio, 04/10/2026).
 *
 * "Toda e qualquer alteração realizada no documento", numa lista só, do mais
 * recente para o mais antigo. Junta três fontes que já existiam:
 *   - glpi_logs do documento (Log::getHistoryData): campos com opção de
 *     busca, status, ligações (categorias, alvos de leitura, anexos) e as
 *     mensagens simples (aprovações, editores, aprovadores…);
 *   - versões publicadas (DocumentVersion): a publicação de cada revisão,
 *     com o resumo do que mudou;
 *   - eventos da revisão (RevisionEvent): aberta, prorrogada (com motivo),
 *     revisado sem alteração, cancelada.
 * E grava em glpi_logs, como mensagem simples (note()), o que antes não
 * deixava rastro: corpo, cabeçalho e rodapé, diagrama, campos sem opção de
 * busca (marca, cliente vinculado, prazo da revisão…), link público e
 * documentos vinculados. Acessos pelo link não entram: não alteram nada.
 *
 * Quem vê: quem tem papel no documento, o Super-Admin e quem tem Ver todos
 * (Document::canSeeHistory()). Leitor comum, não.
 */
final class DocumentHistory
{
    /** Linhas mostradas; a tela avisa quando há mais. */
    public const LIMIT = 300;

    /** Mesma mensagem, mesma pessoa, dentro desta janela: uma linha só. */
    public const COLLAPSE_MINUTES = 10;

    /**
     * Rótulos dos campos que não têm opção de busca (o GLPI não os
     * registra). Campo fora desta lista e sem opção de busca entra pelo
     * nome da coluna — melhor feio que sumido.
     */
    private static function labels(): array
    {
        return [
            'plugin_codexplus_brands_id' => __('Marca', 'codexplus'),
            'client_itemtype'            => __('Cliente vinculado (tipo)', 'codexplus'),
            'client_items_id'            => __('Cliente vinculado', 'codexplus'),
        ];
    }

    /** Texto longo: registra que mudou, sem o conteúdo. */
    private static function longFields(): array
    {
        return [
            'content'     => __('Corpo do documento alterado', 'codexplus'),
            'header_html' => __('Cabeçalho alterado', 'codexplus'),
            'footer_text' => __('Rodapé alterado', 'codexplus'),
        ];
    }

    /**
     * Colunas que nunca viram linha própria: datas automáticas, o link
     * público (tem mensagem própria em note()) e is_deleted (o GLPI já
     * registra excluir e restaurar).
     */
    private const SKIP = [
        'id', 'date_mod', 'date_creation', 'is_deleted',
        // Consequência do fluxo, já contada pelo status e pelos eventos da
        // revisão (aberta com prazo, prorrogada): não repete.
        'date_submitted', 'revision_due',
        'anon_token', 'anon_users_id', 'anon_date', 'anon_hits', 'anon_last',
    ];

    /** @var array<string, string[]>|null colunas registradas pelo GLPI, por tabela */
    private static ?array $logged = null;

    /**
     * Colunas que o próprio GLPI registra (têm opção de busca, achado 33).
     *
     * @return string[]
     */
    public static function loggedByGlpi(Document $doc): array
    {
        if (self::$logged !== null) {
            return self::$logged;
        }
        $out = [];
        foreach ($doc->rawSearchOptions() as $o) {
            if (!isset($o['table'], $o['field'])) {
                continue;
            }
            if (!empty($o['linkfield'])) {
                $out[] = (string) $o['linkfield'];
            } elseif ($o['table'] === $doc->getTable()) {
                $out[] = (string) $o['field'];
            } else {
                $out[] = getForeignKeyFieldForTable((string) $o['table']);
            }
        }
        return self::$logged = array_values(array_unique($out));
    }

    /**
     * Grava uma mensagem simples no Histórico do documento. A mesma
     * mensagem da mesma pessoa dentro de COLLAPSE_MINUTES não repete (o
     * quadro grava por AJAX a cada Salvar; o addFiles regrava o corpo).
     */
    public static function note(int $docId, string $message): bool
    {
        /** @var \DBmysql $DB */
        global $DB;

        if ($docId <= 0 || trim($message) === '') {
            return false;
        }
        $uid  = Session::getLoginUserID(false);
        $who  = is_numeric($uid) ? \User::getNameForLog((int) $uid) : (string) $uid;
        $now  = (string) ($_SESSION['glpi_currenttime'] ?? date('Y-m-d H:i:s'));
        $from = date('Y-m-d H:i:s', strtotime($now) - self::COLLAPSE_MINUTES * 60);
        foreach ($DB->request([
            'SELECT' => ['new_value', 'user_name', 'linked_action'],
            'FROM'   => \Log::getTable(),
            'WHERE'  => [
                'itemtype' => Document::class,
                'items_id' => $docId,
                'date_mod' => ['>=', $from],
            ],
            'ORDER'  => ['id DESC'],
            'LIMIT'  => 1,
        ]) as $last) {
            if ((int) $last['linked_action'] === \Log::HISTORY_LOG_SIMPLE_MESSAGE
                && (string) $last['new_value'] === mb_substr($message, 0, 255)
                && (string) $last['user_name'] === $who) {
                return false;
            }
        }
        return (bool) \Log::history($docId, Document::class, [0, '', $message], '', \Log::HISTORY_LOG_SIMPLE_MESSAGE);
    }

    /**
     * Depois de um update: registra o que o GLPI deixou passar (texto longo
     * e campos sem opção de busca). Chamado no post_updateItem.
     */
    public static function logUpdate(Document $doc): void
    {
        $id = (int) ($doc->fields['id'] ?? 0);
        if ($id <= 0 || !$doc->dohistory) {
            return;
        }
        $glpi   = self::loggedByGlpi($doc);
        $long   = self::longFields();
        $labels = self::labels();
        foreach ((array) $doc->updates as $field) {
            if (in_array($field, self::SKIP, true) || in_array($field, $glpi, true)) {
                continue;
            }
            if (isset($long[$field])) {
                self::note($id, $long[$field]);
                continue;
            }
            $antes  = self::show($field, $doc->oldvalues[$field] ?? '');
            $depois = self::show($field, $doc->fields[$field] ?? '');
            if ($antes === $depois) {
                continue;
            }
            self::note($id, sprintf(
                __('%1$s: %2$s → %3$s', 'codexplus'),
                $labels[$field] ?? $field,
                $antes,
                $depois
            ));
        }
    }

    /** Valor legível de um campo (chave estrangeira vira nome). */
    private static function show(string $field, $value): string
    {
        $v = trim((string) ($value ?? ''));
        if ($v === '' || ($v === '0' && str_ends_with($field, '_id'))) {
            return '—';
        }
        if ($field === 'plugin_codexplus_brands_id') {
            $b = Brand::get((int) $v);
            return $b !== null ? (string) $b['name'] : '#' . $v;
        }
        if (str_ends_with($field, '_id') && $field !== 'client_items_id') {
            $table = getTableNameForForeignKeyField($field);
            if ($table !== '') {
                return \Dropdown::getDropdownName($table, (int) $v, false, false);
            }
        }
        return mb_substr(self::fmtDate($v), 0, 80);
    }

    /**
     * Linhas do Histórico, da mais recente para a mais antiga.
     *
     * @return array{rows: array<int, array{date: string, user: string, what: string, kind: string}>, more: bool}
     */
    public static function entries(Document $doc, int $limit = self::LIMIT): array
    {
        $id   = (int) $doc->fields['id'];
        $rows = [];

        // 1) glpi_logs, lido e formatado aqui (o Log::getHistoryData do GLPI
        // devolve HTML escapado e frases genéricas como "Adicionar um
        // relacionamento com um item: X (1)").
        $fmtCode = static fn (int $rev) => sprintf(':%02d', $rev);
        $logs    = self::logRows($doc, $limit + 1);
        $more    = count($logs) > $limit;
        foreach (array_slice($logs, 0, $limit) as $h) {
            $rows[] = [
                'sort' => (string) $h['date_mod'] . sprintf('|%012d', (int) $h['id']),
                'date' => (string) $h['date_mod'],
                'user' => self::userLabel((string) ($h['user_name'] ?? '')),
                'what' => $h['what'],
                'kind' => $h['kind'],
            ];
        }

        // 2) Publicações (uma por revisão).
        foreach (DocumentVersion::listFor($id) as $v) {
            $sum = trim((string) ($v['summary'] ?? ''));
            $rev = (int) $v['revision'];
            $rows[] = [
                'sort' => (string) $v['date_published'] . '|zzzz1',
                'date' => (string) $v['date_published'],
                'user' => (int) $v['users_id'] > 0 ? getUserName((int) $v['users_id']) : '',
                'what' => sprintf(__('Publicada a revisão %s', 'codexplus'), $fmtCode($rev))
                    . ($sum !== '' ? ' — ' . $sum : ($rev === 0 ? ' — ' . __('Emissão inicial', 'codexplus') : ''))
                    // AP-1: quem aprovou esta versão.
                    . ($v['approvers'] !== [] ? ' — ' . sprintf(__('aprovadores: %s', 'codexplus'), DocumentApprover::format($v['approvers'])) : ''),
                'kind' => 'versao',
            ];
        }

        // 3) Eventos da revisão.
        $d = static fn (string $x) => $x === '' ? '' : date('d/m/Y', strtotime($x));
        foreach (RevisionEvent::listFor($id) as $e) {
            $code = $fmtCode((int) $e['revision']);
            switch ($e['event']) {
                case RevisionEvent::OPENED:
                    $what = sprintf(__('Revisão %s aberta', 'codexplus'), $code)
                        . ($e['due'] !== '' ? ' — ' . sprintf(__('prazo %s', 'codexplus'), $d($e['due'])) : '');
                    break;
                case RevisionEvent::EXTENDED:
                    $what = sprintf(__('Prazo da revisão %1$s prorrogado para %2$s', 'codexplus'), $code, $d($e['due']))
                        . ($e['reason'] !== '' ? ' — ' . sprintf(__('motivo: %s', 'codexplus'), $e['reason']) : '');
                    break;
                case RevisionEvent::NO_CHANGE:
                    $what = sprintf(__('Revisado sem alteração (%s)', 'codexplus'), $code);
                    break;
                case RevisionEvent::CANCELED:
                    $what = sprintf(__('Revisão %s cancelada', 'codexplus'), $code);
                    break;
                default:
                    continue 2;
            }
            $rows[] = [
                'sort' => $e['date'] . '|zzzz0',
                'date' => $e['date'],
                'user' => $e['user'],
                'what' => $what,
                'kind' => 'revisao',
            ];
        }

        usort($rows, static fn ($a, $b) => strcmp($b['sort'], $a['sort']));
        $rows = array_map(static function ($r) {
            unset($r['sort']);
            return $r;
        }, $rows);
        if (count($rows) > $limit) {
            $rows = array_slice($rows, 0, $limit);
            $more = true;
        }
        return ['rows' => $rows, 'more' => $more];
    }

    /**
     * Linhas do glpi_logs do documento, já em texto (mais recente primeiro).
     *
     * @return array<int, array{id: int, date_mod: string, user_name: string, what: string, kind: string}>
     */
    private static function logRows(Document $doc, int $limit): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $labels = [];
        foreach ($doc->rawSearchOptions() as $o) {
            if (isset($o['id'], $o['name']) && is_numeric($o['id'])) {
                $labels[(int) $o['id']] = (string) $o['name'];
            }
        }
        $out = [];
        foreach ($DB->request([
            'FROM'  => \Log::getTable(),
            'WHERE' => ['itemtype' => Document::class, 'items_id' => (int) $doc->fields['id']],
            'ORDER' => ['id DESC'],
            'LIMIT' => $limit,
        ]) as $r) {
            $acao = (int) $r['linked_action'];
            $novo = (string) ($r['new_value'] ?? '');
            $velho = (string) ($r['old_value'] ?? '');
            $kind = 'nota';
            switch ($acao) {
                case 0:
                    $opt  = (int) $r['id_search_option'];
                    $kind = 'campo';
                    $what = sprintf(
                        __('%1$s: %2$s → %3$s', 'codexplus'),
                        $labels[$opt] ?? sprintf(__('Campo %d', 'codexplus'), $opt),
                        self::logValue($opt, $velho),
                        self::logValue($opt, $novo)
                    );
                    break;
                case \Log::HISTORY_CREATE_ITEM:
                    $what = __('Documento criado', 'codexplus');
                    break;
                case \Log::HISTORY_DELETE_ITEM:
                    $what = __('Enviado para a lixeira', 'codexplus');
                    break;
                case \Log::HISTORY_RESTORE_ITEM:
                    $what = __('Restaurado da lixeira', 'codexplus');
                    break;
                case \Log::HISTORY_ADD_RELATION:
                case \Log::HISTORY_DEL_RELATION:
                case \Log::HISTORY_ADD_SUBITEM:
                case \Log::HISTORY_DELETE_SUBITEM:
                case \Log::HISTORY_UPDATE_SUBITEM:
                    $kind = 'ligacao';
                    $tipo = self::linkLabel((string) $r['itemtype_link']);
                    $alvo = self::stripId($novo !== '' ? $novo : $velho);
                    $what = sprintf(
                        in_array($acao, [\Log::HISTORY_ADD_RELATION, \Log::HISTORY_ADD_SUBITEM], true)
                            ? __('Adicionado — %1$s: %2$s', 'codexplus')
                            : ($acao === \Log::HISTORY_UPDATE_SUBITEM
                                ? __('Alterado — %1$s: %2$s', 'codexplus')
                                : __('Removido — %1$s: %2$s', 'codexplus')),
                        $tipo,
                        $alvo !== '' ? $alvo : '—'
                    );
                    break;
                case \Log::HISTORY_LOG_SIMPLE_MESSAGE:
                    $what = $novo;
                    break;
                default:
                    $what = trim($velho . ($velho !== '' && $novo !== '' ? ' → ' : '') . $novo);
                    if ($what === '') {
                        continue 2;
                    }
            }
            $out[] = [
                'id'        => (int) $r['id'],
                'date_mod'  => (string) $r['date_mod'],
                'user_name' => (string) $r['user_name'],
                'what'      => $what,
                'kind'      => $kind,
            ];
        }
        return $out;
    }

    /** Valor de campo como o GLPI gravou, em texto de gente. */
    private static function logValue(int $opt, string $v): string
    {
        $v = trim(self::stripId($v));
        if ($v === '' || $v === 'NULL') {
            return '—';
        }
        if ($opt === 6) { // status
            return Document::getStatuses()[$v] ?? $v;
        }
        if ($opt === 5 && is_numeric($v)) { // revisão
            return sprintf(':%02d', (int) $v);
        }
        if ($opt === 86) { // recursivo
            return $v === '1' ? __('Sim') : __('Não');
        }
        return self::fmtDate($v);
    }

    /** "glpi (2)" vira "glpi"; " (0)" vira "". */
    private static function stripId(string $v): string
    {
        return trim((string) preg_replace('/\s*\(\d+\)$/', '', $v));
    }

    private static function fmtDate(string $v): string
    {
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) {
            return date('d/m/Y', strtotime($v));
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/', $v)) {
            return date('d/m/Y H:i', strtotime($v));
        }
        return $v;
    }

    /** Nome do que foi ligado. O documento do GLPI (arquivo) é Anexo. */
    private static function linkLabel(string $itemtype): string
    {
        if (ltrim($itemtype, '\\') === 'Document') {
            return __('Anexo', 'codexplus');
        }
        if ($itemtype !== '' && ($item = getItemForItemtype($itemtype))) {
            return $item->getTypeName(1);
        }
        return __('Ligação', 'codexplus');
    }

    /** "Fulano (12)" do glpi_logs vira "Fulano". */
    private static function userLabel(string $logName): string
    {
        return trim((string) preg_replace('/\s*\(\d+\)$/', '', $logName));
    }
}
