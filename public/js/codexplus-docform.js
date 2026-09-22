/* =========================================================================
   Codex+ — formulário do documento (bloco R3b2-b)
   -------------------------------------------------------------------------
   Dois comportamentos da página front/document.form.php, sem regra nenhuma
   (o servidor confere tudo de novo ao gravar):

   1. Campo que só existe num tipo ([data-cx-only-type="PRP"]: Cliente, só em
      proposta). Na criação o tipo ainda pode mudar: o campo aparece e some
      com a escolha. Na edição não há seletor de tipo e nada muda.

   2. Auditor responsável ([data-cx-auditor]). É escolhido entre os
      auditores do SETOR, e o setor vem das categorias: a cada troca de
      categoria a lista é pedida a ajax/document.auditors.php. O escolhido
      continua marcado se ainda estiver na lista nova.

   Listas do GLPI são Select2: a troca chega pelo jQuery ('change'), por isso
   os dois eventos são escutados.
   CSRF (achado 43): o POST consome o token; o novo vai para todos os campos.
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
            campos.forEach(function (c) { c.hidden = c.getAttribute('data-cx-only-type') !== sel.value; });
        };
        onChange(sel, upd);
        upd();
    }

    function auditor(form) {
        var box = form.querySelector('[data-cx-auditor]');
        var cats = form.querySelector('select[name="_categories[]"]');
        if (!box || !cats) { return; }
        var sel = box.querySelector('select[name="users_id_auditor"]');
        var vazio = box.querySelector('[data-cx-auditor-empty]');
        var dica = box.querySelector('[data-cx-auditor-hint]');
        if (!sel) { return; }
        var url = box.getAttribute('data-url');
        var pedido = 0;

        function marcadas() {
            return Array.prototype.filter.call(cats.options, function (o) { return o.selected && o.value; })
                .map(function (o) { return o.value; });
        }
        function preenche(lista) {
            var atual = sel.value;
            var html = '<option value="0">-----</option>';
            lista.forEach(function (a) {
                var o = document.createElement('option');
                o.value = String(a.id);
                o.textContent = a.nome;
                html += o.outerHTML;
            });
            sel.innerHTML = html;
            var fica = lista.some(function (a) { return String(a.id) === atual; });
            sel.value = fica ? atual : '0';
            if (window.jQuery) { window.jQuery(sel).trigger('change.select2'); }
            if (vazio) { vazio.hidden = lista.length > 0; }
            if (dica) { dica.hidden = lista.length === 0; }
        }
        function recarrega() {
            var ids = marcadas();
            var meu = ++pedido;
            if (!ids.length) { preenche([]); return; }
            var corpo = new FormData();
            ids.forEach(function (id) { corpo.append('categories[]', id); });
            var tk = form.querySelector('[name="_glpi_csrf_token"]');
            corpo.append('_glpi_csrf_token', tk ? tk.value : '');
            fetch(url, { method: 'POST', body: corpo, credentials: 'same-origin' })
                .then(function (r) { return r.json().catch(function () { return {}; }); })
                .then(function (j) {
                    if (j.csrf) {
                        document.querySelectorAll('[name="_glpi_csrf_token"]').forEach(function (i) { i.value = j.csrf; });
                    }
                    if (meu !== pedido) { return; }   // resposta atrasada de uma troca anterior
                    preenche(j.auditores || []);
                })
                .catch(function () { /* lista fica como estava; o envio avisa se faltar auditor */ });
        }
        onChange(cats, recarrega);
        // Criação: a lista nasce vazia. Se o formulário já vier com categoria
        // marcada (voltar do navegador), carrega agora.
        if (box.closest('form') && !form.querySelector('input[name="id"]') && marcadas().length) { recarrega(); }
    }

    function boot() {
        document.querySelectorAll('form').forEach(function (f) {
            if (!f.querySelector('.codexplus-doc-edit')) { return; }
            tipos(f);
            auditor(f);
        });
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
