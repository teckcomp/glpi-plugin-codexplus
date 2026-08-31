/**
 * Codex+ — exportação de PDF pelo navegador (Etapa 1) + motor de
 * paginação e marca no PDF (Etapa 4c).
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
 *
 * Um sexto elemento, adicionado na Etapa 4b, é lido (não escrito) por este
 * arquivo:
 *
 *   #codexplus-print-config   <script type="application/json"> com a marca
 *                              (logo, cabeçalho, rodapé) e os dados do
 *                              documento (código, revisão, cliente...),
 *                              já escapado no PHP com JSON_HEX_*.
 *
 * Se a tag não existir ou o JSON vier inválido, este arquivo cai em
 * padrões seguros (sem logo, sem rodapé) — nunca lança erro por causa
 * disso. Ver getPrintConfig().
 *
 * =========================================================================
 * MOTOR DE PAGINAÇÃO (Etapa 4c) — só interno a este arquivo
 * =========================================================================
 * O Chrome não suporta caixas de margem do `@page` nem `counter(page)`
 * (docs/CONTEXTO.md, seção 4), então cabeçalho e rodapé repetidos por
 * página são desenhados à mão:
 *
 *   1. O conteúdo entra "achatado" dentro de #cx-stage, na LARGURA que
 *      ele vai ter dentro da página impressa — é assim que a medição de
 *      altura de cada bloco (parágrafo, tabela, .cx-step, .cx-callout...)
 *      sai correta.
 *   2. Depois que as imagens carregam, cada filho direto de #cx-stage é
 *      tratado como um bloco ATÔMICO (nunca é partido no meio — inclusive
 *      título+metadados, agrupados em .cx-heading só para isso) e
 *      distribuído em folhas .cx-page de 794×1123 px (A4 a 96dpi).
 *   3. Cada .cx-page desenha seu próprio cabeçalho (logo) e rodapé (texto
 *      livre + paginação), lidos de #codexplus-print-config.
 *
 * `#cx-stage`, `.cx-page`, `.cx-page-header`, `.cx-page-content` e
 * `.cx-page-footer` são só o andaime dentro da janela de impressão criada
 * por ESTE arquivo. Não são contrato com o Twig — ninguém fora daqui
 * precisa conhecê-los.
 * =========================================================================
 */

