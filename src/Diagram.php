<?php

namespace GlpiPlugin\Codexplus;

/**
 * Diagrama institucional (Etapa 9, 0.6.7) — um por documento DIA.
 *
 * Não é CommonDBTM de propósito: o diagrama não tem tela, direito nem
 * histórico próprios. Quem decide se pode ler ou gravar é o Document dono
 * (can($id, READ) / can($id, UPDATE)), sempre checado ANTES de chamar esta
 * classe, em front/document.form.php. Aqui só se lê e grava a linha.
 *
 * `data` é o JSON do organograma (desenhado por public/js/codexplus-orgdraw.js e
 * editado no motor de quadro, codexplus-board.js, desde o Q6d). Desde o bloco 2a o
 * formato é grafo, não árvore (Claudio, 20/09/2026 — posição livre e ligações
 * próprias vêm nos blocos seguintes):
 *   { "kind": "organograma",
 *     "levels": [ { key, label, color } ],
 *     "nodes": [ { id, name, role, lvl, shape, x, y, note, pend, group, dashed } ],
 *     "edges": [ { id, from, to, boss, style, label, waypoints: [ {x, y} ] } ],
 *     "esc":   [ { lvl, c: [nível, papel, quando escala, tempo] } ] }
 * `x`/`y` ausentes = elemento ancorado (quem posiciona é o layout). A primeira
 * ligação que chega a um nó é a hierárquica; as demais são ligações extras.
 * validate() aceita TAMBÉM o formato antigo (`tree` com `kids`) e converte:
 * é assim que os diagramas gravados antes da 0.6.8 continuam abrindo.
 */
class Diagram
{
    public const SUBTYPE_ORG = 'organograma';

    /** Teto do JSON gravado: um organograma real fica em poucas dezenas de kB. */
    public const MAX_BYTES = 1048576;

    /** Níveis aceitos (mesmas chaves do motor e dos tokens --cx-l-*). */
    public const LEVELS = ['diretoria', 'gestao', 'supervisao', 'n3', 'n2', 'n1', 'noc'];

    /** Tipos de diagrama. Só organograma tem motor hoje; os outros vêm depois. */
    public const KINDS = ['organograma', 'fluxograma', 'matriz', 'cronograma'];

    public const MAX_NODES = 2000;
    public const MAX_EDGES = 4000;

    /** Teto de coordenada: tela livre grande, mas nunca infinita. */
    public const MAX_COORD = 20000;

    /** Dobras por ligação (bloco 2d-2): passa com folga de qualquer desvio real. */
    public const MAX_WAYPOINTS = 20;

    public static function getTable(): string
    {
        return Install::DIAGRAMS_TABLE;
    }

    /**
     * Diagrama inicial de um DIA novo: só o topo. Sem nomes de pessoas no
     * código (o repositório é público); o organograma real entra pelo
     * "Importar" do editor.
     *
     * @return array<string, mixed>
     */
    /**
     * Subtipos (bloco D1, Claudio, 26/09/2026): o organograma usa o motor de
     * grafo; cronograma e matriz RACI são grades (codexplus-grid.js). O
     * subtipo vem de `kind` no próprio JSON — fonte única.
     */
    public const SUBTYPE_SCHEDULE = 'cronograma';
    public const SUBTYPE_RACI     = 'raci';
    public const GRID_SUBTYPES    = [self::SUBTYPE_SCHEDULE, self::SUBTYPE_RACI];
    public const MAX_GRID_ROWS    = 300;
    public const MAX_GRID_COLS    = 104;
    public const RACI_VALUES      = ['', 'R', 'A', 'C', 'I'];
    public const SCHEDULE_VALUES  = ['', 'b', 'm']; // vazio, barra, marco
    public const SCHEDULE_UNITS   = ['S', 'M', 'T', 'A'];
    /**
     * Q7b-1 (Claudio, 03/10/2026): cronograma com datas reais, gravado AO LADO
     * do formato de períodos: { kind: 'cronograma', mode: 'datas', scale: 'S'
     * (colunas por semana) ou 'M' (por mês), rows: [{ name, owner, start, end }] },
     * datas em AAAA-MM-DD (vazias = tarefa ainda sem datas). Sem `mode`, é o
     * cronograma antigo (S1, S2…), que continua abrindo como sempre.
     * Q7b-2: linha pode ter `type` 'fase' ({ type, name, owner }, sem datas)
     * ou 'marco' (start = end); sem `type`, é tarefa.
     * Q7b-4: toda linha tem `id` fixo (último campo), a chave da situação.
     */
    public const SCHEDULE_MODE_DATES = 'datas';
    public const SCHEDULE_SCALES     = ['S', 'M'];
    /** Q7b-2: tipos de linha além da tarefa (sem `type`): fase e marco. */
    public const SCHEDULE_ROW_TYPES  = ['fase', 'marco'];

