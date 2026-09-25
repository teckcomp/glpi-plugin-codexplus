/* =========================================================================
   Codex+ — anotador de imagens do documento (bloco E4, 24/09/2026)
   -------------------------------------------------------------------------
   Pedido de Claudio: anotar prints para POP (seta, retângulo, círculo,
   destaque, texto, número de passo), e poder CORRIGIR a anotação depois,
   sem refazer do zero (opção 2). Ocultar (pixelar) e Recortar entram porque
   print de TI costuma ter senha, IP e dado pessoal.

   COMO FICA GUARDADO (sem tabela nova):
     <span class="cx-annot" data-cx-orig="URL do print original"
           data-cx-annot='{"v":1,"w":..,"h":..,"crop":..,"marks":[..]}'>
       <img src="PNG anotado">
     </span>
   - O print original continua sendo um arquivo do GLPI ligado ao documento
     (é a imagem que foi colada). A URL dele fica em data-cx-orig: por ter
     "docid=N", Document::listAttachments não o lista como anexo.
   - O PNG anotado é enviado pelo MESMO caminho das imagens coladas
     (uploadFile do fileupload.js do GLPI, com data-upload_id) e gravado ao
     Salvar. Ao Salvar, o GLPI troca só a tag <img> (Toolbox::
     convertTagToImage, 11.0.6); o <span> em volta, com as marcas, fica.
   - PNG anotado de uma edição anterior fica órfão no GLPI; o nome começa com
     "cx-anotacao-" e a lista de Anexos o ignora.
   - Imagem recém-colada (ainda não gravada) não abre: salve antes. Sem isso
     não há URL estável do original.
   - Leitura, PDF e Word usam só a <img>: nada muda para eles.

   Coordenadas das marcas: pixels do ORIGINAL (não da tela), então a mesma
   anotação serve em qualquer tamanho de janela.
   ========================================================================= */
