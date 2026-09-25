<?php
namespace GlpiPlugin\Codexplus;

use Migration;
use ProfileRight;

/**
 * Instalação / desinstalação do Codex+.
 *
 * ETAPA 0: cria apenas o direito de acesso (nenhuma tabela).
 * ETAPA 2a: cria a tabela satélite de metadados de documento controlado
 * (glpi_plugin_codexplus_documents), ligada ao artigo nativo por
 * knowbaseitems_id. Nenhuma tabela NATIVA é alterada em nenhuma etapa.
 *
 * ETAPA R1 (0.6.0): schema dos documentos próprios (independência da Base
 * de Conhecimento — CONTEXTO.md §3.1). A tabela de documentos é AMPLIADA
 * (título, conteúdo, entidade, autor, lixeira) e ganha as tabelas de
 * setores, categorias, ligação documento–categoria, alvos de leitura e
 * versões. Nada disso é lido pelas telas atuais ainda: elas continuam
 * sobre glpi_knowbaseitems até a R5.
 *
 * install() é IDEMPOTENTE: pode ser executado de novo numa atualização de
 * plugin já instalado (o GLPI marca o plugin como "a atualizar" quando a
 * versão do setup.php muda; aceitar a atualização roda esta função). Os
 * direitos usam addRight (idempotente) e a tabela é criada só se não existir.
 */
class Install
{
    public const DOCUMENTS_TABLE = 'glpi_plugin_codexplus_documents';
    public const TEMPLATES_TABLE = 'glpi_plugin_codexplus_templates';

    // Etapa R1
    public const SECTORS_TABLE        = 'glpi_plugin_codexplus_sectors';
    public const CATEGORIES_TABLE     = 'glpi_plugin_codexplus_categories';
    public const DOC_CATEGORIES_TABLE = 'glpi_plugin_codexplus_documents_categories';
    public const DOC_PROFILES_TABLE   = 'glpi_plugin_codexplus_documents_profiles';
    public const DOC_GROUPS_TABLE     = 'glpi_plugin_codexplus_documents_groups';
    public const DOC_USERS_TABLE      = 'glpi_plugin_codexplus_documents_users';
    public const VERSIONS_TABLE       = 'glpi_plugin_codexplus_documentversions';

    // Etapa R3c — papéis (decisão de Claudio, 20/09/2026)
    public const SECTOR_MEMBERS_TABLE = 'glpi_plugin_codexplus_sectormembers';
    public const DOC_EDITORS_TABLE    = 'glpi_plugin_codexplus_documenteditors';
    public const DOC_CONTRIB_TABLE    = 'glpi_plugin_codexplus_documentcontributors';

    // Etapa 9 (0.6.7) — diagrama institucional ligado ao documento DIA
    public const DIAGRAMS_TABLE       = 'glpi_plugin_codexplus_diagrams';

    /**
     * Todas as tabelas do plugin, na ordem de remoção.
     *
     * @return string[]
     */
    public static function getTables(): array
    {
        return [
            self::DIAGRAMS_TABLE,
            self::DOC_CONTRIB_TABLE,
            self::DOC_EDITORS_TABLE,
            self::SECTOR_MEMBERS_TABLE,
            self::VERSIONS_TABLE,
            self::DOC_USERS_TABLE,
            self::DOC_GROUPS_TABLE,
            self::DOC_PROFILES_TABLE,
            self::DOC_CATEGORIES_TABLE,
            self::CATEGORIES_TABLE,
            self::SECTORS_TABLE,
            self::DOCUMENTS_TABLE,
            self::TEMPLATES_TABLE,
        ];
    }

