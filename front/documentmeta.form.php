<?php
/**
 * Codex+ — gravação dos metadados de documento controlado (Etapa 2a).
 *
 * Recebe o POST da aba "Codex+" da ficha nativa do artigo. A permissão de
 * edição é a MESMA do artigo (KnowbaseItem::canUpdateItem) — quem pode editar
 * o POP pode editar seus metadados. Faz upsert (1 registro por artigo) e volta.
 */

use GlpiPlugin\Codexplus\DocumentMeta;

include('../../../inc/includes.php');

Session::checkRight('plugin_codexplus_wiki', READ);

$kbId = isset($_POST['knowbaseitems_id']) ? (int) $_POST['knowbaseitems_id'] : 0;

// A edição dos metadados exige poder atualizar o artigo nativo.
$kb = new KnowbaseItem();
if ($kbId <= 0 || !$kb->getFromDB($kbId) || !$kb->canUpdateItem()) {
    Html::displayRightError();
}

$meta = new DocumentMeta();

// Upsert: garante um único metadado por artigo (a tabela tem UNIQUE em
// knowbaseitems_id; decidir add/update aqui evita colisão da chave única).
$existing = new DocumentMeta();
if ($existing->getFromDBByCrit(['knowbaseitems_id' => $kbId])) {
    $_POST['id'] = $existing->getID();
    $meta->update($_POST);
} else {
    $meta->add($_POST);
}

Html::back();
