/* Codex+ — casca (UI-1, 20/10/2026): troca de tema claro/escuro pelo botão
   sol/lua da barra, como no Task+ (shell.js 16q).
   O tema mora em <html data-codexplus-theme="light|dark">. Quem o põe ANTES
   do paint é o script inline de parts/shell.html.twig (lê o cookie; sem
   cookie, ESCURO — UI-6); aqui
   só a troca: atributo na hora, cookie codexplus_theme (1 ano, caminho do
   GLPI) e cópia no localStorage. Sem endpoint e sem schema: a preferência
   é por navegador. Se um dia for por usuário no servidor, vira um
   ajax/prefs.php (padrão do Task+) sem mexer neste arquivo além do save(). */
(function () {
    'use strict';
    var ATTR = 'data-codexplus-theme';
    var COOKIE = 'codexplus_theme';
    var KEY = 'codexplus.theme';

    function current() {
        return document.documentElement.getAttribute(ATTR) === 'dark' ? 'dark' : 'light';
    }

    function rootPath() {
        var root = (window.CFG_GLPI && typeof window.CFG_GLPI.root_doc === 'string') ? window.CFG_GLPI.root_doc : '';
        return root === '' ? '/' : root;
    }

    function label(theme) {
        return theme === 'dark' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro';
    }

    function apply(theme) {
        theme = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute(ATTR, theme);
        var btn = document.querySelector('[data-cx-theme-toggle]');
        if (btn) {
            btn.setAttribute('aria-label', label(theme));
            btn.setAttribute('title', label(theme));
        }
        try { window.localStorage.setItem(KEY, theme); } catch (e) { /* navegação privada */ }
        try {
            document.cookie = COOKIE + '=' + theme + '; path=' + rootPath() + '; max-age=31536000; SameSite=Lax';
        } catch (e) { /* sem cookie: fica só nesta página */ }
    }

    document.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('[data-cx-theme-toggle]') : null;
        if (!btn) {
            return;
        }
        e.preventDefault();
        apply(current() === 'dark' ? 'light' : 'dark');
    });

    document.addEventListener('DOMContentLoaded', function () {
        if (document.querySelector('[data-cx-theme-toggle]')) {
            apply(current()); // acerta o rótulo do botão com o tema já posto pelo inline
        }
    });

    window.CodexplusShell = { theme: current, setTheme: apply };
})();

/* PL-31b (Claudio, 24/10/2026): botão "voltar ao topo" em todas as páginas do
   Codex+ (as que têm .codexplus-app, inclusive o link público). Aparece
   depois de rolar uma tela; some na tela cheia do editor. */
(function () {
    'use strict';
    function boot() {
        if (!document.querySelector('.codexplus-app') || document.querySelector('.cx-totop')) { return; }
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cx-totop';
        btn.setAttribute('aria-label', 'Voltar ao topo');
        btn.title = 'Voltar ao topo';
        btn.innerHTML = '<i class="ti ti-arrow-up" aria-hidden="true"></i>';
        btn.addEventListener('click', function () {
            var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
        });
        document.body.appendChild(btn);
        var tick = false;
        function update() {
            tick = false;
            btn.classList.toggle('is-on', window.scrollY > window.innerHeight * 0.6);
        }
        window.addEventListener('scroll', function () {
            if (!tick) { tick = true; window.requestAnimationFrame(update); }
        }, { passive: true });
        update();
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
