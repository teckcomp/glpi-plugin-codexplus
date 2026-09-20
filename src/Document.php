<?php
namespace GlpiPlugin\Codexplus;

use CommonDBTM;
use Glpi\DBAL\QueryExpression;
use Session;

/**
 * Documento próprio do Codex+ (Etapa R3a) — CONTEXTO.md §3.1.
 *
 * Tabela glpi_plugin_codexplus_documents, a MESMA de DocumentMeta. Até a R5
 * as duas classes convivem:
 *   - DocumentMeta: linhas ligadas a artigo nativo (knowbaseitems_id > 0),
 *     usadas pelas telas atuais;
 *   - Document: o documento independente (knowbaseitems_id = 0), ainda sem
 *     tela (R3b).
 * As regras de tipo, sequencial, status e publicação têm fonte única em
 * DocumentMeta (nextSequence, sanitizeFields, stampPublishDate, expiryState).
 *
 * ATENÇÃO — nome: `Document` do núcleo é `\Document`. Dentro deste namespace,
 * `Document` sem barra é esta classe.
 *
 * DIREITOS (bits em Rights, aba Codex+ de Perfis)
 * Leitura — mesma rotina da Base de Conhecimento (KnowbaseItem::canViewItem,
 * GLPI 11.0.6), com alvos por documento (perfis, grupos, usuários):
 *   - entidade do documento acessível (sempre);
 *   - "Ver todos" vê tudo;
 *   - autor e responsável veem sempre;
 *   - rascunho: só quem pode editar;
 *   - publicado/obsoleto: "Ler" + ser alvo.
 * Edição — como KnowbaseItem::canUpdateItem: "Atualizar" + (Ver todos, autor,
 * responsável ou alvo). Quem edita, portanto, sempre consegue ler.
 * Excluir = lixeira (is_deleted). Purgar desligado (decisão da R1).
 *
 * A regra existe em DUAS formas que precisam concordar: por item
 * (canViewItem) e em SQL (getVisibilityCriteria, para listagens). O
 * comando `plugins:codexplus:document:visibility` compara as duas.
 */
class Document extends CommonDBTM
{
    public static $rightname = Rights::NAME;

    public $dohistory = true;

    /** Alvos carregados em post_getFromDB: [id => [linhas]] */
    protected array $users    = [];
    protected array $groups   = [];
    protected array $profiles = [];

    public static function getTypeName($nb = 0)
    {
        return $nb > 1 ? __('Documentos', 'codexplus') : __('Documento', 'codexplus');
    }

    public static function getIcon()
    {
        return 'ti ti-file-text';
    }

    // ---------------------------------------------------------------------
    // Direitos de perfil (estáticos)
    // ---------------------------------------------------------------------

    public static function canView(): bool
    {
        return (bool) Session::haveRightsOr(Rights::NAME, [Rights::READ, Rights::VIEWALL]);
    }

    public static function canCreate(): bool
    {
        return (bool) Session::haveRight(Rights::NAME, Rights::CREATE);
    }

    public static function canUpdate(): bool
    {
        return (bool) Session::haveRight(Rights::NAME, Rights::UPDATE);
    }

    public static function canDelete(): bool
    {
        return (bool) Session::haveRight(Rights::NAME, Rights::DELETE);
    }

    /** Excluir é lixeira; não há purga pela interface (decisão da R1). */
    public static function canPurge(): bool
    {
        return false;
    }

    private static function hasViewAll(): bool
    {
        return (bool) Session::haveRight(Rights::NAME, Rights::VIEWALL);
    }

    // ---------------------------------------------------------------------
    // Direitos por item
    // ---------------------------------------------------------------------

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

    /**
     * Pertence ao documento sem depender do status: Ver todos, autor,
     * responsável ou alvo. É a condição de edição (junto com o bit
     * Atualizar) e de leitura de rascunho.
     */
    private function isReachable(): bool
    {
        return self::hasViewAll() || $this->isAuthorOrOwner() || $this->haveVisibilityAccess();
    }

    public function canViewItem(): bool
    {
        if (!$this->checkEntity(true)) {
            return false;
        }
        if (self::hasViewAll() || $this->isAuthorOrOwner()) {
            return true;
        }
        if (($this->fields['status'] ?? '') === 'rascunho') {
            return self::canUpdate() && $this->haveVisibilityAccess();
        }
        return Session::haveRight(Rights::NAME, Rights::READ) && $this->haveVisibilityAccess();
    }

