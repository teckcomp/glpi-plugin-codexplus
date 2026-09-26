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
 * versão em vigor ("em atualização"). Obsoleto e rascunho ficam fora.
 */
final class Library
{
    public const NO_SECTOR   = "\u{10FFFF}"; // ordena por último
    public const NO_CATEGORY = "\u{10FFFF}";

    /**
     * @return array{sectors: array<int, array{name: string, total: int, categories: array<int, array{name: string, docs: array<int, array<string, mixed>>}>}>, total: int, types: array<string, int>}
     */
    public static function shelf(bool $allStatuses = false): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        // R5: quem produz vê todas as situações que a visibilidade libera
        // (a tela filtra; padrão = publicados). Quem só lê, só publicados.
        $docs = array_filter(
            Dashboard::loadAllNew(),
            static fn ($d) => $allStatuses || $d['status'] === Document::STATUS_PUBLISHED
        );

        // Pares (setor, categoria) de cada documento; sem categoria vai para
        // "Sem setor / Sem categoria". Documento em várias categorias aparece
        // em cada uma (é assim que a pessoa o procuraria).
        $pairs = [];
        if ($docs) {
            $dc  = Document_Category::getTable();
            $cat = Category::getTable();
            $sec = Sector::getTable();
            foreach ($DB->request([
                'SELECT'     => [
                    $dc . '.' . Document_Category::$items_id_1 . ' AS did',
                    $cat . '.completename AS catname',
                    $sec . '.name AS secname',
                ],
                'FROM'       => $dc,
                'INNER JOIN' => [$cat => ['ON' => [$dc => Document_Category::$items_id_2, $cat => 'id']]],
                'LEFT JOIN'  => [$sec => ['ON' => [$cat => Category::SECTOR_FIELD, $sec => 'id']]],
                'WHERE'      => [$dc . '.' . Document_Category::$items_id_1 => array_keys($docs)],
            ]) as $r) {
                $pairs[(int) $r['did']][] = [(string) ($r['secname'] ?: self::NO_SECTOR), (string) $r['catname']];
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
            $bloco = ['name' => $s === self::NO_SECTOR ? __('Sem setor', 'codexplus') : $s, 'total' => 0, 'categories' => []];
            $vistos = [];
            foreach ($cats as $c => $lista) {
                uasort($lista, static fn ($a, $b) => strcasecmp($a['name'], $b['name']));
                $bloco['categories'][] = [
                    'name' => $c === self::NO_CATEGORY ? __('Sem categoria', 'codexplus') : $c,
                    'docs' => array_values($lista),
                ];
                $vistos += $lista;
            }
            $bloco['total'] = count($vistos);
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
