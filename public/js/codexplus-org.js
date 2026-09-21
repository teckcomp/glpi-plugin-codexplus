/* =========================================================================
   Codex+ — motor do organograma (Etapa 9, 0.6.7)
   -------------------------------------------------------------------------
   Adaptado do protótipo "Organograma técnico Resolutto", aprovado por
   Claudio como padrão visual dos diagramas. O MESMO motor desenha na edição
   e na leitura: é a garantia de "sem perda" entre o que se edita e o que se
   publica (decisão da Etapa 9).

   Uso (templates/document-form.html.twig):
     <div data-cx-org data-editable="1" data-input="cx-org-input"
          data-source="cx-org-data" data-title="…" data-code="…"></div>
   - data-source: id de <script type="application/json"> com o diagrama;
   - data-input:  id do <input type="hidden"> que leva o JSON no Salvar
                  (só na edição; o servidor valida em Diagram::validate()).

   Diferenças para o protótipo: nada em localStorage (o documento é a fonte),
   tudo escopado no elemento raiz (sem ids globais), botões type="button"
   (o editor vive dentro do formulário do documento), Enter nos campos não
   envia o formulário, busca de pessoa, e impressão numa janela própria em
   A4 paisagem, ajustada para caber (a matriz vai na página seguinte).
   ========================================================================= */
