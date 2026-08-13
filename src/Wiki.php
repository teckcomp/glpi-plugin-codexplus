<?php

namespace GlpiPlugin\Codexplus;

use CommonGLPI;
use Document_Item;
use KnowbaseItem;
use KnowbaseItem_KnowbaseItemCategory;
use KnowbaseItemTranslation;


/**
 * Wiki do Codex+ — Etapa 0.
 *
 * Lê os dados NATIVOS da base de conhecimento do GLPI e os apresenta como
 * "estante de livros" (categoria = livro, artigo = página).
 *
 * Regras de visibilidade: reaproveitamos KnowbaseItem::getVisibilityCriteria(),
 * o mesmo helper que o GLPI usa nas telas nativas. Assim o plugin respeita
 * automaticamente perfil, grupo, entidade e FAQ, sem reimplementar nada.
 */
class Wiki extends CommonGLPI
{
    public static $rightname = 'plugin_codexplus_wiki';

    public static function getTypeName($nb = 0)
    {
        return __('Codex+', 'codexplus');
    }

    public static function getMenuName()
    {
        return __('Codex+ (Base de Conhecimento)', 'codexplus');
    }

    public static function getMenuContent()
    {
        /** @var array $CFG_GLPI */
        global $CFG_GLPI;

        // Plugin::getWebDir() está DEPRECIADO no GLPI 11 (gera aviso no log a
        // cada carregamento). Os recursos do plugin vivem em /plugins/<key>/.
        // O menu passa a abrir o PAINEL (Etapa 6b), que é a primeira aba.
        return [
            'title' => self::getMenuName(),
            'page'  => $CFG_GLPI['root_doc'] . '/plugins/codexplus/front/dashboard.php',
            'icon'  => 'ti ti-book-2',
        ];
    }

    /**
     * Critérios de visibilidade nativos, prontos para mesclar num request.
     *
     * @return array{'LEFT JOIN': array, 'WHERE': array}
     */
    private static function visibility(): array
    {
        return KnowbaseItem::getVisibilityCriteria();
    }

    /**
     * Categorias visíveis com a contagem de artigos de cada uma.
     * Categoria sem nenhum artigo visível não aparece na estante.
     *
     * @return array<int, array{id:int, name:string, completename:string, level:int, total:int}>
     */
    public static function getShelves(): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $vis = self::visibility();

        $criteria = [
            // ATENÇÃO: o construtor de queries do GLPI escapa as strings do
            // SELECT com crases. Escrever 'COUNT(DISTINCT x) AS total' como
            // texto cru gera SQL inválido. A forma correta é a chave
            // 'COUNT DISTINCT' (ver DBmysqlIterator::handleFields).
            'SELECT' => [
                'glpi_knowbaseitemcategories.id AS cat_id',
                'glpi_knowbaseitemcategories.name AS cat_name',
                'glpi_knowbaseitemcategories.completename AS cat_completename',
                'glpi_knowbaseitemcategories.level AS cat_level',
                'COUNT DISTINCT' => 'glpi_knowbaseitems.id AS total',
            ],
            'FROM'   => 'glpi_knowbaseitemcategories',
            'INNER JOIN' => [
                'glpi_knowbaseitems_knowbaseitemcategories' => [
                    'ON' => [
                        'glpi_knowbaseitems_knowbaseitemcategories' => 'knowbaseitemcategories_id',
                        'glpi_knowbaseitemcategories'               => 'id',
                    ],
                ],
                'glpi_knowbaseitems' => [
                    'ON' => [
                        'glpi_knowbaseitems_knowbaseitemcategories' => 'knowbaseitems_id',
                        'glpi_knowbaseitems'                        => 'id',
                    ],
                ],
            ],
            'LEFT JOIN' => $vis['LEFT JOIN'],
            'WHERE'     => $vis['WHERE'],
            'GROUPBY'   => [
                'glpi_knowbaseitemcategories.id',
                'glpi_knowbaseitemcategories.name',
                'glpi_knowbaseitemcategories.completename',
                'glpi_knowbaseitemcategories.level',
            ],
            'ORDER'     => 'glpi_knowbaseitemcategories.completename',
        ];

        $shelves = [];
        foreach ($DB->request($criteria) as $row) {
            $shelves[] = [
                'id'           => (int) $row['cat_id'],
                'name'         => (string) $row['cat_name'],
                'completename' => (string) $row['cat_completename'],
                'level'        => (int) $row['cat_level'],
                'total'        => (int) $row['total'],
            ];
        }