    public static function install(): bool
    {
        /** @var \DBmysql $DB */
        global $DB;

        $migration = new Migration(PLUGIN_CODEXPLUS_VERSION);

        // --- Direito de acesso à wiki do plugin (Etapa 0) ---
        // addRight é idempotente: perfis que já leem a base de conhecimento
        // nativa (knowbase => READ) ganham acesso automaticamente.
        $migration->addRight('plugin_codexplus_wiki', READ, ['knowbase' => READ]);
        $migration->addRight('plugin_codexplus_wiki', READ, ['config' => UPDATE]);

        // --- Tabela de metadados de documento controlado (Etapa 2a) ---
        $table = self::DOCUMENTS_TABLE;
        if (!$DB->tableExists($table)) {
            $sql = "CREATE TABLE `$table` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `knowbaseitems_id` int unsigned NOT NULL DEFAULT '0',
                `doctype` varchar(8) NOT NULL DEFAULT '',
                `sequence` int unsigned NOT NULL DEFAULT '0',
                `revision` int unsigned NOT NULL DEFAULT '0',
                `status` varchar(16) NOT NULL DEFAULT 'rascunho',
                `users_id_owner` int unsigned NOT NULL DEFAULT '0',
                `validity_months` int unsigned NOT NULL DEFAULT '12',
                `client_name` varchar(255) NOT NULL DEFAULT '',
                `date_published` timestamp NULL DEFAULT NULL,
                `date_creation` timestamp NULL DEFAULT NULL,
                `date_mod` timestamp NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `knowbaseitems_id` (`knowbaseitems_id`),
                KEY `doctype` (`doctype`),
                KEY `status` (`status`),
                KEY `users_id_owner` (`users_id_owner`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC";

            $DB->doQueryOrDie($sql, "Codex+ (Etapa 2a): erro ao criar a tabela $table");
        }

        // --- Cabeçalho e rodapé por documento (Etapa 4d) ---
        // header_html: rich text (TinyMCE), independente do corpo do artigo.
        // footer_text: texto simples com marcadores, mesma sintaxe já usada
        // em Branding::footer_text (global) — aqui é a versão por documento.
        // addField() é idempotente (verifica fieldExists internamente), por
        // isso não precisa do guard tableExists como a criação da tabela.
        $migration->addField($table, 'header_html', 'longtext', [
            'null'  => true,
            'after' => 'client_name',
        ]);
        $migration->addField($table, 'footer_text', 'longtext', [
            'null'  => true,
            'after' => 'header_html',
        ]);

        // --- Tabela de modelos por tipo (Etapa 3a) ---
        $tpl_table = self::TEMPLATES_TABLE;
        if (!$DB->tableExists($tpl_table)) {
            $sql = "CREATE TABLE `$tpl_table` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `name` varchar(255) NOT NULL DEFAULT '',
                `doctype` varchar(8) NOT NULL DEFAULT '',
                `content` longtext,
                `is_default` tinyint NOT NULL DEFAULT '0',
                `date_creation` timestamp NULL DEFAULT NULL,
                `date_mod` timestamp NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                KEY `doctype` (`doctype`),
                KEY `is_default` (`is_default`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC";

            $DB->doQueryOrDie($sql, "Codex+ (Etapa 3a): erro ao criar a tabela $tpl_table");

            // Semeia os 4 modelos padrão SÓ na criação da tabela (não repete
            // em atualizações — o guard tableExists garante idempotência).
            $now = $_SESSION['glpi_currenttime'] ?? date('Y-m-d H:i:s');
            foreach (Template::getDefaultSeeds() as $seed) {
                [$doctype, $name, $content] = $seed;
                $DB->insertOrDie($tpl_table, [
                    'name'          => $name,
                    'doctype'       => $doctype,
                    'content'       => $content,
                    'is_default'    => 1,
                    'date_creation' => $now,
                    'date_mod'      => $now,
                ], "Codex+ (Etapa 3a): erro ao semear o modelo $doctype");
            }
        }

        // --- Etapa R1: documentos próprios ---
        self::installR1($migration);

        // --- Etapa R3a: coluna Setor visível na lista de Categorias ---
        self::installR3a($migration);

        // --- Etapa R3c: papéis, validação, Super-Admin com todos os bits ---
        self::installR3c($migration);

        // --- Etapa R3d: validação em duas etapas, revisor e janela ---
        self::installR3d($migration);

        // --- Etapa R6-a: revisão de documento publicado ---
        self::installR6a($migration);

        // --- Bloco T1: cliente vinculado (Laudo e Documentação Técnica) ---
        self::installT1($migration);

        // --- Bloco A2: setor de auditoria ---
        self::installA2($migration);

        $migration->executeMigration();
        return true;
    }

    /**
     * Etapa R1 — schema dos documentos próprios. Idempotente: tabela nova
     * só se não existir; campo novo por addField (confere fieldExists).
     *
     * Convenções do GLPI seguidas para as classes da R2/R3 funcionarem sem
     * getTable() manual: chave estrangeira = nome da tabela sem "glpi_" +
     * "_id" (plugin_codexplus_documents_id, plugin_codexplus_categories_id…).
     */
    private static function installR1(Migration $migration): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $opts = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC';

        // 1. Documento ampliado. Campos novos vão para o FIM da tabela (sem
        // AFTER): a ordem das colunas atuais não muda. Os 5 documentos de
        // teste ficam com título/conteúdo vazios até a migração (R4).
        // Nenhum destes nomes pode aparecer sem qualificação em consulta
        // que junte esta tabela com glpi_knowbaseitems (achado 12) — as
        // consultas atuais já qualificam tudo (conferido na R1).
        $doc = self::DOCUMENTS_TABLE;
        $migration->addField($doc, 'name', 'string');
        $migration->addField($doc, 'content', 'longtext', ['null' => true]);
        $migration->addField($doc, 'entities_id', 'fkey');
        $migration->addField($doc, 'is_recursive', 'bool');
        $migration->addField($doc, 'users_id', 'fkey');
        $migration->addField($doc, 'is_deleted', 'bool');
        $migration->addKey($doc, 'name');
        $migration->addKey($doc, 'entities_id');
        $migration->addKey($doc, 'is_recursive');
        $migration->addKey($doc, 'users_id');
        $migration->addKey($doc, 'is_deleted');

        // knowbaseitems_id deixa de ser ÚNICO: documento próprio nasce com
        // 0 (sem artigo nativo), e vários zeros violariam a unicidade. O
        // índice continua existindo, só não é mais UNIQUE.
        // SQL direto de propósito: Migration::dropKey() + addKey() com o
        // mesmo nome não funciona numa passada só (achado 28).
        $unique = $DB->doQuery(
            "SHOW INDEX FROM `$doc` WHERE `Key_name` = 'knowbaseitems_id' AND `Non_unique` = 0"
        );
        if ($unique && $DB->numrows($unique) > 0) {
            $DB->doQueryOrDie(
                "ALTER TABLE `$doc` DROP INDEX `knowbaseitems_id`, ADD INDEX `knowbaseitems_id` (`knowbaseitems_id`)",
                'Codex+ (R1): erro ao trocar o índice knowbaseitems_id'
            );
        }

        // 2. Setores (lista suspensa simples — R2). Setor é organização,
        // não controle de acesso.
        $t = self::SECTORS_TABLE;
        if (!$DB->tableExists($t)) {
            $DB->doQueryOrDie("CREATE TABLE `$t` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `entities_id` int unsigned NOT NULL DEFAULT '0',
                `is_recursive` tinyint NOT NULL DEFAULT '0',
                `name` varchar(255) DEFAULT NULL,
                `comment` text,
                `date_mod` timestamp NULL DEFAULT NULL,
                `date_creation` timestamp NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                KEY `name` (`name`),
                KEY `entities_id` (`entities_id`),
                KEY `is_recursive` (`is_recursive`),
                KEY `date_mod` (`date_mod`),
                KEY `date_creation` (`date_creation`)
            ) $opts", "Codex+ (R1): erro ao criar $t");
        }

        // 3. Categorias em árvore (CommonTreeDropdown — R2). Mesmas colunas
        // da glpi_knowbaseitemcategories nativa + o setor. Subcategoria
        // herda o setor da raiz (regra na classe, R2).
        $t = self::CATEGORIES_TABLE;
        if (!$DB->tableExists($t)) {
            $DB->doQueryOrDie("CREATE TABLE `$t` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `entities_id` int unsigned NOT NULL DEFAULT '0',
                `is_recursive` tinyint NOT NULL DEFAULT '0',
                `plugin_codexplus_categories_id` int unsigned NOT NULL DEFAULT '0',
                `plugin_codexplus_sectors_id` int unsigned NOT NULL DEFAULT '0',
                `name` varchar(255) DEFAULT NULL,
                `completename` text,
                `comment` text,
                `level` int NOT NULL DEFAULT '0',
                `sons_cache` longtext,
                `ancestors_cache` longtext,
                `date_mod` timestamp NULL DEFAULT NULL,
                `date_creation` timestamp NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                KEY `name` (`name`),
                KEY `entities_id` (`entities_id`),
                KEY `is_recursive` (`is_recursive`),
                KEY `plugin_codexplus_categories_id` (`plugin_codexplus_categories_id`),
                KEY `plugin_codexplus_sectors_id` (`plugin_codexplus_sectors_id`),
                KEY `level` (`level`),
                KEY `date_mod` (`date_mod`),
                KEY `date_creation` (`date_creation`)
            ) $opts", "Codex+ (R1): erro ao criar $t");
        }

        // 4. Documento <-> categoria (N:N).
        $t = self::DOC_CATEGORIES_TABLE;
        if (!$DB->tableExists($t)) {
            $DB->doQueryOrDie("CREATE TABLE `$t` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `plugin_codexplus_documents_id` int unsigned NOT NULL DEFAULT '0',
                `plugin_codexplus_categories_id` int unsigned NOT NULL DEFAULT '0',
                PRIMARY KEY (`id`),
                UNIQUE KEY `unicity` (`plugin_codexplus_documents_id`, `plugin_codexplus_categories_id`),
                KEY `plugin_codexplus_categories_id` (`plugin_codexplus_categories_id`)
            ) $opts", "Codex+ (R1): erro ao criar $t");
        }

        // 5. Alvos de leitura — espelho de glpi_knowbaseitems_profiles,
        // glpi_groups_knowbaseitems e glpi_knowbaseitems_users (GLPI 11.0.6),
        // para a visibilidade (R3/R5) repetir KnowbaseItem::getVisibilityCriteria.
        foreach (
            [
                self::DOC_PROFILES_TABLE => 'profiles_id',
                self::DOC_GROUPS_TABLE   => 'groups_id',
            ] as $t => $fk
        ) {
            if (!$DB->tableExists($t)) {
                $DB->doQueryOrDie("CREATE TABLE `$t` (
                    `id` int unsigned NOT NULL AUTO_INCREMENT,
                    `plugin_codexplus_documents_id` int unsigned NOT NULL DEFAULT '0',
                    `$fk` int unsigned NOT NULL DEFAULT '0',
                    `entities_id` int unsigned DEFAULT NULL,
                    `is_recursive` tinyint NOT NULL DEFAULT '0',
                    `no_entity_restriction` tinyint NOT NULL DEFAULT '0',
                    PRIMARY KEY (`id`),
                    KEY `plugin_codexplus_documents_id` (`plugin_codexplus_documents_id`),
                    KEY `$fk` (`$fk`),
                    KEY `entities_id` (`entities_id`),
                    KEY `is_recursive` (`is_recursive`)
                ) $opts", "Codex+ (R1): erro ao criar $t");
            }
        }

        $t = self::DOC_USERS_TABLE;
        if (!$DB->tableExists($t)) {
            $DB->doQueryOrDie("CREATE TABLE `$t` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `plugin_codexplus_documents_id` int unsigned NOT NULL DEFAULT '0',
                `users_id` int unsigned NOT NULL DEFAULT '0',
                PRIMARY KEY (`id`),
                KEY `plugin_codexplus_documents_id` (`plugin_codexplus_documents_id`),
                KEY `users_id` (`users_id`)
            ) $opts", "Codex+ (R1): erro ao criar $t");
        }

        // 6. Versões publicadas (R6): cópia do título e do conteúdo a cada
        // revisão publicada, com o resumo obrigatório do que mudou.
        $t = self::VERSIONS_TABLE;
        if (!$DB->tableExists($t)) {
            $DB->doQueryOrDie("CREATE TABLE `$t` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `plugin_codexplus_documents_id` int unsigned NOT NULL DEFAULT '0',
                `revision` int unsigned NOT NULL DEFAULT '0',
                `name` varchar(255) DEFAULT NULL,
                `content` longtext,
                `summary` text,
                `users_id` int unsigned NOT NULL DEFAULT '0',
                `date_published` timestamp NULL DEFAULT NULL,
                `date_creation` timestamp NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `unicity` (`plugin_codexplus_documents_id`, `revision`),
                KEY `users_id` (`users_id`),
                KEY `date_published` (`date_published`)
            ) $opts", "Codex+ (R1): erro ao criar $t");
        }
    }

    /**
     * Etapa R3a — coluna Setor (opção de busca 10 de Category) visível por
     * padrão na lista de Categorias. Só quando ainda não existe NENHUMA
     * preferência padrão (users_id = 0) para Category: assim, se alguém
     * reorganizar as colunas depois, uma reinstalação não desfaz a escolha.
     */
    private static function installR3a(Migration $migration): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $exists = countElementsInTable('glpi_displaypreferences', [
            'itemtype' => Category::class,
            'users_id' => 0,
        ]) > 0;

        if (!$exists) {
            $DB->insert('glpi_displaypreferences', [
                'itemtype'  => Category::class,
                'num'       => 10,
                'rank'      => 1,
                'users_id'  => 0,
                'interface' => 'central',
            ]);
        }
    }

