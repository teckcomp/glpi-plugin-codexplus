# Etapa 4e — Cabeçalho e rodapé por documento no PDF

## Objetivo

Levar `header_html` e `footer_text` (campos por documento, criados na Etapa
4d mas até então só visíveis na tela de edição) até a exportação em PDF,
com prioridade sobre a configuração global (`Branding`) quando o documento
tiver os seus próprios — sem recriar o motor de paginação da Etapa 4c.

Além disso, todo documento passa a nascer (e todo documento antigo sem
cabeçalho próprio passa a abrir a edição) já com a logo configurada em
**Configurar → Codex+** semeada em `header_html`, alinhada à esquerda —
decisão do usuário, alinhada em conversa antes de codificar.

## Contexto analisado

Antes de qualquer alteração, foram lidos/relidos:

- `docs/CONTEXTO.md` e `docs/ROADMAP.md` — a entrada "Etapa 4e" do roadmap
  já registrava a lacuna (campos existem, não chegam ao PDF) e a decisão de
  reaproveitar o motor da 4c
- `public/js/codexplus.js` **inteiro** — `getPrintConfig()`,
  `computeGeometry()`, `buildPageCss()`, `resolveMarkers()`, `buildPageEl()`,
  `layoutPages()`, `exportPdf()` — para confirmar exatamente onde o
  cabeçalho e o rodapé são desenhados hoje e como a config chega até lá
- `front/article.php` — confirmado que `print_config.document` **não**
  incluía `header_html`/`footer_text` (só vinham do `Branding` global)
- `src/Wiki.php` (`articleMeta()`) — confirmado que o array de metadados
  devolvido para o Twig/JSON **não** incluía esses dois campos, mesmo já
  existindo na tabela desde a 4d
- `src/Branding.php` — reconfirmado o mecanismo de armazenamento/entrega da
  logo (`hasLogo()`, `getLogoUrl()`, `get('header_logo_height')`), para
  decidir se cabia um campo de imagem novo ou reaproveitar este
- `front/newdocument.form.php`, `front/article.form.php` — os dois pontos
  de entrada onde `header_html` precisa nascer/ser semeado
- `templates/article-edit.html.twig` — o texto de dica do rodapé afirmava
  explicitamente que o PDF ainda usava só o rodapé geral; precisava ser
  corrigido junto

**Pontos alinhados em conversa antes de codificar** (documento de escopo
`Etapa 4e` fornecido pelo usuário + duas rodadas de perguntas):

1. **Altura do cabeçalho no PDF:** `header_html` é rich text livre (TinyMCE),
   incompatível com a premissa de altura de página constante que todo
   `layoutPages()` depende (achado 17, `CONTEXTO.md`). Decisão do usuário:
   opção B — altura reservada **fixa** (reaproveita `header_logo_height`,
   já existente), conteúdo que ultrapassa é cortado (`overflow:hidden`).
   Não foi criado um segundo campo de altura configurável.
2. **Origem da imagem padrão do cabeçalho:** decisão do usuário — reaproveitar
   a logo já configurada em `Branding` (Configurar → Codex+), sem campo de
   upload dedicado. Motivo registrado pelo usuário: documento novo e
   documento antigo sem cabeçalho próprio devem abrir/nascer já com essa
   imagem, posicionada à esquerda.

## Alterações realizadas

1. **`src/Branding.php`** — novo método `getDefaultHeaderHtml()`: fonte
   única da marcação padrão (`<p><img ...></p>`, alinhada à esquerda, altura
   de `header_logo_height`) usada para semear `header_html`. Devolve string
   vazia se não houver logo configurada — documento nasce sem cabeçalho,
   como antes desta etapa. Nenhuma outra função de `Branding.php` foi
   tocada.
2. **`src/Wiki.php`** (`articleMeta()`) — passa a incluir `header_html` e
   `footer_text` no array de metadados devolvido, para que
   `front/article.php` consiga montá-los no JSON de impressão.
3. **`front/article.php`** — `print_config.document` ganha `header_html` e
   `footer_text`. A regra de prioridade (documento vs. `Branding`) fica
   inteira em `codexplus.js` — este arquivo só entrega os dois valores brutos.
