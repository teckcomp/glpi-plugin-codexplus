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
 *   Enviar   quem pode editar, com ao menos uma categoria com setor e o
 *            auditor responsável escolhido.
 *   Aprovar  (1ª etapa, R3d) Atualizar + gestor do setor. Vale mesmo para o
 *            gestor que editou: só gestor cria, e ele é quase sempre o autor.
 *   Validar  (2ª etapa) Validar + ser o AUDITOR RESPONSÁVEL do documento
 *            (users_id_auditor), ainda auditor do setor, e NÃO ter alterado o
 *            documento na revisão atual (DocumentContributor).
 *   Excluir  Excluir + gestor do setor (lixeira). Purgar: desligado.
 *   Ver todos  dispensa os papéis (inclusive "quem editou não valida"),
 *            sempre dentro dos outros bits do perfil.
 *
 * Status (R3d, Claudio, 21/09/2026 — validação em duas etapas):
 *   rascunho -> aprovacao (aguarda o gestor) -> validacao (aguarda o
 *   auditor) -> publicado -> obsoleto. Nas duas etapas dá para devolver a
 *   rascunho (motivo obrigatório). Status só muda pelos métodos submit()/
 *   managerApprove()/approve()/reject()/markObsolete(), nunca por update
 *   direto.
 *
 * Revisão periódica (R3d): revisor (users_id_reviewer) e janela no calendário
 * (review_start, review_end). Quem gere o documento escolhe; a janela vazia é
 * calculada na publicação pela regra do tipo: fim = publicação + validade do
 * tipo, início = fim - 30 dias. O vencimento passa a ser o fim da janela.
 * Abrir a revisão e "revisado sem alteração" são da R6.
 *
 * A leitura existe em DUAS formas que precisam concordar: canViewItem() e
 * getVisibilityCriteria() (SQL, para as listagens da R5). O comando
 * `plugins:codexplus:document:visibility` compara as duas.
 */
class Document extends CommonDBTM
{
    public const STATUS_DRAFT      = 'rascunho';
    public const STATUS_APPROVAL   = 'aprovacao';
    public const STATUS_VALIDATION = 'validacao';
    public const STATUS_PUBLISHED  = 'publicado';
    public const STATUS_OBSOLETE   = 'obsoleto';
    public const STATUS_KEYS = [
        self::STATUS_DRAFT, self::STATUS_APPROVAL, self::STATUS_VALIDATION, self::STATUS_PUBLISHED, self::STATUS_OBSOLETE,
    ];
    /** Status "enviado": as duas etapas da validação. */
    public const PENDING_STATUSES = [self::STATUS_APPROVAL, self::STATUS_VALIDATION];

    /** Campos que só quem gere o documento escolhe (R3d). */
    private const MANAGED_FIELDS = ['users_id_auditor', 'users_id_reviewer', 'review_start', 'review_end'];
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
            self::STATUS_APPROVAL   => __('Aguardando gestor', 'codexplus'),
            self::STATUS_VALIDATION => __('Aguardando auditor', 'codexplus'),
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

    /** É o auditor responsável deste documento (R3d)? */
    public function isAuditor(): bool
    {
        $me = (int) Session::getLoginUserID();
        return $me > 0 && (int) ($this->fields['users_id_auditor'] ?? 0) === $me;
    }

    /** É o revisor deste documento (R3d)? */
    public function isReviewer(): bool
    {
        $me = (int) Session::getLoginUserID();
        return $me > 0 && (int) ($this->fields['users_id_reviewer'] ?? 0) === $me;
    }

    /** Tem algum papel no documento (vê em qualquer status). */
    public function hasRole(): bool
    {
        return $this->isAuthorOrOwner() || $this->isEditor() || $this->isManager() || $this->isValidator()
            || $this->isAuditor() || $this->isReviewer();
    }