    /**
     * Etapa R3c — papéis e validação (decisão de Claudio, 20/09/2026).
     *
     *  - sectormembers: gestores e validadores do setor (usuário OU grupo);
     *  - documenteditors: editores/revisores do documento (usuário OU grupo);
     *  - documentcontributors: quem alterou o documento em cada revisão —
     *    é o que impede quem editou de validar o próprio documento;
     *  - campos de validação no documento (quem enviou, quem validou,
     *    quando, motivo da devolução);
     *  - todos os bits do Codex+ nos perfis com Configurar > Atualizar
     *    (Super-Admin): "o Super-Admin herda tudo". OR bit a bit, então
     *    reinstalar nunca tira bit de ninguém.
     */
    /**
     * Etapa R3d (Claudio, 21/09/2026): validação em duas etapas — 1ª o gestor
     * do setor aprova, 2ª o auditor responsável valida — e revisão periódica
     * com revisor e janela no calendário. Só campos novos no documento; o
     * status novo (aprovacao) é um valor a mais no mesmo varchar.
     *   - users_id_auditor:  auditor responsável (2ª etapa), escolhido entre
     *                        os auditores do setor;
     *   - users_id_approver, date_approved: quem aprovou a 1ª etapa;
     *   - users_id_reviewer: revisor da revisão periódica;
     *   - review_start, review_end: janela da próxima revisão (datas).
     */
    private static function installR3d(Migration $migration): void
    {
        $doc = self::DOCUMENTS_TABLE;
        $migration->addField($doc, 'users_id_auditor', 'fkey');
        $migration->addField($doc, 'users_id_approver', 'fkey');
        $migration->addField($doc, 'date_approved', 'timestamp');
        $migration->addField($doc, 'users_id_reviewer', 'fkey');
        $migration->addField($doc, 'review_start', 'date');
        $migration->addField($doc, 'review_end', 'date');
        $migration->addKey($doc, 'users_id_auditor');
        $migration->addKey($doc, 'users_id_reviewer');
        $migration->addKey($doc, 'review_end');
    }

