<?php
namespace GlpiPlugin\Codexplus;

use KnowbaseItem;

/**
 * Painel do Codex+ — Etapas 6b/6c.
 *
 * 6b implementou a Parte 1.1 do documento de layout.
 * 6c acrescentou o que o mockup revisado pediu: linha de CONTEXTO sob cada
 * indicador (o número diz que há problema; o contexto diz por onde começar)
 * e proporção por tipo.
 *
 * ESTRATÉGIA DE CONSULTA
 * Uma única query traz todos os documentos visíveis com seus metadados; o
 * resto (vencimento, contagens, agrupamentos) é calculado em PHP.
 *
 * Por que não em SQL: o cálculo de vencimento seria
 * `DATE_ADD(date_published, INTERVAL validity_months MONTH)`, e o construtor
 * de queries do GLPI escapa strings do SELECT/WHERE com crases — expressão
 * crua vira SQL inválido (achado nº 4 do contexto do projeto, que já custou
 * depuração uma vez). Em PHP o cálculo é explícito e testável.
 *
 * VISIBILIDADE: herda KnowbaseItem::getVisibilityCriteria(), então o Painel
 * conta apenas o que o usuário logado pode ver.
 */
class Dashboard
{
    /** Janela do indicador "A vencer", em dias. */
    public const EXPIRY_WINDOW_DAYS = DocumentMeta::EXPIRY_WINDOW_DAYS;

    /** A partir de quantos dias sem alteração um rascunho conta como parado. */
    public const STALE_DRAFT_DAYS = 30;

    /**
     * Todos os documentos visíveis com metadados, já com o vencimento
     * calculado. Base de tudo que o Painel mostra.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function loadAll(): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $meta = DocumentMeta::getTable();
        $vis  = KnowbaseItem::getVisibilityCriteria();

        $join = $vis['LEFT JOIN'];
        $join[$meta] = [
            'ON' => [
                $meta                => 'knowbaseitems_id',
                'glpi_knowbaseitems' => 'id',
            ],
        ];

        $criteria = [
            'SELECT' => [
                'glpi_knowbaseitems.id',
                'glpi_knowbaseitems.name',
                'glpi_knowbaseitems.date_mod',
                $meta . '.doctype',
                $meta . '.sequence',
                $meta . '.revision',
                $meta . '.status',
                $meta . '.users_id_owner',
                $meta . '.validity_months',
                $meta . '.client_name',
                $meta . '.date_published',
            ],
            'DISTINCT'  => true,
            'FROM'      => 'glpi_knowbaseitems',
            'LEFT JOIN' => $join,
            'WHERE'     => $vis['WHERE'],
            'ORDER'     => 'glpi_knowbaseitems.date_mod DESC',
        ];

        $docs = [];
        $ids  = [];

        foreach ($DB->request($criteria) as $r) {
            $id    = (int) $r['id'];
            $ids[] = $id;

            $doctype = (string) ($r['doctype'] ?? '');
            $seq     = (int) ($r['sequence'] ?? 0);

            $code = ($doctype !== '' && $seq > 0)
                ? sprintf('%s%04d:%02d', $doctype, $seq, (int) $r['revision'])
                : '';

            $expiry = self::expiry(
                $r['date_published'] ?? null,
                (int) ($r['validity_months'] ?? 0),
                (string) ($r['status'] ?? '')
            );

            $docs[$id] = [
                'id'           => $id,
                'name'         => (string) $r['name'],
                'date_mod'     => $r['date_mod'],
                'date_mod_ts'  => $r['date_mod'] ? (strtotime($r['date_mod']) ?: 0) : 0,
                'doctype'      => $doctype,
                'status'       => (string) ($r['status'] ?? ''),
                'code'         => $code,
                'client_name'  => (string) ($r['client_name'] ?? ''),
                'category'     => '',
                'has_category' => false,
                'expiry'       => $expiry['state'],
                'due_ts'       => $expiry['due'],
            ];
        }

        // Categoria (relação N:N) em uma query em lote.
        if ($ids) {
            foreach ($DB->request([
                'SELECT' => [
                    'glpi_knowbaseitems_knowbaseitemcategories.knowbaseitems_id AS kbid',
                    'glpi_knowbaseitemcategories.completename AS catname',
                ],
                'FROM'      => 'glpi_knowbaseitems_knowbaseitemcategories',
                'LEFT JOIN' => [
                    'glpi_knowbaseitemcategories' => [
                        'ON' => [
                            'glpi_knowbaseitemcategories'               => 'id',
                            'glpi_knowbaseitems_knowbaseitemcategories' => 'knowbaseitemcategories_id',
                        ],
                    ],
                ],
                'WHERE' => ['glpi_knowbaseitems_knowbaseitemcategories.knowbaseitems_id' => $ids],
                'ORDER' => 'glpi_knowbaseitemcategories.completename',
            ]) as $c) {
                $kbid = (int) $c['kbid'];
                if (isset($docs[$kbid])) {
                    $docs[$kbid]['has_category'] = true;
                    if ($docs[$kbid]['category'] === '') {
                        $docs[$kbid]['category'] = (string) $c['catname'];
                    }
                }
            }
        }

        return array_values($docs);
    }

    /**
     * Delega para DocumentMeta::expiryState(), que é a fonte única da regra
     * desde a Etapa 4b (a tela de leitura precisa do mesmo cálculo).
     */
    private static function expiry(?string $published, int $months, string $status): array
    {
        return DocumentMeta::expiryState($published, $months, $status);
    }