    /**
     * Fluxograma (bloco Q5a, Claudio, 27/09/2026): subtipo de DIA sobre o
     * motor de quadro (public/js/codexplus-board.js), o mesmo da Planta e da
     * Topologia. Gravado como { "kind": "fluxograma", "board": {…JSON do
     * quadro…} }. Quem confere o SIGNIFICADO de cada item é o clean() do
     * motor, ao abrir; aqui se confere a FORMA (tipos de item, chaves,
     * profundidade, tamanhos) para nada estranho ir ao banco.
     */
    public const SUBTYPE_FLOW      = 'fluxograma';
    public const BOARD_ITEM_TYPES  = ['icon', 'zone', 'text', 'link', 'duct', 'shape', 'lane'];
    public const MAX_BOARD_ITEMS   = 3000;
    public const MAX_BOARD_TEXT    = 2000;
    public const MAX_BOARD_DEPTH   = 4;
    /** Ícone criado na instalação (Q4) copiado no quadro: PNG de 256 px. */
    public const MAX_LIB_IMAGE     = 400000;

    /** @return array<string, string> subtipo => rótulo */
    public static function getSubtypes(): array
    {
        return [
            self::SUBTYPE_ORG      => __('Organograma', 'codexplus'),
            self::SUBTYPE_SCHEDULE => __('Cronograma', 'codexplus'),
            self::SUBTYPE_RACI     => __('Matriz RACI', 'codexplus'),
            self::SUBTYPE_FLOW     => __('Fluxograma', 'codexplus'),
        ];
    }

    public static function subtypeOf(array $data): string
    {
        $k = (string) ($data['kind'] ?? '');
        if ($k === self::SUBTYPE_FLOW) {
            return $k;
        }
        return in_array($k, self::GRID_SUBTYPES, true) ? $k : self::SUBTYPE_ORG;
    }

    /** @return array<string, mixed> */
    public static function starter(string $subtype = self::SUBTYPE_ORG): array
    {
        if ($subtype === self::SUBTYPE_FLOW) {
            return [
                'kind'  => self::SUBTYPE_FLOW,
                'board' => ['v' => 1, 'mode' => self::SUBTYPE_FLOW, 'w' => 1400, 'h' => 900, 'items' => []],
            ];
        }
        if ($subtype === self::SUBTYPE_SCHEDULE) {
            // Q7b-1: cronograma novo já nasce com datas (uma tarefa sem datas,
            // que ganha a barra num clique na linha do tempo).
            return [
                'kind'  => self::SUBTYPE_SCHEDULE,
                'mode'  => self::SCHEDULE_MODE_DATES,
                'scale' => 'S',
                'rows'  => [['name' => '', 'owner' => '', 'start' => '', 'end' => '']],
            ];
        }
        if ($subtype === self::SUBTYPE_RACI) {
            return [
                'kind'  => self::SUBTYPE_RACI,
                'roles' => ['Diretoria', 'Coordenação', 'Execução'],
                'rows'  => [['name' => '', 'cells' => array_fill(0, 3, '')]],
            ];
        }
        return [
            'kind'  => 'organograma',
            'nodes' => [
                ['id' => 'n1', 'name' => '', 'role' => 'Direção', 'lvl' => 'diretoria', 'note' => ''],
            ],
            'edges'  => [],
            'esc'    => [],
            // Níveis padrão de mercado (os mesmos de STD_LEVELS no motor).
            'levels' => [
                ['key' => 'conselho', 'label' => 'Conselho', 'color' => '#22314f'],
                ['key' => 'diretoria', 'label' => 'Diretoria', 'color' => '#3e6aa8'],
                ['key' => 'gerencia', 'label' => 'Gerência', 'color' => '#1f5fbf'],
                ['key' => 'coordenacao', 'label' => 'Coordenação', 'color' => '#1f7f6c'],
                ['key' => 'supervisao', 'label' => 'Supervisão', 'color' => '#c4860e'],
                ['key' => 'especialista', 'label' => 'Especialista', 'color' => '#7a4fb5'],
                ['key' => 'operacional', 'label' => 'Operacional', 'color' => '#2e86d1'],
            ],
        ];
    }

