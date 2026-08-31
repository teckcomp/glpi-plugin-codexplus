<?php
/**
 * Codex+ — base de conhecimento / wiki visual para GLPI 11
 *
 * Não substitui nem altera as tabelas nativas (glpi_knowbaseitems,
 * glpi_knowbaseitemcategories). Lê os dados nativos e apresenta em telas
 * próprias; tabelas próprias só para o que o GLPI não tem (metadados de
 * documento controlado, modelos de POP).
 */
use Glpi\Plugin\Hooks;
use GlpiPlugin\Codexplus\DocumentMeta;
use GlpiPlugin\Codexplus\Wiki;
define('PLUGIN_CODEXPLUS_VERSION', '0.5.4-alpha');
// Versões mínima/máxima do GLPI suportadas
define('PLUGIN_CODEXPLUS_MIN_GLPI', '11.0.0');
define('PLUGIN_CODEXPLUS_MAX_GLPI', '11.0.99');
/**
 * Inicialização do plugin: hooks, menus, CSS/JS.
 */
function plugin_init_codexplus(): void
{
    global $PLUGIN_HOOKS;
    $PLUGIN_HOOKS[Hooks::CSRF_COMPLIANT]['codexplus'] = true;
    $plugin = new Plugin();
    if (!$plugin->isActivated('codexplus')) {
        return;
    }
    // Item de menu: Ferramentas > Codex+
    if (Session::haveRight('plugin_codexplus_wiki', READ)) {
        $PLUGIN_HOOKS['menu_toadd']['codexplus'] = [
            'tools' => Wiki::class,
        ];
    }
    // Aba "Codex+" na ficha nativa do artigo (Etapa 2a): edita tipo, status,
    // responsável, validade e revisão, e mostra o código derivado. Não altera
    // nada da tabela nativa — grava só na satélite glpi_plugin_codexplus_documents.
    Plugin::registerClass(DocumentMeta::class, [
        'addtabon' => 'KnowbaseItem',
    ]);
    // Tela de configuração de marca (Etapa 4a): ícone de engrenagem ao lado
    // do Codex+ em Configurar > Plugins. O caminho é relativo à pasta do
    // plugin. Só quem tem `config` UPDATE consegue abrir (checado no front).
    $PLUGIN_HOOKS[Hooks::CONFIG_PAGE]['codexplus'] = 'front/config.form.php';

    // CSS/JS carregados em todas as páginas; as regras são escopadas em
    // .codexplus-app e o JS só age se encontrar os elementos do plugin.
    // Os estáticos ficam em public/ — no GLPI 11 o roteador só serve
    // arquivos não-PHP a partir dessa pasta.
    $PLUGIN_HOOKS[Hooks::ADD_CSS]['codexplus']        = 'css/codexplus.css';
    $PLUGIN_HOOKS[Hooks::ADD_JAVASCRIPT]['codexplus'] = 'js/codexplus.js';
}
/**
 * Metadados do plugin.
 */
function plugin_version_codexplus(): array
{
    return [
        'name'         => 'Codex+',
        'version'      => PLUGIN_CODEXPLUS_VERSION,
        'author'       => 'Teckcomp I.T. Services',
        'license'      => 'GPL-2.0-or-later',
        'homepage'     => 'https://github.com/teckcomp/glpi-plugin-codexplus',
        'requirements' => [
            'glpi' => [
                'min' => PLUGIN_CODEXPLUS_MIN_GLPI,
                'max' => PLUGIN_CODEXPLUS_MAX_GLPI,
            ],
            'php'  => [
                'min' => '8.2',
            ],
        ],
    ];
}
/**
 * Pré-requisitos (chamado antes da instalação).
 */
function plugin_codexplus_check_prerequisites(): bool
{
    if (version_compare(GLPI_VERSION, PLUGIN_CODEXPLUS_MIN_GLPI, '<')) {
        echo sprintf(
            'Este plugin requer GLPI >= %s (versão atual: %s)',
            PLUGIN_CODEXPLUS_MIN_GLPI,
            GLPI_VERSION
        );
        return false;
    }
    return true;
}
/**
 * Verificação de configuração (chamado na ativação).
 */
function plugin_codexplus_check_config($verbose = false): bool
{
    return true;
}