    /**
     * Quem responde pela etapa em que o documento está: gestores do setor
     * (aprovacao) ou o auditor responsável (validacao). Para o aviso
     * "aguardando …" da página. Vazio fora das duas etapas.
     *
     * @return int[]
     */
    public function pendingWith(): array
    {
        if ($this->status() === self::STATUS_APPROVAL) {
            return SectorMember::usersOfRole($this->getSectorIds(), SectorMember::ROLE_MANAGER);
        }
        if ($this->status() === self::STATUS_VALIDATION) {
            $a = (int) ($this->fields['users_id_auditor'] ?? 0);
            return $a > 0 ? [$a] : [];
        }
        return [];
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
        // R6-a: durante a revisão o leitor continua lendo — a versão
        // publicada anterior (a página troca o conteúdo; ver isInRevision()).
        return (in_array($this->status(), self::READER_STATUSES, true) || $this->isInRevision())
            && self::bit(Rights::READ)
            && $this->haveVisibilityAccess();
    }

    /**
     * Revisão de publicado em andamento (R6-a): revisão > 0 e fora de
     * publicado/obsoleto. A revisão só sobe por openRevision(), a partir de
     * um publicado, então existe a versão anterior guardada.
     */
    public function isInRevision(): bool
    {
        return (int) ($this->fields['revision'] ?? 0) > 0
            && in_array($this->status(), [self::STATUS_DRAFT, self::STATUS_APPROVAL, self::STATUS_VALIDATION], true);
    }

    /** O revisor está dentro da janela de revisão (as duas datas, hoje entre elas)? */
    private function reviewerInWindow(): bool
    {
        $ini = (string) ($this->fields['review_start'] ?? '');
        $fim = (string) ($this->fields['review_end'] ?? '');
        if (!$this->isReviewer() || $ini === '' || $fim === '') {
            return false;
        }
        $hoje = substr((string) ($_SESSION['glpi_currenttime'] ?? date('Y-m-d')), 0, 10);
        return $hoje >= substr($ini, 0, 10) && $hoje <= substr($fim, 0, 10);
    }

    /** Abrir revisão: publicado + (gestor, ou revisor dentro da janela, com Atualizar). */
    public function canOpenRevision(): bool
    {
        return $this->status() === self::STATUS_PUBLISHED
            && $this->checkEntity()
            && ($this->canManage() || (self::canUpdate() && $this->reviewerInWindow()));
    }

    /** "Revisado sem alteração": as mesmas pessoas de abrir revisão. */
    public function canConfirmNoChange(): bool
    {
        return $this->canOpenRevision();
    }