    /** @return array{subtype:string, data:array<string, mixed>}|null */
    public static function load(int $documentId): ?array
    {
        /** @var \DBmysql $DB */
        global $DB;

        foreach ($DB->request([
            'FROM'  => self::getTable(),
            'WHERE' => ['plugin_codexplus_documents_id' => $documentId],
            'LIMIT' => 1,
        ]) as $row) {
            $data = json_decode((string) ($row['data'] ?? ''), true);
            $data = self::validate($data) ?? self::starter((string) $row['subtype']);
            return [
                'subtype' => self::subtypeOf($data),
                'data'    => $data,
            ];
        }
        return null;
    }

    /**
     * Grava (cria ou substitui). Devolve true se o conteúdo mudou.
     *
     * @param array<string, mixed> $data já validado
     */
    public static function save(int $documentId, array $data, string $subtype = self::SUBTYPE_ORG): bool
    {
        /** @var \DBmysql $DB */
        global $DB;

        $json    = json_encode($data, JSON_UNESCAPED_UNICODE);
        $now     = date('Y-m-d H:i:s');
        $subtype = self::subtypeOf($data); // D1: o JSON manda, não o parâmetro

        $current = null;
        foreach ($DB->request([
            'SELECT' => ['id', 'data'],
            'FROM'   => self::getTable(),
            'WHERE'  => ['plugin_codexplus_documents_id' => $documentId],
            'LIMIT'  => 1,
        ]) as $row) {
            $current = $row;
        }

        if ($current === null) {
            return (bool) $DB->insert(self::getTable(), [
                'plugin_codexplus_documents_id' => $documentId,
                'subtype'       => $subtype,
                'data'          => $json,
                'date_creation' => $now,
                'date_mod'      => $now,
            ]);
        }
        if ((string) $current['data'] === $json) {
            return false;
        }
        $DB->update(self::getTable(), ['data' => $json, 'subtype' => $subtype, 'date_mod' => $now], ['id' => (int) $current['id']]);
        // HV-1: o desenho não está no glpi_logs; fica a marca no Histórico.
        DocumentHistory::note($documentId, __('Diagrama alterado', 'codexplus'));
        return true;
    }

