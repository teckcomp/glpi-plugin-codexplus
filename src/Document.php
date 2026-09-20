<?php
namespace GlpiPlugin\Codexplus;

use CommonDBTM;
use Glpi\DBAL\QueryExpression;
use Glpi\DBAL\QuerySubQuery;
use Session;

/**
 * Documento próprio do Codex+ (Etapas R3a e R3c) — CONTEXTO.md §3.1.
 *
 * Tabela glpi_plugin_codexplus_documents, a MESMA de DocumentMeta. Até a R5
 * as duas classes convivem:
 *   - DocumentMeta: linhas ligadas a artigo nativo (knowbaseitems_id > 0),
 *     usadas pelas telas atuais;
 *   - Document: o documento independente (knowbaseitems_id = 0).
 * Regras de tipo, sequencial e publicação têm fonte única em DocumentMeta.
 *
 * ATENÇÃO — nome: `Document` do núcleo é `\Document`.
 *
 * PERMISSÕES EM DUAS CAMADAS (decisão de Claudio, 20/09/2026 — R3c)
 * O perfil (Rights) diz O QUE; o plugin diz EM QUAIS documentos:
 *
 *   Ler      Ler + alvo de leitura, só publicado/obsoleto. Quem tem papel no
 *            documento (gestor ou validador do setor, editor) e o autor e o
 *            responsável leem em qualquer status.
 *   Criar    Criar + ser gestor do setor de TODAS as categorias informadas.
 *   Editar   Atualizar + (editor do documento ou gestor do setor), e só em
 *            rascunho. Publicado não se edita até a R6 (revisão com a
 *            publicada visível); em validação, só devolvendo.
 *   Gerir    Atualizar + gestor do setor: editores, alvos de leitura,
 *            categorias (estas só em rascunho), responsável, obsoleto.
 *   Enviar   quem pode editar, com ao menos uma categoria com setor.
 *   Validar  Validar + validador do setor + NÃO ter alterado o documento na
 *            revisão atual (DocumentContributor).
 *   Excluir  Excluir + gestor do setor (lixeira). Purgar: desligado.
 *   Ver todos  dispensa os papéis (inclusive "quem editou não valida"),
 *            sempre dentro dos outros bits do perfil.
 *
 * Status: rascunho -> validacao -> publicado -> obsoleto; validacao volta a
 * rascunho quando o validador devolve (motivo obrigatório). Status só muda
 * pelos métodos submit()/approve()/reject()/markObsolete(), nunca por update
 * direto.
 *
 * A leitura existe em DUAS formas que precisam concordar: canViewItem() e
 * getVisibilityCriteria() (SQL, para as listagens da R5). O comando
 * `plugins:codexplus:document:visibility` compara as duas.
 */
class Document extends CommonDBTM
{
    public const STATUS_DRAFT      = 'rascunho';
    public const STATUS_VALIDATION = 'validacao';
    public const STATUS_PUBLISHED  = 'publicado';
    public const STATUS_OBSOLETE   = 'obsoleto';
    public const STATUS_KEYS = [
        self::STATUS_DRAFT, self::STATUS_VALIDATION, self::STATUS_PUBLISHED, self::STATUS_OBSOLETE,
    ];
    /** Status que o leitor comum (alvo) enxerga. */
    public const READER_STATUSES = [self::STATUS_PUBLISHED, self::STATUS_OBSOLETE];

    /** Campos cuja mudança conta como "alterar o documento" (contribuição). */
    private const CONTENT_FIELDS = ['name', 'content', 'header_html', 'footer_text', 'client_name'];

    public static $rightname = Rights::NAME;

    public $dohistory = true;

    /** Alvos carregados em post_getFromDB: [id => [linhas]] */
    protected array $users    = [];
    protected array $groups   = [];
    protected array $profiles = [];

    /** Transição de status em andamento (só os métodos de fluxo a ligam). */
    private bool $inTransition = false;

    public static function getTypeName($nb = 0)
    {
        return $nb > 1 ? __('Documentos', 'codexplus') : __('Documento', 'codexplus');
    }

    public static function getIcon()
    {
        return 'ti ti-file-text';
    }

    public static function getStatuses(): array
    {
        return [
            self::STATUS_DRAFT      => __('Rascunho', 'codexplus'),
            self::STATUS_VALIDATION => __('Em validação', 'codexplus'),
            self::STATUS_PUBLISHED  => __('Publicado', 'codexplus'),
            self::STATUS_OBSOLETE   => __('Obsoleto', 'codexplus'),
        ];
    }

