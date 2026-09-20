<?php
namespace GlpiPlugin\Codexplus;

use CommonDBChild;
use Group;
use Session;

/**
 * Editor/revisor do documento (Etapa R3c): usuário OU grupo. Decisão de
 * Claudio, 20/09/2026: "edição sempre será atribuída a um editor/revisor do
 * documento". Quem atribui: gestor do setor do documento (ou Ver todos),
 * com o bit Atualizar — ver Document::canManage(). Editor não atribui
 * outro editor.
 */
class DocumentEditor extends CommonDBChild
{
    public static $itemtype = Document::class;
    public static $items_id = 'plugin_codexplus_documents_id';

    public static function getTypeName($nb = 0)
    {
        return $nb > 1 ? __('Editores', 'codexplus') : __('Editor', 'codexplus');
    }

    public function prepareInputForAdd($input)
    {
        $u = (int) ($input['users_id'] ?? 0);
        $g = (int) ($input['groups_id'] ?? 0);
        if (($u > 0) === ($g > 0)) {
            Session::addMessageAfterRedirect(__('Informe um usuário OU um grupo.', 'codexplus'), false, ERROR);
            return false;
        }
        $input['users_id']  = $u;
        $input['groups_id'] = $g;
        return parent::prepareInputForAdd($input);
    }

    private function parentDocument(): ?Document
    {
        $doc = new Document();
        $id  = (int) ($this->fields[static::$items_id] ?? $this->input[static::$items_id] ?? 0);
        return ($id > 0 && $doc->getFromDB($id)) ? $doc : null;
    }

    public function canCreateItem(): bool
    {
        $doc = $this->parentDocument();
        return $doc !== null && $doc->canManage();
    }

    public function canPurgeItem(): bool
    {
        return $this->canCreateItem();
    }

    public function canUpdateItem(): bool
    {
        return false;
    }

    /** Nome legível (mensagens e Histórico). */
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

    /** O usuário da sessão é editor do documento (direto ou por grupo)? */
    public static function isMine(int $documentId): bool
    {
        $me     = (int) Session::getLoginUserID();
        $groups = array_values($_SESSION['glpigroups'] ?? []);
        if ($me <= 0) {
            return false;
        }
        $or = [['users_id' => $me]];
        if ($groups) {
            $or[] = ['groups_id' => $groups];
        }
        return countElementsInTable(static::getTable(), [
            static::$items_id => $documentId,
            'OR'              => $or,
        ]) > 0;
    }
}
