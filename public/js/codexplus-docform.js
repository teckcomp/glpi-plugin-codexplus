/* =========================================================================
   Codex+ — formulário do documento (bloco R3b2-b)
   -------------------------------------------------------------------------
   Comportamento da página front/document.form.php, sem regra nenhuma (o
   servidor confere tudo de novo ao gravar):

   1. Campo que só existe em alguns tipos ([data-cx-only-type="PRP"]: Cliente
      em texto, só em proposta; "LAU DTC": Cliente vinculado, bloco T1 — lista
      separada por espaço). Na criação o tipo ainda pode mudar: o campo
      aparece e some com a escolha. Na edição não há seletor de tipo.

   3. Setor / Categorias (bloco SC1, Claudio 27/09/2026): o setor filtra as
      categorias (só as dele, várias); trocar de setor tira as do anterior;
      "+" do Super-Admin cria setor ou categoria ali mesmo
      (ajax/placement.php); a linha "Na estante" mostra onde o documento
      mora. O servidor confere de novo ao gravar e ao sair do rascunho.

   A lista de auditores por categoria (ajax/document.auditors.php) saiu no
   bloco A1: o auditor vem do perfil e a lista já chega pronta do servidor.

   Listas do GLPI são Select2: a troca chega pelo jQuery ('change'), por isso
   os dois eventos são escutados.
   ========================================================================= */
