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
        try { S = srcEl ? JSON.parse(srcEl.textContent || 'null') : null; } catch (e) { S = null; }
        if (!S || !S.tree) {
            S = { levels: copyLevels(STD_LEVELS), tree: { id: 'n1', name: '', role: 'Direção', lvl: 'diretoria', kids: [], note: '' }, esc: [] };
        }
        fix(S);

        // ---- estrutura -------------------------------------------------
        root.classList.add('cx-org');
        root.innerHTML =
            '<div class="cx-org-tools">' +
                '<button type="button" class="cx-org-btn cx-org-btn--full" data-act="full" data-el="fullBtn"><i class="ti ti-maximize"></i> Tela cheia</button>' +
                (editable ? '<button type="button" class="cx-org-btn cx-org-btn--primary" data-act="add">Nova pessoa</button>' : '') +
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
        function fix(s) {
            var m = 0;
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
            walk(s.tree, function (n) {
                n.kids = Array.isArray(n.kids) ? n.kids : [];
                n.name = n.name || ''; n.role = n.role || ''; n.note = n.note || '';
                if (keys.indexOf(n.lvl) < 0) { n.lvl = last; }
                if (legacy && n.lvl === 'noc' && n.dashed === undefined) { n.dashed = true; }
                var k = parseInt(String(n.id || '').replace(/\D/g, ''), 10);
                if (!n.id) { n.id = 'n' + (++m + 100000); }
                if (k > m) { m = k; }
            });
            uid = m;
            if (!Array.isArray(s.esc)) { s.esc = []; }
            s.esc.forEach(function (r) { if (keys.indexOf(r.lvl) < 0) { r.lvl = last; } });
        }
        function levelOf(k) { return S.levels.filter(function (l) { return l.key === k; })[0] || S.levels[S.levels.length - 1]; }
        function lc(k) { return '--lc:' + levelOf(k).color; }
        function nextLevel(k) {
            var i = S.levels.map(function (l) { return l.key; }).indexOf(k);
            return (S.levels[Math.min(i + 1, S.levels.length - 1)] || S.levels[0]).key;
        }
        function levelUsed(k) { var u = false; walk(S.tree, function (n) { if (n.lvl === k) { u = true; } }); return u || S.esc.some(function (r) { return r.lvl === k; }); }
        function levelOptions(selected, withAuto) {
            return (withAuto ? '<option value="">Conforme a posição</option>' : '') + S.levels.map(function (l) {
                return '<option value="' + escHtml(l.key) + '"' + (l.key === selected ? ' selected' : '') + '>' + escHtml(l.label) + '</option>';
            }).join('');
        }
        function P(name, role, lvl) { return { id: 'n' + (++uid), name: name, role: role, lvl: lvl, kids: [], note: '' }; }
        function find(id) { var r = null; walk(S.tree, function (n, p) { if (n.id === id) { r = { n: n, p: p }; } }); return r; }
        function isIn(a, b) { var f = false; walk(a, function (n) { if (n.id === b.id) { f = true; } }); return f; }
        function label(n) { return n.name.trim() || (n.lvl === 'noc' ? 'Coringa a definir' : 'Vaga em aberto'); }
        function commit() {
            if (input) { input.value = JSON.stringify(S); dirty = true; }
        }
        function hit(n) {
            if (!query) { return ''; }
            return norm(n.name + ' ' + n.role + ' ' + n.note).indexOf(query) >= 0 ? ' is-hit' : ' is-dim';
        }

        // ---- desenho ---------------------------------------------------
        function card(n) {
            var leaves = n.kids.filter(function (k) { return !k.kids.length; });
            var br = n.kids.filter(function (k) { return k.kids.length; });
            var cls = 'cx-org-card' + (n.group ? ' is-group' : '') + (n.dashed ? ' is-dashed' : '') + (sel === n.id ? ' is-sel' : '') + hit(n);
            return '<li><div class="' + cls + '" style="' + lc(n.lvl) + '" data-id="' + escHtml(n.id) + '" tabindex="0"' +
                (editable ? ' draggable="true"' : '') + ' title="' + escHtml(n.note) + '">' +
                '<div class="cx-org-head"><strong class="' + (n.name.trim() ? '' : 'is-vaga') + '">' + escHtml(label(n)) + '</strong>' +
                '<span class="cx-org-role">' + escHtml(n.role) + '</span>' + tags(n) + '</div>' +
                (leaves.length ? '<div class="cx-org-rows">' + leaves.map(row).join('') + '</div>' : '') +
                '</div>' + (br.length ? '<ul>' + br.map(card).join('') + '</ul>' : '') + '</li>';
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
            walk(S.tree, function (n) {
                if (n.group) { return; }
                if (!n.name.trim()) { vagas++; return; }
                c[n.lvl] = (c[n.lvl] || 0) + 1; total++;
            });
            return S.levels.map(function (l) {
                return '<span style="--lc:' + l.color + '"><i></i>' + escHtml(l.label) + ' <b>' + (c[l.key] || 0) + '</b></span>';
            }).join('') + '<span><i class="is-dash"></i>Vagas em aberto <b>' + vagas + '</b></span><span>Pessoas nomeadas <b>' + total + '</b></span>';
        }
        function render() {
            treeEl.innerHTML = '<ul>' + card(S.tree) + '</ul>';
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
                walk(S.tree, function (m, _, d) {
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
            } else {
                var a = find(d.id); n = a.n;
                a.p.kids.splice(a.p.kids.indexOf(n), 1);
                t = find(tid);
            }
            if (zone === 'in') { t.n.kids.push(n); }
            else { t.p.kids.splice(t.p.kids.indexOf(t.n) + (zone === 'after' ? 1 : 0), 0, n); }
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
            var i = f.p.kids.indexOf(f.n);
            f.p.kids.splice.apply(f.p.kids, [i + 1, 0].concat(f.n.kids));
            f.n.kids = [];
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
            f.n.kids.push(k); commit(); select(k.id); F('name').focus();
        }

        if (editable) {
            ['name', 'role', 'note'].forEach(function (k) {
                F(k).addEventListener('input', function () { cur()[k] = F(k).value; commit(); render(); });
            });
            F('lvl').addEventListener('change', function () { cur().lvl = F('lvl').value; commit(); render(); });
            F('pend').addEventListener('change', function () { cur().pend = F('pend').checked; commit(); render(); });
            F('group').addEventListener('change', function () { cur().group = F('group').checked; commit(); render(); fill(); });
            F('dashed').addEventListener('change', function () { cur().dashed = F('dashed').checked; commit(); render(); });
            F('parent').addEventListener('change', function () { move(sel, F('parent').value); fill(); });

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
                commit(); render(); renderEsc(); renderPalette();
            });

            var escBody = $('esc');
            escBody.addEventListener('input', function (e) {
                var r = e.target.getAttribute('data-r'), c = e.target.getAttribute('data-c');
                if (r !== null && S.esc[r]) { S.esc[r].c[c] = e.target.innerText.trim(); commit(); }
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
                    fix(ns); S = ns; sel = null; ed.hidden = true; commit(); render(); renderEsc(); renderPalette(); $('tpl').close(); fit();
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
            if (act === 'zin') { setZ(z + 0.1); }
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
            else if (act === 'add') { addUnder(sel && find(sel) ? sel : S.tree.id); }
            else if (act === 'edadd') { addUnder(sel); }
            else if (act === 'edclose') { sel = null; ed.hidden = true; render(); }
            else if (act === 'eddel') {
                if (!b.classList.contains('is-armed')) { b.classList.add('is-armed'); b.textContent = 'Confirmar exclusão'; return; }
                var f = find(sel); if (!f || !f.p) { return; }
                f.p.kids.splice.apply(f.p.kids, [f.p.kids.indexOf(f.n), 1].concat(f.n.kids));
                sel = null; ed.hidden = true; commit(); render();
            }
            else if (act === 'escadd') { S.esc.push({ lvl: S.levels[S.levels.length - 1].key, c: ['Novo nível', '', '', ''] }); commit(); renderEsc(); }
            else if (act === 'io') { $('ioText').value = JSON.stringify(S, null, 2); $('ioMsg').textContent = ''; $('io').showModal(); }
            else if (act === 'ioclose') { $('io').close(); }
            else if (act === 'iocopy') {
                var t = $('ioText'); t.select();
                if (navigator.clipboard) { navigator.clipboard.writeText(t.value).catch(function () {}); }
                else { try { document.execCommand('copy'); } catch (_) { /* sem cópia */ } }
            }
            else if (act === 'ioapply') {
                try {
                    var s = JSON.parse($('ioText').value);
                    if (!s || !s.tree || !Array.isArray(s.tree.kids)) { throw new Error('forma'); }
                    fix(s); S = s; sel = null; ed.hidden = true; commit(); render(); renderEsc(); renderPalette(); $('io').close(); fit();
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
                '<div class="cx-org-stage"><div class="cx-org-tree"><ul>' + card(S.tree) + '</ul></div></div>' +
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

        var api = { getData: function () { return JSON.parse(JSON.stringify(S)); }, fit: fit, setZoom: setZ, print: printOrg, place: place, drop: function (d, tid, zone) { var fm = d.id ? find(d.id) : null; var el = treeEl.querySelector('[data-id="' + tid + '"]'); if (fm && fm.n.kids.length && el && wouldList(el, zone) && canPlace(d, tid, zone)) { askMove(d, tid, zone); return 'ask'; } return doMove(d, tid, zone); }, templates: TEMPLATES.map(function (t) { return t.key; }) };
        root.__cxOrg = api;
        return api;
    }

    function boot() {
        document.querySelectorAll('[data-cx-org]').forEach(mount);
    }

    window.CodexOrg = { mount: mount };
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
