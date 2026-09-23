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
 * Desde a R3b2-a, alvos de leitura pela coluna "Permissões" (endpoint
 * ajax/document.targets.php); desde a R3b2-b, editores na mesma coluna e a
 * criação já com responsável, auditor, revisor, janela e permissões. Fora
 * ainda (ROADMAP, R3b3 a R3b4): leitura com PDF e trocar o "Novo documento"
 * antigo. Desde a R3b3-1, imagem colada e anexos (Document_Item nativo).
 *
 * Roda em escopo de função (achado 9): `global` explícito.
 * CSRF: o núcleo valida o POST sozinho (achado 15); o template só inclui o
 * token.
 */

use Glpi\Application\View\TemplateRenderer;
use Glpi\RichText\RichText;
use GlpiPlugin\Codexplus\Branding;
use GlpiPlugin\Codexplus\Category;
use GlpiPlugin\Codexplus\Diagram;
use GlpiPlugin\Codexplus\DocumentContributor;
use GlpiPlugin\Codexplus\Document;
use GlpiPlugin\Codexplus\Document_Category;
use GlpiPlugin\Codexplus\DocumentEditor;
use GlpiPlugin\Codexplus\DocumentMeta;
use GlpiPlugin\Codexplus\DocumentVersion;
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

/**
 * R3b3-1: campos do upload nativo (imagem colada = _content, anexo =
 * _filename, cada um com _tag_ e _prefix_). Vão como vieram para o
 * Document::addFiles, que valida e move os arquivos da pasta temporária.
 */