    /**
     * Zona B — os quatro indicadores, cada um com sua linha de contexto.
     *
     * O contexto é o ponto da Etapa 6c: "12 vencidos" avisa que há problema,
     * "7 são POP" diz por onde começar. Indicador sem contexto obriga o
     * usuário a abrir a listagem só para descobrir o óbvio.
     *
     * @param array<int, array<string, mixed>> $docs
     * @return array<string, mixed>
     */
    public static function getCounters(array $docs): array
    {
        $c = [
            'publicados'        => 0,
            'avencer'           => 0,
            'vencidos'          => 0,
            'rascunhos'         => 0,
            'total'             => count($docs),
            'proximo_dias'      => null,
            'vencidos_tipo'     => '',
            'vencidos_tipo_n'   => 0,
            'rascunhos_parados' => 0,
        ];

        $now           = time();
        $proximo       = null;
        $tiposVencidos = [];
        $staleLimit    = $now - (self::STALE_DRAFT_DAYS * 86400);

        foreach ($docs as $d) {
            if ($d['status'] === 'publicado') {
                $c['publicados']++;
            }

            if ($d['status'] === 'rascunho') {
                $c['rascunhos']++;
                if ($d['date_mod_ts'] > 0 && $d['date_mod_ts'] < $staleLimit) {
                    $c['rascunhos_parados']++;
                }
            }

            if ($d['expiry'] === 'avencer') {
                $c['avencer']++;
                if ($d['due_ts'] !== null && ($proximo === null || $d['due_ts'] < $proximo)) {
                    $proximo = $d['due_ts'];
                }
            }

            if ($d['expiry'] === 'vencido') {
                $c['vencidos']++;
                if ($d['doctype'] !== '') {
                    $tiposVencidos[$d['doctype']] = ($tiposVencidos[$d['doctype']] ?? 0) + 1;
                }
            }
        }

        if ($proximo !== null) {
            $c['proximo_dias'] = max(0, (int) ceil(($proximo - $now) / 86400));
        }

        if ($tiposVencidos) {
            arsort($tiposVencidos);
            $c['vencidos_tipo']   = (string) array_key_first($tiposVencidos);
            $c['vencidos_tipo_n'] = (int) reset($tiposVencidos);
        }

        return $c;
    }

