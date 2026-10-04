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
use GlpiPlugin\Codexplus\Brand;
use GlpiPlugin\Codexplus\Branding;
use GlpiPlugin\Codexplus\Category;
use GlpiPlugin\Codexplus\Diagram;
use GlpiPlugin\Codexplus\DocumentContributor;
use GlpiPlugin\Codexplus\DocumentApprover;
use GlpiPlugin\Codexplus\DocumentEditor;
use GlpiPlugin\Codexplus\DocumentHistory;
use GlpiPlugin\Codexplus\Document;
use GlpiPlugin\Codexplus\Document_Category;
use GlpiPlugin\Codexplus\DocumentMeta;
use GlpiPlugin\Codexplus\DocumentVersion;
use GlpiPlugin\Codexplus\Rights;
use GlpiPlugin\Codexplus\ScheduleStatus;
use GlpiPlugin\Codexplus\Sector;
use GlpiPlugin\Codexplus\Wiki;

include('../../../inc/includes.php');

global $DB, $CFG_GLPI;

if (!Document::canView()) {
    Html::displayRightError();
}

$self = $CFG_GLPI['root_doc'] . '/plugins/codexplus/front/document.form.php';
$id   = (int) ($_POST['id'] ?? $_GET['id'] ?? 0);
$doc  = new Document();

/**
 * P1 (Claudio, 26/09/2026): cada papel do documento é escolhido entre quem
 * tem o bit no perfil. Opções de lista: vazio + os usuários; o gravado que
 * perdeu o bit continua visível, marcado.
 */
$roleOptions = static function (array $users, int $atual, string $semBit): array {
    $opcoes = [0 => Dropdown::EMPTY_VALUE];
    foreach ($users as $uid) {
        $opcoes[$uid] = getUserName($uid);
    }
    if ($atual > 0 && !isset($opcoes[$atual])) {
        $opcoes[$atual] = getUserName($atual) . ' ' . $semBit;
    }
    return $opcoes;
};

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

/**
 * SC1 (Claudio, 27/09/2026): Setor / Categorias. As categorias ficam só as do
 * setor escolhido (o seletor já filtra; aqui é a conferência do servidor).
 */
$postedPlacement = static function () use ($postedCategories): array {
    $cats  = $postedCategories();
    $setor = (int) ($_POST['_sector'] ?? 0);
    if ($setor <= 0 || !$cats) {
        return $cats;
    }
    $mapa  = Category::sectorsOf($cats);
    $ficam = array_values(array_filter($cats, static fn ($c) => ($mapa[$c] ?? 0) === $setor));
    if (count($ficam) < count($cats)) {
        Session::addMessageAfterRedirect(
            __('Categorias de outro setor foram tiradas: o documento fica num setor só.', 'codexplus'),
            false,
            WARNING
        );
    }
    return $ficam;
};

/**
 * Bloco T1: cliente vinculado (Laudo e Documentação Técnica). O tipo do
 * vínculo vem num campo oculto; Document::normalizeClient confere tudo.
 */
$postedClient = static function (string $doctype): array {
    if (!DocumentMeta::linksClient($doctype) || !isset($_POST['client_items_id'])) {
        return [];
    }
    return [
        'client_itemtype' => (string) ($_POST['client_itemtype'] ?? ''),
        'client_items_id' => (int) $_POST['client_items_id'],
    ];
};

// -------------------------------------------------------------------------
// POST — criar
// -------------------------------------------------------------------------
if (isset($_POST['add'])) {
    $input = [
        'name'        => (string) ($_POST['name'] ?? ''),
        'doctype'     => (string) ($_POST['doctype'] ?? ''),
        'content'     => (string) ($_POST['content'] ?? ''),
        '_categories' => $postedPlacement(),
    ] + $postedFiles();
    // Cliente só existe em proposta (o campo some da tela nos outros tipos;
    // aqui garante que valor esquecido nele não seja gravado).
    if ($input['doctype'] === 'PRP') {
        $input['client_name'] = (string) ($_POST['client_name'] ?? '');
    }
    $input += $postedClient($input['doctype']);
    // M-2: marca escolhida (Document::prepareInputForAdd cai na padrão se
    // vier vazia ou inválida).
    $input['plugin_codexplus_brands_id'] = (int) ($_POST['plugin_codexplus_brands_id'] ?? 0);
    // Responsável, auditor, revisor e janela já na criação; conferidos em
    // Document::prepareInputForAdd (cada um com o bit dele no perfil).
    foreach (['users_id_owner', 'users_id_auditor', 'users_id_reviewer', 'users_id_editor', 'users_id_signers', 'review_start', 'review_end'] as $f) {
        if (isset($_POST[$f])) {
            // A-1 / A-2a: editores e aprovadores vêm em lista (Dropdown múltiplo).
            $input[$f] = in_array($f, ['users_id_editor', 'users_id_signers'], true) ? $_POST[$f] : (string) $_POST[$f];
        }
    }
    if (!$doc->can(-1, CREATE, $input)) {
        Session::addMessageAfterRedirect(
            __('Sem direito de criar documentos.', 'codexplus'),
            false,
            ERROR
        );
        Html::back();
    }
    $newId = $doc->add($input);
    if ($newId && $input['doctype'] === 'DIA') {
        // Etapa 9: o DIA nasce com o diagrama inicial do subtipo (D1).
        $sub = (string) ($_POST['_subtype'] ?? Diagram::SUBTYPE_ORG);
        Diagram::save((int) $newId, Diagram::starter(array_key_exists($sub, Diagram::getSubtypes()) ? $sub : Diagram::SUBTYPE_ORG));
    }
    if ($newId) {
        Session::addMessageAfterRedirect(__('Documento criado como rascunho.', 'codexplus'));

        // R3b2-b: leitores escolhidos antes de o documento existir
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
            $falhas[] = $tipo === 'user' ? getUserName((int) $alvo)
                : Dropdown::getDropdownName($tipo === 'group' ? 'glpi_groups' : 'glpi_profiles', (int) $alvo);
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

// Etapa 5a: busca de documentos para vincular (JSON, chamada pela tela).
if ($id > 0 && isset($_GET['link_search'])) {
    if (!\GlpiPlugin\Codexplus\DocumentLink::canManage($doc)) {
        return new \Symfony\Component\HttpFoundation\JsonResponse(['erro' => 'sem_acesso'], 403);
    }
    return new \Symfony\Component\HttpFoundation\JsonResponse([
        'itens' => \GlpiPlugin\Codexplus\DocumentLink::candidates($doc, (string) ($_GET['q'] ?? ''), 15, !empty($_GET['all'])),
    ]);
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
            __('Sem direito de criar documentos.', 'codexplus'),
            false,
            ERROR
        );
        Html::redirect($self . '?id=' . $id);
    }
    // T3: "Duplicar como…" — o tipo da cópia pode ser outro (DIA fica fora).
    $origem  = (string) $doc->fields['doctype'];
    $destino = DocumentMeta::duplicateType($origem, (string) ($_POST['duplicate_type'] ?? $origem));
    $copia = [
        // Mesmo tipo: "(cópia)" no título. Outro tipo: é o documento
        // "convertido", o título fica igual (o código já é outro).
        'name'           => $destino === $origem
            ? sprintf(__('%s (cópia)', 'codexplus'), (string) $doc->fields['name'])
            : (string) $doc->fields['name'],
        'doctype'        => $destino,
        'content'        => (string) ($doc->fields['content'] ?? ''),
        // Responsável = quem duplica, se tiver Ler (P3); senão vazio.
        'users_id_owner' => in_array((int) Session::getLoginUserID(), Rights::approverUsers((int) $doc->fields['entities_id']), true)
            ? (int) Session::getLoginUserID() : 0,
        '_categories'    => $cats,
        // M-2: a cópia sai com a mesma marca.
        'plugin_codexplus_brands_id' => (int) ($doc->fields['plugin_codexplus_brands_id'] ?? 0),
    ];
    $leva = DocumentMeta::clientCarry($origem, $destino);
    if ($leva === 'text' || $leva === 'name') {
        $copia['client_name'] = (string) ($doc->fields['client_name'] ?? '');
    }
    if ($leva === 'link') {
        $copia['client_itemtype'] = (string) ($doc->fields['client_itemtype'] ?? '');
        $copia['client_items_id'] = (int) ($doc->fields['client_items_id'] ?? 0);
    }
    $clienteFicou = $leva === '' && (
        trim((string) ($doc->fields['client_name'] ?? '')) !== ''
        || (int) ($doc->fields['client_items_id'] ?? 0) > 0
    );
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
    if ($destino === $origem) {
        Session::addMessageAfterRedirect(sprintf(
            __('Cópia criada como rascunho, com código novo (%s). Escolha responsável, auditor, revisor e leitores antes de enviar.', 'codexplus'),
            $novo->getCode()
        ));
    } else {
        Session::addMessageAfterRedirect(sprintf(
            __('%1$s criado como rascunho a partir de %2$s, com o fluxo e a validade do novo tipo. O original não mudou: mande-o para a lixeira se não for mais usar. Escolha responsável, auditor, revisor e leitores antes de enviar.', 'codexplus'),
            $novo->getCode(),
            $doc->getCode()
        ));
    }
    if ($clienteFicou) {
        Session::addMessageAfterRedirect(
            __('O cliente não foi levado: o novo tipo não tem cliente, ou pede o vínculo com um usuário ou entidade do GLPI (escolha na página da cópia).', 'codexplus'),
            false,
            WARNING
        );
    }
    Html::redirect($self . '?id=' . $newId);
}

