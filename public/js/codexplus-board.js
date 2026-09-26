/* =========================================================================
   Codex+ — motor de quadro (bloco Q1, Claudio 26/09/2026)
   -------------------------------------------------------------------------
   Um motor, várias paletas (decisão de 26/09/2026). Neste bloco: PLANTA
   (fundo com a planta do cliente) e TOPOLOGIA (quadro em branco, zonas de
   VLAN/site), abertos pelos botões do editor (codexplus-editor.js).

   Gravado no corpo do documento:
     <span class="cx-board" data-cx-board='{json}'>
       <img class="cx-board-bg" src="…planta…">   (só na planta com fundo)
       <img src="…PNG do quadro…">
     </span>
   O PNG é o que a leitura, o PDF e o Word mostram; o JSON (data-*, que o
   sanitizador tira na leitura, achado 57) serve para editar de novo. As
   imagens sobem como imagem colada (uploadFile do GLPI, achado 60), com
   nomes cx-quadro-*.png, que a lista de Anexos ignora.

   Itens: icon {x,y,size,icon,label,f:{modelo,ip,vlan,obs},cat,cone},
          zone {x,y,w,h,label,color}, text {x,y,text,color,size}.
   Todos com id, lock (travado) e g (grupo).
   Q2 traz ligações, cabos e escala; Q3 legenda, lista de materiais e
   "+ Ícone" a partir de imagem.
   ========================================================================= */