    /**
     * Etapa R6-a (Claudio, 21/09/2026): revisão de documento publicado.
     *   - versions.diagram: o JSON do diagrama da versão publicada (a tabela
     *     de versões é da R1 e só guardava título e corpo);
     *   - documents.revision_summary: resumo do que mudou na revisão em
     *     andamento, obrigatório no envio; vai para a versão ao publicar.
     * As cópias das versões já publicadas NÃO são geradas aqui (dado não é
     * schema): o documento ganha a dele ao abrir a primeira revisão.
     */
    private static function installR6a(Migration $migration): void
    {
        $migration->addField(self::VERSIONS_TABLE, 'diagram', 'longtext', ['null' => true]);
        $migration->addField(self::DOCUMENTS_TABLE, 'revision_summary', 'text');
    }

    /**
     * Bloco T1 (Claudio, 24/09/2026): tipos LAU, DTC e DIV (sem schema: o
     * tipo é texto) e o cliente VINCULADO a um usuário ou a uma entidade do
     * GLPI, no padrão itemtype + items_id do Document_Item nativo. Com o
     * tipo gravado junto, mudar a configuração da instalação não estraga os
     * documentos antigos. client_name continua: texto da proposta e retrato
     * do nome do cliente vinculado.
     */
    private static function installT1(Migration $migration): void
    {
        $doc = self::DOCUMENTS_TABLE;
        $migration->addField($doc, 'client_itemtype', 'string', ['after' => 'client_name']);
        $migration->addField($doc, 'client_items_id', 'fkey', ['after' => 'client_itemtype']);
        $migration->addKey($doc, ['client_itemtype', 'client_items_id'], 'client');
    }