(function () {
    'use strict';

    // Estilos aplicados apenas ao documento impresso. A parte que depende
    // da configuração de marca (medidas de página, cabeçalho, rodapé) é
    // gerada à parte por buildPageCss(), porque depende de valores vindos
    // de #codexplus-print-config.
    var PRINT_CSS = ''
        + 'html,body{margin:0;padding:0;background:#fff;}'
        + 'body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:11.5pt;'
        + 'line-height:1.55;}'
        // Contador dos passos (.cx-step). Fica no body, e não mais num
        // contêiner só do conteúdo, porque a partir da Etapa 4c os blocos
        // do documento são espalhados entre várias .cx-page — o CSS
        // counter precisa de um único ancestro comum a todas elas para a
        // numeração continuar 1, 2, 3... entre páginas.
        + 'body{counter-reset:cx-step;}'
        + '.cx-print-title{font-size:19pt;color:#0c447c;margin:0 0 4px;}'
        + '.cx-print-title--upper{text-transform:uppercase;}'
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

    // Folha A4 a 96dpi — é a mesma referência usada desde a Etapa 1 para o
    // iframe fora da tela (docs/CONTEXTO.md, seção 4).
    var PAGE_W          = 794;
    var PAGE_H          = 1123;
    var MARGIN_X_MM     = 16;
    var MARGIN_TOP_MM   = 18;
    var MARGIN_BOTTOM_MM = 18;
    var FOOTER_H        = 34; // px — altura fixa da faixa de rodapé, quando ligado

    function mmToPx(mm) {
        return mm * 96 / 25.4;
    }

    /**
     * Lê e valida a bagagem de impressão da Etapa 4b. Nunca lança erro:
     * tag ausente ou JSON inválido caem nos padrões (sem logo, sem
     * rodapé) — a exportação continua funcionando, só sem a marca.
     */
    function getPrintConfig() {
        var cfg = {
            brand: {
                company: '', logo_url: '', show_logo: false, repeat_logo: true,
                logo_pos: 'right', logo_mm: 14, title_upper: false,
                footer_show: false, footer_text: '', footer_pages: false
            },
            document: { title: '', code: '', revision: '', client: '', date_mod: '' }
        };

        var el = document.getElementById('codexplus-print-config');
        if (!el) {
            return cfg;
        }

        var raw;
        try {
            raw = JSON.parse(el.textContent || el.innerText || '{}');
        } catch (err) {
            return cfg;
        }

        if (!raw || typeof raw !== 'object') {
            return cfg;
        }

        if (raw.brand && typeof raw.brand === 'object') {
            for (var bk in cfg.brand) {
                if (Object.prototype.hasOwnProperty.call(raw.brand, bk)) {
                    cfg.brand[bk] = raw.brand[bk];
                }
            }
        }
        if (raw.document && typeof raw.document === 'object') {
            for (var dk in cfg.document) {
                if (Object.prototype.hasOwnProperty.call(raw.document, dk)) {
                    cfg.document[dk] = raw.document[dk];
                }
            }
        }

        // Normalizações defensivas — não confiar cegamente no que veio do
        // JSON, mesmo sendo gerado pelo próprio plugin (Branding::save() já
        // valida ao gravar, mas aqui é outra camada, e o valor pode vir de
        // uma config antiga persistida antes de uma validação ser adicionada).
        cfg.brand.show_logo   = !!(cfg.brand.show_logo && cfg.brand.logo_url);
        cfg.brand.repeat_logo = !!cfg.brand.repeat_logo;
        cfg.brand.logo_pos    = cfg.brand.logo_pos === 'left' ? 'left' : 'right';
        cfg.brand.title_upper = !!cfg.brand.title_upper;
        cfg.brand.footer_show = !!(cfg.brand.footer_show && cfg.brand.footer_text);
        cfg.brand.footer_pages = !!cfg.brand.footer_pages;

        var mm = parseInt(cfg.brand.logo_mm, 10);
        cfg.brand.logo_mm = isNaN(mm) ? 14 : Math.max(6, Math.min(30, mm));

        return cfg;
    }

    /**
     * Medidas derivadas da configuração: dimensões da página, da área de
     * conteúdo e do cabeçalho (altura do logo + respiro).
     *
     * A altura do cabeçalho reservada é a MESMA em todas as páginas, ligue
     * ou não `repeat_logo` — simplifica a paginação (uma única capacidade
     * de conteúdo por página, em vez de recalcular página a página) ao
     * custo de um respiro a mais nas páginas sem logo quando o logo não se
     * repete. Mesma lógica para o rodapé: não há alternância, então a
     * reserva é constante quando `footer_show` está ligado.
     */
    function computeGeometry(cfg) {
        var marginX      = Math.round(mmToPx(MARGIN_X_MM));
        var marginTop     = Math.round(mmToPx(MARGIN_TOP_MM));
        var marginBottom  = Math.round(mmToPx(MARGIN_BOTTOM_MM));
        var logoPx        = Math.round(mmToPx(cfg.brand.logo_mm));
        var headerH       = cfg.brand.show_logo ? (logoPx + 10) : 0;
        var footerH       = cfg.brand.footer_show ? FOOTER_H : 0;
        var contentW      = PAGE_W - (2 * marginX);
        var contentH      = PAGE_H - marginTop - marginBottom - headerH - footerH;

        return {
            pageW: PAGE_W, pageH: PAGE_H,
            marginX: marginX, marginTop: marginTop, marginBottom: marginBottom,
            headerH: headerH, footerH: footerH, logoPx: logoPx,
            contentW: contentW, contentH: contentH
        };
    }

    /** CSS que depende da configuração — geometria de página, cabeçalho, rodapé. */
    function buildPageCss(geo) {
        return ''
            + '@page{size:A4;margin:0;}'
            + '#cx-stage{width:' + geo.contentW + 'px;}'
            + '.cx-page{position:relative;width:' + geo.pageW + 'px;height:' + geo.pageH + 'px;'
            + 'box-sizing:border-box;page-break-after:always;'
            + 'padding:' + (geo.marginTop + geo.headerH) + 'px ' + geo.marginX + 'px '
            + (geo.marginBottom + geo.footerH) + 'px;}'
            + '.cx-page:last-child{page-break-after:auto;}'
            + '.cx-page-content{width:' + geo.contentW + 'px;}'
            + '.cx-page-header{position:absolute;top:' + geo.marginTop + 'px;'
            + 'left:' + geo.marginX + 'px;right:' + geo.marginX + 'px;'
            + 'height:' + geo.logoPx + 'px;line-height:0;}'
            + '.cx-page-header--right img{float:right;height:' + geo.logoPx + 'px;width:auto;}'
            + '.cx-page-header--left img{float:left;height:' + geo.logoPx + 'px;width:auto;}'
            + '.cx-page-footer{position:absolute;left:' + geo.marginX + 'px;right:' + geo.marginX + 'px;'
            + 'bottom:' + geo.marginBottom + 'px;height:' + FOOTER_H + 'px;'
            + 'display:flex;align-items:center;justify-content:space-between;gap:12px;'
            + 'border-top:1px solid #d1d5db;padding-top:6px;'
            + 'font-size:8.5pt;color:#6b7280;}'
            + '.cx-page-footer-left{white-space:pre-wrap;overflow:hidden;}'
            + '.cx-page-footer-right{flex:0 0 auto;font-weight:600;}';
    }

    /** "AAAA-MM-DD HH:MM:SS" (formato nativo do GLPI) -> "DD/MM/AAAA". */
    function formatDate(mysqlDatetime) {
        var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(mysqlDatetime || ''));
        return m ? (m[3] + '/' + m[2] + '/' + m[1]) : '';
    }

    /**
     * Resolve os marcadores do rodapé (Branding::getMarkers()). Token
     * desconhecido é devolvido como veio, sem quebrar o texto.
     */
    function resolveMarkers(text, cfg, pageNumber, total) {
        if (!text) {
            return '';
        }
        var map = {
            '{codigo}':  cfg.document.code || '',
            '{revisao}': cfg.document.revision || '',
            '{titulo}':  cfg.document.title || '',
            '{empresa}': cfg.brand.company || '',
            '{data}':    formatDate(cfg.document.date_mod),
            '{pagina}':  String(pageNumber),
            '{total}':   String(total)
        };
        return text.replace(/\{[a-z]+\}/g, function (token) {
            return Object.prototype.hasOwnProperty.call(map, token) ? map[token] : token;
        });
    }

    /**
     * Monta o <div class="cx-page"> de uma folha: cabeçalho (logo,
     * condicionado a `repeat_logo` a partir da 2ª página), conteúdo (os
     * blocos já decididos por layoutPages) e rodapé.
     */
    function buildPageEl(idoc, cfg, geo, blocksForPage, pageIndex, total) {
        var page = idoc.createElement('div');
        page.className = 'cx-page';

        var showHeader = cfg.brand.show_logo && (pageIndex === 0 || cfg.brand.repeat_logo);
        if (showHeader) {
            var header = idoc.createElement('div');
            header.className = 'cx-page-header cx-page-header--' + cfg.brand.logo_pos;
            var img = idoc.createElement('img');
            img.src = cfg.brand.logo_url;
            img.alt = '';
            header.appendChild(img);
            page.appendChild(header);
        }

        var content = idoc.createElement('div');
        content.className = 'cx-page-content';
        for (var i = 0; i < blocksForPage.length; i++) {
            content.appendChild(blocksForPage[i]);
        }
        page.appendChild(content);

        if (cfg.brand.footer_show) {
            var footer = idoc.createElement('div');
            footer.className = 'cx-page-footer';

            var left = idoc.createElement('span');
            left.className = 'cx-page-footer-left';
            left.textContent = resolveMarkers(cfg.brand.footer_text, cfg, pageIndex + 1, total);
            footer.appendChild(left);

            if (cfg.brand.footer_pages) {
                var right = idoc.createElement('span');
                right.className = 'cx-page-footer-right';
                right.textContent = (pageIndex + 1) + ' / ' + total;
                footer.appendChild(right);
            }
            page.appendChild(footer);
        }

        return page;
    }

    /**
     * Fatia #cx-stage em folhas .cx-page e substitui o <body> pelo
     * resultado. Cada filho direto de #cx-stage é um bloco atômico —
     * nunca é partido no meio (é assim que ".cx-step" e tabela não saem
     * cortados, por construção, sem precisar de regra própria por tipo de
     * bloco: quem nunca deve ser separado do que vem em seguida já entra
     * como um único elemento em #cx-stage).
     *
     * LIMITE CONHECIDO: um bloco isolado mais alto que a área útil de uma
     * página inteira (uma tabela ou imagem enorme) ainda assim vai sozinho
     * para sua própria página e pode transbordar visualmente para a folha
     * seguinte — não há como evitar isso sem partir o bloco, o que fere a
     * regra "não partir passo nem tabela no meio". Documento comum (POP,
     * proposta, manual) não chega perto desse caso.
     */
    function layoutPages(idoc, cfg, geo) {
        var stage = idoc.getElementById('cx-stage');
        if (!stage) {
            return 1;
        }

        var blocks  = Array.prototype.slice.call(stage.children);
        var heights = blocks.map(function (el) {
            return el.getBoundingClientRect().height;
        });

        var pages = [[]];
        var used  = 0;
        for (var i = 0; i < blocks.length; i++) {
            var h = heights[i];
            if (pages[pages.length - 1].length > 0 && (used + h) > geo.contentH) {
                pages.push([]);
                used = 0;
            }
            pages[pages.length - 1].push(blocks[i]);
            used += h;
        }

        var total = pages.length;
        var frag  = idoc.createDocumentFragment();
        for (var p = 0; p < total; p++) {
            frag.appendChild(buildPageEl(idoc, cfg, geo, pages[p], p, total));
        }

        idoc.body.innerHTML = '';
        idoc.body.appendChild(frag);
        return total;
    }

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

        var cfg = getPrintConfig();
        var geo = computeGeometry(cfg);

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

        // Título e metadados entram agrupados em .cx-heading: um único
        // bloco atômico para layoutPages(), garantindo que nunca se
        // separam entre páginas.
        var heading = '<div class="cx-heading">'
            + '<h1 class="cx-print-title' + (cfg.brand.title_upper ? ' cx-print-title--upper' : '') + '">'
            + safeTitle + '</h1>'
            + '<div class="cx-print-meta">' + meta.replace(/</g, '&lt;') + '</div>'
            + '</div>';

        var html = '<!DOCTYPE html><html lang="pt-br"><head><meta charset="utf-8">'
            + '<base href="' + window.location.origin + '/">'
            + '<title>' + safeTitle + '</title>'
            + '<style>' + PRINT_CSS + buildPageCss(geo) + '</style></head><body>'
            + '<div id="cx-stage">' + heading + clone.innerHTML + '</div>'
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
                    // A paginação só acontece agora, com as imagens já
                    // carregadas e #cx-stage ainda "achatado" — mover nós
                    // já carregados de lugar no DOM não os recarrega.
                    layoutPages(idoc, cfg, geo);
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
