<?php
/**
 * Codex+ — Biblioteca (bloco B1): prateleira dos documentos publicados que a
 * pessoa lê, Setor → Categoria. Entrada de quem só lê; aba do Painel para
 * quem produz. Regras em Library/Dashboard/Document; aqui só a tela.
 */
use Glpi\Application\View\TemplateRenderer;
use GlpiPlugin\Codexplus\DocumentMeta;
use GlpiPlugin\Codexplus\Library;
use GlpiPlugin\Codexplus\Rights;
use GlpiPlugin\Codexplus\Wiki;

include('../../../inc/includes.php');

// Achado 9: escopo de função.
global $DB, $CFG_GLPI;

Session::checkRight(Rights::NAME, READ);

$producer = Rights::isProducer();
$self     = $CFG_GLPI['root_doc'] . '/plugins/codexplus/front/library.php';

// R5: restaurar da lixeira (quem pode excluir o documento pode restaurar).
if ($producer && isset($_POST['restore'])) {
    $doc = new \GlpiPlugin\Codexplus\Document();
    $rid = (int) ($_POST['id'] ?? 0);
    if ($doc->getFromDB($rid) && $doc->canDeleteItem() && $doc->restore(['id' => $rid])) {
        Session::addMessageAfterRedirect(sprintf(__('%s restaurado.', 'codexplus'), $doc->getCode()));
    } else {
        Session::addMessageAfterRedirect(__('Sem direito de restaurar este documento.', 'codexplus'), false, ERROR);
    }
    Html::redirect($self . '?situacao=lixeira');
}

Wiki::pageHeader();

// HV-1: quem só lê pode incluir os obsoletos (quem produz já tem o filtro
// de Situação, com Obsoleto).
$obsoletos = !$producer && !empty($_GET['obsoletos']);
$shelf = Library::shelf($producer, $obsoletos);
$q     = trim((string) ($_GET['q'] ?? ''));

// B2b (Claudio, 27/09/2026): três níveis. Sem parâmetro = nichos dos setores;
// ?setor= = nichos das categorias do setor; &cat= = lombadas da categoria;
// ?q= = busca em toda a Biblioteca (a estante inteira, como no B2a).
$mode   = 'setores';
$sector = null;
$cat    = null;
if ($q !== '') {
    $mode = 'tudo';
} elseif (isset($_GET['setor']) && $_GET['setor'] !== '') {
    foreach ($shelf['sectors'] as $s) {
        if ($s['id'] === (int) $_GET['setor']) {
            $sector = $s;
            break;
        }
    }
    if ($sector !== null) {
        $mode = 'categorias';
        if (isset($_GET['cat']) && $_GET['cat'] !== '') {
            foreach ($sector['categories'] as $c) {
                if ($c['id'] === (int) $_GET['cat']) {
                    $cat = $c;
                    break;
                }
            }
            if ($cat !== null) {
                $mode = 'docs';
            }
        }
    }
}

$base   = $self . '?';
$niches = [];
if ($mode === 'setores') {
    foreach ($shelf['sectors'] as $s) {
        // B2c: no nível 1, os diagramas vão depois do aparador (rolos).
        $niches[] = [
            'name'   => $s['name'],
            'href'   => $base . 'setor=' . $s['id'],
            'recent' => array_values(array_filter($s['recent'], static fn ($d) => $d['doctype'] !== 'DIA')),
            'dias'   => array_values(array_filter($s['recent'], static fn ($d) => $d['doctype'] === 'DIA')),
        ];
    }
    $scope = $shelf['sectors'];
} elseif ($mode === 'categorias') {
    foreach ($sector['categories'] as $c) {
        $niches[] = [
            'name'   => $c['name'],
            'href'   => $base . 'setor=' . $sector['id'] . '&cat=' . $c['id'],
            'recent' => $c['recent'],
            'dias'   => [],
        ];
    }
    $scope = [$sector];
} elseif ($mode === 'docs') {
    $scope = [array_merge($sector, ['categories' => [$cat], 'total' => count($cat['docs'])])];
} else {
    $scope = $shelf['sectors'];
}
$counts = Library::counts($scope);

TemplateRenderer::getInstance()->display('@codexplus/library.html.twig', [
    'shelf'     => ['sectors' => $scope] + $counts,
    'level'     => [
        'mode'     => $mode,
        'sector'   => $sector === null ? null : ['id' => $sector['id'], 'name' => $sector['name']],
        'category' => $cat === null ? null : ['id' => $cat['id'], 'name' => $cat['name']],
    ],
    'niches'    => $niches,
    'decor'     => in_array($mode, ['setores', 'categorias'], true) ? Library::decor(count($niches), $sector === null ? 0 : $sector['id'] + 1) : [],
    // Novo documento na categoria aberta, já com a categoria preenchida.
    'new_url'   => ($mode === 'docs' && $cat['id'] > 0 && \GlpiPlugin\Codexplus\Document::canCreate())
        ? $CFG_GLPI['root_doc'] . '/plugins/codexplus/front/document.form.php?cat=' . $cat['id'] : '',
    'doctypes'  => DocumentMeta::getDoctypes(),
    // Cliente só nos tipos que têm cliente (dado antigo em outro tipo fica fora).
    'client_types' => array_merge(DocumentMeta::CLIENT_TEXT_TYPES, DocumentMeta::CLIENT_LINK_TYPES),
    'producer'  => $producer,
    // AP-1: com "Aguardando aprovadores" (situação, não status gravado).
    'statuses'  => \GlpiPlugin\Codexplus\Document::getSituations(),
    'trash'     => $producer ? Library::trash() : [],
    'me'        => (int) Session::getLoginUserID(),
    'q'         => $q,
    // Busca vinda do Painel procura em todas as situações.
    'situacao'  => (string) ($_GET['situacao'] ?? ($q !== '' ? 'todos' : 'publicado')),
    // B2b: filtros levados de um nível para o outro.
    'tipo'      => (string) ($_GET['tipo'] ?? ''),
    'meus'      => !empty($_GET['meus']),
    'obsoletos' => $obsoletos,
    'self'      => $self,
    'csrf'      => Session::getNewCSRFToken(),
    'can_templates' => Session::haveRight(Rights::NAME, Rights::TEMPLATES),
    'can_config'    => Session::haveRight('config', UPDATE),
    'form_url'  => $CFG_GLPI['root_doc'] . '/plugins/codexplus/front/document.form.php',
]);

Wiki::pageFooter();