    // ---------------------------------------------------------------------
    // Camada 1 — perfil (estáticos)
    // ---------------------------------------------------------------------

    public static function canView(): bool
    {
        return (bool) Session::haveRightsOr(Rights::NAME, [Rights::READ, Rights::VIEWALL]);
    }

    public static function canCreate(): bool
    {
        return self::bit(Rights::CREATE);
    }

    public static function canUpdate(): bool
    {
        return self::bit(Rights::UPDATE);
    }

    public static function canDelete(): bool
    {
        return self::bit(Rights::DELETE);
    }

    /** Excluir é lixeira; não há purga pela interface (decisão da R1). */
    public static function canPurge(): bool
    {
        return false;
    }

    private static function bit(int $bit): bool
    {
        return (bool) Session::haveRight(Rights::NAME, $bit);
    }

    private static function hasViewAll(): bool
    {
        return self::bit(Rights::VIEWALL);
    }

    // ---------------------------------------------------------------------
    // Camada 2 — papéis no plugin
    // ---------------------------------------------------------------------

    /**
     * Setores do documento (via categorias; Category guarda o setor já
     * herdado da raiz).
     *
     * @return int[]
     */
    public function getSectorIds(): array
    {
        return self::sectorsOfCategories(Document_Category::getCategoryIds((int) ($this->fields['id'] ?? 0)));
    }

    /**
     * @param int[] $categoryIds
     * @return int[] setores (> 0), sem repetição
     */
    public static function sectorsOfCategories(array $categoryIds): array
    {
        $out = [];
        foreach ($categoryIds as $cid) {
            $s = Category::getSectorOf((int) $cid);
            if ($s > 0) {
                $out[$s] = $s;
            }
        }
        return array_values($out);
    }

    public function isManager(): bool
    {
        return (bool) array_intersect($this->getSectorIds(), SectorMember::mySectors(SectorMember::ROLE_MANAGER));
    }

    public function isValidator(): bool
    {
        return (bool) array_intersect($this->getSectorIds(), SectorMember::mySectors(SectorMember::ROLE_VALIDATOR));
    }

    public function isEditor(): bool
    {
        return DocumentEditor::isMine((int) ($this->fields['id'] ?? 0));
    }

    /** Autor ou responsável do documento carregado. */
    public function isAuthorOrOwner(): bool
    {
        $me = (int) Session::getLoginUserID();
        if ($me <= 0) {
            return false;
        }
        return (int) ($this->fields['users_id'] ?? 0) === $me
            || (int) ($this->fields['users_id_owner'] ?? 0) === $me;
    }

    /** Tem algum papel no documento (vê em qualquer status). */
    public function hasRole(): bool
    {
        return $this->isAuthorOrOwner() || $this->isEditor() || $this->isManager() || $this->isValidator();
    }

    /** O usuário da sessão alterou o documento na revisão atual? */
    public function isContributor(): bool
    {
        return DocumentContributor::has(
            (int) ($this->fields['id'] ?? 0),
            (int) ($this->fields['revision'] ?? 0),
            (int) Session::getLoginUserID()
        );
    }

    private function status(): string
    {
        return (string) ($this->fields['status'] ?? '');
    }

    // ---------------------------------------------------------------------
    // Direitos por item
    // ---------------------------------------------------------------------

    public function canViewItem(): bool
    {
        if (!$this->checkEntity(true)) {
            return false;
        }
        if (self::hasViewAll() || $this->hasRole()) {
            return true;
        }
        return in_array($this->status(), self::READER_STATUSES, true)
            && self::bit(Rights::READ)
            && $this->haveVisibilityAccess();
    }

    /**
     * Criar: Criar + gestor do setor de TODAS as categorias informadas
     * (`_categories`). Sem categoria com setor, só com Ver todos.
     */
    public function canCreateItem(): bool
    {
        if (!$this->checkEntity()) {
            return false;
        }
        return self::canCreateIn(array_map('intval', (array) ($this->input['_categories'] ?? [])));
    }