$postedFiles = static function (): array {
    $out = [];
    foreach (['content', 'filename'] as $campo) {
        foreach (['_', '_tag_', '_prefix_'] as $pre) {
            if (isset($_POST[$pre . $campo]) && is_array($_POST[$pre . $campo])) {
                $out[$pre . $campo] = array_map('strval', $_POST[$pre . $campo]);
            }
        }
    }
    return $out;
};

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
        '_categories' => $postedCategories(),
    ] + $postedFiles();
    // Cliente só existe em proposta (o campo some da tela nos outros tipos;
    // aqui garante que valor esquecido nele não seja gravado).
    if ($input['doctype'] === 'PRP') {
        $input['client_name'] = (string) ($_POST['client_name'] ?? '');
    }
    // R3b2-b: responsável, auditor, revisor e janela já na criação. Quem cria
    // gere o documento (é gestor do setor de todas as categorias, ou Ver
    // todos); Document::prepareInputForAdd confere auditor e janela.
    foreach (['users_id_owner', 'users_id_auditor', 'users_id_reviewer', 'review_start', 'review_end'] as $f) {
        if (isset($_POST[$f])) {
            $input[$f] = (string) $_POST[$f];
        }
    }
    if (!$doc->can(-1, CREATE, $input)) {
        Session::addMessageAfterRedirect(
            __('Sem direito de criar documento nestas categorias (é preciso ser gestor do setor de cada uma).', 'codexplus'),
            false,
            ERROR
        );
        Html::back();
    }
    $newId = $doc->add($input);
    if ($newId && $input['doctype'] === 'DIA') {
        // Etapa 9: o DIA nasce com o diagrama inicial (só o topo).
        Diagram::save((int) $newId, Diagram::starter());
    }
    if ($newId) {
        Session::addMessageAfterRedirect(__('Documento criado como rascunho.', 'codexplus'));

        // R3b2-b: leitores e editores escolhidos antes de o documento existir
        // chegam como "tipo:id" (_cxn_perm[]) e são gravados agora, pelas
        // mesmas classes e checagens do endpoint da coluna Permissões. Se
        // algum falhar, o rascunho fica criado e a mensagem diz qual.
        $falhas = [];
        foreach (array_unique((array) ($_POST['_cxn_perm'] ?? [])) as $par) {
            [$tipo, $alvo] = array_pad(explode(':', (string) $par, 2), 2, '0');
            $linha = Document::permRow($tipo, (int) $newId, (int) $alvo);
            if ($linha === null || (int) $alvo <= 0) {
                continue;
            }
            $classe = Document::PERM_TYPES[$tipo][0];
            $rel    = new $classe();
            // Busca de repetido ANTES do can(): ele recebe o input por
            // referência e acrescenta campos (ver ajax/document.targets.php).
            if (
                countElementsInTable($classe::getTable(), $linha) > 0
                || ($rel->can(-1, CREATE, $linha) && $rel->add($linha))
            ) {
                continue;
            }
            $falhas[] = str_starts_with($tipo, 'editor_')
                ? ($tipo === 'editor_user' ? getUserName((int) $alvo) : Dropdown::getDropdownName('glpi_groups', (int) $alvo))
                : ($tipo === 'user' ? getUserName((int) $alvo)
                    : Dropdown::getDropdownName($tipo === 'group' ? 'glpi_groups' : 'glpi_profiles', (int) $alvo));
        }
        if ($falhas) {
            Session::addMessageAfterRedirect(
                sprintf(__('Rascunho criado, mas não foi possível dar acesso a: %s. Tente de novo pela coluna Permissões.', 'codexplus'), implode(', ', $falhas)),
                false,
                WARNING
            );
        }
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
// POST — duplicar (R3b2-b, parte 2)
// Documento NOVO, com código novo, a partir deste: título, categorias,
// corpo (ou diagrama) e cliente, em rascunho. Copia o que está GRAVADO — numa
// revisão em andamento, a revisão. Não copia papéis, leitores, editores,
// auditor, revisor nem janela: o novo documento nasce como qualquer outro, e
// quem duplica escolhe tudo isso na página dele.
// Quem pode: quem lê o documento e pode criar em TODAS as categorias dele (a
// mesma regra da criação: Document::canCreateIn).
// -------------------------------------------------------------------------
if ($id > 0 && isset($_POST['duplicate'])) {
    $cats = Document_Category::getCategoryIds($id);
    if (!Document::canCreateIn($cats)) {
        Session::addMessageAfterRedirect(
            __('Para duplicar, é preciso poder criar documento em todas as categorias deste (ser gestor do setor de cada uma).', 'codexplus'),
            false,
            ERROR
        );
        Html::redirect($self . '?id=' . $id);
    }
    $copia = [
        'name'           => sprintf(__('%s (cópia)', 'codexplus'), (string) $doc->fields['name']),
        'doctype'        => (string) $doc->fields['doctype'],
        'content'        => (string) ($doc->fields['content'] ?? ''),
        'users_id_owner' => (int) Session::getLoginUserID(),
        '_categories'    => $cats,
    ];
    if ($copia['doctype'] === 'PRP') {
        $copia['client_name'] = (string) ($doc->fields['client_name'] ?? '');
    }
    $novo  = new Document();
    $newId = $novo->add($copia);
    if (!$newId) {
        Html::redirect($self . '?id=' . $id);
    }
    // R3b3-1: a cópia aponta para os MESMOS arquivos (imagens coladas e
    // anexos). Sem a ligação, quem lê a cópia não veria as imagens: o GLPI
    // só entrega o arquivo ligado ao item que está sendo lido.
    foreach ($DB->request([
        'SELECT' => ['documents_id'],
        'FROM'   => 'glpi_documents_items',
        'WHERE'  => ['itemtype' => Document::class, 'items_id' => $id],
    ]) as $row) {
        (new Document_Item())->add([
            'documents_id' => (int) $row['documents_id'],
            'itemtype'     => Document::class,
            'items_id'     => (int) $newId,
        ]);
    }
    // O link das imagens coladas leva o documento de origem (items_id): na
    // cópia, passa a levar o da cópia, senão o leitor dela não as veria.
    $corpo = (string) $copia['content'];
    $novoCorpo = preg_replace(
        '/(itemtype=GlpiPlugin%5CCodexplus%5CDocument(?:&amp;|&)items_id=)' . $id . '(?!\d)/',
        '${1}' . (int) $newId,
        $corpo
    );
    if ($novoCorpo !== null && $novoCorpo !== $corpo) {
        $DB->update(Document::getTable(), ['content' => $novoCorpo], ['id' => (int) $newId]);
    }
    if ($copia['doctype'] === 'DIA') {
        $d = Diagram::load($id);
        Diagram::save((int) $newId, $d['data'] ?? Diagram::starter());
    }
    Session::addMessageAfterRedirect(sprintf(
        __('Cópia criada como rascunho, com código novo (%s). Escolha auditor, revisor e permissões antes de enviar.', 'codexplus'),
        $novo->getCode()
    ));
    Html::redirect($self . '?id=' . $newId);
}

// -------------------------------------------------------------------------
// POST — tirar um anexo (R3b3-1): quem edita, só em rascunho (can UPDATE).
// Desfaz a ligação; o arquivo continua no GLPI (Gestão > Documentos), como
// na base nativa.
// -------------------------------------------------------------------------
if ($id > 0 && isset($_POST['del_attachment'])) {
    $di = new Document_Item();
    if (
        !$doc->can($id, UPDATE)
        || !$di->getFromDB((int) $_POST['del_attachment'])
        || $di->fields['itemtype'] !== Document::class
        || (int) $di->fields['items_id'] !== $id
    ) {
        Session::addMessageAfterRedirect(__('Sem direito de tirar este anexo.', 'codexplus'), false, ERROR);
    } elseif ($di->delete(['id' => $di->getID()], true)) {
        DocumentContributor::record($id, (int) $doc->fields['revision'], (int) Session::getLoginUserID());
        Session::addMessageAfterRedirect(__('Anexo retirado do documento.', 'codexplus'));
    }
    Html::redirect($self . '?id=' . $id);
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
    ] + $postedFiles();
    if ($doc->fields['doctype'] === 'PRP') {
        $data['client_name'] = (string) ($_POST['client_name'] ?? '');
    }

    $ok = true;
    if ($doc->canManage()) {
        if (isset($_POST['users_id_owner'])) {
            $data['users_id_owner'] = (int) $_POST['users_id_owner'];
        }
        // R3d: auditor, revisor e janela. Conferidos em Document (auditor do
        // setor, só em rascunho; janela com as duas datas).
        foreach (['users_id_auditor', 'users_id_reviewer', 'review_start', 'review_end'] as $f) {
            if (isset($_POST[$f])) {
                $data[$f] = (string) $_POST[$f];
            }
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

    // Etapa 9: o diagrama vem em _diagram (JSON), validado no servidor.
    // A permissão já foi conferida acima (can UPDATE = rascunho + editor ou
    // gestor). Mudou o desenho: conta como alteração do documento (quem
    // editou não valida) e atualiza a data.
    if ($doc->fields['doctype'] === 'DIA' && isset($_POST['_diagram'])) {
        $diagram = Diagram::validate(json_decode((string) $_POST['_diagram'], true));
        if ($diagram === null) {
            Session::addMessageAfterRedirect(__('Diagrama não gravado: conteúdo inválido.', 'codexplus'), false, ERROR);
            $ok = false;
        } elseif (Diagram::save($id, $diagram)) {
            DocumentContributor::record($id, (int) $doc->fields['revision'], (int) Session::getLoginUserID());
            $DB->update(Document::getTable(), ['date_mod' => date('Y-m-d H:i:s')], ['id' => $id]);
        }
    }

    if ($doc->update($data) && $ok) {
        Session::addMessageAfterRedirect(__('Documento salvo.', 'codexplus'));
    }
    Html::redirect($self . '?id=' . $id);
}

// -------------------------------------------------------------------------
// POST — revisão periódica fora de rascunho (R3d): revisor e janela mudam em
// qualquer status, por quem gere o documento. Só esses campos.
// -------------------------------------------------------------------------
if ($id > 0 && isset($_POST['update_review'])) {
    if (!$doc->canManage()) {
        Session::addMessageAfterRedirect(__('Só quem gere o documento muda revisor e janela de revisão.', 'codexplus'), false, ERROR);
        Html::redirect($self . '?id=' . $id);
    }
    $data = ['id' => $id];
    foreach (['users_id_reviewer', 'review_start', 'review_end'] as $f) {
        if (isset($_POST[$f])) {
            $data[$f] = (string) $_POST[$f];
        }
    }
    if ($doc->update($data)) {
        Session::addMessageAfterRedirect(__('Revisão periódica salva.', 'codexplus'));
    }
    Html::redirect($self . '?id=' . $id);
}

// -------------------------------------------------------------------------
// POST — fluxo (Enviar, Aprovar, Validar, Devolver, Obsoleto)
// -------------------------------------------------------------------------
if ($id > 0) {
    $flow = null;
    if (isset($_POST['submit_validation'])) {
        $flow = static fn () => $doc->submit((string) ($_POST['revision_summary'] ?? ''));
        $okMsg = __('Enviado: aguardando a aprovação do gestor do setor.', 'codexplus');
    } elseif (isset($_POST['manager_approve'])) {
        $flow = static fn () => $doc->managerApprove();
        $okMsg = __('Aprovado pelo gestor: aguardando o auditor responsável.', 'codexplus');
    } elseif (isset($_POST['approve'])) {
        $flow = static fn () => $doc->approve();
        $okMsg = __('Documento validado e publicado.', 'codexplus');
    } elseif (isset($_POST['reject'])) {
        $flow = static fn () => $doc->reject((string) ($_POST['validation_comment'] ?? ''));
        $okMsg = __('Documento devolvido para rascunho.', 'codexplus');
    } elseif (isset($_POST['obsolete'])) {
        $flow = static fn () => $doc->markObsolete();
        $okMsg = __('Documento marcado como obsoleto.', 'codexplus');
    } elseif (isset($_POST['open_revision'])) {
        // R6-a
        $flow = static fn () => $doc->openRevision();
        $okMsg = __('Revisão aberta: o documento voltou a rascunho. Os leitores continuam vendo a versão publicada.', 'codexplus');
    } elseif (isset($_POST['cancel_revision'])) {
        $flow = static fn () => $doc->cancelRevision();
        $okMsg = __('Revisão cancelada: o documento voltou à versão publicada.', 'codexplus');
    } elseif (isset($_POST['confirm_nochange'])) {
        $flow = static fn () => $doc->confirmNoChange();
        $okMsg = __('Revisado sem alteração: a janela de revisão foi renovada.', 'codexplus');
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

// R3b3-2: ?view=1 mostra a visão de leitura (com Exportar PDF) mesmo para
// quem pode editar — é como o autor confere o documento antes de enviar.
$canEditDoc = $canEdit;
if (!$isNew && isset($_GET['view'])) {
    $canEdit = false;
}

// Etapa 9: documento DIA desenha o organograma no lugar do corpo de texto.
$isDiagram   = !$isNew && $doc->fields['doctype'] === 'DIA';
$diagramJson = '';
if ($isDiagram) {
    $diagram     = Diagram::load($id) ?? ['data' => Diagram::starter()];
    $diagramJson = json_encode(
        $diagram['data'],
        JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE // achado 14
    );
}

// R6-a: durante a revisão, quem só lê vê a VERSÃO PUBLICADA anterior (tela
// e PDF), com o aviso "Em atualização". Quem tem papel vê a revisão em
// andamento e pode abrir a publicada por ?version=N.
$fmtCode = static fn (string $t, int $seq, int $rev) => sprintf('%s%04d:%02d', $t, $seq, $rev);
$inRevision = !$isNew && $doc->isInRevision();
$version = ['on' => false, 'reader' => false, 'rev' => -1, 'code' => '', 'link' => '', 'validator' => '', 'date' => ''];
$revinfo = ['on' => false, 'prev_code' => '', 'link' => ''];
$shown   = [];
if ($inRevision) {
    $prevRev  = (int) $doc->fields['revision'] - 1;
    $prevCode = $fmtCode((string) $doc->fields['doctype'], (int) $doc->fields['sequence'], $prevRev);
    $plain    = !$doc->hasRole() && !Session::haveRight(Rights::NAME, Rights::VIEWALL);
    $want     = isset($_GET['version']) && (int) $_GET['version'] === $prevRev;
    $vRow     = ($plain || $want) ? DocumentVersion::get($id, $prevRev) : null;
    if ($vRow !== null) {
        $version = [
            'on'        => true,
            'reader'    => $plain,
            'rev'       => $prevRev,
            'code'      => $prevCode,
            'link'      => $self . '?id=' . $id,
            'validator' => (int) $vRow['users_id'] > 0 ? getUserName((int) $vRow['users_id']) : '',
            'date'      => (string) ($vRow['date_published'] ?? ''),
        ];
        $canEdit = false;
        $shown = ['name' => (string) $vRow['name'], 'content' => (string) $vRow['content']];
        if ($isDiagram && ($d = DocumentVersion::diagramOf($vRow)) !== null) {
            $diagramJson = json_encode($d, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE);
        }
    } elseif (!$plain) {
        $revinfo = ['on' => true, 'prev_code' => $prevCode, 'link' => $self . '?id=' . $id . '&version=' . $prevRev];
    }
}

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
        $preset = (string) ($_GET['doctype'] ?? 'POP');
        $widgets['doctype'] = Dropdown::showFromArray('doctype', DocumentMeta::getDoctypes(), [
            'display' => false,
            'value'   => array_key_exists($preset, DocumentMeta::getDoctypes()) ? $preset : 'POP',
            'width'   => '100%',
        ]);
    }
    if ($canManage || $isNew) {
        // Na criação, o responsável começa sendo quem cria (troca na hora).
        $widgets['owner'] = User::dropdown([
            'name'    => 'users_id_owner',
            'value'   => $isNew ? (int) Session::getLoginUserID() : (int) ($doc->fields['users_id_owner'] ?? 0),
            'right'   => 'all',
            'display' => false,
            'width'   => '100%',
        ]);
    }
    $widgets['content'] = $isDiagram ? '' : Html::textarea([
        'name'            => 'content',
        'value'           => (string) ($isNew ? '' : ($doc->fields['content'] ?? '')),
        'editor_id'       => 'codexplus-doc-content',
        'enable_richtext' => true,
        // R3b3-1: imagem colada no corpo e área de anexos (arrastar ou
        // escolher arquivo). Gravados ao Salvar, por Document::addFiles.
        'enable_images'     => true,
        'enable_fileupload' => true,
        'rows'              => 20,
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

// R3b2-a: coluna "Permissões" com os alvos de leitura. Quem gere o documento
// muda (em qualquer status: é acesso, não conteúdo); quem tem papel nele ou
// Ver todos só vê a lista. O leitor comum não vê quem mais lê.
// R3b2-b: editores na mesma coluna, e a coluna já na criação ("pendente":
// a lista fica no formulário e é gravada logo depois do Criar rascunho).
$perm = [
    'show'       => false,
    'pending'    => false,
    'can_manage' => false,
    'targets'    => [],
    'editors'    => [],
    'widgets'    => ['group' => '', 'profile' => '', 'user' => '', 'editor_user' => '', 'editor_group' => ''],
    'url'        => $CFG_GLPI['root_doc'] . '/plugins/codexplus/ajax/document.targets.php',
];
// Na criação, gerir = Atualizar (quem cria já é gestor do setor de todas as
// categorias, ou Ver todos: Document::canCreateIn). Sem Atualizar, a coluna
// não aparece — as ligações seriam recusadas depois de criar.
$manageNew = $isNew && Document::canUpdate();
if ($manageNew || (!$isNew && ($canManage || $doc->hasRole() || Session::haveRight(Rights::NAME, Rights::VIEWALL)))) {
    $perm['show']       = true;
    $perm['pending']    = $isNew;
    $perm['can_manage'] = $manageNew || $canManage;
    $perm['targets']    = $isNew ? [] : Document::listTargets($id);
    $perm['editors']    = $isNew ? [] : Document::listEditors($id);
    if ($perm['can_manage']) {
        // Nomes com "_cxt_": o Salvar do formulário não os lê. Os três vão
        // pelo endpoint, que confere de novo quem pode (TargetRelation).
        $perm['widgets']['group'] = Group::dropdown([
            'name'    => '_cxt_group',
            'display' => false,
            'width'   => '100%',
        ]);
        $perm['widgets']['profile'] = Profile::dropdown([
            'name'    => '_cxt_profile',
            'display' => false,
            'width'   => '100%',
        ]);
        $perm['widgets']['user'] = User::dropdown([
            'name'    => '_cxt_user',
            'right'   => 'all',
            'display' => false,
            'width'   => '100%',
        ]);
        $perm['widgets']['editor_user'] = User::dropdown([
            'name'    => '_cxt_editor_user',
            'right'   => 'all',
            'display' => false,
            'width'   => '100%',
        ]);
        $perm['widgets']['editor_group'] = Group::dropdown([
            'name'    => '_cxt_editor_group',
            'display' => false,
            'width'   => '100%',
        ]);
    }
}

$status = $isNew ? Document::STATUS_DRAFT : (string) $doc->fields['status'];

// R3d: auditor responsável, revisor e janela de revisão. O auditor muda só em
// rascunho e é escolhido entre os auditores do setor; revisor e janela mudam
// em qualquer status. Quem não gere o documento só vê.
$fmtDate = static fn ($d) => empty($d) ? '' : substr((string) $d, 0, 10);
$review = [
    'show'             => true,
    'is_new'           => $isNew,
    'auditors_url'     => $CFG_GLPI['root_doc'] . '/plugins/codexplus/ajax/document.auditors.php',
    'can_auditor'      => false,
    'can_review'       => false,
    'auditor_widget'   => '',
    'reviewer_widget'  => '',
    'auditor_name'     => '',
    'reviewer_name'    => '',
    'start'            => '',
    'end'              => '',
    'no_auditors'      => false,
    'validity_months'  => 0,
];
$pending = ['label' => '', 'names' => []];
$missingRight = '';
if ($isNew) {
    // R3b2-b: quem cria gere o documento. O auditor depende do setor, que
    // depende das categorias: a lista nasce vazia e o JS a recarrega a cada
    // troca de categoria (ajax/document.auditors.php).
    $review['can_auditor']    = true;
    $review['can_review']     = true;
    $review['auditor_widget'] = Dropdown::showFromArray('users_id_auditor', [0 => Dropdown::EMPTY_VALUE], [
        'value'   => 0,
        'display' => false,
        'width'   => '100%',
    ]);
    $review['reviewer_widget'] = User::dropdown([
        'name'    => 'users_id_reviewer',
        'value'   => 0,
        'right'   => 'all',
        'display' => false,
        'width'   => '100%',
    ]);
}
if (!$isNew) {
    $auditorId  = (int) ($doc->fields['users_id_auditor'] ?? 0);
    $reviewerId = (int) ($doc->fields['users_id_reviewer'] ?? 0);
    $review['auditor_name']    = $auditorId > 0 ? getUserName($auditorId) : '';
    $review['reviewer_name']   = $reviewerId > 0 ? getUserName($reviewerId) : '';
    $review['start']           = $fmtDate($doc->fields['review_start'] ?? null);
    $review['end']             = $fmtDate($doc->fields['review_end'] ?? null);
    $review['validity_months'] = (int) ($doc->fields['validity_months'] ?? 0);
    $review['can_review']      = $canManage;
    $review['can_auditor']     = $canManage && $canEdit && $doc->fields['status'] === Document::STATUS_DRAFT;

    if ($review['can_auditor']) {
        $opcoes = [0 => Dropdown::EMPTY_VALUE];
        foreach (SectorMember::usersOfRole($doc->getSectorIds(), SectorMember::ROLE_VALIDATOR) as $uid) {
            $opcoes[$uid] = getUserName($uid);
        }
        // Auditor gravado que saiu do setor continua visível, para não sumir
        // em silêncio; o envio avisa que precisa trocar.
        if ($auditorId > 0 && !isset($opcoes[$auditorId])) {
            $opcoes[$auditorId] = getUserName($auditorId) . ' ' . __('(não é mais auditor do setor)', 'codexplus');
        }
        $review['no_auditors']    = count($opcoes) === 1;
        $review['auditor_widget'] = Dropdown::showFromArray('users_id_auditor', $opcoes, [
            'value'   => $auditorId,
            'display' => false,
            'width'   => '100%',
        ]);
    }
    if ($review['can_review']) {
        $review['reviewer_widget'] = User::dropdown([
            'name'    => 'users_id_reviewer',
            'value'   => $reviewerId,
            'right'   => 'all',
            'display' => false,
            'width'   => '100%',
        ]);
    }

    // R3d-1: quem responde pela etapa mas não consegue agir fica sabendo o
    // porquê (antes o botão só não aparecia). Regra das duas camadas:
    // perfil (bit) + papel no plugin.
    $st0 = (string) $doc->fields['status'];
    if ($st0 === Document::STATUS_APPROVAL && $doc->isManager() && !$doc->canApprove()) {
        $missingRight = __('Você é gestor do setor deste documento, mas seu perfil não tem o direito Atualizar do Codex+. Peça a um administrador (Administração → Perfis → aba Codex+).', 'codexplus');
    } elseif ($st0 === Document::STATUS_VALIDATION && $doc->isAuditor() && !$doc->canValidate() && !$doc->isContributor()) {
        $missingRight = !$doc->isValidator()
            ? __('Você é o auditor responsável deste documento, mas não está mais entre os auditores do setor. Quem gere o documento precisa devolvê-lo e escolher outro auditor.', 'codexplus')
            : __('Você é o auditor responsável deste documento, mas seu perfil não tem o direito Validar do Codex+. Peça a um administrador (Administração → Perfis → aba Codex+).', 'codexplus');
    }

    // Aviso "aguardando …": quem responde pela etapa atual.
    $st = (string) $doc->fields['status'];
    if (in_array($st, Document::PENDING_STATUSES, true)) {
        $pending['label'] = $st === Document::STATUS_APPROVAL
            ? __('Aguardando a aprovação do gestor do setor', 'codexplus')
            : __('Aguardando a validação do auditor responsável', 'codexplus');
        $pending['names'] = array_map('getUserName', $doc->pendingWith());
    }
}

TemplateRenderer::getInstance()->display('@codexplus/document-form.html.twig', [
    'glpi_root'   => $CFG_GLPI['root_doc'],
    'self'        => $self,
    'is_new'      => $isNew,
    'id'          => $id,
    'can_edit'    => $canEdit,
    'can_manage'  => $canManage,
    'code'        => $isNew ? '' : ($version['on'] ? $version['code'] : $doc->getCode()),
    'doctype'     => $isNew ? '' : (string) $doc->fields['doctype'],
    'doctype_label' => $isNew ? '' : (DocumentMeta::getDoctypes()[$doc->fields['doctype']] ?? $doc->fields['doctype']),
    'status'      => $version['on'] ? Document::STATUS_PUBLISHED : $status,
    'status_label' => $version['on'] ? Document::getStatuses()[Document::STATUS_PUBLISHED] : (Document::getStatuses()[$status] ?? $status),
    'name'        => $isNew ? '' : ($shown['name'] ?? (string) $doc->fields['name']),
    'client_name' => $isNew ? '' : (string) ($doc->fields['client_name'] ?? ''),
    'content_html' => $isNew ? '' : RichText::getEnhancedHtml($shown['content'] ?? (string) ($doc->fields['content'] ?? '')),
    'owner_name'  => $isNew ? '' : ((int) $doc->fields['users_id_owner'] > 0 ? getUserName((int) $doc->fields['users_id_owner']) : ''),
    'author_name' => $isNew ? '' : getUserName((int) $doc->fields['users_id']),
    'category_names' => $categoryNames,
    'sector_names'   => $sectorNames,
    'editors'        => $editors,
    'validation_comment' => $isNew ? '' : (string) ($doc->fields['validation_comment'] ?? ''),
    'validator_name'     => $version['on'] ? $version['validator']
        : ($isNew || (int) ($doc->fields['users_id_validator'] ?? 0) <= 0 ? '' : getUserName((int) $doc->fields['users_id_validator'])),
    'date_validated'     => $version['on'] ? $version['date'] : ($isNew ? '' : (string) ($doc->fields['date_validated'] ?? '')),
    'widgets'     => $widgets,
    'perm'        => $perm,
    'review'      => $review,
    'pending'     => $pending,
    'missing_right' => $missingRight,
    'is_diagram'   => $isDiagram,
    'diagram_json' => $diagramJson,
    'can_submit'   => !$isNew && $doc->canSubmit(),
    'can_validate' => !$isNew && $doc->canValidate(),
    'can_approve'  => !$isNew && $doc->canApprove(),
    'can_reject'   => !$isNew && $doc->canReject(),
    'is_blocked_contributor' => !$isNew
        && $status === Document::STATUS_VALIDATION
        && $doc->isAuditor()
        && $doc->isContributor()
        && !Session::haveRight(Rights::NAME, Rights::VIEWALL),
    'can_obsolete' => !$isNew && $doc->canMarkObsolete(),
    // R3b2-b parte 2: duplicar = poder criar em todas as categorias dele.
    'can_duplicate' => !$isNew && !$version['on'] && Document::canCreateIn($categoryIds),
    // R3b3-1: anexos (fora as imagens coladas no corpo mostrado).
    'attachments'   => $isNew || $isDiagram ? [] : Document::listAttachments($id, (string) ($shown['content'] ?? $doc->fields['content'] ?? '')),
    // R6-a
    'version'      => $version,
    'revinfo'      => $revinfo,
    'in_revision'  => $inRevision,
    'revision_no'  => $isNew ? 0 : (int) $doc->fields['revision'],
    'can_open_revision'    => !$isNew && $doc->canOpenRevision(),
    'can_confirm_nochange' => !$isNew && $doc->canConfirmNoChange(),
    'can_cancel_revision'  => !$isNew && $doc->canCancelRevision(),
    'csrf_token'   => Session::getNewCSRFToken(),
    // R3b3-2: leitura com Exportar PDF (texto; o DIA tem o PDF do próprio motor).
    'can_edit_doc' => $canEditDoc,
    'view_link'    => $isNew ? '' : $self . '?id=' . $id . '&view=1',
    'edit_link'    => $isNew ? '' : $self . '?id=' . $id,
    'print_config' => $isNew || $isDiagram ? '{}' : Branding::printConfig([
        'title'          => $version['on'] ? (string) ($shown['name'] ?? '') : (string) $doc->fields['name'],
        'code'           => $version['on'] ? $version['code'] : $doc->getCode(),
        'revision'       => $version['on'] ? $version['rev'] : (int) $doc->fields['revision'],
        'client'         => (string) ($doc->fields['client_name'] ?? ''),
        'date_mod'       => (string) ($doc->fields['date_mod'] ?? ''),
        'doctype'        => (string) $doc->fields['doctype'],
        'owner'          => (int) $doc->fields['users_id_owner'] > 0
            ? getUserName((int) $doc->fields['users_id_owner']) : getUserName((int) $doc->fields['users_id']),
        'sector'         => implode(', ', $sectorNames),
        // A versão mostrada é a publicada? Então data de publicação; senão,
        // o aviso de que não é a versão vigente.
        'date_published' => $version['on'] ? $version['date']
            : ($status === Document::STATUS_PUBLISHED || $status === Document::STATUS_OBSOLETE
                ? (string) ($doc->fields['date_published'] ?? '') : ''),
        'draft'          => $version['on'] || $status === Document::STATUS_PUBLISHED ? ''
            : ($status === Document::STATUS_OBSOLETE ? __('OBSOLETO', 'codexplus')
                : sprintf(__('%s — não é a versão vigente', 'codexplus'), mb_strtoupper(Document::getStatuses()[$status] ?? $status))),
        'header_html'    => '',
        'footer_text'    => (string) ($doc->fields['footer_text'] ?? ''),
    ]),
]);

Html::footer();
