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

    // Q4a (0.6.10) — ícones criados na instalação (IconLibrary)
    public const ICONS_TABLE          = 'glpi_plugin_codexplus_icons';
    /** Q7b-4: situação das tarefas do cronograma (ScheduleStatus). */
    public const SCHEDULE_TABLE       = 'glpi_plugin_codexplus_schedulestatus';
    /** M-1: marcas (logo, nome, cor) usadas no cabeçalho do PDF e do Word. */
    public const BRANDS_TABLE         = 'glpi_plugin_codexplus_brands';
    /** A-2a: aprovadores do diagrama (DocumentApprover). */
    public const DOC_APPROVERS_TABLE  = 'glpi_plugin_codexplus_documentapprovers';
    /** R6-b: eventos da revisão (aberta, prorrogada, sem alteração, cancelada). */
    public const REV_EVENTS_TABLE     = 'glpi_plugin_codexplus_revisionevents';
    /** Etapa 5: documentos vinculados (pai → filho, com ordem). */
    public const DOC_LINKS_TABLE      = 'glpi_plugin_codexplus_documentlinks';
    /** Q7c-2: histórico das marcações do cronograma (Iniciar, Concluir, Reabrir). */
    public const SCHEDULE_EVENTS_TABLE = 'glpi_plugin_codexplus_scheduleevents';
    public const ORG_PHOTOS_TABLE      = 'glpi_plugin_codexplus_orgphotos';
    /** 7a: marcas de "já avisado" do alerta de vencimento (ExpiryAlert). */
    public const EXPIRY_ALERTS_TABLE   = 'glpi_plugin_codexplus_expiryalerts';
    /** Q8-2: mapa de calor — modelos de AP e perfis de aparelho (WifiCatalog). */
    public const WIFI_MODELS_TABLE     = 'glpi_plugin_codexplus_wifimodels';
    public const WIFI_PROFILES_TABLE   = 'glpi_plugin_codexplus_wifiprofiles';

    /**
     * Todas as tabelas do plugin, na ordem de remoção.
     *
     * @return string[]
     */
    public static function getTables(): array
    {
        return [
            self::ORG_PHOTOS_TABLE,
            self::WIFI_PROFILES_TABLE,
            self::WIFI_MODELS_TABLE,
            self::EXPIRY_ALERTS_TABLE,
            self::SCHEDULE_EVENTS_TABLE,
            self::DOC_LINKS_TABLE,
            self::REV_EVENTS_TABLE,
            self::DOC_APPROVERS_TABLE,
            self::BRANDS_TABLE,
            self::SCHEDULE_TABLE,
            self::ICONS_TABLE,
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

        // --- Bloco Q7b-4: situação das tarefas do cronograma ---
        self::installQ7b4();

        // --- Bloco M-1: marcas ---
        self::installM1();

        // --- Bloco M-2: marca do documento ---
        self::installM2($migration);

        // --- Bloco A-1: vários editores na Proposta e no Laudo ---
        self::installA1();

        // --- Bloco A-2a: aprovadores do diagrama ---
        self::installA2a();
        self::installR6b($migration);
        self::installR7($migration);
        self::installE5();

        // --- Bloco AP-1: aprovadores de cada versão publicada ---
        self::installAP1();

        // --- Bloco MO-1: modelos por setor e categoria ---
        self::installMO1();

        // --- Bloco Q7c-2: histórico das marcações do cronograma ---
        self::installQ7c2();

        // --- Bloco 7a: alerta de vencimento (marcas + ação automática) ---
        self::install7a();

        // --- Bloco 7b: notificações do alerta (modelo + 3 notificações) ---
        self::install7b();

        // --- Bloco Q8-2: catálogo do mapa de calor (nasce vazio) ---
        self::installQ82();
        // Q8-2 (ajuste): padrão Wi-Fi do modelo, para tabela já criada.
        $migration->addField(self::WIFI_MODELS_TABLE, 'standard', "varchar(8) NOT NULL DEFAULT 'wifi6'", ['after' => 'name']);

        // --- Bloco PL-2: Leitura "Todos" (nasce desligada) ---
        $migration->addField(self::DOCUMENTS_TABLE, 'read_all', 'bool');

        // --- Bloco PL-3a: fotos do organograma ---
        self::installPL3a();

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
    /**
     * Q7b-4 (Claudio, 04/10/2026): situação de cada tarefa do cronograma,
     * por documento + id fixo da linha do JSON. Marcada no publicado, sem
     * abrir revisão; quem e quando ficam na própria linha.
     */
    private static function installQ7b4(): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $t = self::SCHEDULE_TABLE;
        if (!$DB->tableExists($t)) {
            $DB->doQueryOrDie("CREATE TABLE `$t` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `plugin_codexplus_documents_id` int unsigned NOT NULL DEFAULT '0',
                `row_key` varchar(16) NOT NULL DEFAULT '',
                `state` varchar(16) NOT NULL DEFAULT '',
                `date_start` date NULL DEFAULT NULL,
                `date_done` date NULL DEFAULT NULL,
                `users_id` int unsigned NOT NULL DEFAULT '0',
                `date_mod` timestamp NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `unicity` (`plugin_codexplus_documents_id`, `row_key`),
                KEY `users_id` (`users_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC", "Codex+ (Q7b-4): erro ao criar $t");
        }
    }

    /**
     * 7a (Claudio, 04/10/2026): marca de "já avisado" por documento, tipo
     * (avencer, vencido, revisao) e ciclo (data de vencimento, ou revisão +
     * prazo), e a ação automática diária `codexplusexpiry` (ExpiryAlert).
     * CronTask::register não duplica: reinstalar mantém a configuração que o
     * administrador tiver mudado.
     */
    private static function install7a(): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $t = self::EXPIRY_ALERTS_TABLE;
        if (!$DB->tableExists($t)) {
            $DB->doQueryOrDie("CREATE TABLE `$t` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `plugin_codexplus_documents_id` int unsigned NOT NULL DEFAULT '0',
                `kind` varchar(16) NOT NULL DEFAULT '',
                `cycle` varchar(32) NOT NULL DEFAULT '',
                `times` int unsigned NOT NULL DEFAULT '0',
                `users` varchar(255) NOT NULL DEFAULT '',
                `date_first` timestamp NULL DEFAULT NULL,
                `date_last` timestamp NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `unicity` (`plugin_codexplus_documents_id`, `kind`, `cycle`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC", "Codex+ (7a): erro ao criar $t");
        }
        \CronTask::register(ExpiryAlert::class, ExpiryAlert::CRON_NAME, DAY_TIMESTAMP, [
            'state'   => \CronTask::STATE_WAITING,
            'comment' => 'Codex+: documentos a vencer, vencidos e revisões atrasadas',
        ]);
    }

    /**
     * 7b (Claudio, 04/10/2026): um modelo de notificação (português) e uma
     * notificação por evento (a vencer, vencido, revisão atrasada), modo
     * e-mail, para responsável, revisor e auditor. Só cria o que não existe:
     * reinstalar mantém o que o administrador tiver mudado (texto, destinos,
     * ligada/desligada). Saem só com as notificações por e-mail ligadas na
     * instalação.
     */
    private static function install7b(): void
    {
        $itemtype = Document::class;
        $tpl = new \NotificationTemplate();
        $tid = 0;
        if ($tpl->getFromDBByCrit(['itemtype' => $itemtype, 'name' => 'Codex+ - Alerta de vencimento'])) {
            $tid = (int) $tpl->getID();
        } else {
            $tid = (int) $tpl->add(['name' => 'Codex+ - Alerta de vencimento', 'itemtype' => $itemtype, 'comment' => 'Codex+ (7b)']);
            if ($tid > 0) {
                $texto = "O documento ##document.code## - ##document.name## está ##document.situation##.\n"
                    . "##document.datelabel##: ##document.date##\n"
                    . "##IFdocument.reminder##Lembrete nº ##document.reminder##.\n##ENDIFdocument.reminder##"
                    . "\nAbrir o documento: ##document.url##\n\n"
                    . "Você recebe este aviso como responsável, revisor ou auditor do documento.";
                $html = '<p>O documento <strong>##document.code## - ##document.name##</strong> está <strong>##document.situation##</strong>.</p>'
                    . '<p>##document.datelabel##: ##document.date##</p>'
                    . '##IFdocument.reminder##<p>Lembrete nº ##document.reminder##.</p>##ENDIFdocument.reminder##'
                    . '<p><a href="##document.url##">Abrir o documento</a></p>'
                    . '<p style="color:#666">Você recebe este aviso como responsável, revisor ou auditor do documento.</p>';
                (new \NotificationTemplateTranslation())->add([
                    'notificationtemplates_id' => $tid,
                    'language'                 => '',
                    'subject'                  => '[Codex+] ##document.code## ##document.situation##: ##document.name##',
                    'content_text'             => $texto,
                    'content_html'             => $html,
                ]);
            }
        }
        if ($tid <= 0) {
            return;
        }
        $nomes = [
            NotificationTargetDocument::EVENT_SOON   => 'Codex+ - Documento a vencer',
            NotificationTargetDocument::EVENT_DUE    => 'Codex+ - Documento vencido',
            NotificationTargetDocument::EVENT_REVIEW => 'Codex+ - Revisão atrasada',
        ];
        foreach ($nomes as $event => $nome) {
            $n = new \Notification();
            if ($n->getFromDBByCrit(['itemtype' => $itemtype, 'event' => $event])) {
                continue;
            }
            $nid = (int) $n->add([
                'name' => $nome, 'itemtype' => $itemtype, 'event' => $event,
                'entities_id' => 0, 'is_recursive' => 1, 'is_active' => 1,
            ]);
            if ($nid <= 0) {
                continue;
            }
            (new \Notification_NotificationTemplate())->add([
                'notifications_id' => $nid, 'mode' => \Notification_NotificationTemplate::MODE_MAIL, 'notificationtemplates_id' => $tid,
            ]);
            foreach ([NotificationTargetDocument::TARGET_OWNER, NotificationTargetDocument::TARGET_REVIEWER, NotificationTargetDocument::TARGET_AUDITOR] as $alvo) {
                (new \NotificationTarget())->add(['notifications_id' => $nid, 'type' => \Notification::USER_TYPE, 'items_id' => $alvo]);
            }
        }
    }

    /**
     * Q7c-2 (Claudio, 04/10/2026): todas as marcações da situação (Iniciar,
     * Concluir, Reabrir), não só a última, que é o que a tabela da Q7b-4
     * guarda. Uma linha por marcação: documento, id da linha, ação, data
     * informada (início ou conclusão), quem e quando. Mostrado no balão do
     * selo da Situação.
     *
     * Tabela nova recebe, uma vez só, a situação que já existia (uma marcação
     * por tarefa, com quem e quando da própria linha), para o balão não
     * nascer vazio nas tarefas já marcadas.
     */
    /**
     * PL-3a (Claudio, 08/10/2026): fotos das pessoas do organograma, fora do
     * JSON do diagrama (ver OrgPhoto). Nasce vazia.
     */
    private static function installPL3a(): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $t = self::ORG_PHOTOS_TABLE;
        if ($DB->tableExists($t)) {
            return;
        }
        $DB->doQueryOrDie("CREATE TABLE `$t` (
            `id` int unsigned NOT NULL AUTO_INCREMENT,
            `plugin_codexplus_documents_id` int unsigned NOT NULL DEFAULT '0',
            `token` char(32) NOT NULL DEFAULT '',
            `thumb` mediumblob NULL,
            `image` mediumblob NULL,
            `users_id` int unsigned NOT NULL DEFAULT '0',
            `date_creation` timestamp NULL DEFAULT NULL,
            PRIMARY KEY (`id`),
            UNIQUE KEY `doc_token` (`plugin_codexplus_documents_id`, `token`),
            KEY `users_id` (`users_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC", "Codex+ (PL-3a): erro ao criar $t");
    }

    private static function installQ7c2(): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $t = self::SCHEDULE_EVENTS_TABLE;
        if ($DB->tableExists($t)) {
            return;
        }
        $DB->doQueryOrDie("CREATE TABLE `$t` (
            `id` int unsigned NOT NULL AUTO_INCREMENT,
            `plugin_codexplus_documents_id` int unsigned NOT NULL DEFAULT '0',
            `row_key` varchar(16) NOT NULL DEFAULT '',
            `action` varchar(16) NOT NULL DEFAULT '',
            `date_value` date NULL DEFAULT NULL,
            `users_id` int unsigned NOT NULL DEFAULT '0',
            `date_creation` timestamp NULL DEFAULT NULL,
            PRIMARY KEY (`id`),
            KEY `doc_row` (`plugin_codexplus_documents_id`, `row_key`),
            KEY `users_id` (`users_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC", "Codex+ (Q7c-2): erro ao criar $t");

        if (!$DB->tableExists(self::SCHEDULE_TABLE)) {
            return;
        }
        foreach ($DB->request(['FROM' => self::SCHEDULE_TABLE, 'ORDER' => 'id']) as $r) {
            $feita = (string) $r['state'] === 'concluida';
            $DB->insert($t, [
                'plugin_codexplus_documents_id' => (int) $r['plugin_codexplus_documents_id'],
                'row_key'       => (string) $r['row_key'],
                'action'        => $feita ? 'concluir' : 'iniciar',
                'date_value'    => $feita ? $r['date_done'] : $r['date_start'],
                'users_id'      => (int) $r['users_id'],
                'date_creation' => $r['date_mod'],
            ]);
        }
    }

    /**
     * M-1 (Claudio, 04/10/2026): várias marcas na mesma instalação (grupo de
     * empresas de um mesmo dono, numa entidade só). Cada marca tem nome da
     * empresa, logo, altura da logo e cor principal; uma é a padrão.
     *
     * A primeira marca nasce da configuração que já existia (nome da empresa,
     * logo e altura), uma vez só: com a tabela vazia. É a mesma lógica das
     * sementes de modelos (tabela nova recebe o dado de partida); a logo
     * antiga continua no lugar, sem uso, para nada se perder.
     */
    private static function installM1(): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $t = self::BRANDS_TABLE;
        if (!$DB->tableExists($t)) {
            $DB->doQueryOrDie("CREATE TABLE `$t` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `name` varchar(255) NOT NULL DEFAULT '',
                `logo_filename` varchar(255) NOT NULL DEFAULT '',
                `logo_mm` int unsigned NOT NULL DEFAULT '14',
                `color` varchar(7) NOT NULL DEFAULT '#0c447c',
                `is_default` tinyint NOT NULL DEFAULT '0',
                `date_creation` timestamp NULL DEFAULT NULL,
                `date_mod` timestamp NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                KEY `is_default` (`is_default`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC", "Codex+ (M-1): erro ao criar $t");
        }

        $row = $DB->request(['COUNT' => 'cpt', 'FROM' => $t])->current();
        if ((int) ($row['cpt'] ?? 0) === 0) {
            Brand::seedFromConfig();
        }
    }

    /**
     * M-2 (Claudio, 04/10/2026): cada documento diz de qual marca é. A versão
     * publicada guarda a marca com que foi publicada (o leitor, durante uma
     * revisão, imprime com ela).
     *
     * Documento que já existia fica PRESO à marca padrão de hoje, uma vez só
     * (linhas com 0): sem isso, trocar a padrão depois mudaria a logo de
     * todos os documentos antigos.
     */
    private static function installM2(Migration $migration): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $migration->addField(self::DOCUMENTS_TABLE, 'plugin_codexplus_brands_id', 'fkey', ['after' => 'client_items_id']);
        $migration->addKey(self::DOCUMENTS_TABLE, 'plugin_codexplus_brands_id');
        $migration->addField(self::VERSIONS_TABLE, 'plugin_codexplus_brands_id', 'fkey');
        $migration->migrationOneTable(self::DOCUMENTS_TABLE);
        $migration->migrationOneTable(self::VERSIONS_TABLE);

        $padrao = Brand::getDefault();
        if ($padrao !== null) {
            $DB->update(self::DOCUMENTS_TABLE, ['plugin_codexplus_brands_id' => $padrao['id']], ['plugin_codexplus_brands_id' => 0]);
            $DB->update(self::VERSIONS_TABLE, ['plugin_codexplus_brands_id' => $padrao['id']], ['plugin_codexplus_brands_id' => 0]);
        }
    }

    /**
     * A-1 (Claudio, 04/10/2026): Proposta e Laudo com vários editores, na
     * tabela documenteditors (criada na R3c). O editor único de antes
     * (users_id_reviewer) vira a primeira linha da lista, uma vez só: só
     * entra se o documento ainda não tem nenhuma linha.
     */
    private static function installA1(): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $t = self::DOC_EDITORS_TABLE;
        if (!$DB->tableExists($t)) {
            return;
        }
        $docs = $DB->request([
            'SELECT' => ['id', 'users_id_reviewer'],
            'FROM'   => self::DOCUMENTS_TABLE,
            'WHERE'  => [
                'doctype'           => explode(' ', DocumentMeta::typesWithFlow([DocumentMeta::FLOW_DIRECT])),
                'users_id_reviewer' => ['>', 0],
            ],
        ]);
        foreach ($docs as $d) {
            if (countElementsInTable($t, ['plugin_codexplus_documents_id' => (int) $d['id']]) > 0) {
                continue;
            }
            $DB->insert($t, [
                'plugin_codexplus_documents_id' => (int) $d['id'],
                'users_id'                      => (int) $d['users_id_reviewer'],
                'groups_id'                     => 0,
                'date_creation'                 => date('Y-m-d H:i:s'),
            ]);
        }
    }

    /**
     * A-2a (Claudio, 04/10/2026): diagramas com vários aprovadores, só
     * usuários. date_approved vazio = ainda não aprovou nesta rodada; o
     * envio para validação e a devolução zeram.
     */
    private static function installA2a(): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $t = self::DOC_APPROVERS_TABLE;
        if (!$DB->tableExists($t)) {
            $DB->doQueryOrDie("CREATE TABLE `$t` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `plugin_codexplus_documents_id` int unsigned NOT NULL DEFAULT '0',
                `users_id` int unsigned NOT NULL DEFAULT '0',
                `date_approved` timestamp NULL DEFAULT NULL,
                `date_creation` timestamp NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `doc_user` (`plugin_codexplus_documents_id`, `users_id`),
                KEY `users_id` (`users_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC", "Codex+ (A-2a): erro ao criar $t");
        }
    }

    /**
     * R6-b (Claudio, 04/10/2026): prazo da revisão aberta e eventos da
     * revisão. revision_due vazio = sem prazo (revisão aberta antes da R6-b:
     * o responsável define pelo Prorrogar). Os eventos alimentam a lista de
     * prorrogações da página e o histórico de revisões no fim do PDF.
     */
    private static function installR6b(Migration $migration): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $migration->addField(self::DOCUMENTS_TABLE, 'revision_due', 'date');

        $t = self::REV_EVENTS_TABLE;
        if (!$DB->tableExists($t)) {
            $DB->doQueryOrDie("CREATE TABLE `$t` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `plugin_codexplus_documents_id` int unsigned NOT NULL DEFAULT '0',
                `revision` int unsigned NOT NULL DEFAULT '0',
                `event` varchar(16) NOT NULL DEFAULT '',
                `date_due` date DEFAULT NULL,
                `reason` text,
                `users_id` int unsigned NOT NULL DEFAULT '0',
                `date_creation` timestamp NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                KEY `doc_rev` (`plugin_codexplus_documents_id`, `revision`),
                KEY `event` (`event`),
                KEY `users_id` (`users_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC", "Codex+ (R6-b): erro ao criar $t");
        }
    }

    /**
     * R7 (Claudio, 04/10/2026): link secreto de leitura sem login, por
     * documento. Token vazio = desligado; gerar de novo troca o token.
     */
    private static function installR7(Migration $migration): void
    {
        $doc = self::DOCUMENTS_TABLE;
        $migration->addField($doc, 'anon_token', 'string');
        $migration->addField($doc, 'anon_users_id', 'fkey');
        $migration->addField($doc, 'anon_date', 'timestamp');
        $migration->addField($doc, 'anon_hits', 'integer');
        $migration->addField($doc, 'anon_last', 'timestamp');
        $migration->addKey($doc, 'anon_token');
    }

    /** Etapa 5 (Claudio, 04/10/2026): documentos vinculados. */
    /**
     * AP-1 (Claudio, 04/10/2026): cada versão publicada guarda quem a aprovou
     * (JSON users_id + data), para a leitura, o PDF e o Word da versão não
     * lerem a lista atual. Coluna criada e preenchida UMA vez: só a última
     * versão publicada de cada documento recebe os aprovadores que têm data
     * (as datas são zeradas no envio, então as que restam são da rodada que
     * publicou); as anteriores ficam sem registro (sem a linha).
     */
    /**
     * MO-1 (Claudio, 04/10/2026): setor e categoria no modelo, ambos
     * opcionais (0 = Geral / setor todo). Não semeia nada (achado 137): os
     * modelos que já existem ficam em Geral e continuam valendo para todos.
     */
    private static function installMO1(): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $t = self::TEMPLATES_TABLE;
        foreach (['plugin_codexplus_sectors_id', 'plugin_codexplus_categories_id'] as $col) {
            if (!$DB->fieldExists($t, $col, false)) {
                $DB->doQueryOrDie(
                    "ALTER TABLE `$t` ADD `$col` int unsigned NOT NULL DEFAULT '0', ADD KEY `$col` (`$col`)",
                    "Codex+ (MO-1): erro ao criar $t.$col"
                );
            }
        }
    }

    private static function installAP1(): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $t = self::VERSIONS_TABLE;
        if ($DB->fieldExists($t, 'approvers', false)) {
            return;
        }
        $DB->doQueryOrDie("ALTER TABLE `$t` ADD `approvers` text NULL DEFAULT NULL AFTER `users_id`", "Codex+ (AP-1): erro ao criar $t.approvers");

        $ultima = [];
        foreach ($DB->request(['SELECT' => ['id', 'plugin_codexplus_documents_id', 'revision'], 'FROM' => $t]) as $r) {
            $did = (int) $r['plugin_codexplus_documents_id'];
            if (!isset($ultima[$did]) || (int) $r['revision'] > $ultima[$did]['rev']) {
                $ultima[$did] = ['id' => (int) $r['id'], 'rev' => (int) $r['revision']];
            }
        }
        if ($ultima === []) {
            return;
        }
        $tipos = [];
        foreach ($DB->request([
            'SELECT' => ['id', 'doctype'],
            'FROM'   => self::DOCUMENTS_TABLE,
            'WHERE'  => ['id' => array_keys($ultima)],
        ]) as $r) {
            $tipos[(int) $r['id']] = (string) $r['doctype'];
        }
        $aprov = [];
        foreach ($DB->request([
            'SELECT' => ['plugin_codexplus_documents_id', 'users_id', 'date_approved'],
            'FROM'   => self::DOC_APPROVERS_TABLE,
            'WHERE'  => ['plugin_codexplus_documents_id' => array_keys($ultima), 'NOT' => ['date_approved' => null]],
            'ORDER'  => ['id ASC'],
        ]) as $r) {
            $aprov[(int) $r['plugin_codexplus_documents_id']][(int) $r['users_id']] = (string) $r['date_approved'];
        }
        foreach ($ultima as $did => $v) {
            if (!Document::typeUsesApprovers($tipos[$did] ?? '') || empty($aprov[$did])) {
                continue;
            }
            $DB->update($t, ['approvers' => DocumentVersion::encodeApprovers($aprov[$did])], ['id' => $v['id']]);
        }
    }

    private static function installE5(): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $t = self::DOC_LINKS_TABLE;
        if (!$DB->tableExists($t)) {
            $DB->doQueryOrDie("CREATE TABLE `$t` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `parent_documents_id` int unsigned NOT NULL DEFAULT '0',
                `child_documents_id` int unsigned NOT NULL DEFAULT '0',
                `rank` int unsigned NOT NULL DEFAULT '0',
                `users_id` int unsigned NOT NULL DEFAULT '0',
                `date_creation` timestamp NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `pair` (`parent_documents_id`, `child_documents_id`),
                KEY `child_documents_id` (`child_documents_id`),
                KEY `users_id` (`users_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC", "Codex+ (Etapa 5): erro ao criar $t");
        }
    }

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

        // Q4a (Claudio, 27/09/2026): ícones do quadro criados pelo
        // Super-Admin. A imagem é um PNG pequeno em data URL (IconLibrary).
        $t = self::ICONS_TABLE;
        if (!$DB->tableExists($t)) {
            $DB->doQueryOrDie("CREATE TABLE `$t` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `name` varchar(80) NOT NULL DEFAULT '',
                `cat` varchar(16) NOT NULL DEFAULT 'infra',
                `search` varchar(255) NOT NULL DEFAULT '',
                `mode` varchar(8) NOT NULL DEFAULT 'color',
                `image` mediumtext NULL,
                `users_id` int unsigned NOT NULL DEFAULT '0',
                `date_creation` timestamp NULL DEFAULT NULL,
                `date_mod` timestamp NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                KEY `cat` (`cat`)
            ) $opts", "Codex+ (Q4a): erro ao criar $t");
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

    /**
     * Q8-2 (Claudio, 05/10/2026): catálogo do mapa de calor. As duas tabelas
     * nascem VAZIAS (achado 137: modelo é dado da instalação). Potência e
     * ganho em decimal(4,1): datasheet traz meio dBi.
     */
    private static function installQ82(): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        $t = self::WIFI_MODELS_TABLE;
        if (!$DB->tableExists($t)) {
            $DB->doQueryOrDie("CREATE TABLE `$t` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `vendor` varchar(80) NOT NULL DEFAULT '',
                `name` varchar(120) NOT NULL DEFAULT '',
                `standard` varchar(8) NOT NULL DEFAULT 'wifi6',
                `has_24` tinyint NOT NULL DEFAULT '0',
                `tx_24` decimal(4,1) NOT NULL DEFAULT '0.0',
                `gain_24` decimal(4,1) NOT NULL DEFAULT '0.0',
                `has_5` tinyint NOT NULL DEFAULT '0',
                `tx_5` decimal(4,1) NOT NULL DEFAULT '0.0',
                `gain_5` decimal(4,1) NOT NULL DEFAULT '0.0',
                `has_6` tinyint NOT NULL DEFAULT '0',
                `tx_6` decimal(4,1) NOT NULL DEFAULT '0.0',
                `gain_6` decimal(4,1) NOT NULL DEFAULT '0.0',
                `date_creation` timestamp NULL DEFAULT NULL,
                `date_mod` timestamp NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                KEY `name` (`name`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC", "Codex+ (Q8-2): erro ao criar $t");
        }

        $t = self::WIFI_PROFILES_TABLE;
        if (!$DB->tableExists($t)) {
            $DB->doQueryOrDie("CREATE TABLE `$t` (
                `id` int unsigned NOT NULL AUTO_INCREMENT,
                `name` varchar(80) NOT NULL DEFAULT '',
                `gain` decimal(4,1) NOT NULL DEFAULT '0.0',
                `has_24` tinyint NOT NULL DEFAULT '0',
                `tx_24` decimal(4,1) NOT NULL DEFAULT '0.0',
                `has_5` tinyint NOT NULL DEFAULT '0',
                `tx_5` decimal(4,1) NOT NULL DEFAULT '0.0',
                `has_6` tinyint NOT NULL DEFAULT '0',
                `tx_6` decimal(4,1) NOT NULL DEFAULT '0.0',
                `is_default` tinyint NOT NULL DEFAULT '0',
                `date_creation` timestamp NULL DEFAULT NULL,
                `date_mod` timestamp NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                KEY `is_default` (`is_default`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC", "Codex+ (Q8-2): erro ao criar $t");
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
        // 7a: a ação automática do alerta de vencimento sai junto.
        \CronTask::unregister('codexplus');
        // 7b: notificações e modelo do documento (com traduções, destinos e modos).
        (new \Notification())->deleteByCriteria(['itemtype' => Document::class], true);
        (new \NotificationTemplate())->deleteByCriteria(['itemtype' => Document::class], true);
        return true;
    }
}
