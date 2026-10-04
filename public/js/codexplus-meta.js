/* =========================================================================
   Codex+ — dados do documento recolhíveis, em três abas (Claudio, 04/10/2026)
   -------------------------------------------------------------------------
   Só tela: os campos continuam no formulário e são gravados juntos (o que
   está oculto vai no POST do mesmo jeito). Regras:
     - criação: aberto, aba "Lugar e tipo";
     - edição: como a pessoa deixou da última vez (localStorage), recolhido
       na primeira vez;
     - faltando algo para enviar (estante, auditor): abre sozinho na aba do
       que falta.
   Ocultar usa a classe cx-tab-off (não o atributo hidden, que o
   codexplus-docform.js já usa para mostrar campos por tipo).
   HV-1 (Claudio, 04/10/2026): a mesma barra serve à leitura, só com a aba
   Histórico — data-default-tab (aba inicial), data-store (chave própria
   no localStorage, recolhida na primeira vez) e data-label-open/closed
   (texto do botão). Pode haver mais de uma barra na página.
   ========================================================================= */
(function () {
    'use strict';
    function read(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
    function write(key, v) { try { window.localStorage.setItem(key, v); } catch (e) { /* sem storage: só nesta tela */ } }

    function init(box) {
        var key = box.getAttribute('data-store') || 'cx-meta-open';
        var first = box.getAttribute('data-default-tab') || 'lugar';
        var lblOpen = box.getAttribute('data-label-open') || 'Ocultar dados';
        var lblClosed = box.getAttribute('data-label-closed') || 'Mostrar dados';
        var isNew = box.getAttribute('data-new') === '1';
        var missing = box.getAttribute('data-missing') === '1';
        var toggle = box.querySelector('[data-cx-meta-toggle]');
        var tabs = Array.prototype.slice.call(box.querySelectorAll('[data-cx-tab-btn]'));
        var parts = Array.prototype.slice.call(box.querySelectorAll('[data-cx-tab]'));

        function setTab(name) {
            box.setAttribute('data-tab', name);
            tabs.forEach(function (b) {
                var on = b.getAttribute('data-cx-tab-btn') === name;
                b.classList.toggle('is-active', on);
                b.setAttribute('aria-selected', on ? 'true' : 'false');
            });
            parts.forEach(function (el) {
                el.classList.toggle('cx-tab-off', el.getAttribute('data-cx-tab') !== name);
            });
        }
        function setOpen(on, remember) {
            box.classList.toggle('is-closed', !on);
            toggle.setAttribute('aria-expanded', on ? 'true' : 'false');
            toggle.innerHTML = '';
            var ico = document.createElement('i');
            ico.className = 'ti ' + (on ? 'ti-chevron-up' : 'ti-chevron-down');
            toggle.appendChild(ico);
            toggle.appendChild(document.createTextNode(' ' + (on ? lblOpen : lblClosed)));
            if (remember) { write(key, on ? '1' : '0'); }
        }

        tabs.forEach(function (b) {
            b.addEventListener('click', function () { setTab(b.getAttribute('data-cx-tab-btn')); });
        });
        toggle.addEventListener('click', function () { setOpen(box.classList.contains('is-closed'), true); });

        setTab(missing && !isNew ? (box.getAttribute('data-missing-tab') || first) : first);
        setOpen(isNew || missing || read(key) === '1', false);
    }

    function boot() {
        Array.prototype.forEach.call(document.querySelectorAll('[data-cx-meta]'), init);
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
