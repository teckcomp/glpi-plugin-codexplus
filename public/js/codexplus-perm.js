/* =========================================================================
   Codex+ — coluna "Permissões" da página do documento (bloco R3b2-a)
   -------------------------------------------------------------------------
   Adiciona e tira leitores (grupo, perfil, usuário) por
   ajax/document.targets.php, sem recarregar a página: a coluna vale também
   com o documento publicado, fora do formulário de edição, e recarregar no
   meio de uma edição perderia o que não foi salvo.

   Regra nenhuma aqui: o servidor decide quem pode e devolve a lista inteira,
   que substitui a da tela. A marcação dos itens repete a de
   templates/parts/doc-permissions.html.twig: mudou uma, mude a outra.

   CSRF (achado 43): cada POST consome o token. O token novo da resposta vai
   para TODOS os campos _glpi_csrf_token da página — senão o Salvar, os botões
   do fluxo ou o salvamento automático do diagrama quebram em seguida.
   ========================================================================= */
(function () {
    'use strict';

    var ROTULO = { group: 'Grupo', profile: 'Perfil', user: 'Usuário' };
    var ICONE = { group: 'ti-users', profile: 'ti-id-badge-2', user: 'ti-user' };
    var ERRO = {
        ja_existe: 'Esse leitor já está na lista.',
        escolha_o_alvo: 'Escolha na lista antes de adicionar.',
        sem_permissao: 'Você não pode mudar os leitores deste documento.',
        nao_encontrado: 'Esse leitor não está mais na lista. Recarregue a página.',
        nao_gravou: 'Não foi possível gravar. Tente de novo.'
    };

    function esc(t) {
        return String(t).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function mount(box) {
        if (box.__cxPerm) { return box.__cxPerm; }
        var url = box.getAttribute('data-url');
        var doc = box.getAttribute('data-doc');
        var gere = box.getAttribute('data-manage') === '1';
        var lista = box.querySelector('[data-cxp-list]');
        var vazio = box.querySelector('[data-cxp-empty]');
        var msg = box.querySelector('[data-cxp-msg]');
        var ocupado = false;

        function avisa(t, erro) {
            if (!msg) { return; }
            msg.textContent = t || '';
            msg.className = 'cx-perm-msg' + (erro ? ' is-erro' : '');
        }
        function token() {
            var el = box.querySelector('[name="_glpi_csrf_token"]');
            return el ? el.value : '';
        }
        function rotaciona(novo) {
            if (!novo) { return; }
            var d = box.ownerDocument || document;
            d.querySelectorAll('[name="_glpi_csrf_token"]').forEach(function (i) { i.value = novo; });
        }
        function listaHtml(alvos) {
            return alvos.map(function (t) {
                return '<li class="cx-perm-item" data-tipo="' + esc(t.tipo) + '" data-ligacao="' + (+t.ligacao) + '">' +
                    '<i class="ti ' + (ICONE[t.tipo] || 'ti-user') + '" title="' + (ROTULO[t.tipo] || '') + '"></i>' +
                    '<span class="cx-perm-name">' + esc(t.nome) + '</span>' +
                    (gere ? '<button type="button" class="cx-perm-del" data-cxp-del aria-label="Tirar ' + esc(t.nome) +
                        '" title="Tirar"><i class="ti ti-x"></i></button>' : '') +
                    '</li>';
            }).join('');
        }
        function mostra(alvos) {
            lista.innerHTML = listaHtml(alvos);
            if (vazio) { vazio.hidden = alvos.length > 0; }
        }
        function selecao(tipo) {
            var s = box.querySelector('[data-cxp-sel="' + tipo + '"] select');
            return s ? { el: s, v: parseInt(s.value, 10) || 0 } : { el: null, v: 0 };
        }
        function limpa(el) {
            if (!el) { return; }
            // Select2 (listas do GLPI): volta ao vazio pelo jQuery quando há.
            if (window.jQuery) { window.jQuery(el).val(null).trigger('change'); } else { el.value = ''; }
        }

        function envia(campos, depois) {
            if (ocupado) { return; }
            ocupado = true;
            box.classList.add('is-busy');
            var corpo = new FormData();
            corpo.append('id', doc);
            Object.keys(campos).forEach(function (k) { corpo.append(k, campos[k]); });
            corpo.append('_glpi_csrf_token', token());
            fetch(url, { method: 'POST', body: corpo, credentials: 'same-origin' })
                .then(function (r) {
                    return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; });
                })
                .then(function (res) {
                    ocupado = false;
                    box.classList.remove('is-busy');
                    rotaciona(res.j.csrf);
                    if (!res.ok || !res.j.ok) {
                        avisa(ERRO[res.j.erro] || 'Não foi possível concluir. Recarregue a página e tente de novo.', true);
                        return;
                    }
                    mostra(res.j.alvos || []);
                    if (depois) { depois(); }
                })
                .catch(function () {
                    ocupado = false;
                    box.classList.remove('is-busy');
                    avisa('Sem resposta do servidor. Recarregue a página e tente de novo.', true);
                });
        }

        box.addEventListener('click', function (e) {
            var add = e.target.closest && e.target.closest('[data-cxp-add]');
            if (add) {
                e.preventDefault();
                var tipo = add.getAttribute('data-cxp-add'), s = selecao(tipo);
                if (!s.v) { avisa(ERRO.escolha_o_alvo, true); return; }
                envia({ acao: 'add', tipo: tipo, alvo: s.v }, function () {
                    limpa(s.el);
                    avisa(ROTULO[tipo] + ' adicionado.', false);
                });
                return;
            }
            var del = e.target.closest && e.target.closest('[data-cxp-del]');
            if (del) {
                e.preventDefault();
                var li = del.closest('[data-ligacao]');
                if (!li) { return; }
                var nome = (li.querySelector('.cx-perm-name') || {}).textContent || '';
                envia({ acao: 'del', tipo: li.getAttribute('data-tipo'), ligacao: li.getAttribute('data-ligacao') }, function () {
                    avisa(nome + ' saiu da lista.', false);
                });
            }
        });

        var api = {
            add: function (tipo, alvo, cb) { envia({ acao: 'add', tipo: tipo, alvo: alvo }, cb); },
            del: function (tipo, ligacao, cb) { envia({ acao: 'del', tipo: tipo, ligacao: ligacao }, cb); }
        };
        box.__cxPerm = api;
        return api;
    }

    function boot() {
        document.querySelectorAll('[data-cx-perm]').forEach(mount);
    }
    window.CodexPerm = { mount: mount };
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
