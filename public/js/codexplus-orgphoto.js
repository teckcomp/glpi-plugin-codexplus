/* =========================================================================
   Codex+ — foto da pessoa no organograma: recorte e envio (PL-3a)
   -------------------------------------------------------------------------
   Decisão de Claudio (08/10/2026, mockup 2 aprovado): um recorte só,
   QUADRADO. Dele saem as duas imagens, geradas aqui no navegador:
     - miniatura 96 px (cartão e linhas; o círculo tracejado mostra o que
       aparece nela);
     - ampliada 400 px (balão do PL-3b).
   As duas sobem por ajax/orgphoto.php, que devolve o token; quem chama
   grava o token no nó (n.photo) e o organograma é salvo como sempre.

   API: window.CodexplusOrgPhoto.pick({ parent, url, doc }) -> Promise
        (token, ou null se cancelou). Erro de envio fica na própria janela.

   Teclado: com a janela aberta, as teclas não chegam ao quadro (Delete não
   apaga a pessoa selecionada; Esc fecha só a janela).
   ========================================================================= */
(function () {
    'use strict';

    var BOX = 320, THUMB = 96, FULL = 400, MIN_CROP = 48;
    var MAX_FILE = 15 * 1024 * 1024;

    function token() {
        var el = document.querySelector('[name="_glpi_csrf_token"]');
        return el ? el.value : '';
    }
    function rotate(t) {
        if (!t) { return; }
        document.querySelectorAll('[name="_glpi_csrf_token"]').forEach(function (i) { i.value = t; });
    }

    /** JPEG de um pedaço quadrado da imagem, com fundo branco (PNG transparente). */
    function jpeg(img, sx, sy, side, out, maxBytes) {
        var size = Math.max(16, Math.min(out, Math.round(side)));
        var cv = document.createElement('canvas');
        cv.width = size; cv.height = size;
        var g = cv.getContext('2d');
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, size, size);
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        g.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        var q = 0.86, url = cv.toDataURL('image/jpeg', q);
        // base64 ≈ 4/3 do binário: reduz a qualidade até caber no limite do servidor.
        while (url.length * 0.75 > maxBytes && q > 0.45) { q -= 0.08; url = cv.toDataURL('image/jpeg', q); }
        return url;
    }

    function pick(opts) {
        opts = opts || {};
        var parent = opts.parent || document.fullscreenElement || document.body;
        return new Promise(function (resolve) {
            var back = document.createElement('div');
            back.className = 'cx-io-back cx-oph-back';
            back.innerHTML = '<div class="cx-io cx-oph" role="dialog" aria-modal="true" aria-label="Foto da pessoa">'
                + '<h3 class="cx-oph-title">Foto da pessoa</h3>'
                + '<div class="cx-oph-drop" data-el="drop"><p>Arraste uma imagem para cá ou</p>'
                + '<button type="button" class="cx-board-btn cx-board-ok" data-act="file">Escolher imagem</button>'
                + '<p class="cx-oph-hint">PNG, JPG ou WebP.</p></div>'
                + '<div class="cx-oph-stage" data-el="stage" hidden><img alt="" data-el="img" draggable="false">'
                + '<div class="cx-oph-sq" data-el="sq"><div class="cx-oph-ci"></div><div class="cx-oph-h" data-el="h"></div></div></div>'
                + '<p class="cx-oph-hint" data-el="tip" hidden>Quadrado = foto ampliada; círculo tracejado = o que aparece na miniatura. Arraste para enquadrar; puxe o canto para o tamanho.</p>'
                + '<p class="cx-oph-err" data-el="err" role="alert"></p>'
                + '<p class="cx-oph-acts"><button type="button" class="cx-board-btn" data-act="other" hidden>Outra imagem</button>'
                + '<span style="flex:1"></span><button type="button" class="cx-board-btn" data-act="cancel">Cancelar</button>'
                + '<button type="button" class="cx-board-btn cx-board-ok" data-act="use" disabled>Usar foto</button></p>'
                + '<input type="file" accept="image/png,image/jpeg,image/webp" data-el="input" hidden></div>';
            parent.appendChild(back);
            function $(n) { return back.querySelector('[data-el="' + n + '"]'); }
            var img = $('img'), sq = $('sq'), stage = $('stage'), input = $('input');
            var useBtn = back.querySelector('[data-act="use"]'), otherBtn = back.querySelector('[data-act="other"]');
            var fit = null, crop = null, busy = false, done = false;

            function err(t) { $('err').textContent = t || ''; }
            function finish(v) {
                if (done) { return; }
                done = true;
                window.removeEventListener('keydown', onKey, true);
                back.remove();
                resolve(v);
            }
            function onKey(e) {
                e.stopImmediatePropagation();
                if (e.key === 'Escape') { e.preventDefault(); if (!busy) { finish(null); } }
            }
            window.addEventListener('keydown', onKey, true);

            function draw() {
                sq.style.left = crop.x + 'px'; sq.style.top = crop.y + 'px';
                sq.style.width = crop.s + 'px'; sq.style.height = crop.s + 'px';
            }
            function load(file) {
                err('');
                if (!file) { return; }
                if (!/^image\/(png|jpeg|webp)$/.test(file.type || '')) { err('Use uma imagem PNG, JPG ou WebP.'); return; }
                if (file.size > MAX_FILE) { err('Imagem grande demais (até 15 MB).'); return; }
                var url = URL.createObjectURL(file), im = new Image();
                im.onload = function () {
                    var k = Math.min(BOX / im.naturalWidth, BOX / im.naturalHeight);
                    fit = { k: k, w: Math.round(im.naturalWidth * k), h: Math.round(im.naturalHeight * k) };
                    fit.x = Math.round((BOX - fit.w) / 2); fit.y = Math.round((BOX - fit.h) / 2);
                    img.src = url;
                    img.style.left = fit.x + 'px'; img.style.top = fit.y + 'px';
                    img.style.width = fit.w + 'px'; img.style.height = fit.h + 'px';
                    var s = Math.round(Math.min(fit.w, fit.h) * 0.8);
                    crop = { s: s, x: fit.x + Math.round((fit.w - s) / 2), y: fit.y + Math.round((fit.h - s) / 2) };
                    img.__nat = im;
                    $('drop').hidden = true; stage.hidden = false; $('tip').hidden = false;
                    otherBtn.hidden = false; useBtn.disabled = false;
                    draw();
                };
                im.onerror = function () { URL.revokeObjectURL(url); err('Não foi possível abrir esta imagem.'); };
                im.src = url;
            }
            function clamp() {
                var minS = Math.max(24, Math.ceil(MIN_CROP * fit.k));
                crop.s = Math.max(Math.min(minS, fit.w, fit.h), Math.min(crop.s, fit.w, fit.h));
                crop.x = Math.min(Math.max(crop.x, fit.x), fit.x + fit.w - crop.s);
                crop.y = Math.min(Math.max(crop.y, fit.y), fit.y + fit.h - crop.s);
            }

            // Arrastar o quadrado (mover) ou a alça do canto (tamanho, quadrado).
            var drag = null;
            sq.addEventListener('pointerdown', function (e) {
                if (!crop) { return; }
                e.preventDefault(); e.stopPropagation();
                drag = { mode: e.target === $('h') ? 'size' : 'move', px: e.clientX, py: e.clientY, x: crop.x, y: crop.y, s: crop.s };
                try { sq.setPointerCapture(e.pointerId); } catch (x) { /* sem captura */ }
            });
            sq.addEventListener('pointermove', function (e) {
                if (!drag) { return; }
                var dx = e.clientX - drag.px, dy = e.clientY - drag.py;
                if (drag.mode === 'move') { crop.x = drag.x + dx; crop.y = drag.y + dy; } else { crop.s = drag.s + Math.max(dx, dy); }
                clamp(); draw();
            });
            function up() { drag = null; }
            sq.addEventListener('pointerup', up);
            sq.addEventListener('pointercancel', up);

            back.addEventListener('pointerdown', function (e) { if (e.target === back && !busy) { finish(null); } });
            back.addEventListener('dragover', function (e) { e.preventDefault(); e.stopPropagation(); });
            back.addEventListener('drop', function (e) {
                e.preventDefault(); e.stopPropagation();
                var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
                if (f) { load(f); }
            });
            input.addEventListener('change', function () { load(input.files && input.files[0]); input.value = ''; });

            back.addEventListener('click', function (e) {
                var b = e.target.closest('[data-act]'); if (!b || busy) { return; }
                var a = b.getAttribute('data-act');
                if (a === 'file' || a === 'other') { input.click(); return; }
                if (a === 'cancel') { finish(null); return; }
                if (a !== 'use' || !crop) { return; }
                var im = img.__nat, k = fit.k;
                var sx = (crop.x - fit.x) / k, sy = (crop.y - fit.y) / k, side = crop.s / k;
                side = Math.min(side, im.naturalWidth - sx, im.naturalHeight - sy);
                var thumb = jpeg(im, sx, sy, side, THUMB, 38000);
                var full = jpeg(im, sx, sy, side, FULL, 240000);
                if (!opts.url || !opts.doc) { err('Envio de fotos indisponível nesta tela.'); return; }
                busy = true; useBtn.disabled = true; err('');
                useBtn.textContent = 'Enviando…';
                var body = new FormData();
                body.append('id', opts.doc);
                body.append('thumb', thumb);
                body.append('image', full);
                body.append('_glpi_csrf_token', token());
                fetch(opts.url, { method: 'POST', body: body, credentials: 'same-origin' })
                    .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
                    .then(function (res) {
                        rotate(res.j.csrf);
                        if (res.ok && res.j.ok && res.j.token) { busy = false; finish(res.j.token); return; }
                        throw new Error(res.j.erro === 'sem_permissao' ? 'Você não pode alterar este organograma.'
                            : res.j.erro === 'imagem_invalida' ? 'A imagem não passou na conferência do servidor. Tente outra.'
                            : 'Não foi possível enviar a foto.');
                    })
                    .catch(function (x) {
                        busy = false; useBtn.disabled = false; useBtn.textContent = 'Usar foto';
                        err((x && x.message) || 'Sem resposta do servidor. Tente de novo.');
                    });
            });
            var first = back.querySelector('[data-act="file"]');
            if (first) { first.focus(); }
        });
    }

    window.CodexplusOrgPhoto = { pick: pick, _jpeg: jpeg };
})();