    /** Cancelar revisão: só quem gere o documento, com a revisão em andamento. */
    public function canCancelRevision(): bool
    {
        return $this->isInRevision() && $this->canManage();
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
            && (self::hasViewAll() || $this->isEditor() || $this->isManager()
                // R6-a: o revisor edita a revisão em andamento.
                || ($this->isReviewer() && (int) ($this->fields['revision'] ?? 0) > 0));
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

    /** 1ª etapa (R3d): o gestor do setor aprova, mesmo tendo editado. */
    public function canApprove(): bool
    {
        return $this->status() === self::STATUS_APPROVAL && $this->canManage();
    }

    /**
     * 2ª etapa: o auditor responsável valida — com o bit Validar, ainda
     * auditor do setor e sem ter alterado o documento nesta revisão. Ver
     * todos dispensa tudo isso (Super-Admin pode tudo, Claudio, 21/09/2026).
     */
    public function canValidate(): bool
    {
        if ($this->status() !== self::STATUS_VALIDATION || !self::bit(Rights::VALIDATE) || !$this->checkEntity()) {
            return false;
        }
        if (self::hasViewAll()) {
            return true;
        }
        return $this->isAuditor() && $this->isValidator() && !$this->isContributor();
    }

    /** Devolver para rascunho: quem pode decidir a etapa em que está. */
    public function canReject(): bool
    {
        return $this->canApprove() || $this->canValidate();
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
     * Alvos de leitura do documento, para a coluna "Permissões" (R3b2-a):
     * grupos, depois perfis, depois usuários, cada bloco em ordem de nome.
     * `ligacao` é o id da linha de ligação (é ela que se apaga ao tirar).
     *
     * @return array<int, array{tipo: string, ligacao: int, nome: string}>
     */
    public static function listTargets(int $documentId): array
    {
        $out = [];
        $blocos = [
            'group'   => [Document_Group::class, 'groups_id'],
            'profile' => [Document_Profile::class, 'profiles_id'],
            'user'    => [Document_User::class, 'users_id'],
        ];
        foreach ($blocos as $tipo => [$classe, $chave]) {
            $bloco = [];
            foreach ($classe::getForDocument($documentId) as $alvo => $linhas) {
                foreach ($linhas as $linha) {
                    $nome = $tipo === 'user'
                        ? getUserName((int) $alvo)
                        : \Dropdown::getDropdownName($tipo === 'group' ? 'glpi_groups' : 'glpi_profiles', (int) $alvo);
                    // Alvo restrito a uma entidade (só pelo console, por ora):
                    // a entidade aparece junto, para não parecer mais amplo do que é.
                    if (($linha['no_entity_restriction'] ?? 1) == 0 && isset($linha['entities_id'])) {
                        $nome .= ' (' . \Dropdown::getDropdownName('glpi_entities', (int) $linha['entities_id']) . ')';
                    }
                    $bloco[] = ['tipo' => $tipo, 'ligacao' => (int) $linha['id'], 'nome' => (string) $nome];
                }
            }
            usort($bloco, static fn ($a, $b) => strcasecmp($a['nome'], $b['nome']));
            $out = array_merge($out, $bloco);
        }
        return $out;
    }

    /**
     * Tipos da coluna "Permissões" (R3b2-a leitores, R3b2-b editores):
     * tipo => [classe da ligação, chave do alvo]. Fonte única para o endpoint
     * ajax/document.targets.php e para a criação (front/document.form.php).
     */
    public const PERM_TYPES = [
        'group'        => [Document_Group::class, 'groups_id'],
        'profile'      => [Document_Profile::class, 'profiles_id'],
        'user'         => [Document_User::class, 'users_id'],
        'editor_user'  => [DocumentEditor::class, 'users_id'],
        'editor_group' => [DocumentEditor::class, 'groups_id'],
    ];

    /**
     * Linha de ligação para gravar um alvo da coluna "Permissões".
     * Editor é usuário OU grupo: o outro lado vai zerado (DocumentEditor).
     *
     * @return array<string, int>|null null = tipo desconhecido
     */
    public static function permRow(string $tipo, int $documentId, int $alvo): ?array
    {
        if (!isset(self::PERM_TYPES[$tipo])) {
            return null;
        }
        [$classe, $chave] = self::PERM_TYPES[$tipo];
        if ($classe === DocumentEditor::class) {
            return [
                DocumentEditor::$items_id => $documentId,
                'users_id'                => $chave === 'users_id' ? $alvo : 0,
                'groups_id'               => $chave === 'groups_id' ? $alvo : 0,
            ];
        }
        return [$classe::$items_id_1 => $documentId, $chave => $alvo];
    }

    /**
     * Editores do documento, para a coluna "Permissões" (R3b2-b): grupos,
     * depois usuários, cada bloco por nome. Mesmo formato de listTargets().
     *
     * @return array<int, array{tipo: string, ligacao: int, nome: string}>
     */
    public static function listEditors(int $documentId): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $grupos = $usuarios = [];
        foreach ($DB->request([
            'FROM'  => DocumentEditor::getTable(),
            'WHERE' => [DocumentEditor::$items_id => $documentId],
        ]) as $row) {
            if ((int) $row['users_id'] > 0) {
                $usuarios[] = ['tipo' => 'editor_user', 'ligacao' => (int) $row['id'], 'nome' => (string) getUserName((int) $row['users_id'])];
            } elseif ((int) $row['groups_id'] > 0) {
                $grupos[] = ['tipo' => 'editor_group', 'ligacao' => (int) $row['id'],
                    'nome' => (string) \Dropdown::getDropdownName('glpi_groups', (int) $row['groups_id'])];
            }
        }
        $ordem = static fn ($a, $b) => strcasecmp($a['nome'], $b['nome']);
        usort($grupos, $ordem);
        usort($usuarios, $ordem);
        return array_merge($grupos, $usuarios);
    }

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

        // Papéis: autor, responsável, auditor, revisor, editor, gestor/auditor do setor.
        $ors = [
            [$doc . '.users_id' => $me],
            [$doc . '.users_id_owner' => $me],
            // R3d: auditor responsável e revisor também têm papel.
            [$doc . '.users_id_auditor' => $me],
            [$doc . '.users_id_reviewer' => $me],
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
        // R6-a: também durante a revisão (revisão > 0 fora de publicado), com
        // a versão anterior na tela — espelho de isInRevision().
        $ors[] = ['AND' => [$targets, ['OR' => [
            [$doc . '.status' => self::READER_STATUSES],
            [
                $doc . '.revision' => ['>', 0],
                $doc . '.status'   => [self::STATUS_DRAFT, self::STATUS_APPROVAL, self::STATUS_VALIDATION],
            ],
        ]]]];

        $where[] = ['OR' => $ors];
        return ['LEFT JOIN' => $join, 'WHERE' => $where];
    }

    // ---------------------------------------------------------------------
    // Fluxo: enviar, validar, devolver, obsoleto
    // ---------------------------------------------------------------------

    /**
     * Envia para validação. Exige categoria com setor (senão ninguém valida).
     * Numa revisão (R6-a), exige também o resumo do que mudou.
     */
    public function submit(string $summary = ''): bool
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
        // 2ª etapa precisa de alguém: o auditor responsável, que ainda seja
        // auditor do setor. Ver todos envia sem (e valida ele mesmo).
        if (!self::hasViewAll()) {
            $auditor = (int) ($this->fields['users_id_auditor'] ?? 0);
            if ($auditor <= 0) {
                return $this->deny(__('Escolha o auditor responsável antes de enviar.', 'codexplus'));
            }
            if (!in_array($auditor, SectorMember::usersOfRole($this->getSectorIds(), SectorMember::ROLE_VALIDATOR), true)) {
                return $this->deny(__('O auditor escolhido não é mais auditor do setor. Escolha outro.', 'codexplus'));
            }
        }
        $extra = [];
        if ((int) $this->fields['revision'] > 0) {
            $summary = trim($summary);
            if ($summary === '') {
                return $this->deny(__('Numa revisão, informe o resumo do que mudou antes de enviar.', 'codexplus'));
            }
            $extra['revision_summary'] = $summary;
        }
        return $this->transition($extra + [
            'status'             => self::STATUS_APPROVAL,
            'users_id_submitter' => (int) Session::getLoginUserID(),
            'date_submitted'     => $_SESSION['glpi_currenttime'],
            'users_id_approver'  => 0,
            'date_approved'      => null,
            'validation_comment' => null,
        ]);
    }