    /**
     * Bloco A2 (Claudio, 25/09/2026): setor marcado como de auditoria. Nos
     * documentos só desse(s) setor(es), quem aprovou a 1ª etapa pode validar
     * a 2ª; nos demais, não.
     */
    private static function installA2(Migration $migration): void
    {
        $migration->addField(self::SECTORS_TABLE, 'is_audit', 'bool');
    }

    private static function installR3c(Migration $migration): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $opts = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC';

        $doc = self::DOCUMENTS_TABLE;
        $migration->addField($doc, 'users_id_submitter', 'fkey');
        $migration->addField($doc, 'date_submitted', 'timestamp');
        $migration->addField($doc, 'users_id_validator', 'fkey');
        $migration->addField($doc, 'date_validated', 'timestamp');
        $migration->addField($doc, 'validation_comment', 'text');
        $migration->addKey($doc, 'users_id_submitter');
        $migration->addKey($doc, 'users_id_validator');

        $t = self::SECTOR_MEMBERS_TABLE;
        if (!$DB->tableExists($t)) {
            $DB->doQueryOrDie("CREATE TABLE `$t` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `plugin_codexplus_sectors_id` int unsigned NOT NULL DEFAULT '0',
                `role` varchar(16) NOT NULL DEFAULT '',
                `users_id` int unsigned NOT NULL DEFAULT '0',
                `groups_id` int unsigned NOT NULL DEFAULT '0',
                `date_creation` timestamp NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `unicity` (`plugin_codexplus_sectors_id`, `role`, `users_id`, `groups_id`),
                KEY `users_id` (`users_id`),
                KEY `groups_id` (`groups_id`)
            ) $opts", "Codex+ (R3c): erro ao criar $t");
        }

