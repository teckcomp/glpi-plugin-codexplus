<?php

/**
 * Codex+ — página do documento no MODELO NOVO (Etapa R3b1).
 *
 * Uma página só para criar, editar e mover o documento no fluxo:
 *   - sem id: formulário de criação (Criar + gestor de algum setor, ou
 *     Ver todos);
 *   - com id e em rascunho para quem pode editar: formulário de edição;
 *   - nos demais casos: visão só de leitura, com os botões do fluxo que o
 *     usuário pode usar (Enviar, Validar, Devolver, Obsoleto).
 * Todas as regras vêm de GlpiPlugin\Codexplus\Document (R3a/R3c); aqui só se
 * chama can*() e os métodos do fluxo. Nenhuma regra nova nesta página.
 *
 * Fora desta etapa (ROADMAP, R3b2–R3b4): editores e alvos de leitura pela
 * tela (hoje: pelo console), imagens coladas e anexos, leitura com PDF, e
 * trocar o "Novo documento" antigo. Por isso o TinyMCE está com
 * enable_images = false: imagem colada ainda não teria onde ser guardada.
 *
 * Roda em escopo de função (achado 9): `global` explícito.
 * CSRF: o núcleo valida o POST sozinho (achado 15); o template só inclui o
 * token.
 */

use Glpi\Application\View\TemplateRenderer;
use Glpi\RichText\RichText;
use GlpiPlugin\Codexplus\Category;
use GlpiPlugin\Codexplus\Document;
use GlpiPlugin\Codexplus\Document_Category;
use GlpiPlugin\Codexplus\DocumentEditor;
use GlpiPlugin\Codexplus\DocumentMeta;
use GlpiPlugin\Codexplus\Rights;
use GlpiPlugin\Codexplus\SectorMember;
use GlpiPlugin\Codexplus\Wiki;

include('../../../inc/includes.php');

global $DB, $CFG_GLPI;

if (!Document::canView()) {
    Html::displayRightError();
}

$self = $CFG_GLPI['root_doc'] . '/plugins/codexplus/front/document.form.php';
$id   = (int) ($_POST['id'] ?? $_GET['id'] ?? 0);
$doc  = new Document();

/** Categorias em que o usuário pode criar/ligar (null = todas: Ver todos). */
$allowedSectors = Session::haveRight(Rights::NAME, Rights::VIEWALL)
    ? null
    : SectorMember::mySectors(SectorMember::ROLE_MANAGER);

$postedCategories = static function (): array {
    $raw = $_POST['_categories'] ?? [];
    return array_values(array_unique(array_filter(array_map('intval', (array) $raw))));
};

// -------------------------------------------------------------------------
// POST — criar
// -------------------------------------------------------------------------
if (isset($_POST['add'])) {
    $input = [
        'name'        => (string) ($_POST['name'] ?? ''),
        'doctype'     => (string) ($_POST['doctype'] ?? ''),
        'content'     => (string) ($_POST['content'] ?? ''),
        'client_name' => (string) ($_POST['client_name'] ?? ''),
        '_categories' => $postedCategories(),
    ];
    if (!$doc->can(-1, CREATE, $input)) {
        Session::addMessageAfterRedirect(
            __('Sem direito de criar documento nestas categorias (é preciso ser gestor do setor de cada uma).', 'codexplus'),
            false,
            ERROR
        );
        Html::back();
    }
    $newId = $doc->add($input);
    if ($newId) {
        Session::addMessageAfterRedirect(__('Documento criado como rascunho.', 'codexplus'));
        Html::redirect($self . '?id=' . $newId);
    }
    Html::back();
}

// -------------------------------------------------------------------------
// A partir daqui, documento existente (ou tela de criação)
// -------------------------------------------------------------------------
if ($id > 0) {
    if (!$doc->getFromDB($id) || (int) $doc->fields['knowbaseitems_id'] !== 0) {
        Html::displayNotFoundError();
    }
    if (!$doc->can($id, READ)) {
        Html::displayRightError();
    }
}

