<?php
/**
 * Codex+ — caminho antigo de criação (artigo da Base de Conhecimento).
 * Desde a R3b4 (Claudio, 26/09/2026) todo documento nasce no modelo novo, a
 * partir dos Modelos: este endereço só leva para a página de criação nova.
 */
include('../../../inc/includes.php');

/** @var array $CFG_GLPI */
global $CFG_GLPI; // achado 9

Html::redirect($CFG_GLPI['root_doc'] . '/plugins/codexplus/front/document.form.php'
    . (isset($_GET['doctype']) ? '?doctype=' . urlencode((string) $_GET['doctype']) : ''));
