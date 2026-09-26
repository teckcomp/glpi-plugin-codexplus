<?php

namespace GlpiPlugin\Codexplus;

use CommonGLPI;
use Document_Item;


/**
 * Codex+ — entrada do menu e cabeçalho das páginas.
 *
 * Até a R5 esta classe também lia a Base de Conhecimento nativa (estante do
 * modelo antigo). Desde a R5 (Claudio, 26/09/2026) o Codex+ não lê mais
 * glpi_knowbaseitems: a estante é a Biblioteca (Library), no modelo novo.
 */
class Wiki extends CommonGLPI
{
    public static $rightname = 'plugin_codexplus_wiki';

    public static function getTypeName($nb = 0)
    {
        return __('Codex+', 'codexplus');
    }

    /** 0.6.6: ícone do menu e da trilha de navegação (Tabler do GLPI). */
    public static function getIcon()
    {
        return 'ti ti-square-rounded-letter-c-filled';
    }

    /**
     * Cabeçalho das páginas do Codex+ (S1, Claudio 26/09/2026): na interface
     * simplificada (Self-Service, só leitura) usa o cabeçalho dela; senão, o
     * da interface padrão, no menu Ferramentas.
     */
    public static function pageHeader(): void
    {
        if (\Session::getCurrentInterface() === 'helpdesk') {
            \Html::helpHeader(self::getMenuName(), 'codexplus', 'codexplus'); // B1: acende a entrada da barra
            return;
        }
        \Html::header(self::getMenuName(), $_SERVER['PHP_SELF'], 'tools', self::class);
    }

    public static function pageFooter(): void
    {
        if (\Session::getCurrentInterface() === 'helpdesk') {
            \Html::helpFooter();
            return;
        }
        \Html::footer();
    }

    public static function getMenuName()
    {
        return __('Codex+', 'codexplus');
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
            // B1: quem só lê entra direto na Biblioteca.
            'page'  => $CFG_GLPI['root_doc'] . '/plugins/codexplus/front/' . (Rights::isProducer() ? 'dashboard.php' : 'library.php'),
            'icon'  => self::getIcon(), // 0.6.6: o mais próximo da marca C+ entre os ícones Tabler
        ];
    }
}
