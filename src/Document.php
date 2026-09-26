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
 *            documento (gestor do setor, editor, auditor, revisor) e o autor e
 *            o responsável leem em qualquer status.
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
 *   Validar  (2ª etapa) bit Auditor no perfil ativo + ser o AUDITOR
 *            RESPONSÁVEL do documento (users_id_auditor) + NÃO ter alterado o
 *            documento na revisão atual (DocumentContributor) + NÃO ter
 *            aprovado a 1ª etapa, salvo documento só de setor de auditoria
 *            (A2). Desde a A1 (Claudio, 25/09/2026) o auditor vem do PERFIL,
 *            não do setor: Rights::auditorUsers(). O auditor impedido ainda
 *            pode DEVOLVER (senão o documento ficaria preso).
 *   Super-Admin (A2, Rights::isSuperAdmin(): Configurar > Atualizar) valida
 *            qualquer documento, sem regra nenhuma.
 *   Excluir  Excluir + gestor do setor (lixeira). Purgar: desligado.
 *   Ver todos  dispensa os papéis de leitura, criação e gestão, sempre
 *            dentro dos outros bits do perfil. Desde a A2 NÃO dispensa as
 *            regras da validação (isso é só do Super-Admin).
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
    private const MANAGED_FIELDS = ['users_id_owner', 'users_id_auditor', 'users_id_reviewer', 'review_start', 'review_end'];
    /** Status que o leitor comum (alvo) enxerga. */
    public const READER_STATUSES = [self::STATUS_PUBLISHED, self::STATUS_OBSOLETE];

    /** Campos cuja mudança conta como "alterar o documento" (contribuição). */
    private const CONTENT_FIELDS = ['name', 'content', 'header_html', 'footer_text', 'client_name', 'client_itemtype', 'client_items_id'];

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
            self::STATUS_APPROVAL   => __('Aguardando responsável', 'codexplus'),
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
        if (self::helpdesk()) {
            return self::bit(Rights::READ);
        }
        return (bool) Session::haveRightsOr(Rights::NAME, [Rights::READ, Rights::VIEWALL]);
    }

    /** S1: na interface simplificada o Codex+ é só leitura. */
    private static function helpdesk(): bool
    {
        return Session::getCurrentInterface() === 'helpdesk';
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
        // S1: Self-Service só lê, mesmo que o perfil tenha outro bit gravado.
        if ($bit !== Rights::READ && self::helpdesk()) {
            return false;
        }
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

    /** É o responsável (gestor do documento, P1)? Aprova a 1ª etapa. */
    public function isOwner(): bool
    {
        $me = (int) Session::getLoginUserID();
        return $me > 0 && (int) ($this->fields['users_id_owner'] ?? 0) === $me;
    }

    /** É o autor (quem criou)? */
    public function isAuthor(): bool
    {
        $me = (int) Session::getLoginUserID();
        return $me > 0 && (int) ($this->fields['users_id'] ?? 0) === $me;
    }

    /**
     * Edita o rascunho (P1, Claudio 26/09/2026): responsável, revisor e
     * autor. O auditor não edita: só aprova ou devolve.
     */
    public function isEditor(): bool
    {
        return $this->isOwner() || $this->isReviewer() || $this->isAuthor();
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

    /** Foi quem aprovou a 1ª etapa (A2)? */
    public function isApprover(): bool
    {
        $me = (int) Session::getLoginUserID();
        return $me > 0 && (int) ($this->fields['users_id_approver'] ?? 0) === $me;
    }

    /**
     * Documento só de setor de auditoria (A2): tem setor e TODOS os setores
     * dele estão marcados como de auditoria. Basta um setor comum para a
     * regra "quem aprovou não valida" valer.
     */
    public function isAuditSectorOnly(): bool
    {
        $s = $this->getSectorIds();
        return $s !== [] && count(Sector::auditOnes($s)) === count($s);
    }

    /**
     * Por que o auditor responsável não consegue validar (A2), para os avisos
     * da página e do Painel: 'perfil' (perfil ativo sem o bit Auditar),
     * 'aprovou' (aprovou a 1ª etapa). Vazio
     * se ele pode validar ou se não é o auditor desta etapa.
     */
    public function validationBlocker(): string
    {
        if ($this->status() !== self::STATUS_VALIDATION || !$this->isAuditor() || $this->canValidate()) {
            return '';
        }
        if (!self::bit(Rights::VALIDATE)) {
            return 'perfil';
        }
        if ($this->isApprover() && !$this->isAuditSectorOnly()) {
            return 'aprovou';
        }
        return '';
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
        return $this->isEditor() || $this->isAuditor();
    }

    /**
     * Quem responde pela etapa em que o documento está: o responsável
     * (aprovacao) ou o auditor responsável (validacao). Para o aviso
     * "aguardando …" da página. Vazio fora das duas etapas.
     *
     * @return int[]
     */
    public function pendingWith(): array
    {
        if ($this->status() === self::STATUS_APPROVAL) {
            $o = (int) ($this->fields['users_id_owner'] ?? 0);
            return $o > 0 ? [$o] : [];
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

    /** Fluxo do tipo deste documento (P2): full, one ou direct. */
    public function flow(): string
    {
        return DocumentMeta::flowOf((string) ($this->fields['doctype'] ?? ''));
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
        // R5: o Super-Admin lê tudo pela regra, não só pelo bit Ver todos.
        if (self::hasViewAll() || Rights::isSuperAdmin() || $this->hasRole()) {
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

    /** Abrir revisão: publicado + (responsável, ou revisor dentro da janela). */
    public function canOpenRevision(): bool
    {
        return $this->status() === self::STATUS_PUBLISHED
            && $this->checkEntity()
            && ($this->canManage() || $this->reviewerInWindow());
    }

    /** "Revisado sem alteração": as mesmas pessoas de abrir revisão. */
    public function canConfirmNoChange(): bool
    {
        return $this->canOpenRevision();
    }

    /** Cancelar revisão: o responsável, com a revisão em andamento. */
    public function canCancelRevision(): bool
    {
        return $this->isInRevision() && $this->checkEntity() && (Rights::isSuperAdmin() || $this->isOwner());
    }

    /** Criar (P1): o bit Criar basta, em qualquer categoria. */
    public function canCreateItem(): bool
    {
        return $this->checkEntity() && self::canCreate();
    }

    /**
     * Mantido para quem chama com categorias (Duplicar): desde a P1 a
     * categoria não restringe a criação.
     *
     * @param int[] $categoryIds
     */
    public static function canCreateIn(array $categoryIds): bool
    {
        return self::canCreate();
    }

    /** Editar (P1): só em rascunho, por responsável, revisor ou autor. */
    public function canUpdateItem(): bool
    {
        return $this->checkEntity()
            && $this->status() === self::STATUS_DRAFT
            && (Rights::isSuperAdmin() || $this->isEditor());
    }

    /**
     * Gerir o documento (responsável, auditor, revisor, janela, categorias,
     * leitores, obsoleto): o responsável; em rascunho, também o autor.
     */
    public function canManage(): bool
    {
        if (!$this->checkEntity()) {
            return false;
        }
        return Rights::isSuperAdmin()
            || $this->isOwner()
            || ($this->isAuthor() && $this->status() === self::STATUS_DRAFT);
    }

    public function canDeleteItem(): bool
    {
        return self::canDelete() && $this->canManage();
    }

    public function canSubmit(): bool
    {
        return $this->flow() !== DocumentMeta::FLOW_DIRECT && $this->canUpdateItem();
    }

    /** Publicar direto (P2, Proposta e Laudo): o responsável, em rascunho. */
    public function canPublishDirect(): bool
    {
        return $this->flow() === DocumentMeta::FLOW_DIRECT
            && $this->status() === self::STATUS_DRAFT
            && $this->checkEntity()
            && (Rights::isSuperAdmin() || (self::bit(Rights::APPROVE) && $this->isOwner()));
    }

    /** 1ª etapa (P1): o responsável, com o bit Aprovar, aprova. */
    public function canApprove(): bool
    {
        if ($this->status() !== self::STATUS_APPROVAL || !$this->checkEntity()) {
            return false;
        }
        return Rights::isSuperAdmin() || (self::bit(Rights::APPROVE) && $this->isOwner());
    }

    /**
     * 2ª etapa: o auditor responsável valida — com o bit Auditor no perfil
     * ativo, sem ter alterado o documento nesta revisão (A1: o auditor vem
     * do perfil, não do setor) e sem ter aprovado a 1ª etapa, salvo em
     * documento só de setor de auditoria (A2). O Super-Admin (Configurar >
     * Atualizar) valida qualquer um, sem regra (Claudio, 25/09/2026); Ver
     * todos não dispensa mais nada aqui.
     */
    public function canValidate(): bool
    {
        if ($this->status() !== self::STATUS_VALIDATION || !$this->checkEntity()) {
            return false;
        }
        if (Rights::isSuperAdmin()) {
            return true;
        }
        return self::bit(Rights::VALIDATE)
            && $this->isAuditor()
            && (!$this->isApprover() || $this->isAuditSectorOnly());
    }

    /**
     * Devolver para rascunho: quem pode decidir a etapa em que está. Na 2ª
     * etapa, também o auditor responsável impedido de validar (editou ou
     * aprovou a 1ª etapa, A2): devolver não publica nada, e sem isso o
     * documento ficaria preso esperando por ele.
     */
    public function canReject(): bool
    {
        if ($this->canApprove() || $this->canValidate()) {
            return true;
        }
        return $this->status() === self::STATUS_VALIDATION
            && $this->checkEntity()
            && self::bit(Rights::VALIDATE)
            && $this->isAuditor();
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
    ];

    /**
     * Linha de ligação para gravar um alvo da coluna "Permissões".
     *
     * @return array<string, int>|null null = tipo desconhecido
     */
    public static function permRow(string $tipo, int $documentId, int $alvo): ?array
    {
        if (!isset(self::PERM_TYPES[$tipo])) {
            return null;
        }
        [$classe, $chave] = self::PERM_TYPES[$tipo];
        return [$classe::$items_id_1 => $documentId, $chave => $alvo];
    }

    /**
     * Anexos do documento (R3b3-1): documentos do GLPI ligados a ele, fora
     * os que são imagem colada no corpo (aparecem no texto, não na lista).
     * O link de download leva itemtype/items_id: o GLPI confere de novo se
     * quem baixa lê este documento (\Document::canViewFileFromItem).
     *
     * @return array<int, array{link: int, docid: int, name: string, mime: string, url: string, date: string}>
     */
    public static function listAttachments(int $documentId, string $content = ''): array
    {
        /** @var \DBmysql $DB */
        global $DB, $CFG_GLPI;

        // Imagem colada: o corpo gravado aponta para document.send.php?docid=N.
        preg_match_all('/docid=(\d+)/', $content, $m);
        $inline = array_map('intval', $m[1] ?? []);

        $out = [];
        foreach ($DB->request([
            'SELECT'     => ['glpi_documents.id', 'glpi_documents.name', 'glpi_documents.filename',
                'glpi_documents.mime', 'glpi_documents_items.id AS link', 'glpi_documents_items.date_creation AS assocdate'],
            'FROM'       => 'glpi_documents_items',
            'INNER JOIN' => ['glpi_documents' => ['ON' => ['glpi_documents_items' => 'documents_id', 'glpi_documents' => 'id']]],
            'WHERE'      => [
                'glpi_documents_items.itemtype' => self::class,
                'glpi_documents_items.items_id' => $documentId,
                'glpi_documents.is_deleted'     => 0,
            ],
            'ORDER'      => ['glpi_documents.filename ASC'],
        ]) as $row) {
            if (in_array((int) $row['id'], $inline, true)) {
                continue;
            }
            // E4: PNG de uma anotação substituída (a atual está no corpo e já
            // saiu acima). É derivado, não anexo de ninguém.
            // Q1: PNG e planta de fundo dos quadros, idem.
            if (str_starts_with(strtolower((string) $row['filename']), 'cx-anotacao-')
                || str_starts_with(strtolower((string) $row['filename']), 'cx-quadro-')) {
                continue;
            }
            $out[] = [
                'link'  => (int) $row['link'],
                'docid' => (int) $row['id'],
                'name'  => (string) ($row['filename'] !== '' ? $row['filename'] : $row['name']),
                'mime'  => (string) $row['mime'],
                'url'   => $CFG_GLPI['root_doc'] . '/front/document.send.php?docid=' . (int) $row['id']
                    . '&itemtype=' . rawurlencode(self::class) . '&items_id=' . $documentId,
                'date'  => (string) ($row['assocdate'] ?? ''),
            ];
        }
        return $out;
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

        if (self::hasViewAll() || Rights::isSuperAdmin()) { // R5: espelho de canViewItem
            return ['LEFT JOIN' => $join, 'WHERE' => $where];
        }

        $groups = array_values($_SESSION['glpigroups'] ?? []);

        // Papéis (P1): autor, responsável, auditor, revisor.
        $ors = [
            [$doc . '.users_id' => $me],
            [$doc . '.users_id_owner' => $me],
            // R3d: auditor responsável e revisor também têm papel.
            [$doc . '.users_id_auditor' => $me],
            [$doc . '.users_id_reviewer' => $me],
        ];

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
        // 1ª etapa precisa do responsável com o bit Aprovar (P1).
        if (!Rights::isSuperAdmin()) {
            $owner = (int) ($this->fields['users_id_owner'] ?? 0);
            if ($owner <= 0) {
                return $this->deny(__('Escolha o responsável antes de enviar: é ele quem aprova a 1ª etapa.', 'codexplus'));
            }
            if (!in_array($owner, Rights::approverUsers((int) $this->fields['entities_id']), true)) {
                return $this->deny(__('O responsável escolhido não tem o direito Aprovar no perfil. Escolha outro.', 'codexplus'));
            }
        }
        // 2ª etapa precisa de alguém (só no fluxo completo, P2): o auditor responsável, que ainda tenha
        // um perfil com o bit Auditor na entidade (A1). Só o Super-Admin
        // envia sem (e valida ele mesmo) — A2: Ver todos não basta mais.
        if (!Rights::isSuperAdmin() && $this->flow() === DocumentMeta::FLOW_FULL) {
            $auditor = (int) ($this->fields['users_id_auditor'] ?? 0);
            if ($auditor <= 0) {
                return $this->deny(__('Escolha o auditor responsável antes de enviar.', 'codexplus'));
            }
            if (!in_array($auditor, Rights::auditorUsers((int) $this->fields['entities_id']), true)) {
                return $this->deny(__('O auditor escolhido não tem mais um perfil de auditor. Escolha outro.', 'codexplus'));
            }
            if ($auditor === (int) ($this->fields['users_id_owner'] ?? 0) && !$this->isAuditSectorOnly()) {
                return $this->deny(__('Responsável e auditor não podem ser a mesma pessoa (quem aprova não audita).', 'codexplus'));
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

    /**
     * 1ª etapa: o responsável aprova e o documento vai ao auditor. A
     * observação (opcional) fica em validation_comment, visível na página.
     */
    public function managerApprove(string $comment = ''): bool
    {
        if (!$this->canApprove()) {
            return $this->deny(__('Sem direito de aprovar este documento (é preciso ser o responsável, com o direito Aprovar).', 'codexplus'));
        }
        $comment = trim($comment);
        $aprov = [
            'users_id_approver' => (int) Session::getLoginUserID(),
            'date_approved'     => $_SESSION['glpi_currenttime'],
        ];
        // P2: sem auditor (Documentação Técnica), a aprovação já publica.
        if ($this->flow() !== DocumentMeta::FLOW_FULL) {
            return $this->publishNow($comment, $aprov);
        }
        return $this->transition($aprov + [
            'status'             => self::STATUS_VALIDATION,
            'validation_comment' => $comment === '' ? null : $comment,
        ]);
    }

    /**
     * Publicar direto (P2, Proposta e Laudo): o responsável publica o
     * rascunho, sem etapas. Numa revisão, com o resumo do que mudou.
     */
    public function publishDirect(string $summary = ''): bool
    {
        if (!$this->canPublishDirect()) {
            return $this->deny(__('Sem direito de publicar este documento (é preciso ser o responsável, com o direito Aprovar).', 'codexplus'));
        }
        $extra = [];
        if ((int) $this->fields['revision'] > 0) {
            $summary = trim($summary);
            if ($summary === '') {
                return $this->deny(__('Numa revisão, informe o resumo do que mudou antes de publicar.', 'codexplus'));
            }
            $extra['revision_summary'] = $summary;
        }
        $me = (int) Session::getLoginUserID();
        return $this->publishNow('', $extra + [
            'users_id_submitter' => $me,
            'date_submitted'     => $_SESSION['glpi_currenttime'],
            'users_id_approver'  => $me,
            'date_approved'      => $_SESSION['glpi_currenttime'],
        ]);
    }

    /**
     * 2ª etapa: o auditor valida e o documento é publicado. Janela de
     * revisão vazia é calculada aqui pela regra do tipo.
     */
    public function approve(string $comment = ''): bool
    {
        if (!$this->canValidate()) {
            if ($this->validationBlocker() === 'aprovou') {
                return $this->deny(__('Você aprovou a 1ª etapa deste documento: outro auditor precisa validar. Você ainda pode devolvê-lo.', 'codexplus'));
            }
            if ($this->status() === self::STATUS_APPROVAL) {
                return $this->deny(__('Ainda na 1ª etapa: falta a aprovação do responsável.', 'codexplus'));
            }
            if ($this->status() === self::STATUS_VALIDATION && !$this->isAuditor()) {
                return $this->deny(__('Só o auditor responsável valida este documento.', 'codexplus'));
            }
            return $this->deny(__('Sem direito de validar este documento.', 'codexplus'));
        }
        return $this->publishNow($comment);
    }

    /**
     * Publica (fim de qualquer fluxo): data, janela de revisão pela regra do
     * tipo e cópia da versão. $extra vai junto na mesma gravação.
     */
    private function publishNow(string $comment, array $extra = []): bool
    {
        $data = DocumentMeta::stampPublishDate($extra + [
            'status'             => self::STATUS_PUBLISHED,
            'users_id_validator' => (int) Session::getLoginUserID(),
            'date_validated'     => $_SESSION['glpi_currenttime'],
            'validation_comment' => trim($comment) === '' ? null : trim($comment),
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
            return $this->deny(__('Sem direito de abrir revisão (é preciso ser o responsável, ou o revisor dentro da janela).', 'codexplus'));
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

    /**
     * Imagem colada sem link em volta (R3b3-1, correção de 22/09/2026).
     * O GLPI (Toolbox::convertTagToImage, chamado pelo addFiles) embrulha
     * cada imagem num <a target="_blank"> para abrir o arquivo. No documento
     * isso atrapalha: o editor trata a imagem como link (botão de link aceso,
     * ícone de "abrir") e o clique na imagem sai da página. Tira só o link
     * que aponta para o próprio arquivo da imagem.
     * Imagem nova já nasce sem o link (addFiles com `_add_link = false`);
     * isto limpa o que foi gravado antes, no primeiro Salvar.
     */
    private static function unwrapImageLinks(string $html): string
    {
        $out = preg_replace(
            '#<a\b[^>]*href=(["\'])[^"\']*document\.send\.php\?docid=(\d+)[^"\']*\1[^>]*>\s*'
            . '(<img\b[^>]*document\.send\.php\?docid=\2(?!\d)[^>]*>)\s*</a>#i',
            '$3',
            $html
        );
        return $out ?? $html;
    }

    public function prepareInputForAdd($input)
    {
        $input = DocumentMeta::sanitizeFields($input, self::STATUS_KEYS);
        if (isset($input['content'])) {
            $input['content'] = self::unwrapImageLinks((string) $input['content']);
        }

        $input['name'] = trim((string) ($input['name'] ?? ''));
        if ($input['name'] === '') {
            return $this->deny(__('Informe o título do documento.', 'codexplus'));
        }
        if (empty($input['doctype'])) {
            return $this->deny(__('Informe o tipo do documento.', 'codexplus'));
        }
        $input = $this->normalizeClient($input, (string) $input['doctype']);
        if ($input === false) {
            return false;
        }

        // Categorias (P1): opcionais, qualquer uma; o setor é organização.
        if (!self::canCreate()) {
            return $this->deny(__('Sem direito de criar documentos.', 'codexplus'));
        }
        $input['_categories'] = array_values(array_filter(array_unique(array_map('intval', (array) ($input['_categories'] ?? [])))));

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

        // Responsável, auditor, revisor e janela já na criação: quem cria escolhe.
        $ent = (int) ($input['entities_id'] ?? Session::getActiveEntity());
        return $this->checkManagedFields(self::dropUnusedRoles($input, (string) $input['doctype']), $ent, true);
    }

    /**
     * P2: papéis que o fluxo do tipo não usa são ignorados — auditor fora do
     * fluxo completo; revisor e janela no fluxo direto.
     */
    private static function dropUnusedRoles(array $input, string $doctype): array
    {
        $flow = DocumentMeta::flowOf($doctype);
        if ($flow !== DocumentMeta::FLOW_FULL) {
            unset($input['users_id_auditor']);
        }
        if ($flow === DocumentMeta::FLOW_DIRECT) {
            unset($input['users_id_reviewer'], $input['review_start'], $input['review_end']);
        }
        return $input;
    }

    /**
     * Cliente vinculado (bloco T1): Laudo e Documentação Técnica apontam para
     * um usuário ou uma entidade do GLPI (client_itemtype + client_items_id,
     * o padrão do Document_Item nativo). O nome vai também para client_name,
     * que já está no Histórico, no Painel e no PDF: é o retrato do nome na
     * hora da escolha; a tela mostra o nome atual (clientName).
     *   - tipo sem cliente vinculado: os dois campos são ignorados;
     *   - id vazio (0 ou -1): tira o cliente;
     *   - itemtype fora da lista: o da configuração da instalação;
     *   - a entidade raiz (0) não é cliente (é a própria empresa).
     * O vínculo não dá leitura a ninguém.
     *
     * @return array<string, mixed>|false
     */
    private function normalizeClient(array $input, string $doctype)
    {
        if (!array_key_exists('client_items_id', $input) && !array_key_exists('client_itemtype', $input)) {
            return $input;
        }
        if (!DocumentMeta::linksClient($doctype)) {
            unset($input['client_itemtype'], $input['client_items_id']);
            return $input;
        }
        $cid  = (int) ($input['client_items_id'] ?? 0);
        $type = (string) ($input['client_itemtype'] ?? '');
        if ($cid <= 0) {
            $input['client_itemtype'] = '';
            $input['client_items_id'] = 0;
            $input['client_name']     = '';
            return $input;
        }
        if (!array_key_exists($type, Branding::getClientSources())) {
            $type = Branding::clientSource();
        }
        $nome = self::clientName($type, $cid);
        if ($nome === '') {
            return $this->deny(__('Cliente não encontrado no GLPI.', 'codexplus'));
        }
        $input['client_itemtype'] = $type;
        $input['client_items_id'] = $cid;
        $input['client_name']     = $nome;
        return $input;
    }

    /**
     * Nome atual do cliente vinculado ('' se não existe mais). Usuário: o nome
     * de exibição do GLPI; entidade: o nome curto (o completo repetiria a
     * raiz em todos).
     */
    public static function clientName(string $itemtype, int $id): string
    {
        if ($id <= 0) {
            return '';
        }
        if ($itemtype === 'User') {
            $u = new \User();
            return $u->getFromDB($id) ? (string) getUserName($id) : '';
        }
        if ($itemtype === 'Entity') {
            $e = new \Entity();
            return $e->getFromDB($id) ? (string) $e->fields['name'] : '';
        }
        return '';
    }

    /**
     * Cliente para exibir (tela, Painel, PDF): o vinculado pelo nome atual
     * (ou o retrato gravado, se o cadastro sumiu), senão o texto da proposta.
     */
    public function clientLabel(): string
    {
        $doctype = (string) ($this->fields['doctype'] ?? '');
        if (!DocumentMeta::hasClient($doctype)) {
            return '';
        }
        $gravado = (string) ($this->fields['client_name'] ?? '');
        if (DocumentMeta::linksClient($doctype)) {
            $atual = self::clientName((string) ($this->fields['client_itemtype'] ?? ''), (int) ($this->fields['client_items_id'] ?? 0));
            return $atual !== '' ? $atual : $gravado;
        }
        return $gravado;
    }

    /**
     * Auditor, revisor e janela de revisão (R3d): normaliza e confere.
     *   - só quem gere o documento muda (na criação, quem cria já gere);
     *   - o auditor muda só em rascunho e tem que ter um perfil com o bit
     *     Auditor na entidade do documento (A1);
     *   - janela: as duas datas ou nenhuma, e início até o fim.
     * Devolve o input ou false (com a mensagem na sessão).
     *
     * @param int $entityId entidade do documento
     * @return array<string, mixed>|false
     */
    private function checkManagedFields(array $input, int $entityId, bool $novo)
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
            return $this->deny(__('Só quem gere o documento escolhe responsável, auditor, revisor e janela de revisão.', 'codexplus'));
        }
        // P1: cada papel vem do bit no perfil.
        if (isset($mudou['users_id_owner']) && (int) $input['users_id_owner'] > 0
            && !in_array((int) $input['users_id_owner'], Rights::approverUsers($entityId), true)) {
            return $this->deny(__('O responsável tem que ter o direito Aprovar no perfil (Administração → Perfis → aba Codex+).', 'codexplus'));
        }
        if (isset($mudou['users_id_reviewer']) && (int) $input['users_id_reviewer'] > 0
            && !in_array((int) $input['users_id_reviewer'], Rights::reviewerUsers($entityId), true)) {
            return $this->deny(__('O revisor tem que ter o direito Revisar e editar no perfil (Administração → Perfis → aba Codex+).', 'codexplus'));
        }
        if (isset($mudou['users_id_auditor'])) {
            if (!$novo && $this->status() !== self::STATUS_DRAFT) {
                return $this->deny(__('O auditor responsável só muda em rascunho.', 'codexplus'));
            }
            $a = (int) $input['users_id_auditor'];
            if ($a > 0 && !in_array($a, Rights::auditorUsers($entityId), true)) {
                return $this->deny(__('O auditor responsável tem que ter o direito Auditar no perfil (Administração → Perfis → aba Codex+).', 'codexplus'));
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

        // R3b3-1: imagens coladas no corpo e arquivos anexados viram
        // documentos do GLPI ligados a este (Document_Item), como no
        // KnowbaseItem nativo. O link da imagem leva itemtype/items_id, e o
        // download confere a leitura DESTE documento (canViewFileFromItem).
        $this->input = $this->addFiles($this->input, ['force_update' => true, 'content_field' => 'content', '_add_link' => false]);

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
        $input = $this->normalizeClient($input, (string) ($this->fields['doctype'] ?? ''));
        if ($input === false) {
            return false;
        }
        // Só em rascunho: fora dele o corpo não muda (e a comparação abaixo
        // recusaria a diferença).
        if (isset($input['content']) && $this->status() === self::STATUS_DRAFT) {
            $input['content'] = self::unwrapImageLinks((string) $input['content']);
        }

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
            $input = $this->checkManagedFields(
                self::dropUnusedRoles($input, (string) ($this->fields['doctype'] ?? '')),
                (int) $this->fields['entities_id'],
                false
            );
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
        // R3b3-1: ver post_addItem. Com force_update, addFiles regrava o corpo
        // com o link definitivo das imagens (volta aqui sem arquivos: para).
        $this->input = $this->addFiles($this->input, ['force_update' => true, 'content_field' => 'content', '_add_link' => false]);

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
