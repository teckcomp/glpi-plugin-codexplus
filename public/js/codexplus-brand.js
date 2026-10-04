/* =========================================================================
   Codex+ — cor principal da marca a partir da logo (bloco M-1, 04/10/2026)
   -------------------------------------------------------------------------
   Decisão de Claudio: a cor vem da própria logo, sugerida e editável.
   Regra (a mesma conferida nas logos reais no mockup):
     - ignora transparente, quase branco e, se os 4 cantos forem opacos,
       a cor do fundo (logo com fundo chapado);
     - com pixels de cor (saturação >= 25%), vence a faixa de matiz mais
       presente; sem cor nenhuma (logo cinza), vence o cinza mais presente;
     - a cor final precisa ser legível em título sobre papel branco
       (contraste >= 4,5): se não for, escurece mantendo o tom.
   Calculada só no navegador, ao escolher a logo ou no botão "Usar a cor da
   logo"; o servidor só confere o formato (#rrggbb).
   ========================================================================= */
(function () {
    'use strict';

    function hls(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0;
        if (mx !== mn) {
            var d = mx - mn;
            s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
            if (mx === r) { h = (g - b) / d + (g < b ? 6 : 0); }
            else if (mx === g) { h = (b - r) / d + 2; }
            else { h = (r - g) / d + 4; }
            h /= 6;
        }
        return [h, l, s];
    }
    function rgbFromHls(h, l, s) {
        if (s === 0) { var v = Math.round(l * 255); return [v, v, v]; }
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
        function f(t) {
            if (t < 0) { t += 1; } if (t > 1) { t -= 1; }
            if (t < 1 / 6) { return p + (q - p) * 6 * t; }
            if (t < 1 / 2) { return q; }
            if (t < 2 / 3) { return p + (q - p) * (2 / 3 - t) * 6; }
            return p;
        }
        return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
    }
    function lum(c) {
        function ch(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
        return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2]);
    }
    function contrast(c) { return 1.05 / (lum(c) + 0.05); }
    function hex(c) {
        return '#' + c.map(function (v) { var s = v.toString(16); return s.length < 2 ? '0' + s : s; }).join('');
    }

    /** RGBA (Uint8ClampedArray), largura e altura -> {found, final, readable}. */
    function pick(data, w, h) {
        function at(x, y) { var i = (y * w + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; }
        var cs = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
        var bg = null;
        if (cs.every(function (c) { return c[3] > 200; })) {
            bg = [0, 1, 2].map(function (k) { return Math.round((cs[0][k] + cs[1][k] + cs[2][k] + cs[3][k]) / 4); });
        }
        var sat = {}, neu = {}, hasSat = false;
        for (var i = 0; i < data.length; i += 4) {
            var r = data[i], g = data[i + 1], b = data[i + 2];
            if (data[i + 3] < 128) { continue; }
            if (bg && Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]) < 60) { continue; }
            var x = hls(r, g, b);
            if (x[1] > 0.92) { continue; }
            var isSat = x[2] >= 0.25 && x[1] > 0.12;
            var bins = isSat ? sat : neu;
            var k = isSat ? Math.floor(x[0] * 24) % 24 : Math.floor(x[1] * 10);
            if (isSat) { hasSat = true; }
            var bb = bins[k] || (bins[k] = [0, 0, 0, 0]);
            bb[0]++; bb[1] += r; bb[2] += g; bb[3] += b;
        }
        var src = hasSat ? sat : neu, best = null;
        Object.keys(src).forEach(function (k) { if (!best || src[k][0] > best[0]) { best = src[k]; } });
        if (!best) { return null; }
        var found = [Math.round(best[1] / best[0]), Math.round(best[2] / best[0]), Math.round(best[3] / best[0])];
        var fin = found, t = hls(found[0], found[1], found[2]), l = t[1];
        while (contrast(fin) < 4.5 && l > 0.05) {
            l -= 0.01;
            fin = rgbFromHls(t[0], l, t[2]);
        }
        return { found: hex(found), color: hex(fin), darkened: hex(fin) !== hex(found), colorful: hasSat };
    }

    function fromImage(img) {
        var max = 300, sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        var w = Math.max(1, Math.round(img.naturalWidth * sc)), h = Math.max(1, Math.round(img.naturalHeight * sc));
        var cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        var ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        return pick(ctx.getImageData(0, 0, w, h).data, w, h);
    }

    function bind(form) {
        var color = form.querySelector('[data-cx-brand-color]');
        var hexEl = form.querySelector('[data-cx-brand-hex]');
        var hint = form.querySelector('[data-cx-brand-hint]');
        var file = form.querySelector('[data-cx-brand-file]');
        var prev = form.querySelector('[data-cx-brand-preview]');
        var btn = form.querySelector('[data-cx-brand-pick]');
        if (!color) { return; }

        function show(v) { if (hexEl) { hexEl.textContent = v; } }
        color.addEventListener('input', function () { show(color.value); });

        function apply(img) {
            var res;
            try { res = fromImage(img); } catch (e) { res = null; }
            if (!res) {
                if (hint) { hint.textContent = 'Não foi possível tirar uma cor desta logo. Escolha a cor à mão.'; }
                return;
            }
            color.value = res.color;
            show(res.color);
            if (hint) {
                hint.textContent = !res.colorful
                    ? 'A logo não tem cor: usada a tonalidade de cinza dela (' + res.color + '). Pode trocar.'
                    : res.darkened
                        ? 'Sugerida pela logo: ' + res.found + ', escurecida para ' + res.color + ' para o título ficar legível no papel branco. Pode trocar.'
                        : 'Sugerida pela logo: ' + res.color + '. Pode trocar.';
            }
        }

        if (file) {
            file.addEventListener('change', function () {
                var f = file.files && file.files[0];
                if (!f) { return; }
                var url = URL.createObjectURL(f);
                var img = new Image();
                img.onload = function () {
                    if (prev) {
                        prev.classList.remove('is-empty');
                        prev.innerHTML = '';
                        var shown = new Image();
                        shown.src = url;
                        prev.appendChild(shown);
                    }
                    apply(img);
                };
                img.src = url;
            });
        }
        if (btn) {
            btn.addEventListener('click', function () {
                var img = prev && prev.querySelector('img');
                if (!img || !img.complete || !img.naturalWidth) {
                    if (hint) { hint.textContent = 'Envie uma logo primeiro.'; }
                    return;
                }
                apply(img);
            });
        }
    }

    window.CodexplusBrand = { pick: pick };

    /* M-2: no documento, a logo ao lado do campo Marca acompanha a escolha. */
    function bindSelect(sel) {
        var box = sel.closest('.cx-docbrand');
        var img = box && box.querySelector('[data-cx-brand-logo]');
        if (!img) { return; }
        sel.addEventListener('change', function () {
            var opt = sel.options[sel.selectedIndex];
            var src = opt ? opt.getAttribute('data-logo') : '';
            img.hidden = !src;
            if (src) { img.src = src; }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        Array.prototype.forEach.call(document.querySelectorAll('[data-cx-brand-form]'), bind);
        Array.prototype.forEach.call(document.querySelectorAll('[data-cx-brand-select]'), bindSelect);
    });
})();