4. **`front/article.form.php`** — no GET, se `meta.fields['header_html']`
   vier vazio, o valor passado ao `Html::textarea()` é pré-preenchido com
   `Branding::getDefaultHeaderHtml()` antes de abrir o TinyMCE. Documento
   que já tem `header_html` salvo (mesmo vazio de propósito) não é
   sobrescrito.
5. **`front/newdocument.form.php`** — `DocumentMeta::add()` grava
   `header_html` já com `Branding::getDefaultHeaderHtml()` na criação.
6. **`public/js/codexplus.js`** — único arquivo com mudança de lógica de
   PDF, todas aditivas sobre o motor da 4c:
   - `getPrintConfig()`: `cfg.document` ganha `header_html`/`footer_text`
     (aproveitando o laço de cópia já existente); normalização de
     `footer_show` corrigida para não depender só de `cfg.brand.footer_text`
     (senão um rodapé próprio do documento sumiria se o texto global
     estivesse vazio, mesmo com o interruptor ligado — bug que a mudança
     introduziria se não corrigido).
   - `computeGeometry()`: a altura de cabeçalho passa a ser reservada
     quando **ou** a logo de canto **ou** `document.header_html` estiverem
     presentes, mantendo o mesmo valor fixo de antes.
   - `buildPageCss()`: `.cx-page-header` ganha `overflow:hidden`; nova
     variante `.cx-page-header--doc` com estilos sãos para texto/imagem
     livres. Variantes de canto (`--left`/`--right`) inalteradas.
   - `buildPageEl()`: se `cfg.document.header_html` não for vazio, ele é
     injetado em **todas** as páginas (não depende de `repeat_logo`); caso
     contrário, comportamento de canto da Etapa 4c, sem nenhuma mudança. O
     rodapé usa `cfg.document.footer_text || cfg.brand.footer_text` como
     texto, resolvido pelo mesmo `resolveMarkers()` (não duplicado).
7. **`templates/article-edit.html.twig`** — dica nova na zona de cabeçalho
   explicando que ele agora entra no PDF e já vem semeado; dica do rodapé
   corrigida (antes dizia que o PDF *não* usava o texto por documento — isso
   deixou de ser verdade).
8. **`setup.php`** — versão subida de `0.5.4-alpha` para `0.5.5-alpha`.
   **Sem migração de schema** — `header_html`/`footer_text` já existem
   desde a 4d; a versão sobe só para o GLPI detectar a atualização e o
   deploy seguir o protocolo padrão (`DEPLOY.md`).

## Arquivos modificados

- `src/Branding.php`
- `src/Wiki.php`
- `front/article.php`
- `front/article.form.php`
- `front/newdocument.form.php`
- `public/js/codexplus.js`
- `templates/article-edit.html.twig`
- `setup.php`
- `docs/ROADMAP.md`
- `docs/CONTEXTO.md`

## Arquivos criados

- `docs/etapas/ETAPA-4e.md` (este arquivo)

`src/Install.php` **não foi tocado** — nenhuma coluna nova.

## Compatibilidade GLPI 11.0.6

- **Hooks:** nenhum hook novo.
- **Classes/métodos usados:** todos já validados em etapas anteriores —
  `Branding::hasLogo()`/`getLogoUrl()`/`get()` (Etapa 4a),
  `DocumentMeta::getForKnowbaseItem()`/`add()`/`update()` (Etapas 2a/4d),
  `Html::textarea(['enable_richtext' => true])` (Etapa 4d, pendência de
  confirmação em ambiente real já registrada naquela etapa — não reaberta
  aqui). Nenhuma classe ou método novo do núcleo foi introduzido.
- **Keys/parâmetros:** nenhum novo — reaproveita as mesmas chaves de
  `Branding::DEFAULTS` (`header_logo_height`) e os campos já existentes de
  `DocumentMeta` (`header_html`, `footer_text`).
- **Permissões:** inalteradas — nenhum controller novo, nenhuma checagem de
  direito nova.

