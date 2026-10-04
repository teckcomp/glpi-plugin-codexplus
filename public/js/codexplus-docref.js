/* =========================================================================
   Codex+ — Referência a outro documento dentro do texto (Etapa 5b,
   Claudio, 04/10/2026)
   -------------------------------------------------------------------------
   Botão "Referência" do editor (codexplus-editor.js) abre esta janela:
   busca os documentos que este tipo aceita (mesma busca dos vinculados,
   com os já vinculados incluídos) e insere
     <a class="cx-docref" href="…/document.form.php?id=N">POP0005:00 Título</a>
   O texto gravado é só um ponto de partida: na leitura o servidor troca pelo
   código e título atuais (DocumentLink::resolveRefs) e, ao salvar, o
   citado vira vinculado (DocumentLink::syncRefs).
   ========================================================================= */
(function () {
    'use strict';

    function esc(t) {
        return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function open(editor) {
        var host = document.querySelector('[data-cx-docref-url]');
        if (!host) { return; }
        var url = host.getAttribute('data-cx-docref-url');
        var bm = editor.selection.getBookmark(2, true);

        var wrap = document.createElement('div');
        wrap.className = 'cx-docref-modal';
        wrap.innerHTML = '<div class="cx-docref-box" role="dialog" aria-modal="true" aria-label="Referência a outro documento">'
            + '<div class="cx-docref-head"><strong>Referência a outro documento</strong>'
            + '<button type="button" class="cx-docref-x" aria-label="Fechar">&times;</button></div>'
            + '<input type="search" class="form-control" placeholder="Buscar por código ou título" autocomplete="off">'
            + '<ul class="cx-docref-list"></ul>'
            + '<div class="cx-docref-hint">Entra no texto como link. Código e título se atualizam sozinhos; ao salvar, o documento citado vira vinculado.</div>'
            + '</div>';
        document.body.appendChild(wrap);
        var q = wrap.querySelector('input');
        var list = wrap.querySelector('.cx-docref-list');
        var timer = null, seq = 0;

        function close() {
            wrap.remove();
            document.removeEventListener('keydown', onKey, true);
            editor.focus();
        }
        function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(); } }
        function pick(it) {
            var href = url.split('?')[0] + '?id=' + it.id;
            editor.focus();
            editor.selection.moveToBookmark(bm);
            editor.insertContent('<a class="cx-docref" href="' + esc(href) + '">' + esc(it.code + ' ' + it.name) + '</a>&nbsp;');
            close();
        }
        function run() {
            var my = ++seq;
            fetch(url + '&q=' + encodeURIComponent(q.value.trim()), { credentials: 'same-origin' })
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
                })
                .catch(function (err) { console.error('Codex+ (referência):', err); });
        }

        wrap.addEventListener('click', function (e) { if (e.target === wrap) { close(); } });
        wrap.querySelector('.cx-docref-x').addEventListener('click', close);
        q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 250); });
        q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); } });
        document.addEventListener('keydown', onKey, true);
        run();
        q.focus();
    }

    window.CodexplusDocref = { open: open };
})();
