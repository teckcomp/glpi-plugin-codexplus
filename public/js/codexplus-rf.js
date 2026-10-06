/* Codex+ — motor do mapa de calor Wi-Fi (bloco Q8-3, Claudio 05/10/2026).
 *
 * Só cálculo: não desenha tela nem mexe no quadro. Quem usa é o quadro Mapa
 * de calor (Q8-4b). Exposto em window.CodexplusRF.
 *
 * MODELO (multiparede, o mesmo das ferramentas de projeto):
 *   perda(d) = FSPL(1 m, f) + 10·n·log10(d)  + soma das paredes cruzadas
 *   d        = distância 3D (planta + diferença de altura AP/aparelho), mín. 1 m
 *   FSPL(1m) = 20·log10(f MHz) − 27,55
 *
 *   ida (AP → aparelho):   AP.tx + AP.ganho + ap.ganho_efetivo − perda − margem
 *   volta (aparelho → AP): disp.tx + disp.ganho + AP.ganho − perda − margem + VANTAGEM_AP
 *   efetivo = o pior dos dois (a volta só conta com uplink ligado);
 *   em cada ponto vale o melhor AP (o aparelho se associa ao mais forte).
 *
 *   O valor mostrado é o da IDA: é o que o celular mostraria num app de
 *   medição (e o que a calibração do Q8-5 compara). O "efetivo" decide a
 *   cor quando a volta limita.
 *
 * CALIBRAÇÃO DE PARTIDA (mapa do Cambium da LOJ0687, XV2-2X 21 dBm, 5 GHz):
 *   com n = 2,2, aparelho a 1,2 m e o perfil Celular (−8 dBi), uma margem de
 *   projeto de 12 dB reproduz o nível do Cambium (diferença mediana ~0 dB;
 *   o resto do erro é o degrau de 5 dB da escala dele). Q8-5 ajusta isso.
 *
 * UNIDADES: posições em pixels do quadro; pxm = pixels por metro (escala
 * da planta); alturas em metros; potências em dBm; ganhos em dBi.
 *
 * ENTRADAS
 *   ap      = { x, y, h, bands: { '24': {on, tx, gain}, '5': {...}, '6': {...} } }
 *   wall    = { pts: [{x,y}...], loss: [dB 2,4, dB 5, dB 6] }
 *   profile = { name, gain, bands: { '24': {on, tx}, '5': {...}, '6': {...} } }
 *
 * USO
 *   var geo = CodexplusRF.prepare({ w, h, pxm, aps, walls });   // pesado: uma vez
 *   var g   = CodexplusRF.solve(geo, { band: '5', profile });    // leve: troca faixa/aparelho
 *   CodexplusRF.at(g, x, y)               // valor num ponto (hover)
 *   CodexplusRF.coverage(g, rect, -67)    // % da área com sinal (Q8-6)
 *   CodexplusRF.paint(g, W, H, opts)      // RGBA para canvas, com a linha do −67
 */
