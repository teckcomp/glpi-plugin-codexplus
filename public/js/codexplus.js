/**
 * Codex+ — exportação de PDF pelo navegador (Etapa 1).
 *
 * POR QUE ASSIM: o plugin "PDF export" do marketplace usa TCPDF no servidor
 * e imprime tabelas de metadados, não o documento — e não renderiza CSS
 * moderno (flexbox, counters). Aqui montamos uma janela de impressão limpa
 * com o conteúdo do artigo + folha de estilo própria e deixamos o NAVEGADOR
 * renderizar, que respeita 100% dos blocos de passo e caixas de destaque.
 *
 * =========================================================================
 * CONTRATO COM O TEMPLATE — LEIA ANTES DE MEXER NO VISUAL
 * =========================================================================
 * Este arquivo depende de 5 seletores de templates/article.html.twig:
 *
 *   #codexplus-doc          contêiner do que vai para o PDF (o que estiver
 *                           FORA dele não é impresso — é assim que os
 *                           anexos ficam de fora, de propósito)
 *   .codexplus-doc-title    vira o <h1> do PDF
 *   .codexplus-doc-meta     vira a linha de metadados sob o título
 *   .codexplus-content      o corpo do documento
 *   #codexplus-pdf          o botão que dispara a exportação
 *
 * Esses nomes são INTERFACE, não decoração. Se algum for renomeado ou
 * reestruturado no Twig, o botão "Exportar PDF" para de funcionar SEM
 * lançar erro: clica e não acontece nada (as funções abaixo saem cedo no
 * `if (!doc)` / `if (!content)`). Mudou lá, mude aqui junto.
 * =========================================================================
 */