    public function canUpdateItem(): bool
    {
        return $this->checkEntity() && $this->isReachable();
    }

    public function canDeleteItem(): bool
    {
        return $this->checkEntity() && $this->isReachable();
    }

    /**
     * O usuário da sessão é alvo do documento? Espelho de
     * CommonDBVisible::haveVisibilityAccess() (GLPI 11.0.6), sem o alvo por
     * entidade, que o Codex+ não tem (a entidade é do próprio documento).
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

    /** Quantidade de alvos (0 = só autor, responsável e Ver todos leem). */
    public function countTargets(): int
    {
        return count($this->users) + count($this->groups) + count($this->profiles);
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

        // Alvos — espelho de KnowbaseItem::getVisibilityCriteriaKB_*.
        $targets = ['OR' => [[$tu . '.users_id' => $me]]];

        $groups = $_SESSION['glpigroups'] ?? [];
        if (count($groups)) {
            $targets['OR'][] = [
                $tg . '.groups_id' => array_values($groups),
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

        // Rascunho só para quem pode editar (Atualizar + alvo). Sem
        // Atualizar, alvo só vale para o que não é rascunho — e exige Ler.
        $ors = [
            [$doc . '.users_id' => $me],
            [$doc . '.users_id_owner' => $me],
        ];
        if (static::canUpdate()) {
            $readByTarget = [$targets];
            if (!Session::haveRight(Rights::NAME, Rights::READ)) {
                $readByTarget[] = [$doc . '.status' => 'rascunho'];
            }
            $ors[] = ['AND' => $readByTarget];
        } elseif (Session::haveRight(Rights::NAME, Rights::READ)) {
            $ors[] = ['AND' => [$targets, ['NOT' => [$doc . '.status' => 'rascunho']]]];
        }

        $where[] = ['OR' => $ors];
        return ['LEFT JOIN' => $join, 'WHERE' => $where];
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
        $input = DocumentMeta::sanitizeFields($input);

        $input['name'] = trim((string) ($input['name'] ?? ''));
        if ($input['name'] === '') {
            Session::addMessageAfterRedirect(__('Informe o título do documento.', 'codexplus'), false, ERROR);
            return false;
        }
        if (empty($input['doctype'])) {
            Session::addMessageAfterRedirect(__('Informe o tipo do documento.', 'codexplus'), false, ERROR);
            return false;
        }

        // Documento próprio nunca aponta para artigo nativo.
        $input['knowbaseitems_id'] = 0;
        $input['sequence']         = DocumentMeta::nextSequence((string) $input['doctype']);
        $input['revision']         = 0;
        $input['status']           = $input['status'] ?? 'rascunho';
        $input['users_id']         = (int) ($input['users_id'] ?? Session::getLoginUserID());
        if (!isset($input['validity_months'])) {
            $input['validity_months'] = $input['doctype'] === 'PRP' ? 0 : DocumentMeta::DEFAULT_VALIDITY_MONTHS;
        }

        return DocumentMeta::stampPublishDate($input, null);
    }

    public function prepareInputForUpdate($input)
    {
        // Tipo e sequencial formam o código: não mudam depois de criado.
        unset($input['doctype'], $input['sequence'], $input['knowbaseitems_id']);

        $input = DocumentMeta::sanitizeFields($input);

        if (array_key_exists('name', $input)) {
            $input['name'] = trim((string) $input['name']);
            if ($input['name'] === '') {
                Session::addMessageAfterRedirect(__('Informe o título do documento.', 'codexplus'), false, ERROR);
                return false;
            }
        }

        return DocumentMeta::stampPublishDate($input, $this->fields['date_published'] ?? null);
    }

    public function cleanDBonPurge()
    {
        $this->deleteChildrenAndRelationsFromDb([
            Document_Category::class,
            Document_Profile::class,
            Document_Group::class,
            Document_User::class,
        ]);
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
                return htmlescape(DocumentMeta::getStatuses()[$values[$field]] ?? (string) $values[$field]);
        }
        return parent::getSpecificValueToDisplay($field, $values, $options);
    }
}
