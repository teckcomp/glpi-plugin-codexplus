<?php
namespace GlpiPlugin\Codexplus;

use CommonDBTM;

/**
 * Modelo (template) por tipo de documento — Etapa 3a.
 *
 * Guarda o esqueleto HTML das seções de cada tipo (POP, PSG, Manual,
 * Proposta). Na Etapa 3b, o botão "Novo documento" usa isto para criar um
 * artigo já com o conteúdo e os metadados preenchidos.
 *
 * Só um modelo "padrão" por tipo (is_default) — usado como sugestão inicial.
 */
class Template extends CommonDBTM
{
    public static $rightname = 'plugin_codexplus_wiki';

    public static function getTable($classname = null): string
    {
        return Install::TEMPLATES_TABLE;
    }

    public static function getTypeName($nb = 0)
    {
        return _n('Modelo', 'Modelos', $nb, 'codexplus');
    }

    public static function getIcon()
    {
        return 'ti ti-layout-list';
    }

    public const SECTOR_FIELD   = 'plugin_codexplus_sectors_id';
    public const CATEGORY_FIELD = 'plugin_codexplus_categories_id';

    /**
     * MO-1 (Claudio, 04/10/2026): lugar efetivo de um modelo. Com categoria,
     * o setor é sempre o da categoria (ela pode ter mudado de setor depois);
     * categoria sem setor (setor apagado) não prende o modelo: ele sobe para
     * o setor gravado, ou para Geral.
     *
     * @param array<int, int> $catSector id da categoria => id do setor
     * @return array{0:int, 1:int} [setor, categoria]
     */
    public static function placementOf(int $sector, int $category, array $catSector): array
    {
        if ($category > 0) {
            $cs = $catSector[$category] ?? 0;
            if ($cs > 0) {
                return [$cs, $category];
            }
            $category = 0;
        }
        return [max(0, $sector), 0];
    }