(function () {
    'use strict';

    var BANDS = {
        '24': { f: 2437, label: '2,4 GHz', idx: 0 },
        '5':  { f: 5500, label: '5 GHz',   idx: 1 },
        '6':  { f: 6125, label: '6 GHz',   idx: 2 }
    };

    var DEFAULTS = {
        n: 2.2,          // expoente de perda (paredes entram à parte)
        margin: 12,      // margem de projeto, dB (pessoas, móveis, mercadoria)
        hDev: 1.2,       // altura do aparelho na mão, m
        hAp: 2.5,        // altura do AP quando o AP não diz, m
        apAdv: 3,        // o AP recebe melhor que o aparelho, dB
        uplink: true,    // considerar a volta do aparelho
        cell: 0.25,      // lado da célula da grade, m
        maxCells: 60000  // grade maior que isso engrossa a célula sozinha
    };

    /* Escala do Cambium (cores tiradas da legenda dos mapas da Teckcomp).
       Cada degrau vale o valor arredondado de 5 em 5 dB; abaixo de −90 fica
       sem cor. −75 a −90 dividem o mesmo verde-acinzentado, como no Cambium. */
    var PALETTE = [
        [-30, '#A75225'], [-35, '#C66929'], [-40, '#D98934'], [-45, '#E1B345'],
        [-50, '#E7D447'], [-55, '#CDED43'], [-60, '#AAFC48'], [-65, '#79FE6B'],
        [-70, '#4CF199'], [-75, '#C7D7B4'], [-80, '#C7D7B4'], [-85, '#C7D7B4'], [-90, '#C7D7B4']
    ];
    var VOIP = -67;      // limite de voz e vídeo (linha tracejada)
    var FLOOR = -92.5;   // abaixo disso: sem cor

    function fspl1m(fMHz) { return 20 * Math.log10(fMHz) - 27.55; }

    /* Cruzamento estrito de segmentos (encostar na ponta não conta). */
    function crosses(ax, ay, bx, by, cx, cy, dx, dy) {
        var d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
        if (d === 0) { return false; }
        var t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d;
        var u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
        return t > 0 && t < 1 && u > 0 && u < 1;
    }

    /* Paredes viram segmentos soltos, com caixa para descartar rápido. */
    function segments(walls) {
        var out = [];
        (walls || []).forEach(function (w) {
            var p = w && w.pts, L = w && w.loss;
            if (!Array.isArray(p) || !Array.isArray(L)) { return; }
            for (var i = 0; i + 1 < p.length; i++) {
                var a = p[i], b = p[i + 1];
                out.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y,
                    x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y),
                    l: [+L[0] || 0, +L[1] || 0, +L[2] || 0] });
            }
        });
        return out;
    }

    function num(v, d) { v = +v; return isFinite(v) ? v : d; }

    /**
     * Parte pesada, feita uma vez por arranjo de APs e paredes: grade,
     * distância de cada AP a cada célula e perda de parede nas 3 faixas.
     */
    function prepare(input) {
        var o = Object.assign({}, DEFAULTS, input.opts || {});
        var pxm = num(input.pxm, 0) > 0 ? +input.pxm : 25;
        var W = Math.max(1, num(input.w, 1)), H = Math.max(1, num(input.h, 1));
        var cellPx = o.cell * pxm;
        // Planta grande: célula maior, para o cálculo caber no tempo de um clique.
        while ((W / cellPx) * (H / cellPx) > o.maxCells) { cellPx *= 1.25; }
        var cols = Math.ceil(W / cellPx), rows = Math.ceil(H / cellPx), N = cols * rows;
        var segs = segments(input.walls);
        var aps = (input.aps || []).map(function (a) {
            return { x: num(a.x, 0), y: num(a.y, 0), h: num(a.h, o.hAp), bands: a.bands || {} };
        });
        var per = aps.map(function (a) {
            var dist = new Float32Array(N), w0 = new Float32Array(N), w1 = new Float32Array(N), w2 = new Float32Array(N);
            var dh = a.h - o.hDev, dh2 = dh * dh;
            for (var r = 0, k = 0; r < rows; r++) {
                var cy = (r + 0.5) * cellPx;
                for (var c = 0; c < cols; c++, k++) {
                    var cx = (c + 0.5) * cellPx, dx = (cx - a.x) / pxm, dy = (cy - a.y) / pxm;
                    dist[k] = Math.max(1, Math.sqrt(dx * dx + dy * dy + dh2));
                    var l0 = 0, l1 = 0, l2 = 0, mx0 = Math.min(a.x, cx), mx1 = Math.max(a.x, cx), my0 = Math.min(a.y, cy), my1 = Math.max(a.y, cy);
                    for (var s = 0; s < segs.length; s++) {
                        var g = segs[s];
                        if (g.x1 < mx0 || g.x0 > mx1 || g.y1 < my0 || g.y0 > my1) { continue; }
                        if (crosses(a.x, a.y, cx, cy, g.ax, g.ay, g.bx, g.by)) { l0 += g.l[0]; l1 += g.l[1]; l2 += g.l[2]; }
                    }
                    w0[k] = l0; w1[k] = l1; w2[k] = l2;
                }
            }
            return { dist: dist, wall: [w0, w1, w2] };
        });
        return { cols: cols, rows: rows, cellPx: cellPx, pxm: pxm, w: W, h: H, aps: aps, per: per, opts: o };
    }

    /**
     * Parte leve: faixa e aparelho. Devolve, por célula, o valor que o
     * aparelho vê (dl), o efetivo (v), o melhor AP e se a volta limitou.
     * AP sem a faixa fica de fora; sem nenhum AP na faixa, tudo −999.
     */
    function solve(geo, q) {
        var o = Object.assign({}, geo.opts, q.opts || {});
        var band = BANDS[q.band] ? String(q.band) : '5', bi = BANDS[band].idx;
        var prof = q.profile || {}, pb = (prof.bands || {})[band] || {};
        var devOn = !!pb.on, devTx = num(pb.tx, 15), devG = num(prof.gain, 0);
        var base = fspl1m(BANDS[band].f), N = geo.cols * geo.rows;
        var dl = new Float32Array(N).fill(-999), v = new Float32Array(N).fill(-999);
        var best = new Int16Array(N).fill(-1), lim = new Uint8Array(N);
        var used = 0;
        if (devOn) {
            geo.aps.forEach(function (a, i) {
                var ab = (a.bands || {})[band];
                if (!ab || !ab.on) { return; }
                used++;
                var tx = num(ab.tx, 20), g = num(ab.gain, 0), P = geo.per[i], wl = P.wall[bi];
                for (var k = 0; k < N; k++) {
                    var L = base + 10 * o.n * Math.log10(P.dist[k]) + wl[k] + o.margin;
                    var down = tx + g + devG - L;
                    var eff = down;
                    var limited = false;
                    if (o.uplink) {
                        var up = devTx + devG + g - L + o.apAdv;
                        if (up < down) { eff = up; limited = true; }
                    }
                    if (eff > v[k]) { v[k] = eff; dl[k] = down; best[k] = i; lim[k] = limited ? 1 : 0; }
                }
            });
        }
        return { cols: geo.cols, rows: geo.rows, cellPx: geo.cellPx, pxm: geo.pxm, w: geo.w, h: geo.h,
            band: band, profile: prof.name || '', devOn: devOn, aps: used, v: v, dl: dl, best: best, lim: lim, opts: o };
    }

    /* Valor contínuo num ponto (interpolação bilinear entre centros). */
    function sample(g, arr, x, y) {
        var fx = x / g.cellPx - 0.5, fy = y / g.cellPx - 0.5;
        var c0 = Math.max(0, Math.min(g.cols - 1, Math.floor(fx))), r0 = Math.max(0, Math.min(g.rows - 1, Math.floor(fy)));
        var c1 = Math.min(g.cols - 1, c0 + 1), r1 = Math.min(g.rows - 1, r0 + 1);
        var tx = Math.max(0, Math.min(1, fx - c0)), ty = Math.max(0, Math.min(1, fy - r0));
        var a = arr[r0 * g.cols + c0], b = arr[r0 * g.cols + c1], c = arr[r1 * g.cols + c0], d = arr[r1 * g.cols + c1];
        return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    }

    /** Hover: o que o aparelho vê, o efetivo, o AP e se a volta limita. */
    function at(g, x, y) {
        var c = Math.max(0, Math.min(g.cols - 1, Math.floor(x / g.cellPx))), r = Math.max(0, Math.min(g.rows - 1, Math.floor(y / g.cellPx)));
        var k = r * g.cols + c;
        return { dl: Math.round(sample(g, g.dl, x, y)), v: Math.round(sample(g, g.v, x, y)), ap: g.best[k], limited: !!g.lim[k] };
    }

    /** Degrau da escala (de 5 em 5 dB) e a cor; null abaixo do piso. */
    function step(v) {
        if (!(v >= FLOOR)) { return null; }
        var s = Math.max(-90, Math.min(-30, Math.round(v / 5) * 5));
        for (var i = 0; i < PALETTE.length; i++) { if (PALETTE[i][0] === s) { return { step: s, color: PALETTE[i][1] }; } }
        return null;
    }

    /**
     * Cobertura de um retângulo (Área da planta, em pixels): fração das
     * células com valor efetivo ≥ limite. Célula conta se o centro está
     * dentro. Sem célula dentro: null.
     */
    function coverage(g, rect, thr) {
        thr = thr === undefined ? VOIP : thr;
        var x0 = rect ? rect.x : 0, y0 = rect ? rect.y : 0, x1 = rect ? rect.x + rect.w : g.w, y1 = rect ? rect.y + rect.h : g.h;
        var tot = 0, ok = 0;
        for (var r = 0; r < g.rows; r++) {
            var cy = (r + 0.5) * g.cellPx;
            if (cy < y0 || cy > y1) { continue; }
            for (var c = 0; c < g.cols; c++) {
                var cx = (c + 0.5) * g.cellPx;
                if (cx < x0 || cx > x1) { continue; }
                tot++;
                if (g.v[r * g.cols + c] >= thr) { ok++; }
            }
        }
        return tot ? { pct: Math.round(ok / tot * 1000) / 10, cells: tot } : null;
    }

    function hexRgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
    var RGB = {};
    PALETTE.forEach(function (p) { RGB[p[0]] = hexRgb(p[1]); });

    /**
     * Pinta em W×H pixels (o tamanho do quadro, ou menor para o PNG) e
     * devolve RGBA (Uint8ClampedArray) para ImageData. Opções: alpha
     * (0–255, padrão 170), line (desenha o −67 tracejado, padrão true).
     */
    function paint(g, W, H, opts) {
        opts = opts || {};
        var alpha = opts.alpha === undefined ? 170 : opts.alpha, line = opts.line !== false;
        var sx = g.w / W, sy = g.h / H, out = new Uint8ClampedArray(W * H * 4), val = new Float32Array(W * H);
        for (var py = 0; py < H; py++) {
            for (var px = 0; px < W; px++) {
                var v = sample(g, g.v, (px + 0.5) * sx, (py + 0.5) * sy), i = py * W + px;
                val[i] = v;
                var st = step(v);
                if (!st) { continue; }
                var c = RGB[st.step], o = i * 4;
                out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = alpha;
            }
        }
        if (line) {
            for (var y = 0; y + 1 < H; y++) {
                for (var x = 0; x + 1 < W; x++) {
                    var k = y * W + x, inV = val[k] >= VOIP;
                    if (inV === (val[k + 1] >= VOIP) && inV === (val[k + W] >= VOIP)) { continue; }
                    if (((x + y) >> 2) & 1) { continue; }  // tracejado
                    for (var t = 0; t < 2; t++) {
                        var q = ((y + t) * W + x) * 4;
                        out[q] = 4; out[q + 1] = 52; out[q + 2] = 44; out[q + 3] = 255;
                    }
                }
            }
        }
        return out;
    }

    /* Conferência rápida no console do navegador: CodexplusRF.selfTest().
       Casos de valor conhecido; devolve a lista e imprime ok/falha. */
    function selfTest() {
        var res = [];
        function t(ok, msg) { res.push((ok ? 'ok  ' : 'FALHA ') + msg); }
        var ap = { x: 0, y: 0, h: 1.2, bands: { '5': { on: true, tx: 20, gain: 0 } } };
        var cel = { name: 'teste', gain: 0, bands: { '5': { on: true, tx: 20 } } };
        var geo = prepare({ w: 400, h: 100, pxm: 10, aps: [ap], walls: [], opts: { margin: 0, cell: 1 } });
        var g = solve(geo, { band: '5', profile: cel, opts: { uplink: false } });
        // célula (10,0) tem centro a 10,5 m e 0,5 m: d = 10,51 m
        var d = Math.sqrt(10.5 * 10.5 + 0.5 * 0.5), exp = 20 - (fspl1m(5500) + 22 * Math.log10(d));
        t(Math.abs(g.dl[10] - exp) < 0.01, 'perda no espaço livre a 10,5 m: ' + g.dl[10].toFixed(1) + ' dBm');
        var geo2 = prepare({ w: 400, h: 100, pxm: 10, aps: [ap], walls: [{ pts: [{ x: 50, y: -10 }, { x: 50, y: 200 }], loss: [12, 18, 20] }], opts: { margin: 0, cell: 1 } });
        var g2 = solve(geo2, { band: '5', profile: cel, opts: { uplink: false } });
        t(Math.abs((g.dl[10] - g2.dl[10]) - 18) < 0.01 && g.dl[3] === g2.dl[3], 'parede de concreto tira 18 dB só do outro lado');
        var g3 = solve(geo, { band: '5', profile: { gain: 0, bands: { '5': { on: true, tx: 10 } } }, opts: { uplink: true } });
        t(g3.lim[10] === 1 && Math.abs(g3.v[10] - (g.dl[10] - 7)) < 0.01, 'aparelho fraco: a volta limita (10 dBm + 3 contra 20)');
        t(step(-44).step === -45 && step(-67).step === -65 && step(-95) === null, 'degraus da escala');
        if (typeof console !== 'undefined') { console.log(res.join('\n')); }
        return res;
    }

    window.CodexplusRF = {
        BANDS: BANDS, DEFAULTS: DEFAULTS, PALETTE: PALETTE, VOIP: VOIP,
        prepare: prepare, solve: solve, at: at, step: step, coverage: coverage, paint: paint,
        selfTest: selfTest, _fspl1m: fspl1m, _crosses: crosses
    };
})();
