/* =========================================================================
   Codex+ — formulário do documento (bloco R3b2-b)
   -------------------------------------------------------------------------
   Comportamento da página front/document.form.php, sem regra nenhuma (o
   servidor confere tudo de novo ao gravar):

   1. Campo que só existe em alguns tipos ([data-cx-only-type="PRP"]: Cliente
      em texto, só em proposta; "LAU DTC": Cliente vinculado, bloco T1 — lista
      separada por espaço). Na criação o tipo ainda pode mudar: o campo
      aparece e some com a escolha. Na edição não há seletor de tipo.

   A lista de auditores por categoria (ajax/document.auditors.php) saiu no
   bloco A1: o auditor vem do perfil e a lista já chega pronta do servidor.

   Listas do GLPI são Select2: a troca chega pelo jQuery ('change'), por isso
   os dois eventos são escutados.
   ========================================================================= */
(function () {
    'use strict';

    function onChange(el, fn) {
        el.addEventListener('change', fn);
        if (window.jQuery) { window.jQuery(el).on('change', fn); }
    }

    function tipos(form) {
        var sel = form.querySelector('select[name="doctype"]');
        if (!sel) { return; }
        var campos = form.querySelectorAll('[data-cx-only-type]');
        var upd = function () {
            campos.forEach(function (c) {
                c.hidden = c.getAttribute('data-cx-only-type').split(/\s+/).indexOf(sel.value) < 0;
            });
        };
        onChange(sel, upd);
        upd();
    }

    function boot() {
        document.querySelectorAll('form').forEach(function (f) {
            if (!f.querySelector('.codexplus-doc-edit')) { return; }
            tipos(f);
        });
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