(function () {
    'use strict';

    // ---- Níveis (0.6.7-5, Claudio, 20/09/2026) -----------------------------
    // Cada organograma guarda os próprios níveis em S.levels: nome e cor
    // editáveis, dá para criar novos. Padrão de mercado para os novos;
    // os organogramas salvos antes disso ganham os níveis que já usavam.
    var STD_LEVELS = [
        { key: 'conselho', label: 'Conselho', color: '#22314f' },
        { key: 'diretoria', label: 'Diretoria', color: '#3e6aa8' },
        { key: 'gerencia', label: 'Gerência', color: '#1f5fbf' },
        { key: 'coordenacao', label: 'Coordenação', color: '#1f7f6c' },
        { key: 'supervisao', label: 'Supervisão', color: '#c4860e' },
        { key: 'especialista', label: 'Especialista', color: '#7a4fb5' },
        { key: 'operacional', label: 'Operacional', color: '#2e86d1' }
    ];
    var LEGACY_LEVELS = [
        { key: 'diretoria', label: 'Diretoria', color: '#22314f' },
        { key: 'gestao', label: 'Coordenação', color: '#3e6aa8' },
        { key: 'supervisao', label: 'Supervisão', color: '#c4860e' },
        { key: 'n3', label: 'Analista N3', color: '#7a4fb5' },
        { key: 'n2', label: 'Técnico N2', color: '#1f7f6c' },
        { key: 'n1', label: 'Técnico N1', color: '#2e86d1' },
        { key: 'noc', label: 'NOC (coringa)', color: '#cf4b66' }
    ];
    var SWATCHES = ['#22314f', '#3e6aa8', '#1f5fbf', '#1f7f6c', '#c4860e', '#7a4fb5', '#2e86d1', '#cf4b66', '#5a6575', '#b3261e'];
    function copyLevels(a) { return a.map(function (l) { return { key: l.key, label: l.label, color: l.color }; }); }

    // ---- Modelos prontos (0.6.8, pedido de Claudio em 20/09/2026) ----------
    // Genéricos de propósito: sem nomes de pessoas (o repositório é público).
    // Cada um é uma função que devolve {tree, esc} novo a cada uso.
    function T(name, role, lvl, kids, o) {
        var n = { name: name || '', role: role || '', lvl: lvl, kids: kids || [], note: '' };
        if (o) { for (var k in o) { n[k] = o[k]; } }
        return n;
    }
    function vagas(role, lvl, qt) { var a = []; for (var i = 0; i < qt; i++) { a.push(T('', role, lvl)); } return a; }
    var ESC_TI = [
        { lvl: 'noc', c: ['NOC (nível 0)', 'Monitora 24x7, detecta alertas, abre o chamado e executa o procedimento padrão (runbook).', 'Não existe runbook para o alerta ou o runbook não resolveu.', 'Abrir chamado em até 5 min do alerta; escalar em até 15 min.'] },
        { lvl: 'n1', c: ['Técnico N1', 'Porta de entrada: registra, classifica a prioridade e resolve o que está na base de conhecimento.', 'Sem solução em 30 min, exige competência de N2 ou prioridade P1.', 'Primeira resposta em até 15 min.'] },
        { lvl: 'n2', c: ['Técnico N2', 'Incidentes complexos, remoto avançado e campo; orienta os N1.', 'Sem solução em 2 h ou suspeita de causa raiz recorrente.', 'Assumir em até 30 min.'] },
        { lvl: 'n3', c: ['Analista N3', 'Causa raiz, mudanças planejadas e contato técnico com fabricantes.', 'Impacto em vários clientes ou decisão de risco.', 'Assumir em até 1 h; P1 imediato.'] },
        { lvl: 'supervisao', c: ['Supervisor', 'Dono da fila e do SLA; comunica o cliente em P1 e P2.', 'SLA acima de 80% ou P1 aberto há mais de 1 h.', 'Acompanha P1 desde a abertura.'] },
        { lvl: 'gestao', c: ['Coordenação', 'Gestão de crise, prioridade entre equipes e mudanças emergenciais.', 'Impacto contratual, cliente estratégico ou incidente de segurança.', 'Acionada em até 1 h de P1 sem previsão.'] }
    ];
    var TEMPLATES = [
        { key: 'funcional', name: 'Estrutura funcional', desc: 'Diretoria e departamentos clássicos (administrativo, comercial, operações, TI), cada um com coordenação e equipe.',
          make: function () {
              var dep = function (nome) { return T('', 'Gerente ' + nome, 'gerencia', [T('', 'Coordenador', 'coordenacao', vagas('Analista', 'operacional', 2))]); };
              return { levels: copyLevels(STD_LEVELS), tree: T('', 'Diretor-geral', 'diretoria', [dep('Administrativo e financeiro'), dep('Comercial'), dep('Operações'), dep('TI')]), esc: [] };
          } },
        { key: 'ti', name: 'Suporte de TI (N1, N2, N3 e NOC)', desc: 'Service desk em níveis, com squads, especialistas, NOC como coringa e matriz de escalonamento ITIL.',
          make: function () {
              var squad = function (n) { return T('', 'Técnico N2, líder do squad ' + n, 'n2', vagas('Técnico N1', 'n1', 4)); };
              return { tree: T('', 'Gerente de TI', 'diretoria', [T('', 'Coordenador técnico', 'gestao', [
                  T('', 'Supervisor dos squads', 'supervisao', [squad(1), squad(2)]),
                  T('', 'Supervisor de especialistas e NOC', 'supervisao', [
                      T('Analistas N3', 'Causa raiz e mudanças', 'n3', vagas('Analista', 'n3', 2), { group: true }),
                      T('NOC', 'Monitoramento 24x7, coringa entre squads', 'noc', vagas('Operador NOC', 'noc', 2), { group: true, dashed: true })
                  ])
              ])]), esc: ESC_TI.map(function (r) { return { lvl: r.lvl, c: r.c.slice() }; }),
                  levels: copyLevels(LEGACY_LEVELS).map(function (l) { if (l.key === 'noc') { l.label = 'NOC'; } return l; }) };
          } },
        { key: 'projetos', name: 'Escritório de projetos', desc: 'Sócios, coordenação de projetos, projetistas por disciplina e apoio administrativo (arquitetura, engenharia).',
          make: function () {
              return { levels: copyLevels(STD_LEVELS), tree: T('Sócios', 'Direção do escritório', 'conselho', [
                  T('', 'Coordenador de projetos', 'coordenacao', [
                      T('Arquitetura', 'Projetos e compatibilização', 'especialista', vagas('Projetista', 'especialista', 2).concat(vagas('Estagiário', 'operacional', 1)), { group: true }),
                      T('Engenharia', 'Estrutural e instalações', 'especialista', vagas('Projetista', 'especialista', 2), { group: true })
                  ]),
                  T('', 'Administrativo e financeiro', 'gerencia', vagas('Assistente', 'operacional', 1)),
                  T('', 'Consultoria jurídica', 'especialista', [], { kind: 'terceiro', dashed: true })
              ], { group: true }), esc: [] };
          } },
        { key: 'clinica', name: 'Clínica', desc: 'Direção, responsável técnico, corpo clínico, recepção e administrativo.',
          make: function () {
              return { levels: copyLevels(STD_LEVELS), tree: T('', 'Direção', 'diretoria', [
                  T('', 'Secretaria executiva', 'operacional', [], { kind: 'assessoria' }),
                  T('', 'Responsável técnico', 'gerencia', [T('Corpo clínico', 'Profissionais de saúde', 'especialista', vagas('Profissional', 'especialista', 3), { group: true })]),
                  T('', 'Gerente administrativo', 'gerencia', [
                      T('Recepção', 'Agenda e atendimento', 'supervisao', vagas('Recepcionista', 'operacional', 2), { group: true }),
                      T('', 'Financeiro e faturamento', 'coordenacao')
                  ])
              ]), esc: [] };
          } },
        { key: 'vazio', name: 'Em branco', desc: 'Só o topo, para montar do zero.',
          make: function () { return { levels: copyLevels(STD_LEVELS), tree: T('', 'Direção', 'diretoria'), esc: [] }; } }
    ];
    // Elementos padrão de organograma (padrão de mercado: Visio, Lucidchart).
    var PALETTE = [
        { kind: 'cargo', label: 'Cargo', icon: 'ti-user' },
        { kind: 'area', label: 'Área ou equipe', icon: 'ti-users-group' },
        { kind: 'vaga', label: 'Vaga em aberto', icon: 'ti-user-question' },
        { kind: 'assessoria', label: 'Assessoria', icon: 'ti-user-star' },
        { kind: 'terceiro', label: 'Terceiro ou consultor', icon: 'ti-user-share' }
    ];

    function escHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function norm(s) {
        return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function mount(root) {
        if (root.__cxOrg) { return root.__cxOrg; }
        var editable = root.getAttribute('data-editable') === '1';
        var input = root.getAttribute('data-input') ? document.getElementById(root.getAttribute('data-input')) : null;
        var srcEl = root.getAttribute('data-source') ? document.getElementById(root.getAttribute('data-source')) : null;
        var saveUrl = root.getAttribute('data-save') || '';
        var docId = root.getAttribute('data-doc') || '';
        var title = root.getAttribute('data-title') || '';
        var code = root.getAttribute('data-code') || '';

        var S = null, sel = null, selEdge = null, drag = null, z = 1, uid = 0, dirty = false, query = '';
        // Histórico de desfazer/refazer (0.6.7-7, Claudio, 20/09/2026): guarda o
        // ESTADO INTEIRO em JSON a cada mudança. O organograma tem poucas
        // dezenas de kB, e a cópia inteira evita o risco de um desfazer
        // parcial deixar a árvore inconsistente (pai sem o filho que ficou).
        var hist = [], hpos = -1, hkey = '', hstamp = 0;
        var HIST_MAX = 60;
        // Declarados AQUI, antes do primeiro rebuild(): a declaração `var` é
        // içada, mas a atribuição não — declarar junto das funções abaixo
        // zerava o que o rebuild do mount tinha acabado de montar.
        var byId = {}, parentOf = {}, T = null;
        try { S = srcEl ? JSON.parse(srcEl.textContent || 'null') : null; } catch (e) { S = null; }
        if (!S || (!S.nodes && !S.tree)) {
            S = { kind: 'organograma', levels: copyLevels(STD_LEVELS), esc: [],
                  nodes: [{ id: 'n1', name: '', role: 'Direção', lvl: 'diretoria', note: '' }], edges: [] };
        }
        normalize(S);
        rebuild();
        hist = [ser()];
        hpos = 0;

        // ---- estrutura -------------------------------------------------
        root.classList.add('cx-org');
        root.innerHTML =
            '<div class="cx-org-tools">' +
                '<button type="button" class="cx-org-btn cx-org-btn--full" data-act="full" data-el="fullBtn"><i class="ti ti-maximize"></i> Tela cheia</button>' +
                (editable ? '<button type="button" class="cx-org-btn cx-org-btn--primary cx-org-btn--save" data-act="save"><i class="ti ti-device-floppy"></i> Salvar</button>' : '') +
                (editable ? '<output class="cx-org-savestate" data-el="savestate" aria-live="polite"></output>' : '') +
                (editable ? '<button type="button" class="cx-org-btn cx-org-btn--primary" data-act="add">Nova pessoa</button>' : '') +
                (editable ? '<span class="cx-org-zoom">' +
                    '<button type="button" class="cx-org-btn" data-act="undo" title="Desfazer (Ctrl+Z)" aria-label="Desfazer" disabled><i class="ti ti-arrow-back-up"></i></button>' +
                    '<button type="button" class="cx-org-btn" data-act="redo" title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer" disabled><i class="ti ti-arrow-forward-up"></i></button>' +
                '</span>' : '') +
                '<span class="cx-org-zoom"><button type="button" class="cx-org-btn" data-act="zout" aria-label="Diminuir zoom">−</button>' +
                '<output data-el="zlbl">100%</output>' +
                '<button type="button" class="cx-org-btn" data-act="zin" aria-label="Aumentar zoom">+</button></span>' +
                '<button type="button" class="cx-org-btn" data-act="fit">Ajustar à tela</button>' +
                (editable ? '<button type="button" class="cx-org-btn" data-act="tidy" title="Devolve todos os elementos ao arranjo automático"><i class="ti ti-layout-distribute-vertical"></i> Arrumar</button>' : '') +
                '<label class="cx-org-search"><span class="cx-org-sr">Buscar pessoa</span>' +
                    '<input type="search" data-el="q" placeholder="Buscar pessoa ou cargo…" autocomplete="off">' +
                    '<span data-el="qcount" class="cx-org-qcount"></span></label>' +
                (editable ? '<button type="button" class="cx-org-btn" data-act="tpl"><i class="ti ti-layout-grid"></i> Modelos</button>' : '') +
                (editable ? '<button type="button" class="cx-org-btn" data-act="lv"><i class="ti ti-stack-2"></i> Níveis</button>' : '') +
                (editable ? '<button type="button" class="cx-org-btn" data-act="io">Importar ou exportar</button>' : '') +
                '<button type="button" class="cx-org-btn" data-act="print"><i class="ti ti-printer"></i> PDF</button>' +
            '</div>' +
            (editable ? '<div class="cx-org-palette" data-el="palette"></div>' : '') +
            (editable ? '<div class="cx-org-draghint" data-el="dragHint" hidden></div>' : '') +
            '<div class="cx-org-legend" data-el="legend"></div>' +
            '<div class="cx-org-stagewrap"><div class="cx-org-stage" data-el="stage"><div class="cx-org-tree" data-el="tree"></div></div>' +
            '<button type="button" class="cx-org-corner" data-act="full" data-el="fullCorner" title="Tela cheia" aria-label="Tela cheia"><i class="ti ti-maximize"></i></button></div>' +
            (editable ?
            '<aside class="cx-org-editor" data-el="ed" hidden aria-label="Editar pessoa">' +
                '<div class="cx-org-edtop"><h3 data-el="edTitle">Editar</h3><button type="button" class="cx-org-btn" data-act="edclose">Fechar</button></div>' +
                '<label>Nome <small>(vazio = vaga em aberto)</small><input data-f="name" autocomplete="off"></label>' +
                '<label>Cargo ou função<input data-f="role" autocomplete="off"></label>' +
                '<label>Nível<select data-f="lvl"></select></label>' +
                '<label>Responde a<select data-f="parent"></select></label>' +
                '<label>Observação<textarea data-f="note" rows="2" placeholder="Turno, cliente, especialidade…"></textarea></label>' +
                '<label class="cx-org-check"><input type="checkbox" data-f="pend"> A confirmar</label>' +
                '<label class="cx-org-check"><input type="checkbox" data-f="group"> É uma área ou equipe, não uma pessoa</label>' +
                '<label class="cx-org-check"><input type="checkbox" data-f="dashed"> Borda tracejada (externo ou temporário)</label>' +
                '<div class="cx-org-btns"><button type="button" class="cx-org-btn cx-org-btn--primary" data-act="edadd">Adicionar subordinado</button>' +
                '<button type="button" class="cx-org-btn" data-act="unpin" data-el="unpin" hidden>Devolver ao arranjo automático</button>' +
                '<button type="button" class="cx-org-btn cx-org-btn--danger" data-act="eddel">Excluir</button></div>' +
                '<p class="cx-org-hint">Ao excluir, os subordinados passam a responder ao superior de quem saiu; se não houver superior, eles ficam como blocos independentes. As mudanças só ficam gravadas ao clicar em Salvar.</p>' +
            '</aside>' : '') +
            (editable ?
            '<aside class="cx-org-editor cx-org-ledit" data-el="ledit" hidden aria-label="Editar ligação">' +
                '<div class="cx-org-edtop"><h3>Ligação</h3><button type="button" class="cx-org-btn" data-act="lclose">Fechar</button></div>' +
                '<p class="cx-org-hint" data-el="lwho"></p>' +
                '<label class="cx-org-check"><input type="checkbox" data-l="boss"> É a chefia (define o time e a posição)</label>' +
                '<label class="cx-org-check"><input type="checkbox" data-l="dash"> Linha tracejada</label>' +
                '<label>Rótulo<input data-l="label" maxlength="120" autocomplete="off" placeholder="Ex.: reporte funcional"></label>' +
                '<div class="cx-org-btns"><button type="button" class="cx-org-btn cx-org-btn--danger" data-act="ldel">Excluir ligação</button></div>' +
                '<p class="cx-org-hint" data-el="lmsg"></p>' +
            '</aside>' : '') +
            '<section class="cx-org-esc">' +
                '<h3>Matriz de escalonamento</h3>' +
                '<div class="cx-org-tablewrap"><table><thead><tr><th>Nível</th><th>Papel</th><th>Escala para o próximo nível quando</th><th>Tempo alvo</th>' +
                (editable ? '<th class="x"></th>' : '') + '</tr></thead><tbody data-el="esc"></tbody></table></div>' +
                (editable ? '<div class="cx-org-btns"><button type="button" class="cx-org-btn" data-act="escadd">Adicionar linha</button></div>' : '') +
            '</section>' +
            (editable ?
            '<dialog class="cx-org-io" data-el="io">' +
                '<h3>Importar ou exportar</h3>' +
                '<p>Copie o conteúdo para guardar esta versão. Para trazer um organograma (por exemplo, o exportado pelo protótipo), cole o conteúdo e aplique.</p>' +
                '<textarea data-el="ioText" spellcheck="false"></textarea><div data-el="ioMsg" class="cx-org-iomsg"></div>' +
                '<div class="cx-org-btns"><button type="button" class="cx-org-btn cx-org-btn--primary" data-act="ioapply">Aplicar conteúdo colado</button>' +
                '<button type="button" class="cx-org-btn" data-act="iocopy">Copiar</button>' +
                '<button type="button" class="cx-org-btn" data-act="ioclose">Fechar</button></div>' +
            '</dialog>' +
            (editable ?
            '<dialog class="cx-org-io cx-org-move" data-el="bossdlg">' +
                '<h3>Quem é o chefe?</h3>' +
                '<p data-el="bossText"></p>' +
                '<p>Cada elemento responde a um só. Trocando, ele e o time dele passam para debaixo do novo chefe.</p>' +
                '<div class="cx-org-btns">' +
                '<button type="button" class="cx-org-btn cx-org-btn--primary" data-act="btrocar"></button>' +
                '<button type="button" class="cx-org-btn" data-act="breporte">Deixar como reporte</button>' +
                '<button type="button" class="cx-org-btn" data-act="bcancel">Cancelar</button></div>' +
            '</dialog>' : '') +
            '<dialog class="cx-org-io cx-org-move" data-el="movedlg">' +
                '<h3 data-el="mvTitle">Mover</h3>' +
                '<p data-el="mvText"></p>' +
                '<div class="cx-org-btns">' +
                '<button type="button" class="cx-org-btn cx-org-btn--primary" data-act="mvleave"></button>' +
                '<button type="button" class="cx-org-btn" data-act="mvwith"></button>' +
                '<button type="button" class="cx-org-btn" data-act="mvcancel">Cancelar</button></div>' +
            '</dialog>' +
            '<dialog class="cx-org-io" data-el="lvdlg">' +
                '<h3>Níveis deste organograma</h3>' +
                '<p>Nome e cor de cada nível, de cima para baixo. Um nível em uso não pode ser excluído: mude antes as pessoas dele.</p>' +
                '<div class="cx-org-lvlist" data-el="lvlist"></div>' +
                '<div class="cx-org-btns"><button type="button" class="cx-org-btn" data-act="lvadd"><i class="ti ti-plus"></i> Novo nível</button>' +
                '<button type="button" class="cx-org-btn cx-org-btn--primary" data-act="lvclose">Pronto</button></div>' +
            '</dialog>' +
            '<dialog class="cx-org-io" data-el="eldlg">' +
                '<h3>Criar elemento</h3>' +
                '<p>O elemento entra na paleta deste organograma, ao lado dos padrão. Ex.: "Coringa NOC", "Plantonista", "Estagiário".</p>' +
                '<label class="cx-org-field">Nome<input data-g="elname" maxlength="40" autocomplete="off"></label>' +
                '<label class="cx-org-field">É<select data-g="elbase"><option value="pessoa">uma pessoa (cargo)</option><option value="equipe">uma área ou equipe</option></select></label>' +
                '<label class="cx-org-field">Nível<select data-g="ellvl"></select></label>' +
                '<label class="cx-org-check"><input type="checkbox" data-g="eldashed"> Borda tracejada (externo ou temporário)</label>' +
                '<div data-el="elMsg" class="cx-org-iomsg"></div>' +
                '<div class="cx-org-btns"><button type="button" class="cx-org-btn cx-org-btn--primary" data-act="elsave">Criar</button>' +
                '<button type="button" class="cx-org-btn" data-act="elclose">Cancelar</button></div>' +
            '</dialog>' +
            '<dialog class="cx-org-io cx-org-tpl" data-el="tpl">' +
                '<h3>Começar de um modelo</h3>' +
                '<p>O modelo substitui o organograma atual (a matriz também, se o modelo trouxer uma). Nada fica gravado até clicar em Salvar.</p>' +
                '<div class="cx-org-tplgrid">' + TEMPLATES.map(function (t) {
                    return '<button type="button" class="cx-org-tplcard" data-tpl="' + t.key + '"><strong>' + escHtml(t.name) + '</strong><span>' + escHtml(t.desc) + '</span></button>';
                }).join('') + '</div>' +
                '<div class="cx-org-btns"><button type="button" class="cx-org-btn" data-act="tplclose">Fechar</button></div>' +
            '</dialog>' : '');

        function $(name) { return root.querySelector('[data-el="' + name + '"]'); }
        function F(name) { return root.querySelector('[data-f="' + name + '"]'); }
        function G(name) { return root.querySelector('[data-g="' + name + '"]'); }
        var treeEl = $('tree'), stage = $('stage'), ed = $('ed');

        // ---- modelo ----------------------------------------------------
        function walk(n, f, p, d) { p = p || null; d = d || 0; f(n, p, d); n.kids.forEach(function (k) { walk(k, f, n, d + 1); }); }

        // ---- grafo (bloco 2a) ---------------------------------------------
        // O modelo gravado é `nodes` + `edges`. A árvore que o desenho usa é
        // DERIVADA: rebuild() pendura um `kids` transitório em cada nó, e
        // ser() tira esse `kids` de volta na hora de gravar. Assim todo o
        // código de desenho (card, row, legenda, PDF) continua o mesmo.
        function ser(pretty) {
            return JSON.stringify(S, function (k, v) { return k === 'kids' ? undefined : v; }, pretty ? 2 : 0);
        }
        function rebuild() {
            byId = {}; parentOf = {}; T = null;
            S.nodes.forEach(function (n) { n.kids = []; byId[n.id] = n; });
            S.edges.forEach(function (e) {
                var f = byId[e.from], t = byId[e.to];
                // Quem manda é a ligação marcada como CHEFIA (2d-1). As demais
                // são reporte: aparecem no desenho e não mexem no arranjo.
                if (!f || !t || !e.boss || parentOf[e.to]) { return; }
                parentOf[e.to] = e.from;
                f.kids.push(t);
            });
            for (var i = 0; i < S.nodes.length; i++) {
                if (!parentOf[S.nodes[i].id]) { T = S.nodes[i]; break; }
            }
            if (!T) { T = S.nodes[0]; }
            return T;
        }
        // Converte a árvore do formato antigo. A ordem das ligações É a ordem
        // dos irmãos, por isso a varredura é em profundidade (igual ao PHP).
        function fromTree(tree) {
            var nodes = [], edges = [], k = 0;
            (function go(n, pid) {
                if (!n || typeof n !== 'object') { return; }
                var copy = {}, key;
                for (key in n) { if (key !== 'kids' && Object.prototype.hasOwnProperty.call(n, key)) { copy[key] = n[key]; } }
                if (!copy.id) { copy.id = 'n' + (++k + 100000); }
                nodes.push(copy);
                if (pid) { edges.push({ id: 'e' + edges.length, from: pid, to: copy.id }); }
                (n.kids || []).forEach(function (c) { go(c, copy.id); });
            })(tree, null);
            return { nodes: nodes, edges: edges };
        }
        // Índice da ligação de CHEFIA que chega ao elemento: é ela que define
        // a ordem entre irmãos e é ela que sai quando o elemento muda de chefe.
        function edgeIndexTo(id) {
            for (var i = 0; i < S.edges.length; i++) { if (S.edges[i].to === id && S.edges[i].boss) { return i; } }
            return -1;
        }
        function detach(id) {
            var i = edgeIndexTo(id);
            if (i >= 0) { S.edges.splice(i, 1); }
        }
        function attach(from, to, at) {
            var e = { id: 'e' + Date.now().toString(36) + S.edges.length, from: from, to: to, boss: true, style: 'solida', label: '' };
            if (at === undefined || at < 0 || at > S.edges.length) { S.edges.push(e); } else { S.edges.splice(at, 0, e); }
        }
        // Tira o nó e sobe os filhos dele para o lugar que ele ocupava entre
        // os irmãos — uma passada só, sem conta de índice deslocado.
        // Exclui qualquer elemento, menos o último que sobrar. Com superior,
        // os subordinados passam a responder a ele, no lugar de quem saiu; sem
        // superior (topo ou elemento solto), viram blocos independentes.
        function removeNode(id) {
            var f = find(id);
            if (!f || S.nodes.length < 2) { return; }
            var pid = f.p ? f.p.id : null, out = [], done = false;
            S.edges.forEach(function (e) {
                if (pid && e.to === id && e.from === pid && !done) {
                    S.edges.forEach(function (k) {
                        if (k.from === id) { out.push({ id: k.id, from: pid, to: k.to, boss: k.boss, style: k.style, label: k.label }); }
                    });
                    done = true; return;
                }
                if (e.from === id || e.to === id) { return; }
                out.push(e);
            });
            S.edges = out;
            S.nodes = S.nodes.filter(function (n) { return n.id !== id; });
        }
        function normalize(s) {
            var m = 0;
            if (!s.nodes && s.tree) { var g = fromTree(s.tree); s.nodes = g.nodes; s.edges = g.edges; }
            delete s.tree;
            s.kind = s.kind || 'organograma';
            s.nodes = Array.isArray(s.nodes) ? s.nodes.filter(function (n) { return n && n.id; }) : [];
            s.edges = Array.isArray(s.edges) ? s.edges : [];
            if (!s.nodes.length) { s.nodes = [{ id: 'n1', name: '', role: 'Direção', lvl: '', note: '' }]; }
            // Sem níveis gravados = organograma de antes da 0.6.7-5: ganha os
            // níveis que já usava, e o NOC continua tracejado como era.
            var legacy = !Array.isArray(s.levels) || !s.levels.length;
            if (legacy) { s.levels = copyLevels(LEGACY_LEVELS); }
            s.levels = s.levels.filter(function (l) { return l && l.key; }).map(function (l) {
                return { key: String(l.key), label: String(l.label || l.key), color: /^#[0-9a-f]{6}$/i.test(l.color || '') ? l.color : '#5a6575' };
            });
            var keys = s.levels.map(function (l) { return l.key; });
            var last = keys[keys.length - 1];
            s.elements = Array.isArray(s.elements) ? s.elements.filter(function (e) { return e && e.id && e.label; }) : [];
            var ids = {};
            s.nodes.forEach(function (n) {
                n.id = String(n.id);
                n.name = n.name || ''; n.role = n.role || ''; n.note = n.note || '';
                if (keys.indexOf(n.lvl) < 0) { n.lvl = last; }
                if (legacy && n.lvl === 'noc' && n.dashed === undefined) { n.dashed = true; }
                ids[n.id] = true;
                var k = parseInt(n.id.replace(/\D/g, ''), 10);
                if (k > m) { m = k; }
            });
            uid = m;
            // Ligação órfã, laço, repetida ou que fecharia ciclo é descartada:
            // o desenho anda pelas ligações e um ciclo o travaria.
            // Diagrama sem marca nenhuma = gravado antes da chefia explícita:
            // a primeira ligação que chega vira a chefia, que é como ele já era
            // desenhado. Com marcas presentes, vale o que está marcado.
            var semMarca = !s.edges.some(function (e) { return e && e.boss; });
            var pai = {}, vistos = {};
            s.edges = s.edges.filter(function (e) {
                if (!e || !ids[e.from] || !ids[e.to] || e.from === e.to) { return false; }
                var par = e.from + '>' + e.to;
                if (vistos[par]) { return false; }
                vistos[par] = true;
                e.id = e.id || ('e' + Object.keys(vistos).length + Date.now().toString(36));
                e.style = e.style === 'tracejada' ? 'tracejada' : 'solida';
                e.label = e.label || '';
                e.boss = !!e.boss || semMarca;
                if (!e.boss) { return true; }
                // Um chefe por elemento, e sem ciclo: o arranjo anda por aqui.
                if (pai[e.to]) { e.boss = false; return true; }
                var at = e.from, guard = 0;
                while (pai[at] && guard++ < 5000) { if (at === e.to) { break; } at = pai[at]; }
                if (at === e.to) { e.boss = false; return true; }
                pai[e.to] = e.from;
                return true;
            });
            if (!Array.isArray(s.esc)) { s.esc = []; }
            s.esc.forEach(function (r) { if (keys.indexOf(r.lvl) < 0) { r.lvl = last; } });
        }
        function levelOf(k) { return S.levels.filter(function (l) { return l.key === k; })[0] || S.levels[S.levels.length - 1]; }
        function lc(k) { return '--lc:' + levelOf(k).color; }
        function nextLevel(k) {
            var i = S.levels.map(function (l) { return l.key; }).indexOf(k);
            return (S.levels[Math.min(i + 1, S.levels.length - 1)] || S.levels[0]).key;
        }
        function levelUsed(k) { return S.nodes.some(function (n) { return n.lvl === k; }) || S.esc.some(function (r) { return r.lvl === k; }); }
        function levelOptions(selected, withAuto) {
            return (withAuto ? '<option value="">Conforme a posição</option>' : '') + S.levels.map(function (l) {
                return '<option value="' + escHtml(l.key) + '"' + (l.key === selected ? ' selected' : '') + '>' + escHtml(l.label) + '</option>';
            }).join('');
        }
        function P(name, role, lvl) { return { id: 'n' + (++uid), name: name, role: role, lvl: lvl, kids: [], note: '' }; }
        function find(id) { var n = byId[id]; return n ? { n: n, p: parentOf[id] ? byId[parentOf[id]] : null } : null; }
        function isIn(a, b) { var f = false; walk(a, function (n) { if (n.id === b.id) { f = true; } }); return f; }
        function label(n) { return n.name.trim() || (n.lvl === 'noc' ? 'Coringa a definir' : 'Vaga em aberto'); }
        function commit(key) {
            rebuild();
            if (input) { input.value = ser(); dirty = true; }
            pushHist(key);
            agendaAuto();
        }
        // `key` agrupa alterações seguidas do mesmo campo do mesmo nó: um
        // caractere digitado não é um passo de desfazer. Sem `key`, cada
        // commit vira um passo (mover, excluir, trocar nível, aplicar modelo).
        function pushHist(key) {
            if (!editable) { return; }
            var json = ser(), now = Date.now();
            if (hist[hpos] === json) { return; }
            if (key && key === hkey && (now - hstamp) < 900 && hpos > 0) {
                hist[hpos] = json; hstamp = now; return;
            }
            hist.splice(hpos + 1, hist.length);
            hist.push(json);
            if (hist.length > HIST_MAX) { hist.shift(); }
            hpos = hist.length - 1; hkey = key || ''; hstamp = now;
            syncHist();
        }
        function syncHist() {
            var u = root.querySelector('[data-act="undo"]'), r = root.querySelector('[data-act="redo"]');
            if (u) { u.disabled = hpos <= 0; }
            if (r) { r.disabled = hpos >= hist.length - 1; }
        }
        // Volta (-1) ou avança (+1) um passo. Recompõe tudo: a seleção pode
        // apontar para alguém que deixou de existir no estado restaurado.
        function jump(d) {
            if (!editable) { return; }
            var i = hpos + d, s;
            if (i < 0 || i >= hist.length) { return; }
            try { s = JSON.parse(hist[i]); } catch (e) { return; }
            hpos = i; hkey = ''; hstamp = 0;
            normalize(s); S = s; rebuild();
            if (sel && !find(sel)) { sel = null; }
            if (input) { input.value = ser(); dirty = true; }
            if (ed) { ed.hidden = !sel; }
            render(); renderEsc(); renderPalette(); renderLevels();
            if (sel) { fill(); }
            syncHist();
        }
        function hit(n) {
            if (!query) { return ''; }
            return norm(n.name + ' ' + n.role + ' ' + n.note).indexOf(query) >= 0 ? ' is-hit' : ' is-dim';
        }

        // ---- desenho ---------------------------------------------------
        // Filhos sem equipe viram LINHAS dentro do cartão do chefe; filhos com
        // equipe viram cartão próprio. Essa regra é a mesma na tela e no PDF.
        // Caixa própria: quem tem equipe, quem não tem chefe, e quem foi
        // posicionado à mão. Os demais são linhas dentro do cartão do chefe.
        function isBox(n) { return !parentOf[n.id] || n.kids.length > 0 || isFree(n); }
        function leavesOf(n) { return n.kids.filter(function (k) { return !isBox(k); }); }
        function branchesOf(n) { return n.kids.filter(isBox); }
        function cardInner(n) {
            var cls = 'cx-org-card' + (n.group ? ' is-group' : '') + (n.dashed ? ' is-dashed' : '') + (sel === n.id ? ' is-sel' : '') + hit(n);
            var leaves = leavesOf(n);
            return '<div class="' + cls + '" style="' + lc(n.lvl) + '" data-id="' + escHtml(n.id) + '" tabindex="0"' +
                (editable ? ' data-grab="1"' : '') + ' title="' + escHtml(n.note) + '">' +
                '<div class="cx-org-head"><strong class="' + (n.name.trim() ? '' : 'is-vaga') + '">' + escHtml(label(n)) + '</strong>' +
                '<span class="cx-org-role">' + escHtml(n.role) + '</span>' + tags(n) + '</div>' +
                (leaves.length ? '<div class="cx-org-rows">' + leaves.map(row).join('') + '</div>' : '') +
                '</div>';
        }
        // Aninhado, para o PDF (o motor de impressão continua usando o CSS de
        // lista). A tela usa layoutTree(), que posiciona cada caixa.
        function card(n) {
            var br = branchesOf(n);
            return '<li>' + cardInner(n) + (br.length ? '<ul>' + br.map(card).join('') + '</ul>' : '') + '</li>';
        }
        function row(n) {
            return '<div class="cx-org-row' + (n.name.trim() ? '' : ' is-vaga') + (n.dashed ? ' is-dashed' : '') + (sel === n.id ? ' is-sel' : '') + hit(n) + '" style="' + lc(n.lvl) +
                '" data-id="' + escHtml(n.id) + '" tabindex="0"' + (editable ? ' data-grab="1"' : '') +
                ' title="' + escHtml([n.role, n.note].filter(Boolean).join('\n')) + '">' + escHtml(label(n)) + tags(n) + '</div>';
        }
        function tags(n) {
            return (n.kind === 'assessoria' ? '<span class="cx-org-tag">assessoria</span>' : '') +
                (n.kind === 'terceiro' ? '<span class="cx-org-tag">externo</span>' : '') +
                (n.pend ? '<span class="cx-org-pend">a confirmar</span>' : '');
        }
        function legendHtml() {
            var c = {}, vagas = 0, total = 0;
            S.nodes.forEach(function (n) {
                if (n.group) { return; }
                if (!n.name.trim()) { vagas++; return; }
                c[n.lvl] = (c[n.lvl] || 0) + 1; total++;
            });
            return S.levels.map(function (l) {
                return '<span style="--lc:' + l.color + '"><i></i>' + escHtml(l.label) + ' <b>' + (c[l.key] || 0) + '</b></span>';
            }).join('') + '<span><i class="is-dash"></i>Vagas em aberto <b>' + vagas + '</b></span><span>Pessoas nomeadas <b>' + total + '</b></span>';
        }
        // ---- posicionamento (bloco 2b) ---------------------------------
        // A lista aninhada saiu: cada cartão é uma caixa posicionada, e as
        // ligações são traçadas em SVG. É o que permite, no 2c, um elemento
        // ficar onde o usuário largar sem quebrar o arranjo dos outros.
        var HGAP = 14, VGAP = 48, GRID = 10, GUIDE_TOL = 8;
        // Última geometria calculada (id -> {x,y,w,h}). O arraste usa para
        // alinhar com os outros elementos sem ter que remedir o DOM.
        var geom = {}, origin = { x: 0, y: 0 };
        function isFree(n) { return typeof n.x === 'number' && typeof n.y === 'number'; }
        function snap(v) { return Math.max(0, Math.round(v / GRID) * GRID); }
        // Ponto do evento em coordenada do canvas. O zoom é CSS, e o
        // getBoundingClientRect já vem escalado: dividir por z devolve a
        // coordenada real onde a caixa deve ficar.
        function pointOf(e) {
            var canvas = treeEl.querySelector('[data-el="canvas"]');
            if (!canvas) { return null; }
            var r = canvas.getBoundingClientRect();
            // Menos a origem: devolve coordenada NO MESMO espaço em que as
            // posições são gravadas e em que as guias são calculadas.
            return { x: (e.clientX - r.left) / (z || 1) - origin.x, y: (e.clientY - r.top) / (z || 1) - origin.y };
        }
        function freeAt(id, pt, grab) {
            var f = find(id); if (!f || !pt) { return; }
            f.n.x = snap(pt.x - (grab && grab.dx ? grab.dx : 0));
            f.n.y = snap(pt.y - (grab && grab.dy ? grab.dy : 0));
        }
        function reanchor(id) {
            var f = find(id); if (!f) { return; }
            delete f.n.x; delete f.n.y;
        }
        // Cartão próprio: quem tem equipe, e quem não tem chefe (elemento
        // sem ligação — ele não pode ser linha dentro do cartão de ninguém).
        function roots() { return S.nodes.filter(function (n) { return !parentOf[n.id]; }); }
        function cardList() { return S.nodes.filter(isBox); }
        function layoutTree() {
            var list = cardList(), box = {}, wcache = {};

            treeEl.innerHTML = '<div class="cx-org-canvas" data-el="canvas">' +
                '<svg class="cx-org-links" data-el="links" aria-hidden="true"><g data-el="guides"></g></svg>' +
                list.map(function (n) {
                    return '<div class="cx-org-box' + (isFree(n) ? ' is-free' : '') + '" data-box="' + escHtml(n.id) + '">' + cardInner(n) +
                        (editable ? ['t', 'r', 'b', 'l'].map(function (p) {
                            return '<span class="cx-org-port is-' + p + '" data-port="' + escHtml(n.id) + '" title="Puxe daqui para ligar a outro elemento"></span>';
                        }).join('') : '') + '</div>';
                }).join('') +
                '</div>';
            var canvas = treeEl.querySelector('[data-el="canvas"]');

            list.forEach(function (n) {
                var el = canvas.querySelector('[data-box="' + n.id.replace(/["\\]/g, '') + '"]');
                // Ambiente sem layout (teste headless) devolve 0: a estimativa
                // mantém o arranjo coerente para poder ser conferido.
                var w = (el && el.offsetWidth) || 200;
                var h = (el && el.offsetHeight) || (42 + leavesOf(n).length * 22);
                box[n.id] = { el: el, w: w, h: h, x: 0, y: 0 };
            });

            function blockW(n) {
                if (wcache[n.id] !== undefined) { return wcache[n.id]; }
                var kids = branchesOf(n), sum = 0;
                kids.forEach(function (k, j) { sum += blockW(k) + (j ? HGAP : 0); });
                return (wcache[n.id] = kids.length ? Math.max(box[n.id].w, sum) : box[n.id].w);
            }
            function put(n, left, top) {
                var b = box[n.id], total = blockW(n), kids = branchesOf(n), sum = 0, at;
                b.x = left + (total - b.w) / 2;
                b.y = top;
                kids.forEach(function (k, j) { sum += blockW(k) + (j ? HGAP : 0); });
                at = left + (total - sum) / 2;
                kids.forEach(function (k) { put(k, at, top + b.h + VGAP); at += blockW(k) + HGAP; });
            }
            // Cada bloco sem chefe é arrumado por si; o primeiro é o topo do
            // organograma, os demais ficam à direita até o usuário posicioná-los.
            var at = 0;
            roots().forEach(function (r) {
                if (!box[r.id]) { return; }
                put(r, at, 0);
                at += blockW(r) + HGAP * 4;
            });

            // Elemento solto (x/y próprios) fica onde o usuário largou, e leva
            // a equipe junto: o deslocamento vale para toda a descendência.
            (function livres(n) {
                var b = box[n.id];
                if (b && isFree(n)) {
                    var dx = n.x - b.x, dy = n.y - b.y;
                    walk(n, function (m) { if (box[m.id]) { box[m.id].x += dx; box[m.id].y += dy; } });
                }
                branchesOf(n).forEach(livres);
            })(T);
            roots().forEach(function (r) { if (r !== T) { (function livres(n) {
                var b = box[n.id];
                if (b && isFree(n)) {
                    var dx = n.x - b.x, dy = n.y - b.y;
                    walk(n, function (m) { if (box[m.id]) { box[m.id].x += dx; box[m.id].y += dy; } });
                }
                branchesOf(n).forEach(livres);
            })(r); } });

            // Quem foi para o negativo (equipe que acompanhou um cartão movido
            // para a borda) é acomodado por uma ORIGEM de desenho, não mexendo
            // na coordenada de cada um: a posição gravada tem que continuar
            // significando a mesma coisa na próxima abertura, senão o cartão
            // não fica onde a guia mostrou.
            var minX = 0, minY = 0, W = 0, H = 0;
            list.forEach(function (n) {
                var b = box[n.id];
                if (b.x < minX) { minX = b.x; }
                if (b.y < minY) { minY = b.y; }
            });
            origin = { x: Math.max(0, -minX), y: Math.max(0, -minY) };
            list.forEach(function (n) {
                var b = box[n.id];
                W = Math.max(W, b.x + b.w + origin.x);
                H = Math.max(H, b.y + b.h + origin.y);
                if (b.el) {
                    b.el.style.left = Math.round(b.x + origin.x) + 'px';
                    b.el.style.top = Math.round(b.y + origin.y) + 'px';
                }
            });
            canvas.style.width = Math.ceil(W) + 'px';
            canvas.style.height = Math.ceil(H) + 'px';

            geomTmp = box;
            var linhas = '';
            S.edges.forEach(function (e) {
                var ai = boxOf(e.from), bi = boxOf(e.to);
                if (!ai || !bi || ai === bi) { return; }
                var b = box[ai], c = box[bi];
                if (!b || !c) { return; }
                var p = linkPath(b, c);
                var cls = 'cx-org-link' + (e.boss ? '' : ' is-rep') + (e.style === 'tracejada' ? ' is-dash' : '') +
                    (selEdge === e.id ? ' is-sel' : '');
                linhas += '<path class="' + cls + '" d="' + p.d + '"/>' +
                    '<path class="cx-org-hit" data-edge="' + escHtml(e.id) + '" d="' + p.d + '"/>';
                if (e.label) {
                    linhas += '<text class="cx-org-elabel" x="' + p.mx + '" y="' + (p.my - 4) + '" text-anchor="middle">' + escHtml(e.label) + '</text>';
                }
            });
            var svg = canvas.querySelector('[data-el="links"]');
            svg.setAttribute('width', Math.ceil(W));
            svg.setAttribute('height', Math.ceil(H));
            svg.setAttribute('viewBox', '0 0 ' + Math.ceil(W) + ' ' + Math.ceil(H));
            svg.innerHTML = '<g transform="translate(' + origin.x + ',' + origin.y + ')">' +
                '<g data-el="guides"></g>' + linhas + '</g>';
            geom = box;
        }

        // Por onde a linha sai e entra depende de ONDE o filho está. A receita
        // única "sai por baixo, atravessa, entra por cima" só serve para o
        // filho abaixo do pai; lado a lado ela virava um traço solto no meio
        // (relato de Claudio, 20/09). Folga de 8 px para considerar "abaixo".
        function linkPath(b, c) {
            var R = Math.round, folga = 8;
            var bx = b.x + b.w / 2, by = b.y + b.h / 2;
            var cx = c.x + c.w / 2, cy = c.y + c.h / 2;
            if (c.y >= b.y + b.h + folga) {                       // abaixo
                var ym = R(b.y + b.h + (c.y - b.y - b.h) / 2);
                return { d: 'M' + R(bx) + ' ' + R(b.y + b.h) + 'V' + ym + 'H' + R(cx) + 'V' + R(c.y), mx: R((bx + cx) / 2), my: ym };
            }
            if (c.y + c.h + folga <= b.y) {                       // acima
                var ya = R(c.y + c.h + (b.y - c.y - c.h) / 2);
                return { d: 'M' + R(bx) + ' ' + R(b.y) + 'V' + ya + 'H' + R(cx) + 'V' + R(c.y + c.h), mx: R((bx + cx) / 2), my: ya };
            }
            if (c.x >= b.x + b.w) {                               // à direita
                var xm = R(b.x + b.w + (c.x - b.x - b.w) / 2);
                return { d: 'M' + R(b.x + b.w) + ' ' + R(by) + 'H' + xm + 'V' + R(cy) + 'H' + R(c.x), mx: xm, my: R((by + cy) / 2) };
            }
            if (c.x + c.w <= b.x) {                               // à esquerda
                var xe = R(c.x + c.w + (b.x - c.x - c.w) / 2);
                return { d: 'M' + R(b.x) + ' ' + R(by) + 'H' + xe + 'V' + R(cy) + 'H' + R(c.x + c.w), mx: xe, my: R((by + cy) / 2) };
            }
            // Sobrepostos: reta entre os centros, para a ligação não sumir.
            return { d: 'M' + R(bx) + ' ' + R(by) + 'L' + R(cx) + ' ' + R(cy), mx: R((bx + cx) / 2), my: R((by + cy) / 2) };
        }
        // Ligação que chega a quem é linha dentro de um cartão encosta no
        // cartão que o contém: é o que está desenhado na tela.
        function boxOf(id) {
            var at = id, guard = 0;
            while (at && !geomHas(at) && guard++ < 100) { at = parentOf[at]; }
            return at || null;
        }
        function geomHas(id) { return Object.prototype.hasOwnProperty.call(geomTmp, id); }
        var geomTmp = {};

        // ---- guias de alinhamento (bloco 2c-1) --------------------------
        // Alinhar "no olho" não funciona: 3 px de diferença já aparecem. Ao
        // arrastar, as bordas e o centro do elemento procuram as bordas e o
        // centro dos outros; achando, a guia acende e a posição gruda nela.
        function alignTo(x, y, w, h, skip) {
            var gx = [], gy = [], bestX = null, bestY = null, id;
            function test(v, alvo, melhor) {
                var dif = Math.abs(v - alvo);
                return dif <= GUIDE_TOL && (melhor === null || dif < Math.abs(melhor.d)) ? { d: alvo - v, at: alvo } : melhor;
            }
            for (id in geom) {
                if (id === skip || !Object.prototype.hasOwnProperty.call(geom, id)) { continue; }
                var o = geom[id];
                [[x, o.x], [x + w / 2, o.x + o.w / 2], [x + w, o.x + o.w]].forEach(function (par) {
                    var r = test(par[0], par[1], bestX);
                    if (r !== bestX) { bestX = r; }
                });
                [[y, o.y], [y + h / 2, o.y + o.h / 2], [y + h, o.y + o.h]].forEach(function (par) {
                    var r = test(par[0], par[1], bestY);
                    if (r !== bestY) { bestY = r; }
                });
            }
            if (bestX) { x += bestX.d; gx.push(bestX.at); }
            if (bestY) { y += bestY.d; gy.push(bestY.at); }
            return { x: x, y: y, gx: gx, gy: gy, colou: !!(bestX || bestY) };
        }
        function showGuides(gx, gy) {
            var canvas = treeEl.querySelector('[data-el="canvas"]');
            var g = canvas && canvas.querySelector('[data-el="guides"]');
            if (!g) { return; }
            var W = parseInt(canvas.style.width, 10) || 0, H = parseInt(canvas.style.height, 10) || 0;
            g.innerHTML = gx.map(function (v) { return '<line class="cx-org-guide" x1="' + v + '" y1="0" x2="' + v + '" y2="' + H + '"/>'; }).join('') +
                gy.map(function (v) { return '<line class="cx-org-guide" x1="0" y1="' + v + '" x2="' + W + '" y2="' + v + '"/>'; }).join('');
        }
        function clearGuides() { showGuides([], []); }
        // Posição final de um arraste: encosta nas guias; sem guia, na grade.
        function dropSpot(id, pt, grab) {
            var b = geom[id] || { w: 200, h: 60 };
            var x = pt.x - (grab && grab.dx ? grab.dx : 0), y = pt.y - (grab && grab.dy ? grab.dy : 0);
            var a = alignTo(x, y, b.w, b.h, id);
            return { x: a.colou ? Math.max(0, Math.round(a.x)) : snap(x), y: a.colou ? Math.max(0, Math.round(a.y)) : snap(y), gx: a.gx, gy: a.gy };
        }
        function render() {
            layoutTree();
            $('legend').innerHTML = legendHtml();
            if (query) {
                var n = treeEl.querySelectorAll('.is-hit').length;
                $('qcount').textContent = n ? n + (n === 1 ? ' encontrado' : ' encontrados') : 'nada encontrado';
            } else {
                $('qcount').textContent = '';
            }
        }
        function renderPalette() {
            if (!editable) { return; }
            $('palette').innerHTML = '<span>Arraste para o organograma:</span>' +
                PALETTE.map(function (p) {
                    return '<span class="cx-org-chip" data-grab="1" data-new="' + p.kind + '" title="Arraste e solte à esquerda, à direita ou em cima de um cartão"><i class="ti ' + p.icon + '"></i> ' + p.label + '</span>';
                }).join('') +
                S.elements.map(function (e) {
                    var l = e.lvl ? levelOf(e.lvl) : null;
                    return '<span class="cx-org-chip is-custom' + (e.dashed ? ' is-dashed' : '') + '" data-grab="1" data-new="el:' + escHtml(e.id) + '"' +
                        (l ? ' style="--lc:' + l.color + '"' : '') + ' title="Elemento criado neste organograma">' +
                        '<i class="ti ' + (e.base === 'equipe' ? 'ti-users-group' : 'ti-user') + '"></i> ' + escHtml(e.label) +
                        '<button type="button" class="cx-org-chipdel" data-eldel="' + escHtml(e.id) + '" aria-label="Excluir o elemento ' + escHtml(e.label) + '">×</button></span>';
                }).join('') +
                '<button type="button" class="cx-org-chip cx-org-chip--new" data-act="elnew"><i class="ti ti-plus"></i> Criar elemento</button>';
        }
        function renderLevels() {
            $('lvlist').innerHTML = S.levels.map(function (l, i) {
                var used = levelUsed(l.key);
                return '<div class="cx-org-lvrow">' +
                    '<input type="color" value="' + l.color + '" data-lvcolor="' + i + '" aria-label="Cor do nível ' + escHtml(l.label) + '">' +
                    '<input type="text" value="' + escHtml(l.label) + '" data-lvlabel="' + i + '" maxlength="40" aria-label="Nome do nível">' +
                    '<button type="button" class="cx-org-btn" data-lvup="' + i + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="Subir">↑</button>' +
                    '<button type="button" class="cx-org-btn cx-org-btn--danger" data-lvdel="' + i + '"' + (used || S.levels.length < 2 ? ' disabled title="Nível em uso"' : '') + '>Excluir</button>' +
                    '</div>';
            }).join('');
        }
        function escRowsHtml(rows) {
            return rows.map(function (r, i) {
                return '<tr style="' + lc(r.lvl) + '">' + r.c.map(function (c, j) {
                    return '<td' + (editable ? ' contenteditable="true" data-r="' + i + '" data-c="' + j + '"' : '') + '>' + escHtml(c) + '</td>';
                }).join('') + (editable ? '<td class="x"><button type="button" class="cx-org-btn" data-del="' + i + '">Remover</button></td>' : '') + '</tr>';
            }).join('');
        }
        function renderEsc() {
            $('esc').innerHTML = S.esc.length ? escRowsHtml(S.esc)
                : '<tr><td colspan="' + (editable ? 5 : 4) + '" class="cx-org-empty">' + (editable ? 'Nenhuma linha ainda. Use "Adicionar linha".' : 'Sem matriz de escalonamento.') + '</td></tr>';
        }

        // ---- zoom e busca ---------------------------------------------
        function setZ(v) { z = Math.min(1.5, Math.max(0.3, v)); treeEl.style.zoom = z; $('zlbl').textContent = Math.round(z * 100) + '%'; }
        function fit() { treeEl.style.zoom = 1; var w = treeEl.scrollWidth; setZ(Math.min(1, (stage.clientWidth - 4) / (w || 1))); }
        function withIds(n) { n.id = 'n' + (++uid); n.kids = (n.kids || []).map(withIds); return n; }

        // Ctrl + roda: zoom mantendo o ponto sob o mouse no lugar.
        stage.addEventListener('wheel', function (e) {
            if (!e.ctrlKey) { return; }
            e.preventDefault();
            var r = stage.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
            var z1 = z, px = (stage.scrollLeft + mx) / z1, py = (stage.scrollTop + my) / z1;
            setZ(z + (e.deltaY < 0 ? 0.1 : -0.1));
            stage.scrollLeft = px * z - mx; stage.scrollTop = py * z - my;
        }, { passive: false });

        // Arrastar o fundo (fora dos cartões) passeia pelo organograma.
        var pan = null;
        stage.addEventListener('mousedown', function (e) {
            if (e.button !== 0 || e.target.closest('[data-id]')) { return; }
            pan = { x: e.clientX, y: e.clientY, l: stage.scrollLeft, t: stage.scrollTop };
            stage.classList.add('is-panning'); e.preventDefault();
        });
        window.addEventListener('mousemove', function (e) {
            if (!pan) { return; }
            stage.scrollLeft = pan.l - (e.clientX - pan.x); stage.scrollTop = pan.t - (e.clientY - pan.y);
        });
        window.addEventListener('mouseup', function () { if (pan) { pan = null; stage.classList.remove('is-panning'); } });

        // Tela cheia: API do navegador quando existe; senão, só a classe.
        function setFullUi(on) {
            root.classList.toggle('is-full', on);
            $('fullBtn').innerHTML = on ? '<i class="ti ti-minimize"></i> Sair da tela cheia' : '<i class="ti ti-maximize"></i> Tela cheia';
            $('fullCorner').innerHTML = on ? '<i class="ti ti-minimize"></i>' : '<i class="ti ti-maximize"></i>';
            $('fullCorner').title = on ? 'Sair da tela cheia' : 'Tela cheia';
            setTimeout(fit, 60);
        }
        // ---- ligações (bloco 2d-1) -------------------------------------
        function L(name) { return root.querySelector('[data-l="' + name + '"]'); }
        function edgeById(id) { return S.edges.filter(function (e) { return e.id === id; })[0] || null; }
        function bossOf(id) { for (var i = 0; i < S.edges.length; i++) { if (S.edges[i].to === id && S.edges[i].boss) { return S.edges[i]; } } return null; }
        // Marcar como chefe alguém que já está abaixo na mesma cadeia fecharia
        // um ciclo, e o arranjo anda por essa cadeia.
        function viraCiclo(from, to) {
            var at = from, guard = 0, pai = {};
            S.edges.forEach(function (e) { if (e.boss && !pai[e.to]) { pai[e.to] = e.from; } });
            while (at && guard++ < 5000) { if (at === to) { return true; } at = pai[at]; }
            return false;
        }
        function avisaLigacao(txt) {
            var el = $('lmsg');
            if (el) { el.textContent = txt; el.className = 'cx-org-hint' + (txt ? ' is-erro' : ''); }
            if (txt && $('dragHint')) {
                $('dragHint').textContent = txt; $('dragHint').hidden = false;
                setTimeout(function () { if ($('dragHint')) { $('dragHint').hidden = true; } }, 4000);
            }
        }
        var pendLink = null;
        function criaLigacao(from, to) {
            if (!from || !to || from === to) { return; }
            if (S.edges.some(function (e) { return e.from === from && e.to === to; })) { avisaLigacao('Esses dois já estão ligados.'); return; }
            if (viraCiclo(from, to)) {
                novaLigacao(from, to, false);
                avisaLigacao('Como chefia isso fecharia um ciclo (' + label(byId[to]) + ' já está acima de ' + label(byId[from]) + '), então a ligação entrou como reporte.');
                return;
            }
            if (bossOf(to)) {
                pendLink = { from: from, to: to };
                $('bossText').textContent = label(byId[to]) + ' já responde a ' + label(byId[bossOf(to).from]) + '.';
                root.querySelector('[data-act="btrocar"]').textContent = 'Passar a responder a ' + label(byId[from]);
                $('bossdlg').showModal();
                return;
            }
            novaLigacao(from, to, true);
        }
        function novaLigacao(from, to, boss) {
            var e = { id: 'e' + Date.now().toString(36) + S.edges.length, from: from, to: to, boss: !!boss, style: boss ? 'solida' : 'tracejada', label: '' };
            if (boss) {
                var atual = bossOf(to);
                if (atual) { atual.boss = false; atual.style = 'tracejada'; }
                S.edges.splice(edgeIndexTo(to) >= 0 ? edgeIndexTo(to) : S.edges.length, 0, e);
            } else {
                S.edges.push(e);
            }
            commit(); render(); selectEdge(e.id);
        }
        function selectEdge(id) {
            var e = edgeById(id);
            selEdge = e ? id : null;
            if (ed) { ed.hidden = true; }
            sel = null;
            var pane = $('ledit');
            if (!pane) { return; }
            if (!e) { pane.hidden = true; render(); return; }
            pane.hidden = false;
            $('lwho').textContent = label(byId[e.from]) + '  →  ' + label(byId[e.to]);
            L('boss').checked = !!e.boss;
            L('dash').checked = e.style === 'tracejada';
            L('label').value = e.label || '';
            avisaLigacao('');
            render();
        }

        // ---- salvamento automático (bloco 1b) --------------------------
        // Grava SÓ o organograma, sem recarregar. Existe por dois motivos: não
        // perder trabalho, e permitir salvar em tela cheia (recarregar derruba
        // a tela cheia e o navegador não deixa voltar a ela sem um clique).
        var autoTimer = null, salvando = false, refazerAoTerminar = false;
        var AUTO_MS = 2500;

        function estado(texto, classe) {
            var el = $('savestate');
            if (!el) { return; }
            el.textContent = texto;
            el.className = 'cx-org-savestate' + (classe ? ' is-' + classe : '');
        }
        function tokenEl() {
            var form = root.closest('form');
            return form ? form.querySelector('[name="_glpi_csrf_token"]') : null;
        }
        // O token é consumido a cada POST (Session::validateCSRF do 11.0.6).
        // Todos os formulários da página compartilham o mesmo valor, então o
        // token novo tem que entrar em TODOS, senão o Salvar ou um botão de
        // fluxo falharia depois de um salvamento automático.
        function rotacionaToken(novo) {
            if (!novo) { return; }
            var d = root.ownerDocument || document;
            d.querySelectorAll('[name="_glpi_csrf_token"]').forEach(function (i) { i.value = novo; });
        }
        function podeAuto() { return editable && saveUrl && docId; }
        function agendaAuto() {
            if (!podeAuto()) { return; }
            if (autoTimer) { clearTimeout(autoTimer); }
            estado('alterações não salvas', 'pendente');
            autoTimer = setTimeout(function () { salvaAgora(); }, AUTO_MS);
        }
        function salvaAgora(aoTerminar) {
            if (!podeAuto()) { if (aoTerminar) { aoTerminar(false); } return; }
            if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
            if (salvando) { refazerAoTerminar = true; if (aoTerminar) { aoTerminar(false); } return; }
            var tk = tokenEl();
            if (!tk) { if (aoTerminar) { aoTerminar(false); } return; }

            salvando = true;
            estado('salvando…', 'salvando');
            var corpo = new FormData();
            corpo.append('id', docId);
            corpo.append('_diagram', ser());
            corpo.append('_glpi_csrf_token', tk.value);

            fetch(saveUrl, { method: 'POST', body: corpo, credentials: 'same-origin' })
                .then(function (r) { return r.ok ? r.json() : r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.erro || ('http ' + r.status)); }); })
                .then(function (j) {
                    salvando = false;
                    rotacionaToken(j.csrf);
                    dirty = false;
                    estado('salvo às ' + (j.hora || ''), 'ok');
                    if (refazerAoTerminar) { refazerAoTerminar = false; agendaAuto(); }
                    if (aoTerminar) { aoTerminar(true); }
                })
                .catch(function (e) {
                    salvando = false;
                    refazerAoTerminar = false;
                    // Sem recuperação automática: insistir com token queimado
                    // só gera erro repetido. O Salvar do formulário continua lá.
                    estado('não foi possível salvar — use o botão Salvar da página', 'erro');
                    if (aoTerminar) { aoTerminar(false); }
                });
        }

        // Em tela cheia o organograma cobre a página e o Salvar do documento
        // fica fora de alcance. O botão daqui aciona o MESMO botão do
        // formulário: mesmo token, mesma validação, mesmo destino.
        function saveForm() {
            // Com endpoint: grava sem recarregar, e a tela cheia não cai.
            if (podeAuto()) { salvaAgora(); return; }
            var form = root.closest('form');
            if (!form) { return; }
            var b = form.querySelector('[name="update"], [name="add"]');
            if (b) { b.click(); }
            else if (form.requestSubmit) { form.requestSubmit(); }
            else { form.submit(); }
        }
        function toggleFull() {
            var on = !root.classList.contains('is-full');
            if (root.requestFullscreen) {
                if (on) { root.requestFullscreen().catch(function () { setFullUi(true); }); }
                else if (document.fullscreenElement) { document.exitFullscreen(); }
                else { setFullUi(false); }
            } else { setFullUi(on); }
        }
        document.addEventListener('fullscreenchange', function () {
            setFullUi(document.fullscreenElement === root);
        });
        $('q').addEventListener('input', function () {
            query = norm($('q').value.trim());
            render();
            var first = treeEl.querySelector('.is-hit');
            if (first && first.scrollIntoView) { first.scrollIntoView({ block: 'nearest', inline: 'center' }); }
        });

        // ---- edição ----------------------------------------------------
        function select(id) {
            if (!editable) { return; }
            sel = id; selEdge = null;
            // Sem redesenhar a árvore: trocar o DOM debaixo do cursor mata o
            // gesto de arraste que o usuário acabou de começar (relato de
            // Claudio em 20/09: "preciso clicar muitas vezes para pegar").
            treeEl.querySelectorAll('.is-sel').forEach(function (x) { x.classList.remove('is-sel'); });
            var el = treeEl.querySelector('[data-id="' + String(id).replace(/["\\]/g, '') + '"]');
            if (el) { el.classList.add('is-sel'); }
            fill(); ed.hidden = false;
        }
        function fill() {
            var f = find(sel);
            if (!f) { ed.hidden = true; return; }
            var n = f.n, p = f.p;
            $('edTitle').textContent = n.group ? 'Editar equipe' : 'Editar pessoa';
            F('lvl').innerHTML = levelOptions(n.lvl, false);
            F('name').value = n.name; F('role').value = n.role; F('lvl').value = n.lvl; F('note').value = n.note || '';
            F('pend').checked = !!n.pend; F('group').checked = !!n.group; F('dashed').checked = !!n.dashed;
            var par = F('parent');
            if (p) {
                var o = '';
                walk(T, function (m, _, d) {
                    if (isIn(n, m)) { return; }
                    o += '<option value="' + escHtml(m.id) + '"' + (p.id === m.id ? ' selected' : '') + '>' + '\u00A0\u00A0'.repeat(d) + escHtml(label(m)) + '</option>';
                });
                par.innerHTML = o; par.disabled = false;
            } else {
                par.innerHTML = '<option>Topo do organograma</option>'; par.disabled = true;
            }
            var up = $('unpin');
            if (up) { up.hidden = !isFree(n); }
            var del = root.querySelector('[data-act="eddel"]');
            del.disabled = S.nodes.length < 2;
            del.title = del.disabled ? 'O organograma não pode ficar vazio.' : '';
            del.classList.remove('is-armed'); del.textContent = 'Excluir';
        }
        function cur() { return find(sel).n; }
        function move(id, pid) { place(id, pid, 'in'); }

        // Solta um nó (existente ou novo da paleta) perto de um cartão:
        // 'before'/'after' = ao lado, entre os colegas; 'in' = subordinado.
        // A árvore se reorganiza sozinha (é o layout que decide a posição).
        function newNode(kind, lvl) {
            var n;
            if (kind.indexOf('el:') === 0) {
                var e = S.elements.filter(function (x) { return 'el:' + x.id === kind; })[0];
                if (!e) { return P('', '', lvl); }
                var l = e.lvl && S.levels.some(function (x) { return x.key === e.lvl; }) ? e.lvl : lvl;
                n = e.base === 'equipe' ? P(e.label, '', l) : P('', e.label, l);
                if (e.base === 'equipe') { n.group = true; }
                if (e.dashed) { n.dashed = true; }
                n.kind = kind;
                return n;
            }
            if (kind === 'area') { n = P('Nova área', '', lvl); n.group = true; return n; }
            n = P('', '', lvl);
            if (kind === 'vaga') { n.kind = 'vaga'; n.note = 'Vaga em aberto'; }
            if (kind === 'assessoria') { n.kind = 'assessoria'; n.role = 'Assessoria'; }
            if (kind === 'terceiro') { n.kind = 'terceiro'; n.role = 'Consultor externo'; n.dashed = true; }
            return n;
        }
        function canPlace(d, tid, zone) {
            var t = find(tid); if (!t) { return false; }
            if ((zone === 'before' || zone === 'after') && !t.p) { return false; }
            if (d.kind) { return true; }
            var a = find(d.id); if (!a || !a.p) { return false; }
            if (a.n === t.n || isIn(a.n, t.n)) { return false; }
            return true;
        }
        function place(src, tid, zone) {
            var d = typeof src === 'string' ? { id: src } : src;
            if (!canPlace(d, tid, zone)) { return null; }
            var t = find(tid), n;
            if (d.kind) {
                n = newNode(d.kind, zone === 'in' ? nextLevel(t.n.lvl) : t.n.lvl);
                S.nodes.push(n);
            } else {
                n = find(d.id).n;
                detach(n.id);
            }
            // A posição do irmão é a posição da ligação DELE na lista: o
            // índice é calculado depois do detach, senão vem deslocado.
            if (zone === 'in') { attach(tid, n.id); }
            else { attach(parentOf[tid], n.id, edgeIndexTo(tid) + (zone === 'after' ? 1 : 0)); }
            commit(); render();
            return n;
        }
        // 0.6.7-6 (Claudio, 20/09/2026): quem tem equipe e é solto numa lista
        // (linha de um cartão, ou no meio de um cartão) escolhe se a equipe
        // vai junto (vira cartão) ou fica com o chefe atual (entra na lista).
        var pendingMove = null;
        function wouldList(el, zone) { return zone === 'in' || el.classList.contains('cx-org-row'); }
        function leaveTeam(id) {
            var f = find(id); if (!f || !f.p || !f.n.kids.length) { return; }
            var pid = f.p.id, out = [], done = false;
            S.edges.forEach(function (e) {
                if (e.from === id) { return; }
                out.push(e);
                if (!done && e.to === id && e.from === pid) {
                    S.edges.forEach(function (k) {
                        if (k.from === id) { out.push({ id: k.id, from: pid, to: k.to, boss: k.boss, style: k.style, label: k.label }); }
                    });
                    done = true;
                }
            });
            S.edges = out;
            rebuild();
        }
        function countTeam(n) { var c = -1; walk(n, function () { c++; }); return c; }
        function askMove(d, tid, zone) {
            var f = find(d.id), who = label(f.n), boss = label(f.p), nk = f.n.kids.length, all = countTeam(f.n);
            pendingMove = { d: d, tid: tid, zone: zone };
            $('mvTitle').textContent = 'Mover ' + who;
            $('mvText').textContent = who + ' tem ' + nk + (nk === 1 ? ' subordinado direto' : ' subordinados diretos') +
                (all > nk ? ' (' + all + ' pessoas na equipe toda)' : '') + '. Quem tem equipe aparece como cartão próprio.';
            root.querySelector('[data-act="mvleave"]').textContent = 'Deixar a equipe com ' + boss + ' e entrar na lista';
            root.querySelector('[data-act="mvwith"]').textContent = 'Levar a equipe junto (vira cartão)';
            $('movedlg').showModal();
        }
        function doMove(d, tid, zone) {
            var n = place(d, tid, zone);
            if (n && d.kind) { select(n.id); if (d.kind !== 'area') { F('name').focus(); } }
            else if (n && sel === n.id) { fill(); }
            return n;
        }
        function zoneOf(el, e) {
            var r = el.getBoundingClientRect(), f = find(el.getAttribute('data-id'));
            if (!f || !f.p) { return 'in'; }
            if (el.classList.contains('cx-org-row')) {
                var y = (e.clientY - r.top) / (r.height || 1);
                return y < 0.3 ? 'before' : (y > 0.7 ? 'after' : 'in');
            }
            var x = (e.clientX - r.left) / (r.width || 1);
            return x < 0.25 ? 'before' : (x > 0.75 ? 'after' : 'in');
        }
        function clearZones() {
            treeEl.classList.remove('is-drop-free');
            clearGuides();
            root.querySelectorAll('.is-drop-in,.is-drop-before,.is-drop-after').forEach(function (x) {
                x.classList.remove('is-drop-in', 'is-drop-before', 'is-drop-after');
            });
        }
        function clearDrop() {
            clearZones();
            root.querySelectorAll('.is-dragging').forEach(function (x) { x.classList.remove('is-dragging'); });
        }
        function addUnder(id) {
            var f = find(id); if (!f) { return; }
            var lvl = nextLevel(f.n.lvl), k = P('', '', lvl);
            S.nodes.push(k); attach(id, k.id); commit(); render(); select(k.id); F('name').focus();
        }

        if (editable) {
            ['name', 'role', 'note'].forEach(function (k) {
                F(k).addEventListener('input', function () { cur()[k] = F(k).value; commit('t:' + k + ':' + sel); render(); });
            });
            F('lvl').addEventListener('change', function () { cur().lvl = F('lvl').value; commit(); render(); });
            F('pend').addEventListener('change', function () { cur().pend = F('pend').checked; commit(); render(); });
            F('group').addEventListener('change', function () { cur().group = F('group').checked; commit(); render(); fill(); });
            F('dashed').addEventListener('change', function () { cur().dashed = F('dashed').checked; commit(); render(); });
            F('parent').addEventListener('change', function () { move(sel, F('parent').value); fill(); });

            if (L('label')) {
                L('label').addEventListener('input', function () {
                    var e = edgeById(selEdge); if (!e) { return; }
                    e.label = L('label').value; commit('lab:' + selEdge); render();
                });
                L('dash').addEventListener('change', function () {
                    var e = edgeById(selEdge); if (!e) { return; }
                    e.style = L('dash').checked ? 'tracejada' : 'solida'; commit(); render();
                });
                L('boss').addEventListener('change', function () {
                    var e = edgeById(selEdge); if (!e) { return; }
                    if (!L('boss').checked) { e.boss = false; commit(); render(); avisaLigacao(''); return; }
                    if (viraCiclo(e.from, e.to)) {
                        L('boss').checked = false;
                        avisaLigacao('Não dá: ' + label(byId[e.to]) + ' já está acima de ' + label(byId[e.from]) + ' na cadeia de chefia.');
                        return;
                    }
                    var atual = bossOf(e.to);
                    if (atual && atual !== e) { atual.boss = false; atual.style = 'tracejada'; }
                    e.boss = true; e.style = 'solida';
                    commit(); render(); avisaLigacao('');
                });
            }

            // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y (0.6.7-8). Dentro do organograma
            // o desfazer é SEMPRE o do organograma, campo de texto incluído: o
            // histórico já agrupa a digitação num passo, e depender do desfazer
            // nativo do campo deixava o atalho mudo (teste de 20/09, passos 5 e
            // 6). Campo fora do organograma (título, categorias) segue com o do
            // navegador. Na fase de CAPTURA para que nenhum handler do núcleo
            // engula a tecla antes.
            document.addEventListener('keydown', function (e) {
                if (!(e.ctrlKey || e.metaKey) || e.altKey) { return; }
                var k = String(e.key || '').toLowerCase();
                if (k !== 'z' && k !== 'y') { return; }
                if (!document.body || !document.body.contains(root)) { return; }
                var t = e.target, el = t && t.nodeType === 1 ? t : null;
                if (el && !root.contains(el) && (el.isContentEditable || el.matches('input, textarea, select'))) { return; }
                e.preventDefault();
                jump(k === 'y' || e.shiftKey ? 1 : -1);
            }, true);

            // O editor vive dentro do formulário do documento: Enter num campo
            // não pode enviar o formulário.
            root.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); }
                if (e.key === 'Escape' && !ed.hidden) { sel = null; ed.hidden = true; render(); }
            });

            // ---- arraste próprio (bloco 2c-3) ---------------------------
            // O arraste nativo do navegador foi abandonado: ele desenha um
            // fantasma próprio, o elemento real não acompanha o cursor, e
            // qualquer mudança de layout durante o gesto desloca a conta do
            // ponto de soltura (três rodadas de teste, 20/09). Aqui o gesto é
            // feito na mão: uma cópia do cartão segue o cursor, já encostada
            // nas guias, e o que se vê é o que fica.
            var gest = null, LIMIAR = 4;

            function alvoSob(e) {
                if (!document.elementFromPoint) { return null; }
                var el = document.elementFromPoint(e.clientX, e.clientY);
                return el && el.closest ? el.closest('[data-id]') : null;
            }
            function fantasma(el, largura) {
                var g = el.cloneNode(true);
                g.classList.add('cx-org-ghost');
                g.removeAttribute('data-id');
                g.style.width = largura + 'px';
                treeEl.querySelector('[data-el="canvas"]').appendChild(g);
                return g;
            }
            function fimGesto() {
                if (gest && gest.ghost) { gest.ghost.remove(); }
                if (gest && gest.el) { gest.el.classList.remove('is-dragging'); }
                if ($('dragHint')) { $('dragHint').hidden = true; }
                gest = null;
                clearDrop();
            }

            root.addEventListener('pointerdown', function (e) {
                if (e.button !== 0 || !editable) { return; }
                var porta = e.target.closest && e.target.closest('[data-port]');
                if (porta) {
                    gest = { ligando: porta.getAttribute('data-port'), sx: e.clientX, sy: e.clientY, moveu: false };
                    e.preventDefault();
                    return;
                }
                var chip = e.target.closest && e.target.closest('[data-new]');
                var t = e.target.closest && e.target.closest('[data-id]');
                if (chip) {
                    gest = { kind: chip.getAttribute('data-new'), el: chip, sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, moveu: false };
                    e.preventDefault();
                } else if (t && treeEl.contains(t)) {
                    var r = t.getBoundingClientRect();
                    gest = {
                        id: t.getAttribute('data-id'), el: t, sx: e.clientX, sy: e.clientY,
                        dx: (e.clientX - r.left) / (z || 1), dy: (e.clientY - r.top) / (z || 1),
                        w: r.width / (z || 1) || 200, moveu: false
                    };
                    // Sem isto o navegador começa a selecionar o texto do
                    // cartão e o gesto se perde no meio.
                    e.preventDefault();
                }
            });

            document.addEventListener('pointermove', function (e) {
                if (!gest) { return; }
                if (gest.ligando) {
                    if (!gest.moveu && Math.abs(e.clientX - gest.sx) + Math.abs(e.clientY - gest.sy) < LIMIAR) { return; }
                    gest.moveu = true;
                    var pl = pointOf(e), bo = geom[gest.ligando];
                    if (!pl || !bo) { return; }
                    clearZones();
                    var sobL = alvoSob(e), tl = sobL && boxOf(sobL.getAttribute('data-id'));
                    if (tl && tl !== gest.ligando) { sobL.classList.add('is-drop-in'); }
                    var g = treeEl.querySelector('[data-el="guides"]');
                    if (g) {
                        g.innerHTML = '<path class="cx-org-linking" d="M' + Math.round(bo.x + bo.w / 2) + ' ' +
                            Math.round(bo.y + bo.h / 2) + 'L' + Math.round(pl.x) + ' ' + Math.round(pl.y) + '"/>';
                    }
                    return;
                }
                if (!gest.moveu) {
                    if (Math.abs(e.clientX - gest.sx) + Math.abs(e.clientY - gest.sy) < LIMIAR) { return; }
                    gest.moveu = true;
                    gest.ghost = fantasma(gest.el, gest.w || 200);
                    if (gest.id) {
                        gest.el.classList.add('is-dragging');
                        var fd = find(gest.id), hint = $('dragHint');
                        if (fd && fd.n.kids.length && hint) {
                            var k = fd.n.kids.length;
                            hint.textContent = label(fd.n) + ' tem ' + k + (k === 1 ? ' subordinado' : ' subordinados') +
                                ': soltando numa lista, você escolhe se a equipe vai junto.';
                            hint.hidden = false;
                        }
                    }
                }
                var pt = pointOf(e);
                if (!pt) { return; }
                var sob = alvoSob(e), tid = sob && sob.getAttribute('data-id');
                clearZones();
                if (sob && tid !== gest.id && canPlace(gest.id ? { id: gest.id } : { kind: gest.kind }, tid, zoneOf(sob, e))) {
                    sob.classList.add('is-drop-' + zoneOf(sob, e));
                    gest.ghost.style.left = Math.round(pt.x - gest.dx + origin.x) + 'px';
                    gest.ghost.style.top = Math.round(pt.y - gest.dy + origin.y) + 'px';
                    gest.solta = null;
                } else {
                    treeEl.classList.add('is-drop-free');
                    var sp = gest.id ? dropSpot(gest.id, pt, gest)
                        : { x: snap(pt.x - gest.dx), y: snap(pt.y - gest.dy), gx: [], gy: [] };
                    showGuides(sp.gx, sp.gy);
                    gest.ghost.style.left = Math.round(sp.x + origin.x) + 'px';
                    gest.ghost.style.top = Math.round(sp.y + origin.y) + 'px';
                    gest.solta = sp;
                }
            });

            document.addEventListener('pointerup', function (e) {
                if (!gest) { return; }
                if (!gest.moveu) { gest = null; return; }   // foi clique, não arraste
                if (gest.ligando) {
                    var de = gest.ligando, alvo = alvoSob(e);
                    gest = null; clearZones();
                    var para = alvo && boxOf(alvo.getAttribute('data-id'));
                    if (para && para !== de) { criaLigacao(de, para); }
                    return;
                }
                var g = gest, sob = alvoSob(e), tid = sob && sob.getAttribute('data-id');
                var d = g.id ? { id: g.id } : { kind: g.kind };
                fimGesto();

                if (sob && tid !== d.id) {
                    var zone = zoneOf(sob, e);
                    if (!canPlace(d, tid, zone)) { return; }
                    var fm = d.id ? find(d.id) : null;
                    if (fm && fm.n.kids.length && wouldList(sob, zone) && canPlace(d, tid, zone)) { askMove(d, tid, zone); return; }
                    doMove(d, tid, zone);
                    return;
                }
                if (!g.solta) { return; }
                if (d.kind) {
                    var nn = newNode(d.kind, S.levels[S.levels.length - 1].key);
                    nn.x = g.solta.x; nn.y = g.solta.y;
                    S.nodes.push(nn);
                    commit(); render(); select(nn.id);
                    if (d.kind !== 'area') { F('name').focus(); }
                } else {
                    var fn = find(d.id);
                    if (fn) { fn.n.x = g.solta.x; fn.n.y = g.solta.y; }
                    commit(); render(); fill();
                }
            });

            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && gest) { fimGesto(); }
            });


            $('lvlist').addEventListener('input', function (e) {
                var i = e.target.getAttribute('data-lvlabel'), j = e.target.getAttribute('data-lvcolor');
                if (i !== null && S.levels[i]) { S.levels[i].label = e.target.value.slice(0, 40) || '—'; }
                else if (j !== null && S.levels[j] && /^#[0-9a-f]{6}$/i.test(e.target.value)) { S.levels[j].color = e.target.value; }
                else { return; }
                commit('lv:' + (i !== null ? i : j)); render(); renderEsc(); renderPalette();
            });

            var escBody = $('esc');
            escBody.addEventListener('input', function (e) {
                var r = e.target.getAttribute('data-r'), c = e.target.getAttribute('data-c');
                if (r !== null && S.esc[r]) { S.esc[r].c[c] = e.target.innerText.trim(); commit('esc:' + r + ':' + c); }
            });
            escBody.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && !e.shiftKey && e.target.hasAttribute('contenteditable')) { e.preventDefault(); }
            });
            escBody.addEventListener('click', function (e) {
                var b = e.target.closest('[data-del]'); if (!b) { return; }
                S.esc.splice(+b.getAttribute('data-del'), 1); commit(); renderEsc();
            });

            var form = root.closest('form');
            if (form) { form.addEventListener('submit', function () { dirty = false; }); }
            window.addEventListener('beforeunload', function (e) {
                if (dirty) { e.preventDefault(); e.returnValue = ''; }
            });
        }

        treeEl.addEventListener('click', function (e) {
            var l = e.target.closest && e.target.closest('[data-edge]');
            if (l && editable) { selectEdge(l.getAttribute('data-edge')); return; }
            var t = e.target.closest('[data-id]');
            if (t) { selEdge = null; if ($('ledit')) { $('ledit').hidden = true; } select(t.getAttribute('data-id')); }
        });
        treeEl.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') { return; }
            var t = e.target.closest('[data-id]'); if (t && editable) { e.preventDefault(); select(t.getAttribute('data-id')); }
        });

        // ---- botões ----------------------------------------------------
        root.addEventListener('click', function (e) {
            var tb = e.target.closest('[data-tpl]');
            if (tb && editable) {
                // Dois cliques para confirmar: o modelo substitui o organograma.
                if (!tb.classList.contains('is-armed')) {
                    root.querySelectorAll('.cx-org-tplcard.is-armed').forEach(function (x) { x.classList.remove('is-armed'); });
                    tb.classList.add('is-armed'); return;
                }
                var tp = TEMPLATES.filter(function (x) { return x.key === tb.getAttribute('data-tpl'); })[0];
                if (tp) {
                    var ns = tp.make(); ns.tree = withIds(ns.tree);
                    normalize(ns); S = ns; sel = null; ed.hidden = true; commit(); render(); renderEsc(); renderPalette(); $('tpl').close(); fit();
                }
                return;
            }
            var ed2 = e.target.closest('[data-eldel]');
            if (ed2 && editable) {
                e.preventDefault(); e.stopPropagation();
                S.elements = S.elements.filter(function (x) { return x.id !== ed2.getAttribute('data-eldel'); });
                commit(); renderPalette(); return;
            }
            var lvd = e.target.closest('[data-lvdel]');
            if (lvd && editable) {
                var li = +lvd.getAttribute('data-lvdel');
                if (S.levels[li] && !levelUsed(S.levels[li].key) && S.levels.length > 1) { S.levels.splice(li, 1); commit(); renderLevels(); render(); renderPalette(); }
                return;
            }
            var lvu = e.target.closest('[data-lvup]');
            if (lvu && editable) {
                var ui = +lvu.getAttribute('data-lvup');
                if (ui > 0) { var tmp = S.levels[ui - 1]; S.levels[ui - 1] = S.levels[ui]; S.levels[ui] = tmp; commit(); renderLevels(); render(); }
                return;
            }
            var b = e.target.closest('[data-act]'); if (!b || !root.contains(b)) { return; }
            var act = b.getAttribute('data-act');
            if (act === 'undo') { jump(-1); }
            else if (act === 'redo') { jump(1); }
            else if (act === 'zin') { setZ(z + 0.1); }
            else if (act === 'zout') { setZ(z - 0.1); }
            else if (act === 'save') { saveForm(); }
            else if (act === 'lclose') { selectEdge(null); }
            else if (act === 'ldel') {
                var eid = selEdge;
                S.edges = S.edges.filter(function (x) { return x.id !== eid; });
                selEdge = null; $('ledit').hidden = true; commit(); render();
            }
            else if (act === 'btrocar' || act === 'breporte') {
                var pl = pendLink; pendLink = null; $('bossdlg').close();
                if (pl) { novaLigacao(pl.from, pl.to, act === 'btrocar'); }
            }
            else if (act === 'bcancel') { pendLink = null; $('bossdlg').close(); }
            else if (act === 'fit') { fit(); }
            else if (act === 'tidy') {
                S.nodes.forEach(function (n) { delete n.x; delete n.y; });
                commit(); render(); fill(); fit();
            }
            else if (act === 'unpin') { reanchor(sel); commit(); render(); fill(); }
            else if (act === 'print') { printOrg(); }
            else if (act === 'full') { toggleFull(); }
            else if (act === 'tpl') { $('tpl').showModal(); }
            else if (act === 'mvwith' || act === 'mvleave') {
                var pm = pendingMove; pendingMove = null; $('movedlg').close();
                if (pm) { if (act === 'mvleave') { leaveTeam(pm.d.id); } doMove(pm.d, pm.tid, pm.zone); }
            }
            else if (act === 'mvcancel') { pendingMove = null; $('movedlg').close(); }
            else if (act === 'lv') { renderLevels(); $('lvdlg').showModal(); }
            else if (act === 'lvclose') { $('lvdlg').close(); fill(); }
            else if (act === 'lvadd') {
                var nk = 'nv' + Date.now().toString(36);
                S.levels.push({ key: nk, label: 'Novo nível', color: SWATCHES[S.levels.length % SWATCHES.length] });
                commit(); renderLevels(); render();
                var inputs = $('lvlist').querySelectorAll('[data-lvlabel]'); var lastIn = inputs[inputs.length - 1];
                if (lastIn) { lastIn.focus(); lastIn.select(); }
            }
            else if (act === 'elnew') {
                G('elname').value = ''; G('elbase').value = 'pessoa'; G('ellvl').innerHTML = levelOptions('', true); G('eldashed').checked = false;
                $('elMsg').textContent = ''; $('eldlg').showModal(); G('elname').focus();
            }
            else if (act === 'elclose') { $('eldlg').close(); }
            else if (act === 'elsave') {
                var nm = G('elname').value.trim();
                if (!nm) { $('elMsg').textContent = 'Informe o nome do elemento.'; return; }
                S.elements.push({ id: 'e' + Date.now().toString(36), label: nm.slice(0, 40), base: G('elbase').value === 'equipe' ? 'equipe' : 'pessoa',
                    lvl: G('ellvl').value, dashed: G('eldashed').checked });
                commit(); renderPalette(); $('eldlg').close();
            }
            else if (act === 'tplclose') { $('tpl').close(); }
            else if (act === 'add') { addUnder(sel && find(sel) ? sel : T.id); }
            else if (act === 'edadd') { addUnder(sel); }
            else if (act === 'edclose') { sel = null; ed.hidden = true; render(); }
            else if (act === 'eddel') {
                if (!b.classList.contains('is-armed')) { b.classList.add('is-armed'); b.textContent = 'Confirmar exclusão'; return; }
                var f = find(sel); if (!f) { return; }
                removeNode(sel);
                sel = null; ed.hidden = true; commit(); render();
            }
            else if (act === 'escadd') { S.esc.push({ lvl: S.levels[S.levels.length - 1].key, c: ['Novo nível', '', '', ''] }); commit(); renderEsc(); }
            else if (act === 'io') { $('ioText').value = ser(true); $('ioMsg').textContent = ''; $('io').showModal(); }
            else if (act === 'ioclose') { $('io').close(); }
            else if (act === 'iocopy') {
                var t = $('ioText'); t.select();
                if (navigator.clipboard) { navigator.clipboard.writeText(t.value).catch(function () {}); }
                else { try { document.execCommand('copy'); } catch (_) { /* sem cópia */ } }
            }
            else if (act === 'ioapply') {
                try {
                    var s = JSON.parse($('ioText').value);
                    // Aceita os dois formatos: o grafo novo e a árvore antiga
                    // (é o que o protótipo e as exportações anteriores geram).
                    if (!s || typeof s !== 'object' || (!Array.isArray(s.nodes) && !s.tree)) { throw new Error('forma'); }
                    normalize(s); S = s; sel = null; ed.hidden = true; commit(); render(); renderEsc(); renderPalette(); $('io').close(); fit();
                } catch (err) {
                    $('ioMsg').textContent = 'Conteúdo inválido. Cole o texto completo gerado por Exportar, do primeiro ao último caractere.';
                }
            }
        });

        // ---- PDF: A4 paisagem numa janela própria ---------------------
        // Mesmo caminho do PDF dos documentos (codexplus.js): iframe fora da
        // tela, CSS do plugin carregado nele, espera fontes, depois imprime.
        //
        // O desenho do PDF É o desenho da tela (bloco 2d-3a, antecipado por
        // Claudio para a apresentação de 21/09/2026): clona o canvas já
        // posicionado, com as ligações em SVG, e tira o que é só de edição.
        // Antes o PDF montava a lista aninhada a partir de card(T) e imprimia
        // só o bloco do PRIMEIRO elemento sem chefe — num organograma com
        // mais de um bloco, o resto sumia sem erro (DIA0001, 3 de 36).
        function printCanvasHtml() {
            var canvas = treeEl.querySelector('[data-el="canvas"]');
            // Reserva: sem canvas desenhado, lista aninhada de TODOS os blocos.
            if (!canvas) { return '<ul>' + roots().map(card).join('') + '</ul>'; }
            var c = canvas.cloneNode(true);
            function each(sel, f) { Array.prototype.forEach.call(c.querySelectorAll(sel), f); }
            each('.cx-org-port, .cx-org-hit, .cx-org-ghost, [data-el="guides"]', function (el) { el.parentNode.removeChild(el); });
            each('.is-sel, .is-hit, .is-dim, .is-drop-in, .is-drop-before, .is-drop-after', function (el) {
                el.classList.remove('is-sel', 'is-hit', 'is-dim', 'is-drop-in', 'is-drop-before', 'is-drop-after');
            });
            each('[data-grab], [tabindex]', function (el) { el.removeAttribute('data-grab'); el.removeAttribute('tabindex'); });
            // Largura de cada caixa fixada pela medida da tela: se a fonte do
            // iframe atrasar, o cartão não alarga por cima do vizinho.
            each('.cx-org-box[data-box]', function (el) {
                var b = geom[el.getAttribute('data-box')];
                if (b && b.w) { el.style.width = Math.round(b.w) + 'px'; }
            });
            return c.outerHTML;
        }
        function printOrg() {
            var cssLink = document.querySelector('link[href*="codexplus/css/codexplus.css"], link[href*="codexplus.css"]');
            var css = cssLink ? cssLink.href : '';
            var frame = document.createElement('iframe');
            frame.setAttribute('aria-hidden', 'true');
            frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1123px;height:794px;border:0;';
            document.body.appendChild(frame);
            var d = frame.contentDocument;
            var saveQuery = query; query = '';
            var head = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + escHtml((code ? code + ' - ' : '') + title) + '</title>' +
                (css ? '<link rel="stylesheet" href="' + escHtml(css) + '">' : '') +
                '<style>@page{size:A4 landscape;margin:10mm}html,body{margin:0;background:#fff}</style></head>';
            d.open();
            d.write(head + '<body class="cx-org-printdoc"><div class="cx-org cx-org--print">' +
                '<div class="cx-org-printhead"><strong>' + escHtml(title) + '</strong><span>' + escHtml(code) + '</span></div>' +
                '<div class="cx-org-legend">' + legendHtml() + '</div>' +
                '<div class="cx-org-stage"><div class="cx-org-tree">' + printCanvasHtml() + '</div></div>' +
                (S.esc.length ? '<section class="cx-org-esc"><h3>Matriz de escalonamento</h3><div class="cx-org-tablewrap"><table><thead><tr><th>Nível</th><th>Papel</th><th>Escala para o próximo nível quando</th><th>Tempo alvo</th></tr></thead><tbody>' +
                    S.esc.map(function (r) { return '<tr style="' + lc(r.lvl) + '">' + r.c.map(function (c) { return '<td>' + escHtml(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
                    '</tbody></table></div></section>' : '') +
                '</div></body></html>');
            d.close();
            query = saveQuery;

            var go = function () {
                var t = d.querySelector('.cx-org-tree');
                // Página útil: 277 × 190 mm ≈ 1047 × 718 px; tira título e legenda.
                var avW = 1040, avH = 718 - 70;
                var k = Math.min(1, avW / (t.scrollWidth || 1), avH / (t.scrollHeight || 1));
                t.style.zoom = k;
                var oldTitle = document.title;
                document.title = (code ? code + ' - ' : '') + title; // achado 24
                setTimeout(function () {
                    try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (_) { /* bloqueado */ }
                    document.title = oldTitle;
                    setTimeout(function () { frame.remove(); }, 1000);
                }, 50);
            };
            var link = d.querySelector('link[rel="stylesheet"]');
            var ready = function () {
                if (d.fonts && d.fonts.ready) { d.fonts.ready.then(go, go); } else { go(); }
            };
            if (link && !link.sheet) { link.addEventListener('load', ready); link.addEventListener('error', go); }
            else { ready(); }
        }

        render(); renderEsc(); renderPalette();
        if (input) { input.value = JSON.stringify(S); }
        requestAnimationFrame(function () { if (treeEl.scrollWidth > stage.clientWidth) { fit(); } });

        var api = { getData: function () { return JSON.parse(ser()); }, fit: fit, setZoom: setZ, print: printOrg, place: place,
            undo: function () { jump(-1); }, redo: function () { jump(1); },
            free: function (id, x, y) { var f = find(id); if (f) { f.n.x = snap(x); f.n.y = snap(y); commit(); render(); } },
            origin: function () { return { x: origin.x, y: origin.y }; },
            save: function (cb) { salvaAgora(cb); },
            link: function (from, to) { criaLigacao(from, to); },
            pickEdge: function (id) { selectEdge(id); },
            edgeState: function () { var e = edgeById(selEdge); return e ? { id: e.id, boss: e.boss, style: e.style, label: e.label } : null; },
            msg: function () { var m = $('lmsg'); return m ? m.textContent : ''; },
            state: function () { var e = $('savestate'); return e ? e.textContent : ''; },
            preview: function (id, x, y) { return dropSpot(id, { x: x, y: y }, { dx: 0, dy: 0 }); },
            guides: function () {
                var g = treeEl.querySelector('[data-el="guides"]');
                return g ? g.querySelectorAll('line').length : 0;
            },
            tidy: function () { S.nodes.forEach(function (n) { delete n.x; delete n.y; }); commit(); render(); },
            addFree: function (kind, x, y) {
                var n = newNode(kind, S.levels[S.levels.length - 1].key);
                n.x = snap(x); n.y = snap(y); S.nodes.push(n); commit(); render(); return n.id;
            },
            history: function () { return { pos: hpos, len: hist.length }; }, drop: function (d, tid, zone) { var fm = d.id ? find(d.id) : null; var el = treeEl.querySelector('[data-id="' + tid + '"]'); if (fm && fm.n.kids.length && el && wouldList(el, zone) && canPlace(d, tid, zone)) { askMove(d, tid, zone); return 'ask'; } return doMove(d, tid, zone); }, templates: TEMPLATES.map(function (t) { return t.key; }) };
        root.__cxOrg = api;
        return api;
    }

    function boot() {
        document.querySelectorAll('[data-cx-org]').forEach(mount);
    }

    window.CodexOrg = { mount: mount };
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
