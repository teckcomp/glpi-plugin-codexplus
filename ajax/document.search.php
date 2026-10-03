<?php

/**
 * Codex+ — Q5h-2: busca de documentos para o link de uma forma do
 * fluxograma (Claudio, 02/10/2026).
 *
 * Só leitura (GET). Devolve até 20 documentos que a pessoa pode ver, pela
 * mesma regra das listagens (Document::getVisibilityCriteria): quem não vê um
 * documento não o encontra aqui. Busca pelo título ou pelo código (POP0012,
 * "pop 12" ou só o número). `self` tira o próprio documento da lista.
 */

use GlpiPlugin\Codexplus\Document;
use Symfony\Component\HttpFoundation\JsonResponse;

include('../../../inc/includes.php');

// Achado 9: arquivo de plugin roda em escopo de função.
global $DB;

if (!Document::canView()) {
    return new JsonResponse(['erro' => 'sem_acesso'], 403);
}

$q    = mb_substr(trim((string) ($_GET['q'] ?? '')), 0, 80);
$self = (int) ($_GET['self'] ?? 0);

$t     = Document::getTable();
$vis   = Document::getVisibilityCriteria();
$where = [$t . '.knowbaseitems_id' => 0, $t . '.is_deleted' => 0] + $vis['WHERE'];
if ($self > 0) {
    $where[] = ['NOT' => [$t . '.id' => $self]];
}
if ($q !== '') {
    $or = [[$t . '.name' => ['LIKE', '%' . $q . '%']]];
    if (preg_match('/^([a-z]{2,6})\s*0*(\d{1,6})$/i', $q, $m)) {
        $or[] = [$t . '.doctype' => strtoupper($m[1]), $t . '.sequence' => (int) $m[2]];
    } elseif (ctype_digit($q)) {
        $or[] = [$t . '.sequence' => (int) $q];
    }
    $where[] = ['OR' => $or];
}

$docs = [];
foreach ($DB->request([
    'SELECT'    => [$t . '.id', $t . '.name', $t . '.doctype', $t . '.sequence'],
    'DISTINCT'  => true,
    'FROM'      => $t,
    'LEFT JOIN' => $vis['LEFT JOIN'],
    'WHERE'     => $where,
    'ORDER'     => [$t . '.name ASC'],
    'LIMIT'     => 20,
]) as $r) {
    $seq    = (int) $r['sequence'];
    $docs[] = [
        'id'   => (int) $r['id'],
        'code' => $seq > 0 ? sprintf('%s%04d', (string) $r['doctype'], $seq) : '',
        'name' => (string) $r['name'],
    ];
}

return new JsonResponse(['docs' => $docs]);