        $t = self::DOC_EDITORS_TABLE;
        if (!$DB->tableExists($t)) {
            $DB->doQueryOrDie("CREATE TABLE `$t` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `plugin_codexplus_documents_id` int unsigned NOT NULL DEFAULT '0',
                `users_id` int unsigned NOT NULL DEFAULT '0',
                `groups_id` int unsigned NOT NULL DEFAULT '0',
                `date_creation` timestamp NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `unicity` (`plugin_codexplus_documents_id`, `users_id`, `groups_id`),
                KEY `users_id` (`users_id`),
                KEY `groups_id` (`groups_id`)
            ) $opts", "Codex+ (R3c): erro ao criar $t");
        }

        $t = self::DOC_CONTRIB_TABLE;
        if (!$DB->tableExists($t)) {
            $DB->doQueryOrDie("CREATE TABLE `$t` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `plugin_codexplus_documents_id` int unsigned NOT NULL DEFAULT '0',
                `revision` int unsigned NOT NULL DEFAULT '0',
                `users_id` int unsigned NOT NULL DEFAULT '0',
                `date_mod` timestamp NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `unicity` (`plugin_codexplus_documents_id`, `revision`, `users_id`),
                KEY `users_id` (`users_id`)
            ) $opts", "Codex+ (R3c): erro ao criar $t");
        }

