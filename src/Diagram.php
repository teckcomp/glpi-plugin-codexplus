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
 * `data` é o JSON do motor (public/js/codexplus-org.js):
 *   { "tree": { id, name, role, lvl, kids: [...], note, pend, group },
 *     "esc":  [ { lvl, c: [nível, papel, quando escala, tempo] } ] }
 * validate() confere a forma e os limites antes de gravar; o motor confere
 * de novo ao carregar (fix()).
 */
class Diagram
{
    public const SUBTYPE_ORG = 'organograma';

    /** Teto do JSON gravado: um organograma real fica em poucas dezenas de kB. */
    public const MAX_BYTES = 1048576;

    /** Níveis aceitos (mesmas chaves do motor e dos tokens --cx-l-*). */
    public const LEVELS = ['diretoria', 'gestao', 'supervisao', 'n3', 'n2', 'n1', 'noc'];

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
    public static function starter(): array
    {
        return [
            'tree' => [
                'id' => 'n1', 'name' => '', 'role' => 'Direção', 'lvl' => 'diretoria',
                'kids' => [], 'note' => '',
            ],
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
            return [
                'subtype' => (string) $row['subtype'],
                'data'    => self::validate($data) ?? self::starter(),
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

        $json = json_encode($data, JSON_UNESCAPED_UNICODE);
        $now  = date('Y-m-d H:i:s');

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
        $DB->update(self::getTable(), ['data' => $json, 'date_mod' => $now], ['id' => (int) $current['id']]);
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
     * 0.6.7-5: cada organograma traz os próprios níveis (`levels`: chave,
     * nome, cor) e os elementos criados pelo usuário (`elements`). Sem
     * `levels` = organograma anterior: valem as chaves de LEVELS e o motor
     * completa os níveis ao abrir.
     *
     * @param mixed $data
     * @return array<string, mixed>|null
     */
    public static function validate($data): ?array
    {
        if (!is_array($data) || !isset($data['tree']) || !is_array($data['tree'])) {
            return null;
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

        $count = 0;
        $tree  = self::node($data['tree'], 0, $count, $keys, $fallback);
        if ($tree === null) {
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

        $out = ['tree' => $tree, 'esc' => $esc];
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
     * @param array<int, string> $keys níveis válidos
     * @return array<string, mixed>|null
     */
    private static function node($n, int $depth, int &$count, array $keys, string $fallback): ?array
    {
        if (!is_array($n) || $depth > 40 || ++$count > 2000) {
            return null;
        }
        $kids = [];
        foreach ((array) ($n['kids'] ?? []) as $k) {
            $child = self::node($k, $depth + 1, $count, $keys, $fallback);
            if ($child === null) {
                return null;
            }
            $kids[] = $child;
        }
        $id = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($n['id'] ?? ''));
        $out = [
            'id'    => $id !== '' ? substr($id, 0, 32) : 'n' . $count,
            'name'  => self::text($n['name'] ?? '', 120),
            'role'  => self::text($n['role'] ?? '', 160),
            'lvl'   => in_array($n['lvl'] ?? '', $keys, true) ? $n['lvl'] : $fallback,
            'kids'  => $kids,
            'note'  => self::text($n['note'] ?? '', 500),
            'pend'  => !empty($n['pend']),
            'group' => !empty($n['group']),
        ];
        if (array_key_exists('dashed', $n)) {
            $out['dashed'] = !empty($n['dashed']);
        }
        $kind = preg_replace('/[^a-z0-9:_-]/i', '', (string) ($n['kind'] ?? ''));
        if ($kind !== '') {
            $out['kind'] = substr($kind, 0, 40);
        }
        return $out;
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
