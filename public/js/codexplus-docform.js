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

    /* 2. Modelo (R3b4, Claudio 26/09/2026): lista os modelos do tipo
          escolhido (padrão primeiro, "Em branco" no fim) e preenche o corpo.
          Se já houver texto escrito à mão, pergunta antes de substituir. A
          partir de 10 opções a lista ganha busca (Select2 do GLPI). */
    function modelos(form) {
        var sel = form.querySelector('#cx-template');
        var tipo = form.querySelector('select[name="doctype"]');
        var src = document.getElementById('cx-templates-data');
        if (!sel || !tipo || !src) { return; }
        var lista;
        try { lista = JSON.parse(src.textContent || '[]'); } catch (e) { lista = []; }
        var aplicado = '';      // corpo como o último modelo o deixou
        var atual = null;       // valor já tratado (o change pode chegar duas vezes)
        var tipoAtual = null;

        function editor() { return window.tinymce ? window.tinymce.get('codexplus-doc-content') : null; }
        function vazio(h) { return !h || !String(h).replace(/<[^>]*>|&nbsp;|\s/g, ''); }
        function acha(id) { return lista.filter(function (t) { return String(t.id) === String(id); })[0] || null; }
        function aplica(id, pergunta) {
            var ed = editor();
            if (!ed) { return true; }
            var agora = ed.getContent();
            if (pergunta && !vazio(agora) && agora !== aplicado &&
                !window.confirm('Substituir o texto já escrito pelo conteúdo do modelo?')) {
                return false;
            }
            var t = acha(id);
            ed.setContent(t ? t.content : '');
            aplicado = ed.getContent();
            return true;
        }
        function select2(n) {
            if (!window.jQuery || !window.jQuery.fn || !window.jQuery.fn.select2) { return; }
            var $s = window.jQuery(sel);
            if (n >= 10) {
                if (!$s.data('select2')) { $s.select2({ width: '100%', minimumResultsForSearch: 0 }); }
                $s.trigger('change.select2');
            } else if ($s.data('select2')) {
                $s.select2('destroy');
            }
        }
        function monta() {
            if (tipo.value === tipoAtual) { return; }
            tipoAtual = tipo.value;
            var ops = lista.filter(function (t) { return t.doctype === tipo.value; });
            sel.innerHTML = ops.map(function (t) {
                var o = document.createElement('option');
                o.value = t.id;
                o.textContent = t.name + (t.is_default ? ' (padrão)' : '');
                return o.outerHTML;
            }).join('') + '<option value="0">Em branco</option>';
            sel.value = ops.length ? String(ops[0].id) : '0';
            select2(ops.length + 1);
            if (aplica(sel.value, true)) { atual = sel.value; } else { sel.value = '0'; atual = '0'; }
        }
        function troca() {
            if (sel.value === atual) { return; }
            if (aplica(sel.value, true)) {
                atual = sel.value;
            } else {
                sel.value = atual;
                if (window.jQuery) { window.jQuery(sel).trigger('change.select2'); }
            }
        }
        onChange(sel, troca);
        onChange(tipo, monta);
        // O editor do GLPI nasce depois do script: espera por ele (até ~15 s).
        var tent = 0;
        (function espera() {
            if (editor() && editor().initialized) { monta(); return; }
            if (++tent < 60) { setTimeout(espera, 250); }
        })();
    }

    function boot() {
        document.querySelectorAll('form').forEach(function (f) {
            if (!f.querySelector('.codexplus-doc-edit')) { return; }
            tipos(f);
            modelos(f);
        });
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
