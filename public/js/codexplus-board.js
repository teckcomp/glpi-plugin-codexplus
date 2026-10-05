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
          link {a:{id,side}, b:{id,side}, kind, route, wp:[{x,y}], ends,
                label, cable, pa, pb, vel, vlan, poe, showId, fs,
                len:{mode:'auto'|'manual', m, extra}, showM} (Q2d: metros)
          duct {pts:[{x,y}], kind:'eletrocalha'|'canaleta', label, showM, fs}
                (Q2e: polilinha desenhada por cliques, com metragem própria).
          wall {pts:[{x,y}], mat} (Q8-1, só na Planta: parede com material,
                base do mapa de calor; D.wallsOn mostra ou esconde a camada).
                (Q2a/Q2b; side = n/l/s/o, borda do ícone; cable = P-001…).
   Todos com id, lock (travado) e g (grupo). Ligação não tem x/y: a
   posição vem dos dois ícones, e ela acompanha quando eles se movem.
   Q2b tipos e painel; Q2c traçado, dobras e religar a ponta; Q2d metragem
   e eletrocalha. Q3 legenda e lista de materiais; Q4 "+ Ícone".
   Q5a (27/09/2026): paleta FLUXOGRAMA, aberta fora do editor de texto por
   um documento DIA (codexplus-flow.js). Nesse caso open() recebe um `host`
   {data, title, save(D)}: o quadro vai para a tabela de diagramas, sem PNG
   no corpo e sem legenda.
   Q5b (27/09/2026): FORMAS do fluxograma — shape {x,y,w,h,shape,text,color,
   sz} (w/h derivados: a forma cresce em altura com o texto) — e a ligação
   de fluxo (kind 'fluxo': cotovelo, seta, rótulo; a 1ª saída da decisão
   nasce "Sim", a 2ª "Não"). Elementos separados por paleta (Claudio,
   27/09/2026): Planta e Topologia usam ícones, cabos e eletrocalha; o
   fluxograma usa formas e ligação de fluxo. As interações são as mesmas.
   Q5c (27/09/2026): tamanho livre (8 alças; a altura nunca fica menor que
   o texto), estilo na barra flutuante sobre a seleção — fundo, borda e
   texto em 12 tons fixos, negrito e tamanho da letra — e camadas (Frente/
   Trás; a moldura fica sempre no fundo). Forma: {…, w, h, fill, line, ink,
   b, fs}; o `color` e o `sz` do Q5b ainda são lidos.
   Q5d (27/09/2026): ligação de fluxo completa — cor (lc), espessura (lw:
   f/m/g), traço (dash), ponta no início e no fim (ea/eb: seta cheia, seta
   aberta, losango, círculo ou nada), balão com cor (lbg) que desliza ao
   longo da linha (lt, 0..1). Cotovelo com cantos arredondados, ponta
   proporcional à espessura e linha que para antes da ponta (referência
   de Claudio). Estilo na barra flutuante; espessura também no painel.
   Q5e-1 (27/09/2026): mais 9 formas de fluxograma clássico (subprocesso,
   banco de dados, entrada e operação manual, preparação, atraso, vários
   documentos, conector de página, nota adesiva) e paleta em seções
   recolhíveis (BPMN entra no Q5e-2).
   Q5e-2 (27/09/2026): seção BPMN — eventos de início, intermediário e fim
   (tipo em `mk`: simples, mensagem, temporizador), tarefa (mk: usuário,
   serviço, manual), subprocesso, gateways exclusivo/paralelo/inclusivo,
   objeto de dados, anotação e grupo. Notação padrão (a mesma do Bizagi),
   desenho próprio. Eventos, gateways e objeto de dados levam o nome
   EMBAIXO da forma, como no BPMN; os demais, dentro.
   Q5f (27/09/2026): criar a próxima forma já ligada — a bolinha azul da
   forma ganha um "+": CLIQUE cria a próxima forma naquela direção (com
   espaço e alinhada); ARRASTAR até outra forma liga; ARRASTAR para o
   vazio abre a mini-paleta e a forma escolhida nasce ligada ali. Alinhar
   e distribuir na barra flutuante com 2 ou mais elementos selecionados.
   Q5k (Claudio, 04/10/2026, referência Miro): texto solto com LARGURA
   (`w`, alças nas laterais; o texto quebra sozinho; os cantos continuam
   mudando a letra) e "…" na mini-paleta, que abre todas as formas por
   seção, com busca.
   ========================================================================= */
(function () {
    'use strict';

    var NS = 'http://www.w3.org/2000/svg';
    var GRID = 10;
    var SNAP = 6;
    var COLORS = ['#185FA5', '#1D9E75', '#D85A30', '#534AB7', '#A32D2D', '#5F5E5A'];
    var MODES = { topologia: 'Topologia', planta: 'Planta de execução', fluxograma: 'Fluxograma', organograma: 'Organograma' };
    // Q6b-1 (Claudio, 03/10/2026): organograma no motor. O desenho e as regras
    // (chefia, linha x cartão, arranjo) vêm de codexplus-orgdraw.js.
    function OD() { return window.CodexplusOrgDraw || null; }
    /* Folha do fluxograma (Claudio, 02/10/2026): tamanhos prontos e um
       personalizado; cresce para a direita e para baixo, sem mover o desenho,
       e nunca fica menor que o desenho. Limite 6000 (o mesmo do clean() e do
       Diagram::validate). O PNG, a leitura e o PDF recortam pelo conteúdo,
       então a folha só muda a área de trabalho do editor. */
    var PAGE_SIZES = [
        { v: '1400x900',  l: 'Padrão (1400 × 900)' },
        { v: '2400x1500', l: 'Médio (2400 × 1500)' },
        { v: '3600x2200', l: 'Grande (3600 × 2200)' },
        { v: '6000x4000', l: 'Máximo (6000 × 4000)' }
    ];
    var PXM_DEFAULT = 20;   // sem escala definida: 1 m = 20 px (aproximado)
    var PXM = PXM_DEFAULT;  // escala do quadro em uso (render e PNG)
    var SIDES = ['n', 'l', 's', 'o'];   // bordas do ícone: norte, leste, sul, oeste
    // Tipos de cabo (Q2b): cor, espessura e traço. Tipo novo = uma linha aqui.
    // UTP em azul com a espessura crescendo; lógica/VPN nasce com seta.
    var LINK_KINDS = {
        cat5e:  { label: 'UTP Cat5e',        c: '#378ADD', w: 2,   d: '' },
        cat6:   { label: 'UTP Cat6',         c: '#378ADD', w: 2.6, d: '' },
        cat6a:  { label: 'UTP Cat6A',        c: '#185FA5', w: 3.4, d: '' },
        fibra:  { label: 'Fibra óptica',     c: '#7F77DD', w: 2.6, d: '' },
        coax:   { label: 'Coaxial / vídeo',  c: '#D85A30', w: 2.6, d: '' },
        eletr:  { label: 'Elétrica',         c: '#E24B4A', w: 2.6, d: '' },
        semfio: { label: 'Sem fio',          c: '#888780', w: 2,   d: '8 6' },
        logica: { label: 'Lógica / VPN',     c: '#5F5E5A', w: 2,   d: '1 6', arrow: true },
        outro:  { label: 'Outros',           c: '#888780', w: 2,   d: '' }
    };
    var LINK_FS = { p: 0.8, m: 1, g: 1.3 };   // tamanho do nome do cabo
    // Eletrocalha e canaleta (Q2e): faixa larga e translúcida, embaixo dos cabos.
    var DUCT_KINDS = {
        eletrocalha: { label: 'Eletrocalha', c: '#888780', w: 12, o: 0.35, mid: '#5F5E5A' },
        canaleta:    { label: 'Canaleta',    c: '#B4B2A9', w: 7,  o: 0.6,  mid: '' }
    };
    /* Q8-1 (Claudio, 05/10/2026) — paredes da Planta, base do mapa de calor.
       Perda em dB por faixa [2,4 GHz, 5 GHz, 6 GHz]: valores de referência
       de mercado para o modelo multiparede; a calibração (Q8-5) ajusta.
       Material novo = uma linha aqui. A ordem é a da lista no painel. */
    var WALL_KINDS = {
        divisoria: { label: 'Divisória / drywall',             c: '#888780', w: 3, d: '',    loss: [3, 4, 5] },
        vidro:     { label: 'Vidro / vitrine',                 c: '#378ADD', w: 3, d: '7 4', loss: [2, 3, 4] },
        madeira:   { label: 'Porta / madeira',                 c: '#A0662D', w: 3, d: '',    loss: [3, 4, 5] },
        alvenaria: { label: 'Alvenaria (tijolo / bloco)',      c: '#C0582B', w: 5, d: '',    loss: [6, 10, 12] },
        concreto:  { label: 'Concreto / laje',                 c: '#444441', w: 6, d: '',    loss: [12, 18, 20] },
        aco:       { label: 'Porta de aço fechada',            c: '#5F5E5A', w: 5, d: '3 3', loss: [20, 25, 28] },
        metal:     { label: 'Metal / elevador / câmara fria',  c: '#791F1F', w: 6, d: '',    loss: [26, 32, 35] }
    };
    var WALL_DEFAULT = 'alvenaria';
    var WALL_BANDS = ['2,4 GHz', '5 GHz', '6 GHz'];
    function isPath(i) { return !!i && (i.t === 'duct' || i.t === 'wall'); }
    var LINK_DEFAULT = 'cat6';
    // Q5b: ligação de fluxo (só no fluxograma; flow tira da lista de cabos).
    LINK_KINDS.fluxo = { label: 'Fluxo', c: '#5F5E5A', w: 1.6, d: '', arrow: true, flow: true };

    /* Q5b — formas do fluxograma. Cor por tipo (Claudio, 27/09/2026), com
       troca no painel. Tamanho P/M/G muda largura, altura base e letra. */
    var SHAPES = {
        term: { label: 'Início / fim', w: 140, h: 44, color: 'verde' },
        proc: { label: 'Processo',     w: 150, h: 60, color: 'azul' },
        dec:  { label: 'Decisão',      w: 150, h: 84, color: 'ambar' },
        doc:  { label: 'Documento',    w: 150, h: 64, color: 'roxo' },
        data: { label: 'Dados',        w: 150, h: 56, color: 'cinza' },
        conn: { label: 'Conector',     w: 44,  h: 44, color: 'cinza' },
        // Q5e-1 — fluxograma clássico
        sub:     { label: 'Subprocesso',        w: 160, h: 64,  color: 'azul' },
        db:      { label: 'Banco de dados',     w: 110, h: 84,  color: 'cinza' },
        manin:   { label: 'Entrada manual',     w: 150, h: 64,  color: 'cinza' },
        manop:   { label: 'Operação manual',    w: 150, h: 60,  color: 'cinza' },
        prep:    { label: 'Preparação',         w: 150, h: 60,  color: 'cinza' },
        delay:   { label: 'Atraso / espera',    w: 130, h: 60,  color: 'ambar' },
        docs:    { label: 'Vários documentos',  w: 160, h: 76,  color: 'roxo' },
        offpage: { label: 'Conector de página', w: 64,  h: 64,  color: 'cinza' },
        note:    { label: 'Nota adesiva',       w: 150, h: 100, color: 'ambar2' },
        // Q5e-2 — BPMN
        evstart: { label: 'Evento de início',     w: 40,  h: 40,  color: 'verde' },
        evmid:   { label: 'Evento intermediário', w: 40,  h: 40,  color: 'ambar' },
        evend:   { label: 'Evento de fim',        w: 40,  h: 40,  color: 'vermelho' },
        task:    { label: 'Tarefa',               w: 150, h: 70,  color: 'azul' },
        bsub:    { label: 'Subprocesso (BPMN)',   w: 150, h: 70,  color: 'azul' },
        gwx:     { label: 'Gateway exclusivo',    w: 50,  h: 50,  color: 'ambar' },
        gwp:     { label: 'Gateway paralelo',     w: 50,  h: 50,  color: 'ambar' },
        gwi:     { label: 'Gateway inclusivo',    w: 50,  h: 50,  color: 'ambar' },
        dataobj: { label: 'Objeto de dados',      w: 40,  h: 52,  color: 'branco' },
        annot:   { label: 'Anotação',             w: 150, h: 60,  color: 'cinza' },
        group:   { label: 'Grupo',                w: 280, h: 180, color: 'cinza' },
        // Q5j — ícone genérico (Lucide, public/js/codexplus-lucide.js): traço no
        // tom da borda, nome embaixo, sempre quadrado, sem fundo.
        ico:     { label: 'Ícone',                w: 48,  h: 48,  color: 'azul' }
    };
    var ICO_DEFAULT = 'user';
    /* Q5h-2 — link na forma (Claudio, 02/10/2026): documento do Codex+
       { t: 'doc', id, n } (n = código e título no momento da escolha, para
       mostrar sem consultar) ou endereço { t: 'url', u } (só http/https). */
    var LINK_GLYPH = '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>';  // Lucide "link" (ISC)
    var URL_OK = /^https?:\/\/[^\s<>"']+$/i;
    function cleanLk(lk) {
        if (!lk || typeof lk !== 'object') { return null; }
        if (lk.t === 'doc' && (+lk.id | 0) > 0) { return { t: 'doc', id: +lk.id | 0, n: String(lk.n || '').slice(0, 200) }; }
        if (lk.t === 'url' && URL_OK.test(String(lk.u || '')) && String(lk.u).length <= 500) { return { t: 'url', u: String(lk.u) }; }
        return null;
    }
    // Destino e rótulo do link (null = sem link válido).
    function linkOf(it) {
        var lk = cleanLk(it && it.lk);
        if (!lk) { return null; }
        if (lk.t === 'doc') { return { href: BASE + '/front/document.form.php?id=' + lk.id, label: lk.n || ('Documento ' + lk.id), ext: false }; }
        return { href: lk.u, label: lk.u, ext: true };
    }
    /* Q5g — raias (Claudio, 02/10/2026). Orientação por fluxograma: a
       primeira raia decide (h = horizontais, empilhadas; v = verticais, lado
       a lado). Item `lane`: { dir, x, y, w, h, title, desc, ico, tone }. As
       raias ficam sempre encostadas, com o mesmo comprimento (o da primeira),
       e sempre atrás de tudo. Uma forma pertence à raia onde está o centro
       dela. Excluir a raia: as formas dela ficam no quadro, soltas, logo
       depois do conjunto (Claudio, 02/10/2026). */
    var LANE = { h: { hd: 190, th: 150, min: 90, hmin: 80, hmax: 600 }, v: { hd: 110, th: 260, min: 160, hmin: 50, hmax: 400 } };
    // Q5g-3: tamanho do cabeçalho (largura nas horizontais, altura nas
    // verticais), o mesmo em todas as raias; gravado em cada uma (`hd`).
    function laneHd(l) { var m = LANE[l.dir] || LANE.h; return Math.max(m.hmin, Math.min(m.hmax, Math.round(+l.hd || m.hd))); }
    var LANE_TONES = ['azul', 'verde', 'roxo', 'ambar', 'coral', 'cinza'];
    var LANE_DIR = { h: 'Raia horizontal', v: 'Raia vertical' };
    function lanesOf(items) {
        return items.filter(function (i) { return i.t === 'lane'; })
            .sort(function (a, b) { return a.dir === 'h' ? a.y - b.y : a.x - b.x; });
    }
    // Encosta as raias umas nas outras, a partir da primeira, com o
    // comprimento dela. Devolve a ordem final.
    function laneLayout(items) {
        var ls = lanesOf(items);
        if (!ls.length) { return ls; }
        var f = ls[0], dir = f.dir, hd = laneHd(f), len = Math.max(hd + 100, dir === 'h' ? f.w : f.h), pos = dir === 'h' ? f.y : f.x;
        ls.forEach(function (l) {
            l.dir = dir; l.hd = hd;
            if (dir === 'h') { l.x = f.x; l.w = len; l.y = pos; pos += l.h; }
            else { l.y = f.y; l.h = len; l.x = pos; pos += l.w; }
        });
        return ls;
    }
    function inLane(l, it) {
        var b = it.t === 'shape' ? { x: it.x, y: it.y, w: it.w, h: it.h } : bbox(it), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
        return cx >= l.x && cx < l.x + l.w && cy >= l.y && cy < l.y + l.h;
    }
    // Formas e textos com o centro dentro da raia.
    function laneMembers(items, l) {
        return items.filter(function (i) { return (i.t === 'shape' || i.t === 'text') && inLane(l, i); }).map(function (i) { return i.id; });
    }
    function laneSvg(items, forExport) {
        var ls = lanesOf(items);
        if (!ls.length) { return ''; }
        // Cantos arredondados: tudo dentro da moldura é recortado por ela (o
        // cabeçalho não passa do canto). Id novo a cada desenho: o mesmo
        // quadro pode estar na página e no editor ao mesmo tempo.
        var f = ls[0], z = ls[ls.length - 1], fw = z.x + z.w - f.x, fh = z.y + z.h - f.y, cid = 'cxl' + uid();
        var out = '<defs><clipPath id="' + cid + '"><rect x="' + f.x + '" y="' + f.y + '" width="' + fw + '" height="' + fh + '" rx="10"/></clipPath></defs><g clip-path="url(#' + cid + ')">';
        ls.forEach(function (l, i) {
            var c = pal(l.tone), x = l.x, y = l.y, w = l.w, h = l.h, H = l.dir === 'h', hd = laneHd(l), g = '';
            // Corpo: só pinta; o clique passa para o quadro (seleciona formas).
            g += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + c.f + '" fill-opacity="0.35" pointer-events="none"/>';
            if (i) { g += '<path d="' + (H ? 'M' + x + ' ' + y + 'H' + (x + w) : 'M' + x + ' ' + y + 'V' + (y + h)) + '" stroke="#B4B2A9" stroke-width="1.2" pointer-events="none"/>'; }
            // Cabeçalho: é por ele que a raia é selecionada.
            var hw = H ? hd : w, hh = H ? h : hd;
            g += '<g data-id="' + l.id + '"' + (forExport ? '' : ' class="cx-board-lanehd"') + '><rect x="' + x + '" y="' + y + '" width="' + hw + '" height="' + hh + '" fill="' + c.f + '"/>';
            g += '<path d="' + (H ? 'M' + (x + hd) + ' ' + y + 'V' + (y + h) : 'M' + x + ' ' + (y + hd) + 'H' + (x + w)) + '" stroke="' + c.s + '" stroke-opacity="0.35" stroke-width="1.2"/>';
            var body = l.ico && Lucide().SVG[l.ico], isz = H ? 30 : 28, tx = H ? x + 16 : x + w / 2, anc = H ? 'start' : 'middle';
            var ty = y + (body ? (H ? 18 + isz + 28 : 12 + isz + 22) : (H ? 34 : 34));
            if (body) {
                var ix = H ? x + 16 : x + w / 2 - isz / 2, iy = y + (H ? 18 : 12), k = isz / 24;
                g += '<g transform="translate(' + ix + ' ' + iy + ') scale(' + k.toFixed(4) + ')" fill="none" stroke="' + c.s + '" stroke-width="' + Math.min(2, 4 / k).toFixed(3) + '" stroke-linecap="round" stroke-linejoin="round">' + body + '</g>';
            }
            var tw = H ? hd - 32 : w - 24;
            var tl = wrapText(l.title, tw, H ? 17 : 16).slice(0, 2), dl = String(l.desc || '').trim() ? wrapText(l.desc, tw, 12.5).slice(0, H ? Math.max(1, Math.floor((h - (ty - y) - 10) / 16) - tl.length + 1) : 3) : [];
            if (String(l.title || '').trim()) {
                g += '<text x="' + tx + '" y="' + ty + '" text-anchor="' + anc + '" font-family="Arial,sans-serif" font-size="' + (H ? 17 : 16) + '" font-weight="bold" fill="' + c.t + '">'
                    + tl.map(function (t, j) { return '<tspan x="' + tx + '" dy="' + (j ? 20 : 0) + '">' + esc(t) + '</tspan>'; }).join('') + '</text>';
            }
            var dy0 = ty + (String(l.title || '').trim() ? (tl.length - 1) * 20 + 20 : 0);
            if (dl.length) {
                g += '<text x="' + tx + '" y="' + dy0 + '" text-anchor="' + anc + '" font-family="Arial,sans-serif" font-size="12.5" fill="' + c.t + '">'
                    + dl.map(function (t, j) { return '<tspan x="' + tx + '" dy="' + (j ? 16 : 0) + '">' + esc(t) + '</tspan>'; }).join('') + '</text>';
            }
            out += g + '</g>';
        });
        out += '</g><rect x="' + f.x + '" y="' + f.y + '" width="' + fw + '" height="' + fh + '" rx="10" fill="none" stroke="#888780" stroke-width="1.4" pointer-events="none"/>';
        if (!forExport) {
            // Q5g-2: faixas invisíveis para puxar. Fim de cada raia = espessura
            // dela (a linha entre duas raias e a borda de fora); ponta do
            // conjunto = comprimento de todas. Ficam sob as formas.
            var hz = f.dir === 'h', hit = ' fill="#fff" fill-opacity="0"';
            ls.forEach(function (l) {
                out += hz ? '<rect class="cx-board-lrz-h" data-lrz="' + l.id + '" x="' + l.x + '" y="' + (l.y + l.h - 5) + '" width="' + l.w + '" height="10"' + hit + '/>'
                    : '<rect class="cx-board-lrz-v" data-lrz="' + l.id + '" x="' + (l.x + l.w - 5) + '" y="' + l.y + '" width="10" height="' + l.h + '"' + hit + '/>';
            });
            out += hz ? '<rect class="cx-board-lrz-v" data-llen="1" x="' + (f.x + fw - 5) + '" y="' + f.y + '" width="10" height="' + fh + '"' + hit + '/>'
                : '<rect class="cx-board-lrz-h" data-llen="1" x="' + f.x + '" y="' + (f.y + fh - 5) + '" width="' + fw + '" height="10"' + hit + '/>';
            // Q5g-3: linha do cabeçalho (vale para todas as raias).
            var hdF = laneHd(f);
            out += hz ? '<rect class="cx-board-lrz-v" data-lhd="1" x="' + (f.x + hdF - 5) + '" y="' + f.y + '" width="10" height="' + fh + '"' + hit + '/>'
                : '<rect class="cx-board-lrz-h" data-lhd="1" x="' + f.x + '" y="' + (f.y + hdF - 5) + '" width="' + fw + '" height="10"' + hit + '/>';
        }
        return out;
    }
    function Lucide() { return window.CodexplusLucide || { CATS: [], NAME: {}, SVG: {} }; }
    function icoName(k) { return Lucide().NAME[k] || 'Ícone'; }
    // Nome embaixo da forma (BPMN); formas sempre redondas/quadradas; sem fundo.
    var LABEL_BELOW = ['evstart', 'evmid', 'evend', 'gwx', 'gwp', 'gwi', 'dataobj', 'ico'];
    var SQUARE = ['conn', 'evstart', 'evmid', 'evend', 'gwx', 'gwp', 'gwi', 'ico'];
    var NO_FILL = ['annot', 'group', 'ico'];
    // Tipo do evento e da tarefa (marcador desenhado dentro).
    var EV_MK = { none: 'Simples', msg: 'Mensagem', timer: 'Temporizador' };
    var TASK_MK = { none: 'Simples', user: 'Usuário', service: 'Serviço', manual: 'Manual' };
    var MK_OPTS = { evstart: EV_MK, evmid: EV_MK, evend: EV_MK, task: TASK_MK };
    // Atalhos da paleta: mesma forma com o tipo já escolhido.
    var PRESETS = { 'evmid:msg': 'Mensagem', 'evmid:timer': 'Temporizador' };
    function below(it) { return LABEL_BELOW.indexOf(it.shape) >= 0; }
    // Q5f: formas da mini-paleta (soltar a ligação no vazio).
    var MINI = ['proc', 'dec', 'term', 'doc', 'data', 'sub', 'task', 'gwx', 'evend'];
    var BPMN_SET = ['evstart', 'evmid', 'evend', 'task', 'bsub', 'gwx', 'gwp', 'gwi', 'dataobj', 'annot', 'group'];
    // "+" rápido: a próxima forma repete a origem, menos quando a origem é
    // ponto de partida/chegada, decisão ou marcador — aí vem o passo comum.
    function nextShapeOf(k) {
        if (BPMN_SET.indexOf(k) >= 0) { return ['task', 'bsub'].indexOf(k) >= 0 ? k : 'task'; }
        return ['term', 'dec', 'conn', 'offpage', 'note', 'data', 'db', 'ico'].indexOf(k) >= 0 ? 'proc' : k;
    }
    var OPP = { n: 's', s: 'n', l: 'o', o: 'l' };
    function labelW(it) { return Math.max(it.w * 2.4, 110); }
    // Paleta em seções (Q5e). Forma nova = uma linha em SHAPES e o nome aqui.
    var SHAPE_GROUPS = [
        { k: 'flux', label: 'Fluxograma', items: ['term', 'proc', 'dec', 'doc', 'data', 'conn', 'sub', 'db', 'manin', 'manop', 'prep', 'delay', 'docs', 'offpage', 'note'] },
        { k: 'bpmn', label: 'BPMN', items: ['evstart', 'evmid', 'evend', 'evmid:msg', 'evmid:timer', 'task', 'bsub', 'gwx', 'gwp', 'gwi', 'dataobj', 'annot', 'group'] },
        // Q5g: raias (botões próprios, montados na paleta).
        { k: 'lane', label: 'Raias', items: [] },
        // Q5j-2: todos os desenhos do catálogo, em subgrupos (montados na paleta).
        { k: 'ico', label: 'Ícones', items: [] }
    ];
    // Medidas internas de cada forma (desenho, texto e âncoras usam as mesmas).
    function skewOf(it) { return Math.min(20, it.w * 0.15); }
    function dbRy(it) { return Math.min(12, it.h * 0.16); }
    function stackOf(it) { return Math.min(8, it.w * 0.05, it.h * 0.1); }
    // Q5c: 12 tons fixos (Claudio, 27/09/2026). Cada tom tem fundo (f),
    // borda (s) e texto (t): "Fundo", "Borda" e "Texto" escolhem o tom.
    var FLOW_COLORS = {
        verde:    { label: 'Verde',        f: '#E1F5EE', s: '#0F6E56', t: '#085041' },
        verde2:   { label: 'Verde forte',  f: '#9FE1CB', s: '#0F6E56', t: '#04342C' },
        azul:     { label: 'Azul',         f: '#E6F1FB', s: '#185FA5', t: '#0C447C' },
        azul2:    { label: 'Azul forte',   f: '#B5D4F4', s: '#185FA5', t: '#042C53' },
        ambar:    { label: 'Âmbar',        f: '#FAEEDA', s: '#854F0B', t: '#633806' },
        ambar2:   { label: 'Âmbar forte',  f: '#FAC775', s: '#854F0B', t: '#412402' },
        roxo:     { label: 'Roxo',         f: '#EEEDFE', s: '#534AB7', t: '#3C3489' },
        roxo2:    { label: 'Roxo forte',   f: '#CECBF6', s: '#534AB7', t: '#26215C' },
        coral:    { label: 'Coral',        f: '#FAECE7', s: '#993C1D', t: '#712B13' },
        vermelho: { label: 'Vermelho',     f: '#FCEBEB', s: '#A32D2D', t: '#791F1F' },
        cinza:    { label: 'Cinza',        f: '#F1EFE8', s: '#5F5E5A', t: '#444441' },
        branco:   { label: 'Branco / preto', f: '#ffffff', s: '#5F5E5A', t: '#1d2330' }
    };
    var SHAPE_K = { p: 0.8, m: 1, g: 1.25 };   // só para ler o `sz` do Q5b
    var SHAPE_FS = 13;
    var FS_LIST = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32];
    var SHAPE_MAX = 1600;
    // Cores aceitas em texto e moldura: as de sempre + as dos 12 tons.
    var PAL_HEX = COLORS.concat(['#1d2330']);
    Object.keys(FLOW_COLORS).forEach(function (k) { [FLOW_COLORS[k].s, FLOW_COLORS[k].t].forEach(function (c) { if (PAL_HEX.indexOf(c) < 0) { PAL_HEX.push(c); } }); });
    function pal(k) { return FLOW_COLORS[k] || FLOW_COLORS.azul; }
    function shapeFs(it) { return it.fs || SHAPE_FS; }
    // Q5d — ligação de fluxo.
    var FLOW_W = { f: 1.6, m: 3, g: 5 };
    var FLOW_W_LABEL = { f: 'Fina', m: 'Média', g: 'Grossa' };
    var FLOW_DASH = { solid: 'Contínuo', dash: 'Tracejado', dot: 'Pontilhado' };
    var FLOW_HEADS = { none: 'Nenhuma', arrow: 'Seta cheia', open: 'Seta aberta', diamond: 'Losango', circle: 'Círculo' };
    function headLen(w) { return 7 + w * 2.6; }
    // Ponta desenhada (sem <marker>, por causa do PNG): tip = bico, from = de onde vem.
    function flowHead(type, tip, from, w, c) {
        if (!type || type === 'none') { return ''; }
        var ang = Math.atan2(tip.y - from.y, tip.x - from.x), ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux;
        var L = headLen(w), hw = 3.2 + w * 1.25, f = function (x, y) { return x.toFixed(1) + ' ' + y.toFixed(1); };
        var bx = tip.x - ux * L, by = tip.y - uy * L;
        if (type === 'arrow') {
            return '<path d="M' + f(tip.x, tip.y) + 'L' + f(bx + px * hw, by + py * hw) + 'L' + f(bx - px * hw, by - py * hw) + 'Z" fill="' + c + '"/>';
        }
        if (type === 'open') {
            return '<path d="M' + f(bx + px * hw, by + py * hw) + 'L' + f(tip.x, tip.y) + 'L' + f(bx - px * hw, by - py * hw) + '" fill="none" stroke="' + c
                + '" stroke-width="' + Math.max(1.4, w) + '" stroke-linecap="round" stroke-linejoin="round"/>';
        }
        if (type === 'diamond') {
            var mx = tip.x - ux * L / 2, my = tip.y - uy * L / 2;
            return '<path d="M' + f(tip.x, tip.y) + 'L' + f(mx + px * hw * 0.8, my + py * hw * 0.8) + 'L' + f(bx, by) + 'L' + f(mx - px * hw * 0.8, my - py * hw * 0.8) + 'Z" fill="#fff" stroke="' + c + '" stroke-width="' + Math.max(1.2, w * 0.7) + '"/>';
        }
        var r = L / 2 - 0.5;
        return '<circle cx="' + (tip.x - ux * r).toFixed(1) + '" cy="' + (tip.y - uy * r).toFixed(1) + '" r="' + r.toFixed(1) + '" fill="#fff" stroke="' + c + '" stroke-width="' + Math.max(1.2, w * 0.7) + '"/>';
    }
    // Recua a ponta da polilinha d unidades (a linha não fura a seta).
    function trimEnd(pts, d) {
        var o = pts.slice(), n = o.length, a = o[n - 2], b = o[n - 1];
        var l = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
        if (l < 1) { return o; }
        var k = Math.min(d, l - 0.5) / l;
        o[n - 1] = { x: b.x - (b.x - a.x) * k, y: b.y - (b.y - a.y) * k };
        return o;
    }
    // Cantos arredondados nas dobras do cotovelo.
    function roundedD(pts, r) {
        var f = function (q) { return q.x.toFixed(1) + ' ' + q.y.toFixed(1); }, d = 'M' + f(pts[0]);
        for (var i = 1; i < pts.length - 1; i++) {
            var a = pts[i - 1], b = pts[i], c = pts[i + 1];
            var l1 = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2)), l2 = Math.sqrt(Math.pow(c.x - b.x, 2) + Math.pow(c.y - b.y, 2));
            var rr = Math.min(r, l1 / 2, l2 / 2);
            if (rr < 1) { d += 'L' + f(b); continue; }
            var p1 = { x: b.x - (b.x - a.x) / l1 * rr, y: b.y - (b.y - a.y) / l1 * rr }, p2 = { x: b.x + (c.x - b.x) / l2 * rr, y: b.y + (c.y - b.y) / l2 * rr };
            d += 'L' + f(p1) + 'Q' + f(b) + ' ' + f(p2);
        }
        return d + 'L' + f(pts[pts.length - 1]);
    }
    // Fração (0..1) do ponto da polilinha mais perto de p.
    function nearestT(pts, p) {
        var tot = 0, seg = [], i;
        for (i = 1; i < pts.length; i++) { var l = Math.sqrt(Math.pow(pts[i].x - pts[i - 1].x, 2) + Math.pow(pts[i].y - pts[i - 1].y, 2)); seg.push(l); tot += l; }
        if (!tot) { return 0.5; }
        var best = Infinity, bt = 0.5, acc = 0;
        for (i = 1; i < pts.length; i++) {
            var a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
            var t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
            var x = a.x + t * dx - p.x, y = a.y + t * dy - p.y, dd = x * x + y * y;
            if (dd < best) { best = dd; bt = (acc + t * seg[i - 1]) / tot; }
            acc += seg[i - 1];
        }
        return bt;
    }
    function flowLinkSvg(L, find, forExport) {
        var pts = routePts(L, find);
        if (!pts || pts.length < 2) { return ''; }
        var w = FLOW_W[L.lw] || FLOW_W.f, c = pal(L.lc || 'cinza').s, n = pts.length, h = '<g data-id="' + L.id + '">';
        var line = pts;
        if (L.eb && L.eb !== 'none') { line = trimEnd(line, headLen(w) * (L.eb === 'open' ? 0.15 : 0.85)); }
        if (L.ea && L.ea !== 'none') { line = trimEnd(line.slice().reverse(), headLen(w) * (L.ea === 'open' ? 0.15 : 0.85)).reverse(); }
        var d = L.route === 'elbow' ? roundedD(line, 10 + w * 2) : linkD(line);
        if (!forExport) { h += '<path d="' + routeD(L, find) + '" fill="none" stroke="transparent" stroke-width="14" vector-effect="non-scaling-stroke"/>'; }
        var dash = L.dash === 'dash' ? ' stroke-dasharray="' + (w * 4 + 2) + ' ' + (w * 2.5 + 2) + '"' : L.dash === 'dot' ? ' stroke-dasharray="0.1 ' + (w * 2.4 + 2) + '"' : '';
        h += '<path class="cx-board-link" d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="' + (L.dash === 'dot' ? 'round' : 'butt') + '" stroke-linejoin="round"' + dash + '/>';
        h += flowHead(L.eb, pts[n - 1], pts[n - 2], w, c) + flowHead(L.ea, pts[0], pts[1], w, c);
        if (L.label) {
            var b = pal(L.lbg || 'branco'), fs = 12 * (LINK_FS[L.fs] || 1), m = midPoint(pts, L.lt === undefined ? 0.5 : L.lt);
            var bw = L.label.length * fs * 0.56 + fs, bh = fs + 8;
            h += '<rect data-lbl="1" x="' + (m.x - bw / 2).toFixed(1) + '" y="' + (m.y - bh / 2).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh + '" rx="' + (bh / 3).toFixed(1)
                + '" fill="' + b.f + '" stroke="' + b.s + '" stroke-width="0.9"' + (forExport ? '' : ' style="cursor:ew-resize"') + '/>'
                + '<text data-lbl="1" x="' + m.x.toFixed(1) + '" y="' + (m.y + fs * 0.36).toFixed(1) + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="' + fs + '" fill="' + b.t + '"'
                + (forExport ? '' : ' style="cursor:ew-resize"') + '>' + esc(L.label) + '</text>';
        }
        return h + '</g>';
    }
    function shapeMinW(it) { return SQUARE.indexOf(it.shape) >= 0 || it.shape === 'dataobj' ? 24 : 40; }
    // Largura útil do texto dentro de cada forma.
    function shapeInner(it) {
        var w = it.w;
        if (below(it)) { return labelW(it); }
        switch (it.shape) {
            case 'dec': return w * 0.56;
            case 'group': return w - 20;
            case 'data': return w - 44;
            case 'conn': return w - 8;
            case 'term': return w - 26;
            case 'sub': return w - 2 * Math.min(12, w * 0.08) - 12;
            case 'manop': return w - 2 * skewOf(it) - 10;
            case 'prep': return w - 2 * skewOf(it) - 8;
            case 'delay': return w - Math.min(it.h, w) / 4 - 14;
            case 'docs': return w - 2 * stackOf(it) - 18;
            case 'offpage': return w - 12;
            case 'note': return w - 22;
        }
        return w - 18;
    }
    /*
     * Largura do texto na Arial (em de 1000, tabela da Helvetica/Arial).
     * Q5k-1 (Claudio, 04/10/2026, "texto fica fora do balão"): antes toda
     * letra valia 0,55 em, e palavra longa em maiúsculas (H = 0,72; W = 0,94)
     * saía da forma. Agora cada letra vale a largura dela, NUNCA menos que os
     * 0,55 de antes: texto comum quebra igual; só o largo quebra mais cedo.
     */
    var CHAR_W = (function () {
        var t = {}, add = function (chars, w) { chars.split('').forEach(function (c) { t[c] = w; }); };
        add('0123456789', 556); add('LJ', 556); add('FTZ', 611); add('ABEKPSVXY&', 667);
        add('CDHNRU', 722); add('GOQ', 778); add('M', 833); add('W', 944); add('mw', 833); add('+<>=~', 584);
        t.w = 722; t['%'] = 889; t['@'] = 1015; t['#'] = 556; t['$'] = 556; t['_'] = 556; t['—'] = 1000; t['…'] = 1000;
        return t;
    })();
    function textW(str, fs) {
        var n = 0;
        String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').split('').forEach(function (c) {
            n += Math.max(550, CHAR_W[c] || 0);
        });
        return n * fs / 1000;
    }
    /** Quantas letras do começo de `wd` cabem em maxW (pelo menos 1). */
    function fitChars(wd, maxW, fs) {
        var k = 1;
        while (k < wd.length && textW(wd.slice(0, k + 1), fs) <= maxW) { k++; }
        return k;
    }
    // Quebra por palavra pela largura de cada letra (textW).
    function wrapText(text, maxW, fs, maxLines) {
        var out = [];
        String(text || '').split('\n').forEach(function (par) {
            var line = '';
            par.split(/\s+/).filter(Boolean).forEach(function (wd) {
                while (wd.length > 1 && textW(wd, fs) > maxW) {
                    if (line) { out.push(line); line = ''; }
                    var k = fitChars(wd, maxW, fs);
                    out.push(wd.slice(0, k)); wd = wd.slice(k);
                }
                if (!line) { line = wd; } else if (textW(line + ' ' + wd, fs) <= maxW) { line += ' ' + wd; } else { out.push(line); line = wd; }
            });
            out.push(line);
        });
        while (out.length > 1 && out[out.length - 1] === '') { out.pop(); }
        return out.slice(0, maxLines || 30);
    }
    // Altura que o texto precisa na largura atual.
    function shapeNeed(it) {
        var fs = shapeFs(it), lines = String(it.text || '').trim() ? wrapText(it.text, shapeInner(it), fs).length : 0;
        var need = lines * fs * 1.25;
        if (below(it) || it.shape === 'group') { return 0; }   // nome fora da forma / no canto
        switch (it.shape) {
            case 'task': return Math.ceil(need + fs * 1.4 + (it.mk && it.mk !== 'none' ? 16 : 0));
            case 'bsub': return Math.ceil(need + fs * 1.4 + 16);
            case 'annot': return Math.ceil(need + fs);
            case 'dec': return Math.ceil(need / 0.5 + 12);
            case 'doc': return Math.ceil(need + fs * 2);
            case 'db': return Math.ceil(need + fs * 1.4 + dbRy(it) * 3);
            case 'docs': return Math.ceil(need + fs * 2 + stackOf(it) * 2);
            case 'manin': return Math.ceil((need + fs * 1.4) / 0.78);
            case 'offpage': return Math.ceil((need + fs * 1.2) / 0.66);
            case 'note': return Math.ceil(need + fs * 2);
        }
        return Math.ceil(need + fs * 1.4);
    }
    // Q5c: w e h são os que a pessoa ajustou (sem eles, o tamanho do tipo);
    // a altura nunca fica menor do que o texto precisa (Claudio, 27/09/2026).
    function shapeFit(it) {
        var b = SHAPES[it.shape] || SHAPES.proc, k = SHAPE_K[it.sz] || 1;
        if (!(+it.fs > 0)) { it.fs = Math.round(SHAPE_FS * k * 2) / 2; }
        it.fs = Math.max(8, Math.min(48, +it.fs));
        it.w = Math.max(shapeMinW(it), Math.min(SHAPE_MAX, Math.round(+it.w > 0 ? +it.w : b.w * k)));
        it.h = Math.max(shapeMinW(it), Math.min(SHAPE_MAX, Math.round(+it.h > 0 ? +it.h : b.h * k)));
        it.h = Math.max(it.h, Math.min(SHAPE_MAX, shapeNeed(it)));
        if (SQUARE.indexOf(it.shape) >= 0) { it.w = it.h = Math.max(it.w, it.h); }
        delete it.sz;
        return it;
    }
    // Marcadores BPMN (traço na cor da borda).
    function markerSvg(it, c) {
        var x = it.x, y = it.y, w = it.w, h = it.h, cx = x + w / 2, cy = y + h / 2, r = w / 2, sw = ' fill="none" stroke="' + c + '" stroke-width="1.4"';
        var mk = it.mk || 'none';
        if (/^ev/.test(it.shape)) {
            if (mk === 'msg') {
                var ew = r * 0.95, eh = r * 0.64;
                return '<rect x="' + (cx - ew / 2).toFixed(1) + '" y="' + (cy - eh / 2).toFixed(1) + '" width="' + ew.toFixed(1) + '" height="' + eh.toFixed(1) + '"' + sw + '/>'
                    + '<path d="M' + (cx - ew / 2).toFixed(1) + ' ' + (cy - eh / 2).toFixed(1) + 'L' + cx.toFixed(1) + ' ' + (cy + eh * 0.1).toFixed(1) + 'L' + (cx + ew / 2).toFixed(1) + ' ' + (cy - eh / 2).toFixed(1) + '"' + sw + '/>';
            }
            if (mk === 'timer') {
                var tr = r * 0.52;
                return '<circle cx="' + cx + '" cy="' + cy + '" r="' + tr.toFixed(1) + '"' + sw + '/>'
                    + '<path d="M' + cx + ' ' + (cy - tr * 0.75).toFixed(1) + 'V' + cy + 'L' + (cx + tr * 0.55).toFixed(1) + ' ' + (cy + tr * 0.3).toFixed(1) + '"' + sw + '/>';
            }
            return '';
        }
        if (it.shape === 'task') {
            var mx = x + 8, my = y + 7;
            if (mk === 'user') {
                return '<circle cx="' + (mx + 7) + '" cy="' + (my + 4) + '" r="3.5"' + sw + '/><path d="M' + mx + ' ' + (my + 16) + 'Q' + (mx + 7) + ' ' + (my + 6) + ' ' + (mx + 14) + ' ' + (my + 16) + 'Z"' + sw + '/>';
            }
            if (mk === 'service') {
                var gx = mx + 7, gy = my + 7, sp = '';
                for (var a = 0; a < 8; a++) { var an = a * Math.PI / 4; sp += 'M' + (gx + Math.cos(an) * 5).toFixed(1) + ' ' + (gy + Math.sin(an) * 5).toFixed(1) + 'L' + (gx + Math.cos(an) * 7.5).toFixed(1) + ' ' + (gy + Math.sin(an) * 7.5).toFixed(1); }
                return '<circle cx="' + gx + '" cy="' + gy + '" r="5"' + sw + '/><circle cx="' + gx + '" cy="' + gy + '" r="2"' + sw + '/><path d="' + sp + '"' + sw + '/>';
            }
            if (mk === 'manual') {
                return '<rect x="' + mx + '" y="' + (my + 3) + '" width="7" height="11" rx="2"' + sw + '/><path d="M' + (mx + 7) + ' ' + (my + 4) + 'H' + (mx + 15) + 'M' + (mx + 7) + ' ' + (my + 7.5) + 'H' + (mx + 16)
                    + 'M' + (mx + 7) + ' ' + (my + 11) + 'H' + (mx + 14) + 'M' + (mx + 2) + ' ' + (my + 3) + 'L' + (mx + 4) + ' ' + my + '"' + sw + '/>';
            }
        }
        return '';
    }
    // Centro vertical do texto (fora das partes "decorativas" de cada forma).
    function shapeTextCy(it) {
        var y = it.y, h = it.h;
        switch (it.shape) {
            case 'doc': return y + (h - Math.min(9, h * 0.15)) / 2;
            case 'db': return y + dbRy(it) * 2 + (h - dbRy(it) * 3) / 2;
            case 'manin': return y + h * 0.22 + (h * 0.78) / 2;
            case 'docs': var so = stackOf(it); return y + 2 * so + (h - 2 * so - Math.min(8, (h - 2 * so) * 0.15)) / 2;
            case 'offpage': return y + h * 0.36;
            case 'task': return y + h / 2 + (it.mk && it.mk !== 'none' ? 6 : 0);
            case 'bsub': return y + (h - 14) / 2;
        }
        return y + h / 2;
    }
    function shapeSvg(it, forExport) {
        var x = it.x, y = it.y, w = it.w, h = it.h, ink = pal(it.ink).t, lc = pal(it.line).s;
        var st = ' fill="' + pal(it.fill).f + '" stroke="' + pal(it.line).s + '" stroke-width="1.6"', g = '', wv = Math.min(9, h * 0.15);
        if (it.shape === 'term') { g = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + Math.min(h, w) / 2 + '"' + st + '/>'; }
        else if (it.shape === 'dec') { g = '<path d="M' + (x + w / 2) + ' ' + y + 'L' + (x + w) + ' ' + (y + h / 2) + 'L' + (x + w / 2) + ' ' + (y + h) + 'L' + x + ' ' + (y + h / 2) + 'Z"' + st + '/>'; }
        else if (it.shape === 'doc') {
            g = '<path d="M' + x + ' ' + y + 'H' + (x + w) + 'V' + (y + h - wv) + 'Q' + (x + w * 0.75) + ' ' + (y + h - wv * 2) + ' ' + (x + w / 2) + ' ' + (y + h - wv)
                + 'T' + x + ' ' + (y + h - wv) + 'Z"' + st + '/>';
        }
        else if (it.shape === 'data') { var sk = Math.min(20, w * 0.15); g = '<path d="M' + (x + sk) + ' ' + y + 'H' + (x + w) + 'L' + (x + w - sk) + ' ' + (y + h) + 'H' + x + 'Z"' + st + '/>'; }
        else if (it.shape === 'conn') { g = '<circle cx="' + (x + w / 2) + '" cy="' + (y + h / 2) + '" r="' + w / 2 + '"' + st + '/>'; }
        else if (it.shape === 'sub') {
            var sb = Math.min(12, w * 0.08);
            g = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3"' + st + '/>'
                + '<path d="M' + (x + sb) + ' ' + y + 'V' + (y + h) + 'M' + (x + w - sb) + ' ' + y + 'V' + (y + h) + '" stroke="' + pal(it.line).s + '" stroke-width="1.6" fill="none"/>';
        }
        else if (it.shape === 'db') {
            var ry = dbRy(it), rx = w / 2;
            g = '<path d="M' + x + ' ' + (y + ry) + 'V' + (y + h - ry) + 'A' + rx + ' ' + ry + ' 0 0 0 ' + (x + w) + ' ' + (y + h - ry) + 'V' + (y + ry) + 'Z"' + st + '/>'
                + '<ellipse cx="' + (x + w / 2) + '" cy="' + (y + ry) + '" rx="' + rx + '" ry="' + ry + '"' + st + '/>';
        }
        else if (it.shape === 'manin') { g = '<path d="M' + x + ' ' + (y + h * 0.22) + 'L' + (x + w) + ' ' + y + 'V' + (y + h) + 'H' + x + 'Z"' + st + '/>'; }
        else if (it.shape === 'manop') { var mk = skewOf(it); g = '<path d="M' + x + ' ' + y + 'H' + (x + w) + 'L' + (x + w - mk) + ' ' + (y + h) + 'H' + (x + mk) + 'Z"' + st + '/>'; }
        else if (it.shape === 'prep') {
            var pk = skewOf(it);
            g = '<path d="M' + (x + pk) + ' ' + y + 'H' + (x + w - pk) + 'L' + (x + w) + ' ' + (y + h / 2) + 'L' + (x + w - pk) + ' ' + (y + h) + 'H' + (x + pk) + 'L' + x + ' ' + (y + h / 2) + 'Z"' + st + '/>';
        }
        else if (it.shape === 'delay') {
            var dr = Math.min(h, w) / 2;
            g = '<path d="M' + x + ' ' + y + 'H' + (x + w - dr) + 'A' + dr + ' ' + (h / 2) + ' 0 0 1 ' + (x + w - dr) + ' ' + (y + h) + 'H' + x + 'Z"' + st + '/>';
        }
        else if (it.shape === 'docs') {
            var so = stackOf(it), dw = w - 2 * so, dh = h - 2 * so, dv = Math.min(8, dh * 0.15);
            var one = function (ox, oy) {
                return '<path d="M' + (x + ox) + ' ' + (y + oy) + 'H' + (x + ox + dw) + 'V' + (y + oy + dh - dv) + 'Q' + (x + ox + dw * 0.75) + ' ' + (y + oy + dh - dv * 2) + ' ' + (x + ox + dw / 2) + ' ' + (y + oy + dh - dv)
                    + 'T' + (x + ox) + ' ' + (y + oy + dh - dv) + 'Z"' + st + '/>';
            };
            g = one(2 * so, 0) + one(so, so) + one(0, 2 * so);
        }
        else if (it.shape === 'offpage') { g = '<path d="M' + x + ' ' + y + 'H' + (x + w) + 'V' + (y + h * 0.66) + 'L' + (x + w / 2) + ' ' + (y + h) + 'L' + x + ' ' + (y + h * 0.66) + 'Z"' + st + '/>'; }
        else if (it.shape === 'note') {
            var nf = Math.min(16, w * 0.14, h * 0.2);
            g = '<path d="M' + x + ' ' + y + 'H' + (x + w) + 'V' + (y + h - nf) + 'L' + (x + w - nf) + ' ' + (y + h) + 'H' + x + 'Z"' + st + '/>'
                + '<path d="M' + (x + w) + ' ' + (y + h - nf) + 'H' + (x + w - nf) + 'V' + (y + h) + '" fill="' + pal(it.line).s + '" fill-opacity="0.18" stroke="' + pal(it.line).s + '" stroke-width="1.2"/>';
        }
        else if (/^ev/.test(it.shape)) {
            var er = w / 2, ecx = x + er, ecy = y + h / 2, fl = pal(it.fill).f;
            if (it.shape === 'evend') { g = '<circle cx="' + ecx + '" cy="' + ecy + '" r="' + (er - 1.75) + '" fill="' + fl + '" stroke="' + lc + '" stroke-width="3.5"/>'; }
            else if (it.shape === 'evmid') {
                g = '<circle cx="' + ecx + '" cy="' + ecy + '" r="' + er + '"' + st + '/><circle cx="' + ecx + '" cy="' + ecy + '" r="' + Math.max(2, er - 3.5) + '" fill="none" stroke="' + lc + '" stroke-width="1.4"/>';
            }
            else { g = '<circle cx="' + ecx + '" cy="' + ecy + '" r="' + er + '"' + st + '/>'; }
            g += markerSvg(it, lc);
        }
        else if (it.shape === 'task' || it.shape === 'bsub') {
            g = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10"' + st + '/>' + markerSvg(it, lc);
            if (it.shape === 'bsub') {
                var bx = x + w / 2 - 7, by = y + h - 17;
                g += '<rect x="' + bx + '" y="' + by + '" width="14" height="14" fill="none" stroke="' + lc + '" stroke-width="1.4"/>'
                    + '<path d="M' + (bx + 7) + ' ' + (by + 3) + 'V' + (by + 11) + 'M' + (bx + 3) + ' ' + (by + 7) + 'H' + (bx + 11) + '" stroke="' + lc + '" stroke-width="1.6"/>';
            }
        }
        else if (/^gw/.test(it.shape)) {
            g = '<path d="M' + (x + w / 2) + ' ' + y + 'L' + (x + w) + ' ' + (y + h / 2) + 'L' + (x + w / 2) + ' ' + (y + h) + 'L' + x + ' ' + (y + h / 2) + 'Z"' + st + '/>';
            var gcx = x + w / 2, gcy = y + h / 2, q = w * 0.17, ms = ' stroke="' + lc + '" stroke-width="' + Math.max(2, w * 0.06).toFixed(1) + '" fill="none" stroke-linecap="round"';
            if (it.shape === 'gwx') { g += '<path d="M' + (gcx - q) + ' ' + (gcy - q) + 'L' + (gcx + q) + ' ' + (gcy + q) + 'M' + (gcx + q) + ' ' + (gcy - q) + 'L' + (gcx - q) + ' ' + (gcy + q) + '"' + ms + '/>'; }
            else if (it.shape === 'gwp') { g += '<path d="M' + gcx + ' ' + (gcy - q * 1.3) + 'V' + (gcy + q * 1.3) + 'M' + (gcx - q * 1.3) + ' ' + gcy + 'H' + (gcx + q * 1.3) + '"' + ms + '/>'; }
            else { g += '<circle cx="' + gcx + '" cy="' + gcy + '" r="' + (q * 1.2).toFixed(1) + '"' + ms + '/>'; }
        }
        else if (it.shape === 'dataobj') {
            var ff = Math.min(10, w * 0.3);
            g = '<path d="M' + x + ' ' + y + 'H' + (x + w - ff) + 'L' + (x + w) + ' ' + (y + ff) + 'V' + (y + h) + 'H' + x + 'Z"' + st + '/>'
                + '<path d="M' + (x + w - ff) + ' ' + y + 'V' + (y + ff) + 'H' + (x + w) + '" fill="none" stroke="' + lc + '" stroke-width="1.4"/>';
        }
        else if (it.shape === 'annot') {
            // Colchete aberto; o retângulo invisível deixa clicar no meio.
            g = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#fff" fill-opacity="0"/>'
                + '<path d="M' + (x + 12) + ' ' + y + 'H' + x + 'V' + (y + h) + 'H' + (x + 12) + '" fill="none" stroke="' + lc + '" stroke-width="1.6"/>';
        }
        else if (it.shape === 'group') {
            // Sem fundo: o que está dentro continua clicável. Borda mais larga
            // (invisível) só na tela, para pegar o grupo pela borda.
            g = (forExport ? '' : '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="12" fill="none" stroke="transparent" stroke-width="12" vector-effect="non-scaling-stroke"/>')
                + '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="12" fill="none" stroke="' + lc + '" stroke-width="1.6" stroke-dasharray="10 4 2 4"/>';
        }
        else if (it.shape === 'ico') {
            // Q5j: desenho Lucide (24×24) escalado para a forma; retângulo
            // invisível para pegar no meio. Chave fora do catálogo: um "?".
            // Traço de no máximo 4 px na tela: o ícone grande não engorda.
            var body = Lucide().SVG[it.ico], k24 = w / 24, sw24 = Math.min(2, 4 / k24);
            g = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#fff" fill-opacity="0"/>';
            g += body
                ? '<g transform="translate(' + x + ' ' + y + ') scale(' + k24.toFixed(4) + ')" fill="none" stroke="' + lc + '" stroke-width="' + sw24.toFixed(3) + '" stroke-linecap="round" stroke-linejoin="round">' + body + '</g>'
                : '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="none" stroke="' + lc + '" stroke-width="1.4" stroke-dasharray="4 3"/>'
                  + '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + w * 0.15) + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="' + (w * 0.42).toFixed(1) + '" fill="' + lc + '">?</text>';
        }
        else { g = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4"' + st + '/>'; }
        var fs = shapeFs(it), lh = fs * 1.25, txt = String(it.text || '').trim() ? wrapText(it.text, shapeInner(it), fs) : [];
        if (txt.length) {
            var cy = shapeTextCy(it), y0 = cy - (txt.length - 1) * lh / 2 + fs * 0.35;
            // Vários documentos: o texto vai no da frente (embaixo à esquerda).
            var tx = x + (it.shape === 'docs' ? (w - 2 * stackOf(it)) / 2 : w / 2), anc = 'middle';
            // BPMN: nome embaixo (eventos, gateways, objeto de dados); anotação
            // e grupo alinhados à esquerda (grupo no canto de cima).
            if (/^gw/.test(it.shape)) {
                // Gateway: nome acima e à esquerda (longe das 4 pontas, como no Bizagi).
                tx = x + w * 0.3; anc = 'end'; y0 = y - 6 - (txt.length - 1) * lh;
            }
            else if (below(it)) { y0 = y + h + fs + 3; }
            else if (it.shape === 'annot') { tx = x + 10; anc = 'start'; }
            else if (it.shape === 'group') { tx = x + 10; anc = 'start'; y0 = y + fs + 6; }
            g += '<text x="' + tx + '" y="' + y0.toFixed(1) + '" text-anchor="' + anc + '" font-family="Arial,sans-serif" font-size="' + fs + '"' + (it.b ? ' font-weight="bold"' : '') + ' fill="' + ink + '">'
                + txt.map(function (l, i) { return '<tspan x="' + tx + '" dy="' + (i ? lh : 0) + '">' + esc(l) + '</tspan>'; }).join('') + '</text>';
        }
        var lko = linkOf(it);
        if (lko) {
            // Q5h-2: corrente no canto (o nome embaixo não tapa).
            // Losango: no meio da aresta de cima à direita; círculo: a 45°; resto: no canto.
            var lr = 9, lx = x + w - 4, ly = y + 4;
            if (it.shape === 'dec' || /^gw/.test(it.shape)) { lx = x + w * 0.75 + 6; ly = y + h * 0.25 - 6; }
            else if (/^ev/.test(it.shape) || it.shape === 'conn') { lx = x + w / 2 + w * 0.3536; ly = y + h / 2 - h * 0.3536; }
            else if (it.shape === 'ico') { lx = x + w; ly = y; }
            g += '<g class="cx-board-lkmark"><title>' + esc((lko.ext ? 'Abre: ' : 'Abre o documento: ') + lko.label) + '</title>'
                + '<circle cx="' + lx + '" cy="' + ly + '" r="' + lr + '" fill="#fff" stroke="' + lc + '" stroke-width="1.2"/>'
                + '<g transform="translate(' + (lx - 6) + ' ' + (ly - 6) + ') scale(0.5)" fill="none" stroke="' + lc + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' + LINK_GLYPH + '</g></g>';
        }
        return '<g data-id="' + it.id + '">' + g + '</g>';
    }

    function esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function uid() { return 'n' + Math.random().toString(36).slice(2, 9); }
    // Busca sem acento e sem maiúscula ("tecnico" acha "Técnico").
    function norm(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    function Icons() { return window.CodexplusIcons; }

    /* Q4a — ícones criados na instalação. Carregados uma vez por página
       (ajax/icons.php); a lista chega junto com "pode criar?" (só o
       Super-Admin). Falha de rede não impede abrir o quadro. */
    var BASE = (function () {
        var sc = document.currentScript;
        return sc && sc.src ? sc.src.replace(/\/js\/codexplus-board\.js.*$/, '') : '';
    })();
    var LIB = { canCreate: false, promise: null };
    function loadLibrary() {
        if (LIB.promise) { return LIB.promise; }
        if (typeof fetch !== 'function' || !BASE) { LIB.promise = Promise.resolve(); return LIB.promise; }
        LIB.promise = fetch(BASE + '/ajax/icons.php', { credentials: 'same-origin' })
            .then(function (r) { return r.ok ? r.json() : {}; })
            .then(function (j) {
                if (j && Array.isArray(j.icons)) { Icons().addCustom(j.icons); }
                LIB.canCreate = !!(j && j.can_create);
            })
            .catch(function () {});
        return LIB.promise;
    }
    /* Q4b — tratamento do PNG do ícone novo, sobre os pixels (RGBA) do
       recorte de 256 px. Funções puras: testáveis sem canvas.
       removeBg: a cor do fundo é a dos cantos (a que mais se repete entre os
         quatro); some tudo o que, LIGADO À BORDA, estiver perto dessa cor —
         o branco de dentro do desenho (uma porta, um visor) fica. tol 0..100.
         A borda do desenho ganha transparência parcial (sem serrilhado).
       tint: silhueta — todo pixel visível vira a cor da categoria, com a
         mesma transparência; o que é quase branco fica branco. */
    function fxDist(p, i, c) { var r = p[i] - c[0], g = p[i + 1] - c[1], b = p[i + 2] - c[2]; return Math.sqrt(r * r + g * g + b * b); }
    function removeBg(p, w, h, tol) {
        var corners = [0, w - 1, (h - 1) * w, h * w - 1].map(function (k) { return k * 4; });
        // Imagem que já tem fundo transparente (um canto transparente basta): não mexe.
        if (corners.some(function (i) { return p[i + 3] < 16; })) { return 0; }
        var best = corners[0], bestN = -1;
        corners.forEach(function (i) {
            var n = corners.filter(function (j) { return fxDist(p, j, [p[i], p[i + 1], p[i + 2]]) < 24; }).length;
            if (n > bestN) { bestN = n; best = i; }
        });
        var key = [p[best], p[best + 1], p[best + 2]], max = Math.max(1, tol * 2.2);
        var seen = new Uint8Array(w * h), stack = [], gone = 0;
        var push = function (x, y) { if (x >= 0 && y >= 0 && x < w && y < h && !seen[y * w + x]) { seen[y * w + x] = 1; stack.push(y * w + x); } };
        for (var x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
        for (var y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
        var fringe = [];
        while (stack.length) {
            var k = stack.pop(), i = k * 4;
            if (p[i + 3] >= 16 && fxDist(p, i, key) > max) { fringe.push(k); continue; }
            p[i + 3] = 0; gone++;
            var kx = k % w, ky = (k - kx) / w;
            push(kx + 1, ky); push(kx - 1, ky); push(kx, ky + 1); push(kx, ky - 1);
        }
        fringe.forEach(function (k) {
            var i = k * 4, d = fxDist(p, i, key);
            if (d < max * 1.6) { p[i + 3] = Math.round(p[i + 3] * Math.min(1, (d - max) / (max * 0.6))); }
        });
        return gone;
    }
    function tint(p, hex) {
        var c = [parseInt(hex.substr(1, 2), 16), parseInt(hex.substr(3, 2), 16), parseInt(hex.substr(5, 2), 16)];
        for (var i = 0; i < p.length; i += 4) {
            if (p[i + 3] === 0) { continue; }
            // Branco de dentro do desenho (porta, visor) fica branco: o ícone
            // lembra os da paleta (miolo claro, traço na cor da categoria).
            if (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2] > 225) { p[i] = 255; p[i + 1] = 255; p[i + 2] = 255; continue; }
            p[i] = c[0]; p[i + 1] = c[1]; p[i + 2] = c[2];
        }
    }

    // Cópia, no quadro, dos ícones da instalação que ele usa (campo lib).
    function libOf(items) {
        var out = {};
        (items || []).forEach(function (i) {
            if (i.t !== 'icon' || !/^u\d+$/.test(i.icon) || out[i.icon]) { return; }
            var ic = Icons().get(i.icon);
            if (ic && ic.custom) { out[i.icon] = { name: ic.name, cat: ic.cat, search: ic.search, mode: ic.mode, image: ic.img }; }
        });
        return out;
    }

    function starter(mode) {
        return { v: 1, mode: MODES[mode] ? mode : 'topologia', w: 1400, h: 900, bgOpacity: 0.6, pxm: 0, legend: true, items: [] };
    }

    function clean(d, mode) {
        var out = starter(d && d.mode || mode);
        // Q6b-1: o organograma guarda o próprio JSON (o de sempre) em `org`;
        // os itens do quadro são derivados dele a cada desenho.
        if (out.mode === 'organograma') { out.legend = false; out.org = OD() ? OD().normalize(d && d.org) : null; return out; }
        if (!d || typeof d !== 'object') { return out; }
        // Q4a: ícones da instalação guardados no quadro entram antes da
        // conferência dos itens (ícone desconhecido vira genérico).
        if (d.lib && typeof d.lib === 'object') {
            Icons().addCustom(Object.keys(d.lib).map(function (k) { return Object.assign({ key: k }, d.lib[k]); }), true);
        }
        out.w = Math.max(400, Math.min(6000, +d.w || out.w));
        out.h = Math.max(300, Math.min(6000, +d.h || out.h));
        out.bgOpacity = Math.max(0.1, Math.min(1, +d.bgOpacity || out.bgOpacity));
        out.pxm = Math.max(0, Math.min(1000, +d.pxm || 0));
        // Q3b: legenda abaixo do quadro. Quadro novo nasce com ela; quadro
        // gravado antes do Q3b (sem o campo) fica sem, até marcar.
        out.legend = !!d.legend;
        // Q8-1: camada de paredes (só Planta); quadro antigo nasce com ela à mostra.
        if (out.mode === 'planta') { out.wallsOn = d.wallsOn === undefined ? true : !!d.wallsOn; }
        var pxm = out.pxm || PXM_DEFAULT;
        var src = Array.isArray(d.items) ? d.items : [];
        // Q5b: cada paleta com os seus elementos. Fluxograma: formas, texto,
        // moldura e ligação de fluxo. Planta/Topologia: sem formas.
        var flowMode = out.mode === 'fluxograma';
        src.forEach(function (it) {
            if (it && it.t === 'shape') {
                if (!flowMode) { return; }
                var sh = { id: String(it.id || uid()), t: 'shape', x: +it.x || 0, y: +it.y || 0, lock: !!it.lock, g: it.g ? String(it.g) : '',
                    shape: SHAPES[it.shape] ? it.shape : 'proc', text: String(it.text || '').slice(0, 500),
                    w: +it.w || 0, h: +it.h || 0, fs: +it.fs || 0, b: !!it.b };
                // Q5b gravava `sz` (P/M/G) e w/h calculados: vale o w/h gravado.
                if (!sh.w && SHAPE_K[it.sz]) { sh.sz = it.sz; }
                var old = FLOW_COLORS[it.color] ? it.color : SHAPES[sh.shape].color;
                sh.fill = FLOW_COLORS[it.fill] ? it.fill : old;
                sh.line = FLOW_COLORS[it.line] ? it.line : old;
                sh.ink = FLOW_COLORS[it.ink] ? it.ink : old;
                if (MK_OPTS[sh.shape]) { sh.mk = MK_OPTS[sh.shape][it.mk] ? it.mk : 'none'; }
                // Q5j: a chave fica mesmo fora do catálogo (desenha "?"), para
                // não perder o que outra versão gravou.
                if (sh.shape === 'ico') { sh.ico = /^[a-z0-9-]{1,40}$/.test(String(it.ico || '')) ? String(it.ico) : ICO_DEFAULT; }
                var lkc = cleanLk(it.lk);
                if (lkc) { sh.lk = lkc; }
                out.items.push(shapeFit(sh));
                return;
            }
            if (it && (it.t === 'icon' || it.t === 'duct') && flowMode) { return; }
            if (it && it.t === 'duct') {
                var pts = (Array.isArray(it.pts) ? it.pts : []).slice(0, 200).filter(function (q) { return q && isFinite(+q.x) && isFinite(+q.y); })
                    .map(function (q) { return { x: Math.round(+q.x * 10) / 10, y: Math.round(+q.y * 10) / 10 }; });
                if (pts.length < 2) { return; }
                out.items.push({ id: String(it.id || uid()), t: 'duct', pts: pts, kind: DUCT_KINDS[it.kind] ? it.kind : 'eletrocalha',
                    label: String(it.label || '').slice(0, 80), showM: it.showM === undefined ? true : !!it.showM,
                    fs: LINK_FS[it.fs] ? it.fs : 'm', lock: !!it.lock, g: it.g ? String(it.g) : '' });
                return;
            }
            if (it && it.t === 'wall') {
                if (out.mode !== 'planta') { return; }
                var wp = (Array.isArray(it.pts) ? it.pts : []).slice(0, 200).filter(function (q) { return q && isFinite(+q.x) && isFinite(+q.y); })
                    .map(function (q) { return { x: Math.round(+q.x * 10) / 10, y: Math.round(+q.y * 10) / 10 }; });
                if (wp.length < 2) { return; }
                out.items.push({ id: String(it.id || uid()), t: 'wall', pts: wp, mat: WALL_KINDS[it.mat] ? it.mat : WALL_DEFAULT,
                    lock: !!it.lock, g: it.g ? String(it.g) : '' });
                return;
            }
            if (it && it.t === 'lane') {
                if (!flowMode) { return; }
                var dl = it.dir === 'v' ? 'v' : 'h', lm = LANE[dl];
                out.items.push({ id: String(it.id || uid()), t: 'lane', dir: dl, x: +it.x || 0, y: +it.y || 0, lock: false, g: '',
                    w: Math.max(dl === 'v' ? lm.min : lm.hd + 100, Math.min(6000, +it.w || 0)), h: Math.max(dl === 'h' ? lm.min : lm.hd + 100, Math.min(6000, +it.h || 0)),
                    hd: +it.hd || 0, title: String(it.title || '').slice(0, 80), desc: String(it.desc || '').slice(0, 200),
                    ico: /^[a-z0-9-]{1,40}$/.test(String(it.ico || '')) ? String(it.ico) : '', tone: FLOW_COLORS[it.tone] ? it.tone : 'azul' });
                return;
            }
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
                n.color = PAL_HEX.indexOf(it.color) >= 0 ? it.color : COLORS[1];
            } else {
                n.text = String(it.text || '').slice(0, TEXT_MAX);
                n.color = PAL_HEX.indexOf(it.color) >= 0 ? it.color : '#1d2330';
                // Q5k: largura (o texto quebra dentro dela); sem largura, uma linha por Enter.
                if (+it.w > 0) { n.w = Math.max(TEXT_MIN_W, Math.min(TEXT_MAX_W, Math.round(+it.w))); }
                n.size = ['p', 'm', 'g'].indexOf(it.size) >= 0 ? it.size : 'm';
                // Q5c: letra em px (barra flutuante) e negrito.
                if (+it.px > 0) { n.px = Math.max(8, Math.min(96, Math.round(+it.px))); }
                if (it.b) { n.b = true; }
            }
            out.items.push(n);
        });
        // Q5g: uma orientação por fluxograma (a da primeira raia gravada) e
        // raias sempre encostadas.
        var l0 = out.items.filter(function (i) { return i.t === 'lane'; })[0];
        if (l0) { out.items.forEach(function (i) { if (i.t === 'lane') { i.dir = l0.dir; } }); laneLayout(out.items); }
        // Ligações: só entre dois ícones (ou formas) que existem; apagar leva a ligação junto.
        var icons = {};
        out.items.forEach(function (i) { if (i.t === 'icon' || i.t === 'shape') { icons[i.id] = true; } });
        var seen = {};
        out.items.forEach(function (i) { seen[i.id] = true; });
        src.forEach(function (it) {
            if (!it || it.t !== 'link' || !it.a || !it.b) { return; }
            var a = String(it.a.id || ''), b = String(it.b.id || '');
            if (!icons[a] || !icons[b] || a === b) { return; }
            var id = String(it.id || uid());
            if (seen[id]) { id = uid(); }
            seen[id] = true;
            out.items.push({
                id: id, t: 'link', lock: !!it.lock, g: it.g ? String(it.g) : '',
                a: { id: a, side: SIDES.indexOf(it.a.side) >= 0 ? it.a.side : 'l' },
                b: { id: b, side: SIDES.indexOf(it.b.side) >= 0 ? it.b.side : 'o' },
                kind: flowMode ? 'fluxo' : (LINK_KINDS[it.kind] && !LINK_KINDS[it.kind].flow ? it.kind : LINK_DEFAULT),
                route: ['straight', 'elbow', 'curve'].indexOf(it.route) >= 0 ? it.route : 'straight',
                wp: (Array.isArray(it.wp) ? it.wp : []).slice(0, 50).filter(function (p) { return p && isFinite(+p.x) && isFinite(+p.y); })
                    .map(function (p) { return { x: Math.round(+p.x * 10) / 10, y: Math.round(+p.y * 10) / 10 }; }),
                ends: ['none', 'arrow', 'both'].indexOf(it.ends) >= 0 ? it.ends : (flowMode ? 'arrow' : 'none'),
                label: String(it.label || '').slice(0, 80),
                cable: String(it.cable || '').slice(0, 20),
                pa: String(it.pa || '').slice(0, 40), pb: String(it.pb || '').slice(0, 40),
                vel: String(it.vel || '').slice(0, 40), vlan: String(it.vlan || '').slice(0, 40),
                poe: !!it.poe,
                showId: it.showId === undefined ? true : !!it.showId,
                fs: LINK_FS[it.fs] ? it.fs : 'm',
                // Metragem (Q2d): automática pelo traçado e pela escala, com sobra; ou manual.
                len: {
                    mode: it.len && it.len.mode === 'manual' ? 'manual' : 'auto',
                    m: Math.max(0, Math.min(10000, Math.round((+(it.len || {}).m || 0) * 10) / 10)),
                    extra: it.len && isFinite(+it.len.extra) && it.len.extra !== '' && it.len.extra !== null ? Math.max(0, Math.min(100, Math.round(+it.len.extra))) : 10
                },
                showM: it.showM === undefined ? true : !!it.showM
            });
            // Q5b: ligação de fluxo não é cabo — sem número, sem metros.
            if (flowMode) {
                var fl = out.items[out.items.length - 1]; fl.cable = ''; fl.showId = false; fl.showM = false; fl.poe = false;
                // Q5d: estilo. `ends` do Q5b vira ponta no início/fim.
                fl.lc = FLOW_COLORS[it.lc] ? it.lc : 'cinza';
                fl.lw = FLOW_W[it.lw] ? it.lw : 'f';
                fl.dash = FLOW_DASH[it.dash] ? it.dash : 'solid';
                fl.eb = FLOW_HEADS[it.eb] ? it.eb : (fl.ends === 'none' ? 'none' : 'arrow');
                fl.ea = FLOW_HEADS[it.ea] ? it.ea : (fl.ends === 'both' ? 'arrow' : 'none');
                fl.lt = isFinite(+it.lt) && it.lt !== '' && it.lt !== null ? Math.max(0.05, Math.min(0.95, Math.round(+it.lt * 1000) / 1000)) : 0.5;
                fl.lbg = FLOW_COLORS[it.lbg] ? it.lbg : 'branco';
                fl.ends = fl.eb !== 'none' ? (fl.ea !== 'none' ? 'both' : 'arrow') : 'none';
            }
        });
        return out;
    }

    /* ---------------- ligações (Q2a) ---------------- */
    // Ponto de encaixe na borda do ícone. O sul fica abaixo do nome e do IP,
    // para o cabo não passar por cima do texto.
    function anchor(ic, side) {
        if (ic.t === 'shape') {
            // Bordas da forma; no paralelogramo, o meio dos lados inclinados.
            // Lados inclinados (dados, operação manual): o meio do lado.
            var sk = ic.shape === 'data' || ic.shape === 'manop' ? skewOf(ic) / 2 : 0, mx = ic.x + ic.w / 2, my = ic.y + ic.h / 2;
            if (ic.shape === 'docs') {
                // Vários documentos: bordas do documento da frente.
                var so = stackOf(ic), fw = ic.w - 2 * so, fh = ic.h - 2 * so, fx = ic.x, fy = ic.y + 2 * so;
                if (side === 'n') { return { x: ic.x + ic.w / 2, y: ic.y }; }
                if (side === 's') { return { x: fx + fw / 2, y: fy + fh - Math.min(8, fh * 0.15) }; }
                if (side === 'o') { return { x: fx, y: fy + fh / 2 }; }
                return { x: ic.x + ic.w, y: ic.y + fh / 2 };
            }
            // Entrada manual: o topo é inclinado — o meio dele.
            if (side === 'n') { return { x: mx, y: ic.y + (ic.shape === 'manin' ? ic.h * 0.11 : 0) }; }
            // Documento: o meio da borda de baixo é a crista da onda.
            if (side === 's') { return { x: mx, y: ic.y + ic.h - (ic.shape === 'doc' ? Math.min(9, ic.h * 0.15) : 0) }; }
            if (side === 'o') { return { x: ic.x + sk, y: my }; }
            return { x: ic.x + ic.w - sk, y: my };
        }
        var s = ic.size, cx = ic.x + s / 2, cy = ic.y + s / 2;
        if (side === 'n') { return { x: cx, y: ic.y }; }
        if (side === 's') { var b = bbox(ic); return { x: cx, y: b.y + b.h }; }
        if (side === 'o') { return { x: ic.x, y: cy }; }
        return { x: ic.x + s, y: cy };
    }
    function isNode(i) { return !!i && (i.t === 'icon' || i.t === 'shape'); }
    function nearestSide(ic, p) {
        var best = 'n', bd = Infinity;
        SIDES.forEach(function (sd) {
            var a = anchor(ic, sd), d = Math.pow(a.x - p.x, 2) + Math.pow(a.y - p.y, 2);
            if (d < bd) { bd = d; best = sd; }
        });
        return best;
    }
    // Pontos do traçado: origem, dobras, destino (null se faltar um ícone).
    function linkPts(L, find) {
        var a = find(L.a.id), b = find(L.b.id);
        if (!a || !b || !isNode(a) || !isNode(b)) { return null; }
        return [anchor(a, L.a.side)].concat(L.wp || [], [anchor(b, L.b.side)]);
    }
    // Próximo número livre de cabo (P-001, P-002…); reaproveita buraco.
    function nextCable(items) {
        var used = {};
        items.forEach(function (i) { var m = i.t === 'link' && /^P-(\d+)$/.exec(i.cable || ''); if (m) { used[+m[1]] = true; } });
        var n = 1; while (used[n]) { n++; }
        return 'P-' + (n < 10 ? '00' : n < 100 ? '0' : '') + n;
    }
    // Comprimento desenhado, em metros, pela escala em uso (PXM).
    function polyLen(o) {
        var t = 0;
        for (var i = 1; i < o.length; i++) { t += Math.sqrt(Math.pow(o[i].x - o[i - 1].x, 2) + Math.pow(o[i].y - o[i - 1].y, 2)); }
        return t;
    }
    // {measured, total}: medido no desenho; total = medido + sobra, ou o manual.
    function linkMeters(L, find) {
        var r = routePts(L, find), med = r ? polyLen(r) / PXM : 0;
        var len = L.len || { mode: 'auto', m: 0, extra: 10 };
        var tot = len.mode === 'manual' ? (+len.m || 0) : med * (1 + (+len.extra || 0) / 100);
        return { measured: Math.round(med * 10) / 10, total: Math.round(tot * 10) / 10 };
    }
    // Texto que aparece no cabo: identificação, rótulo, metros e PoE.
    function linkText(L, find) {
        var parts = [];
        if (L.showId && L.cable) { parts.push(L.cable); }
        if (L.label) { parts.push(L.label); }
        if (L.showM && find) { var mt = linkMeters(L, find).total; if (mt > 0) { parts.push(fmtM(mt)); } }
        if (L.poe) { parts.push('PoE'); }
        return parts.join(' · ');
    }
    // Ponta de seta desenhada como triângulo (o PNG não depende de <marker>).
    function arrowHead(tip, from, k) {
        var ang = Math.atan2(tip.y - from.y, tip.x - from.x), len = 6 + k.w * 2.5, hw = 3 + k.w * 1.2;
        var bx = tip.x - len * Math.cos(ang), by = tip.y - len * Math.sin(ang);
        var px = -Math.sin(ang) * hw, py = Math.cos(ang) * hw;
        return '<path d="M' + tip.x.toFixed(1) + ' ' + tip.y.toFixed(1) + 'L' + (bx + px).toFixed(1) + ' ' + (by + py).toFixed(1)
            + 'L' + (bx - px).toFixed(1) + ' ' + (by - py).toFixed(1) + 'Z" fill="' + k.c + '"/>';
    }
    function linkD(pts) {
        return 'M' + pts.map(function (q) { return (+q.x).toFixed(1) + ' ' + (+q.y).toFixed(1); }).join('L');
    }

    /* ---------------- traçado (Q2c): reto, cotovelo, curvo ---------------- */
    var STUB = 14;   // o cotovelo sai reto da borda antes de dobrar
    function out(p, side, d) {
        return side === 'n' ? { x: p.x, y: p.y - d } : side === 's' ? { x: p.x, y: p.y + d } : side === 'o' ? { x: p.x - d, y: p.y } : { x: p.x + d, y: p.y };
    }
    // Liga os pontos só com trechos horizontais e verticais. A cada ponto,
    // vira perpendicular ao trecho anterior (Claudio, 27/09/2026: o cotovelo
    // fazia ganchos perto das pontas) e junta trechos alinhados.
    function orth(q) {
        var o = [q[0]], dir = '';
        for (var i = 1; i < q.length; i++) {
            var p = o[o.length - 1], c = q[i];
            if (Math.abs(p.x - c.x) > 0.5 && Math.abs(p.y - c.y) > 0.5) {
                o.push(dir === 'h' ? { x: p.x, y: c.y } : { x: c.x, y: p.y });
            }
            o.push(c);
            var a = o[o.length - 2], b = o[o.length - 1];
            if (Math.abs(a.x - b.x) > 0.5) { dir = 'h'; } else if (Math.abs(a.y - b.y) > 0.5) { dir = 'v'; }
        }
        return simplify(o);
    }
    function simplify(o) {
        var r = [];
        o.forEach(function (c) {
            var p = r[r.length - 1];
            if (p && Math.abs(p.x - c.x) < 0.5 && Math.abs(p.y - c.y) < 0.5) { return; }
            var q = r[r.length - 2];
            if (q && ((Math.abs(q.x - p.x) < 0.5 && Math.abs(p.x - c.x) < 0.5) || (Math.abs(q.y - p.y) < 0.5 && Math.abs(p.y - c.y) < 0.5))) { r[r.length - 1] = c; return; }
            r.push(c);
        });
        return r;
    }
    // Distância de um ponto a uma polilinha.
    function distPoly(pt, o) {
        var best = Infinity;
        for (var i = 1; i < o.length; i++) {
            var a = o[i - 1], b = o[i], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
            var t = l2 ? Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / l2)) : 0;
            var x = a.x + t * dx - pt.x, y = a.y + t * dy - pt.y;
            best = Math.min(best, x * x + y * y);
        }
        return best;
    }
    // Curva suave pelas dobras; nas pontas, sai perpendicular à borda.
    function curveSegs(L, P) {
        var segs = [], n = P.length;
        for (var i = 0; i < n - 1; i++) {
            var a = P[i], b = P[i + 1], len = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2)) / 3;
            var c1 = i === 0 ? out(a, L.a.side, Math.max(20, len)) : { x: a.x + (b.x - P[i - 1].x) / 6, y: a.y + (b.y - P[i - 1].y) / 6 };
            var c2 = i === n - 2 ? out(b, L.b.side, Math.max(20, len)) : { x: b.x - (P[i + 2].x - a.x) / 6, y: b.y - (P[i + 2].y - a.y) / 6 };
            segs.push([a, c1, c2, b]);
        }
        return segs;
    }
    function bez(s, t) {
        var u = 1 - t;
        return { x: u * u * u * s[0].x + 3 * u * u * t * s[1].x + 3 * u * t * t * s[2].x + t * t * t * s[3].x,
                 y: u * u * u * s[0].y + 3 * u * u * t * s[1].y + 3 * u * t * t * s[2].y + t * t * t * s[3].y };
    }
    // Pontos do desenho (polilinha): serve para o rótulo, as setas e o PNG.
    function routePts(L, find) {
        var P = linkPts(L, find);
        if (!P) { return null; }
        var n = P.length;
        if (L.route === 'elbow') {
            // Q5d: na ligação de fluxo o trecho reto junto da forma cabe a ponta.
            var sa = STUB, sb = STUB;
            if (L.kind === 'fluxo') {
                var hl = headLen(FLOW_W[L.lw] || FLOW_W.f) + 8;
                if (L.ea && L.ea !== 'none') { sa = Math.max(STUB, hl); }
                if (L.eb && L.eb !== 'none') { sb = Math.max(STUB, hl); }
            }
            return orth([P[0], out(P[0], L.a.side, sa)].concat(P.slice(1, n - 1), [out(P[n - 1], L.b.side, sb), P[n - 1]]));
        }
        if (L.route === 'curve') {
            var o = [P[0]];
            curveSegs(L, P).forEach(function (sg) { for (var k = 1; k <= 16; k++) { o.push(bez(sg, k / 16)); } });
            return o;
        }
        return P;
    }
    function routeD(L, find) {
        if (L.route === 'curve') {
            var P = linkPts(L, find);
            if (!P) { return ''; }
            var f = function (q) { return q.x.toFixed(1) + ' ' + q.y.toFixed(1); };
            return 'M' + f(P[0]) + curveSegs(L, P).map(function (sg) { return 'C' + f(sg[1]) + ' ' + f(sg[2]) + ' ' + f(sg[3]); }).join('');
        }
        var r = routePts(L, find);
        return r ? linkD(r) : '';
    }
    // Ponto a uma fração do traçado (0,5 = meio, onde fica o nome do cabo).
    function midPoint(pts, frac) {
        var tot = 0, i, seg = [];
        for (i = 1; i < pts.length; i++) { var l = Math.sqrt(Math.pow(pts[i].x - pts[i - 1].x, 2) + Math.pow(pts[i].y - pts[i - 1].y, 2)); seg.push(l); tot += l; }
        var half = tot * (frac === undefined ? 0.5 : frac);
        for (i = 0; i < seg.length; i++) {
            if (half <= seg[i] || i === seg.length - 1) {
                var k = seg[i] ? half / seg[i] : 0;
                return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k };
            }
            half -= seg[i];
        }
        return pts[0];
    }
    function linkSvg(L, find, forExport) {
        if (L.kind === 'fluxo') { return flowLinkSvg(L, find, forExport); }
        var pts = routePts(L, find);
        if (!pts) { return ''; }
        var k = LINK_KINDS[L.kind] || LINK_KINDS[LINK_DEFAULT], d = routeD(L, find), h = '<g data-id="' + L.id + '">';
        // Faixa larga e invisível: facilita clicar no cabo (não vai para o PNG).
        // 14 px NA TELA em qualquer zoom (Claudio, 27/09/2026: com a planta
        // inteira à vista o cabo ficava com 3 a 4 px clicáveis).
        if (!forExport) { h += '<path d="' + d + '" fill="none" stroke="transparent" stroke-width="14" vector-effect="non-scaling-stroke"/>'; }
        h += '<path class="cx-board-link" d="' + d + '" fill="none" stroke="' + k.c + '" stroke-width="' + k.w
            + '" stroke-linecap="round" stroke-linejoin="round"' + (k.d ? ' stroke-dasharray="' + k.d + '"' : '') + '/>';
        var n = pts.length;
        if (L.ends === 'arrow' || L.ends === 'both') { h += arrowHead(pts[n - 1], pts[n - 2], k); }
        if (L.ends === 'both') { h += arrowHead(pts[0], pts[1], k); }
        var txt = linkText(L, find);
        if (txt) {
            // O nome do cabo acompanha os ícones das pontas, como o nome do
            // ícone (Claudio, 27/09/2026), com Pequeno/Médio/Grande no painel.
            var a = find(L.a.id), b = find(L.b.id);
            var fs = L.kind === 'fluxo' ? 12 * (LINK_FS[L.fs] || 1)
                : Math.max(7, Math.round(labelPx(Math.min(a.size, b.size)) * (LINK_FS[L.fs] || 1) * 2) / 2);
            var m = midPoint(pts), w = txt.length * fs * 0.56 + fs, bh = fs + 6;
            h += '<rect x="' + (m.x - w / 2).toFixed(1) + '" y="' + (m.y - bh / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + bh + '" rx="' + (bh / 4).toFixed(1)
                + '" fill="#ffffff" stroke="' + k.c + '" stroke-width="0.8"/>'
                + '<text x="' + m.x.toFixed(1) + '" y="' + (m.y + fs * 0.36).toFixed(1) + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="' + fs + '" fill="#1d2330">' + esc(txt) + '</text>';
        }
        return h + '</g>';
    }
    function ductMeters(d) { return Math.round(polyLen(d.pts) / PXM * 10) / 10; }
    function ductSvg(d, items, forExport) {
        var k = DUCT_KINDS[d.kind] || DUCT_KINDS.eletrocalha, pts = d.pts, dd = linkD(pts), h = '<g data-id="' + d.id + '">';
        if (!forExport) { h += '<path d="' + dd + '" fill="none" stroke="transparent" stroke-width="16" vector-effect="non-scaling-stroke"/>'; }
        h += '<path class="cx-board-duct" d="' + dd + '" fill="none" stroke="' + k.c + '" stroke-opacity="' + k.o + '" stroke-width="' + k.w + '" stroke-linejoin="miter" stroke-linecap="square"/>';
        if (k.mid) { h += '<path d="' + dd + '" fill="none" stroke="' + k.mid + '" stroke-opacity="0.6" stroke-width="1" stroke-dasharray="6 4"/>'; }
        var parts = [k.label];
        if (d.label) { parts.push(d.label); }
        if (d.showM) { parts.push(fmtM(ductMeters(d))); }
        var txt = parts.join(' · ');
        // Mesmo tamanho do nome dos cabos: segue o menor ícone do quadro.
        var sz = 48; (items || []).forEach(function (i) { if (i.t === 'icon') { sz = Math.min(sz, i.size); } });
        var fs = Math.max(7, Math.round(labelPx(sz) * (LINK_FS[d.fs] || 1) * 2) / 2);
        // A 1/4 do caminho: o cabo que passa por dentro põe o nome no meio.
        var m = midPoint(pts, 0.25), w = txt.length * fs * 0.56 + fs, bh = fs + 6, oy = k.w / 2 + bh / 2 + 2;
        h += '<rect x="' + (m.x - w / 2).toFixed(1) + '" y="' + (m.y - oy - bh / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + bh + '" rx="' + (bh / 4).toFixed(1)
            + '" fill="#ffffff" fill-opacity="0.9" stroke="#5F5E5A" stroke-width="0.6"/>'
            + '<text x="' + m.x.toFixed(1) + '" y="' + (m.y - oy + fs * 0.36).toFixed(1) + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="' + fs + '" fill="#444441">' + esc(txt) + '</text>';
        return h + '</g>';
    }
    /* Q8-1: parede = traço na cor do material, sem rótulo (a planta já tem
       os nomes). Na tela leva uma faixa invisível larga para o clique. */
    function wallMeters(w) { return Math.round(polyLen(w.pts) / PXM * 10) / 10; }
    function wallSvg(w, forExport) {
        var k = WALL_KINDS[w.mat] || WALL_KINDS[WALL_DEFAULT], dd = linkD(w.pts), h = '<g data-id="' + w.id + '">';
        if (!forExport) { h += '<path d="' + dd + '" fill="none" stroke="transparent" stroke-width="14" vector-effect="non-scaling-stroke"/>'; }
        h += '<path class="cx-board-wall" d="' + dd + '" fill="none" stroke="' + k.c + '" stroke-opacity="0.9" stroke-width="' + k.w + '"'
            + (k.d ? ' stroke-dasharray="' + k.d + '"' : '') + ' stroke-linejoin="miter" stroke-linecap="square"/>';
        return h + '</g>';
    }
    function wallsShown(data) { return data.mode === 'planta' && data.wallsOn !== false; }
    function finder(items) {
        var map = {};
        items.forEach(function (i) { map[i.id] = i; });
        return function (id) { return map[id] || null; };
    }

    var TEXT_PX = { p: 12, m: 15, g: 20 };
    // Q5k: texto solto com largura (`w`) quebra sozinho; sem `w`, só no Enter (como antes).
    var TEXT_MIN_W = 40, TEXT_MAX_W = 2000, TEXT_MAX = 1000;
    function textLines(it, ph) {
        var fs = it.px || TEXT_PX[it.size] || 15, t = String(it.text || ph || '');
        return it.w > 0 ? wrapText(t, it.w, fs, 80) : t.split('\n');
    }

    /* ---------------- desenho de um item (tela e PNG) ---------------- */
    function itemSvg(it, forExport) {
        if (it.t === 'shape') { return shapeSvg(it, forExport); }
        if (it.t === 'lane') { return ''; }   // laneSvg(), no fundo
        if (it.t === 'zone') {
            return '<g data-id="' + it.id + '"><rect x="' + it.x + '" y="' + it.y + '" width="' + it.w + '" height="' + it.h
                + '" rx="10" fill="' + it.color + '" fill-opacity="0.05" stroke="' + it.color + '" stroke-width="2" stroke-dasharray="8 5"/>'
                + '<text x="' + (it.x + 12) + '" y="' + (it.y + 20) + '" font-family="Arial,sans-serif" font-size="13" fill="' + it.color + '">'
                + esc(it.label) + '</text></g>';
        }
        if (it.t === 'text') {
            var fs = it.px || TEXT_PX[it.size] || 15;
            var lines = textLines(it, forExport ? '' : 'Texto');
            return '<g data-id="' + it.id + '"><text x="' + it.x + '" y="' + (it.y + fs) + '" font-family="Arial,sans-serif" font-size="' + fs + '"' + (it.b ? ' font-weight="bold"' : '') + ' fill="' + it.color + '">'
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

    /* Q3a — lista de materiais do quadro (Claudio, 27/09/2026). Só leitura.
         Equipamentos: um por ícone, pelo nome do ícone (Equipamento genérico:
           pelo rótulo); com Modelo preenchido, "Nome · Modelo".
         Cabos: metragem que o cabo já mostra (automática com sobra, ou
           manual), arredondada PARA CIMA em cada lance e somada por tipo.
           Sem fio e Lógica/VPN não entram (não são cabo comprado).
         Eletrocalha e canaleta: metros de cada trecho, para cima, sem sobra.
         Áreas, zonas e textos não contam.
       only (lista de ids): só a seleção; entra também a ligação entre dois
       ícones selecionados, porque a seleção em área não pega cabo. */
    var MAT_SKIP = ['semfio', 'logica'];
    function materials(D, only) {
        PXM = D.pxm || PXM_DEFAULT;
        var I = Icons(), all = D.items || [], find = finder(all);
        var has = function (id) { return !only || only.indexOf(id) >= 0; };
        var eq = {}, cab = {}, duc = {}, eqN = 0;
        all.forEach(function (it) {
            if (it.t === 'icon' && has(it.id)) {
                var ic = I.get(it.icon) || {}, base = ic.name || 'Ícone';
                if (it.icon === 'generico' && String(it.label || '').trim()) { base = String(it.label).trim(); }
                var mod = String((it.f && it.f.modelo) || '').trim(), nm = mod ? base + ' · ' + mod : base;
                eq[nm] = (eq[nm] || 0) + 1; eqN++;
            } else if (it.t === 'link' && (has(it.id) || (only && has(it.a.id) && has(it.b.id)))) {
                var k = LINK_KINDS[it.kind] ? it.kind : LINK_DEFAULT;
                if (MAT_SKIP.indexOf(k) >= 0) { return; }
                var c = cab[k] || (cab[k] = { n: 0, m: 0 });
                c.n++; c.m += Math.ceil(linkMeters(it, find).total);
            } else if (it.t === 'duct' && has(it.id)) {
                var dk = DUCT_KINDS[it.kind] ? it.kind : 'eletrocalha';
                var d = duc[dk] || (duc[dk] = { n: 0, m: 0 });
                d.n++; d.m += Math.ceil(ductMeters(it));
            }
        });
        return {
            eqN: eqN,
            eq: Object.keys(eq).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); }).map(function (k) { return { name: k, n: eq[k] }; }),
            cables: Object.keys(LINK_KINDS).filter(function (k) { return cab[k]; }).map(function (k) { return { kind: k, label: LINK_KINDS[k].label, color: LINK_KINDS[k].c, n: cab[k].n, m: cab[k].m }; }),
            ducts: Object.keys(DUCT_KINDS).filter(function (k) { return duc[k]; }).map(function (k) { return { kind: k, label: DUCT_KINDS[k].label, n: duc[k].n, m: duc[k].m }; }),
            approx: !D.pxm
        };
    }
    function materialsHtml(M, title) {
        var row = function (a, b) { return '<div class="cx-mat-row"><span>' + a + '</span><span>' + b + '</span></div>'; };
        var h = '<div class="cx-mat"><p class="cx-mat-title">' + esc(title) + '</p>';
        if (!M.eq.length && !M.cables.length && !M.ducts.length) {
            return h + '<p class="cx-board-none">Nada para contar ainda: coloque ícones, cabos ou eletrocalha.</p></div>';
        }
        if (M.eq.length) {
            h += '<p class="cx-mat-sec">Equipamentos · ' + M.eqN + '</p>'
                + M.eq.map(function (e) { return row(esc(e.name), String(e.n)); }).join('');
        }
        if (M.cables.length) {
            h += '<p class="cx-mat-sec">Cabos · metro inteiro por lance</p>'
                + M.cables.map(function (c) {
                    return row('<i class="cx-mat-sw" style="background:' + c.color + '"></i>' + esc(c.label)
                        + ' <span class="cx-mat-n">· ' + c.n + (c.n === 1 ? ' lance' : ' lances') + '</span>', c.m + ' m');
                }).join('');
        }
        if (M.ducts.length) {
            h += '<p class="cx-mat-sec">Infraestrutura</p>'
                + M.ducts.map(function (d) { return row(esc(d.label), d.m + ' m'); }).join('');
        }
        if (M.approx && (M.cables.length || M.ducts.length)) {
            h += '<p class="cx-mat-warn">Sem escala: metros aproximados (1 m = ' + PXM_DEFAULT + ' px). Use "Escala" na barra para medir pela planta.</p>';
        }
        return h + '<p class="cx-board-none">Sem fio e Lógica/VPN não entram. Áreas, paredes e textos não contam.</p></div>';
    }

    // A forma sem o nome de baixo: seleção, alças e guias usam esta.
    function coreBox(it) { return it.t === 'shape' ? { x: it.x, y: it.y, w: it.w, h: it.h } : bbox(it); }
    function bbox(it) {
        if (it.t === 'org' || it.t === 'orow') { return { x: it.x, y: it.y, w: it.w, h: it.h }; }
        if (it.t === 'shape') {
            // Nome embaixo (BPMN): entra no contorno (seleção por área, PNG).
            if (below(it) && String(it.text || '').trim()) {
                var fsb = shapeFs(it), ls = wrapText(it.text, labelW(it), fsb), lw = Math.max.apply(null, ls.map(function (l) { return textW(l, fsb); }));
                if (/^gw/.test(it.shape)) {
                    var gl = it.x + it.w * 0.3 - lw, gt = it.y - 6 - (ls.length - 1) * fsb * 1.25 - fsb;
                    var gx0 = Math.min(it.x, gl), gy0 = Math.min(it.y, gt);
                    return { x: gx0, y: gy0, w: it.x + it.w - gx0, h: it.y + it.h - gy0 };
                }
                var bx = Math.min(it.x, it.x + it.w / 2 - lw / 2);
                return { x: bx, y: it.y, w: Math.max(it.x + it.w, it.x + it.w / 2 + lw / 2) - bx, h: it.h + 3 + ls.length * fsb * 1.25 + 2 };
            }
            return { x: it.x, y: it.y, w: it.w, h: it.h };
        }
        if (it.t === 'zone' || it.t === 'lane') { return { x: it.x, y: it.y, w: it.w, h: it.h }; }
        if (isPath(it)) {
            var xs = it.pts.map(function (q) { return q.x; }), ys = it.pts.map(function (q) { return q.y; }),
                pd = (it.t === 'wall' ? (WALL_KINDS[it.mat] || WALL_KINDS[WALL_DEFAULT]).w : (DUCT_KINDS[it.kind] || DUCT_KINDS.eletrocalha).w) / 2 + 2;
            var bx = Math.min.apply(null, xs) - pd, by = Math.min.apply(null, ys) - pd;
            return { x: bx, y: by, w: Math.max.apply(null, xs) + pd - bx, h: Math.max.apply(null, ys) + pd - by };
        }
        if (it.t === 'text') {
            var fs = it.px || TEXT_PX[it.size] || 15, lines = textLines(it, 'Texto');
            var w = it.w > 0 ? it.w : Math.max.apply(null, lines.map(function (l) { return textW(l, fs); }));
            return { x: it.x, y: it.y, w: Math.max(30, w), h: lines.length * fs * 1.25 + 4 };
        }
        var lp = labelPx(it.size) + 1;
        var extra = (it.label ? lp : 0) + (it.f && it.f.ip ? lp : 0);
        return { x: it.x, y: it.y, w: it.size, h: it.size + extra + (extra ? 4 : 0) };
    }

    /* ---------------- PNG do quadro ---------------- */
    /* Q5a: o SVG do quadro inteiro (o mesmo do PNG), para a leitura do
       fluxograma desenhar vetorial na página. kMax limita a ampliação. */
    function boardSvg(data, bgImg, kMax) {
        PXM = data.pxm || PXM_DEFAULT;
        var box;
        if (bgImg) {
            box = { x: 0, y: 0, w: data.w, h: data.h };
        } else {
            var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
            var fnd = finder(data.items);
            data.items.forEach(function (it) {
                if (it.t === 'wall' && !wallsShown(data)) { return; }
                if (it.t === 'link') {
                    (routePts(it, fnd) || []).forEach(function (q) { x1 = Math.min(x1, q.x); y1 = Math.min(y1, q.y); x2 = Math.max(x2, q.x); y2 = Math.max(y2, q.y); });
                    return;
                }
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
        var find = finder(data.items);
        var k = Math.min(kMax || 2, 2400 / Math.max(box.w, box.h));
        var W = Math.round(box.w * k), H = Math.round(box.h * k);
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="' + box.x + ' ' + box.y + ' ' + box.w + ' ' + box.h + '">'
            + '<rect x="' + box.x + '" y="' + box.y + '" width="' + box.w + '" height="' + box.h + '" fill="#ffffff"/>'
            + (bgImg ? '<image href="' + bgImg + '" x="0" y="0" width="' + data.w + '" height="' + data.h + '" opacity="' + data.bgOpacity + '"/>' : '')
            + laneSvg(data.items, true)
            + data.items.filter(function (i) { return i.t === 'zone'; }).map(function (i) { return itemSvg(i, true); }).join('')
            + (wallsShown(data) ? data.items.filter(function (i) { return i.t === 'wall'; }).map(function (i) { return wallSvg(i, true); }).join('') : '')
            + data.items.filter(function (i) { return i.t === 'duct'; }).map(function (i) { return ductSvg(i, data.items, true); }).join('')
            + data.items.filter(function (i) { return i.t === 'link'; }).map(function (i) { return linkSvg(i, find, true); }).join('')
            + data.items.filter(function (i) { return ['zone', 'link', 'duct', 'wall'].indexOf(i.t) < 0; }).map(function (i) { return itemSvg(i, true); }).join('')
            + '</svg>';
        return { svg: svg, w: W, h: H };
    }
    function toPng(data, bgImg) {
        var r = boardSvg(data, bgImg);
        return rasterize(r.svg, r.w, r.h);
    }

    function rasterize(svg, W, H) {
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

    /* ---------------- legenda (Q3b, Claudio 27/09/2026) ----------------
       Imagem própria, gravada logo abaixo do quadro (span.cx-board-legend,
       arquivo cx-quadro-legenda-*.png). Um item por tipo USADO: cabos (Sem
       fio e Lógica também: aparecem no desenho), eletrocalha/canaleta e
       ícones com o desenho da paleta. Zonas e textos não entram. */
    function legendEntries(D) {
        var I = Icons(), items = D.items || [], out = [], seen = {};
        Object.keys(LINK_KINDS).forEach(function (k) {
            if (items.some(function (i) { return i.t === 'link' && (LINK_KINDS[i.kind] ? i.kind : LINK_DEFAULT) === k; })) {
                out.push({ t: 'link', k: k, name: LINK_KINDS[k].label });
            }
        });
        Object.keys(DUCT_KINDS).forEach(function (k) {
            if (items.some(function (i) { return i.t === 'duct' && (DUCT_KINDS[i.kind] ? i.kind : 'eletrocalha') === k; })) {
                out.push({ t: 'duct', k: k, name: DUCT_KINDS[k].label });
            }
        });
        // Q8-1: paredes por material, só com a camada à mostra.
        if (wallsShown(D)) {
            Object.keys(WALL_KINDS).forEach(function (k) {
                if (items.some(function (i) { return i.t === 'wall' && i.mat === k; })) { out.push({ t: 'wall', k: k, name: 'Parede: ' + WALL_KINDS[k].label }); }
            });
        }
        var cats = Object.keys(I.CATS), icons = [];
        items.forEach(function (i) {
            if (i.t !== 'icon') { return; }
            var ic = I.get(i.icon) || I.get('generico') || { name: 'Ícone', cat: 'infra' };
            var gen = i.icon === 'generico', cat = (gen && i.cat) || ic.cat;
            var name = gen ? (String(i.label || '').trim() || ic.name + ' (' + ((I.CATS[cat] || {}).label || cat) + ')') : ic.name;
            var key = gen ? 'generico|' + cat + '|' + name : i.icon;
            if (seen[key]) { return; }
            seen[key] = true;
            icons.push({ t: 'icon', icon: i.icon, cat: gen ? cat : '', name: name, ord: cats.indexOf(cat) });
        });
        icons.sort(function (a, b) { return (a.ord - b.ord) || a.name.localeCompare(b.name, 'pt-BR'); });
        return out.concat(icons);
    }
    function legendSvg(D) {
        var E = legendEntries(D);
        if (!E.length) { return null; }
        var cols = E.length > 16 ? 3 : (E.length > 6 ? 2 : 1), rows = Math.ceil(E.length / cols);
        var PAD = 12, CW = 250, RH = 28, TOP = 34;
        var w = PAD * 2 + cols * CW, h = TOP + rows * RH + 8;
        var cut = function (t) { t = String(t); return t.length > 32 ? t.slice(0, 31) + '…' : t; };
        var body = E.map(function (e, n) {
            var x = PAD + Math.floor(n / rows) * CW, y = TOP + (n % rows) * RH, cy = y + RH / 2, g = '';
            if (e.t === 'link') {
                var L = LINK_KINDS[e.k];
                g += '<line x1="' + (x + 2) + '" y1="' + cy + '" x2="' + (x + 32) + '" y2="' + cy + '" stroke="' + L.c + '" stroke-width="' + (L.w + 0.6) + '"'
                    + (L.d ? ' stroke-dasharray="' + L.d + '"' : '') + ' stroke-linecap="round"/>';
                if (L.arrow) { g += '<path d="M' + (x + 34) + ' ' + cy + ' l-7 -4 v8 z" fill="' + L.c + '"/>'; }
            } else if (e.t === 'wall') {
                var WK = WALL_KINDS[e.k];
                g += '<line x1="' + (x + 2) + '" y1="' + cy + '" x2="' + (x + 34) + '" y2="' + cy + '" stroke="' + WK.c + '" stroke-opacity="0.9" stroke-width="' + WK.w + '"'
                    + (WK.d ? ' stroke-dasharray="' + WK.d + '"' : '') + '/>';
            } else if (e.t === 'duct') {
                var K = DUCT_KINDS[e.k];
                g += '<line x1="' + (x + 2) + '" y1="' + cy + '" x2="' + (x + 34) + '" y2="' + cy + '" stroke="' + K.c + '" stroke-opacity="' + K.o + '" stroke-width="' + K.w + '"/>';
                if (K.mid) { g += '<line x1="' + (x + 2) + '" y1="' + cy + '" x2="' + (x + 34) + '" y2="' + cy + '" stroke="' + K.mid + '" stroke-opacity="0.6" stroke-width="1" stroke-dasharray="6 4"/>'; }
            } else {
                g += '<svg x="' + (x + 6) + '" y="' + (y + 2) + '" width="24" height="24" viewBox="0 0 48 48">' + Icons().body(e.icon, e.cat || undefined) + '</svg>';
            }
            return g + '<text x="' + (x + 44) + '" y="' + (cy + 4.5) + '" font-family="Arial,sans-serif" font-size="13" fill="#1d2330">' + esc(cut(e.name)) + '</text>';
        }).join('');
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (w * 2) + '" height="' + (h * 2) + '" viewBox="0 0 ' + w + ' ' + h + '">'
            + '<rect x="0.5" y="0.5" width="' + (w - 1) + '" height="' + (h - 1) + '" rx="4" fill="#ffffff" stroke="#c9d1db"/>'
            + '<text x="' + PAD + '" y="22" font-family="Arial,sans-serif" font-size="14" font-weight="bold" fill="#1d2330">Legenda</text>'
            + body + '</svg>';
        return { svg: svg, W: w * 2, H: h * 2, n: E.length };
    }
    function legendPng(D) {
        var L = legendSvg(D);
        // PNG em 2x; no documento a imagem leva width/height de 1x (o GLPI
        // mantém esses dois atributos ao trocar a tag, achado 56).
        return L ? rasterize(L.svg, L.W, L.H).then(function (b) { return { blob: b, w: L.W / 2, h: L.H / 2 }; }) : Promise.resolve(null);
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

    /* Legenda: bloco logo depois do quadro. No mesmo parágrafo (irmão do
       invólucro) ou no parágrafo seguinte, que é onde apply() a cria. */
    function blockOf(el, body) {
        var n = el;
        while (n && n.parentNode && n.parentNode !== body) { n = n.parentNode; }
        return n && n.parentNode === body ? n : null;
    }
    function legendOf(wrap, body) {
        var sib = wrap.nextElementSibling;
        if (sib && sib.matches && sib.matches('span.cx-board-legend')) { return sib; }
        var b = blockOf(wrap, body), nx = b && b !== wrap ? b.nextElementSibling : null;
        var first = nx && nx.firstElementChild;
        return first && first.matches('span.cx-board-legend') ? first : null;
    }
    function boardOfLegend(lg, body) {
        var sib = lg.previousElementSibling;
        if (sib && sib.matches && sib.matches('span.cx-board')) { return sib; }
        var b = blockOf(lg, body), pv = b && b !== lg ? b.previousElementSibling : null;
        if (!pv) { return null; }
        if (pv.matches('span.cx-board')) { return pv; }
        var all = pv.querySelectorAll('span.cx-board');
        return all.length ? all[all.length - 1] : null;
    }

    function apply(editor, node, data, png, bg, legend) {
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
            // Q3b: legenda abaixo do quadro (cria, troca a imagem ou tira).
            var body = editor.getBody(), lg = legendOf(wrap, body);
            if (legend) {
                if (!lg) {
                    lg = dom.create('span', { 'class': 'cx-board-legend', contenteditable: 'false' });
                    var b = blockOf(wrap, body);
                    if (b && b !== wrap) {
                        var p = dom.create('p');
                        p.appendChild(lg);
                        dom.insertAfter(p, b);
                    } else {
                        dom.insertAfter(lg, wrap);
                    }
                }
                var li = lg.querySelector('img');
                if (!li) { li = dom.create('img', { alt: 'Legenda' }); lg.appendChild(li); }
                li.setAttribute('style', 'max-width:100%;height:auto;');
                ok = uploadImg(editor, li, legend.blob, 'cx-quadro-legenda-' + stamp + '.png') && ok;
                dom.setAttribs(li, { width: legend.w, height: legend.h });
            } else if (lg) {
                var pp = lg.parentNode;
                pp.removeChild(lg);
                if (pp !== body && pp.nodeName === 'P' && !pp.querySelector('img,span.cx-board') && !(pp.textContent || '').replace(/[\s\u200b\u00a0]/g, '')) {
                    pp.parentNode.removeChild(pp);
                }
            }
        });
        editor.nodeChanged();
        editor.setDirty(true);
        return ok;
    }

    /* ======================================================================
       Janela do quadro
       ====================================================================== */
    function open(editor, node, mode, host) {
        var raw = null, bgUrl = '', bgChanged = false;
        if (host) {
            // Q5a: quadro de um documento DIA (sem editor, sem planta de fundo).
            raw = host.data || null;
            node = null;
        } else if (node) {
            try { raw = JSON.parse(node.getAttribute('data-cx-board') || 'null'); } catch (e) { raw = null; }
            var bgEl = bgOf(node);
            bgUrl = bgEl ? (bgEl.getAttribute('src') || '') : '';
        }
        var ready = loadLibrary();
        if (bgUrl) {
            if (/^blob:|^data:/.test(bgUrl) && !/docid=/.test(bgUrl)) {
                notify(editor, 'Salve o documento antes de editar este quadro de novo: a planta ainda está sendo enviada.', 'error');
                return;
            }
            ready = ready.then(function () { return urlToDataUrl(bgUrl); }).then(function (u) { bgUrl = u; }).catch(function () { bgUrl = ''; });
        }
        ready.then(function () { build(editor, node, clean(raw, mode), bgUrl, bgChanged, host || null); });
    }

    /* ======================================================================
       Q5i-2 — importar Mermaid (Claudio, 03/10/2026). O formato que toda IA
       gera. Leitor próprio, só do subconjunto `flowchart`/`graph` (sem a
       biblioteca do Mermaid). Montagem em raias: cada `subgraph` de primeiro
       nível vira raia (LR = horizontais; TD/TB = verticais); subgraph dentro
       de subgraph vira moldura na raia. Cada raia começa no início; colunas
       pela ordem do fluxo (as voltas não empurram); formas na mesma coluna
       ganham linhas diferentes, e cada caminho tenta seguir na linha de quem
       o alimenta. Funções puras: testáveis sem DOM.
       ====================================================================== */
    // Formas do Mermaid -> formas do Codex+ (o que não tem par vira processo).
    var MM_BRK = { '[': 'proc', '(': 'proc', '([': 'term', '[[': 'sub', '[(': 'db', '((': 'circ', '(((': 'circ', '{': 'dec', '{{': 'prep',
        '[/': 'data', '[\\': 'data', '/\\': 'manop', '\\/': 'manin', '>': 'proc' };
    var MM_AT = { rect: 'proc', proc: 'proc', process: 'proc', rounded: 'proc', event: 'proc', 'sl-rect': 'manin', 'manual-input': 'manin',
        stadium: 'term', pill: 'term', terminal: 'term', diam: 'dec', diamond: 'dec', decision: 'dec', question: 'dec',
        hex: 'prep', hexagon: 'prep', prepare: 'prep', 'lean-r': 'data', 'lean-right': 'data', 'in-out': 'data', 'lean-l': 'data', 'lean-left': 'data', 'out-in': 'data',
        'trap-t': 'manop', 'inv-trapezoid': 'manop', manual: 'manop', 'trap-b': 'manin', trapezoid: 'manin', priority: 'manin',
        'fr-rect': 'sub', subprocess: 'sub', subproc: 'sub', subroutine: 'sub', cyl: 'db', cylinder: 'db', database: 'db', db: 'db',
        doc: 'doc', document: 'doc', 'lin-doc': 'doc', 'lined-document': 'doc', docs: 'docs', documents: 'docs', 'st-doc': 'docs', 'stacked-document': 'docs',
        delay: 'delay', 'half-rounded-rectangle': 'delay', circle: 'circ', circ: 'circ', 'sm-circ': 'evstart', start: 'evstart', 'small-circle': 'evstart',
        'fr-circ': 'evend', stop: 'evend', 'framed-circle': 'evend', 'dbl-circ': 'evend', 'double-circle': 'evend',
        'f-circ': 'conn', junction: 'conn', 'filled-circle': 'conn', 'notch-pent': 'offpage', 'loop-limit': 'offpage', 'odd': 'proc',
        'braces': 'annot', comment: 'annot', 'brace-r': 'annot', text: 'annot', 'tag-doc': 'doc', 'tag-rect': 'proc', card: 'note', 'notch-rect': 'proc' };
    var MM_DIRS = { LR: 'h', RL: 'h', TB: 'v', TD: 'v', BT: 'v' };
    var MM_MAX_NODES = 1500;

    function mmText(t) {
        t = String(t === undefined || t === null ? '' : t);
        t = t.replace(/^"([\s\S]*)"$/, '$1').replace(/^`([\s\S]*)`$/, '$1');
        t = t.replace(/<br\s*\/?>/gi, '\n').replace(/\\n/g, '\n');
        t = t.replace(/#quot;/g, '"').replace(/#amp;/g, '&').replace(/#lt;/g, '<').replace(/#gt;/g, '>').replace(/#(\d+);/g, function (m, n) { return String.fromCharCode(+n); });
        t = t.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(+n); }).replace(/&amp;/g, '&');
        t = t.replace(/<\/?[a-z][^>]*>/gi, '');                 // outras marcações HTML
        t = t.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1');
        return t.split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).join('\n').replace(/^\n+|\n+$/g, '');
    }
    // Estilo do Mermaid ("fill:#E8F5E9,stroke:#2E7D32") -> tom da paleta.
    // Pelo matiz (os fundos são claros: a distância em RGB confunde rosa
    // com âmbar); sem cor (cinza/branco) pela claridade; fundo mais escuro
    // leva a variante "forte" quando o tom tem.
    function mmHsl(h) {
        var r = parseInt(h.substr(1, 2), 16) / 255, g = parseInt(h.substr(3, 2), 16) / 255, b = parseInt(h.substr(5, 2), 16) / 255;
        var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, hue = 0, sat = 0;
        if (d) {
            sat = d / (1 - Math.abs(2 * l - 1));
            hue = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
            hue = (hue * 60 + 360) % 360;
        }
        return { h: hue, s: sat, l: l };
    }
    function mmTone(style) {
        var m = /fill\s*:\s*(#[0-9a-f]{3}(?:[0-9a-f]{3})?)\b/i.exec(String(style || ''));
        if (!m) { return ''; }
        var hx = m[1].length === 4 ? '#' + m[1][1] + m[1][1] + m[1][2] + m[1][2] + m[1][3] + m[1][3] : m[1];
        var exact = Object.keys(FLOW_COLORS).filter(function (k) { return FLOW_COLORS[k].f.toLowerCase() === hx.toLowerCase(); })[0];
        if (exact) { return exact; }
        var c = mmHsl(hx);
        if (c.s < 0.15 || (c.l > 0.97 && c.s < 0.5)) { return c.l > 0.97 ? 'branco' : 'cinza'; }
        var best = 'azul', bd = 999;
        ['verde', 'azul', 'ambar', 'roxo', 'coral', 'vermelho'].forEach(function (k) {
            var d = Math.abs(mmHsl(FLOW_COLORS[k].s).h - c.h); d = Math.min(d, 360 - d);
            if (d < bd) { bd = d; best = k; }
        });
        return c.l < 0.8 && FLOW_COLORS[best + '2'] ? best + '2' : best;
    }

    // Texto do Mermaid -> { dir, nodes, order, edges, subs, title, skip } ou { err }.
    function parseMermaid(src) {
        var txt = String(src || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
        var fence = /```\s*mermaid[^\n]*\n([\s\S]*?)```/i.exec(txt);
        if (fence) { txt = fence[1]; }
        txt = txt.replace(/^\s*```[^\n]*\n?/, '').replace(/\n?```\s*$/, '');
        var title = '';
        var fm = /^\s*---\n([\s\S]*?)\n---\s*\n/.exec(txt);
        if (fm) { var tm = /^\s*title\s*:\s*(.+)$/m.exec(fm[1]); if (tm) { title = mmText(tm[1].replace(/^['"]|['"]$/g, '')); } txt = txt.slice(fm[0].length); }
        var lines = txt.split('\n'), skip = { click: 0, icon: 0, shape: 0, deep: 0, other: 0 };
        // Comentários: o primeiro %% (antes do cabeçalho) vira título, se não houver.
        var stm = [], head = null;
        lines.forEach(function (raw) {
            var l = raw.trim();
            if (!l) { return; }
            if (/^%%\{.*\}%%$/.test(l)) { return; }
            if (/^%%/.test(l)) { if (!head && !title) { title = mmText(l.replace(/^%%\s*/, '')); } return; }
            if (!head) {
                var hm = /^(flowchart|graph)(?:\s+([A-Za-z]{2}))?\s*;?\s*(.*)$/i.exec(l);
                if (!hm) { head = false; return; }
                head = { dir: (hm[2] || 'TD').toUpperCase() };
                if (hm[3]) { stm.push(hm[3]); }
                return;
            }
            // `;` separa comandos (fora de aspas e de colchetes).
            var cur = '', q = false, dep = 0;
            for (var i = 0; i < l.length; i++) {
                var ch = l[i];
                if (ch === '"') { q = !q; }
                else if (!q && '[({'.indexOf(ch) >= 0) { dep++; }
                else if (!q && '])}'.indexOf(ch) >= 0) { dep = Math.max(0, dep - 1); }
                if (ch === ';' && !q && !dep) { if (cur.trim()) { stm.push(cur.trim()); } cur = ''; continue; }
                cur += ch;
            }
            if (cur.trim()) { stm.push(cur.trim()); }
        });
        if (!head) { return { err: 'mermaid' }; }
        var dir = MM_DIRS[head.dir] ? head.dir : 'TD';
        var nodes = {}, order = [], edges = [], subs = [], subById = {}, stack = [], classDefs = {}, nodeCls = {}, nodeStyle = {}, subStyle = {};
        var ID = /^[A-Za-z0-9_\u00C0-\u024F]+(?:-[A-Za-z0-9_\u00C0-\u024F]+)*/;
        function touch(id, decl) {
            var n = nodes[id];
            if (!n) { n = nodes[id] = { id: id, text: id, shape: 'proc', sub: '', decl: false, at: order.length }; order.push(id); }
            var here = stack.length ? stack[stack.length - 1].id : '';
            // Pertence ao subgraph onde foi DECLARADO (com forma); sem isso, ao primeiro onde apareceu.
            if (here && (!n.sub || (decl && !n.decl))) { n.sub = here; }
            if (decl) { n.decl = true; }
            return n;
        }
        // Lê um nó a partir de s[p]: devolve { id, p } ou null.
        function readNode(s, p) {
            var m = ID.exec(s.slice(p));
            if (!m) { return null; }
            var id = m[0];
            if (subById[id] && !nodes[id]) { p += id.length; return { id: id, p: p, sub: true }; }
            p += id.length;
            var shape = null, text = null, r = s.slice(p);
            if (r[0] === '@' && r[1] === '{') {
                var close = r.indexOf('}');
                if (close < 0) { return null; }
                var body = r.slice(2, close), sm = /shape\s*:\s*["']?([\w-]+)/.exec(body), lm = /label\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(body) || /label\s*:\s*'((?:[^'\\]|\\.)*)'/.exec(body);
                if (sm) { shape = MM_AT[sm[1].toLowerCase()] || (skip.shape++, 'proc'); }
                if (/\b(icon|img)\s*:/.test(body)) { skip.icon++; }
                if (lm) { text = lm[1].replace(/\\"/g, '"'); }
                p += close + 1;
            } else {
                var opens = [['(((', ')))'], ['([', '])'], ['[[', ']]'], ['[(', ')]'], ['((', '))'], ['{{', '}}'], ['[/', null], ['[\\', null], ['[', ']'], ['(', ')'], ['{', '}'], ['>', ']']];
                for (var k = 0; k < opens.length; k++) {
                    var o = opens[k][0];
                    if (r.slice(0, o.length) !== o) { continue; }
                    // `>` só abre forma colado ao id (A>texto]); senão é ligação.
                    if (o === '>' && !/^>[^\]]*\]/.test(r)) { break; }
                    var rest = r.slice(o.length), cl = opens[k][1], t, used;
                    if (rest[0] === '"') {
                        var qe = rest.indexOf('"', 1);
                        while (qe > 0 && rest[qe - 1] === '\\') { qe = rest.indexOf('"', qe + 1); }
                        if (qe < 0) { return null; }
                        t = rest.slice(1, qe); used = qe + 1;
                        var after = rest.slice(used);
                        if (cl === null) { var c2 = /^[/\\]\]/.exec(after); if (!c2) { return null; } cl = c2[0]; }
                        if (after.slice(0, cl.length) !== cl) { return null; }
                    } else {
                        if (cl === null) { var c3 = /[/\\]\]/.exec(rest); if (!c3) { return null; } cl = c3[0]; used = c3.index; }
                        else { used = rest.indexOf(cl); if (used < 0) { return null; } }
                        t = rest.slice(0, used);
                    }
                    var key = o;
                    if (o === '[/' || o === '[\\') { key = (o === '[/' ? '/' : '\\') + cl[0]; key = key === '//' ? '[/' : key === '\\\\' ? '[\\' : key; }
                    shape = MM_BRK[key] || 'proc'; text = t;
                    p += o.length + used + cl.length;
                    break;
                }
            }
            var n = touch(id, shape !== null);
            if (shape !== null) { n.shape = shape; }
            if (text !== null) { n.text = text; }
            var cm = /^:::([\w-]+)/.exec(s.slice(p));
            if (cm) { (nodeCls[id] = nodeCls[id] || []).push(cm[1]); p += cm[0].length; }
            return { id: id, p: p };
        }
        function readGroup(s, p) {
            var out = [];
            for (;;) {
                while (s[p] === ' ' || s[p] === '\t') { p++; }
                var n = readNode(s, p);
                if (!n) { return out.length ? { ids: out, p: p } : null; }
                out.push(n); p = n.p;
                var am = /^\s*&\s*/.exec(s.slice(p));
                if (!am) { return { ids: out, p: p }; }
                p += am[0].length;
            }
        }
        // Ligação a partir de s[p] (já sem espaços): { p, label, dash, w, eb, ea } ou null.
        function readLink(s, p) {
            var r = s.slice(p), m, label = '';
            var lab = /^(<)?(--|==|-\.)\s+(?![->=.])([^|]*?)\s+(-{2,}>|-{3,}|={2,}>|={3,}|\.-+>|\.-+|-{2,}[ox]|={2,}[ox])/.exec(r);
            if (lab) { m = { all: lab[0], lt: lab[1], op: lab[2] + lab[4] }; label = lab[3]; }
            else {
                var pl = /^(<|o|x)?(-{2,}>|-{3,}|={2,}>|={3,}|-\.+->|-\.+-|~{3,}|-{2,}[ox](?=\s)|={2,}[ox](?=\s))/.exec(r);
                if (!pl) { return null; }
                m = { all: pl[0], lt: pl[1], op: pl[2] };
                var pm = /^\s*\|([^|]*)\|/.exec(r.slice(pl[0].length));
                if (pm) { label = pm[1]; m.all += pm[0]; }
            }
            var op = m.op, invis = /^~/.test(op);
            var last = op[op.length - 1];
            var eb = last === '>' ? 'arrow' : last === 'o' ? 'circle' : last === 'x' ? 'arrow' : 'none';
            var ea = m.lt === '<' ? 'arrow' : m.lt === 'o' ? 'circle' : m.lt === 'x' ? 'arrow' : 'none';
            return { p: p + m.all.length, label: mmText(label), dash: /\./.test(op) ? 'dash' : 'solid', w: /=/.test(op) ? 'm' : 'f', eb: eb, ea: ea, invis: invis };
        }
        var bad = 0;
        stm.forEach(function (s) {
            var sm;
            if ((sm = /^subgraph\s+(.*)$/i.exec(s))) {
                var body = sm[1].trim(), id, t;
                var a = /^([A-Za-z0-9_\u00C0-\u024F\-]+)\s*\[\s*"?([\s\S]*?)"?\s*\]$/.exec(body);
                if (a) { id = a[1]; t = a[2]; }
                else if (/^".*"$/.test(body)) { t = body; id = 'sg' + subs.length; }
                else if (/^[A-Za-z0-9_\u00C0-\u024F\-]+$/.test(body)) { id = body; t = body; }
                else { t = body; id = 'sg' + subs.length; }
                var g = { id: id, title: mmText(t), parent: stack.length ? stack[stack.length - 1].id : '', at: subs.length };
                if (subById[id]) { g.id = id = id + '_' + subs.length; }
                subs.push(g); subById[id] = g; stack.push(g);
                return;
            }
            if (/^end$/i.test(s)) { stack.pop(); return; }
            if (/^direction\s+/i.test(s)) { return; }
            if ((sm = /^classDef\s+([\w,-]+)\s+(.+)$/i.exec(s))) { sm[1].split(',').forEach(function (c) { classDefs[c.trim()] = sm[2]; }); return; }
            if ((sm = /^class\s+([^\s]+)\s+([\w-]+)\s*$/i.exec(s))) { sm[1].split(',').forEach(function (n) { n = n.trim(); if (n) { (nodeCls[n] = nodeCls[n] || []).push(sm[2]); } }); return; }
            if ((sm = /^style\s+([^\s]+)\s+(.+)$/i.exec(s))) { if (subById[sm[1]]) { subStyle[sm[1]] = sm[2]; } else { nodeStyle[sm[1]] = sm[2]; } return; }
            if (/^linkStyle\s/i.test(s)) { return; }
            if (/^(click|callback|href)\s/i.test(s)) { skip.click++; return; }
            var g1 = readGroup(s, 0);
            if (!g1) { bad++; return; }
            var p = g1.p, from = g1.ids;
            for (;;) {
                while (s[p] === ' ' || s[p] === '\t') { p++; }
                if (p >= s.length) { break; }
                // Id de ligação (e1@-->): ignorado.
                var eid = /^[\w-]+@(?=[-=.~<])/.exec(s.slice(p)); if (eid) { p += eid[0].length; }
                var L = readLink(s, p);
                if (!L) { bad++; break; }
                p = L.p;
                while (s[p] === ' ' || s[p] === '\t') { p++; }
                var g2 = readGroup(s, p);
                if (!g2) { bad++; break; }
                from.forEach(function (f) { g2.ids.forEach(function (t) { if (!L.invis) { edges.push({ a: f.id, b: t.id, label: L.label, dash: L.dash, w: L.w, eb: L.eb, ea: L.ea, sa: !!f.sub, sb: !!t.sub }); } }); });
                from = g2.ids; p = g2.p;
            }
        });
        // Ligação para um subgraph: entra no primeiro nó dele; sai do último.
        var subNodes = function (sid) { return order.filter(function (id) { var g = subById[nodes[id].sub]; while (g) { if (g.id === sid) { return true; } g = subById[g.parent]; } return false; }); };
        edges = edges.filter(function (e) {
            if (e.sa) { var la = subNodes(e.a); if (!la.length) { return false; } e.a = la[la.length - 1]; }
            if (e.sb) { var lb = subNodes(e.b); if (!lb.length) { return false; } e.b = lb[0]; }
            return e.a !== e.b && nodes[e.a] && nodes[e.b];
        });
        order.forEach(function (id) {
            var n = nodes[id];
            n.text = mmText(n.text);
            if (/\bfa:fa-[\w-]+/.test(n.text)) { skip.icon++; n.text = n.text.replace(/\s*fa:fa-[\w-]+\s*/g, ' ').trim(); }
            var st = (nodeCls[id] || []).map(function (c) { return classDefs[c] || ''; }).join(',') + ',' + (nodeStyle[id] || '');
            n.tone = mmTone(st);
        });
        subs.forEach(function (g) { g.tone = mmTone(subStyle[g.id]); });
        if (bad) { skip.other += bad; }
        return { dir: dir, nodes: nodes, order: order, edges: edges, subs: subs, title: title, skip: skip, cls: nodeCls };
    }

    // Grafo lido -> quadro do fluxograma (antes do clean) + avisos.
    function mermaidBoard(G) {
        var H = MM_DIRS[G.dir] === 'h', warn = [];
        var subById = {}; G.subs.forEach(function (g) { subById[g.id] = g; });
        // Raia = subgraph de primeiro nível; moldura = o segundo nível (mais fundo achata).
        var laneOfSub = function (sid) { var g = subById[sid]; while (g && g.parent) { g = subById[g.parent]; } return g ? g.id : ''; };
        var zoneOfSub = function (sid) {
            var g = subById[sid], path = [];
            while (g) { path.unshift(g.id); g = subById[g.parent]; }
            if (path.length > 2) { G.skip.deep++; }
            return path.length >= 2 ? path[1] : '';
        };
        var tops = G.subs.filter(function (g) { return !g.parent; });
        var useLanes = tops.length > 0;
        var nodeLane = {}, nodeZone = {};
        G.order.forEach(function (id) { var s = G.nodes[id].sub; nodeLane[id] = useLanes ? (laneOfSub(s) || '_') : ''; nodeZone[id] = s ? zoneOfSub(s) : ''; });
        var lanes = tops.map(function (g) { return { id: g.id, title: g.title, tone: g.tone }; });
        if (useLanes && G.order.some(function (id) { return nodeLane[id] === '_'; })) {
            lanes.push({ id: '_', title: 'Sem área', tone: '' });
            warn.push('Algumas formas não estavam em nenhum grupo (subgraph) e foram para a raia "Sem área".');
        }
        if (!useLanes) { lanes = [{ id: '', title: '', tone: '' }]; }
        // Formas com o tamanho final (texto quebrado), antes de posicionar.
        var ins = {}, outs = {};
        G.edges.forEach(function (e) { outs[e.a] = (outs[e.a] || 0) + 1; ins[e.b] = (ins[e.b] || 0) + 1; });
        var sh = {};
        G.order.forEach(function (id) {
            var n = G.nodes[id], k = n.shape;
            if (k === 'circ') { k = !ins[id] ? 'evstart' : !outs[id] ? 'evend' : 'conn'; }
            var base = SHAPES[k] || SHAPES.proc, wide = SQUARE.indexOf(k) < 0 && ['dataobj', 'offpage'].indexOf(k) < 0;
            var it = { id: 'm' + n.at, t: 'shape', shape: k, x: 0, y: 0, text: String(n.text).slice(0, 500), fs: SHAPE_FS,
                w: wide ? (k === 'dec' ? 180 : Math.max(base.w, 190)) : base.w, h: 0 };
            var tone = n.tone || base.color;
            it.fill = tone; it.line = tone; it.ink = tone;
            if (MK_OPTS[k]) { it.mk = 'none'; }
            if (k === 'ico') { it.ico = ICO_DEFAULT; }
            sh[id] = shapeFit(it);
        });
        // Bloco = raia (parte principal) ou moldura. Colunas e linhas por bloco.
        var blockOf = function (id) { return nodeLane[id] + '|' + nodeZone[id]; };
        var adj = {};
        G.edges.forEach(function (e, i) { if (blockOf(e.a) === blockOf(e.b)) { (adj[e.a] = adj[e.a] || []).push({ b: e.b, i: i }); } });
        // Voltas (ciclos) pela ordem do texto: não contam para as colunas.
        var back = {}, st = {};
        var dfs = function (u) { st[u] = 1; (adj[u] || []).forEach(function (x) { if (st[x.b] === 1) { back[x.i] = true; } else if (!st[x.b]) { dfs(x.b); } }); st[u] = 2; };
        G.order.forEach(function (id) { if (!st[id]) { dfs(id); } });
        var rank = {}; G.order.forEach(function (id) { rank[id] = 0; });
        for (var it = 0; it < G.order.length; it++) {
            var ch = false;
            G.edges.forEach(function (e, i) { if (back[i] || blockOf(e.a) !== blockOf(e.b)) { return; } if (rank[e.b] < rank[e.a] + 1) { rank[e.b] = rank[e.a] + 1; ch = true; } });
            if (!ch) { break; }
        }
        // Medidas: coluna uniforme (a forma mais larga + vão); linha pela mais alta.
        var GAP_C = 50, GAP_R = 40, PAD = 30;
        var maxMain = 0;
        G.order.forEach(function (id) { maxMain = Math.max(maxMain, H ? sh[id].w : sh[id].h); });
        var COL = maxMain + (H ? GAP_C : GAP_R + 10);
        var hd = H ? LANE.h.hd : LANE.v.hd;
        var items = [], cursor = 0, maxEnd = 0, info = {};
        // Coloca um bloco: devolve a extensão ocupada no eixo transversal.
        function place(ids, cross0) {
            if (!ids.length) { return 0; }
            var cell = {}, rowOf = {}, rows = 0, kids = {};
            G.edges.forEach(function (e, i) { if (!back[i] && ids.indexOf(e.a) >= 0 && ids.indexOf(e.b) >= 0) { (kids[e.a] = kids[e.a] || []).push(e.b); } });
            var sorted = ids.slice().sort(function (a, b) { return rank[a] - rank[b] || G.nodes[a].at - G.nodes[b].at; });
            sorted.forEach(function (id) {
                // Linha desejada: a de quem alimenta (o 1º filho segue na mesma linha).
                var want = null;
                G.edges.forEach(function (e, i) {
                    if (back[i] || e.b !== id || rowOf[e.a] === undefined) { return; }
                    var w = rowOf[e.a] + Math.max(0, (kids[e.a] || []).indexOf(id));
                    if (want === null || w < want) { want = w; }
                });
                if (want === null) { want = rank[id] === 0 && rows ? rows : 0; }
                var r = want;
                while (cell[rank[id] + ':' + r]) { r++; }
                cell[rank[id] + ':' + r] = true; rowOf[id] = r; rows = Math.max(rows, r + 1);
            });
            var size = []; // tamanho transversal de cada linha
            ids.forEach(function (id) { var r = rowOf[id], s = H ? sh[id].h : sh[id].w; size[r] = Math.max(size[r] || 0, s); });
            var at = [], c = cross0;
            for (var r = 0; r < rows; r++) { at[r] = c; c += (size[r] || 0) + (H ? GAP_R : GAP_C); }
            ids.forEach(function (id) {
                var s = sh[id], r = rowOf[id], m0 = hd + PAD + rank[id] * COL;
                var mainLen = H ? s.w : s.h, crossLen = H ? s.h : s.w;
                var mpos = m0 + (COL - (H ? GAP_C : GAP_R + 10) - mainLen) / 2, cpos = at[r] + ((size[r] || 0) - crossLen) / 2;
                if (H) { s.x = Math.round(mpos); s.y = Math.round(cpos); } else { s.y = Math.round(mpos); s.x = Math.round(cpos); }
                maxEnd = Math.max(maxEnd, H ? s.x + s.w : s.y + s.h);
            });
            return c - cross0 - (H ? GAP_R : GAP_C);
        }
        lanes.forEach(function (L, li) {
            var mine = G.order.filter(function (id) { return nodeLane[id] === L.id; });
            var start = cursor, c = cursor + PAD;
            var main = mine.filter(function (id) { return !nodeZone[id]; });
            if (main.length) { c += place(main, c) + PAD; }
            var mainEnd = c - PAD;
            // Molduras da raia, uma depois da outra.
            var zs = [];
            mine.forEach(function (id) { if (nodeZone[id] && zs.indexOf(nodeZone[id]) < 0) { zs.push(nodeZone[id]); } });
            zs.forEach(function (z) {
                var zi = mine.filter(function (id) { return nodeZone[id] === z; });
                var top = c + (main.length || zs.indexOf(z) ? 20 : 0), used = place(zi, top + 34);
                var b = zi.map(function (id) { return sh[id]; });
                var m1 = Math.min.apply(null, b.map(function (s) { return H ? s.x : s.y; })) - 20, m2 = Math.max.apply(null, b.map(function (s) { return H ? s.x + s.w : s.y + s.h; })) + 20;
                var zg = subById[z];
                items.push(H ? { id: 'z' + zg.at, t: 'zone', x: m1, y: top, w: m2 - m1, h: used + 34 + 20, label: zg.title.split('\n')[0], color: COLORS[1] }
                    : { id: 'z' + zg.at, t: 'zone', y: m1, x: top, h: m2 - m1, w: used + 34 + 20, label: zg.title.split('\n')[0], color: COLORS[1] });
                c = top + used + 34 + 20 + PAD;
            });
            if (!mine.length) { c += 60; }
            c += 14;   // corredor das ligações que trocam de raia
            if (L.id || useLanes) {
                var lt = String(L.title || '').split('\n'), lh = Math.max(H ? LANE.h.min : LANE.v.min, c - start);
                var lane = { id: 'l' + li, t: 'lane', dir: H ? 'h' : 'v', title: lt[0].slice(0, 80), desc: lt.slice(1).join(' ').slice(0, 200), tone: L.tone || LANE_TONES[li % LANE_TONES.length], hd: hd, ico: '' };
                if (H) { lane.x = 0; lane.y = start; lane.h = lh; } else { lane.y = 0; lane.x = start; lane.w = lh; }
                items.push(lane);
                cursor = start + lh;
                info[L.id] = { back: mainEnd + 12, cross: cursor - 14 };
            } else { cursor = c; }
        });
        var len = maxEnd + PAD + 10;
        items.forEach(function (i) { if (i.t === 'lane') { if (H) { i.w = len; } else { i.h = len; } } });
        // Lados das ligações pela posição relativa (no eixo do fluxo).
        var F = H ? { fwd: 'l', bwd: 'o', down: 's', up: 'n' } : { fwd: 's', bwd: 'n', down: 'l', up: 'o' };
        var OPPS = { n: 's', s: 'n', l: 'o', o: 'l' };
        var links = [];
        G.edges.forEach(function (e, i) {
            var a = sh[e.a], b = sh[e.b], wp = [];
            var am = H ? a.x : a.y, al = H ? a.w : a.h, bm = H ? b.x : b.y, bl = H ? b.w : b.h;
            var ac = H ? a.y + a.h / 2 : a.x + a.w / 2, bc = H ? b.y + b.h / 2 : b.x + b.w / 2;
            var amid = am + al / 2, bmid = bm + bl / 2;
            var pt = function (m, c) { return H ? { x: Math.round(m), y: Math.round(c) } : { x: Math.round(c), y: Math.round(m) }; };
            var same = Math.abs(ac - bc) < 2, column = bm + bl > am && bm < am + al, sa, sb;
            var la = info[nodeLane[e.a]], lb = info[nodeLane[e.b]];
            if (nodeLane[e.a] !== nodeLane[e.b]) {
                // Troca de raia: sai pelo lado da outra raia e, fora da mesma
                // coluna, corre pelo corredor no fim da raia (não cruza formas).
                sa = bc > ac ? F.down : F.up; sb = OPPS[sa];
                if (!column && la && lb) {
                    var cr = bc > ac ? la.cross : lb.cross;
                    // Forma no caminho (mesma coluna, mesma raia, entre a saída e o
                    // corredor): sai pela frente e desce ao lado dela.
                    var dn = bc > ac, blocked = G.order.some(function (id) {
                        var o = sh[id]; if (o === a || nodeLane[id] !== nodeLane[e.a]) { return false; }
                        var om = H ? o.x : o.y, ol = H ? o.w : o.h, oc = H ? o.y + o.h / 2 : o.x + o.w / 2;
                        return om < amid && om + ol > amid && (dn ? oc > ac : oc < ac);
                    });
                    if (blocked) { var side = am + al + 22; sa = F.fwd; wp = [pt(side, ac), pt(side, cr), pt(bmid, cr)]; }
                    else { wp = [pt(amid, cr), pt(bmid, cr)]; }
                }
            } else if (column && !same) {
                sa = bc > ac ? F.down : F.up; sb = OPPS[sa];
            } else if (bm >= am + al) {
                sa = same ? F.fwd : (bc > ac ? F.down : F.up); sb = F.bwd;
            } else if (la && !nodeZone[e.a] && !nodeZone[e.b]) {
                // Volta: por baixo, no corredor logo depois das linhas da raia.
                sa = F.down; sb = F.down; wp = [pt(amid, la.back), pt(bmid, la.back)];
            } else {
                sa = F.up; sb = F.up;
            }
            links.push({ id: 'k' + i, t: 'link', a: { id: a.id, side: sa }, b: { id: b.id, side: sb }, route: 'elbow', wp: wp,
                label: String(e.label || '').slice(0, 80), dash: e.dash, lw: e.w, eb: e.eb, ea: e.ea });
        });
        var shapes = G.order.map(function (id) { return sh[id]; });
        var all = items.filter(function (i) { return i.t === 'lane'; }).concat(items.filter(function (i) { return i.t === 'zone'; }), shapes, links);
        var W = H ? len + 40 : cursor + 40, Hh = H ? cursor + 40 : len + 40;
        if (W > 6000 || Hh > 6000) { warn.push('O fluxo passou do tamanho máximo da folha (6000 px); confira as bordas depois de importar.'); }
        var sk = G.skip;
        if (sk.shape) { warn.push(sk.shape === 1 ? '1 forma sem equivalente no Codex+ virou Processo.' : sk.shape + ' formas sem equivalente no Codex+ viraram Processo.'); }
        if (sk.icon) { warn.push('Ícones e imagens do Mermaid não vêm junto; escolha no quadro, se quiser.'); }
        if (sk.click) { warn.push(sk.click === 1 ? '1 link de clique (click) foi ignorado; use o link da forma no Codex+.' : sk.click + ' links de clique (click) foram ignorados; use o link da forma no Codex+.'); }
        if (sk.deep) { warn.push('Grupos dentro de grupos com mais de dois níveis viraram uma moldura só.'); }
        if (sk.other) { warn.push(sk.other === 1 ? '1 linha do arquivo não foi entendida e ficou de fora.' : sk.other + ' linhas do arquivo não foram entendidas e ficaram de fora.'); }
        return { data: { v: 1, mode: 'fluxograma', w: Math.max(400, Math.min(6000, Math.ceil(W))), h: Math.max(300, Math.min(6000, Math.ceil(Hh))), items: all }, warn: warn };
    }

    /* Q5i-3 — exportar em Mermaid ("Levar para uma IA", Claudio, 03/10/2026).
       Arquivo .md (a extensão .mmd é de outro formato e algumas IAs recusam):
       instrução curta + bloco ```mermaid. Raias = subgraph (título<br>descrição,
       cor por style); moldura dentro da raia = subgraph interno; texto solto =
       forma "text". Cores das formas por classDef (o tom exato volta na
       importação). Não vão: posições (refeitas na volta), ícones, cores das
       ligações. Função pura. */
    var MM_OUT = {
        proc: ['["', '"]'], task: ['["', '"]'], ico: ['["', '"]'], term: ['(["', '"])'], dec: ['{"', '"}'], gwx: ['{"', '"}'], gwp: ['{"', '"}'], gwi: ['{"', '"}'],
        sub: ['[["', '"]]'], bsub: ['[["', '"]]'], db: ['[("', '")]'], prep: ['{{"', '"}}'], data: ['[/"', '"/]'], manop: ['[/"', '"\\]'], manin: ['[\\"', '"/]'],
        evmid: ['(("', '"))']
    };
    var MM_OUT_AT = { doc: 'doc', dataobj: 'doc', docs: 'docs', delay: 'delay', evstart: 'sm-circ', evend: 'fr-circ', conn: 'f-circ', offpage: 'notch-pent', note: 'card', annot: 'braces', group: 'rect' };
    function mmQuote(t) {
        return String(t || '').replace(/"/g, '#quot;').replace(/\r?\n/g, '<br>');
    }
    function boardToMermaid(D, title, when) {
        var items = D.items || [], lanes = lanesOf(items), H = !lanes.length || lanes[0].dir === 'h';
        var nodes = items.filter(function (i) { return i.t === 'shape' || (i.t === 'text' && String(i.text || '').trim()); });
        var zones = items.filter(function (i) { return i.t === 'zone'; });
        var center = function (i) { var b = i.t === 'shape' ? { x: i.x, y: i.y, w: i.w, h: i.h } : bbox(i); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; };
        var inside = function (z, c) { return c.x >= z.x && c.x < z.x + z.w && c.y >= z.y && c.y < z.y + z.h; };
        // Ordem de leitura: na direção das raias, linha a linha.
        var key = function (i) { var c = center(i); return H ? [c.y, c.x] : [c.x, c.y]; };
        nodes.sort(function (a, b) { var ka = key(a), kb = key(b); return Math.abs(ka[0] - kb[0]) > 30 ? ka[0] - kb[0] : ka[1] - kb[1]; });
        var id = {}; nodes.forEach(function (n, k) { id[n.id] = 'n' + (k + 1); });
        var used = {};
        function nodeLine(n, ind) {
            used[n.id] = true;
            var t = mmQuote(n.text), nid = id[n.id];
            if (n.t === 'text') { return ind + nid + '@{ shape: text, label: "' + t + '" }'; }
            var br = MM_OUT[n.shape];
            if (br) { return ind + nid + br[0] + t + br[1]; }
            return ind + nid + '@{ shape: ' + (MM_OUT_AT[n.shape] || 'rect') + ', label: "' + t + '" }';
        }
        var out = [];
        if (title) { out.push('---', 'title: ' + String(title).replace(/[\r\n]+/g, ' '), '---'); }
        out.push('flowchart ' + (H ? 'LR' : 'TD'));
        var laneOfNode = {}, zoneOfNode = {};
        nodes.forEach(function (n) {
            var c = center(n);
            lanes.forEach(function (l, li) { if (laneOfNode[n.id] === undefined && inLane(l, n)) { laneOfNode[n.id] = li; } });
            zones.forEach(function (z, zi) { if (zoneOfNode[n.id] === undefined && inside(z, c)) { zoneOfNode[n.id] = zi; } });
        });
        // Moldura fica na raia onde está o centro dela (sem raias: grupo próprio).
        var zoneLane = zones.map(function (z) { var c = { x: z.x + z.w / 2, y: z.y + z.h / 2 }, r = -1; lanes.forEach(function (l, li) { if (r < 0 && c.x >= l.x && c.x < l.x + l.w && c.y >= l.y && c.y < l.y + l.h) { r = li; } }); return r; });
        function zoneBlock(zi, ind) {
            var inZ = nodes.filter(function (n) { return zoneOfNode[n.id] === zi && !used[n.id]; });
            if (!inZ.length) { return; }
            out.push(ind + 'subgraph Z' + (zi + 1) + '["' + mmQuote(zones[zi].label || 'Grupo') + '"]');
            out.push(ind + '    direction ' + (H ? 'LR' : 'TB'));
            inZ.forEach(function (n) { out.push(nodeLine(n, ind + '    ')); });
            out.push(ind + 'end');
        }
        lanes.forEach(function (l, li) {
            var t = mmQuote(l.title || ('Área ' + (li + 1))) + (l.desc ? '<br>' + mmQuote(l.desc) : '');
            out.push('    subgraph L' + (li + 1) + '["' + t + '"]');
            out.push('        direction ' + (H ? 'LR' : 'TB'));
            nodes.forEach(function (n) { if (laneOfNode[n.id] === li && (zoneOfNode[n.id] === undefined || zoneLane[zoneOfNode[n.id]] !== li)) { out.push(nodeLine(n, '        ')); } });
            zones.forEach(function (z, zi) { if (zoneLane[zi] === li) { zoneBlock(zi, '        '); } });
            out.push('    end');
        });
        if (!lanes.length) { zones.forEach(function (z, zi) { zoneBlock(zi, '    '); }); }
        nodes.forEach(function (n) { if (!used[n.id]) { out.push(nodeLine(n, '    ')); } });
        // Ligações: pela posição da origem e, entre irmãs, de cima para baixo
        // (a primeira saída segue na mesma linha quando volta para o Codex+).
        var pos = {}; nodes.forEach(function (n, k) { pos[n.id] = k; });
        var links = items.filter(function (i) { return i.t === 'link' && id[i.a.id] && id[i.b.id]; });
        links.sort(function (a, b) { return pos[a.a.id] - pos[b.a.id] || pos[a.b.id] - pos[b.b.id]; });
        links.forEach(function (L) {
            var thick = L.lw === 'm' || L.lw === 'g', dash = L.dash === 'dash' || L.dash === 'dot';
            var end = L.eb && L.eb !== 'none', start = L.ea && L.ea !== 'none';
            var op = dash ? (end ? '-.->' : '-.-') : thick ? (end ? '==>' : '===') : (end ? '-->' : '---');
            if (end && L.eb === 'circle' && !dash && !thick) { op = '--o'; }
            if (start && end && !dash && !thick && L.eb !== 'circle') { op = '<-->'; }
            var lab = String(L.label || '').trim();
            out.push('    ' + id[L.a.id] + ' ' + op + (lab ? '|"' + mmQuote(lab) + '"|' : '') + ' ' + id[L.b.id]);
        });
        // Cores: só o que difere da cor padrão do tipo de forma.
        var byTone = {};
        nodes.forEach(function (n) {
            if (n.t !== 'shape') { return; }
            var def = (SHAPES[n.shape] || SHAPES.proc).color;
            if (n.fill && n.fill !== def && FLOW_COLORS[n.fill]) { (byTone[n.fill] = byTone[n.fill] || []).push(id[n.id]); }
        });
        Object.keys(byTone).forEach(function (k) { var c = FLOW_COLORS[k]; out.push('    classDef ' + k + ' fill:' + c.f + ',stroke:' + c.s + ',color:' + c.t); });
        Object.keys(byTone).forEach(function (k) { out.push('    class ' + byTone[k].join(',') + ' ' + k); });
        lanes.forEach(function (l, li) { var c = FLOW_COLORS[l.tone]; if (c) { out.push('    style L' + (li + 1) + ' fill:' + c.f + ',stroke:' + c.s); } });
        var head = '# ' + (title || 'Fluxograma') + '\n\n'
            + 'Fluxograma exportado do Codex+' + (when ? ' em ' + when : '') + ', no formato Mermaid (flowchart).\n'
            + 'Para ajustar com uma IA: anexe este arquivo e peça as mudanças, pedindo a resposta no mesmo formato: '
            + 'um arquivo Mermaid do tipo flowchart, com um grupo (subgraph) para cada área. Depois importe a resposta no Codex+.\n\n';
        return head + '```mermaid\n' + out.join('\n') + '\n```\n';
    }

    /* ======================================================================
       Q6e — organograma em Mermaid, ida e volta (Claudio, 03/10/2026).
       Cada caixa é "Nome<br>Cargo" (área = caixa dupla [[ ]]); --> é chefia,
       -.-> é reporte; o nível vai como classe (classDef com a cor). A matriz
       vai como tabela Markdown depois do diagrama. Um comentário no fim
       (<!-- codexplus-org {...} -->) guarda os níveis exatos para a volta.
       Sem as classes (Mermaid feito por uma IA do zero), o nível sai pela
       profundidade na árvore. Funções puras: testáveis sem DOM.
       ====================================================================== */
    var ORG_VAGA = /^(vaga em aberto|vaga|coringa a definir|\(vaga\)|a definir)$/i;
    function orgToMermaid(S, title, when) {
        var T = OD().tree(S), order = [], seen = {};
        (function walkAll() {
            var go = function (n) { if (seen[n.id]) { return; } seen[n.id] = 1; order.push(n); (T.kids[n.id] || []).forEach(go); };
            S.nodes.forEach(function (n) { if (!T.parentOf[n.id]) { go(n); } });
            S.nodes.forEach(go);
        })();
        var id = {}; order.forEach(function (n, k) { id[n.id] = 'n' + (k + 1); });
        var out = [];
        if (title) { out.push('---', 'title: ' + String(title).replace(/[\r\n]+/g, ' '), '---'); }
        out.push('flowchart TD');
        order.forEach(function (n) {
            var t = mmQuote(OD().label(n) + (n.role ? '\n' + n.role : ''));
            out.push('    ' + id[n.id] + (n.group ? '[["' + t + '"]]' : '["' + t + '"]'));
        });
        S.edges.forEach(function (e) {
            if (!id[e.from] || !id[e.to]) { return; }
            var lab = String(e.label || '').trim();
            out.push('    ' + id[e.from] + ' ' + (e.boss ? '-->' : '-.->') + (lab ? '|"' + mmQuote(lab) + '"|' : '') + ' ' + id[e.to]);
        });
        var by = {};
        order.forEach(function (n) { (by[n.lvl] = by[n.lvl] || []).push(id[n.id]); });
        S.levels.forEach(function (l) {
            if (!by[l.key]) { return; }
            out.push('    classDef ' + l.key + ' fill:#ffffff,stroke:' + l.color + ',stroke-width:2px,color:#17202d');
            out.push('    class ' + by[l.key].join(',') + ' ' + l.key);
        });
        var marca = function (nome, estilo, f) {
            var ids = order.filter(f).map(function (n) { return id[n.id]; });
            if (ids.length) { out.push('    classDef ' + nome + ' ' + estilo); out.push('    class ' + ids.join(',') + ' ' + nome); }
        };
        marca('tracejado', 'stroke-dasharray:5 3', function (n) { return !!n.dashed; });
        marca('aconfirmar', 'color:#8a5500', function (n) { return !!n.pend; });
        marca('assessoria', 'font-style:italic', function (n) { return n.kind === 'assessoria'; });
        marca('terceiro', 'font-style:italic', function (n) { return n.kind === 'terceiro'; });
        var cell = function (t) { return String(t || '').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' '); };
        var tab = (S.esc || []).length ? '\n## Matriz de escalonamento\n\n| Nível | Papel | Escala para o próximo nível quando | Tempo alvo |\n|---|---|---|---|\n'
            + S.esc.map(function (r) { return '| ' + r.c.map(cell).join(' | ') + ' |'; }).join('\n') + '\n' : '';
        var meta = { levels: S.levels, escLvl: (S.esc || []).map(function (r) { return r.lvl; }) };
        var head = '# ' + (title || 'Organograma') + '\n\n'
            + 'Organograma exportado do Codex+' + (when ? ' em ' + when : '') + ', no formato Mermaid (flowchart).\n'
            + 'Cada caixa é "Nome<br>Cargo" (caixa dupla = área ou equipe); seta cheia (-->) é chefia e tracejada (-.->) é reporte.\n'
            + 'Para ajustar com uma IA: anexe este arquivo e peça as mudanças, pedindo a resposta no mesmo formato '
            + '(Mermaid flowchart e, se houver, a tabela da matriz). Depois importe a resposta no Codex+.\n\n';
        return head + '```mermaid\n' + out.join('\n') + '\n```\n' + tab + '\n<!-- codexplus-org ' + JSON.stringify(meta).replace(/--/g, '- -') + ' -->\n';
    }
    function orgNorm(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
    // Tabela Markdown "Nível | Papel | …" (a matriz), se houver.
    function orgEscTable(txt) {
        var lines = String(txt).replace(/\r\n?/g, '\n').split('\n'), rows = [], inTab = false;
        lines.forEach(function (l) {
            var t = l.trim();
            if (!/^\|.*\|$/.test(t)) { if (inTab && rows.length) { inTab = 'fim'; } return; }
            if (inTab === 'fim') { return; }
            var cells = t.slice(1, -1).split(/(?<!\\)\|/).map(function (c) { return c.replace(/\\\|/g, '|').trim(); });
            if (!inTab) { if (/n[ií]vel/i.test(cells[0] || '') && cells.length >= 2) { inTab = true; } return; }
            if (cells.every(function (c) { return /^:?-{2,}:?$/.test(c); })) { return; }
            rows.push([0, 1, 2, 3].map(function (i) { return (cells[i] || '').slice(0, 500); }));
        });
        return rows;
    }
    function mermaidOrg(G, txt, cur) {
        var warn = [], meta = null, mm = /<!--\s*codexplus-org\s+(\{[\s\S]*?\})\s*-->/.exec(String(txt));
        if (mm) { try { meta = JSON.parse(mm[1].replace(/- -/g, '--')); } catch (e) { meta = null; } }
        var curS = OD().normalize(cur || null);
        var levels = meta && Array.isArray(meta.levels) && meta.levels.length ? meta.levels : curS.levels;
        levels = OD().normalize({ nodes: [{ id: 'x' }], levels: levels }).levels;
        var keys = levels.map(function (l) { return l.key; });
        var nid = {}, nodes = [], edges = [], hasBoss = {}, extra = 0;
        G.order.forEach(function (gid, k) {
            var g = G.nodes[gid], ls = String(g.text || '').split('\n'), cls = (G.cls && G.cls[gid]) || [];
            var name = (ls[0] || '').slice(0, 120), n = { id: 'n' + (k + 1), name: ORG_VAGA.test(name.trim()) ? '' : name, role: ls.slice(1).join(' ').slice(0, 160), lvl: '', note: '', pend: false, group: g.shape === 'sub' };
            cls.forEach(function (c) {
                if (keys.indexOf(c) >= 0) { n.lvl = c; }
                if (c === 'aconfirmar') { n.pend = true; }
                if (c === 'tracejado') { n.dashed = true; }
                if (c === 'assessoria' || c === 'terceiro') { n.kind = c; }
            });
            nid[gid] = n.id; nodes.push(n);
        });
        G.edges.forEach(function (e) {
            var a = nid[e.a], b = nid[e.b]; if (!a || !b) { return; }
            var boss = e.dash !== 'dash' && !hasBoss[b];
            if (e.dash !== 'dash' && hasBoss[b]) { extra++; }
            if (boss) { hasBoss[b] = a; }
            edges.push({ id: 'e' + edges.length, from: a, to: b, boss: boss, style: boss ? 'solida' : 'tracejada', label: String(e.label || '').slice(0, 120) });
        });
        if (extra) { warn.push(extra === 1 ? '1 pessoa tinha duas chefias: a segunda entrou como reporte (linha tracejada).' : extra + ' pessoas tinham mais de uma chefia: as demais entraram como reporte (linha tracejada).'); }
        // Sem classe de nível: pela profundidade na árvore (topo = 1º nível).
        var semNivel = nodes.filter(function (n) { return !n.lvl; });
        if (semNivel.length) {
            var depth = {}, kids = {};
            edges.forEach(function (e) { if (e.boss) { (kids[e.from] = kids[e.from] || []).push(e.to); } });
            var fila = nodes.filter(function (n) { return !hasBoss[n.id]; }).map(function (n) { depth[n.id] = 0; return n.id; });
            while (fila.length) { var x = fila.shift(); (kids[x] || []).forEach(function (y) { if (depth[y] === undefined) { depth[y] = depth[x] + 1; fila.push(y); } }); }
            semNivel.forEach(function (n) { n.lvl = keys[Math.min(depth[n.id] || 0, keys.length - 1)]; });
            if (semNivel.length === nodes.length) { warn.push('O arquivo não indica os níveis: eles foram dados pela posição na árvore (confira em Níveis e no painel).'); }
        }
        // Matriz: a da tabela do arquivo; sem tabela, fica a atual.
        var rows = orgEscTable(txt), esc;
        if (rows.length) {
            var guess = function (t) {
                var a = orgNorm(t), best = '', bs = 0;
                levels.forEach(function (l) { var b = orgNorm(l.label), i = 0; while (i < a.length && i < b.length && a[i] === b[i]) { i++; } if (i > bs) { bs = i; best = l.key; } });
                return bs >= 4 ? best : keys[keys.length - 1];
            };
            esc = rows.map(function (c, i) {
                var k = meta && meta.escLvl && keys.indexOf(meta.escLvl[i]) >= 0 ? meta.escLvl[i] : guess(c[0]);
                return { lvl: k, c: c };
            });
        } else {
            esc = curS.esc;
            if (esc.length) { warn.push('O arquivo não traz a matriz de escalonamento: a matriz atual foi mantida.'); }
        }
        if (G.subs && G.subs.length) { warn.push((G.subs.length === 1 ? '1 grupo (subgraph) foi ignorado' : G.subs.length + ' grupos (subgraph) foram ignorados') + ': no organograma, quem agrupa é a chefia. As pessoas entraram normalmente.'); }
        return { org: { kind: 'organograma', levels: levels, nodes: nodes, edges: edges, esc: esc, elements: curS.elements || [] }, warn: warn };
    }
    // Leitura de um arquivo para o organograma: cópia do Codex+ (quadro ou o
    // JSON do organograma, inclusive o do motor antigo e o do protótipo) ou
    // Mermaid. Devolve { err } ou { data, kind, title, warn[] }.
    function readOrgIo(txt, cur) {
        var mode = 'organograma';
        if (/^(```|---|%%|#|flowchart\b|graph\b)/i.test(txt) || /```\s*mermaid/i.test(txt)) {
            var G = parseMermaid(txt);
            if (!G.err && G.order.length) {
                if (G.order.length > 2000) { return { err: 'O organograma tem elementos demais (mais de 2000). Divida em mais de um diagrama.' }; }
                var r = mermaidOrg(G, txt, cur);
                return { data: clean({ mode: mode, org: r.org }, mode), kind: /codexplus-org/.test(txt) ? 'Mermaid do Codex+' : 'Mermaid (gerado por IA)', title: G.title, warn: r.warn };
            }
            if (/(^|\n)\s*(sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|gantt|pie|journey|mindmap|timeline|gitGraph|quadrantChart|requirementDiagram|C4\w+|sankey(-beta)?|xychart(-beta)?|block(-beta)?|packet(-beta)?|architecture(-beta)?|kanban)\b/.test(txt)) {
                return { err: 'Este Mermaid não é do tipo flowchart. Peça à IA o organograma em Mermaid flowchart, com uma seta do chefe para cada subordinado.' };
            }
        }
        var obj = null;
        try { obj = JSON.parse(txt); } catch (e) {
            var i = txt.indexOf('{'), j = txt.lastIndexOf('}');
            if (i >= 0 && j > i) { try { obj = JSON.parse(txt.slice(i, j + 1)); } catch (e2) { obj = null; } }
        }
        var NAO = 'Este conteúdo não é um organograma do Codex+. Use o arquivo gerado por Exportar > Guardar uma cópia do organograma, ou um Mermaid.';
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { return { err: NAO }; }
        var org = null, kind = 'Cópia do Codex+', title = '';
        if (obj.formato === IO_FORMAT) {
            if ((+obj.versao || 0) > IO_VERSION) { return { err: 'Este arquivo é de uma versão mais nova do Codex+. Atualize o plugin para importar.' }; }
            var q = obj.quadro || {};
            if (q.mode && q.mode !== mode) {
                var art = { planta: 'uma planta', topologia: 'uma topologia', fluxograma: 'um fluxograma' };
                return { err: 'Este arquivo é de ' + (art[q.mode] || 'outro tipo de quadro') + ', não de um organograma.' };
            }
            org = q.org; title = String(obj.titulo || '').slice(0, 200);
        } else if (Array.isArray(obj.nodes) || (obj.tree && typeof obj.tree === 'object')) {
            org = obj; kind = 'Organograma do Codex+ (cópia do editor anterior)';
        } else if (Array.isArray(obj.items) || obj.board) {
            return { err: 'Este arquivo é de outro tipo de quadro, não de um organograma.' };
        }
        if (!org || typeof org !== 'object' || !((Array.isArray(org.nodes) && org.nodes.length) || org.tree)) { return { err: NAO }; }
        var n0 = Array.isArray(org.nodes) ? org.nodes.length : 0;
        if (n0 > 2000) { return { err: 'O organograma tem elementos demais (mais de 2000).' }; }
        var data = clean({ mode: mode, org: org }, mode), warn = [];
        var drop = n0 - data.org.nodes.length;
        if (n0 && drop > 0) { warn.push(drop === 1 ? '1 elemento sem identificação não pôde ser trazido.' : drop + ' elementos sem identificação não puderam ser trazidos.'); }
        return { data: data, kind: kind, title: title, warn: warn };
    }

    /* Q5i-1 — leitura de um arquivo de fluxo (pura: testável sem DOM).
       Devolve { err } ou { data, kind, title, warn[] }. `data` já passou
       pelo clean() do motor. */
    var IO_FORMAT = 'codexplus-quadro', IO_VERSION = 1, IO_MAX = 1024 * 1024;
    // Q7a (Claudio, 03/10/2026): a cópia da planta leva a imagem (data URL),
    // então o limite dela é maior.
    var IO_MAX_BG = 12 * 1024 * 1024;
    function ioMax(mode) { return mode === 'planta' ? IO_MAX_BG : IO_MAX; }
    var IO_NOUN = { fluxograma: 'fluxo', organograma: 'organograma', planta: 'planta', topologia: 'topologia' };
    var BG_OK = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/=]+$/;
    function readIo(txt, mode, here, cur) {
        txt = String(txt || '').replace(/^\uFEFF/, '').trim();
        if (!txt) { return { err: 'Nada para importar: o conteúdo está vazio.' }; }
        if (txt.length > ioMax(mode)) { return { err: mode === 'planta' ? 'Conteúdo grande demais (mais de 12 MB), mesmo contando a imagem da planta.' : 'Conteúdo grande demais (mais de 1 MB). O quadro inteiro do Codex+ tem até 1 MB.' }; }
        if (mode === 'organograma') { return readOrgIo(txt, cur); }
        // Q5i-2: Mermaid (o que as IAs geram). Só o fluxograma.
        if (/^(```|---|%%|flowchart\b|graph\b)/i.test(txt) || /```\s*mermaid/i.test(txt)) {
            var G = parseMermaid(txt);
            if (!G.err) {
                if (mode !== 'fluxograma') { return { err: 'Mermaid só entra no fluxograma.' }; }
                if (!G.order.length) { return { err: 'O arquivo Mermaid não tem nenhuma forma para desenhar.' }; }
                if (G.order.length > MM_MAX_NODES) { return { err: 'O fluxo tem formas demais (mais de ' + MM_MAX_NODES + '). Divida em mais de um diagrama.' }; }
                var mb = mermaidBoard(G);
                return { data: clean(mb.data, mode), kind: 'Mermaid (gerado por IA)', title: G.title, warn: mb.warn };
            }
            if (/(^|\n)\s*(sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|gantt|pie|journey|mindmap|timeline|gitGraph|quadrantChart|requirementDiagram|C4\w+|sankey(-beta)?|xychart(-beta)?|block(-beta)?|packet(-beta)?|architecture(-beta)?|kanban)\b/.test(txt)) {
                return { err: 'Este Mermaid não é um fluxograma. Peça à IA o fluxo em Mermaid do tipo flowchart, com um grupo (subgraph) para cada área.' };
            }
        }
        var obj = null;
        try { obj = JSON.parse(txt); } catch (e) {
            // Tolerância: texto em volta do JSON (bloco de código, comentário).
            var i = txt.indexOf('{'), j = txt.lastIndexOf('}');
            if (i >= 0 && j > i) { try { obj = JSON.parse(txt.slice(i, j + 1)); } catch (e2) { obj = null; } }
        }
        var NAO = mode === 'fluxograma' ? 'Este conteúdo não é um fluxo do Codex+. Use o arquivo gerado por Exportar > Guardar uma cópia do fluxo.'
            : 'Este conteúdo não é uma cópia de ' + (mode === 'planta' ? 'planta' : 'topologia') + ' do Codex+. Use o arquivo gerado por Exportar cópia.';
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { return { err: NAO }; }
        var q = null, kind = 'Cópia do Codex+', title = '', origin = '', bgIn = '';
        if (obj.formato === IO_FORMAT) {
            if ((+obj.versao || 0) > IO_VERSION) { return { err: 'Este arquivo é de uma versão mais nova do Codex+. Atualize o plugin para importar.' }; }
            q = obj.quadro; title = String(obj.titulo || '').slice(0, 200); origin = String(obj.origem || '');
            if (mode === 'planta' && typeof obj.planta === 'string' && BG_OK.test(obj.planta)) { bgIn = obj.planta; }
        } else if (obj.board && typeof obj.board === 'object') {
            q = obj.board; kind = 'Quadro do Codex+';
        } else if (Array.isArray(obj.items)) {
            q = obj; kind = 'Quadro do Codex+';
        }
        if (!q || typeof q !== 'object' || !Array.isArray(q.items)) { return { err: q && q.mode === 'organograma' ? 'Este arquivo é de um organograma, não de ' + ({ planta: 'uma planta', topologia: 'uma topologia', fluxograma: 'um fluxograma' }[mode] || mode) + '.' : NAO }; }
        if (q.mode && q.mode !== mode) {
            var art = { planta: 'uma planta', topologia: 'uma topologia', fluxograma: 'um fluxograma', organograma: 'um organograma' };
            return { err: 'Este arquivo é de ' + (art[q.mode] || 'outro tipo de quadro') + ', não de ' + (art[mode] || mode) + '.' };
        }
        var data = clean(Object.assign({}, q, { mode: mode }), mode);
        var warn = [];
        var src = q.items.filter(function (it) { return it && typeof it === 'object'; });
        var lost = src.length - data.items.length;
        if (lost > 0) { warn.push(lost === 1 ? '1 item não pôde ser trazido (tipo que o ' + MODES[mode].toLowerCase() + ' não usa ou ligação sem as duas pontas).' : lost + ' itens não puderam ser trazidos (tipos que o ' + MODES[mode].toLowerCase() + ' não usa ou ligações sem as duas pontas).'); }
        var cut = src.filter(function (it) { return it.t === 'shape' && String(it.text || '').length > 500; }).length;
        if (cut) { warn.push(cut === 1 ? '1 forma tinha texto com mais de 500 letras e foi cortada.' : cut + ' formas tinham texto com mais de 500 letras e foram cortadas.'); }
        var docs = data.items.filter(function (it) { return it.lk && it.lk.t === 'doc'; }).length;
        here = here === undefined ? (typeof location !== 'undefined' ? location.origin : '') : here;
        if (docs && origin && here && origin !== here) {
            warn.push((docs === 1 ? '1 forma tem link' : docs + ' formas têm link') + ' para documento do Codex+ de outro ambiente (' + origin + '). Confira se ' + (docs === 1 ? 'aponta' : 'apontam') + ' para o documento certo.');
        }
        if (!data.items.length && !bgIn) { return { err: 'O arquivo não tem nada que ' + (mode === 'planta' ? 'a planta' : mode === 'topologia' ? 'a topologia' : 'o ' + MODES[mode].toLowerCase()) + ' consiga desenhar.' }; }
        return { data: data, kind: kind, title: title, warn: warn, bg: bgIn };
    }

    function pngName(mode, now, title) {
        var t = document.querySelector('input[name="name"]');
        var slug = String(title || (t && t.value) || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
        var d = now || new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
        return (MODES[mode] && mode !== 'planta' ? mode : 'planta') + (slug ? '-' + slug : '')
            + '-' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '.png';
    }

    function notify(editor, text, type) {
        if (editor && editor.notificationManager) {
            editor.notificationManager.open({ text: text, type: type || 'info', timeout: type === 'error' ? 0 : 4000 });
        } else if (type === 'error' && typeof window.glpi_toast_error === 'function') {
            window.glpi_toast_error(text);
        } else if (type !== 'error' && typeof window.glpi_toast_info === 'function') {
            window.glpi_toast_info(text);
        } else { window.alert(text); }
    }

    function build(editor, node, D, bgUrl, bgChanged, host) {
        var flow = D.mode === 'fluxograma';
        if (flow) { D.legend = false; D.pxm = 0; }
        var org = D.mode === 'organograma' && !!OD() && !!D.org;
        var saveLabel = host ? 'Salvar ' + MODES[D.mode].toLowerCase() : (node ? 'Salvar quadro' : 'Inserir no documento');
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
            + '<button type="button" data-tool="zone" title="Desenhar ' + (flow ? 'moldura' : 'zona / área') + ' (Z)">' + (flow ? 'Moldura' : D.mode === 'planta' ? 'Área' : 'Zona') + '</button>'
            + '<button type="button" data-tool="text" title="Texto (T)">Texto</button>'
            + (flow ? '' : '<button type="button" data-tool="duct" title="Eletrocalha / canaleta: clique os pontos; duplo clique ou Enter termina; Esc cancela (E)">Eletrocalha</button>'
            + (D.mode === 'planta' ? '<button type="button" data-tool="wall" title="Parede: clique os pontos; duplo clique ou Enter termina; Esc cancela. O material vale para o mapa de calor (P)">Parede</button>' : '')
            + '<button type="button" data-tool="scale" title="Escala: clique em dois pontos da planta e informe a distância real">Escala</button>'
            + '<span class="cx-board-scale"></span>')
            + '<span class="cx-board-sep"></span>'
            + '<button type="button" data-act="group" title="Agrupar (Ctrl+G)">Agrupar</button>'
            + '<button type="button" data-act="ungroup" title="Desagrupar (Ctrl+Shift+G)">Desagrupar</button>'
            + '<button type="button" data-act="lock" title="Travar / destravar">Travar</button>'
            + '<button type="button" data-act="del" title="Excluir (Delete)">Excluir</button>'
            + '<span class="cx-board-sep"></span>'
            + (flow ? '' : '<button type="button" data-act="smaller" title="Diminuir ícones (os selecionados; sem seleção, todos)">Ícone −</button>'
            + '<button type="button" data-act="bigger" title="Aumentar ícones (os selecionados; sem seleção, todos)">Ícone +</button>'
            + '<button type="button" data-act="rotate" title="Girar os ícones selecionados 90° (R)">Girar 90°</button>'
            + '<span class="cx-board-sep"></span>')
            + '<button type="button" data-act="undo" title="Desfazer (Ctrl+Z)">↶</button>'
            + '<button type="button" data-act="redo" title="Refazer (Ctrl+Y)">↷</button>'
            + '<span class="cx-board-sep"></span>'
            + '<button type="button" data-act="zout" title="Afastar">−</button><span class="cx-board-zoom">100%</span>'
            + '<button type="button" data-act="zin" title="Aproximar">+</button>'
            + '<button type="button" data-act="fit" title="Ajustar à tela">Ajustar</button>'
            + '<button type="button" data-act="find" title="Buscar no quadro (Ctrl+F)">Buscar</button>'
            + '<button type="button" data-act="mm" class="is-on" aria-pressed="true" title="Mostrar ou esconder o minimapa">Mapa</button>'
            + (flow ? '<span class="cx-board-sep"></span><label class="cx-board-op cx-board-page" title="Tamanho da folha (cresce para a direita e para baixo)">Folha '
                + '<select data-act="page">' + PAGE_SIZES.map(function (p) { return '<option value="' + p.v + '">' + p.l + '</option>'; }).join('')
                + '<option value="custom">Personalizado</option></select>'
                + '<span class="cx-board-pagec" hidden><input type="number" min="400" max="6000" step="100" data-pg="w" title="Largura (px)"> × '
                + '<input type="number" min="300" max="6000" step="100" data-pg="h" title="Altura (px)"></span></label>'
                // Q5i-1 (Claudio, 03/10/2026): importar e exportar o fluxo em arquivo.
                + '<span class="cx-board-sep"></span><button type="button" data-act="imp" title="Trazer um fluxo de um arquivo (substitui o desenho; Ctrl+Z desfaz)">Importar</button>'
                + '<span class="cx-board-xw"><button type="button" data-act="exp" aria-haspopup="true" aria-expanded="false" title="Levar este fluxo para um arquivo">Exportar <span class="cx-board-car" aria-hidden="true">▾</span></button>'
                + '<div class="cx-board-xm" role="menu" hidden>'
                + '<button type="button" role="menuitem" data-act="expjson"><b>Guardar uma cópia do fluxo</b><span>Arquivo do Codex+ com tudo: cores, links e ícones. Serve de backup ou para levar o fluxo a outro documento.</span></button>'
                + '<button type="button" role="menuitem" data-act="expmd"><b>Levar para uma IA</b><span>Arquivo que ChatGPT, Claude e Gemini entendem. Anexe na IA, peça os ajustes e importe a resposta de volta (o Codex+ refaz as posições).</span></button>'
                + '</div></span>' : '')
            + (D.mode === 'planta'
                ? '<span class="cx-board-sep"></span><button type="button" data-act="bg">' + (bgUrl ? 'Trocar planta' : 'Enviar planta') + '</button>'
                  + '<label class="cx-board-op" title="Transparência da planta">Planta <input type="range" min="10" max="100" step="5" data-act="op" value="' + Math.round(D.bgOpacity * 100) + '"></label>'
                  + '<button type="button" data-act="rot" title="Girar a planta 90° (os itens giram junto)"' + (bgUrl ? '' : ' hidden') + '>Girar planta</button>'
                  + '<button type="button" data-act="bgdel"' + (bgUrl ? '' : ' hidden') + '>Tirar planta</button>'
                  + '<label class="cx-board-op" title="Mostrar ou esconder as paredes no quadro, no PNG e na legenda (o mapa de calor considera as paredes mesmo escondidas)"><input type="checkbox" data-act="walls"' + (D.wallsOn !== false ? ' checked' : '') + '> Paredes</label>'
                : '')
            // Q7a: cópia do quadro em arquivo (backup ou levar a outro documento).
            + (D.mode === 'planta' || D.mode === 'topologia'
                ? '<span class="cx-board-sep"></span><button type="button" data-act="imp" title="Trazer uma cópia guardada do Codex+ (substitui o desenho; Ctrl+Z desfaz)">Importar</button>'
                  + '<button type="button" data-act="expjson" title="Guardar uma cópia ' + (D.mode === 'planta' ? 'da planta (com a imagem)' : 'da topologia') + ' em arquivo">Exportar cópia</button>'
                : '')
            + '</div>'
            + '<span class="cx-board-spacer"></span>'
            + (flow ? '' : '<label class="cx-board-op" title="Gera, ao salvar, uma imagem com os símbolos usados, logo abaixo do quadro no documento"><input type="checkbox" data-act="legend"' + (D.legend ? ' checked' : '') + '> Legenda abaixo do quadro</label>')
            + '<button type="button" data-act="png" title="Baixar o quadro como imagem PNG (como está agora, mesmo sem salvar)">Baixar PNG</button>'
            + '<button type="button" data-act="cancel">Cancelar</button>'
            + '<button type="button" data-act="save" class="cx-board-ok">' + saveLabel + '</button>'
            + '</div>'
            + '<div class="cx-board-body">'
            + '<aside class="cx-board-pal">' + (flow ? '<div class="cx-board-pal-top"><input type="search" class="cx-board-q" placeholder="Buscar forma ou ícone"></div>' : '<div class="cx-board-pal-top"><input type="search" class="cx-board-q" placeholder="Buscar ícone">'
            + (LIB.canCreate ? '<button type="button" class="cx-board-newic" title="Criar um ícone a partir de uma imagem (Super-Admin)">+ Ícone</button>' : '')
            + '</div>') + '<div class="cx-board-icons"></div></aside>'
            + '<div class="cx-board-stage"><svg class="cx-board-svg" xmlns="' + NS + '"><g class="vp">'
            + '<rect class="cx-board-paper"/><image class="cx-board-bgimg" preserveAspectRatio="none"/>'
            + '<g class="cx-board-zones"></g><g class="cx-board-ducts"></g><g class="cx-board-links"></g><g class="cx-board-items"></g><g class="cx-board-find"></g><g class="cx-board-sel"></g><g class="cx-board-guides"></g>'
            + '<rect class="cx-board-marq" hidden/></g></svg>'
            + '<div class="cx-board-mm" title="Minimapa: clique ou arraste para mover a vista"><svg xmlns="' + NS + '" preserveAspectRatio="xMidYMid meet"></svg></div>'
            + '<div class="cx-board-hint">' + (flow
                ? 'Arraste uma forma da paleta para o quadro. Duplo clique na forma (ou comece a digitar) escreve nela. Com a forma selecionada, puxe uma alça azul até outra forma para ligar: a 1ª saída da decisão nasce Sim, a 2ª Não. Arraste o fundo para mover a vista; roda do mouse dá zoom.'
                : 'Arraste um ícone da paleta para o quadro. Segure e arraste o fundo para mover a vista; roda do mouse dá zoom; Shift + arrastar seleciona em área. Com um ícone selecionado, puxe uma das alças azuis até outro ícone para ligar.') + '</div></div>'
            + '<aside class="cx-board-props"></aside>'
            + '</div>';
        document.body.appendChild(root);
        document.documentElement.classList.add('cx-board-open');
        if (org) {
            // Q6b-1: barra do organograma — sem formas, ícones, molduras,
            // agrupar ou PNG (chegam nos blocos seguintes o que fizer sentido).
            root.querySelector('.cx-board-tools').innerHTML =
                '<button type="button" data-act="onew" class="cx-board-ok" title="Nova pessoa, subordinada a quem estiver selecionado (sem seleção, ao topo)">Nova pessoa</button>'
                + '<button type="button" data-act="arrumar" title="Devolver todos os cartões ao arranjo automático">Arrumar</button>'
                + '<button type="button" data-act="omodelos" title="Começar de um modelo pronto (substitui o organograma)">Modelos</button>'
                + '<button type="button" data-act="oniveis" title="Nome, cor e ordem dos níveis deste organograma">Níveis</button>'
                + '<span class="cx-board-sep"></span>'
                + '<button type="button" data-act="undo" title="Desfazer (Ctrl+Z)">↶</button>'
                + '<button type="button" data-act="redo" title="Refazer (Ctrl+Y)">↷</button>'
                + '<span class="cx-board-sep"></span>'
                + '<button type="button" data-act="zout" title="Afastar">−</button><span class="cx-board-zoom">100%</span>'
                + '<button type="button" data-act="zin" title="Aproximar">+</button>'
                + '<button type="button" data-act="fit" title="Ajustar à tela">Ajustar</button>'
                + '<button type="button" data-act="find" title="Buscar pessoa ou cargo (Ctrl+F)">Buscar</button>'
                + '<button type="button" data-act="mm" class="is-on" aria-pressed="true" title="Mostrar ou esconder o minimapa">Mapa</button>'
                // Q6e: importar e exportar (o mesmo diálogo e menu do fluxograma).
                + '<span class="cx-board-sep"></span><button type="button" data-act="imp" title="Trazer um organograma de um arquivo (substitui o desenho; Ctrl+Z desfaz)">Importar</button>'
                + '<span class="cx-board-xw"><button type="button" data-act="exp" aria-haspopup="true" aria-expanded="false" title="Levar este organograma para um arquivo">Exportar <span class="cx-board-car" aria-hidden="true">▾</span></button>'
                + '<div class="cx-board-xm" role="menu" hidden>'
                + '<button type="button" role="menuitem" data-act="expjson"><b>Guardar uma cópia do organograma</b><span>Arquivo do Codex+ com tudo: níveis, cores, marcações, posições e a matriz. Serve de backup ou para levar o organograma a outro documento.</span></button>'
                + '<button type="button" role="menuitem" data-act="expmd"><b>Levar para uma IA</b><span>Arquivo que ChatGPT, Claude e Gemini entendem, com a matriz em tabela. Anexe na IA, peça os ajustes e importe a resposta de volta.</span></button>'
                + '</div></span>';
            ['[data-act="legend"]', '[data-act="png"]'].forEach(function (q) { var el = root.querySelector(q); if (el) { (el.closest('label') || el).remove(); } });
            root.querySelector('.cx-board-pal-top').style.display = 'none';
            root.querySelector('.cx-board-hint').textContent = 'Clique num cartão ou numa pessoa para editar no painel. Arraste um elemento da paleta ou um cartão: no centro de outro cartão entra na equipe dele; nas bordas, fica ao lado; no vazio, fica solto (a equipe vai junto). “Arrumar” devolve tudo ao arranjo automático. Arraste o fundo para mover a vista; roda do mouse dá zoom.';
        }

        var svg = root.querySelector('.cx-board-svg'), vp = root.querySelector('.vp');
        var paper = root.querySelector('.cx-board-paper'), bgImgEl = root.querySelector('.cx-board-bgimg');
        var gZones = root.querySelector('.cx-board-zones'), gItems = root.querySelector('.cx-board-items');
        var gLinks = root.querySelector('.cx-board-links'), gDucts = root.querySelector('.cx-board-ducts');
        var ductDraft = null;   // pontos da eletrocalha em desenho
        var gSel = root.querySelector('.cx-board-sel'), gGuides = root.querySelector('.cx-board-guides'), gFind = root.querySelector('.cx-board-find');
        (function () {
            var mm = root.querySelector('.cx-board-mm');
            mm.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); mmDrag = true; try { mm.setPointerCapture(e.pointerId); } catch (err) { /* sem captura */ } mmCenter(e); });
            mm.addEventListener('pointermove', function (e) { if (mmDrag) { mmCenter(e); } });
            mm.addEventListener('pointerup', function () { mmDrag = false; });
            mm.addEventListener('wheel', function (e) { e.stopPropagation(); }, { passive: true });
        })();
        var marq = root.querySelector('.cx-board-marq'), props = root.querySelector('.cx-board-props');

        /* ---------- paleta ---------- */
        var palShut = {}, laneDirPal = null;
        function paleta() {
            if (org) { orgPalette(); return; }
            if (flow) {
                // Q5b: só formas (os ícones de rede são da Planta e da Topologia).
                // Q5e: seções recolhíveis (clique no título). Q5j-2: ícones
                // genéricos em subgrupos e busca por nome (forma ou ícone);
                // buscando, todas as seções abrem e as vazias somem.
                var fq = norm(root.querySelector('.cx-board-q').value);
                var hit = function (txt) { return !fq || norm(txt).indexOf(fq) >= 0; };
                var btn = function (key) {
                    var k = key.split(':')[0], mk = key.split(':')[1] || '', name = PRESETS[key] || SHAPES[k].label;
                    var ck = SHAPES[k].color, small = ['conn', 'offpage', 'dataobj'].indexOf(k) >= 0 || SQUARE.indexOf(k) >= 0;
                    var demo = shapeFit({ id: 'p', t: 'shape', shape: k, x: 2, y: 2, sz: small ? 'm' : 'p', text: '', fill: ck, line: ck, ink: ck, mk: mk || 'none', ico: mk || ICO_DEFAULT });
                    if (k === 'ico') { name = icoName(mk || ICO_DEFAULT); }
                    return '<button type="button" class="cx-board-ic" data-shape="' + k + '"' + (mk ? ' data-mk="' + mk + '"' : '') + ' title="' + esc(name) + '">'
                        + '<svg viewBox="0 0 ' + (demo.w + 4) + ' ' + (demo.h + 4) + '" width="44" height="30">' + shapeSvg(demo, true) + '</svg><span>' + esc(name) + '</span></button>';
                };
                var html = SHAPE_GROUPS.map(function (gr) {
                    var shut = !fq && !!palShut[gr.k], body = '';
                    if (gr.k === 'lane') {
                        var ld = (lanesOf(D.items)[0] || {}).dir;
                        body = ['h', 'v'].filter(function (dk) { return hit(LANE_DIR[dk] + ' raias swimlane'); }).map(function (dk) {
                            var off = ld && ld !== dk, ic = dk === 'h'
                                ? '<rect x="2" y="2" width="40" height="26" rx="3" fill="#E6F1FB" stroke="#185FA5" stroke-width="1.2"/><path d="M12 2V28M2 10.7H42M2 19.3H42" stroke="#185FA5" stroke-width="1.2" fill="none"/>'
                                : '<rect x="2" y="2" width="40" height="26" rx="3" fill="#E6F1FB" stroke="#185FA5" stroke-width="1.2"/><path d="M2 9H42M15.3 2V28M28.7 2V28" stroke="#185FA5" stroke-width="1.2" fill="none"/>';
                            return '<button type="button" class="cx-board-ic" data-lane="' + dk + '"' + (off ? ' disabled title="Este fluxograma usa raias ' + (ld === 'h' ? 'horizontais' : 'verticais') + '"' : ' title="' + LANE_DIR[dk] + ' (clique para incluir)"') + '>'
                                + '<svg viewBox="0 0 44 30" width="44" height="30">' + ic + '</svg><span>' + LANE_DIR[dk] + '</span></button>';
                        }).join('');
                        body = body ? '<div class="cx-board-grid">' + body + '</div>' : '';
                    } else if (gr.k === 'ico') {
                        body = Lucide().CATS.map(function (c) {
                            var ks = c.items.filter(function (k) { return hit(icoName(k) + ' ' + k + ' ' + c.label); });
                            return ks.length ? '<div class="cx-board-cat cx-board-subcat">' + esc(c.label) + '</div><div class="cx-board-grid">' + ks.map(function (k) { return btn('ico:' + k); }).join('') + '</div>' : '';
                        }).join('');
                    } else {
                        var ks = gr.items.filter(function (key) { return hit(PRESETS[key] || SHAPES[key.split(':')[0]].label); });
                        body = ks.length ? '<div class="cx-board-grid">' + ks.map(btn).join('') + '</div>' : '';
                    }
                    if (fq && !body) { return ''; }
                    return '<button type="button" class="cx-board-cat cx-board-cat-t" data-grp="' + gr.k + '" aria-expanded="' + !shut + '">' + (shut ? '▸ ' : '▾ ') + esc(gr.label) + '</button>'
                        + (shut ? '' : body);
                }).join('');
                root.querySelector('.cx-board-icons').innerHTML = html || '<p class="cx-board-none">Nada encontrado.</p>';
                return;
            }
            var q = (root.querySelector('.cx-board-q').value || '').trim().toLowerCase();
            var h = '';
            Object.keys(I.CATS).forEach(function (ck) {
                var ls = I.LIST.filter(function (r) { return r[2] === ck && (!q || (r[1] + ' ' + r[3]).toLowerCase().indexOf(q) >= 0); });
                if (!ls.length) { return; }
                h += '<div class="cx-board-cat">' + esc(I.CATS[ck].label) + '</div><div class="cx-board-grid">';
                ls.forEach(function (r) {
                    h += '<button type="button" class="cx-board-ic" data-icon="' + r[0] + '" title="' + esc(r[1]) + '">'
                        + '<svg viewBox="0 0 48 48" width="34" height="34">' + I.body(r[0]) + '</svg><span>' + esc(r[1]) + '</span>'
                        + ((I.get(r[0]) || {}).custom ? '<i class="cx-board-own" title="Criado na instalação"></i>' : '') + '</button>';
                });
                h += '</div>';
            });
            root.querySelector('.cx-board-icons').innerHTML = (h || '<p class="cx-board-none">Nenhum ícone. Use o Equipamento genérico.</p>')
                + (LIB.canCreate && I.customs().length ? '<button type="button" class="cx-board-mgic">Gerenciar ícones criados (' + I.customs().length + ')</button>' : '');
        }
        root.querySelector('.cx-board-q').addEventListener('input', paleta);

        /* ---------- Q4a: novo ícone a partir de imagem (Super-Admin) ----------
           Recorte quadrado arrastável sobre a imagem; sai um PNG de 256 px
           (nada do arquivo original é guardado). Grava em ajax/icons.php. */
        var ni = null;   // janela aberta
        // Q4b-2: 256 px (antes 96, pixelava com zoom, ícone grande e PNG em 2x).
        var NI_BOX = 240, NI_OUT = 256, NI_MAX = 2 * 1024 * 1024;
        function niClose() { if (ni) { ni.el.remove(); ni = null; } }
        function niOpen() {
            if (ni) { return; }
            var cats = Object.keys(I.CATS).map(function (k) { return '<option value="' + k + '">' + esc(I.CATS[k].label) + '</option>'; }).join('');
            var el = document.createElement('div');
            el.className = 'cx-ni-back';
            el.innerHTML = '<div class="cx-ni" role="dialog" aria-label="Novo ícone">'
                + '<div class="cx-ni-main">'
                + '<label class="cx-ni-file"><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"> <span>Escolher imagem</span></label>'
                + '<div class="cx-ni-stage"><canvas width="' + NI_BOX + '" height="' + NI_BOX + '"></canvas><div class="cx-ni-crop" hidden></div></div>'
                + '<label class="cx-board-f"><span>Tamanho do recorte</span><input type="range" min="10" max="100" step="1" value="100" data-ni="size"></label>'
                + '<p class="cx-board-none">Arraste o quadrado para escolher a parte da imagem. PNG, JPG, WebP ou SVG, até 2 MB.</p>'
                + '<label class="cx-board-chk"><input type="checkbox" data-ni="bg" checked> Tirar o fundo <span class="cx-ni-muted">(cor dos cantos)</span></label>'
                + '<label class="cx-board-f cx-ni-tol"><span>Tolerância</span><input type="range" min="0" max="100" step="1" value="30" data-ni="tol"></label>'
                + '<div class="cx-ni-mode" role="group" aria-label="Cor do ícone">'
                + '<button type="button" data-ni-mode="color" class="is-on">Cor original</button>'
                + '<button type="button" data-ni-mode="mask">Silhueta na cor da categoria</button></div>'
                + '</div><div class="cx-ni-side">'
                + '<p class="cx-ni-title">Novo ícone</p>'
                + '<label class="cx-board-f"><span>Nome</span><input type="text" maxlength="60" data-ni="name" placeholder="Guarita"></label>'
                + '<label class="cx-board-f"><span>Categoria (cor)</span><select data-ni="cat">' + cats + '</select></label>'
                + '<label class="cx-board-f"><span>Busca (palavras)</span><input type="text" maxlength="200" data-ni="search" placeholder="portaria cabine vigia"></label>'
                + '<p class="cx-board-sub">Prévia</p><div class="cx-ni-prev"><img alt="" width="48" height="48"><img alt="" width="32" height="32"><img alt="" width="22" height="22"></div>'
                + '<p class="cx-ni-err" hidden></p>'
                + '<div class="cx-ni-btns"><button type="button" data-ni="cancel">Cancelar</button><button type="button" data-ni="save" class="cx-board-ok">Salvar ícone</button></div>'
                + '</div></div>';
            root.appendChild(el);
            ni = { el: el, img: null, s: 1, ox: 0, oy: 0, iw: 0, ih: 0, cx: 0, cy: 0, cs: 0, out: '', mode: 'color' };
            var cv = el.querySelector('canvas'), crop = el.querySelector('.cx-ni-crop');
            var q = function (k) { return el.querySelector('[data-ni="' + k + '"]'); };
            var err = el.querySelector('.cx-ni-err');
            var fail = function (t) { err.textContent = t; err.hidden = !t; };
            var draw = function () {
                var g = cv.getContext && cv.getContext('2d');
                if (!g || !ni.img) { return; }
                g.clearRect(0, 0, NI_BOX, NI_BOX);
                g.drawImage(ni.img, ni.ox, ni.oy, ni.iw * ni.s, ni.ih * ni.s);
                crop.hidden = false;
                crop.style.left = ni.cx + 'px'; crop.style.top = ni.cy + 'px';
                crop.style.width = ni.cs + 'px'; crop.style.height = ni.cs + 'px';
                var o = document.createElement('canvas');
                o.width = NI_OUT; o.height = NI_OUT;
                var og = o.getContext && o.getContext('2d');
                if (!og) { return; }
                og.imageSmoothingEnabled = true;
                og.imageSmoothingQuality = 'high';
                og.drawImage(ni.img, (ni.cx - ni.ox) / ni.s, (ni.cy - ni.oy) / ni.s, ni.cs / ni.s, ni.cs / ni.s, 0, 0, NI_OUT, NI_OUT);
                // Q4b: fundo e silhueta, sobre os pixels do recorte.
                if (typeof og.getImageData === 'function' && (q('bg').checked || ni.mode === 'mask')) {
                    var px = og.getImageData(0, 0, NI_OUT, NI_OUT);
                    if (q('bg').checked) { removeBg(px.data, NI_OUT, NI_OUT, +q('tol').value); }
                    if (ni.mode === 'mask') { tint(px.data, (I.CATS[q('cat').value] || I.CATS.infra).S); }
                    og.putImageData(px, 0, 0);
                }
                ni.out = o.toDataURL('image/png');
                el.querySelectorAll('.cx-ni-prev img').forEach(function (im) { im.src = ni.out; });
            };
            // Mantém o quadrado dentro da imagem desenhada.
            var fitCrop = function () {
                var dw = ni.iw * ni.s, dh = ni.ih * ni.s, full = Math.min(dw, dh);
                ni.cs = Math.max(8, full * (+q('size').value || 100) / 100);
                ni.cx = Math.min(Math.max(ni.cx, ni.ox), ni.ox + dw - ni.cs);
                ni.cy = Math.min(Math.max(ni.cy, ni.oy), ni.oy + dh - ni.cs);
            };
            el.querySelector('input[type=file]').addEventListener('change', function (e) {
                var f = e.target.files && e.target.files[0];
                fail('');
                if (!f) { return; }
                if (f.size > NI_MAX) { fail('Arquivo maior que 2 MB.'); return; }
                if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type)) { fail('Use PNG, JPG, WebP ou SVG.'); return; }
                var rd = new FileReader();
                rd.onload = function () {
                    var im = new Image();
                    im.onload = function () {
                        // SVG sem tamanho próprio: desenha no tamanho da caixa.
                        var w = im.naturalWidth || NI_BOX, h = im.naturalHeight || NI_BOX;
                        ni.img = im; ni.iw = w; ni.ih = h;
                        ni.s = Math.min(NI_BOX / w, NI_BOX / h);
                        ni.ox = (NI_BOX - w * ni.s) / 2; ni.oy = (NI_BOX - h * ni.s) / 2;
                        q('size').value = 100; ni.cx = 0; ni.cy = 0;
                        fitCrop();
                        ni.cx = ni.ox + (w * ni.s - ni.cs) / 2; ni.cy = ni.oy + (h * ni.s - ni.cs) / 2;
                        draw();
                        if (!q('name').value) { q('name').value = f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').slice(0, 60); }
                    };
                    im.onerror = function () { fail('Não foi possível abrir essa imagem.'); };
                    im.src = rd.result;
                };
                rd.readAsDataURL(f);
            });
            q('size').addEventListener('input', function () {
                if (!ni.img) { return; }
                var mx = ni.cx + ni.cs / 2, my = ni.cy + ni.cs / 2;   // redimensiona pelo centro
                fitCrop(); ni.cx = mx - ni.cs / 2; ni.cy = my - ni.cs / 2; fitCrop(); draw();
            });
            crop.addEventListener('pointerdown', function (e) {
                e.preventDefault();
                var sx = e.clientX, sy = e.clientY, bx = ni.cx, by = ni.cy;
                var mv = function (ev) { ni.cx = bx + ev.clientX - sx; ni.cy = by + ev.clientY - sy; fitCrop(); draw(); };
                var up = function () { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); };
                document.addEventListener('pointermove', mv);
                document.addEventListener('pointerup', up);
            });
            q('bg').addEventListener('change', function () { el.querySelector('.cx-ni-tol').hidden = !q('bg').checked; draw(); });
            q('tol').addEventListener('input', draw);
            q('cat').addEventListener('change', function () { if (ni.mode === 'mask') { draw(); } });
            el.querySelectorAll('[data-ni-mode]').forEach(function (b) {
                b.addEventListener('click', function () {
                    ni.mode = b.getAttribute('data-ni-mode');
                    el.querySelectorAll('[data-ni-mode]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
                    draw();
                });
            });
            q('cancel').addEventListener('click', niClose);
            q('save').addEventListener('click', function () {
                var name = q('name').value.trim();
                if (!ni.out) { fail('Escolha uma imagem.'); return; }
                if (!name) { fail('Informe o nome do ícone.'); q('name').focus(); return; }
                fail('');
                var tk = document.querySelector('[name="_glpi_csrf_token"]');
                var fd = new FormData();
                fd.append('action', 'add'); fd.append('name', name); fd.append('cat', q('cat').value);
                fd.append('search', q('search').value.trim()); fd.append('mode', ni.mode); fd.append('image', ni.out);
                if (tk) { fd.append('_glpi_csrf_token', tk.value); }
                var btn = q('save'); btn.disabled = true; btn.textContent = 'Salvando…';
                fetch(BASE + '/ajax/icons.php', { method: 'POST', body: fd, credentials: 'same-origin' })
                    .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
                    .then(function (res) {
                        // O token é consumido a cada POST: o novo vai para todos os formulários.
                        if (res.j.csrf) { document.querySelectorAll('[name="_glpi_csrf_token"]').forEach(function (i) { i.value = res.j.csrf; }); }
                        if (!res.ok || !res.j.icon) { throw new Error(res.j.erro || 'Não foi possível gravar o ícone.'); }
                        I.addCustom([res.j.icon]);
                        paleta();
                        niClose();
                        notify(editor, 'Ícone "' + res.j.icon.name + '" criado: já está na paleta.', 'success');
                    })
                    .catch(function (e2) {
                        btn.disabled = false; btn.textContent = 'Salvar ícone';
                        fail(e2 && e2.message && !/fetch|network/i.test(e2.message) ? e2.message : 'Não foi possível gravar o ícone.');
                    });
            });
        }
        var niBtn = root.querySelector('.cx-board-newic');
        if (niBtn) { niBtn.addEventListener('click', niOpen); }

        /* ---------- Q4c: gerenciar ícones criados (Super-Admin) ----------
           Lista com editar (nome, categoria, busca; a silhueta é repintada
           na cor nova) e excluir. Excluir tira da paleta; quadros que usam
           o ícone guardam uma cópia e continuam iguais. Mesma janela (ni). */
        function post(fields) {
            var tk = document.querySelector('[name="_glpi_csrf_token"]'), fd = new FormData();
            Object.keys(fields).forEach(function (k) { fd.append(k, fields[k]); });
            if (tk) { fd.append('_glpi_csrf_token', tk.value); }
            return fetch(BASE + '/ajax/icons.php', { method: 'POST', body: fd, credentials: 'same-origin' })
                .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
                .then(function (res) {
                    if (res.j.csrf) { document.querySelectorAll('[name="_glpi_csrf_token"]').forEach(function (i) { i.value = res.j.csrf; }); }
                    if (!res.ok || res.j.erro) { throw new Error(res.j.erro || 'Não foi possível gravar.'); }
                    return res.j;
                });
        }
        // Silhueta: repinta o PNG gravado na cor da categoria nova.
        function recolor(img, hex) {
            return new Promise(function (ok, fail) {
                var im = new Image();
                im.onload = function () {
                    var c = document.createElement('canvas'), w = im.naturalWidth || NI_OUT, h = im.naturalHeight || NI_OUT;
                    c.width = w; c.height = h;
                    var g = c.getContext && c.getContext('2d');
                    if (!g || typeof g.getImageData !== 'function') { ok(''); return; }
                    g.drawImage(im, 0, 0, w, h);
                    var px = g.getImageData(0, 0, w, h);
                    tint(px.data, hex);
                    g.putImageData(px, 0, 0);
                    ok(c.toDataURL('image/png'));
                };
                im.onerror = function () { fail(new Error('img')); };
                im.src = img;
            });
        }
        function mgOpen() {
            if (ni) { return; }
            var el = document.createElement('div');
            el.className = 'cx-ni-back';
            el.innerHTML = '<div class="cx-ni cx-mg" role="dialog" aria-label="Ícones criados">'
                + '<div class="cx-mg-head"><p class="cx-ni-title">Ícones criados na instalação</p>'
                + '<p class="cx-board-none">Excluir tira da paleta. Quadros que já usam o ícone continuam com ele.</p></div>'
                + '<div class="cx-mg-list"></div><p class="cx-ni-err" hidden></p>'
                + '<div class="cx-ni-btns"><button type="button" data-mg="close">Fechar</button></div></div>';
            root.appendChild(el);
            ni = { el: el, mg: true };
            var list = el.querySelector('.cx-mg-list'), err = el.querySelector('.cx-ni-err');
            var fail = function (t) { err.textContent = t || ''; err.hidden = !t; };
            var cats = function (v) { return Object.keys(I.CATS).map(function (k) { return '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + esc(I.CATS[k].label) + '</option>'; }).join(''); };
            var draw = function (editing) {
                var all = I.customs().slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'pt-BR'); });
                list.innerHTML = all.length ? all.map(function (ic) {
                    var th = '<img src="' + ic.img + '" alt="" width="32" height="32">';
                    if (editing === ic.id) {
                        return '<div class="cx-mg-row is-edit" data-key="' + ic.id + '">' + th
                            + '<input type="text" maxlength="60" data-mg="name" value="' + esc(ic.name) + '" aria-label="Nome">'
                            + '<select data-mg="cat" aria-label="Categoria">' + cats(ic.cat) + '</select>'
                            + '<input type="text" maxlength="200" data-mg="search" value="' + esc(ic.search) + '" placeholder="busca" aria-label="Busca">'
                            + '<span class="cx-mg-act"><button type="button" data-mg="save">Salvar</button><button type="button" data-mg="back">Voltar</button></span></div>';
                    }
                    return '<div class="cx-mg-row" data-key="' + ic.id + '">' + th
                        + '<span class="cx-mg-name">' + esc(ic.name) + (ic.mode === 'mask' ? ' <em>· silhueta</em>' : '') + '</span>'
                        + '<span class="cx-mg-cat">' + esc((I.CATS[ic.cat] || {}).label || ic.cat) + '</span>'
                        + '<span class="cx-mg-by">' + esc(ic.author || '') + '</span>'
                        + '<span class="cx-mg-act"><button type="button" data-mg="edit">Editar</button><button type="button" data-mg="del" class="is-danger">Excluir</button></span></div>';
                }).join('') : '<p class="cx-board-none">Nenhum ícone criado.</p>';
            };
            draw('');
            el.addEventListener('click', function (e) {
                var b = e.target.closest('[data-mg]');
                if (!b) { return; }
                var a = b.getAttribute('data-mg'), row = b.closest('.cx-mg-row'), key = row ? row.getAttribute('data-key') : '';
                var ic = key ? I.get(key) : null, id = key.replace(/^u/, '');
                if (a === 'close') { niClose(); paleta(); return; }
                if (a === 'edit') { fail(''); draw(key); var nm = list.querySelector('[data-mg="name"]'); if (nm) { nm.focus(); } return; }
                if (a === 'back') { fail(''); draw(''); return; }
                if (a === 'del') {
                    var usado = D.items.some(function (i) { return i.t === 'icon' && i.icon === key; });
                    if (!window.confirm('Excluir o ícone "' + ic.name + '" da paleta?' + (usado ? ' Este quadro usa o ícone: ele continua aqui (e nos outros quadros que já o usam).' : ''))) { return; }
                    b.disabled = true; fail('');
                    post({ action: 'delete', id: id }).then(function () {
                        I.removeCustom(key); draw(''); paleta();
                    }).catch(function (e2) { b.disabled = false; fail(e2.message); });
                    return;
                }
                if (a === 'save') {
                    var name = row.querySelector('[data-mg="name"]').value.trim(), cat = row.querySelector('[data-mg="cat"]').value;
                    if (!name) { fail('Informe o nome do ícone.'); return; }
                    b.disabled = true; fail('');
                    var img = (ic.mode === 'mask' && cat !== ic.cat) ? recolor(ic.img, (I.CATS[cat] || I.CATS.infra).S) : Promise.resolve('');
                    img.then(function (novo) {
                        return post({ action: 'update', id: id, name: name, cat: cat, search: row.querySelector('[data-mg="search"]').value.trim(), image: novo || '' });
                    }).then(function (j) {
                        I.addCustom([j.icon]); draw(''); paleta(); render();
                    }).catch(function (e2) { b.disabled = false; fail(e2.message); });
                }
            });
        }
        root.querySelector('.cx-board-icons').addEventListener('click', function (e) {
            if (e.target.closest('.cx-board-mgic')) { mgOpen(); }
        });

        /* ---------- histórico ---------- */
        function snap() { hist.push(JSON.stringify(D)); if (hist.length > 80) { hist.shift(); } redo = []; }
        function undo() { if (!hist.length) { return; } redo.push(JSON.stringify(D)); D = JSON.parse(hist.pop()); sel = sel.filter(byId); render(); }
        function redoIt() { if (!redo.length) { return; } hist.push(JSON.stringify(D)); D = JSON.parse(redo.pop()); sel = sel.filter(byId); render(); }
        function byId(id) { return D.items.some(function (i) { return i.id === id; }); }
        function get(id) { for (var i = 0; i < D.items.length; i++) { if (D.items[i].id === id) { return D.items[i]; } } return null; }

        /* ---------- Q6b-1: organograma (Claudio, 03/10/2026) ----------
           D.org é a verdade (o JSON gravado de sempre). A cada desenho, o
           arranjo roda de novo e D.items vira a lista de caixas: o cartão
           (t: 'org') e cada pessoa listada nele (t: 'orow'). Seleção, busca,
           minimapa e ajuste usam essas caixas como os outros itens. */
        var ORG_PAD = 40, oparts = null, oOrigin = null;
        function orgSync() {
            oparts = OD().parts(D.org);
            var o = oparts.L.origin;
            // Se o arranjo cresceu para a esquerda/cima, tudo anda junto: a
            // vista compensa para nada pular na tela.
            if (oOrigin && (o.x !== oOrigin.x || o.y !== oOrigin.y)) {
                view.x -= (o.x - oOrigin.x) * view.z; view.y -= (o.y - oOrigin.y) * view.z;
                vp.setAttribute('transform', 'translate(' + view.x + ' ' + view.y + ') scale(' + view.z + ')');
            }
            oOrigin = { x: o.x, y: o.y };
            D.items = oparts.boxes.map(function (b) {
                return { id: b.id, t: b.t === 'card' ? 'org' : 'orow', card: b.card || '', x: b.x + ORG_PAD, y: b.y + ORG_PAD, w: b.w, h: b.h, color: b.color || '' };
            });
            D.w = Math.ceil(oparts.L.w + 2 * ORG_PAD); D.h = Math.ceil(oparts.L.h + 2 * ORG_PAD);
        }
        function orgNode(id) { var ns = D.org.nodes; for (var i = 0; i < ns.length; i++) { if (ns[i].id === id) { return ns[i]; } } return null; }
        // Q6f-2: sem trava no zero durante a edição (dá para ir para a
        // esquerda e para cima); orgNormPos() devolve tudo para >= 0 depois.
        function orgGrid(v) { return Math.round(v / GRID) * GRID; }
        /* Q6f-2 (Claudio, 03/10/2026): o servidor só grava posição >= 0.
           Na edição, a posição pode ficar negativa (cartão levado para a
           esquerda ou para cima da borda): o desenho compensa pela origem,
           inclusive no desfazer. Ao gravar, o organograma inteiro anda até a
           mais negativa virar 0; o topo ancorado é fixado onde está antes,
           para andar junto com os soltos. */
        function orgNormPos() {
            var mx = 0, my = 0;
            D.org.nodes.forEach(function (n) { if (typeof n.x === 'number') { mx = Math.min(mx, n.x); my = Math.min(my, n.y); } });
            if (mx >= 0 && my >= 0) { return false; }
            var T = OD().tree(D.org);
            D.org.nodes.forEach(function (n) {
                if (T.parentOf[n.id] || typeof n.x === 'number') { return; }
                var it = get(n.id); if (it && it.t === 'org') { n.x = Math.round(it.x - ORG_PAD - oOrigin.x); n.y = Math.round(it.y - ORG_PAD - oOrigin.y); }
            });
            D.org.nodes.forEach(function (n) { if (typeof n.x === 'number') { n.x = Math.round(n.x - mx); n.y = Math.round(n.y - my); } });
            return true;
        }
        /* Q6b-3 (Claudio, 03/10/2026): os elementos da paleta, como no motor
           antigo. Arrastar para o quadro: em cima de um cartão, entra na
           equipe dele (centro), antes ou depois dele entre os colegas
           (bordas); no vazio, fica solto. Clique: entra embaixo de quem
           estiver selecionado (ou do topo). */
        var ORG_PAL = [
            { kind: 'cargo', label: 'Cargo', icon: 'ti-user' },
            { kind: 'area', label: 'Área ou equipe', icon: 'ti-users-group' },
            { kind: 'vaga', label: 'Vaga em aberto', icon: 'ti-user-question', dashed: true },
            { kind: 'assessoria', label: 'Assessoria', icon: 'ti-user-star' },
            { kind: 'terceiro', label: 'Terceiro ou consultor', icon: 'ti-user-share', dashed: true }
        ];
        function orgPalette() {
            var c = {}, vagas = 0, total = 0;
            D.org.nodes.forEach(function (n) {
                if (n.group) { return; }
                if (!n.name.trim()) { vagas++; return; }
                c[n.lvl] = (c[n.lvl] || 0) + 1; total++;
            });
            var row = function (sw, txt, num) {
                return '<div class="cx-board-olv" style="display:flex;align-items:center;gap:8px;padding:4px 12px;font-size:12.5px">' + sw + '<span>' + esc(txt) + '</span><b style="margin-left:auto">' + num + '</b></div>';
            };
            var chip = function (key, label, icon, dashed, color, del) {
                return '<div style="display:flex;align-items:center;margin:0 8px 6px">'
                    + '<button type="button" data-onew="' + esc(key) + '" title="Arraste para o quadro (centro do cartão: entra na equipe; bordas: ao lado; vazio: solto). Clique: entra embaixo de quem estiver selecionado."'
                    + ' style="flex:1;display:flex;align-items:center;gap:8px;text-align:left;padding:5px 8px;border:1px ' + (dashed ? 'dashed' : 'solid') + ' var(--cx-border);border-left:4px solid ' + (color || '#3e6aa8') + ';border-radius:6px;background:#fff;cursor:grab;font:inherit;font-size:12.5px;color:var(--cx-text)">'
                    + '<i class="ti ' + icon + '" aria-hidden="true"></i><span>' + esc(label) + '</span></button>'
                    + (del ? '<button type="button" class="cx-board-btn" data-oeldel="' + esc(del) + '" title="Excluir este elemento da paleta (quem já está no quadro continua)" style="margin-left:4px;padding:2px 7px">×</button>' : '')
                    + '</div>';
            };
            var lvColor = function (k) { var x = ''; D.org.levels.forEach(function (l) { if (l.key === k) { x = l.color; } }); return x; };
            root.querySelector('.cx-board-icons').innerHTML = '<div class="cx-board-cat">Elementos</div>'
                + ORG_PAL.map(function (e) { return chip(e.kind, e.label, e.icon, e.dashed, '', ''); }).join('')
                + (D.org.elements || []).map(function (e) { return chip('el:' + e.id, e.label, e.base === 'equipe' ? 'ti-users-group' : 'ti-user', e.dashed, lvColor(e.lvl), e.id); }).join('')
                + '<div style="margin:0 8px 10px"><button type="button" class="cx-board-btn" data-oelnew style="width:100%;border-style:dashed;color:var(--cx-accent)">+ Criar elemento</button></div>'
                + '<div class="cx-board-cat">Níveis</div>'
                + D.org.levels.map(function (l) { return row('<i style="width:18px;height:6px;border-radius:2px;display:inline-block;background:' + esc(l.color) + '"></i>', l.label, c[l.key] || 0); }).join('')
                + row('<i style="width:18px;height:8px;border:1px dashed #888;border-radius:2px;display:inline-block;box-sizing:border-box"></i>', 'Vagas em aberto', vagas)
                + row('<i style="width:18px;display:inline-block"></i>', 'Pessoas nomeadas', total)
                + '<div style="margin:6px 8px 10px"><button type="button" class="cx-board-btn" data-act="oniveis" style="width:100%">Editar níveis</button></div>';
        }
        /* Q6b-2 (Claudio, 03/10/2026): edição pelo painel, com as regras do
           motor antigo — nova pessoa entra no nível seguinte ao do chefe;
           trocar o chefe leva a equipe junto (e não aceita alguém da própria
           equipe como chefe); excluir pede confirmação e sobe os subordinados
           para o chefe de quem saiu; o último elemento não sai. */
        var oDelArm = null;
        function orgLevels() { return D.org.levels; }
        function orgNextLevel(k) {
            var ks = orgLevels().map(function (l) { return l.key; }), i = ks.indexOf(k);
            return ks[Math.min(i + 1, ks.length - 1)] || ks[0];
        }
        function orgNewId() {
            var m = 0, ids = {};
            D.org.nodes.forEach(function (n) { ids[n.id] = 1; var r = /^n(\d+)$/.exec(n.id); if (r) { m = Math.max(m, +r[1]); } });
            var id = 'n' + (m + 1); while (ids[id]) { id = 'n' + (++m + 1); }
            return id;
        }
        function orgEdgeId() { return 'e' + Date.now().toString(36) + D.org.edges.length; }
        function orgBossOf(id) { return OD().tree(D.org).parentOf[id] || ''; }
        function orgTeam(id) {
            var T = OD().tree(D.org), out = {};
            (function go(x) { (T.kids[x] || []).forEach(function (k) { if (!out[k.id]) { out[k.id] = 1; go(k.id); } }); })(id);
            return out;
        }
        function orgAdd(pid) {
            var p = pid && orgNode(pid), ks = orgLevels().map(function (l) { return l.key; });
            snap();
            var n = { id: orgNewId(), name: '', role: '', lvl: p ? orgNextLevel(p.lvl) : ks[ks.length - 1], note: '', pend: false, group: false };
            D.org.nodes.push(n);
            if (p) { D.org.edges.push({ id: orgEdgeId(), from: p.id, to: n.id, boss: true, style: 'solida', label: '' }); }
            sel = [n.id]; oDelArm = null; render();
            var f = props.querySelector('[data-of="name"]'); if (f) { f.focus(); }
        }
        // Troca o chefe: tira a chefia atual e liga ao novo (a equipe vem
        // junto, porque é a árvore que decide quem está embaixo de quem).
        // Reporte que já existia entre os dois sai, para não duplicar o par.
        function orgSetBoss(id, pid) {
            if (pid && (pid === id || orgTeam(id)[pid])) { return; }
            snap();
            D.org.edges = D.org.edges.filter(function (e) {
                if (e.to === id && e.boss) { return false; }
                if (pid && ((e.from === pid && e.to === id) || (e.from === id && e.to === pid))) { return false; }
                return true;
            });
            if (pid) { D.org.edges.push({ id: orgEdgeId(), from: pid, to: id, boss: true, style: 'solida', label: '' }); }
            render();
        }
        function orgRemove(id) {
            if (D.org.nodes.length < 2 || !orgNode(id)) { return; }
            snap();
            var pid = orgBossOf(id), out = [], done = false;
            D.org.edges.forEach(function (e) {
                if (pid && e.to === id && e.from === pid && e.boss && !done) {
                    D.org.edges.forEach(function (k) {
                        if (k.from === id) { out.push({ id: k.id, from: pid, to: k.to, boss: k.boss, style: k.style, label: k.label }); }
                    });
                    done = true; return;
                }
                if (e.from === id || e.to === id) { return; }
                out.push(e);
            });
            // Sem chefe (topo ou bloco solto): os subordinados viram blocos.
            D.org.edges = out;
            D.org.nodes = D.org.nodes.filter(function (n) { return n.id !== id; });
            sel = []; oDelArm = null; render();
        }
        function orgAddRep(id, other) {
            if (!other || other === id || !orgNode(other)) { return; }
            var tem = D.org.edges.some(function (e) { return (e.from === other && e.to === id) || (e.from === id && e.to === other); });
            if (tem) { return; }
            snap();
            D.org.edges.push({ id: orgEdgeId(), from: other, to: id, boss: false, style: 'tracejada', label: '' });
            render();
        }
        function orgDelRep(eid) {
            if (!D.org.edges.some(function (e) { return e.id === eid && !e.boss; })) { return; }
            snap();
            D.org.edges = D.org.edges.filter(function (e) { return e.id !== eid; });
            render();
        }
        // Enquanto digita, redesenha o quadro sem refazer o painel (o campo
        // perde o foco se o painel for refeito).
        function orgRefresh() { orgSync(); paint(); drawSel(); orgPalette(); }
        function orgProps() {
            var n = sel.length === 1 && orgNode(sel[0]);
            if (!n) {
                props.innerHTML = '<p class="cx-board-none">Clique num cartão ou numa pessoa para editar. “Nova pessoa”, na barra, cria alguém subordinado a quem estiver selecionado.</p>'
                    + '<p class="cx-board-none">Atalhos: Ctrl+Z desfaz · Ctrl+Y refaz · Ctrl+F busca · Delete exclui (pede confirmação) · Esc limpa a seleção.</p>';
                return;
            }
            var T = OD().tree(D.org), pid = T.parentOf[n.id] || '', team = orgTeam(n.id), label = OD().label;
            var opt = function (v, t, on) { return '<option value="' + esc(v) + '"' + (on ? ' selected' : '') + '>' + t + '</option>'; };
            var lvls = orgLevels().map(function (l) { return opt(l.key, esc(l.label), l.key === n.lvl); }).join('');
            // Chefe: todos na ordem da árvore, recuados, menos ele mesmo e a
            // própria equipe.
            var boss = opt('', pid ? 'Ninguém (bloco independente)' : 'Ninguém (topo)', !pid), vistos = {};
            var walkT = function (x, d) {
                if (vistos[x.id]) { return; } vistos[x.id] = 1;
                if (x.id !== n.id && !team[x.id]) {
                    boss += opt(x.id, '\u00A0\u00A0'.repeat(d) + esc(label(x) + (x.role && x.name.trim() ? ' — ' + x.role : '')), x.id === pid);
                }
                (T.kids[x.id] || []).forEach(function (k) { walkT(k, d + 1); });
            };
            D.org.nodes.forEach(function (x) { if (!T.parentOf[x.id]) { walkT(x, 0); } });
            var reps = D.org.edges.filter(function (e) { return !e.boss && (e.from === n.id || e.to === n.id); });
            var repIds = {}; reps.forEach(function (e) { repIds[e.from === n.id ? e.to : e.from] = 1; });
            var repList = reps.map(function (e) {
                var o = orgNode(e.from === n.id ? e.to : e.from); if (!o) { return ''; }
                return '<span style="display:inline-flex;align-items:center;gap:4px;border:1px solid var(--cx-border);border-radius:12px;padding:1px 4px 1px 9px;margin:0 4px 4px 0;font-size:12px">'
                    + esc(label(o)) + '<button type="button" class="cx-board-btn" data-orep-del="' + esc(e.id) + '" title="Tirar este reporte" style="border:0;padding:0 5px;line-height:1.2">×</button></span>';
            }).join('');
            var repAdd = opt('', '+ Acrescentar reporte…', true);
            D.org.nodes.forEach(function (x) {
                if (x.id === n.id || repIds[x.id] || x.id === pid) { return; }
                repAdd += opt(x.id, esc(label(x) + (x.role && x.name.trim() ? ' — ' + x.role : '')), false);
            });
            var chk = function (k, t) { return '<label class="cx-board-chk"><input type="checkbox" data-of="' + k + '"' + (n[k] ? ' checked' : '') + '> ' + t + '</label>'; };
            var free = typeof n.x === 'number', it = get(n.id), armed = oDelArm === n.id, ultimo = D.org.nodes.length < 2;
            props.innerHTML = '<p><strong>' + (n.group ? 'Área ou equipe' : !n.name.trim() ? 'Vaga em aberto' : 'Pessoa') + '</strong></p>'
                + '<label class="cx-board-f"><span>' + (n.group ? 'Nome da área ou equipe' : 'Nome (vazio = vaga em aberto)') + '</span><input type="text" maxlength="120" style="box-sizing:border-box" data-of="name" value="' + esc(n.name) + '" autocomplete="off"></label>'
                + '<label class="cx-board-f"><span>Cargo ou função</span><input type="text" maxlength="160" style="box-sizing:border-box" data-of="role" value="' + esc(n.role) + '" autocomplete="off"></label>'
                + '<label class="cx-board-f"><span>Nível</span><select data-of="lvl">' + lvls + '</select></label>'
                + '<label class="cx-board-f"><span>Responde a (chefia)</span><select data-of="boss">' + boss + '</select></label>'
                + '<div class="cx-board-f"><span>Também reporta a (linha tracejada)</span>' + (repList ? '<div>' + repList + '</div>' : '')
                + '<select data-of="rep">' + repAdd + '</select></div>'
                + '<label class="cx-board-f"><span>Observação</span><textarea rows="2" maxlength="500" style="box-sizing:border-box;resize:vertical" data-of="note" placeholder="Turno, cliente, especialidade…">' + esc(n.note) + '</textarea></label>'
                + chk('pend', 'A confirmar') + chk('group', 'É uma área ou equipe, não uma pessoa') + chk('dashed', 'Borda tracejada (externo ou temporário)')
                + '<p style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 6px">'
                + '<button type="button" class="cx-board-btn cx-board-ok" data-oa="sub">Adicionar subordinado</button>'
                + (free ? '<button type="button" class="cx-board-btn" data-oa="back">Devolver ao arranjo</button>' : '')
                + '<button type="button" class="cx-board-btn" data-oa="del"' + (ultimo ? ' disabled title="O organograma não pode ficar vazio."' : '')
                + ' style="color:' + (armed ? '#fff;background:#b3261e;border-color:#b3261e' : '#b3261e;border-color:#e3b4b0') + '">' + (armed ? 'Confirmar exclusão' : 'Excluir') + '</button></p>'
                + '<p class="cx-board-none" style="margin:4px 0">' + (armed ? 'Clique de novo para excluir. ' : '') + 'Ao excluir, os subordinados passam a responder ao chefe de quem saiu.</p>'
                + '<p class="cx-board-none" style="margin:4px 0">Equipe direta: ' + (T.kids[n.id] || []).length + ' · '
                + (free ? 'solto: fica onde foi largado.' : it && it.t === 'orow' ? 'na lista do cartão do chefe.' : 'no arranjo automático.') + '</p>';
        }
        props.addEventListener('click', function (e) {
            if (!org) { return; }
            var n = sel.length === 1 && orgNode(sel[0]);
            var rd = e.target.closest('[data-orep-del]');
            if (rd) { orgDelRep(rd.getAttribute('data-orep-del')); return; }
            var b = e.target.closest('[data-oa]');
            if (!b || !n || b.disabled) { return; }
            var a = b.getAttribute('data-oa');
            if (a === 'back') { snap(); delete n.x; delete n.y; render(); }
            else if (a === 'sub') { orgAdd(n.id); }
            else if (a === 'del') {
                if (oDelArm !== n.id) { oDelArm = n.id; orgProps(); var bb = props.querySelector('[data-oa="del"]'); if (bb) { bb.focus(); } return; }
                orgRemove(n.id);
            }
        });
        props.addEventListener('input', function (e) {
            var k = org && e.target.getAttribute('data-of'), n = org && sel.length === 1 && orgNode(sel[0]);
            if (!k || !n || ['name', 'role', 'note'].indexOf(k) < 0) { return; }
            if (!props.__snap) { snap(); props.__snap = true; }
            n[k] = String(e.target.value).slice(0, k === 'name' ? 120 : k === 'role' ? 160 : 500);
            var t = props.querySelector('p strong'); if (t && k === 'name' && !n.group) { t.textContent = n.name.trim() ? 'Pessoa' : 'Vaga em aberto'; }
            orgRefresh();
        });
        props.addEventListener('change', function (e) {
            var k = org && e.target.getAttribute('data-of'), n = org && sel.length === 1 && orgNode(sel[0]);
            if (!k || !n) { return; }
            if (k === 'lvl') { if (n.lvl !== e.target.value) { snap(); n.lvl = e.target.value; render(); } }
            else if (k === 'boss') { orgSetBoss(n.id, e.target.value); }
            else if (k === 'rep') { orgAddRep(n.id, e.target.value); }
            else if (['pend', 'group', 'dashed'].indexOf(k) >= 0) {
                snap();
                if (e.target.checked) { n[k] = true; } else if (k === 'dashed') { delete n.dashed; } else { n[k] = false; }
                render();
            }
        });
        /* ---------- Q6b-3: colocar, mover para outra equipe, diálogos ---------- */
        function orgNewNode(kind, lvl) {
            var n = { id: orgNewId(), name: '', role: '', lvl: lvl, note: '', pend: false, group: false };
            if (kind.indexOf('el:') === 0) {
                var el = (D.org.elements || []).filter(function (x) { return 'el:' + x.id === kind; })[0];
                if (!el) { return n; }
                if (el.lvl && D.org.levels.some(function (l) { return l.key === el.lvl; })) { n.lvl = el.lvl; }
                if (el.base === 'equipe') { n.name = el.label; n.group = true; } else { n.role = el.label; }
                if (el.dashed) { n.dashed = true; }
                n.kind = kind;
                return n;
            }
            if (kind === 'area') { n.name = 'Nova área'; n.group = true; }
            if (kind === 'vaga') { n.kind = 'vaga'; n.note = 'Vaga em aberto'; }
            if (kind === 'assessoria') { n.kind = 'assessoria'; n.role = 'Assessoria'; }
            if (kind === 'terceiro') { n.kind = 'terceiro'; n.role = 'Consultor externo'; n.dashed = true; }
            return n;
        }
        // Zona de soltura sobre um cartão (bordas = antes/depois entre os
        // colegas; centro = na equipe) ou sobre uma pessoa da lista (em cima/
        // embaixo = antes/depois; meio = na equipe dela). Topo: só "na equipe".
        function orgZone(it, p) {
            var T = OD().tree(D.org);
            if (!T.parentOf[it.id]) { return 'in'; }
            if (it.t === 'orow') { var fy = (p.y - it.y) / (it.h || 1); return fy < 0.3 ? 'before' : fy > 0.7 ? 'after' : 'in'; }
            var fx = (p.x - it.x) / (it.w || 1);
            return fx < 0.25 ? 'before' : fx > 0.75 ? 'after' : 'in';
        }
        function orgZoneSvg(it, zone) {
            var k = 1 / view.z, c = '#1D9E75';
            if (zone === 'in') {
                return '<rect x="' + (it.x - 4 * k) + '" y="' + (it.y - 4 * k) + '" width="' + (it.w + 8 * k) + '" height="' + (it.h + 8 * k) + '" rx="10" fill="' + c + '" fill-opacity="0.1" stroke="' + c + '" stroke-width="' + (2.5 * k) + '" pointer-events="none"/>';
            }
            if (it.t === 'orow') {
                var y = zone === 'before' ? it.y : it.y + it.h;
                return '<rect x="' + it.x + '" y="' + (y - 2 * k) + '" width="' + it.w + '" height="' + (4 * k) + '" fill="' + c + '" pointer-events="none"/>';
            }
            var x = zone === 'before' ? it.x - 9 * k : it.x + it.w + 5 * k;
            return '<rect x="' + x + '" y="' + it.y + '" width="' + (4 * k) + '" height="' + it.h + '" rx="2" fill="' + c + '" pointer-events="none"/>';
        }
        // Alvo sob o ponteiro (cartão ou pessoa da lista), menos o próprio e a
        // equipe dele (não dá para pôr alguém embaixo de si mesmo).
        function orgTarget(ev, movingId) {
            var el = document.elementFromPoint(ev.clientX, ev.clientY), id = el && svg.contains(el) ? hit(el) : null, it = id && get(id);
            if (!it || it.t === 'link') { return null; }
            if (movingId && (it.id === movingId || orgTeam(movingId)[it.id])) { return null; }
            return it;
        }
        // Põe `n` (novo ou existente) junto de `tid`. Existente perde a chefia
        // antiga e a posição solta (passa a seguir o arranjo da nova equipe).
        function orgPlace(n, tid, zone, novo) {
            var T = OD().tree(D.org), pid = zone === 'in' ? tid : (T.parentOf[tid] || '');
            if (!pid) { return false; }
            if (novo) { D.org.nodes.push(n); }
            else {
                D.org.edges = D.org.edges.filter(function (e) {
                    if (e.to === n.id && e.boss) { return false; }
                    if ((e.from === pid && e.to === n.id) || (e.from === n.id && e.to === pid)) { return false; }
                    return true;
                });
                delete n.x; delete n.y;
            }
            var e = { id: orgEdgeId(), from: pid, to: n.id, boss: true, style: 'solida', label: '' };
            if (zone === 'in') { D.org.edges.push(e); }
            else {
                var i = -1;
                D.org.edges.forEach(function (x, j) { if (i < 0 && x.boss && x.to === tid) { i = j; } });
                D.org.edges.splice(i < 0 ? D.org.edges.length : i + (zone === 'after' ? 1 : 0), 0, e);
            }
            return true;
        }
        // "Deixar a equipe": os subordinados diretos passam ao chefe atual,
        // no lugar de quem sai (como no motor antigo).
        function orgLeaveTeam(id) {
            var pid = orgBossOf(id); if (!pid) { return; }
            var out = [], done = false;
            D.org.edges.forEach(function (e) {
                if (e.from === id && e.boss) { return; }
                out.push(e);
                if (!done && e.to === id && e.from === pid && e.boss) {
                    D.org.edges.forEach(function (k) { if (k.from === id && k.boss) { out.push({ id: k.id, from: pid, to: k.to, boss: true, style: k.style, label: k.label }); } });
                    done = true;
                }
            });
            D.org.edges = out;
        }
        var odlg = null;
        function orgDlgClose() { if (odlg) { odlg.remove(); odlg = null; } }
        function orgDlg(html, onClick) {
            orgDlgClose();
            odlg = document.createElement('div');
            odlg.className = 'cx-io-back';
            odlg.innerHTML = '<div class="cx-io" role="dialog" aria-modal="true">' + html + '</div>';
            root.appendChild(odlg);
            odlg.addEventListener('pointerdown', function (e) { if (e.target === odlg) { orgDlgClose(); } });
            odlg.addEventListener('click', function (e) { var b = e.target.closest('[data-od]'); if (b) { onClick(b.getAttribute('data-od')); } });
            var f = odlg.querySelector('input,[data-od]'); if (f) { f.focus(); }
        }
        // Mover alguém que tem equipe para dentro de uma lista ou equipe:
        // pergunta se a equipe vai junto (motor antigo, 0.6.7-6).
        /* Q6f-1: quem se move leva junto os subordinados SOLTOS (os ancorados
           já vão pelo arranjo). Compara a caixa antes e depois do desenho e
           desloca os soltos na mesma medida (o mesmo passo do desfazer). */
        // Posição no espaço gravado (sem a origem do desenho, que muda quando o
        // organograma cresce para a esquerda ou para cima).
        function orgBoxNow(id) { var it = get(id); return it && it.t === 'org' ? { x: it.x - ORG_PAD - oOrigin.x, y: it.y - ORG_PAD - oOrigin.y } : null; }
        function orgFollow(id, before) {
            var after = orgBoxNow(id); if (!before || !after) { return false; }
            var dx = Math.round(after.x - before.x), dy = Math.round(after.y - before.y);
            if (!dx && !dy) { return false; }
            var team = orgTeam(id), mexeu = false;
            D.org.nodes.forEach(function (m) {
                if (!team[m.id] || typeof m.x !== 'number') { return; }
                m.x += dx; m.y += dy; mexeu = true;
            });
            return mexeu;
        }
        /* Q6f-1: entrar numa equipe de colegas SOLTOS (cartões com posição
           própria) cai na mesma linha deles, com o mesmo espaçamento: no centro
           do chefe, no fim da fileira; na borda de um colega, ao lado dele,
           empurrando os seguintes. Colegas ancorados: o arranjo já alinha. */
        function orgAlignInTeam(n, pid, zone, tid) {
            var T = OD().tree(D.org);
            if (!(T.kids[n.id] || []).length) { return; }          // sem equipe vira linha da lista
            var sib = (T.kids[pid] || []).filter(function (m) { var it = get(m.id); return m.id !== n.id && it && it.t === 'org' && typeof m.x === 'number'; });
            if (!sib.length) { return; }
            var W = function (m) { var it = get(m.id); return it ? it.w : 185; };
            var ys = {}; sib.forEach(function (m) { ys[m.y] = (ys[m.y] || 0) + 1; });
            var rowY = +Object.keys(ys).sort(function (a, b) { return ys[b] - ys[a]; })[0];
            var fila = sib.filter(function (m) { return m.y === rowY; }).sort(function (a, b) { return a.x - b.x; });
            var gaps = [];
            fila.forEach(function (m, i) { var nx = fila[i + 1]; if (nx) { var g = nx.x - (m.x + W(m)); if (g > 0) { gaps.push(g); } } });
            gaps.sort(function (a, b) { return a - b; });
            var gap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 14;
            var me = get(n.id), w = me && me.t === 'org' ? me.w : 185, hN = me && me.t === 'org' ? me.h : 56, t = null;
            fila.forEach(function (m) { if (m.id === tid) { t = m; } });
            if (t && zone === 'after') { n.x = Math.round(t.x + W(t) + gap); }
            else if (t && zone === 'before') { n.x = Math.round(t.x); }
            else { var last = fila[fila.length - 1]; n.x = Math.round(last ? last.x + W(last) + gap : sib[0].x); }
            n.y = rowY;
            // Abre espaço: da esquerda para a direita, a partir de quem entrou,
            // cartão solto que ficaria encavalado anda para a direita (com o
            // mesmo espaçamento), levando os subordinados soltos dele.
            var team = orgTeam(n.id), pos = function (m) {
                var it = get(m.id);
                return typeof m.x === 'number' ? { x: m.x, y: m.y } : { x: it.x - ORG_PAD - oOrigin.x, y: it.y - ORG_PAD - oOrigin.y };
            };
            var linha = D.org.nodes.filter(function (m) {
                var it = get(m.id); if (!it || it.t !== 'org' || m.id === n.id || team[m.id]) { return false; }
                var p0 = pos(m); return p0.y < rowY + hN && p0.y + it.h > rowY && p0.x + it.w > n.x;
            }).sort(function (a, b) { return pos(a).x - pos(b).x; });
            var cursor = n.x + w + gap;
            linha.forEach(function (m) {
                var p0 = pos(m);
                if (p0.x < cursor && typeof m.x === 'number') {
                    var dlt = Math.round(cursor - p0.x), tm = orgTeam(m.id);
                    m.x += dlt;
                    D.org.nodes.forEach(function (q) { if (tm[q.id] && typeof q.x === 'number') { q.x += dlt; } });
                    p0 = pos(m);
                }
                cursor = Math.max(cursor, p0.x + W(m) + gap);
            });
        }
        function orgMoveTo(id, tid, zone, row) {
            var n = orgNode(id), T = OD().tree(D.org), kids = (T.kids[id] || []).length, pid = T.parentOf[id];
            var go = function (leave) {
                snap();
                var before = orgBoxNow(id);
                if (leave) { orgLeaveTeam(id); }
                if (orgPlace(n, tid, zone, false)) {
                    sel = [id];
                    var T2 = OD().tree(D.org);
                    orgAlignInTeam(n, zone === 'in' ? tid : T2.parentOf[tid], zone, tid);
                }
                render();
                if (orgFollow(id, before)) { render(); }
            };
            if (!kids || !pid || !(zone === 'in' || row)) { go(false); return; }
            var all = Object.keys(orgTeam(id)).length, who = OD().label(n), boss = OD().label(orgNode(pid));
            orgDlg('<h3>Mover ' + esc(who) + '</h3><p class="cx-io-sub">' + esc(who) + ' tem ' + kids + (kids === 1 ? ' subordinado direto' : ' subordinados diretos')
                + (all > kids ? ' (' + all + ' pessoas na equipe toda)' : '') + '. Quem tem equipe aparece como cartão próprio.</p>'
                + '<div class="cx-io-foot" style="flex-wrap:wrap"><button type="button" class="cx-io-btn" data-od="cancel">Cancelar</button>'
                + '<button type="button" class="cx-io-btn" data-od="with">Levar a equipe junto (vira cartão)</button>'
                + '<button type="button" class="cx-io-btn cx-io-pri" data-od="leave">Deixar a equipe com ' + esc(boss) + ' e entrar na lista</button></div>',
                function (a) { orgDlgClose(); if (a === 'with') { go(false); } else if (a === 'leave') { go(true); } });
        }
        function orgDropNew(kind, ev) {
            var r = svg.getBoundingClientRect(), dentro = ev && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
            var last = D.org.levels[D.org.levels.length - 1].key, n, it = dentro ? orgTarget(ev, null) : null;
            snap();
            if (it) {
                var z = orgZone(it, toBoard(ev)), t = orgNode(it.id);
                n = orgNewNode(kind, z === 'in' ? orgNextLevel(t.lvl) : t.lvl);
                orgPlace(n, it.id, z, true);
            } else if (dentro) {
                n = orgNewNode(kind, last);
                var p = toBoard(ev);
                D.org.nodes.push(n);
                n.x = orgGrid(p.x - 90 - ORG_PAD - oOrigin.x); n.y = orgGrid(p.y - 20 - ORG_PAD - oOrigin.y);
            } else {
                // Clique na paleta: embaixo de quem estiver selecionado (ou do topo).
                var T = OD().tree(D.org), s0 = sel.length === 1 && orgNode(sel[0]), base = s0 || T.top;
                n = orgNewNode(kind, base ? orgNextLevel(base.lvl) : last);
                D.org.nodes.push(n);
                if (base) { D.org.edges.push({ id: orgEdgeId(), from: base.id, to: n.id, boss: true, style: 'solida', label: '' }); }
            }
            sel = [n.id]; oDelArm = null; render();
            var f = props.querySelector('[data-of="name"]'); if (f) { f.focus(); f.select(); }
        }
        function orgElNew() {
            var opts = '<option value="">Conforme a posição</option>' + D.org.levels.map(function (l) { return '<option value="' + esc(l.key) + '">' + esc(l.label) + '</option>'; }).join('');
            orgDlg('<h3>Criar elemento</h3><p class="cx-io-sub">O elemento entra na paleta deste organograma, ao lado dos padrão. Ex.: "Coringa NOC", "Plantonista", "Estagiário".</p>'
                + '<label class="cx-board-f"><span>Nome</span><input type="text" maxlength="40" data-oel="name" autocomplete="off" style="box-sizing:border-box"></label>'
                + '<label class="cx-board-f"><span>É</span><select data-oel="base"><option value="pessoa">uma pessoa (cargo)</option><option value="equipe">uma área ou equipe</option></select></label>'
                + '<label class="cx-board-f"><span>Nível</span><select data-oel="lvl">' + opts + '</select></label>'
                + '<label class="cx-board-chk"><input type="checkbox" data-oel="dashed"> Borda tracejada (externo ou temporário)</label>'
                + '<p class="cx-io-err" data-oel="err" hidden></p>'
                + '<div class="cx-io-foot"><button type="button" class="cx-io-btn" data-od="cancel">Cancelar</button><button type="button" class="cx-io-btn cx-io-pri" data-od="save">Criar</button></div>',
                function (a) {
                    if (a === 'cancel') { orgDlgClose(); return; }
                    var q = function (k) { return odlg.querySelector('[data-oel="' + k + '"]'); }, nm = q('name').value.trim();
                    if (!nm) { q('err').textContent = 'Informe o nome do elemento.'; q('err').hidden = false; q('name').focus(); return; }
                    if ((D.org.elements || []).length >= 40) { q('err').textContent = 'Este organograma já tem 40 elementos criados (o máximo).'; q('err').hidden = false; return; }
                    snap();
                    D.org.elements = D.org.elements || [];
                    D.org.elements.push({ id: 'e' + Date.now().toString(36), label: nm.slice(0, 40), base: q('base').value === 'equipe' ? 'equipe' : 'pessoa', lvl: q('lvl').value, dashed: q('dashed').checked });
                    orgDlgClose(); render(); paleta();
                });
            var nmIn = odlg.querySelector('[data-oel="name"]');
            nmIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); odlg.querySelector('[data-od="save"]').click(); } });
            nmIn.focus();
        }
        /* Q6c (Claudio, 03/10/2026): níveis e modelos, como no motor antigo.
           Níveis: cor, nome, subir, excluir (só sem uso: ninguém nem linha da
           matriz nele) e "Novo nível"; muda ao vivo. Modelos: dois cliques,
           porque o modelo substitui o organograma (Ctrl+Z desfaz). */
        var lvSnap = false;
        function orgLevelsHtml() {
            var L = D.org.levels;
            return L.map(function (l, i) {
                var used = OD().levelUsed(D.org, l.key);
                return '<div style="display:flex;align-items:center;gap:6px;margin:0 0 6px">'
                    + '<input type="color" value="' + esc(l.color) + '" data-olv-color="' + i + '" aria-label="Cor do nível ' + esc(l.label) + '" style="width:34px;height:28px;padding:0;border:1px solid var(--cx-border);border-radius:5px">'
                    + '<input type="text" value="' + esc(l.label) + '" data-olv-label="' + i + '" maxlength="40" aria-label="Nome do nível" style="flex:1;box-sizing:border-box;border:1px solid var(--cx-border);border-radius:6px;padding:4px 6px;font:inherit">'
                    + '<button type="button" class="cx-io-btn" data-od="up:' + i + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="Subir" title="Subir">↑</button>'
                    + '<button type="button" class="cx-io-btn" data-od="del:' + i + '"' + (used || L.length < 2 ? ' disabled title="' + (used ? 'Nível em uso: mude antes as pessoas ou as linhas da matriz dele' : 'O organograma precisa de ao menos um nível') + '"' : '') + ' style="color:#b3261e">Excluir</button>'
                    + '</div>';
            }).join('');
        }
        function orgLevelsDlg() {
            orgDlg('<h3>Níveis deste organograma</h3><p class="cx-io-sub">Nome e cor de cada nível, de cima para baixo. Um nível em uso não pode ser excluído: mude antes as pessoas dele (ou as linhas da matriz).</p>'
                + '<div data-olv-list style="max-height:50vh;overflow:auto">' + orgLevelsHtml() + '</div>'
                + '<div class="cx-io-foot" style="justify-content:space-between"><button type="button" class="cx-io-btn" data-od="add">+ Novo nível</button>'
                + '<button type="button" class="cx-io-btn cx-io-pri" data-od="close">Pronto</button></div>',
                function (a) {
                    var L = D.org.levels, i = +String(a).split(':')[1], list = odlg.querySelector('[data-olv-list]');
                    if (a === 'close') { orgDlgClose(); render(); return; }
                    if (a === 'add') {
                        snap();
                        L.push({ key: 'nv' + Date.now().toString(36), label: 'Novo nível', color: OD().SWATCHES[L.length % OD().SWATCHES.length] });
                        list.innerHTML = orgLevelsHtml(); orgRefresh();
                        var ins = list.querySelectorAll('[data-olv-label]'), li = ins[ins.length - 1]; if (li) { li.focus(); li.select(); }
                        return;
                    }
                    if (/^up:/.test(a) && i > 0) { snap(); var t = L[i - 1]; L[i - 1] = L[i]; L[i] = t; }
                    else if (/^del:/.test(a) && L[i] && L.length > 1 && !OD().levelUsed(D.org, L[i].key)) {
                        snap();
                        var gone = L[i].key; L.splice(i, 1);
                        (D.org.elements || []).forEach(function (el) { if (el.lvl === gone) { el.lvl = ''; } });
                    } else { return; }
                    list.innerHTML = orgLevelsHtml(); orgRefresh();
                });
            odlg.addEventListener('input', function (e) {
                var i = e.target.getAttribute('data-olv-label'), j = e.target.getAttribute('data-olv-color'), L = D.org.levels;
                if (i === null && j === null) { return; }
                if (!lvSnap) { snap(); lvSnap = true; }
                if (i !== null && L[i]) { L[i].label = String(e.target.value).slice(0, 40) || '—'; }
                else if (j !== null && L[j] && /^#[0-9a-f]{6}$/i.test(e.target.value)) { L[j].color = e.target.value; }
                orgRefresh();
            });
            odlg.addEventListener('change', function () { lvSnap = false; });
        }
        function orgModelsDlg() {
            var armed = '';
            var html = function () {
                return '<h3>Começar de um modelo</h3><p class="cx-io-sub">O modelo substitui o organograma atual (a matriz também, se o modelo trouxer uma). Clique duas vezes no modelo para usar. Nada fica gravado até clicar em Salvar organograma, e Ctrl+Z desfaz.</p>'
                    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">'
                    + OD().templates().map(function (t) {
                        var on = armed === t.key;
                        return '<button type="button" data-od="tpl:' + esc(t.key) + '" style="display:flex;flex-direction:column;gap:4px;text-align:left;padding:12px 14px;font:inherit;background:' + (on ? 'var(--cx-accent-soft, #eef4fc)' : '#fff')
                            + ';border:1px solid ' + (on ? 'var(--cx-accent)' : 'var(--cx-border)') + ';border-radius:8px;cursor:pointer;color:var(--cx-text)">'
                            + '<strong style="font-size:14.5px">' + esc(t.name) + (on ? ' <span style="font-weight:500;color:var(--cx-accent);font-size:12.5px">· clique de novo para usar</span>' : '') + '</strong>'
                            + '<span style="font-size:12.5px;color:var(--cx-muted);line-height:1.4">' + esc(t.desc) + '</span></button>';
                    }).join('') + '</div>'
                    + '<div class="cx-io-foot"><button type="button" class="cx-io-btn" data-od="close">Cancelar</button></div>';
            };
            var onClick = function (a) {
                if (a === 'close') { orgDlgClose(); return; }
                var k = String(a).replace(/^tpl:/, '');
                if (armed !== k) { armed = k; odlg.querySelector('.cx-io').innerHTML = html(); return; }
                var S2 = OD().fromTemplate(k); if (!S2) { return; }
                snap();
                D.org = S2; sel = []; oDelArm = null; oOrigin = null;
                orgDlgClose(); render(); paleta(); setTimeout(fit, 0);
            };
            orgDlg(html(), onClick);
            odlg.querySelector('.cx-io').style.width = '760px';
        }
        if (org) {
            var palEl = root.querySelector('.cx-board-icons');
            palEl.addEventListener('click', function (e) {
                if (e.target.closest('[data-oelnew]')) { orgElNew(); return; }
                if (e.target.closest('[data-act="oniveis"]')) { orgLevelsDlg(); return; }
                var d = e.target.closest('[data-oeldel]');
                if (d) { snap(); D.org.elements = (D.org.elements || []).filter(function (x) { return x.id !== d.getAttribute('data-oeldel'); }); render(); paleta(); }
            });
            palEl.addEventListener('pointerdown', function (e) {
                var b = e.target.closest('[data-onew]'); if (!b || e.button !== 0) { return; }
                e.preventDefault();
                var kind = b.getAttribute('data-onew'), sx = e.clientX, sy = e.clientY, moved = false;
                var ghost = document.createElement('div');
                ghost.className = 'cx-board-ghost';
                ghost.style.cssText = 'padding:5px 10px;background:#fff;border:1px solid var(--cx-border);border-radius:6px;font-size:12.5px;box-shadow:0 4px 12px rgba(0,0,0,.15);white-space:nowrap';
                ghost.textContent = b.textContent;
                function mv(ev) {
                    if (!moved && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 5) { return; }
                    if (!moved) { moved = true; document.body.appendChild(ghost); }
                    ghost.style.left = (ev.clientX + 12) + 'px'; ghost.style.top = (ev.clientY + 8) + 'px';
                    var it = orgTarget(ev, null);
                    gGuides.innerHTML = it ? orgZoneSvg(it, orgZone(it, toBoard(ev))) : '';
                }
                function up(ev) {
                    document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
                    if (ghost.parentNode) { ghost.remove(); }
                    gGuides.innerHTML = '';
                    orgDropNew(kind, moved ? ev : null);
                }
                document.addEventListener('pointermove', mv);
                document.addEventListener('pointerup', up);
            });
        }
        // Ponteiro no organograma: clique seleciona; arrastar cartão o solta
        // onde largar (a equipe ancorada vai junto); arrastar pessoa da lista
        // dá a ela um cartão próprio; arrastar o fundo move a vista.
        function orgDown(e) {
            if (e.button === 2) { return; }
            var id = hit(e.target), it = id && get(id);
            try { svg.setPointerCapture(e.pointerId); } catch (err) { /* sem captura */ }
            if (e.button === 1 || space || !it) {
                if (!it && sel.length) { sel = []; render(); }
                drag = { k: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
                svg.classList.add('is-panning');
                return;
            }
            if (sel[0] !== it.id) { oDelArm = null; }
            sel = [it.id]; render();
            var row = it.t === 'orow';
            drag = { k: 'omove', id: it.id, sx: e.clientX, sy: e.clientY, moved: false,
                box: { x: it.x, y: it.y, w: row ? 185 : it.w, h: row ? 56 : it.h } };
        }
        /* Q6f-1 (Claudio, 03/10/2026): guias ao arrastar um cartão, como no
           motor antigo e nos editores de desenho. Alinha pela esquerda, centro
           ou direita (e topo, meio ou base) de outro cartão; na mesma fileira,
           gruda no meio exato entre dois vizinhos ou na mesma distância de um
           par que já existe. Sem guia por perto, vale a grade de 10. Alt
           desliga. Devolve a posição e o desenho das guias. */
        function orgGuides(b, x, y, moving, alt) {
            var tol = 8 / view.z, out = { x: x, y: y, gx: false, gy: false, svg: '' };
            if (alt) { return out; }
            var team = orgTeam(moving), others = D.items.filter(function (it) { return it.t === 'org' && it.id !== moving && !team[it.id]; });
            if (!others.length) { return out; }
            var best = function (mine, keys) {
                var r = null;
                others.forEach(function (o) {
                    keys(o).forEach(function (v) {
                        mine.forEach(function (m) {
                            var d = v - m.v;
                            if (Math.abs(d) <= tol && (!r || Math.abs(d) < Math.abs(r.d))) { r = { d: d, v: v, o: o }; }
                        });
                    });
                });
                return r;
            };
            var w = b.w, h = b.h;
            var ax = best([{ v: x }, { v: x + w / 2 }, { v: x + w }], function (o) { return [o.x, o.x + o.w / 2, o.x + o.w]; });
            var ay = best([{ v: y }, { v: y + h / 2 }, { v: y + h }], function (o) { return [o.y, o.y + o.h / 2, o.y + o.h]; });
            // Espaçamento igual na fileira (cartões que cruzam a mesma faixa).
            var cy = (ay ? y + ay.d : y) + h / 2;
            var row = others.filter(function (o) { return o.y < cy && o.y + o.h > cy; }).sort(function (a, c) { return a.x - c.x; });
            var L = null, R = null;
            row.forEach(function (o) { if (o.x + o.w <= x + w / 2) { L = o; } else if (!R && o.x >= x + w / 2) { R = o; } });
            var eq = null, cands = [];
            if (L && R && R.x - (L.x + L.w) > w) { cands.push({ x: (L.x + L.w + R.x - w) / 2, mk: [[L.x + L.w, null], [null, R.x]] }); }
            var gapOf = function (a, c) { return c.x - (a.x + a.w); };
            row.forEach(function (o, i) {
                var nx = row[i + 1]; if (!nx) { return; }
                var g = gapOf(o, nx); if (g <= 0) { return; }
                if (L) { cands.push({ x: L.x + L.w + g, mk: [[L.x + L.w, null]], ref: [o, nx] }); }
                if (R) { cands.push({ x: R.x - g - w, mk: [[null, R.x]], ref: [o, nx] }); }
            });
            cands.forEach(function (c) { var d = c.x - x; if (Math.abs(d) <= tol * 1.5 && (!eq || Math.abs(d) < Math.abs(eq.d))) { eq = { d: d, c: c }; } });
            var k = 1 / view.z, P = '#D4537E', lines = '';
            if (eq && (!ax || Math.abs(eq.d) <= Math.abs(ax.d) + 0.5)) {
                out.x = Math.round(eq.c.x); out.gx = true;
                var gy0 = cy, gap = function (x1, x2) {
                    return '<line x1="' + x1 + '" y1="' + gy0 + '" x2="' + x2 + '" y2="' + gy0 + '" stroke="' + P + '" stroke-width="' + (1.5 * k) + '"/>'
                        + '<line x1="' + x1 + '" y1="' + (gy0 - 5 * k) + '" x2="' + x1 + '" y2="' + (gy0 + 5 * k) + '" stroke="' + P + '" stroke-width="' + (1.5 * k) + '"/>'
                        + '<line x1="' + x2 + '" y1="' + (gy0 - 5 * k) + '" x2="' + x2 + '" y2="' + (gy0 + 5 * k) + '" stroke="' + P + '" stroke-width="' + (1.5 * k) + '"/>'
                        + '<text x="' + ((x1 + x2) / 2) + '" y="' + (gy0 - 7 * k) + '" text-anchor="middle" font-family="Arial,sans-serif" font-size="' + (11 * k) + '" fill="' + P + '">' + Math.round(x2 - x1) + '</text>';
                };
                if (L) { lines += gap(L.x + L.w, out.x); }
                if (R) { lines += gap(out.x + w, R.x); }
                if (eq.c.ref) { var o1 = eq.c.ref[0], o2 = eq.c.ref[1]; if (o1 !== L && o2 !== R) { gy0 = o1.y + o1.h / 2; lines += gap(o1.x + o1.w, o2.x); } }
            } else if (ax) {
                out.x = Math.round(x + ax.d); out.gx = true;
                var y1 = Math.min(ax.o.y, out.y), y2 = Math.max(ax.o.y + ax.o.h, out.y + h);
                lines += '<line x1="' + ax.v + '" y1="' + (y1 - 10 * k) + '" x2="' + ax.v + '" y2="' + (y2 + 10 * k) + '" stroke="' + P + '" stroke-width="' + k + '" stroke-dasharray="' + (4 * k) + ' ' + (3 * k) + '"/>';
            }
            if (ay) {
                out.y = Math.round(y + ay.d); out.gy = true;
                var x1 = Math.min(ay.o.x, out.x), x2 = Math.max(ay.o.x + ay.o.w, out.x + w);
                lines += '<line x1="' + (x1 - 10 * k) + '" y1="' + ay.v + '" x2="' + (x2 + 10 * k) + '" y2="' + ay.v + '" stroke="' + P + '" stroke-width="' + k + '" stroke-dasharray="' + (4 * k) + ' ' + (3 * k) + '"/>';
            }
            out.svg = '<g pointer-events="none">' + lines + '</g>';
            return out;
        }
        function orgMove(e) {
            if (!drag) { return; }
            if (drag.k === 'pan') { view.x = drag.vx + e.clientX - drag.sx; view.y = drag.vy + e.clientY - drag.sy; applyView(); return; }
            if (drag.k !== 'omove') { return; }
            var dx = (e.clientX - drag.sx) / view.z, dy = (e.clientY - drag.sy) / view.z;
            if (!drag.moved && Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) < 5) { return; }
            drag.moved = true;
            var b = drag.box, x = ORG_PAD + oOrigin.x + orgGrid(b.x + dx - ORG_PAD - oOrigin.x), y = ORG_PAD + oOrigin.y + orgGrid(b.y + dy - ORG_PAD - oOrigin.y);
            drag.at = { x: x, y: y };
            var tg = orgTarget(e, drag.id);
            drag.tg = tg ? { id: tg.id, row: tg.t === 'orow', zone: orgZone(tg, toBoard(e)) } : null;
            if (tg) { gGuides.innerHTML = orgZoneSvg(tg, drag.tg.zone); return; }
            // Q6f-1: guias de alinhamento e espaçamento (a posição sem grade).
            var gd = orgGuides(b, b.x + dx, b.y + dy, drag.id, e.altKey);
            if (!gd.gx) { gd.x = x; } if (!gd.gy) { gd.y = y; }
            x = gd.x; y = gd.y;
            drag.at = { x: x, y: y, gx: gd.gx, gy: gd.gy };
            gGuides.innerHTML = gd.svg + '<rect x="' + x + '" y="' + y + '" width="' + b.w + '" height="' + b.h + '" rx="8" fill="#378ADD" fill-opacity="0.08" stroke="#378ADD" stroke-width="' + (1.5 / view.z) + '" stroke-dasharray="' + (6 / view.z) + ' ' + (4 / view.z) + '" pointer-events="none"/>';
        }
        function orgUp(e) {
            svg.classList.remove('is-panning');
            var d = drag; drag = null; gGuides.innerHTML = '';
            if (!d || d.k !== 'omove' || !d.moved || !d.at) { return; }
            var n = orgNode(d.id); if (!n) { return; }
            // Q6b-3: largou em cima de um cartão ou pessoa: muda de equipe.
            if (d.tg) { orgMoveTo(d.id, d.tg.id, d.tg.zone, d.tg.row); return; }
            snap();
            var before = orgBoxNow(d.id);
            // Com guia, a posição exata da guia; sem guia, a grade de 10.
            var fx = d.at.x - ORG_PAD - oOrigin.x, fy = d.at.y - ORG_PAD - oOrigin.y;
            n.x = d.at.gx ? Math.round(fx) : orgGrid(fx); n.y = d.at.gy ? Math.round(fy) : orgGrid(fy);
            render();
            if (orgFollow(d.id, before)) { render(); }
        }

        /* ---------- vista ---------- */
        /* ---------- Q5h-4: minimapa (Claudio, 02/10/2026) ----------
           Canto de baixo à direita: a folha e o desenho em miniatura (raias,
           formas, ícones, textos e molduras como blocos de cor) e um retângulo
           com o que está na tela. Clicar ou arrastar nele move a vista. O
           botão "Mapa" mostra/esconde (vale até fechar o quadro). */
        var mmOn = true, mmBox = null, mmDrag = false;
        function mmBounds() {
            var x1 = 0, y1 = 0, x2 = D.w, y2 = D.h;
            D.items.forEach(function (it) {
                if (it.t === 'link') { return; }
                var b = bbox(it); x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.w); y2 = Math.max(y2, b.y + b.h);
            });
            var p = Math.max(x2 - x1, y2 - y1) * 0.03;
            return { x: x1 - p, y: y1 - p, w: x2 - x1 + 2 * p, h: y2 - y1 + 2 * p };
        }
        function drawMM() {
            var wrap = root.querySelector('.cx-board-mm'); if (!wrap) { return; }
            wrap.hidden = !mmOn;
            if (!mmOn) { return; }
            var el = wrap.querySelector('svg'), B0 = mmBounds(), r = svg.getBoundingClientRect(), k = Math.max(B0.w, B0.h) / 160;
            mmBox = B0;
            el.setAttribute('viewBox', B0.x + ' ' + B0.y + ' ' + B0.w + ' ' + B0.h);
            var h = '<rect x="0" y="0" width="' + D.w + '" height="' + D.h + '" fill="#fff" stroke="#D3D1C7" stroke-width="' + k + '"/>';
            D.items.forEach(function (it) {
                if (it.t === 'link' || isPath(it) || it.t === 'orow') { return; }
                var b = bbox(it), f = '#B4B2A9', o = 0.9;
                if (it.t === 'org') { f = it.color || f; o = 0.85; }
                else if (it.t === 'lane') { f = pal(it.tone).f; o = 1; }
                else if (it.t === 'shape') { f = it.shape === 'ico' ? pal(it.line).s : NO_FILL.indexOf(it.shape) >= 0 ? 'none' : pal(it.fill).s; o = 0.75; }
                else if (it.t === 'zone') { f = 'none'; }
                else if (it.t === 'text') { f = '#5F5E5A'; o = 0.5; }
                h += '<rect x="' + b.x + '" y="' + b.y + '" width="' + Math.max(b.w, k) + '" height="' + Math.max(b.h, k) + '" fill="' + f + '" fill-opacity="' + o + '"'
                    + (f === 'none' ? ' stroke="#888780" stroke-width="' + k + '"' : '') + '/>';
            });
            if (r.width) {
                h += '<rect class="cx-board-mmview" x="' + (-view.x / view.z) + '" y="' + (-view.y / view.z) + '" width="' + (r.width / view.z) + '" height="' + (r.height / view.z)
                    + '" fill="#378ADD" fill-opacity="0.1" stroke="#378ADD" stroke-width="' + (k * 1.5) + '"/>';
            }
            el.innerHTML = h;
        }
        // Ponto do minimapa (clique) -> ponto do quadro.
        function mmPoint(e) {
            var el = root.querySelector('.cx-board-mm svg'), rr = el.getBoundingClientRect(), b = mmBox;
            if (!b || !rr.width) { return null; }
            var kk = Math.min(rr.width / b.w, rr.height / b.h), ox = (rr.width - b.w * kk) / 2, oy = (rr.height - b.h * kk) / 2;
            return { x: b.x + (e.clientX - rr.left - ox) / kk, y: b.y + (e.clientY - rr.top - oy) / kk };
        }
        function mmCenter(e) {
            var p = mmPoint(e), r = svg.getBoundingClientRect(); if (!p || !r.width) { return; }
            view.x = r.width / 2 - p.x * view.z; view.y = r.height / 2 - p.y * view.z;
            applyView();
            if (typeof drawSel === 'function') { drawSel(); }
        }
        function applyView() {
            vp.setAttribute('transform', 'translate(' + view.x + ' ' + view.y + ') scale(' + view.z + ')');
            drawMM();
            if (typeof drawFbar === 'function' && fbar) { drawFbar(); }
            root.querySelector('.cx-board-zoom').textContent = Math.round(view.z * 100) + '%';
        }
        function toBoard(e) {
            var r = svg.getBoundingClientRect();
            return { x: (e.clientX - r.left - view.x) / view.z, y: (e.clientY - r.top - view.y) / view.z };
        }
        function fit() {
            var r = svg.getBoundingClientRect();
            var w = D.w, h = D.h, x = 0, y = 0;
            if (!bgUrl && D.items.some(function (i) { return i.t !== 'link'; })) {
                var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
                D.items.forEach(function (it) { if (it.t === 'link') { return; } var b = bbox(it); x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.w); y2 = Math.max(y2, b.y + b.h); });
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
        // Zonas embaixo, ligações no meio, ícones e textos por cima.
        function paint() {
            if (mmOn) { setTimeout(drawMM, 0); }
            if (org) {
                if (!oparts) { orgSync(); }
                var tr = '<g transform="translate(' + ORG_PAD + ' ' + ORG_PAD + ')">';
                gZones.innerHTML = ''; gDucts.innerHTML = '';
                gLinks.innerHTML = tr + oparts.links + '</g>';
                gItems.innerHTML = tr + oparts.cards + '</g>';
                return;
            }
            gZones.innerHTML = laneSvg(D.items) + D.items.filter(function (i) { return i.t === 'zone'; }).map(function (i) { return itemSvg(i); }).join('');
            gDucts.innerHTML = (wallsShown(D) ? D.items.filter(function (i) { return i.t === 'wall'; }).map(function (i) { return wallSvg(i); }).join('') : '')
                + D.items.filter(function (i) { return i.t === 'duct'; }).map(function (i) { return ductSvg(i, D.items); }).join('');
            gLinks.innerHTML = D.items.filter(function (i) { return i.t === 'link'; }).map(function (i) { return linkSvg(i, get); }).join('');
            gItems.innerHTML = D.items.filter(function (i) { return ['zone', 'link', 'duct', 'wall'].indexOf(i.t) < 0; }).map(function (i) { return itemSvg(i); }).join('');
        }
        function render() {
            if (org) { orgSync(); }
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
            // Q5g: a seção Raias da paleta acompanha a orientação em uso.
            var ldNow = (lanesOf(D.items)[0] || {}).dir || '';
            if (flow && ldNow !== laneDirPal) { laneDirPal = ldNow; paleta(); }
            paint();
            drawSel();
            drawProps();
            root.querySelector('[data-act="undo"]').disabled = !hist.length;
            root.querySelector('[data-act="redo"]').disabled = !redo.length;
            root.querySelectorAll('[data-tool]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-tool') === tool); });
            syncPage();
        }
        /* ---------- folha (fluxograma) ---------- */
        // Menor folha que ainda cabe o desenho (com sobra de 40 px).
        function pageMin() {
            var x2 = 0, y2 = 0, fnd = finder(D.items);
            D.items.forEach(function (it) {
                if (it.t === 'link') {
                    (routePts(it, fnd) || []).forEach(function (q) { x2 = Math.max(x2, q.x); y2 = Math.max(y2, q.y); });
                    return;
                }
                var b = bbox(it); x2 = Math.max(x2, b.x + b.w); y2 = Math.max(y2, b.y + b.h);
            });
            return { w: Math.max(400, Math.ceil(x2 + 40)), h: Math.max(300, Math.ceil(y2 + 40)) };
        }
        function syncPage() {
            var s = root.querySelector('[data-act="page"]');
            if (!s) { return; }
            var v = D.w + 'x' + D.h, pre = PAGE_SIZES.some(function (p) { return p.v === v; });
            var c = root.querySelector('.cx-board-pagec');
            if (document.activeElement !== s) { s.value = pre ? v : 'custom'; }
            c.hidden = s.value !== 'custom';
            c.querySelectorAll('input').forEach(function (i) {
                if (document.activeElement !== i) { i.value = i.getAttribute('data-pg') === 'w' ? D.w : D.h; }
            });
        }
        function setPage(w, h) {
            w = Math.round(+w); h = Math.round(+h);
            if (!(w > 0) || !(h > 0)) { syncPage(); return; }
            w = Math.max(400, Math.min(6000, w)); h = Math.max(300, Math.min(6000, h));
            var m = pageMin(), cw = Math.min(6000, Math.max(w, m.w)), ch = Math.min(6000, Math.max(h, m.h));
            if (cw === D.w && ch === D.h) { syncPage(); return; }
            snap();
            D.w = cw; D.h = ch;
            render();
            if (cw > w || ch > h) {
                notify(editor, 'O desenho não cabe em ' + w + ' × ' + h + '. A folha ficou em ' + cw + ' × ' + ch + ', o menor tamanho em que ele cabe.');
            }
        }
        function drawSel() {
            drawSelBody();
            drawFind();
            if (typeof drawFbar === 'function') { drawFbar(); }
        }
        /* ---------- Q5h-3: buscar no quadro (Claudio, 02/10/2026) ----------
           Ctrl+F ou "Buscar": caixa no canto do quadro. Procura sem acento no
           texto das formas, título e descrição das raias, textos, molduras,
           rótulos de ícones e de ligações. Todas as achadas ficam contornadas;
           Enter vai para a próxima (Shift+Enter, anterior), centraliza e
           seleciona. Esc fecha. */
        var find = null;   // { q, hits: [id], i }
        function itemText(it) {
            if (it.t === 'org' || it.t === 'orow') { var on = org && orgNode(it.id); return on ? OD().label(on) + ' ' + on.role + ' ' + on.note : ''; }
            if (it.t === 'shape') { return it.text; }
            if (it.t === 'lane') { return (it.title || '') + ' ' + (it.desc || ''); }
            if (it.t === 'text') { return it.text; }
            if (it.t === 'zone' || it.t === 'icon' || it.t === 'duct') { return it.label; }
            if (it.t === 'link') { return (it.label || '') + ' ' + (it.cable || ''); }
            return '';
        }
        function findRun(q) {
            var nq = norm(q), hits = [];
            if (nq) {
                hits = D.items.filter(function (it) { return norm(itemText(it)).indexOf(nq) >= 0; })
                    .map(function (it) { return { id: it.id, b: findBox(it.id) || { x: 0, y: 0 } }; })
                    .sort(function (a, b) { return (a.b.y - b.b.y) || (a.b.x - b.b.x); })
                    .map(function (h) { return h.id; });
            }
            find.q = q; find.hits = hits; find.i = hits.length ? 0 : -1;
            findInfo();
            drawFind();
        }
        function findInfo() {
            var el = root.querySelector('.cx-board-findn'); if (!el || !find) { return; }
            el.textContent = !norm(find.q) ? '' : find.hits.length ? (find.i + 1) + ' de ' + find.hits.length : 'nada';
            el.classList.toggle('is-none', !!norm(find.q) && !find.hits.length);
        }
        function findBox(id) {
            var it = get(id); if (!it) { return null; }
            if (it.t === 'link') { var ps = routePts(it, get) || []; if (!ps.length) { return null; }
                var xs = ps.map(function (q) { return q.x; }), ys = ps.map(function (q) { return q.y; });
                return { x: Math.min.apply(null, xs), y: Math.min.apply(null, ys), w: Math.max.apply(null, xs) - Math.min.apply(null, xs), h: Math.max.apply(null, ys) - Math.min.apply(null, ys) }; }
            return bbox(it);
        }
        function drawFind() {
            if (!gFind) { return; }
            if (!find || !find.hits.length) { gFind.innerHTML = ''; return; }
            var sw = 2 / view.z, pad = 6 / view.z;
            gFind.innerHTML = find.hits.map(function (id, i) {
                var b = findBox(id); if (!b) { return ''; }
                var cur = i === find.i;
                return '<rect x="' + (b.x - pad) + '" y="' + (b.y - pad) + '" width="' + (b.w + 2 * pad) + '" height="' + (b.h + 2 * pad) + '" rx="' + (6 / view.z)
                    + '" fill="#EF9F27" fill-opacity="' + (cur ? 0.18 : 0.08) + '" stroke="#EF9F27" stroke-width="' + (cur ? sw * 1.6 : sw) + '" pointer-events="none"/>';
            }).join('');
        }
        function findGo(step) {
            if (!find || !find.hits.length) { return; }
            find.i = (find.i + step + find.hits.length) % find.hits.length;
            var id = find.hits[find.i], b = findBox(id), r = svg.getBoundingClientRect();
            if (b && r.width) {
                // Cabe com folga? Senão, afasta até caber.
                var z = Math.min(view.z, (r.width * 0.8) / Math.max(b.w, 1), (r.height * 0.8) / Math.max(b.h, 1));
                view.z = Math.max(0.1, z);
                view.x = r.width / 2 - (b.x + b.w / 2) * view.z;
                view.y = r.height / 2 - (b.y + b.h / 2) * view.z;
                applyView();
            }
            sel = [id];
            findInfo();
            render();
        }
        function findOpen() {
            var box = root.querySelector('.cx-board-findbox');
            if (!box) {
                box = document.createElement('div');
                box.className = 'cx-board-findbox';
                box.innerHTML = '<input type="search" class="cx-board-findq" placeholder="Buscar no quadro" aria-label="Buscar no quadro" autocomplete="off">'
                    + '<span class="cx-board-findn" aria-live="polite"></span>'
                    + '<button type="button" data-fd="-1" title="Anterior (Shift+Enter)">↑</button><button type="button" data-fd="1" title="Próxima (Enter)">↓</button>'
                    + '<button type="button" data-fd="x" title="Fechar (Esc)">✕</button>';
                root.querySelector('.cx-board-stage').appendChild(box);
                var inp = box.querySelector('.cx-board-findq');
                inp.addEventListener('input', function () { findRun(inp.value); if (find.hits.length) { find.i = -1; findGo(1); } });
                inp.addEventListener('keydown', function (e) {
                    e.stopPropagation();
                    if (e.key === 'Enter') { e.preventDefault(); findGo(e.shiftKey ? -1 : 1); }
                    else if (e.key === 'Escape') { e.preventDefault(); findClose(); }
                });
                box.addEventListener('click', function (e) {
                    var b = e.target.closest('[data-fd]'); if (!b) { return; }
                    var v = b.getAttribute('data-fd');
                    if (v === 'x') { findClose(); } else { findGo(+v); }
                });
            }
            if (!find) { find = { q: '', hits: [], i: -1 }; }
            box.hidden = false;
            var q = box.querySelector('.cx-board-findq');
            q.focus(); q.select();
            if (q.value) { findRun(q.value); }
        }
        function findClose() {
            var box = root.querySelector('.cx-board-findbox');
            if (box) { box.hidden = true; }
            find = null;
            drawFind();
            svg.focus && svg.focus();
        }
        function drawSelBody() {
            if (org) {
                gSel.innerHTML = sel.map(function (id) {
                    var it = get(id); if (!it) { return ''; }
                    var pd = it.t === 'orow' ? 0 : 3 / view.z;
                    return '<rect x="' + (it.x - pd) + '" y="' + (it.y - pd) + '" width="' + (it.w + 2 * pd) + '" height="' + (it.h + 2 * pd) + '" rx="' + (it.t === 'orow' ? 2 : 9)
                        + '" fill="' + (it.t === 'orow' ? '#378ADD' : 'none') + '" fill-opacity="0.1" stroke="#378ADD" stroke-width="' + (2 / view.z) + '" pointer-events="none"/>';
                }).join('');
                return;
            }
            gSel.innerHTML = sel.map(function (id) {
                var it = get(id); if (!it) { return ''; }
                if (isPath(it)) {
                    var pw0 = it.t === 'wall' ? (WALL_KINDS[it.mat] || WALL_KINDS[WALL_DEFAULT]).w : (DUCT_KINDS[it.kind] || DUCT_KINDS.eletrocalha).w;
                    var dh = '<path d="' + linkD(it.pts) + '" fill="none" stroke="#378ADD" stroke-opacity="0.35" stroke-width="' + (pw0 + 6 / view.z)
                        + '" stroke-linejoin="miter" pointer-events="none"/>';
                    if (sel.length === 1 && !it.lock) {
                        var r0 = 5 / view.z;
                        it.pts.forEach(function (q, i) {
                            dh += '<rect class="cx-board-dv" data-dv="' + i + '" x="' + (q.x - r0) + '" y="' + (q.y - r0) + '" width="' + (2 * r0) + '" height="' + (2 * r0)
                                + '" fill="#fff" stroke="#378ADD" stroke-width="' + (1.5 / view.z) + '"><title>Arraste para mover; Ctrl + duplo clique apaga o ponto</title></rect>';
                        });
                    }
                    return dh;
                }
                if (it.t === 'link') {
                    var ld = routeD(it, get);
                    return ld ? '<path d="' + ld + '" fill="none" stroke="#378ADD" stroke-opacity="0.35" stroke-width="' + (9 / view.z)
                        + '" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>'
                        + (sel.length === 1 && !it.lock ? linkHandles(it) : '') : '';
                }
                var b = coreBox(it);
                return '<rect x="' + (b.x - 4) + '" y="' + (b.y - 4) + '" width="' + (b.w + 8) + '" height="' + (b.h + 8)
                    + '" fill="none" stroke="#378ADD" stroke-width="' + (1.5 / view.z) + '" stroke-dasharray="' + (5 / view.z) + ' ' + (3 / view.z) + '"/>'
                    + (it.lock ? '<text x="' + (b.x + b.w + 6) + '" y="' + (b.y + 4) + '" font-size="' + (12 / view.z) + '" fill="#378ADD">🔒</text>' : '')
                    + (it.t === 'icon' && sel.length === 1 && !it.lock ? '<rect class="cx-board-rz" data-rzi="' + it.id + '" x="' + (it.x + it.size - 4 / view.z) + '" y="' + (it.y + it.size - 4 / view.z)
                        + '" width="' + (9 / view.z) + '" height="' + (9 / view.z) + '" fill="#fff" stroke="#378ADD" stroke-width="' + (1.5 / view.z) + '"/>' : '')
                    + ((it.t === 'icon' || it.t === 'shape') && sel.length === 1 ? handles(it) : '')
                    + (flow && sel.length === 1 && !it.lock && it.t !== 'lane' ? sizeHandles(it, b) : '')
                    + (!flow && it.t === 'zone' && sel.length === 1 && !it.lock ? '<rect class="cx-board-rz" data-rz="' + it.id + '" x="' + (b.x + b.w - 5 / view.z) + '" y="' + (b.y + b.h - 5 / view.z)
                        + '" width="' + (10 / view.z) + '" height="' + (10 / view.z) + '" fill="#fff" stroke="#378ADD" stroke-width="' + (1.5 / view.z) + '"/>' : '');
            }).join('');
        }

        // Q5c: oito alças de tamanho (forma e moldura); no texto, os quatro
        // cantos (mudam a letra). Na borda tracejada da seleção.
        var RS_CUR = { nw: 'nwse', se: 'nwse', ne: 'nesw', sw: 'nesw', n: 'ns', s: 'ns', e: 'ew', w: 'ew' };
        function sizeHandles(it, b) {
            if (['shape', 'zone', 'text'].indexOf(it.t) < 0) { return ''; }
            // Q5k: no fluxograma o texto ganha as laterais (largura); os cantos mudam a letra.
            var dirs = it.t === 'text' ? (flow ? ['nw', 'ne', 'e', 'se', 'sw', 'w'] : ['nw', 'ne', 'se', 'sw']) : ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
            var x1 = b.x - 4, y1 = b.y - 4, x2 = b.x + b.w + 4, y2 = b.y + b.h + 4, r = 4 / view.z;
            return dirs.map(function (d) {
                var x = d.indexOf('w') >= 0 ? x1 : d.indexOf('e') >= 0 ? x2 : (x1 + x2) / 2;
                var y = d.indexOf('n') >= 0 ? y1 : d.indexOf('s') >= 0 ? y2 : (y1 + y2) / 2;
                return '<rect class="cx-board-rs" data-rs="' + d + '" x="' + (x - r) + '" y="' + (y - r) + '" width="' + (2 * r) + '" height="' + (2 * r)
                    + '" fill="#fff" stroke="#378ADD" stroke-width="' + (1.5 / view.z) + '" style="cursor:' + RS_CUR[d] + '-resize"/>';
            }).join('');
        }
        // Alças de ligação nas quatro bordas (um pouco para fora, longe da alça de tamanho).
        function handles(it) {
            var plus = flow && it.t === 'shape';
            var o = (it.t === 'shape' ? 24 : 10) / view.z, r = (plus ? 7 : 5) / view.z;
            return SIDES.map(function (sd) {
                var a = anchor(it, sd);
                var x = a.x + (sd === 'l' ? o : sd === 'o' ? -o : 0), y = a.y + (sd === 's' ? o : sd === 'n' ? -o : 0);
                var tip = plus ? 'Clique: nova forma ligada nesta direção · Arraste até outra forma para ligar, ou para o vazio para escolher a forma' : 'Puxe até ' + (flow ? 'outra forma' : 'outro ícone') + ' para ligar';
                return '<circle class="cx-board-lh" data-lh="' + sd + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r
                    + '" fill="#378ADD" stroke="#fff" stroke-width="' + (1.5 / view.z) + '"><title>' + tip + '</title></circle>'
                    + (plus ? '<path d="M' + (x - r * 0.5).toFixed(1) + ' ' + y.toFixed(1) + 'H' + (x + r * 0.5).toFixed(1) + 'M' + x.toFixed(1) + ' ' + (y - r * 0.5).toFixed(1) + 'V' + (y + r * 0.5).toFixed(1)
                        + '" stroke="#fff" stroke-width="' + (1.6 / view.z) + '" pointer-events="none"/>' : '');
            }).join('');
        }
        // Alças da ligação selecionada: pontas (religar) e dobras (mover).
        // Dobra nasce com duplo clique no cabo e sai com Ctrl + duplo clique
        // (Claudio, 27/09/2026: o ponto no meio de cada trecho criava dobras
        // a cada arraste).
        function linkHandles(L) {
            var P = linkPts(L, get); if (!P) { return ''; }
            var r = 5 / view.z, sw = 1.5 / view.z, h = '', n = P.length;
            (L.wp || []).forEach(function (q, i) {
                h += '<rect class="cx-board-lw" data-lw="' + i + '" x="' + (q.x - r) + '" y="' + (q.y - r) + '" width="' + (2 * r) + '" height="' + (2 * r)
                    + '" fill="#378ADD" stroke="#fff" stroke-width="' + sw + '"><title>Arraste para mover; Ctrl + duplo clique apaga a dobra</title></rect>';
            });
            [['a', P[0]], ['b', P[n - 1]]].forEach(function (e) {
                h += '<circle class="cx-board-le" data-le="' + e[0] + '" cx="' + e[1].x.toFixed(1) + '" cy="' + e[1].y.toFixed(1) + '" r="' + r
                    + '" fill="#fff" stroke="#378ADD" stroke-width="' + (2 / view.z) + '"><title>Arraste para outra borda ou outro ícone</title></circle>';
            });
            return h;
        }
        // Bloco de metragem do painel da ligação (Q2d).
        function metersPanel(it) {
            if (!it.len) { it.len = { mode: 'auto', m: 0, extra: 10 }; }
            var mt = linkMeters(it, get), manual = it.len.mode === 'manual';
            return '<p class="cx-board-sub">Comprimento</p>'
                + '<label class="cx-board-f"><select data-k="len.mode"><option value="auto"' + (manual ? '' : ' selected') + '>Automático, pelo desenho</option>'
                + '<option value="manual"' + (manual ? ' selected' : '') + '>Manual</option></select></label>'
                + (manual
                    ? '<label class="cx-board-f"><span>Metros</span><input type="text" inputmode="decimal" data-k="len.m" value="' + (it.len.m ? String(it.len.m).replace('.', ',') : '') + '" placeholder="25"></label>'
                    : '<div class="cx-board-row"><label class="cx-board-f"><span>Sobra (%)</span><input type="text" inputmode="numeric" data-k="len.extra" value="' + it.len.extra + '"></label>'
                      + '<p class="cx-board-none cx-board-meters">Medido ' + fmtM(mt.measured) + '<br><strong>Total ' + fmtM(mt.total) + '</strong></p></div>'
                      + (D.pxm ? '' : '<p class="cx-board-none">Sem escala: metros aproximados (1 m = ' + PXM_DEFAULT + ' px). Use "Escala" na barra para medir pela planta.</p>'))
                + '<label class="cx-board-chk"><input type="checkbox" data-k="showM"' + (it.showM ? ' checked' : '') + '> Mostrar os metros no cabo</label>';
        }
        // Em qual trecho (entre o ponto j e o j+1) caiu o duplo clique.
        function segPiece(L, P, j) {
            if (L.route === 'elbow') {
                var n = P.length, q = [P[j]];
                if (j === 0) { q.push(out(P[0], L.a.side, STUB)); }
                if (j === n - 2) { q.push(out(P[n - 1], L.b.side, STUB)); }
                q.push(P[j + 1]);
                return orth(q);
            }
            if (L.route === 'curve') {
                var sg = curveSegs(L, P)[j], o = [];
                for (var k = 0; k <= 16; k++) { o.push(bez(sg, k / 16)); }
                return o;
            }
            return [P[j], P[j + 1]];
        }
        function addBend(L, p) {
            var P = linkPts(L, get); if (!P) { return; }
            var best = 0, bd = Infinity;
            for (var j = 0; j < P.length - 1; j++) { var d = distPoly(p, segPiece(L, P, j)); if (d < bd) { bd = d; best = j; } }
            snap();
            // Ponto exato do clique, sem grade (Claudio, 27/09/2026: a grade não deixava encostar o cabo na parede).
            L.wp.splice(best, 0, { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 });
        }
        // Encaixa na linha/coluna de pontos vizinhos (6 px na tela); Alt solta.
        function alignTo(p, nb, alt) {
            var tol = 6 / view.z, gx = null, gy = null;
            if (!alt) {
                nb.forEach(function (q) {
                    if (!q) { return; }
                    if (gx === null && Math.abs(q.x - p.x) < tol) { gx = q.x; }
                    if (gy === null && Math.abs(q.y - p.y) < tol) { gy = q.y; }
                });
            }
            gGuides.innerHTML = (gx !== null ? '<line x1="' + gx + '" y1="-5000" x2="' + gx + '" y2="5000" stroke="#D4537E" stroke-width="' + (1 / view.z) + '"/>' : '')
                + (gy !== null ? '<line x1="-5000" y1="' + gy + '" x2="5000" y2="' + gy + '" stroke="#D4537E" stroke-width="' + (1 / view.z) + '"/>' : '');
            return { x: Math.round((gx !== null ? gx : p.x) * 10) / 10, y: Math.round((gy !== null ? gy : p.y) * 10) / 10 };
        }
        // Q8-1: material da próxima parede (o último escolhido no painel).
        var wallMat = WALL_DEFAULT;
        // Pontos de encaixe ao desenhar parede: o ponto anterior e os vértices
        // das outras paredes (fecha canto sem caçar pixel). Alt solta.
        function wallNb(last, skipId) {
            var nb = [last];
            D.items.forEach(function (i) { if (i.t === 'wall' && i.id !== skipId) { i.pts.forEach(function (q) { nb.push(q); }); } });
            return nb;
        }
        function draftPreview(cur) {
            if (!ductDraft) { return; }
            var pts = ductDraft.concat(cur ? [cur] : []);
            var wk = tool === 'wall' ? WALL_KINDS[wallMat] : null;
            gGuides.innerHTML += (wk
                ? '<path d="' + linkD(pts) + '" fill="none" stroke="' + wk.c + '" stroke-opacity="0.6" stroke-width="' + wk.w + '"' + (wk.d ? ' stroke-dasharray="' + wk.d + '"' : '') + ' stroke-linejoin="miter" pointer-events="none"/>'
                : '<path d="' + linkD(pts) + '" fill="none" stroke="#888780" stroke-opacity="0.45" stroke-width="12" stroke-linejoin="miter" pointer-events="none"/>')
                + '<text x="' + (pts[pts.length - 1].x + 10 / view.z) + '" y="' + (pts[pts.length - 1].y - 10 / view.z) + '" font-family="Arial,sans-serif" font-size="' + (12 / view.z) + '" fill="#444441">'
                + fmtM(Math.round(polyLen(pts) / PXM * 10) / 10) + '</text>';
        }
        function finishDuct() {
            var pts = ductDraft || [];
            ductDraft = null; gGuides.innerHTML = '';
            if (pts.length >= 2) {
                snap();
                var dct = tool === 'wall'
                    ? { id: uid(), t: 'wall', pts: pts, mat: wallMat, lock: false, g: '' }
                    : { id: uid(), t: 'duct', pts: pts, kind: 'eletrocalha', label: '', showM: true, fs: 'm', lock: false, g: '' };
                D.items.push(dct); sel = [dct.id];
                // Parede escondida não some do desenho que acabou de ser feito.
                if (dct.t === 'wall' && D.wallsOn === false) { D.wallsOn = true; var wc = root.querySelector('[data-act="walls"]'); if (wc) { wc.checked = true; } }
            }
            tool = 'select'; render();
        }
        function iconAt(p) {
            for (var i = D.items.length - 1; i >= 0; i--) {
                var it = D.items[i];
                if (!isNode(it)) { continue; }
                var b = bbox(it);
                if (p.x >= b.x - 4 && p.x <= b.x + b.w + 4 && p.y >= b.y - 4 && p.y <= b.y + b.h + 4) { return it; }
            }
            return null;
        }
        function iconName(it) {
            if (it && it.t === 'shape') { return String(it.text || '').trim().split('\n')[0].slice(0, 40) || SHAPES[it.shape].label; }
            return it ? (it.label || (I.get(it.icon) || {}).name || 'Ícone') : '?';
        }

        /* ---------- painel de propriedades ---------- */
        function field(label, key, val, ph) {
            return '<label class="cx-board-f"><span>' + label + '</span><input type="text" data-k="' + key + '" value="' + esc(val) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '></label>';
        }
        function drawProps() {
            if (org) { orgProps(); return; }
            if (!sel.length) {
                // Q5a-2: fluxograma não tem lista de materiais (cabos, metros).
                props.innerHTML = (flow ? '' : materialsHtml(materials(D, null), 'Materiais deste quadro'))
                    + '<p class="cx-board-none">Selecione um item para editar ' + (flow ? 'o texto.' : 'rótulo e dados.') + '</p>'
                    + '<p class="cx-board-none">Atalhos: Delete exclui · Ctrl+C / Ctrl+V · Ctrl+D duplica · Ctrl+G agrupa · setas movem.</p>';
                return;
            }
            if (sel.length > 1) {
                props.innerHTML = '<p><strong>' + sel.length + ' itens selecionados</strong></p><p class="cx-board-none">Use Agrupar para mover como um conjunto.</p>'
                    + (flow ? '' : materialsHtml(materials(D, sel), 'Materiais da seleção'));
                return;
            }
            var it = get(sel[0]), h = '';
            var optsOf = function (o, v) { return Object.keys(o).map(function (k) { return '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + esc(o[k]) + '</option>'; }).join(''); };
            if (it.t === 'lane') {
                h += '<p><strong>' + esc(LANE_DIR[it.dir]) + '</strong></p>'
                    + field('Título', 'title', it.title, 'Comercial')
                    + '<label class="cx-board-f"><span>Descrição</span><textarea data-k="desc" rows="2" maxlength="200">' + esc(it.desc) + '</textarea></label>'
                    + '<label class="cx-board-f"><span>Ícone</span><select data-k="ico"><option value="">Nenhum</option>'
                    + (it.ico && !Lucide().SVG[it.ico] ? '<option value="' + esc(it.ico) + '" selected>(desconhecido: ' + esc(it.ico) + ')</option>' : '')
                    + Lucide().CATS.map(function (c) {
                        return '<optgroup label="' + esc(c.label) + '">' + c.items.map(function (k) { return '<option value="' + k + '"' + (k === it.ico ? ' selected' : '') + '>' + esc(icoName(k)) + '</option>'; }).join('') + '</optgroup>';
                    }).join('') + '</select></label>'
                    + '<label class="cx-board-f"><span>Cor</span><select data-k="tone">' + Object.keys(FLOW_COLORS).map(function (k) { return '<option value="' + k + '"' + (k === it.tone ? ' selected' : '') + '>' + esc(FLOW_COLORS[k].label) + '</option>'; }).join('') + '</select></label>'
                    + '<p class="cx-board-none">A raia é selecionada pelo cabeçalho. As formas pertencem à raia onde está o centro delas. Excluir a raia não apaga as formas: elas ficam soltas, depois das raias.</p>';
            } else if (it.t === 'shape') {
                h += '<p><strong>' + esc(it.shape === 'ico' ? 'Ícone: ' + icoName(it.ico) : SHAPES[it.shape].label) + '</strong></p>'
                    + (it.shape === 'ico' ? '<label class="cx-board-f"><span>Desenho</span><select data-k="ico">'
                        + (Lucide().SVG[it.ico] ? '' : '<option value="' + esc(it.ico) + '" selected>(desconhecido: ' + esc(it.ico) + ')</option>')
                        + Lucide().CATS.map(function (c) {
                            return '<optgroup label="' + esc(c.label) + '">' + c.items.map(function (k) { return '<option value="' + k + '"' + (k === it.ico ? ' selected' : '') + '>' + esc(icoName(k)) + '</option>'; }).join('') + '</optgroup>';
                        }).join('') + '</select></label>' : '')
                    + (SWAP_SKIP.indexOf(it.shape) < 0 ? '<label class="cx-board-f"><span>Tipo de forma</span><select data-k="shape">'
                        + SHAPE_GROUPS.filter(function (gr) { return gr.k === 'flux' || gr.k === 'bpmn'; }).map(function (gr) {
                            return '<optgroup label="' + esc(gr.label) + '">' + gr.items.filter(function (k) { return k.indexOf(':') < 0 && SWAP_SKIP.indexOf(k) < 0; })
                                .map(function (k) { return '<option value="' + k + '"' + (k === it.shape ? ' selected' : '') + '>' + esc(SHAPES[k].label) + '</option>'; }).join('') + '</optgroup>';
                        }).join('') + '</select></label>' : '')
                    + '<label class="cx-board-f"><span>' + (it.shape === 'ico' ? 'Nome (embaixo)' : 'Texto') + '</span><textarea data-k="text" rows="3">' + esc(it.text) + '</textarea></label>'
                    + '<p class="cx-board-none">Duplo clique na forma (ou comece a digitar com ela selecionada) escreve no lugar; Enter termina, Shift+Enter quebra a linha.</p>'
                    + (MK_OPTS[it.shape] ? '<label class="cx-board-f"><span>' + (it.shape === 'task' ? 'Tipo de tarefa' : 'Tipo de evento') + '</span><select data-k="mk">' + optsOf(MK_OPTS[it.shape], it.mk || 'none') + '</select></label>' : '')
                    + lkPanel(it)
                    + '<label class="cx-board-f"><span>Tamanho da letra</span><select data-k="fs">' + FS_LIST.map(function (v) { return '<option value="' + v + '"' + (v === shapeFs(it) ? ' selected' : '') + '>' + v + '</option>'; }).join('') + '</select></label>'
                    + '<p class="cx-board-none">Tamanho: puxe os quadradinhos brancos (Shift mantém a proporção; Alt solta da grade). A altura nunca fica menor que o texto. Cores, negrito, letra e camadas: na barra sobre a forma.</p>';
            } else if (it.t === 'link' && it.kind === 'fluxo') {
                h += '<p><strong>Ligação</strong></p><p class="cx-board-none">' + esc(iconName(get(it.a.id))) + ' → ' + esc(iconName(get(it.b.id))) + '</p>'
                    + field('Rótulo', 'label', it.label, 'Sim')
                    + '<label class="cx-board-f"><span>Espessura da linha</span><select data-k="lw">' + optsOf(FLOW_W_LABEL, it.lw) + '</select></label>'
                    + '<label class="cx-board-f"><span>Tamanho do texto do rótulo</span><select data-k="fs">' + optsOf({ p: 'Pequeno', m: 'Médio', g: 'Grande' }, it.fs) + '</select></label>'
                    + '<p><button type="button" class="cx-board-btn" data-la="straighten"' + (it.wp.length ? '' : ' disabled') + '>Endireitar (tirar as dobras)</button></p>'
                    + '<p class="cx-board-none">Cor, espessura, traço, pontas, traçado e cor do balão: na barra sobre a ligação. Arraste o balão do rótulo ao longo da linha.</p>'
                    + '<p class="cx-board-none">Duplo clique na ligação cria uma dobra; arraste a dobra para mover; Ctrl + duplo clique apaga. Arraste a bolinha da ponta para outra borda ou outra forma.</p>';
            } else if (it.t === 'icon') {
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
            } else if (it.t === 'link') {
                var opts = function (o, v) { return Object.keys(o).map(function (k) { return '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + esc(o[k]) + '</option>'; }).join(''); };
                var kinds = {}; Object.keys(LINK_KINDS).forEach(function (k) { if (!LINK_KINDS[k].flow) { kinds[k] = LINK_KINDS[k].label; } });
                h += '<p><strong>Ligação ' + esc(it.cable) + '</strong></p><p class="cx-board-none">' + esc(iconName(get(it.a.id))) + ' → ' + esc(iconName(get(it.b.id))) + '</p>'
                    + '<label class="cx-board-f"><span>Tipo de cabo</span><select data-k="kind">' + opts(kinds, it.kind) + '</select></label>'
                    + '<label class="cx-board-f"><span>Traçado</span><select data-k="route">' + opts({ straight: 'Reto', elbow: 'Cotovelo', curve: 'Curvo' }, it.route) + '</select></label>'
                    + '<label class="cx-board-f"><span>Pontas</span><select data-k="ends">' + opts({ none: 'Sem seta', arrow: 'Seta no destino', both: 'Seta nas duas pontas' }, it.ends) + '</select></label>'
                    + '<div class="cx-board-row">' + field('Cabo', 'cable', it.cable, 'P-001') + field('Rótulo', 'label', it.label, 'Uplink') + '</div>'
                    + '<div class="cx-board-row">' + field('Porta origem', 'pa', it.pa, 'Gi0/1') + field('Porta destino', 'pb', it.pb, 'eth0') + '</div>'
                    + '<div class="cx-board-row">' + field('Velocidade', 'vel', it.vel, '1 Gbps') + field('VLAN', 'vlan', it.vlan, '20') + '</div>'
                    + metersPanel(it)
                    + '<label class="cx-board-chk"><input type="checkbox" data-k="poe"' + (it.poe ? ' checked' : '') + '> PoE</label>'
                    + '<label class="cx-board-chk"><input type="checkbox" data-k="showId"' + (it.showId ? ' checked' : '') + '> Mostrar a identificação no cabo</label>'
                    + '<label class="cx-board-f"><span>Tamanho do nome</span><select data-k="fs">' + opts({ p: 'Pequeno', m: 'Médio', g: 'Grande' }, it.fs) + '</select></label>'
                    + '<p><button type="button" class="cx-board-btn" data-la="straighten"' + (it.wp.length ? '' : ' disabled') + '>Endireitar (tirar as dobras)</button></p>'
                    + '<p class="cx-board-none">Para desenhar a passagem: duplo clique no cabo cria uma dobra ali; arraste a dobra (quadrado azul) para mover, ela alinha com a vizinha (segure Alt para posição livre); Ctrl + duplo clique na dobra apaga. Arraste a bolinha da ponta para outra borda ou outro ícone. O nome acompanha o tamanho dos ícones.</p>';
            } else if (it.t === 'duct') {
                var dk = {}; Object.keys(DUCT_KINDS).forEach(function (k) { dk[k] = DUCT_KINDS[k].label; });
                var dopt = function (o, v) { return Object.keys(o).map(function (k) { return '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + esc(o[k]) + '</option>'; }).join(''); };
                h += '<p><strong>' + esc(DUCT_KINDS[it.kind].label) + '</strong></p>'
                    + '<label class="cx-board-f"><span>Tipo</span><select data-k="kind">' + dopt(dk, it.kind) + '</select></label>'
                    + field('Rótulo', 'label', it.label, '100 × 50 mm')
                    + '<p class="cx-board-none cx-board-meters">Comprimento <strong>' + fmtM(ductMeters(it)) + '</strong>' + (D.pxm ? '' : ' (aproximado: sem escala)') + '</p>'
                    + '<label class="cx-board-chk"><input type="checkbox" data-k="showM"' + (it.showM ? ' checked' : '') + '> Mostrar os metros</label>'
                    + '<label class="cx-board-f"><span>Tamanho do nome</span><select data-k="fs">' + dopt({ p: 'Pequeno', m: 'Médio', g: 'Grande' }, it.fs) + '</select></label>'
                    + '<p class="cx-board-none">Arraste o quadrado branco para mover um ponto (alinha com o vizinho; Alt solta). Duplo clique na faixa cria um ponto; Ctrl + duplo clique no ponto apaga. Arraste a faixa para mover tudo.</p>';
            } else if (it.t === 'wall') {
                var wk = WALL_KINDS[it.mat] || WALL_KINDS[WALL_DEFAULT], wopt = Object.keys(WALL_KINDS).map(function (k) {
                    return '<option value="' + k + '"' + (k === it.mat ? ' selected' : '') + '>' + esc(WALL_KINDS[k].label) + '</option>';
                }).join('');
                h += '<p><strong>Parede</strong></p>'
                    + '<label class="cx-board-f"><span>Material</span><select data-k="mat">' + wopt + '</select></label>'
                    + '<p class="cx-board-none cx-board-wloss">Perda ao atravessar: ' + wk.loss.map(function (v, i) { return WALL_BANDS[i] + ' <strong>' + v + ' dB</strong>'; }).join(' · ') + '</p>'
                    + '<p class="cx-board-none cx-board-meters">Comprimento <strong>' + fmtM(wallMeters(it)) + '</strong>' + (D.pxm ? '' : ' (aproximado: sem escala)') + '</p>'
                    + '<p class="cx-board-none">Desenhe por cima das paredes da planta. A próxima parede nasce com o material escolhido aqui. Arraste o quadrado branco para mover um ponto (encaixa nos cantos das outras paredes; Alt solta). Duplo clique na parede cria um ponto; Ctrl + duplo clique no ponto apaga.</p>';
            } else if (it.t === 'zone') {
                h += '<p><strong>' + (flow ? 'Moldura' : D.mode === 'planta' ? 'Área' : 'Zona') + '</strong></p>' + field('Nome', 'label', it.label, flow ? 'Etapa 1 · Triagem' : D.mode === 'planta' ? 'Estoque' : 'VLAN 10 · Administrativo');
            } else if (flow) {
                h += '<p><strong>Texto</strong></p><label class="cx-board-f"><span>Texto</span><textarea data-k="text" rows="3">' + esc(it.text) + '</textarea></label>'
                    + '<label class="cx-board-f"><span>Tamanho da letra</span><select data-k="px">' + FS_LIST.concat([36, 48]).map(function (v) { return '<option value="' + v + '"' + (v === (it.px || TEXT_PX[it.size] || 15) ? ' selected' : '') + '>' + v + '</option>'; }).join('') + '</select></label>'
                    + '<p class="cx-board-none">Cor, negrito, letra e camadas: na barra sobre o texto. Puxe um canto para aumentar a letra; puxe uma lateral para definir a largura (o texto quebra sozinho).</p>'
                    + (it.w > 0 ? '<button type="button" class="cx-board-btn" data-textfree="1" title="Volta a quebrar só no Enter">Tirar a largura</button>' : '');
            } else {
                h += '<p><strong>Texto</strong></p><label class="cx-board-f"><span>Texto</span><textarea data-k="text" rows="3">' + esc(it.text) + '</textarea></label>'
                    + '<label class="cx-board-f"><span>Tamanho</span><select data-k="size"><option value="p"' + (it.size === 'p' ? ' selected' : '') + '>Pequeno</option>'
                    + '<option value="m"' + (it.size === 'm' ? ' selected' : '') + '>Médio</option><option value="g"' + (it.size === 'g' ? ' selected' : '') + '>Grande</option></select></label>';
            }
            if (!flow) {
                h += '<div class="cx-board-sw">' + COLORS.map(function (c) {
                    return it.t === 'icon' || it.t === 'link' || isPath(it) || it.t === 'shape' ? '' : '<button type="button" data-color="' + c + '" style="background:' + c + '" title="Cor" aria-label="Cor"' + (it.color === c ? ' class="is-on"' : '') + '></button>';
                }).join('') + '</div>';
            }
            h += '<p class="cx-board-none">' + (it.lock ? 'Travado: destrave para mover.' : '') + (it.g ? ' Em grupo.' : '') + '</p>';
            props.innerHTML = h;
        }
        /* ---------- Q5h-2: link da forma ---------- */
        function lkPanel(it) {
            if (lkFor !== it.id) { lkFor = it.id; lkMode = ''; }
            var lk = cleanLk(it.lk), t = lk ? lk.t : '', lo = linkOf(it);
            var h = '<label class="cx-board-f"><span>Link</span><select data-lk="t">'
                + [['', 'Nenhum'], ['doc', 'Documento do Codex+'], ['url', 'Endereço (URL)']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === (lkMode || t) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('')
                + '</select></label>';
            var mode = lkMode || t;
            if (mode === 'doc') {
                h += (lk && lk.t === 'doc' ? '<p class="cx-board-lkcur">' + esc(lk.n || ('Documento ' + lk.id)) + '</p>' : '')
                    + '<input type="search" class="cx-board-lkq" placeholder="Buscar documento (título ou código)" autocomplete="off"><div class="cx-board-lkres"></div>';
            } else if (mode === 'url') {
                h += '<input type="url" class="cx-board-lku" data-lk="u" placeholder="https://..." value="' + esc(lk && lk.t === 'url' ? lk.u : '') + '">';
            }
            if (lo) { h += '<p class="cx-board-none"><a href="' + esc(lo.href) + '" target="_blank" rel="noopener noreferrer">Abrir o link ↗</a> · na leitura, clicar na forma abre.</p>'; }
            return h;
        }
        var lkMode = '', lkFor = '', lkTimer = null, lkSeq = 0;
        function lkSet(it, v) { snap(); if (v) { it.lk = v; } else { delete it.lk; } lkMode = ''; paint(); drawSel(); drawProps(); }
        function lkSearch(q) {
            var box = props.querySelector('.cx-board-lkres'); if (!box) { return; }
            var my = ++lkSeq, self = host && host.self ? '&self=' + encodeURIComponent(host.self) : '';
            box.innerHTML = '<p class="cx-board-none">Buscando…</p>';
            fetch(BASE + '/ajax/document.search.php?q=' + encodeURIComponent(q) + self, { credentials: 'same-origin' })
                .then(function (r) { return r.json(); })
                .then(function (j) {
                    box = props.querySelector('.cx-board-lkres');
                    if (my !== lkSeq || !box) { return; }
                    var ds = (j && j.docs) || [];
                    box.innerHTML = ds.length ? ds.map(function (d) {
                        var n = (d.code ? d.code + ' — ' : '') + d.name;
                        return '<button type="button" class="cx-board-lkdoc" data-lkdoc="' + (+d.id | 0) + '" data-n="' + esc(n) + '">' + esc(n) + '</button>';
                    }).join('') : '<p class="cx-board-none">Nenhum documento encontrado.</p>';
                })
                .catch(function () { if (my === lkSeq) { box.innerHTML = '<p class="cx-board-none">Não foi possível buscar agora.</p>'; } });
        }
        props.addEventListener('change', function (e) {
            if (sel.length !== 1) { return; }
            var it = get(sel[0]), a = e.target.getAttribute('data-lk'); if (!it || it.t !== 'shape' || !a) { return; }
            if (a === 't') {
                var v = e.target.value;
                if (!v) { lkSet(it, null); return; }
                lkMode = v; drawProps();
                if (v === 'doc') { lkSearch(''); var q = props.querySelector('.cx-board-lkq'); if (q) { q.focus(); } }
                else { var u = props.querySelector('.cx-board-lku'); if (u) { u.focus(); } }
            } else if (a === 'u') {
                var url = String(e.target.value || '').trim();
                if (!url) { lkSet(it, null); return; }
                if (!URL_OK.test(url) || url.length > 500) { notify(editor, 'Endereço inválido: use um link completo, começando por http:// ou https://.', 'error'); return; }
                lkSet(it, { t: 'url', u: url });
            }
        });
        props.addEventListener('input', function (e) {
            if (!e.target.classList.contains('cx-board-lkq')) { return; }
            var q = e.target.value;
            clearTimeout(lkTimer); lkTimer = setTimeout(function () { lkSearch(q.trim()); }, 250);
        });
        // Q5k: "Tirar a largura" no painel do texto solto (volta a quebrar só no Enter).
        props.addEventListener('click', function (e) {
            if (!e.target.closest('[data-textfree]') || sel.length !== 1) { return; }
            var it = get(sel[0]); if (!it || it.t !== 'text' || !(it.w > 0)) { return; }
            snap(); delete it.w; render();
        });
        props.addEventListener('click', function (e) {
            var b = e.target.closest('[data-lkdoc]'); if (!b || sel.length !== 1) { return; }
            var it = get(sel[0]); if (!it || it.t !== 'shape') { return; }
            lkSet(it, { t: 'doc', id: +b.getAttribute('data-lkdoc') | 0, n: b.getAttribute('data-n') || '' });
        });
        props.addEventListener('input', function (e) {
            var k = e.target.getAttribute('data-k'); if (!k || sel.length !== 1) { return; }
            var it = get(sel[0]);
            if (!props.__snap) { snap(); props.__snap = true; }
            var v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
            if (/^(size|rot|cone\.dir|cone\.fov|cone\.m)$/.test(k) && it.t === 'icon') { v = +v; }
            if (it.t === 'link' && (k === 'len.m' || k === 'len.extra')) {
                v = parseFloat(String(v).replace(',', '.')) || 0;
                v = k === 'len.extra' ? Math.max(0, Math.min(100, Math.round(v))) : Math.max(0, Math.min(10000, Math.round(v * 10) / 10));
            }
            if (k === 'shape' && it.t === 'shape') { changeShape(it, v); props.__snap = false; paint(); drawSel(); drawProps(); return; }
            var p = k.split('.');
            if (p.length === 2) { it[p[0]][p[1]] = v; } else { it[k] = v; }
            if (it.t === 'shape' && k === 'text') { it.text = String(it.text).slice(0, 500); shapeFit(it); }
            if (it.t === 'shape' && k === 'mk') { shapeFit(it); }
            if ((it.t === 'shape' && k === 'fs') || (it.t === 'text' && k === 'px')) { it[k] = +v; if (it.t === 'shape') { shapeFit(it); } }
            if (it.t === 'link' && k === 'kind' && LINK_KINDS[v] && LINK_KINDS[v].arrow && it.ends === 'none') { it.ends = 'arrow'; }
            if (it.t === 'wall' && k === 'mat') { it.mat = WALL_KINDS[v] ? v : WALL_DEFAULT; wallMat = it.mat; }
            paint();
            drawSel();
            if (/^cone\.|^cat$|^size$|^rot$/.test(k) && e.type === 'change') { drawProps(); }
            if (it.t === 'link' && k === 'cable') { var tt = props.querySelector('strong'); if (tt) { tt.textContent = 'Ligação ' + v; } }
            if (it.t === 'link' && k === 'len.extra') {
                var mm = props.querySelector('.cx-board-meters'), lm = linkMeters(it, get);
                if (mm) { mm.innerHTML = 'Medido ' + fmtM(lm.measured) + '<br><strong>Total ' + fmtM(lm.total) + '</strong>'; }
            }
        });
        props.addEventListener('change', function (e) {
            props.__snap = false;
            if (e.target.matches('select,[type=checkbox],[type=range]') && !e.target.hasAttribute('data-lk')) { drawProps(); }
        });
        props.addEventListener('click', function (e) {
            var la = e.target.closest('[data-la]');
            if (la && sel.length === 1 && la.getAttribute('data-la') === 'straighten') {
                var lk = get(sel[0]); if (lk && lk.wp && lk.wp.length) { snap(); lk.wp = []; render(); }
                return;
            }
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

        /* Q5h-1 — trocar a forma (Claudio, 02/10/2026): mantém texto, centro,
           ligações e as cores que a pessoa escolheu; cor que era a padrão do
           tipo antigo vira a padrão do novo. Tamanho: o que estava, menos
           quando um dos dois tipos é quadrado/nome embaixo (aí o do tipo). */
        var SWAP_SKIP = ['ico', 'group'];
        function changeShape(it, v) {
            if (!SHAPES[v] || SWAP_SKIP.indexOf(v) >= 0 || SWAP_SKIP.indexOf(it.shape) >= 0 || v === it.shape) { return; }
            var od = SHAPES[it.shape].color, nd = SHAPES[v].color, cx = it.x + it.w / 2, cy = it.y + it.h / 2;
            var odd = function (k) { return SQUARE.indexOf(k) >= 0 || LABEL_BELOW.indexOf(k) >= 0 || k === 'note' || k === 'annot'; };
            ['fill', 'line', 'ink'].forEach(function (k) { if (it[k] === od) { it[k] = nd; } });
            if (odd(it.shape) || odd(v)) { it.w = 0; it.h = 0; }
            it.shape = v;
            if (MK_OPTS[v]) { it.mk = MK_OPTS[v][it.mk] ? it.mk : 'none'; } else { delete it.mk; }
            shapeFit(it);
            it.x = Math.round(cx - it.w / 2); it.y = Math.round(cy - it.h / 2);
        }
        // Vários deslocamentos de uma vez ({ id: [dx, dy] }): a dobra de uma
        // ligação anda quando as duas pontas andaram igual.
        function moveMap(m) {
            Object.keys(m).forEach(function (id) { var it = get(id); if (it) { it.x += m[id][0]; it.y += m[id][1]; } });
            D.items.forEach(function (l) {
                var a = l.t === 'link' && l.wp && l.wp.length && m[l.a.id], b = a && m[l.b.id];
                if (b && a[0] === b[0] && a[1] === b[1] && (a[0] || a[1])) { l.wp.forEach(function (q) { q.x += a[0]; q.y += a[1]; }); }
            });
        }
        // Q5g: raia nova no fim do conjunto; a primeira ocupa a folha.
        function addLane(dir) {
            var ls = lanesOf(D.items);
            if (ls.length && ls[0].dir !== dir) {
                notify(editor, 'Este fluxograma usa raias ' + (ls[0].dir === 'h' ? 'horizontais' : 'verticais') + '.');
                return null;
            }
            snap();
            var m = LANE[dir], n = ls.length, z = ls[n - 1];
            var it = { id: uid(), t: 'lane', dir: dir, hd: z ? laneHd(z) : m.hd, title: 'Raia ' + (n + 1), desc: '', ico: '', tone: LANE_TONES[n % LANE_TONES.length], lock: false, g: '' };
            if (dir === 'h') { it.x = z ? z.x : 20; it.y = z ? z.y + z.h : 20; it.w = z ? z.w : Math.max(it.hd + 100, D.w - 40); it.h = m.th; }
            else { it.y = z ? z.y : 20; it.x = z ? z.x + z.w : 20; it.h = z ? z.h : Math.max(it.hd + 100, D.h - 40); it.w = m.th; }
            D.items.unshift(it);
            laneLayout(D.items);
            sel = [it.id];
            paleta();
            render();
            return it;
        }

        function addShape(shape, x, y, mk) {
            snap();
            var ck = SHAPES[shape].color;
            var it = { id: uid(), t: 'shape', shape: shape, text: '', fill: ck, line: ck, ink: ck, b: false, x: 0, y: 0, lock: false, g: '' };
            if (MK_OPTS[shape]) { it.mk = MK_OPTS[shape][mk] ? mk : 'none'; }
            // Q5j: no ícone, o data-mk da paleta é a chave do desenho.
            if (shape === 'ico') { it.ico = Lucide().SVG[mk] ? mk : ICO_DEFAULT; it.text = ''; }
            shapeFit(it);
            it.x = Math.round((x - it.w / 2) / GRID) * GRID; it.y = Math.round((y - it.h / 2) / GRID) * GRID;
            // Grupo nasce atrás de tudo (é uma moldura em volta de outras formas).
            if (shape === 'group') { D.items.unshift(it); } else { D.items.push(it); }
            sel = [it.id];
            render();
            return it;
        }

        /* ---------- Q5c: redimensionar pelas alças ---------- */
        function resizeTo(dr, p, e) {
            var it = get(dr.id), s0 = dr.s, d = dr.dir, dx = p.x - dr.p.x, dy = p.y - dr.p.y;
            var x1 = s0.x, y1 = s0.y, x2 = s0.x + s0.w, y2 = s0.y + s0.h;
            var gr = function (v) { return e.altKey ? v : Math.round(v / GRID) * GRID; };
            if (d.indexOf('w') >= 0) { x1 = gr(s0.x + dx); }
            if (d.indexOf('e') >= 0) { x2 = gr(s0.x + s0.w + dx); }
            if (d.indexOf('n') >= 0) { y1 = gr(s0.y + dy); }
            if (d.indexOf('s') >= 0) { y2 = gr(s0.y + s0.h + dy); }
            if (e.shiftKey && d.length === 2 && s0.h > 0) {
                // Shift: mantém a proporção pela largura.
                var nh = (x2 - x1) * s0.h / s0.w;
                if (d.indexOf('n') >= 0) { y1 = y2 - nh; } else { y2 = y1 + nh; }
            }
            var mw = it.t === 'shape' ? shapeMinW(it) : 20;
            if (x2 - x1 < mw) { if (d.indexOf('w') >= 0) { x1 = x2 - mw; } else { x2 = x1 + mw; } }
            if (y2 - y1 < mw) { if (d.indexOf('n') >= 0) { y1 = y2 - mw; } else { y2 = y1 + mw; } }
            if (it.t === 'text' && (d === 'e' || d === 'w')) {
                // Q5k: lateral = largura; a letra fica, o texto quebra dentro.
                it.w = Math.max(TEXT_MIN_W, Math.min(TEXT_MAX_W, Math.round(x2 - x1)));
                it.x = d === 'w' ? x2 - it.w : x1;
                return;
            }
            if (it.t === 'text') {
                var kz = (x2 - x1) / s0.w;
                it.px = Math.max(8, Math.min(96, Math.round(s0.px * kz)));
                // Com largura, o canto aumenta junto (a quebra fica igual, como no Miro).
                if (s0.tw > 0) { it.w = Math.max(TEXT_MIN_W, Math.min(TEXT_MAX_W, Math.round(s0.tw * it.px / s0.px))); }
                var tb = bbox(it);
                it.x = d.indexOf('w') >= 0 ? x2 - tb.w : x1;
                it.y = d.indexOf('n') >= 0 ? y2 - tb.h : y1;
                return;
            }
            it.x = x1; it.y = y1; it.w = x2 - x1; it.h = y2 - y1;
            if (it.t === 'shape') {
                shapeFit(it);
                // Texto pediu mais altura (ou a forma é quadrada): cresce
                // para o lado oposto ao da alça puxada.
                if (d.indexOf('n') >= 0) { it.y = y2 - it.h; }
                if (d.indexOf('w') >= 0) { it.x = x2 - it.w; }
            }
        }

        /* ---------- Q5c: barra flutuante de estilo ---------- */
        var stageEl = root.querySelector('.cx-board-stage'), fbar = null;
        if (flow) {
            fbar = document.createElement('div');
            fbar.className = 'cx-fbar';
            fbar.hidden = true;
            stageEl.appendChild(fbar);
        }
        // Q5c-2: onde o <svg> começa dentro do palco. SVG não tem offsetLeft/
        // offsetTop (só elemento HTML tem): a conta dava NaN e a barra caía
        // no canto de baixo, cortada.
        function svgOff() {
            var a = svg.getBoundingClientRect(), b = stageEl.getBoundingClientRect();
            return { x: (a.left - b.left) || 0, y: (a.top - b.top) || 0 };
        }
        function styled() { return sel.map(get).filter(function (i) { return i && ['shape', 'zone', 'text'].indexOf(i.t) >= 0; }); }
        function swatch(what, k, on) {
            var c = FLOW_COLORS[k], bg = what === 'fill' ? c.f : what === 'line' ? '#fff' : c.t;
            var bd = what === 'line' ? c.s : what === 'fill' ? c.s : c.t;
            return '<button type="button" class="cx-fbar-sw' + (on ? ' is-on' : '') + '" data-what="' + what + '" data-pal="' + k + '" title="' + esc(c.label) + '" aria-label="' + esc(c.label)
                + '" style="background:' + bg + ';border-color:' + bd + (what === 'line' ? ';border-width:3px' : '') + '"></button>';
        }
        // Fundo: só forma. Borda: forma e moldura. Texto: forma e texto.
        function applies(i, what) {
            if (i.t === 'shape') { return !(what === 'fill' && NO_FILL.indexOf(i.shape) >= 0); }
            return what === 'line' ? i.t === 'zone' : what === 'ink' && i.t === 'text';
        }
        function palKeyOf(it, what) {
            if (it.t === 'shape') { return it[what]; }
            var hex = it.color, found = null;
            Object.keys(FLOW_COLORS).forEach(function (k) { if (!found && FLOW_COLORS[k][what === 'line' ? 's' : 't'] === hex) { found = k; } });
            return found;
        }
        function flowLinks() { return sel.map(get).filter(function (i) { return i && i.t === 'link' && i.kind === 'fluxo'; }); }
        function drawLinkBar(ls) {
            var first = ls[0], pop = fbar.__pop || '';
            var sig = ['L', sel.join(','), pop, ls.map(function (l) { return [l.lc, l.lw, l.dash, l.ea, l.eb, l.route, l.lbg].join(':'); }).join(';')].join('|');
            if (fbar.__sig !== sig) {
                fbar.__sig = sig;
                var sel2 = function (key, opts) { return '<select class="cx-fbar-sel" data-lk="' + key + '" title="' + esc({ lw: 'Espessura', dash: 'Traço', ea: 'Ponta no início', eb: 'Ponta no fim', route: 'Traçado' }[key]) + '">'
                    + Object.keys(opts).map(function (k) { return '<option value="' + k + '"' + (first[key] === k ? ' selected' : '') + '>' + esc(opts[k]) + '</option>'; }).join('') + '</select>'; };
                var chip = function (what, label, k) {
                    return '<button type="button" class="cx-fbar-b' + (pop === what ? ' is-on' : '') + '" data-fpop="' + what + '" title="' + label + '"><span class="cx-fbar-sw" style="background:'
                        + (what === 'lbg' ? pal(k).f : '#fff') + ';border-color:' + pal(k).s + (what === 'lc' ? ';border-width:3px' : '') + '"></span> ' + label + '</button>';
                };
                var h = '<div class="cx-fbar-row">' + chip('lc', 'Cor', first.lc)
                    + sel2('lw', FLOW_W_LABEL) + sel2('dash', FLOW_DASH)
                    + '<span class="cx-fbar-sep"></span><span class="cx-fbar-lab">Início</span>' + sel2('ea', FLOW_HEADS) + '<span class="cx-fbar-lab">Fim</span>' + sel2('eb', FLOW_HEADS)
                    + '<span class="cx-fbar-sep"></span>' + sel2('route', { straight: 'Reto', elbow: 'Cotovelo', curve: 'Curvo' }) + chip('lbg', 'Balão', first.lbg) + '</div>';
                if (pop) {
                    h += '<div class="cx-fbar-pop">' + Object.keys(FLOW_COLORS).map(function (k) {
                        var c = FLOW_COLORS[k], on = first[pop] === k;
                        return '<button type="button" class="cx-fbar-sw' + (on ? ' is-on' : '') + '" data-lpal="' + k + '" data-what="' + pop + '" title="' + esc(c.label) + '" aria-label="' + esc(c.label)
                            + '" style="background:' + (pop === 'lbg' ? c.f : c.s) + ';border-color:' + c.s + '"></button>';
                    }).join('') + '</div>';
                }
                fbar.innerHTML = h;
            }
            var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
            ls.forEach(function (l) { (routePts(l, get) || []).forEach(function (q) { x1 = Math.min(x1, q.x); y1 = Math.min(y1, q.y); x2 = Math.max(x2, q.x); y2 = Math.max(y2, q.y); }); });
            if (!isFinite(x1)) { fbar.hidden = true; return; }
            var off = svgOff(), top = off.y + view.y + y1 * view.z - 16, below = top < 70;
            fbar.style.left = (off.x + view.x + (x1 + x2) / 2 * view.z) + 'px';
            fbar.style.top = (below ? off.y + view.y + y2 * view.z + 16 : top) + 'px';
            fbar.classList.toggle('is-below', below);
            fbar.hidden = false;
        }
        /* Q5f: alinhar e distribuir (pela caixa da forma, sem o nome de baixo). */
        var AL_ICON = {
            left: 'M3 2V16M5 5H14M5 12H10', ch: 'M9 2V16M4 5H14M6 12H12', right: 'M15 2V16M4 5H13M8 12H13',
            top: 'M2 3H16M5 5V14M12 5V10', cv: 'M2 9H16M5 4V14M12 6V12', bottom: 'M2 15H16M5 4V13M12 8V13',
            dh: 'M2 3V15M16 3V15M7 6V12M11 6V12', dv: 'M3 2H15M3 16H15M6 7H12M6 11H12'
        };
        var AL_TIP = { left: 'Alinhar à esquerda', ch: 'Centralizar na horizontal', right: 'Alinhar à direita', top: 'Alinhar em cima', cv: 'Centralizar na vertical', bottom: 'Alinhar embaixo', dh: 'Distribuir na horizontal', dv: 'Distribuir na vertical' };
        function alignBtns(n) {
            return ['left', 'ch', 'right', 'top', 'cv', 'bottom'].concat(n >= 3 ? ['dh', 'dv'] : []).map(function (k) {
                return '<button type="button" class="cx-fbar-b cx-fbar-al" data-align="' + k + '" title="' + AL_TIP[k] + '" aria-label="' + AL_TIP[k] + '"><svg viewBox="0 0 18 18" width="15" height="15"><path d="' + AL_ICON[k] + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>';
            }).join('');
        }
        function alignSel(k) {
            var its = styled().filter(function (i) { return !i.lock; });
            if (its.length < 2) { return; }
            snap();
            var bs = its.map(function (i) { return { it: i, b: coreBox(i) }; });
            var x1 = Math.min.apply(null, bs.map(function (o) { return o.b.x; })), x2 = Math.max.apply(null, bs.map(function (o) { return o.b.x + o.b.w; }));
            var y1 = Math.min.apply(null, bs.map(function (o) { return o.b.y; })), y2 = Math.max.apply(null, bs.map(function (o) { return o.b.y + o.b.h; }));
            var mv = function (o, nx, ny) { o.it.x += Math.round(nx - o.b.x); o.it.y += Math.round(ny - o.b.y); };
            if (k === 'dh' || k === 'dv') {
                var h = k === 'dh', sorted = bs.slice().sort(function (a, b) { return h ? a.b.x - b.b.x : a.b.y - b.b.y; });
                var tot = sorted.reduce(function (s0, o) { return s0 + (h ? o.b.w : o.b.h); }, 0);
                var gap = ((h ? x2 - x1 : y2 - y1) - tot) / (sorted.length - 1), at = h ? x1 : y1;
                sorted.forEach(function (o) { if (h) { mv(o, at, o.b.y); at += o.b.w + gap; } else { mv(o, o.b.x, at); at += o.b.h + gap; } });
            } else {
                bs.forEach(function (o) {
                    var b = o.b;
                    if (k === 'left') { mv(o, x1, b.y); } else if (k === 'right') { mv(o, x2 - b.w, b.y); } else if (k === 'ch') { mv(o, (x1 + x2) / 2 - b.w / 2, b.y); }
                    else if (k === 'top') { mv(o, b.x, y1); } else if (k === 'bottom') { mv(o, b.x, y2 - b.h); } else { mv(o, b.x, (y1 + y2) / 2 - b.h / 2); }
                });
            }
            render();
        }
        function drawFbar() {
            if (!fbar) { return; }
            var ls = flowLinks();
            if (ls.length && ls.length === sel.length && !ed && (!drag || drag.k === 'lbl')) { drawLinkBar(ls); return; }
            var its = styled();
            if (!its.length || its.length !== sel.length || ed || (drag && drag.k !== 'rs' && drag.k !== 'move')) { fbar.hidden = true; return; }
            var hasShape = its.some(function (i) { return i.t === 'shape' && NO_FILL.indexOf(i.shape) < 0; }), hasText = its.some(function (i) { return i.t !== 'zone'; });
            var hasLine = its.some(function (i) { return i.t !== 'text'; });
            var first = its[0], pop = fbar.__pop || '';
            var fsNow = first.t === 'shape' ? shapeFs(first) : first.t === 'text' ? (first.px || TEXT_PX[first.size] || 15) : 0;
            var allB = its.filter(function (i) { return i.t !== 'zone'; }).every(function (i) { return i.b; });
            var sig = ['S', sel.join(','), pop, its.map(function (i) { return [i.fill, i.line, i.ink, i.color].join(':'); }).join(';'), allB, fsNow].join('|');
            if (fbar.__sig !== sig) {
                fbar.__sig = sig;
                var btn = function (what, label, show) {
                    if (!show) { return ''; }
                    var k = its.filter(function (i) { return applies(i, what); }).map(function (i) { return palKeyOf(i, what); }).filter(Boolean)[0] || 'branco';
                    return '<button type="button" class="cx-fbar-b' + (pop === what ? ' is-on' : '') + '" data-fpop="' + what + '" title="' + label + '">' + swatch(what, k, false).replace('<button', '<span').replace('</button>', '</span>') + ' ' + label + '</button>';
                };
                var h = '<div class="cx-fbar-row">'
                    + btn('fill', 'Fundo', hasShape) + btn('line', 'Borda', hasLine) + btn('ink', 'Texto', hasText)
                    + (hasText ? '<button type="button" class="cx-fbar-b' + (allB ? ' is-on' : '') + '" data-fb="1" title="Negrito"><b>B</b></button>'
                        + '<select class="cx-fbar-fs" title="Tamanho da letra">' + FS_LIST.concat(FS_LIST.indexOf(fsNow) < 0 && fsNow ? [fsNow] : []).sort(function (a, b) { return a - b; })
                            .map(function (v) { return '<option value="' + v + '"' + (v === fsNow ? ' selected' : '') + '>' + v + '</option>'; }).join('') + '</select>' : '')
                    + '<span class="cx-fbar-sep"></span>'
                    + (its.length >= 2 ? alignBtns(its.length) + '<span class="cx-fbar-sep"></span>' : '')
                    + '<button type="button" class="cx-fbar-b" data-flayer="front" title="Trazer para frente">⬆ Frente</button>'
                    + '<button type="button" class="cx-fbar-b" data-flayer="back" title="Enviar para trás">⬇ Trás</button></div>';
                if (pop) {
                    var cur = (its.filter(function (i) { return applies(i, pop); }).map(function (i) { return palKeyOf(i, pop); })[0]) || '';
                    h += '<div class="cx-fbar-pop">' + Object.keys(FLOW_COLORS).map(function (k) { return swatch(pop, k, k === cur); }).join('') + '</div>';
                }
                fbar.innerHTML = h;
            }
            // Posição: centrada acima da seleção; sem espaço em cima, embaixo.
            var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
            its.forEach(function (i) { var b = bbox(i); x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.w); y2 = Math.max(y2, b.y + b.h); });
            var off = svgOff(), cx = off.x + view.x + (x1 + x2) / 2 * view.z, top = off.y + view.y + y1 * view.z - 14;
            var below = top < 70;
            fbar.style.left = cx + 'px';
            fbar.style.top = (below ? off.y + view.y + y2 * view.z + 14 : top) + 'px';
            fbar.classList.toggle('is-below', below);
            fbar.hidden = false;
        }
        function styleApply(fn) {
            snap();
            styled().forEach(fn);
            render();
        }
        if (fbar) {
            fbar.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            fbar.addEventListener('click', function (e) {
                var t = e.target.closest('button'); if (!t) { return; }
                if (t.hasAttribute('data-fpop')) { var w0 = t.getAttribute('data-fpop'); fbar.__pop = fbar.__pop === w0 ? '' : w0; drawFbar(); return; }
                if (t.hasAttribute('data-pal')) {
                    var what = t.getAttribute('data-what'), k = t.getAttribute('data-pal');
                    styleApply(function (i) {
                        if (i.t === 'shape') { i[what] = k; }
                        else if (i.t === 'zone' && what === 'line') { i.color = FLOW_COLORS[k].s; }
                        else if (i.t === 'text' && what === 'ink') { i.color = FLOW_COLORS[k].t; }
                    });
                    return;
                }
                if (t.hasAttribute('data-fb')) {
                    var all = styled().filter(function (i) { return i.t !== 'zone'; }).every(function (i) { return i.b; });
                    styleApply(function (i) { if (i.t !== 'zone') { i.b = !all; if (i.t === 'shape') { shapeFit(i); } } });
                    return;
                }
                if (t.hasAttribute('data-flayer')) { act(t.getAttribute('data-flayer')); }
                if (t.hasAttribute('data-align')) { alignSel(t.getAttribute('data-align')); return; }
                if (t.hasAttribute('data-lpal')) {
                    var lw0 = t.getAttribute('data-what'), lk = t.getAttribute('data-lpal');
                    snap(); flowLinks().forEach(function (l) { l[lw0] = lk; }); render();
                }
            });
            fbar.addEventListener('change', function (e) {
                if (e.target.matches('.cx-fbar-sel')) {
                    var key = e.target.getAttribute('data-lk'), val = e.target.value;
                    snap();
                    flowLinks().forEach(function (l) { l[key] = val; l.ends = l.eb !== 'none' ? (l.ea !== 'none' ? 'both' : 'arrow') : 'none'; });
                    render();
                    return;
                }
                if (!e.target.matches('.cx-fbar-fs')) { return; }
                var v = +e.target.value;
                styleApply(function (i) { if (i.t === 'shape') { i.fs = v; shapeFit(i); } else if (i.t === 'text') { i.px = v; } });
            });
        }

        /* ---------- Q5b: texto no lugar (duplo clique ou começar a digitar) ---------- */
        var ed = null;
        function editEnd(keep) {
            if (!ed) { return; }
            var e0 = ed; ed = null;
            var it = get(e0.id);
            if (keep && it && it.text !== e0.ta.value) { snap(); it.text = e0.ta.value.slice(0, 500); shapeFit(it); }
            e0.ta.remove();
            render();
            drawFbar();
        }
        function editStart(it, first) {
            if (ed || !it || it.t !== 'shape' || it.lock) { return; }
            var stage = root.querySelector('.cx-board-stage'), ta = document.createElement('textarea');
            ta.className = 'cx-board-inplace';
            ta.value = first !== undefined ? first : (it.text || '');
            var fs = shapeFs(it) * view.z;
            var off = svgOff(), bx = it.x, by = it.y, bw = it.w, bh = it.h;
            // BPMN: o nome é escrito embaixo da forma; no grupo, no canto de cima.
            if (/^gw/.test(it.shape)) { bw = labelW(it); bh = shapeFs(it) * 3.6; bx = it.x + it.w * 0.3 - bw; by = it.y - bh - 2; }
            else if (below(it)) { bw = labelW(it); bx = it.x + it.w / 2 - bw / 2; by = it.y + it.h + 2; bh = shapeFs(it) * 3.6; }
            else if (it.shape === 'group') { bh = Math.min(it.h, shapeFs(it) * 3); }
            ta.style.cssText = 'left:' + (off.x + view.x + bx * view.z) + 'px;top:' + (off.y + view.y + by * view.z) + 'px;width:' + (bw * view.z)
                + 'px;height:' + (bh * view.z) + 'px;font-size:' + fs + 'px;color:' + pal(it.ink).t + (it.b ? ';font-weight:bold' : '');
            stage.appendChild(ta);
            ed = { id: it.id, ta: ta };
            drawFbar();
            ta.addEventListener('keydown', function (ev) {
                ev.stopPropagation();
                if (ev.key === 'Escape') { ev.preventDefault(); editEnd(false); }
                else if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); editEnd(true); }
            });
            ta.addEventListener('blur', function () { editEnd(true); });
            ta.focus();
            if (first === undefined) { ta.select(); } else { ta.setSelectionRange(ta.value.length, ta.value.length); }
        }

        /* ---------- arraste da paleta ---------- */
        root.querySelector('.cx-board-icons').addEventListener('click', function (e) {
            var lb = e.target.closest('[data-lane]');
            if (lb) { if (!lb.disabled) { addLane(lb.getAttribute('data-lane')); } return; }
            var gb = e.target.closest('[data-grp]'); if (!gb) { return; }
            palShut[gb.getAttribute('data-grp')] = !palShut[gb.getAttribute('data-grp')];
            paleta();
        });
        root.querySelector('.cx-board-icons').addEventListener('pointerdown', function (e) {
            var b = e.target.closest('[data-icon],[data-shape]'); if (!b) { return; }
            e.preventDefault();
            var shape = b.getAttribute('data-shape'), pmk = b.getAttribute('data-mk') || '';
            var icon = b.getAttribute('data-icon'), moved = false, sx = e.clientX, sy = e.clientY;
            var ghost = document.createElement('div');
            ghost.className = 'cx-board-ghost';
            ghost.innerHTML = shape ? b.querySelector('svg').outerHTML : '<svg viewBox="0 0 48 48" width="48" height="48">' + I.body(icon) + '</svg>';
            function mv(ev) {
                if (!moved && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 5) { return; }
                if (!moved) { moved = true; document.body.appendChild(ghost); }
                ghost.style.left = (ev.clientX - 24) + 'px'; ghost.style.top = (ev.clientY - 24) + 'px';
            }
            function up(ev) {
                document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
                if (ghost.parentNode) { ghost.remove(); }
                var r = svg.getBoundingClientRect();
                var put = function (x, y) { if (shape) { addShape(shape, x, y, pmk); } else { addIcon(icon, x, y); } };
                if (!moved) {
                    var c = toBoard({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
                    put(c.x, c.y);
                } else if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
                    var p = toBoard(ev); put(p.x, p.y);
                }
            }
            document.addEventListener('pointermove', mv);
            document.addEventListener('pointerup', up);
        });

        /* ---------- quadro: ponteiro ---------- */
        var space = false, drag = null, scaleA = null, lastDown = { t: 0, x: 0, y: 0 };
        svg.addEventListener('pointerdown', function (e) {
            if (org) { orgDown(e); return; }
            miniClose();
            var p = toBoard(e);
            // Duplo clique detectado aqui: com a captura do ponteiro, o dblclick
            // do navegador chega no quadro e não na dobra (achado do Q2c).
            var now = Date.now(), dbl = now - lastDown.t < 400 && Math.abs(e.clientX - lastDown.x) + Math.abs(e.clientY - lastDown.y) < 8;
            lastDown = dbl ? { t: 0, x: 0, y: 0 } : { t: now, x: e.clientX, y: e.clientY };
            if (dbl && tool === 'select') {
                var lwAttr = e.target.getAttribute && e.target.getAttribute('data-lw');
                if (lwAttr !== null && lwAttr !== undefined && (e.ctrlKey || e.metaKey) && sel.length === 1) {
                    var lk0 = get(sel[0]); snap(); lk0.wp.splice(+lwAttr, 1); drag = null; render(); return;
                }
                var dvAttr = e.target.getAttribute && e.target.getAttribute('data-dv');
                if (dvAttr !== null && dvAttr !== undefined && (e.ctrlKey || e.metaKey) && sel.length === 1) {
                    var dd0 = get(sel[0]);
                    if (dd0.pts.length > 2) { snap(); dd0.pts.splice(+dvAttr, 1); }
                    drag = null; render(); return;
                }
                var hid = hit(e.target), hl = hid && get(hid);
                // Q5d: duplo clique no balão edita o rótulo (não cria dobra).
                if (hl && hl.t === 'link' && e.target.getAttribute && e.target.getAttribute('data-lbl')) {
                    sel = [hl.id]; drag = null; render();
                    var lf = props.querySelector('[data-k="label"]'); if (lf) { lf.focus(); lf.select(); }
                    return;
                }
                if (hl && hl.t === 'link' && !hl.lock && !(e.ctrlKey || e.metaKey)) {
                    addBend(hl, p); sel = [hl.id]; drag = null; render(); return;
                }
                if (isPath(hl) && !hl.lock && !(e.ctrlKey || e.metaKey)) {
                    var bj = 0, bdd = Infinity;
                    for (var sj = 0; sj < hl.pts.length - 1; sj++) { var dq = distPoly(p, [hl.pts[sj], hl.pts[sj + 1]]); if (dq < bdd) { bdd = dq; bj = sj; } }
                    snap(); hl.pts.splice(bj + 1, 0, { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 });
                    sel = [hl.id]; drag = null; render(); return;
                }
            }
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
            } else if (e.target.getAttribute('data-le') && sel.length === 1) {
                drag = { k: 'end', id: sel[0], end: e.target.getAttribute('data-le') };
            } else if (tool === 'duct' || tool === 'wall') {
                // Eletrocalha e parede: cada clique é um ponto; duplo clique termina.
                if (dbl && ductDraft) { finishDuct(); return; }
                var lastQ = ductDraft && ductDraft[ductDraft.length - 1];
                var dq0 = alignTo(p, tool === 'wall' ? wallNb(lastQ) : [lastQ], e.altKey);
                if (!ductDraft) { ductDraft = [dq0]; } else { ductDraft.push(dq0); }
                gGuides.innerHTML = ''; draftPreview(null);
                return;
            } else if (e.target.getAttribute('data-dv') && sel.length === 1) {
                drag = { k: 'dv', id: sel[0], j: +e.target.getAttribute('data-dv'), moved: false };
            } else if (e.target.getAttribute('data-lw') && sel.length === 1) {
                drag = { k: 'wp', id: sel[0], j: +e.target.getAttribute('data-lw'), moved: false };
            } else if (flow && e.target.getAttribute('data-lbl') && tool === 'select' && !space) {
                // Q5d: o balão do rótulo desliza ao longo da linha.
                var lid = hit(e.target), lL = lid && get(lid);
                if (lL && lL.t === 'link' && !lL.lock) { sel = [lL.id]; snap(); drag = { k: 'lbl', id: lL.id, moved: false }; }
                else if (lL) { sel = [lL.id]; }
            } else if (e.target.getAttribute('data-rs') && sel.length === 1) {
                var ri = get(sel[0]), rb = coreBox(ri);
                snap();
                drag = { k: 'rs', id: ri.id, dir: e.target.getAttribute('data-rs'), p: p, s: { x: rb.x, y: rb.y, w: rb.w, h: rb.h, px: ri.px || TEXT_PX[ri.size] || 15, tw: ri.t === 'text' ? ri.w || 0 : 0 } };
            } else if (e.target.getAttribute('data-lh') && sel.length === 1) {
                var from = get(sel[0]), sd = e.target.getAttribute('data-lh');
                drag = { k: 'link', from: from.id, side: sd, a: anchor(from, sd), cx0: e.clientX, cy0: e.clientY };
            } else if (flow && tool === 'select' && e.target.getAttribute('data-lhd')) {
                // Q5g-3: cabeçalho maior ou menor; o corpo das raias anda junto
                // (o comprimento cresce o mesmo tanto) e as formas acompanham.
                var lsH = lanesOf(D.items), mvH = [];
                lsH.forEach(function (l) { mvH = mvH.concat(laneMembers(D.items, l)); });
                drag = { k: 'lhd', p: p, hd0: laneHd(lsH[0]), len0: lsH[0].dir === 'h' ? lsH[0].w : lsH[0].h, moved: false,
                    st: mvH.map(function (id) { var o = get(id); return { id: id, x: o.x, y: o.y }; }),
                    lw: D.items.filter(function (l) { return l.t === 'link' && l.wp && l.wp.length && mvH.indexOf(l.a.id) >= 0 && mvH.indexOf(l.b.id) >= 0; })
                        .map(function (l) { return { id: l.id, wp: clone(l.wp) }; }) };
            } else if (flow && tool === 'select' && (e.target.getAttribute('data-lrz') || e.target.getAttribute('data-llen'))) {
                // Q5g-2: espessura de uma raia (as seguintes andam com as formas
                // delas) ou comprimento de todas.
                var lsD = lanesOf(D.items), l0 = lsD[0], hzD = l0.dir === 'h';
                if (e.target.getAttribute('data-llen')) {
                    drag = { k: 'llen', p: p, len0: hzD ? l0.w : l0.h, moved: false };
                } else {
                    var lr = get(e.target.getAttribute('data-lrz')), ix = lsD.indexOf(lr), mv0 = [];
                    lsD.slice(ix + 1).forEach(function (l) { mv0 = mv0.concat(laneMembers(D.items, l)); });
                    drag = { k: 'lrz', id: lr.id, p: p, th0: hzD ? lr.h : lr.w, moved: false,
                        st: mv0.map(function (id) { var o = get(id); return { id: id, x: o.x, y: o.y }; }),
                        lw: D.items.filter(function (l) { return l.t === 'link' && l.wp && l.wp.length && mv0.indexOf(l.a.id) >= 0 && mv0.indexOf(l.b.id) >= 0; })
                            .map(function (l) { return { id: l.id, wp: clone(l.wp) }; }) };
                    sel = [lr.id];
                }
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
                    label: flow ? 'Moldura' : D.mode === 'planta' ? 'Área' : 'Zona', color: COLORS[D.items.filter(function (i) { return i.t === 'zone'; }).length % COLORS.length], lock: false, g: '' };
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
                    var hitL = get(id);
                    if (hitL && hitL.t === 'lane' && !e.shiftKey && tool === 'select') {
                        // Q5g-2: arrastar o cabeçalho troca a ordem das raias.
                        sel = [id];
                        drag = { k: 'lreord', id: id, p: p, moved: false, to: -1 };
                        try { svg.setPointerCapture(e.pointerId); } catch (err) { /* sem captura */ }
                        render();
                        return;
                    }
                    var movable = sel.filter(function (s) { var it = get(s); return it && !it.lock && it.t !== 'link' && it.t !== 'lane'; });
                    drag = { k: 'move', p: p, start: movable.map(function (s) {
                            var it = get(s);
                            if (isPath(it)) { var bb = bbox(it); return { id: s, x: bb.x, y: bb.y, pts: clone(it.pts) }; }
                            return { id: s, x: it.x, y: it.y };
                        }), moved: false,
                        // Ligação com os dois ícones no conjunto: as dobras andam junto.
                        lw: D.items.filter(function (l) { return l.t === 'link' && l.wp.length && movable.indexOf(l.a.id) >= 0 && movable.indexOf(l.b.id) >= 0; })
                            .map(function (l) { return { id: l.id, wp: clone(l.wp) }; }) };
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
            if (org) { orgMove(e); return; }
            if ((tool === 'duct' || tool === 'wall') && ductDraft && !drag) {
                var lq = ductDraft[ductDraft.length - 1], pc = toBoard(e), qc = alignTo(pc, tool === 'wall' ? wallNb(lq) : [lq], e.altKey);
                draftPreview(qc);
                return;
            }
            if (!drag) { return; }
            var p = toBoard(e);
            if (drag.k === 'dv') {
                if (!drag.moved) { snap(); drag.moved = true; }
                var dv = get(drag.id);
                dv.pts[drag.j] = alignTo(p, dv.t === 'wall' ? wallNb(dv.pts[drag.j - 1], dv.id).concat([dv.pts[drag.j + 1]]) : [dv.pts[drag.j - 1], dv.pts[drag.j + 1]], e.altKey);
                paint(); drawSel(); return;
            }
            if (drag.k === 'pan') {
                view.x = drag.vx + e.clientX - drag.sx; view.y = drag.vy + e.clientY - drag.sy; applyView(); return;
            }
            if (drag.k === 'wp') {
                if (!drag.moved) { snap(); drag.moved = true; }
                // Livre, sem grade; gruda na mesma linha/coluna da dobra ou ponta
                // vizinha (6 px na tela), com guia rosa. Alt desliga o encaixe.
                var lw = get(drag.id), P = linkPts(lw, get), nb = [P[drag.j], P[drag.j + 2]], tol = 6 / view.z;
                var wx = p.x, wy = p.y, gx = null, gy = null;
                if (!e.altKey) {
                    nb.forEach(function (q) {
                        if (!q) { return; }
                        if (gx === null && Math.abs(q.x - p.x) < tol) { gx = q.x; }
                        if (gy === null && Math.abs(q.y - p.y) < tol) { gy = q.y; }
                    });
                }
                if (gx !== null) { wx = gx; }
                if (gy !== null) { wy = gy; }
                lw.wp[drag.j] = { x: Math.round(wx * 10) / 10, y: Math.round(wy * 10) / 10 };
                gGuides.innerHTML = (gx !== null ? '<line x1="' + gx + '" y1="-5000" x2="' + gx + '" y2="5000" stroke="#D4537E" stroke-width="' + (1 / view.z) + '"/>' : '')
                    + (gy !== null ? '<line x1="-5000" y1="' + gy + '" x2="5000" y2="' + gy + '" stroke="#D4537E" stroke-width="' + (1 / view.z) + '"/>' : '');
                paint(); drawSel(); return;
            }
            if (drag.k === 'end') {
                var le = get(drag.id), other = le[drag.end === 'a' ? 'b' : 'a'].id, al = iconAt(p), gl = '';
                if (al && al.id !== other) {
                    var alb = bbox(al), aa = anchor(al, nearestSide(al, p));
                    gl = '<rect x="' + (alb.x - 4) + '" y="' + (alb.y - 4) + '" width="' + (alb.w + 8) + '" height="' + (alb.h + 8) + '" fill="none" stroke="#378ADD" stroke-width="' + (2 / view.z) + '"/>'
                        + '<circle cx="' + aa.x + '" cy="' + aa.y + '" r="' + (5 / view.z) + '" fill="#378ADD"/>';
                }
                gGuides.innerHTML = gl + '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (4 / view.z) + '" fill="none" stroke="#378ADD" stroke-width="' + (1.5 / view.z) + '"/>';
                return;
            }
            if (drag.k === 'link') {
                var alvo = iconAt(p), gh = '';
                if (alvo && alvo.id !== drag.from) {
                    var ab = bbox(alvo), na = anchor(alvo, nearestSide(alvo, p));
                    gh = '<rect x="' + (ab.x - 4) + '" y="' + (ab.y - 4) + '" width="' + (ab.w + 8) + '" height="' + (ab.h + 8) + '" fill="none" stroke="#378ADD" stroke-width="' + (2 / view.z) + '"/>'
                        + '<circle cx="' + na.x + '" cy="' + na.y + '" r="' + (5 / view.z) + '" fill="#378ADD"/>';
                    p = na;
                }
                gGuides.innerHTML = gh + '<line x1="' + drag.a.x + '" y1="' + drag.a.y + '" x2="' + p.x + '" y2="' + p.y
                    + '" stroke="#378ADD" stroke-width="' + (2 / view.z) + '" stroke-dasharray="' + (6 / view.z) + ' ' + (4 / view.z) + '"/>';
                return;
            }
            if (drag.k === 'rs') { resizeTo(drag, p, e); paint(); drawSel(); return; }
            if (drag.k === 'lbl') {
                var LL = get(drag.id), rp = routePts(LL, get);
                if (rp) { LL.lt = Math.max(0.05, Math.min(0.95, Math.round(nearestT(rp, p) * 1000) / 1000)); drag.moved = true; paint(); drawSel(); }
                return;
            }
            if (drag.k === 'rzi') {
                var ic = get(drag.id);
                ic.size = Math.max(24, Math.min(160, Math.round(Math.max(p.x - ic.x, p.y - ic.y) / 4) * 4));
                paint();
                drawSel(); return;
            }
            if (drag.k === 'lhd') {
                var lsH2 = lanesOf(D.items), f2 = lsH2[0], hz2 = f2.dir === 'h', m2 = LANE[f2.dir], d2 = hz2 ? p.x - drag.p.x : p.y - drag.p.y;
                if (!drag.moved) { if (Math.abs(d2) < 2) { return; } snap(); drag.moved = true; }
                var nh = Math.max(m2.hmin, Math.min(m2.hmax, Math.round((drag.hd0 + d2) / GRID) * GRID)), sh2 = nh - drag.hd0;
                f2.hd = nh;
                if (hz2) { f2.w = Math.min(6000, drag.len0 + sh2); } else { f2.h = Math.min(6000, drag.len0 + sh2); }
                laneLayout(D.items);
                drag.st.forEach(function (s) { var o = get(s.id); if (hz2) { o.x = s.x + sh2; } else { o.y = s.y + sh2; } });
                drag.lw.forEach(function (s) { get(s.id).wp = s.wp.map(function (q) { return hz2 ? { x: q.x + sh2, y: q.y } : { x: q.x, y: q.y + sh2 }; }); });
                paint();
                drawSel(); return;
            }
            if (drag.k === 'lrz' || drag.k === 'llen') {
                var lsM = lanesOf(D.items), hzM = lsM[0].dir === 'h', dd = hzM ? (drag.k === 'lrz' ? p.y - drag.p.y : p.x - drag.p.x) : (drag.k === 'lrz' ? p.x - drag.p.x : p.y - drag.p.y);
                if (!drag.moved) { if (Math.abs(dd) < 2) { return; } snap(); drag.moved = true; }
                if (drag.k === 'llen') {
                    var len = Math.max(laneHd(lsM[0]) + 100, Math.min(6000, Math.round((drag.len0 + dd) / GRID) * GRID));
                    if (hzM) { lsM[0].w = len; } else { lsM[0].h = len; }
                    laneLayout(D.items);
                } else {
                    var lr2 = get(drag.id), th = Math.max(LANE[lr2.dir].min, Math.min(3000, Math.round((drag.th0 + dd) / GRID) * GRID)), sh = th - drag.th0;
                    if (hzM) { lr2.h = th; } else { lr2.w = th; }
                    laneLayout(D.items);
                    drag.st.forEach(function (s) { var o = get(s.id); if (hzM) { o.y = s.y + sh; } else { o.x = s.x + sh; } });
                    drag.lw.forEach(function (s) { get(s.id).wp = s.wp.map(function (q) { return hzM ? { x: q.x, y: q.y + sh } : { x: q.x + sh, y: q.y }; }); });
                }
                paint();
                drawSel(); return;
            }
            if (drag.k === 'lreord') {
                var lsR = lanesOf(D.items), hzR = lsR[0].dir === 'h', me = get(drag.id);
                if (!drag.moved && Math.abs(hzR ? p.y - drag.p.y : p.x - drag.p.x) < 6) { return; }
                drag.moved = true;
                var rest = lsR.filter(function (l) { return l !== me; }), c = hzR ? p.y : p.x;
                drag.to = rest.filter(function (l) { return (hzR ? l.y + l.h / 2 : l.x + l.w / 2) < c; }).length;
                // Linha de onde a raia vai entrar.
                var pos = rest.length ? (drag.to < rest.length ? (hzR ? rest[drag.to].y : rest[drag.to].x) : (hzR ? rest[rest.length - 1].y + rest[rest.length - 1].h : rest[rest.length - 1].x + rest[rest.length - 1].w)) : 0;
                var a0 = lsR[0], sw = 4 / view.z;
                gGuides.innerHTML = hzR
                    ? '<line x1="' + a0.x + '" y1="' + pos + '" x2="' + (a0.x + a0.w) + '" y2="' + pos + '" stroke="#378ADD" stroke-width="' + sw + '"/>'
                    : '<line x1="' + pos + '" y1="' + a0.y + '" x2="' + pos + '" y2="' + (a0.y + a0.h) + '" stroke="#378ADD" stroke-width="' + sw + '"/>';
                return;
            }
            if (drag.k === 'zone' || drag.k === 'rz') {
                var z = get(drag.id);
                if (drag.k === 'zone') {
                    z.x = Math.min(drag.ox, Math.round(p.x / GRID) * GRID); z.y = Math.min(drag.oy, Math.round(p.y / GRID) * GRID);
                    z.w = Math.max(20, Math.abs(Math.round(p.x / GRID) * GRID - drag.ox)); z.h = Math.max(20, Math.abs(Math.round(p.y / GRID) * GRID - drag.oy));
                } else {
                    z.w = Math.max(20, Math.round((p.x - z.x) / GRID) * GRID); z.h = Math.max(20, Math.round((p.y - z.y) / GRID) * GRID);
                }
                paint();
                drawSel(); return;
            }
            if (drag.k === 'marq') {
                var x = Math.min(p.x, drag.p.x), y = Math.min(p.y, drag.p.y), w = Math.abs(p.x - drag.p.x), h = Math.abs(p.y - drag.p.y);
                marq.removeAttribute('hidden');
                marq.setAttribute('x', x); marq.setAttribute('y', y); marq.setAttribute('width', w); marq.setAttribute('height', h);
                var dentro = D.items.filter(function (it) { if (it.t === 'link' || it.t === 'lane' || (it.t === 'wall' && !wallsShown(D))) { return false; } var b = bbox(it); return b.x >= x && b.y >= y && b.x + b.w <= x + w && b.y + b.h <= y + h; })
                    .map(function (it) { return it.id; });
                sel = drag.base.concat(expand(dentro).filter(function (i) { return drag.base.indexOf(i) < 0; }));
                drawSel(); return;
            }
            if (drag.k === 'move' && drag.start.length) {
                if (!drag.moved) { snap(); drag.moved = true; }
                var dx = p.x - drag.p.x, dy = p.y - drag.p.y;
                // Guias: o centro do primeiro item gruda no centro de outro item (6 px).
                var first = get(drag.start[0].id), b0 = coreBox(first);
                var cx = drag.start[0].x + dx + b0.w / 2, cy = drag.start[0].y + dy + b0.h / 2;
                var gx = null, gy = null;
                D.items.forEach(function (o) {
                    if (drag.start.some(function (s) { return s.id === o.id; }) || o.t === 'zone' || o.t === 'link' || isPath(o) || o.t === 'lane') { return; }
                    var b = coreBox(o), ox = b.x + b.w / 2, oy = b.y + b.h / 2;
                    if (gx === null && Math.abs(ox - cx) < SNAP / view.z) { gx = ox; }
                    if (gy === null && Math.abs(oy - cy) < SNAP / view.z) { gy = oy; }
                });
                var ddx = gx !== null ? dx + (gx - cx) : Math.round((drag.start[0].x + dx) / GRID) * GRID - drag.start[0].x;
                var ddy = gy !== null ? dy + (gy - cy) : Math.round((drag.start[0].y + dy) / GRID) * GRID - drag.start[0].y;
                drag.start.forEach(function (s) {
                    var it = get(s.id);
                    if (s.pts) { it.pts = s.pts.map(function (q) { return { x: Math.round((q.x + ddx) * 10) / 10, y: Math.round((q.y + ddy) * 10) / 10 }; }); return; }
                    it.x = s.x + ddx; it.y = s.y + ddy;
                });
                (drag.lw || []).forEach(function (s) { get(s.id).wp = s.wp.map(function (q) { return { x: q.x + ddx, y: q.y + ddy }; }); });
                gGuides.innerHTML = (gx !== null ? '<line x1="' + gx + '" y1="-5000" x2="' + gx + '" y2="5000" stroke="#D4537E" stroke-width="' + (1 / view.z) + '"/>' : '')
                    + (gy !== null ? '<line x1="-5000" y1="' + gy + '" x2="5000" y2="' + gy + '" stroke="#D4537E" stroke-width="' + (1 / view.z) + '"/>' : '');
                paint();
                drawSel();
            }
        });
        svg.addEventListener('pointerup', function (e) {
            if (org) { orgUp(e); return; }
            svg.classList.remove('is-panning');
            if (drag && drag.k === 'end') {
                // Religar: outra borda do mesmo ícone ou outro ícone; no vazio, nada muda.
                var pe = toBoard(e), Le = get(drag.id), oth = Le[drag.end === 'a' ? 'b' : 'a'].id, ti = iconAt(pe);
                if (ti && ti.id !== oth) {
                    var ns = nearestSide(ti, pe);
                    if (ti.id !== Le[drag.end].id || ns !== Le[drag.end].side) { snap(); Le[drag.end] = { id: ti.id, side: ns }; }
                }
            }
            if (drag && drag.k === 'link') {
                // Soltar no vazio não cria nada (forma ligada é do Fluxograma, Q5).
                var pUp = toBoard(e), tgt = iconAt(pUp);
                var still = Math.abs(e.clientX - drag.cx0) + Math.abs(e.clientY - drag.cy0) < 5;   // clique, não arraste
                if (tgt && tgt.id !== drag.from && !still) {
                    snap();
                    sel = [makeLink(drag.from, drag.side, tgt.id, nearestSide(tgt, pUp)).id];
                } else if (flow && get(drag.from) && get(drag.from).t === 'shape') {
                    // Q5f: clique na bolinha = "+" rápido; soltar no vazio = mini-paleta.
                    if (still) { quickAdd(get(drag.from), drag.side); }
                    else if (!tgt) { miniOpen(drag.from, drag.side, pUp); }
                }
            }
            if (drag && drag.k === 'lreord' && drag.moved) {
                // Q5g-2: nova ordem; cada raia leva as formas dela.
                var lsU = lanesOf(D.items), meU = get(drag.id);
                var ord = lsU.filter(function (l) { return l !== meU; });
                ord.splice(Math.max(0, drag.to), 0, meU);
                if (ord.some(function (l, i) { return l !== lsU[i]; })) {
                    snap();
                    var hzU = lsU[0].dir === 'h', memU = {}, cur = hzU ? lsU[0].y : lsU[0].x;
                    lsU.forEach(function (l) { memU[l.id] = laneMembers(D.items, l); });
                    var mm = {};
                    ord.forEach(function (l) {
                        var d0 = cur - (hzU ? l.y : l.x);
                        if (hzU) { l.y = cur; cur += l.h; } else { l.x = cur; cur += l.w; }
                        memU[l.id].forEach(function (id) { mm[id] = hzU ? [0, d0] : [d0, 0]; });
                    });
                    moveMap(mm);
                    laneLayout(D.items);
                }
            }
            if (drag && drag.k === 'zone') { tool = 'select'; }
            if (drag && drag.k === 'lbl' && !drag.moved) { hist.pop(); }
            if (drag && drag.k === 'move' && !drag.moved) { /* só seleção */ }
            drag = null;
            marq.setAttribute('hidden', '');
            gGuides.innerHTML = '';
            render();
        });
        /* ---------- Q5f: ligação nova, "+" rápido e mini-paleta ---------- */
        function makeLink(fromId, side, toId, toSide) {
            var L = { id: uid(), t: 'link', a: { id: fromId, side: side }, b: { id: toId, side: toSide },
                kind: LINK_DEFAULT, route: 'elbow', wp: [], ends: 'none', label: '', cable: nextCable(D.items),
                pa: '', pb: '', vel: '', vlan: '', poe: false, showId: true, fs: 'm',
                len: { mode: 'auto', m: 0, extra: 10 }, showM: true, lock: false, g: '' };
            if (flow) {
                // Q5b: ligação de fluxo — cotovelo com seta; a 1ª saída
                // da decisão nasce "Sim", a 2ª "Não" (dá para editar).
                var orig = get(fromId), saidas = D.items.filter(function (l) { return l.t === 'link' && l.a.id === fromId; }).length;
                L.kind = 'fluxo'; L.ends = 'arrow'; L.cable = ''; L.showId = false; L.showM = false;
                L.lc = 'cinza'; L.lw = 'f'; L.dash = 'solid'; L.ea = 'none'; L.eb = 'arrow'; L.lt = 0.5; L.lbg = 'branco';
                L.label = orig && (orig.shape === 'dec' || orig.shape === 'gwx') ? (saidas === 0 ? 'Sim' : saidas === 1 ? 'Não' : '') : '';
            }
            D.items.push(L);
            return L;
        }
        // Forma nova com o lado `toSide` encostado no ponto p (grade de 10).
        function shapeAt(k, mk, p, toSide) {
            var ck = SHAPES[k].color;
            var it = { id: uid(), t: 'shape', shape: k, text: '', fill: ck, line: ck, ink: ck, b: false, x: 0, y: 0, lock: false, g: '' };
            if (MK_OPTS[k]) { it.mk = MK_OPTS[k][mk] ? mk : 'none'; }
            if (k === 'ico') { it.ico = Lucide().SVG[mk] ? mk : ICO_DEFAULT; } // Q5k: ícone pela mini-paleta
            shapeFit(it);
            it.x = p.x - it.w / 2; it.y = p.y - it.h / 2;
            if (toSide === 'o') { it.x = p.x; } else if (toSide === 'l') { it.x = p.x - it.w; }
            else if (toSide === 'n') { it.y = p.y; } else if (toSide === 's') { it.y = p.y - it.h; }
            it.x = Math.round(it.x / GRID) * GRID; it.y = Math.round(it.y / GRID) * GRID;
            return it;
        }
        function overlaps(it) {
            return D.items.some(function (o) {
                if (o.id === it.id || o.t === 'link' || o.t === 'zone' || (o.t === 'shape' && o.shape === 'group')) { return false; }
                var b = coreBox(o);
                return it.x < b.x + b.w + 10 && it.x + it.w + 10 > b.x && it.y < b.y + b.h + 10 && it.y + it.h + 10 > b.y;
            });
        }
        // "+" rápido: próxima forma na direção da bolinha, centrada na origem,
        // 90 de espaço (cabe o balão Sim/Não com folga); se o lugar estiver
        // ocupado, anda mais um passo.
        var GAP = 90;
        function quickAdd(from, side) {
            snap();
            var k = nextShapeOf(from.shape), a = anchor(from, side), cb = coreBox(from);
            var dir = { n: [0, -1], s: [0, 1], l: [1, 0], o: [-1, 0] }[side];
            var it = shapeAt(k, '', { x: 0, y: 0 }, OPP[side]);
            var place = function (step) {
                var d = GAP + step * (GAP + (dir[0] ? it.w : it.h));
                if (dir[0]) { it.x = dir[0] > 0 ? cb.x + cb.w + d : cb.x - d - it.w; it.y = cb.y + cb.h / 2 - it.h / 2; }
                else { it.y = dir[1] > 0 ? cb.y + cb.h + d : cb.y - d - it.h; it.x = cb.x + cb.w / 2 - it.w / 2; }
                it.x = Math.round(it.x); it.y = Math.round(it.y);
            };
            var n = 0; place(0);
            while (overlaps(it) && n < 8) { n++; place(n); }
            D.items.push(it);
            makeLink(from.id, side, it.id, OPP[side]);
            sel = [it.id];
            render();
            return it;
        }
        var mini = null;
        function miniClose() { if (mini) { mini.el.remove(); mini = null; } }
        function miniOpen(fromId, side, p) {
            miniClose();
            var el = document.createElement('div'), off = svgOff();
            el.className = 'cx-mini';
            el.innerHTML = MINI.map(function (k) {
                var ck = SHAPES[k].color, demo = shapeFit({ id: 'm', t: 'shape', shape: k, x: 2, y: 2, sz: SQUARE.indexOf(k) >= 0 ? 'm' : 'p', text: '', fill: ck, line: ck, ink: ck, mk: 'none' });
                return '<button type="button" data-mshape="' + k + '" title="' + esc(SHAPES[k].label) + '"><svg viewBox="0 0 ' + (demo.w + 4) + ' ' + (demo.h + 4) + '" width="40" height="26">' + shapeSvg(demo, true) + '</svg></button>';
            }).join('') + '<button type="button" class="cx-mini-more" data-mmore="1" title="Mais formas (todas, com busca)" aria-label="Mais formas">…</button>';
            el.style.left = (off.x + view.x + p.x * view.z) + 'px';
            el.style.top = (off.y + view.y + p.y * view.z) + 'px';
            var stage = root.querySelector('.cx-board-stage');
            stage.appendChild(el);
            el.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
            el.addEventListener('wheel', function (ev) { ev.stopPropagation(); }, { passive: true });
            el.addEventListener('input', function (ev) {
                if (ev.target.classList.contains('cx-mini-q')) { el.querySelector('.cx-mini-list').innerHTML = miniList(ev.target.value); }
            });
            el.addEventListener('click', function (ev) {
                if (ev.target.closest('[data-mmore]')) {
                    // Q5k: "…" = todas as formas por seção, com busca, no lugar das 9.
                    el.classList.add('is-full');
                    el.innerHTML = '<input type="search" class="cx-mini-q form-control" placeholder="Buscar forma ou ícone" aria-label="Buscar forma ou ícone">'
                        + '<div class="cx-mini-list">' + miniList('') + '</div>';
                    // Não sair do quadro: encolhe para dentro da área visível.
                    var sr = stage.getBoundingClientRect(), er = el.getBoundingClientRect();
                    if (er.right > sr.right - 4) { el.style.left = Math.max(0, parseFloat(el.style.left) - (er.right - sr.right + 12)) + 'px'; }
                    if (er.bottom > sr.bottom - 4) { el.style.top = Math.max(0, parseFloat(el.style.top) - (er.bottom - sr.bottom + 12)) + 'px'; }
                    el.querySelector('.cx-mini-q').focus();
                    return;
                }
                var b = ev.target.closest('[data-mshape]'); if (!b) { return; }
                var from = get(fromId); miniClose(); if (!from) { return; }
                snap();
                // A forma nasce com o lado de frente para a origem no ponto solto.
                var ts = Math.abs(p.x - anchor(from, side).x) > Math.abs(p.y - anchor(from, side).y) ? (p.x > anchor(from, side).x ? 'o' : 'l') : (p.y > anchor(from, side).y ? 'n' : 's');
                var it = shapeAt(b.getAttribute('data-mshape'), b.getAttribute('data-mk') || '', p, ts);
                D.items.push(it);
                makeLink(fromId, side, it.id, ts);
                sel = [it.id];
                render();
            });
            mini = { el: el, from: fromId, side: side, p: p };
        }
        /**
         * Q5k: lista completa da mini-paleta — as seções Fluxograma e BPMN (sem
         * o grupo, que é moldura e não se liga) e os ícones genéricos, como na
         * paleta lateral. Buscando, só o que bate e as seções vazias somem.
         */
        function miniList(q) {
            var fq = norm(q), hit = function (t) { return !fq || norm(t).indexOf(fq) >= 0; };
            var btn = function (key) {
                var k = key.split(':')[0], mk = key.split(':')[1] || '', name = k === 'ico' ? icoName(mk || ICO_DEFAULT) : PRESETS[key] || SHAPES[k].label;
                var ck = SHAPES[k].color, small = ['conn', 'offpage', 'dataobj'].indexOf(k) >= 0 || SQUARE.indexOf(k) >= 0;
                var demo = shapeFit({ id: 'm', t: 'shape', shape: k, x: 2, y: 2, sz: small ? 'm' : 'p', text: '', fill: ck, line: ck, ink: ck, mk: mk || 'none', ico: mk || ICO_DEFAULT });
                return '<button type="button" class="cx-mini-ic" data-mshape="' + k + '"' + (mk ? ' data-mk="' + esc(mk) + '"' : '') + ' title="' + esc(name) + '">'
                    + '<svg viewBox="0 0 ' + (demo.w + 4) + ' ' + (demo.h + 4) + '" width="40" height="26">' + shapeSvg(demo, true) + '</svg><span>' + esc(name) + '</span></button>';
            };
            var h = SHAPE_GROUPS.map(function (gr) {
                var body = '';
                if (gr.k === 'lane') { return ''; }
                if (gr.k === 'ico') {
                    body = Lucide().CATS.map(function (c) {
                        var ks = c.items.filter(function (k) { return hit(icoName(k) + ' ' + k + ' ' + c.label + ' ícone'); });
                        return ks.length ? '<div class="cx-mini-sub">' + esc(c.label) + '</div><div class="cx-mini-grid">' + ks.map(function (k) { return btn('ico:' + k); }).join('') + '</div>' : '';
                    }).join('');
                } else {
                    var ks = gr.items.filter(function (key) { return key !== 'group' && hit((PRESETS[key] || SHAPES[key.split(':')[0]].label) + ' ' + gr.label); });
                    body = ks.length ? '<div class="cx-mini-grid">' + ks.map(btn).join('') + '</div>' : '';
                }
                return body ? '<div class="cx-mini-sec">' + esc(gr.label) + '</div>' + body : '';
            }).join('');
            return h || '<p class="cx-mini-none">Nada encontrado.</p>';
        }

        svg.addEventListener('wheel', function (e) {
            e.preventDefault();
            var r = svg.getBoundingClientRect();
            if (e.shiftKey) { view.x -= e.deltaY || e.deltaX; applyView(); }
            else { zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top); }
            drawSel();
        }, { passive: false });
        svg.addEventListener('dblclick', function (e) {
            if (org) { return; }
            var id = hit(e.target); if (!id || ['link', 'duct', 'wall'].indexOf((get(id) || {}).t) >= 0) { return; }
            if (get(id).t === 'shape') { sel = [id]; render(); editStart(get(id)); return; }
            sel = [id]; render();
            var f = props.querySelector('[data-k="label"],[data-k="text"],[data-k="title"]'); if (f) { f.focus(); f.select(); }
        });

        /* ---------- teclado ---------- */
        function typing() { var a = document.activeElement; return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && root.contains(a); }
        function onKey(e) {
            if (ni) { if (e.key === 'Escape') { e.preventDefault(); niClose(); } return; }
            if (io) { if (e.key === 'Escape') { e.preventDefault(); ioClose(); } return; }
            // Q6c: diálogo do organograma aberto: Esc fecha (mesmo com o cursor
            // num campo dele); as outras teclas ficam com o diálogo.
            if (org && odlg) { if (e.key === 'Escape') { e.preventDefault(); orgDlgClose(); } return; }
            if (xmOpen() && e.key === 'Escape') { e.preventDefault(); xmShow(false); return; }
            if (ed) { return; }
            if (mini && e.key === 'Escape') { e.preventDefault(); miniClose(); return; }
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f') { e.preventDefault(); findOpen(); return; }
            if (e.key === ' ' && !typing()) { space = true; e.preventDefault(); return; }
            if (typing()) { if (e.key === 'Escape') { document.activeElement.blur(); } return; }
            if (org) {
                // Q6b-1: no organograma, só desfazer/refazer e Esc (edição pelo
                // teclado chega com o painel de edição).
                var oc = e.ctrlKey || e.metaKey, ok = e.key.toLowerCase();
                if (ok === 'escape') { e.preventDefault(); if (sel.length) { sel = []; render(); } else { close(); } }
                else if (oc && ok === 'z') { e.preventDefault(); if (e.shiftKey) { redoIt(); } else { undo(); } }
                else if (oc && ok === 'y') { e.preventDefault(); redoIt(); }
                else if ((ok === 'delete' || ok === 'backspace') && sel.length === 1) {
                    e.preventDefault(); var db = props.querySelector('[data-oa="del"]'); if (db && !db.disabled) { db.click(); }
                }
                return;
            }
            if (tool === 'duct' || tool === 'wall') {
                if (e.key === 'Enter') { e.preventDefault(); finishDuct(); return; }
                if (e.key === 'Escape') { e.preventDefault(); ductDraft = null; gGuides.innerHTML = ''; tool = 'select'; render(); return; }
            }
            var ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
            // Q5b: forma selecionada + tecla de texto começa a escrever nela;
            // Enter (ou F2) abre o texto que já existe.
            var one = sel.length === 1 && get(sel[0]);
            if (flow && one && one.t === 'shape' && !ctrl && !e.altKey) {
                if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); editStart(one); return; }
                if (e.key.length === 1 && e.key !== ' ') { e.preventDefault(); editStart(one, e.key); return; }
            }
            if (k === 'escape') { if (sel.length) { sel = []; render(); } else { close(); } e.preventDefault(); return; }
            if (ctrl && k === 'z') { e.preventDefault(); if (e.shiftKey) { redoIt(); } else { undo(); } return; }
            if (ctrl && k === 'y') { e.preventDefault(); redoIt(); return; }
            if (ctrl && k === 'g') { e.preventDefault(); act(e.shiftKey ? 'ungroup' : 'group'); return; }
            if (ctrl && k === 'c') { clip = withLinks(sel); e.preventDefault(); return; }
            if (ctrl && (k === 'v' || k === 'd')) {
                e.preventDefault();
                var src = k === 'd' ? withLinks(sel) : clip;
                if (!src || !src.length) { return; }
                snap();
                var mapa = {}, ids = {}, novos = [];
                src.filter(function (o) { return o.t !== 'link'; }).forEach(function (o) {
                    var n = clone(o); n.id = uid(); ids[o.id] = n.id;
                    if (isPath(n)) { n.pts.forEach(function (q) { q.x += 20; q.y += 20; }); } else { n.x += 20; n.y += 20; }
                    if (n.g) { mapa[n.g] = mapa[n.g] || uid(); n.g = mapa[n.g]; }
                    D.items.push(n); novos.push(n.id);
                });
                // Ligação só vai junto se os dois ícones foram copiados.
                src.filter(function (o) { return o.t === 'link' && ids[o.a.id] && ids[o.b.id]; }).forEach(function (o) {
                    var n = clone(o); n.id = uid(); n.a.id = ids[o.a.id]; n.b.id = ids[o.b.id];
                    if (/^P-\d+$/.test(n.cable || '')) { n.cable = nextCable(D.items); }
                    n.wp = (n.wp || []).map(function (q) { return { x: q.x + 20, y: q.y + 20 }; });
                    if (n.g) { mapa[n.g] = mapa[n.g] || uid(); n.g = mapa[n.g]; }
                    D.items.push(n); novos.push(n.id);
                });
                sel = novos;
                if (k === 'v') { clip = withLinks(sel); }
                render(); return;
            }
            if (k === 'delete' || k === 'backspace') { e.preventDefault(); act('del'); return; }
            if (k === 'v') { tool = 'select'; render(); return; }
            if (k === 'z') { tool = 'zone'; render(); return; }
            if (k === 't') { tool = 'text'; render(); return; }
            if (k === 'e' && !flow) { tool = 'duct'; ductDraft = null; render(); return; }
            if (k === 'p' && D.mode === 'planta') { tool = 'wall'; ductDraft = null; render(); return; }
            if (k === 'r') { act('rotate'); return; }
            var mv = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[k];
            if (mv && sel.length) {
                e.preventDefault(); snap();
                var step = e.shiftKey ? GRID : 1;
                sel.forEach(function (id) {
                    var it = get(id); if (it.lock || it.t === 'link' || it.t === 'lane') { return; }
                    if (isPath(it)) { it.pts.forEach(function (q) { q.x += mv[0] * step; q.y += mv[1] * step; }); return; }
                    it.x += mv[0] * step; it.y += mv[1] * step;
                });
                render();
            }
        }
        // Selecionados + ligações cujos dois ícones estão na seleção.
        function withLinks(ids) {
            var out = ids.map(get).filter(function (i) { return i && i.t !== 'lane'; });
            D.items.forEach(function (i) {
                if (i.t === 'link' && ids.indexOf(i.id) < 0 && ids.indexOf(i.a.id) >= 0 && ids.indexOf(i.b.id) >= 0) { out.push(i); }
            });
            return out.map(clone);
        }
        function onKeyUp(e) { if (e.key === ' ') { space = false; } }
        document.addEventListener('keydown', onKey, true);
        document.addEventListener('keyup', onKeyUp, true);

        /* ---------- ações da barra ---------- */
        function act(a) {
            if (org && a === 'onew') {
                var T0 = OD().tree(D.org), s0 = sel.length === 1 && orgNode(sel[0]);
                orgAdd(s0 ? s0.id : (T0.top && T0.top.id) || ''); return;
            }
            if (org && a === 'oniveis') { orgLevelsDlg(); return; }
            if (org && a === 'omodelos') { orgModelsDlg(); return; }
            if (org && a === 'arrumar') {
                snap(); D.org.nodes.forEach(function (n) { delete n.x; delete n.y; }); render(); setTimeout(fit, 0); return;
            }
            if (org && ['group', 'ungroup', 'lock', 'del', 'rotate', 'smaller', 'bigger', 'png'].indexOf(a) >= 0) { return; }
            if (a === 'group' && sel.length > 1) { snap(); var g = uid(); sel.forEach(function (id) { if (get(id).t !== 'lane') { get(id).g = g; } }); render(); }
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
            else if (a === 'del' && sel.length) {
                snap();
                var lsB = lanesOf(D.items), lPos = {}, lMem = {};
                lsB.forEach(function (l) { lPos[l.id] = { x: l.x, y: l.y, w: l.w, h: l.h }; lMem[l.id] = laneMembers(D.items, l).filter(function (m) { return sel.indexOf(m) < 0; }); });
                D.items = D.items.filter(function (i) { return sel.indexOf(i.id) < 0; });
                if (lsB.some(function (l) { return sel.indexOf(l.id) >= 0; })) {
                    var lsA = laneLayout(D.items), dm = {};
                    lsA.forEach(function (l) { lMem[l.id].forEach(function (id) { dm[id] = [l.x - lPos[l.id].x, l.y - lPos[l.id].y]; }); });
                    if (lsA.length) {
                        var lz = lsA[lsA.length - 1], cur = lz.dir === 'h' ? lz.y + lz.h + 40 : lz.x + lz.w + 40;
                        lsB.filter(function (l) { return sel.indexOf(l.id) >= 0; }).forEach(function (l) {
                            var o = lPos[l.id], v = lz.dir === 'h' ? [0, cur - o.y] : [cur - o.x, 0];
                            lMem[l.id].forEach(function (id) { dm[id] = v; });
                            cur += lz.dir === 'h' ? o.h : o.w;
                        });
                    }
                    moveMap(dm);
                }
                // Ligação sem um dos ícones sai junto.
                D.items = D.items.filter(function (i) { return i.t !== 'link' || (get(i.a.id) && get(i.b.id)); });
                sel = []; render();
            }
            else if ((a === 'front' || a === 'back') && sel.length) {
                // Q5c: ordem dentro da própria camada (moldura continua no
                // fundo, ligações sob as formas: o desenho separa por tipo).
                snap();
                var mv = D.items.filter(function (i) { return sel.indexOf(i.id) >= 0; }), rest = D.items.filter(function (i) { return sel.indexOf(i.id) < 0; });
                D.items = a === 'front' ? rest.concat(mv) : mv.concat(rest);
                render();
            }
            else if (a === 'undo') { undo(); }
            else if (a === 'redo') { redoIt(); }
            else if (a === 'zin' || a === 'zout') { var r = svg.getBoundingClientRect(); zoomAt(a === 'zin' ? 1.2 : 1 / 1.2, r.width / 2, r.height / 2); drawSel(); }
            else if (a === 'fit') { fit(); drawSel(); }
            else if (a === 'find') { findOpen(); }
            else if (a === 'mm') {
                mmOn = !mmOn;
                var mb = root.querySelector('[data-act="mm"]'); mb.classList.toggle('is-on', mmOn); mb.setAttribute('aria-pressed', String(mmOn));
                drawMM();
            }
            else if (a === 'bg') { pickBg(); }
            else if (a === 'rot') { rotate(); }
            else if (a === 'bgdel') { snap(); bgUrl = ''; bgChanged = false; root.querySelector('[data-act="bgdel"]').hidden = true; root.querySelector('[data-act="rot"]').hidden = true; render(); }
            else if (a === 'png') { downloadPng(); }
            else if (a === 'imp') { xmShow(false); ioOpen(); }
            else if (a === 'exp') { xmShow(!xmOpen()); }
            else if (a === 'expjson') { xmShow(false); exportJson(); }
            else if (a === 'expmd') { xmShow(false); exportMd(); }
            else if (a === 'cancel') { close(); }
            else if (a === 'save') { save(); }
        }
        root.querySelector('.cx-board-top').addEventListener('click', function (e) {
            var t = e.target.closest('[data-tool]');
            if (t) { tool = t.getAttribute('data-tool'); ductDraft = null; gGuides.innerHTML = ''; render(); return; }
            var b = e.target.closest('button[data-act]');
            if (b) { act(b.getAttribute('data-act')); }
        });
        var op = root.querySelector('[data-act="op"]');
        if (op) { op.addEventListener('input', function () { D.bgOpacity = +op.value / 100; render(); }); }
        var pgSel = root.querySelector('[data-act="page"]');
        if (pgSel) {
            pgSel.addEventListener('change', function () {
                if (pgSel.value === 'custom') { root.querySelector('.cx-board-pagec').hidden = false; root.querySelector('[data-pg="w"]').focus(); return; }
                var p = pgSel.value.split('x'); setPage(p[0], p[1]); pgSel.blur();
            });
            root.querySelectorAll('[data-pg]').forEach(function (i) {
                i.addEventListener('change', function () { setPage(root.querySelector('[data-pg="w"]').value, root.querySelector('[data-pg="h"]').value); });
            });
        }
        var lgChk = root.querySelector('[data-act="legend"]');
        if (lgChk) { lgChk.addEventListener('change', function () { D.legend = lgChk.checked; }); }
        // Q8-1: camada de paredes. Escondida, sai da tela, do PNG e da legenda.
        var wlChk = root.querySelector('[data-act="walls"]');
        if (wlChk) {
            wlChk.addEventListener('change', function () {
                snap(); D.wallsOn = wlChk.checked;
                if (!D.wallsOn) { sel = sel.filter(function (id) { var i = get(id); return i && i.t !== 'wall'; }); if (tool === 'wall') { tool = 'select'; ductDraft = null; } }
                render();
            });
        }

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
                var ROT = { n: 'l', l: 's', s: 'o', o: 'n' };
                D.items.forEach(function (it) {
                    if (isPath(it)) {
                        it.pts = it.pts.map(function (q) { return { x: H - q.y, y: q.x }; });
                        return;
                    }
                    if (it.t === 'link') {
                        it.a.side = ROT[it.a.side]; it.b.side = ROT[it.b.side];
                        it.wp = (it.wp || []).map(function (q) { return { x: H - q.y, y: q.x }; });
                        return;
                    }
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
            btn.disabled = true; btn.textContent = host ? 'Salvando…' : 'Gerando…';
            D.lib = libOf(D.items);
            if (org) { orgNormPos(); }   // Q6f-2: nunca grava posição negativa
            if (host) {
                // Q5a: quem grava é o documento DIA (ajax/diagram.save.php).
                Promise.resolve().then(function () { return host.save(clone(D)); }).then(close).catch(function (err) {
                    btn.disabled = false; btn.textContent = saveLabel;
                    notify(editor, 'Não foi possível salvar o ' + MODES[D.mode].toLowerCase() + (err && err.message ? ' (' + err.message + ')' : '') + '. O quadro continua aberto: tente de novo.', 'error');
                });
                return;
            }
            toPng(D, bgUrl || null).then(function (png) {
                return (D.legend ? legendPng(D) : Promise.resolve(null)).then(function (lp) { return [png, lp]; });
            }).then(function (r) {
                var png = r[0];
                var ok = apply(editor, node, D, png, bgUrl ? { url: bgUrl, changed: bgChanged } : null, r[1]);
                if (!ok) { notify(editor, 'Área de envio de arquivos não encontrada: o quadro não será gravado.', 'error'); }
                close();
            }).catch(function () {
                btn.disabled = false; btn.textContent = saveLabel;
                notify(editor, 'Não foi possível gerar a imagem do quadro.', 'error');
            });
        }

        /* Q2f (Claudio, 27/09/2026): o PNG do quadro em arquivo, para mandar
           por WhatsApp ou e-mail sem exportar o documento. Mesmo toPng() do
           Salvar, com o estado atual (inclusive o que ainda não foi salvo).
           Nome: planta|topologia-<título do documento>-AAAA-MM-DD.png. */
        function downloadPng() {
            var btn = root.querySelector('[data-act="png"]');
            if (btn.disabled) { return; }
            btn.disabled = true; btn.textContent = 'Gerando…';
            var done = function () { btn.disabled = false; btn.textContent = 'Baixar PNG'; };
            toPng(D, bgUrl || null).then(function (blob) {
                var a = document.createElement('a');
                var url = URL.createObjectURL(blob);
                a.href = url;
                a.download = pngName(D.mode, null, host && host.title);
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
                done();
            }).catch(function () {
                done();
                notify(editor, 'Não foi possível gerar a imagem do quadro.', 'error');
            });
        }

        /* ---------- Q5i-1: importar e exportar o fluxo em arquivo ----------
           (Claudio, 03/10/2026). Tudo no navegador: nada vai ao servidor até
           \"Salvar fluxograma\". Arquivo do Codex+ = { formato, versao, origem,
           titulo, exportado, quadro }. Importar aceita também o quadro puro
           ({ mode, items }) e o registro do DIA ({ kind, board }). O que entra
           passa pelo clean() do motor; substituir grava um passo no histórico,
           então Ctrl+Z desfaz só a importação. */
        var io = null;   // janela de importar aberta
        function xmOpen() { var m = root.querySelector('.cx-board-xm'); return !!(m && !m.hidden); }
        function xmShow(on) {
            var m = root.querySelector('.cx-board-xm'), b = root.querySelector('[data-act="exp"]');
            if (!m) { return; }
            m.hidden = !on;
            b.classList.toggle('is-on', !!on); b.setAttribute('aria-expanded', String(!!on));
            if (on) { document.addEventListener('pointerdown', xmAway, true); } else { document.removeEventListener('pointerdown', xmAway, true); }
        }
        function xmAway(e) { if (!e.target.closest || !e.target.closest('.cx-board-xw')) { xmShow(false); } }

        function ioName(ext) {
            // Título que já começa com o nome do modo não repete a palavra.
            return pngName(D.mode, null, host && host.title).replace(/^organograma-organograma(?=[-.])/, 'organograma').replace(/\.png$/, ext);
        }
        function exportJson() {
            var q = clone(D);
            if (org) { q = { v: 1, mode: 'organograma', org: clone(D.org) }; delete q.org.__norm; } else { q.lib = libOf(q.items); }
            var pack = { formato: IO_FORMAT, versao: IO_VERSION, origem: location.origin, titulo: String(host && host.title || ''),
                exportado: new Date().toISOString(), quadro: q };
            if (D.mode === 'planta' && bgUrl && BG_OK.test(bgUrl)) { pack.planta = bgUrl; }
            var blob = new Blob([JSON.stringify(pack, null, 1)], { type: 'application/json' });
            var a = document.createElement('a'), url = URL.createObjectURL(blob);
            a.href = url;
            a.download = ioName('.json');
            a.style.display = 'none';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        }

        // Q5i-3: Mermaid em .md, para levar a uma IA.
        function exportMd() {
            var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
            var when = p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
            var txt = org ? orgToMermaid(D.org, String(host && host.title || ''), when) : boardToMermaid(D, String(host && host.title || ''), when);
            var blob = new Blob([txt], { type: 'text/markdown;charset=utf-8' });
            var a = document.createElement('a'), url = URL.createObjectURL(blob);
            a.href = url;
            a.download = ioName('-ia.md');
            a.style.display = 'none';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        }

        function ioClose() {
            if (!io) { return; }
            document.removeEventListener('paste', ioPaste, true);
            io.el.remove(); io = null;
        }
        function ioOpen(file) {
            if (io) { return; }
            var el = document.createElement('div');
            el.className = 'cx-io-back';
            root.appendChild(el);
            io = { el: el, got: null };
            // Clique fora da caixa fecha (como o Cancelar).
            el.addEventListener('pointerdown', function (e) { if (e.target === el) { ioClose(); } });
            document.addEventListener('paste', ioPaste, true);
            ioPick();
            if (file) { ioFile(file); }
        }
        // Tela 1: escolher o arquivo, arrastar ou colar.
        function ioPick(err) {
            var oW = IO_NOUN[D.mode] || 'fluxo', copia = !flow && !org;
            io.el.innerHTML = '<div class="cx-io" role="dialog" aria-modal="true" aria-label="Importar ' + oW + '">'
                + '<h3>Importar ' + oW + '</h3>'
                + '<p class="cx-io-sub">' + (copia ? 'Traga uma cópia guardada do Codex+ (Exportar cópia).' : 'Traga ' + (org ? 'um organograma' : 'um fluxo') + ' feito por uma IA ou uma cópia guardada do Codex+.') + ' Nada é gravado até você clicar em ' + saveLabel + '.</p>'
                + '<div class="cx-io-drop" data-io="drop"><div class="cx-io-big">Arraste o arquivo para cá</div>'
                + '<div class="cx-io-sm">' + (copia ? 'Cópias do Codex+ (.json)' : 'Arquivos do Codex+ e arquivos Mermaid gerados por IA') + '</div>'
                + '<button type="button" class="cx-io-btn" data-io="file">Escolher arquivo</button></div>'
                + '<div class="cx-io-or">ou</div>'
                + '<div class="cx-io-paste" data-io="paste" tabindex="0"><b>Clique aqui e cole com Ctrl+V</b> ' + (copia ? 'o conteúdo de uma cópia do Codex+.' : 'o que a IA gerou, depois de usar o botão Copiar dela.') + '</div>'
                + '<p class="cx-io-err" data-io="err"' + (err ? '' : ' hidden') + '>' + esc(err || '') + '</p>'
                + (copia ? '' : '<div class="cx-io-tip">' + (org
                    ? 'Para pedir à IA: “me entregue esse organograma como Mermaid flowchart, com cada caixa no formato Nome&lt;br&gt;Cargo e uma seta do chefe para cada subordinado”. Para uma imagem ou PDF, envie o arquivo à IA com esse mesmo pedido.'
                    : 'Para pedir à IA: “me entregue esse fluxo como arquivo Mermaid, com um grupo (subgraph) para cada área”. Para uma imagem ou PDF, envie o arquivo à IA com esse mesmo pedido.') + '</div>')
                + '<div class="cx-io-foot"><button type="button" class="cx-io-btn" data-io="cancel">Cancelar</button></div>'
                + '</div>';
            var q = function (k) { return io.el.querySelector('[data-io="' + k + '"]'); };
            q('cancel').addEventListener('click', ioClose);
            q('file').addEventListener('click', function () {
                var inp = document.createElement('input');
                inp.type = 'file'; inp.accept = '.json,.mmd,.mermaid,.md,.txt,application/json,text/plain,text/markdown';
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
            if (/^image\//.test(f.type || '') || /\.(png|jpe?g|gif|webp|bmp|svg|pdf)$/i.test(name) || f.type === 'application/pdf') {
                if (!flow && !org) { ioPick(D.mode === 'planta' ? 'Uma imagem vira a planta pelo botão Enviar planta. Aqui entram só cópias do Codex+ (.json).' : 'Aqui entram só cópias do Codex+ (.json).'); return; }
                ioPick(org ? 'Imagem e PDF não são importados diretamente. Envie o arquivo à sua IA e peça o organograma em Mermaid flowchart (cada caixa Nome<br>Cargo, seta do chefe para o subordinado); depois importe a resposta aqui.'
                    : 'Imagem e PDF não são importados diretamente. Envie o arquivo à sua IA e peça o fluxo em arquivo Mermaid, com um grupo (subgraph) para cada área; depois importe a resposta aqui.');
                return;
            }
            if (f.size > ioMax(D.mode)) { ioPick(D.mode === 'planta' ? 'Arquivo grande demais (mais de 12 MB), mesmo contando a imagem da planta.' : 'Arquivo grande demais (mais de 1 MB). O quadro inteiro do Codex+ tem até 1 MB.'); return; }
            var rd = new FileReader();
            rd.onload = function () { ioText(String(rd.result || ''), name); };
            rd.onerror = function () { ioPick('Não foi possível ler esse arquivo.'); };
            rd.readAsText(f);
        }
        function ioText(txt, name) {
            if (!io) { return; }
            var r = readIo(txt, D.mode, undefined, org ? D.org : null);
            if (r.err) { ioPick(r.err); return; }
            io.got = r;
            ioSummary(name);
        }
        // Tela 2: resumo e confirmação.
        function ioSummary(name) {
            var r = io.got, n = function (t) { return r.data.items.filter(function (i) { return i.t === t; }).length; };
            var cur = D.items.filter(function (i) { return i.t !== 'link'; }).length;
            var cards = [[n('shape'), n('shape') === 1 ? 'forma' : 'formas'], [n('lane'), n('lane') === 1 ? 'área (raia)' : 'áreas (raias)'], [n('link'), n('link') === 1 ? 'ligação' : 'ligações']];
            if (!flow && !org) {
                cards = [[n('icon'), n('icon') === 1 ? 'ícone' : 'ícones'], [n('link'), n('link') === 1 ? 'cabo' : 'cabos'],
                    [n('zone') + n('duct') + n('wall'), D.mode === 'planta' ? 'áreas, paredes e eletrocalhas' : 'zonas e eletrocalhas']];
            }
            if (org) {
                var oo = r.data.org, pe = oo.nodes.filter(function (x) { return !x.group; }).length, li = oo.edges.length, ma = (oo.esc || []).length;
                cards = [[pe, pe === 1 ? 'pessoa ou vaga' : 'pessoas e vagas'], [li, li === 1 ? 'ligação' : 'ligações'], [ma, ma === 1 ? 'linha da matriz' : 'linhas da matriz']];
                cur = D.org.nodes.length;
            }
            var warn = r.warn.length ? '<div class="cx-io-warn"><p>' + (r.warn.length === 1 ? '1 ponto para conferir' : r.warn.length + ' pontos para conferir') + '</p><ul>'
                + r.warn.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul></div>' : '';
            var achou = { organograma: 'Organograma encontrado', planta: 'Planta encontrada', topologia: 'Topologia encontrada' }[D.mode] || 'Fluxo encontrado';
            io.el.innerHTML = '<div class="cx-io" role="dialog" aria-modal="true" aria-label="' + achou + '">'
                + '<h3>' + achou + '</h3><p class="cx-io-sub">Confira antes de trazer para o quadro.</p>'
                + '<div class="cx-io-file"><span class="cx-io-doc" aria-hidden="true"></span><div>' + esc(name || r.title || 'Conteúdo colado')
                + '<small>' + esc(r.kind) + (r.title && name ? ' · ' + r.title : '') + '</small></div></div>'
                + '<div class="cx-io-stats">' + cards.map(function (c) { return '<div><b>' + c[0] + '</b><span>' + c[1] + '</span></div>'; }).join('') + '</div>'
                + warn
                + '<p class="cx-io-note">' + (cur ? 'O desenho atual (' + cur + (cur === 1 ? ' item' : ' itens') + ') será substituído. Se não gostar, use Desfazer (Ctrl+Z) para voltar ao desenho anterior.'
                    : 'O quadro está vazio: ' + (D.mode === 'planta' ? 'a planta entra' : D.mode === 'topologia' ? 'a topologia entra' : 'o ' + (org ? 'organograma' : 'fluxo') + ' entra') + ' nele. Desfazer (Ctrl+Z) volta ao quadro vazio.') + '</p>'
                + (r.bg ? '<p class="cx-io-note">A imagem da planta vem junto e substitui a atual. O Desfazer volta o desenho, mas não a imagem anterior.</p>'
                    : D.mode === 'planta' && bgUrl ? '<p class="cx-io-note">O arquivo não traz imagem de planta: a imagem atual fica.</p>' : '')
                + '<div class="cx-io-foot"><button type="button" class="cx-io-btn" data-io="back">Voltar</button>'
                + '<button type="button" class="cx-io-btn cx-io-pri" data-io="apply">' + (cur ? 'Substituir desenho' : 'Trazer para o quadro') + '</button></div>'
                + '</div>';
            io.el.querySelector('[data-io="back"]').addEventListener('click', function () { ioPick(); });
            var ap = io.el.querySelector('[data-io="apply"]');
            ap.addEventListener('click', ioApply);
            if (ap.focus) { ap.focus(); }
        }
        function ioApply() {
            if (!io || !io.got) { return; }
            var nd = io.got.data;
            snap();
            if (org) {
                // Q6e: troca o organograma inteiro (a vista recomeça e ajusta).
                D.org = nd.org; sel = []; oDelArm = null; oOrigin = null;
                ioClose(); render(); paleta(); setTimeout(fit, 0);
                return;
            }
            if (flow) { nd.legend = false; nd.pxm = 0; }
            if (io.got.bg) {
                bgUrl = io.got.bg; bgChanged = true;
                var bb = root.querySelector('[data-act="bg"]'); if (bb) { bb.textContent = 'Trocar planta'; }
                ['bgdel', 'rot'].forEach(function (k) { var x = root.querySelector('[data-act="' + k + '"]'); if (x) { x.hidden = false; } });
            }
            D = nd;
            // A folha cresce se o desenho não couber (nunca corta).
            var m = pageMin();
            D.w = Math.min(6000, Math.max(D.w, m.w)); D.h = Math.min(6000, Math.max(D.h, m.h));
            sel = [];
            ioClose();
            render(); fit(); drawSel();
        }

        // Arrastar um arquivo direto para o quadro abre a importação com ele.
        (function () {
            var st = root.querySelector('.cx-board-stage');
            var isFile = function (e) { var t = e.dataTransfer && e.dataTransfer.types; return !!t && Array.prototype.indexOf.call(t, 'Files') >= 0; };
            root.addEventListener('dragover', function (e) { if (isFile(e)) { e.preventDefault(); } });
            root.addEventListener('drop', function (e) { if (isFile(e)) { e.preventDefault(); } });
            st.addEventListener('dragover', function (e) { if (isFile(e)) { e.preventDefault(); st.classList.add('is-filedrop'); } });
            st.addEventListener('dragleave', function (e) { if (e.target === st || !st.contains(e.relatedTarget)) { st.classList.remove('is-filedrop'); } });
            st.addEventListener('drop', function (e) {
                if (!isFile(e)) { return; }
                e.preventDefault(); st.classList.remove('is-filedrop');
                var f = e.dataTransfer.files && e.dataTransfer.files[0];
                if (f) { if (io) { ioFile(f); } else { ioOpen(f); } }
            });
        })();

        function close() {
            ioClose(); xmShow(false);
            document.removeEventListener('keydown', onKey, true);
            document.removeEventListener('keyup', onKeyUp, true);
            document.documentElement.classList.remove('cx-board-open');
            root.remove();
        }

        // Ligações feitas no Q2a nasceram sem número: numera ao abrir.
        if (!flow) { D.items.forEach(function (i) { if (i.t === 'link' && !i.cable) { i.cable = nextCable(D.items); } }); }

        paleta();
        render();
        setTimeout(fit, 0);

        // Exposto para os testes (jsdom).
        root.__cx = { data: function () { return D; }, sel: function () { return sel; }, act: act, addIcon: addIcon, addShape: addShape, quickAdd: quickAdd, alignSel: alignSel, mini: function () { return mini; }, miniOpen: miniOpen, editStart: editStart, editEnd: editEnd, setTool: function (t) { tool = t; },
            setSel: function (ids) { sel = ids; render(); }, view: function () { return view; }, onKey: onKey, niOpen: niOpen, mgOpen: mgOpen, ni: function () { return ni; } };
    }

    window.CodexplusBoard = { _linkOf: linkOf, _cleanLk: cleanLk, open: open, MODES: MODES, MINI: MINI, _nextShapeOf: nextShapeOf, SHAPES: SHAPES, SHAPE_GROUPS: SHAPE_GROUPS, _bbox: bbox, _coreBox: coreBox, FLOW_COLORS: FLOW_COLORS, PAL_HEX: PAL_HEX, FLOW_HEADS: FLOW_HEADS, _nearestT: nearestT, _roundedD: roundedD, _flowHead: flowHead, _shapeFit: shapeFit, _shapeSvg: shapeSvg, _wrapText: wrapText, _textW: textW, _anchor: anchor, _boardSvg: boardSvg, _clean: clean, _itemSvg: itemSvg, _linkSvg: linkSvg, _finder: finder, _nextCable: nextCable, _routePts: routePts, _routeD: routeD, _linkMeters: linkMeters, _linkText: linkText, _ductSvg: ductSvg, _ductMeters: ductMeters, WALL_KINDS: WALL_KINDS, _wallSvg: wallSvg, _wallMeters: wallMeters, _setPxm: function (v) { PXM = v || PXM_DEFAULT; }, _toPng: toPng, _starter: starter, _apply: apply, _pngName: pngName, _readIo: readIo, _parseMermaid: parseMermaid, _orgToMermaid: orgToMermaid, _mermaidOrg: mermaidOrg, _mermaidBoard: mermaidBoard, _boardToMermaid: boardToMermaid, _materials: materials, _materialsHtml: materialsHtml, _legendEntries: legendEntries, _legendSvg: legendSvg, _legendOf: legendOf, _boardOfLegend: boardOfLegend, _libOf: libOf, _lib: LIB, _loadLibrary: loadLibrary, _removeBg: removeBg, _tint: tint };
})();
