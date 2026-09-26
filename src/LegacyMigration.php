<?php
namespace GlpiPlugin\Codexplus;

use Log;
use Session;

/**
 * R4 (Claudio, 19/09 e 26/09/2026): migração, de uso único, dos documentos
 * do modelo antigo (linha de glpi_plugin_codexplus_documents com
 * knowbaseitems_id > 0, conteúdo no artigo da Base de Conhecimento) para o
 * modelo novo (Document, knowbaseitems_id = 0).
 *
 * A linha é a MESMA: id, tipo, sequencial, revisão, situação, responsável,
 * validade, cliente, cabeçalho, rodapé e datas ficam como estão — o código
 * (POP0001:03) é preservado sem esforço. Do artigo vêm título, corpo,
 * entidade, autor, categorias (criadas no Codex+ pelo nome, sem setor),
 * leitores (perfis, grupos, usuários; alvo por entidade não existe no
 * Codex+ e é contado como "não migrado") e anexos (Document_Item passa a
 * apontar também para o documento novo; os links das imagens coladas idem).
 *
 * O artigo nativo fica intocado. O histórico de revisões nativo não migra.
 * Não é Install (dado não é schema, CONTEXTO §6): roda pela tela
 * front/migrate.php, só Super-Admin, com prévia e confirmação.
 */
