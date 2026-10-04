<?php
namespace GlpiPlugin\Codexplus;

/**
 * Biblioteca (bloco B1, Claudio 26/09/2026): a prateleira dos documentos
 * PUBLICADOS que a pessoa pode ler, agrupada Setor → Categoria. É a tela de
 * entrada de quem só lê (Rights::isProducer() falso, Self-Service incluso) e
 * uma aba do Painel para quem produz. Antecipa a estante da R5.
 *
 * Nenhuma regra própria: parte de Dashboard::loadAllNew(), que já aplica
 * Document::getVisibilityCriteria() e troca a revisão em andamento pela
 * versão em vigor ("em atualização"). Rascunho fica fora; obsoleto, só com
 * "Incluir obsoletos" (HV-1, para quem só lê).
 */
final class Library
{
    public const NO_SECTOR   = "\u{10FFFF}"; // ordena por último
    public const NO_CATEGORY = "\u{10FFFF}";

    /** B2b: estante mínima de 12 nichos, 4 por linha (Claudio, 27/09/2026). */
    public const MIN_NICHES = 12;
    public const NICHE_COLS = 4;
    /** Decorações dos nichos vazios (desenhos próprios, parts/lib-decor). */
    public const DECOR = ['vaso', 'livros', 'relogio', 'trofeu', 'caixa', 'luminaria', 'quadro', 'globo'];

    /**
     * @return array{sectors: array<int, array{name: string, total: int, categories: array<int, array{name: string, docs: array<int, array<string, mixed>>}>}>, total: int, types: array<string, int>}
     */
    public static function shelf(bool $allStatuses = false, bool $withObsolete = false): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        // R5: quem produz vê todas as situações que a visibilidade libera
        // (a tela filtra; padrão = publicados). Quem só lê, só publicados —
        // e, com "Incluir obsoletos" marcado (HV-1), também os obsoletos.
        $docs = array_filter(
            Dashboard::loadAllNew(),
            static fn ($d) => $allStatuses
                || $d['status'] === Document::STATUS_PUBLISHED
                || ($withObsolete && $d['status'] === Document::STATUS_OBSOLETE)
        );

        // Pares (setor, categoria) de cada documento; sem categoria vai para
        // "Sem setor / Sem categoria". Documento em várias categorias aparece
        // em cada uma (é assim que a pessoa o procuraria).
        $pairs  = [];
        $secIds = [];
        $catIds = [];
        if ($docs) {
            $dc  = Document_Category::getTable();
            $cat = Category::getTable();
            $sec = Sector::getTable();
            foreach ($DB->request([
                'SELECT'     => [
                    $dc . '.' . Document_Category::$items_id_1 . ' AS did',
                    $cat . '.id AS catid',
                    $cat . '.completename AS catname',
                    $sec . '.id AS secid',
                    $sec . '.name AS secname',
                ],
                'FROM'       => $dc,
                'INNER JOIN' => [$cat => ['ON' => [$dc => Document_Category::$items_id_2, $cat => 'id']]],
                'LEFT JOIN'  => [$sec => ['ON' => [$cat => Category::SECTOR_FIELD, $sec => 'id']]],
                'WHERE'      => [$dc . '.' . Document_Category::$items_id_1 => array_keys($docs)],
            ]) as $r) {
                $sName = (string) ($r['secname'] ?: self::NO_SECTOR);
                $pairs[(int) $r['did']][] = [$sName, (string) $r['catname']];
                // B2b: ids para os níveis da Biblioteca (?setor=, &cat=).
                $secIds[$sName] = $sName === self::NO_SECTOR ? 0 : (int) $r['secid'];
                $catIds[$sName][(string) $r['catname']] = (int) $r['catid'];
            }
        }

        $tree  = [];
        $types = [];
        foreach ($docs as $id => $d) {
            $types[$d['doctype']] = ($types[$d['doctype']] ?? 0) + 1;
            foreach ($pairs[$id] ?? [[self::NO_SECTOR, self::NO_CATEGORY]] as [$s, $c]) {
                $tree[$s][$c][$id] = $d;
            }
        }

