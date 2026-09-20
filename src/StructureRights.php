<?php
namespace GlpiPlugin\Codexplus;

use Session;

/**
 * Direitos das listas da estante (Etapa R2): setores e categorias.
 *
 * Decisão de Claudio em 20/09/2026: quem cadastra setores e categorias é
 * quem tem "Gerenciar modelos" (Rights::TEMPLATES) na aba Codex+ de Perfis.
 * Ver continua liberado para quem tem Ler, porque a R3 vai pedir categoria
 * no formulário do documento.
 *
 * Os métodos padrão de CommonGLPI leriam CREATE/UPDATE/DELETE/PURGE da
 * mesma chave — que na matriz significam "documentos", não "estante". Por
 * isso são sobrescritos aqui, num só lugar, para Sector e Category.
 */
trait StructureRights
{
    public static function canView(): bool
    {
        return (bool) Session::haveRight(Rights::NAME, Rights::READ | Rights::TEMPLATES);
    }

    public static function canCreate(): bool
    {
        return self::canManageStructure();
    }

    public static function canUpdate(): bool
    {
        return self::canManageStructure();
    }

    public static function canDelete(): bool
    {
        return self::canManageStructure();
    }

    public static function canPurge(): bool
    {
        return self::canManageStructure();
    }

    public static function canManageStructure(): bool
    {
        return (bool) Session::haveRight(Rights::NAME, Rights::TEMPLATES);
    }
}
