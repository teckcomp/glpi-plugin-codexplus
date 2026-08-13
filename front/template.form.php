<?php

/**
 * Codex+ — gravação dos modelos (Etapa 3a).
 * Gerir modelos exige permissão nativa de escrita na base (knowbase UPDATE).
 */

use GlpiPlugin\Codexplus\Template;

include('../../../inc/includes.php');

Session::checkRight('knowbase', UPDATE);

$tpl = new Template();

if (isset($_POST['add'])) {
    $tpl->add($_POST);
} elseif (isset($_POST['update'])) {
    $tpl->update($_POST);
} elseif (isset($_POST['delete'])) {
    // Modelo é configuração; sem coluna is_deleted, remove de vez (force).
    $tpl->delete($_POST, 1);
} elseif (isset($_POST['duplicate'])) {
    $src = new Template();
    if (!empty($_POST['id']) && $src->getFromDB((int) $_POST['id'])) {
        $tpl->add([
            'name'       => $src->fields['name'] . ' ' . __('(cópia)', 'codexplus'),
            'doctype'    => $src->fields['doctype'],
            'content'    => $src->fields['content'],
            'is_default' => 0,
        ]);
    }
}

Html::back();
