<?php
namespace GlpiPlugin\Codexplus;

use CommonGLPI;
use Glpi\Application\View\TemplateRenderer;
use Profile;
use Session;

/**
 * Aba "Codex+" na ficha de Perfil (Etapa R1).
 *
 * Registrada no setup.php com Plugin::registerClass(..., ['addtabon' =>
 * Profile::class]). Desenha a matriz com o MESMO helper das abas nativas
 * (Profile::displayRightsChoiceMatrix) e reaproveita o formulário nativo
 * (pages/admin/profile/base_tab.html.twig): o POST vai para
 * front/profile.form.php do núcleo, que grava o campo
 * `_plugin_codexplus_wiki` sozinho (Profile::prepareInputForUpdate percorre
 * todos os direitos conhecidos). Nenhum controller próprio.
 *
 * Só aparece em perfis da interface PADRÃO. Em perfil Self-Service o GLPI
 * descarta da sessão todo direito que não esteja em
 * Profile::$helpdesk_rights (Session::changeProfile -> cleanProfile), então
 * marcar caixas ali não teria efeito nenhum. Ver CONTEXTO.md, achado 27.
 */
class ProfileTab extends CommonGLPI
{
    public static $rightname = 'profile';

    public static function getTypeName($nb = 0)
    {
        return __('Codex+', 'codexplus');
    }

    public static function getIcon()
    {
        return 'ti ti-book-2';
    }

    public function getTabNameForItem(CommonGLPI $item, $withtemplate = 0)
    {
        if (
            $item instanceof Profile
            && !$withtemplate
            && in_array($item->fields['interface'] ?? '', ['central', 'helpdesk'], true)
        ) {
            return self::createTabEntry(self::getTypeName(), 0, $item::class, self::getIcon());
        }
        return '';
    }

    public static function displayTabContentForItem(CommonGLPI $item, $tabnum = 1, $withtemplate = 0)
    {
        if (!$item instanceof Profile || !Profile::canView()) {
            return false;
        }

        TemplateRenderer::getInstance()->display('@codexplus/profile-rights.html.twig', [
            'item'       => $item,
            'cx_matrix'  => self::getMatrixRows(($item->fields['interface'] ?? '') === 'helpdesk'),
            'cx_helpdesk' => ($item->fields['interface'] ?? '') === 'helpdesk',
            'cx_canedit' => self::canEditProfiles(),
            'cx_title'   => __('Codex+ — documentos', 'codexplus'),
        ]);
        return true;
    }

    /**
     * Linhas da matriz. Uma linha só nesta etapa; o formato é o mesmo de
     * Profile::getRightsForForm, para crescer sem mudar o template.
     *
     * @return array<int, array{rights: array<int,string>, label: string, field: string}>
     */
    public static function getMatrixRows(bool $helpdesk = false): array
    {
        // S1: na interface simplificada o Codex+ é só leitura.
        return [
            [
                'rights' => $helpdesk ? [Rights::READ => Rights::getLabels()[Rights::READ]] : Rights::getLabels(),
                'label'  => __('Documentos', 'codexplus'),
                'field'  => Rights::NAME,
            ],
        ];
    }

    /** Mesma regra do base_tab.html.twig nativo. */
    private static function canEditProfiles(): bool
    {
        return (bool) (
            Session::haveRight('profile', CREATE)
            || Session::haveRight('profile', UPDATE)
            || Session::haveRight('profile', PURGE)
        );
    }
}