    /** 1ª etapa: o gestor do setor aprova e o documento vai ao auditor. */
    public function managerApprove(): bool
    {
        if (!$this->canApprove()) {
            return $this->deny(__('Sem direito de aprovar este documento (é preciso ser gestor do setor).', 'codexplus'));
        }
        return $this->transition([
            'status'            => self::STATUS_VALIDATION,
            'users_id_approver' => (int) Session::getLoginUserID(),
            'date_approved'     => $_SESSION['glpi_currenttime'],
        ]);
    }

    /**
     * 2ª etapa: o auditor valida e o documento é publicado. Janela de
     * revisão vazia é calculada aqui pela regra do tipo.
     */
    public function approve(): bool
    {
        if (!$this->canValidate()) {
            if ($this->status() === self::STATUS_VALIDATION && $this->isAuditor() && $this->isContributor()) {
                return $this->deny(__('Você alterou este documento nesta revisão: outra pessoa precisa validar.', 'codexplus'));
            }
            if ($this->status() === self::STATUS_APPROVAL) {
                return $this->deny(__('Ainda na 1ª etapa: falta a aprovação do gestor do setor.', 'codexplus'));
            }
            if ($this->status() === self::STATUS_VALIDATION && !$this->isAuditor()) {
                return $this->deny(__('Só o auditor responsável valida este documento.', 'codexplus'));
            }
            return $this->deny(__('Sem direito de validar este documento.', 'codexplus'));
        }
        $data = DocumentMeta::stampPublishDate([
            'status'             => self::STATUS_PUBLISHED,
            'users_id_validator' => (int) Session::getLoginUserID(),
            'date_validated'     => $_SESSION['glpi_currenttime'],
            'validation_comment' => null,
        ], $this->fields['date_published'] ?? null);
        // R6-a: publicar uma revisão é uma publicação nova — data de hoje e
        // janela recalculada a partir dela.
        $revisao = (int) $this->fields['revision'] > 0;
        if ($revisao) {
            $data['date_published'] = $_SESSION['glpi_currenttime'];
        }
        if ($revisao || (empty($this->fields['review_start']) && empty($this->fields['review_end']))) {
            $win = self::defaultWindow(
                (string) ($data['date_published'] ?? $this->fields['date_published'] ?? $_SESSION['glpi_currenttime']),
                (int) ($this->fields['validity_months'] ?? 0)
            );
            if ($win !== null) {
                $data['review_start'] = $win[0];
                $data['review_end']   = $win[1];
            }
        }
        if (!$this->transition($data)) {
            return false;
        }
        DocumentVersion::snapshot($this);
        return true;
    }

