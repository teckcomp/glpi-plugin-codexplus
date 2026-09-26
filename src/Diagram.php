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
 * `data` é o JSON do motor (public/js/codexplus-org.js). Desde o bloco 2a o
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

    /** @return array<string, string> subtipo => rótulo */
    public static function getSubtypes(): array
    {
        return [
            self::SUBTYPE_ORG      => __('Organograma', 'codexplus'),
            self::SUBTYPE_SCHEDULE => __('Cronograma', 'codexplus'),
            self::SUBTYPE_RACI     => __('Matriz RACI', 'codexplus'),
        ];
    }

    public static function subtypeOf(array $data): string
    {
        $k = (string) ($data['kind'] ?? '');
        return in_array($k, self::GRID_SUBTYPES, true) ? $k : self::SUBTYPE_ORG;
    }

    /** @return array<string, mixed> */
    public static function starter(string $subtype = self::SUBTYPE_ORG): array
    {
        if ($subtype === self::SUBTYPE_SCHEDULE) {
            return [
                'kind'    => self::SUBTYPE_SCHEDULE,
                'unit'    => 'S',
                'periods' => ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'],
                'rows'    => [['name' => '', 'owner' => '', 'cells' => array_fill(0, 8, '')]],
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
