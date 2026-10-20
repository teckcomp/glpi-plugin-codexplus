/* =========================================================================
   Codex+ — editor do documento com estilos fixos (bloco E1, 22/09/2026)
   -------------------------------------------------------------------------
   Pedido de Claudio: tamanho de fonte no editor, mas padronizado. Em vez do
   tamanho livre do TinyMCE, o menu "Estilo" (Título 1, 2 e 3, Parágrafo,
   Nota, Atenção) e três botões de tamanho (A−, A, A+).

   O que fica gravado no HTML é só TAG + CLASSE, nunca font-size:
     Título 1/2/3  -> <h2>/<h3>/<h4>  (o <h1> é o título do documento no PDF)
     Parágrafo     -> <p>
     Nota          -> <p class="cx-callout cx-callout-note">
     Atenção       -> <p class="cx-callout cx-callout-attention">
     A− / A+       -> <span class="cx-size-sm|cx-size-lg"> só no trecho
                      selecionado (A tira). Correção E1-2, Claudio 22/09/2026:
                      no bloco inteiro mudava o parágrafo todo.
   As medidas vêm dos tokens --cx-size-sm e --cx-size-lg (codexplus.css,
   seção 1), lidos aqui e no PDF: mudar o valor lá muda tela, editor e PDF,
   inclusive dos documentos já gravados.

   COMO ENTRA NO EDITOR SEM MEXER NO NÚCLEO. Html::initEditorSystem (11.0.6)
   guarda a configuração em tinymce_editor_configs[id] e, no mesmo passo,
   chama tinyMCE.init. prepare(id) instala um "setter" nessa chave: quando o
   GLPI grava a configuração, ela passa por customize() antes do init. Só o
   editor do Codex+ (id codexplus-doc-content) é alterado.

   Os estilos são aplicados por código próprio (applyStyle/applySize), e não
   pelos formatos do TinyMCE: trocar Nota por Parágrafo, ou A+ por A−, tem
   que deixar UMA classe no bloco, e o formatter do TinyMCE soma classes.
   ========================================================================= */
