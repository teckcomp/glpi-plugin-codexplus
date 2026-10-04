/* =========================================================================
   Codex+ — Documentos vinculados (Etapa 5a, Claudio, 04/10/2026)
   -------------------------------------------------------------------------
   Busca de documentos para vincular (JSON do próprio document.form.php,
   ?link_search=1&q=) e reordenação por arrastar. Nenhuma regra aqui: o
   servidor confere tudo de novo (DocumentLink). Reordenar grava a ordem dos
   filhos diretos e recarrega a página (os netos vêm junto do pai).
   ========================================================================= */
(function () {
    'use strict';

    function esc(t) {
        return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function initSearch(box, form) {
        var q = form.querySelector('[data-cx-link-q]');
        var list = form.querySelector('[data-cx-link-results]');
        var child = form.querySelector('[data-cx-link-child]');
        var add = form.querySelector('[data-cx-link-add]');
        if (!q || !list || !child || !add) { return; }
        var timer = null, seq = 0;

        function pick(item) {
            child.value = item.id;
            q.value = item.code + ' — ' + item.name;
            list.hidden = true;
            add.disabled = false;
        }
        function run() {
            var my = ++seq;
            fetch(box.getAttribute('data-search') + '&q=' + encodeURIComponent(q.value.trim()), { credentials: 'same-origin' })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (my !== seq) { return; }
                    var itens = (data && data.itens) || [];
                    list.innerHTML = itens.length ? '' : '<li class="is-empty">Nada encontrado.</li>';
                    itens.forEach(function (it) {
                        var li = document.createElement('li');
                        li.innerHTML = '<button type="button"><span class="cx-link-code">' + esc(it.code) + '</span> '
                            + esc(it.name) + ' <small>' + esc(it.type_label) + '</small></button>';
                        li.firstChild.addEventListener('click', function () { pick(it); });
                        list.appendChild(li);
                    });
                    list.hidden = false;
                })
                .catch(function (err) { console.error('Codex+ (vínculos):', err); });
        }
        q.addEventListener('input', function () {
            child.value = '';
            add.disabled = true;
            clearTimeout(timer);
            timer = setTimeout(run, 250);
        });
        q.addEventListener('focus', function () { if (!list.innerHTML) { run(); } else { list.hidden = false; } });
        q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); } });
        document.addEventListener('click', function (e) {
            if (!form.contains(e.target)) { list.hidden = true; }
        });
    }

    function initDrag(box, form) {
        var order = form.querySelector('[data-cx-link-order]');
        var tops = Array.prototype.slice.call(box.querySelectorAll('[data-cx-link]'));
        if (!order || tops.length < 2) { return; }
        var dragged = null;
        tops.forEach(function (li) {
            li.addEventListener('dragstart', function (e) {
                dragged = li.getAttribute('data-cx-link');
                li.classList.add('is-dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', dragged);
            });
            li.addEventListener('dragend', function () { li.classList.remove('is-dragging'); });
            li.addEventListener('dragover', function (e) {
                if (dragged === null) { return; }
                e.preventDefault();
                li.classList.add('is-over');
            });
            li.addEventListener('dragleave', function () { li.classList.remove('is-over'); });
            li.addEventListener('drop', function (e) {
                e.preventDefault();
                li.classList.remove('is-over');
                var target = li.getAttribute('data-cx-link');
                if (dragged === null || target === dragged) { return; }
                var ids = tops.map(function (x) { return x.getAttribute('data-cx-link'); });
                ids.splice(ids.indexOf(dragged), 1);
                var r = li.getBoundingClientRect();
                var pos = ids.indexOf(target) + ((e.clientY > r.top + r.height / 2) ? 1 : 0);
                ids.splice(pos, 0, dragged);
                order.disabled = false;
                order.value = ids.join(',');
                form.querySelector('[data-cx-link-child]').value = '';
                form.submit();
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var box = document.querySelector('[data-cx-links]');
        var form = document.getElementById('cx-links-form');
        if (!box || !form) { return; }
        initSearch(box, form);
        initDrag(box, form);
    });
})();
