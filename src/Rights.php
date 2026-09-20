<?php
namespace GlpiPlugin\Codexplus;

/**
 * Direitos do Codex+ (Etapa R1).
 *
 * Uma matriz só, ajustada na aba "Codex+" de Administração > Perfis.
 * Ela governa CRIAÇÃO e EDIÇÃO. A LEITURA de cada documento depende também
 * dos alvos do documento (perfis, grupos, usuários), como na base nativa;
 * "Ver todos" ignora os alvos.
 *
 * A chave gravada em glpi_profilerights continua sendo
 * `plugin_codexplus_wiki` (nome histórico da Etapa 0). Renomear exigiria
 * migrar as linhas de todos os perfis sem ganho funcional: o que o usuário
 * vê é o rótulo, não a chave.
 *
 * Bits: os quatro padrão do GLPI (1, 2, 4, 8) e três próprios a partir de
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
    public const TEMPLATES = 4096;  // gerenciar modelos

    /** Soma de todos os bits da matriz. */
    public const ALL = self::READ | self::UPDATE | self::CREATE | self::DELETE
        | self::VIEWALL | self::ANONYMOUS | self::TEMPLATES;

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
            self::VIEWALL   => __('Ver todos', 'codexplus'),
            self::ANONYMOUS => __('Publicar para acesso anônimo', 'codexplus'),
            self::TEMPLATES => __('Gerenciar modelos', 'codexplus'),
        ];
    }
}