(function () {
    'use strict';

    function onChange(el, fn) {
        el.addEventListener('change', fn);
        if (window.jQuery) { window.jQuery(el).on('change', fn); }
    }

    function tipos(form) {
        var sel = form.querySelector('select[name="doctype"]');
        if (!sel) { return; }
        var campos = form.querySelectorAll('[data-cx-only-type]');
        var upd = function () {
            campos.forEach(function (c) {
                c.hidden = c.getAttribute('data-cx-only-type').split(/\s+/).indexOf(sel.value) < 0;
            });
        };
        onChange(sel, upd);
        upd();
    }

    /* 2. Modelo (R3b4, Claudio 26/09/2026): lista os modelos do tipo
          escolhido (padrão primeiro, "Em branco" no fim) e preenche o corpo.
          Se já houver texto escrito à mão, pergunta antes de substituir. A
          partir de 10 opções a lista ganha busca (Select2 do GLPI). */
    function modelos(form) {
        var sel = form.querySelector('#cx-template');
        var tipo = form.querySelector('select[name="doctype"]');
        var src = document.getElementById('cx-templates-data');
        if (!sel || !tipo || !src) { return; }
        var lista;
        try { lista = JSON.parse(src.textContent || '[]'); } catch (e) { lista = []; }
        var aplicado = '';      // corpo como o último modelo o deixou
        var atual = null;       // valor já tratado (o change pode chegar duas vezes)
        var tipoAtual = null;

        function editor() { return window.tinymce ? window.tinymce.get('codexplus-doc-content') : null; }
        function vazio(h) { return !h || !String(h).replace(/<[^>]*>|&nbsp;|\s/g, ''); }
        function acha(id) { return lista.filter(function (t) { return String(t.id) === String(id); })[0] || null; }
        function aplica(id, pergunta) {
            var ed = editor();
            if (!ed) { return true; }
            var agora = ed.getContent();
            if (pergunta && !vazio(agora) && agora !== aplicado &&
                !window.confirm('Substituir o texto já escrito pelo conteúdo do modelo?')) {
                return false;
            }
            var t = acha(id);
            ed.setContent(t ? t.content : '');
            aplicado = ed.getContent();
            return true;
        }
        function select2(n) {
            if (!window.jQuery || !window.jQuery.fn || !window.jQuery.fn.select2) { return; }
            var $s = window.jQuery(sel);
            if (n >= 10) {
                if (!$s.data('select2')) { $s.select2({ width: '100%', minimumResultsForSearch: 0 }); }
                $s.trigger('change.select2');
            } else if ($s.data('select2')) {
                $s.select2('destroy');
            }
        }
        function monta() {
            if (tipo.value === tipoAtual) { return; }
            tipoAtual = tipo.value;
            var ops = lista.filter(function (t) { return t.doctype === tipo.value; });
            sel.innerHTML = ops.map(function (t) {
                var o = document.createElement('option');
                o.value = t.id;
                o.textContent = t.name + (t.is_default ? ' (padrão)' : '');
                return o.outerHTML;
            }).join('') + '<option value="0">Em branco</option>';
            sel.value = ops.length ? String(ops[0].id) : '0';
            select2(ops.length + 1);
            if (aplica(sel.value, true)) { atual = sel.value; } else { sel.value = '0'; atual = '0'; }
        }
        function troca() {
            if (sel.value === atual) { return; }
            if (aplica(sel.value, true)) {
                atual = sel.value;
            } else {
                sel.value = atual;
                if (window.jQuery) { window.jQuery(sel).trigger('change.select2'); }
            }
        }
        onChange(sel, troca);
        onChange(tipo, monta);
        // O editor do GLPI nasce depois do script: espera por ele (até ~15 s).
        var tent = 0;
        (function espera() {
            if (editor() && editor().initialized) { monta(); return; }
            if (++tent < 60) { setTimeout(espera, 250); }
        })();
    }

    /* 3. Setor / Categorias (SC1). */
    function placement(form) {
        var box = form.querySelector('[data-cx-place]');
        if (!box) { return; }
        var dados;
        try { dados = JSON.parse(box.querySelector('[data-cx-place-data]').textContent); } catch (e) { return; }
        var tree = dados.tree || [];
        var setor = dados.sector || 0;
        var sel = (dados.selected || []).filter(function (c) { return setor && c.sector === setor; }).map(function (c) { return c.id; });
        var fora = (dados.selected || []).filter(function (c) { return !setor || c.sector !== setor; });
        var nota = '';
        var podeCriar = box.getAttribute('data-can-create') === '1';
        var selS = box.querySelector('[data-cx-place-sector]');
        var cats = box.querySelector('[data-cx-place-cats]');
        var maisC = box.querySelector('[data-cx-place-new="category"]');
        var hint = box.querySelector('[data-cx-place-hint]');
        var aviso = box.querySelector('[data-cx-place-warn]');
        var estante = box.querySelector('[data-cx-place-shelf]');
        var esc = function (t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; };
        var doSetor = function (id) { for (var i = 0; i < tree.length; i++) { if (tree[i].id === id) { return tree[i]; } } return null; };
        var nomeCat = function (id) {
            var s = doSetor(setor);
            var c = s ? s.categories.filter(function (x) { return x.id === id; })[0] : null;
            return c ? c.name : '#' + id;
        };
        function desenha() {
            selS.innerHTML = '<option value="0">' + esc('— escolha o setor —') + '</option>' + tree.map(function (s) {
                return '<option value="' + s.id + '"' + (s.id === setor ? ' selected' : '') + '>' + esc(s.name) + '</option>';
            }).join('');
            var s = doSetor(setor);
            if (!s) {
                cats.classList.add('is-off');
                cats.innerHTML = '<span class="cx-place-empty">' + esc('Escolha o setor primeiro') + '</span>';
                if (maisC) { maisC.hidden = true; }
            } else {
                cats.classList.remove('is-off');
                var resto = s.categories.filter(function (c) { return sel.indexOf(c.id) < 0; });
                cats.innerHTML = sel.map(function (id) {
                    return '<span class="cx-place-chip">' + esc(nomeCat(id))
                        + '<input type="hidden" name="_categories[]" value="' + id + '">'
                        + '<button type="button" data-cx-place-x="' + id + '" aria-label="' + esc('Tirar ' + nomeCat(id)) + '"><i class="ti ti-x"></i></button></span>';
                }).join('') + '<select id="cx-place-cat" class="cx-place-add" data-cx-place-add aria-label="' + esc('Adicionar categoria') + '">'
                    + '<option value="0">' + esc(resto.length ? '+ categoria de ' + s.name : (s.categories.length ? 'todas marcadas' : 'nenhuma categoria neste setor')) + '</option>'
                    + resto.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') + '</select>';
                if (maisC) { maisC.hidden = !podeCriar; }
            }
            hint.textContent = nota || (s ? 'Só as categorias do setor ' + s.name + ' · pode marcar mais de uma.' : 'Só as categorias do setor escolhido. Pode marcar mais de uma.');
            aviso.hidden = !fora.length;
            aviso.textContent = fora.length ? 'Ao salvar, saem as categorias fora de ' + (s ? s.name : 'um setor') + ': '
                + fora.map(function (c) { return c.name + (c.sector ? '' : ' (sem setor)'); }).join(', ') + '.' : '';
            estante.innerHTML = s && sel.length
                ? '<i class="ti ti-books"></i> Na estante: ' + sel.map(function (id) { return '<b>' + esc(s.name + ' › ' + nomeCat(id)) + '</b>'; }).join(' e ')
                : '<i class="ti ti-books"></i> Ainda sem lugar na estante. Setor e categoria são obrigatórios para enviar.';
        }
        function mini(tipo, rotulo, cria) {
            var alvo = box.querySelector('[data-cx-place-mini="' + tipo + '"]');
            alvo.innerHTML = '<div class="cx-place-mini"><input type="text" class="form-control" maxlength="255" placeholder="' + esc(rotulo) + '">'
                + '<button type="button" class="btn btn-primary">Criar</button><button type="button" class="btn btn-outline-secondary" aria-label="Cancelar"><i class="ti ti-x"></i></button>'
                + '<span class="cx-place-err"></span></div>';
            var inp = alvo.querySelector('input'), bts = alvo.querySelectorAll('button'), err = alvo.querySelector('.cx-place-err');
            var fecha = function () { alvo.innerHTML = ''; };
            var vai = function () {
                var nome = inp.value.trim();
                if (!nome) { err.textContent = 'Informe um nome.'; inp.focus(); return; }
                bts[0].disabled = true;
                var fd = new FormData(), tk = document.querySelector('[name="_glpi_csrf_token"]');
                fd.append('action', tipo);
                fd.append('name', nome);
                fd.append('sector', String(setor));
                if (tk) { fd.append('_glpi_csrf_token', tk.value); }
                fetch(box.getAttribute('data-ajax'), { method: 'POST', body: fd, credentials: 'same-origin' })
                    .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
                    .then(function (res) {
                        if (res.j.csrf) { document.querySelectorAll('[name="_glpi_csrf_token"]').forEach(function (i) { i.value = res.j.csrf; }); }
                        if (!res.ok || !res.j.item) { err.textContent = res.j.erro || 'Não foi possível criar.'; bts[0].disabled = false; return; }
                        cria(res.j.item);
                        fecha();
                        desenha();
                    })
                    .catch(function () { err.textContent = 'Falha de rede. Tente de novo.'; bts[0].disabled = false; });
            };
            inp.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); vai(); }
                if (e.key === 'Escape') { fecha(); }
            });
            inp.addEventListener('input', function () { err.textContent = ''; });
            bts[0].addEventListener('click', vai);
            bts[1].addEventListener('click', fecha);
            inp.focus();
        }
        function trocaSetor(novo) {
            if (novo === setor) { return; }
            var antes = doSetor(setor);
            nota = sel.length && antes ? 'Trocou de setor: as categorias de ' + antes.name + ' foram tiradas.' : '';
            sel = [];
            setor = novo;
        }
        selS.addEventListener('change', function () { trocaSetor(parseInt(selS.value, 10) || 0); desenha(); });
        box.addEventListener('change', function (e) {
            if (!e.target.matches('[data-cx-place-add]')) { return; }
            var id = parseInt(e.target.value, 10) || 0;
            if (id && sel.indexOf(id) < 0) { sel.push(id); nota = ''; }
            desenha();
        });
        box.addEventListener('click', function (e) {
            var x = e.target.closest('[data-cx-place-x]');
            if (x) { var id = parseInt(x.getAttribute('data-cx-place-x'), 10); sel = sel.filter(function (v) { return v !== id; }); nota = ''; desenha(); return; }
            var novo = e.target.closest('[data-cx-place-new]');
            if (!novo) { return; }
            if (novo.getAttribute('data-cx-place-new') === 'sector') {
                mini('sector', 'Nome do novo setor', function (item) {
                    if (!doSetor(item.id)) { tree.push({ id: item.id, name: item.name, categories: [] }); tree.sort(function (a, b) { return a.name.localeCompare(b.name); }); }
                    trocaSetor(item.id);
                });
            } else if (doSetor(setor)) {
                mini('category', 'Nova categoria em ' + doSetor(setor).name, function (item) {
                    var s = doSetor(setor);
                    if (!s.categories.some(function (c) { return c.id === item.id; })) { s.categories.push(item); s.categories.sort(function (a, b) { return a.name.localeCompare(b.name); }); }
                    if (sel.indexOf(item.id) < 0) { sel.push(item.id); }
                    nota = '';
                });
            }
        });
        desenha();
    }

    function boot() {
        document.querySelectorAll('form').forEach(function (f) {
            if (!f.querySelector('.codexplus-doc-edit')) { return; }
            tipos(f);
            modelos(f);
            placement(f);
        });
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