// -------------------------------------------------------------------------
// POST — salvar edição
// -------------------------------------------------------------------------
if ($id > 0 && isset($_POST['update'])) {
    if (!$doc->can($id, UPDATE)) {
        Session::addMessageAfterRedirect(__('Sem direito de editar este documento.', 'codexplus'), false, ERROR);
        Html::redirect($self . '?id=' . $id);
    }

    $data = [
        'id'      => $id,
        'name'    => (string) ($_POST['name'] ?? $doc->fields['name']),
        'content' => (string) ($_POST['content'] ?? $doc->fields['content']),
    ];
    if ($doc->fields['doctype'] === 'PRP') {
        $data['client_name'] = (string) ($_POST['client_name'] ?? '');
    }

    $ok = true;
    if ($doc->canManage()) {
        if (isset($_POST['users_id_owner'])) {
            $data['users_id_owner'] = (int) $_POST['users_id_owner'];
        }

        // Categorias: diferença entre o que está gravado e o que veio.
        $current = Document_Category::getCategoryIds($id);
        $wanted  = $postedCategories();
        if ($wanted === [] && $allowedSectors !== null) {
            Session::addMessageAfterRedirect(
                __('O documento precisa de ao menos uma categoria (é ela que define o setor e quem valida).', 'codexplus'),
                false,
                ERROR
            );
            $ok = false;
        } else {
            foreach (array_diff($wanted, $current) as $cid) {
                $link = new Document_Category();
                $row  = ['plugin_codexplus_documents_id' => $id, 'plugin_codexplus_categories_id' => $cid];
                if (!$link->can(-1, CREATE, $row) || !$link->add($row)) {
                    Session::addMessageAfterRedirect(
                        sprintf(__('Categoria "%s" não ligada: fora dos setores que você gere.', 'codexplus'), Dropdown::getDropdownName(Category::getTable(), $cid)),
                        false,
                        ERROR
                    );
                    $ok = false;
                }
            }
            foreach (array_diff($current, $wanted) as $cid) {
                $link = new Document_Category();
                if (
                    $link->getFromDBByCrit(['plugin_codexplus_documents_id' => $id, 'plugin_codexplus_categories_id' => $cid])
                    && $link->can($link->getID(), PURGE)
                ) {
                    $link->delete(['id' => $link->getID()], true);
                }
            }
        }
    }

    if ($doc->update($data) && $ok) {
        Session::addMessageAfterRedirect(__('Documento salvo.', 'codexplus'));
    }
    Html::redirect($self . '?id=' . $id);
}

// -------------------------------------------------------------------------
// POST — fluxo (Enviar, Validar, Devolver, Obsoleto)
// -------------------------------------------------------------------------
if ($id > 0) {
    $flow = null;
    if (isset($_POST['submit_validation'])) {
        $flow = static fn () => $doc->submit();
        $okMsg = __('Enviado para validação.', 'codexplus');
    } elseif (isset($_POST['approve'])) {
        $flow = static fn () => $doc->approve();
        $okMsg = __('Documento validado e publicado.', 'codexplus');
    } elseif (isset($_POST['reject'])) {
        $flow = static fn () => $doc->reject((string) ($_POST['validation_comment'] ?? ''));
        $okMsg = __('Documento devolvido para rascunho.', 'codexplus');
    } elseif (isset($_POST['obsolete'])) {
        $flow = static fn () => $doc->markObsolete();
        $okMsg = __('Documento marcado como obsoleto.', 'codexplus');
    }
    if ($flow !== null) {
        if ($flow()) {
            Session::addMessageAfterRedirect($okMsg);
        }
        Html::redirect($self . '?id=' . $id);
    }
}

// -------------------------------------------------------------------------
// GET — tela
// -------------------------------------------------------------------------
$isNew = $id <= 0;

if ($isNew && !(Document::canCreate() && ($allowedSectors === null || $allowedSectors !== []))) {
    Html::displayRightError();
}

$canEdit = $isNew || $doc->can($id, UPDATE);

Html::header(Wiki::getMenuName(), $_SERVER['PHP_SELF'], 'tools', Wiki::class);

$categoryIds = $isNew ? [] : Document_Category::getCategoryIds($id);
$canManage   = !$isNew && $doc->canManage();