        return $shelves;
    }

    /**
     * Artigos visíveis, opcionalmente filtrados por categoria.
     *
     * @return array<int, array{id:int, name:string, is_faq:bool, view:int, date_mod:?string}>
     */
    public static function getArticles(?int $categoryId = null): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $vis = self::visibility();

        $criteria = [
            'SELECT'   => [
                'glpi_knowbaseitems.id',
                'glpi_knowbaseitems.name',
                'glpi_knowbaseitems.is_faq',
                'glpi_knowbaseitems.view',
                'glpi_knowbaseitems.date_mod',
            ],
            'DISTINCT' => true,
            'FROM'     => 'glpi_knowbaseitems',
            'LEFT JOIN' => $vis['LEFT JOIN'],
            'WHERE'     => $vis['WHERE'],
            'ORDER'     => 'glpi_knowbaseitems.date_mod DESC',
            'LIMIT'     => 200,
        ];

        if ($categoryId !== null && $categoryId > 0) {
            $criteria['INNER JOIN'] = [
                'glpi_knowbaseitems_knowbaseitemcategories' => [
                    'ON' => [
                        'glpi_knowbaseitems_knowbaseitemcategories' => 'knowbaseitems_id',
                        'glpi_knowbaseitems'                        => 'id',
                    ],
                ],
            ];
            $criteria['WHERE'] = [
                $vis['WHERE'],
                'glpi_knowbaseitems_knowbaseitemcategories.knowbaseitemcategories_id' => $categoryId,
            ];
        }

        $articles = [];
        foreach ($DB->request($criteria) as $row) {
            $articles[] = [
                'id'       => (int) $row['id'],
                'name'     => (string) $row['name'],
                'is_faq'   => (bool) $row['is_faq'],
                'view'     => (int) $row['view'],
                'date_mod' => $row['date_mod'],
            ];
        }

        return $articles;
    }

    /**
     * Documentos para a tela "Documentos" (Etapa 2b): artigos NATIVOS com os
     * metadados do Codex+ (tipo, código derivado, status, responsável)
     * anexados por LEFT JOIN. Artigo sem metadado aparece com '—'.
     *
     * Filtros de categoria, tipo e status vão no SQL. A busca textual (título
     * OU código) é aplicada em PHP sobre o conjunto retornado, porque o código
     * é DERIVADO (não é coluna). Limitação conhecida: a busca textual respeita
     * o LIMIT; paginação fica para uma etapa futura.
     *
     * @param array{category?:?int, doctype?:?string, status?:?string, q?:?string} $filters
     * @return array<int, array<string, mixed>>
     */
    public static function getDocuments(array $filters = []): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $categoryId = isset($filters['category']) && (int) $filters['category'] > 0
            ? (int) $filters['category']
            : null;
        $doctype = !empty($filters['doctype']) ? (string) $filters['doctype'] : null;
        $status  = !empty($filters['status'])  ? (string) $filters['status']  : null;
        $q       = isset($filters['q']) ? trim((string) $filters['q']) : '';

        $meta = DocumentMeta::getTable();
        $vis  = self::visibility();

        // WHERE no padrão já validado do getArticles: $vis['WHERE'] aninhado
        // como elemento 0, mais condições com chave (AND).
        $where = [$vis['WHERE']];
        if ($doctype !== null) {
            $where[$meta . '.doctype'] = $doctype;
        }
        if ($status !== null) {
            $where[$meta . '.status'] = $status;
        }
        if ($categoryId !== null) {
            $where['glpi_knowbaseitems_knowbaseitemcategories.knowbaseitemcategories_id'] = $categoryId;
        }

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
                'glpi_knowbaseitems.is_faq',
                'glpi_knowbaseitems.date_mod',
                $meta . '.doctype',
                $meta . '.sequence',
                $meta . '.revision',
                $meta . '.status',
                $meta . '.users_id_owner',
            ],
            'DISTINCT'  => true,
            'FROM'      => 'glpi_knowbaseitems',
            'LEFT JOIN' => $join,
            'WHERE'     => $where,
            'ORDER'     => 'glpi_knowbaseitems.date_mod DESC',
            'LIMIT'     => 500,
        ];

        if ($categoryId !== null) {
            $criteria['INNER JOIN'] = [
                'glpi_knowbaseitems_knowbaseitemcategories' => [
                    'ON' => [
                        'glpi_knowbaseitems_knowbaseitemcategories' => 'knowbaseitems_id',
                        'glpi_knowbaseitems'                        => 'id',
                    ],
                ],
            ];
        }

        $rows = [];
        $ids  = [];
        foreach ($DB->request($criteria) as $r) {
            $id    = (int) $r['id'];
            $ids[] = $id;

            $code = '';
            if (!empty($r['doctype']) && !empty($r['sequence'])) {
                $code = sprintf('%s%04d:%02d', $r['doctype'], (int) $r['sequence'], (int) $r['revision']);
            }

            $ownerId = (int) ($r['users_id_owner'] ?? 0);

            $rows[$id] = [
                'id'       => $id,
                'name'     => (string) $r['name'],
                'is_faq'   => (bool) $r['is_faq'],
                'date_mod' => $r['date_mod'],
                'doctype'  => (string) ($r['doctype'] ?? ''),
                'status'   => (string) ($r['status'] ?? ''),
                'code'     => $code,
                'owner'    => $ownerId ? getUserName($ownerId) : '',
                'category' => '',
            ];
        }

        // Categoria (relação N:N) — 1 query em lote; pega a primeira em ordem
        // alfabética como categoria "principal" para a coluna.
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
                if (isset($rows[$kbid]) && $rows[$kbid]['category'] === '') {
                    $rows[$kbid]['category'] = (string) $c['catname'];
                }
            }
        }

        // Busca textual (título OU código), em PHP porque o código é derivado.
        if ($q !== '') {
            $needle = mb_strtolower($q);
            $rows = array_filter($rows, static function ($row) use ($needle) {
                return mb_strpos(mb_strtolower($row['name']), $needle) !== false
                    || mb_strpos(mb_strtolower($row['code']), $needle) !== false;
            });
        }

        return array_values($rows);
    }

    /**
     * Carrega um artigo completo para leitura DENTRO do plugin.
     *
     * A permissão é verificada com KnowbaseItem::canViewItem(), o mesmo
     * método usado pela tela nativa — inclui dono, admin de KB, FAQ e
     * visibilidade por perfil/grupo/entidade.
     *
     * @return array|null null quando não existe ou o usuário não pode ver
     */
    public static function getArticle(int $id): ?array
    {
        $kb = new KnowbaseItem();

        if (!$kb->getFromDB($id)) {
            return null;
        }

        if (!$kb->canViewItem()) {
            return null;
        }

        // Mantém a contagem de visualizações coerente com a tela nativa.
        $kb->updateCounter();

        // Categorias do artigo (relação N:N), com nome completo da árvore.
        $categories = [];
        foreach (KnowbaseItem_KnowbaseItemCategory::getItems($kb) as $link) {
            $catId = (int) $link['knowbaseitemcategories_id'];
            $categories[] = [
                'id'   => $catId,
                'name' => getTreeValueCompleteName('glpi_knowbaseitemcategories', $catId),
            ];
        }

        return [
            'id'         => (int) $kb->fields['id'],
            // getAnswer() resolve tradução, imagens inline e âncoras de
            // título — é o mesmo preparo que a tela nativa faz.
            'subject'    => KnowbaseItemTranslation::getTranslatedValue($kb, 'name'),
            'answer'     => $kb->getAnswer(),
            'categories' => $categories,
            'writer'     => $kb->fields['users_id'] ? getUserName($kb->fields['users_id']) : '',
            'is_faq'     => (bool) $kb->fields['is_faq'],
            'view'       => (int) $kb->fields['view'],
            'date_mod'   => $kb->fields['date_mod'],
            'can_update' => $kb->canUpdateItem(),
            'attachments' => self::getAttachments($kb),
            // Etapa 4b: metadado de documento controlado. Sempre presente —
            // getForKnowbaseItem() devolve instância vazia quando o artigo
            // ainda não foi classificado, então o Twig nunca recebe null.
            'meta'        => self::articleMeta($id),
        ];
    }

    /**
     * Metadado de documento controlado, pronto para o Twig e para o JSON de
     * impressão.
     *
     * `code` já vem derivado (POP0014:01). `has_meta` distingue "artigo sem
     * classificação" de "artigo classificado" — sem isso a tela mostraria
     * um selo de status vazio em todo artigo comum da base.
     *
     * @return array<string, mixed>
     */
    private static function articleMeta(int $kbId): array
    {
        $meta = DocumentMeta::getForKnowbaseItem($kbId);

        $doctype = (string) ($meta->fields['doctype'] ?? '');
        $status  = (string) ($meta->fields['status'] ?? 'rascunho');
        $code    = $meta->getCode();

        $expiry = DocumentMeta::expiryState(
            $meta->fields['date_published'] ?? null,
            (int) ($meta->fields['validity_months'] ?? 0),
            $status
        );

        // Descrição sem a sigla: o código ao lado já mostra o tipo.
        $doctypes = DocumentMeta::getDoctypeDescriptions();
        $statuses = DocumentMeta::getStatuses();

        return [
            'has_meta'      => $code !== '',
            'doctype'       => $doctype,
            'doctype_label' => $doctypes[$doctype] ?? '',
            'code'          => $code,
            // Revisão com 2 dígitos, separada do código porque o rodapé do
            // PDF pode usar {codigo} e {revisao} em posições diferentes.
            'revision'      => sprintf('%02d', (int) ($meta->fields['revision'] ?? 0)),
            'status'        => $status,
            'status_label'  => $statuses[$status] ?? '',
            'expiry'        => $expiry['state'],
            'due_ts'        => $expiry['due'],
            'owner'         => !empty($meta->fields['users_id_owner'])
                ? getUserName((int) $meta->fields['users_id_owner'])
                : '',
            'client_name'   => (string) ($meta->fields['client_name'] ?? ''),
        ];
    }

    /**
     * Anexos (documentos) do artigo — Etapa 1.1.
     *
     * Espelha EXATAMENTE o critério da tela nativa (KnowbaseItem::showFull,
     * GLPI 11.0.6): usa Document_Item::getDocumentForItemRequest() e descarta
     * os excluídos (is_deleted = 0). Não filtramos imagem inline por tag,
     * porque o GLPI nativo também não filtra — o objetivo desta etapa é
     * apenas equiparar a leitura do plugin à tela nativa.
     *
     * A restrição de entidade já vem embutida no critério nativo. O link de
     * download aponta para document.send.php com o escopo do artigo
     * (itemtype/items_id), então o GLPI re-verifica a permissão do arquivo no
     * servidor: não é possível baixar anexo de um artigo que o usuário não vê.
     *
     * @return array<int, array{name:string, mime:string, url:string, date:?string}>
     */
    private static function getAttachments(KnowbaseItem $kb): array
    {
        /** @var \DBmysql $DB */
        global $DB, $CFG_GLPI;

        $criteria = Document_Item::getDocumentForItemRequest($kb, ['filename ASC']);
        $criteria['WHERE'][] = ['is_deleted' => '0'];

        $attachments = [];
        foreach ($DB->request($criteria) as $row) {
            $filename = (string) ($row['filename'] ?? '');
            $name     = $filename !== '' ? $filename : (string) ($row['name'] ?? '');

            $attachments[] = [
                'name' => $name,
                'mime' => (string) ($row['mime'] ?? ''),
                'url'  => $CFG_GLPI['root_doc']
                          . '/front/document.send.php?docid=' . (int) $row['id']
                          . '&itemtype=KnowbaseItem&items_id=' . (int) $kb->fields['id'],
                'date' => $row['assocdate'] ?? null,
            ];
        }

        return $attachments;
    }

    /**
     * DIAGNÓSTICO (temporário, Etapa 0): total de artigos na tabela, SEM
     * aplicar regras de visibilidade. Serve para distinguir duas causas
     * diferentes de "0 artigos" na tela:
     *   - total 0  => a base de conhecimento desta instância está vazia
     *   - total >0 => existem artigos, mas a visibilidade os está filtrando
     */
    public static function countAllArticlesRaw(): int
    {
        /** @var \DBmysql $DB */
        global $DB;

        foreach ($DB->request([
            'COUNT' => 'total',
            'FROM'  => 'glpi_knowbaseitems',
        ]) as $row) {
            return (int) $row['total'];
        }

        return 0;
    }

    /**
     * Nome de uma categoria (para o título da tela filtrada).
     */
    public static function getCategoryName(int $categoryId): string
    {
        /** @var \DBmysql $DB */
        global $DB;

        foreach ($DB->request([
            'SELECT' => ['completename'],
            'FROM'   => 'glpi_knowbaseitemcategories',
            'WHERE'  => ['id' => $categoryId],
            'LIMIT'  => 1,
        ]) as $row) {
            return (string) $row['completename'];
        }

        return '';
    }
}
