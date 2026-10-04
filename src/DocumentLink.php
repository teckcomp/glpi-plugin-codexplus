<?php
namespace GlpiPlugin\Codexplus;

use Session;

/**
 * Documentos vinculados (Etapa 5, Claudio, 04/10/2026).
 *
 * Uma linha por par pai → filho em glpi_plugin_codexplus_documentlinks, com a
 * ordem (rank) dentro do pai. Regras:
 *   - pares permitidos: PSG → POP/DIA, POP → MAN/DIA, MAN → DIA;
 *   - um filho pode ter vários pais;
 *   - sem ciclo: A não entra em B se B já está, em qualquer nível, em A;
 *   - quem gere: responsável, editores (autor, revisor, editores da A-1) e
 *     Super-Admin, a qualquer momento (vale na hora, sem revisão);
 *   - o filho tem que ser visível para quem vincula.
 * A referência dentro do texto (5b) usa esta mesma tabela.
 *
 * Não é CommonDBTM (como DocumentVersion): a permissão é a do documento pai.
 */
class DocumentLink
{
    /** Tipo do pai => tipos de filho aceitos. */
    public const ALLOWED = [
        'PSG' => ['POP', 'DIA'],
        'POP' => ['MAN', 'DIA'],
        'MAN' => ['DIA'],
    ];

    /** Profundidade máxima percorrida (PSG → POP → MAN → DIA = 3; folga). */
    private const MAX_DEPTH = 8;

    public static function getTable(): string
    {
        return Install::DOC_LINKS_TABLE;
    }

    /** O tipo pode ter filhos? */
    public static function canHaveChildren(string $doctype): bool
    {
        return isset(self::ALLOWED[$doctype]);
    }

    /** Pode gerir os vínculos deste documento (pai)? */
    public static function canManage(Document $parent): bool
    {
        if (!self::canHaveChildren((string) ($parent->fields['doctype'] ?? ''))
            || !empty($parent->fields['is_deleted'])
            || (string) ($parent->fields['status'] ?? '') === Document::STATUS_OBSOLETE
            || !$parent->checkEntity()) {
            return false;
        }
        $me = (int) Session::getLoginUserID();
        return Rights::isSuperAdmin()
            || $parent->isEditor()
            || ($me > 0 && DocumentEditor::has((int) $parent->fields['id'], $me));
    }

