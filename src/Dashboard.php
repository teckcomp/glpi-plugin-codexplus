<?php
namespace GlpiPlugin\Codexplus;


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
     * Delega para DocumentMeta::expiryState(), que é a fonte única da regra
     * desde a Etapa 4b (a tela de leitura precisa do mesmo cálculo).
     */
    private static function expiry(?string $published, int $months, string $status, ?string $reviewEnd = null): array
    {
        return DocumentMeta::expiryState($published, $months, $status, $reviewEnd);
    }

    /**
     * "Aguardando você" (bloco R3d-1, Claudio, 21/09/2026): documentos em que
     * o usuário da sessão é quem responde pela etapa atual E pode agir —
     *   - 1ª etapa (aprovacao): gestor de um setor do documento, com o botão
     *     Aprovar liberado (canApprove);
     *   - 2ª etapa (validacao): o auditor responsável, com o botão Validar
     *     liberado (canValidate — quem editou não entra).
     * A regra é a mesma dos botões. Quem responde pela etapa mas não consegue
     * agir (perfil sem o bit, auditor que editou ou que aprovou a 1ª etapa) aparece
     * também, com o motivo e sem o botão de ação — senão nunca saberia que o
     * documento espera por ele. O Ver todos NÃO entra só por poder tudo (a lista viraria a de todos os
     * pendentes); o Super-Admin aparece onde estiver como gestor ou auditor.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function pendingForMe(): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $me = (int) \Session::getLoginUserID();
        if ($me <= 0) {
            return [];
        }
        $t  = Document::getTable();
        $or = [[$t . '.users_id_auditor' => $me, $t . '.status' => Document::STATUS_VALIDATION]];

        // P1: 1ª etapa espera pelo responsável.
        $or[] = [$t . '.users_id_owner' => $me, $t . '.status' => Document::STATUS_APPROVAL];
        // A-2a: …e antes dele, pelos aprovadores do diagrama que ainda não aprovaram.
        $or[] = [$t . '.status' => Document::STATUS_APPROVAL, $t . '.id' => new \Glpi\DBAL\QuerySubQuery([
            'SELECT' => 'plugin_codexplus_documents_id',
            'FROM'   => Install::DOC_APPROVERS_TABLE,
            'WHERE'  => ['users_id' => $me, 'date_approved' => null],
        ])];

        $out = [];
        foreach ($DB->request([
            'SELECT' => [$t . '.id'],
            'FROM'   => $t,
            'WHERE'  => [$t . '.knowbaseitems_id' => 0, $t . '.is_deleted' => 0, 'OR' => $or],
            'ORDER'  => [$t . '.date_submitted ASC'],
        ]) as $row) {
            $doc = new Document();
            if (!$doc->getFromDB((int) $row['id'])) {
                continue;
            }
            $etapa1 = $doc->fields['status'] === Document::STATUS_APPROVAL;
            // A-2a: com aprovador pendente, a vez é dele (não do responsável).
            $assina = $etapa1 && $doc->signersPending();
            if ($assina) {
                $dono = in_array($me, $doc->pendingWith(), true);
            } else {
                $dono = $etapa1 ? $doc->isOwner() : $doc->isAuditor();
            }
            if (!$dono) {
                continue;
            }
            $pode    = $assina ? $doc->canSign() : ($etapa1 ? $doc->canApprove() : $doc->canValidate());
            $bloqueio = '';
            if (!$pode) {
                if ($etapa1) {
                    // P3: o aprovador que montou o documento não aprova (pode devolver).
                    $bloqueio = $assina
                        ? __('você montou este documento (autor, editor ou revisor): não pode aprová-lo, só devolver', 'codexplus')
                        : __('sem permissão para aprovar esta etapa', 'codexplus');
                } else {
                    $bloqueio = match ($doc->validationBlocker()) {
                        'aprovou' => __('você aprovou a 1ª etapa: outro auditor precisa validar (você pode devolver)', 'codexplus'),
                        'montou'  => __('você montou este documento (autor, editor ou revisor): outro auditor precisa validar (você pode devolver)', 'codexplus'),
                        default   => __('seu perfil atual não tem o direito Auditor do Codex+ (se outro perfil seu tem, troque para ele)', 'codexplus'),
                    };
                }
            }
            // Desde quando espera por esta etapa: envio (1ª) ou aprovação (2ª).
            $desde = $etapa1 ? $doc->fields['date_submitted'] : ($doc->fields['date_approved'] ?: $doc->fields['date_submitted']);
            $quem  = (int) ($etapa1 ? $doc->fields['users_id_submitter'] : $doc->fields['users_id_approver']);
            $out[] = [
                'id'      => (int) $doc->fields['id'],
                'code'    => $doc->getCode(),
                'doctype' => (string) $doc->fields['doctype'],
                'name'    => (string) $doc->fields['name'],
                'acao'    => $pode ? ($etapa1 ? __('Aprovar', 'codexplus') : __('Validar', 'codexplus')) : '',
                'bloqueio' => $bloqueio,
                'etapa'   => $assina ? __('aprovadores', 'codexplus')
                    : ($etapa1 ? __('1ª etapa: responsável', 'codexplus') : __('2ª etapa: auditor', 'codexplus')),
                'quem'    => $quem > 0
                    ? ($etapa1 ? __('enviado por', 'codexplus') : __('aprovado por', 'codexplus')) . ' ' . getUserName($quem)
                    : '',
                'ago'     => $desde ? self::relativeTime((string) $desde) : '',
            ];
        }
        return $out;
    }

    /**
     * 0.6.6 — o Painel passa a ler o MODELO NOVO (Document), antecipando a
     * parte do Painel da R5 (decisão de Claudio, 20/09/2026). Mesmo formato
     * de loadAll(), mais setor e responsável, para os métodos abaixo
     * servirem aos dois modelos até a R5 aposentar loadAll().
     *
     * Visibilidade: Document::getVisibilityCriteria() (mesma regra das
     * telas do documento; conferida pelo comando document:visibility).
     *
     * @return array<int, array<string, mixed>>
     */
    public static function loadAllNew(): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        if (!Document::canView()) {
            return [];
        }

        $t   = Document::getTable();
        $vis = Document::getVisibilityCriteria();

        $docs   = [];
        $owners = [];

        foreach ($DB->request([
            'SELECT'    => [
                $t . '.id', $t . '.name', $t . '.date_mod', $t . '.doctype',
                $t . '.sequence', $t . '.revision', $t . '.status',
                $t . '.users_id_owner', $t . '.users_id_reviewer', $t . '.validity_months',
                $t . '.client_name', $t . '.date_published', $t . '.review_end',
                $t . '.revision_due',
            ],
            'DISTINCT'  => true,
            'FROM'      => $t,
            'LEFT JOIN' => $vis['LEFT JOIN'],
            'WHERE'     => [$t . '.knowbaseitems_id' => 0, $t . '.is_deleted' => 0] + $vis['WHERE'],
            'ORDER'     => [$t . '.date_mod DESC'],
        ]) as $r) {
            $id      = (int) $r['id'];
            $status  = (string) $r['status'];
            // R6-a: revisão de publicado em andamento conta como publicado (é
            // o que está no ar), marcada "em atualização", com o código da
            // versão em vigor.
            $emRevisao = (int) $r['revision'] > 0
                && in_array($status, [Document::STATUS_DRAFT, Document::STATUS_APPROVAL, Document::STATUS_VALIDATION], true);
            if ($emRevisao) {
                $status = Document::STATUS_PUBLISHED;
            }
            $expiry  = self::expiry($r['date_published'] ?? null, (int) $r['validity_months'], $status, $r['review_end'] ?? null);
            $ownerId = (int) $r['users_id_owner'];
            if ($ownerId > 0) {
                $owners[$ownerId] = true;
            }

            $docs[$id] = [
                'id'           => $id,
                'name'         => (string) $r['name'],
                'date_mod'     => $r['date_mod'],
                'date_mod_ts'  => $r['date_mod'] ? (strtotime($r['date_mod']) ?: 0) : 0,
                'doctype'      => (string) $r['doctype'],
                'status'       => $status,
                'code'         => sprintf('%s%04d:%02d', $r['doctype'], (int) $r['sequence'], (int) $r['revision'] - ($emRevisao ? 1 : 0)),
                'in_revision'  => $emRevisao,
                'client_name'  => (string) ($r['client_name'] ?? ''),
                'category'     => '',
                'has_category' => false,
                'sector'       => '',
                'owner_id'     => $ownerId,
                'owner'        => '',
                // PL-1: revisor (ou 1º editor, no fluxo direto — espelho da A-1).
                'reviewer_id'  => (int) ($r['users_id_reviewer'] ?? 0),
                'expiry'       => $expiry['state'],
                // R6-b: prazo da revisão aberta ('' = sem prazo ou fora de revisão).
                'revision_due' => $emRevisao ? substr((string) ($r['revision_due'] ?? ''), 0, 10) : '',
                'due_ts'       => $expiry['due'],
                // AP-1: 1ª etapa com aprovador pendente (preenchido abaixo).
                'signers_pending' => false,
                'situation'       => $status,
            ];
        }

        // AP-1: "aguarda aprovadores" — 1ª etapa de diagrama/diverso com
        // aprovador que ainda não aprovou (a mesma regra de signersPending).
        $etapa1 = array_keys(array_filter(
            $docs,
            static fn ($d) => $d['status'] === Document::STATUS_APPROVAL && Document::typeUsesApprovers($d['doctype'])
        ));
        if ($etapa1 !== []) {
            foreach ($DB->request([
                'SELECT' => ['plugin_codexplus_documents_id'],
                'FROM'   => Install::DOC_APPROVERS_TABLE,
                'WHERE'  => ['plugin_codexplus_documents_id' => $etapa1, 'users_id' => ['>', 0], 'date_approved' => null],
            ]) as $r) {
                $did = (int) $r['plugin_codexplus_documents_id'];
                $docs[$did]['signers_pending'] = true;
                $docs[$did]['situation']       = Document::SITUATION_SIGNERS;
            }
        }

        if ($docs) {
            // Categorias e setores de todos os documentos numa query só.
            $dc  = Document_Category::getTable();
            $cat = Category::getTable();
            $sec = Sector::getTable();
            $cats = [];
            $secs = [];
            foreach ($DB->request([
                'SELECT'     => [
                    $dc . '.' . Document_Category::$items_id_1 . ' AS did',
                    $cat . '.completename AS catname',
                    $sec . '.name AS secname',
                ],
                'FROM'       => $dc,
                'INNER JOIN' => [
                    $cat => ['ON' => [$dc => Document_Category::$items_id_2, $cat => 'id']],
                ],
                'LEFT JOIN'  => [
                    $sec => ['ON' => [$cat => Category::SECTOR_FIELD, $sec => 'id']],
                ],
                'WHERE'      => [$dc . '.' . Document_Category::$items_id_1 => array_keys($docs)],
            ]) as $r) {
                $did = (int) $r['did'];
                $cats[$did][(string) $r['catname']] = true;
                if (!empty($r['secname'])) {
                    $secs[$did][(string) $r['secname']] = true;
                }
            }
            foreach ($docs as $id => &$d) {
                if (isset($cats[$id])) {
                    $d['has_category'] = true;
                    $d['category']     = implode(', ', array_keys($cats[$id]));
                }
                if (isset($secs[$id])) {
                    $d['sector'] = implode(', ', array_keys($secs[$id]));
                }
                if ($d['owner_id'] > 0) {
                    $d['owner'] = (string) \User::getFriendlyNameById($d['owner_id']);
                }
            }
            unset($d);
        }

        return $docs;
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
            'emrevisao'         => 0,   // 0.6.6: status validacao (R6 soma a revisão aberta)
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

            // R3d: as duas etapas (aguardando gestor e aguardando auditor);
            // R6-a: e as revisões de publicado em andamento.
            if ($d['status'] === 'validacao' || $d['status'] === 'aprovacao' || !empty($d['in_revision'])) {
                $c['emrevisao']++;
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
     * @return array{revisao_vencida:int, revisao_vencida_docs:array, psg_sem_pop:?int, sem_codigo:int, sem_categoria:int}
     */
    public static function getAttention(array $docs): array
    {
        $a = [
            'revisao_vencida' => 0,
            'revisao_vencida_docs' => [],   // R6-b: a lista que abre na linha
            'psg_sem_pop'     => 0,    // Etapa 5: PSG (fora de obsoleto) sem POP vinculado
            'psg_sem_pop_docs' => [],
            'vinculo_problema' => 0,   // 5c: documento com vinculado obsoleto ou vencido
            'vinculo_problema_docs' => [],
            'sem_codigo'      => 0,
            'sem_categoria'   => 0,
            'sem_responsavel' => 0,   // 0.6.6, só o modelo novo informa owner_id
        ];

        foreach ($docs as $d) {
            // R6-b (Claudio, 04/10/2026): uma linha só, os dois casos, sem
            // contar o mesmo documento duas vezes —
            //   - publicado vencido SEM revisão aberta (ninguém começou);
            //   - revisão aberta FORA DO PRAZO (começou e não terminou).
            //     Revisão aberta antes da R6-b (sem prazo) conta se o
            //     publicado venceu.
            // Revisão aberta dentro do prazo não entra: está sendo feita.
            $why = self::overdueReason($d);
            if ($why !== null) {
                $a['revisao_vencida']++;
                $a['revisao_vencida_docs'][] = [
                    'id'   => (int) $d['id'],
                    'code' => (string) $d['code'],
                    'name' => (string) $d['name'],
                ] + $why;
            }
            if ($d['code'] === '') {
                $a['sem_codigo']++;
            }
            if (!$d['has_category']) {
                $a['sem_categoria']++;
            }
            if (($d['owner_id'] ?? -1) === 0) {
                $a['sem_responsavel']++;
            }
        }

        // Etapa 5 (5c): vínculos — PSG sem POP e vinculado obsoleto/vencido.
        $links = self::linkAttention($docs);
        $a['psg_sem_pop_docs']      = $links['psg'];
        $a['psg_sem_pop']           = count($links['psg']);
        $a['vinculo_problema_docs'] = $links['prob'];
        $a['vinculo_problema']      = count($links['prob']);

        return $a;
    }

    /**
     * 5c: PSG fora de obsoleto sem POP vinculado; documento (fora de
     * obsoleto) com vinculado direto obsoleto ou vencido.
     *
     * @param array<int, array<string, mixed>> $docs
     * @return array{psg: array<int, array<string, mixed>>, prob: array<int, array<string, mixed>>}
     */
    private static function linkAttention(array $docs): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $vivos = array_filter($docs, static fn ($d) => ($d['status'] ?? '') !== Document::STATUS_OBSOLETE
            && DocumentLink::canHaveChildren((string) ($d['doctype'] ?? '')));
        $out = ['psg' => [], 'prob' => []];
        if (!$vivos || !$DB->tableExists(DocumentLink::getTable())) {
            return $out;
        }
        $filhos = [];
        foreach ($DB->request([
            'SELECT' => ['l.parent_documents_id AS p', 'd.doctype AS t', 'd.id AS c'],
            'FROM'   => DocumentLink::getTable() . ' AS l',
            'INNER JOIN' => [Document::getTable() . ' AS d' => ['ON' => ['l' => 'child_documents_id', 'd' => 'id']]],
            'WHERE'  => ['l.parent_documents_id' => array_map(static fn ($d) => (int) $d['id'], array_values($vivos)), 'd.is_deleted' => 0],
        ]) as $r) {
            $filhos[(int) $r['p']][] = ['id' => (int) $r['c'], 'type' => (string) $r['t']];
        }
        foreach ($vivos as $d) {
            $id = (int) $d['id'];
            $base = ['id' => $id, 'code' => (string) $d['code'], 'name' => (string) $d['name']];
            if ($d['doctype'] === 'PSG' && !in_array('POP', array_column($filhos[$id] ?? [], 'type'), true)) {
                $out['psg'][] = $base;
            }
            if (!empty($filhos[$id])) {
                $ruins = DocumentLink::problems($id);
                if ($ruins) {
                    $out['prob'][] = $base + ['why' => implode(', ', array_map(
                        static fn ($p) => $p['code'] . ' ' . ($p['state'] === 'obsoleto' ? __('obsoleto', 'codexplus') : __('vencido', 'codexplus')),
                        $ruins
                    ))];
                }
            }
        }
        return $out;
    }

    /**
     * R6-b: por que o documento está em "Revisão vencida", ou null.
     *
     * @param array<string, mixed> $d linha de loadAllNew()/loadAll()
     * @return array{why: string, due: string, days: int}|null
     */
    public static function overdueReason(array $d): ?array
    {
        $vencido = ($d['expiry'] ?? '') === 'vencido';
        if (empty($d['in_revision'])) {
            return $vencido ? ['why' => 'sem_revisao', 'due' => '', 'days' => 0] : null;
        }
        $due = (string) ($d['revision_due'] ?? '');
        if ($due === '') {
            return $vencido ? ['why' => 'sem_prazo', 'due' => '', 'days' => 0] : null;
        }
        $st = Document::dueState($due);
        return $st['state'] === 'atrasada'
            ? ['why' => 'atrasada', 'due' => $st['due'], 'days' => $st['days']]
            : null;
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
            // Coluna de contexto: proposta, laudo e documentação técnica
            // mostram o cliente (bloco T1); os demais, a categoria. (Na Etapa 5
            // o PSG passa a mostrar os POPs vinculados.)
            $d['context'] = (DocumentMeta::hasClient((string) $d['doctype']) && $d['client_name'] !== '')
                ? $d['client_name']
                : $d['category'];

            $d['ago']    = self::relativeTime($d['date_mod']);
            $d['helper'] = self::helperLabel($d);
            $out[]       = $d;
        }

        return $out;
    }

    /**
     * PL-1 (Claudio, 08/10/2026): coluna "Revisor / Editor" dos recentes.
     * Proposta e Laudo (fluxo direto) mostram os editores da A-1 — o primeiro
     * e "+N"; os demais tipos, o revisor. '' = ninguém escolhido.
     */
    public static function helperLabel(array $d): string
    {
        $id = (int) ($d['id'] ?? 0);
        if (DocumentMeta::flowOf((string) ($d['doctype'] ?? '')) === DocumentMeta::FLOW_DIRECT) {
            $ids = DocumentEditor::ids($id);
            if (!$ids) {
                return '';
            }
            $nome = (string) getUserName((int) $ids[0]);
            return count($ids) > 1 ? $nome . ' +' . (count($ids) - 1) : $nome;
        }
        $rev = (int) ($d['reviewer_id'] ?? 0);
        return $rev > 0 ? (string) getUserName($rev) : '';
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
