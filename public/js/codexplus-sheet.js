/* =========================================================================
   Codex+ — Planilha no corpo do documento (bloco PL1, Claudio 26/09/2026)
   -------------------------------------------------------------------------
   Botão "Planilha" no editor (codexplus-editor.js) e duplo clique numa
   planilha já inserida abrem esta janela. O bloco gravado no corpo é:

     <div class="cx-sheet" contenteditable="false" data-cx-sheet='{json}'>
       <table>…valores já calculados…</table>
     </div>

   O JSON (cols, rows, total) serve só para editar de novo; a leitura, o
   PDF e o Word usam a <table> (o sanitizador do GLPI tira data-*, achado 57
   — não faz falta). Fórmulas simples, sem eval:
     - numa célula: =A1*C1, =SOMA(D1:D5), =MÉDIA(B1:B3), + − * / e ( );
     - "fórmula da coluna": =A*C vale para cada linha (A = coluna A da
       mesma linha).
   Números em pt-BR ("1.890,50"). Tipos de coluna: texto, número, moeda.
   ========================================================================= */
(function () {
    'use strict';

    var TYPES = { text: 'Texto', num: 'Número', money: 'Moeda (R$)' };
    var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    function esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    /* Modelo padrão da proposta: Qtd primeiro (Claudio, 26/09/2026). */
    function starter() {
        return {
            v: 1,
            cols: [
                { name: 'Qtd', type: 'num', formula: '' },
                { name: 'Item', type: 'text', formula: '' },
                { name: 'Unitário', type: 'money', formula: '' },
                { name: 'Total', type: 'money', formula: '=A*C' }
            ],
            rows: [['1', '', '', ''], ['1', '', '', '']],
            total: true,
            totalLabel: 'Total'
        };
    }

    /* ---------------- números ---------------- */
    function parseNum(v) {
        if (typeof v === 'number') { return v; }
        var s = String(v == null ? '' : v).replace(/R\$\s?/i, '').trim();
        if (s === '') { return 0; }
        if (s.indexOf(',') >= 0) { s = s.replace(/\./g, '').replace(',', '.'); }
        var n = parseFloat(s);
        return isNaN(n) ? 0 : n;
    }
    function fmt(n, type) {
        if (type === 'text') { return String(n); }
        if (typeof n !== 'number' || !isFinite(n)) { return '—'; }
        var o = { minimumFractionDigits: type === 'money' ? 2 : 0, maximumFractionDigits: 2 };
        return (type === 'money' ? 'R$ ' : '') + n.toLocaleString('pt-BR', o);
    }

    /* ---------------- fórmulas ---------------- */
    function evaluate(data) {
        var cols = data.cols, rows = data.rows;
        var cache = {};
        function cellValue(r, c, depth) {
            var key = r + ':' + c;
            if (key in cache) { return cache[key]; }
            if (depth > 50 || r < 0 || c < 0 || r >= rows.length || c >= cols.length) { return 0; }
            cache[key] = 0; // referência circular vira 0
            var raw = String((rows[r] || [])[c] == null ? '' : rows[r][c]).trim();
            var f = raw.charAt(0) === '=' ? raw : (cols[c].formula || '');
            var val;
            if (f && f.charAt(0) === '=') {
                val = calc(f.slice(1), r, depth + 1);
            } else if (cols[c].type === 'text') {
                val = raw;
            } else {
                val = parseNum(raw);
            }
            cache[key] = val;
            return val;
        }
        function calc(expr, row, depth) {
            var toks = expr.toUpperCase().replace(/MÉDIA/g, 'MEDIA').match(/\d+(?:[.,]\d+)?|[A-Z]+\d*(?::[A-Z]\d+)?|[+\-*/()]|;|,/g) || [];
            var i = 0;
            function peek() { return toks[i]; }
            function next() { return toks[i++]; }
            function ref(t) {
                var m = /^([A-Z])(\d*)$/.exec(t);
                if (!m) { return 0; }
                var c = LETTERS.indexOf(m[1]);
                var r = m[2] === '' ? row : parseInt(m[2], 10) - 1;
                var v = cellValue(r, c, depth);
                return typeof v === 'number' ? v : parseNum(v);
            }
            function range(t) {
                var m = /^([A-Z])(\d+):([A-Z])(\d+)$/.exec(t);
                var out = [];
                if (!m) { return out; }
                var c1 = LETTERS.indexOf(m[1]), c2 = LETTERS.indexOf(m[3]);
                var r1 = parseInt(m[2], 10) - 1, r2 = parseInt(m[4], 10) - 1;
                for (var r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
                    for (var c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
                        var v = cellValue(r, c, depth);
                        out.push(typeof v === 'number' ? v : parseNum(v));
                    }
                }
                return out;
            }
            function fn(name) {
                next(); // (
                var vals = [];
                while (peek() && peek() !== ')') {
                    var t = peek();
                    if (/^[A-Z]\d+:[A-Z]\d+$/.test(t)) { next(); vals = vals.concat(range(t)); } else { vals.push(add()); }
                    if (peek() === ';' || peek() === ',') { next(); }
                }
                next(); // )
                var s = vals.reduce(function (a, b) { return a + b; }, 0);
                if (name === 'SOMA' || name === 'SUM') { return s; }
                if (name === 'MEDIA' || name === 'AVG' || name === 'AVERAGE') { return vals.length ? s / vals.length : 0; }
                if (name === 'MIN') { return vals.length ? Math.min.apply(null, vals) : 0; }
                if (name === 'MAX') { return vals.length ? Math.max.apply(null, vals) : 0; }
                return 0;
            }
            function atom() {
                var t = next();
                if (t === undefined) { return 0; }
                if (t === '(') { var v = add(); next(); return v; }
                if (t === '-') { return -atom(); }
                if (t === '+') { return atom(); }
                if (/^\d/.test(t)) { return parseNum(t); }
                if (peek() === '(' && /^[A-Z]+$/.test(t) && t.length > 1) { return fn(t); }
                return ref(t);
            }
            function mul() {
                var v = atom();
                while (peek() === '*' || peek() === '/') {
                    var op = next(), w = atom();
                    v = op === '*' ? v * w : (w === 0 ? NaN : v / w);
                }
                return v;
            }
            function add() {
                var v = mul();
                while (peek() === '+' || peek() === '-') {
                    var op = next(), w = mul();
                    v = op === '+' ? v + w : v - w;
                }
                return v;
            }
            var res = add();
            return typeof res === 'number' ? res : 0;
        }
        var out = rows.map(function (row, r) {
            return cols.map(function (col, c) { return cellValue(r, c, 0); });
        });
        var totals = cols.map(function (col, c) {
            if (col.type === 'text') { return null; }
            return out.reduce(function (a, row) { return a + (typeof row[c] === 'number' ? row[c] : 0); }, 0);
        });
        return { values: out, totals: totals };
    }

    /* ---------------- HTML gravado no documento ---------------- */
    /* Colunas somadas na linha de total: as de moeda calculadas por fórmula
       (o Total da linha); sem nenhuma, a última de moeda. Somar o preço
       unitário não faz sentido. */
    function totalCols(data) {
        var comF = [], moeda = [];
        data.cols.forEach(function (c, i) {
            if (c.type === 'money') { moeda.push(i); if (c.formula) { comF.push(i); } }
        });
        return comF.length ? comF : moeda.slice(-1);
    }

    function tableHtml(data) {
        var ev = evaluate(data);
        var somar = totalCols(data);
        var h = '<table class="cx-sheet-table"><thead><tr>';
        data.cols.forEach(function (c) {
            h += '<th' + (c.type !== 'text' ? ' class="cx-sheet-num"' : '') + '>' + esc(c.name) + '</th>';
        });
        h += '</tr></thead><tbody>';
        ev.values.forEach(function (row, r) {
            // Linha sem nada digitado sai em branco (não "0" e "R$ 0,00").
            var vazia = (data.rows[r] || []).every(function (x) { return String(x == null ? '' : x).trim() === ''; });
            // Linhas alternadas com fundo azul claro, para facilitar a leitura.
            h += '<tr' + (r % 2 === 1 ? ' class="cx-sheet-alt"' : '') + '>';
            row.forEach(function (v, c) {
                var t = data.cols[c].type;
                h += '<td' + (t !== 'text' ? ' class="cx-sheet-num"' : '') + '>' + (vazia ? '' : esc(fmt(v, t))) + '</td>';
            });
            h += '</tr>';
        });
        h += '</tbody>';
        if (data.total) {
            // "Total" fica colado no valor: na coluna logo antes da primeira somada.
            var labelAt = somar.length ? Math.max(0, somar[0] - 1) : 0;
            h += '<tfoot><tr class="cx-sheet-total">';
            data.cols.forEach(function (c, i) {
                var show = somar.indexOf(i) >= 0;
                var txt = show ? fmt(ev.totals[i], c.type) : (i === labelAt ? (data.totalLabel || 'Total') : '');
                h += '<td class="cx-sheet-num">' + (txt ? '<strong>' + esc(txt) + '</strong>' : '') + '</td>';
            });
            h += '</tr></tfoot>';
        }
        return h + '</table>';
    }
    function blockHtml(data) {
        return '<div class="cx-sheet" contenteditable="false" data-cx-sheet="' + esc(JSON.stringify(data)) + '">'
            + tableHtml(data) + '</div>';
    }

    /* ---------------- janela de edição ---------------- */
    function open(editor, node) {
        var data;
        try { data = node ? JSON.parse(node.getAttribute('data-cx-sheet') || '') : null; } catch (e) { data = null; }
        if (!data || !Array.isArray(data.cols) || !Array.isArray(data.rows)) { data = starter(); }
        var hist = [];

        var back = document.createElement('div');
        back.className = 'cx-sheet-modal';
        document.body.appendChild(back);

        function snap() { hist.push(JSON.stringify(data)); if (hist.length > 50) { hist.shift(); } }
        function close() { back.remove(); document.removeEventListener('keydown', onKey, true); }
        function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(); } }
        document.addEventListener('keydown', onKey, true);

        function render() {
            var ev = evaluate(data);
            var h = '<div class="cx-sheet-box" role="dialog" aria-label="Planilha">'
                + '<div class="cx-sheet-head"><strong>Planilha</strong>'
                + '<span class="cx-sheet-help">Números em pt-BR (1.890,50). Fórmula na célula: =A1*C1, =SOMA(D1:D5). Fórmula da coluna: =A*C vale para cada linha.</span></div>'
                + '<div class="cx-sheet-scroll"><table class="cx-sheet-grid"><thead><tr><th></th>';
            data.cols.forEach(function (c, i) {
                h += '<th><div class="cx-sheet-colhead"><span class="cx-sheet-letter">' + LETTERS[i] + '</span>'
                    + '<button type="button" class="cx-sheet-x" data-delcol="' + i + '" title="Tirar coluna">×</button></div>'
                    + '<input type="text" data-colname="' + i + '" value="' + esc(c.name) + '" aria-label="Nome da coluna ' + LETTERS[i] + '">'
                    + '<select data-coltype="' + i + '" aria-label="Tipo da coluna ' + LETTERS[i] + '">'
                    + Object.keys(TYPES).map(function (k) { return '<option value="' + k + '"' + (c.type === k ? ' selected' : '') + '>' + TYPES[k] + '</option>'; }).join('')
                    + '</select>'
                    + '<input type="text" data-colformula="' + i + '" value="' + esc(c.formula || '') + '" placeholder="fórmula (=A*C)" aria-label="Fórmula da coluna ' + LETTERS[i] + '"></th>';
            });
            h += '<th></th></tr></thead><tbody>';
            data.rows.forEach(function (row, r) {
                h += '<tr><td class="cx-sheet-rown">' + (r + 1) + '</td>';
                data.cols.forEach(function (c, i) {
                    var raw = row[i] == null ? '' : String(row[i]);
                    var calc = c.formula && raw.trim() === '';
                    h += '<td>' + (calc
                        ? '<span class="cx-sheet-calc" title="Pela fórmula da coluna">' + esc(fmt(ev.values[r][i], c.type)) + '</span>'
                        : '<input type="text" data-r="' + r + '" data-c="' + i + '" value="' + esc(raw) + '"'
                            + (c.type !== 'text' ? ' class="cx-sheet-inum"' : '') + '>'
                            + (raw.charAt(0) === '=' ? '<small class="cx-sheet-res">' + esc(fmt(ev.values[r][i], c.type)) + '</small>' : ''))
                        + '</td>';
                });
                h += '<td><button type="button" class="cx-sheet-x" data-delrow="' + r + '" title="Tirar linha">×</button></td></tr>';
            });
            h += '</tbody>';
            if (data.total) {
                var somar = totalCols(data);
                h += '<tfoot><tr><td></td>';
                data.cols.forEach(function (c, i) {
                    h += '<td class="cx-sheet-tot">' + (somar.indexOf(i) >= 0 ? esc(fmt(ev.totals[i], c.type)) : '') + '</td>';
                });
                h += '<td></td></tr></tfoot>';
            }
            h += '</table></div>'
                + '<div class="cx-sheet-foot">'
                + '<button type="button" data-act="row">+ Linha</button>'
                + '<button type="button" data-act="col">+ Coluna</button>'
                + '<button type="button" data-act="undo"' + (hist.length ? '' : ' disabled') + '>Desfazer</button>'
                + '<label><input type="checkbox" data-act="total"' + (data.total ? ' checked' : '') + '> Linha de total (soma o total calculado)</label>'
                + '<span class="cx-sheet-spacer"></span>'
                + '<button type="button" data-act="cancel">Cancelar</button>'
                + '<button type="button" data-act="ok" class="cx-sheet-ok">' + (node ? 'Salvar planilha' : 'Inserir planilha') + '</button>'
                + '</div></div>';
            back.innerHTML = h;
        }

        back.addEventListener('change', function (e) {
            var t = e.target;
            if (t.hasAttribute('data-r')) {
                snap();
                data.rows[+t.getAttribute('data-r')][+t.getAttribute('data-c')] = t.value;
            } else if (t.hasAttribute('data-colname')) {
                snap(); data.cols[+t.getAttribute('data-colname')].name = t.value;
            } else if (t.hasAttribute('data-coltype')) {
                snap(); data.cols[+t.getAttribute('data-coltype')].type = t.value;
            } else if (t.hasAttribute('data-colformula')) {
                snap();
                var f = t.value.trim();
                data.cols[+t.getAttribute('data-colformula')].formula = f && f.charAt(0) !== '=' ? '=' + f : f;
            } else if (t.getAttribute('data-act') === 'total') {
                snap(); data.total = t.checked;
            } else {
                return;
            }
            render();
        });
        back.addEventListener('keydown', function (e) {
            // Enter confirma a célula e desce (não envia o formulário do documento).
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                e.preventDefault();
                var r = e.target.getAttribute('data-r'), c = e.target.getAttribute('data-c');
                e.target.blur();
                if (r !== null) {
                    var n = back.querySelector('input[data-r="' + (+r + 1) + '"][data-c="' + c + '"]');
                    if (n) { n.focus(); n.select(); }
                }
            }
        });
        back.addEventListener('click', function (e) {
            var t = e.target.closest('button,[data-act]');
            if (!t || t.tagName === 'LABEL' || t.type === 'checkbox') { return; }
            var a = t.getAttribute('data-act');
            if (t.hasAttribute('data-delrow')) {
                snap(); data.rows.splice(+t.getAttribute('data-delrow'), 1); render(); return;
            }
            if (t.hasAttribute('data-delcol')) {
                if (data.cols.length <= 1) { return; }
                snap();
                var ci = +t.getAttribute('data-delcol');
                data.cols.splice(ci, 1);
                data.rows.forEach(function (row) { row.splice(ci, 1); });
                render(); return;
            }
            if (a === 'row') { snap(); data.rows.push(data.cols.map(function () { return ''; })); render(); }
            else if (a === 'col') {
                if (data.cols.length >= LETTERS.length) { return; }
                snap(); data.cols.push({ name: 'Coluna ' + LETTERS[data.cols.length], type: 'text', formula: '' });
                data.rows.forEach(function (row) { row.push(''); }); render();
            }
            else if (a === 'undo') { if (hist.length) { data = JSON.parse(hist.pop()); render(); } }
            else if (a === 'cancel') { close(); }
            else if (a === 'ok') {
                // Grava o que estiver digitado e ainda sem "change".
                var ativo = document.activeElement;
                if (ativo && back.contains(ativo) && ativo.hasAttribute && ativo.hasAttribute('data-r')) {
                    data.rows[+ativo.getAttribute('data-r')][+ativo.getAttribute('data-c')] = ativo.value;
                }
                var html = blockHtml(data);
                editor.undoManager.transact(function () {
                    if (node && node.parentNode) {
                        editor.dom.setOuterHTML(node, html);
                    } else {
                        editor.focus();
                        editor.insertContent(html + '<p><br></p>');
                    }
                });
                editor.nodeChanged();
                close();
            }
        });
        render();
        var first = back.querySelector('input[data-r]');
        if (first) { first.focus(); }
    }

    window.CodexplusSheet = { open: open, render: tableHtml, block: blockHtml, evaluate: evaluate, starter: starter };
})();