    /** @return int[] filhos diretos, na ordem */
    public static function childIds(int $parentId): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $out = [];
        foreach ($DB->request([
            'SELECT' => ['child_documents_id'],
            'FROM'   => self::getTable(),
            'WHERE'  => ['parent_documents_id' => $parentId],
            'ORDER'  => ['rank ASC', 'id ASC'],
        ]) as $r) {
            $out[] = (int) $r['child_documents_id'];
        }
        return $out;
    }

    /** @return int[] pais diretos */
    public static function parentIds(int $childId): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $out = [];
        foreach ($DB->request([
            'SELECT' => ['parent_documents_id'],
            'FROM'   => self::getTable(),
            'WHERE'  => ['child_documents_id' => $childId],
            'ORDER'  => ['id ASC'],
        ]) as $r) {
            $out[] = (int) $r['parent_documents_id'];
        }
        return $out;
    }

    /** $target é $from ou está em algum nível abaixo dele? */
    public static function reaches(int $from, int $target, int $depth = 0): bool
    {
        if ($from === $target) {
            return true;
        }
        if ($depth > self::MAX_DEPTH) {
            return true; // por segurança: trata como ciclo
        }
        foreach (self::childIds($from) as $c) {
            if (self::reaches($c, $target, $depth + 1)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Por que não dá para vincular, ou null quando pode. Não confere o
     * direito de quem pede (isso é canManage).
     */
    public static function whyNot(Document $parent, Document $child): ?string
    {
        $pt  = (string) ($parent->fields['doctype'] ?? '');
        $ct  = (string) ($child->fields['doctype'] ?? '');
        $pid = (int) $parent->fields['id'];
        $cid = (int) $child->fields['id'];
        if ($pid === $cid) {
            return __('Um documento não pode ser vinculado a ele mesmo.', 'codexplus');
        }
        if (!in_array($ct, self::ALLOWED[$pt] ?? [], true)) {
            return sprintf(__('%s não aceita %s como documento vinculado.', 'codexplus'), $pt, $ct);
        }
        if (!empty($child->fields['is_deleted'])) {
            return __('Esse documento está na lixeira.', 'codexplus');
        }
        if (countElementsInTable(self::getTable(), ['parent_documents_id' => $pid, 'child_documents_id' => $cid]) > 0) {
            return __('Esse documento já está vinculado.', 'codexplus');
        }
        if (self::reaches($cid, $pid)) {
            return __('Vínculo recusado: formaria um ciclo (este documento já faz parte do outro).', 'codexplus');
        }
        return null;
    }

    /** Vincula no fim da lista. */
    public static function add(Document $parent, int $childId): bool
    {
        /** @var \DBmysql $DB */
        global $DB;

        if (!self::canManage($parent)) {
            return self::deny(__('Sem direito de vincular documentos a este.', 'codexplus'));
        }
        $child = new Document();
        if (!$child->getFromDB($childId) || !$child->canViewItem()) {
            return self::deny(__('Documento não encontrado.', 'codexplus'));
        }
        if (($why = self::whyNot($parent, $child)) !== null) {
            return self::deny($why);
        }
        $pid  = (int) $parent->fields['id'];
        $rank = 0;
        foreach ($DB->request([
            'SELECT' => ['MAX' => 'rank AS m'],
            'FROM'   => self::getTable(),
            'WHERE'  => ['parent_documents_id' => $pid],
        ]) as $r) {
            $rank = (int) ($r['m'] ?? 0);
        }
        return (bool) $DB->insert(self::getTable(), [
            'parent_documents_id' => $pid,
            'child_documents_id'  => $childId,
            'rank'                => $rank + 1,
            'users_id'            => (int) Session::getLoginUserID(),
            'date_creation'       => $_SESSION['glpi_currenttime'] ?? date('Y-m-d H:i:s'),
        ]);
    }

    public static function remove(Document $parent, int $childId): bool
    {
        /** @var \DBmysql $DB */
        global $DB;

        if (!self::canManage($parent)) {
            return self::deny(__('Sem direito de desvincular documentos deste.', 'codexplus'));
        }
        // 5b: citado no texto não sai pela lista (a citação ficaria órfã).
        if (in_array($childId, self::refIds((string) ($parent->fields['content'] ?? '')), true)) {
            return self::deny(__('Este documento é citado no texto. Tire a referência do corpo (e salve) antes de desvincular.', 'codexplus'));
        }
        return (bool) $DB->delete(self::getTable(), [
            'parent_documents_id' => (int) $parent->fields['id'],
            'child_documents_id'  => $childId,
        ]);
    }

    /**
     * Nova ordem dos filhos. Ids que não são filhos são ignorados; filhos
     * que faltarem na lista vão para o fim, na ordem antiga.
     *
     * @param int[] $childIds
     */
    public static function reorder(Document $parent, array $childIds): bool
    {
        /** @var \DBmysql $DB */
        global $DB;

        if (!self::canManage($parent)) {
            return self::deny(__('Sem direito de reordenar os documentos vinculados.', 'codexplus'));
        }
        $pid   = (int) $parent->fields['id'];
        $atual = self::childIds($pid);
        $nova  = array_values(array_unique(array_intersect(array_map('intval', $childIds), $atual)));
        $nova  = array_merge($nova, array_values(array_diff($atual, $nova)));
        foreach ($nova as $i => $cid) {
            $DB->update(self::getTable(), ['rank' => $i + 1], [
                'parent_documents_id' => $pid,
                'child_documents_id'  => $cid,
            ]);
        }
        return true;
    }

    /**
     * Como o documento aparece numa lista de vínculos: código da versão em
     * vigor (na revisão, a publicada), título, tipo e situação.
     *
     * @return array{id:int, code:string, name:string, type:string, type_label:string, state:string, can_view:bool}
     */
    public static function describe(Document $d): array
    {
        $rev  = (int) ($d->fields['revision'] ?? 0);
        $name = (string) ($d->fields['name'] ?? '');
        if ($d->isInRevision()) {
            $rev--;
            $v = DocumentVersion::get((int) $d->fields['id'], $rev);
            if ($v !== null) {
                $name = (string) $v['name'];
            }
        }
        $status = (string) ($d->fields['status'] ?? '');
        $state  = 'ok';
        if ($status === Document::STATUS_OBSOLETE) {
            $state = 'obsoleto';
        } elseif ($status !== Document::STATUS_PUBLISHED && !$d->isInRevision()) {
            $state = 'sem_publicacao';
        } else {
            $exp = DocumentMeta::expiryState(
                $d->fields['date_published'] ?? null,
                (int) ($d->fields['validity_months'] ?? 0),
                Document::STATUS_PUBLISHED,
                $d->fields['review_end'] ?? null
            );
            if (($exp['state'] ?? '') === 'vencido') {
                $state = 'vencido';
            }
        }
        $type = (string) ($d->fields['doctype'] ?? '');
        return [
            'id'         => (int) $d->fields['id'],
            'code'       => sprintf('%s%04d:%02d', $type, (int) ($d->fields['sequence'] ?? 0), max(0, $rev)),
            'name'       => $name,
            'type'       => $type,
            'type_label' => DocumentMeta::getDoctypes()[$type] ?? $type,
            'state'      => $state,
            'can_view'   => $d->canViewItem(),
        ];
    }

    /**
     * Árvore dos vinculados (filhos e, abaixo deles, os netos…), na ordem.
     * Documento já presente no mesmo ramo não desce de novo.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function tree(int $parentId, int $depth = 0, array $seen = []): array
    {
        if ($depth > self::MAX_DEPTH) {
            return [];
        }
        $seen[$parentId] = true;
        $out = [];
        foreach (self::childIds($parentId) as $cid) {
            $c = new Document();
            if (!$c->getFromDB($cid) || !empty($c->fields['is_deleted'])) {
                continue;
            }
            $row = self::describe($c) + ['depth' => $depth, 'children' => []];
            if (!isset($seen[$cid])) {
                $row['children'] = self::tree($cid, $depth + 1, $seen);
            }
            $out[] = $row;
        }
        return $out;
    }

    /**
     * Candidatos para vincular (busca da tela): tipos aceitos pelo pai,
     * visíveis para quem pede, fora da lixeira e de obsoleto, sem os já
     * vinculados, sem ciclo. Busca no título e no número.
     *
     * @return array<int, array{id:int, code:string, name:string, type_label:string}>
     */
    public static function candidates(Document $parent, string $q, int $limit = 15, bool $withLinked = false): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $tipos = self::ALLOWED[(string) $parent->fields['doctype']] ?? [];
        if (!$tipos) {
            return [];
        }
        $pid = (int) $parent->fields['id'];
        $t   = Document::getTable();
        $vis = Document::getVisibilityCriteria();
        $q   = trim($q);
        $where = [
            $t . '.doctype'          => $tipos,
            $t . '.is_deleted'       => 0,
            $t . '.knowbaseitems_id' => 0,
            ['NOT' => [$t . '.status' => Document::STATUS_OBSOLETE]],
            // 5b: a referência no texto também aceita quem já está vinculado.
            ['NOT' => [$t . '.id' => $withLinked ? [$pid] : array_merge([$pid], self::childIds($pid))]],
            // Visibilidade como um bloco só: somar com + perderia as chaves
            // numéricas repetidas.
            $vis['WHERE'],
        ];
        if ($q !== '') {
            $or  = [[$t . '.name' => ['LIKE', '%' . $q . '%']]];
            $num = preg_replace('/\D/', '', $q);
            if ($num !== '') {
                $or[] = [$t . '.sequence' => (int) $num];
            }
            $where[] = ['OR' => $or];
        }
        $out = [];
        foreach ($DB->request([
            'SELECT'    => [$t . '.id', $t . '.doctype', $t . '.sequence'],
            'DISTINCT'  => true,
            'FROM'      => $t,
            'LEFT JOIN' => $vis['LEFT JOIN'],
            'WHERE'     => $where,
            'ORDER'     => [$t . '.doctype', $t . '.sequence'],
            'LIMIT'     => $limit * 2,
        ]) as $r) {
            $id = (int) $r['id'];
            $c  = new Document();
            if (!$c->getFromDB($id) || self::reaches($id, $pid)) {
                continue;
            }
            $d = self::describe($c);
            $out[] = ['id' => $d['id'], 'code' => $d['code'], 'name' => $d['name'], 'type_label' => $d['type_label']];
            if (count($out) >= $limit) {
                break;
            }
        }
        return $out;
    }

    // ---------------------------------------------------------------------
    // 5b — referência dentro do texto e Documentos complementares
    // ---------------------------------------------------------------------

    /**
     * Documentos citados no corpo: <a class="cx-docref" href="…?id=N">. O
     * número sai do href (o sanitizador da leitura tira data-*, achado 57;
     * class e href ficam).
     *
     * @return int[]
     */
    public static function refIds(string $html): array
    {
        if (stripos($html, 'cx-docref') === false) {
            return [];
        }
        preg_match_all('#<a\b[^>]*\bcx-docref\b[^>]*>#i', $html, $tags);
        $ids = [];
        foreach ($tags[0] as $tag) {
            if (preg_match('#[?&](?:amp;)?id(?:=|&\#61;|&\#x3d;)(\d+)#i', $tag, $m)) {
                $ids[] = (int) $m[1];
            }
        }
        return array_values(array_unique($ids));
    }

    /**
     * Ao gravar o corpo: todo documento citado vira vinculado (no fim da
     * lista), se o par for permitido. Par recusado avisa e não vincula.
     */
    public static function syncRefs(Document $parent): void
    {
        $pid = (int) $parent->fields['id'];
        $ja  = self::childIds($pid);
        foreach (self::refIds((string) ($parent->fields['content'] ?? '')) as $cid) {
            if ($cid === $pid || in_array($cid, $ja, true)) {
                continue;
            }
            self::add($parent, $cid);
        }
    }

    /**
     * Troca o texto de cada referência pelo código da versão em vigor e o
     * título atuais (o texto gravado pode estar velho), e o destino do link
     * por $href($doc): string = link, null = só o texto (sem link).
     *
     * @param callable(Document): ?string $href
     */
    public static function resolveRefs(string $html, callable $href): string
    {
        if (stripos($html, 'cx-docref') === false) {
            return $html;
        }
        return (string) preg_replace_callback(
            '#<a\b([^>]*\bcx-docref\b[^>]*)>(.*?)</a>#is',
            static function ($m) use ($href) {
                if (!preg_match('#[?&](?:amp;)?id(?:=|&\#61;|&\#x3d;)(\d+)#i', $m[1], $id)) {
                    return $m[0];
                }
                $d = new Document();
                if (!$d->getFromDB((int) $id[1]) || !empty($d->fields['is_deleted'])) {
                    return '<span class="cx-docref is-gone">' . $m[2] . '</span>';
                }
                $info  = self::describe($d);
                $label = '<span class="cx-docref-code">' . htmlspecialchars($info['code']) . '</span> '
                    . htmlspecialchars($info['name'])
                    . ($info['state'] === 'obsoleto' ? ' <span class="cx-docref-flag">(' . htmlspecialchars(__('obsoleto', 'codexplus')) . ')</span>' : '');
                $to = $href($d);
                return $to === null
                    ? '<span class="cx-docref">' . $label . '</span>'
                    : '<a class="cx-docref" href="' . htmlspecialchars($to) . '">' . $label . '</a>';
            },
            $html
        );
    }

    /**
     * "Documentos complementares" (fim do documento, tela, folhas e PDF):
     * os vinculados diretos, na ordem. $href como em resolveRefs; $note($d,
     * $info) devolve a observação ("sem acesso", "obsoleto"…) ou ''.
     *
     * @return array<int, array{code:string, type:string, name:string, href:?string, note:string}>
     */
    public static function complements(int $parentId, callable $href, ?callable $note = null): array
    {
        $out = [];
        foreach (self::childIds($parentId) as $cid) {
            $d = new Document();
            if (!$d->getFromDB($cid) || !empty($d->fields['is_deleted'])) {
                continue;
            }
            $info  = self::describe($d);
            $out[] = [
                'code' => $info['code'],
                'type' => $info['type_label'],
                'name' => $info['name'],
                'href' => $href($d),
                'note' => $note ? (string) $note($d, $info) : '',
            ];
        }
        return $out;
    }

    /** Observação padrão da página interna: sem acesso / obsoleto / vencido / sem publicação. */
    public static function noteFor(Document $d, array $info): string
    {
        $n = [];
        if (!$info['can_view']) {
            $n[] = __('sem acesso', 'codexplus');
        }
        $map = ['obsoleto' => __('obsoleto', 'codexplus'), 'vencido' => __('vencido', 'codexplus'), 'sem_publicacao' => __('sem versão publicada', 'codexplus')];
        if (isset($map[$info['state']])) {
            $n[] = $map[$info['state']];
        }
        return implode(' · ', $n);
    }

    // ---------------------------------------------------------------------
    // 5c — "Faz parte de" e aviso ao pai
    // ---------------------------------------------------------------------

    /**
     * Pais diretos, para a linha "Faz parte de" (fora da lixeira).
     *
     * @return array<int, array<string, mixed>>
     */
    public static function parents(int $childId): array
    {
        $out = [];
        foreach (self::parentIds($childId) as $pid) {
            $d = new Document();
            if ($d->getFromDB($pid) && empty($d->fields['is_deleted'])) {
                $out[] = self::describe($d);
            }
        }
        return $out;
    }

    /**
     * Vinculados diretos obsoletos ou vencidos (Claudio, 04/10/2026: o pai
     * é avisado — cabe revisão dele).
     *
     * @return array<int, array<string, mixed>>
     */
    public static function problems(int $parentId): array
    {
        $out = [];
        foreach (self::childIds($parentId) as $cid) {
            $d = new Document();
            if (!$d->getFromDB($cid) || !empty($d->fields['is_deleted'])) {
                continue;
            }
            $info = self::describe($d);
            if (in_array($info['state'], ['obsoleto', 'vencido'], true)) {
                $out[] = $info;
            }
        }
        return $out;
    }

    // ---------------------------------------------------------------------
    // 5d — PDF composto em cascata
    // ---------------------------------------------------------------------

    /**
     * Árvore do PDF composto, em ordem de leitura (o documento, depois cada
     * vinculado e, logo abaixo dele, os vinculados dele…). Regras (Claudio,
     * 04/10/2026): todos os níveis, inclusive DIA (folha deitada); sempre a
     * versão PUBLICADA dos vinculados; sem acesso = só título e código;
     * sem versão publicada = nota; repetido = "ver página N" (aponta para
     * a 1ª aparição). A raiz sai como está no Visualizar.
     *
     * @param array<string, mixed> $rootDoc  bagagem do PDF da raiz (print_config.document)
     * @return array{entries: array<int, array<string, mixed>>}
     */
    public static function composite(Document $root, array $rootDoc, string $rootHtml): array
    {
        /** @var array $CFG_GLPI */
        global $CFG_GLPI;

        $entries = [[
            'id' => (int) $root->fields['id'], 'depth' => 0, 'kind' => 'text',
            'doc' => $rootDoc, 'html' => $rootHtml, 'note' => '',
        ]];
        $seen = [(int) $root->fields['id'] => 0];
        $href = static fn (Document $d) => $d->canViewItem()
            ? $CFG_GLPI['url_base'] . '/plugins/codexplus/front/document.form.php?id=' . (int) $d->fields['id'] : null;

        $walk = static function (int $parentId, int $depth) use (&$walk, &$entries, &$seen, $href): void {
            if ($depth > self::MAX_DEPTH) {
                return;
            }
            foreach (self::childIds($parentId) as $cid) {
                $d = new Document();
                if (!$d->getFromDB($cid) || !empty($d->fields['is_deleted'])) {
                    continue;
                }
                $info = self::describe($d);
                $doc  = ['title' => $info['name'], 'code' => $info['code'], 'doctype' => $info['type']];
                if (isset($seen[$cid])) {
                    $entries[] = ['id' => $cid, 'depth' => $depth, 'kind' => 'repeat', 'first' => $seen[$cid], 'doc' => $doc];
                    continue;
                }
                $seen[$cid] = count($entries);
                if (!$info['can_view']) {
                    $entries[] = ['id' => $cid, 'depth' => $depth, 'kind' => 'noaccess', 'doc' => $doc,
                        'note' => __('Sem acesso: este documento faz parte do conjunto, mas você não tem permissão para lê-lo.', 'codexplus')];
                    continue;
                }
                if ($info['state'] === 'sem_publicacao') {
                    $entries[] = ['id' => $cid, 'depth' => $depth, 'kind' => 'unpublished', 'doc' => $doc,
                        'note' => __('Sem versão publicada: este documento ainda não foi validado.', 'codexplus')];
                    $walk($cid, $depth + 1);
                    continue;
                }
                $entries[] = self::compositeEntry($d, $info, $depth, $href);
                $walk($cid, $depth + 1);
            }
        };
        $walk((int) $root->fields['id'], 1);

        return ['entries' => $entries];
    }

    /**
     * Uma entrada do composto com a versão publicada (na revisão, a anterior).
     *
     * @param array<string, mixed> $info  describe()
     * @return array<string, mixed>
     */
    private static function compositeEntry(Document $d, array $info, int $depth, callable $href): array
    {
        $id   = (int) $d->fields['id'];
        $rev  = (int) $d->fields['revision'] - ($d->isInRevision() ? 1 : 0);
        $v    = $d->isInRevision() ? DocumentVersion::get($id, $rev) : null;
        $type = (string) $d->fields['doctype'];
        $direct = DocumentMeta::flowOf($type) === DocumentMeta::FLOW_DIRECT;
        $owner  = (int) ($d->fields['users_id_owner'] ?? 0);
        $doc = [
            'title'          => $info['name'],
            'code'           => $info['code'],
            'revision'       => $rev,
            'client'         => (string) ($d->fields['client_name'] ?? ''),
            'date_mod'       => (string) ($d->fields['date_mod'] ?? ''),
            'doctype'        => $type,
            'owner'          => $owner > 0 ? getUserName($owner) : '',
            'sector'         => implode(', ', array_map(
                static fn ($sid) => \Dropdown::getDropdownName('glpi_plugin_codexplus_sectors', $sid),
                $d->getSectorIds()
            )),
            'date_published' => (string) ($v['date_published'] ?? $d->fields['date_published'] ?? ''),
            'draft'          => $info['state'] === 'obsoleto' ? __('OBSOLETO', 'codexplus') : '',
            'header_html'    => '',
            'norev'          => $direct ? 1 : 0,
            'footer_text'    => (string) ($d->fields['footer_text'] ?? ''),
            'complements'    => self::complements($id, $href, [self::class, 'noteFor']),
            'history'        => $direct ? [] : DocumentVersion::history($id, $rev, $d),
        ];
        if ($type === 'DIA') {
            $data = $v !== null ? DocumentVersion::diagramOf($v) : (Diagram::load($id)['data'] ?? null);
            return ['id' => $id, 'depth' => $depth, 'kind' => 'diagram', 'doc' => $doc,
                'diagram' => ['subtype' => is_array($data) ? Diagram::subtypeOf($data) : '', 'data' => $data]];
        }
        $content = $v !== null ? (string) $v['content'] : (string) ($d->fields['content'] ?? '');
        return ['id' => $id, 'depth' => $depth, 'kind' => 'text', 'doc' => $doc, 'note' => '',
            'html' => \Glpi\RichText\RichText::getEnhancedHtml(self::resolveRefs($content, $href), ['text_maxsize' => 0])];
    }

    /** Documento apagado de vez: some como pai e como filho. */
    public static function purgeDocument(int $docId): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $DB->delete(self::getTable(), ['parent_documents_id' => $docId]);
        $DB->delete(self::getTable(), ['child_documents_id' => $docId]);
    }

    private static function deny(string $msg): bool
    {
        Session::addMessageAfterRedirect($msg, false, ERROR);
        return false;
    }
}