    /**
     * Abre a revisão seguinte (R6-a): a revisão sobe (:00 -> :01) e o
     * documento volta a rascunho COM o conteúdo atual. A versão em vigor fica
     * guardada (e é a que os leitores continuam vendo).
     */
    public function openRevision(): bool
    {
        if (!$this->canOpenRevision()) {
            return $this->deny(__('Sem direito de abrir revisão (é preciso ser gestor do setor, ou o revisor dentro da janela).', 'codexplus'));
        }
        // Documento publicado antes da R6 ainda não tem a cópia: faz agora.
        if (DocumentVersion::get((int) $this->fields['id'], (int) $this->fields['revision']) === null) {
            DocumentVersion::snapshot($this);
        }
        return $this->transition([
            'revision'           => (int) $this->fields['revision'] + 1,
            'status'             => self::STATUS_DRAFT,
            'users_id_submitter' => 0,
            'date_submitted'     => null,
            'users_id_approver'  => 0,
            'date_approved'      => null,
            'validation_comment' => null,
            'revision_summary'   => null,
        ]);
    }

    /**
     * Cancela a revisão (R6-a, gestor): descarta o que mudou e devolve o
     * documento à versão publicada anterior, como publicado.
     */
    public function cancelRevision(): bool
    {
        if (!$this->canCancelRevision()) {
            return $this->deny(__('Sem direito de cancelar esta revisão.', 'codexplus'));
        }
        $anterior = (int) $this->fields['revision'] - 1;
        $v = DocumentVersion::get((int) $this->fields['id'], $anterior);
        if ($v === null) {
            return $this->deny(__('A versão publicada anterior não foi encontrada; a revisão não pode ser cancelada.', 'codexplus'));
        }
        $ok = $this->transition([
            'revision'           => $anterior,
            'status'             => self::STATUS_PUBLISHED,
            'name'               => (string) $v['name'],
            'content'            => (string) $v['content'],
            'users_id_submitter' => 0,
            'date_submitted'     => null,
            'users_id_approver'  => 0,
            'date_approved'      => null,
            'validation_comment' => null,
            'revision_summary'   => null,
        ]);
        if ($ok && ($d = DocumentVersion::diagramOf($v)) !== null) {
            Diagram::save((int) $this->fields['id'], $d);
        }
        return $ok;
    }

