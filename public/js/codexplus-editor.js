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
    // Blocos que recebem estilo e tamanho. Célula de tabela e item de lista
    // só recebem tamanho (não viram título nem nota).
    var TEXT_BLOCKS = 'p,h1,h2,h3,h4,h5,h6,div,pre,blockquote';
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
        return '.cx-size-sm{font-size:' + s.sm + 'em;}'
            + '.cx-size-lg{font-size:' + s.lg + 'em;}';
    }

    /* CSS dentro do editor (iframe do TinyMCE, que não carrega o CSS do
       plugin): títulos na mesma proporção da leitura e as notas. O PDF tem
       títulos e notas próprios em PRINT_CSS e só pega sizeCss(). */
    function contentCss() {
        return sizeCss()
            + 'h2,h3,h4{color:#1f5fbf;}'
            + 'h2{font-size:1.33em;}h3{font-size:1.13em;}h4{font-size:1em;}'
            + '.cx-callout{margin:0 0 12px;padding:9px 12px;border-radius:0;'
            + 'border-left:4px solid;}'
            + '.cx-callout-attention{background:#fcebeb;border-color:#e24b4a;}'
            + '.cx-callout-tip{background:#eaf3de;border-color:#639922;}'
            + '.cx-callout-note{background:#e6f1fb;border-color:#378add;}';
    }

    function hasClass(el, c) { return (' ' + (el.className || '') + ' ').indexOf(' ' + c + ' ') !== -1; }
    function dropClasses(el, list) {
        list.forEach(function (c) { el.classList.remove(c); });
        if (!el.className) { el.removeAttribute('class'); }
    }

    function selectedBlocks(editor, selector) {
        var blocks = editor.selection.getSelectedBlocks() || [];
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

    function register(editor) {
        var ui = editor.ui.registry;

        editor.on('PreInit', function () {
            editor.formatter.register('cxsize_sm', { inline: 'span', classes: 'cx-size-sm' });
            editor.formatter.register('cxsize_lg', { inline: 'span', classes: 'cx-size-lg' });
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

    function customize(cfg) {
        if (!cfg || cfg.__cxCustomized) { return cfg; }
        cfg.__cxCustomized = true;

        var layout = typeof cfg.toolbar === 'string' ? 'classic' : 'inline';
        if (layout === 'classic') {
            // Sem cor e tamanho livres (padronização, Claudio 22/09/2026).
            cfg.toolbar = 'cxstyles | cxsizesm cxsizemd cxsizelg | bold italic underline'
                + ' | bullist numlist outdent indent | table link image | code fullscreen';
        } else if (typeof cfg.quickbars_selection_toolbar === 'string') {
            cfg.quickbars_selection_toolbar = 'bold italic | cxstyles | cxsizesm cxsizemd cxsizelg';
        }
        // Texto colado do Word ou da web não traz fonte nem tamanho próprios.
        cfg.paste_webkit_styles = 'none';
        cfg.invalid_styles = { '*': 'font-family font-size' };
        cfg.content_style = (cfg.content_style || '') + contentCss();

        var original = cfg.setup;
        cfg.setup = function (editor) {
            if (typeof original === 'function') { original.call(this, editor); }
            register(editor);
        };
        return cfg;
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
        // Expostos para os testes (jsdom) e para depuração no console.
        _customize: customize,
        _applyStyle: applyStyle,
        _applySize: applySize
    };

    prepare(EDITOR_ID);
})();
