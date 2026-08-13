<?php

/**
 * Codex+ — leitura do artigo dentro do plugin (Etapa 1).
 */

use Glpi\Application\View\TemplateRenderer;
use GlpiPlugin\Codexplus\Branding;
use GlpiPlugin\Codexplus\Wiki;

include('../../../inc/includes.php');

global $CFG_GLPI;

Session::checkRight('plugin_codexplus_wiki', READ);

$id = isset($_GET['id']) && ctype_digit((string) $_GET['id']) ? (int) $_GET['id'] : 0;

Html::header(
    Wiki::getMenuName(),
    $_SERVER['PHP_SELF'],
    'tools',
    Wiki::class
);

$article = $id > 0 ? Wiki::getArticle($id) : null;

if ($article === null) {
    // Artigo inexistente OU sem permissão: mensagem única, para não
    // revelar a existência de um artigo que o usuário não pode ver.
    echo '<div class="alert alert-warning m-3">'
        . htmlescape(__('Artigo não encontrado ou sem permissão de acesso.', 'codexplus'))
        . ' <a href="wiki.php">' . htmlescape(__('Voltar ao Codex+', 'codexplus')) . '</a>'
        . '</div>';
    Html::footer();
    exit;
}

// Etapa 4b — bagagem do PDF entregue ao JS como JSON embutido.
//
// POR QUE JSON EMBUTIDO E NÃO data-attributes: são dados estruturados
// (aninhados, com booleanos), e espalhá-los em atributos obrigaria o JS a
// reconverter tipo por tipo. Um bloco só também mantém o contrato explícito.
//
// As flags de escape NÃO são opcionais: um `</script>` dentro do título de
// um documento fecharia a tag e quebraria a página inteira.
$print_config = json_encode(
    [
        'brand'    => [
            'company'      => Branding::get('company_name'),
            'logo_url'     => Branding::getLogoUrl(),
            'show_logo'    => Branding::get('header_show_logo') === '1',
            'repeat_logo'  => Branding::get('header_repeat') === '1',
            'logo_pos'     => Branding::get('header_logo_position'),
            'logo_mm'      => (int) Branding::get('header_logo_height'),
            'title_upper'  => Branding::get('title_uppercase') === '1',
            'footer_show'  => Branding::get('footer_show') === '1',
            'footer_text'  => Branding::get('footer_text'),
            'footer_pages' => Branding::get('footer_show_pagination') === '1',
        ],
        'document' => [
            'title'    => $article['subject'],
            'code'     => $article['meta']['code'],
            'revision' => $article['meta']['revision'],
            'client'   => $article['meta']['client_name'],
            'date_mod' => $article['date_mod'],
        ],
    ],
    JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
);

TemplateRenderer::getInstance()->display('@codexplus/article.html.twig', [
    'glpi_root'    => $CFG_GLPI['root_doc'],
    'article'      => $article,
    'print_config' => $print_config !== false ? $print_config : '{}',
]);

Html::footer();