// Campos de formulário gerados pelo GLPI (devolvem string com display=false).
$widgets = [];
if ($canEdit) {
    $catCanChange = $isNew || ($canManage && $doc->fields['status'] === Document::STATUS_DRAFT);
    // Select múltiplo por AJAX: o GLPI usa o nome como veio (precisa do
    // "[]"); no modo somente leitura ele mesmo acrescenta o "[]".
    $catParams = [
        'name'     => $catCanChange ? '_categories[]' : '_categories',
        'multiple' => true,
        // Com 'multiple', o GLPI lê as escolhidas de 'value' e sobrescreve
        // 'values' (Dropdown::show, 11.0.6) — achado 41.
        'value'    => $categoryIds,
        'display'  => false,
        'width'    => '100%',
    ];
    if ($allowedSectors !== null) {
        // Só categorias de setores que o usuário gere (o servidor confere de novo).
        $catParams['condition'] = [Category::SECTOR_FIELD => $allowedSectors ?: [-1]];
    }
    if (!$catCanChange) {
        $catParams['readonly'] = true;
    }
    $widgets['categories'] = Category::dropdown($catParams);

    if ($isNew) {
        $widgets['doctype'] = Dropdown::showFromArray('doctype', DocumentMeta::getDoctypes(), [
            'display' => false,
            'value'   => 'POP',
            'width'   => '100%',
        ]);
    }
    if ($canManage) {
        $widgets['owner'] = User::dropdown([
            'name'    => 'users_id_owner',
            'value'   => (int) ($doc->fields['users_id_owner'] ?? 0),
            'right'   => 'all',
            'display' => false,
            'width'   => '100%',
        ]);
    }
    $widgets['content'] = Html::textarea([
        'name'            => 'content',
        'value'           => (string) ($isNew ? '' : ($doc->fields['content'] ?? '')),
        'editor_id'       => 'codexplus-doc-content',
        'enable_richtext' => true,
        'enable_images'   => false,
        'rows'            => 20,
        'display'         => false,
    ]);
}

// Nomes legíveis para a visão (e para o cabeçalho da edição).
$categoryNames = array_map(
    static fn ($cid) => Dropdown::getDropdownName(Category::getTable(), $cid),
    $categoryIds
);
$sectorNames = $isNew ? [] : array_map(
    static fn ($sid) => Dropdown::getDropdownName('glpi_plugin_codexplus_sectors', $sid),
    $doc->getSectorIds()
);

$editors = [];
if (!$isNew) {
    foreach ($DB->request(['FROM' => DocumentEditor::getTable(), 'WHERE' => [DocumentEditor::$items_id => $id]]) as $row) {
        $e = new DocumentEditor();
        $e->getFromDB((int) $row['id']);
        $editors[] = $e->getMemberName();
    }
}

$status = $isNew ? Document::STATUS_DRAFT : (string) $doc->fields['status'];

TemplateRenderer::getInstance()->display('@codexplus/document-form.html.twig', [
    'glpi_root'   => $CFG_GLPI['root_doc'],
    'self'        => $self,
    'is_new'      => $isNew,
    'id'          => $id,
    'can_edit'    => $canEdit,
    'can_manage'  => $canManage,
    'code'        => $isNew ? '' : $doc->getCode(),
    'doctype'     => $isNew ? '' : (string) $doc->fields['doctype'],
    'doctype_label' => $isNew ? '' : (DocumentMeta::getDoctypes()[$doc->fields['doctype']] ?? $doc->fields['doctype']),
    'status'      => $status,
    'status_label' => Document::getStatuses()[$status] ?? $status,
    'name'        => $isNew ? '' : (string) $doc->fields['name'],
    'client_name' => $isNew ? '' : (string) ($doc->fields['client_name'] ?? ''),
    'content_html' => $isNew ? '' : RichText::getEnhancedHtml((string) ($doc->fields['content'] ?? '')),
    'owner_name'  => $isNew ? '' : ((int) $doc->fields['users_id_owner'] > 0 ? getUserName((int) $doc->fields['users_id_owner']) : ''),
    'author_name' => $isNew ? '' : getUserName((int) $doc->fields['users_id']),
    'category_names' => $categoryNames,
    'sector_names'   => $sectorNames,
    'editors'        => $editors,
    'validation_comment' => $isNew ? '' : (string) ($doc->fields['validation_comment'] ?? ''),
    'validator_name'     => $isNew || (int) ($doc->fields['users_id_validator'] ?? 0) <= 0 ? '' : getUserName((int) $doc->fields['users_id_validator']),
    'date_validated'     => $isNew ? '' : (string) ($doc->fields['date_validated'] ?? ''),
    'widgets'     => $widgets,
    'can_submit'   => !$isNew && $doc->canSubmit(),
    'can_validate' => !$isNew && $doc->canValidate(),
    'is_blocked_contributor' => !$isNew
        && $status === Document::STATUS_VALIDATION
        && $doc->isValidator()
        && $doc->isContributor()
        && !Session::haveRight(Rights::NAME, Rights::VIEWALL),
    'can_obsolete' => !$isNew && $doc->canMarkObsolete(),
    'csrf_token'   => Session::getNewCSRFToken(),
]);

Html::footer();
