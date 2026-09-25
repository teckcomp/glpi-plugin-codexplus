<?php
namespace GlpiPlugin\Codexplus;

use CommonDBChild;
use Group;
use Session;
use User;

/**
 * Papel no setor (Etapa R3c): GESTOR, dado a um usuário ou a um grupo.
 * Decisão de Claudio, 20/09/2026: o gestor cria documentos nas categorias do
 * setor, edita os do setor, atribui editores e alvos de leitura, aprova a 1ª
 * etapa, marca obsoleto, exclui.
 *
 * O papel VALIDADOR (rotulado "Auditor" na R3d) saiu de uso no bloco A1
 * (Claudio, 25/09/2026): o auditor passou a vir do PERFIL (bit Auditor,
 * Rights::auditorUsers()), valendo para qualquer setor. Linhas antigas com
 * esse papel continuam na tabela, não são lidas por regra nenhuma e não se
 * cadastram mais.
 * Quem atribui papéis de setor: quem gerencia a estrutura (bit Gerenciar
 * modelos, setores e categorias) — herdado de Sector pelo CommonDBChild.
 *
 * O setor do documento vem das categorias dele (Category guarda o setor já
 * herdado da raiz, R2). Documento em categorias de setores diferentes: os
 * papéis de TODOS esses setores valem.
 */
class SectorMember extends CommonDBChild
{
    public const ROLE_MANAGER   = 'gestor';
    public const ROLE_VALIDATOR = 'validador';
    /** Fora de uso desde a A1: só para mostrar linhas antigas. */
    public const ROLES          = [self::ROLE_MANAGER];

    public static $itemtype = Sector::class;
    public static $items_id = 'plugin_codexplus_sectors_id';

    public $dohistory = true;

    /** Cache por requisição: [role => int[] setores] do usuário da sessão. */
    private static array $mine = [];

    public static function getTypeName($nb = 0)
    {
        return $nb > 1 ? __('Papéis no setor', 'codexplus') : __('Papel no setor', 'codexplus');
    }

    public static function getRoleLabels(): array
    {
        return [
            self::ROLE_MANAGER   => __('Gestor', 'codexplus'),
            // A1 (Claudio, 25/09/2026): o auditor vem do perfil. Linhas
            // antigas com este papel aparecem assim e não valem nada.
            self::ROLE_VALIDATOR => __('Auditor (fora de uso: agora é pelo perfil)', 'codexplus'),
        ];
    }

    public function prepareInputForAdd($input)
    {
        if (in_array($input['role'] ?? '', ['auditor', self::ROLE_VALIDATOR], true)) {
            Session::addMessageAfterRedirect(
                __('Auditor não é mais papel de setor: marque a coluna Auditor no perfil (Administração → Perfis → aba Codex+).', 'codexplus'),
                false,
                ERROR
            );
            return false;
        }
        if (!in_array($input['role'] ?? '', self::ROLES, true)) {
            Session::addMessageAfterRedirect(__('Papel inválido: use gestor.', 'codexplus'), false, ERROR);
            return false;
        }
        $u = (int) ($input['users_id'] ?? 0);
        $g = (int) ($input['groups_id'] ?? 0);
        if (($u > 0) === ($g > 0)) {
            Session::addMessageAfterRedirect(__('Informe um usuário OU um grupo.', 'codexplus'), false, ERROR);
            return false;
        }
        $input['users_id']  = $u;
        $input['groups_id'] = $g;
        self::$mine = [];
        return parent::prepareInputForAdd($input);
    }

    public function post_purgeItem()
    {
        self::$mine = [];
        parent::post_purgeItem();
    }

    /** Nome legível do membro (para mensagens e Histórico). */
    public function getMemberName(): string
    {
        if ((int) $this->fields['users_id'] > 0) {
            return getUserName((int) $this->fields['users_id']);
        }
        $g = new Group();
        return $g->getFromDB((int) $this->fields['groups_id'])
            ? __('Grupo', 'codexplus') . ' ' . $g->fields['name']
            : '?';
    }

    /**
     * Setores em que o usuário da sessão tem o papel (direto ou por grupo).
     *
     * @return int[]
     */
    public static function mySectors(string $role): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        if (isset(self::$mine[$role])) {
            return self::$mine[$role];
        }
        $me     = (int) Session::getLoginUserID();
        $groups = array_values($_SESSION['glpigroups'] ?? []);

        $or = [['users_id' => $me]];
        if ($groups) {
            $or[] = ['groups_id' => $groups];
        }
        $ids = [];
        if ($me > 0) {
            foreach ($DB->request([
                'SELECT'   => ['plugin_codexplus_sectors_id'],
                'DISTINCT' => true,
                'FROM'     => static::getTable(),
                'WHERE'    => ['role' => $role, 'OR' => $or],
            ]) as $row) {
                $ids[] = (int) $row['plugin_codexplus_sectors_id'];
            }
        }
        return self::$mine[$role] = $ids;
    }

    /**
     * Usuários que têm o papel em algum dos setores: os ligados direto e os
     * membros dos grupos ligados (R3d). Só usuários ativos e não excluídos.
     * Serve à escolha do auditor responsável e aos avisos "aguardando …".
     *
     * @param int[] $sectorIds
     * @return int[]
     */
    public static function usersOfRole(array $sectorIds, string $role): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        $sectorIds = array_values(array_filter(array_map('intval', $sectorIds)));
        if ($sectorIds === []) {
            return [];
        }
        $users = $groups = [];
        foreach ($DB->request([
            'SELECT' => ['users_id', 'groups_id'],
            'FROM'   => static::getTable(),
            'WHERE'  => ['role' => $role, 'plugin_codexplus_sectors_id' => $sectorIds],
        ]) as $row) {
            if ((int) $row['users_id'] > 0) {
                $users[(int) $row['users_id']] = true;
            } elseif ((int) $row['groups_id'] > 0) {
                $groups[] = (int) $row['groups_id'];
            }
        }
        if ($groups) {
            foreach ($DB->request([
                'SELECT' => ['users_id'],
                'FROM'   => 'glpi_groups_users',
                'WHERE'  => ['groups_id' => $groups],
            ]) as $row) {
                $users[(int) $row['users_id']] = true;
            }
        }
        if ($users === []) {
            return [];
        }
        $out = [];
        foreach ($DB->request([
            'SELECT' => ['id'],
            'FROM'   => 'glpi_users',
            'WHERE'  => ['id' => array_keys($users), 'is_active' => 1, 'is_deleted' => 0],
            'ORDER'  => ['realname', 'firstname', 'name'],
        ]) as $row) {
            $out[] = (int) $row['id'];
        }
        return $out;
    }

    /** Limpa o cache (troca de sessão no console, testes). */
    public static function resetCache(): void
    {
        self::$mine = [];
    }
}
