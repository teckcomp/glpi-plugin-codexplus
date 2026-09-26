<?php
namespace GlpiPlugin\Codexplus;

/**
 * Direitos do Codex+ (Etapa R1; papéis refeitos no bloco P1, Claudio,
 * 26/09/2026).
 *
 * Uma matriz só, na aba "Codex+" de Administração > Perfis. O PERFIL diz o
 * que a pessoa pode ser num documento; o DOCUMENTO diz quem ela é nele
 * (responsável, auditor, revisor, autor) — sem papel de setor nem lista de
 * editores:
 *   - Ler: alvos de leitura (coluna Permissões), só a versão publicada;
 *   - Criar: cria em qualquer categoria (o setor é só organização);
 *   - Revisar e editar (bit 2): pode ser escolhido como REVISOR;
 *   - Aprovar: pode ser escolhido como RESPONSÁVEL (gestor do documento),
 *     que aprova a 1ª etapa;
 *   - Auditar: pode ser escolhido como AUDITOR, que aprova ou devolve a 2ª
 *     etapa e não edita nada.
 * Editam o rascunho: responsável, revisor e autor.
 *
 * SUPER-ADMIN (A2): perfil com Configurar > Atualizar (isSuperAdmin()). Pode
 * tudo no fluxo, sem bit nenhum; não aparece na lista de auditores. "Ver
 * todos" é só leitura.
 *
 * A chave gravada continua `plugin_codexplus_wiki` (nome histórico).
 * Bits próprios a partir de 1024 (a matriz do núcleo os põe depois dos
 * padrão). PURGE (16) não é usado.
 */
final class Rights
{
    public const NAME = 'plugin_codexplus_wiki';

    public const READ    = READ;    // 1
    public const UPDATE  = UPDATE;  // 2
    public const CREATE  = CREATE;  // 4
    public const DELETE  = DELETE;  // 8

    public const VIEWALL   = 1024;  // ignora os alvos de leitura
    public const ANONYMOUS = 2048;  // gerar/revogar link de acesso anônimo (R7)
    public const TEMPLATES = 4096;  // gerenciar modelos, setores e categorias (R2)
    public const VALIDATE  = 8192;  // Auditar: 2ª etapa da validação
    public const APPROVE   = 16384; // Aprovar: pode ser o responsável, 1ª etapa (P1)

    /** Soma de todos os bits da matriz. */
    public const ALL = self::READ | self::UPDATE | self::CREATE | self::DELETE
        | self::VIEWALL | self::ANONYMOUS | self::TEMPLATES | self::VALIDATE | self::APPROVE;

    /**
     * Colunas da matriz, no formato que Profile::displayRightsChoiceMatrix
     * espera em 'rights' (bit => rótulo).
     *
     * @return array<int, string>
     */
    public static function getLabels(): array
    {
        return [
            self::READ      => __('Ler', 'codexplus'),
            self::CREATE    => __('Criar', 'codexplus'),
            self::UPDATE    => __('Revisar e editar', 'codexplus'),
            self::APPROVE   => __('Aprovar', 'codexplus'),
            self::VALIDATE  => __('Auditar', 'codexplus'),
            self::DELETE    => __('Excluir', 'codexplus'),
            self::VIEWALL   => __('Ver todos', 'codexplus'),
            self::ANONYMOUS => __('Publicar para acesso anônimo', 'codexplus'),
            self::TEMPLATES => __('Gerenciar modelos, setores e categorias', 'codexplus'),
        ];
    }

    /**
     * Quem PRODUZ documentos (B1, Claudio 26/09/2026): Super-Admin ou quem
     * tem algum direito além de Ler. Os demais só leem: entram direto na
     * Biblioteca, sem o Painel. O Self-Service é sempre leitor (S1).
     */
    public static function isProducer(): bool
    {
        if (\Session::getCurrentInterface() === 'helpdesk') {
            return false;
        }
        return self::isSuperAdmin() || (bool) \Session::haveRightsOr(self::NAME, [
            self::CREATE, self::UPDATE, self::APPROVE, self::VALIDATE, self::VIEWALL, self::TEMPLATES,
        ]);
    }