final class LegacyMigration
{
    /**
     * Documentos a migrar, com a prévia do que vai acontecer.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function candidates(): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $t   = Document::getTable();
        $out = [];
        foreach ($DB->request([
            'SELECT'    => [$t . '.*', 'glpi_knowbaseitems.name AS kbname', 'glpi_knowbaseitems.id AS kbid'],
            'FROM'      => $t,
            'LEFT JOIN' => ['glpi_knowbaseitems' => ['ON' => [$t => 'knowbaseitems_id', 'glpi_knowbaseitems' => 'id']]],
            'WHERE'     => [$t . '.knowbaseitems_id' => ['>', 0]],
            'ORDER'     => [$t . '.doctype', $t . '.sequence'],
        ]) as $r) {
            $kb = (int) $r['knowbaseitems_id'];
            $out[] = [
                'id'         => (int) $r['id'],
                'kb_id'      => $kb,
                'kb_exists'  => $r['kbid'] !== null,
                'code'       => sprintf('%s%04d:%02d', $r['doctype'], (int) $r['sequence'], (int) $r['revision']),
                'doctype'    => (string) $r['doctype'],
                'status'     => (string) $r['status'],
                'name'       => (string) ($r['kbname'] ?? ''),
                'categories' => self::categoryPaths($kb),
                'readers'    => [
                    'profiles' => countElementsInTable('glpi_knowbaseitems_profiles', ['knowbaseitems_id' => $kb]),
                    'groups'   => countElementsInTable('glpi_groups_knowbaseitems', ['knowbaseitems_id' => $kb]),
                    'users'    => countElementsInTable('glpi_knowbaseitems_users', ['knowbaseitems_id' => $kb]),
                    'entities' => countElementsInTable('glpi_entities_knowbaseitems', ['knowbaseitems_id' => $kb]),
                ],
                'files'      => countElementsInTable('glpi_documents_items', ['itemtype' => 'KnowbaseItem', 'items_id' => $kb]),
            ];
        }
        return $out;
    }

    /** @return string[] completename das categorias nativas do artigo */
    private static function categoryPaths(int $kbId): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $out = [];
        foreach ($DB->request([
            'SELECT'     => ['glpi_knowbaseitemcategories.completename'],
            'FROM'       => 'glpi_knowbaseitems_knowbaseitemcategories',
            'INNER JOIN' => ['glpi_knowbaseitemcategories' => ['ON' => [
                'glpi_knowbaseitems_knowbaseitemcategories' => 'knowbaseitemcategories_id',
                'glpi_knowbaseitemcategories'               => 'id',
            ]]],
            'WHERE'      => ['glpi_knowbaseitems_knowbaseitemcategories.knowbaseitems_id' => $kbId],
        ]) as $r) {
            $out[] = (string) $r['completename'];
        }
        return $out;
    }

    /**
     * Migra um documento. Devolve o relatório (ok, mensagens).
     *
     * @return array{ok: bool, code: string, notes: string[]}
     */
    public static function migrate(int $id): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $t   = Document::getTable();
        $row = $DB->request(['FROM' => $t, 'WHERE' => ['id' => $id, 'knowbaseitems_id' => ['>', 0]]])->current();
        if (!$row) {
            return ['ok' => false, 'code' => '#' . $id, 'notes' => [__('Não está mais no modelo antigo.', 'codexplus')]];
        }
        $code = sprintf('%s%04d:%02d', $row['doctype'], (int) $row['sequence'], (int) $row['revision']);
        $kbId = (int) $row['knowbaseitems_id'];
        $kb   = $DB->request(['FROM' => 'glpi_knowbaseitems', 'WHERE' => ['id' => $kbId]])->current();
        if (!$kb) {
            return ['ok' => false, 'code' => $code, 'notes' => [__('O artigo da Base de Conhecimento não existe mais.', 'codexplus')]];
        }
        $notes = [];

        // Corpo: o GLPI 11 guarda HTML cru; dado antigo pode vir codificado.
        $content = (string) ($kb['answer'] ?? '');
        if (!str_contains($content, '<') && str_contains($content, '&lt;')) {
            $content = html_entity_decode($content, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }
        // Links das imagens coladas passam a levar o documento novo.
        $content = preg_replace(
            '/itemtype=KnowbaseItem((?:&amp;|&)items_id=)' . $kbId . '(?!\d)/',
            'itemtype=GlpiPlugin%5CCodexplus%5CDocument${1}' . $id,
            $content
        ) ?? $content;

        $DB->update($t, [
            'knowbaseitems_id' => 0,
            'name'             => (string) $kb['name'],
            'content'          => $content,
            'entities_id'      => (int) ($kb['entities_id'] ?? 0),
            'is_recursive'     => (int) ($kb['is_recursive'] ?? 1),
            'users_id'         => (int) ($kb['users_id'] ?? 0),
            'date_creation'    => $row['date_creation'] ?: $kb['date_creation'],
            // Migrar é uma alteração: o documento sobe em "Atualizados recentemente".
            'date_mod'         => $_SESSION['glpi_currenttime'] ?? date('Y-m-d H:i:s'),
        ], ['id' => $id]);

        // Categorias: pelo caminho completo, criadas no Codex+ se faltar.
        foreach (self::categoryPaths($kbId) as $path) {
            $cid = self::ensureCategory($path);
            if ($cid > 0 && countElementsInTable(Document_Category::getTable(), [
                'plugin_codexplus_documents_id' => $id, 'plugin_codexplus_categories_id' => $cid,
            ]) === 0) {
                $DB->insert(Document_Category::getTable(), [
                    'plugin_codexplus_documents_id'  => $id,
                    'plugin_codexplus_categories_id' => $cid,
                ]);
            }
        }

        // Leitores: mesmas colunas nas tabelas espelho (CONTEXTO §3.1).
        foreach ([
            ['glpi_knowbaseitems_profiles', Document_Profile::getTable(), ['profiles_id', 'entities_id', 'is_recursive', 'no_entity_restriction']],
            ['glpi_groups_knowbaseitems', Document_Group::getTable(), ['groups_id', 'entities_id', 'is_recursive', 'no_entity_restriction']],
            ['glpi_knowbaseitems_users', Document_User::getTable(), ['users_id']],
        ] as [$from, $to, $cols]) {
            foreach ($DB->request(['FROM' => $from, 'WHERE' => ['knowbaseitems_id' => $kbId]]) as $r) {
                $novo = ['plugin_codexplus_documents_id' => $id];
                foreach ($cols as $c) {
                    $novo[$c] = $r[$c];
                }
                if (countElementsInTable($to, $novo) === 0) {
                    $DB->insert($to, $novo);
                }
            }
        }
        $ents = countElementsInTable('glpi_entities_knowbaseitems', ['knowbaseitems_id' => $kbId]);
        if ($ents > 0) {
            $notes[] = sprintf(__('%d leitor(es) por entidade não migrado(s): no Codex+ a leitura é por perfil, grupo ou usuário.', 'codexplus'), $ents);
        }

        // Anexos e imagens: o mesmo arquivo passa a ser ligado também ao documento novo.
        $files = 0;
        foreach ($DB->request(['FROM' => 'glpi_documents_items', 'WHERE' => ['itemtype' => 'KnowbaseItem', 'items_id' => $kbId]]) as $r) {
            $link = ['documents_id' => (int) $r['documents_id'], 'itemtype' => Document::class, 'items_id' => $id];
            if (countElementsInTable('glpi_documents_items', $link) === 0) {
                $DB->insert('glpi_documents_items', $link + [
                    'entities_id'   => (int) $r['entities_id'],
                    'is_recursive'  => (int) $r['is_recursive'],
                    'users_id'      => (int) $r['users_id'],
                    'date_creation' => $r['date_creation'],
                    'date_mod'      => $r['date_mod'],
                    'date'          => $r['date'],
                ]);
                $files++;
            }
        }

        Log::history($id, Document::class, [0, '', sprintf(
            __('Migrado do artigo #%d da Base de Conhecimento (R4), com %d arquivo(s)', 'codexplus'),
            $kbId,
            $files
        )], '', Log::HISTORY_LOG_SIMPLE_MESSAGE);

        return ['ok' => true, 'code' => $code, 'notes' => $notes];
    }

    /** Categoria do Codex+ pelo caminho "A > B > C"; cria o que faltar. */
    private static function ensureCategory(string $path): int
    {
        $parent = 0;
        foreach (array_map('trim', explode('>', $path)) as $name) {
            if ($name === '') {
                continue;
            }
            $cat = new Category();
            if ($cat->getFromDBByCrit(['name' => $name, 'plugin_codexplus_categories_id' => $parent])) {
                $parent = (int) $cat->getID();
                continue;
            }
            $novo = (int) $cat->add([
                'name'                           => $name,
                'plugin_codexplus_categories_id' => $parent,
                'entities_id'                    => 0,
                'is_recursive'                   => 1,
            ]);
            if ($novo <= 0) {
                return 0;
            }
            $parent = $novo;
        }
        return $parent;
    }

    public static function canRun(): bool
    {
        return Rights::isSuperAdmin() && Session::getCurrentInterface() === 'central';
    }
}
