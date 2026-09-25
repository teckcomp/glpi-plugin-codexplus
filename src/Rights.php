<?php
namespace GlpiPlugin\Codexplus;

/**
 * Direitos do Codex+ (Etapa R1).
 *
 * Uma matriz só, ajustada na aba "Codex+" de Administração > Perfis.
 *
 * DUAS CAMADAS (decisão de Claudio, 20/09/2026 — Etapa R3c):
 *   - o PERFIL (estes bits) diz O QUE a pessoa pode fazer no Codex+;
 *   - o PLUGIN diz EM QUAIS documentos: gestores por setor (SectorMember),
 *     editores por documento (DocumentEditor), alvos de leitura por
 *     documento (Document_Profile/Group/User).
 *
 * AUDITOR PELO PERFIL (bloco A1, Claudio, 25/09/2026): o bit 8192, antes
 * rotulado "Validar", passa a se chamar "Auditor". Quem tem um perfil com ele
 * na entidade do documento pode ser escolhido como auditor responsável, em
 * qualquer setor (auditorUsers()). O papel "auditor" do setor saiu de uso.
 * O bit é o mesmo: perfis que já o tinham continuam valendo.
 *
 * SUPER-ADMIN (bloco A2, Claudio, 25/09/2026): é o perfil com Configurar >
 * Atualizar (isSuperAdmin(), o mesmo critério do Install) e pode tudo no
 * fluxo, sem regra nenhuma — valida qualquer documento sem o bit Auditor e
 * não aparece na lista de auditores. O Install não lhe dá mais o bit Auditor.
 * "Ver todos" voltou a ser só leitura e papéis: não dispensa as regras da
 * validação.
 * A ação só vale quando as duas concordam. "Ver todos" dispensa os papéis
 * do plugin, mas só dentro do que os outros bits do perfil permitem. O
 * Super-Admin nasce com todos os bits (Install::installR3c).
 *
 * A chave gravada em glpi_profilerights continua sendo
 * `plugin_codexplus_wiki` (nome histórico da Etapa 0). Renomear exigiria
 * migrar as linhas de todos os perfis sem ganho funcional: o que o usuário
 * vê é o rótulo, não a chave.
 *
 * Bits: os quatro padrão do GLPI (1, 2, 4, 8) e quatro próprios a partir de
 * 1024, faixa que o núcleo também usa para direitos extras (a matriz de
 * Profile::displayRightsChoiceMatrix ordena >= 1024 depois dos padrão).
 * PURGE (16) não é usado: "Excluir" cobre a exclusão.
 *
 * Em R1 estes bits só são GRAVADOS. As telas atuais continuam checando os
 * direitos da base nativa; a troca acontece na R3 (criar/editar) e na R5
 * (listagens e painel).
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
    public const VALIDATE  = 8192;  // auditor: 2ª etapa da validação (R3c; rótulo "Auditor" desde a A1)

    /** Soma de todos os bits da matriz. */
    public const ALL = self::READ | self::UPDATE | self::CREATE | self::DELETE
        | self::VIEWALL | self::ANONYMOUS | self::TEMPLATES | self::VALIDATE;

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
            self::UPDATE    => __('Atualizar', 'codexplus'),
            self::CREATE    => __('Criar', 'codexplus'),
            self::DELETE    => __('Excluir', 'codexplus'),
            self::VALIDATE  => __('Auditor', 'codexplus'),
            self::VIEWALL   => __('Ver todos', 'codexplus'),
            self::ANONYMOUS => __('Publicar para acesso anônimo', 'codexplus'),
            self::TEMPLATES => __('Gerenciar modelos, setores e categorias', 'codexplus'),
        ];
    }

    /**
     * Super-Admin do Codex+ (A2): perfil ativo com Configurar > Atualizar.
     * Pode tudo no fluxo de validação, sem precisar de nenhum bit do Codex+.
     */
    public static function isSuperAdmin(): bool
    {
        return (bool) \Session::haveRight('config', UPDATE);
    }

    /**
     * Usuários que podem ser auditor responsável de um documento da entidade
     * (bloco A1): ativos, não excluídos, com um perfil da interface padrão
     * que tenha o bit Auditor, atribuído na própria entidade ou numa entidade
     * acima com "recursivo". Perfil Self-Service fica fora: o GLPI tira dele
     * todo direito de plugin na sessão (achado 27) e ele nunca validaria.
     * Perfil Super-Admin (Configurar > Atualizar) também fica fora (A2): ele
     * valida qualquer documento sem precisar ser escolhido.
     *
     * Na hora de validar vale o perfil ATIVO (Document::canValidate): quem
     * tem mais de um perfil precisa estar no que tem o bit.
     *
     * @return int[] ids em ordem de nome
     */
    public static function auditorUsers(int $entityId): array
    {
        /** @var \DBmysql $DB */
        global $DB;

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
            if (((int) $row['rights'] & self::VALIDATE) === self::VALIDATE) {
                $profiles[] = (int) $row['profiles_id'];
            }
        }
        if ($profiles !== []) {
            foreach ($DB->request([
                'SELECT' => ['profiles_id', 'rights'],
                'FROM'   => 'glpi_profilerights',
                'WHERE'  => ['name' => 'config', 'profiles_id' => $profiles],
            ]) as $row) {
                if (((int) $row['rights'] & UPDATE) === UPDATE) {
                    $profiles = array_values(array_diff($profiles, [(int) $row['profiles_id']]));
                }
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