        // Etapa 9 (0.6.7): um diagrama por documento DIA. `data` guarda o
        // JSON editável (árvore + matriz de escalonamento). O SVG da versão
        // publicada entra no bloco seguinte da Etapa 9 (desvio aprovado por
        // Claudio em 20/09/2026: a leitura desenha do JSON).
        $t = self::DIAGRAMS_TABLE;
        if (!$DB->tableExists($t)) {
            $DB->doQueryOrDie("CREATE TABLE `$t` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `plugin_codexplus_documents_id` int unsigned NOT NULL DEFAULT '0',
                `subtype` varchar(16) NOT NULL DEFAULT 'organograma',
                `data` longtext NULL,
                `date_creation` timestamp NULL DEFAULT NULL,
                `date_mod` timestamp NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `plugin_codexplus_documents_id` (`plugin_codexplus_documents_id`)
            ) $opts", "Codex+ (9a): erro ao criar $t");
        }

        // Super-Admin herda tudo: perfis com Configurar > Atualizar. Menos o
        // bit Auditor (A2, Claudio, 25/09/2026): o Super-Admin valida sem ele
        // e, com ele, entraria na lista de auditores. OU bit a bit: nunca
        // tira bit, então quem já tinha o Auditor desmarca na aba de Perfis.
        $all = Rights::ALL & ~Rights::VALIDATE;
        $admins = [];
        foreach ($DB->request([
            'SELECT' => ['profiles_id', 'rights'],
            'FROM'   => 'glpi_profilerights',
            'WHERE'  => ['name' => 'config'],
        ]) as $row) {
            if (((int) $row['rights'] & UPDATE) === UPDATE) {
                $admins[] = (int) $row['profiles_id'];
            }
        }
        foreach ($admins as $pid) {
            $cur = 0;
            $exists = false;
            foreach ($DB->request([
                'SELECT' => ['rights'],
                'FROM'   => 'glpi_profilerights',
                'WHERE'  => ['profiles_id' => $pid, 'name' => Rights::NAME],
            ]) as $row) {
                $cur    = (int) $row['rights'];
                $exists = true;
            }
            if (!$exists) {
                $DB->insert('glpi_profilerights', [
                    'profiles_id' => $pid,
                    'name'        => Rights::NAME,
                    'rights'      => $all,
                ]);
            } elseif (($cur | $all) !== $cur) {
                $DB->update(
                    'glpi_profilerights',
                    ['rights' => $cur | $all],
                    ['profiles_id' => $pid, 'name' => Rights::NAME]
                );
            }
        }
    }

    public static function uninstall(): bool
    {
        /** @var \DBmysql $DB */
        global $DB;

        // Remove as tabelas do plugin — nunca toca glpi_knowbaseitems nem os
        // documentos nativos.
        foreach (self::getTables() as $table) {
            if ($DB->tableExists($table)) {
                $DB->doQuery("DROP TABLE `$table`");
            }
        }

        // Preferências de coluna das listas do plugin (R3a).
        $DB->delete('glpi_displaypreferences', [
            'itemtype' => [Category::class, Sector::class, Document::class],
        ]);

        ProfileRight::deleteProfileRights(['plugin_codexplus_wiki']);
        return true;
    }
}