(function () {
    'use strict';

    var COLORS = ['#E24B4A', '#EF9F27', '#185FA5', '#639922', '#1F2937'];
    var YELLOW = '#EF9F27';
    // Tamanho por marca (E4-2, Claudio 24/09/2026): P, M, G. No Destaque e no
    // Ocultar o mesmo controle é a intensidade.
    var SCALE = { 1: 0.6, 2: 1, 3: 1.6 };
    var HL_ALPHA = { 1: 0.22, 2: 0.38, 3: 0.58 };
    var BLUR_CELL = { 1: 4, 2: 6, 3: 10 };
    var TOOLS = [
        { k: 'select',  icon: 'ti-pointer',          label: 'Selecionar' },
        { k: 'arrow',   icon: 'ti-arrow-up-right',   label: 'Seta' },
        { k: 'rect',    icon: 'ti-square',           label: 'Retângulo' },
        { k: 'ellipse', icon: 'ti-circle',           label: 'Círculo' },
        { k: 'hl',      icon: 'ti-highlight',        label: 'Destaque' },
        { k: 'text',    icon: 'ti-typography',       label: 'Texto' },
        { k: 'num',     icon: 'ti-circle-number-1',  label: 'Passo' },
        { k: 'blur',    icon: 'ti-eye-off',          label: 'Ocultar' },
        { k: 'crop',    icon: 'ti-crop',             label: 'Recortar' }
    ];
    var TWO_POINT = { arrow: 1, rect: 1, ellipse: 1, hl: 1, blur: 1 };

    /* ---------------- desenho (tela e PNG final usam o mesmo) ---------- */

    function unit(w, h) { return Math.max(2, Math.round(Math.min(w, h) / 160)); }

    function box(m) {
        return { x: Math.min(m.x1, m.x2), y: Math.min(m.y1, m.y2),
                 w: Math.abs(m.x2 - m.x1), h: Math.abs(m.y2 - m.y1) };
    }

    function zOf(m) { return m.z === 1 || m.z === 3 ? m.z : 2; }

    function pixelate(ctx, src, m, u) {
        var b = box(m);
        if (b.w < 2 || b.h < 2) { return; }
        // Até a intensidade fraca é grossa: o texto não pode ser lido.
        var cell = Math.max(8, u * BLUR_CELL[zOf(m)]);
        var tw = Math.max(1, Math.round(b.w / cell)), th = Math.max(1, Math.round(b.h / cell));
        var tmp = document.createElement('canvas');
        tmp.width = tw; tmp.height = th;
        tmp.getContext('2d').drawImage(src, b.x, b.y, b.w, b.h, 0, 0, tw, th);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tmp, 0, 0, tw, th, b.x, b.y, b.w, b.h);
        ctx.restore();
    }

    function drawMark(ctx, m, u0, src) {
        var b = box(m);
        var u = u0 * (m.t === 'hl' || m.t === 'blur' ? 1 : SCALE[zOf(m)]);
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        if (m.t === 'blur') {
            pixelate(ctx, src, m, u0);
        } else if (m.t === 'hl') {
            ctx.globalAlpha = HL_ALPHA[zOf(m)];
            ctx.fillStyle = m.c;
            ctx.fillRect(b.x, b.y, b.w, b.h);
        } else if (m.t === 'rect') {
            ctx.strokeStyle = m.c;
            ctx.lineWidth = u * 1.5;
            ctx.strokeRect(b.x, b.y, b.w, b.h);
        } else if (m.t === 'ellipse') {
            ctx.strokeStyle = m.c;
            ctx.lineWidth = u * 1.5;
            ctx.beginPath();
            ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, Math.max(1, b.w / 2), Math.max(1, b.h / 2), 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (m.t === 'arrow') {
            var lw = u * 1.8, head = Math.max(12, u * 7);
            var g = Math.atan2(m.y2 - m.y1, m.x2 - m.x1);
            ctx.strokeStyle = m.c; ctx.fillStyle = m.c; ctx.lineWidth = lw;
            ctx.beginPath();
            ctx.moveTo(m.x1, m.y1);
            ctx.lineTo(m.x2 - Math.cos(g) * head * 0.6, m.y2 - Math.sin(g) * head * 0.6);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(m.x2, m.y2);
            ctx.lineTo(m.x2 - head * Math.cos(g - 0.45), m.y2 - head * Math.sin(g - 0.45));
            ctx.lineTo(m.x2 - head * Math.cos(g + 0.45), m.y2 - head * Math.sin(g + 0.45));
            ctx.closePath();
            ctx.fill();
        } else if (m.t === 'num') {
            var r = Math.max(11, u * 6);
            ctx.fillStyle = m.c;
            ctx.beginPath(); ctx.arc(m.x1, m.y1, r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, u * 0.8); ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold ' + Math.round(r * 1.1) + 'px Arial, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(String(m.n), m.x1, m.y1 + 1);
        } else if (m.t === 'text') {
            var fs = Math.max(14, u * 8);
            ctx.font = 'bold ' + fs + 'px Arial, sans-serif';
            ctx.textBaseline = 'top';
            ctx.lineWidth = Math.max(3, fs / 5);
            ctx.strokeStyle = '#ffffff';
            ctx.strokeText(m.s || '', m.x1, m.y1);
            ctx.fillStyle = m.c;
            ctx.fillText(m.s || '', m.x1, m.y1);
        }
        ctx.restore();
    }

    function textBox(ctx, m, u0) {
        var u = u0 * SCALE[zOf(m)];
        var fs = Math.max(14, u * 8);
        ctx.save();
        ctx.font = 'bold ' + fs + 'px Arial, sans-serif';
        var w = ctx.measureText(m.s || '').width;
        ctx.restore();
        return { x: m.x1, y: m.y1, w: Math.max(w, fs), h: fs * 1.2 };
    }

    /* Renderiza original + marcas (sem recorte) num canvas do tamanho do original. */
    function renderFull(img, data) {
        var cv = document.createElement('canvas');
        cv.width = data.w; cv.height = data.h;
        var ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0, data.w, data.h);
        var u = unit(data.w, data.h);
        data.marks.forEach(function (m) { drawMark(ctx, m, u, img); });
        return cv;
    }

    function renderPng(img, data) {
        var full = renderFull(img, data);
        var c = data.crop;
        if (!c || c.w < 4 || c.h < 4) { return full; }
        var out = document.createElement('canvas');
        out.width = Math.round(c.w); out.height = Math.round(c.h);
        out.getContext('2d').drawImage(full, c.x, c.y, c.w, c.h, 0, 0, out.width, out.height);
        return out;
    }

    function renumber(marks) {
        var n = 0;
        marks.forEach(function (m) { if (m.t === 'num') { m.n = ++n; } });
    }

    /* Aceita só o que o anotador sabe desenhar (o JSON veio do HTML). */
    function cleanData(raw, w, h) {
        var d = { v: 1, w: w, h: h, crop: null, marks: [] };
        if (!raw || typeof raw !== 'object') { return d; }
        var num = function (v) { v = Number(v); return isFinite(v) ? v : 0; };
        if (raw.crop && typeof raw.crop === 'object') {
            d.crop = { x: num(raw.crop.x), y: num(raw.crop.y), w: num(raw.crop.w), h: num(raw.crop.h) };
        }
        (Array.isArray(raw.marks) ? raw.marks : []).slice(0, 300).forEach(function (m) {
            if (!m || !/^(arrow|rect|ellipse|hl|text|num|blur)$/.test(m.t)) { return; }
            d.marks.push({
                t: m.t, x1: num(m.x1), y1: num(m.y1), x2: num(m.x2), y2: num(m.y2),
                c: COLORS.indexOf(m.c) !== -1 ? m.c : (m.t === 'hl' ? YELLOW : COLORS[0]),
                z: m.z === 1 || m.z === 3 ? m.z : 2,
                s: m.t === 'text' ? String(m.s || '').slice(0, 200) : undefined
            });
        });
        renumber(d.marks);
        return d;
    }

    /* ---------------- janela do anotador ------------------------------ */

    function el(tag, attrs, html) {
        var e = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
        if (html !== undefined) { e.innerHTML = html; }
        return e;
    }

    function openEditor(img, data, onApply) {
        var state = { tool: 'arrow', color: COLORS[0], hlColor: YELLOW, size: 2, sel: -1, drag: null,
                      undo: [], redo: [], data: data };
        var u = unit(data.w, data.h);

        var ov = el('div', { 'class': 'cx-anno-overlay', role: 'dialog', 'aria-label': 'Anotar imagem' });
        var win = el('div', { 'class': 'cx-anno' });
        var head = el('div', { 'class': 'cx-anno-head' },
            '<strong>Anotar imagem</strong><span class="cx-anno-hint"></span>'
            + '<span class="cx-anno-sp"></span>'
            + '<button type="button" class="codexplus-btn" data-a="undo" title="Desfazer (Ctrl+Z)"><i class="ti ti-arrow-back-up"></i></button>'
            + '<button type="button" class="codexplus-btn" data-a="redo" title="Refazer (Ctrl+Shift+Z)"><i class="ti ti-arrow-forward-up"></i></button>'
            + '<button type="button" class="codexplus-btn" data-a="del" title="Excluir a marca selecionada (Delete)"><i class="ti ti-trash"></i></button>'
            + '<button type="button" class="codexplus-btn" data-a="cancel">Cancelar</button>'
            + '<button type="button" class="codexplus-btn codexplus-btn-primary" data-a="apply">Aplicar no documento</button>');
        var bar = el('div', { 'class': 'cx-anno-bar' });
        TOOLS.forEach(function (t) {
            bar.appendChild(el('button', { type: 'button', 'class': 'cx-anno-tool', 'data-t': t.k, title: t.label },
                '<i class="ti ' + t.icon + '"></i><span>' + t.label + '</span>'));
        });
        bar.appendChild(el('span', { 'class': 'cx-anno-sep' }));
        COLORS.forEach(function (c) {
            bar.appendChild(el('button', { type: 'button', 'class': 'cx-anno-color', 'data-c': c,
                title: 'Cor', style: 'background:' + c }));
        });
        bar.appendChild(el('span', { 'class': 'cx-anno-sep' }));
        bar.appendChild(el('span', { 'class': 'cx-anno-sizelabel' }, 'Tamanho'));
        [[1, 'P'], [2, 'M'], [3, 'G']].forEach(function (z) {
            bar.appendChild(el('button', { type: 'button', 'class': 'cx-anno-size', 'data-z': String(z[0]) }, z[1]));
        });
        var stage = el('div', { 'class': 'cx-anno-stage' });
        var cv = el('canvas', { 'class': 'cx-anno-canvas' });
        cv.width = data.w; cv.height = data.h;
        stage.appendChild(cv);
        win.appendChild(head); win.appendChild(bar); win.appendChild(stage);
        ov.appendChild(win);
        document.body.appendChild(ov);
        var ctx = cv.getContext('2d');
        var hint = head.querySelector('.cx-anno-hint');

        var HINTS = {
            select: 'Clique numa marca para mover, ajustar pelas pontas, trocar cor e tamanho, ou excluir. Duplo clique no texto edita.',
            arrow: 'Arraste do início para a ponta da seta.',
            rect: 'Arraste para desenhar.', ellipse: 'Arraste para desenhar.',
            hl: 'Arraste sobre o que quer destacar. Cor e intensidade ao lado.',
            text: 'Clique onde o texto começa.',
            num: 'Clique para numerar os passos (1, 2, 3…).',
            blur: 'Arraste sobre senhas, IPs e dados pessoais.',
            crop: 'Arraste a área que fica. Para desfazer o recorte, clique fora dela.'
        };

        function snapshot() {
            state.undo.push(JSON.stringify(state.data));
            if (state.undo.length > 80) { state.undo.shift(); }
            state.redo = [];
        }

        function handles(m) {
            if (m.t === 'text' || m.t === 'num') { return []; }
            return [[m.x1, m.y1], [m.x2, m.y2]];
        }

        function paint() {
            ctx.clearRect(0, 0, cv.width, cv.height);
            ctx.drawImage(img, 0, 0, data.w, data.h);
            state.data.marks.forEach(function (m) { drawMark(ctx, m, u, img); });
            var c = state.data.crop;
            if (c && c.w > 3 && c.h > 3) {
                ctx.save();
                ctx.fillStyle = 'rgba(15,23,42,0.45)';
                ctx.beginPath();
                ctx.rect(0, 0, cv.width, cv.height);
                ctx.rect(c.x, c.y, c.w, c.h);
                ctx.fill('evenodd');
                ctx.setLineDash([u * 3, u * 2]);
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = u;
                ctx.strokeRect(c.x, c.y, c.w, c.h);
                ctx.restore();
            }
            var m = state.data.marks[state.sel];
            if (m) {
                ctx.save();
                ctx.setLineDash([u * 2, u * 2]);
                ctx.strokeStyle = '#185FA5'; ctx.lineWidth = Math.max(1, u * 0.6);
                var b = m.t === 'text' ? textBox(ctx, m, u)
                    : m.t === 'num' ? { x: m.x1 - u * 7 * SCALE[zOf(m)], y: m.y1 - u * 7 * SCALE[zOf(m)],
                                        w: u * 14 * SCALE[zOf(m)], h: u * 14 * SCALE[zOf(m)] } : box(m);
                ctx.strokeRect(b.x - u * 2, b.y - u * 2, b.w + u * 4, b.h + u * 4);
                ctx.setLineDash([]);
                ctx.fillStyle = '#ffffff';
                handles(m).forEach(function (p) {
                    ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(5, u * 2.5), 0, Math.PI * 2);
                    ctx.fill(); ctx.stroke();
                });
                ctx.restore();
            }
            bar.querySelectorAll('.cx-anno-tool').forEach(function (b) {
                b.classList.toggle('is-on', b.getAttribute('data-t') === state.tool);
            });
            var cur = m ? m.c : (state.tool === 'hl' ? state.hlColor : state.color);
            bar.querySelectorAll('.cx-anno-color').forEach(function (b) {
                b.classList.toggle('is-on', b.getAttribute('data-c') === cur);
            });
            var zt = m ? m.t : state.tool;
            var curZ = m ? zOf(m) : state.size;
            bar.querySelector('.cx-anno-sizelabel').textContent =
                (zt === 'hl' || zt === 'blur') ? 'Intensidade' : 'Tamanho';
            bar.querySelectorAll('.cx-anno-size').forEach(function (b) {
                b.classList.toggle('is-on', Number(b.getAttribute('data-z')) === curZ);
            });
            hint.textContent = HINTS[state.tool] || '';
            cv.style.cursor = state.tool === 'select' ? 'default' : 'crosshair';
        }

        function pos(e) {
            var r = cv.getBoundingClientRect();
            return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height];
        }

        function hit(p) {
            var tol = Math.max(8, u * 4);
            for (var i = state.data.marks.length - 1; i >= 0; i--) {
                var m = state.data.marks[i];
                if (m.t === 'num') {
                    if (Math.hypot(p[0] - m.x1, p[1] - m.y1) <= u * 7 * SCALE[zOf(m)] + tol / 2) { return i; }
                    continue;
                }
                if (m.t === 'text') {
                    var t = textBox(ctx, m, u);
                    if (p[0] >= t.x && p[0] <= t.x + t.w && p[1] >= t.y && p[1] <= t.y + t.h) { return i; }
                    continue;
                }
                if (m.t === 'arrow') {
                    var dx = m.x2 - m.x1, dy = m.y2 - m.y1, L = dx * dx + dy * dy || 1;
                    var k = Math.max(0, Math.min(1, ((p[0] - m.x1) * dx + (p[1] - m.y1) * dy) / L));
                    if (Math.hypot(p[0] - (m.x1 + k * dx), p[1] - (m.y1 + k * dy)) <= tol) { return i; }
                    continue;
                }
                var b = box(m);
                var inside = p[0] >= b.x - tol && p[0] <= b.x + b.w + tol && p[1] >= b.y - tol && p[1] <= b.y + b.h + tol;
                if (!inside) { continue; }
                if (m.t === 'hl' || m.t === 'blur') { return i; }
                var near = p[0] <= b.x + tol || p[0] >= b.x + b.w - tol || p[1] <= b.y + tol || p[1] >= b.y + b.h - tol;
                if (m.t === 'rect' && near) { return i; }
                if (m.t === 'ellipse') {
                    var rx = b.w / 2 || 1, ry = b.h / 2 || 1;
                    var v = Math.pow((p[0] - b.x - rx) / rx, 2) + Math.pow((p[1] - b.y - ry) / ry, 2);
                    if (Math.abs(Math.sqrt(v) - 1) * Math.min(rx, ry) <= tol) { return i; }
                }
            }
            return -1;
        }

        function handleAt(p) {
            var m = state.data.marks[state.sel];
            if (!m) { return -1; }
            var hs = handles(m), r = Math.max(8, u * 4);
            for (var i = 0; i < hs.length; i++) {
                if (Math.hypot(p[0] - hs[i][0], p[1] - hs[i][1]) <= r) { return i; }
            }
            return -1;
        }

        var textInput = null;
        function editText(m, isNew) {
            if (textInput) { textInput.blur(); }
            var r = cv.getBoundingClientRect(), sc = r.width / cv.width;
            var inp = el('input', { type: 'text', 'class': 'cx-anno-text', maxlength: '200' });
            inp.value = m.s || '';
            inp.style.left = (r.left + m.x1 * sc) + 'px';
            inp.style.top = (r.top + m.y1 * sc) + 'px';
            inp.style.color = m.c;
            ov.appendChild(inp);
            textInput = inp;
            var done = false;
            var finish = function (ok) {
                if (done) { return; }
                done = true;
                var v = inp.value.trim();
                inp.remove(); textInput = null;
                if (ok && v) {
                    if (!isNew) { snapshot(); }
                    m.s = v;
                } else if (isNew) {
                    state.data.marks.splice(state.data.marks.indexOf(m), 1);
                    state.undo.pop();
                    state.sel = -1;
                }
                paint();
            };
            inp.addEventListener('keydown', function (e) {
                e.stopPropagation();
                if (e.key === 'Enter') { e.preventDefault(); finish(true); }
                if (e.key === 'Escape') { e.preventDefault(); finish(false); }
            });
            inp.addEventListener('blur', function () { finish(true); });
            setTimeout(function () { inp.focus(); inp.select(); }, 0);
        }

        cv.addEventListener('pointerdown', function (e) {
            if (e.button !== 0) { return; }
            var p = pos(e);
            cv.setPointerCapture(e.pointerId);
            if (state.tool === 'select') {
                var h = handleAt(p);
                if (h !== -1) {
                    snapshot();
                    state.drag = { kind: 'handle', h: h };
                    return;
                }
                state.sel = hit(p);
                if (state.sel !== -1) {
                    snapshot();
                    state.drag = { kind: 'move', last: p, moved: false };
                }
                paint();
                return;
            }
            if (state.tool === 'num') {
                snapshot();
                state.data.marks.push({ t: 'num', x1: p[0], y1: p[1], x2: p[0], y2: p[1], c: state.color, z: state.size });
                renumber(state.data.marks);
                state.sel = -1;
                paint();
                return;
            }
            if (state.tool === 'text') {
                snapshot();
                var tm = { t: 'text', x1: p[0], y1: p[1], x2: p[0], y2: p[1], c: state.color, s: '', z: state.size };
                state.data.marks.push(tm);
                state.sel = state.data.marks.length - 1;
                paint();
                editText(tm, true);
                return;
            }
            snapshot();
            if (state.tool === 'crop') {
                state.drag = { kind: 'crop', x: p[0], y: p[1] };
                state.data.crop = null;
                paint();
                return;
            }
            var nm = { t: state.tool, x1: p[0], y1: p[1], x2: p[0], y2: p[1],
                       c: state.tool === 'hl' ? state.hlColor : state.color, z: state.size };
            state.data.marks.push(nm);
            state.drag = { kind: 'new', m: nm };
        });

        cv.addEventListener('pointermove', function (e) {
            var d = state.drag;
            if (!d) { return; }
            var p = pos(e);
            p[0] = Math.max(0, Math.min(cv.width, p[0]));
            p[1] = Math.max(0, Math.min(cv.height, p[1]));
            if (d.kind === 'new') { d.m.x2 = p[0]; d.m.y2 = p[1]; }
            else if (d.kind === 'crop') {
                state.data.crop = { x: Math.min(d.x, p[0]), y: Math.min(d.y, p[1]),
                                    w: Math.abs(p[0] - d.x), h: Math.abs(p[1] - d.y) };
            } else if (d.kind === 'handle') {
                var hm = state.data.marks[state.sel];
                if (d.h === 0) { hm.x1 = p[0]; hm.y1 = p[1]; } else { hm.x2 = p[0]; hm.y2 = p[1]; }
            } else if (d.kind === 'move') {
                var mm = state.data.marks[state.sel];
                var dx = p[0] - d.last[0], dy = p[1] - d.last[1];
                mm.x1 += dx; mm.x2 += dx; mm.y1 += dy; mm.y2 += dy;
                d.last = p; d.moved = true;
            }
            paint();
        });

        function endDrag() {
            var d = state.drag;
            state.drag = null;
            if (!d) { return; }
            if (d.kind === 'new') {
                var b = box(d.m);
                if (b.w < 4 && b.h < 4) {          // clique sem arrastar: nada
                    state.data.marks.pop();
                    state.undo.pop();
                } else {
                    state.sel = state.data.marks.length - 1;
                }
            } else if (d.kind === 'crop') {
                var c = state.data.crop;
                if (!c || c.w < 8 || c.h < 8) { state.data.crop = null; }
            } else if (d.kind === 'move' && !d.moved) {
                state.undo.pop();
            }
            paint();
        }
        cv.addEventListener('pointerup', endDrag);
        cv.addEventListener('pointercancel', endDrag);

        cv.addEventListener('dblclick', function (e) {
            var i = hit(pos(e));
            var m = state.data.marks[i];
            if (m && m.t === 'text') { state.sel = i; paint(); editText(m, false); }
        });

        bar.addEventListener('click', function (e) {
            var t = e.target.closest('[data-t]');
            if (t) {
                state.tool = t.getAttribute('data-t');
                if (state.tool !== 'select') { state.sel = -1; }
                paint();
                return;
            }
            var c = e.target.closest('[data-c]');
            if (c) {
                var nc = c.getAttribute('data-c');
                var m = state.data.marks[state.sel];
                if (m) {
                    if (m.t !== 'blur') { snapshot(); m.c = nc; }
                } else if (state.tool === 'hl') {
                    state.hlColor = nc;
                } else {
                    state.color = nc;
                }
                paint();
                return;
            }
            var z = e.target.closest('[data-z]');
            if (z) {
                var nz = Number(z.getAttribute('data-z'));
                var sm = state.data.marks[state.sel];
                if (sm) { snapshot(); sm.z = nz; } else { state.size = nz; }
                paint();
            }
        });

        function del() {
            if (state.sel === -1) { return; }
            snapshot();
            state.data.marks.splice(state.sel, 1);
            renumber(state.data.marks);
            state.sel = -1;
            paint();
        }
        function undo() {
            if (!state.undo.length) { return; }
            state.redo.push(JSON.stringify(state.data));
            state.data = JSON.parse(state.undo.pop());
            state.sel = -1; paint();
        }
        function redo() {
            if (!state.redo.length) { return; }
            state.undo.push(JSON.stringify(state.data));
            state.data = JSON.parse(state.redo.pop());
            state.sel = -1; paint();
        }
        function close() {
            document.removeEventListener('keydown', onKey, true);
            ov.remove();
        }
        function onKey(e) {
            if (textInput) { return; }
            var k = e.key;
            if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'Z')) {
                e.preventDefault(); e.stopPropagation();
                e.shiftKey ? redo() : undo();
            } else if ((e.ctrlKey || e.metaKey) && (k === 'y' || k === 'Y')) {
                e.preventDefault(); e.stopPropagation(); redo();
            } else if (k === 'Delete' || k === 'Backspace') {
                e.preventDefault(); e.stopPropagation(); del();
            } else if (k === 'Escape') {
                e.preventDefault(); e.stopPropagation();
                if (state.sel !== -1) { state.sel = -1; paint(); } else { close(); }
            }
        }
        document.addEventListener('keydown', onKey, true);

        head.addEventListener('click', function (e) {
            var a = e.target.closest('[data-a]');
            if (!a) { return; }
            var act = a.getAttribute('data-a');
            if (act === 'undo') { undo(); }
            else if (act === 'redo') { redo(); }
            else if (act === 'del') { del(); }
            else if (act === 'cancel') { close(); }
            else if (act === 'apply') {
                state.sel = -1;
                renumber(state.data.marks);
                var out = renderPng(img, state.data);
                out.toBlob(function (blob) {
                    if (!blob) { window.alert('Não foi possível gerar a imagem.'); return; }
                    close();
                    onApply(blob, state.data);
                }, 'image/png');
            }
        });

        paint();
        return { close: close, state: state, canvas: cv, overlay: ov };
    }

    /* ---------------- ligação com o TinyMCE ---------------------------- */

    function notify(editor, text, type) {
        if (editor && editor.notificationManager) {
            editor.notificationManager.open({ text: text, type: type || 'info', timeout: type === 'error' ? 0 : 4000 });
        } else { window.alert(text); }
    }

    function isSaved(url) { return /document\.send\.php\?[^"']*docid=\d+/.test(url || ''); }

    function loadImg(url) {
        return fetch(url, { credentials: 'same-origin' }).then(function (r) {
            if (!r.ok) { throw new Error('img'); }
            return r.blob();
        }).then(function (b) {
            return new Promise(function (ok, fail) {
                var u = URL.createObjectURL(b);
                var im = new Image();
                im.onload = function () { ok(im); };
                im.onerror = function () { fail(new Error('img')); };
                im.src = u;
            });
        });
    }

    /* Troca a imagem pelo PNG anotado e manda subir como imagem colada. */
    function applyToEditor(editor, imgEl, origUrl, blob, data) {
        var name = 'cx-anotacao-' + Date.now() + '.png';
        var up = new Blob([blob], { type: 'image/png' });
        up.name = name;
        var uploadId = Math.random().toString();
        var url = URL.createObjectURL(up);
        editor.undoManager.transact(function () {
            var dom = editor.dom;
            var wrap = dom.getParent(imgEl, 'span.cx-annot');
            if (!wrap) {
                wrap = dom.create('span', { 'class': 'cx-annot' });
                imgEl.parentNode.insertBefore(wrap, imgEl);
                wrap.appendChild(imgEl);
            }
            dom.setAttrib(wrap, 'data-cx-orig', origUrl);
            dom.setAttrib(wrap, 'data-cx-annot', JSON.stringify(data));
            dom.setAttribs(imgEl, { src: url, 'data-mce-src': url, 'data-upload_id': uploadId,
                                    width: null, height: null, id: null, alt: '' });
        });
        editor.nodeChanged();
        editor.setDirty(true);
        if (Array.isArray(window.uploaded_images) && typeof window.uploadFile === 'function') {
            window.uploaded_images.push({ upload_id: uploadId, filename: name });
            window.uploadFile(up, editor);
        } else {
            notify(editor, 'Área de envio de arquivos não encontrada: a imagem anotada não será gravada.', 'error');
        }
    }

    function open(editor, imgEl) {
        imgEl = imgEl || editor.selection.getNode();
        if (!imgEl || imgEl.nodeName !== 'IMG') {
            notify(editor, 'Clique numa imagem do corpo para anotar.', 'error');
            return null;
        }
        var wrap = editor.dom.getParent(imgEl, 'span.cx-annot');
        var orig = wrap ? wrap.getAttribute('data-cx-orig') : '';
        var raw = null;
        if (wrap) {
            try { raw = JSON.parse(wrap.getAttribute('data-cx-annot') || 'null'); } catch (e) { raw = null; }
        }
        if (!orig) { orig = imgEl.getAttribute('src') || ''; }
        if (!isSaved(orig)) {
            notify(editor, 'Salve o documento antes de anotar esta imagem: ela ainda não foi gravada.', 'error');
            return null;
        }
        return loadImg(orig).then(function (im) {
            var data = cleanData(raw, im.naturalWidth, im.naturalHeight);
            return openEditor(im, data, function (blob, d) { applyToEditor(editor, imgEl, orig, blob, d); });
        }).catch(function () {
            notify(editor, 'Não foi possível abrir a imagem original.', 'error');
            return null;
        });
    }

    /* Imagem anotada ainda subindo: o GLPI só grava a imagem depois que o
       envio termina e ela ganha o id da tag. Salvar antes disso gravaria o
       endereço temporário (blob:) no corpo. O Salvar espera, com aviso. */
    function pendingUploads(editor) {
        var body = editor && editor.getBody && editor.getBody();
        if (!body) { return 0; }
        return Array.prototype.filter.call(body.querySelectorAll('img[data-upload_id]'), function (im) {
            return /^blob:/.test(im.getAttribute('src') || '') && !im.getAttribute('id');
        }).length;
    }

    document.addEventListener('submit', function (e) {
        if (!window.tinymce) { return; }
        var editor = window.tinymce.get('codexplus-doc-content');
        if (!editor || !e.target || !e.target.contains(editor.getElement())) { return; }
        if (pendingUploads(editor) > 0) {
            e.preventDefault();
            e.stopImmediatePropagation();
            notify(editor, 'A imagem anotada ainda está sendo enviada. Aguarde alguns segundos e clique em Salvar de novo.', 'error');
        }
    }, true);

    window.CodexplusAnnotate = {
        open: open,
        // Expostos para os testes (jsdom).
        _renderPng: renderPng, _cleanData: cleanData, _openEditor: openEditor,
        _applyToEditor: applyToEditor, _isSaved: isSaved, _pending: pendingUploads
    };
})();