        ksort($tree, SORT_NATURAL | SORT_FLAG_CASE);
        $out = [];
        foreach ($tree as $s => $cats) {
            ksort($cats, SORT_NATURAL | SORT_FLAG_CASE);
            $bloco = [
                'id'         => $secIds[$s] ?? 0,
                'name'       => $s === self::NO_SECTOR ? __('Sem setor', 'codexplus') : $s,
                'total'      => 0,
                'categories' => [],
                'recent'     => [],
            ];
            $vistos = [];
            foreach ($cats as $c => $lista) {
                uasort($lista, static fn ($a, $b) => strcasecmp($a['name'], $b['name']));
                $bloco['categories'][] = [
                    'id'     => $catIds[$s][$c] ?? 0,
                    'name'   => $c === self::NO_CATEGORY ? __('Sem categoria', 'codexplus') : $c,
                    'docs'   => array_values($lista),
                    'recent' => self::byRecent($lista),
                ];
                $vistos += $lista;
            }
            $bloco['total']  = count($vistos);
            $bloco['recent'] = self::byRecent($vistos);
            $out[] = $bloco;
        }
        ksort($types);
        $status = [];
        foreach ($docs as $d) {
            $status[$d['status']] = ($status[$d['status']] ?? 0) + 1;
        }
        return ['sectors' => $out, 'total' => count($docs), 'types' => $types, 'status' => $status];
    }

    /**
     * B2b: documentos do mais recente para o mais antigo (fichários dos
     * nichos). A tela mostra os 5 primeiros que passam no filtro.
     *
     * @param array<int, array<string, mixed>> $docs
     * @return array<int, array<string, mixed>>
     */
    public static function byRecent(array $docs): array
    {
        $out = array_values($docs);
        usort($out, static fn ($a, $b) => ((int) ($b['date_mod_ts'] ?? 0)) <=> ((int) ($a['date_mod_ts'] ?? 0)) ?: strcasecmp((string) $a['name'], (string) $b['name']));
        return $out;
    }

    /**
     * B2b (Claudio, 27/09/2026): a estante tem no mínimo MIN_NICHES nichos
     * (4 por linha, 3 linhas); os que sobram depois dos ocupados ganham uma
     * decoração. Acima do mínimo, completa a última linha. A escolha depende
     * só da posição e do nível (salt = id do setor; não muda a cada
     * recarga) e nunca repete a vizinha.
     *
     * @return string[] chaves das decorações, uma por nicho vazio
     */
    public static function decor(int $filled, int $salt = 0): array
    {
        $total = max(self::MIN_NICHES, (int) ceil(max(0, $filled) / self::NICHE_COLS) * self::NICHE_COLS);
        $n     = count(self::DECOR);
        $out   = [];
        $prev  = '';
        for ($i = max(0, $filled); $i < $total; $i++) {
            $x = ($i * 7 + 3 + $salt * 5) % $n;
            $k = self::DECOR[$x];
            if ($k === $prev) {
                $k = self::DECOR[($x + 1) % $n];
            }
            $out[] = $k;
            $prev  = $k;
        }
        return $out;
    }

    /**
     * B2b: contagens (total, por tipo, por situação) de um recorte da
     * estante — o nível aberto —, sem contar duas vezes o documento que está
     * em várias categorias.
     *
     * @param array<int, array<string, mixed>> $sectors
     * @return array{total: int, types: array<string, int>, status: array<string, int>}
     */
    public static function counts(array $sectors): array
    {
        $seen = [];
        foreach ($sectors as $s) {
            foreach ($s['categories'] as $c) {
                foreach ($c['docs'] as $d) {
                    $seen[(int) $d['id']] = $d;
                }
            }
        }
        $types  = [];
        $status = [];
        foreach ($seen as $d) {
            $types[$d['doctype']]  = ($types[$d['doctype']] ?? 0) + 1;
            $status[$d['status']] = ($status[$d['status']] ?? 0) + 1;
        }
        ksort($types);
        return ['total' => count($seen), 'types' => $types, 'status' => $status];
    }

    /**
     * Lixeira (R5): documentos excluídos que a pessoa pode restaurar
     * (Document::canDeleteItem: bit Excluir + gerir o documento).
     *
     * @return array<int, array{id:int, code:string, name:string, doctype:string, date_mod:string}>
     */
    public static function trash(): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $out = [];
        foreach ($DB->request([
            'SELECT' => ['id'],
            'FROM'   => Document::getTable(),
            'WHERE'  => ['knowbaseitems_id' => 0, 'is_deleted' => 1],
            'ORDER'  => ['date_mod DESC'],
        ]) as $r) {
            $d = new Document();
            if (!$d->getFromDB((int) $r['id']) || !$d->canDeleteItem()) {
                continue;
            }
            $out[] = [
                'id'       => (int) $d->fields['id'],
                'code'     => $d->getCode(),
                'name'     => (string) $d->fields['name'],
                'doctype'  => (string) $d->fields['doctype'],
                'date_mod' => (string) $d->fields['date_mod'],
            ];
        }
        return $out;
    }
}
