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
 * CABEÇALHO E RODAPÉ (0.5.8; histórico: 4c, 4e, 4f)
 * =========================================================================
 * Cabeçalho: montado por buildPageEl() na hora da impressão, igual em
 * todas as páginas — título do documento pequeno de um lado, logo do outro
 * (`logo_pos`; a logo respeita `show_logo` e `repeat_logo`). A 1ª página
 * traz ainda o título grande e a linha de identificação (buildIdentLine()).
 * `cfg.document.header_html` NÃO é mais lido aqui (era na 4e/4f): o HTML
 * gravado no banco deixava documentos antigos sem cabeçalho e congelava o
 * endereço da logo.
 *
 * Rodapé: `cfg.document.footer_text` (documento) tem prioridade sobre
 * `cfg.brand.footer_text` como TEXTO, resolvido por resolveMarkers(). O
 * toggle `footer_show` continua sendo o interruptor geral.
 *
 * Nome do arquivo sugerido: fileTitle() — "POP0014-01 - Título".
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
    var HEADER_MIN_H    = 22; // px — 0.5.8: altura mínima do cabeçalho corrido (título sem logo)

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
            document: {
                title: '', code: '', revision: '', client: '', date_mod: '',
                header_html: '', footer_text: '',
                // 0.5.8: linha de identificação montada aqui, não raspada da tela
                doctype: '', owner: '', date_published: '', sector: ''
            }
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
        // Etapa 4e: o texto pode vir do documento (prioridade) OU da marca
        // (fallback) — footer_show não pode depender só de cfg.brand.footer_text,
        // senão um rodapé próprio do documento some quando o texto global
        // está vazio, mesmo com o interruptor ligado.
        cfg.brand.footer_show = !!(cfg.brand.footer_show && (cfg.brand.footer_text || cfg.document.footer_text));
        cfg.brand.footer_pages = !!cfg.brand.footer_pages;

        var mm = parseInt(cfg.brand.logo_mm, 10);
        // Teto sobe para 40 junto com Branding::save() (correção pós-4f) —
        // duas validações da mesma regra, precisam concordar. Sem isso, um
        // valor salvo entre 31 e 40mm passaria pela config mas seria
        // encolhido de volta na exportação em PDF, silenciosamente.
        cfg.brand.logo_mm = isNaN(mm) ? 14 : Math.max(6, Math.min(40, mm));

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
        // 0.5.8: cabeçalho corrido em TODAS as páginas (título pequeno +
        // logo, uma linha só). Não lê mais header_html — ver comentário
        // de buildPageEl(). Sem logo, reserva só a altura do título.
        var headerBoxH    = cfg.brand.show_logo ? Math.max(logoPx, HEADER_MIN_H) : HEADER_MIN_H;
        var headerH       = headerBoxH + 10;
        var footerH       = cfg.brand.footer_show ? FOOTER_H : 0;
        var contentW      = PAGE_W - (2 * marginX);
        var contentH      = PAGE_H - marginTop - marginBottom - headerH - footerH;

        return {
            pageW: PAGE_W, pageH: PAGE_H,
            marginX: marginX, marginTop: marginTop, marginBottom: marginBottom,
            headerH: headerH, footerH: footerH, logoPx: logoPx, headerBoxH: headerBoxH,
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
            // 0.5.8: cabeçalho corrido aprovado em 19/09/2026 — título
            // pequeno de um lado, logo do outro, filete embaixo. Altura fixa
            // (capacidade de página constante, achado 17); excesso cortado.
            + '.cx-page-header{position:absolute;top:' + geo.marginTop + 'px;'
            + 'left:' + geo.marginX + 'px;right:' + geo.marginX + 'px;'
            + 'height:' + geo.headerBoxH + 'px;overflow:hidden;box-sizing:border-box;'
            + 'display:flex;align-items:center;justify-content:space-between;gap:12px;'
            + 'border-bottom:1px solid #e5e7eb;}'
            + '.cx-page-header--logo-left{flex-direction:row-reverse;}'
            + '.cx-run-title{font-size:9.5pt;color:#4b5563;white-space:nowrap;'
            + 'overflow:hidden;text-overflow:ellipsis;min-width:0;}'
            + '.cx-run-logo{height:' + (geo.logoPx - 4) + 'px;width:auto;flex-shrink:0;}'
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
     * Monta o <div class="cx-page"> de uma folha: cabeçalho corrido (0.5.8,
     * título + logo; antes lia o header_html do
     * documento se houver — estruturado desde a Etapa 4f —, senão logo de
     * canto condicionado a `repeat_logo` a partir da 2ª página), conteúdo
     * (os blocos já decididos por layoutPages) e rodapé (footer_text do
     * documento, com fallback para o texto da marca).
     */
    function buildPageEl(idoc, cfg, geo, blocksForPage, pageIndex, total) {
        var page = idoc.createElement('div');
        page.className = 'cx-page';

        // 0.5.8: cabeçalho montado AQUI, na hora da impressão, a partir dos
        // dados do documento — não mais do header_html gravado no banco.
        // Motivo: documentos anteriores à 4f saíam sem cabeçalho e o
        // endereço da logo ficava congelado no HTML salvo. A coluna
        // header_html continua existindo, só deixou de ser lida pelo PDF.
        var header = idoc.createElement('div');
        header.className = 'cx-page-header'
            + (cfg.brand.logo_pos === 'left' ? ' cx-page-header--logo-left' : '');
        var run = idoc.createElement('span');
        run.className = 'cx-run-title';
        run.textContent = cfg.document.title || '';
        header.appendChild(run);
        if (cfg.brand.show_logo && (pageIndex === 0 || cfg.brand.repeat_logo)) {
            var img = idoc.createElement('img');
            img.className = 'cx-run-logo';
            img.src = cfg.brand.logo_url;
            img.alt = '';
            header.appendChild(img);
        }
        page.appendChild(header);

        var content = idoc.createElement('div');
        content.className = 'cx-page-content';
        for (var i = 0; i < blocksForPage.length; i++) {
            content.appendChild(blocksForPage[i]);
        }
        page.appendChild(content);

        if (cfg.brand.footer_show) {
            var footer = idoc.createElement('div');
            footer.className = 'cx-page-footer';

            // Etapa 4e: rodapé do documento tem prioridade como TEXTO; o
            // interruptor continua sendo footer_show (marca), inalterado.
            var footerText = cfg.document.footer_text || cfg.brand.footer_text;

            var left = idoc.createElement('span');
            left.className = 'cx-page-footer-left';
            left.textContent = resolveMarkers(footerText, cfg, pageIndex + 1, total);
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
     * 0.5.8 — linha de identificação da 1ª página, montada a partir de
     * #codexplus-print-config (não mais raspada de .codexplus-doc-meta,
     * que trazia a contagem de visualizações). Aprovada em 19/09/2026:
     * proposta mostra o cliente; os demais, responsável e data. O setor
     * entra em todos os tipos quando existir (Etapa 2c).
     */
    function buildIdentLine(cfg) {
        var d = cfg.document;
        var parts = [];
        if (d.doctype === 'PRP' && d.client) { parts.push('Cliente: ' + d.client); }
        if (d.sector) { parts.push('Setor: ' + d.sector); }
        if (d.doctype !== 'PRP' && d.owner) { parts.push('Responsável: ' + d.owner); }
        var pub = formatDate(d.date_published);
        var mod = formatDate(d.date_mod);
        if (pub) { parts.push('Publicado em ' + pub); }
        else if (mod) { parts.push('Atualizado em ' + mod); }
        return parts.join('  ·  ');
    }

    /** 0.5.8 — nome sugerido do arquivo: "POP0014-01 - Título". */
    function fileTitle(cfg, fallbackTitle) {
        var code  = String(cfg.document.code || '').replace(/:/g, '-');
        var title = String(cfg.document.title || fallbackTitle || 'Documento');
        var name  = code ? (code + ' - ' + title) : title;
        return name.replace(/[\\/?%*:|"<>]/g, '').replace(/\s+/g, ' ').trim();
    }

    /**
     * Espera as imagens ainda não carregadas do documento (carregadas OU
     * com erro), com teto de 8s. 0.5.8: chamada DUAS vezes — antes da
     * paginação (imagens do conteúdo) e depois dela (logo do cabeçalho,
     * que só nasce dentro de layoutPages). Achado 21 do CONTEXTO.md.
     */
    function waitImages(idoc, callback) {
        var called = false;
        function finish() {
            if (called) { return; }
            called = true;
            callback();
        }
        var pending = [];
        for (var j = 0; j < idoc.images.length; j++) {
            if (!idoc.images[j].complete) {
                pending.push(idoc.images[j]);
            }
        }
        if (pending.length === 0) {
            finish();
            return;
        }
        var remaining = pending.length;
        function done() {
            remaining--;
            if (remaining <= 0) { finish(); }
        }
        for (var k = 0; k < pending.length; k++) {
            pending[k].addEventListener('load', done);
            pending[k].addEventListener('error', done);
        }
        setTimeout(finish, 8000);
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

        // 0.5.8: âncoras que o GLPI injeta nos títulos de seção
        // (KnowbaseItem::getAnswer(): <a href="#slug"><svg>…</svg></a>)
        // não têm função no papel.
        var anchors = clone.querySelectorAll(
            'h1 > a[href^="#"], h2 > a[href^="#"], h3 > a[href^="#"], '
            + 'h4 > a[href^="#"], h5 > a[href^="#"], h6 > a[href^="#"]'
        );
        for (var an = 0; an < anchors.length; an++) {
            if (anchors[an].querySelector('svg')) {
                anchors[an].parentNode.removeChild(anchors[an]);
            }
        }

        // Metadados: monta item a item para sair legível no PDF, em vez de
        // concatenar o textContent (que sai tudo grudado).
        var metaEl = doc.querySelector('.codexplus-doc-meta');
        var meta   = buildIdentLine(cfg);
        if (!meta && metaEl) {
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
            + '<title>' + fileTitle(cfg, title).replace(/</g, '&lt;') + '</title>'
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

            function printNow() {
                if (printed) { return; }
                printed = true;
                // O Chrome sugere o nome do arquivo a partir do título da
                // página PRINCIPAL, não do iframe (PDF de 19/09/2026 saiu
                // "Codex+ (Base de Conhecimento) - 7 - GLPI"). Troca e
                // devolve em seguida.
                var previousTitle = document.title;
                document.title = fileTitle(cfg, title);
                try {
                    win.focus();
                    win.print();
                } catch (err) {
                    console.error('Codex+ (PDF):', err);
                }
                setTimeout(function () { document.title = previousTitle; }, 1000);
                setTimeout(function () { iframe.remove(); }, 2000);
            }

            // 1ª espera: imagens do conteúdo, antes de medir e paginar.
            // 2ª espera: logo do cabeçalho, que só existe depois de
            // layoutPages() (achado 21).
            waitImages(idoc, function () {
                try {
                    layoutPages(idoc, cfg, geo);
                } catch (err) {
                    console.error('Codex+ (PDF):', err);
                }
                waitImages(idoc, printNow);
            });
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