    /**
     * Zona C — contagem por tipo COM proporção, para a barra.
     *
     * A barra é o que sobrou da ideia de gráfico da referência: proporção é
     * a única pergunta legítima ali ("o acervo é quase tudo POP?"), e uma
     * barra responde isso ocupando uma fração do espaço de um donut.
     *
     * @param array<int, array<string, mixed>> $docs
     * @return array<int, array{key:string, name:string, total:int, pct:int}>
     */
    public static function getByType(array $docs): array
    {
        $counts = array_fill_keys(DocumentMeta::DOCTYPE_KEYS, 0);

        foreach ($docs as $d) {
            if ($d['doctype'] !== '' && isset($counts[$d['doctype']])) {
                $counts[$d['doctype']]++;
            }
        }

        $total = array_sum($counts);
        $names = DocumentMeta::getDoctypeShortNames();
        $out   = [];

        foreach ($counts as $key => $n) {
            $out[] = [
                'key'   => $key,
                'name'  => $names[$key] ?? $key,
                'total' => $n,
                'pct'   => $total > 0 ? (int) round(($n / $total) * 100) : 0,
            ];
        }

        return $out;
    }

    /**
     * Zona C — "Precisa de atenção". Só entra o que gera AÇÃO.
     *
     * 'psg_sem_pop' fica null de propósito: depende da tabela de relação
     * PSG→POPs da Etapa 5. O template mostra o item desabilitado, para não
     * dar a impressão falsa de que o valor é zero.
     *
     * @param array<int, array<string, mixed>> $docs
     * @return array{revisao_vencida:int, psg_sem_pop:?int, sem_codigo:int, sem_categoria:int}
     */
    public static function getAttention(array $docs): array
    {
        $a = [
            'revisao_vencida' => 0,
            'psg_sem_pop'     => null,
            'sem_codigo'      => 0,
            'sem_categoria'   => 0,
        ];

        foreach ($docs as $d) {
            if ($d['expiry'] === 'vencido') {
                $a['revisao_vencida']++;
            }
            if ($d['code'] === '') {
                $a['sem_codigo']++;
            }
            if (!$d['has_category']) {
                $a['sem_categoria']++;
            }
        }

        return $a;
    }

    /**
     * Zona D — atualizados recentemente. A lista já vem ordenada por
     * date_mod DESC de loadAll(); aqui só cortamos e enriquecemos.
     *
     * @param array<int, array<string, mixed>> $docs
     * @return array<int, array<string, mixed>>
     */
    public static function getRecent(array $docs, int $limit = 6): array
    {
        $out = [];

        foreach (array_slice($docs, 0, $limit) as $d) {
            // Coluna de contexto: proposta mostra o cliente; os demais, a
            // categoria. (Na Etapa 5 o PSG passa a mostrar os POPs vinculados.)
            $d['context'] = ($d['doctype'] === 'PRP' && $d['client_name'] !== '')
                ? $d['client_name']
                : $d['category'];

            $d['ago'] = self::relativeTime($d['date_mod']);
            $out[]    = $d;
        }

        return $out;
    }

    /**
     * "há 3 dias", "há 14 meses"… Formato curto, em português.
     */
    public static function relativeTime(?string $datetime): string
    {
        if (empty($datetime)) {
            return '';
        }

        $ts = strtotime($datetime);
        if ($ts === false) {
            return '';
        }

        $diff = max(0, time() - $ts);

        if ($diff < 60) {
            return __('agora', 'codexplus');
        }
        if ($diff < 3600) {
            $n = (int) floor($diff / 60);
            return sprintf(_n('há %d minuto', 'há %d minutos', $n, 'codexplus'), $n);
        }
        if ($diff < 86400) {
            $n = (int) floor($diff / 3600);
            return sprintf(_n('há %d hora', 'há %d horas', $n, 'codexplus'), $n);
        }
        if ($diff < 2592000) {
            $n = (int) floor($diff / 86400);
            return sprintf(_n('há %d dia', 'há %d dias', $n, 'codexplus'), $n);
        }
        if ($diff < 31536000) {
            $n = (int) floor($diff / 2592000);
            return sprintf(_n('há %d mês', 'há %d meses', $n, 'codexplus'), $n);
        }

        $n = (int) floor($diff / 31536000);
        return sprintf(_n('há %d ano', 'há %d anos', $n, 'codexplus'), $n);
    }
}