(function () {
    'use strict';

    var NS = 'http://www.w3.org/2000/svg';
    var GRID = 10;
    var SNAP = 6;
    var COLORS = ['#185FA5', '#1D9E75', '#D85A30', '#534AB7', '#A32D2D', '#5F5E5A'];
    var MODES = { topologia: 'Topologia', planta: 'Planta de execução' };
    var PXM_DEFAULT = 20;   // sem escala definida: 1 m = 20 px (aproximado)
    var PXM = PXM_DEFAULT;  // escala do quadro em uso (render e PNG)

    function esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function uid() { return 'n' + Math.random().toString(36).slice(2, 9); }
    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    function Icons() { return window.CodexplusIcons; }

    function starter(mode) {
        return { v: 1, mode: MODES[mode] ? mode : 'topologia', w: 1400, h: 900, bgOpacity: 0.6, pxm: 0, items: [] };
    }

    function clean(d, mode) {
        var out = starter(d && d.mode || mode);
        if (!d || typeof d !== 'object') { return out; }
        out.w = Math.max(400, Math.min(6000, +d.w || out.w));
        out.h = Math.max(300, Math.min(6000, +d.h || out.h));
        out.bgOpacity = Math.max(0.1, Math.min(1, +d.bgOpacity || out.bgOpacity));
        out.pxm = Math.max(0, Math.min(1000, +d.pxm || 0));
        var pxm = out.pxm || PXM_DEFAULT;
        (Array.isArray(d.items) ? d.items : []).forEach(function (it) {
            if (!it || ['icon', 'zone', 'text'].indexOf(it.t) < 0) { return; }
            var n = { id: String(it.id || uid()), t: it.t, x: +it.x || 0, y: +it.y || 0, lock: !!it.lock, g: it.g ? String(it.g) : '' };
            if (it.t === 'icon') {
                n.icon = Icons().get(it.icon) ? it.icon : 'generico';
                n.size = Math.max(24, Math.min(160, +it.size || 48));
                n.label = String(it.label || '').slice(0, 80);
                n.cat = Icons().CATS[it.cat] ? it.cat : '';
                n.rot = ((Math.round(+it.rot || 0) % 360) + 360) % 360;
                n.f = {};
                ['modelo', 'ip', 'vlan', 'obs'].forEach(function (k) { n.f[k] = String((it.f || {})[k] || '').slice(0, 200); });
                if (Icons().get(n.icon).cone) {
                    var c = it.cone || {};
                    // Alcance em METROS (Claudio, 26/09/2026); dado antigo vinha em px.
                    var m = +c.m || (c.range ? c.range / pxm : 8);
                    n.cone = { on: !!c.on, dir: (+c.dir || 0) % 360, fov: Math.max(10, Math.min(180, +c.fov || 70)), m: Math.max(0.5, Math.min(200, Math.round(m * 2) / 2)) };
                }
            } else if (it.t === 'zone') {
                n.w = Math.max(20, +it.w || 200); n.h = Math.max(20, +it.h || 120);
                n.label = String(it.label || '').slice(0, 80);
                n.color = COLORS.indexOf(it.color) >= 0 ? it.color : COLORS[1];
            } else {
                n.text = String(it.text || '').slice(0, 300);
                n.color = COLORS.indexOf(it.color) >= 0 ? it.color : '#1d2330';
                n.size = ['p', 'm', 'g'].indexOf(it.size) >= 0 ? it.size : 'm';
            }
            out.items.push(n);
        });
        return out;
    }

    var TEXT_PX = { p: 12, m: 15, g: 20 };

    /* ---------------- desenho de um item (tela e PNG) ---------------- */
    function itemSvg(it, forExport) {
        if (it.t === 'zone') {
            return '<g data-id="' + it.id + '"><rect x="' + it.x + '" y="' + it.y + '" width="' + it.w + '" height="' + it.h
                + '" rx="10" fill="' + it.color + '" fill-opacity="0.05" stroke="' + it.color + '" stroke-width="2" stroke-dasharray="8 5"/>'
                + '<text x="' + (it.x + 12) + '" y="' + (it.y + 20) + '" font-family="Arial,sans-serif" font-size="13" fill="' + it.color + '">'
                + esc(it.label) + '</text></g>';
        }
        if (it.t === 'text') {
            var fs = TEXT_PX[it.size] || 15;
            var lines = String(it.text || (forExport ? '' : 'Texto')).split('\n');
            return '<g data-id="' + it.id + '"><text x="' + it.x + '" y="' + (it.y + fs) + '" font-family="Arial,sans-serif" font-size="' + fs + '" fill="' + it.color + '">'
                + lines.map(function (l, i) { return '<tspan x="' + it.x + '" dy="' + (i ? fs * 1.25 : 0) + '">' + esc(l) + '</tspan>'; }).join('')
                + '</text></g>';
        }
        var s = it.size, cx = it.x + s / 2, cy = it.y + s / 2, h = '';
        var cat = Icons().CATS[it.cat || (Icons().get(it.icon) || {}).cat] || Icons().CATS.infra;
        if (it.cone && it.cone.on) {
            var a1 = (it.cone.dir - it.cone.fov / 2) * Math.PI / 180, a2 = (it.cone.dir + it.cone.fov / 2) * Math.PI / 180, r = it.cone.m * PXM;
            h += '<path d="M' + cx + ' ' + cy + 'L' + (cx + r * Math.cos(a1)).toFixed(1) + ' ' + (cy + r * Math.sin(a1)).toFixed(1)
                + 'A' + r + ' ' + r + ' 0 ' + (it.cone.fov > 180 ? 1 : 0) + ' 1 ' + (cx + r * Math.cos(a2)).toFixed(1) + ' ' + (cy + r * Math.sin(a2)).toFixed(1)
                + 'Z" fill="' + cat.S + '" fill-opacity="0.12" stroke="' + cat.S + '" stroke-opacity="0.5" stroke-width="1"/>'
                + '<text x="' + (cx + (r + 10) * Math.cos(it.cone.dir * Math.PI / 180)).toFixed(1) + '" y="' + (cy + (r + 10) * Math.sin(it.cone.dir * Math.PI / 180) + 4).toFixed(1)
                + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="' + Math.max(9, labelPx(it.size) - 1) + '" fill="' + cat.S + '">' + fmtM(it.cone.m) + '</text>';
        }
        // Câmera: gira com a direção da visão (o ícone aponta para a direita).
        // Demais ícones: giro próprio. O nome embaixo não gira.
        var ang = it.cone ? it.cone.dir : (it.rot || 0);
        var rot = ang ? ' transform="rotate(' + ang + ' ' + cx + ' ' + cy + ')"' : '';
        h += '<g' + rot + '><svg x="' + it.x + '" y="' + it.y + '" width="' + s + '" height="' + s + '" viewBox="0 0 48 48">'
            + Icons().body(it.icon, it.cat) + '</svg></g>';
        // O nome acompanha o tamanho do ícone (Claudio, 26/09/2026).
        var fs = labelPx(s), ty = it.y + s + fs + 1;
        if (it.label) {
            h += '<text x="' + cx + '" y="' + ty + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="' + fs + '" fill="#1d2330">' + esc(it.label) + '</text>';
            ty += fs + 1;
        }
        if (it.f && it.f.ip) {
            h += '<text x="' + cx + '" y="' + ty + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="' + Math.max(8, fs - 1) + '" fill="#6b7280">' + esc(it.f.ip) + '</text>';
        }
        return '<g data-id="' + it.id + '">' + h + '</g>';
    }

    function labelPx(size) { return Math.max(8, Math.round(size / 4)); }
    function fmtM(m) { return String(m).replace('.', ',') + ' m'; }

    function bbox(it) {
        if (it.t === 'zone') { return { x: it.x, y: it.y, w: it.w, h: it.h }; }
        if (it.t === 'text') {
            var fs = TEXT_PX[it.size] || 15, lines = String(it.text || 'Texto').split('\n');
            var w = Math.max.apply(null, lines.map(function (l) { return l.length; })) * fs * 0.55;
            return { x: it.x, y: it.y, w: Math.max(30, w), h: lines.length * fs * 1.25 + 4 };
        }
        var lp = labelPx(it.size) + 1;
        var extra = (it.label ? lp : 0) + (it.f && it.f.ip ? lp : 0);
        return { x: it.x, y: it.y, w: it.size, h: it.size + extra + (extra ? 4 : 0) };
    }

    /* ---------------- PNG do quadro ---------------- */
    function toPng(data, bgImg) {
        PXM = data.pxm || PXM_DEFAULT;
        var box;
        if (bgImg) {
            box = { x: 0, y: 0, w: data.w, h: data.h };
        } else {
            var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
            data.items.forEach(function (it) {
                var b = bbox(it);
                if (it.cone && it.cone.on) {
                    var c = { x: it.x + it.size / 2, y: it.y + it.size / 2 }, r = it.cone.m * PXM + 30;
                    x1 = Math.min(x1, c.x - r); y1 = Math.min(y1, c.y - r); x2 = Math.max(x2, c.x + r); y2 = Math.max(y2, c.y + r);
                }
                x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.w); y2 = Math.max(y2, b.y + b.h);
            });
            if (!isFinite(x1)) { x1 = 0; y1 = 0; x2 = 400; y2 = 200; }
            box = { x: x1 - 24, y: y1 - 24, w: x2 - x1 + 48, h: y2 - y1 + 48 };
        }
        var k = Math.min(2, 2400 / Math.max(box.w, box.h));
        var W = Math.round(box.w * k), H = Math.round(box.h * k);
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="' + box.x + ' ' + box.y + ' ' + box.w + ' ' + box.h + '">'
            + '<rect x="' + box.x + '" y="' + box.y + '" width="' + box.w + '" height="' + box.h + '" fill="#ffffff"/>'
            + (bgImg ? '<image href="' + bgImg + '" x="0" y="0" width="' + data.w + '" height="' + data.h + '" opacity="' + data.bgOpacity + '"/>' : '')
            + data.items.filter(function (i) { return i.t === 'zone'; }).map(function (i) { return itemSvg(i, true); }).join('')
            + data.items.filter(function (i) { return i.t !== 'zone'; }).map(function (i) { return itemSvg(i, true); }).join('')
            + '</svg>';
        return new Promise(function (ok, fail) {
            var img = new Image();
            img.onload = function () {
                var cv = document.createElement('canvas');
                cv.width = W; cv.height = H;
                cv.getContext('2d').drawImage(img, 0, 0, W, H);
                cv.toBlob(function (b) { if (b) { ok(b); } else { fail(new Error('png')); } }, 'image/png');
            };
            img.onerror = function () { fail(new Error('svg')); };
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        });
    }

    /* ---------------- imagem: carregar e converter ---------------- */
    function fileToDataUrl(file, max) {
        return new Promise(function (ok, fail) {
            var rd = new FileReader();
            rd.onload = function () {
                var im = new Image();
                im.onload = function () {
                    var k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
                    var cv = document.createElement('canvas');
                    cv.width = Math.round(im.naturalWidth * k); cv.height = Math.round(im.naturalHeight * k);
                    var g = cv.getContext('2d');
                    g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
                    g.drawImage(im, 0, 0, cv.width, cv.height);
                    ok({ url: cv.toDataURL('image/jpeg', 0.85), w: cv.width, h: cv.height });
                };
                im.onerror = function () { fail(new Error('img')); };
                im.src = rd.result;
            };
            rd.onerror = function () { fail(new Error('file')); };
            rd.readAsDataURL(file);
        });
    }
    function urlToDataUrl(url) {
        return fetch(url, { credentials: 'same-origin' }).then(function (r) {
            if (!r.ok) { throw new Error('img'); }
            return r.blob();
        }).then(function (b) {
            return new Promise(function (ok) { var rd = new FileReader(); rd.onload = function () { ok(rd.result); }; rd.readAsDataURL(b); });
        });
    }
    function dataUrlToBlob(u) {
        var p = u.split(','), mime = (p[0].match(/:(.*?);/) || [])[1] || 'image/png';
        var bin = atob(p[1]), arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) { arr[i] = bin.charCodeAt(i); }
        return new Blob([arr], { type: mime });
    }

    /* A planta de fundo é a PRIMEIRA de duas imagens do quadro: ao salvar, o
       GLPI troca a <img> e perde a classe cx-board-bg (achado 56). */
    function bgOf(wrap) {
        var imgs = wrap.querySelectorAll('img');
        return wrap.querySelector('img.cx-board-bg') || (imgs.length > 1 ? imgs[0] : null);
    }

    /* ---------------- gravar no editor ---------------- */
    function uploadImg(editor, imgEl, blob, name) {
        var up = new Blob([blob], { type: blob.type || 'image/png' });
        up.name = name;
        var id = Math.random().toString();
        var url = URL.createObjectURL(up);
        editor.dom.setAttribs(imgEl, { src: url, 'data-mce-src': url, 'data-upload_id': id, width: null, height: null, id: null });
        if (Array.isArray(window.uploaded_images) && typeof window.uploadFile === 'function') {
            window.uploaded_images.push({ upload_id: id, filename: name });
            window.uploadFile(up, editor);
            return true;
        }
        return false;
    }

    function apply(editor, node, data, png, bg) {
        var dom = editor.dom, ok = true, stamp = Date.now();
        editor.undoManager.transact(function () {
            var wrap = node;
            if (!wrap) {
                editor.focus();
                // Marcador só de texto: uma <img data:> aqui seria enviada pelo
                // glpi_upload_doc (achado 60) e trocada no meio do caminho.
                editor.insertContent('<span class="cx-board" data-cx-new="1">\u200b</span><p><br></p>');
                wrap = editor.getBody().querySelector('span.cx-board[data-cx-new]');
                wrap.removeAttribute('data-cx-new');
                wrap.textContent = '';
            }
            dom.setAttrib(wrap, 'data-cx-board', JSON.stringify(data));
            var bgEl = bgOf(wrap);
            var imgs = Array.prototype.filter.call(wrap.querySelectorAll('img'), function (i) { return i !== bgEl; });
            var main = imgs[imgs.length - 1];
            if (!main) { main = dom.create('img', { alt: '' }); wrap.appendChild(main); }
            main.setAttribute('style', 'max-width:100%;height:auto;');
            if (bg && bg.changed) {
                if (!bgEl) { bgEl = dom.create('img', { 'class': 'cx-board-bg', alt: '' }); wrap.insertBefore(bgEl, main); }
                ok = uploadImg(editor, bgEl, dataUrlToBlob(bg.url), 'cx-quadro-fundo-' + stamp + '.jpg') && ok;
            } else if (!bg && bgEl) {
                bgEl.parentNode.removeChild(bgEl);
            }
            ok = uploadImg(editor, main, png, 'cx-quadro-' + stamp + '.png') && ok;
        });
        editor.nodeChanged();
        editor.setDirty(true);
        return ok;
    }

    /* ======================================================================
       Janela do quadro
       ====================================================================== */
    function open(editor, node, mode) {
        var raw = null, bgUrl = '', bgChanged = false;
        if (node) {
            try { raw = JSON.parse(node.getAttribute('data-cx-board') || 'null'); } catch (e) { raw = null; }
            var bgEl = bgOf(node);
            bgUrl = bgEl ? (bgEl.getAttribute('src') || '') : '';
        }
        var D = clean(raw, mode);
        var ready = Promise.resolve();
        if (bgUrl) {
            if (/^blob:|^data:/.test(bgUrl) && !/docid=/.test(bgUrl)) {
                notify(editor, 'Salve o documento antes de editar este quadro de novo: a planta ainda está sendo enviada.', 'error');
                return;
            }
            ready = urlToDataUrl(bgUrl).then(function (u) { bgUrl = u; }).catch(function () { bgUrl = ''; });
        }
        ready.then(function () { build(editor, node, D, bgUrl, bgChanged); });
    }

    function notify(editor, text, type) {
        if (editor && editor.notificationManager) {
            editor.notificationManager.open({ text: text, type: type || 'info', timeout: type === 'error' ? 0 : 4000 });
        } else { window.alert(text); }
    }

    function build(editor, node, D, bgUrl, bgChanged) {
        var hist = [], redo = [], sel = [], tool = 'select', clip = null;
        var view = { z: 1, x: 40, y: 40 };
        var I = Icons();

        var root = document.createElement('div');
        root.className = 'cx-board-modal';
        root.innerHTML =
            '<div class="cx-board-top">'
            + '<strong class="cx-board-title">' + esc(MODES[D.mode]) + '</strong>'
            + '<div class="cx-board-tools">'
            + '<button type="button" data-tool="select" title="Selecionar e mover (V)">Selecionar</button>'
            + '<button type="button" data-tool="zone" title="Desenhar zona / área (Z)">' + (D.mode === 'planta' ? 'Área' : 'Zona') + '</button>'
            + '<button type="button" data-tool="text" title="Texto (T)">Texto</button>'
            + '<button type="button" data-tool="scale" title="Escala: clique em dois pontos da planta e informe a distância real">Escala</button>'
            + '<span class="cx-board-scale"></span>'
            + '<span class="cx-board-sep"></span>'
            + '<button type="button" data-act="group" title="Agrupar (Ctrl+G)">Agrupar</button>'
            + '<button type="button" data-act="ungroup" title="Desagrupar (Ctrl+Shift+G)">Desagrupar</button>'
            + '<button type="button" data-act="lock" title="Travar / destravar">Travar</button>'
            + '<button type="button" data-act="del" title="Excluir (Delete)">Excluir</button>'
            + '<span class="cx-board-sep"></span>'
            + '<button type="button" data-act="smaller" title="Diminuir ícones (os selecionados; sem seleção, todos)">Ícone −</button>'
            + '<button type="button" data-act="bigger" title="Aumentar ícones (os selecionados; sem seleção, todos)">Ícone +</button>'
            + '<button type="button" data-act="rotate" title="Girar os ícones selecionados 90° (R)">Girar 90°</button>'
            + '<span class="cx-board-sep"></span>'
            + '<button type="button" data-act="undo" title="Desfazer (Ctrl+Z)">↶</button>'
            + '<button type="button" data-act="redo" title="Refazer (Ctrl+Y)">↷</button>'
            + '<span class="cx-board-sep"></span>'
            + '<button type="button" data-act="zout" title="Afastar">−</button><span class="cx-board-zoom">100%</span>'
            + '<button type="button" data-act="zin" title="Aproximar">+</button>'
            + '<button type="button" data-act="fit" title="Ajustar à tela">Ajustar</button>'
            + (D.mode === 'planta'
                ? '<span class="cx-board-sep"></span><button type="button" data-act="bg">' + (bgUrl ? 'Trocar planta' : 'Enviar planta') + '</button>'
                  + '<label class="cx-board-op" title="Transparência da planta">Planta <input type="range" min="10" max="100" step="5" data-act="op" value="' + Math.round(D.bgOpacity * 100) + '"></label>'
                  + '<button type="button" data-act="rot" title="Girar a planta 90° (os itens giram junto)"' + (bgUrl ? '' : ' hidden') + '>Girar planta</button>'
                  + '<button type="button" data-act="bgdel"' + (bgUrl ? '' : ' hidden') + '>Tirar planta</button>'
                : '')
            + '</div>'
            + '<span class="cx-board-spacer"></span>'
            + '<button type="button" data-act="cancel">Cancelar</button>'
            + '<button type="button" data-act="save" class="cx-board-ok">' + (node ? 'Salvar quadro' : 'Inserir no documento') + '</button>'
            + '</div>'
            + '<div class="cx-board-body">'
            + '<aside class="cx-board-pal"><input type="search" class="cx-board-q" placeholder="Buscar ícone"><div class="cx-board-icons"></div></aside>'
            + '<div class="cx-board-stage"><svg class="cx-board-svg" xmlns="' + NS + '"><g class="vp">'
            + '<rect class="cx-board-paper"/><image class="cx-board-bgimg" preserveAspectRatio="none"/>'
            + '<g class="cx-board-zones"></g><g class="cx-board-items"></g><g class="cx-board-sel"></g><g class="cx-board-guides"></g>'
            + '<rect class="cx-board-marq" hidden/></g></svg>'
            + '<div class="cx-board-hint">Arraste um ícone da paleta para o quadro. Segure e arraste o fundo para mover a vista; roda do mouse dá zoom; Shift + arrastar seleciona em área.</div></div>'
            + '<aside class="cx-board-props"></aside>'
            + '</div>';
        document.body.appendChild(root);
        document.documentElement.classList.add('cx-board-open');

        var svg = root.querySelector('.cx-board-svg'), vp = root.querySelector('.vp');
        var paper = root.querySelector('.cx-board-paper'), bgImgEl = root.querySelector('.cx-board-bgimg');
        var gZones = root.querySelector('.cx-board-zones'), gItems = root.querySelector('.cx-board-items');
        var gSel = root.querySelector('.cx-board-sel'), gGuides = root.querySelector('.cx-board-guides');
        var marq = root.querySelector('.cx-board-marq'), props = root.querySelector('.cx-board-props');

        /* ---------- paleta ---------- */
        function paleta() {
            var q = (root.querySelector('.cx-board-q').value || '').trim().toLowerCase();
            var h = '';
            Object.keys(I.CATS).forEach(function (ck) {
                var ls = I.LIST.filter(function (r) { return r[2] === ck && (!q || (r[1] + ' ' + r[3]).toLowerCase().indexOf(q) >= 0); });
                if (!ls.length) { return; }
                h += '<div class="cx-board-cat">' + esc(I.CATS[ck].label) + '</div><div class="cx-board-grid">';
                ls.forEach(function (r) {
                    h += '<button type="button" class="cx-board-ic" data-icon="' + r[0] + '" title="' + esc(r[1]) + '">'
                        + '<svg viewBox="0 0 48 48" width="34" height="34">' + I.body(r[0]) + '</svg><span>' + esc(r[1]) + '</span></button>';
                });
                h += '</div>';
            });
            root.querySelector('.cx-board-icons').innerHTML = h || '<p class="cx-board-none">Nenhum ícone. Use o Equipamento genérico.</p>';
        }
        root.querySelector('.cx-board-q').addEventListener('input', paleta);

        /* ---------- histórico ---------- */
        function snap() { hist.push(JSON.stringify(D)); if (hist.length > 80) { hist.shift(); } redo = []; }
        function undo() { if (!hist.length) { return; } redo.push(JSON.stringify(D)); D = JSON.parse(hist.pop()); sel = sel.filter(byId); render(); }
        function redoIt() { if (!redo.length) { return; } hist.push(JSON.stringify(D)); D = JSON.parse(redo.pop()); sel = sel.filter(byId); render(); }
        function byId(id) { return D.items.some(function (i) { return i.id === id; }); }
        function get(id) { for (var i = 0; i < D.items.length; i++) { if (D.items[i].id === id) { return D.items[i]; } } return null; }

        /* ---------- vista ---------- */
        function applyView() {
            vp.setAttribute('transform', 'translate(' + view.x + ' ' + view.y + ') scale(' + view.z + ')');
            root.querySelector('.cx-board-zoom').textContent = Math.round(view.z * 100) + '%';
        }
        function toBoard(e) {
            var r = svg.getBoundingClientRect();
            return { x: (e.clientX - r.left - view.x) / view.z, y: (e.clientY - r.top - view.y) / view.z };
        }
        function fit() {
            var r = svg.getBoundingClientRect();
            var w = D.w, h = D.h, x = 0, y = 0;
            if (!bgUrl && D.items.length) {
                var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
                D.items.forEach(function (it) { var b = bbox(it); x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.w); y2 = Math.max(y2, b.y + b.h); });
                x = x1 - 60; y = y1 - 60; w = x2 - x1 + 120; h = y2 - y1 + 120;
            }
            view.z = Math.max(0.1, Math.min(1, Math.min((r.width || 800) / w, (r.height || 600) / h)));
            view.x = ((r.width || 800) - w * view.z) / 2 - x * view.z;
            view.y = ((r.height || 600) - h * view.z) / 2 - y * view.z;
            applyView();
        }
        function zoomAt(k, cx, cy) {
            var z = Math.max(0.1, Math.min(4, view.z * k));
            view.x = cx - (cx - view.x) * (z / view.z);
            view.y = cy - (cy - view.y) * (z / view.z);
            view.z = z;
            applyView();
        }

        /* ---------- desenho ---------- */
        function render() {
            PXM = D.pxm || PXM_DEFAULT;
            var sc = root.querySelector('.cx-board-scale');
            if (sc) { sc.textContent = D.pxm ? '1 m = ' + (Math.round(D.pxm * 10) / 10).toString().replace('.', ',') + ' px' : 'sem escala'; }
            paper.setAttribute('x', 0); paper.setAttribute('y', 0);
            paper.setAttribute('width', D.w); paper.setAttribute('height', D.h);
            if (bgUrl) {
                bgImgEl.setAttribute('href', bgUrl);
                bgImgEl.setAttribute('width', D.w); bgImgEl.setAttribute('height', D.h);
                bgImgEl.setAttribute('opacity', D.bgOpacity);
                bgImgEl.removeAttribute('display');
            } else {
                bgImgEl.setAttribute('display', 'none');
            }
            gZones.innerHTML = D.items.filter(function (i) { return i.t === 'zone'; }).map(function (i) { return itemSvg(i); }).join('');
            gItems.innerHTML = D.items.filter(function (i) { return i.t !== 'zone'; }).map(function (i) { return itemSvg(i); }).join('');
            drawSel();
            drawProps();
            root.querySelector('[data-act="undo"]').disabled = !hist.length;
            root.querySelector('[data-act="redo"]').disabled = !redo.length;
            root.querySelectorAll('[data-tool]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-tool') === tool); });
        }
        function drawSel() {
            gSel.innerHTML = sel.map(function (id) {
                var it = get(id); if (!it) { return ''; }
                var b = bbox(it);
                return '<rect x="' + (b.x - 4) + '" y="' + (b.y - 4) + '" width="' + (b.w + 8) + '" height="' + (b.h + 8)
                    + '" fill="none" stroke="#378ADD" stroke-width="' + (1.5 / view.z) + '" stroke-dasharray="' + (5 / view.z) + ' ' + (3 / view.z) + '"/>'
                    + (it.lock ? '<text x="' + (b.x + b.w + 6) + '" y="' + (b.y + 4) + '" font-size="' + (12 / view.z) + '" fill="#378ADD">🔒</text>' : '')
                    + (it.t === 'icon' && sel.length === 1 && !it.lock ? '<rect class="cx-board-rz" data-rzi="' + it.id + '" x="' + (it.x + it.size - 4 / view.z) + '" y="' + (it.y + it.size - 4 / view.z)
                        + '" width="' + (9 / view.z) + '" height="' + (9 / view.z) + '" fill="#fff" stroke="#378ADD" stroke-width="' + (1.5 / view.z) + '"/>' : '')
                    + (it.t === 'zone' && sel.length === 1 && !it.lock ? '<rect class="cx-board-rz" data-rz="' + it.id + '" x="' + (b.x + b.w - 5 / view.z) + '" y="' + (b.y + b.h - 5 / view.z)
                        + '" width="' + (10 / view.z) + '" height="' + (10 / view.z) + '" fill="#fff" stroke="#378ADD" stroke-width="' + (1.5 / view.z) + '"/>' : '');
            }).join('');
        }

        /* ---------- painel de propriedades ---------- */
        function field(label, key, val, ph) {
            return '<label class="cx-board-f"><span>' + label + '</span><input type="text" data-k="' + key + '" value="' + esc(val) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '></label>';
        }
        function drawProps() {
            if (!sel.length) {
                props.innerHTML = '<p class="cx-board-none">Selecione um item para editar rótulo e dados.</p>'
                    + '<p class="cx-board-none">Atalhos: Delete exclui · Ctrl+C / Ctrl+V · Ctrl+D duplica · Ctrl+G agrupa · setas movem.</p>';
                return;
            }
            if (sel.length > 1) {
                props.innerHTML = '<p><strong>' + sel.length + ' itens selecionados</strong></p><p class="cx-board-none">Use Agrupar para mover como um conjunto.</p>';
                return;
            }
            var it = get(sel[0]), h = '';
            if (it.t === 'icon') {
                var ic = I.get(it.icon);
                h += '<p><strong>' + esc(ic.name) + '</strong></p>' + field('Rótulo', 'label', it.label, 'CAM-01 Entrada');
                if (it.icon === 'generico') {
                    h += '<label class="cx-board-f"><span>Categoria (cor)</span><select data-k="cat">'
                        + Object.keys(I.CATS).map(function (k) { return '<option value="' + k + '"' + ((it.cat || 'infra') === k ? ' selected' : '') + '>' + esc(I.CATS[k].label) + '</option>'; }).join('')
                        + '</select></label>';
                }
                h += field('Modelo', 'f.modelo', it.f.modelo) + field('IP', 'f.ip', it.f.ip, '10.0.0.10') + field('VLAN', 'f.vlan', it.f.vlan)
                    + '<label class="cx-board-f"><span>Observação</span><textarea data-k="f.obs" rows="2">' + esc(it.f.obs) + '</textarea></label>'
                    + '<label class="cx-board-f"><span>Tamanho</span><input type="range" min="24" max="120" step="4" data-k="size" value="' + it.size + '"></label>'
                    + (it.cone ? '' : '<label class="cx-board-f"><span>Girar (' + (it.rot || 0) + '°)</span><input type="range" min="0" max="345" step="15" data-k="rot" value="' + (it.rot || 0) + '"></label>');
                if (it.cone) {
                    h += '<p class="cx-board-sub">Visão da câmera</p>'
                        + '<label class="cx-board-chk"><input type="checkbox" data-k="cone.on"' + (it.cone.on ? ' checked' : '') + '> Mostrar o cone</label>'
                        + '<label class="cx-board-f"><span>Direção (' + it.cone.dir + '°)</span><input type="range" min="0" max="355" step="5" data-k="cone.dir" value="' + it.cone.dir + '"></label>'
                        + '<label class="cx-board-f"><span>Abertura (' + it.cone.fov + '°)</span><input type="range" min="10" max="180" step="5" data-k="cone.fov" value="' + it.cone.fov + '"></label>'
                        + '<label class="cx-board-f"><span>Alcance (' + fmtM(it.cone.m) + ')</span><input type="range" min="0.5" max="60" step="0.5" data-k="cone.m" value="' + it.cone.m + '"></label>'
                        + '<p class="cx-board-none">' + (D.pxm ? 'Metros pela escala da planta.' : 'Escala aproximada (1 m = ' + PXM_DEFAULT + ' px): use "Escala" na barra para medir pela planta.') + '</p>';
                }
            } else if (it.t === 'zone') {
                h += '<p><strong>' + (D.mode === 'planta' ? 'Área' : 'Zona') + '</strong></p>' + field('Nome', 'label', it.label, D.mode === 'planta' ? 'Estoque' : 'VLAN 10 · Administrativo');
            } else {
                h += '<p><strong>Texto</strong></p><label class="cx-board-f"><span>Texto</span><textarea data-k="text" rows="3">' + esc(it.text) + '</textarea></label>'
                    + '<label class="cx-board-f"><span>Tamanho</span><select data-k="size"><option value="p"' + (it.size === 'p' ? ' selected' : '') + '>Pequeno</option>'
                    + '<option value="m"' + (it.size === 'm' ? ' selected' : '') + '>Médio</option><option value="g"' + (it.size === 'g' ? ' selected' : '') + '>Grande</option></select></label>';
            }
            if (it.t !== 'icon' || true) {
                h += '<div class="cx-board-sw">' + COLORS.map(function (c) {
                    return it.t === 'icon' ? '' : '<button type="button" data-color="' + c + '" style="background:' + c + '" title="Cor" aria-label="Cor"' + (it.color === c ? ' class="is-on"' : '') + '></button>';
                }).join('') + '</div>';
            }
            h += '<p class="cx-board-none">' + (it.lock ? 'Travado: destrave para mover.' : '') + (it.g ? ' Em grupo.' : '') + '</p>';
            props.innerHTML = h;
        }
        props.addEventListener('input', function (e) {
            var k = e.target.getAttribute('data-k'); if (!k || sel.length !== 1) { return; }
            var it = get(sel[0]);
            if (!props.__snap) { snap(); props.__snap = true; }
            var v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
            if (/^(size|rot|cone\.dir|cone\.fov|cone\.m)$/.test(k) && it.t === 'icon') { v = +v; }
            var p = k.split('.');
            if (p.length === 2) { it[p[0]][p[1]] = v; } else { it[k] = v; }
            gZones.innerHTML = D.items.filter(function (i) { return i.t === 'zone'; }).map(function (i) { return itemSvg(i); }).join('');
            gItems.innerHTML = D.items.filter(function (i) { return i.t !== 'zone'; }).map(function (i) { return itemSvg(i); }).join('');
            drawSel();
            if (/^cone\.|^cat$|^size$|^rot$/.test(k) && e.type === 'change') { drawProps(); }
        });
        props.addEventListener('change', function (e) {
            props.__snap = false;
            if (e.target.matches('select,[type=checkbox],[type=range]')) { drawProps(); }
        });
        props.addEventListener('click', function (e) {
            var b = e.target.closest('[data-color]'); if (!b || sel.length !== 1) { return; }
            snap(); get(sel[0]).color = b.getAttribute('data-color'); render();
        });

        /* ---------- seleção e grupos ---------- */
        function expand(ids) {
            var out = [];
            ids.forEach(function (id) {
                var it = get(id); if (!it) { return; }
                if (it.g) { D.items.forEach(function (o) { if (o.g === it.g && out.indexOf(o.id) < 0) { out.push(o.id); } }); }
                else if (out.indexOf(id) < 0) { out.push(id); }
            });
            return out;
        }
        function hit(target) {
            var g = target && target.closest && target.closest('[data-id]');
            return g && svg.contains(g) ? g.getAttribute('data-id') : null;
        }

        function addIcon(icon, x, y) {
            snap();
            var s = 48;
            var it = { id: uid(), t: 'icon', icon: icon, x: Math.round((x - s / 2) / GRID) * GRID, y: Math.round((y - s / 2) / GRID) * GRID,
                size: s, label: '', cat: '', f: { modelo: '', ip: '', vlan: '', obs: '' }, lock: false, g: '' };
            // Câmera nasce sem o cone; liga-se no painel depois de posicionar.
            if (I.get(icon).cone) { it.cone = { on: false, dir: 0, fov: 70, m: 8 }; }
            D.items.push(it);
            sel = [it.id];
            render();
        }

        /* ---------- arraste da paleta ---------- */
        root.querySelector('.cx-board-icons').addEventListener('pointerdown', function (e) {
            var b = e.target.closest('[data-icon]'); if (!b) { return; }
            e.preventDefault();
            var icon = b.getAttribute('data-icon'), moved = false, sx = e.clientX, sy = e.clientY;
            var ghost = document.createElement('div');
            ghost.className = 'cx-board-ghost';
            ghost.innerHTML = '<svg viewBox="0 0 48 48" width="48" height="48">' + I.body(icon) + '</svg>';
            function mv(ev) {
                if (!moved && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 5) { return; }
                if (!moved) { moved = true; document.body.appendChild(ghost); }
                ghost.style.left = (ev.clientX - 24) + 'px'; ghost.style.top = (ev.clientY - 24) + 'px';
            }
            function up(ev) {
                document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
                if (ghost.parentNode) { ghost.remove(); }
                var r = svg.getBoundingClientRect();
                if (!moved) {
                    var c = toBoard({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
                    addIcon(icon, c.x, c.y);
                } else if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
                    var p = toBoard(ev); addIcon(icon, p.x, p.y);
                }
            }
            document.addEventListener('pointermove', mv);
            document.addEventListener('pointerup', up);
        });

        /* ---------- quadro: ponteiro ---------- */
        var space = false, drag = null, scaleA = null;
        svg.addEventListener('pointerdown', function (e) {
            var p = toBoard(e);
            // Escala: o segundo clique fecha a medida.
            if (tool === 'scale' && scaleA) {
                var dist = Math.sqrt(Math.pow(p.x - scaleA.x, 2) + Math.pow(p.y - scaleA.y, 2));
                gGuides.innerHTML = '<line x1="' + scaleA.x + '" y1="' + scaleA.y + '" x2="' + p.x + '" y2="' + p.y + '" stroke="#D4537E" stroke-width="' + (2 / view.z) + '"/>';
                var txt = window.prompt('Distância real entre os dois pontos, em metros (ex.: 8,5):', '');
                var m = parseFloat(String(txt || '').replace(',', '.'));
                scaleA = null; tool = 'select'; gGuides.innerHTML = '';
                if (m > 0 && dist > 2) { snap(); D.pxm = dist / m; }
                render();
                return;
            }
            if (e.button === 1 || space) {
                drag = { k: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
            } else if (e.target.getAttribute('data-rzi')) {
                snap();
                drag = { k: 'rzi', id: e.target.getAttribute('data-rzi') };
            } else if (e.target.getAttribute('data-rz')) {
                snap();
                drag = { k: 'rz', id: e.target.getAttribute('data-rz'), p: p };
            } else if (tool === 'scale') {
                // Escala: primeiro ponto (o segundo fecha a medida, acima).
                scaleA = p;
                gGuides.innerHTML = '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (5 / view.z) + '" fill="#D4537E"/>';
                return;
            } else if (tool === 'zone') {
                snap();
                var z = { id: uid(), t: 'zone', x: Math.round(p.x / GRID) * GRID, y: Math.round(p.y / GRID) * GRID, w: 20, h: 20,
                    label: D.mode === 'planta' ? 'Área' : 'Zona', color: COLORS[D.items.filter(function (i) { return i.t === 'zone'; }).length % COLORS.length], lock: false, g: '' };
                D.items.push(z); sel = [z.id];
                drag = { k: 'zone', id: z.id, ox: z.x, oy: z.y };
            } else if (tool === 'text') {
                snap();
                var t = { id: uid(), t: 'text', x: Math.round(p.x / GRID) * GRID, y: Math.round(p.y / GRID) * GRID, text: 'Texto', color: '#1d2330', size: 'm', lock: false, g: '' };
                D.items.push(t); sel = [t.id]; tool = 'select'; render();
                var ta = props.querySelector('[data-k="text"]'); if (ta) { ta.focus(); ta.select(); }
                return;
            } else {
                var id = hit(e.target);
                if (id) {
                    var grp = expand([id]);
                    if (e.shiftKey) {
                        var tem = grp.every(function (g) { return sel.indexOf(g) >= 0; });
                        sel = tem ? sel.filter(function (s) { return grp.indexOf(s) < 0; }) : sel.concat(grp.filter(function (g) { return sel.indexOf(g) < 0; }));
                    } else if (sel.indexOf(id) < 0) {
                        sel = grp;
                    }
                    var movable = sel.filter(function (s) { var it = get(s); return it && !it.lock; });
                    drag = { k: 'move', p: p, start: movable.map(function (s) { var it = get(s); return { id: s, x: it.x, y: it.y }; }), moved: false };
                } else if (e.shiftKey) {
                    drag = { k: 'marq', p: p, base: sel.slice() };
                } else {
                    // Fundo: segurar e arrastar move a vista (Claudio, 26/09/2026).
                    sel = [];
                    drag = { k: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
                    svg.classList.add('is-panning');
                }
            }
            try { svg.setPointerCapture(e.pointerId); } catch (err) { /* navegador sem captura */ }
            render();
        });
        svg.addEventListener('pointermove', function (e) {
            if (!drag) { return; }
            var p = toBoard(e);
            if (drag.k === 'pan') {
                view.x = drag.vx + e.clientX - drag.sx; view.y = drag.vy + e.clientY - drag.sy; applyView(); return;
            }
            if (drag.k === 'rzi') {
                var ic = get(drag.id);
                ic.size = Math.max(24, Math.min(160, Math.round(Math.max(p.x - ic.x, p.y - ic.y) / 4) * 4));
                gItems.innerHTML = D.items.filter(function (i) { return i.t !== 'zone'; }).map(function (i) { return itemSvg(i); }).join('');
                drawSel(); return;
            }
            if (drag.k === 'zone' || drag.k === 'rz') {
                var z = get(drag.id);
                if (drag.k === 'zone') {
                    z.x = Math.min(drag.ox, Math.round(p.x / GRID) * GRID); z.y = Math.min(drag.oy, Math.round(p.y / GRID) * GRID);
                    z.w = Math.max(20, Math.abs(Math.round(p.x / GRID) * GRID - drag.ox)); z.h = Math.max(20, Math.abs(Math.round(p.y / GRID) * GRID - drag.oy));
                } else {
                    z.w = Math.max(20, Math.round((p.x - z.x) / GRID) * GRID); z.h = Math.max(20, Math.round((p.y - z.y) / GRID) * GRID);
                }
                gZones.innerHTML = D.items.filter(function (i) { return i.t === 'zone'; }).map(function (i) { return itemSvg(i); }).join('');
                drawSel(); return;
            }
            if (drag.k === 'marq') {
                var x = Math.min(p.x, drag.p.x), y = Math.min(p.y, drag.p.y), w = Math.abs(p.x - drag.p.x), h = Math.abs(p.y - drag.p.y);
                marq.removeAttribute('hidden');
                marq.setAttribute('x', x); marq.setAttribute('y', y); marq.setAttribute('width', w); marq.setAttribute('height', h);
                var dentro = D.items.filter(function (it) { var b = bbox(it); return b.x >= x && b.y >= y && b.x + b.w <= x + w && b.y + b.h <= y + h; })
                    .map(function (it) { return it.id; });
                sel = drag.base.concat(expand(dentro).filter(function (i) { return drag.base.indexOf(i) < 0; }));
                drawSel(); return;
            }
            if (drag.k === 'move' && drag.start.length) {
                if (!drag.moved) { snap(); drag.moved = true; }
                var dx = p.x - drag.p.x, dy = p.y - drag.p.y;
                // Guias: o centro do primeiro item gruda no centro de outro item (6 px).
                var first = get(drag.start[0].id), b0 = bbox(first);
                var cx = drag.start[0].x + dx + b0.w / 2, cy = drag.start[0].y + dy + b0.h / 2;
                var gx = null, gy = null;
                D.items.forEach(function (o) {
                    if (drag.start.some(function (s) { return s.id === o.id; }) || o.t === 'zone') { return; }
                    var b = bbox(o), ox = b.x + b.w / 2, oy = b.y + b.h / 2;
                    if (gx === null && Math.abs(ox - cx) < SNAP / view.z) { gx = ox; }
                    if (gy === null && Math.abs(oy - cy) < SNAP / view.z) { gy = oy; }
                });
                var ddx = gx !== null ? dx + (gx - cx) : Math.round((drag.start[0].x + dx) / GRID) * GRID - drag.start[0].x;
                var ddy = gy !== null ? dy + (gy - cy) : Math.round((drag.start[0].y + dy) / GRID) * GRID - drag.start[0].y;
                drag.start.forEach(function (s) { var it = get(s.id); it.x = s.x + ddx; it.y = s.y + ddy; });
                gGuides.innerHTML = (gx !== null ? '<line x1="' + gx + '" y1="-5000" x2="' + gx + '" y2="5000" stroke="#D4537E" stroke-width="' + (1 / view.z) + '"/>' : '')
                    + (gy !== null ? '<line x1="-5000" y1="' + gy + '" x2="5000" y2="' + gy + '" stroke="#D4537E" stroke-width="' + (1 / view.z) + '"/>' : '');
                gZones.innerHTML = D.items.filter(function (i) { return i.t === 'zone'; }).map(function (i) { return itemSvg(i); }).join('');
                gItems.innerHTML = D.items.filter(function (i) { return i.t !== 'zone'; }).map(function (i) { return itemSvg(i); }).join('');
                drawSel();
            }
        });
        svg.addEventListener('pointerup', function () {
            svg.classList.remove('is-panning');
            if (drag && drag.k === 'zone') { tool = 'select'; }
            if (drag && drag.k === 'move' && !drag.moved) { /* só seleção */ }
            drag = null;
            marq.setAttribute('hidden', '');
            gGuides.innerHTML = '';
            render();
        });
        svg.addEventListener('wheel', function (e) {
            e.preventDefault();
            var r = svg.getBoundingClientRect();
            if (e.shiftKey) { view.x -= e.deltaY || e.deltaX; applyView(); }
            else { zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top); }
            drawSel();
        }, { passive: false });
        svg.addEventListener('dblclick', function (e) {
            var id = hit(e.target); if (!id) { return; }
            sel = [id]; render();
            var f = props.querySelector('[data-k="label"],[data-k="text"]'); if (f) { f.focus(); f.select(); }
        });

        /* ---------- teclado ---------- */
        function typing() { var a = document.activeElement; return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && root.contains(a); }
        function onKey(e) {
            if (e.key === ' ' && !typing()) { space = true; e.preventDefault(); return; }
            if (typing()) { if (e.key === 'Escape') { document.activeElement.blur(); } return; }
            var ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
            if (k === 'escape') { if (sel.length) { sel = []; render(); } else { close(); } e.preventDefault(); return; }
            if (ctrl && k === 'z') { e.preventDefault(); if (e.shiftKey) { redoIt(); } else { undo(); } return; }
            if (ctrl && k === 'y') { e.preventDefault(); redoIt(); return; }
            if (ctrl && k === 'g') { e.preventDefault(); act(e.shiftKey ? 'ungroup' : 'group'); return; }
            if (ctrl && k === 'c') { clip = sel.map(function (id) { return clone(get(id)); }); e.preventDefault(); return; }
            if (ctrl && (k === 'v' || k === 'd')) {
                e.preventDefault();
                var src = k === 'd' ? sel.map(function (id) { return clone(get(id)); }) : clip;
                if (!src || !src.length) { return; }
                snap();
                var mapa = {};
                sel = src.map(function (o) {
                    var n = clone(o); n.id = uid(); n.x += 20; n.y += 20;
                    if (n.g) { mapa[n.g] = mapa[n.g] || uid(); n.g = mapa[n.g]; }
                    D.items.push(n); return n.id;
                });
                if (k === 'v') { clip = sel.map(function (id) { return clone(get(id)); }); }
                render(); return;
            }
            if (k === 'delete' || k === 'backspace') { e.preventDefault(); act('del'); return; }
            if (k === 'v') { tool = 'select'; render(); return; }
            if (k === 'z') { tool = 'zone'; render(); return; }
            if (k === 't') { tool = 'text'; render(); return; }
            if (k === 'r') { act('rotate'); return; }
            var mv = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[k];
            if (mv && sel.length) {
                e.preventDefault(); snap();
                var step = e.shiftKey ? GRID : 1;
                sel.forEach(function (id) { var it = get(id); if (!it.lock) { it.x += mv[0] * step; it.y += mv[1] * step; } });
                render();
            }
        }
        function onKeyUp(e) { if (e.key === ' ') { space = false; } }
        document.addEventListener('keydown', onKey, true);
        document.addEventListener('keyup', onKeyUp, true);

        /* ---------- ações da barra ---------- */
        function act(a) {
            if (a === 'group' && sel.length > 1) { snap(); var g = uid(); sel.forEach(function (id) { get(id).g = g; }); render(); }
            else if (a === 'ungroup' && sel.length) { snap(); sel.forEach(function (id) { get(id).g = ''; }); render(); }
            else if (a === 'lock' && sel.length) {
                snap(); var trava = !sel.every(function (id) { return get(id).lock; });
                sel.forEach(function (id) { get(id).lock = trava; }); render();
            }
            else if (a === 'rotate') {
                var gi = sel.map(get).filter(function (i) { return i && i.t === 'icon' && !i.lock; });
                if (!gi.length) { return; }
                snap();
                gi.forEach(function (i) {
                    if (i.cone) { i.cone.dir = (i.cone.dir + 90) % 360; } else { i.rot = ((i.rot || 0) + 90) % 360; }
                });
                render();
            }
            else if (a === 'smaller' || a === 'bigger') {
                var alvo = (sel.length ? sel.map(get) : D.items).filter(function (i) { return i && i.t === 'icon'; });
                if (!alvo.length) { return; }
                snap();
                alvo.forEach(function (i) {
                    var n = Math.max(24, Math.min(160, i.size + (a === 'bigger' ? 8 : -8)));
                    i.x -= (n - i.size) / 2; i.y -= (n - i.size) / 2; i.size = n;
                });
                render();
            }
            else if (a === 'del' && sel.length) { snap(); D.items = D.items.filter(function (i) { return sel.indexOf(i.id) < 0; }); sel = []; render(); }
            else if (a === 'undo') { undo(); }
            else if (a === 'redo') { redoIt(); }
            else if (a === 'zin' || a === 'zout') { var r = svg.getBoundingClientRect(); zoomAt(a === 'zin' ? 1.2 : 1 / 1.2, r.width / 2, r.height / 2); drawSel(); }
            else if (a === 'fit') { fit(); drawSel(); }
            else if (a === 'bg') { pickBg(); }
            else if (a === 'rot') { rotate(); }
            else if (a === 'bgdel') { snap(); bgUrl = ''; bgChanged = false; root.querySelector('[data-act="bgdel"]').hidden = true; root.querySelector('[data-act="rot"]').hidden = true; render(); }
            else if (a === 'cancel') { close(); }
            else if (a === 'save') { save(); }
        }
        root.querySelector('.cx-board-top').addEventListener('click', function (e) {
            var t = e.target.closest('[data-tool]');
            if (t) { tool = t.getAttribute('data-tool'); render(); return; }
            var b = e.target.closest('button[data-act]');
            if (b) { act(b.getAttribute('data-act')); }
        });
        var op = root.querySelector('[data-act="op"]');
        if (op) { op.addEventListener('input', function () { D.bgOpacity = +op.value / 100; render(); }); }

        /* Gira a planta 90° no sentido horário, com os itens junto. */
        function rotate() {
            if (!bgUrl) { return; }
            var im = new Image();
            im.onload = function () {
                var cv = document.createElement('canvas');
                cv.width = im.naturalHeight; cv.height = im.naturalWidth;
                var g = cv.getContext('2d');
                g.translate(cv.width, 0); g.rotate(Math.PI / 2); g.drawImage(im, 0, 0);
                snap();
                var H = D.h;
                D.items.forEach(function (it) {
                    var b = bbox(it);
                    var w = it.t === 'icon' ? it.size : (it.t === 'zone' ? it.w : b.w);
                    var h = it.t === 'icon' ? it.size : (it.t === 'zone' ? it.h : b.h);
                    var nx = H - (it.y + h), ny = it.x;
                    it.x = nx; it.y = ny;
                    if (it.t === 'zone') { var t = it.w; it.w = it.h; it.h = t; }
                    if (it.cone) { it.cone.dir = (it.cone.dir + 90) % 360; }
                    else if (it.t === 'icon') { it.rot = ((it.rot || 0) + 90) % 360; }
                    void w;
                });
                var t = D.w; D.w = D.h; D.h = t;
                bgUrl = cv.toDataURL('image/jpeg', 0.85); bgChanged = true;
                render(); fit();
            };
            im.src = bgUrl;
        }

        function pickBg() {
            var input = document.createElement('input');
            input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp,image/gif';
            input.addEventListener('change', function () {
                var f = input.files && input.files[0]; if (!f) { return; }
                fileToDataUrl(f, 2400).then(function (r) {
                    snap();
                    bgUrl = r.url; bgChanged = true;
                    D.w = r.w; D.h = r.h;
                    D.pxm = 0; // planta nova: a escala tem que ser medida de novo
                    root.querySelector('[data-act="bg"]').textContent = 'Trocar planta';
                    root.querySelector('[data-act="bgdel"]').hidden = false;
                    root.querySelector('[data-act="rot"]').hidden = false;
                    render(); fit();
                }).catch(function () { notify(editor, 'Não foi possível abrir essa imagem. Use PNG ou JPG (um PDF precisa ser salvo como imagem antes).', 'error'); });
            });
            input.click();
        }

        function save() {
            var btn = root.querySelector('[data-act="save"]');
            btn.disabled = true; btn.textContent = 'Gerando…';
            toPng(D, bgUrl || null).then(function (png) {
                var ok = apply(editor, node, D, png, bgUrl ? { url: bgUrl, changed: bgChanged } : null);
                if (!ok) { notify(editor, 'Área de envio de arquivos não encontrada: o quadro não será gravado.', 'error'); }
                close();
            }).catch(function () {
                btn.disabled = false; btn.textContent = node ? 'Salvar quadro' : 'Inserir no documento';
                notify(editor, 'Não foi possível gerar a imagem do quadro.', 'error');
            });
        }

        function close() {
            document.removeEventListener('keydown', onKey, true);
            document.removeEventListener('keyup', onKeyUp, true);
            document.documentElement.classList.remove('cx-board-open');
            root.remove();
        }

        paleta();
        render();
        setTimeout(fit, 0);

        // Exposto para os testes (jsdom).
        root.__cx = { data: function () { return D; }, sel: function () { return sel; }, act: act, addIcon: addIcon, setTool: function (t) { tool = t; } };
    }

    window.CodexplusBoard = { open: open, _clean: clean, _itemSvg: itemSvg, _toPng: toPng, _starter: starter, _apply: apply };
})();
