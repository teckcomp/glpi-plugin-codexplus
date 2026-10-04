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
    public static function candidates(Document $parent, string $q, int $limit = 15): array
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
            ['NOT' => [$t . '.id' => array_merge([$pid], self::childIds($pid))]],
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
