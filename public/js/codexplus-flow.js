/* =========================================================================
   Codex+ — fluxograma no documento DIA (bloco Q5a, Claudio 27/09/2026)
   -------------------------------------------------------------------------
   Ponte entre o documento e o motor de quadro (codexplus-board.js). Monta
   cada [data-cx-flow]:
     data-source   id do <script type="application/json"> com o diagrama
                   gravado: { "kind": "fluxograma", "board": {…} }
     data-editable "1" mostra "Abrir o fluxograma" (tela cheia do motor)
     data-input    hidden _diagram que vai no Salvar do formulário
     data-doc, data-save  gravação por AJAX (ajax/diagram.save.php), a mesma
                   do organograma e da grade
     data-title    título do documento (nome do PNG)
   A página mostra o desenho em SVG (vetorial, o mesmo do PNG).
   PDF (Q5a-3, Claudio 27/09/2026): como o da grade — iframe fora da tela,
   A4 com orientação pelo formato do desenho (mais largo = paisagem),
   título e código no topo, desenho vetorial ajustado à folha. Na leitura o
   botão fica escondido: quem aciona é o "Exportar PDF" do topo da página.
   ========================================================================= */
(function () {
    'use strict';

    var KIND = 'fluxograma';

    function B() { return window.CodexplusBoard; }
    function esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function hora() {
        var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
        return p(d.getHours()) + ':' + p(d.getMinutes());
    }

    function mount(root) {
        if (root.__cxFlow || !B()) { return root.__cxFlow || null; }
        var src = document.getElementById(root.getAttribute('data-source') || '');
        var S;
        try { S = JSON.parse(src ? src.textContent : '{}'); } catch (e) { S = {}; }
        var board = S && S.board && typeof S.board === 'object' ? S.board : null;
        var editable = root.getAttribute('data-editable') === '1';
        var input = document.getElementById(root.getAttribute('data-input') || '');
        var saveUrl = root.getAttribute('data-save') || '';
        var docId = root.getAttribute('data-doc') || '';
        var title = root.getAttribute('data-title') || '';
        var code = root.getAttribute('data-code') || '';
        // A-2b: "Aprovadores: Ana (05/10/2026), …" abaixo do título no PDF.
        var sign = root.getAttribute('data-sign') || '';

        root.classList.add('cx-flow');
        root.innerHTML = '<div class="cx-flow-bar">'
            + (editable && saveUrl && docId
                ? '<button type="button" class="codexplus-btn codexplus-btn-primary" data-act="edit"><i class="ti ti-pencil"></i> Abrir o fluxograma</button>'
                  + '<span class="cx-flow-state" aria-live="polite"></span>'
                : '')
            + '<button type="button" class="codexplus-btn" data-act="png" title="Baixar o fluxograma como imagem PNG (o que está salvo)"><i class="ti ti-photo-down"></i> Baixar PNG</button>'
            + '<button type="button" class="codexplus-btn" data-act="pdf"' + (editable ? '' : ' hidden') + ' title="Exportar o fluxograma em PDF (o que está salvo)"><i class="ti ti-file-type-pdf"></i> Exportar PDF</button>'
            // Tela cheia na leitura (Claudio, 04/10/2026), como no organograma:
            // desenho em tamanho real, com zoom e rolagem.
            + '<button type="button" class="codexplus-btn" data-act="full" data-full><i class="ti ti-maximize"></i> Tela cheia</button>'
            + '<span class="cx-flow-zoom" data-zoombar hidden>'
            + '<button type="button" class="codexplus-btn" data-act="zout" title="Diminuir" aria-label="Diminuir"><i class="ti ti-zoom-out"></i></button>'
            + '<span class="cx-flow-zoomval" data-zoomval>100%</span>'
            + '<button type="button" class="codexplus-btn" data-act="zin" title="Aumentar" aria-label="Aumentar"><i class="ti ti-zoom-in"></i></button>'
            + '<button type="button" class="codexplus-btn" data-act="zfit" title="Ajustar à tela">Ajustar</button>'
            + '</span>'
            + '</div><div class="cx-flow-view"></div>';
        var view = root.querySelector('.cx-flow-view');

        function data() { return B()._clean(board, KIND); }
        function vazio(d) { return !d.items.length; }

        function draw() {
            var d = data();
            if (vazio(d)) {
                view.innerHTML = '<p class="cx-flow-empty">' + esc(editable
                    ? 'Fluxograma vazio. Clique em "Abrir o fluxograma" para desenhar.'
                    : 'Fluxograma ainda sem desenho.') + '</p>';
                root.querySelector('[data-act="png"]').hidden = true;
                root.querySelector('[data-act="full"]').hidden = true;
                if (editable) { root.querySelector('[data-act="pdf"]').hidden = true; }
                return;
            }
            // Leitura: tamanho real (sem ampliar 2x como no PNG); a CSS
            // encolhe para caber na largura.
            var r = B()._boardSvg(d, null, 1);
            view.innerHTML = r.svg;
            var el = view.querySelector('svg');
            if (el) { el.setAttribute('role', 'img'); el.setAttribute('aria-label', title || 'Fluxograma'); }
            // Q5h-2: forma com link abre o destino (documento na mesma aba,
            // endereço externo em aba nova).
            d.items.forEach(function (it) {
                var lo = it.t === 'shape' && B()._linkOf(it), g = lo && view.querySelector('[data-id="' + cssId(it.id) + '"]');
                if (!g) { return; }
                g.classList.add('cx-flow-lk');
                g.addEventListener('click', function () {
                    if (lo.ext) { window.open(lo.href, '_blank', 'noopener'); } else { window.location.href = lo.href; }
                });
            });
            root.querySelector('[data-act="png"]').hidden = false;
            root.querySelector('[data-act="full"]').hidden = false;
            if (editable) { root.querySelector('[data-act="pdf"]').hidden = false; }
            if (root.classList.contains('is-full')) { applyZoom(); }
        }

        function cssId(id) { return String(id).replace(/["\\]/g, '\\$&'); }
        // Q5h-2: links do fluxograma, para a lista do PDF (lá o desenho é imagem).
        function linksOf(d) {
            var out = [];
            d.items.forEach(function (it) {
                var lo = it.t === 'shape' && B()._linkOf(it);
                if (lo) { out.push({ step: String(it.text || '').trim().split('\n')[0] || '(sem texto)', lo: lo }); }
            });
            return out;
        }

        /* Folha A4 a 96 dpi, margem 10 mm; o cabeçalho ocupa ~14 mm. O
           desenho é escalado para caber (no máximo 1,5x, para um fluxograma
           pequeno não virar um pôster). */
        var MM = 96 / 25.4;
        function printPlan(d) {
            var r = B()._boardSvg(d, null, 1);
            var land = r.w > r.h;
            var aw = (land ? 277 : 190) * MM, ah = ((land ? 190 : 277) - 14) * MM;
            var k = Math.min(aw / r.w, ah / r.h, 1.5);
            return { orient: land ? 'landscape' : 'portrait', svg: r.svg, w: Math.floor(r.w * k), h: Math.floor(r.h * k) };
        }
        function linksHtml(d) {
            var ls = linksOf(d);
            if (!ls.length) { return ''; }
            return '<div class="lk" style="margin-top:8px;page-break-inside:avoid"><b style="font-size:12px">Links do fluxograma</b><ul style="margin:4px 0 0 16px;padding:0">'
                + ls.map(function (l) {
                    var href = l.lo.ext ? l.lo.href : new URL(l.lo.href, window.location.href).href;
                    return '<li><b>' + esc(l.step) + ':</b> <a href="' + esc(href) + '">' + esc(l.lo.label) + '</a></li>';
                }).join('') + '</ul></div>';
        }
        function pdf() {
            var d = data();
            if (vazio(d)) { return; }
            var plan = printPlan(d);
            var svg = plan.svg.replace(/^<svg([^>]*?) width="[^"]*" height="[^"]*"/, '<svg$1 width="' + plan.w + '" height="' + plan.h + '"');
            var frame = document.createElement('iframe');
            frame.setAttribute('aria-hidden', 'true');
            var pw = plan.orient === 'portrait' ? 'width:794px;height:1123px' : 'width:1123px;height:794px';
            frame.style.cssText = 'position:fixed;left:-10000px;top:0;border:0;' + pw;
            document.body.appendChild(frame);
            var doc = frame.contentDocument;
            var nome = (code ? code + ' - ' : '') + title;
            doc.open();
            doc.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + esc(nome) + '</title><style>'
                + '@page{size:A4 ' + plan.orient + ';margin:10mm}html,body{margin:0;background:#fff;font:10px Arial,sans-serif;color:#1d2330;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
                + '.h{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #1d2330;padding-bottom:4px;margin-bottom:8px}.h b{font-size:15px}'
                + '.d{text-align:center}.d svg{display:inline-block}' + '.s{font:9px Arial,sans-serif;color:#5f6b7a;margin:-4px 0 6px}'
                + '</style></head><body><div class="h"><b>' + esc(title) + '</b><span>' + esc(code) + '</span></div>'
                + (sign ? '<div class="s">' + esc(sign) + '</div>' : '')
                + '<div class="d">' + svg + '</div>' + linksHtml(d) + '</body></html>');
            doc.close();
            var old = document.title;
            document.title = nome; // achado 24: o nome sugerido vem da página principal
            setTimeout(function () {
                try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (_) { /* bloqueado */ }
                document.title = old;
                setTimeout(function () { frame.remove(); }, 1000);
            }, 80);
        }

        function estado(t, cls) {
            var el = root.querySelector('.cx-flow-state');
            if (el) { el.textContent = t; el.className = 'cx-flow-state' + (cls ? ' is-' + cls : ''); }
        }
        function tokenEl() {
            var f = root.closest('form');
            return (f && f.querySelector('[name="_glpi_csrf_token"]')) || document.querySelector('[name="_glpi_csrf_token"]');
        }

        /* Grava o quadro (JSON do motor) como diagrama do documento. Resolve
           só se o servidor aceitou; senão rejeita e o quadro continua aberto. */
        function post(D) {
            var tk = tokenEl();
            if (!tk) { return Promise.reject(new Error('sem token')); }
            var novo = { kind: KIND, board: D };
            var corpo = new FormData();
            corpo.append('id', docId);
            corpo.append('_diagram', JSON.stringify(novo));
            corpo.append('_glpi_csrf_token', tk.value);
            estado('salvando…', 'salvando');
            return fetch(saveUrl, { method: 'POST', body: corpo, credentials: 'same-origin' })
                .then(function (r) {
                    return r.json().catch(function () { return {}; }).then(function (j) {
                        if (!r.ok || !j.ok) { throw new Error(j.erro || ('HTTP ' + r.status)); }
                        return j;
                    });
                })
                .then(function (j) {
                    // Token consumido a cada POST (achado 43): o novo vai para todos.
                    if (j.csrf) { document.querySelectorAll('[name="_glpi_csrf_token"]').forEach(function (i) { i.value = j.csrf; }); }
                    board = D;
                    if (input) { input.value = JSON.stringify(novo); }
                    estado('salvo às ' + (j.hora || hora()), 'ok');
                    draw();
                })
                .catch(function (err) {
                    estado('não foi salvo', 'erro');
                    throw err;
                });
        }

        function edit() {
            B().open(null, null, KIND, { data: board, title: title, save: post, self: docId });
        }

        function png() {
            var btn = root.querySelector('[data-act="png"]');
            if (btn.disabled) { return; }
            btn.disabled = true;
            B()._toPng(data(), null).then(function (blob) {
                var a = document.createElement('a'), url = URL.createObjectURL(blob);
                a.href = url;
                a.download = B()._pngName(KIND, null, title);
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
            }).catch(function () {
                window.alert('Não foi possível gerar a imagem do fluxograma.');
            }).then(function () { btn.disabled = false; });
        }

        /* Tela cheia (API do navegador; sem ela, a classe de reserva is-full).
           Dentro dela o desenho deixa de encolher para a largura: zoom em
           passos, "Ajustar" cabe na tela, e o resto é rolagem. */
        var zoom = 1;
        function svgEl() { return view.querySelector('svg'); }
        function applyZoom() {
            var el = svgEl();
            if (!el) { return; }
            var w = parseFloat(el.getAttribute('width')) || el.viewBox.baseVal.width;
            var h = parseFloat(el.getAttribute('height')) || el.viewBox.baseVal.height;
            if (root.classList.contains('is-full')) {
                el.style.width = Math.round(w * zoom) + 'px';
                el.style.height = Math.round(h * zoom) + 'px';
                el.style.maxWidth = 'none';
            } else {
                el.style.width = el.style.height = el.style.maxWidth = '';
            }
            root.querySelector('[data-zoomval]').textContent = Math.round(zoom * 100) + '%';
        }
        function fitZoom() {
            var el = svgEl();
            if (!el) { return; }
            var w = parseFloat(el.getAttribute('width')) || el.viewBox.baseVal.width;
            var h = parseFloat(el.getAttribute('height')) || el.viewBox.baseVal.height;
            var aw = view.clientWidth - 24, ah = view.clientHeight - 24;
            zoom = Math.max(0.1, Math.min(aw / w, ah / h, 2));
            applyZoom();
        }
        function setFullUi(on) {
            root.classList.toggle('is-full', on);
            root.querySelector('[data-full]').innerHTML = on
                ? '<i class="ti ti-minimize"></i> Sair da tela cheia' : '<i class="ti ti-maximize"></i> Tela cheia';
            root.querySelector('[data-zoombar]').hidden = !on;
            if (on) { setTimeout(fitZoom, 60); } else { zoom = 1; applyZoom(); }
        }
        function toggleFull() {
            var on = !root.classList.contains('is-full');
            if (root.requestFullscreen) {
                if (on) { root.requestFullscreen().then(function () { setFullUi(true); }).catch(function () { setFullUi(true); }); }
                else if (document.fullscreenElement) { document.exitFullscreen(); }
                else { setFullUi(false); }
            } else { setFullUi(on); }
        }
        document.addEventListener('fullscreenchange', function () {
            if (!document.fullscreenElement && root.classList.contains('is-full')) { setFullUi(false); }
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && root.classList.contains('is-full') && !document.fullscreenElement) { setFullUi(false); }
        });
        view.addEventListener('wheel', function (e) {
            if (!root.classList.contains('is-full') || !(e.ctrlKey || e.metaKey)) { return; }
            e.preventDefault();
            zoom = Math.max(0.1, Math.min(4, zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
            applyZoom();
        }, { passive: false });

        root.addEventListener('click', function (e) {
            var b = e.target.closest('button[data-act]');
            if (!b || !root.contains(b)) { return; }
            var act = b.getAttribute('data-act');
            if (act === 'edit') { edit(); }
            else if (act === 'png') { png(); }
            else if (act === 'pdf') { pdf(); }
            else if (act === 'full') { toggleFull(); }
            else if (act === 'zin') { zoom = Math.min(4, zoom * 1.25); applyZoom(); }
            else if (act === 'zout') { zoom = Math.max(0.1, zoom / 1.25); applyZoom(); }
            else if (act === 'zfit') { fitZoom(); }
        });

        draw();
        root.__cxFlow = { draw: draw, edit: edit, post: post, pdf: pdf, plan: function () { return printPlan(data()); }, board: function () { return board; } };
        return root.__cxFlow;
    }

    function boot() { document.querySelectorAll('[data-cx-flow]').forEach(mount); }

    window.CodexplusFlow = { mount: mount, boot: boot };
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