    public static function purgeDocument(int $documentId): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $DB->delete(self::getTable(), ['plugin_codexplus_documents_id' => $documentId]);
    }

    /**
     * Confere e normaliza o JSON vindo do navegador. Devolve null se a forma
     * não for a esperada. Texto é só texto: o motor escapa ao desenhar.
     *
     * Bloco 2a: aceita o formato grafo (`nodes`/`edges`) e o antigo (`tree`),
     * devolvendo sempre o grafo. A conversão é a única ponte entre os dois —
     * não existe caminho que regrave `tree`.
     *
     * @param mixed $data
     * @return array<string, mixed>|null
     */
    public static function validate($data): ?array
    {
        if (!is_array($data)) {
            return null;
        }
        if (in_array($data['kind'] ?? '', self::GRID_SUBTYPES, true)) {
            return self::validateGrid($data);
        }
        if (($data['kind'] ?? '') === self::SUBTYPE_FLOW) {
            return self::validateBoard($data);
        }

        $levels = [];
        foreach (array_slice((array) ($data['levels'] ?? []), 0, 30) as $l) {
            $key = is_array($l) ? self::key($l['key'] ?? '') : '';
            if ($key === '' || isset($levels[$key])) {
                continue;
            }
            $color = (string) ($l['color'] ?? '');
            $levels[$key] = [
                'key'   => $key,
                'label' => self::text($l['label'] ?? $key, 40) ?: $key,
                'color' => preg_match('/^#[0-9a-fA-F]{6}$/', $color) ? strtolower($color) : '#5a6575',
            ];
        }
        $keys     = $levels ? array_keys($levels) : self::LEVELS;
        $fallback = $keys[count($keys) - 1];

        if (isset($data['nodes']) && is_array($data['nodes'])) {
            $raw = ['nodes' => $data['nodes'], 'edges' => (array) ($data['edges'] ?? [])];
        } elseif (isset($data['tree']) && is_array($data['tree'])) {
            $raw = self::fromTree($data['tree']);
            if ($raw === null) {
                return null;
            }
        } else {
            return null;
        }

        $nodes = [];
        $seen  = [];
        foreach (array_slice($raw['nodes'], 0, self::MAX_NODES) as $n) {
            if (!is_array($n)) {
                continue;
            }
            $id = self::key($n['id'] ?? '');
            if ($id === '' || isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            $node = [
                'id'    => $id,
                'name'  => self::text($n['name'] ?? '', 120),
                'role'  => self::text($n['role'] ?? '', 160),
                'lvl'   => in_array($n['lvl'] ?? '', $keys, true) ? $n['lvl'] : $fallback,
                'note'  => self::text($n['note'] ?? '', 500),
                'pend'  => !empty($n['pend']),
                'group' => !empty($n['group']),
            ];
            if (!empty($n['dashed'])) {
                $node['dashed'] = true;
            }
            $kind = self::key($n['kind'] ?? '');
            if ($kind !== '') {
                $node['kind'] = $kind;
            }
            $shape = self::key($n['shape'] ?? '');
            if ($shape !== '') {
                $node['shape'] = $shape;
            }
            // PL-3a: referência da foto (OrgPhoto, 32 hex). A foto em si fica
            // fora do JSON.
            if (OrgPhoto::isToken($n['photo'] ?? null)) {
                $node['photo'] = $n['photo'];
            }
            // Posição: só entra se as DUAS coordenadas vierem. Sem posição, o
            // elemento é ancorado e quem decide onde fica é o layout.
            if (isset($n['x'], $n['y']) && is_numeric($n['x']) && is_numeric($n['y'])) {
                $node['x'] = self::coord($n['x']);
                $node['y'] = self::coord($n['y']);
            }
            $nodes[] = $node;
        }
        if (!$nodes) {
            return null;
        }

        $edges = [];
        $pairs = [];
        foreach (array_slice((array) $raw['edges'], 0, self::MAX_EDGES) as $e) {
            if (!is_array($e)) {
                continue;
            }
            $from = self::key($e['from'] ?? '');
            $to   = self::key($e['to'] ?? '');
            $pair = $from . '>' . $to;
            // Ligação para nó inexistente, laço no próprio nó e ligação
            // repetida saem em silêncio: nenhuma delas tem desenho possível.
            if ($from === '' || $to === '' || $from === $to
                || !isset($seen[$from]) || !isset($seen[$to]) || isset($pairs[$pair])) {
                continue;
            }
            $pairs[$pair] = true;
            $id = self::key($e['id'] ?? '');
            $edge = [
                'id'    => $id !== '' ? $id : 'e' . (count($edges) + 1),
                'from'  => $from,
                'to'    => $to,
                'boss'  => !empty($e['boss']),
                'style' => ($e['style'] ?? '') === 'tracejada' ? 'tracejada' : 'solida',
                'label' => self::text($e['label'] ?? '', 120),
            ];
            // Dobras feitas à mão (bloco 2d-2). Sem dobra, a chave não existe:
            // o traçado automático continua valendo.
            $wps = self::waypoints($e['waypoints'] ?? null);
            if ($wps) {
                $edge['waypoints'] = $wps;
            }
            $edges[] = $edge;
        }
        $edges = self::normalizeBoss($edges);
        if (self::hasCycle($edges)) {
            return null;
        }

        $esc = [];
        foreach (array_slice((array) ($data['esc'] ?? []), 0, 50) as $r) {
            if (!is_array($r)) {
                continue;
            }
            $cells = [];
            foreach (array_slice(array_values((array) ($r['c'] ?? [])), 0, 4) as $c) {
                $cells[] = self::text($c, 1000);
            }
            $esc[] = [
                'lvl' => in_array($r['lvl'] ?? '', $keys, true) ? $r['lvl'] : $fallback,
                'c'   => array_pad($cells, 4, ''),
            ];
        }

        $elements = [];
        foreach (array_slice((array) ($data['elements'] ?? []), 0, 40) as $e) {
            $id = is_array($e) ? self::key($e['id'] ?? '') : '';
            $label = is_array($e) ? trim(self::text($e['label'] ?? '', 40)) : '';
            if ($id === '' || $label === '') {
                continue;
            }
            $elements[] = [
                'id'     => $id,
                'label'  => $label,
                'base'   => ($e['base'] ?? '') === 'equipe' ? 'equipe' : 'pessoa',
                'lvl'    => in_array($e['lvl'] ?? '', $keys, true) ? $e['lvl'] : '',
                'dashed' => !empty($e['dashed']),
            ];
        }

        $kind = self::key($data['kind'] ?? '');
        $out  = [
            'kind'  => in_array($kind, self::KINDS, true) ? $kind : self::SUBTYPE_ORG,
            'nodes' => $nodes,
            'edges' => $edges,
            'esc'   => $esc,
        ];
        if ($levels) {
            $out['levels'] = array_values($levels);
        }
        if ($elements) {
            $out['elements'] = $elements;
        }
        if (strlen((string) json_encode($out)) > self::MAX_BYTES) {
            return null;
        }
        return $out;
    }

    /**
     * Converte a árvore do formato antigo em nós e ligações. A ordem das
     * ligações É a ordem dos irmãos no desenho — por isso a varredura é em
     * profundidade, na ordem em que os filhos estavam.
     *
     * @return array{nodes: array<int, mixed>, edges: array<int, mixed>}|null
     */
    /**
     * Grade (D1): cronograma (períodos x tarefas, célula '', 'b' barra ou 'm'
     * marco) ou matriz RACI (papéis x atividades, célula '', R, A, C ou I).
     * Cada linha tem exatamente uma célula por coluna.
     *
     * @return array<string, mixed>|null
     */
    private static function validateGrid(array $data): ?array
    {
        $raci    = $data['kind'] === self::SUBTYPE_RACI;
        if (!$raci && ($data['mode'] ?? '') === self::SCHEDULE_MODE_DATES) {
            return self::validateDated($data);
        }
        $colKey  = $raci ? 'roles' : 'periods';
        $allowed = $raci ? self::RACI_VALUES : self::SCHEDULE_VALUES;

        $cols = [];
        foreach (array_slice((array) ($data[$colKey] ?? []), 0, self::MAX_GRID_COLS) as $c) {
            $cols[] = self::text(is_scalar($c) ? $c : '', 60);
        }
        if ($cols === []) {
            return null;
        }
        $rows = [];
        foreach (array_slice((array) ($data['rows'] ?? []), 0, self::MAX_GRID_ROWS) as $r) {
            if (!is_array($r)) {
                continue;
            }
            $raw   = array_values((array) ($r['cells'] ?? []));
            $cells = [];
            foreach (array_keys($cols) as $i) {
                $v = is_scalar($raw[$i] ?? '') ? (string) ($raw[$i] ?? '') : '';
                $cells[] = in_array($v, $allowed, true) ? $v : '';
            }
            $row = ['name' => self::text($r['name'] ?? '', 200), 'cells' => $cells];
            if (!$raci) {
                $row['owner'] = self::text($r['owner'] ?? '', 120);
            }
            $rows[] = $row;
        }
        $out = ['kind' => $data['kind'], $colKey => $cols, 'rows' => $rows];
        if (!$raci) {
            // D1-2: unidade dos períodos (Semanas, Meses, Trimestres, Anos).
            $out['unit'] = in_array($data['unit'] ?? '', self::SCHEDULE_UNITS, true) ? $data['unit'] : 'S';
        }
        return $out;
    }

    /**
     * Q7b-1: cronograma com datas. Data só no formato AAAA-MM-DD e que exista
     * no calendário; tarefa com uma data só fica com as duas iguais; fim antes
     * do início troca as duas de lugar (nunca grava barra ao contrário).
     *
     * @return array<string, mixed>
     */
    private static function validateDated(array $data): array
    {
        $rows = [];
        $ids  = [];
        foreach (array_slice((array) ($data['rows'] ?? []), 0, self::MAX_GRID_ROWS) as $r) {
            if (!is_array($r)) {
                continue;
            }
            // Q7b-4: id fixo da linha (a situação da tarefa fica presa a ele).
            $id = is_scalar($r['id'] ?? null) ? (string) $r['id'] : '';
            $ids[] = (preg_match('/^[a-z0-9]{1,12}$/', $id) && !in_array($id, $ids, true)) ? $id : '';
            $name  = self::text($r['name'] ?? '', 200);
            $owner = self::text($r['owner'] ?? '', 120);
            $type  = in_array($r['type'] ?? '', self::SCHEDULE_ROW_TYPES, true) ? $r['type'] : '';
            // Q7b-2: fase não guarda datas (o resumo é calculado pelo motor).
            if ($type === 'fase') {
                $rows[] = ['type' => 'fase', 'name' => $name, 'owner' => $owner];
                continue;
            }
            $start = self::isoDate($r['start'] ?? '');
            $end   = self::isoDate($r['end'] ?? '');
            if ($start === '' || $end === '') {
                $start = $end = ($start !== '' ? $start : $end);
            } elseif ($end < $start) {
                [$start, $end] = [$end, $start];
            }
            if ($type === 'marco') {
                // Marco: uma data só (a do início).
                $rows[] = ['type' => 'marco', 'name' => $name, 'owner' => $owner, 'start' => $start, 'end' => $start];
                continue;
            }
            $rows[] = [
                'name'  => $name,
                'owner' => $owner,
                'start' => $start,
                'end'   => $end,
            ];
        }
        // Linha sem id (cronograma de antes do Q7b-4) ou com id repetido:
        // r + posição, pulando o que já existe. Determinístico: enquanto o
        // JSON não muda, a mesma linha ganha o mesmo id em toda leitura (e o
        // motor o grava na próxima edição).
        $usados = array_flip(array_filter($ids, 'strlen'));
        foreach ($rows as $i => $row) {
            $id = $ids[$i];
            if ($id === '') {
                $id = 'r' . ($i + 1);
                while (isset($usados[$id])) {
                    $id .= 'x';
                }
                $usados[$id] = true;
            }
            $rows[$i]['id'] = $id;
        }
        return [
            'kind'  => self::SUBTYPE_SCHEDULE,
            'mode'  => self::SCHEDULE_MODE_DATES,
            'scale' => in_array($data['scale'] ?? '', self::SCHEDULE_SCALES, true) ? $data['scale'] : 'S',
            'rows'  => $rows,
        ];
    }

    /** AAAA-MM-DD válida (1990 a 2100) ou ''. */
    private static function isoDate($v): string
    {
        $s = is_scalar($v) ? (string) $v : '';
        if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $s, $m)) {
            return '';
        }
        $y = (int) $m[1];
        if ($y < 1990 || $y > 2100 || !checkdate((int) $m[2], (int) $m[3], $y)) {
            return '';
        }
        return $s;
    }

    /**
     * Fluxograma (Q5a): quadro do motor. Itens de tipo desconhecido saem;
     * cada item passa por plain() (só escalares, listas e objetos rasos, com
     * chave segura). Ícones da instalação guardados no quadro (`lib`, Q4a)
     * só com PNG em data:, como o motor aceita.
     *
     * @return array<string, mixed>|null
     */
    private static function validateBoard(array $data): ?array
    {
        $b = $data['board'] ?? null;
        if (!is_array($b)) {
            return null;
        }
        $items = [];
        foreach (array_slice(array_values((array) ($b['items'] ?? [])), 0, self::MAX_BOARD_ITEMS) as $it) {
            if (!is_array($it) || !in_array($it['t'] ?? '', self::BOARD_ITEM_TYPES, true)) {
                continue;
            }
            $clean = self::plain($it, 1);
            if (is_array($clean) && self::key($clean['id'] ?? '') !== '') {
                $items[] = $clean;
            }
        }
        $board = [
            'v'     => 1,
            'mode'  => self::SUBTYPE_FLOW,
            'w'     => max(400, min(6000, (int) ($b['w'] ?? 1400))),
            'h'     => max(300, min(6000, (int) ($b['h'] ?? 900))),
            'items' => $items,
        ];
        $lib = [];
        foreach (array_slice((array) ($b['lib'] ?? []), 0, 200, true) as $k => $ic) {
            $key = self::key($k);
            $img = is_array($ic) ? (string) ($ic['image'] ?? '') : '';
            if ($key !== (string) $k || !preg_match('/^u\d+$/', $key) || strlen($img) > self::MAX_LIB_IMAGE
                || !preg_match('#^data:image/png;base64,[A-Za-z0-9+/]+={0,2}$#', $img)) {
                continue;
            }
            $lib[$key] = [
                'name'   => self::text($ic['name'] ?? '', 80),
                'cat'    => self::key($ic['cat'] ?? ''),
                'search' => self::text($ic['search'] ?? '', 200),
                'mode'   => ($ic['mode'] ?? '') === 'mask' ? 'mask' : 'color',
                'image'  => $img,
            ];
        }
        if ($lib) {
            $board['lib'] = $lib;
        }
        $out = ['kind' => self::SUBTYPE_FLOW, 'board' => $board];
        if (strlen((string) json_encode($out)) > self::MAX_BYTES) {
            return null;
        }
        return $out;
    }

    /**
     * Cópia "só dados" de um item do quadro: texto com teto, número finito,
     * booleano; listas e objetos até MAX_BOARD_DEPTH níveis; chave com
     * caractere estranho sai. null = valor descartado.
     *
     * @param mixed $v
     * @return mixed
     */
    private static function plain($v, int $depth)
    {
        if (is_bool($v) || is_int($v)) {
            return $v;
        }
        if (is_float($v)) {
            return is_finite($v) ? $v : null;
        }
        if (is_string($v)) {
            return self::text($v, self::MAX_BOARD_TEXT);
        }
        if (!is_array($v) || $depth > self::MAX_BOARD_DEPTH) {
            return null;
        }
        $isList = array_is_list($v);
        $out    = [];
        foreach (array_slice($v, 0, 200, true) as $k => $x) {
            if (!$isList && self::key($k) !== (string) $k) {
                continue;
            }
            $c = self::plain($x, $depth + 1);
            if ($c === null) {
                continue;
            }
            if ($isList) {
                $out[] = $c;
            } else {
                $out[(string) $k] = $c;
            }
        }
        // Objeto vazio chega aqui como lista vazia (json_decode associativo)
        // e sai "[]": o motor lê as duas formas do mesmo jeito.
        return $out;
    }

    private static function fromTree($tree): ?array
    {
        $nodes = [];
        $edges = [];
        $count = 0;
        $walk = function ($n, $parentId, int $depth) use (&$walk, &$nodes, &$edges, &$count): bool {
            if (!is_array($n) || $depth > 40 || ++$count > self::MAX_NODES) {
                return false;
            }
            $id = self::key($n['id'] ?? '');
            if ($id === '') {
                $id = 'n' . ($count + 100000);
            }
            $copy = $n;
            unset($copy['kids']);
            $copy['id'] = $id;
            $nodes[] = $copy;
            if ($parentId !== null) {
                $edges[] = ['id' => 'e' . count($edges), 'from' => $parentId, 'to' => $id, 'boss' => true];
            }
            foreach ((array) ($n['kids'] ?? []) as $k) {
                if (!$walk($k, $id, $depth + 1)) {
                    return false;
                }
            }
            return true;
        };
        return $walk($tree, null, 0) ? ['nodes' => $nodes, 'edges' => $edges] : null;
    }

    /**
     * Cada elemento tem NO MÁXIMO UM chefe (decisão de Claudio, 20/09/2026):
     * a ligação de chefia é quem define o time e a posição no arranjo; as
     * demais são reporte e não mexem em nada. Diagramas gravados antes disso
     * não trazem a marca: a primeira ligação que chega vira a chefia, que é
     * exatamente como eles eram desenhados.
     *
     * @param array<int, array<string, mixed>> $edges
     * @return array<int, array<string, mixed>>
     */
    private static function normalizeBoss(array $edges): array
    {
        // Nenhuma marca no conjunto INTEIRO = diagrama gravado antes da
        // chefia explícita. Só nesse caso a primeira ligação que chega vira
        // chefia; com marcas presentes, vale exatamente o que foi marcado,
        // senão um reporte de volta viraria chefia e fecharia um ciclo.
        $legado = true;
        foreach ($edges as $e) {
            if (!empty($e['boss'])) {
                $legado = false;
                break;
            }
        }
        $visto = [];
        foreach ($edges as $i => $e) {
            $to = $e['to'];
            if (!empty($e['boss']) || $legado) {
                // Segundo chefe do mesmo elemento vira reporte: um só manda.
                $edges[$i]['boss'] = empty($visto[$to]);
                $visto[$to] = true;
            }
        }
        return $edges;
    }

    /**
     * Ciclo (A manda em B que manda em A) travaria o desenho: o arranjo anda
     * pela cadeia de chefia. Só as ligações de chefia entram na verificação.
     *
     * @param array<int, array<string, mixed>> $edges
     */
    private static function hasCycle(array $edges): bool
    {
        $parent = [];
        foreach ($edges as $e) {
            if (!empty($e['boss']) && !isset($parent[$e['to']])) {
                $parent[$e['to']] = $e['from'];
            }
        }
        foreach (array_keys($parent) as $start) {
            $seen = [];
            $at   = $start;
            while (isset($parent[$at])) {
                if (isset($seen[$at])) {
                    return true;
                }
                $seen[$at] = true;
                $at = $parent[$at];
            }
        }
        return false;
    }

    /**
     * Pontos de dobra de uma ligação, na mesma coordenada do x/y dos nós.
     * Ponto sem as duas coordenadas numéricas sai em silêncio.
     *
     * @param mixed $raw
     * @return array<int, array{x: int, y: int}>
     */
    private static function waypoints($raw): array
    {
        $out = [];
        if (!is_array($raw)) {
            return $out;
        }
        foreach (array_slice(array_values($raw), 0, self::MAX_WAYPOINTS) as $p) {
            if (is_array($p) && isset($p['x'], $p['y']) && is_numeric($p['x']) && is_numeric($p['y'])) {
                $out[] = ['x' => self::coord($p['x']), 'y' => self::coord($p['y'])];
            }
        }
        return $out;
    }

    private static function coord($v): int
    {
        return max(0, min(self::MAX_COORD, (int) round((float) $v)));
    }

    /** Chave curta e segura (nível, elemento). */
    private static function key($v): string
    {
        return substr(preg_replace('/[^A-Za-z0-9_-]/', '', is_scalar($v) ? (string) $v : ''), 0, 32);
    }

    private static function text($v, int $max): string
    {
        $s = is_scalar($v) ? (string) $v : '';
        return mb_substr($s, 0, $max);
    }
}
