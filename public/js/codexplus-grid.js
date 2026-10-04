/* =========================================================================
   Codex+ — cronograma e matriz RACI (bloco D1, Claudio, 26/09/2026)
   -------------------------------------------------------------------------
   Subtipos de diagrama (DIA) que são GRADES, não grafo. Mesmo contrato do
   motor do organograma (codexplus-org.js):
     - [data-cx-grid] com data-source (JSON), data-editable, data-input
       (hidden _diagram que vai no Salvar), data-doc e data-save (salvamento
       automático em ajax/diagram.save.php, 2,5 s depois da última mudança);
     - o servidor valida tudo de novo (Diagram::validateGrid).
   Cronograma: periods[] nas colunas; rows[] {name, owner, cells[]} com
   célula '' (vazio), 'b' (período) ou 'm' (marco).
   RACI: roles[] nas colunas; rows[] {name, cells[]} com '', R, A, C ou I.
   PDF: iframe fora da tela, A4 paisagem, estilos embutidos (achado 24 para
   o nome sugerido).
   Q7b-1 (Claudio, 03/10/2026): cronograma COM DATAS, gravado ao lado do
   formato antigo: { kind: 'cronograma', mode: 'datas', scale: 'S'|'M',
   rows: [{ name, owner, start, end }] } (AAAA-MM-DD). Colunas por semana ou
   por mês com a data no cabeçalho; barra pelas datas; edição na tabela
   (início, fim, dias corridos) e arrastando a barra (mover; alças nas
   pontas). Sem `mode`, o cronograma antigo abre exatamente como antes; o
   botão "Usar datas" converte (Desfazer volta).
   Q7b-2: linhas de tipo `type: 'fase'` (sem datas; resumo calculado das
   linhas abaixo dela até a próxima fase; ▾ recolhe só na tela) e
   `type: 'marco'` (uma data, start = end, desenhado como ◆); sem `type`, é
   tarefa. Numeração automática (1, 1.1…), subir/descer, linha "hoje" e PDF
   que estica a linha do tempo quando o cronograma cabe numa folha.
   Q7c-1 (Claudio, 04/10/2026): a primeira fase não sobe acima das tarefas
   soltas do topo; na tela cheia a linha do tempo estica até a largura da
   tela (nunca abaixo do padrão; fora dela e no PDF, nada muda).
   Q7c-2: histórico das marcações (Iniciar, Concluir, Reabrir, todas) num
   balão ao clicar no selo da Situação; vem em data-hist e na resposta.
   Q7b-3: Importar e Exportar (cópia .json `codexplus-grade` e tabela
   Markdown para levar a uma IA, de ida e volta), também na RACI.
   ========================================================================= */
