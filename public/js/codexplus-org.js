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
        var title = root.getAttribute('data-title') || '';
        var code = root.getAttribute('data-code') || '';

        var S = null, sel = null, drag = null, z = 1, uid = 0, dirty = false, query = '';
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
                (editable ? '<button type="button" class="cx-org-btn cx-org-btn--primary" data-act="add">Nova pessoa</button>' : '') +
                (editable ? '<span class="cx-org-zoom">' +
                    '<button type="button" class="cx-org-btn" data-act="undo" title="Desfazer (Ctrl+Z)" aria-label="Desfazer" disabled><i class="ti ti-arrow-back-up"></i></button>' +
                    '<button type="button" class="cx-org-btn" data-act="redo" title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer" disabled><i class="ti ti-arrow-forward-up"></i></button>' +
                '</span>' : '') +
                '<span class="cx-org-zoom"><button type="button" class="cx-org-btn" data-act="zout" aria-label="Diminuir zoom">−</button>' +
                '<output data-el="zlbl">100%</output>' +
                '<button type="button" class="cx-org-btn" data-act="zin" aria-label="Aumentar zoom">+</button></span>' +
                '<button type="button" class="cx-org-btn" data-act="fit">Ajustar à tela</button>' +
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
                '<button type="button" class="cx-org-btn cx-org-btn--danger" data-act="eddel">Excluir</button></div>' +
                '<p class="cx-org-hint">Ao excluir, os subordinados passam a responder ao superior de quem saiu. As mudanças só ficam gravadas ao clicar em Salvar.</p>' +
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
                // Só a PRIMEIRA ligação que chega a um nó é hierárquica; as
                // demais são ligações extras (desenhadas a partir do 2c).
                if (!f || !t || parentOf[e.to]) { return; }
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
        function edgeIndexTo(id) {
            for (var i = 0; i < S.edges.length; i++) { if (S.edges[i].to === id) { return i; } }
            return -1;
        }
        function detach(id) {
            var i = edgeIndexTo(id);
            if (i >= 0) { S.edges.splice(i, 1); }
        }
        function attach(from, to, at) {
            var e = { id: 'e' + Date.now().toString(36) + S.edges.length, from: from, to: to, style: 'solida', label: '' };
            if (at === undefined || at < 0 || at > S.edges.length) { S.edges.push(e); } else { S.edges.splice(at, 0, e); }
        }
        // Tira o nó e sobe os filhos dele para o lugar que ele ocupava entre
        // os irmãos — uma passada só, sem conta de índice deslocado.
        function removeNode(id) {
            var f = find(id);
            if (!f || !f.p) { return; }
            var pid = f.p.id, out = [], done = false;
            S.edges.forEach(function (e) {
                if (e.to === id && e.from === pid && !done) {
                    S.edges.forEach(function (k) {
                        if (k.from === id) { out.push({ id: k.id, from: pid, to: k.to, style: k.style, label: k.label }); }
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
            var pai = {}, vistos = {};
            s.edges = s.edges.filter(function (e) {
                if (!e || !ids[e.from] || !ids[e.to] || e.from === e.to) { return false; }
                var par = e.from + '>' + e.to;
                if (vistos[par]) { return false; }
                vistos[par] = true;
                if (pai[e.to]) { return true; }      // ligação extra, não hierárquica
                var at = e.from, guard = 0;
                while (pai[at] && guard++ < 5000) { if (at === e.to) { return false; } at = pai[at]; }
                if (at === e.to) { return false; }
                pai[e.to] = e.from;
                e.style = e.style === 'tracejada' ? 'tracejada' : 'solida';
                e.label = e.label || '';
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
        function leavesOf(n) { return n.kids.filter(function (k) { return !k.kids.length; }); }
        function branchesOf(n) { return n.kids.filter(function (k) { return k.kids.length; }); }
        function cardInner(n) {
            var cls = 'cx-org-card' + (n.group ? ' is-group' : '') + (n.dashed ? ' is-dashed' : '') + (sel === n.id ? ' is-sel' : '') + hit(n);
            var leaves = leavesOf(n);
            return '<div class="' + cls + '" style="' + lc(n.lvl) + '" data-id="' + escHtml(n.id) + '" tabindex="0"' +
                (editable ? ' draggable="true"' : '') + ' title="' + escHtml(n.note) + '">' +
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
                '" data-id="' + escHtml(n.id) + '" tabindex="0"' + (editable ? ' draggable="true"' : '') +
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
        var HGAP = 14, VGAP = 48;
        function cardList() {
            var a = [];
            walk(T, function (n) { if (n === T || n.kids.length) { a.push(n); } });
            return a;
        }
        function layoutTree() {
            var list = cardList(), box = {}, wcache = {};

            treeEl.innerHTML = '<div class="cx-org-canvas" data-el="canvas">' +
                '<svg class="cx-org-links" data-el="links" aria-hidden="true"></svg>' +
                list.map(function (n) { return '<div class="cx-org-box" data-box="' + escHtml(n.id) + '">' + cardInner(n) + '</div>'; }).join('') +
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
            put(T, 0, 0);

            // Elemento solto (x/y próprios) fica onde está: quem o posiciona é
            // o usuário, não o layout. Sem tela para criar um ainda (2c).
            list.forEach(function (n) {
                if (typeof n.x === 'number' && typeof n.y === 'number') { box[n.id].x = n.x; box[n.id].y = n.y; }
            });

            var minX = 0, W = 0, H = 0;
            list.forEach(function (n) { if (box[n.id].x < minX) { minX = box[n.id].x; } });
            list.forEach(function (n) {
                var b = box[n.id];
                b.x -= minX;
                W = Math.max(W, b.x + b.w);
                H = Math.max(H, b.y + b.h);
                if (b.el) { b.el.style.left = Math.round(b.x) + 'px'; b.el.style.top = Math.round(b.y) + 'px'; }
            });
            canvas.style.width = Math.ceil(W) + 'px';
            canvas.style.height = Math.ceil(H) + 'px';

            var d = [];
            list.forEach(function (n) {
                var b = box[n.id];
                branchesOf(n).forEach(function (k) {
                    var c = box[k.id];
                    if (!c) { return; }
                    var x1 = Math.round(b.x + b.w / 2), y1 = Math.round(b.y + b.h);
                    var x2 = Math.round(c.x + c.w / 2), y2 = Math.round(c.y);
                    var ym = Math.round(y1 + (y2 - y1) / 2);
                    d.push('M' + x1 + ' ' + y1 + 'V' + ym + 'H' + x2 + 'V' + y2);
                });
            });
            var svg = canvas.querySelector('[data-el="links"]');
            svg.setAttribute('width', Math.ceil(W));
            svg.setAttribute('height', Math.ceil(H));
            svg.setAttribute('viewBox', '0 0 ' + Math.ceil(W) + ' ' + Math.ceil(H));
            svg.innerHTML = d.length ? '<path d="' + d.join(' ') + '" />' : '';
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
                    return '<span class="cx-org-chip" draggable="true" data-new="' + p.kind + '" title="Arraste e solte à esquerda, à direita ou em cima de um cartão"><i class="ti ' + p.icon + '"></i> ' + p.label + '</span>';
                }).join('') +
                S.elements.map(function (e) {
                    var l = e.lvl ? levelOf(e.lvl) : null;
                    return '<span class="cx-org-chip is-custom' + (e.dashed ? ' is-dashed' : '') + '" draggable="true" data-new="el:' + escHtml(e.id) + '"' +
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
            sel = id; render(); fill(); ed.hidden = false;
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
            var del = root.querySelector('[data-act="eddel"]');
            del.disabled = !p; del.classList.remove('is-armed'); del.textContent = 'Excluir';
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
                        if (k.from === id) { out.push({ id: k.id, from: pid, to: k.to, style: k.style, label: k.label }); }
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
        function clearDrop() {
            root.querySelectorAll('.is-drop-in,.is-drop-before,.is-drop-after,.is-dragging').forEach(function (x) {
                x.classList.remove('is-drop-in', 'is-drop-before', 'is-drop-after', 'is-dragging');
            });
        }
        function addUnder(id) {
            var f = find(id); if (!f) { return; }
            var lvl = nextLevel(f.n.lvl), k = P('', '', lvl);
            S.nodes.push(k); attach(id, k.id); commit(); select(k.id); F('name').focus();
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

            root.addEventListener('dragstart', function (e) {
                var chip = e.target.closest && e.target.closest('[data-new]');
                var t = e.target.closest && e.target.closest('[data-id]');
                if (chip) { drag = { kind: chip.getAttribute('data-new') }; }
                else if (t && treeEl.contains(t)) {
                    drag = { id: t.getAttribute('data-id') }; t.classList.add('is-dragging');
                    var fd = find(drag.id), hint = $('dragHint');
                    if (fd && fd.n.kids.length && hint) {
                        var k = fd.n.kids.length;
                        hint.textContent = label(fd.n) + ' tem ' + k + (k === 1 ? ' subordinado' : ' subordinados') +
                            ': soltando numa lista, você escolhe se a equipe vai junto.';
                        hint.hidden = false;
                    }
                }
                else { return; }
                e.dataTransfer.effectAllowed = drag.kind ? 'copy' : 'move';
                try { e.dataTransfer.setData('text/plain', drag.kind || drag.id); } catch (_) { /* Safari antigo */ }
            });
            treeEl.addEventListener('dragover', function (e) {
                var t = e.target.closest('[data-id]'); if (!t || !drag) { return; }
                var zone = zoneOf(t, e);
                if (!canPlace(drag, t.getAttribute('data-id'), zone)) { return; }
                e.preventDefault();
                root.querySelectorAll('.is-drop-in,.is-drop-before,.is-drop-after').forEach(function (x) {
                    x.classList.remove('is-drop-in', 'is-drop-before', 'is-drop-after');
                });
                t.classList.add('is-drop-' + zone);
            });
            treeEl.addEventListener('dragleave', function (e) {
                var t = e.target.closest('[data-id]');
                if (t && !t.contains(e.relatedTarget)) { t.classList.remove('is-drop-in', 'is-drop-before', 'is-drop-after'); }
            });
            treeEl.addEventListener('drop', function (e) {
                var t = e.target.closest('[data-id]'); if (!t || !drag) { return; }
                e.preventDefault();
                var d = drag, zone = zoneOf(t, e), tid = t.getAttribute('data-id'); drag = null; clearDrop();
                var fm = d.id ? find(d.id) : null;
                if (fm && fm.n.kids.length && wouldList(t, zone) && canPlace(d, tid, zone)) { askMove(d, tid, zone); return; }
                doMove(d, tid, zone);
            });
            root.addEventListener('dragend', function () { drag = null; clearDrop(); if ($('dragHint')) { $('dragHint').hidden = true; } });

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

        treeEl.addEventListener('click', function (e) { var t = e.target.closest('[data-id]'); if (t) { select(t.getAttribute('data-id')); } });
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
            else if (act === 'fit') { fit(); }
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
                var f = find(sel); if (!f || !f.p) { return; }
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
                '<div class="cx-org-stage"><div class="cx-org-tree"><ul>' + card(T) + '</ul></div></div>' +
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