    /** @return array<int, int> id da categoria => id do setor, de todas */
    private static function allCategorySectors(): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $out = [];
        foreach ($DB->request([
            'SELECT' => ['id', Category::SECTOR_FIELD],
            'FROM'   => Category::getTable(),
        ]) as $r) {
            $out[(int) $r['id']] = (int) $r[Category::SECTOR_FIELD];
        }
        return $out;
    }

    /**
     * Modelos para a criação (R3b4 + MO-1): todos de uma vez; a tela filtra
     * pelo tipo, pelo setor e pelas categorias escolhidos no formulário.
     * `scope` = a categoria do modelo e todas as subcategorias dela (o modelo
     * de "Rede" vale em "Rede › Switches"). Setor 0 = Geral (todos).
     *
     * @return array<int, array{id:int, name:string, doctype:string, is_default:bool, content:string, sector:int, category:int, scope:int[]}>
     */
    public static function listForCreation(): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $catSector = self::allCategorySectors();
        $out = [];
        foreach ($DB->request([
            'FROM'  => self::getTable(),
            'ORDER' => ['doctype', 'is_default DESC', 'name'],
        ]) as $r) {
            [$sid, $cid] = self::placementOf((int) ($r[self::SECTOR_FIELD] ?? 0), (int) ($r[self::CATEGORY_FIELD] ?? 0), $catSector);
            $scope = $cid > 0 ? array_values(array_map('intval', getSonsOf(Category::getTable(), $cid))) : [];
            $out[] = [
                'id'         => (int) $r['id'],
                'name'       => (string) $r['name'],
                'doctype'    => (string) $r['doctype'],
                'is_default' => (bool) $r['is_default'],
                'content'    => (string) ($r['content'] ?? ''),
                'sector'     => $sid,
                'category'   => $cid,
                'scope'      => $scope,
            ];
        }
        return $out;
    }

    /**
     * MO-1: tela Modelos agrupada. Geral primeiro; depois cada setor (por
     * nome) com "Setor todo" e as categorias (por nome completo).
     *
     * @return array<int, array{key:string, sector:int, name:string, count:int, subs:array<int, array{name:string, rows:array}>}>
     */
    public static function listGrouped(string $doctype = ''): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $catSector = self::allCategorySectors();
        $where = $doctype !== '' ? ['doctype' => $doctype] : [];
        $grupos = [];
        foreach ($DB->request([
            'FROM'  => self::getTable(),
            'WHERE' => $where,
            'ORDER' => ['doctype', 'is_default DESC', 'name'],
        ]) as $r) {
            [$sid, $cid] = self::placementOf((int) ($r[self::SECTOR_FIELD] ?? 0), (int) ($r[self::CATEGORY_FIELD] ?? 0), $catSector);
            $grupos[$sid][$cid][] = $r;
        }

        $nomeSetor = static fn (int $id): string => $id > 0 ? (string) \Dropdown::getDropdownName(Sector::getTable(), $id) : '';
        $nomeCat   = static function (int $id): string {
            $c = new Category();
            return $id > 0 && $c->getFromDB($id) ? (string) ($c->fields['completename'] ?: $c->fields['name']) : '';
        };

        $out = [];
        foreach ($grupos as $sid => $porCat) {
            $subs = [];
            foreach ($porCat as $cid => $rows) {
                $subs[] = [
                    'category' => $cid,
                    'name'     => $cid > 0 ? $nomeCat($cid) : '',
                    'rows'     => $rows,
                ];
            }
            usort($subs, static fn ($a, $b) => [$a['category'] > 0, $a['name']] <=> [$b['category'] > 0, $b['name']]);
            $out[] = [
                'sector' => $sid,
                'name'   => $nomeSetor($sid),
                'count'  => array_sum(array_map(static fn ($s) => count($s['rows']), $subs)),
                'subs'   => $subs,
            ];
        }
        usort($out, static fn ($a, $b) => [$a['sector'] > 0, $a['name']] <=> [$b['sector'] > 0, $b['name']]);
        return $out;
    }

    public static function getDefaultForDoctype(string $doctype): ?self
    {
        $tpl = new self();
        if ($tpl->getFromDBByCrit(['doctype' => $doctype, 'is_default' => 1])) {
            return $tpl;
        }
        if ($tpl->getFromDBByCrit(['doctype' => $doctype])) {
            return $tpl;
        }
        return null;
    }

    public function prepareInputForAdd($input)
    {
        return $this->sanitize($input);
    }

    public function prepareInputForUpdate($input)
    {
        // MO-1: update parcial (ex.: o GLPI zerando só a categoria apagada)
        // não pode zerar o outro campo de lugar: o que não veio fica o gravado.
        $temS = array_key_exists(self::SECTOR_FIELD, $input);
        $temC = array_key_exists(self::CATEGORY_FIELD, $input);
        if ($temS xor $temC) {
            $falta = $temS ? self::CATEGORY_FIELD : self::SECTOR_FIELD;
            $input[$falta] = (int) ($this->fields[$falta] ?? 0);
        }
        return $this->sanitize($input);
    }

    private function sanitize(array $input): array
    {
        if (isset($input['doctype']) && !in_array($input['doctype'], DocumentMeta::DOCTYPE_KEYS, true)) {
            $input['doctype'] = '';
        }
        // Checkbox: ausente no POST = desmarcado.
        $input['is_default'] = !empty($input['is_default']) ? 1 : 0;
        // MO-1: setor e categoria opcionais (0 = Geral / setor todo). Com
        // categoria, o setor é o dela; categoria sem setor não serve.
        if (array_key_exists(self::SECTOR_FIELD, $input) || array_key_exists(self::CATEGORY_FIELD, $input)) {
            $sid = max(0, (int) ($input[self::SECTOR_FIELD] ?? 0));
            $cid = max(0, (int) ($input[self::CATEGORY_FIELD] ?? 0));
            if ($cid > 0) {
                $sid = Category::getSectorOf($cid);
                if ($sid === 0) {
                    $cid = 0;
                    $sid = max(0, (int) ($input[self::SECTOR_FIELD] ?? 0));
                }
            }
            $input[self::SECTOR_FIELD]   = $sid;
            $input[self::CATEGORY_FIELD] = $cid;
        }
        // MO-2 (Claudio, 04/10/2026): modelo não guarda imagem (M1), mas o
        // lugar dela fica: cada imagem, print anotado, planta e topologia vira
        // um marcador ("Imagem aqui", "Planta aqui"...). Planilha fica inteira.
        if (isset($input['content'])) {
            $input['content'] = self::toPlaceholders((string) $input['content']);
        }
        return $input;
    }

    /** MO-2: classe do marcador e texto padrão de cada tipo. */
    public const PLACEHOLDER_CLASS = 'cx-ph';
    public const PLACEHOLDER_KINDS = [
        'imagem'    => 'Imagem aqui',
        'planta'    => 'Planta aqui',
        'topologia' => 'Topologia aqui',
        'calor'     => 'Mapa de calor aqui',
        'quadro'    => 'Quadro aqui',
    ];

    /** HTML de um marcador (texto só, sem arquivo: vale em qualquer documento). */
    public static function placeholderHtml(string $kind, string $text = ''): string
    {
        $kind = isset(self::PLACEHOLDER_KINDS[$kind]) ? $kind : 'imagem';
        $text = trim($text) !== '' ? trim($text) : __(self::PLACEHOLDER_KINDS[$kind], 'codexplus');
        return '<span class="' . self::PLACEHOLDER_CLASS . ' ' . self::PLACEHOLDER_CLASS . '-' . $kind
            . '" contenteditable="false">' . htmlspecialchars($text, ENT_QUOTES | ENT_HTML5, 'UTF-8') . '</span>';
    }

    /** MO-2: quantos marcadores ainda estão no corpo (não preenchidos). */
    public static function countPlaceholders(string $html): int
    {
        return (int) preg_match_all('#<span\b[^>]*\bclass="[^"]*\bcx-ph\b[^"]*"#i', $html);
    }

    /**
     * MO-2: troca imagem, print anotado (span.cx-annot) e quadro (span.cx-board,
     * planta ou topologia pelo `mode` do JSON) por um marcador. A legenda do
     * quadro (span.cx-board-legend) sai junto com ele. Planilha (div.cx-sheet)
     * e marcadores já existentes ficam como estão. Sem nada para trocar, o
     * HTML volta igual, byte a byte.
     */
    public static function toPlaceholders(string $html): string
    {
        if (!preg_match('#<img\b|\bcx-annot\b|\bcx-board\b#i', $html)) {
            return $html;
        }
        $dom  = new \DOMDocument();
        $prev = libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="UTF-8"?><html><body><div id="cx-ph-root">' . $html . '</div></body></html>', LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($prev);
        $xp   = new \DOMXPath($dom);
        $root = $dom->getElementById('cx-ph-root') ?? $xp->query('//div[@id="cx-ph-root"]')->item(0);
        if (!$root instanceof \DOMElement) {
            return self::stripImagesRegex($html);
        }
        $cls = static fn (string $c): string => "contains(concat(' ', normalize-space(@class), ' '), ' {$c} ')";

        $swap = static function (\DOMNode $old, string $kind) use ($dom): void {
            $frag = $dom->createDocumentFragment();
            $tmp  = new \DOMDocument();
            $tmp->loadHTML('<?xml encoding="UTF-8"?><html><body>' . self::placeholderHtml($kind) . '</body></html>', LIBXML_NONET);
            $span = $tmp->getElementsByTagName('span')->item(0);
            $frag->appendChild($dom->importNode($span, true));
            // Imagem que o GLPI embrulhou num link só dela: troca o link inteiro.
            $target = $old;
            $p = $old->parentNode;
            if ($p instanceof \DOMElement && strtolower($p->nodeName) === 'a' && trim($p->textContent) === '' && $p->getElementsByTagName('img')->length === 1) {
                $target = $p;
            }
            $target->parentNode->replaceChild($frag, $target);
        };

        // 1. Legendas de quadro: saem (o marcador do quadro já diz o que era).
        foreach (iterator_to_array($xp->query('.//span[' . $cls('cx-board-legend') . ']', $root)) as $lg) {
            $par = $lg->parentNode;
            $par->removeChild($lg);
            if ($par instanceof \DOMElement && strtolower($par->nodeName) === 'p' && $par !== $root
                && trim(str_replace("\u{200B}", '', $par->textContent), " \t\n\r\0\x0B\u{00A0}") === '' && $par->getElementsByTagName('*')->length === 0) {
                $par->parentNode->removeChild($par);
            }
        }
        // 2. Quadros (planta / topologia).
        foreach (iterator_to_array($xp->query('.//span[' . $cls('cx-board') . ']', $root)) as $b) {
            $data = json_decode((string) $b->getAttribute('data-cx-board'), true);
            $mode = is_array($data) ? (string) ($data['mode'] ?? '') : '';
            $swap($b, in_array($mode, ['planta', 'topologia', 'calor'], true) ? $mode : 'quadro');
        }
        // 3. Prints anotados.
        foreach (iterator_to_array($xp->query('.//span[' . $cls('cx-annot') . ']', $root)) as $a) {
            $swap($a, 'imagem');
        }
        // 4. Imagens soltas.
        foreach (iterator_to_array($xp->query('.//img', $root)) as $img) {
            $swap($img, 'imagem');
        }

        $out = '';
        foreach ($root->childNodes as $n) {
            $out .= $dom->saveHTML($n);
        }
        return $out;
    }

    /** Reserva, se o HTML não puder ser lido: tira as imagens como no M1. */
    private static function stripImagesRegex(string $html): string
    {
        $html = preg_replace('#<span[^>]*class="[^"]*\bcx-annot\b[^"]*"[^>]*>.*?</span>#si', '', $html) ?? $html;
        return preg_replace('#<img\b[^>]*>#i', '', $html) ?? $html;
    }

    public function post_addItem()
    {
        $this->enforceSingleDefault();
    }

    public function post_updateItem($history = true)
    {
        $this->enforceSingleDefault();
    }

    /**
     * Garante um único modelo padrão por tipo NO MESMO LUGAR (MO-1: Geral,
     * setor todo, ou setor + categoria): ao salvar este como padrão, zera o
     * is_default dos outros do mesmo tipo e lugar.
     */
    private function enforceSingleDefault(): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        if (empty($this->fields['is_default']) || empty($this->fields['doctype'])) {
            return;
        }

        $DB->update(
            self::getTable(),
            ['is_default' => 0],
            [
                'doctype'            => $this->fields['doctype'],
                self::SECTOR_FIELD   => (int) ($this->fields[self::SECTOR_FIELD] ?? 0),
                self::CATEGORY_FIELD => (int) ($this->fields[self::CATEGORY_FIELD] ?? 0),
                'id'                 => ['<>', $this->getID()],
            ]
        );
    }

    // ---------------------------------------------------------------------
    // Sementes iniciais (Etapa 3a) — inseridas só na criação da tabela.
    // 3c-4 (04/10/2026): sem "Histórico de revisão" escrito à mão (a R6-b
    // imprime o histórico no fim do PDF) e sem "Procedimentos vinculados"
    // no PSG (a Etapa 5 lista os documentos vinculados sozinha).
    // ---------------------------------------------------------------------

    /**
     * @return array<int, array{0:string, 1:string, 2:string}> [doctype, nome, conteúdo]
     */
    public static function getDefaultSeeds(): array
    {
        return [
            ['POP', __('Modelo padrão de POP', 'codexplus'),      self::seedPOP()],
            ['PSG', __('Modelo padrão de PSG', 'codexplus'),      self::seedPSG()],
            ['MAN', __('Modelo padrão de Manual', 'codexplus'),   self::seedMAN()],
            ['PRP', __('Modelo padrão de Proposta', 'codexplus'), self::seedPRP()],
        ];
    }

    private static function seedPOP(): string
    {
        return '<h2>Objetivo</h2><p></p>'
            . '<h2>Pré-requisitos</h2><ul><li></li></ul>'
            . '<h2>Passos</h2><ol><li></li></ol>'
            . '<h2>Observações</h2><p></p>';
    }

    private static function seedPSG(): string
    {
        return '<h2>Objetivo</h2><p></p>'
            . '<h2>Abrangência</h2><p></p>'
            . '<h2>Responsabilidades</h2><p></p>';
    }

    private static function seedMAN(): string
    {
        return '<h2>Introdução</h2><p></p>'
            . '<h2>Requisitos</h2><ul><li></li></ul>'
            . '<h2>Uso</h2><p></p>'
            . '<h2>Manutenção</h2><p></p>'
            . '<h2>Referências</h2><p></p>';
    }

    /**
     * Modelo padrão de Proposta que o plugin traz (só na criação da tabela,
     * numa instalação nova). Genérico de propósito (Claudio, 04/10/2026):
     * modelo com a cara de um cenário — como a proposta completa da
     * Resolutto, montada na homologação na 3c-3 — é DADO da instalação, não
     * código do plugin. Leva-se para outra base como dado (linha da tabela
     * de modelos), nunca pelo Install. As peças (Planilha, Resumo, Atenção,
     * Planta) ficam nos botões do editor.
     */
    private static function seedPRP(): string
    {
        return '<h2>Objetivo</h2><p></p>'
            . '<h2>Escopo</h2><p></p>'
            . '<h2>Investimento</h2><p></p>'
            . '<h2>Prazos</h2><p></p>'
            . '<h2>Observações</h2><p></p>';
    }
}