    /**
     * @param int[] $categoryIds
     */
    public static function canCreateIn(array $categoryIds): bool
    {
        if (!self::canCreate()) {
            return false;
        }
        if (self::hasViewAll()) {
            return true;
        }
        if ($categoryIds === []) {
            return false;
        }
        $mine = SectorMember::mySectors(SectorMember::ROLE_MANAGER);
        foreach ($categoryIds as $cid) {
            $s = Category::getSectorOf($cid);
            if ($s <= 0 || !in_array($s, $mine, true)) {
                return false;
            }
        }
        return true;
    }

    /** Editar conteúdo/metadados: só em rascunho. */
    public function canUpdateItem(): bool
    {
        return $this->checkEntity()
            && $this->status() === self::STATUS_DRAFT
            && (self::hasViewAll() || $this->isEditor() || $this->isManager());
    }

    /**
     * Gerir o documento: editores, alvos de leitura, categorias,
     * responsável, obsoleto. Atualizar + gestor do setor (ou Ver todos).
     */
    public function canManage(): bool
    {
        return self::canUpdate()
            && $this->checkEntity()
            && (self::hasViewAll() || $this->isManager());
    }

    public function canDeleteItem(): bool
    {
        return $this->checkEntity() && (self::hasViewAll() || $this->isManager());
    }

    public function canSubmit(): bool
    {
        return self::canUpdate() && $this->canUpdateItem();
    }

    public function canValidate(): bool
    {
        if ($this->status() !== self::STATUS_VALIDATION || !self::bit(Rights::VALIDATE) || !$this->checkEntity()) {
            return false;
        }
        if (self::hasViewAll()) {
            return true;
        }
        return $this->isValidator() && !$this->isContributor();
    }

    public function canMarkObsolete(): bool
    {
        return $this->status() === self::STATUS_PUBLISHED && $this->canManage();
    }

