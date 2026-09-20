# Etapa 4f — Cabeçalho estruturado (título + logo + dados automáticos)

## Objetivo

Transformar o cabeçalho do documento, hoje rich text livre (TinyMCE,
Etapas 4d/4e), em 3 áreas fixas e controladas pelo sistema:

1. **Logo** — slot único, clique-para-enviar/trocar, proporção preservada
2. **Título** — o MESMO campo `name` do documento, só reposicionado
   visualmente dentro do cabeçalho (nunca um segundo campo)
3. **Dados automáticos** (código · revisão · data) — fixo, não editável

O corpo do documento (TinyMCE) e o rodapé (texto simples com marcadores)
não mudam de mecanismo — só o cabeçalho.

## Contexto analisado

Antes de qualquer alteração:

- `docs/CONTEXTO.md`, `docs/ROADMAP.md`
- `front/article.form.php` e `templates/article-edit.html.twig` **inteiros**
  — onde o campo Título é hoje renderizado (linha própria, fora do
  cabeçalho) e onde o cabeçalho era editado (TinyMCE livre, Etapa 4d/4e)
- `src/Branding.php` **inteiro** — confirmado `getMarkers()` (linha 79,
  já existia, usado hoje só para a legenda da tela de config), o
  mecanismo de logo (`hasLogo()`/`getLogoUrl()`/`storeLogo()`, upload
  validado, `config` UPDATE) e `getDefaultHeaderHtml()` (Etapa 4e, semente)
- `front/config.form.php` — padrão de upload de logo já em produção
- `public/js/codexplus.js` **inteiro** — confirmado `resolveMarkers()`
  (linha 312) e `formatDate()` (linha 303), e a geometria de página
  (`computeGeometry()`) que reserva altura fixa para o cabeçalho
- `src/DocumentMeta.php` — `getCode()` já existia (código **com** sufixo
  de revisão, ex. `POP0014:01`) — mas o exemplo do usuário para a Área 3
  ("POP0014 · rev. 01") queria o código **sem** o sufixo, com a revisão
  ao lado — confirmado como uma inconsistência real entre o exemplo
  documentado em `Branding::getMarkers()` (`{codigo}` = "ex.: POP0014",
  sem sufixo) e o que `getCode()` de fato devolve. Resolvido criando
  `getBareCode()` só para este uso novo — **sem alterar** `getCode()` nem
  o rodapé existente (fora do escopo deste pedido)
- Ambiguidade do diagnóstico do pedido ("título duplicado"): não existe
  estruturalmente — hoje há um único campo `name`; a duplicidade aparente
  vem de o cabeçalho ser rich text livre, onde alguém pode ter digitado um
  título dentro da caixa. Resolvido pela própria mudança (cabeçalho deixa
  de aceitar texto livre)

**Decisões alinhadas com o usuário antes de codificar** (three rounds:
documento de escopo → captura de tela anotada → resposta objetiva):

1. Logo do slot = a MESMA logo global (`Branding`), não um campo de imagem
   por documento — evita um segundo mecanismo de armazenamento
2. Upload pelo slot continua exigindo direito `config` (UPDATE) — mesmo
   direito de hoje. Quem só edita documentos vê a logo, não troca
3. `header_html` deixa de ser editável; conteúdo livre já existente nele
   (de testes na Etapa 4e) é substituído na próxima gravação
4. Layout confirmado por captura de tela: linha 1 = título (esquerda) +
   logo (direita); linha 2 = dados automáticos
5. Conteúdo da Área 3: **código + revisão + data**
   (ex.: `POP0014 · rev. 01 · 12/09/2026`)

## Alterações realizadas

1. **`src/DocumentMeta.php`** — novo método `getBareCode()`, ao lado de
   `getCode()`: código sem o sufixo `:NN` de revisão, só para a Área 3
   (evita "POP0014:01 · rev. 01" duplicado). `getCode()` não foi tocado —
   continua igual, para quem já usa `{codigo}` no rodapé.
2. **`src/Branding.php`** — `getDefaultHeaderHtml()` (Etapa 4e) removido
   e substituído por duas funções:
   - `composeArea3(bareCode, revision2, dateStr)`: fonte única do texto da
     linha 2, reaproveitada pela prévia (GET) e pela gravação final (POST)
   - `composeHeaderHtml(title, bareCode, revision2, dateStr)`: monta as
     duas linhas (`cx-header-row-1` com título+logo, `cx-header-row-2` com
     a Área 3), reaproveitando `hasLogo()`/`getLogoUrl()`/
     `header_logo_height` — nada de mecanismo de imagem novo
3. **`front/header-logo.form.php`** (novo, mínimo) — upload da logo pelo
   slot da tela de edição. Chama `Branding::storeLogo()` (Etapa 4a,
   reaproveitado, zero validação duplicada); só existe como arquivo à
   parte porque o redirecionamento é diferente do de
   `front/config.form.php` (volta para o documento, não para a config) —
   ver nota de risco abaixo sobre por que não foi só uma reconfiguração do
   redirecionamento em `config.form.php`.
