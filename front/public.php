<?php
/**
 * Codex+ — leitura por link secreto, sem login (R7, Claudio, 04/10/2026).
 *
 * Única página do plugin fora da checagem de sessão do GLPI (Firewall
 * STRATEGY_NO_CHECK, registrado no plugin_init). Toda a regra está aqui e em
 * Document::findByAnonToken(): token bem formado, igual ao gravado, e
 * documento publicado (ou em revisão: mostra a versão publicada em vigor).
 * Qualquer outro caso cai na mesma mensagem neutra, com 404, sem dizer o
 * motivo. Pelo link não se chega a mais nada do GLPI: a página não tem menu
 * nem links internos.
 *
 * R7-1: texto. Imagens, anexos, logo e PDF pela própria rota vêm na R7-2.
 */

use Glpi\Application\View\TemplateRenderer;
use Glpi\RichText\RichText;
use GlpiPlugin\Codexplus\Brand;
use GlpiPlugin\Codexplus\Document;
use GlpiPlugin\Codexplus\DocumentVersion;

/** @var array $CFG_GLPI */
global $CFG_GLPI;

$token = (string) ($_GET['t'] ?? '');
$doc   = Document::findByAnonToken($token);

header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer');

$vars = [
    'root'    => $CFG_GLPI['root_doc'],
    'version' => PLUGIN_CODEXPLUS_VERSION,
    'company' => '',
    'doc'     => null,
];

if ($doc === null) {
    http_response_code(404);
} else {
    $name    = (string) $doc->fields['name'];
    $content = (string) ($doc->fields['content'] ?? '');
    $code    = $doc->getCode();
    $date    = (string) ($doc->fields['date_published'] ?? '');
    $updating = false;
    if ($doc->isInRevision()) {
        // Durante a revisão, a versão publicada em vigor (como para o leitor).
        $prev = (int) $doc->fields['revision'] - 1;
        $v    = DocumentVersion::get((int) $doc->fields['id'], $prev);
        if ($v === null) {
            http_response_code(404);
            $doc = null;
        } else {
            $name     = (string) $v['name'];
            $content  = (string) $v['content'];
            $code     = sprintf('%s%04d:%02d', $doc->fields['doctype'], (int) $doc->fields['sequence'], $prev);
            $date     = (string) ($v['date_published'] ?? '');
            $updating = true;
        }
    }
    if ($doc !== null) {
        $doc->anonHit();
        // M-1: nome da marca do documento (a logo vem na R7-2, pela rota pública).
        $vars['company'] = (string) (Brand::forPrint((int) ($doc->fields['plugin_codexplus_brands_id'] ?? 0))['company'] ?? '');
        $vars['doc'] = [
            'name'     => $name,
            'code'     => $code,
            'date'     => $date,
            'updating' => $updating,
            'html'     => RichText::getEnhancedHtml($content, ['text_maxsize' => 0]),
        ];
    }
}

TemplateRenderer::getInstance()->display('@codexplus/public.html.twig', $vars);
