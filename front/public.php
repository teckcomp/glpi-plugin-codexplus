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
 * R7-2 (Claudio, 04/10/2026): o documento aparece como sai no PDF (folhas
 * A4, mesmo motor do "Visualizar"), com Exportar PDF. A logo da marca vem
 * por esta mesma rota (?t=…&logo=1): só a do documento do link. Imagens do
 * corpo e anexos: R7-2b.
 */

use Glpi\Application\View\TemplateRenderer;
use Glpi\RichText\RichText;
use Glpi\Exception\Http\NotFoundHttpException;
use GlpiPlugin\Codexplus\Brand;
use GlpiPlugin\Codexplus\Branding;
use GlpiPlugin\Codexplus\Document;
use GlpiPlugin\Codexplus\DocumentMeta;
use GlpiPlugin\Codexplus\DocumentVersion;

/** @var array $CFG_GLPI */
global $CFG_GLPI;

$token = (string) ($_GET['t'] ?? '');
$doc   = Document::findByAnonToken($token);

// Marca da versão mostrada (na revisão, a da versão publicada em vigor).
$brandOf = static function (Document $d): int {
    $id = (int) ($d->fields['plugin_codexplus_brands_id'] ?? 0);
    if ($d->isInRevision()) {
        $v = DocumentVersion::get((int) $d->fields['id'], (int) $d->fields['revision'] - 1);
        if ($v !== null && (int) ($v['plugin_codexplus_brands_id'] ?? 0) > 0) {
            $id = (int) $v['plugin_codexplus_brands_id'];
        }
    }
    return Brand::resolveId($id);
};

// R7-2: logo da marca do documento. Nada da requisição escolhe o arquivo.
if (isset($_GET['logo'])) {
    $b    = $doc === null ? null : Brand::get($brandOf($doc));
    $path = $b === null ? null : Brand::logoPath($b);
    if ($path === null) {
        throw new NotFoundHttpException();
    }
    return Toolbox::getFileAsResponse($path, 'logo.' . pathinfo($path, PATHINFO_EXTENSION), Brand::logoMime($b), true);
}

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
        $brandId = $brandOf($doc);
        $vars['company'] = (string) (Brand::forPrint($brandId)['company'] ?? '');
        $self  = $CFG_GLPI['root_doc'] . '/plugins/codexplus/front/public.php?t=' . $token;
        $rev   = (int) $doc->fields['revision'] - ($updating ? 1 : 0);
        $owner = (int) ($doc->fields['users_id_owner'] ?? 0);
        // Mesma bagagem do PDF da página interna (front/document.form.php).
        $vars['print_config'] = Branding::printConfig([
            'title'          => $name,
            'code'           => $code,
            'revision'       => $rev,
            'client'         => (string) ($doc->fields['client_name'] ?? ''),
            'date_mod'       => (string) ($doc->fields['date_mod'] ?? ''),
            'doctype'        => (string) $doc->fields['doctype'],
            'owner'          => $owner > 0 ? getUserName($owner) : '',
            'sector'         => implode(', ', array_map(
                static fn ($sid) => Dropdown::getDropdownName('glpi_plugin_codexplus_sectors', $sid),
                $doc->getSectorIds()
            )),
            'date_published' => $date,
            'draft'          => '',
            'header_html'    => '',
            'norev'          => DocumentMeta::flowOf((string) $doc->fields['doctype']) === DocumentMeta::FLOW_DIRECT ? 1 : 0,
            'footer_text'    => (string) ($doc->fields['footer_text'] ?? ''),
            'history'        => DocumentMeta::flowOf((string) $doc->fields['doctype']) === DocumentMeta::FLOW_DIRECT ? []
                : DocumentVersion::history((int) $doc->fields['id'], $rev, $doc),
        ], $brandId, $self . '&logo=1');
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