(function () {
    'use strict';

    var EDITOR_ID = 'codexplus-doc-content';
    // M1: o editor da tela Modelos usa a mesma barra, sem imagem (modelo não
    // guarda imagem). MO-2: no lugar, o botão Marcador ("Imagem aqui"...),
    // o mesmo que Template::toPlaceholders grava ao salvar como modelo.
    var TEMPLATE_EDITOR_ID = 'codexplus_tpl_content';

    var STYLES = [
        { key: 'h1',   label: 'Título 1', tag: 'h2', cls: '' },
        { key: 'h2',   label: 'Título 2', tag: 'h3', cls: '' },
        { key: 'h3',   label: 'Título 3', tag: 'h4', cls: '' },
        { key: 'p',    label: 'Parágrafo', tag: 'p', cls: '' },
        { key: 'note', label: 'Nota',      tag: 'p', cls: 'cx-callout cx-callout-note' },
        { key: 'attn', label: 'Atenção',   tag: 'p', cls: 'cx-callout cx-callout-attention' }
    ];
    var STYLE_CLASSES = ['cx-callout', 'cx-callout-note', 'cx-callout-attention', 'cx-callout-tip'];
    var SIZES = [
        { key: 'sm', label: 'A−', tip: 'Texto pequeno',  cls: 'cx-size-sm' },
        { key: 'md', label: 'A',  tip: 'Texto normal',   cls: '' },
        { key: 'lg', label: 'A+', tip: 'Texto grande',   cls: 'cx-size-lg' }
    ];
    var SIZE_CLASSES = ['cx-size-sm', 'cx-size-lg'];
    /* Cor do texto e realce (bloco E5, Claudio 26/09/2026): PALETA FIXA, por
       classe, como os tamanhos — a padronização do E1 continua (cor livre
       colada ou importada ainda sai pelo invalid_styles). Fonte única: o PDF
       (sizeCss) e o Word (codexplus-export.js, via PALETTE) leem daqui. */
    var PALETTE = {
        fg: [
            { key: 'red',    label: 'Vermelho', hex: '#c62828' },
            { key: 'orange', label: 'Laranja',  hex: '#b45309' },
            { key: 'green',  label: 'Verde',    hex: '#2e7d32' },
            { key: 'blue',   label: 'Azul',     hex: '#1f5fbf' },
            { key: 'gray',   label: 'Cinza',    hex: '#5f6b7a' },
            // PL-6 (Claudio, 19/10/2026): para voltar ao branco sobre realce.
            { key: 'white',  label: 'Branco',   hex: '#ffffff' }
        ],
        // PL-6 (Claudio, 19/10/2026): o realce usa as mesmas 5 cores fortes do
        // texto, com o texto branco automático (text). Chaves em português para
        // não colidir com os realces antigos (bgOld).
        bg: [
            { key: 'vermelho', label: 'Vermelho', hex: '#c62828', text: '#ffffff' },
            { key: 'laranja',  label: 'Laranja',  hex: '#b45309', text: '#ffffff' },
            { key: 'verde',    label: 'Verde',    hex: '#2e7d32', text: '#ffffff' },
            { key: 'azul',     label: 'Azul',     hex: '#1f5fbf', text: '#ffffff' },
            { key: 'cinza',    label: 'Cinza',    hex: '#5f6b7a', text: '#ffffff' }
        ],
        // Realces de antes do PL-6 (E5, tons de 26/09/2026): saem do menu, mas
        // continuam desenhando nos documentos gravados, no PDF e no Word; o
        // "Sem realce" também os tira.
        bgOld: [
            { key: 'yellow', label: 'Amarelo',  hex: '#ffe45c' },
            { key: 'green',  label: 'Verde',    hex: '#a8dc9a' },
            { key: 'blue',   label: 'Azul',     hex: '#a9cdf7' },
            { key: 'red',    label: 'Vermelho', hex: '#f5a3a3' }
        ]
    };
    // Ordem: realces antes da cor do texto — com as duas classes no mesmo
    // trecho, a cor escolhida vence o branco automático.
    function colorCss() {
        var print = '-webkit-print-color-adjust:exact;print-color-adjust:exact;';
        return PALETTE.bgOld.map(function (c) {
                return '.cx-bg-' + c.key + '{background-color:' + c.hex + ';' + print + '}';
            }).join('')
            + PALETTE.bg.map(function (c) {
                return '.cx-bg-' + c.key + '{background-color:' + c.hex + ';color:' + c.text + ';' + print + '}'
                    + '.cx-bg-' + c.key + ' a{color:inherit;}';
            }).join('')
            + PALETTE.fg.map(function (c) { return '.cx-fg-' + c.key + '{color:' + c.hex + ';}'; }).join('');
    }
    // Blocos que recebem estilo e tamanho. Célula de tabela e item de lista
    // só recebem tamanho (não viram título nem nota).
    var TEXT_BLOCKS = 'p,h1,h2,h3,h4,h5,h6,div,pre,blockquote';

    /* T2 — ferramentas por tipo de documento (Claudio, 27/09/2026):
         POP, PSG, MAN -> texto e imagens
         PRP           -> + Planilha e Planta
         LAU, DTC      -> + Planta e Topologia
         DIV           -> tudo
         Mapa de calor (Q8-4a) -> PRP, LAU, DTC e DIV
       (DIA tem editor próprio e não usa este corpo.) Tipo fora da tabela ou
       ainda não escolhido mostra tudo. Esconder o botão não mexe no que já
       está no texto: planilha e quadro existentes continuam abrindo com
       duplo clique. O tipo vem do select[name=doctype] do formulário
       (documento novo e tela Modelos, onde ele muda na hora) ou do
       data-cx-doctype em volta do editor (documento já criado). */
    var TOOLS_BY_TYPE = {
        cxsheet:    ['PRP', 'DIV'],
        cxsum:      ['PRP', 'DIV'], // 3c-2: Resumo do investimento
        cxplant:    ['PRP', 'LAU', 'DTC', 'DIV'],
        cxtopology: ['LAU', 'DTC', 'DIV'],
        cxheat:     ['PRP', 'LAU', 'DTC', 'DIV']
    };
    var KNOWN_TYPES = ['POP', 'PSG', 'MAN', 'PRP', 'LAU', 'DTC', 'DIV'];
    function toolAllowed(btn, type) {
        var list = TOOLS_BY_TYPE[btn];
        if (!list || KNOWN_TYPES.indexOf(type) === -1) { return true; }
        return list.indexOf(type) !== -1;
    }
    function hiddenTools(type) {
        return Object.keys(TOOLS_BY_TYPE).filter(function (b) { return !toolAllowed(b, type); });
    }
    function typeSelect(editor) {
        var el = editor && editor.getElement && editor.getElement();
        var form = el ? (el.form || (el.closest && el.closest('form'))) : null;
        return (form && form.querySelector('select[name="doctype"]'))
            || document.querySelector('select[name="doctype"]');
    }
    function currentType(editor) {
        var sel = typeSelect(editor);
        if (sel) { return String(sel.value || ''); }
        var el = editor && editor.getElement && editor.getElement();
        var holder = (el && el.closest && el.closest('[data-cx-doctype]'))
            || document.querySelector('[data-cx-doctype]');
        return holder ? String(holder.getAttribute('data-cx-doctype') || '') : '';
    }
    /* A barra e a gaveta "mais" (modo floating) ficam fora do iframe e a
       gaveta nem fica dentro do contêiner do editor: por isso a marca vai no
       <html> e o CSS casa pelo data-mce-name que o TinyMCE 7 põe em cada
       botão. */
    function applyTools(type) {
        var root = document.documentElement;
        if (!root) { return; }
        var h = hiddenTools(type);
        if (h.length) { root.setAttribute('data-cx-hide', h.join(' ')); }
        else { root.removeAttribute('data-cx-hide'); }
    }
    (function injectToolsCss() {
        if (!document.head || document.getElementById('cx-tools-css')) { return; }
        var st = document.createElement('style');
        st.id = 'cx-tools-css';
        st.textContent = Object.keys(TOOLS_BY_TYPE).map(function (b) {
            return 'html[data-cx-hide~="' + b + '"] [data-mce-name="' + b + '"]{display:none!important;}';
        }).join('');
        document.head.appendChild(st);
    })();
    function watchType(editor) {
        var upd = function () { applyTools(currentType(editor)); };
        upd();
        var sel = typeSelect(editor);
        if (sel && !sel.__cxToolsWatch) {
            sel.__cxToolsWatch = true;
            sel.addEventListener('change', upd);
            if (window.jQuery) { window.jQuery(sel).on('change', upd); }
        }
    }
    var SIZE_BLOCKS = 'p,li,td,th,div,blockquote';

    /* Medidas: fonte única nos tokens do CSS. Valor padrão só se o CSS não
       tiver carregado (nunca deveria acontecer numa tela do plugin). */
    function sizes() {
        var css = window.getComputedStyle ? window.getComputedStyle(document.documentElement) : null;
        var read = function (name, def) {
            var v = css ? parseFloat(css.getPropertyValue(name)) : NaN;
            return isFinite(v) && v > 0 ? v : def;
        };
        return { sm: read('--cx-size-sm', 0.87), lg: read('--cx-size-lg', 1.2) };
    }

    /* Tamanhos: usados pelo editor e pelo PDF (codexplus.js). */
    function sizeCss() {
        var s = sizes();
        // E5: as cores vão junto (o PDF só chama sizeCss()).
        return '.cx-size-sm{font-size:' + s.sm + 'em;}'
            + '.cx-size-lg{font-size:' + s.lg + 'em;}' + colorCss() + tableCss()
            // PL1: planilha — números à direita, total em destaque (PDF e tela).
            + '.cx-sheet-table{border-collapse:collapse;width:100%;}'
            + '.cx-sheet-table td,.cx-sheet-table th{border:1px solid #d3d9e0;padding:6px 8px;}'
            + '.cx-sheet-table th{background-color:#f6f8fa;}'
            + '.cx-sheet-num{text-align:right;white-space:nowrap;}'
            + '.cx-sheet-total td{border-top:2px solid #5f6b7a;}'
            + '.cx-sheet-alt td{background-color:#e6f1fb;-webkit-print-color-adjust:exact;print-color-adjust:exact;}'
            // Q1: a planta de fundo guardada junto do quadro não aparece (só o PNG).
            + '.cx-board-bg,.cx-board img:not(:last-of-type){display:none!important;}.cx-board img{max-width:100%;height:auto;}'
            // Q3b: legenda do quadro, imagem própria logo abaixo dele.
            + '.cx-board-legend{display:block;margin:6px 0 12px;}.cx-board-legend img{max-width:100%;height:auto;}'
            + PH_CSS;
    }

    /* MO-2 (Claudio, 04/10/2026): marcador do modelo. Só texto, travado
       (contenteditable=false): um clique seleciona o marcador inteiro, e
       colar, arrastar, "Inserir imagem" ou Planta/Topologia o substituem.
       Classe por tipo; o texto padrão vem daqui e de Template::PLACEHOLDER_KINDS. */
    var PH_KINDS = [
        { key: 'imagem',    label: 'Imagem',    text: 'Imagem aqui',    tool: '' },
        { key: 'planta',    label: 'Planta',    text: 'Planta aqui',    tool: 'cxplant' },
        { key: 'topologia', label: 'Topologia', text: 'Topologia aqui', tool: 'cxtopology' },
        { key: 'calor',     label: 'Mapa de calor', text: 'Mapa de calor aqui', tool: 'cxheat' }
    ];
    var PH_CSS = '.cx-ph{display:inline-block;box-sizing:border-box;min-width:240px;max-width:100%;padding:28px 18px;margin:4px 0;'
        + 'border:2px dashed #9aa7b6;border-radius:6px;background-color:#f6f8fa;color:#5f6b7a;font-style:italic;text-align:center;'
        + '-webkit-print-color-adjust:exact;print-color-adjust:exact;}'
        + '.cx-ph-planta,.cx-ph-topologia,.cx-ph-calor{min-width:360px;padding:48px 18px;}';
    function placeholderHtml(kind, text) {
        var k = PH_KINDS.filter(function (x) { return x.key === kind; })[0] || PH_KINDS[0];
        var t = String(text || '').replace(/[\r\n]+/g, ' ').trim() || k.text;
        var esc = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        return '<span class="cx-ph cx-ph-' + k.key + '" contenteditable="false">' + esc + '</span>';
    }
    /* Marcador selecionado agora (ou null), guardado para a próxima inserção. */
    function rememberPh(editor) {
        var n = editor.selection.getNode();
        editor.__cxPhTarget = (n && editor.dom.getParent(n, 'span.cx-ph')) || null;
    }
    function insertPlaceholder(editor, kind) {
        var k = PH_KINDS.filter(function (x) { return x.key === kind; })[0] || PH_KINDS[0];
        editor.windowManager.open({
            title: 'Marcador: ' + k.label,
            body: { type: 'panel', items: [
                { type: 'input', name: 'text', label: 'Texto do marcador (o que vai neste lugar)' }
            ] },
            initialData: { text: k.text },
            buttons: [
                { type: 'cancel', text: 'Cancelar' },
                { type: 'submit', text: 'Inserir', primary: true }
            ],
            onSubmit: function (api) {
                var t = api.getData().text;
                api.close();
                editor.focus();
                editor.insertContent(placeholderHtml(k.key, t) + '&nbsp;');
            }
        });
    }

    /* CSS dentro do editor (iframe do TinyMCE, que não carrega o CSS do
       plugin): títulos na mesma proporção da leitura e as notas. O PDF tem
       títulos e notas próprios em PRINT_CSS e só pega sizeCss(). */
    function contentCss() {
        return sizeCss()
            + 'h2,h3,h4{color:#1f5fbf;}'
            // Etapa 5b: referência a outro documento (não editável por dentro).
            + 'a.cx-docref{background:#e4edfa;color:#174a94;padding:1px 6px;border-radius:6px;text-decoration:none;white-space:nowrap;}'
            + 'h2{font-size:1.33em;}h3{font-size:1.13em;}h4{font-size:1em;}'
            + '.cx-callout{margin:0 0 12px;padding:9px 12px;border-radius:0;'
            + 'border-left:4px solid;}'
            + '.cx-callout-attention{background:#fcebeb;border-color:#e24b4a;}'
            + '.cx-callout-tip{background:#eaf3de;border-color:#639922;}'
            + '.cx-callout-note{background:#e6f1fb;border-color:#378add;}'
            // Tabela como na leitura e no PDF (E3): largura total e bordas.
            + 'table{border-collapse:collapse;width:100%;}'
            + 'td,th{border:1px solid #d3d9e0;padding:6px 8px;}th{background:#f6f8fa;}'
            // PL1: a planilha é um bloco só; 3c-1: células editáveis no lugar,
            // botão Parâmetros abre a janela (codexplus-sheet.js).
            + '.cx-sheet{outline:1px dashed #85b7eb;outline-offset:3px;margin:0 0 12px;}'
            + '.cx-sheet table{margin:0;}'
            + '.cx-board{display:inline-block;outline:1px dashed #85b7eb;outline-offset:3px;cursor:pointer;}'
            + '.cx-board-legend{display:inline-block;outline:1px dotted #b4c7dc;outline-offset:3px;cursor:pointer;}';
    }

    function hasClass(el, c) { return (' ' + (el.className || '') + ' ').indexOf(' ' + c + ' ') !== -1; }
    function dropClasses(el, list) {
        list.forEach(function (c) { el.classList.remove(c); });
        if (!el.className) { el.removeAttribute('class'); }
    }

    function selectedBlocks(editor, selector) {
        var blocks = (editor.selection.getSelectedBlocks() || []).slice();
        // Seleção com o mouse costuma começar no FIM da linha de cima (ou
        // terminar no início da de baixo): esse bloco só encostado não entra,
        // senão o título de cima muda junto (Claudio, 26/09/2026).
        var rng = editor.selection.getRng();
        if (rng && !rng.collapsed && blocks.length > 1) {
            var doc = editor.getDoc();
            var first = blocks[0], last = blocks[blocks.length - 1];
            var r1 = doc.createRange();
            r1.setStart(rng.startContainer, rng.startOffset);
            r1.setEnd(first, first.childNodes.length);
            if (!r1.toString().replace(/\u00a0/g, ' ').trim()) { blocks.shift(); }
            if (blocks.length > 1) {
                var r2 = doc.createRange();
                r2.setStart(last, 0);
                r2.setEnd(rng.endContainer, rng.endOffset);
                if (!r2.toString().replace(/\u00a0/g, ' ').trim()) { blocks.pop(); }
            }
        }
        var out = [];
        blocks.forEach(function (b) {
            var el = b.matches && b.matches(selector) ? b : editor.dom.getParent(b, selector);
            if (el && el !== editor.getBody() && out.indexOf(el) === -1) { out.push(el); }
        });
        return out;
    }

    function styleOf(el) {
        if (!el) { return 'p'; }
        var tag = el.nodeName.toLowerCase();
        if (hasClass(el, 'cx-callout-note')) { return 'note'; }
        if (hasClass(el, 'cx-callout-attention')) { return 'attn'; }
        for (var i = 0; i < STYLES.length; i++) {
            if (STYLES[i].tag === tag && !STYLES[i].cls) { return STYLES[i].key; }
        }
        return 'p';
    }

    function sizeOf(el) {
        if (!el) { return 'md'; }
        if (hasClass(el, 'cx-size-sm')) { return 'sm'; }
        if (hasClass(el, 'cx-size-lg')) { return 'lg'; }
        return 'md';
    }

    function change(editor, fn) {
        editor.undoManager.transact(function () {
            editor.focus();
            var bm = editor.selection.getBookmark(2, true);
            fn();
            editor.selection.moveToBookmark(bm);
        });
        editor.nodeChanged();
    }

    function applyStyle(editor, key) {
        var st = STYLES.filter(function (s) { return s.key === key; })[0];
        if (!st) { return; }
        change(editor, function () {
            selectedBlocks(editor, TEXT_BLOCKS).forEach(function (el) {
                var target = el;
                if (el.nodeName.toLowerCase() !== st.tag) {
                    target = editor.dom.rename(el, st.tag);
                }
                dropClasses(target, STYLE_CLASSES);
                if (st.cls) { st.cls.split(' ').forEach(function (c) { target.classList.add(c); }); }
                // Título não leva tamanho: o próprio estilo já define.
                if (st.tag !== 'p') {
                    dropClasses(target, SIZE_CLASSES);
                    editor.dom.select('span.cx-size-sm,span.cx-size-lg', target)
                        .forEach(function (sp) { editor.dom.remove(sp, true); });
                }
            });
        });
    }

    /* Tamanho só da seleção (formato em linha). Tira os dois tamanhos do
       trecho e aplica o escolhido; A só tira. Classe de tamanho que tenha
       ficado no BLOCO (versão 1 do E1) também sai, para o trecho não herdar. */
    function applySize(editor, key) {
        var sz = SIZES.filter(function (s) { return s.key === key; })[0];
        if (!sz) { return; }
        editor.undoManager.transact(function () {
            editor.focus();
            editor.formatter.remove('cxsize_sm');
            editor.formatter.remove('cxsize_lg');
            if (key === 'md') {
                selectedBlocks(editor, SIZE_BLOCKS).forEach(function (el) { dropClasses(el, SIZE_CLASSES); });
            } else {
                editor.formatter.apply('cxsize_' + key);
            }
        });
        editor.nodeChanged();
    }

    function sizeAtCursor(editor) {
        if (editor.formatter.match('cxsize_sm')) { return 'sm'; }
        if (editor.formatter.match('cxsize_lg')) { return 'lg'; }
        return sizeOf(currentBlock(editor, SIZE_BLOCKS));
    }

    function currentBlock(editor, selector) {
        var n = editor.selection.getNode();
        return editor.dom.getParent(n, selector);
    }


    /* ---------------------------------------------------------------- */
    /* Importar .docx e .md (bloco E2)                                   */
    /* ---------------------------------------------------------------- */

    // Pasta pública do plugin, deduzida do próprio script (achado 3: sem
    // Plugin::getWebDir). Ex.: /glpi/plugins/codexplus
    var BASE = (function () {
        var sc = document.currentScript;
        return sc && sc.src ? sc.src.replace(/\/js\/codexplus-editor\.js.*$/, '') : '';
    })();
    var LIBS = {
        mammoth: '/lib/mammoth/mammoth.browser.min.js',
        marked:  '/lib/marked/marked.umd.js'
    };
    var loading = {};

    function loadLib(name) {
        if (window[name]) { return Promise.resolve(window[name]); }
        if (!loading[name]) {
            loading[name] = new Promise(function (ok, fail) {
                var el = document.createElement('script');
                el.src = BASE + LIBS[name];
                el.onload = function () { window[name] ? ok(window[name]) : fail(new Error(name)); };
                el.onerror = function () { delete loading[name]; fail(new Error(name)); };
                document.head.appendChild(el);
            });
        }
        return loading[name];
    }

    /* Corpo em branco = sem texto e sem imagem, tabela ou linha. */
    function isBlank(editor) {
        var body = editor.getBody();
        if (!body) { return false; }
        if (body.querySelector('img,table,hr,iframe,video')) { return false; }
        return (body.textContent || '').replace(/\u00a0|\ufeff/g, '').trim() === '';
    }

    /* HTML do arquivo -> padrão do Codex+: títulos deslocados um nível
       (o h1 é o título do documento), âncoras vazias do Word fora. Fonte,
       tamanho e cor saem pelo invalid_styles do editor. */
    function normalize(html) {
        var box = document.createElement('div');
        box.innerHTML = html;
        var heads = Array.prototype.slice.call(box.querySelectorAll('h1,h2,h3,h4,h5,h6'));
        heads.forEach(function (h) {
            var n = parseInt(h.nodeName.substring(1), 10);
            var tag = n === 1 ? 'h2' : (n === 2 ? 'h3' : 'h4');
            var nh = document.createElement(tag);
            while (h.firstChild) { nh.appendChild(h.firstChild); }
            h.parentNode.replaceChild(nh, h);
        });
        Array.prototype.slice.call(box.querySelectorAll('a[id]:not([href])')).forEach(function (a) {
            if (!(a.textContent || '').trim()) { a.parentNode.removeChild(a); }
        });
        return box.innerHTML;
    }

    var DOCX_STYLES = [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh"
    ];

    function convert(file) {
        var name = (file.name || '').toLowerCase();
        if (/\.docx$/.test(name)) {
            return loadLib('mammoth').then(function (m) {
                return file.arrayBuffer().then(function (buf) {
                    return m.convertToHtml({ arrayBuffer: buf }, { styleMap: DOCX_STYLES });
                });
            }).then(function (r) { return r.value; });
        }
        if (/\.(md|markdown)$/.test(name)) {
            return loadLib('marked').then(function (mk) {
                return file.text().then(function (txt) { return mk.parse(txt); });
            });
        }
        return Promise.reject(new Error('tipo'));
    }

    function notify(editor, text, type) {
        if (editor.notificationManager) {
            editor.notificationManager.open({ text: text, type: type || 'info', timeout: type === 'error' ? 0 : 4000 });
        } else {
            window.alert(text);
        }
    }

    function importFile(editor, file) {
        if (!isBlank(editor)) {
            notify(editor, 'A importação só vale com o corpo em branco. Para trazer um trecho, copie e cole.', 'error');
            return Promise.resolve(false);
        }
        return convert(file).then(function (html) {
            html = normalize(html);
            if (!html.replace(/<[^>]*>/g, '').trim() && !/<img/i.test(html)) {
                notify(editor, 'O arquivo não tem conteúdo para importar.', 'error');
                return false;
            }
            if (typeof window.setRichTextEditorContent === 'function') {
                window.setRichTextEditorContent(editor.id, html);
            } else {
                editor.setContent('');
                editor.execCommand('mceInsertClipboardContent', false, { html: html, internal: true });
            }
            editor.nodeChanged();
            notify(editor, 'Arquivo importado. As imagens são gravadas ao Salvar.', 'success');
            return true;
        }, function (err) {
            notify(editor, err && err.message === 'tipo'
                ? 'Formato não aceito. Use .docx (Word) ou .md (Markdown).'
                : 'Não foi possível ler o arquivo. Se for .doc antigo, salve como .docx no Word.', 'error');
            return false;
        });
    }

    function pickFile(editor) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.docx,.md,.markdown';
        input.style.display = 'none';
        input.addEventListener('change', function () {
            var f = input.files && input.files[0];
            input.parentNode && input.parentNode.removeChild(input);
            if (f) { importFile(editor, f); }
        });
        document.body.appendChild(input);
        input.click();
    }

    function register(editor) {
        // Linha nova criada a partir de um título nasce Parágrafo, mesmo quando
        // o TinyMCE repetiria o título (Enter no meio/fim com quebra dentro).
        editor.on('NewBlock', function (e) {
            var nb = e && e.newBlock;
            if (!nb || !/^H[1-6]$/.test(nb.nodeName)) { return; }
            if ((nb.textContent || '').replace(/\u00a0/g, '').trim() !== '') { return; }
            var p = editor.dom.rename(nb, 'p');
            editor.selection.setCursorLocation(p, 0);
        });

        var ui = editor.ui.registry;

        // T2: esconde Planilha / Planta / Topologia conforme o tipo.
        watchType(editor);

        // Q3b: legenda sem quadro antes dela (quadro apagado ou movido) não
        // vai para o gravado. O PreProcess recebe uma CÓPIA do corpo: o que
        // está na tela não muda; some ao salvar e reabrir.
        editor.on('PreProcess', function (e) {
            if (!e.node || !e.node.querySelectorAll || !window.CodexplusBoard) { return; }
            var root = e.node.nodeName === 'BODY' ? e.node : e.node.ownerDocument.body;
            Array.prototype.slice.call(e.node.querySelectorAll('span.cx-board-legend')).forEach(function (lg) {
                if (window.CodexplusBoard._boardOfLegend(lg, root)) { return; }
                var p = lg.parentNode;
                p.removeChild(lg);
                if (p.nodeName === 'P' && !p.querySelector('img,span') && !(p.textContent || '').replace(/[\s\u200b\u00a0]/g, '') && p.parentNode) {
                    p.parentNode.removeChild(p);
                }
            });
        });

        // PL-1: invólucro da anotação só com a imagem dele (achado 173). No
        // gravado (cópia do PreProcess) e na tela, ao abrir e a cada mudança.
        editor.on('PreProcess', function (e) {
            if (window.CodexplusAnnotate && e.node) { window.CodexplusAnnotate.tidyAll(e.node); }
        });
        editor.on('SetContent NodeChange', function () {
            if (window.CodexplusAnnotate) { window.CodexplusAnnotate.tidy(editor); }
        });

        editor.on('PreInit', function () {
            editor.formatter.register('cxsize_sm', { inline: 'span', classes: 'cx-size-sm' });
            editor.formatter.register('cxsize_lg', { inline: 'span', classes: 'cx-size-lg' });
            ['fg', 'bg', 'bgOld'].forEach(function (k) {
                var pre = k === 'bgOld' ? 'bg' : k;
                PALETTE[k].forEach(function (c) {
                    editor.formatter.register('cx' + pre + '_' + c.key, { inline: 'span', classes: 'cx-' + pre + '-' + c.key });
                });
            });
        });

        // E5: cor do texto e realce, só da paleta. Trocar tira a outra antes
        // (nunca span de cor dentro de span de cor).
        var applyColor = function (k, key) {
            editor.undoManager.transact(function () {
                editor.focus();
                PALETTE[k].concat(k === 'bg' ? PALETTE.bgOld : []).forEach(function (c) { editor.formatter.remove('cx' + k + '_' + c.key); });
                if (key) { editor.formatter.apply('cx' + k + '_' + key); }
            });
            editor.nodeChanged();
        };
        ['fg', 'bg'].forEach(function (k) {
            PALETTE[k].forEach(function (c) {
                ui.addIcon('cx-sw-' + k + '-' + c.key, '<svg width="24" height="24"><rect x="4" y="4" width="16" height="16" rx="3" fill="' + c.hex + '" stroke="#8a94a3" stroke-width="1"/></svg>');
            });
        });
        [['fg', 'cxcolor', 'text-color', 'Cor do texto', 'Cor padrão'], ['bg', 'cxmark', 'highlight-bg-color', 'Realce do texto', 'Sem realce']].forEach(function (d) {
            ui.addMenuButton(d[1], {
                icon: d[2],
                tooltip: d[3],
                fetch: function (cb) {
                    cb(PALETTE[d[0]].map(function (c) {
                        return {
                            type: 'togglemenuitem',
                            text: c.label,
                            icon: 'cx-sw-' + d[0] + '-' + c.key,
                            active: editor.formatter.match('cx' + d[0] + '_' + c.key),
                            onAction: function () { applyColor(d[0], c.key); }
                        };
                    }).concat([{ type: 'menuitem', text: d[4], onAction: function () { applyColor(d[0], ''); } }]));
                }
            });
        });

        ui.addMenuButton('cxstyles', {
            text: 'Parágrafo',
            tooltip: 'Estilo',
            fetch: function (cb) {
                var cur = styleOf(currentBlock(editor, TEXT_BLOCKS));
                cb(STYLES.map(function (s) {
                    return {
                        type: 'togglemenuitem',
                        text: s.label,
                        active: s.key === cur,
                        onAction: function () { applyStyle(editor, s.key); }
                    };
                }));
            },
            onSetup: function (api) {
                var upd = function () {
                    var cur = styleOf(currentBlock(editor, TEXT_BLOCKS));
                    var st = STYLES.filter(function (s) { return s.key === cur; })[0];
                    if (st && typeof api.setText === 'function') { api.setText(st.label); }
                };
                editor.on('NodeChange', upd);
                return function () { editor.off('NodeChange', upd); };
            }
        });

        // E4: anotar a imagem selecionada (codexplus-annotate.js).
        var isImg = function () {
            var n = editor.selection && editor.selection.getNode();
            return !!(n && n.nodeName === 'IMG');
        };
        var annotate = function () {
            if (window.CodexplusAnnotate) { window.CodexplusAnnotate.open(editor, editor.selection.getNode()); }
        };
        ui.addButton('cxannotate', {
            text: 'Anotar',
            tooltip: 'Anotar a imagem selecionada (setas, formas, passos, ocultar, recortar)',
            onAction: annotate,
            onSetup: function (api) {
                var upd = function () { api.setEnabled(isImg()); };
                editor.on('NodeChange', upd);
                upd();
                return function () { editor.off('NodeChange', upd); };
            }
        });
        ui.addContextToolbar('cximagectx', {
            predicate: function (node) { return node.nodeName === 'IMG'; },
            items: 'cxannotate',
            position: 'node',
            scope: 'node'
        });

        // PL1: planilha no corpo (codexplus-sheet.js). 3c-1: conteúdo editado
        // direto no documento; colunas e fórmulas pelo botão Parâmetros.
        if (window.CodexplusSheet && window.CodexplusSheet.attach) { window.CodexplusSheet.attach(editor); }
        // Salto da página ao clicar (Claudio, 04/10/2026): quando o editor
        // recebe o foco de volta (clicou fora e depois numa planilha, planta,
        // topologia ou texto), o TinyMCE 7.9, no Chrome e no Safari, chama
        // iframe.scrollIntoView({block: 'center'}) se o TOPO do iframe está
        // fora da tela. Com o autoresize o iframe tem a altura do documento,
        // então o topo quase sempre está fora: a página pulava para o meio
        // do documento e o clique caía em outro lugar. Aqui o iframe só é
        // trazido para a tela se estiver INTEIRO fora dela.
        editor.on('init', function () {
            var fr = editor.iframeElement;
            if (!fr || fr.__cxNoJump) { return; }
            fr.__cxNoJump = true;
            var orig = fr.scrollIntoView;
            fr.scrollIntoView = function () {
                var r = fr.getBoundingClientRect();
                if (r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight)) { return; }
                return orig.apply(fr, arguments);
            };
            // Segundo salto, nos blocos travados (planilha, planta, topologia):
            // com um deles selecionado, a seleção do navegador fica num
            // contêiner invisível (.mce-offscreen-selection) e o TinyMCE dá
            // foco ao corpo e a esse contêiner sem preventScroll — o navegador
            // rolava a página até ele (no fim do documento). O foco continua;
            // só não rola: quem clicou já está vendo o ponto.
            var W = editor.getWin();
            var P = W && W.HTMLElement && W.HTMLElement.prototype;
            if (P && !P.__cxNoJump) {
                P.__cxNoJump = true;
                var foco = P.focus;
                P.focus = function (opt) {
                    if (this === editor.getBody() || (this.classList && this.classList.contains('mce-offscreen-selection'))) {
                        opt = Object.assign({}, opt || {}, { preventScroll: true });
                    }
                    return foco.call(this, opt);
                };
            }
        });
        ui.addButton('cxsheet', {
            icon: 'table-insert-column-after',
            text: 'Planilha',
            tooltip: 'Inserir planilha (Qtd, item, valores e total). Edite as células direto no documento; colunas e fórmulas em Parâmetros.',
            onAction: function () {
                if (!toolAllowed('cxsheet', currentType(editor))) { return; }
                if (window.CodexplusSheet) { window.CodexplusSheet.open(editor, null); }
            }
        });
        // 3c-2: Resumo do investimento (total geral das planilhas).
        ui.addButton('cxsum', {
            icon: 'chart',
            text: 'Resumo',
            tooltip: 'Inserir o Resumo do investimento logo depois da última planilha: uma linha por planilha (nome = título acima dela) e o total geral. Atualiza sozinho.',
            onAction: function () {
                if (!toolAllowed('cxsum', currentType(editor))) { return; }
                if (window.CodexplusSheet && window.CodexplusSheet.insertSummary) { window.CodexplusSheet.insertSummary(editor); }
            }
        });
        editor.on('dblclick', function (e) {
            // 3c-1: duplo clique na planilha não abre mais a janela (seleciona
            // palavra na célula); a janela abre pelo botão Parâmetros.
            // Q1: quadro (planta ou topologia) — duplo clique abre o editor dele.
            var b = e.target && editor.dom.getParent(e.target, 'span.cx-board');
            // Q3b: duplo clique na legenda abre o quadro dela.
            var lg = !b && e.target && editor.dom.getParent(e.target, 'span.cx-board-legend');
            if (lg && window.CodexplusBoard) { b = window.CodexplusBoard._boardOfLegend(lg, editor.getBody()); }
            if (b && window.CodexplusBoard) {
                e.preventDefault();
                window.CodexplusBoard.open(editor, b);
            }
        });
        // Q8-4a: Mapa de calor Wi-Fi, quadro próprio (separado da Planta).
        ui.addButton('cxheat', {
            icon: 'highlight-bg-color',
            text: 'Mapa de calor',
            tooltip: 'Mapa de calor Wi-Fi: a cobertura do sinal para o cliente, separado da Planta. Duplo clique num quadro edita.',
            onAction: function () {
                if (!toolAllowed('cxheat', currentType(editor))) { return; }
                rememberPh(editor);
                if (window.CodexplusBoard) { window.CodexplusBoard.open(editor, null, 'calor'); }
            }
        });
        ['topologia', 'planta'].forEach(function (m) {
            ui.addButton(m === 'planta' ? 'cxplant' : 'cxtopology', {
                icon: m === 'planta' ? 'home' : 'code-sample',
                text: m === 'planta' ? 'Planta' : 'Topologia',
                tooltip: m === 'planta'
                    ? 'Planta de execução: a planta do cliente com os equipamentos. Duplo clique num quadro edita.'
                    : 'Topologia de rede: equipamentos, zonas e VLANs. Duplo clique num quadro edita.',
                onAction: function () {
                    if (!toolAllowed(m === 'planta' ? 'cxplant' : 'cxtopology', currentType(editor))) { return; }
                    rememberPh(editor);
                    if (window.CodexplusBoard) { window.CodexplusBoard.open(editor, null, m); }
                }
            });
        });

        // MO-2: com um marcador selecionado (clique), o que entrar — colar,
        // arrastar, "Inserir imagem", Planta, Topologia — ocupa o lugar dele.
        // O marcador sai antes e o cursor fica onde ele estava: a troca direta
        // da seleção de um nó travado (contenteditable=false) comia letras do
        // parágrafo seguinte no TinyMCE 7.9 do GLPI 11.0.6 (harness do MO-2).
        // Planta, Topologia e "Inserir imagem" abrem janela fora do editor e a
        // seleção do marcador se perde no caminho: o botão guarda o marcador
        // (rememberPh) e ele vale para a próxima inserção. Clique ou tecla no
        // editor esquecem (janela cancelada).
        editor.on('click keydown', function () { editor.__cxPhTarget = null; });
        editor.on('BeforeExecCommand', function (e) {
            var c = String(e.command || '').toLowerCase();
            if (c !== 'mceinsertcontent' && c !== 'mceinsertclipboardcontent' && c !== 'mceinsertrawhtml') { return; }
            var n = editor.selection.getNode();
            var ph = n && editor.dom.getParent(n, 'span.cx-ph');
            if (!ph && editor.__cxPhTarget) { ph = editor.__cxPhTarget; }
            editor.__cxPhTarget = null;
            if (!ph || !editor.getBody().contains(ph)) { return; }
            var parent = ph.parentNode;
            var idx = Array.prototype.indexOf.call(parent.childNodes, ph);
            parent.removeChild(ph);
            editor.selection.setCursorLocation(parent, Math.min(idx, parent.childNodes.length));
        });

        // MO-2: marcador (só na tela Modelos). Planta e Topologia seguem a
        // tabela de ferramentas por tipo (T2), como os botões do documento.
        ui.addMenuButton('cxph', {
            icon: 'image',
            text: 'Marcador',
            tooltip: 'Marcar o lugar de uma imagem, planta ou topologia. Quem usar o modelo clica no marcador e cola a imagem (ou insere o quadro) no lugar dele.',
            fetch: function (cb) {
                var type = currentType(editor);
                cb(PH_KINDS.filter(function (k) { return !k.tool || toolAllowed(k.tool, type); }).map(function (k) {
                    return { type: 'menuitem', text: k.label + ' aqui', onAction: function () { insertPlaceholder(editor, k.key); } };
                }));
            }
        });

        // E4-3: imagem só por arquivo (ou colar/arrastar), pelo mesmo envio das
        // coladas. A janela nativa "Inserir/editar imagem" saiu: ela prendia o
        // Salvar (relato de Claudio, 24/09/2026) e aceitava endereço externo,
        // que não sai no PDF nem no acesso sem login.
        ui.addButton('cxinsertimage', {
            icon: 'image',
            tooltip: 'Inserir imagem (ou cole / arraste direto no texto)',
            onAction: function () {
                rememberPh(editor);
                var input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/png,image/jpeg,image/gif,image/webp';
                input.style.display = 'none';
                input.addEventListener('change', function () {
                    var f = input.files && input.files[0];
                    input.remove();
                    if (!f) { return; }
                    var rd = new FileReader();
                    rd.onload = function () {
                        editor.focus();
                        editor.execCommand('mceInsertClipboardContent', false,
                            { html: '<img src="' + rd.result + '">', internal: true });
                    };
                    rd.readAsDataURL(f);
                });
                document.body.appendChild(input);
                input.click();
            }
        });

        // Etapa 5b (Claudio, 04/10/2026): "segue POP de referência …" — insere
        // um link para outro documento do Codex+. Código e título se
        // atualizam sozinhos na leitura; ao salvar, o citado vira vinculado.
        // PL-8b: Estilo da tabela — os 5 prontos, Personalizar… e Sem estilo.
        var curTable = function () {
            var n = editor.selection && editor.selection.getNode();
            return n ? editor.dom.getParent(n, 'table') : null;
        };
        var applyLook = function (t, look) {
            editor.undoManager.transact(function () {
                Array.prototype.slice.call(t.classList).forEach(function (c) {
                    if (c === 'cx-tbl' || c.indexOf('cx-tbl-') === 0) { t.classList.remove(c); }
                });
                t.style.removeProperty('--cx-tbl-c');
                t.style.removeProperty('--cx-tbl-t');
                t.style.removeProperty('--cx-tbl-b');
                if (look) {
                    t.classList.add('cx-tbl', 'cx-tbl-head-' + look.head, 'cx-tbl-b-' + look.borders);
                    if (look.stripes) { t.classList.add('cx-tbl-stripes'); }
                    var c = String(look.color || TBL_DEFAULT_COLOR).toLowerCase();
                    if (c !== TBL_DEFAULT_COLOR) {
                        t.style.setProperty('--cx-tbl-c', c);
                        t.style.setProperty('--cx-tbl-t', hexMix(c, 0.14));
                        t.style.setProperty('--cx-tbl-b', hexMix(c, 0.35));
                    }
                }
                editor.dom.setAttrib(t, 'data-mce-style', t.getAttribute('style') || null);
                if (!t.getAttribute('style')) { t.removeAttribute('style'); }
                if (!t.getAttribute('class')) { t.removeAttribute('class'); }
            });
            editor.nodeChanged();
        };
        var customize = function () {
            var t = curTable();
            if (!t) { return; }
            var cur = tableLook(t);
            editor.windowManager.open({
                title: 'Personalizar estilo da tabela',
                body: { type: 'panel', items: [
                    { type: 'colorinput', name: 'color', label: 'Cor do cabeçalho (paleta ou cor livre)' },
                    { type: 'listbox', name: 'head', label: 'Cabeçalho', items: TBL_HEADS.map(function (h) { return { value: h[0], text: h[1] }; }) },
                    { type: 'listbox', name: 'borders', label: 'Bordas', items: TBL_BORDERS.map(function (h) { return { value: h[0], text: h[1] }; }) },
                    { type: 'checkbox', name: 'stripes', label: 'Linhas alternadas' }
                ] },
                initialData: { color: cur.color, head: cur.head, borders: cur.borders, stripes: cur.stripes },
                buttons: [{ type: 'cancel', text: 'Cancelar' }, { type: 'submit', text: 'Aplicar', primary: true }],
                onSubmit: function (api) {
                    var d = api.getData();
                    var c = /^#?[0-9a-f]{6}$/i.test(String(d.color || '').trim()) ? '#' + String(d.color).trim().replace('#', '') : TBL_DEFAULT_COLOR;
                    applyLook(t, { head: d.head, borders: d.borders, stripes: !!d.stripes, color: c });
                    api.close();
                }
            });
        };
        var styleItems = function () {
            var t = curTable();
            var cur = t ? tableLook(t) : null;
            return TABLE_STYLES.map(function (st) {
                return {
                    type: 'togglemenuitem', text: st.label,
                    active: !!(cur && cur.styled && cur.head === st.head && cur.borders === st.borders && cur.stripes === st.stripes),
                    onAction: function () {
                        var tt = curTable();
                        if (tt) { applyLook(tt, { head: st.head, borders: st.borders, stripes: st.stripes, color: tableLook(tt).color }); }
                    }
                };
            }).concat([
                { type: 'separator' },
                { type: 'menuitem', text: 'Personalizar…', onAction: customize },
                { type: 'menuitem', text: 'Sem estilo', onAction: function () { var tt = curTable(); if (tt) { applyLook(tt, null); } } }
            ]);
        };
        ui.addMenuButton('cxtblstyle', {
            text: 'Estilo',
            tooltip: 'Estilo da tabela',
            fetch: function (cb) { cb(styleItems()); }
        });
        ui.addNestedMenuItem('cxtblstyle', {
            text: 'Estilo da tabela',
            getSubmenuItems: function () { return styleItems(); }
        });
        ui.addContextMenu('cxtblstyle', {
            update: function (el) { return editor.dom.getParent(el, 'table') ? 'cxtblstyle' : ''; }
        });

        ui.addButton('cxdocref', {
            text: 'Referência',
            tooltip: 'Citar outro documento do Codex+ (POP, Manual, Diagrama)',
            onAction: function () {
                if (window.CodexplusDocref) { window.CodexplusDocref.open(editor); }
            },
            onSetup: function (api) {
                api.setEnabled(!!document.querySelector('[data-cx-docref-url]'));
            }
        });

        ui.addButton('cximport', {
            text: 'Importar',
            tooltip: 'Importar .docx ou .md (só com o corpo em branco)',
            onAction: function () { pickFile(editor); },
            onSetup: function (api) {
                var upd = function () { api.setEnabled(isBlank(editor)); };
                editor.on('NodeChange SetContent input keyup Change', upd);
                upd();
                return function () { editor.off('NodeChange SetContent input keyup Change', upd); };
            }
        });

        SIZES.forEach(function (sz) {
            ui.addToggleButton('cxsize' + sz.key, {
                text: sz.label,
                tooltip: sz.tip,
                onAction: function () { applySize(editor, sz.key); },
                onSetup: function (api) {
                    var upd = function () {
                        api.setActive(sizeAtCursor(editor) === sz.key);
                    };
                    editor.on('NodeChange', upd);
                    return function () { editor.off('NodeChange', upd); };
                }
            });
        });
    }

    /* PL-8a (Claudio, 20/10/2026): a padronização do E1 tira fonte, tamanho,
       cor e fundo colados à mão — exceto DENTRO DA TABELA (table, linha,
       célula, coluna), onde cor de fundo, cor do texto e bordas ficam, como
       no Word, inclusive em tabela colada do Word. O TinyMCE soma a lista
       de '*' com a de cada elemento: cor e fundo vão por elemento, fora da
       tabela. Texto dentro da célula (span, p) continua padronizado. */
    var NO_COLOR_TAGS = ['p', 'div', 'span', 'font', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol',
        'dl', 'dt', 'dd', 'a', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'ins', 'sub', 'sup',
        'small', 'big', 'mark', 'code', 'pre', 'kbd', 'samp', 'blockquote', 'q', 'cite', 'abbr', 'label',
        'section', 'article', 'header', 'footer', 'aside', 'nav', 'figure', 'figcaption', 'address', 'hr', 'img', 'caption'];
    function invalidStyles() {
        var o = { '*': 'font-family font-size' };
        NO_COLOR_TAGS.forEach(function (t) { o[t] = 'color background-color background'; });
        return o;
    }
    /* Tabela colada do Word: a cor do texto vem num span/p dentro da
       célula (que vão perder a cor); sobe para a própria célula antes. */
    function liftCellColors(root) {
        Array.prototype.forEach.call(root.querySelectorAll ? root.querySelectorAll('td,th') : [], function (td) {
            if (td.style && td.style.color) { return; }
            var inner = td.querySelector('[style*="color"]');
            var c = inner && inner.style ? inner.style.color : '';
            if (c) { td.style.color = c; }
        });
    }
    // PL-8a: o que fica do estilo colado — só em tabela, linha e célula.
    var TABLE_TAGS = /^(TABLE|THEAD|TBODY|TFOOT|TR|TD|TH|COL|COLGROUP|CAPTION)$/;
    var PASTE_TABLE_PROPS = ['color', 'background-color', 'text-align', 'vertical-align', 'width', 'height'];
    ['top', 'right', 'bottom', 'left'].forEach(function (side) {
        ['style', 'width', 'color'].forEach(function (k) { PASTE_TABLE_PROPS.push('border-' + side + '-' + k); });
    });
    /* Limpeza do colar (como a E2: estilo colado não fica), exceto na
       tabela, onde ficam cor, fundo, bordas, alinhamento e tamanho; antes,
       a cor do texto da célula sobe para a célula. Documento inerte
       (DOMParser): nada do colado carrega nem executa aqui. */
    function cleanPaste(html) {
        var doc = new DOMParser().parseFromString('<body>' + String(html || '') + '</body>', 'text/html');
        var body = doc.body;
        liftCellColors(body);
        Array.prototype.forEach.call(body.querySelectorAll('[style]'), function (el) {
            if (!TABLE_TAGS.test(el.tagName)) { el.removeAttribute('style'); return; }
            var keep = [];
            PASTE_TABLE_PROPS.forEach(function (prop) {
                var v = el.style.getPropertyValue(prop);
                if (v && !/^(initial|inherit|unset|revert)$/.test(v)) { keep.push(prop + ': ' + v); }
            });
            if (keep.length) { el.setAttribute('style', keep.join('; ') + ';'); } else { el.removeAttribute('style'); }
        });
        return body.innerHTML;
    }
    /* PL-8b (Claudio, 20/10/2026): estilos de tabela — os 5 do mockup
       aprovado, cada um uma combinação de 3 escolhas que a pessoa pode
       personalizar: cabeçalho (escuro, claro, cinza, só linha), bordas
       (grade, horizontais, relatório, nenhuma) e linhas alternadas. A cor
       do cabeçalho fica na tabela: --cx-tbl-c (e o tom claro, --cx-tbl-t,
       calculado aqui, para o Word ler rgb). Formatação de célula (PL-8a)
       vence o estilo. */
    var TBL_DEFAULT_COLOR = '#1f2d4f';
    var TABLE_STYLES = [
        { key: 's1', label: '1 · Cabeçalho escuro', head: 'dark', borders: 'grid', stripes: false },
        { key: 's2', label: '2 · Cabeçalho escuro listrado', head: 'dark', borders: 'grid', stripes: true },
        { key: 's3', label: '3 · Grade simples', head: 'plain', borders: 'grid', stripes: false },
        { key: 's4', label: '4 · Listrada sem grade', head: 'line', borders: 'none', stripes: true },
        { key: 's5', label: '5 · Linhas horizontais', head: 'line', borders: 'report', stripes: false }
    ];
    var TBL_HEADS = [['dark', 'Escuro (texto branco)'], ['light', 'Claro (texto na cor)'], ['plain', 'Cinza'], ['line', 'Só um filete embaixo']];
    var TBL_BORDERS = [['grid', 'Grade'], ['rows', 'Só horizontais'], ['report', 'Relatório (filetes em cima e embaixo)'], ['none', 'Nenhuma']];
    function hexMix(hex, pct) {
        var h = String(hex || '').replace('#', '');
        if (!/^[0-9a-f]{6}$/i.test(h)) { h = TBL_DEFAULT_COLOR.slice(1); }
        var out = [0, 2, 4].map(function (i) {
            var c = parseInt(h.substr(i, 2), 16);
            return ('0' + Math.round(c * pct + 255 * (1 - pct)).toString(16)).slice(-2);
        });
        return '#' + out.join('');
    }
    function tableCss() {
        var T = 'table.cx-tbl';
        var head = function (mode) {
            // Acima das regras de borda (o filete do cabeçalho vence "sem bordas").
            var t = T + '.cx-tbl-head-' + mode + ':not([data-cx-x]):not([data-cx-y])';
            return t + '>thead>tr>*,' + t + ':not(:has(>thead))>tbody:first-of-type>tr:first-child>*';
        };
        // :not([data-cx-x]) só sobe a precedência: as guias tracejadas do
        // TinyMCE (.mce-item-table:not([border]) td) ganhavam no editor.
        var cells = function (cls) { return 'table.cx-tbl.' + cls + ':not([data-cx-x])>*>tr>*'; };
        var pr = '-webkit-print-color-adjust:exact;print-color-adjust:exact;';
        return T + '{--cx-tbl-c:' + TBL_DEFAULT_COLOR + ';--cx-tbl-t:' + hexMix(TBL_DEFAULT_COLOR, 0.14) + ';--cx-tbl-b:' + hexMix(TBL_DEFAULT_COLOR, 0.35) + ';border-collapse:collapse;width:100%;}'
            + cells('cx-tbl-b-grid') + '{border:1px solid #d1d5db;}'
            + cells('cx-tbl-b-rows') + '{border:0;border-bottom:1px solid #e5e7eb;}'
            + cells('cx-tbl-b-none') + '{border:0;}'
            + cells('cx-tbl-b-report') + '{border:0;border-bottom:1px solid #e5e7eb;}'
            // Filetes grossos nas células (1ª e última linha), não na tabela:
            // o Word só lê as bordas das células.
            + 'table.cx-tbl.cx-tbl-b-report:not([data-cx-x])>thead>tr:first-child>*,table.cx-tbl.cx-tbl-b-report:not(:has(>thead))>tbody:first-of-type>tr:first-child>*{border-top:2px solid #1f2937;}'
            + 'table.cx-tbl.cx-tbl-b-report:not([data-cx-x])>tbody:last-of-type>tr:last-child>*{border-bottom:2px solid #1f2937;}'
            + 'table.cx-tbl-stripes>tbody>tr:nth-child(even)>*{background-color:#f3f5f8;' + pr + '}'
            + head('dark') + '{background-color:var(--cx-tbl-c);color:#fff;font-weight:700;border-color:var(--cx-tbl-c);' + pr + '}'
            + head('light') + '{background-color:var(--cx-tbl-t);color:var(--cx-tbl-c);font-weight:700;border-color:var(--cx-tbl-b);' + pr + '}'
            + head('plain') + '{background-color:#f3f4f6;color:#1f2937;font-weight:700;' + pr + '}'
            + head('line') + '{background-color:transparent;font-weight:700;border-bottom:2px solid var(--cx-tbl-c);}';
    }
    // Lê da tabela as 4 escolhas atuais (para marcar o menu e o diálogo).
    function tableLook(t) {
        var has = function (c) { return t.classList.contains(c); };
        var pick = function (pairs, pre, dflt) {
            for (var i = 0; i < pairs.length; i++) { if (has(pre + pairs[i][0])) { return pairs[i][0]; } }
            return dflt;
        };
        var c = (t.style.getPropertyValue('--cx-tbl-c') || '').trim() || TBL_DEFAULT_COLOR;
        return { styled: has('cx-tbl'), head: pick(TBL_HEADS, 'cx-tbl-head-', 'dark'), borders: pick(TBL_BORDERS, 'cx-tbl-b-', 'grid'),
            stripes: has('cx-tbl-stripes'), color: c };
    }

    var TABLE_BORDERS = [
        { title: 'Sólida', value: 'solid' },
        { title: 'Pontilhada', value: 'dotted' },
        { title: 'Tracejada', value: 'dashed' },
        { title: 'Dupla', value: 'double' },
        { title: 'Nenhuma', value: 'none' }
    ];
    // Cores dos menus de cor da tabela: a paleta do Codex+ (texto/realce) +
    // azul-marinho, grafite, branco e os tons claros; "cor livre" no seletor.
    var TABLE_COLORS = [
        '1F2D4F', 'Azul-marinho', '1F5FBF', 'Azul', '2E7D32', 'Verde', 'C62828', 'Vermelho',
        'B45309', 'Laranja', '5F6B7A', 'Cinza', '374151', 'Grafite', 'FFFFFF', 'Branco',
        'E6ECF7', 'Azul claro', 'E3F1E4', 'Verde claro', 'FBE4E4', 'Vermelho claro', 'FCEBD7', 'Laranja claro',
        'F3F4F6', 'Cinza claro', 'D1D5DB', 'Cinza borda', '000000', 'Preto'
    ];

    /* PL-4 (Claudio, 19/10/2026): a barra do editor acompanha a rolagem.
       Desconta o que fica preso no topo da página (o cabeçalho do GLPI é
       sticky só em tela larga, e a altura muda com o layout do menu):
       desce pelo meio da tela enquanto o elemento ali for fixo ou grudado. */
    function topOffset() {
        try {
            var y = 0;
            for (var k = 0; k < 6; k++) {
                var el = document.elementFromPoint(Math.round(window.innerWidth / 2), y + 1);
                var hit = null;
                for (var a = el; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
                    var pos = window.getComputedStyle(a).position;
                    if (pos === 'fixed' || pos === 'sticky') { hit = a; break; }
                }
                if (!hit) { break; }
                var r = hit.getBoundingClientRect();
                if (r.top > y + 1 || r.bottom <= y) { break; }
                y = r.bottom;
            }
            return Math.max(0, Math.round(y));
        } catch (e) {
            return 0;
        }
    }

    function customize(cfg) {
        if (!cfg || cfg.__cxCustomized) { return cfg; }
        cfg.__cxCustomized = true;

        var layout = typeof cfg.toolbar === 'string' ? 'classic' : 'inline';
        var isTpl = String(cfg.selector || '').indexOf(TEMPLATE_EDITOR_ID) !== -1;
        if (layout === 'classic') {
            // Sem cor e tamanho livres (padronização, Claudio 22/09/2026).
            cfg.toolbar = 'cxstyles | cxsizesm cxsizemd cxsizelg | bold italic underline cxcolor cxmark'
                + ' | bullist numlist outdent indent | table cxsheet cxsum' + (isTpl ? ' cxph' : ' cxtopology cxplant cxheat') + ' link' + (isTpl ? '' : ' cxdocref cxinsertimage cxannotate') + ' | cximport | code fullscreen';
        } else if (typeof cfg.quickbars_selection_toolbar === 'string') {
            cfg.quickbars_selection_toolbar = 'bold italic cxcolor cxmark | cxstyles | cxsizesm cxsizemd cxsizelg';
            if (typeof cfg.quickbars_insert_toolbar === 'string') {
                cfg.quickbars_insert_toolbar += ' | cximport';
            }
        }
        // Texto colado ou importado não traz fonte, tamanho nem cor próprios
        // (cor incluída no E2, Claudio 22/09/2026).
        // PL-8a: no colar, passam só cor, fundo, bordas e alinhamento — e o
        // invalid_styles tira cor e fundo de tudo que não é tabela (texto
        // colado continua padronizado; tabela colada do Word fica colorida).
        // (O filtro do próprio TinyMCE remonta o estilo de qualquer elemento
        // com as regras do span e perdia o fundo da célula: fica desligado e
        // a limpeza é a nossa, em PastePreProcess — cleanPaste().)
        cfg.paste_webkit_styles = 'all';
        // Sem o plugin "image" do TinyMCE (janela Inserir/editar imagem). Colar e
        // arrastar imagem continuam: quem sobe é o glpi_upload_doc do GLPI.
        if (Array.isArray(cfg.plugins)) {
            cfg.plugins = cfg.plugins.filter(function (p) { return p !== 'image'; });
        }
        if (typeof cfg.quickbars_insert_toolbar === 'string') {
            cfg.quickbars_insert_toolbar = cfg.quickbars_insert_toolbar.replace(/\bquickimage\b/, 'cxinsertimage');
        }
        cfg.invalid_styles = invalidStyles();
        // PL-8a (Claudio, 20/10/2026): tabela como no Word — cor por célula,
        // linha ou coluna, borda pontilhada/tracejada/dupla e cor de borda,
        // pelas Propriedades da célula/linha/tabela; botão direito na tabela
        // com Linha, Coluna e Célula. Paleta do Codex+ + cor livre.
        cfg.table_advtab = true;
        cfg.table_cell_advtab = true;
        cfg.table_row_advtab = true;
        cfg.table_border_styles = TABLE_BORDERS;
        cfg.color_map = TABLE_COLORS;
        cfg.custom_colors = true;
        if (layout === 'classic') {
            cfg.contextmenu = 'table cxtblstyle';
        }
        // PL-8b: o Estilo na barra que aparece com o cursor na tabela.
        cfg.table_toolbar = 'cxtblstyle | tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol';
        if (layout === 'classic') {
            cfg.toolbar_sticky = true;
            cfg.toolbar_sticky_offset = topOffset();
        }
        cfg.content_style = (cfg.content_style || '') + contentCss();

        var original = cfg.setup;
        cfg.setup = function (editor) {
            if (typeof original === 'function') { original.call(this, editor); }
            // PL-4: mede de novo na hora de montar (a página já desenhada).
            if (layout === 'classic') {
                try { editor.options.set('toolbar_sticky_offset', topOffset()); } catch (e) { /* fica a medida da configuração */ }
            }
            register(editor);
            guardSyntheticClicks(editor);
            // PL-8a: limpeza do colar — tabela colada do Word fica colorida.
            editor.on('PastePreProcess', function (e) {
                if (e && typeof e.content === 'string' && !e.internal) { e.content = cleanPaste(e.content); }
            });
            // PL-7b: o texto do documento sempre em folhas A4.
            if (layout === 'classic' && !isTpl) { sheetMode(editor); }
        };
        return cfg;
    }

    /* PL-7b (Claudio, 20/10/2026): editor SEMPRE em folhas, como o Google
       Docs — a folha 1 termina, uma faixa cinza, a folha 2 começa. Onde a
       folha vira vem do motor do PDF (CodexplusPrint.planBreaks: mesmo HTML,
       mesmo planPages()), então a separação na tela cai onde o PDF vira a
       página — sempre entre blocos, nunca no meio de um parágrafo. O editor
       usa a largura útil da folha e a tipografia do PDF, para medir igual.
       Os desenhos (título da 1ª folha, faixas entre folhas) são
       data-mce-bogus="all": o TinyMCE não grava nada disso. */
    var SHEET_GAP = 28, SHEET_WAIT = 700;
    function sheetMode(editor) {
        var timer = null, geo = null;
        var P = function () { return window.CodexplusPrint; };
        function title() {
            var el = document.querySelector('input[name="name"]');
            return el && el.value ? el.value : 'Documento';
        }
        function bogus(doc, cls) {
            var d = doc.createElement('div');
            d.setAttribute('data-mce-bogus', 'all');
            d.setAttribute('contenteditable', 'false');
            d.className = cls;
            return d;
        }
        function clear(body) {
            Array.prototype.slice.call(body.querySelectorAll('.cx-sheet-gap,.cx-sheet-head')).forEach(function (el) {
                el.parentNode.removeChild(el);
            });
        }
        function blocks(body) {
            return Array.prototype.filter.call(body.children, function (el) {
                return el.getAttribute('data-mce-bogus') === null;
            });
        }
        function paint(plan) {
            var doc = editor.getDoc(), body = editor.getBody();
            if (!doc || !body) { return; }
            var mt = geo.marginTop + geo.headerH, mb = geo.marginBottom + geo.footerH;
            clear(body);
            var list = blocks(body);
            var head = bogus(doc, 'cx-sheet-head');
            head.style.height = plan.heading + 'px';
            head.textContent = title();
            body.insertBefore(head, body.firstChild);
            var last = plan.left.length - 1;
            plan.starts.forEach(function (idx, p) {
                if (idx === null || !list[idx]) { return; }
                var gap = bogus(doc, 'cx-sheet-gap');
                var fill = (plan.left[p] || 0) + mb;
                gap.style.height = (fill + SHEET_GAP + mt) + 'px';
                var band = doc.createElement('div');
                band.className = 'cx-sheet-band';
                band.style.top = fill + 'px';
                band.style.height = SHEET_GAP + 'px';
                band.textContent = 'Folha ' + (p + 2);
                gap.appendChild(band);
                body.insertBefore(gap, list[idx]);
            });
            body.style.setProperty('padding-bottom', ((plan.left[last] || 0) + mb) + 'px', 'important');
        }
        function measure() {
            timer = null;
            if (!P() || !P().planBreaks || !editor.getBody()) { return; }
            P().planBreaks(editor.getContent(), title()).then(paint, function (e) {
                if (window.console) { console.warn('Codex+ (folhas):', e); }
            });
        }
        function later() {
            if (timer) { clearTimeout(timer); }
            timer = setTimeout(measure, SHEET_WAIT);
        }
        editor.on('init', function () {
            if (!P() || !P().planBreaks) { return; }
            geo = P().geometry();
            var doc = editor.getDoc(), mx = geo.marginX;
            var mt = geo.marginTop + geo.headerH, mb = geo.marginBottom + geo.footerH;
            var st = doc.createElement('style');
            st.id = 'cx-sheet-css';
            st.textContent = P().typoCss()
                + 'html{background:#e9edf2;overflow-x:auto;}'
                // !important: o tema do GLPI deixa o body do editor transparente
                // e sem padding lateral, com seletores mais fortes.
                + 'html body.cx-sheets{box-sizing:content-box!important;width:' + geo.contentW + 'px!important;'
                + 'max-width:none!important;margin:16px auto!important;'
                + 'padding-top:' + mt + 'px!important;padding-left:' + mx + 'px!important;padding-right:' + mx + 'px!important;'
                + 'background:#fff!important;box-shadow:0 1px 4px rgba(0,0,0,.18);min-height:' + geo.contentH + 'px;}'
                + '.cx-sheet-head{color:#9aa3af;font:600 19pt/1.2 Arial,sans-serif;overflow:hidden;'
                + 'border-bottom:2px solid #e5e7eb;box-sizing:border-box;user-select:none;cursor:default;}'
                + '.cx-sheet-gap{position:relative;margin:0 -' + mx + 'px;user-select:none;cursor:default;}'
                + '.cx-sheet-band{position:absolute;left:0;right:0;background:#e9edf2;'
                + 'box-shadow:inset 0 4px 4px -3px rgba(0,0,0,.18),inset 0 -4px 4px -3px rgba(0,0,0,.18);'
                + 'color:#8a94a3;font:11px/' + SHEET_GAP + 'px Arial,sans-serif;text-align:right;padding-right:10px;box-sizing:border-box;}';
            doc.head.appendChild(st);
            editor.getBody().classList.add('cx-sheets');
            later();
        });
        editor.on('SetContent input change Undo Redo ExecCommand keyup', later);
        var name = document.querySelector('input[name="name"]');
        if (name) { name.addEventListener('input', later); }
    }

    /* GLPI 11.0.6 (Html::initEditorSystem): todo clique fora da barra de um
       editor faz $('.tox-tbtn.tox-tbtn--enabled').trigger('click') — para
       fechar menus abertos. Só que essa é também a classe do botão de
       alternar ATIVO. Com o cursor em texto normal o "A" do tamanho está
       ativo: clicar no título "clicava" o A, que chama editor.focus() e a
       página voltava para o corpo, sem deixar digitar (achado 62; o mesmo
       valia para Negrito etc. com o cursor em negrito, que ainda tirava o
       negrito da seleção). Clique de verdade tem isTrusted; o do jQuery não.
       O falso é barrado aqui, na captura, antes do TinyMCE, e só nos botões
       deste editor. */
    function guardSyntheticClicks(editor) {
        document.addEventListener('click', function (e) {
            if (e.isTrusted) { return; }
            var t = e.target;
            var btn = t && t.closest ? t.closest('.tox-tbtn') : null;
            var box = editor.getContainer && editor.getContainer();
            if (!btn || !box || !box.contains(btn)) { return; }
            e.stopImmediatePropagation();
            e.preventDefault();
        }, true);
    }

    /* Intercepta a gravação da configuração pelo GLPI. Se ela já estiver lá
       (script do plugin carregado tarde), ajusta em seguida: ainda vale se o
       editor não tiver sido iniciado. */
    function prepare(id) {
        var store = window.tinymce_editor_configs;
        if (!store || typeof store !== 'object') { return false; }
        if (Object.prototype.hasOwnProperty.call(store, id)) {
            var d = Object.getOwnPropertyDescriptor(store, id);
            if (d && 'value' in d) { customize(d.value); }
            return true;
        }
        Object.defineProperty(store, id, {
            configurable: true,
            enumerable: true,
            get: function () { return undefined; },
            set: function (v) {
                Object.defineProperty(store, id, {
                    configurable: true, enumerable: true, writable: true, value: customize(v)
                });
            }
        });
        return true;
    }

    window.CodexplusEditor = {
        prepare: prepare,
        contentCss: contentCss,
        sizeCss: sizeCss,
        palette: PALETTE,
        // Expostos para os testes (jsdom) e para depuração no console.
        _customize: customize,
        _applyStyle: applyStyle,
        _applySize: applySize,
        _importFile: importFile,
        _normalize: normalize,
        _toolAllowed: toolAllowed,
        _hiddenTools: hiddenTools,
        _currentType: currentType,
        _applyTools: applyTools,
        _placeholderHtml: placeholderHtml,
        _phKinds: PH_KINDS,
        _liftCellColors: liftCellColors,
        _cleanPaste: cleanPaste
    };

    prepare(EDITOR_ID);
    prepare(TEMPLATE_EDITOR_ID);

    // E5: as classes de cor valem também na leitura (fora do editor).
    (function injectPageColors() {
        if (!document.head || document.getElementById('cx-palette-css')) { return; }
        var st = document.createElement('style');
        st.id = 'cx-palette-css';
        st.textContent = colorCss() + tableCss(); // PL-8b: estilos de tabela na leitura
        document.head.appendChild(st);
    })();
})();