(function () {
    'use strict';

    var RACI = ['', 'R', 'A', 'C', 'I'];
    var SCHED = ['', 'b', 'm'];
    var RACI_LABEL = { R: 'Executa', A: 'Responde (aprova)', C: 'É consultado', I: 'É informado' };
    var AUTO_MS = 2500;
    // D1-2: unidade dos períodos do cronograma (sempre relativos: S1, M1…).
    var UNITS = { S: 'Semanas', M: 'Meses', T: 'Trimestres', A: 'Anos' };
    // Larguras (px): tela e PDF. A tela rola na horizontal; o PDF escolhe a
    // orientação e divide as colunas em folhas (printGrid).
    var W = {
        name: 260, owner: 130, sched: 48, raci: 96,
        pName: 200, pOwner: 100, pSched: 34, pRaci: 72,
        portrait: 718, landscape: 1047 // área útil do A4 com 10 mm de margem
    };

    /* ---------- Q7b-1: datas (dia = número de dias desde 01/01/1970, UTC) ---------- */
    var DIA = 86400000;
    var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    var ESCALAS = { S: 'Semanas', M: 'Meses' };
    // Larguras (px) do cronograma com datas: tela e PDF; px por dia na escala.
    // Q7b-2b (mockup): Nº | Fase, tarefa ou marco | Responsável | Início | Fim (dd/mm), sem Dias.
    // As posições fixas na tela (sticky) do CSS seguem estas larguras.
    var GD = {
        n: 48, name: 320, owner: 140, date: 58, pxS: 6.3, pxM: 3,
        pN: 30, pName: 200, pOwner: 92, pDate: 40, pxSp: 5, pxMp: 2,
        chk: 32, sit: 190, pSit: 132 // Q7b-4: caixinha (quem marca) e coluna Situação
    };
    function p2(n) { return (n < 10 ? '0' : '') + n; }
    function dn(iso) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
        if (!m || +m[1] < 1990 || +m[1] > 2100) { return null; }
        var t = Date.UTC(+m[1], +m[2] - 1, +m[3]), d = new Date(t);
        if (d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) { return null; }
        return Math.round(t / DIA);
    }
    function ymd(n) { var d = new Date(n * DIA); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }; }
    function iso(n) { var d = ymd(n); return d.y + '-' + p2(d.m + 1) + '-' + p2(d.d); }
    function br(n) { if (n == null) { return ''; } var d = ymd(n); return p2(d.d) + '/' + p2(d.m + 1) + '/' + d.y; }
    function brCurto(n) { var d = ymd(n); return p2(d.d) + '/' + p2(d.m + 1); }
    /** dd/mm/aaaa (também d/m/aa, com . ou -) ou AAAA-MM-DD; null se não existir. */
    function parseBr(t) {
        t = String(t == null ? '' : t).trim();
        var m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/.exec(t);
        if (m) {
            var y = +m[3];
            if (y < 100) { y += 2000; }
            return dn(y + '-' + p2(+m[2]) + '-' + p2(+m[1]));
        }
        return dn(t);
    }
    function hoje() { var d = new Date(); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DIA); }
    function diaSemana(n) { return (new Date(n * DIA).getUTCDay() + 6) % 7; } // 0 = segunda
    function inicioMes(y, m) { return Math.round(Date.UTC(y, m, 1) / DIA); }
    function dias(n) { return n + (n === 1 ? ' dia' : ' dias'); }

    /* ---------- Q7b-4: id fixo da linha (chave da situação da tarefa) ---------- */
    var ID_OK = /^[a-z0-9]{1,12}$/;
    function novoId(usados) {
        var id;
        do { id = 't' + Math.random().toString(36).slice(2, 8); } while (!ID_OK.test(id) || id.length < 4 || usados[id]);
        usados[id] = 1;
        return id;
    }
    /** Toda linha com id válido e único; o que faltar ganha um novo (sempre como último campo). */
    function garanteIds(rows) {
        var us = {};
        rows.forEach(function (r) {
            if (typeof r.id === 'string' && ID_OK.test(r.id) && !us[r.id]) { us[r.id] = 1; } else { delete r.id; }
        });
        rows.forEach(function (r) { if (!r.id) { r.id = novoId(us); } });
        return rows;
    }
    /**
     * Tabela da IA não traz id: a linha que volta com o mesmo tipo e nome
     * herda o id da linha atual (a situação acompanha a ida e volta).
     */
    function herdaIds(velhas, novas) {
        var usados = {}, chave = function (r) { return (r.type || 'tarefa') + '|' + norm(r.name); };
        novas.forEach(function (r) { if (r.id) { usados[r.id] = 1; } });
        novas.forEach(function (r) {
            if (r.id) { return; }
            for (var i = 0; i < velhas.length; i++) {
                var v = velhas[i];
                if (v.id && !usados[v.id] && chave(v) === chave(r)) { r.id = v.id; usados[v.id] = 1; return; }
            }
        });
    }

    function esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    /* =====================================================================
       Q7b-3 (Claudio, 03/10/2026): importar e exportar cronograma e RACI.
       Cópia do Codex+ = { formato: 'codexplus-grade', versao, origem, titulo,
       exportado, grade } (.json). "Levar para uma IA" = tabela Markdown (.md),
       de ida e volta. Funções puras: testáveis sem o DOM do documento.
       ===================================================================== */
    var IO_FORMATO = 'codexplus-grade', IO_VERSAO = 1, IO_MAX = 1024 * 1024;
    var TIPO_ROT = { tarefa: 'Tarefa', fase: 'Fase', marco: 'Marco' };
    function norm(t) {
        return String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
            .replace(/[^a-z0-9#]+/g, ' ').trim();
    }
    function mdCell(t) { return String(t == null ? '' : t).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ').trim(); }
    function hojeBr() { var d = new Date(); return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear(); }

    /** Estrutura das linhas com datas (mesma regra do motor): numeração e resumo das fases. */
    function estruturaDe(rows) {
        var out = [], top = 0, sub = 0, fa = -1;
        rows.forEach(function (r, i) {
            var t = r.type === 'fase' || r.type === 'marco' ? r.type : 'tarefa';
            if (t === 'fase') { top++; sub = 0; fa = i; out.push({ num: String(top), fase: -1, a: null, b: null }); return; }
            // Mockup Q7b: marco não leva número (fica na fase, mas não conta).
            if (t === 'marco') { out.push({ num: '', fase: fa }); } else if (fa >= 0) { sub++; out.push({ num: top + '.' + sub, fase: fa }); } else { top++; out.push({ num: String(top), fase: -1 }); }
            var a = dn(r.start), b = dn(r.end);
            if (fa >= 0 && a != null && b != null) {
                out[fa].a = out[fa].a == null ? a : Math.min(out[fa].a, a);
                out[fa].b = out[fa].b == null ? b : Math.max(out[fa].b, b);
            }
        });
        return out;
    }

    /** Tabela Markdown para levar a uma IA (cronograma com datas ou RACI). */
    function gridToMd(S, title, when) {
        var out = [], t = String(title || '').replace(/[\r\n]+/g, ' ').trim();
        if (S.kind === 'raci') {
            out.push('# ' + (t || 'Matriz RACI'), '',
                'Matriz RACI exportada do Codex+' + (when ? ' em ' + when : '') + ', em tabela Markdown.',
                'Primeira coluna: a atividade; uma coluna por papel. Em cada célula: R (executa), A (responde e aprova; um só A por atividade), C (é consultado), I (é informado) ou vazio.',
                'Para ajustar com uma IA: anexe este arquivo e peça as mudanças, pedindo a resposta no mesmo formato (a mesma tabela). Depois importe a resposta no Codex+.', '',
                '| Atividade | ' + S.roles.map(mdCell).join(' | ') + ' |',
                '|---|' + S.roles.map(function () { return ':---:'; }).join('|') + '|');
            S.rows.forEach(function (r) { out.push('| ' + mdCell(r.name) + ' | ' + S.roles.map(function (x, i) { return r.cells[i] || ''; }).join(' | ') + ' |'); });
            out.push('', '<!-- codexplus-raci {"versao":1} -->', '');
            return out.join('\n');
        }
        var est = estruturaDe(S.rows);
        out.push('# ' + (t || 'Cronograma'), '',
            'Cronograma exportado do Codex+' + (when ? ' em ' + when : '') + ', em tabela Markdown.',
            'Tipo: Tarefa; Fase (agrupa as linhas abaixo dela até a próxima fase; as datas da fase são calculadas); Marco (uma data só, Dias = 0). Datas em dd/mm/aaaa; Dias = dias corridos do início ao fim.',
            'Para ajustar com uma IA: anexe este arquivo e peça as mudanças, pedindo a resposta no mesmo formato (a mesma tabela, com as mesmas colunas). Depois importe a resposta no Codex+.', '',
            '| Nº | Tipo | Tarefa | Responsável | Início | Fim | Dias |', '|---|---|---|---|---|---|---:|');
        S.rows.forEach(function (r, i) {
            var tp = r.type === 'fase' || r.type === 'marco' ? r.type : 'tarefa';
            var a = tp === 'fase' ? est[i].a : dn(r.start), b = tp === 'fase' ? est[i].b : dn(r.end);
            var tem = a != null && b != null;
            out.push('| ' + est[i].num + ' | ' + TIPO_ROT[tp] + ' | ' + mdCell(r.name) + ' | ' + mdCell(r.owner) + ' | ' +
                (tem ? br(a) : '') + ' | ' + (tem ? br(b) : '') + ' | ' + (tem ? (tp === 'marco' ? 0 : b - a + 1) : '') + ' |');
        });
        out.push('', '<!-- codexplus-cronograma ' + JSON.stringify({ versao: 1, scale: S.scale }) + ' -->', '');
        return out.join('\n');
    }

    /** Tabelas Markdown do texto: [{ head: [..], rows: [[..]] }]. */
    function mdTables(txt) {
        var lines = String(txt).replace(/\r\n?/g, '\n').split('\n'), tabs = [], cur = null;
        function cells(l) {
            var t = l.trim().replace(/^\|/, '').replace(/(^|[^\\])\|$/, '$1');
            return t.split(/(?<!\\)\|/).map(function (c) {
                return c.replace(/\\\|/g, '|').replace(/\*\*|__|`/g, '').trim();
            });
        }
        // Separador: |---|:-:|---:| (um traço basta: |:-:| é comum nas IAs).
        var sep = /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/;
        for (var i = 0; i < lines.length; i++) {
            var l = lines[i].trim();
            if (cur) {
                if (l.indexOf('|') >= 0 && !sep.test(l)) { cur.rows.push(cells(l)); continue; }
                tabs.push(cur); cur = null;
            }
            if (l.indexOf('|') >= 0 && i + 1 < lines.length && sep.test(lines[i + 1].trim())) {
                cur = { head: cells(l), rows: [] };
                i++;
            }
        }
        if (cur) { tabs.push(cur); }
        return tabs.filter(function (t) { return t.head.length >= 2; });
    }

    /** Coluna de cada campo do cronograma pelo nome do cabeçalho (como as IAs costumam escrever). */
    function colunasCrono(head) {
        var c = {};
        head.forEach(function (h, i) {
            var n = norm(h), raw = String(h).trim();
            var put = function (k) { if (c[k] == null) { c[k] = i; } };
            if (raw === '#' || /^(n|no|num|numero|id|item|wbs|edt)$/.test(n)) { put('num'); }
            else if (/^(tipo|type)\b/.test(n)) { put('tipo'); }
            else if (/respons|dono|owner|quem|encarregad/.test(n)) { put('owner'); }
            else if (/inicio|start|comeco/.test(n)) { put('start'); }
            else if (/\bfim\b|termino|\bend\b|prazo|conclusao|finish|data de entrega|^entrega$/.test(n)) { put('end'); }
            else if (/dias|duracao|duration|days/.test(n)) { put('dias'); }
            else if (/tarefa|atividade|descricao|etapa|task|^nome$|^name$|^acao$/.test(n)) { put('name'); }
        });
        if (c.name == null) {
            for (var i = 0; i < head.length; i++) {
                if ([c.num, c.tipo, c.owner, c.start, c.end, c.dias].indexOf(i) < 0) { c.name = i; break; }
            }
        }
        return c;
    }

    /** Lê o texto como tabela de cronograma. */
    function readCrono(txt) {
        var tabs = mdTables(txt), tab = null, col = null;
        for (var k = 0; k < tabs.length; k++) {
            var cc = colunasCrono(tabs[k].head);
            if (cc.name != null && (cc.start != null || cc.end != null)) { tab = tabs[k]; col = cc; break; }
        }
        if (!tab) {
            return { err: 'Não encontrei uma tabela de cronograma. A tabela precisa de uma coluna de tarefa e das colunas Início e Fim (datas em dd/mm/aaaa).' };
        }
        var warn = [], rows = [], semData = 0, cortadas = 0;
        var get = function (r, k) { return col[k] == null ? '' : String(r[col[k]] == null ? '' : r[col[k]]).trim(); };
        var lidas = tab.rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
        if (lidas.length > 300) { cortadas = lidas.length - 300; lidas = lidas.slice(0, 300); }
        var nums = lidas.map(function (r) {
            var n = get(r, 'num'), nm = get(r, 'name'), m = /^(\d+(?:\.\d+)*)[.)]?\s+(.*)$/.exec(nm);
            if (!n && m) { n = m[1]; }
            return n.replace(/\.$/, '');
        });
        lidas.forEach(function (r, i) {
            var linha = i + 1;
            var nome = get(r, 'name').replace(/^\d+(?:\.\d+)*[.)]?\s+/, '').replace(/^[◆♦▾▸•\-–]\s*/, '').trim();
            var tt = norm(get(r, 'tipo')), tp;
            var ds = get(r, 'start'), de = get(r, 'end'), dd = get(r, 'dias');
            var a = ds ? parseBr(ds) : null, b = de ? parseBr(de) : null;
            var nd = /^\d+$/.test(dd.replace(/\s*dias?$/i, '')) ? parseInt(dd, 10) : null;
            if (ds && a == null) { warn.push('Linha ' + linha + ': início "' + ds + '" não é uma data dd/mm/aaaa.'); }
            if (de && b == null) { warn.push('Linha ' + linha + ': fim "' + de + '" não é uma data dd/mm/aaaa.'); }
            if (/fase|phase|etapa|grupo/.test(tt)) { tp = 'fase'; }
            else if (/marco|milestone|entrega/.test(tt)) { tp = 'marco'; }
            else if (tt) { tp = 'tarefa'; }
            else if (/^[◆♦]/.test(get(r, 'name')) || /^marco\b/.test(norm(nome)) || nd === 0) { tp = 'marco'; }
            else if (nums[i] && nums[i + 1] && nums[i + 1].indexOf(nums[i] + '.') === 0 && nums[i].indexOf('.') < 0) { tp = 'fase'; }
            else if (a == null && b == null && /^(fase|etapa)\b/.test(norm(nome))) { tp = 'fase'; }
            else { tp = 'tarefa'; }
            var owner = get(r, 'owner').replace(/^[—–-]$/, '');
            if (tp === 'fase') { rows.push({ type: 'fase', name: nome.slice(0, 200), owner: owner.slice(0, 120) }); return; }
            if (tp === 'marco') {
                var m = a != null ? a : b;
                if (m == null) { semData++; }
                rows.push({ type: 'marco', name: nome.slice(0, 200), owner: owner.slice(0, 120), start: m == null ? '' : iso(m), end: m == null ? '' : iso(m) });
                return;
            }
            if (a != null && b == null && nd) { b = a + nd - 1; }
            if (a == null && b != null && nd) { a = b - nd + 1; }
            if (a != null && b == null) { b = a; }
            if (a == null && b != null) { a = b; }
            if (a != null && b < a) { warn.push('Linha ' + linha + ': fim antes do início; as datas foram trocadas.'); var t = a; a = b; b = t; }
            if (a == null) { semData++; }
            rows.push({ name: nome.slice(0, 200), owner: owner.slice(0, 120), start: a == null ? '' : iso(a), end: b == null ? '' : iso(b) });
        });
        if (!rows.length) { return { err: 'A tabela de cronograma está vazia.' }; }
        if (semData) { warn.push(semData === 1 ? '1 linha sem datas: entra sem barra (dá para desenhar depois).' : semData + ' linhas sem datas: entram sem barra (dá para desenhar depois).'); }
        if (cortadas) { warn.push(cortadas + ' linhas além do limite de 300 ficaram de fora.'); }
        var scale = null, mm = /<!--\s*codexplus-cronograma\s+(\{[\s\S]*?\})\s*-->/.exec(txt);
        if (mm) { try { scale = JSON.parse(mm[1]).scale; } catch (e) { scale = null; } }
        if (!ESCALAS[scale]) {
            var lo = null, hi = null;
            rows.forEach(function (r) { var x = dn(r.start), y = dn(r.end); if (x != null) { lo = lo == null ? x : Math.min(lo, x); hi = hi == null ? y : Math.max(hi, y); } });
            scale = lo != null && hi - lo > 183 ? 'M' : 'S';
        }
        return { data: { kind: 'cronograma', mode: 'datas', scale: scale, rows: rows }, warn: warn, kind: 'Tabela (cronograma)' };
    }

    /** Célula RACI escrita de vários jeitos: letra, palavra ou combinação. */
    function raciDe(t) {
        var s = String(t == null ? '' : t).trim();
        if (!s || /^[—–\-·.]$/.test(s)) { return { v: '' }; }
        var up = s.toUpperCase().replace(/[^A-Z]/g, ' ').trim();
        if (/^[RACI]$/.test(up)) { return { v: up }; }
        var n = norm(s);
        if (/^(respons|exec|responsible)/.test(n)) { return { v: 'R' }; }
        if (/^(aprov|autorid|account|presta contas)/.test(n)) { return { v: 'A' }; }
        if (/^(consult)/.test(n)) { return { v: 'C' }; }
        if (/^(inform)/.test(n)) { return { v: 'I' }; }
        var letras = (up.match(/\b[RACI]\b/g) || []);
        if (letras.length) {
            var v = letras.indexOf('A') >= 0 ? 'A' : letras[0];
            return { v: v, multi: letras.length > 1 ? s : '' };
        }
        return { v: '', bad: s };
    }
    function readRaci(txt) {
        var tabs = mdTables(txt), tab = null;
        for (var k = 0; k < tabs.length && !tab; k++) {
            var ok = tabs[k].rows.some(function (r) { return r.slice(1).some(function (c) { return /^[RACI]$/i.test(String(c).trim()); }); });
            if (ok) { tab = tabs[k]; }
        }
        if (!tab) { return { err: 'Não encontrei uma matriz RACI. A tabela precisa da atividade na primeira coluna, uma coluna por papel e células com R, A, C ou I.' }; }
        var warn = [], idx = [], roles = [];
        tab.head.forEach(function (h, i) { if (i > 0 && String(h).trim() && idx.length < 104) { idx.push(i); roles.push(String(h).trim().slice(0, 60)); } });
        if (tab.head.length - 1 > 104) { warn.push('Papéis além do limite de 104 ficaram de fora.'); }
        var rows = [], multi = 0, ruins = 0;
        tab.rows.filter(function (r) { return String(r[0] || '').trim() || r.slice(1).some(function (c) { return String(c).trim(); }); }).slice(0, 300).forEach(function (r) {
            rows.push({
                name: String(r[0] || '').trim().slice(0, 200),
                cells: idx.map(function (i) { var x = raciDe(r[i]); if (x.multi) { multi++; } if (x.bad) { ruins++; } return x.v; })
            });
        });
        if (multi) { warn.push(multi + (multi === 1 ? ' célula tinha' : ' células tinham') + ' mais de uma letra (ex.: "R/A"): ficou uma só, com prioridade para o A.'); }
        if (ruins) { warn.push(ruins + (ruins === 1 ? ' célula não era' : ' células não eram') + ' R, A, C ou I e ficaram vazias.'); }
        var semA = rows.filter(function (r) { return r.cells.filter(function (v) { return v === 'A'; }).length !== 1; }).length;
        if (semA) { warn.push(semA + (semA === 1 ? ' atividade está' : ' atividades estão') + ' sem A ou com mais de um A (aparece o aviso na matriz).'); }
        return { data: { kind: 'raci', roles: roles, rows: rows }, warn: warn, kind: 'Tabela (matriz RACI)' };
    }

    /** Confere e normaliza uma grade vinda de cópia (.json). null se não servir. */
    function normGrid(g) {
        if (!g || typeof g !== 'object') { return null; }
        var rows = Array.isArray(g.rows) ? g.rows.filter(function (r) { return r && typeof r === 'object'; }).slice(0, 300) : [];
        var txt = function (v, n) { return String(v == null ? '' : v).slice(0, n); };
        if (g.kind === 'cronograma' && g.mode === 'datas') {
            return {
                kind: 'cronograma', mode: 'datas', scale: ESCALAS[g.scale] ? g.scale : 'S',
                rows: rows.map(function (r) {
                    var nm = txt(r.name, 200), ow = txt(r.owner, 120);
                    var o;
                    if (r.type === 'fase') { o = { type: 'fase', name: nm, owner: ow }; } else {
                        var a = dn(r.start), b = dn(r.end);
                        if (a == null || b == null) { a = b = (a == null ? b : a); }
                        if (a != null && b < a) { var t = a; a = b; b = t; }
                        o = r.type === 'marco' ? { type: 'marco', name: nm, owner: ow, start: a == null ? '' : iso(a), end: a == null ? '' : iso(a) }
                            : { name: nm, owner: ow, start: a == null ? '' : iso(a), end: b == null ? '' : iso(b) };
                    }
                    // Q7b-4: a cópia leva o id (a situação continua valendo no mesmo documento).
                    if (typeof r.id === 'string' && ID_OK.test(r.id)) { o.id = r.id; }
                    return o;
                })
            };
        }
        if (g.kind !== 'cronograma' && g.kind !== 'raci') { return null; }
        var rc = g.kind === 'raci', key = rc ? 'roles' : 'periods', ok = rc ? RACI : SCHED;
        var cl = Array.isArray(g[key]) ? g[key].slice(0, 104).map(function (c) { return txt(c, 60); }) : [];
        if (!cl.length) { return null; }
        // Mesma ordem de chaves do Diagram::validateGrid (kind, colunas, rows, unit).
        var out = { kind: g.kind };
        out[key] = cl;
        out.rows = rows.map(function (r) {
                var cells = cl.map(function (x, i) { var v = Array.isArray(r.cells) ? String(r.cells[i] == null ? '' : r.cells[i]) : ''; return ok.indexOf(v) >= 0 ? v : ''; });
                var o = { name: txt(r.name, 200), cells: cells };
                if (!rc) { o.owner = txt(r.owner, 120); }
                return o;
            });
        if (!rc) { out.unit = UNITS[g.unit] ? g.unit : 'S'; }
        return out;
    }

    /**
     * Lê o que veio (arquivo ou colado) para uma grade do tipo `alvo`
     * ('cronograma' ou 'raci'): cópia do Codex+ (.json), grade crua ou tabela.
     */
    function readGrid(txt, alvo) {
        var s = String(txt || '').replace(/^\uFEFF/, '').trim();
        if (!s) { return { err: 'Não veio nada: o arquivo ou o texto colado está vazio.' }; }
        var nomeAlvo = alvo === 'raci' ? 'matriz RACI' : 'cronograma';
        var js = s.replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/, '$1');
        if (/^[\[{]/.test(js)) {
            var o;
            try { o = JSON.parse(js); } catch (e) { return { err: 'O arquivo parece JSON, mas não abre (está incompleto ou foi alterado à mão).' }; }
            if (o && o.formato && o.formato !== IO_FORMATO) {
                return { err: o.formato === 'codexplus-quadro' ? 'Este arquivo é uma cópia de quadro (fluxograma, planta, topologia ou organograma), não de ' + nomeAlvo + '.' : 'Este arquivo não é uma cópia do Codex+.' };
            }
            var g = o && o.formato === IO_FORMATO ? o.grade : o;
            var kd = g && (g.kind === 'raci' ? 'raci' : g.kind === 'cronograma' ? 'cronograma' : null);
            if (!kd) { return { err: 'Este conteúdo não é um cronograma nem uma matriz RACI do Codex+.' }; }
            if (kd !== alvo) { return { err: 'Este arquivo é ' + (kd === 'raci' ? 'uma matriz RACI' : 'um cronograma') + '; aqui é ' + (alvo === 'raci' ? 'uma matriz RACI' : 'um cronograma') + '.' }; }
            var n = normGrid(g);
            if (!n) { return { err: 'A cópia está incompleta: faltam as colunas.' }; }
            return { data: n, warn: [], kind: 'Cópia do Codex+', title: o && o.formato === IO_FORMATO ? String(o.titulo || '') : '' };
        }
        var r = alvo === 'raci' ? readRaci(s) : readCrono(s);
        if (r.err) {
            // Tabela do outro tipo: diz o que é, em vez de "não encontrei".
            var outro = alvo === 'raci' ? readCrono(s) : readRaci(s);
            if (!outro.err) { r.err = 'Isto parece ' + (alvo === 'raci' ? 'um cronograma' : 'uma matriz RACI') + '; aqui é ' + (alvo === 'raci' ? 'uma matriz RACI' : 'um cronograma') + '.'; }
            return r;
        }
        var tt = /^#\s+(.+)$/m.exec(s);
        r.title = tt ? tt[1].trim() : '';
        return r;
    }

    function mount(root) {
        if (root.__cxGrid) { return root.__cxGrid; }
        var src = document.getElementById(root.getAttribute('data-source') || '');
        var S;
        try { S = JSON.parse(src ? src.textContent : '{}'); } catch (e) { S = {}; }
        var raci = S.kind === 'raci';
        var colKey = raci ? 'roles' : 'periods';
        // Q7b-1: com datas, nada de periods/unit no JSON (o servidor também tira).
        var dated = !raci && S.mode === 'datas';
        if (dated) {
            normDated();
        } else {
            if (!Array.isArray(S[colKey])) { S[colKey] = []; }
            if (!Array.isArray(S.rows)) { S.rows = []; }
            if (!raci && !UNITS[S.unit]) { S.unit = 'S'; }
        }
        var editable = root.getAttribute('data-editable') === '1';
        var input = document.getElementById(root.getAttribute('data-input') || '');
        var saveUrl = root.getAttribute('data-save') || '';
        var docId = root.getAttribute('data-doc') || '';
        var title = root.getAttribute('data-title') || '';
        var code = root.getAttribute('data-code') || '';
        var sign = root.getAttribute('data-sign') || ''; // A-2b
        var hist = [], autoTimer = null, salvando = false, denovo = false;
        // Q7b-4: situação das tarefas (só na leitura do publicado). ST.map = { id: { state, start, done, user, when } }.
        var ST = null, marcadas = {}, enviando = false;
        (function () {
            var src = root.getAttribute('data-status');
            if (!src || editable) { return; }
            var el = document.getElementById(src), mp = {};
            try { mp = JSON.parse(el ? el.textContent : '{}'); } catch (e) { mp = {}; }
            // Q7c-2: todas as marcações por tarefa ({ id: [{ acao, data, user, when }] }).
            var he = document.getElementById(root.getAttribute('data-hist') || ''), hs = {};
            try { hs = JSON.parse(he ? he.textContent : '{}'); } catch (e) { hs = {}; }
            ST = {
                hist: hs && typeof hs === 'object' && !Array.isArray(hs) ? hs : {},
                map: mp && typeof mp === 'object' && !Array.isArray(mp) ? mp : {},
                can: root.getAttribute('data-can-mark') === '1',
                url: root.getAttribute('data-status-url') || ''
            };
            if (!ST.url) { ST.can = false; }
        })();

        function ser() { return JSON.stringify(S); }
        function normDated() {
            if (!ESCALAS[S.scale]) { S.scale = 'S'; }
            if (!Array.isArray(S.rows)) { S.rows = []; }
            S.rows = S.rows.filter(function (r) { return r && typeof r === 'object'; }).map(function (r) {
                var nm = String(r.name || ''), ow = String(r.owner || '');
                // Q7b-2: fase não guarda datas (o resumo é calculado); marco tem uma data só.
                var o;
                if (r.type === 'fase') { o = { type: 'fase', name: nm, owner: ow }; } else {
                    var a = dn(r.start), b = dn(r.end);
                    if (a == null || b == null) { a = b = (a == null ? b : a); }
                    if (a != null && b < a) { var t = a; a = b; b = t; }
                    o = r.type === 'marco' ? { type: 'marco', name: nm, owner: ow, start: a == null ? '' : iso(a), end: a == null ? '' : iso(a) }
                        : { name: nm, owner: ow, start: a == null ? '' : iso(a), end: b == null ? '' : iso(b) };
                }
                if (typeof r.id === 'string') { o.id = r.id; }
                return o;
            });
            garanteIds(S.rows);
        }
        function snapshot() { hist.push(ser()); if (hist.length > 50) { hist.shift(); } }
        function cols() { return S[colKey]; }

        function changed() {
            if (!raci && S.mode === 'datas') { garanteIds(S.rows); }
            if (input) { input.value = ser(); }
            render();
            agenda();
        }

        /* ---------- salvamento automático (mesmo do organograma) ---------- */
        function estado(t, cls) {
            var el = root.querySelector('.cx-grid-savestate');
            if (el) { el.textContent = t; el.className = 'cx-grid-savestate' + (cls ? ' is-' + cls : ''); }
        }
        function tokenEl() {
            var f = root.closest('form');
            return f ? f.querySelector('[name="_glpi_csrf_token"]') : null;
        }
        function agenda() {
            if (!editable || !saveUrl || !docId) { return; }
            if (autoTimer) { clearTimeout(autoTimer); }
            estado('alterações não salvas', 'pendente');
            autoTimer = setTimeout(salva, AUTO_MS);
        }
        function salva() {
            autoTimer = null;
            if (salvando) { denovo = true; return; }
            var tk = tokenEl();
            if (!tk) { return; }
            salvando = true;
            estado('salvando…', 'salvando');
            var corpo = new FormData();
            corpo.append('id', docId);
            corpo.append('_diagram', ser());
            corpo.append('_glpi_csrf_token', tk.value);
            fetch(saveUrl, { method: 'POST', body: corpo, credentials: 'same-origin' })
                .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { throw new Error(j.erro || r.status); } return j; }); })
                .then(function (j) {
                    salvando = false;
                    // Token consumido a cada POST (achado 43): o novo vai para todos.
                    if (j.csrf) { document.querySelectorAll('[name="_glpi_csrf_token"]').forEach(function (i) { i.value = j.csrf; }); }
                    estado('salvo às ' + (j.hora || ''), 'ok');
                    if (denovo) { denovo = false; agenda(); }
                })
                .catch(function () {
                    salvando = false;
                    estado('não foi possível salvar sozinho: use o Salvar', 'erro');
                });
        }

        /* ---------- edição de texto no lugar ---------- */
        function editText(el, atual, grava) {
            var inp = document.createElement('input');
            inp.type = 'text';
            inp.className = 'cx-grid-input';
            inp.value = atual;
            el.textContent = '';
            el.appendChild(inp);
            // Q7b-2: célula em edição (esconde os botões da linha; o render tira a marca).
            var tdEd = el.closest('td');
            if (tdEd) { tdEd.classList.add('is-editando'); }
            inp.focus();
            inp.select();
            var feito = false;
            function fim(ok) {
                if (feito) { return; }
                feito = true;
                if (ok && inp.value !== atual) {
                    snapshot();
                    var msg = grava(inp.value.trim());
                    // Q7b-1: data inválida volta ao que era, com o motivo na barra.
                    if (typeof msg === 'string') { hist.pop(); render(); avisa(msg); return; }
                    changed();
                } else { render(); }
            }
            inp.addEventListener('keydown', function (e) {
                // O editor vive dentro do formulário do documento: Enter não envia.
                if (e.key === 'Enter') { e.preventDefault(); fim(true); }
                if (e.key === 'Escape') { e.preventDefault(); fim(false); }
            });
            inp.addEventListener('blur', function () { fim(true); });
        }

        /* ---------- desenho ---------- */
        function cellHtml(v, r, c) {
            if (raci) {
                return '<td class="cx-grid-cell cx-raci-' + (v || 'x') + '" data-r="' + r + '" data-c="' + c + '">' + esc(v) + '</td>';
            }
            return '<td class="cx-grid-cell cx-sched-' + (v || 'x') + '" data-r="' + r + '" data-c="' + c + '"' +
                (v === 'm' ? ' title="Marco"' : '') + '>' + (v === 'm' ? '<i class="ti ti-flag"></i>' : '') + '</td>';
        }
        function aviso(row) {
            if (!raci) { return ''; }
            var n = row.cells.filter(function (v) { return v === 'A'; }).length;
            if (n === 1) { return ''; }
            return ' <i class="ti ti-alert-triangle cx-grid-warn" title="' +
                (n ? 'Mais de um A: só um papel deve responder pela atividade' : 'Sem A: falta quem responde pela atividade') + '"></i>';
        }
        function tableHtml(forPrint, from, to) {
            var ed = editable && !forPrint;
            from = from || 0;
            to = to == null ? cols().length : to;
            var idx = [];
            for (var k = from; k < to; k++) { idx.push(k); }
            var wn = forPrint ? W.pName : W.name, wo = forPrint ? W.pOwner : W.owner;
            var wc = raci ? (forPrint ? W.pRaci : W.raci) : (forPrint ? W.pSched : W.sched);
            var h = '<table class="cx-grid-table" style="width:' + (wn + (raci ? 0 : wo) + wc * idx.length) + 'px"><colgroup>' +
                '<col style="width:' + wn + 'px">' + (raci ? '' : '<col style="width:' + wo + 'px">') +
                idx.map(function () { return '<col style="width:' + wc + 'px">'; }).join('') + '</colgroup>' +
                '<thead><tr><th class="cx-grid-name">' + (raci ? 'Atividade' : 'Tarefa') + '</th>' +
                (raci ? '' : '<th class="cx-grid-owner">Responsável</th>');
            idx.forEach(function (i) {
                var c = cols()[i];
                h += '<th class="cx-grid-col" title="' + esc(c) + '"><span' + (ed ? ' data-edit-col="' + i + '"' : '') + '>' + esc(c || '—') + '</span>' +
                    (ed ? '<button type="button" class="cx-grid-del" data-del-col="' + i + '" title="Tirar coluna" aria-label="Tirar coluna"><i class="ti ti-x"></i></button>' : '') + '</th>';
            });
            h += '</tr></thead><tbody>';
            S.rows.forEach(function (row, r) {
                h += '<tr><td class="cx-grid-name"><span' + (ed ? ' data-edit-name="' + r + '"' : '') + '>' +
                    (row.name ? esc(row.name) : (ed ? '<em>clique para nomear</em>' : '')) + '</span>' + aviso(row) +
                    (ed ? '<button type="button" class="cx-grid-del" data-del-row="' + r + '" title="Tirar linha" aria-label="Tirar linha"><i class="ti ti-x"></i></button>' : '') + '</td>';
                if (!raci) {
                    h += '<td class="cx-grid-owner"><span' + (ed ? ' data-edit-owner="' + r + '"' : '') + '>' + esc(row.owner || (ed ? '—' : '')) + '</span></td>';
                }
                idx.forEach(function (c) { h += cellHtml(row.cells[c] || '', r, c); });
                h += '</tr>';
            });
            h += '</tbody></table>';
            return h;
        }
        function legendHtml() {
            if (raci) {
                return Object.keys(RACI_LABEL).map(function (k) {
                    return '<span><b class="cx-raci-' + k + '">' + k + '</b>' + RACI_LABEL[k] + '</span>';
                }).join('');
            }
            return '<span><b class="cx-sched-b"></b>Período</span><span><b class="cx-sched-m"><i class="ti ti-flag"></i></b>Marco (entrega)</span>';
        }
        /* ---------- Tela cheia (Claudio, 04/10/2026), igual à do organograma:
           API do navegador e, se recusada, classe de reserva (is-full). ---------- */
        function cheia() { return root.classList.contains('is-full'); }
        /**
         * Fim da barra: Tela cheia e Exportar PDF. Na leitura o PDF fica
         * escondido (quem o aciona é o Exportar PDF do topo da página, D1-4),
         * menos em tela cheia, quando o topo da página não aparece.
         */
        function botoesFim() {
            var on = cheia();
            return '<button type="button" class="codexplus-btn" data-act="full" title="' + (on ? 'Sair da tela cheia (Esc)' : 'Mostrar na tela inteira') + '">' +
                '<i class="ti ' + (on ? 'ti-minimize' : 'ti-maximize') + '"></i> ' + (on ? 'Sair da tela cheia' : 'Tela cheia') + '</button>' +
                '<button type="button" class="codexplus-btn" data-act="pdf"' + (editable || on ? '' : ' hidden') + '><i class="ti ti-file-type-pdf"></i> Exportar PDF</button>';
        }
        /** Guarda a rolagem antes de redesenhar e devolve quem a repõe. */
        function rolagem() {
            var w = root.querySelector('.cx-grid-wrap');
            var x = w ? w.scrollLeft : 0, y = w ? w.scrollTop : 0;
            return function () {
                var n = root.querySelector('.cx-grid-wrap');
                if (n && (x || y)) { n.scrollLeft = x; n.scrollTop = y; }
            };
        }
        function setFull(on) {
            if (on === cheia()) { return; }
            root.classList.toggle('is-full', on);
            if (on) { document.addEventListener('keydown', escFull, true); } else { document.removeEventListener('keydown', escFull, true); }
            render();
        }
        // Reserva por CSS: o Esc não vem do navegador, então sai por aqui
        // (com o diálogo de importar aberto, o Esc fecha só o diálogo).
        function escFull(e) {
            if (e.key !== 'Escape' || io || document.querySelector('.cx-gd-dlg') || document.fullscreenElement === root) { return; }
            e.preventDefault();
            setFull(false);
        }
        function toggleFull() {
            var on = !cheia();
            if (root.requestFullscreen) {
                if (on) {
                    var pr = root.requestFullscreen();
                    if (pr && pr.catch) { pr.catch(function () { setFull(true); }); }
                } else if (document.fullscreenElement) { document.exitFullscreen(); } else { setFull(false); }
            } else { setFull(on); }
        }
        document.addEventListener('fullscreenchange', function () {
            if (document.fullscreenElement === root) { setFull(true); } else if (cheia() && document.fullscreenElement !== root) { setFull(false); }
        });

        function render() {
            dated = !raci && S.mode === 'datas';
            dica();
            if (dated) { renderDated(); return; }
            var bar = '<div class="cx-grid-bar">';
            if (editable) {
                bar += '<button type="button" class="codexplus-btn" data-act="row"><i class="ti ti-row-insert-bottom"></i> ' + (raci ? 'Atividade' : 'Tarefa') + '</button>' +
                    '<button type="button" class="codexplus-btn" data-act="col"><i class="ti ti-column-insert-right"></i> ' + (raci ? 'Papel' : 'Período') + '</button>' +
                    (raci ? '' : '<select class="cx-grid-unit form-select" aria-label="Unidade dos períodos">' +
                        Object.keys(UNITS).map(function (u) { return '<option value="' + u + '"' + (S.unit === u ? ' selected' : '') + '>' + UNITS[u] + '</option>'; }).join('') +
                        '</select>') +
                    '<button type="button" class="codexplus-btn" data-act="undo"' + (hist.length ? '' : ' disabled') + '><i class="ti ti-arrow-back-up"></i> Desfazer</button>' +
                    (raci ? '' : '<button type="button" class="codexplus-btn" data-act="datas" title="Passar para datas reais (Desfazer volta)"><i class="ti ti-calendar-event"></i> Usar datas</button>') +
                    ioBotoes() +
                    '<span class="cx-grid-savestate"></span>';
            }
            bar += '<span class="cx-grid-spacer"></span>' + botoesFim() + '</div>';
            var rol = rolagem();
            root.innerHTML = '<div class="cx-grid' + (raci ? ' cx-grid--raci' : ' cx-grid--sched') + '">' + bar +
                '<div class="cx-grid-wrap">' + tableHtml(false) + '</div><div class="cx-grid-legend">' + legendHtml() + '</div></div>';
            rol();
        }

        /* =========== Q7b-1/Q7b-2: cronograma com datas (tarefas, fases e marcos) =========== */
        // Fases recolhidas: só na tela (não vai para o JSON nem dispara salvamento).
        var fechadas = new WeakSet();
        var selRow = null; // linha selecionada (só na tela)
        function tipo(r) { return r && (r.type === 'fase' || r.type === 'marco') ? r.type : 'tarefa'; }
        function avisa(t, ok) {
            var el = root.querySelector('.cx-gd-msg');
            if (!el) { return; }
            el.textContent = t;
            el.classList.toggle('is-ok', !!ok);
            el.hidden = false;
            clearTimeout(el.__t);
            el.__t = setTimeout(function () { el.hidden = true; }, 6000);
        }
        /** Texto de ajuda abaixo da grade (o template deixa o lugar marcado). */
        function dica() {
            var h = root.parentNode && root.parentNode.querySelector('[data-cx-grid-hint]');
            if (!h || raci) { return; }
            h.textContent = dated
                ? 'Arraste a barra ou o marco para mover e puxe as pontas da barra para mudar o início ou o fim. Numa linha sem datas, clique ou arraste na linha do tempo. Clique em tarefa, responsável, início ou fim para editar (dd/mm ou dd/mm/aaaa; mudar o início mantém a duração). A fase leva as linhas abaixo dela até a próxima fase, e o resumo dela é calculado; ▾ recolhe. Clique numa linha para selecionar: Fase, Tarefa e Marco entram logo abaixo dela. Setas ao passar o mouse sobre o nome sobem ou descem a linha (a primeira fase não sobe acima das tarefas soltas; para pôr uma tarefa solta na fase, desça a tarefa).'
                : 'Clique na célula para trocar entre vazio, período (barra) e marco. Clique no nome de uma tarefa, responsável ou período para editar. "Usar datas" passa o cronograma para datas reais.';
        }
        /**
         * Q7b-2: a fase leva as linhas abaixo dela até a próxima fase.
         * num = numeração automática (1, 1.1…); fase = índice da fase dona
         * (-1 = solta); a/b da fase = do primeiro início ao último fim das
         * linhas dela (tarefas e marcos).
         */
        function gdEstrutura() { return estruturaDe(S.rows); }
        /* =================== Q7b-4: situação (calculada na hora) =================== */
        function stOn() { return !!ST && dated; }
        function quando(rec) {
            if (!rec || !rec.when) { return ''; }
            var w = String(rec.when), d = dn(w.slice(0, 10));
            return (rec.user ? ' por ' + rec.user : '') + (d != null ? ' em ' + br(d) + (w.length >= 16 ? ', ' + w.slice(11, 16) : '') : '');
        }
        /**
         * Situação de uma tarefa: k = ok (concluída no prazo), okatraso
         * (concluída depois do Fim), atrasada (passou do Fim sem concluir),
         * andamento ou nao (não iniciada).
         */
        function sitTarefa(row, hj) {
            var rec = (ST && row.id && ST.map[row.id]) || null;
            var b = dn(row.end), done = rec && rec.state === 'concluida' ? dn(rec.done) : null;
            var tip = rec ? (rec.state === 'concluida' ? 'Concluída' : 'Iniciada') + quando(rec) : '';
            if (done != null) {
                if (b != null && done > b) { return { k: 'okatraso', txt: '✓ concluída em ' + brCurto(done) + ' (atraso)', tip: tip, done: done }; }
                return { k: 'ok', txt: '✓ concluída ' + brCurto(done), tip: tip, done: done };
            }
            if (b != null && b < hj) { return { k: 'atrasada', txt: '● atrasada ' + (hj - b) + ' d', tip: tip || 'Passou do fim (' + br(b) + ') sem concluir', fim: b }; }
            if (rec && rec.state === 'andamento') { return { k: 'andamento', txt: '● em andamento', tip: tip }; }
            return { k: 'nao', txt: '○ não iniciada', tip: '' };
        }
        /** Fase: % de tarefas concluídas e quantas atrasadas. */
        function sitFase(i, est, hj) {
            var tot = 0, ok = 0, atr = 0;
            S.rows.forEach(function (r, k) {
                if (est[k].fase !== i || tipo(r) !== 'tarefa') { return; }
                var x = sitTarefa(r, hj).k;
                tot++;
                if (x === 'ok' || x === 'okatraso') { ok++; }
                if (x === 'atrasada') { atr++; }
            });
            if (!tot) { return null; }
            var pct = Math.round(ok * 100 / tot);
            return { pct: pct, atr: atr, txt: pct + '%' + (atr ? ' · ' + atr + (atr === 1 ? ' atrasada' : ' atrasadas') : ''), k: atr ? 'atrasada' : (pct === 100 ? 'ok' : 'nao') };
        }
        /**
         * Marco: as tarefas acima dele, na mesma fase (ou soltas no topo).
         * Atingido quando todas estão concluídas até a data dele; atrasado
         * quando a data passou e falta tarefa.
         */
        function sitMarco(i, est, hj) {
            var m = dn(S.rows[i].start), tot = 0, ok = 0, ult = null;
            for (var k = 0; k < i; k++) {
                if (est[k].fase !== est[i].fase || tipo(S.rows[k]) !== 'tarefa') { continue; }
                var x = sitTarefa(S.rows[k], hj);
                tot++;
                if (x.done != null) { ok++; ult = ult == null ? x.done : Math.max(ult, x.done); }
            }
            if (!tot || m == null) { return null; }
            if (ok === tot) {
                if (ult > m) { return { k: 'okatraso', txt: '◆ atingido em ' + brCurto(ult) + ' (atraso)' }; }
                return { k: 'ok', txt: '◆ atingido ' + brCurto(ult) };
            }
            if (m < hj) { return { k: 'atrasada', txt: '◆ atrasado' }; }
            return { k: 'nao', txt: '◆ previsto' };
        }
        /** Resumo do topo (mockup): concluídas, atrasadas, concluídas com atraso, marcos atrasados. */
        function resumoSit(est, hj) {
            var tot = 0, ok = 0, atr = 0, okat = 0, mat = 0;
            S.rows.forEach(function (r, i) {
                if (tipo(r) === 'tarefa') {
                    var x = sitTarefa(r, hj).k;
                    tot++;
                    if (x === 'ok' || x === 'okatraso') { ok++; }
                    if (x === 'okatraso') { okat++; }
                    if (x === 'atrasada') { atr++; }
                } else if (tipo(r) === 'marco') {
                    var mm = sitMarco(i, est, hj);
                    if (mm && mm.k === 'atrasada') { mat++; }
                }
            });
            var h = '<div class="cx-gd-sumario"><span><b>' + ok + ' de ' + tot + '</b> ' + (tot === 1 ? 'tarefa concluída' : 'tarefas concluídas') + '</span>';
            if (atr) { h += '<span class="is-atrasada"><b>' + atr + '</b> ' + (atr === 1 ? 'atrasada' : 'atrasadas') + '</span>'; }
            if (okat) { h += '<span class="is-okatraso"><b>' + okat + '</b> ' + (okat === 1 ? 'concluída' : 'concluídas') + ' com atraso</span>'; }
            if (mat) { h += '<span class="is-atrasada"><b>' + mat + '</b> ' + (mat === 1 ? 'marco atrasado' : 'marcos atrasados') + '</span>'; }
            // Última marcação (quem e quando).
            var ult = null;
            Object.keys(ST.map).forEach(function (k) { var r = ST.map[k]; if (r && r.when && (!ult || r.when > ult.when)) { ult = { k: k, state: r.state, user: r.user, when: r.when }; } });
            if (ult) {
                var nm = '';
                S.rows.forEach(function (r) { if (r.id === ult.k) { nm = r.name; } });
                h += '<span class="cx-gd-ultima">Última marcação: ' + esc((nm ? nm + ' ' : '') + (ult.state === 'concluida' ? 'concluída' : 'iniciada') + quando(ult)) + '</span>';
            }
            return h + '</div>';
        }

        /** Colunas da linha do tempo: semanas (segunda a domingo) ou meses, com folga no fim. */
        function gdUnits() {
            var lo = null, hi = null;
            S.rows.forEach(function (r) {
                var a = dn(r.start), b = dn(r.end);
                if (a != null) { lo = lo == null ? a : Math.min(lo, a); }
                if (b != null) { hi = hi == null ? b : Math.max(hi, b); }
            });
            if (lo == null) { lo = hoje(); }
            if (hi == null || hi < lo) { hi = lo; }
            if (stOn()) { hi = Math.max(hi, hoje()); } // a extensão do atraso vai até hoje
            var u = [], i, n, s0;
            if (S.scale === 'M') {
                var a0 = ymd(lo), b0 = ymd(hi);
                n = Math.max(4, (b0.y - a0.y) * 12 + (b0.m - a0.m) + 2);
                for (i = 0; i < n; i++) {
                    s0 = inicioMes(a0.y, a0.m + i);
                    var md = ymd(s0);
                    u.push({ s: s0, n: inicioMes(a0.y, a0.m + i + 1) - s0, label: MES[md.m], tip: MES[md.m] + ' de ' + md.y });
                }
            } else {
                s0 = lo - diaSemana(lo);
                n = Math.max(8, Math.floor((hi - s0) / 7) + 2);
                for (i = 0; i < n; i++) {
                    u.push({ s: s0 + 7 * i, n: 7, label: brCurto(s0 + 7 * i), tip: 'Semana de ' + br(s0 + 7 * i) + ' a ' + br(s0 + 7 * i + 6) });
                }
            }
            return u;
        }
        /**
         * Faixa de cima do cabeçalho (mockup Q7b): meses curtos ("ago", "set";
         * janeiro leva o ano) na escala de semanas; anos na escala de meses.
         */
        function gdBands(t0, t1) {
            var out = [], s0 = t0;
            // Semanas: como no mockup, a faixa do mês segue as colunas (a semana é do mês da segunda-feira).
            if (S.scale !== 'M') {
                gdUnits().forEach(function (u) {
                    if (u.s < t0 || u.s >= t1) { return; }
                    var c = ymd(u.s), ult = out[out.length - 1];
                    if (ult && ult.m === c.m && ult.y === c.y) { ult.e = u.s + u.n; return; }
                    out.push({ s: u.s, e: u.s + u.n, m: c.m, y: c.y, label: MES[c.m] + (c.m === 0 ? ' ' + c.y : ''), tip: MES[c.m] + ' de ' + c.y });
                });
                return out;
            }
            while (s0 < t1) {
                var c = ymd(s0);
                var nx = S.scale === 'M' ? inicioMes(c.y + 1, 0) : inicioMes(c.y, c.m + 1);
                var e = Math.min(nx, t1);
                out.push({ s: s0, e: e, label: S.scale === 'M' ? String(c.y) : MES[c.m] + (c.m === 0 ? ' ' + c.y : ''), tip: S.scale === 'M' ? String(c.y) : MES[c.m] + ' de ' + c.y });
                s0 = e;
            }
            return out;
        }
        // Q7c-1 (Claudio, 04/10/2026): na tela cheia a linha do tempo estica até a
        // largura da tela (px por dia calculado depois de desenhar); nunca abaixo do
        // padrão, que segue valendo fora dela e no PDF.
        var pxCheia = null, passesCheia = 0;
        function gdPx(forPrint) {
            if (!forPrint && pxCheia && cheia()) { return pxCheia; }
            return forPrint ? (S.scale === 'M' ? GD.pxMp : GD.pxSp) : (S.scale === 'M' ? GD.pxM : GD.pxS);
        }
        function gdFixed(forPrint) {
            var sit = stOn() ? (forPrint ? GD.pSit : GD.sit + (ST.can ? GD.chk : 0)) : 0;
            return sit + (forPrint ? GD.pN + GD.pName + GD.pOwner + 2 * GD.pDate : GD.n + GD.name + GD.owner + 2 * GD.date);
        }
        /** Tarefas marcadas (caixinhas) que ainda existem. */
        function idsMarcados() {
            return S.rows.filter(function (r) { return tipo(r) === 'tarefa' && r.id && marcadas[r.id]; }).map(function (r) { return r.id; });
        }
        /** Linhas que aparecem: as de fase recolhida somem (tela e PDF). */
        function gdVisiveis(est) {
            var v = [];
            S.rows.forEach(function (row, r) {
                if (est[r].fase >= 0 && fechadas.has(S.rows[est[r].fase])) { return; }
                v.push(r);
            });
            return v;
        }
        /** Data curta (dd/mm) com a completa no title, como no mockup. */
        function dataCel(n, attrs) {
            return '<span' + (n != null ? ' title="' + br(n) + '"' : '') + (attrs || '') + '>' + (n != null ? brCurto(n) : '') + '</span>';
        }
        function gdTable(forPrint, uFrom, uTo, pxF) {
            var units = gdUnits(), est = gdEstrutura();
            uFrom = uFrom || 0;
            uTo = uTo == null ? units.length : uTo;
            var ed = editable && !forPrint;
            var px = pxF || gdPx(forPrint);
            var t0 = units[uFrom].s, t1 = units[uTo - 1].s + units[uTo - 1].n, tw = (t1 - t0) * px;
            var wN = forPrint ? GD.pN : GD.n, wn = forPrint ? GD.pName : GD.name, wo = forPrint ? GD.pOwner : GD.owner, wd = forPrint ? GD.pDate : GD.date;
            // Q7b-4: com situação, caixinha à esquerda (quem marca, só na tela) e coluna Situação depois do Fim.
            var so = stOn(), ck = so && ST.can && !forPrint;
            var wC = ck ? GD.chk : 0, wS = so ? (forPrint ? GD.pSit : GD.sit) : 0;
            var fixo = wC + wN + wn + wo + 2 * wd + wS;
            // Colunas fixas ao rolar: a posição de cada uma (na tela).
            var esq = {}, acc = 0;
            [['chk', wC], ['n', wN], ['name', wn], ['owner', wo], ['ini', wd], ['fim', wd], ['sit', wS]].forEach(function (c) { esq[c[0]] = acc; acc += c[1]; });
            var L = function (k) { return forPrint ? '' : ' style="left:' + esq[k] + 'px"'; };
            var bands = gdBands(t0, t1), hj = hoje();
            var mesX = {}, seps = '', heads = '', bandH = '';
            bands.forEach(function (b, k) {
                var l = (b.s - t0) * px;
                if (k > 0) { mesX[l] = 1; seps += '<i class="cx-gd-sep is-mes" style="left:' + l + 'px"></i>'; }
                bandH += '<span class="cx-gd-band" title="' + esc(b.tip) + '" style="left:' + l + 'px;width:' + ((b.e - b.s) * px) + 'px">' + esc(b.label) + '</span>';
            });
            for (var k = uFrom; k < uTo; k++) {
                var l = (units[k].s - t0) * px;
                if (k > uFrom && !mesX[l]) { seps += '<i class="cx-gd-sep" style="left:' + l + 'px"></i>'; }
                heads += '<span class="cx-gd-unit" title="' + esc(units[k].tip) + '" style="left:' + l + 'px;width:' + (units[k].n * px) + 'px">' + esc(units[k].label) + '</span>';
            }
            // Linha "hoje" tracejada, com a etiqueta no pé do cabeçalho (mockup Q7b).
            var hojeX = (hj >= t0 && hj < t1) ? (hj - t0) * px + px / 2 : null;
            var hojeL = hojeX == null ? '' : '<i class="cx-gd-hoje" style="left:' + hojeX + 'px"></i>';
            var hojeH = hojeX == null ? '' : hojeL + '<span class="cx-gd-hoje-rot" style="left:' + hojeX + 'px" title="Hoje, ' + br(hj) + '">hoje</span>';
            var visiveis = gdVisiveis(est);
            var tarefasVis = visiveis.filter(function (r) { return tipo(S.rows[r]) === 'tarefa' && S.rows[r].id; });
            var todas = tarefasVis.length > 0 && tarefasVis.every(function (r) { return marcadas[S.rows[r].id]; });
            var h = '<table class="cx-grid-table cx-gd-table' + (so ? ' cx-gd-table--sit' : '') + '" data-t0="' + t0 + '" data-px="' + px + '" data-fixo="' + fixo + '" style="width:' + (fixo + tw) + 'px"><colgroup>' +
                (ck ? '<col style="width:' + wC + 'px">' : '') +
                '<col style="width:' + wN + 'px"><col style="width:' + wn + 'px"><col style="width:' + wo + 'px"><col style="width:' + wd + 'px"><col style="width:' + wd + 'px">' +
                (so ? '<col style="width:' + wS + 'px">' : '') +
                '<col style="width:' + tw + 'px"></colgroup>' +
                '<thead><tr>' +
                (ck ? '<th class="cx-gd-chk"' + L('chk') + '><input type="checkbox" data-chk-all' + (todas ? ' checked' : '') + ' title="Marcar todas as tarefas visíveis" aria-label="Marcar todas as tarefas visíveis"></th>' : '') +
                '<th class="cx-gd-n"' + L('n') + '>Nº</th><th class="cx-grid-name"' + L('name') + '>Fase, tarefa ou marco</th><th class="cx-gd-owner"' + L('owner') + '>Responsável</th>' +
                '<th class="cx-gd-date cx-gd-ini"' + L('ini') + '>Início</th><th class="cx-gd-date cx-gd-fim"' + L('fim') + '>Fim</th>' +
                (so ? '<th class="cx-gd-sit"' + L('sit') + '>Situação</th>' : '') +
                '<th class="cx-gd-head"><div class="cx-gd-scale" style="width:' + tw + 'px">' + bandH + heads + seps + hojeH + '</div></th></tr></thead><tbody>';
            function barra(a, b, cls, extra, attrs) {
                var s0 = Math.max(a, t0), e0 = Math.min(b + 1, t1);
                if (e0 <= s0) { return ''; }
                return '<div class="' + cls + (a < t0 ? ' is-corta-i' : '') + (b + 1 > t1 ? ' is-corta-f' : '') + '"' + (attrs || '') +
                    ' style="left:' + ((s0 - t0) * px) + 'px;width:' + ((e0 - s0) * px) + 'px">' + (extra || '') + '</div>';
            }
            visiveis.forEach(function (r) {
                var row = S.rows[r], tp = tipo(row), e = est[r];
                // Q7b-4: situação calculada (tarefa, fase ou marco).
                var st = so && tp === 'tarefa' ? sitTarefa(row, hj) : null;
                var sf = so && tp === 'fase' ? sitFase(r, est, hj) : null;
                var sm = so && tp === 'marco' ? sitMarco(r, est, hj) : null;
                var a = dn(row.start), b = dn(row.end);
                if (tp === 'fase') { a = e.a; b = e.b; }
                var tem = a != null && b != null;
                var fechada = tp === 'fase' && fechadas.has(row);
                // Q7c-1: na primeira fase com soltas acima, sem Subir (o espaço fica, para as setas não pularem).
                var semSubir = tp === 'fase' && soltaAcima(r, est);
                var acts = ed ? '<span class="cx-gd-acts">' +
                    (semSubir ? '<span class="cx-gd-act" style="visibility:hidden" aria-hidden="true"><i class="ti ti-arrow-up"></i></span>'
                        : '<button type="button" class="cx-gd-act" data-mv="' + r + '" data-dir="-1" title="Subir" aria-label="Subir"><i class="ti ti-arrow-up"></i></button>') +
                    '<button type="button" class="cx-gd-act" data-mv="' + r + '" data-dir="1" title="Descer" aria-label="Descer"><i class="ti ti-arrow-down"></i></button>' +
                    '<button type="button" class="cx-gd-act" data-del-row="' + r + '" title="Tirar ' + (tp === 'fase' ? 'fase (as linhas dela ficam)' : (tp === 'marco' ? 'marco' : 'tarefa')) + '" aria-label="Tirar"><i class="ti ti-x"></i></button></span>' : '';
                var vazio = { fase: 'nome da fase', marco: 'nome do marco', tarefa: 'clique para nomear' }[tp];
                var marcada = ck && tp === 'tarefa' && row.id && marcadas[row.id];
                h += '<tr class="cx-gd-r-' + tp + (e.fase >= 0 ? ' cx-gd-r-filha' : '') + ((!forPrint && row === selRow) || marcada ? ' is-sel' : '') + '" data-r="' + r + '">' +
                    (ck ? '<td class="cx-gd-chk"' + L('chk') + '>' + (tp === 'tarefa' && row.id ? '<input type="checkbox" data-chk="' + esc(row.id) + '"' + (marcada ? ' checked' : '') + ' aria-label="Marcar ' + esc(row.name || 'tarefa') + '">' : '') + '</td>' : '') +
                    '<td class="cx-gd-n"' + L('n') + '>' + e.num + '</td>' +
                    // Caixa flexível: ▾/◆ no tamanho deles, o nome (ou o campo de edição) com o resto.
                    '<td class="cx-grid-name"' + L('name') + '><div class="cx-gd-nome">' +
                    (tp === 'fase' && !forPrint ? '<button type="button" class="cx-gd-fold" data-fold="' + r + '" aria-expanded="' + (fechada ? 'false' : 'true') + '" title="' + (fechada ? 'Mostrar as linhas da fase' : 'Recolher a fase') + '">' + (fechada ? '▸' : '▾') + '</button>' : '') +
                    (tp === 'marco' ? '<span class="cx-gd-losango" aria-hidden="true">◆</span>' : '') +
                    '<span class="cx-gd-txt"' + (row.name ? ' title="' + esc(row.name) + '"' : '') + (ed ? ' data-edit-name="' + r + '"' : '') + '>' +
                    (row.name ? esc(row.name) : (ed ? '<em>' + vazio + '</em>' : '')) + '</span></div>' + acts + '</td>' +
                    '<td class="cx-gd-owner"' + L('owner') + '><span' + (ed ? ' data-edit-owner="' + r + '"' : '') + (ed && !row.owner ? ' class="cx-gd-vazio" title="Responsável"' : '') + '>' + esc(row.owner || (ed ? '—' : '')) + '</span></td>';
                if (tp === 'fase') {
                    h += '<td class="cx-gd-date cx-gd-ini cx-gd-calc"' + L('ini') + '>' + dataCel(tem ? a : null) + '</td><td class="cx-gd-date cx-gd-fim cx-gd-calc"' + L('fim') + '>' + dataCel(tem ? b : null) + '</td>';
                } else if (tp === 'marco') {
                    h += '<td class="cx-gd-date cx-gd-ini"' + L('ini') + '>' + (tem ? dataCel(a, ed ? ' data-edit-start="' + r + '"' : '') : (ed ? '<span data-edit-start="' + r + '">—</span>' : '')) + '</td>' +
                        '<td class="cx-gd-date cx-gd-fim"' + L('fim') + '></td>';
                } else {
                    h += '<td class="cx-gd-date cx-gd-ini"' + L('ini') + '>' + (tem ? dataCel(a, ed ? ' data-edit-start="' + r + '"' : '') : (ed ? '<span data-edit-start="' + r + '">—</span>' : '')) + '</td>' +
                        '<td class="cx-gd-date cx-gd-fim"' + L('fim') + '>' + (tem ? dataCel(b, ed ? ' data-edit-end="' + r + '"' : '') : (ed ? '<span data-edit-end="' + r + '">—</span>' : '')) + '</td>';
                }
                if (so) {
                    // Q7c-2: na tela, o selo da tarefa abre o balão com todas as marcações.
                    var pill = st && !forPrint && row.id
                        ? '<button type="button" class="cx-gd-pill cx-gd-pill--hist is-' + st.k + '" data-hist-row="' + esc(row.id) + '" aria-haspopup="dialog" title="' +
                            esc((st.tip ? st.tip + ' · ' : '') + 'Clique para ver todas as marcações') + '">' + esc(st.txt) + '</button>'
                        : st ? '<span class="cx-gd-pill is-' + st.k + '"' + (st.tip ? ' title="' + esc(st.tip) + '"' : '') + '>' + esc(st.txt) + '</span>'
                        : sm ? '<span class="cx-gd-pill is-' + sm.k + '">' + esc(sm.txt) + '</span>'
                        : sf ? '<span class="cx-gd-fase-sit is-' + sf.k + '">' + esc(sf.txt) + '</span>' : '';
                    h += '<td class="cx-gd-sit"' + L('sit') + '>' + pill + '</td>';
                }
                h += '<td class="cx-gd-track' + (tem || tp === 'fase' ? '' : ' is-vazia') + (tp === 'fase' ? ' is-fase' : '') + '" data-r="' + r + '"><div class="cx-gd-lane" style="width:' + tw + 'px">' + seps + hojeL;
                if (tem && tp === 'fase') {
                    // Q7b-4: a barra da fase mostra o progresso (o trecho cumprido mais escuro).
                    h += barra(a, b, 'cx-gd-fase-barra' + (sf ? ' has-prog is-' + sf.k : ''), sf ? '<i class="cx-gd-prog" style="width:' + sf.pct + '%"></i>' : '',
                        ' title="' + esc((row.name ? row.name + ': ' : 'Fase: ') + br(a) + ' a ' + br(b) + ' (' + dias(b - a + 1) + ')' + (sf ? ' · ' + sf.txt : '')) + '"');
                } else if (tem && tp === 'marco') {
                    if (a >= t0 && a < t1) {
                        var mx = (a - t0) * px + px / 2;
                        h += '<div class="cx-gd-marco' + (sm ? ' is-' + sm.k : '') + '" data-r="' + r + '" title="' + esc((row.name ? row.name + ': ' : 'Marco: ') + br(a)) + '" style="left:' + mx + 'px"></div>' +
                            '<span class="cx-gd-marco-data' + (sm ? ' is-' + sm.k : '') + '" style="left:' + mx + 'px">' + brCurto(a) + '</span>';
                    }
                } else if (tem) {
                    // Q7b-4: atrasada ganha a extensão até hoje (rosa), por baixo da barra.
                    if (st && st.k === 'atrasada' && b + 1 <= hj) { h += barra(b + 1, hj, 'cx-gd-ext'); }
                    h += barra(a, b, 'cx-gd-barra' + (st ? ' st-' + st.k : ''),
                        (ed ? '<span class="cx-gd-alca is-i" data-h="i" title="Mudar o início"></span><span class="cx-gd-alca is-f" data-h="f" title="Mudar o fim"></span>' : '') +
                        (st && (st.k === 'ok' || st.k === 'okatraso') ? '<span class="cx-gd-ok" aria-hidden="true">✓</span>' : ''),
                        ' data-r="' + r + '" title="' + esc((row.name ? row.name + ': ' : '') + br(a) + ' a ' + br(b) + ' (' + dias(b - a + 1) + ')' + (st ? ' · ' + st.txt : '')) + '"');
                }
                h += '</div></td></tr>';
            });
            h += '</tbody></table>';
            return h;
        }
        function gdLegend() {
            if (stOn()) {
                return '<span><b class="cx-gd-leg st-ok"></b>Concluída</span><span><b class="cx-gd-leg st-okatraso"></b>Concluída com atraso</span>' +
                    '<span><b class="cx-gd-leg st-atrasada"></b>Atrasada</span><span><b class="cx-gd-leg st-andamento"></b>Em andamento</span>' +
                    '<span><b class="cx-gd-leg st-nao"></b>Não iniciada</span>' +
                    '<span><b class="cx-gd-leg-fase"></b>Fase (resumo das tarefas)</span><span><b class="cx-gd-leg-marco">◆</b>Marco</span>' +
                    '<span title="Hoje, ' + br(hoje()) + '"><b class="cx-gd-leg-hoje"></b>Hoje</span>';
            }
            return '<span><b class="cx-sched-b"></b>Tarefa</span>' +
                '<span><b class="cx-gd-leg-fase"></b>Fase (resumo das tarefas)</span>' +
                '<span><b class="cx-gd-leg-marco">◆</b>Marco</span>' +
                '<span title="Hoje, ' + br(hoje()) + '"><b class="cx-gd-leg-hoje"></b>Hoje</span>';
        }
        /* ---------- Q7c-2: balão com o histórico das marcações (Claudio, 04/10/2026) ---------- */
        var balao = null;
        var ACAO_ROT = { iniciar: 'Iniciada', concluir: 'Concluída', reabrir: 'Reaberta' };
        var ACAO_ICO = { iniciar: 'ti-player-play', concluir: 'ti-check', reabrir: 'ti-arrow-back-up' };
        function fechaHist() {
            if (!balao) { return; }
            balao.remove();
            balao = null;
            document.removeEventListener('pointerdown', foraHist, true);
            document.removeEventListener('keydown', escHist, true);
            window.removeEventListener('resize', posHist);
            document.removeEventListener('scroll', posHist, true);
        }
        function foraHist(e) {
            if (balao && !balao.contains(e.target) && !e.target.closest('[data-hist-row]')) { fechaHist(); }
        }
        function escHist(e) {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechaHist(); }
        }
        /** Itens do balão, da marcação mais nova para a mais antiga. */
        function histHtml(lista) {
            if (!lista.length) { return '<p class="cx-gd-hist-vazio">Nenhuma marcação ainda.</p>'; }
            return '<ol class="cx-gd-hist-l">' + lista.slice().reverse().map(function (ev) {
                var d = dn(ev.data), tit = ACAO_ROT[ev.acao] || ev.acao;
                if (ev.acao === 'concluir' && d != null) { tit += ' em ' + br(d); }
                if (ev.acao === 'iniciar' && d != null) { tit += ' (início ' + br(d) + ')'; }
                var q = quando(ev).replace(/^ /, '');
                return '<li class="is-' + esc(ev.acao) + '"><i class="ti ' + (ACAO_ICO[ev.acao] || 'ti-point') + '" aria-hidden="true"></i>' +
                    '<span><b>' + esc(tit) + '</b>' + (q ? '<small>' + esc(q) + '</small>' : '') + '</span></li>';
            }).join('') + '</ol>';
        }
        function abreHist(btn) {
            var id = btn.getAttribute('data-hist-row');
            var aberto = balao && balao.getAttribute('data-row') === id;
            fechaHist();
            if (aberto || !ST) { return; }
            var row = S.rows.filter(function (r) { return r.id === id; })[0];
            var lista = (ST.hist && Array.isArray(ST.hist[id])) ? ST.hist[id] : [];
            balao = document.createElement('div');
            balao.className = 'cx-gd-hist';
            balao.setAttribute('role', 'dialog');
            balao.setAttribute('aria-label', 'Histórico das marcações');
            balao.setAttribute('data-row', id);
            balao.innerHTML = '<div class="cx-gd-hist-h"><span>Marcações' + (row && row.name ? ' · ' + esc(row.name) : '') + '</span>' +
                '<button type="button" class="cx-gd-hist-x" aria-label="Fechar"><i class="ti ti-x"></i></button></div>' + histHtml(lista);
            (document.fullscreenElement && document.fullscreenElement.contains(root) ? document.fullscreenElement : document.body).appendChild(balao);
            posHist();
            balao.querySelector('.cx-gd-hist-x').addEventListener('click', fechaHist);
            document.addEventListener('pointerdown', foraHist, true);
            document.addEventListener('keydown', escHist, true);
            window.addEventListener('resize', posHist);
            document.addEventListener('scroll', posHist, true);
        }
        /**
         * Abaixo do selo; sem espaço, acima; nunca fora da tela na horizontal.
         * Ao rolar (a página ou a grade), acompanha o selo; se ele sair de
         * vista, fecha.
         */
        function posHist(e) {
            if (!balao || (e && e.target && e.target.nodeType === 1 && balao.contains(e.target))) { return; }
            var btn = root.querySelector('[data-hist-row="' + balao.getAttribute('data-row') + '"]');
            if (!btn) { fechaHist(); return; }
            var r = btn.getBoundingClientRect(), w = balao.offsetWidth, h = balao.offsetHeight;
            if (r.bottom < 0 || r.top > window.innerHeight || !r.width) { fechaHist(); return; }
            var top = r.bottom + 6;
            if (top + h > window.innerHeight - 8 && r.top - h - 6 > 8) { top = r.top - h - 6; }
            balao.style.top = Math.max(8, top) + 'px';
            balao.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
        }
        function renderDated() {
            fechaHist();
            // Ordem do mockup Q7b: Fase, Tarefa, Marco, Escala, Hoje, Desfazer … Importar, Exportar, Exportar PDF.
            var bar = '<div class="cx-grid-bar">';
            if (editable) {
                bar += '<button type="button" class="codexplus-btn" data-act="fase"><i class="ti ti-folder-plus"></i> Fase</button>' +
                    '<button type="button" class="codexplus-btn" data-act="row"><i class="ti ti-row-insert-bottom"></i> Tarefa</button>' +
                    '<button type="button" class="codexplus-btn" data-act="marco"><i class="ti ti-diamond"></i> Marco</button>' +
                    '<label class="cx-gd-escala-l">Escala <select class="cx-gd-escala form-select" aria-label="Colunas da linha do tempo">' +
                    Object.keys(ESCALAS).map(function (u) { return '<option value="' + u + '"' + (S.scale === u ? ' selected' : '') + '>' + ESCALAS[u] + '</option>'; }).join('') +
                    '</select></label>' +
                    '<button type="button" class="codexplus-btn" data-act="hoje" title="Levar a linha do tempo até hoje"><i class="ti ti-calendar"></i> Hoje</button>' +
                    '<button type="button" class="codexplus-btn" data-act="undo"' + (hist.length ? '' : ' disabled') + '><i class="ti ti-arrow-back-up"></i> Desfazer</button>' +
                    '<span class="cx-grid-savestate"></span><span class="cx-gd-msg" role="status" hidden></span>';
            } else {
                // Leitura: Hoje (e a tela cheia, no fim da barra); quem pode marcar, Iniciar/Concluir/Reabrir (Q7b-4).
                bar += '<button type="button" class="codexplus-btn" data-act="hoje" title="Levar a linha do tempo até hoje"><i class="ti ti-calendar"></i> Hoje</button>';
                if (stOn() && ST.can) {
                    var nm = idsMarcados().length, off = !nm || enviando ? ' disabled' : '';
                    bar += '<span class="cx-gd-sep-bar"></span>' +
                        '<button type="button" class="codexplus-btn" data-act="iniciar"' + off + ' title="Marcar as tarefas selecionadas como em andamento"><i class="ti ti-player-play"></i> Iniciar</button>' +
                        '<button type="button" class="codexplus-btn" data-act="concluir"' + off + ' title="Concluir as tarefas selecionadas"><i class="ti ti-check"></i> Concluir' + (nm ? ' (' + nm + ')' : '') + '</button>' +
                        '<button type="button" class="codexplus-btn" data-act="reabrir"' + off + ' title="Voltar as tarefas selecionadas para em andamento ou não iniciada"><i class="ti ti-arrow-back-up"></i> Reabrir</button>' +
                        (nm ? '' : '<span class="cx-gd-dica">Marque as tarefas na primeira coluna.</span>');
                }
                bar += '<span class="cx-gd-msg" role="status" hidden></span>';
            }
            bar += '<span class="cx-grid-spacer"></span>' + (editable ? ioBotoes() : '') + botoesFim() + '</div>';
            var rol = rolagem();
            root.innerHTML = '<div class="cx-grid cx-grid--sched cx-grid--datas">' + bar + (stOn() ? resumoSit(gdEstrutura(), hoje()) : '') +
                '<div class="cx-grid-wrap">' + gdTable(false) + '</div><div class="cx-grid-legend">' + gdLegend() + '</div></div>';
            rol();
            esticaCheia();
        }
        /**
         * Q7c-1: mede a área visível da grade e, se o px por dia mudar, redesenha
         * uma vez (no segundo desenho o valor já bate e para). Fora da tela cheia
         * volta ao padrão.
         */
        function esticaCheia() {
            if (!cheia()) { pxCheia = null; return; }
            var tbl = root.querySelector('.cx-gd-table'), wrap = root.querySelector('.cx-grid-wrap');
            if (!tbl || !wrap || !wrap.clientWidth) { return; }
            var u = gdUnits(), dias = u[u.length - 1].s + u[u.length - 1].n - u[0].s;
            var base = S.scale === 'M' ? GD.pxM : GD.pxS;
            var livre = wrap.clientWidth - (+tbl.getAttribute('data-fixo')) - 1;
            var alvo = dias > 0 ? Math.max(base, Math.floor(livre / dias * 100) / 100) : base;
            var atual = +tbl.getAttribute('data-px');
            pxCheia = alvo;
            // Trava: no máximo dois redesenhos seguidos (a barra de rolagem pode sumir e mudar a largura).
            if (Math.abs(alvo - atual) > 0.005 && passesCheia < 2) {
                passesCheia++;
                try { renderDated(); } finally { passesCheia--; }
            }
        }
        // Janela mudou de tamanho com a tela cheia aberta: recalcula.
        var tmResize = null;
        window.addEventListener('resize', function () {
            if (!dated || !cheia()) { return; }
            clearTimeout(tmResize);
            tmResize = setTimeout(function () { if (dated && cheia()) { render(); } }, 120);
        });
        /** Botão Hoje: rola a linha do tempo até hoje (no meio da parte visível). */
        function vaiHoje() {
            var tbl = root.querySelector('.cx-gd-table'), wrap = root.querySelector('.cx-grid-wrap');
            if (!tbl || !wrap) { return; }
            var t0 = +tbl.getAttribute('data-t0'), px = +tbl.getAttribute('data-px'), fixo = +tbl.getAttribute('data-fixo');
            var u = gdUnits(), t1 = u[u.length - 1].s + u[u.length - 1].n, hj = hoje();
            if (hj < t0 || hj >= t1) { avisa('Hoje (' + br(hj) + ') fica fora do período do cronograma.'); return; }
            wrap.scrollLeft = Math.max(0, (hj - t0) * px - Math.max(0, wrap.clientWidth - fixo) / 2);
        }
        /** Seleção (só na tela): linha em azul, barra contornada; linhas novas entram abaixo dela. */
        function marcaSel() {
            root.querySelectorAll('.cx-gd-table tr.is-sel').forEach(function (tr) { tr.classList.remove('is-sel'); });
            var i = S.rows.indexOf(selRow);
            if (i < 0) { return; }
            var tr = root.querySelector('.cx-gd-table tbody tr[data-r="' + i + '"]');
            if (tr) { tr.classList.add('is-sel'); }
        }
        /** Linha nova no fim: tarefa logo depois da última data; marco no último fim; fase sem datas. */
        function novaLinha(tp, ref) {
            var us = {};
            S.rows.forEach(function (r) { if (r.id) { us[r.id] = 1; } });
            if (tp === 'fase') { return { type: 'fase', name: '', owner: '', id: novoId(us) }; }
            var ult = null;
            S.rows.forEach(function (r) { var b = dn(r.end); if (b != null) { ult = ult == null ? b : Math.max(ult, b); } });
            // Abaixo de uma linha selecionada: a nova começa depois dela (ou do fim da fase selecionada).
            if (ref) {
                var rb = tipo(ref) === 'fase' ? gdEstrutura()[S.rows.indexOf(ref)].b : dn(ref.end);
                if (rb != null) { ult = rb; }
            }
            if (tp === 'marco') {
                var m = ult == null ? hoje() : ult;
                return { type: 'marco', name: '', owner: '', start: iso(m), end: iso(m), id: novoId(us) };
            }
            var a = ult == null ? hoje() : ult + 1;
            return { name: '', owner: '', start: iso(a), end: iso(a + 6), id: novoId(us) };
        }
        /**
         * Q7b-2: subir/descer. A fase leva as linhas dela junto (troca de lugar
         * com o bloco vizinho); tarefa e marco trocam com a linha vizinha, e
         * passar por cima de uma fase muda a linha de fase.
         */
        /** Q7c-1: a linha logo acima da fase i é tarefa ou marco solto (sem fase). */
        function soltaAcima(i, est) {
            return i > 0 && tipo(S.rows[i - 1]) !== 'fase' && est[i - 1].fase < 0;
        }
        function moveLinha(i, dir) {
            var rows = S.rows, est = gdEstrutura();
            function bloco(k) {
                if (tipo(rows[k]) !== 'fase') { return [k, k + 1]; }
                var j = k + 1;
                while (j < rows.length && tipo(rows[j]) !== 'fase') { j++; }
                return [k, j];
            }
            if (tipo(rows[i]) === 'fase') {
                var b = bloco(i);
                if (dir < 0) {
                    // Q7c-1 (Claudio, 04/10/2026): a primeira fase não sobe acima das
                    // tarefas soltas do topo (antes subia e a solta virava filha dela).
                    if (i === 0 || soltaAcima(i, est)) { return false; }
                    var ps = est[i - 1].fase >= 0 ? est[i - 1].fase : i - 1;
                    S.rows = rows.slice(0, ps).concat(rows.slice(b[0], b[1]), rows.slice(ps, i), rows.slice(b[1]));
                } else {
                    if (b[1] >= rows.length) { return false; }
                    var nb = bloco(b[1]);
                    S.rows = rows.slice(0, b[0]).concat(rows.slice(nb[0], nb[1]), rows.slice(b[0], b[1]), rows.slice(nb[1]));
                }
                return true;
            }
            var j2 = i + dir;
            if (j2 < 0 || j2 >= rows.length) { return false; }
            var t = rows[i]; rows[i] = rows[j2]; rows[j2] = t;
            return true;
        }
        /** Edição da data na tabela. Devolve texto (motivo) quando recusa. */
        function gravaData(r, campo, v) {
            var row = S.rows[r], a = dn(row.start), b = dn(row.end);
            if (v === '') {
                if (campo === 'dias') { return 'Informe quantos dias a tarefa dura.'; }
                row.start = row.end = '';
                return;
            }
            if (campo === 'dias') {
                var n = parseInt(v, 10);
                if (!/^\d+$/.test(v) || n < 1 || n > 3660) { return 'Dias: um número inteiro de 1 em diante.'; }
                if (a == null) { a = hoje(); row.start = iso(a); }
                row.end = iso(a + n - 1);
                return;
            }
            var d = parseBr(v);
            // Q7b-2b: "dd/mm" sem ano usa o ano da data atual da linha (ou de hoje);
            // fim que cairia antes do início passa para o ano seguinte.
            var curta = /^(\d{1,2})[\/.\-](\d{1,2})$/.exec(String(v).trim());
            if (d == null && curta) {
                var ref = campo === 'end' ? (b != null ? b : a) : (a != null ? a : b);
                var ano = ymd(ref != null ? ref : hoje()).y;
                d = dn(ano + '-' + p2(+curta[2]) + '-' + p2(+curta[1]));
                if (d != null && campo === 'end' && a != null && d < a) { d = dn((ano + 1) + '-' + p2(+curta[2]) + '-' + p2(+curta[1])); }
            }
            if (d == null) { return 'Data inválida: use dd/mm ou dd/mm/aaaa.'; }
            if (tipo(row) === 'marco') { row.start = row.end = iso(d); return; }
            if (campo === 'start') {
                // Mudar o início leva a tarefa junto (a duração fica).
                var dur = (a != null && b != null) ? b - a : 0;
                row.start = iso(d);
                row.end = iso(d + dur);
                return;
            }
            if (a == null) { a = d; row.start = iso(d); }
            if (d < a) { return 'O fim não pode ser antes do início (' + br(a) + ').'; }
            row.end = iso(d);
        }
        /**
         * Cronograma antigo -> datas: cada tarefa vira barra do 1º ao último
         * período marcado; linha só com marcos vira marco no fim do último
         * período marcado (Q7b-2).
         */
        function converte() {
            var seg = hoje() - diaSemana(hoje());
            var txt = window.prompt('Usar datas reais. Data de início da primeira coluna (' + (S.periods[0] || '') + '), em dd/mm/aaaa.\n' +
                'Cada tarefa vira uma barra do primeiro ao último período marcado; linha só com marco vira marco. Desfazer volta ao formato atual.', br(seg));
            if (txt == null) { return; }
            var ini = parseBr(txt);
            if (ini == null) { window.alert('Data inválida: use dd/mm/aaaa.'); return; }
            var u = S.unit, i0 = ymd(ini);
            var meses = u === 'M' ? 1 : (u === 'T' ? 3 : 12);
            function inicio(k) {
                return u === 'S' ? ini + 7 * k : Math.round(Date.UTC(i0.y, i0.m + meses * k, i0.d) / DIA);
            }
            snapshot();
            S = {
                kind: 'cronograma', mode: 'datas', scale: u === 'S' ? 'S' : 'M',
                rows: S.rows.map(function (row) {
                    var i = -1, j = -1, temB = false;
                    (row.cells || []).forEach(function (v, c) { if (v) { if (i < 0) { i = c; } j = c; } if (v === 'b') { temB = true; } });
                    if (i >= 0 && !temB) {
                        var m = iso(inicio(j + 1) - 1);
                        return { type: 'marco', name: row.name || '', owner: row.owner || '', start: m, end: m };
                    }
                    return {
                        name: row.name || '', owner: row.owner || '',
                        start: i < 0 ? '' : iso(inicio(i)), end: i < 0 ? '' : iso(inicio(j + 1) - 1)
                    };
                })
            };
            changed();
        }
        /** Arrastar: mover barra ou marco, puxar as alças, ou criar na linha sem datas. */
        root.addEventListener('pointerdown', function (e) {
            if (!dated || !editable || e.button !== 0) { return; }
            var track = e.target.closest('.cx-gd-track');
            if (!track || !root.contains(track)) { return; }
            var tbl = track.closest('.cx-gd-table');
            var t0 = +tbl.getAttribute('data-t0'), px = +tbl.getAttribute('data-px');
            var r = +track.getAttribute('data-r'), row = S.rows[r];
            if (!row || tipo(row) === 'fase') { return; }
            var marco = tipo(row) === 'marco';
            if (row !== selRow) { selRow = row; marcaSel(); }
            var lane = track.querySelector('.cx-gd-lane');
            var bar = e.target.closest('.cx-gd-barra,.cx-gd-marco');
            var a = dn(row.start), b = dn(row.end), modo;
            if (bar) {
                var al = e.target.closest('[data-h]');
                modo = al ? al.getAttribute('data-h') : 'mover';
            } else if (a == null) {
                modo = 'novo';
            } else {
                return;
            }
            e.preventDefault();
            var rect = lane.getBoundingClientRect();
            var x0 = e.clientX;
            var diaX = function (cx) { return t0 + Math.floor((cx - rect.left) / px); };
            var d0 = diaX(x0), ns = a, ne = b, antes = ser();
            if (modo === 'novo') { ns = ne = d0; }
            if (!bar) {
                bar = document.createElement('div');
                bar.className = marco ? 'cx-gd-marco' : 'cx-gd-barra';
                lane.appendChild(bar);
            }
            var rot = lane.querySelector('.cx-gd-marco-data');
            if (rot) { rot.remove(); }
            bar.classList.add('is-arrastando');
            bar.classList.remove('is-corta-i', 'is-corta-f');
            var tip = document.createElement('div');
            tip.className = 'cx-gd-tip';
            lane.appendChild(tip);
            var tr = track.parentNode;
            function pinta() {
                if (marco) {
                    bar.style.left = ((ns - t0) * px + px / 2) + 'px';
                    tip.style.left = ((ns - t0) * px) + 'px';
                    tip.textContent = br(ns);
                } else {
                    bar.style.left = ((ns - t0) * px) + 'px';
                    bar.style.width = ((ne - ns + 1) * px) + 'px';
                    tip.style.left = ((ns - t0) * px) + 'px';
                    tip.textContent = br(ns) + ' a ' + br(ne) + ' · ' + dias(ne - ns + 1);
                }
                // A tabela acompanha o arrasto.
                var c;
                if ((c = tr.querySelector('[data-edit-start]'))) { c.textContent = brCurto(ns); }
                if ((c = tr.querySelector('[data-edit-end]'))) { c.textContent = brCurto(ne); }
            }
            pinta();
            function move(ev) {
                var d = Math.round((ev.clientX - x0) / px);
                if (modo === 'mover') { ns = a + d; ne = b + d; }
                else if (modo === 'i') { ns = Math.min(a + d, b); ne = b; }
                else if (modo === 'f') { ne = Math.max(b + d, a); ns = a; }
                else if (marco) { ns = ne = diaX(ev.clientX); }
                else { var dx = diaX(ev.clientX); ns = Math.min(d0, dx); ne = Math.max(d0, dx); }
                pinta();
            }
            function up() {
                document.removeEventListener('pointermove', move);
                document.removeEventListener('pointerup', up);
                document.removeEventListener('pointercancel', up);
                if (modo === 'novo' || ns !== a || ne !== b) {
                    hist.push(antes);
                    if (hist.length > 50) { hist.shift(); }
                    row.start = iso(ns);
                    row.end = iso(ne);
                    changed();
                } else {
                    render();
                }
            }
            document.addEventListener('pointermove', move);
            document.addEventListener('pointerup', up);
            document.addEventListener('pointercancel', up);
        });
        root.addEventListener('change', function (e) {
            if (!dated || !editable || !e.target.classList.contains('cx-gd-escala')) { return; }
            if (!ESCALAS[e.target.value] || e.target.value === S.scale) { return; }
            snapshot();
            S.scale = e.target.value;
            changed();
        });

        /* =================== Q7b-3: importar e exportar =================== */
        var io = null; // diálogo de importar aberto
        var NOME = raci ? 'matriz RACI' : 'cronograma';
        function ioBotoes() {
            var md = raci || dated;
            return '<button type="button" class="codexplus-btn" data-act="imp" title="Trazer ' + (raci ? 'uma matriz' : 'um cronograma') + ' de um arquivo ou de uma IA (substitui o atual; Desfazer volta)"><i class="ti ti-upload"></i> Importar</button>' +
                '<span class="cx-grid-xw"><button type="button" class="codexplus-btn" data-act="exp" aria-haspopup="true" aria-expanded="false" title="Levar ' + (raci ? 'esta matriz' : 'este cronograma') + ' para um arquivo"><i class="ti ti-download"></i> Exportar ▾</button>' +
                '<div class="cx-grid-xm" role="menu" hidden>' +
                '<button type="button" role="menuitem" data-act="expjson"><b>Guardar uma cópia ' + (raci ? 'da matriz' : 'do cronograma') + '</b><span>Arquivo do Codex+ com tudo. Serve de backup ou para levar a outro documento.</span></button>' +
                (md ? '<button type="button" role="menuitem" data-act="expmd"><b>Levar para uma IA</b><span>Tabela que ChatGPT, Claude e Gemini entendem. Anexe na IA, peça os ajustes e importe a resposta de volta.</span></button>'
                    : '<div class="cx-grid-xm-nota">Para levar a uma IA, passe antes para datas reais (Usar datas).</div>') +
                '</div></span>';
        }
        function xm(on) {
            var m = root.querySelector('.cx-grid-xm'), b = root.querySelector('[data-act="exp"]');
            if (!m) { return; }
            m.hidden = !on;
            b.setAttribute('aria-expanded', String(!!on));
            if (on) { document.addEventListener('pointerdown', xmFora, true); } else { document.removeEventListener('pointerdown', xmFora, true); }
        }
        function xmFora(e) { if (!e.target.closest || !e.target.closest('.cx-grid-xw')) { xm(false); } }
        function ioNome(ext) {
            var slug = String(title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
                .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
            var d = new Date(), pre = raci ? 'raci' : 'cronograma';
            slug = slug.replace(new RegExp('^' + pre + '(-|$)'), '');
            return pre + (slug ? '-' + slug : '') + '-' + d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ext;
        }
        function baixa(txt, tipoMime, nome) {
            var blob = new Blob([txt], { type: tipoMime });
            var a = document.createElement('a'), url = URL.createObjectURL(blob);
            a.href = url; a.download = nome; a.style.display = 'none';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        }
        function exportJson() {
            var pack = { formato: IO_FORMATO, versao: IO_VERSAO, origem: location.origin, titulo: String(title || ''),
                exportado: new Date().toISOString(), grade: JSON.parse(ser()) };
            baixa(JSON.stringify(pack, null, 1), 'application/json', ioNome('.json'));
        }
        function exportMd() {
            baixa(gridToMd(JSON.parse(ser()), title, hojeBr()), 'text/markdown;charset=utf-8', ioNome('-ia.md'));
        }
        function ioClose() {
            if (!io) { return; }
            document.removeEventListener('paste', ioPaste, true);
            document.removeEventListener('keydown', ioEsc, true);
            io.el.remove();
            io = null;
        }
        function ioEsc(e) { if (e.key === 'Escape' && io) { e.preventDefault(); ioClose(); } }
        function ioOpen() {
            if (io) { return; }
            var el = document.createElement('div');
            el.className = 'cx-io-back cx-io-back--fixo';
            // Em tela cheia só aparece o que está dentro dela.
            (document.fullscreenElement && document.fullscreenElement.contains(root) ? document.fullscreenElement : document.body).appendChild(el);
            io = { el: el, got: null };
            el.addEventListener('pointerdown', function (e) { if (e.target === el) { ioClose(); } });
            document.addEventListener('paste', ioPaste, true);
            document.addEventListener('keydown', ioEsc, true);
            ioPick();
        }
        // Tela 1: escolher o arquivo, arrastar ou colar.
        function ioPick(err) {
            io.got = null;
            io.el.innerHTML = '<div class="cx-io" role="dialog" aria-modal="true" aria-label="Importar ' + NOME + '">' +
                '<h3>Importar ' + NOME + '</h3>' +
                '<p class="cx-io-sub">Traga ' + (raci ? 'uma matriz feita' : 'um cronograma feito') + ' por uma IA (tabela) ou uma cópia guardada do Codex+. O conteúdo atual é substituído; Desfazer volta.</p>' +
                '<div class="cx-io-drop" data-io="drop"><div class="cx-io-big">Arraste o arquivo para cá</div>' +
                '<div class="cx-io-sm">Cópias do Codex+ (.json) e tabelas geradas por IA (.md, .txt)</div>' +
                '<button type="button" class="cx-io-btn" data-io="file">Escolher arquivo</button></div>' +
                '<div class="cx-io-or">ou</div>' +
                '<div class="cx-io-paste" data-io="paste" tabindex="0"><b>Clique aqui e cole com Ctrl+V</b> o que a IA gerou, depois de usar o botão Copiar dela.</div>' +
                '<p class="cx-io-err" data-io="err"' + (err ? '' : ' hidden') + '>' + esc(err || '') + '</p>' +
                '<div class="cx-io-tip">' + (raci
                    ? 'Para pedir à IA: “me entregue essa matriz RACI como tabela Markdown: primeira coluna Atividade, uma coluna por papel, e em cada célula R, A, C ou I (um só A por atividade)”.'
                    : 'Para pedir à IA: “me entregue esse cronograma como tabela Markdown com as colunas Nº | Tipo | Tarefa | Responsável | Início | Fim | Dias, datas em dd/mm/aaaa e Tipo = Fase, Tarefa ou Marco”.') +
                ' Para uma imagem ou PDF, envie o arquivo à IA com esse mesmo pedido.</div>' +
                '<div class="cx-io-foot"><button type="button" class="cx-io-btn" data-io="cancel">Cancelar</button></div></div>';
            var q = function (k) { return io.el.querySelector('[data-io="' + k + '"]'); };
            q('cancel').addEventListener('click', ioClose);
            q('file').addEventListener('click', function () {
                var inp = document.createElement('input');
                inp.type = 'file';
                inp.accept = '.json,.md,.txt,.markdown,application/json,text/plain,text/markdown';
                inp.addEventListener('change', function () { if (inp.files && inp.files[0]) { ioFile(inp.files[0]); } });
                inp.click();
            });
            var dz = q('drop');
            dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('is-over'); });
            dz.addEventListener('dragleave', function () { dz.classList.remove('is-over'); });
            dz.addEventListener('drop', function (e) {
                e.preventDefault(); e.stopPropagation(); dz.classList.remove('is-over');
                var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
                if (f) { ioFile(f); }
            });
            var pz = q('paste');
            if (pz.focus) { pz.focus(); }
        }
        function ioPaste(e) {
            if (!io) { return; }
            var cd = e.clipboardData;
            if (!cd) { return; }
            e.preventDefault(); e.stopPropagation();
            var f = cd.files && cd.files[0];
            if (f) { ioFile(f); return; }
            ioText(cd.getData('text/plain') || cd.getData('text') || '', '');
        }
        function ioFile(f) {
            var name = String(f.name || '');
            if (/^image\//.test(f.type || '') || /\.(png|jpe?g|gif|webp|bmp|svg|pdf|xlsx?|docx?)$/i.test(name) || f.type === 'application/pdf') {
                ioPick('Imagem, PDF, planilha ou documento do Word não são importados diretamente. Envie o arquivo à sua IA com o pedido abaixo e importe a resposta aqui.');
                return;
            }
            if (f.size > IO_MAX) { ioPick('Arquivo grande demais (mais de 1 MB).'); return; }
            var rd = new FileReader();
            rd.onload = function () { ioText(String(rd.result || ''), name); };
            rd.onerror = function () { ioPick('Não foi possível ler esse arquivo.'); };
            rd.readAsText(f);
        }
        function ioText(txt, name) {
            if (!io) { return; }
            var r = readGrid(txt, raci ? 'raci' : 'cronograma');
            if (r.err) { ioPick(r.err); return; }
            io.got = r;
            ioResumo(name);
        }
        // Tela 2: resumo e confirmação.
        function ioResumo(name) {
            var r = io.got, d = r.data, cards;
            var pl = function (n, um, varios) { return [n, n === 1 ? um : varios]; };
            if (d.kind === 'raci') {
                var cel = d.rows.reduce(function (t, x) { return t + x.cells.filter(Boolean).length; }, 0);
                cards = [pl(d.rows.length, 'atividade', 'atividades'), pl(d.roles.length, 'papel', 'papéis'), pl(cel, 'célula marcada', 'células marcadas')];
            } else if (d.mode === 'datas') {
                var cnt = function (t) { return d.rows.filter(function (x) { return (x.type || 'tarefa') === t; }).length; };
                cards = [pl(cnt('tarefa'), 'tarefa', 'tarefas'), pl(cnt('fase'), 'fase', 'fases'), pl(cnt('marco'), 'marco', 'marcos')];
            } else {
                cards = [pl(d.rows.length, 'tarefa', 'tarefas'), pl(d.periods.length, 'período', 'períodos'), [UNITS[d.unit], 'unidade']];
            }
            var cur = S.rows.length;
            var warn = r.warn.length ? '<div class="cx-io-warn"><p>' + (r.warn.length === 1 ? '1 ponto para conferir' : r.warn.length + ' pontos para conferir') + '</p><ul>' +
                r.warn.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul></div>' : '';
            var achou = raci ? 'Matriz RACI encontrada' : 'Cronograma encontrado';
            io.el.innerHTML = '<div class="cx-io" role="dialog" aria-modal="true" aria-label="' + achou + '">' +
                '<h3>' + achou + '</h3><p class="cx-io-sub">Confira antes de trazer.</p>' +
                '<div class="cx-io-file"><span class="cx-io-doc" aria-hidden="true"></span><div>' + esc(name || r.title || 'Conteúdo colado') +
                '<small>' + esc(r.kind) + (r.title && name ? ' · ' + r.title : '') + '</small></div></div>' +
                '<div class="cx-io-stats">' + cards.map(function (c) { return '<div><b>' + esc(c[0]) + '</b><span>' + c[1] + '</span></div>'; }).join('') + '</div>' +
                warn +
                '<p class="cx-io-note">' + (cur ? 'O conteúdo atual (' + cur + (cur === 1 ? ' linha' : ' linhas') + ') será substituído e gravado. Se não gostar, use Desfazer para voltar ao anterior.'
                    : 'Está vazio: o conteúdo entra e é gravado. Desfazer volta ao vazio.') + '</p>' +
                '<div class="cx-io-foot"><button type="button" class="cx-io-btn" data-io="back">Voltar</button>' +
                '<button type="button" class="cx-io-btn cx-io-pri" data-io="apply">' + (cur ? 'Substituir' : 'Trazer') + '</button></div></div>';
            io.el.querySelector('[data-io="back"]').addEventListener('click', function () { ioPick(); });
            var ap = io.el.querySelector('[data-io="apply"]');
            ap.addEventListener('click', ioApply);
            if (ap.focus) { ap.focus(); }
        }
        function ioApply() {
            if (!io || !io.got) { return; }
            snapshot();
            var nd = io.got.data;
            if (!raci && nd.mode === 'datas' && S.mode === 'datas') { herdaIds(S.rows, nd.rows); }
            S = nd;
            ioClose();
            changed();
        }

        /* ---------- Q7b-4: marcar a situação (Iniciar, Concluir, Reabrir) ---------- */
        root.addEventListener('change', function (e) {
            if (!stOn() || !ST.can) { return; }
            var t = e.target;
            if (t.hasAttribute('data-chk')) {
                var id = t.getAttribute('data-chk');
                if (t.checked) { marcadas[id] = 1; } else { delete marcadas[id]; }
                render();
            } else if (t.hasAttribute('data-chk-all')) {
                root.querySelectorAll('[data-chk]').forEach(function (c) {
                    var k = c.getAttribute('data-chk');
                    if (t.checked) { marcadas[k] = 1; } else { delete marcadas[k]; }
                });
                render();
            }
        });
        var MSG_ERRO = {
            sem_permissao: 'Sem permissão para marcar a situação deste documento.',
            sem_tarefas: 'Nenhuma das tarefas marcadas existe na versão publicada. Recarregue a página.',
            data_invalida: 'Data de conclusão inválida (no máximo hoje).',
            nao_encontrado: 'Documento não encontrado.',
            sem_acesso: 'Sem acesso a este documento.'
        };
        function marca(acao, data) {
            var ids = idsMarcados();
            if (!ids.length || enviando) { return; }
            var tk = (root.parentNode && root.parentNode.querySelector('[name="_glpi_csrf_token"]')) || document.querySelector('[name="_glpi_csrf_token"]');
            if (!tk) { avisa('A página está sem o token de segurança: recarregue (F5).'); return; }
            enviando = true;
            render();
            var fd = new FormData();
            fd.append('id', docId);
            fd.append('acao', acao);
            fd.append('linhas', JSON.stringify(ids));
            if (data) { fd.append('data', data); }
            fd.append('_glpi_csrf_token', tk.value);
            fetch(ST.url, { method: 'POST', body: fd, credentials: 'same-origin' })
                .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j || {} }; }); })
                .then(function (res) {
                    enviando = false;
                    // Token consumido a cada POST (achado 43): o novo vai para todos.
                    if (res.j.csrf) { document.querySelectorAll('[name="_glpi_csrf_token"]').forEach(function (i) { i.value = res.j.csrf; }); }
                    if (!res.ok || !res.j.ok) {
                        render();
                        avisa(MSG_ERRO[res.j.erro] || 'Não foi possível gravar a situação.');
                        return;
                    }
                    ST.map = res.j.status && typeof res.j.status === 'object' ? res.j.status : {};
                    if (res.j.hist && typeof res.j.hist === 'object') { ST.hist = res.j.hist; } // Q7c-2
                    marcadas = {};
                    render();
                    var n = res.j.n || 0, verbo = { iniciar: 'iniciada', concluir: 'concluída', reabrir: 'reaberta' }[acao];
                    avisa(n ? n + (n === 1 ? ' tarefa ' + verbo : ' tarefas ' + verbo + 's') + ' às ' + (res.j.hora || '') : 'Nada mudou (já estavam assim).', true);
                })
                .catch(function () {
                    enviando = false;
                    render();
                    avisa('Não foi possível gravar a situação (sem conexão?).');
                });
        }
        /** Concluir: pergunta a data (hoje, editável; conclusão no futuro não vale). */
        function dlgConcluir() {
            var n = idsMarcados().length;
            if (!n || enviando) { return; }
            var el = document.createElement('div');
            el.className = 'cx-io-back cx-io-back--fixo';
            (document.fullscreenElement && document.fullscreenElement.contains(root) ? document.fullscreenElement : document.body).appendChild(el);
            el.innerHTML = '<div class="cx-io cx-gd-dlg" role="dialog" aria-modal="true" aria-label="Concluir tarefas">' +
                '<h3>Concluir ' + n + (n === 1 ? ' tarefa' : ' tarefas') + '</h3>' +
                '<p class="cx-io-sub">Data em que ' + (n === 1 ? 'foi concluída' : 'foram concluídas') + '. Depois do Fim planejado, conta como concluída com atraso.</p>' +
                '<label class="cx-gd-dlg-l">Data da conclusão <input type="text" class="form-control" data-d="data" value="' + br(hoje()) + '" placeholder="dd/mm/aaaa" autocomplete="off"></label>' +
                '<p class="cx-io-err" data-d="err" hidden></p>' +
                '<div class="cx-io-foot"><button type="button" class="cx-io-btn" data-d="cancel">Cancelar</button>' +
                '<button type="button" class="cx-io-btn cx-io-pri" data-d="ok">Concluir</button></div></div>';
            var q = function (k) { return el.querySelector('[data-d="' + k + '"]'); };
            function fecha() { document.removeEventListener('keydown', tecla, true); el.remove(); }
            function ok() {
                var v = q('data').value.trim(), d = parseBr(v);
                var m = /^(\d{1,2})[\/.\-](\d{1,2})$/.exec(v);
                if (d == null && m) { d = dn(ymd(hoje()).y + '-' + p2(+m[2]) + '-' + p2(+m[1])); }
                var err = d == null ? 'Data inválida: use dd/mm/aaaa.' : (d > hoje() ? 'A conclusão não pode ser no futuro.' : '');
                if (err) { q('err').textContent = err; q('err').hidden = false; return; }
                fecha();
                marca('concluir', iso(d));
            }
            function tecla(e) {
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecha(); }
                if (e.key === 'Enter') { e.preventDefault(); ok(); }
            }
            document.addEventListener('keydown', tecla, true);
            el.addEventListener('pointerdown', function (e) { if (e.target === el) { fecha(); } });
            q('cancel').addEventListener('click', fecha);
            q('ok').addEventListener('click', ok);
            q('data').addEventListener('input', function () { q('err').hidden = true; });
            q('data').focus();
            q('data').select();
        }

        /* ---------- unidade (cronograma) ---------- */
        root.addEventListener('change', function (e) {
            if (dated || !e.target.classList.contains('cx-grid-unit') || !editable) { return; }
            var novo = e.target.value, velho = S.unit;
            if (!UNITS[novo] || novo === velho) { return; }
            snapshot();
            // Renomeia só o que ainda tem o nome padrão (S3 na 3ª coluna…);
            // o que foi renomeado à mão fica.
            S.periods = S.periods.map(function (p, i) { return p === velho + (i + 1) ? novo + (i + 1) : p; });
            S.unit = novo;
            changed();
        });

        /* ---------- ações ---------- */
        root.addEventListener('click', function (e) {
            var t = e.target;
            // Q7c-2: selo da Situação abre/fecha o balão do histórico.
            var hb = dated && t.closest('[data-hist-row]');
            if (hb) { e.preventDefault(); abreHist(hb); return; }
            // Q7b-2: recolher/mostrar fase vale na leitura também; só a tela muda.
            var fold = dated && t.closest('[data-fold]');
            if (fold) {
                e.preventDefault();
                var fr = S.rows[+fold.getAttribute('data-fold')];
                if (fr) { if (fechadas.has(fr)) { fechadas.delete(fr); } else { fechadas.add(fr); } }
                render();
                return;
            }
            // Q7b-2b: clicar numa linha seleciona (só na tela; o resto do clique segue).
            var trS = dated && editable && t.closest('.cx-gd-table tbody tr[data-r]');
            if (trS && root.contains(trS)) {
                var so = S.rows[+trS.getAttribute('data-r')];
                if (so && so !== selRow) { selRow = so; marcaSel(); }
            }
            var act = t.closest('[data-act]');
            if (act) {
                e.preventDefault();
                var a = act.getAttribute('data-act');
                if (a === 'pdf') { printGrid(); return; }
                if (a === 'full') { toggleFull(); return; }
                if (a === 'hoje') { if (dated) { vaiHoje(); } return; }
                // Q7b-4: situação (leitura do publicado, quem pode marcar).
                if (a === 'iniciar' || a === 'reabrir') { if (stOn() && ST.can) { marca(a, ''); } return; }
                if (a === 'concluir') { if (stOn() && ST.can) { dlgConcluir(); } return; }
                if (!editable) { return; }
                if (a === 'undo') { if (hist.length) { S = JSON.parse(hist.pop()); changed(); } return; }
                if (a === 'datas') { if (!raci && !dated) { converte(); } return; }
                // Q7b-3: importar e exportar.
                if (a === 'exp') { var m0 = root.querySelector('.cx-grid-xm'); xm(m0 && m0.hidden); return; }
                if (a === 'expjson') { xm(false); exportJson(); return; }
                if (a === 'expmd') { xm(false); if (raci || dated) { exportMd(); } return; }
                if (a === 'imp') { ioOpen(); return; }
                snapshot();
                if (dated) {
                    if (a === 'row' || a === 'fase' || a === 'marco') {
                        // Q7b-2b: com uma linha selecionada, a nova entra logo abaixo dela.
                        var pos = S.rows.indexOf(selRow), nl = novaLinha(a === 'row' ? 'tarefa' : a, pos >= 0 ? selRow : null);
                        if (pos >= 0) { S.rows.splice(pos + 1, 0, nl); } else { S.rows.push(nl); }
                        selRow = nl;
                    }
                    changed();
                    return;
                }
                if (a === 'row') {
                    var novo = { name: '', cells: cols().map(function () { return ''; }) };
                    if (!raci) { novo.owner = ''; }
                    S.rows.push(novo);
                }
                if (a === 'col') {
                    cols().push(raci ? 'Papel ' + (cols().length + 1) : S.unit + (cols().length + 1));
                    S.rows.forEach(function (row) { row.cells.push(''); });
                }
                changed();
                return;
            }
            if (!editable) { return; }
            var mv = dated && t.closest('[data-mv]');
            if (mv) {
                e.preventDefault();
                snapshot();
                if (moveLinha(+mv.getAttribute('data-mv'), +mv.getAttribute('data-dir'))) { changed(); } else { hist.pop(); }
                return;
            }
            var del = t.closest('[data-del-row],[data-del-col]');
            if (del) {
                e.preventDefault();
                snapshot();
                if (del.hasAttribute('data-del-row')) {
                    S.rows.splice(+del.getAttribute('data-del-row'), 1);
                } else {
                    var ci = +del.getAttribute('data-del-col');
                    if (cols().length <= 1) { hist.pop(); return; }
                    cols().splice(ci, 1);
                    S.rows.forEach(function (row) { row.cells.splice(ci, 1); });
                }
                changed();
                return;
            }
            var dt = dated && t.closest('[data-edit-start],[data-edit-end],[data-edit-days]');
            if (dt) {
                var campo = dt.hasAttribute('data-edit-start') ? 'start' : (dt.hasAttribute('data-edit-end') ? 'end' : 'dias');
                var rd = +dt.getAttribute('data-edit-' + (campo === 'dias' ? 'days' : campo));
                var rw = S.rows[rd], va = dn(rw.start), vb = dn(rw.end);
                var atualD = campo === 'start' ? br(va) : (campo === 'end' ? br(vb) : (va != null && vb != null ? String(vb - va + 1) : ''));
                editText(dt, atualD, function (v) { return gravaData(rd, campo, v); });
                var inpD = dt.querySelector('input');
                if (inpD && campo !== 'dias') { inpD.placeholder = 'dd/mm/aaaa'; }
                return;
            }
            var cell = !dated && t.closest('.cx-grid-cell');
            if (cell) {
                snapshot();
                var r = +cell.getAttribute('data-r'), c = +cell.getAttribute('data-c');
                var seq = raci ? RACI : SCHED;
                var atual = S.rows[r].cells[c] || '';
                S.rows[r].cells[c] = seq[(seq.indexOf(atual) + 1) % seq.length];
                changed();
                return;
            }
            var n = t.closest('[data-edit-name]');
            if (n) { var ri = +n.getAttribute('data-edit-name'); editText(n, S.rows[ri].name || '', function (v) { S.rows[ri].name = v; }); return; }
            var o = t.closest('[data-edit-owner]');
            if (o) { var ro = +o.getAttribute('data-edit-owner'); editText(o, S.rows[ro].owner || '', function (v) { S.rows[ro].owner = v; }); return; }
            var h = t.closest('[data-edit-col]');
            if (h) { var hc = +h.getAttribute('data-edit-col'); editText(h, cols()[hc] || '', function (v) { cols()[hc] = v; }); }
        });

        /* ---------- PDF ---------- */
        /**
         * Sempre A4 paisagem (Claudio, 04/10/2026: o mesmo documento sai
         * sempre com a mesma cara; antes era retrato quando cabia). Se não
         * cabe numa folha, as colunas vão em blocos, cada bloco em folha nova,
         * repetindo a coluna da tarefa/atividade e o responsável.
         */
        function printPlan() {
            var fixo = W.pName + (raci ? 0 : W.pOwner);
            var wc = raci ? W.pRaci : W.pSched;
            return { orient: 'landscape', per: Math.max(1, Math.floor((W.landscape - fixo) / wc)) };
        }
        /**
         * Cronograma com datas: também sempre paisagem. Cabe numa folha, a
         * linha do tempo estica até a largura útil; senão vai em blocos de
         * colunas inteiras (semanas ou meses), cada bloco em folha nova.
         */
        function gdPrintPlan() {
            var units = gdUnits(), px = gdPx(true), fixo = gdFixed(true);
            var nd = units.reduce(function (t, u) { return t + u.n; }, 0), tot = nd * px;
            // Q7b-2: coube numa folha, a linha do tempo estica até a largura útil (até 3x).
            function estica(larg) { return Math.min(px * 3, Math.floor((larg - fixo) / nd * 100) / 100); }
            if (fixo + tot <= W.landscape) { return { orient: 'landscape', px: estica(W.landscape), blocos: [[0, units.length]] }; }
            var cabe = W.landscape - fixo, blocos = [], ini = 0, larg = 0;
            units.forEach(function (u, k) {
                if (k > ini && larg + u.n * px > cabe) { blocos.push([ini, k]); ini = k; larg = 0; }
                larg += u.n * px;
            });
            blocos.push([ini, units.length]);
            return { orient: 'landscape', px: px, blocos: blocos };
        }
        function printGrid() {
            var plan, n, blocos = [], units = null;
            if (dated) {
                plan = gdPrintPlan();
                blocos = plan.blocos;
                units = gdUnits();
            } else {
                plan = printPlan();
                n = cols().length;
                for (var i = 0; i < Math.max(n, 1); i += plan.per) { blocos.push([i, Math.min(n, i + plan.per)]); }
            }
            var frame = document.createElement('iframe');
            frame.setAttribute('aria-hidden', 'true');
            var pw = plan.orient === 'portrait' ? 'width:794px;height:1123px' : 'width:1123px;height:794px';
            frame.style.cssText = 'position:fixed;left:-10000px;top:0;border:0;' + pw;
            document.body.appendChild(frame);
            var d = frame.contentDocument;
            var nome = (code ? code + ' - ' : '') + title;
            var corpo = blocos.map(function (bl, k) {
                var parte;
                if (dated) {
                    var ub = units[bl[1] - 1];
                    parte = blocos.length > 1 ? ' · ' + br(units[bl[0]].s) + ' a ' + br(ub.s + ub.n - 1) + ' (folha ' + (k + 1) + ' de ' + blocos.length + ')' : '';
                } else {
                    parte = blocos.length > 1 ? ' · colunas ' + (bl[0] + 1) + '–' + bl[1] + ' de ' + n : '';
                }
                return '<section' + (k < blocos.length - 1 ? ' style="page-break-after:always"' : '') + '>' +
                    '<div class="h"><b>' + esc(title) + '</b><span>' + esc(code + parte) + '</span></div>' +
                    (sign ? '<div class="s">' + esc(sign) + '</div>' : '') +
                    (dated ? (k === 0 && stOn() ? resumoSit(gdEstrutura(), hoje()) : '') + gdTable(true, bl[0], bl[1], plan.px) + '<div class="l">' + gdLegend() + '</div>'
                        : tableHtml(true, bl[0], bl[1]) + '<div class="l">' + legendHtml() + '</div>') + '</section>';
            }).join('');
            d.open();
            d.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + esc(nome) + '</title><style>' +
                '@page{size:A4 ' + plan.orient + ';margin:10mm}html,body{margin:0;background:#fff;font:10px Arial,sans-serif;color:#1d2330;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
                '.h{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #1d2330;padding-bottom:4px;margin-bottom:8px}.h b{font-size:15px}' +
                '.s{font:9px Arial,sans-serif;color:#5f6b7a;margin:-4px 0 6px}' +
                'table{border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tr{page-break-inside:avoid}' +
                'th,td{border:1px solid #c9ced8;height:20px;text-align:center;padding:0 3px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}' +
                'th{background:#f1f3f6;font-weight:bold}td.cx-grid-name,th.cx-grid-name{text-align:left}' +
                '.cx-sched-b{background:#9fe1cb}.cx-sched-m{background:#1d9e75;color:#fff}.cx-raci-R{background:#cecbf6;color:#3c3489}.cx-raci-A{background:#f5c4b3;color:#712b13}' +
                '.cx-raci-C{background:#9fe1cb;color:#085041}.cx-raci-I{background:#f1efe8;color:#444441}td.cx-grid-cell{font-weight:bold}.cx-grid-warn{display:none}' +
                '.ti-flag::before{content:"\u2691"}.ti{font-style:normal}' +
                // Q7b-1/2/2b: cronograma com datas no desenho do mockup.
                '.cx-gd-table th,.cx-gd-table td{border-width:0 0 1px 0;text-align:left}.cx-gd-table th{background:#f1f3f6;color:#5a6575}' +
                'th.cx-gd-head,td.cx-gd-track{padding:0;border-left:1px solid #c9ced8}th.cx-gd-head{height:30px}.cx-gd-n{color:#5a6575}' +
                '.cx-gd-scale{position:relative;height:30px}.cx-gd-band,.cx-gd-unit{position:absolute;height:15px;line-height:15px;box-sizing:border-box;padding-left:2px;overflow:hidden;white-space:nowrap;text-align:left}' +
                '.cx-gd-band{top:0}.cx-gd-unit{top:15px;font-weight:normal;font-size:8px}' +
                '.cx-gd-lane{position:relative;height:20px}.cx-gd-sep{position:absolute;top:0;bottom:0;border-left:1px solid #eceef2}.cx-gd-sep.is-mes{border-left-color:#c9ced8}.cx-gd-scale .cx-gd-sep{top:15px}.cx-gd-scale .cx-gd-sep.is-mes{top:0}' +
                '.cx-gd-barra{position:absolute;top:5px;height:10px;background:#9fe1cb;border:1px solid #7fcfb3;border-radius:3px;box-sizing:border-box}' +
                '.cx-gd-barra.is-corta-i{border-left-style:dashed;border-radius:0 3px 3px 0}.cx-gd-barra.is-corta-f{border-right-style:dashed;border-radius:3px 0 0 3px}' +
                '.cx-gd-nome{display:flex;align-items:center;min-width:0}.cx-gd-nome>*{flex:none}.cx-gd-nome>.cx-gd-txt{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}' +
                'td.cx-grid-name{white-space:nowrap}.cx-gd-r-filha td.cx-grid-name{padding-left:14px}' +
                '.cx-gd-r-fase td{background:#f1f3f6;font-weight:bold}.cx-gd-r-marco td.cx-grid-name{font-weight:bold}.cx-gd-losango{color:#1d2330;margin-right:4px}' +
                '.cx-gd-fase-barra{position:absolute;top:6px;height:5px;background:#2c3a4a}.cx-gd-fase-barra::before,.cx-gd-fase-barra::after{content:"";position:absolute;top:5px;border-top:3px solid #2c3a4a}' +
                '.cx-gd-fase-barra::before{left:0;border-right:3px solid transparent}.cx-gd-fase-barra::after{right:0;border-left:3px solid transparent}' +
                '.cx-gd-marco{position:absolute;top:5px;width:9px;height:9px;margin-left:-4.5px;background:#1d9e75;transform:rotate(45deg)}' +
                '.cx-gd-marco-data{position:absolute;top:3px;margin-left:8px;font-size:8px;font-weight:bold;color:#1d9e75;white-space:nowrap}' +
                '.cx-gd-hoje{position:absolute;top:0;bottom:0;border-left:2px dashed #d6456e;margin-left:-1px}.cx-gd-scale .cx-gd-hoje{top:15px}' +
                '.cx-gd-hoje-rot{position:absolute;bottom:0;transform:translateX(-50%);padding:0 3px;background:#d6456e;color:#fff;font-size:7px;font-weight:bold;line-height:10px;border-radius:2px}' +
                '.cx-gd-leg-fase{background:#2c3a4a;height:5px!important}.cx-gd-leg-marco{color:#1d9e75}.cx-gd-leg-hoje{width:0;min-width:0!important;border-left:2px solid #d6456e}' +
                // Q7b-4: situação no PDF.
                '.cx-gd-sumario{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 6px;font-size:9px}.cx-gd-sumario .is-atrasada{color:#a32d2d}.cx-gd-sumario .is-okatraso{color:#854f0b}.cx-gd-ultima{margin-left:auto;color:#5a6575}' +
                '.cx-gd-pill{display:inline-block;padding:0 4px;border-radius:6px;font-size:8px;font-weight:bold;line-height:12px}' +
                '.cx-gd-pill.is-ok{background:#e1f5ee;color:#085041}.cx-gd-pill.is-okatraso{background:#faeeda;color:#633806}.cx-gd-pill.is-atrasada{background:#fcebeb;color:#a32d2d}' +
                '.cx-gd-pill.is-andamento{background:#e6f1fb;color:#0c447c}.cx-gd-pill.is-nao{background:#f1efe8;color:#5f5e5a}' +
                '.cx-gd-fase-sit{font-size:8px;font-weight:bold}.cx-gd-fase-sit.is-atrasada{color:#a32d2d}' +
                '.cx-gd-barra.st-ok{background:#1d9e75;border-color:#0f6e56}.cx-gd-barra.st-okatraso{background:#efc66b;border-color:#ba7517}.cx-gd-barra.st-atrasada{background:#e57373;border-color:#a32d2d}' +
                '.cx-gd-barra.st-andamento{background:#85b7eb;border-color:#378add}.cx-gd-barra.st-nao{background:#d6f1e6;border-color:#9fe1cb}' +
                '.cx-gd-ok{position:absolute;left:2px;top:-1px;color:#fff;font-size:8px;font-weight:bold}.cx-gd-ext{position:absolute;top:8px;height:4px;background:#f4c0c0}' +
                '.cx-gd-fase-barra.has-prog{background:#c9ced8}.cx-gd-fase-barra.is-atrasada{background:#f4c0c0}.cx-gd-prog{position:absolute;left:0;top:0;bottom:0;background:#2c3a4a}.cx-gd-fase-barra.is-atrasada .cx-gd-prog{background:#a32d2d}' +
                '.cx-gd-marco.is-atrasada{background:#a32d2d}.cx-gd-marco.is-okatraso{background:#ba7517}.cx-gd-marco-data.is-atrasada{color:#a32d2d}.cx-gd-marco-data.is-okatraso{color:#854f0b}' +
                '.cx-gd-leg{min-width:16px}.cx-gd-leg.st-ok{background:#1d9e75}.cx-gd-leg.st-okatraso{background:#efc66b}.cx-gd-leg.st-atrasada{background:#e57373}.cx-gd-leg.st-andamento{background:#85b7eb}.cx-gd-leg.st-nao{background:#d6f1e6}' +
                '.l{margin-top:6px;display:flex;gap:14px}.l span{display:inline-flex;align-items:center}.l b{display:inline-block;min-width:16px;height:12px;line-height:12px;margin-right:4px;text-align:center;border-radius:2px}' +
                '</style></head><body>' + corpo + '</body></html>');
            d.close();
            var old = document.title;
            document.title = nome; // achado 24: o nome sugerido vem da página principal
            setTimeout(function () {
                try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (_) { /* bloqueado */ }
                document.title = old;
                setTimeout(function () { frame.remove(); }, 1000);
            }, 80);
        }

        if (input) { input.value = ser(); }
        render();
        root.__cxGrid = { full: toggleFull, cheia: cheia, ser: ser, plan: printPlan, gdPlan: gdPrintPlan, gdUnits: gdUnits, gdEstrutura: gdEstrutura,
            ioText: function (t, n) { ioOpen(); ioText(t, n); }, ioApply: function () { ioApply(); }, io: function () { return io; },
            exportMd: function () { return gridToMd(JSON.parse(ser()), title, hojeBr()); }, ioNome: ioNome };
        return root.__cxGrid;
    }

    function boot() { document.querySelectorAll('[data-cx-grid]').forEach(mount); }
    window.CodexplusGrid = { mount: mount, _toMd: gridToMd, _read: readGrid, _tables: mdTables };
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
