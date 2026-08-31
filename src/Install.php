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
 * install() é IDEMPOTENTE: pode ser executado de novo numa atualização de
 * plugin já instalado (o GLPI marca o plugin como "a atualizar" quando a
 * versão do setup.php muda; aceitar a atualização roda esta função). Os
 * direitos usam addRight (idempotente) e a tabela é criada só se não existir.
 */
class Install
{
    public const DOCUMENTS_TABLE = 'glpi_plugin_codexplus_documents';
    public const TEMPLATES_TABLE = 'glpi_plugin_codexplus_templates';

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

        $migration->executeMigration();
        return true;
    }

    public static function uninstall(): bool
    {
        /** @var \DBmysql $DB */
        global $DB;

        // Remove a tabela satélite (só metadados do plugin — nunca toca
        // glpi_knowbaseitems nem os documentos nativos).
        foreach ([self::DOCUMENTS_TABLE, self::TEMPLATES_TABLE] as $table) {
            if ($DB->tableExists($table)) {
                $DB->doQuery("DROP TABLE `$table`");
            }
        }

        ProfileRight::deleteProfileRights(['plugin_codexplus_wiki']);
        return true;
    }
}