4. **`front/article.form.php`** —
   - GET: removida a caixa `Html::textarea()` de cabeçalho por completo.
     Novo: `can_manage_logo` (`Session::haveRight('config', UPDATE)`),
     `logo_url` e `header_preview_line2` (via `Branding::composeArea3()`,
     só para prévia — usa a data de HOJE, pode não bater com a data que
     será gravada se o documento for salvo em outro dia)
   - POST: `header_html` deixou de vir de `$_POST` — é sempre recomposto
     via `Branding::composeHeaderHtml()`, usando o título recém-salvo +
     `DocumentMeta::getBareCode()`/`revision` já existentes + data de hoje
5. **`front/newdocument.form.php`** — `header_html` composto **depois** do
   `DocumentMeta::add()` (não dentro do array de criação), porque
   `getBareCode()` depende do `sequence` que só existe depois do insert —
   um `update()` imediato faz a segunda gravação
6. **`templates/article-edit.html.twig`** — reestruturado:
   - Removida a linha "Título" isolada (fora do cabeçalho)
   - Cabeçalho vira `.codexplus-header-preview` com 2 linhas: linha 1 =
     `<input name="name">` (mesmo campo de sempre) + slot de logo; linha 2
     = `{{ header_preview_line2 }}` (texto simples, sem `|raw` —
     autoescapado pelo Twig, correto: é texto, não HTML)
   - Slot de logo: `<label>` clicável só quando `can_manage_logo`,
     apontando (via `for`) para um `<input type="file" hidden>` que fica
     num `<form>` **separado**, fora do formulário principal — necessário
     porque HTML não permite `<form>` aninhado; o `onchange` do arquivo
     dispara `this.form.submit()` (só o mini-formulário, não o documento
     inteiro)
   - Rodapé: sem mudança de mecanismo (já era texto simples, fora do
     corpo — só a dica de texto já tinha sido corrigida na 4e)
7. **`public/css/codexplus.css`** (seção 12) — removidas as classes que
   deixaram de existir (`.codexplus-doc-edit-title`,
   `.codexplus-doc-title-input`); adicionadas as do novo cabeçalho:
   `.codexplus-header-preview`, `.codexplus-header-row(-1/-2)`,
   `.codexplus-header-title-input`, `.codexplus-header-logo-slot`,
   `.codexplus-logo-slot-clickable`/`-static`/`-empty`
8. **`public/js/codexplus.js`** — 3 mudanças, todas em geometria/CSS do
   PDF, NENHUMA em `buildPageEl()` (o `innerHTML` de `cfg.document.header_html`
   já funcionava para qualquer HTML, estruturado ou não):
   - Nova constante `AREA3_H` (16px)
   - `computeGeometry()`: novo campo `headerBoxH` — a caixa do cabeçalho
     passa a reservar `logoPx + AREA3_H` quando há `header_html` (2
     linhas), continua só `logoPx` no fallback de logo de canto (1 linha,
     Etapa 4c, inalterado). **Bug pego e corrigido durante a
     implementação**: sem isso, a linha 2 (Área 3) seria cortada pelo
     `overflow:hidden` da caixa, porque a caixa usava a mesma altura da
     logo sozinha
   - `buildPageCss()`: `.cx-page-header` passa a usar `geo.headerBoxH` (não
     `geo.logoPx`); variante `--doc` reescrita para as classes
     `cx-header-row(-1/-2)`/`cx-header-title`/`cx-header-logo` (rich text
     livre da 4e não existe mais)
   - Comentário de contrato no topo do arquivo atualizado (a seção
     "CABEÇALHO/RODAPÉ POR DOCUMENTO" descrevia o modelo de texto livre da
     4e; passou a descrever o modelo estruturado)
9. **`setup.php`** — versão `0.5.5-alpha` → `0.5.6-alpha`
10. **`docs/ROADMAP.md`**, **`docs/CONTEXTO.md`** — atualizados

## Arquivos modificados

- `src/DocumentMeta.php`
- `src/Branding.php`
- `front/article.form.php`
- `front/newdocument.form.php`
- `templates/article-edit.html.twig`
- `public/css/codexplus.css`
- `public/js/codexplus.js`
- `setup.php`
- `docs/ROADMAP.md`
- `docs/CONTEXTO.md`

## Arquivos criados

- `front/header-logo.form.php`
- `docs/etapas/ETAPA-4f.md` (este arquivo)

`front/article.php`, `src/Wiki.php`, `src/DocumentMeta.php` (fora de
`getBareCode()`), `src/Install.php` e o rodapé (mecanismo inteiro) **não
foram tocados** — nenhuma coluna nova, nenhuma migração necessária.

## Compatibilidade GLPI 11.0.6

