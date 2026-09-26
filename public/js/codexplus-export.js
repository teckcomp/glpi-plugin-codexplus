/* =========================================================================
   Codex+ — exportar o documento em Word, .docx (bloco E3, 22/09/2026)
   -------------------------------------------------------------------------
   Pedido de Claudio: além do PDF, um Word para quem precisa editar ou mandar
   fora do GLPI. Botão #codexplus-docx ao lado do "Exportar PDF", na visão de
   leitura do documento novo.

   Tudo no navegador, com a biblioteca docx (MIT) em public/lib/docx,
   carregada só no clique. Lê o MESMO que o PDF:
     - #codexplus-print-config, por window.CodexplusPrint (codexplus.js):
       configuração, marcadores, linha de identificação e nome do arquivo;
     - .codexplus-doc-title e .codexplus-content (contrato dos seletores,
       CONTEXTO seção 6). Durante a revisão, a tela já traz a versão em vigor.

   Cabeçalho e rodapé espelham o PDF de 22/09/2026: cabeçalho = texto do
   rodapé configurado (código · revisão) + logo; rodapé = linha de
   identificação (inclusive o aviso de RASCUNHO) + paginação.

   Conversão do corpo: títulos h2/h3/h4 (estilos do E1) viram Título 1, 2 e
   3 do Word; Nota e Atenção viram parágrafo com faixa e fundo; A−/A+ viram
   tamanho da fonte (tokens --cx-size-*); listas, tabelas, links e imagens
   entram. O que não for reconhecido entra como texto.
   ========================================================================= */