## Validações realizadas

- **Sintaxe:** PHP não disponível neste ambiente (sem rede para instalar);
  revisão manual linha a linha dos 5 arquivos PHP alterados, com atenção a
  `use`, chaves e parênteses.
- **Fluxo do cabeçalho:** rastreado manualmente
  `Branding::getDefaultHeaderHtml()` → semeado em `newdocument.form.php`
  (criação) e `article.form.php` (edição de documento antigo vazio) →
  salvo em `DocumentMeta.header_html` → lido por `Wiki::articleMeta()` →
  embutido em `print_config` por `article.php` → lido por
  `getPrintConfig()` → priorizado em `buildPageEl()` sobre o logo de canto.
- **Fluxo do rodapé:** `DocumentMeta.footer_text` → `articleMeta()` →
  `print_config` → `cfg.document.footer_text || cfg.brand.footer_text` →
  `resolveMarkers()` (inalterado) → `.cx-page-footer-left`.
- **Regressão no motor de paginação:** `layoutPages()`, `PRINT_CSS`, os 5
  seletores contratuais (`#codexplus-doc`, `.codexplus-doc-title`,
  `.codexplus-doc-meta`, `.codexplus-content`, `#codexplus-pdf`) e o
  cabeçalho/rodapé de canto (documento **sem** `header_html`/`footer_text`
  próprios) não tiveram nenhuma linha de comportamento alterada — só a
  condição que decide qual caminho seguir.
- **Bug latente identificado e corrigido durante a implementação:**
  normalização de `footer_show` dependia só de `cfg.brand.footer_text`;
  corrigida para considerar também `cfg.document.footer_text` (ver item 6
  em "Alterações realizadas").

## Pendências ou riscos

1. **Nada testado no ambiente real** — como sempre, esta etapa só foi
   validada por leitura e revisão manual de código. Testes obrigatórios
   antes de considerar fechada (checklist já vem do documento de escopo da
   Etapa 4e):
   - Documento curto (1 página), médio (3–5) e longo (10+): cabeçalho e
     rodapé repetindo corretamente, `{pagina}`/`{total}` corretos.
   - Documento cujo `header_html` foi editado para conter mais do que a
     imagem semeada (texto adicional, imagem maior) — confirmar que o
     corte por `overflow:hidden` fica visualmente aceitável, e não
     "grudado"/cortado no meio de uma linha de texto.
   - Documento com imagem no corpo **e** `header_html` com imagem — a
     espera de carregamento de imagens (`exportPdf()`) só cobre as imagens
     que já existem no DOM no momento do `iframe.onload`; a imagem do
     cabeçalho é injetada depois, dentro de `buildPageEl()` (mesmo
     comportamento que a logo de canto já tinha desde a Etapa 4c — não é
     regressão, mas fica mais exposto agora que o cabeçalho pode aparecer
     em documentos que antes não tinham logo habilitada). Se a imagem sair
     ausente/cortada no PDF real, é o primeiro lugar a investigar.
   - Documento sem logo configurada em `Branding` — confirmar que
     `getDefaultHeaderHtml()` devolve vazio e o fluxo de criação/edição
     continua funcionando sem cabeçalho, como antes.
2. **`header_html` semeado não é sobrescrito em documentos já existentes**
   que nunca foram abertos para edição — eles só ganham a semente na
   **primeira vez** que alguém abrir `article.form.php`. Documento nunca
   reaberto continua sem cabeçalho no PDF até isso acontecer. Não é bug:
   é a mesma regra "não sobrescrever o que o usuário já tem" aplicada ao
   caso "nunca teve".
3. **Não há como distinguir, no banco, "nunca teve cabeçalho" de
   "usuário apagou de propósito"** — os dois casos resultam em
   `header_html` vazio, e ambos recebem a semente da logo ao reabrir a
   edição. Se algum documento precisar ficar deliberadamente sem
   cabeçalho, isso não é possível hoje sem reintroduzir a semente a cada
   edição reaberta. Registrado como limitação conhecida, não bloqueia esta
   etapa (não fazia parte do pedido).