    /**
     * "Revisado sem alteração" (R6-a): vale na hora, sem auditor — não há
     * conteúdo novo. Renova a janela a partir de hoje pela regra do tipo; a
     * revisão não sobe. Fica no Histórico (janela nova, quem, quando).
     */
    public function confirmNoChange(): bool
    {
        if (!$this->canConfirmNoChange()) {
            return $this->deny(__('Sem direito de confirmar a revisão deste documento.', 'codexplus'));
        }
        $win = self::defaultWindow((string) $_SESSION['glpi_currenttime'], (int) ($this->fields['validity_months'] ?? 0));
        if ($win === null) {
            return $this->deny(__('Este tipo não tem validade padrão: defina a nova janela de revisão à mão.', 'codexplus'));
        }
        return $this->transition(['review_start' => $win[0], 'review_end' => $win[1]]);
    }

    /**
     * Janela padrão da revisão (R3d): fim = publicação + validade do tipo;
     * início = fim - 30 dias (a mesma janela do "a vencer"). Validade 0
     * (proposta, diversos): sem janela, quem publica define.
     *
     * @return array{0: string, 1: string}|null  [início, fim] em Y-m-d
     */
    public static function defaultWindow(string $published, int $months): ?array
    {
        $base = strtotime($published);
        if ($months <= 0 || $base === false) {
            return null;
        }
        $end = strtotime('+' . $months . ' months', $base);
        $start = strtotime('-' . DocumentMeta::EXPIRY_WINDOW_DAYS . ' days', $end);
        return [date('Y-m-d', $start), date('Y-m-d', $end)];
    }

    /** Devolve para rascunho com o motivo (obrigatório), em qualquer das etapas. */
    public function reject(string $comment): bool
    {
        if (!$this->canReject()) {
            return $this->deny(__('Sem direito de devolver este documento.', 'codexplus'));
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
            $input['validity_months'] = DocumentMeta::defaultValidity((string) $input['doctype']);
        }
        unset($input['date_published'], $input['users_id_validator'], $input['date_validated'],
            $input['users_id_submitter'], $input['date_submitted'], $input['validation_comment'],
            $input['users_id_approver'], $input['date_approved']);

        // Auditor, revisor e janela já na criação (R3d). Quem cria é gestor
        // de todos os setores das categorias (ou Ver todos): pode escolher.
        return $this->checkManagedFields($input, self::sectorsOfCategories($cats), true);
    }