- **Hooks:** nenhum hook novo.
- **Classes/métodos usados:** `Session::checkRight()` (já usado em todo o
  plugin); `Session::haveRight('config', UPDATE)` — **usado pela primeira
  vez neste plugin** (as outras telas usam só `checkRight`, que redireciona
  em vez de devolver booleano); não foi possível confirmar a assinatura no
  código-fonte do GLPI 11.0.6 nesta análise (arquivo não disponível) — é a
  API padrão e documentada do núcleo para checagem condicional de direito
  sem redirecionar, mas fica registrado como pendência de confirmação, no
  mesmo espírito de outras pendências já registradas neste projeto
  (`Html::textarea()`, Etapa 4d).
- `Html::redirect()`, `Session::addMessageAfterRedirect()` — já usados em
  `front/config.form.php`, reaproveitados sem mudança de assinatura.
- **Keys/parâmetros:** nenhum novo — reaproveita `header_logo_height`
  (`Branding::DEFAULTS`) e os campos já existentes de `DocumentMeta`.
- **Permissões:** upload da logo continua exigindo `config` UPDATE — sem
  mudança na regra, só um segundo ponto de entrada (`front/header-logo.form.php`)
  que checa o mesmo direito antes de fazer qualquer coisa.

## Validações realizadas

- **Sintaxe:** PHP não disponível neste ambiente; revisão manual, com
  contagem de chaves balanceada nos 6 arquivos PHP tocados/criados.
- **Fluxo do cabeçalho na edição:** título (`name`) e logo (`Branding`)
  sempre foram dados já existentes — só a exibição mudou de lugar. Área 3
  rastreada: `DocumentMeta::getBareCode()`/`fields['revision']` →
  `Branding::composeArea3()` → prévia (GET, data de hoje) e valor final
  (POST, também data de hoje — sempre a data do próprio salvamento).
- **Fluxo do cabeçalho no PDF:** `Branding::composeHeaderHtml()` → coluna
  `header_html` → `Wiki::articleMeta()` (Etapa 4e, inalterado) →
  `print_config.document.header_html` (`front/article.php`, inalterado) →
  `cfg.document.header_html` → `buildPageEl()` → `innerHTML` de
  `.cx-page-header--doc` → CSS de `buildPageCss()` (novo, `cx-header-*`).
- **Geometria:** confirmado que `.cx-page-header` (caixa) e
  `.cx-page{padding}` (reserva na página) agora usam `headerBoxH` — maior
  que antes só quando há `header_html`; caminho de logo de canto (sem
  `header_html`) continua com a mesma altura de antes (`logoPx`), sem
  regressão.
- **Rodapé:** nenhuma linha alterada — mecanismo inteiro da Etapa 4e
  preservado.

## Pendências ou riscos

1. **Nada testado no ambiente real** — como sempre. Checklist mínimo antes
   de fechar:
   - `Session::haveRight('config', UPDATE)` de fato devolve booleano sem
     redirecionar, no GLPI 11.0.6 — é o único método novo usado neste
     plugin que não foi possível validar contra o código-fonte
   - Slot de logo: clicar, escolher um PNG, confirmar que volta para a
     tela de edição do MESMO documento (não para Configurar → Codex+) e
     que a logo aparece atualizada em todo lugar (não só neste documento —
     é global)
   - Usuário sem direito `config`: confirmar que o slot aparece como
     imagem estática, sem `<label>` clicável
   - Salvar um documento e exportar o PDF: título, logo e
     código·revisão·data aparecendo nas duas linhas do cabeçalho, em todas
     as páginas, sem corte visual da linha 2
   - Documento comprido (10+ páginas): cabeçalho de 2 linhas repetindo
     certo em todas
   - Documento sem tipo classificado ainda (`has_meta` falso): Área 3 cai
     para só a data — confirmar que não aparece nada quebrado
     (`bareCode` vazio, sem `· rev. ·` solto)
2. **Trade-off aceito, não corrigido:** trocar a logo pelo slot recarrega
   a página inteira (é um upload de arquivo via formulário real, sem
   AJAX — decisão consciente, "não introduza bibliotecas externas sem
   necessidade"). Qualquer alteração não salva no título ou no corpo até
   aquele momento é perdida. Não há como evitar isso sem JS de upload
   assíncrono, fora do escopo pedido.
3. **`front/header-logo.form.php` existe só por causa de uma incerteza
   sobre `Html::back()`** (não confirmado se resolve por HTTP referer de
   forma confiável) — se isso for confirmado como seguro no ambiente real,
   dá para simplificar reaproveitando `front/config.form.php` diretamente
   (aceitando um parâmetro de retorno), eliminando o arquivo novo. Fica
   registrado como possível simplificação futura, não urgente.
4. **`getCode()` (com sufixo de revisão) e `{codigo}` do rodapé continuam
   com a mesma limitação de antes** (não corrigida aqui, fora do escopo):
   o rodapé's `{codigo}` retorna `POP0014:01`, então um texto de rodapé
   como `{codigo} · rev. {revisao}` sai como `POP0014:01 · rev. 01`
   (revisão repetida). A Área 3 nova usa `getBareCode()` e não tem esse
   problema. Se quiser, dá para alinhar o rodapé depois — pedido novo.