    /**
     * O usuário da sessão é alvo de leitura? Espelho de
     * CommonDBVisible::haveVisibilityAccess() (GLPI 11.0.6), sem o alvo por
     * entidade (a entidade é do próprio documento).
     */
    public function haveVisibilityAccess(): bool
    {
        $me = Session::getLoginUserID();
        if ($me && isset($this->users[$me])) {
            return true;
        }

        $myGroups = $_SESSION['glpigroups'] ?? [];
        if (count($this->groups) && count($myGroups)) {
            foreach ($this->groups as $rows) {
                foreach ($rows as $g) {
                    if (in_array($g['groups_id'], $myGroups)) {
                        if ($g['no_entity_restriction']) {
                            return true;
                        }
                        if (Session::haveAccessToEntity($g['entities_id'], $g['is_recursive'])) {
                            return true;
                        }
                    }
                }
            }
        }

        $profileId = $_SESSION['glpiactiveprofile']['id'] ?? null;
        if ($profileId !== null && isset($this->profiles[$profileId])) {
            foreach ($this->profiles[$profileId] as $p) {
                if ($p['no_entity_restriction']) {
                    return true;
                }
                if (Session::haveAccessToEntity($p['entities_id'], $p['is_recursive'])) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * @return array{users: array, groups: array, profiles: array}
     */
    public function getTargets(): array
    {
        return ['users' => $this->users, 'groups' => $this->groups, 'profiles' => $this->profiles];
    }

    // ---------------------------------------------------------------------
    // Visibilidade em SQL (listagens — R5)
    // ---------------------------------------------------------------------

    /**
     * Mesma regra de canViewItem(), para o construtor de consultas.
     * Formato de KnowbaseItem::getVisibilityCriteria(): ['LEFT JOIN', 'WHERE'].
     * Os LEFT JOIN multiplicam linhas: use 'DISTINCT' => true na consulta.
     *
     * @return array{LEFT JOIN: array, WHERE: array}
     */
    public static function getVisibilityCriteria(): array
    {
        $doc = static::getTable();
        $tu  = Document_User::getTable();
        $tg  = Document_Group::getTable();
        $tp  = Document_Profile::getTable();
        $fk  = Document_User::$items_id_1;

        $join = [
            $tu => ['ON' => [$tu => $fk, $doc => 'id']],
            $tg => ['ON' => [$tg => $fk, $doc => 'id']],
            $tp => ['ON' => [$tp => $fk, $doc => 'id']],
        ];

        $me = (int) Session::getLoginUserID();
        if ($me <= 0 || !static::canView()) {
            return ['LEFT JOIN' => $join, 'WHERE' => [new QueryExpression('false')]];
        }

        // Entidade do próprio documento (com recursividade), como o
        // checkEntity(true) de canViewItem().
        $where = [getEntitiesRestrictCriteria($doc, '', '', true)];

        if (self::hasViewAll()) {
            return ['LEFT JOIN' => $join, 'WHERE' => $where];
        }

        $groups = array_values($_SESSION['glpigroups'] ?? []);

        // Papéis: autor, responsável, editor, gestor/validador do setor.
        $ors = [
            [$doc . '.users_id' => $me],
            [$doc . '.users_id_owner' => $me],
        ];

        $edOr = [['users_id' => $me]];
        if ($groups) {
            $edOr[] = ['groups_id' => $groups];
        }
        $ors[] = [$doc . '.id' => new QuerySubQuery([
            'SELECT' => DocumentEditor::$items_id,
            'FROM'   => DocumentEditor::getTable(),
            'WHERE'  => ['OR' => $edOr],
        ])];

        $sectors = array_values(array_unique(array_merge(
            SectorMember::mySectors(SectorMember::ROLE_MANAGER),
            SectorMember::mySectors(SectorMember::ROLE_VALIDATOR)
        )));
        if ($sectors) {
            $dc  = Document_Category::getTable();
            $cat = Category::getTable();
            $ors[] = [$doc . '.id' => new QuerySubQuery([
                'SELECT'     => $dc . '.' . Document_Category::$items_id_1,
                'FROM'       => $dc,
                'INNER JOIN' => [
                    $cat => ['ON' => [$dc => Document_Category::$items_id_2, $cat => 'id']],
                ],
                'WHERE'      => [$cat . '.' . Category::SECTOR_FIELD => $sectors],
            ])];
        }

        // Leitor: Ler + alvo, só publicado/obsoleto. (canView() garante que,
        // sem Ver todos, o bit Ler está presente.)
        $targets = ['OR' => [[$tu . '.users_id' => $me]]];
        if ($groups) {
            $targets['OR'][] = [
                $tg . '.groups_id' => $groups,
                'OR' => [$tg . '.no_entity_restriction' => 1]
                    + getEntitiesRestrictCriteria($tg, '', '', true, true),
            ];
        }
        $profile = $_SESSION['glpiactiveprofile']['id'] ?? -1;
        $targets['OR'][] = [
            $tp . '.profiles_id' => $profile,
            'OR' => [$tp . '.no_entity_restriction' => 1]
                + getEntitiesRestrictCriteria($tp, '', '', true, true),
        ];
        $ors[] = ['AND' => [$targets, [$doc . '.status' => self::READER_STATUSES]]];

        $where[] = ['OR' => $ors];
        return ['LEFT JOIN' => $join, 'WHERE' => $where];
    }

    // ---------------------------------------------------------------------
    // Fluxo: enviar, validar, devolver, obsoleto
    // ---------------------------------------------------------------------

    /** Envia para validação. Exige categoria com setor (senão ninguém valida). */
    public function submit(): bool
    {
        if (!$this->canSubmit()) {
            return $this->deny(__('Sem direito de enviar este documento para validação.', 'codexplus'));
        }
        // Sem setor não há validador de setor; só quem tem Ver todos (e
        // Validar) conseguiria validar — e só quem tem Ver todos cria
        // documento fora de setor. Para os demais, exige categoria com setor.
        if ($this->getSectorIds() === [] && !self::hasViewAll()) {
            return $this->deny(__('Sem categoria com setor: não há quem valide. Ligue o documento a uma categoria.', 'codexplus'));
        }
        return $this->transition([
            'status'             => self::STATUS_VALIDATION,
            'users_id_submitter' => (int) Session::getLoginUserID(),
            'date_submitted'     => $_SESSION['glpi_currenttime'],
        ]);
    }

    /** Aprova: vira publicado. Quem alterou não aprova (salvo Ver todos). */
    public function approve(): bool
    {
        if (!$this->canValidate()) {
            if ($this->status() === self::STATUS_VALIDATION && $this->isValidator() && $this->isContributor()) {
                return $this->deny(__('Você alterou este documento nesta revisão: outra pessoa precisa validar.', 'codexplus'));
            }
            return $this->deny(__('Sem direito de validar este documento.', 'codexplus'));
        }
        $data = DocumentMeta::stampPublishDate([
            'status'             => self::STATUS_PUBLISHED,
            'users_id_validator' => (int) Session::getLoginUserID(),
            'date_validated'     => $_SESSION['glpi_currenttime'],
            'validation_comment' => null,
        ], $this->fields['date_published'] ?? null);
        return $this->transition($data);
    }

    /** Devolve para rascunho com o motivo (obrigatório). */
    public function reject(string $comment): bool
    {
        if (!$this->canValidate()) {
            return $this->deny(__('Sem direito de validar este documento.', 'codexplus'));
        }
        $comment = trim($comment);
        if ($comment === '') {
            return $this->deny(__('Informe o motivo da devolução.', 'codexplus'));
        }
        return $this->transition([
            'status'             => self::STATUS_DRAFT,
            'users_id_validator' => (int) Session::getLoginUserID(),
            'date_validated'     => $_SESSION['glpi_currenttime'],
            'validation_comment' => $comment,
        ]);
    }

    public function markObsolete(): bool
    {
        if (!$this->canMarkObsolete()) {
            return $this->deny(__('Sem direito de tornar este documento obsoleto.', 'codexplus'));
        }
        return $this->transition(['status' => self::STATUS_OBSOLETE]);
    }

    private function transition(array $data): bool
    {
        $this->inTransition = true;
        try {
            $ok = $this->update(['id' => (int) $this->fields['id']] + $data);
        } finally {
            $this->inTransition = false;
        }
        if ($ok) {
            $this->getFromDB((int) $this->fields['id']);
        }
        return (bool) $ok;
    }

    private function deny(string $msg): bool
    {
        Session::addMessageAfterRedirect($msg, false, ERROR);
        return false;
    }

    // ---------------------------------------------------------------------
    // Ciclo de vida
    // ---------------------------------------------------------------------

    public function post_getFromDB()
    {
        $id             = (int) $this->fields['id'];
        $this->users    = Document_User::getForDocument($id);
        $this->groups   = Document_Group::getForDocument($id);
        $this->profiles = Document_Profile::getForDocument($id);
    }

    public function prepareInputForAdd($input)
    {
        $input = DocumentMeta::sanitizeFields($input, self::STATUS_KEYS);

        $input['name'] = trim((string) ($input['name'] ?? ''));
        if ($input['name'] === '') {
            return $this->deny(__('Informe o título do documento.', 'codexplus'));
        }
        if (empty($input['doctype'])) {
            return $this->deny(__('Informe o tipo do documento.', 'codexplus'));
        }

        // Categorias: obrigatórias e todas em setor do gestor (ou Ver todos).
        // Checado aqui também — não só no can() — para valer em qualquer
        // caminho de criação.
        $cats = array_values(array_unique(array_map('intval', (array) ($input['_categories'] ?? []))));
        if (!self::canCreateIn($cats)) {
            return $this->deny(__('Sem direito de criar documento nestas categorias (é preciso ser gestor do setor de cada uma).', 'codexplus'));
        }
        $input['_categories'] = $cats;

        // Documento nasce rascunho: publicar é sempre pela validação.
        $input['status']           = self::STATUS_DRAFT;
        $input['knowbaseitems_id'] = 0;
        $input['sequence']         = DocumentMeta::nextSequence((string) $input['doctype']);
        $input['revision']         = 0;
        $input['users_id']         = (int) Session::getLoginUserID();
        if (!isset($input['validity_months'])) {
            $input['validity_months'] = $input['doctype'] === 'PRP' ? 0 : DocumentMeta::DEFAULT_VALIDITY_MONTHS;
        }
        unset($input['date_published'], $input['users_id_validator'], $input['date_validated'],
            $input['users_id_submitter'], $input['date_submitted'], $input['validation_comment']);

        return $input;
    }

    public function post_addItem()
    {
        $id = (int) $this->fields['id'];

        // Categorias validadas em prepareInputForAdd; gravadas direto (o
        // documento ainda não tem setor, então o can() da ligação negaria).
        foreach ((array) ($this->input['_categories'] ?? []) as $cid) {
            (new Document_Category())->add([
                'plugin_codexplus_documents_id'  => $id,
                'plugin_codexplus_categories_id' => (int) $cid,
            ]);
        }

        DocumentContributor::record($id, 0, (int) Session::getLoginUserID());
        parent::post_addItem();
    }

    public function prepareInputForUpdate($input)
    {
        // Tipo e sequencial formam o código: não mudam depois de criado.
        // Revisão sobe só na R6 (revisão de documento publicado).
        unset($input['doctype'], $input['sequence'], $input['knowbaseitems_id'],
            $input['users_id'], $input['revision']);

        $input = DocumentMeta::sanitizeFields($input, self::STATUS_KEYS);

        if (!$this->inTransition) {
            // Status e dados de validação só mudam pelos métodos de fluxo.
            foreach (['status', 'users_id_submitter', 'date_submitted', 'users_id_validator',
                'date_validated', 'validation_comment', 'date_published'] as $f) {
                if (array_key_exists($f, $input) && (string) $input[$f] !== (string) ($this->fields[$f] ?? '')) {
                    return $this->deny(__('O status muda só pelo fluxo: enviar para validação, validar, devolver ou tornar obsoleto.', 'codexplus'));
                }
                unset($input[$f]);
            }
            // Fora de rascunho, nada de conteúdo (publicado: revisão na R6).
            if ($this->status() !== self::STATUS_DRAFT) {
                foreach (self::CONTENT_FIELDS as $f) {
                    if (array_key_exists($f, $input) && (string) $input[$f] !== (string) ($this->fields[$f] ?? '')) {
                        return $this->deny(__('Documento fora de rascunho não pode ser alterado.', 'codexplus'));
                    }
                }
            }
        }

        if (array_key_exists('name', $input)) {
            $input['name'] = trim((string) $input['name']);
            if ($input['name'] === '') {
                return $this->deny(__('Informe o título do documento.', 'codexplus'));
            }
        }

        return $input;
    }

    public function post_updateItem($history = true)
    {
        if (array_intersect($this->updates, self::CONTENT_FIELDS)) {
            DocumentContributor::record(
                (int) $this->fields['id'],
                (int) $this->fields['revision'],
                (int) Session::getLoginUserID()
            );
        }
        parent::post_updateItem($history);
    }

    public function cleanDBonPurge()
    {
        $this->deleteChildrenAndRelationsFromDb([
            Document_Category::class,
            Document_Profile::class,
            Document_Group::class,
            Document_User::class,
            DocumentEditor::class,
        ]);
        DocumentContributor::purgeDocument((int) $this->fields['id']);
    }

    /** Conteúdo e cabeçalho não vão para o Histórico (texto longo). */
    public function getNonLoggedFields(): array
    {
        return ['content', 'header_html', 'footer_text'];
    }

    /**
     * Código derivado (POP0001:00). Mesma fórmula de DocumentMeta::getCode().
     */
    public function getCode(): string
    {
        if (empty($this->fields['doctype']) || empty($this->fields['sequence'])) {
            return '';
        }
        return sprintf(
            '%s%04d:%02d',
            $this->fields['doctype'],
            (int) $this->fields['sequence'],
            (int) ($this->fields['revision'] ?? 0)
        );
    }

    // ---------------------------------------------------------------------
    // Opções de busca — também são o que faz o Histórico funcionar:
    // Log::constructHistory() só registra campo que tem opção de busca.
    // ---------------------------------------------------------------------

    public function rawSearchOptions()
    {
        $tab = [];

        $tab[] = ['id' => 'common', 'name' => __('Characteristics')];

        $tab[] = [
            'id'            => '1',
            'table'         => static::getTable(),
            'field'         => 'name',
            'name'          => __('Título', 'codexplus'),
            'datatype'      => 'itemlink',
            'massiveaction' => false,
        ];
        $tab[] = [
            'id'            => '2',
            'table'         => static::getTable(),
            'field'         => 'id',
            'name'          => __('ID'),
            'datatype'      => 'number',
            'massiveaction' => false,
        ];
        $tab[] = [
            'id'            => '3',
            'table'         => static::getTable(),
            'field'         => 'doctype',
            'name'          => __('Tipo', 'codexplus'),
            'datatype'      => 'specific',
            'massiveaction' => false,
        ];
        $tab[] = [
            'id'            => '4',
            'table'         => static::getTable(),
            'field'         => 'sequence',
            'name'          => __('Sequencial', 'codexplus'),
            'datatype'      => 'number',
            'massiveaction' => false,
        ];
        $tab[] = [
            'id'            => '5',
            'table'         => static::getTable(),
            'field'         => 'revision',
            'name'          => __('Revisão', 'codexplus'),
            'datatype'      => 'number',
            'massiveaction' => false,
        ];
        $tab[] = [
            'id'            => '6',
            'table'         => static::getTable(),
            'field'         => 'status',
            'name'          => __('Status', 'codexplus'),
            'datatype'      => 'specific',
            'massiveaction' => false,
        ];
        $tab[] = [
            'id'            => '7',
            'table'         => 'glpi_users',
            'field'         => 'name',
            'linkfield'     => 'users_id_owner',
            'name'          => __('Responsável', 'codexplus'),
            'datatype'      => 'dropdown',
            'right'         => 'all',
            'massiveaction' => false,
        ];
        $tab[] = [
            'id'            => '8',
            'table'         => static::getTable(),
            'field'         => 'validity_months',
            'name'          => __('Validade (meses)', 'codexplus'),
            'datatype'      => 'number',
            'massiveaction' => false,
        ];
        $tab[] = [
            'id'            => '9',
            'table'         => static::getTable(),
            'field'         => 'client_name',
            'name'          => __('Cliente', 'codexplus'),
            'datatype'      => 'string',
            'massiveaction' => false,
        ];
        $tab[] = [
            'id'            => '10',
            'table'         => static::getTable(),
            'field'         => 'date_published',
            'name'          => __('Publicado em', 'codexplus'),
            'datatype'      => 'datetime',
            'massiveaction' => false,
        ];
        $tab[] = [
            'id'            => '11',
            'table'         => 'glpi_users',
            'field'         => 'name',
            'linkfield'     => 'users_id',
            'name'          => __('Autor', 'codexplus'),
            'datatype'      => 'dropdown',
            'right'         => 'all',
            'massiveaction' => false,
        ];
        $tab[] = [
            'id'            => '12',
            'table'         => 'glpi_users',
            'field'         => 'name',
            'linkfield'     => 'users_id_submitter',
            'name'          => __('Enviado para validação por', 'codexplus'),
            'datatype'      => 'dropdown',
            'right'         => 'all',
            'massiveaction' => false,
        ];
        $tab[] = [
            'id'            => '13',
            'table'         => 'glpi_users',
            'field'         => 'name',
            'linkfield'     => 'users_id_validator',
            'name'          => __('Validado por', 'codexplus'),
            'datatype'      => 'dropdown',
            'right'         => 'all',
            'massiveaction' => false,
        ];
        $tab[] = [
            'id'            => '14',
            'table'         => static::getTable(),
            'field'         => 'date_validated',
            'name'          => __('Validado em', 'codexplus'),
            'datatype'      => 'datetime',
            'massiveaction' => false,
        ];
        $tab[] = [
            'id'            => '15',
            'table'         => static::getTable(),
            'field'         => 'validation_comment',
            'name'          => __('Motivo da devolução', 'codexplus'),
            'datatype'      => 'text',
            'massiveaction' => false,
        ];
        $tab[] = [
            'id'            => '19',
            'table'         => static::getTable(),
            'field'         => 'date_mod',
            'name'          => __('Last update'),
            'datatype'      => 'datetime',
            'massiveaction' => false,
        ];
        $tab[] = [
            'id'            => '121',
            'table'         => static::getTable(),
            'field'         => 'date_creation',
            'name'          => __('Creation date'),
            'datatype'      => 'datetime',
            'massiveaction' => false,
        ];
        $tab[] = [
            'id'       => '80',
            'table'    => 'glpi_entities',
            'field'    => 'completename',
            'name'     => \Entity::getTypeName(1),
            'datatype' => 'dropdown',
        ];
        $tab[] = [
            'id'       => '86',
            'table'    => static::getTable(),
            'field'    => 'is_recursive',
            'name'     => __('Child entities'),
            'datatype' => 'bool',
        ];

        return $tab;
    }

    public static function getSpecificValueToDisplay($field, $values, array $options = [])
    {
        if (!is_array($values)) {
            $values = [$field => $values];
        }
        switch ($field) {
            case 'doctype':
                return htmlescape(DocumentMeta::getDoctypeShortNames()[$values[$field]] ?? (string) $values[$field]);
            case 'status':
                return htmlescape(self::getStatuses()[$values[$field]] ?? (string) $values[$field]);
        }
        return parent::getSpecificValueToDisplay($field, $values, $options);
    }
}