    /**
     * Auditor, revisor e janela de revisão (R3d): normaliza e confere.
     *   - só quem gere o documento muda (na criação, quem cria já gere);
     *   - o auditor muda só em rascunho e tem que ser auditor do setor;
     *   - janela: as duas datas ou nenhuma, e início até o fim.
     * Devolve o input ou false (com a mensagem na sessão).
     *
     * @param int[] $sectors setores do documento
     * @return array<string, mixed>|false
     */
    private function checkManagedFields(array $input, array $sectors, bool $novo)
    {
        $old = static function (string $f, array $fields) {
            if (str_starts_with($f, 'review_')) {
                return empty($fields[$f]) ? null : substr((string) $fields[$f], 0, 10);
            }
            return (int) ($fields[$f] ?? 0);
        };
        $atual   = $novo ? [] : $this->fields;
        $mudou   = [];
        foreach (self::MANAGED_FIELDS as $f) {
            if (!array_key_exists($f, $input)) {
                continue;
            }
            if (str_starts_with($f, 'review_')) {
                $v = trim((string) ($input[$f] ?? ''));
                if ($v === '' || strtoupper($v) === 'NULL') {
                    $input[$f] = null;
                } else {
                    $d = \DateTime::createFromFormat('!Y-m-d', substr($v, 0, 10));
                    if ($d === false || $d->format('Y-m-d') !== substr($v, 0, 10)) {
                        return $this->deny(__('Data da janela de revisão inválida.', 'codexplus'));
                    }
                    $input[$f] = $d->format('Y-m-d');
                }
            } else {
                $input[$f] = max(0, (int) $input[$f]);
            }
            if ($input[$f] !== $old($f, $atual)) {
                $mudou[$f] = true;
            }
        }
        if ($mudou === []) {
            return $input;
        }
        if (!$novo && !$this->canManage()) {
            return $this->deny(__('Só quem gere o documento escolhe auditor, revisor e janela de revisão.', 'codexplus'));
        }
        if (isset($mudou['users_id_auditor'])) {
            if (!$novo && $this->status() !== self::STATUS_DRAFT) {
                return $this->deny(__('O auditor responsável só muda em rascunho.', 'codexplus'));
            }
            $a = (int) $input['users_id_auditor'];
            if ($a > 0 && !in_array($a, SectorMember::usersOfRole($sectors, SectorMember::ROLE_VALIDATOR), true)) {
                return $this->deny(__('O auditor responsável tem que ser auditor do setor do documento.', 'codexplus'));
            }
        }
        $ini = array_key_exists('review_start', $input) ? $input['review_start'] : $old('review_start', $atual);
        $fim = array_key_exists('review_end', $input) ? $input['review_end'] : $old('review_end', $atual);
        if (($ini === null) !== ($fim === null)) {
            return $this->deny(__('Informe as duas datas da janela de revisão, ou nenhuma.', 'codexplus'));
        }
        if ($ini !== null && $ini > $fim) {
            return $this->deny(__('A janela de revisão começa depois de terminar.', 'codexplus'));
        }
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
        unset($input['doctype'], $input['sequence'], $input['knowbaseitems_id'], $input['users_id']);
        // Revisão e resumo da revisão só mudam pelo fluxo (R6-a).
        if (!$this->inTransition) {
            unset($input['revision'], $input['revision_summary']);
        }

        $input = DocumentMeta::sanitizeFields($input, self::STATUS_KEYS);

        if (!$this->inTransition) {
            // Status e dados de validação só mudam pelos métodos de fluxo.
            foreach (['status', 'users_id_submitter', 'date_submitted', 'users_id_validator',
                'date_validated', 'validation_comment', 'date_published', 'users_id_approver', 'date_approved'] as $f) {
                if (array_key_exists($f, $input) && (string) $input[$f] !== (string) ($this->fields[$f] ?? '')) {
                    return $this->deny(__('O status muda só pelo fluxo: enviar, aprovar, validar, devolver ou tornar obsoleto.', 'codexplus'));
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
            $input = $this->checkManagedFields($input, $this->getSectorIds(), false);
            if ($input === false) {
                return false;
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
        Diagram::purgeDocument((int) $this->fields['id']);
        DocumentVersion::purgeDocument((int) $this->fields['id']);
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
        // R3d — sem opção de busca o Histórico não registra o campo (achado 33).
        foreach ([
            ['16', 'users_id_auditor', __('Auditor responsável', 'codexplus')],
            ['17', 'users_id_approver', __('Aprovado pelo gestor', 'codexplus')],
            ['18', 'users_id_reviewer', __('Revisor', 'codexplus')],
        ] as [$sid, $link, $rotulo]) {
            $tab[] = [
                'id'            => $sid,
                'table'         => 'glpi_users',
                'field'         => 'name',
                'linkfield'     => $link,
                'name'          => $rotulo,
                'datatype'      => 'dropdown',
                'right'         => 'all',
                'massiveaction' => false,
            ];
        }
        foreach ([
            ['20', 'date_approved', __('Aprovado em', 'codexplus'), 'datetime'],
            ['22', 'review_start', __('Revisão: início', 'codexplus'), 'date'],
            ['23', 'review_end', __('Revisão: fim', 'codexplus'), 'date'],
            ['24', 'revision_summary', __('Resumo da revisão', 'codexplus'), 'text'],
        ] as [$sid, $campo, $rotulo, $tipo]) {
            $tab[] = [
                'id'            => $sid,
                'table'         => static::getTable(),
                'field'         => $campo,
                'name'          => $rotulo,
                'datatype'      => $tipo,
                'massiveaction' => false,
            ];
        }
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