// -------------------------------------------------------------------------
// POST — excluir (R5): vai para a lixeira (is_deleted); restaurar é na
// Biblioteca, filtro Lixeira. Quem pode: Document::canDeleteItem.
// -------------------------------------------------------------------------
if ($id > 0 && isset($_POST['delete_doc'])) {
    if (!$doc->canDeleteItem()) {
        Session::addMessageAfterRedirect(__('Sem direito de excluir este documento.', 'codexplus'), false, ERROR);
        Html::redirect($self . '?id=' . $id);
    }
    $codigo = $doc->getCode();
    if ($doc->delete(['id' => $id])) {
        Session::addMessageAfterRedirect(sprintf(__('%s foi para a lixeira. Dá para restaurar na Biblioteca, filtro Lixeira.', 'codexplus'), $codigo));
    }
    Html::redirect($CFG_GLPI['root_doc'] . '/plugins/codexplus/front/library.php');
}

// -------------------------------------------------------------------------
// POST — salvar como modelo (M1, Claudio 26/09/2026): o corpo GRAVADO vira um
// modelo novo do mesmo tipo, para quem tem "Gerenciar modelos". MO-2: imagem,
// print anotado, planta e topologia viram marcadores ("Imagem aqui"...), por
// Template::toPlaceholders; planilha vai inteira.
// -------------------------------------------------------------------------
if ($id > 0 && isset($_POST['save_template'])) {
    if (!Session::haveRight(Rights::NAME, Rights::TEMPLATES) || $doc->fields['doctype'] === 'DIA') {
        Session::addMessageAfterRedirect(__('Sem direito de criar modelos.', 'codexplus'), false, ERROR);
        Html::redirect($self . '?id=' . $id);
    }
    $nome   = trim((string) ($_POST['tpl_name'] ?? '')) ?: (string) $doc->fields['name'];
    $corpo  = (string) ($doc->fields['content'] ?? '');
    $antes  = \GlpiPlugin\Codexplus\Template::countPlaceholders($corpo);
    $tpl    = new \GlpiPlugin\Codexplus\Template();
    if ($tpl->add(['name' => $nome, 'doctype' => (string) $doc->fields['doctype'], 'content' => $corpo, 'is_default' => 0])) {
        $marcas = \GlpiPlugin\Codexplus\Template::countPlaceholders((string) ($tpl->fields['content'] ?? '')) - $antes;
        Session::addMessageAfterRedirect(sprintf(
            __('Modelo "%s" criado. Ele aparece no campo Modelo da criação e na tela Modelos.', 'codexplus'),
            $nome
        ) . ($marcas > 0 ? ' ' . sprintf(
            _n(
                '%d imagem ou quadro virou marcador ("Imagem aqui", "Planta aqui"...), para quem usar o modelo colocar o seu.',
                '%d imagens ou quadros viraram marcadores ("Imagem aqui", "Planta aqui"...), para quem usar o modelo colocar os seus.',
                $marcas,
                'codexplus'
            ),
            $marcas
        ) : ''));
    }
    Html::redirect($self . '?id=' . $id);
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
    $data += $postedClient((string) $doc->fields['doctype']);
    // M-2: o campo só existe na tela com mais de uma marca; sem ele, nada muda.
    if (isset($_POST['plugin_codexplus_brands_id'])) {
        $data['plugin_codexplus_brands_id'] = (int) $_POST['plugin_codexplus_brands_id'];
    }

    $ok = true;
    if ($doc->canManage()) {
        if (isset($_POST['users_id_owner'])) {
            $data['users_id_owner'] = (int) $_POST['users_id_owner'];
        }
        // R3d: auditor, revisor e janela. Conferidos em Document (auditor do
        // setor, só em rascunho; janela com as duas datas).
        foreach (['users_id_auditor', 'users_id_reviewer', 'users_id_editor', 'users_id_signers', 'review_start', 'review_end'] as $f) {
            if (isset($_POST[$f])) {
                $data[$f] = in_array($f, ['users_id_editor', 'users_id_signers'], true) ? $_POST[$f] : (string) $_POST[$f];
            }
        }

        // Categorias: diferença entre o que está gravado e o que veio. SC1:
        // só quando o seletor veio no formulário (_placement).
        $current = Document_Category::getCategoryIds($id);
        $wanted  = $postedPlacement();
        if (isset($_POST['_placement'])) {
            foreach (array_diff($wanted, $current) as $cid) {
                $link = new Document_Category();
                $row  = ['plugin_codexplus_documents_id' => $id, 'plugin_codexplus_categories_id' => $cid];
                if (!$link->can(-1, CREATE, $row) || !$link->add($row)) {
                    Session::addMessageAfterRedirect(
                        sprintf(__('Categoria "%s" não ligada.', 'codexplus'), Dropdown::getDropdownName(Category::getTable(), $cid)),
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
    // responsável/revisor/autor). Mudou o desenho: registra quem alterou e
    // atualiza a data.
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
    foreach (['users_id_reviewer', 'users_id_editor', 'review_start', 'review_end'] as $f) {
        if (isset($_POST[$f])) {
            $data[$f] = $f === 'users_id_editor' ? $_POST[$f] : (string) $_POST[$f];
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
        $okMsg = static fn () => $doc->signersPending()
            ? __('Enviado: aguardando os aprovadores.', 'codexplus')
            : __('Enviado: aguardando a aprovação do responsável.', 'codexplus');
    } elseif (isset($_POST['signer_approve'])) {
        // A-2a: aprovador do diagrama aprova.
        $flow = static fn () => $doc->sign();
        $okMsg = static fn () => $doc->signersPending()
            ? __('Aprovado. Aguardando os demais aprovadores.', 'codexplus')
            : __('Aprovado. Todos os aprovadores aprovaram: agora é a vez do responsável.', 'codexplus');
    } elseif (isset($_POST['manager_approve'])) {
        $flow = static fn () => $doc->managerApprove((string) ($_POST['approval_comment'] ?? ''));
        $okMsg = __('Aprovado: aguardando o auditor responsável.', 'codexplus');
    } elseif (isset($_POST['approve'])) {
        $flow = static fn () => $doc->approve((string) ($_POST['approval_comment'] ?? ''));
        $okMsg = __('Documento validado e publicado.', 'codexplus');
    } elseif (isset($_POST['reject'])) {
        $flow = static fn () => $doc->reject((string) ($_POST['validation_comment'] ?? ''));
        $okMsg = __('Documento devolvido para rascunho.', 'codexplus');
    } elseif (isset($_POST['publish_direct'])) {
        // P2: Proposta e Laudo, o responsável publica direto.
        $flow = static fn () => $doc->publishDirect((string) ($_POST['revision_summary'] ?? ''));
        $okMsg = __('Documento publicado.', 'codexplus');
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
    } elseif (isset($_POST['link_add'])) {
        // Etapa 5a
        $flow = static fn () => \GlpiPlugin\Codexplus\DocumentLink::add($doc, (int) ($_POST['child_id'] ?? 0));
        $okMsg = __('Documento vinculado.', 'codexplus');
    } elseif (isset($_POST['link_del'])) {
        $flow = static fn () => \GlpiPlugin\Codexplus\DocumentLink::remove($doc, (int) $_POST['link_del']);
        $okMsg = __('Documento desvinculado.', 'codexplus');
    } elseif (isset($_POST['link_order'])) {
        $flow = static fn () => \GlpiPlugin\Codexplus\DocumentLink::reorder($doc, array_map('intval', explode(',', (string) $_POST['link_order'])));
        $okMsg = __('Ordem dos documentos vinculados gravada.', 'codexplus');
    } elseif (isset($_POST['anon_generate'])) {
        // R7
        $flow = static fn () => $doc->anonGenerate();
        $okMsg = __('Link de acesso anônimo gerado. Quem tiver o link lê o documento sem entrar no GLPI.', 'codexplus');
    } elseif (isset($_POST['anon_revoke'])) {
        $flow = static fn () => $doc->anonRevoke();
        $okMsg = __('Link de acesso anônimo revogado.', 'codexplus');
    } elseif (isset($_POST['extend_revision'])) {
        // R6-b
        $flow = static fn () => $doc->extendRevision((string) ($_POST['revision_due'] ?? ''), (string) ($_POST['extend_reason'] ?? ''));
        $okMsg = __('Prazo da revisão atualizado.', 'codexplus');
    } elseif (isset($_POST['confirm_nochange'])) {
        $flow = static fn () => $doc->confirmNoChange();
        $okMsg = __('Revisado sem alteração: a janela de revisão foi renovada.', 'codexplus');
    }
    if ($flow !== null) {
        if ($flow()) {
            Session::addMessageAfterRedirect($okMsg instanceof \Closure ? $okMsg() : $okMsg);
            // MO-2: marcador do modelo que ficou sem preencher só avisa.
            if (isset($_POST['submit_validation']) || isset($_POST['publish_direct'])) {
                $doc->getFromDB($id);
                $falta = \GlpiPlugin\Codexplus\Template::countPlaceholders((string) ($doc->fields['content'] ?? ''));
                if ($falta > 0) {
                    Session::addMessageAfterRedirect(sprintf(
                        _n(
                            'Atenção: ficou %d marcador do modelo sem preencher ("Imagem aqui", "Planta aqui"...). Troque pela imagem ou apague.',
                            'Atenção: ficaram %d marcadores do modelo sem preencher ("Imagem aqui", "Planta aqui"...). Troque pela imagem ou apague.',
                            $falta,
                            'codexplus'
                        ),
                        $falta
                    ), false, WARNING);
                }
            }
        }
        Html::redirect($self . '?id=' . $id);
    }
}

// -------------------------------------------------------------------------
// GET — tela
// -------------------------------------------------------------------------
$isNew = $id <= 0;

if ($isNew && !Document::canCreate()) {
    Html::displayRightError();
}

$canEdit = $isNew || $doc->can($id, UPDATE);

// R3b3-2: ?view=1 mostra a visão de leitura (com Exportar PDF) mesmo para
// quem pode editar — é como o autor confere o documento antes de enviar.
$canEditDoc = $canEdit;
// Claudio, 25/09/2026: a janela "Visualizar e PDF" mostra SÓ o documento.
// Revisão periódica, Permissões e fluxo ficam fora dela (quem edita volta
// pelo botão Editar). Sem ?view=1 a página continua como era.
$preview = !$isNew && isset($_GET['view']);
if ($preview) {
    $canEdit = false;
}

// Etapa 9: documento DIA desenha o organograma no lugar do corpo de texto.
$isDiagram   = !$isNew && $doc->fields['doctype'] === 'DIA';
$diagramJson = '';
$diagramKind = Diagram::SUBTYPE_ORG;
if ($isDiagram) {
    $diagram     = Diagram::load($id) ?? ['data' => Diagram::starter()];
    $diagramKind = Diagram::subtypeOf($diagram['data']);
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
$version = ['on' => false, 'reader' => false, 'rev' => -1, 'code' => '', 'link' => '', 'validator' => '', 'date' => '', 'approvers' => []];
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
            // AP-1: quem aprovou ESTA versão (gravado na publicação).
            'approvers' => DocumentVersion::approversOf($vRow),
        ];
        $canEdit = false;
        $shown = ['name' => (string) $vRow['name'], 'content' => (string) $vRow['content'],
            // M-2: a versão publicada imprime com a marca com que foi publicada.
            'brand' => (int) ($vRow['plugin_codexplus_brands_id'] ?? 0)];
        if ($isDiagram && ($d = DocumentVersion::diagramOf($vRow)) !== null) {
            $diagramJson = json_encode($d, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE);
        }
    } elseif (!$plain) {
        $revinfo = ['on' => true, 'prev_code' => $prevCode, 'link' => $self . '?id=' . $id . '&version=' . $prevRev];
    }
}

// Q7b-4: situação das tarefas do cronograma com datas, na LEITURA do
// publicado (também da versão publicada durante uma revisão, e do obsoleto,
// só para ver). Quem pode marcar: Document::canMarkSchedule().
$schedule = ['on' => false, 'can_mark' => false, 'json' => '{}', 'hist' => '{}', 'url' => ''];
if ($isDiagram && !$canEdit && $diagramKind === Diagram::SUBTYPE_SCHEDULE) {
    $mostrado  = json_decode($diagramJson, true);
    $stDoc     = (string) $doc->fields['status'];
    $publicado = in_array($stDoc, [Document::STATUS_PUBLISHED, Document::STATUS_OBSOLETE], true) || $version['on'];
    if ($publicado && is_array($mostrado) && ($mostrado['mode'] ?? '') === Diagram::SCHEDULE_MODE_DATES) {
        $schedule = [
            'on'       => true,
            'can_mark' => $stDoc !== Document::STATUS_OBSOLETE && $doc->canMarkSchedule(),
            'json'     => json_encode(
                (object) ScheduleStatus::load($id),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE // achado 14
            ),
            // Q7c-2: todas as marcações, para o balão do selo da Situação.
            'hist'     => json_encode(
                (object) ScheduleStatus::history($id),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE // achado 14
            ),
            'url'      => $CFG_GLPI['root_doc'] . '/plugins/codexplus/ajax/schedule.status.php',
        ];
    }
}

// 5d: o pedido do PDF composto responde JSON — sem o cabeçalho da página.
if (!isset($_GET['composite'])) {
    Wiki::pageHeader(); // S1
}

// B2b: "+ Novo documento" da Biblioteca chega com ?cat= (categoria aberta).
$presetCat   = $isNew ? (int) ($_GET['cat'] ?? 0) : 0;
$categoryIds = $isNew
    ? (($presetCat > 0 && (new Category())->getFromDB($presetCat)) ? [$presetCat] : [])
    : Document_Category::getCategoryIds($id);
$canManage   = !$isNew && $doc->canManage();

// Campos de formulário gerados pelo GLPI (devolvem string com display=false).
$widgets = [];
$placement = null; // SC1: seletor Setor / Categorias (só na edição)
// Bloco T1: cliente para a tela. name = o que se mostra (vinculado pelo nome
// atual, ou o texto da proposta); itemtype e source_label = o campo de edição.
$client = [
    'name'         => $isNew ? '' : $doc->clientLabel(),
    'itemtype'     => '',
    'source_label' => '',
];
if ($canEdit) {
    $catCanChange = $isNew || ($canManage && $doc->fields['status'] === Document::STATUS_DRAFT);
    // SC1 (Claudio, 27/09/2026): Setor / Categorias na mesma linha. O setor
    // filtra as categorias; só o Super-Admin cria pelo "+"
    // (ajax/placement.php). Montado por public/js/codexplus-docform.js.
    $mapaSetor = Category::sectorsOf($categoryIds);
    $setoresDoc = array_values(array_unique(array_filter($mapaSetor)));
    $escolhidas = [];
    foreach ($categoryIds as $cid) {
        $escolhidas[] = [
            'id'     => $cid,
            'name'   => Dropdown::getDropdownName(Category::getTable(), $cid),
            'sector' => $mapaSetor[$cid] ?? 0,
        ];
    }
    $placement = [
        'can_change' => $catCanChange,
        'can_create' => Rights::isSuperAdmin(),
        'ajax'       => $CFG_GLPI['root_doc'] . '/plugins/codexplus/ajax/placement.php',
        'json'       => json_encode([
            'tree'     => Category::placementTree(),
            // Documento antigo em dois setores: vale o da 1ª categoria (aviso na tela).
            'sector'   => $setoresDoc[0] ?? 0,
            'selected' => $escolhidas,
        ], JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE),
        'sector_name' => ($setoresDoc[0] ?? 0) > 0 ? Dropdown::getDropdownName(Sector::getTable(), $setoresDoc[0]) : '',
    ];

    if ($isNew) {
        $preset = (string) ($_GET['doctype'] ?? 'POP');
        // D1: subtipo do diagrama, só com o tipo DIA (o JS mostra e esconde).
        $widgets['subtype'] = Dropdown::showFromArray('_subtype', Diagram::getSubtypes(), [
            'display' => false,
            'value'   => (string) ($_GET['subtype'] ?? Diagram::SUBTYPE_ORG),
            'width'   => '100%',
        ]);
        $widgets['doctype'] = Dropdown::showFromArray('doctype', DocumentMeta::getDoctypes(), [
            'display' => false,
            'value'   => array_key_exists($preset, DocumentMeta::getDoctypes()) ? $preset : 'POP',
            'width'   => '100%',
        ]);
    }
    if ($canManage || $isNew) {
        // P1: responsável = gestor do documento, entre quem tem Aprovar. Na
        // criação começa com quem cria, se tiver o direito.
        $ent     = $isNew ? (int) Session::getActiveEntity() : (int) $doc->fields['entities_id'];
        $aprov   = Rights::approverUsers($ent);
        $me      = (int) Session::getLoginUserID();
        $ownerId = $isNew ? (in_array($me, $aprov, true) ? $me : 0) : (int) ($doc->fields['users_id_owner'] ?? 0);
        $widgets['owner'] = Dropdown::showFromArray('users_id_owner', $roleOptions($aprov, $ownerId, __('(sem o direito Ler)', 'codexplus')), [
            'value'   => $ownerId,
            'display' => false,
            'width'   => '100%',
        ]);
    }
    // Bloco T1: Cliente vinculado. Na criação, sempre (aparece com LAU/DTC);
    // na edição, só nesses tipos. A lista segue a configuração da
    // instalação; documento já vinculado a outro tipo mantém o dele.
    if ($isNew || DocumentMeta::linksClient((string) $doc->fields['doctype'])) {
        $cType = $isNew ? '' : (string) ($doc->fields['client_itemtype'] ?? '');
        $cId   = $isNew ? 0 : (int) ($doc->fields['client_items_id'] ?? 0);
        if (!array_key_exists($cType, Branding::getClientSources()) || $cId <= 0) {
            $cType = Branding::clientSource();
        }
        $client['itemtype'] = $cType;
        $client['source_label'] = $cType === 'Entity' ? __('entidade do GLPI', 'codexplus') : __('usuário do GLPI', 'codexplus');
        $widgets['client'] = $cType === 'Entity'
            ? Entity::dropdown([
                'name'    => 'client_items_id',
                // -1 = sem cliente; a raiz (0) é a própria empresa e fica fora.
                'value'   => $cId > 0 ? $cId : -1,
                'toadd'   => [-1 => Dropdown::EMPTY_VALUE],
                'used'    => [0],
                'display' => false,
                'width'   => '100%',
            ])
            : User::dropdown([
                'name'    => 'client_items_id',
                'value'   => $cId,
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
    'widgets'    => ['group' => '', 'profile' => '', 'user' => ''],
    'url'        => $CFG_GLPI['root_doc'] . '/plugins/codexplus/ajax/document.targets.php',
];
$manageNew = $isNew; // quem cria gere o rascunho (autor, P1)
if ($manageNew || (!$isNew && ($canManage || $doc->hasRole() || Session::haveRight(Rights::NAME, Rights::VIEWALL)))) {
    $perm['show']       = true;
    $perm['pending']    = $isNew;
    $perm['can_manage'] = $manageNew || $canManage;
    $perm['targets']    = $isNew ? [] : Document::listTargets($id);
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
    }
}

$status = $isNew ? Document::STATUS_DRAFT : (string) $doc->fields['status'];

// R3d: auditor responsável, revisor e janela de revisão. O auditor muda só em
// rascunho; revisor e janela mudam em qualquer status. Quem não gere o
// documento só vê. A1 (Claudio, 25/09/2026): o auditor é escolhido entre quem
// tem um perfil com o bit Auditor na entidade do documento, em qualquer setor
// (Rights::auditorUsers) — a lista não depende mais das categorias.
$fmtDate = static fn ($d) => empty($d) ? '' : substr((string) $d, 0, 10);
$auditorOptions = static fn (int $entityId, int $atual): array
    => $roleOptions(Rights::auditorUsers($entityId), $atual, __('(sem o direito Auditar)', 'codexplus'));
$reviewerOptions = static fn (int $entityId, int $atual): array
    => $roleOptions(Rights::reviewerUsers($entityId), $atual, __('(sem o direito Ler)', 'codexplus'));
// A-1: editores (vários) — mesma lista de quem tem Revisar e editar; quem já é
// editor e perdeu o bit continua na lista, marcado.
$editorOptions = static function (int $entityId, array $atuais) use ($reviewerOptions): array {
    $opcoes = $reviewerOptions($entityId, 0);
    unset($opcoes[0]);
    foreach ($atuais as $uid) {
        if (!isset($opcoes[$uid])) {
            $opcoes[$uid] = getUserName($uid) . ' ' . __('(sem o direito Ler)', 'codexplus');
        }
    }
    return $opcoes;
};
// A-2a: aprovadores do diagrama — quem tem o bit Aprovar.
$signerOptions = static function (int $entityId, array $atuais) use ($roleOptions): array {
    $opcoes = $roleOptions(Rights::approverUsers($entityId), 0, '');
    unset($opcoes[0]);
    foreach ($atuais as $uid) {
        if (!isset($opcoes[$uid])) {
            $opcoes[$uid] = getUserName($uid) . ' ' . __('(sem o direito Ler)', 'codexplus');
        }
    }
    return $opcoes;
};
$review = [
    'show'             => true,
    'is_new'           => $isNew,
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
    // P2: o fluxo do tipo decide quais papéis aparecem. Na criação o tipo
    // ainda muda: os campos levam a lista de tipos e o JS esconde.
    'show_auditor'     => $isNew || $doc->flow() === DocumentMeta::FLOW_FULL,
    'show_reviewer'    => $isNew || $doc->flow() !== DocumentMeta::FLOW_DIRECT,
    'auditor_types'    => DocumentMeta::typesWithFlow([DocumentMeta::FLOW_FULL]),
    // E6: Proposta e Laudo (fluxo direto) têm Editor no lugar do revisor.
    'show_editor'      => $isNew || $doc->flow() === DocumentMeta::FLOW_DIRECT,
    'editor_types'     => DocumentMeta::typesWithFlow([DocumentMeta::FLOW_DIRECT]),
    'editor_widget'    => '',
    'reviewer_types'   => DocumentMeta::typesWithFlow([DocumentMeta::FLOW_FULL, DocumentMeta::FLOW_ONE]),
    // A-2a: aprovadores (diagramas). Mudam só em rascunho, por quem gere.
    'show_signers'     => $isNew || $doc->usesApprovers(),
    'signer_types'     => implode(' ', Document::APPROVER_TYPES),
    'can_signers'      => false,
    'signers_widget'   => '',
    'signers_names'    => '',
];
$pending = ['label' => '', 'names' => []];
$missingRight = '';
if ($isNew) {
    // R3b2-b: quem cria gere o documento. O documento nasce na entidade ativa.
    $review['can_auditor']    = true;
    $review['can_review']     = true;
    $opcoes = $auditorOptions((int) Session::getActiveEntity(), 0);
    $review['no_auditors']    = count($opcoes) === 1;
    $review['auditor_widget'] = Dropdown::showFromArray('users_id_auditor', $opcoes, [
        'value'   => 0,
        'display' => false,
        'width'   => '100%',
    ]);
    $review['reviewer_widget'] = Dropdown::showFromArray('users_id_reviewer', $reviewerOptions((int) Session::getActiveEntity(), 0), [
        'value'   => 0,
        'display' => false,
        'width'   => '100%',
    ]);
    $review['editor_widget'] = Dropdown::showFromArray('users_id_editor', $editorOptions((int) Session::getActiveEntity(), []), [
        'values'   => [],
        'multiple' => true,
        'display'  => false,
        'width'    => '100%',
    ]);
    $review['can_signers']    = true;
    $review['signers_widget'] = Dropdown::showFromArray('users_id_signers', $signerOptions((int) Session::getActiveEntity(), []), [
        'values'   => [],
        'multiple' => true,
        'display'  => false,
        'width'    => '100%',
    ]);
}
if (!$isNew) {
    $auditorId  = (int) ($doc->fields['users_id_auditor'] ?? 0);
    $reviewerId = (int) ($doc->fields['users_id_reviewer'] ?? 0);
    $review['auditor_name']    = $auditorId > 0 ? getUserName($auditorId) : '';
    $review['reviewer_name']   = $reviewerId > 0 ? getUserName($reviewerId) : '';
    // A-2a: aprovadores.
    if ($doc->usesApprovers()) {
        $signerIds = DocumentApprover::ids($id);
        $review['signers_names'] = DocumentEditor::names($signerIds);
        $review['can_signers']   = $canManage && $canEdit && $doc->fields['status'] === Document::STATUS_DRAFT;
        if ($review['can_signers']) {
            $review['signers_widget'] = Dropdown::showFromArray('users_id_signers', $signerOptions((int) $doc->fields['entities_id'], $signerIds), [
                'values'   => $signerIds,
                'multiple' => true,
                'display'  => false,
                'width'    => '100%',
            ]);
        }
    }
    // A-1: no fluxo direto, todos os editores.
    $editorIds = $doc->flow() === DocumentMeta::FLOW_DIRECT ? $doc->editorIds() : [];
    if ($editorIds !== []) {
        $review['reviewer_name'] = DocumentEditor::names($editorIds);
    }
    $review['start']           = $fmtDate($doc->fields['review_start'] ?? null);
    $review['end']             = $fmtDate($doc->fields['review_end'] ?? null);
    $review['validity_months'] = (int) ($doc->fields['validity_months'] ?? 0);
    $review['can_review']      = $canManage;
    $review['can_auditor']     = $canManage && $canEdit && $doc->fields['status'] === Document::STATUS_DRAFT;

    if ($review['can_auditor']) {
        $opcoes = $auditorOptions((int) $doc->fields['entities_id'], $auditorId);
        $review['no_auditors']    = count($opcoes) === 1;
        $review['auditor_widget'] = Dropdown::showFromArray('users_id_auditor', $opcoes, [
            'value'   => $auditorId,
            'display' => false,
            'width'   => '100%',
        ]);
    }
    if ($review['can_review']) {
        // E6: no fluxo direto o mesmo papel aparece como "Editor";
        // A-1: lista (vários editores).
        if ($review['show_editor']) {
            $review['editor_widget'] = Dropdown::showFromArray(
                'users_id_editor',
                $editorOptions((int) $doc->fields['entities_id'], $editorIds),
                [
                    'values'   => $editorIds,
                    'multiple' => true,
                    'display'  => false,
                    'width'    => '100%',
                ]
            );
        } else {
            $review['reviewer_widget'] = Dropdown::showFromArray(
                'users_id_reviewer',
                $reviewerOptions((int) $doc->fields['entities_id'], $reviewerId),
                [
                    'value'   => $reviewerId,
                    'display' => false,
                    'width'   => '100%',
                ]
            );
        }
    }

    // R3d-1: quem responde pela etapa mas não consegue agir fica sabendo o
    // porquê (antes o botão só não aparecia). Regra das duas camadas:
    // perfil (bit) + papel no plugin.
    $st0 = (string) $doc->fields['status'];
    if ($doc->signerLacksRight()) {
        // P3: aprovador que montou o documento (papel em conflito anterior à regra).
        $missingRight = __('Você é aprovador deste documento, mas também o montou (autor, editor ou revisor): não pode aprová-lo. Você pode devolvê-lo; quem gere o documento troca os aprovadores no rascunho.', 'codexplus');
    } elseif ($doc->validationBlocker() === 'perfil') {
        $missingRight = __('Você é o auditor responsável deste documento, mas o perfil em uso não tem o direito Auditar do Codex+. Se outro perfil seu tem, troque para ele; senão, peça a um administrador (Administração → Perfis → aba Codex+).', 'codexplus');
    }

    // Aviso "aguardando …": quem responde pela etapa atual.
    $st = (string) $doc->fields['status'];
    if (in_array($st, Document::PENDING_STATUSES, true)) {
        $pending['label'] = $st === Document::STATUS_APPROVAL
            ? __('Aguardando a aprovação do responsável', 'codexplus')
            : __('Aguardando a validação do auditor responsável', 'codexplus');
        // A-2a: antes do responsável, os aprovadores (quantos já aprovaram).
        if ($doc->signersPending()) {
            $todos = DocumentApprover::ids($id);
            $pending['label'] = sprintf(
                __('Aguardando os aprovadores (%1$d de %2$d já aprovaram)', 'codexplus'),
                count($todos) - count($doc->pendingWith()),
                count($todos)
            );
        }
        $pending['names'] = array_map('getUserName', $doc->pendingWith());
    }
}

// M-2: marca do documento. O campo só aparece com mais de uma marca e fora
// de diagrama (o PDF do DIA é do próprio motor, sem cabeçalho de marca).
$brandList = Brand::all();
$brandId   = $isNew ? Brand::resolveId(0) : Brand::resolveId((int) ($doc->fields['plugin_codexplus_brands_id'] ?? 0));
$brandShownId = (int) ($shown['brand'] ?? 0) > 0 ? (int) $shown['brand'] : $brandId;
$brandShown   = Brand::get($brandShownId);
$brandField = [
    'show'    => count($brandList) > 1 && !$isDiagram,
    'id'      => $brandId,
    'name'    => $brandShown !== null ? $brandShown['name'] : '',
    'types'   => implode(' ', array_diff(DocumentMeta::DOCTYPE_KEYS, ['DIA'])),
    'options' => array_map(static fn ($b) => ['id' => $b['id'], 'name' => $b['name'], 'logo' => $b['logo_url'], 'is_default' => $b['is_default']], $brandList),
];

// A-2b: aprovadores no rodapé da edição, na linha de papéis da leitura e no
// PDF (texto e diagramas). Na versão publicada mostrada durante a revisão,
// só os nomes.
// AP-1: a versão publicada mostra os aprovadores DELA (com as datas);
// versão anterior à 0.7.10 sem o registro fica sem a linha.
$signersLine = $isNew ? '' : ($version['on']
    ? ($doc->usesApprovers() ? DocumentApprover::format($version['approvers']) : '')
    : $doc->approverSummary());

// 5b: vinculados diretos, com link para quem pode ler.
$complements = $isNew ? [] : \GlpiPlugin\Codexplus\DocumentLink::complements(
    $id,
    static fn ($d) => $d->canViewItem() ? $CFG_GLPI['url_base'] . '/plugins/codexplus/front/document.form.php?id=' . (int) $d->fields['id'] : null,
    [\GlpiPlugin\Codexplus\DocumentLink::class, 'noteFor']
);

// Bagagem do PDF (também a raiz do PDF composto, 5d).
$printDoc = ($isNew || $isDiagram) ? [] : [
        'title'          => $version['on'] ? (string) ($shown['name'] ?? '') : (string) $doc->fields['name'],
        'code'           => $version['on'] ? $version['code'] : $doc->getCode(),
        'revision'       => $version['on'] ? $version['rev'] : (int) $doc->fields['revision'],
        'client'         => $client['name'],
        'date_mod'       => (string) ($doc->fields['date_mod'] ?? ''),
        'doctype'        => (string) $doc->fields['doctype'],
        'owner'          => (int) $doc->fields['users_id_owner'] > 0
            ? getUserName((int) $doc->fields['users_id_owner']) : getUserName((int) $doc->fields['users_id']),
        'sector'         => implode(', ', $sectorNames),
        'approvers'      => $signersLine, // A-2b
        // A versão mostrada é a publicada? Então data de publicação; senão,
        // o aviso de que não é a versão vigente.
        'date_published' => $version['on'] ? $version['date']
            : ($status === Document::STATUS_PUBLISHED || $status === Document::STATUS_OBSOLETE
                ? (string) ($doc->fields['date_published'] ?? '') : ''),
        'draft'          => $version['on'] || $status === Document::STATUS_PUBLISHED ? ''
            : ($status === Document::STATUS_OBSOLETE ? __('OBSOLETO', 'codexplus')
                : sprintf(__('%s — não é a versão vigente', 'codexplus'), mb_strtoupper(
                    // A-2b: com aprovador pendente, o aviso diz isso (como o selo da página).
                    $doc->signersPending() ? __('Aguardando aprovadores', 'codexplus') : (Document::getStatuses()[$status] ?? $status)
                ))),
        'header_html'    => '',
        // Tipo sem revisão periódica (fluxo direto): o "rev. 0" sai do cabeçalho.
        'norev'          => DocumentMeta::flowOf((string) $doc->fields['doctype']) === DocumentMeta::FLOW_DIRECT ? 1 : 0,
        'footer_text'    => (string) ($doc->fields['footer_text'] ?? ''),
        // R6-b2: histórico de revisões no fim do PDF, até a revisão impressa
        // (na revisão em andamento, até a publicada em vigor). Tipos de fluxo
        // direto (proposta, laudo) não têm revisão periódica: sem histórico.
        'complements'    => $complements,
        'history'        => DocumentMeta::flowOf((string) $doc->fields['doctype']) === DocumentMeta::FLOW_DIRECT ? []
            : \GlpiPlugin\Codexplus\DocumentVersion::history(
                $id,
                $version['on'] ? (int) $version['rev'] : ((int) $doc->fields['revision'] - ($inRevision ? 1 : 0)),
                $doc
            ),
    ];


// 5d: PDF composto — a árvore resolvida, em JSON (o navegador monta o PDF).
if ($id > 0 && isset($_GET['composite']) && !$isDiagram) {
    return new \Symfony\Component\HttpFoundation\JsonResponse(\GlpiPlugin\Codexplus\DocumentLink::composite(
        $doc,
        $printDoc,
        RichText::getEnhancedHtml(\GlpiPlugin\Codexplus\DocumentLink::resolveRefs(
            $shown['content'] ?? (string) ($doc->fields['content'] ?? ''),
            static fn ($d) => $d->canViewItem() ? $CFG_GLPI['url_base'] . '/plugins/codexplus/front/document.form.php?id=' . (int) $d->fields['id'] : null
        ), ['text_maxsize' => 0])
    ));
}

// HV-1 (Claudio, 04/10/2026): Histórico — 4ª aba dos dados na edição; na
// leitura, a mesma barra recolhida só com ele. Quem tem papel, Super-Admin
// e Ver todos (Document::canSeeHistory). Fora da janela Visualizar e PDF.
$history = ['show' => false, 'rows' => [], 'more' => false, 'limit' => DocumentHistory::LIMIT];
if (!$isNew && !$preview && $doc->canSeeHistory()) {
    $history = ['show' => true, 'limit' => DocumentHistory::LIMIT] + DocumentHistory::entries($doc);
}

TemplateRenderer::getInstance()->display('@codexplus/document-form.html.twig', [
    'history'     => $history,
    'brand'       => $brandField,
    'signers_line' => $signersLine,
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
    'status_label' => $version['on'] ? Document::getStatuses()[Document::STATUS_PUBLISHED]
        : (!$isNew && $doc->signersPending() ? __('Aguardando aprovadores', 'codexplus') : (Document::getStatuses()[$status] ?? $status)),
    'name'        => $isNew ? '' : ($shown['name'] ?? (string) $doc->fields['name']),
    'client_name' => $isNew ? '' : (string) ($doc->fields['client_name'] ?? ''),
    'client'      => $client,
    // text_maxsize 0: sem o "ler mais" do GLPI. Documento longo (ou com
    // planilha/quadro, que guardam dados no corpo) era recolhido na leitura e
    // o PDF paginava o bloco recolhido — saía em branco (Claudio, 26/09/2026).
    // 5b: referências no texto com código e título atuais.
    'content_html' => $isNew ? '' : RichText::getEnhancedHtml(\GlpiPlugin\Codexplus\DocumentLink::resolveRefs(
        $shown['content'] ?? (string) ($doc->fields['content'] ?? ''),
        static fn ($d) => $d->canViewItem() ? $self . '?id=' . (int) $d->fields['id'] : null
    ), ['text_maxsize' => 0]),
    // 5b: Documentos complementares (fim do documento).
    'complements'  => $complements,
    // 5c: "Faz parte de" (pais) e aviso de vinculado obsoleto/vencido (só
    // para quem tem papel; fora do Visualizar e da versão publicada).
    'part_of'      => ($isNew || $preview || $version['on']) ? [] : \GlpiPlugin\Codexplus\DocumentLink::parents($id),
    'link_problems' => ($isNew || $preview || $version['on'] || !($doc->hasRole() || Session::haveRight(Rights::NAME, Rights::VIEWALL)))
        ? [] : \GlpiPlugin\Codexplus\DocumentLink::problems($id),
    // 5b: botão Referência do editor (só em quem aceita vinculados e já existe).
    'docref_url'   => (!$isNew && \GlpiPlugin\Codexplus\DocumentLink::canManage($doc)) ? $self . '?id=' . $id . '&link_search=1&all=1' : '',
    'owner_name'  => $isNew ? '' : ((int) $doc->fields['users_id_owner'] > 0 ? getUserName((int) $doc->fields['users_id_owner']) : ''),
    'author_name' => $isNew ? '' : getUserName((int) $doc->fields['users_id']),
    'category_names' => $categoryNames,
    'placement'      => $placement,
    'sector_names'   => $sectorNames,
    'validation_comment' => $isNew ? '' : (string) ($doc->fields['validation_comment'] ?? ''),
    'validator_name'     => $version['on'] ? $version['validator']
        : ($isNew || (int) ($doc->fields['users_id_validator'] ?? 0) <= 0 ? '' : getUserName((int) $doc->fields['users_id_validator'])),
    'date_validated'     => $version['on'] ? $version['date'] : ($isNew ? '' : (string) ($doc->fields['date_validated'] ?? '')),
    'widgets'     => $widgets,
    'perm'        => $perm,
    // Dados do documento recolhíveis (Claudio, 04/10/2026): faixa de resumo
    // e o que falta para enviar (abre sozinho quando falta algo).
    'meta'        => $isNew ? ['new' => true, 'missing' => true] : (static function () use ($doc, $sectorNames, $categoryNames, $perm, $brandShown, $review) {
        $full    = $doc->flow() === DocumentMeta::FLOW_FULL;
        $auditor = (string) ($review['auditor_name'] ?? '');
        $lugar   = $doc->placementError() === null;
        $draft   = (string) $doc->fields['status'] === Document::STATUS_DRAFT;
        return [
            'new'      => false,
            'estante'  => $sectorNames ? implode(', ', $sectorNames) . ($categoryNames ? ' › ' . implode(', ', $categoryNames) : '') : '',
            'owner'    => (int) $doc->fields['users_id_owner'] > 0 ? getUserName((int) $doc->fields['users_id_owner']) : '',
            'auditor'  => $full ? ($auditor !== '' ? $auditor : null) : false,
            'readers'  => count($perm['targets'] ?? []),
            'brand'    => (string) ($brandShown['name'] ?? ''),
            // Só pesa em rascunho: é o que impede enviar.
            'missing'  => $draft && (!$lugar || ($full && $auditor === '')),
            'no_place' => !$lugar,
        ];
    })(),
    // Etapa 5a: documentos vinculados (só tipos que aceitam filhos).
    'links'       => (!$isNew && !$version['on'] && !$preview
        && \GlpiPlugin\Codexplus\DocumentLink::canHaveChildren((string) $doc->fields['doctype'])
        && ($doc->hasRole() || Session::haveRight(Rights::NAME, Rights::VIEWALL) || \GlpiPlugin\Codexplus\DocumentLink::canManage($doc))) ? [
        'tree'       => \GlpiPlugin\Codexplus\DocumentLink::tree($id),
        'can_manage' => \GlpiPlugin\Codexplus\DocumentLink::canManage($doc),
        'types'      => implode(', ', \GlpiPlugin\Codexplus\DocumentLink::ALLOWED[(string) $doc->fields['doctype']]),
        'search_url' => $self . '?id=' . $id . '&link_search=1',
    ] : null,
    // R7: seção "Acesso anônimo" da coluna Permissões (só para quem gere o link).
    'anon'        => (!$isNew && $doc->canManageAnonymous()) ? [
        'on'    => !empty($doc->fields['anon_token']),
        'url'   => empty($doc->fields['anon_token']) ? ''
            : rtrim((string) $CFG_GLPI['url_base'], '/') . '/plugins/codexplus/front/public.php?t=' . $doc->fields['anon_token'],
        'by'    => (int) ($doc->fields['anon_users_id'] ?? 0) > 0 ? getUserName((int) $doc->fields['anon_users_id']) : '',
        'date'  => (string) ($doc->fields['anon_date'] ?? ''),
        'hits'  => (int) ($doc->fields['anon_hits'] ?? 0),
        'last'  => (string) ($doc->fields['anon_last'] ?? ''),
    ] : null,
    'review'      => $review,
    'preview'     => $preview,
    'pending'     => $pending,
    'missing_right' => $missingRight,
    'is_diagram'   => $isDiagram,
    // R3b4: modelos por tipo para a criação (o JS filtra e preenche o corpo).
    'templates_json' => $isNew ? json_encode(
        \GlpiPlugin\Codexplus\Template::listForCreation(),
        JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE // achado 14
    ) : '[]',
    'template_types' => implode(' ', array_diff(array_keys(DocumentMeta::getDoctypes()), ['DIA'])),
    'diagram_kind' => $diagramKind,
    'diagram_kind_label' => Diagram::getSubtypes()[$diagramKind] ?? '',
    'schedule'     => $schedule,
    'diagram_json' => $diagramJson,
    'can_submit'   => !$isNew && $doc->canSubmit(),
    'can_publish_direct' => !$isNew && !$version['on'] && $doc->canPublishDirect(),
    'flow'         => $isNew ? DocumentMeta::FLOW_FULL : $doc->flow(),
    'can_validate' => !$isNew && $doc->canValidate(),
    'can_approve'  => !$isNew && $doc->canApprove(),
    'can_sign'     => !$isNew && !$version['on'] && $doc->canSign(),
    'can_reject'   => !$isNew && $doc->canReject(),
    // A2: auditor responsável impedido de validar (aprovou a 1ª etapa). O motivo 'perfil' vai em missing_right.
    'validation_block' => $isNew || $version['on'] ? '' : match ($doc->validationBlocker()) {
        'aprovou' => __('Você aprovou a 1ª etapa deste documento: outro auditor precisa validá-lo. Você ainda pode devolvê-lo.', 'codexplus'),
        'montou'  => __('Você montou este documento (autor, editor ou revisor): outro auditor precisa validá-lo. Você ainda pode devolvê-lo.', 'codexplus'),
        default   => '',
    },
    'can_obsolete' => !$isNew && $doc->canMarkObsolete(),
    // Duplicar = poder criar (P1).
    'can_duplicate' => !$isNew && !$version['on'] && Document::canCreateIn($categoryIds),
    // T3: tipos oferecidos no "Duplicar como…" (vazio em diagrama).
    'dup_types'     => $isNew ? [] : DocumentMeta::duplicateTargets((string) $doc->fields['doctype']),
    // R5: excluir (lixeira).
    'can_delete'   => !$isNew && !$version['on'] && !$preview && $doc->canDeleteItem() && empty($doc->fields['is_deleted']),
    // M1: salvar o corpo gravado como modelo.
    'can_save_template' => !$isNew && !$version['on'] && !$isDiagram && Session::haveRight(Rights::NAME, Rights::TEMPLATES),
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
    // R6-b: prazo da revisão em andamento (só para quem tem papel: o revinfo).
    'can_extend_revision'  => !$isNew && $revinfo['on'] && $doc->canExtendRevision(),
    'revdue'          => $revinfo['on'] ? $doc->revisionDueState() : null,
    'rev_extensions'  => $revinfo['on'] ? \GlpiPlugin\Codexplus\RevisionEvent::listFor($id, [\GlpiPlugin\Codexplus\RevisionEvent::EXTENDED], (int) $doc->fields['revision']) : [],
    'rev_opened'      => $revinfo['on'] ? (\GlpiPlugin\Codexplus\RevisionEvent::listFor($id, [\GlpiPlugin\Codexplus\RevisionEvent::OPENED], (int) $doc->fields['revision'])[0] ?? null) : null,
    'today_ymd'       => substr((string) $_SESSION['glpi_currenttime'], 0, 10),
    'csrf_token'   => Session::getNewCSRFToken(),
    // R3b3-2: leitura com Exportar PDF (texto; o DIA tem o PDF do próprio motor).
    'can_edit_doc' => $canEditDoc,
    'view_link'    => $isNew ? '' : $self . '?id=' . $id . '&view=1',
    'edit_link'    => $isNew ? '' : $self . '?id=' . $id,
    'print_config' => $isNew || $isDiagram ? '{}' : Branding::printConfig($printDoc, $brandShownId),
    // 5d: PDF completo (com os vinculados), só no Visualizar de quem tem vinculados.
    'composite_url' => ($preview && !$isDiagram && \GlpiPlugin\Codexplus\DocumentLink::childIds($id)) ? $self . '?id=' . $id . '&composite=1' : '',
]);

Wiki::pageFooter();