(function () {
    'use strict';

    // Estilos aplicados apenas ao documento impresso.
    var PRINT_CSS = ''
        + '@page{size:A4;margin:18mm 16mm;}'
        + 'body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:11.5pt;'
        + 'line-height:1.55;margin:0;}'
        + '.cx-print-title{font-size:19pt;color:#0c447c;margin:0 0 4px;}'
        + '.cx-print-meta{font-size:9pt;color:#6b7280;border-bottom:2px solid #0c447c;'
        + 'padding-bottom:8px;margin-bottom:18px;}'
        + 'h1,h2,h3,h4{color:#0c447c;page-break-after:avoid;}'
        + 'h2{font-size:14pt;margin:18px 0 8px;}h3{font-size:12pt;margin:14px 0 6px;}'
        + 'p{margin:0 0 9px;}'
        + 'table{border-collapse:collapse;width:100%;margin:0 0 12px;}'
        + 'td,th{border:1px solid #d1d5db;padding:6px;font-size:10.5pt;}'
        + 'th{background:#f3f4f6;}'
        + 'img{max-width:100%;height:auto;}'
        + 'ul,ol{margin:0 0 9px;padding-left:22px;}'
        + 'pre,code{background:#f6f8fa;border-radius:4px;font-size:10pt;}'
        + 'pre{padding:8px;white-space:pre-wrap;page-break-inside:avoid;}'
        // blocos do Codex+ (Etapa 3) já saem corretos no PDF
        + '.codexplus-content{counter-reset:cx-step;}'
        + '.cx-step{display:flex;gap:10px;margin:0 0 12px;padding:9px 12px;'
        + 'border:1px solid #e5e7eb;border-radius:8px;counter-increment:cx-step;'
        + 'page-break-inside:avoid;}'
        + '.cx-step-number{flex:0 0 auto;width:22px;height:22px;border-radius:50%;'
        + 'background:#0c447c;color:#fff;display:flex;align-items:center;'
        + 'justify-content:center;font-size:11pt;font-weight:700;}'
        + '.cx-step-number::before{content:counter(cx-step);}'
        + '.cx-callout{margin:0 0 12px;padding:9px 12px;border-radius:6px;'
        + 'border-left:4px solid;page-break-inside:avoid;}'
        + '.cx-callout-attention{background:#fcebeb;border-color:#e24b4a;}'
        + '.cx-callout-tip{background:#eaf3de;border-color:#639922;}'
        + '.cx-callout-note{background:#e6f1fb;border-color:#378add;}';

    function exportPdf() {
        var doc = document.getElementById('codexplus-doc');
        if (!doc) {
            return;
        }

        var titleEl = doc.querySelector('.codexplus-doc-title');
        var content = doc.querySelector('.codexplus-content');
        var title   = titleEl ? titleEl.textContent.trim() : 'Documento';

        if (!content) {
            return;
        }

        // ---------------------------------------------------------------
        // IMAGENS: o GLPI injeta loading="lazy" em todo <img> de artigo
        // (RichText::getEnhancedHtml). Numa janela de impressão a imagem
        // nunca entra no viewport, então nunca carrega e o PDF sai sem ela.
        // Clonamos o conteúdo e forçamos carregamento imediato.
        // ---------------------------------------------------------------
        var clone = content.cloneNode(true);
        var imgs  = clone.querySelectorAll('img');
        for (var i = 0; i < imgs.length; i++) {
            imgs[i].setAttribute('loading', 'eager');
            imgs[i].removeAttribute('decoding');
        }

        // Metadados: monta item a item para sair legível no PDF, em vez de
        // concatenar o textContent (que sai tudo grudado).
        var metaEl = doc.querySelector('.codexplus-doc-meta');
        var meta   = '';
        if (metaEl) {
            var parts = [];
            for (var m = 0; m < metaEl.children.length; m++) {
                var txt = metaEl.children[m].textContent.replace(/\s+/g, ' ').trim();
                if (txt) { parts.push(txt); }
            }
            meta = parts.join('  ·  ');
        }

        var safeTitle = title.replace(/</g, '&lt;');

        var html = '<!DOCTYPE html><html lang="pt-br"><head><meta charset="utf-8">'
            + '<base href="' + window.location.origin + '/">'
            + '<title>' + safeTitle + '</title>'
            + '<style>' + PRINT_CSS + '</style></head><body>'
            + '<h1 class="cx-print-title">' + safeTitle + '</h1>'
            + '<div class="cx-print-meta">' + meta.replace(/</g, '&lt;') + '</div>'
            + '<div class="codexplus-content">' + clone.innerHTML + '</div>'
            + '</body></html>';

        var iframe = document.createElement('iframe');
        iframe.setAttribute('aria-hidden', 'true');
        // Fora da tela, mas com DIMENSÕES REAIS: largura de uma folha A4 a
        // 96dpi. Iframe 0x0 faz o navegador considerar as imagens fora da
        // área visível e adiar o carregamento.
        iframe.style.cssText = 'position:fixed;left:-10000px;top:0;'
            + 'width:794px;height:1123px;border:0;opacity:0;';

        iframe.srcdoc = html;

        iframe.onload = function () {
            var win = iframe.contentWindow;
            var idoc = iframe.contentDocument || win.document;
            var printed = false;

            function doPrint() {
                if (printed) { return; }
                printed = true;
                try {
                    win.focus();
                    win.print();
                } catch (err) {
                    console.error('Codex+ (PDF):', err);
                }
                setTimeout(function () { iframe.remove(); }, 2000);
            }

            // Espera todas as imagens terminarem (carregadas OU com erro),
            // com teto de 8s para não travar caso alguma nunca responda.
            var pending = [];
            for (var j = 0; j < idoc.images.length; j++) {
                if (!idoc.images[j].complete) {
                    pending.push(idoc.images[j]);
                }
            }

            if (pending.length === 0) {
                doPrint();
                return;
            }

            var remaining = pending.length;
            function done() {
                remaining--;
                if (remaining <= 0) { doPrint(); }
            }
            for (var k = 0; k < pending.length; k++) {
                pending[k].addEventListener('load', done);
                pending[k].addEventListener('error', done);
            }
            setTimeout(doPrint, 8000);
        };

        document.body.appendChild(iframe);
    }

    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('codexplus-pdf');
        if (btn) {
            btn.addEventListener('click', exportPdf);
        }
    });
})();