(function () {
    'use strict';

    var BASE = (function () {
        var sc = document.currentScript;
        return sc && sc.src ? sc.src.replace(/\/js\/codexplus-export\.js.*$/, '') : '';
    })();
    var LIB = '/lib/docx/docx.min.js';
    var libPromise = null;

    function loadDocx() {
        if (window.docx && window.docx.Document) { return Promise.resolve(window.docx); }
        if (!libPromise) {
            libPromise = new Promise(function (ok, fail) {
                var el = document.createElement('script');
                el.src = BASE + LIB;
                el.onload = function () { window.docx ? ok(window.docx) : fail(new Error('docx')); };
                el.onerror = function () { libPromise = null; fail(new Error('docx')); };
                document.head.appendChild(el);
            });
        }
        return libPromise;
    }

    /* Medidas. A4 em twips (1/1440 pol.); 1 mm = 56,7 twips. Margens do PDF. */
    var MM = 56.7;
    var PAGE = { w: 11906, h: 16838, x: Math.round(16 * MM), top: Math.round(24 * MM),
                 bottom: Math.round(22 * MM), header: Math.round(9 * MM), footer: Math.round(9 * MM) };
    var CONTENT_PX = Math.round((210 - 32) * 96 / 25.4);   // largura útil em px (96 dpi)
    var BASE_HALF_PT = 22;                                  // 11 pt
    var INK = '0C447C';                                     // cor dos títulos no PDF

    var BLOCK = /^(P|DIV|H[1-6]|UL|OL|LI|TABLE|PRE|BLOCKQUOTE|HR|SECTION|ARTICLE|FIGURE|FIGCAPTION|HEADER|FOOTER|ASIDE|DL|DT|DD|ADDRESS)$/;

    function sizes() {
        var css = window.getComputedStyle ? window.getComputedStyle(document.documentElement) : null;
        var read = function (n, d) {
            var v = css ? parseFloat(css.getPropertyValue(n)) : NaN;
            return isFinite(v) && v > 0 ? v : d;
        };
        return { sm: read('--cx-size-sm', 0.87), lg: read('--cx-size-lg', 1.2) };
    }

    function hasClass(el, c) { return !!(el.classList && el.classList.contains(c)); }

    /* ---------------------------------------------------------------- */
    /* Imagens: bytes + tipo + tamanho, pré-carregados antes da conversão */
    /* ---------------------------------------------------------------- */

    function sniff(u8) {
        if (u8[0] === 0x89 && u8[1] === 0x50) { return 'png'; }
        if (u8[0] === 0xFF && u8[1] === 0xD8) { return 'jpg'; }
        if (u8[0] === 0x47 && u8[1] === 0x49) { return 'gif'; }
        if (u8[0] === 0x42 && u8[1] === 0x4D) { return 'bmp'; }
        return '';
    }

    function dims(blob) {
        return new Promise(function (ok) {
            var url = URL.createObjectURL(blob);
            var im = new Image();
            im.onload = function () { ok({ w: im.naturalWidth, h: im.naturalHeight, im: im, url: url }); };
            im.onerror = function () { ok({ w: 0, h: 0, im: null, url: url }); };
            im.src = url;
        });
    }

    function loadImage(src) {
        return fetch(src, { credentials: 'same-origin' }).then(function (r) {
            if (!r.ok) { throw new Error('img'); }
            return r.blob();
        }).then(function (blob) {
            return blob.arrayBuffer().then(function (buf) {
                var u8 = new Uint8Array(buf);
                var type = sniff(u8);
                return dims(blob).then(function (d) {
                    var done = function (data, t) {
                        URL.revokeObjectURL(d.url);
                        return d.w > 0 ? { data: data, type: t, w: d.w, h: d.h } : null;
                    };
                    if (type) { return done(u8, type); }
                    // SVG, WebP e outros: o Word não abre; vira PNG pelo canvas.
                    if (!d.im) { return done(null, ''); }
                    var cv = document.createElement('canvas');
                    cv.width = d.w; cv.height = d.h;
                    cv.getContext('2d').drawImage(d.im, 0, 0);
                    return new Promise(function (ok) {
                        cv.toBlob(function (png) {
                            if (!png) { ok(done(null, '')); return; }
                            png.arrayBuffer().then(function (b) { ok(done(new Uint8Array(b), 'png')); });
                        }, 'image/png');
                    });
                });
            });
        }).catch(function () { return null; });
    }

    function preload(root, extra) {
        var srcs = [];
        Array.prototype.forEach.call(root.querySelectorAll('img[src]'), function (im) {
            var s = im.getAttribute('src');
            if (s && srcs.indexOf(s) === -1) { srcs.push(s); }
        });
        (extra || []).forEach(function (s) { if (s && srcs.indexOf(s) === -1) { srcs.push(s); } });
        var map = {};
        return Promise.all(srcs.map(function (s) {
            return loadImage(s).then(function (r) { map[s] = r; });
        })).then(function () { return map; });
    }

    /* ---------------------------------------------------------------- */
    /* HTML -> docx                                                      */
    /* ---------------------------------------------------------------- */

    function Converter(D, images) {
        this.D = D;
        this.images = images;
        this.sz = sizes();
        this.numInstance = 0;
        this.step = 0;
    }

    Converter.prototype.fmtProps = function (f) {
        var p = {};
        if (f.bold) { p.bold = true; }
        if (f.italics) { p.italics = true; }
        if (f.underline) { p.underline = {}; }
        if (f.strike) { p.strike = true; }
        if (f.sub) { p.subScript = true; }
        if (f.sup) { p.superScript = true; }
        if (f.mono) { p.font = 'Courier New'; }
        if (f.size) { p.size = f.size; }
        if (f.link) { p.style = 'Hyperlink'; }
        if (f.color) { p.color = f.color; }
        if (f.mark) { p.shading = { type: this.D.ShadingType.CLEAR, color: 'auto', fill: f.mark }; }
        return p;
    };

    Converter.prototype.imageRun = function (el) {
        var D = this.D;
        var img = this.images[el.getAttribute('src')];
        if (!img || !img.data) { return null; }
        var w = img.w, h = img.h;
        var aw = parseInt(el.getAttribute('width'), 10);
        if (aw > 0 && aw < w) { h = Math.round(h * aw / w); w = aw; }
        if (w > CONTENT_PX) { h = Math.round(h * CONTENT_PX / w); w = CONTENT_PX; }
        return new D.ImageRun({ type: img.type, data: img.data, transformation: { width: w, height: h } });
    };

    /* Coleta as partes em linha de um nó (texto, quebra, imagem, link). */
    Converter.prototype.inline = function (node, f, out, st) {
        var D = this.D, self = this;
        if (node.nodeType === 3) {
            var t = node.nodeValue.replace(/[\s\u00a0]+/g, function (m) { return m.indexOf('\u00a0') !== -1 ? '\u00a0' : ' '; });
            if (st.atStart) { t = t.replace(/^ +/, ''); }
            if (!t) { return; }
            st.atStart = false;
            out.push(new D.TextRun(Object.assign({ text: t }, this.fmtProps(f))));
            return;
        }
        if (node.nodeType !== 1) { return; }
        var tag = node.nodeName;
        if (tag === 'BR') { out.push(new D.TextRun({ break: 1 })); st.atStart = true; return; }
        if (tag === 'IMG') {
            var ir = this.imageRun(node);
            if (ir) { out.push(ir); st.atStart = false; }
            return;
        }
        if (tag === 'SCRIPT' || tag === 'STYLE') { return; }
        var g = Object.assign({}, f);
        if (tag === 'STRONG' || tag === 'B') { g.bold = true; }
        if (tag === 'EM' || tag === 'I') { g.italics = true; }
        if (tag === 'U' || tag === 'INS') { g.underline = true; }
        if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') { g.strike = true; }
        if (tag === 'SUB') { g.sub = true; }
        if (tag === 'SUP') { g.sup = true; }
        if (tag === 'CODE' || tag === 'KBD' || tag === 'SAMP') { g.mono = true; }
        if (hasClass(node, 'cx-size-sm')) { g.size = Math.round(BASE_HALF_PT * this.sz.sm); }
        if (hasClass(node, 'cx-size-lg')) { g.size = Math.round(BASE_HALF_PT * this.sz.lg); }
        // E5: cor e realce da paleta (a mesma do editor).
        var pal = (window.CodexplusEditor && window.CodexplusEditor.palette) || { fg: [], bg: [] };
        pal.fg.forEach(function (c) { if (hasClass(node, 'cx-fg-' + c.key)) { g.color = c.hex.slice(1).toUpperCase(); } });
        pal.bg.forEach(function (c) { if (hasClass(node, 'cx-bg-' + c.key)) { g.mark = c.hex.slice(1).toUpperCase(); } });
        if (tag === 'A' && node.getAttribute('href') && !/^#/.test(node.getAttribute('href'))) {
            g.link = true;
            var sub = [];
            Array.prototype.forEach.call(node.childNodes, function (c) { self.inline(c, g, sub, st); });
            if (sub.length) {
                out.push(new D.ExternalHyperlink({ link: node.href || node.getAttribute('href'), children: sub }));
            }
            return;
        }
        Array.prototype.forEach.call(node.childNodes, function (c) { self.inline(c, g, out, st); });
    };

    Converter.prototype.blockFmt = function (el, f) {
        var g = Object.assign({}, f);
        if (hasClass(el, 'cx-size-sm')) { g.size = Math.round(BASE_HALF_PT * this.sz.sm); }
        if (hasClass(el, 'cx-size-lg')) { g.size = Math.round(BASE_HALF_PT * this.sz.lg); }
        return g;
    };

    Converter.prototype.paraOpts = function (el, base) {
        var D = this.D;
        var o = Object.assign({}, base || {});
        var callout = hasClass(el, 'cx-callout-note') ? ['E6F1FB', '378ADD']
            : hasClass(el, 'cx-callout-attention') ? ['FCEBEB', 'E24B4A']
            : hasClass(el, 'cx-callout-tip') ? ['EAF3DE', '639922'] : null;
        if (callout) {
            o.shading = { type: D.ShadingType.CLEAR, color: 'auto', fill: callout[0] };
            o.border = { left: { style: D.BorderStyle.SINGLE, size: 24, color: callout[1], space: 8 } };
            o.indent = { left: 170, right: 170 };
        }
        var align = (el.style && el.style.textAlign) || el.getAttribute('align') || '';
        if (align === 'center') { o.alignment = D.AlignmentType.CENTER; }
        else if (align === 'right') { o.alignment = D.AlignmentType.RIGHT; }
        else if (align === 'justify') { o.alignment = D.AlignmentType.JUSTIFIED; }
        return o;
    };

    /* Filhos de um contêiner: trechos em linha viram parágrafos; blocos,
       o que o bloco for. */
    Converter.prototype.children = function (parent, ctx, out) {
        var self = this, D = this.D;
        var runs = [], st = { atStart: true };
        var flush = function () {
            if (runs.length) {
                out.push(new D.Paragraph(Object.assign({ children: runs }, ctx.para || {})));
            }
            runs = []; st = { atStart: true };
        };
        Array.prototype.forEach.call(parent.childNodes, function (c) {
            if (c.nodeType === 1 && BLOCK.test(c.nodeName)) {
                flush();
                self.block(c, ctx, out);
            } else {
                self.inline(c, ctx.fmt || {}, runs, st);
            }
        });
        flush();
    };

    Converter.prototype.hasBlockChild = function (el) {
        return Array.prototype.some.call(el.children, function (c) { return BLOCK.test(c.nodeName); });
    };

    Converter.prototype.block = function (el, ctx, out) {
        var D = this.D, self = this, tag = el.nodeName;
        var m = /^H([1-6])$/.exec(tag);
        if (m) {
            var n = parseInt(m[1], 10);
            var level = n <= 2 ? D.HeadingLevel.HEADING_1 : (n === 3 ? D.HeadingLevel.HEADING_2 : D.HeadingLevel.HEADING_3);
            var hr = [];
            this.inline(el, {}, hr, { atStart: true });
            out.push(new D.Paragraph(Object.assign({ heading: level, children: hr }, this.paraOpts(el))));
            return;
        }
        if (tag === 'UL' || tag === 'OL') { this.list(el, ctx, out, 0); return; }
        if (tag === 'TABLE') { out.push(this.table(el, ctx)); return; }
        if (tag === 'HR') {
            out.push(new D.Paragraph({ children: [], border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: 'D1D5DB', space: 1 } } }));
            return;
        }
        if (tag === 'PRE') {
            var lines = (el.textContent || '').replace(/\n$/, '').split('\n');
            var pr = [];
            lines.forEach(function (ln, i) {
                pr.push(new D.TextRun({ text: ln, font: 'Courier New', size: 19, break: i > 0 ? 1 : 0 }));
            });
            out.push(new D.Paragraph({ children: pr, shading: { type: D.ShadingType.CLEAR, color: 'auto', fill: 'F6F8FA' } }));
            return;
        }
        var fmt = this.blockFmt(el, ctx.fmt || {});
        var para = this.paraOpts(el, ctx.para);
        if (tag === 'BLOCKQUOTE') {
            para.indent = { left: 567 };
            fmt.italics = true;
        }
        if (hasClass(el, 'cx-step')) {
            this.step += 1;
            var sr = [new D.TextRun({ text: this.step + '. ', bold: true, color: INK })];
            this.inline(el, fmt, sr, { atStart: false });
            out.push(new D.Paragraph(Object.assign({ children: sr }, para)));
            return;
        }
        if (this.hasBlockChild(el)) {
            this.children(el, { fmt: fmt, para: para, level: ctx.level }, out);
            return;
        }
        var runs = [];
        this.inline(el, fmt, runs, { atStart: true });
        out.push(new D.Paragraph(Object.assign({ children: runs }, para)));
    };

    Converter.prototype.list = function (el, ctx, out, level) {
        var D = this.D, self = this;
        var ordered = el.nodeName === 'OL';
        var instance = ordered ? ++this.numInstance : 0;
        Array.prototype.forEach.call(el.children, function (li) {
            if (li.nodeName !== 'LI') { return; }
            var runs = [], st = { atStart: true }, first = true;
            var emit = function () {
                var o = { children: runs };
                if (first) {
                    o.numbering = ordered
                        ? { reference: 'cx-num', level: Math.min(level, 3), instance: instance }
                        : { reference: 'cx-bullet', level: Math.min(level, 3) };
                } else {
                    o.indent = { left: 720 * (Math.min(level, 3) + 1) };
                }
                out.push(new D.Paragraph(o));
                first = false;
                runs = []; st = { atStart: true };
            };
            Array.prototype.forEach.call(li.childNodes, function (c) {
                if (c.nodeType === 1 && (c.nodeName === 'UL' || c.nodeName === 'OL')) {
                    if (runs.length || first) { emit(); }
                    self.list(c, ctx, out, level + 1);
                } else if (c.nodeType === 1 && c.nodeName === 'P') {
                    if (runs.length) { emit(); }
                    self.inline(c, self.blockFmt(c, ctx.fmt || {}), runs, st);
                    emit();
                } else {
                    self.inline(c, ctx.fmt || {}, runs, st);
                }
            });
            if (runs.length || first) { emit(); }
        });
    };

    Converter.prototype.table = function (el, ctx) {
        var D = this.D, self = this;
        var rows = [];
        Array.prototype.forEach.call(el.rows, function (tr) {
            var cells = [];
            Array.prototype.forEach.call(tr.cells, function (td) {
                var th = td.nodeName === 'TH';
                var inner = [];
                // PL1: números da planilha à direita, como na tela e no PDF.
                var num = (' ' + (td.className || '') + ' ').indexOf(' cx-sheet-num ') !== -1;
                self.children(td, { fmt: Object.assign(self.blockFmt(td, {}), th ? { bold: true } : {}),
                    para: num ? { alignment: D.AlignmentType.RIGHT } : {} }, inner);
                if (!inner.length) { inner.push(new D.Paragraph({ children: [] })); }
                var o = { children: inner, margins: { top: 60, bottom: 60, left: 100, right: 100 } };
                if (td.colSpan > 1) { o.columnSpan = td.colSpan; }
                if (td.rowSpan > 1) { o.rowSpan = td.rowSpan; }
                if (th) { o.shading = { type: D.ShadingType.CLEAR, color: 'auto', fill: 'F3F4F6' }; }
                // PL1: linhas alternadas da planilha com fundo azul claro.
                if ((' ' + (tr.className || '') + ' ').indexOf(' cx-sheet-alt ') !== -1) {
                    o.shading = { type: D.ShadingType.CLEAR, color: 'auto', fill: 'E6F1FB' };
                }
                cells.push(new D.TableCell(o));
            });
            if (cells.length) { rows.push(new D.TableRow({ children: cells, tableHeader: tr.parentNode && tr.parentNode.nodeName === 'THEAD' })); }
        });
        var line = { style: D.BorderStyle.SINGLE, size: 4, color: 'D1D5DB' };
        return new D.Table({
            width: { size: 100, type: D.WidthType.PERCENTAGE },
            borders: { top: line, bottom: line, left: line, right: line, insideHorizontal: line, insideVertical: line },
            rows: rows.length ? rows : [new D.TableRow({ children: [new D.TableCell({ children: [new D.Paragraph('')] })] })]
        });
    };

    /* ---------------------------------------------------------------- */
    /* Documento                                                         */
    /* ---------------------------------------------------------------- */

    function numbering(D) {
        var bullets = ['\u2022', '\u25E6', '\u25AA', '\u2022'];
        var fmts = [D.LevelFormat.DECIMAL, D.LevelFormat.LOWER_LETTER, D.LevelFormat.LOWER_ROMAN, D.LevelFormat.DECIMAL];
        var lv = function (i, format, text) {
            return { level: i, format: format, text: text, alignment: D.AlignmentType.LEFT,
                     style: { paragraph: { indent: { left: 720 * (i + 1), hanging: 360 } } } };
        };
        return { config: [
            { reference: 'cx-bullet', levels: [0, 1, 2, 3].map(function (i) { return lv(i, D.LevelFormat.BULLET, bullets[i]); }) },
            { reference: 'cx-num', levels: [0, 1, 2, 3].map(function (i) { return lv(i, fmts[i], '%' + (i + 1) + '.'); }) }
        ] };
    }

    function styles() {
        var h = function (id, name, size, before) {
            return { id: id, name: name, basedOn: 'Normal', next: 'Normal', quickFormat: true,
                     run: { size: size, bold: true, color: INK, font: 'Arial' },
                     paragraph: { spacing: { before: before, after: 120 }, keepNext: true } };
        };
        return {
            default: { document: { run: { font: 'Arial', size: BASE_HALF_PT, color: '1F2937' },
                                   paragraph: { spacing: { after: 140, line: 300 } } } },
            paragraphStyles: [
                h('Heading1', 'Heading 1', 28, 320),
                h('Heading2', 'Heading 2', 24, 240),
                h('Heading3', 'Heading 3', 23, 200),
                { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', quickFormat: true,
                  run: { size: 38, bold: true, color: INK, font: 'Arial' },
                  paragraph: { spacing: { after: 80 } } }
            ]
        };
    }

    /* Texto com marcadores; {pagina} e {total} viram campos do Word. */
    function markerRuns(D, P, text, cfg, props) {
        var runs = [];
        String(text || '').split(/(\{pagina\}|\{total\})/).forEach(function (part) {
            if (!part) { return; }
            if (part === '{pagina}') { runs.push(new D.TextRun(Object.assign({ children: [D.PageNumber.CURRENT] }, props))); }
            else if (part === '{total}') { runs.push(new D.TextRun(Object.assign({ children: [D.PageNumber.TOTAL_PAGES] }, props))); }
            else { runs.push(new D.TextRun(Object.assign({ text: P.markers(part, cfg, '', '') }, props))); }
        });
        return runs;
    }

    function logoRun(D, cfg, images) {
        if (!cfg.brand.show_logo) { return null; }
        var img = images[cfg.brand.logo_url];
        if (!img || !img.data) { return null; }
        var h = Math.round(cfg.brand.logo_mm * 96 / 25.4);
        var w = Math.round(img.w * h / img.h);
        if (w > CONTENT_PX / 2) { h = Math.round(h * (CONTENT_PX / 2) / w); w = Math.round(CONTENT_PX / 2); }
        return new D.ImageRun({ type: img.type, data: img.data, transformation: { width: w, height: h } });
    }

    function build(D, P, cfg, titleText, contentEl, images) {
        var small = { size: 17, color: '6B7280' };
        var tabRight = [{ type: D.TabStopType.RIGHT, position: PAGE.w - 2 * PAGE.x }];

        // Cabeçalho: texto do rodapé configurado (senão o título) e a logo.
        var runText = cfg.document.footer_text || cfg.brand.footer_text;
        var textRuns = runText ? markerRuns(D, P, runText, cfg, small)
                               : [new D.TextRun(Object.assign({ text: titleText }, small))];
        var logo = logoRun(D, cfg, images);
        var hChildren = logo
            ? (cfg.brand.logo_pos === 'left'
                ? [logo, new D.TextRun({ children: [new D.Tab()] })].concat(textRuns)
                : textRuns.concat([new D.TextRun({ children: [new D.Tab()] }), logo]))
            : textRuns;
        var header = new D.Header({ children: [new D.Paragraph({
            children: hChildren, tabStops: tabRight,
            border: { bottom: { style: D.BorderStyle.SINGLE, size: 4, color: 'E5E7EB', space: 4 } }
        })] });

        var ident = P.ident(cfg);
        var footer = null;
        if (cfg.brand.footer_show) {
            var fr = [new D.TextRun(Object.assign({ text: ident }, small))];
            if (cfg.brand.footer_pages) {
                fr.push(new D.TextRun({ children: [new D.Tab()] }));
                fr.push(new D.TextRun(Object.assign({ children: [D.PageNumber.CURRENT, ' / ', D.PageNumber.TOTAL_PAGES] }, small, { bold: true })));
            }
            footer = new D.Footer({ children: [new D.Paragraph({
                children: fr, tabStops: tabRight,
                border: { top: { style: D.BorderStyle.SINGLE, size: 4, color: 'E5E7EB', space: 4 } }
            })] });
        }

        var body = [];
        body.push(new D.Paragraph({
            style: 'Title',
            children: [new D.TextRun(cfg.brand.title_upper ? titleText.toUpperCase() : titleText)],
            border: { bottom: { style: D.BorderStyle.SINGLE, size: 12, color: INK, space: 6 } }
        }));
        if (!cfg.brand.footer_show && ident) {
            body.push(new D.Paragraph({ children: [new D.TextRun(Object.assign({ text: ident }, small))] }));
        }
        body.push(new D.Paragraph({ children: [] }));
        new Converter(D, images).children(contentEl, { fmt: {}, para: {} }, body);

        var section = {
            properties: { page: {
                size: { width: PAGE.w, height: PAGE.h },
                margin: { top: PAGE.top, bottom: PAGE.bottom, left: PAGE.x, right: PAGE.x,
                          header: PAGE.header, footer: PAGE.footer }
            } },
            headers: { default: header },
            children: body
        };
        if (footer) { section.footers = { default: footer }; }

        return new D.Document({
            creator: cfg.brand.company || 'Codex+',
            title: titleText,
            description: cfg.document.code || '',
            styles: styles(),
            numbering: numbering(D),
            sections: [section]
        });
    }

    function save(blob, name) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
    }

    /* Gera e devolve { blob, name } (usado pelo botão e pelos testes). */
    function exportDocx() {
        var P = window.CodexplusPrint;
        var root = document.getElementById('codexplus-doc');
        var content = root && root.querySelector('.codexplus-content');
        if (!P || !content) { return Promise.reject(new Error('pagina')); }
        var cfg = P.config();
        var titleEl = root.querySelector('.codexplus-doc-title');
        var titleText = (cfg.document.title || (titleEl ? titleEl.textContent : '') || '').trim();
        return loadDocx().then(function (D) {
            return preload(content, cfg.brand.show_logo ? [cfg.brand.logo_url] : []).then(function (images) {
                var doc = build(D, P, cfg, titleText, content, images);
                return D.Packer.toBlob(doc).then(function (blob) {
                    return { blob: blob, name: P.fileTitle(cfg, titleText) + '.docx' };
                });
            });
        });
    }

    window.CodexplusExport = { docx: exportDocx };

    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('codexplus-docx');
        if (!btn) { return; }
        btn.addEventListener('click', function () {
            if (btn.disabled) { return; }
            var label = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="ti ti-loader-2"></i> Gerando…';
            exportDocx().then(function (r) {
                save(r.blob, r.name);
            }).catch(function (err) {
                console.error('Codex+ (Word):', err);
                window.alert('Não foi possível gerar o Word. Tente de novo; se persistir, use o PDF.');
            }).then(function () {
                btn.disabled = false;
                btn.innerHTML = label;
            });
        });
    });
})();