    /**
     * Super-Admin do Codex+ (A2): perfil ativo com Configurar > Atualizar.
     * Pode tudo no fluxo de validação, sem precisar de nenhum bit do Codex+.
     */
    public static function isSuperAdmin(): bool
    {
        return (bool) \Session::haveRight('config', UPDATE);
    }

    /** Quem pode ser auditor: bit Auditar; o Super-Admin fica fora (A2). */
    public static function auditorUsers(int $entityId): array
    {
        return self::usersWithBit(self::VALIDATE, $entityId, false);
    }

    /** Quem pode ser responsável (P1): bit Aprovar, ou Super-Admin. */
    public static function approverUsers(int $entityId): array
    {
        return self::usersWithBit(self::APPROVE, $entityId, true);
    }

    /** Quem pode ser revisor (P1): bit Revisar e editar, ou Super-Admin. */
    public static function reviewerUsers(int $entityId): array
    {
        return self::usersWithBit(self::UPDATE, $entityId, true);
    }

    /**
     * Usuários ativos, não excluídos, com um perfil da interface padrão que
     * tenha o bit, atribuído na entidade ou numa acima com recursivo.
     * Self-Service fica fora (achado 27). $superAdmin: true = perfis com
     * Configurar > Atualizar entram mesmo sem o bit; false = ficam fora.
     *
     * @return int[] ids em ordem de nome
     */
    public static function usersWithBit(int $bit, int $entityId, bool $superAdmin): array
    {
        /** @var \DBmysql $DB */
        global $DB;

        // Super-Admin = perfil com Configurar > Atualizar (critério de isSuperAdmin).
        $supers = [];
        foreach ($DB->request([
            'SELECT' => ['profiles_id', 'rights'],
            'FROM'   => 'glpi_profilerights',
            'WHERE'  => ['name' => 'config'],
        ]) as $row) {
            if (((int) $row['rights'] & UPDATE) === UPDATE) {
                $supers[] = (int) $row['profiles_id'];
            }
        }
        $profiles = [];
        foreach ($DB->request([
            'SELECT'     => ['glpi_profilerights.profiles_id', 'glpi_profilerights.rights'],
            'FROM'       => 'glpi_profilerights',
            'INNER JOIN' => [
                'glpi_profiles' => ['ON' => ['glpi_profilerights' => 'profiles_id', 'glpi_profiles' => 'id']],
            ],
            'WHERE'      => [
                'glpi_profilerights.name' => self::NAME,
                'glpi_profiles.interface' => 'central',
            ],
        ]) as $row) {
            $pid   = (int) $row['profiles_id'];
            $super = in_array($pid, $supers, true);
            if ($superAdmin ? ($super || ((int) $row['rights'] & $bit) === $bit)
                            : (!$super && ((int) $row['rights'] & $bit) === $bit)) {
                $profiles[] = $pid;
            }
        }
        if ($profiles === []) {
            return [];
        }

        $entOr = [['glpi_profiles_users.entities_id' => $entityId]];
        $acima = array_values(array_map('intval', getAncestorsOf('glpi_entities', $entityId)));
        if ($acima !== []) {
            $entOr[] = [
                'glpi_profiles_users.entities_id'  => $acima,
                'glpi_profiles_users.is_recursive' => 1,
            ];
        }

        $out = [];
        foreach ($DB->request([
            'SELECT'     => ['glpi_users.id', 'glpi_users.realname', 'glpi_users.firstname', 'glpi_users.name'],
            'DISTINCT'   => true,
            'FROM'       => 'glpi_profiles_users',
            'INNER JOIN' => [
                'glpi_users' => ['ON' => ['glpi_profiles_users' => 'users_id', 'glpi_users' => 'id']],
            ],
            'WHERE'      => [
                'glpi_profiles_users.profiles_id' => $profiles,
                'glpi_users.is_active'            => 1,
                'glpi_users.is_deleted'           => 0,
                'OR'                              => $entOr,
            ],
            'ORDER'      => ['glpi_users.realname', 'glpi_users.firstname', 'glpi_users.name'],
        ]) as $row) {
            $out[(int) $row['id']] = (int) $row['id'];
        }
        return array_values($out);
    }
}
