<?php
namespace GlpiPlugin\Codexplus;

use CommonDBChild;
use Group;
use Session;
use User;

/**
 * Papel no setor (Etapa R3c): GESTOR ou VALIDADOR, dado a um usuário ou a um
 * grupo. Decisão de Claudio, 20/09/2026:
 *   - gestor: cria documentos nas categorias do setor, edita os do setor,
 *     atribui editores e alvos de leitura, marca obsoleto, exclui;
 *   - validador: aprova ou devolve documentos do setor (com o bit Validar
 *     no perfil).
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
    public const ROLES          = [self::ROLE_MANAGER, self::ROLE_VALIDATOR];

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
            self::ROLE_VALIDATOR => __('Validador', 'codexplus'),
        ];
    }

    public function prepareInputForAdd($input)
    {
        if (!in_array($input['role'] ?? '', self::ROLES, true)) {
            Session::addMessageAfterRedirect(__('Papel inválido: use gestor ou validador.', 'codexplus'), false, ERROR);
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

    /** Limpa o cache (troca de sessão no console, testes). */
    public static function resetCache(): void
    {
        self::$mine = [];
    }
}
