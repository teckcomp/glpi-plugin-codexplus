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

// Corpo mostrado (na revisão, o da versão publicada em vigor).
$shownContent = static function (Document $d): ?string {
    if (!$d->isInRevision()) {
        return (string) ($d->fields['content'] ?? '');
    }
    $v = DocumentVersion::get((int) $d->fields['id'], (int) $d->fields['revision'] - 1);
    return $v === null ? null : (string) $v['content'];
};

/**
 * R7-2b: arquivos que o link entrega — os ligados a ESTE documento E (citados
 * no corpo mostrado OU listados como anexo dele). Imagem de outra revisão,
 * de outro documento ou qualquer docid escolhido na mão: 404.
 *
 * @return int[]
 */
$allowedFiles = static function (Document $d, string $content): array {
    /** @var \DBmysql $DB */
    global $DB;
    preg_match_all('/docid=(\d+)/', $content, $m);
    $ok = array_map('intval', $m[1] ?? []);
    foreach (Document::listAttachments((int) $d->fields['id'], $content) as $a) {
        $ok[] = (int) $a['docid'];
    }
    if (!$ok) {
        return [];
    }
    $linked = [];
    foreach ($DB->request([
        'SELECT'     => ['glpi_documents_items.documents_id'],
        'FROM'       => 'glpi_documents_items',
        'INNER JOIN' => ['glpi_documents' => ['ON' => ['glpi_documents_items' => 'documents_id', 'glpi_documents' => 'id']]],
        'WHERE'      => [
            'glpi_documents_items.itemtype'     => Document::class,
            'glpi_documents_items.items_id'     => (int) $d->fields['id'],
            'glpi_documents_items.documents_id' => array_values(array_unique($ok)),
            'glpi_documents.is_deleted'         => 0,
        ],
    ]) as $r) {
        $linked[] = (int) $r['documents_id'];
    }
    return $linked;
};

// R7-2b: imagem do corpo ou anexo, pelo link.
if (isset($_GET['f'])) {
    $content = $doc === null ? null : $shownContent($doc);
    $fid     = (int) $_GET['f'];
    if ($content === null || $fid <= 0 || !in_array($fid, $allowedFiles($doc, $content), true)) {
        throw new NotFoundHttpException();
    }
    $file = new \Document();
    if (!$file->getFromDB($fid)) {
        throw new NotFoundHttpException();
    }
    return $file->getAsResponse();
}

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
        // 5b: referência e complementares pelo link público do citado, quando
        // ele tem um; senão só o texto (quem está fora não entra no GLPI).
        $anonHref = static fn (Document $d) => (!empty($d->fields['anon_token']) && $d->isAnonymousReadable())
            ? $CFG_GLPI['root_doc'] . '/plugins/codexplus/front/public.php?t=' . $d->fields['anon_token'] : null;
        $complements = \GlpiPlugin\Codexplus\DocumentLink::complements(
            (int) $doc->fields['id'],
            $anonHref,
            static fn ($d, $info) => $info['state'] === 'obsoleto' ? __('obsoleto', 'codexplus') : ''
        );
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
            'complements'    => $complements,
            'history'        => DocumentMeta::flowOf((string) $doc->fields['doctype']) === DocumentMeta::FLOW_DIRECT ? []
                : DocumentVersion::history((int) $doc->fields['id'], $rev, $doc),
        ], $brandId, $self . '&logo=1');
        $vars['doc'] = [
            'name'     => $name,
            'code'     => $code,
            'date'     => $date,
            'updating' => $updating,
            // R7-2b: imagens do corpo pela rota do link (a do GLPI pede login).
            'html'     => RichText::getEnhancedHtml(
                \GlpiPlugin\Codexplus\DocumentLink::resolveRefs((string) preg_replace(
                    '#[^"\'\s>]*/front/document\.send\.php\?docid=(\d+)[^"\'\s>]*#',
                    htmlspecialchars($self, ENT_QUOTES) . '&amp;f=$1',
                    $content
                ), $anonHref),
                ['text_maxsize' => 0]
            ),
            'files'    => array_map(static fn ($a) => [
                'name' => $a['name'],
                'url'  => $self . '&f=' . $a['docid'],
            ], Document::listAttachments((int) $doc->fields['id'], $content)),
        ];
    }
}

TemplateRenderer::getInstance()->display('@codexplus/public.html.twig', $vars);
