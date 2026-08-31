# Etapa 4d — Edição embutida: cabeçalho, rodapé por documento e moldura A4

## Objetivo

Tirar o botão "Editar" da tela de leitura do redirecionamento para a ficha
nativa do GLPI (`front/knowbaseitem.form.php`) e trazer a edição para dentro
do Codex+ (`front/article.php` / novo `front/article.form.php`), preservando
o TinyMCE nativo (sem reimplementar editor). Acrescenta dois campos novos,
editáveis por documento: **cabeçalho** (rich text, TinyMCE) e **rodapé**
(texto simples com marcadores). Aplica também uma moldura de "folha" (A4) na
tela de leitura, que já é tela própria do plugin.

Escopo explicitamente **fora** desta etapa (alinhado em conversa antes de
codificar, ver seção "Pendências"): a exportação em PDF (`public/js/codexplus.js`)
não foi tocada — cabeçalho/rodapé por documento ainda não aparecem no PDF.
Categoria, FAQ e anexos continuam só na ficha nativa.

## Contexto analisado

Antes de qualquer alteração, foram lidos:

- `docs/CONTEXTO.md` e `docs/ROADMAP.md` — arquitetura e decisões registradas
- `front/article.php`, `templates/article.html.twig`, `src/Wiki.php` — fluxo
  de leitura e o formato do artigo já montado por `Wiki::getArticle()`
- `front/newdocument.form.php`, `front/documentmeta.form.php` — os dois
  padrões já existentes de controller que grava no GLPI nativo e/ou na
  tabela satélite, usados como referência para o novo controller
- `src/DocumentMeta.php`, `src/Install.php` — schema da tabela satélite e o
  padrão de migração idempotente já em uso
- `src/Branding.php` — como cabeçalho/rodapé **globais** já funcionam hoje
  (posição de logo, `footer_text` com marcadores), para não duplicar a
  sintaxe de marcadores com um padrão diferente
- `public/js/codexplus.js` — o motor de paginação do PDF (Etapa 4c) e o
  contrato `#codexplus-print-config`, para confirmar que esta etapa não
  precisa (e não deve) alterá-lo
- `public/css/codexplus.css` — tokens (`--cx-`) e o aviso explícito de que
  `#codexplus-doc`, `.codexplus-doc-title`, `.codexplus-doc-meta`,
  `.codexplus-content` e `#codexplus-pdf` são contrato com o JS do PDF

**Conflito identificado e alinhado antes de codificar:** o pedido original
("editor Word-like completo") colidia com a decisão já registrada em
`CONTEXTO.md` §2 ("Editor Markdown — o TinyMCE nativo atende") e com o
histórico de abandono do reskin sobre telas nativas (§4). Foi alinhado com o
usuário, em conversa, manter o TinyMCE nativo (via `Html::textarea([...,
'enable_richtext' => true])`) em vez de construir um editor próprio — e
aplicar a moldura A4 só na tela de leitura (própria do plugin), não na
edição nativa.

**Validação técnica feita antes de codificar:**

- Busca confirmando que `Html::textarea(['enable_richtext' => true, ...])`
  é o helper nativo real usado por outros plugins GLPI (ex.: formcreator)
  para embutir o TinyMCE em telas próprias — não é suposição.
- Tentativa de ler o código-fonte de `front/knowbaseitem.form.php` (núcleo
  do GLPI) para confirmar se seria seguro fazer POST direto para lá. Não foi
  possível obter o arquivo exato. Decisão tomada com essa limitação
  registrada: em vez de apostar no contrato não verificado desse arquivo
  nativo, o novo controller chama `KnowbaseItem::update()` diretamente — o
  mesmo método público que o controller nativo chama por baixo — dando
  controle total do redirecionamento de volta para `article.php`.

## Alterações realizadas

1. **Banco de dados** — duas colunas novas em `glpi_plugin_codexplus_documents`,
   via migração idempotente (`Migration::addField`, que já verifica
   `fieldExists` internamente):
   - `header_html` (`longtext`, aceita `NULL`) — cabeçalho rich text
   - `footer_text` (`longtext`, aceita `NULL`) — rodapé em texto com marcadores
2. **Novo controller `front/article.form.php`** — GET mostra o formulário de
   edição; POST (`update`) grava via `KnowbaseItem::update()` (nativo) +
   upsert em `DocumentMeta` (mesmo padrão de `documentmeta.form.php`) e
   redireciona para `article.php?id=X`. Não reimplementa TinyMCE: usa
   `Html::textarea(['enable_richtext' => true])` duas vezes (corpo e
   cabeçalho), com `editor_id` distintos para não colidir.
3. **Novo template `templates/article-edit.html.twig`** — título, zona de
   cabeçalho (TinyMCE), zona de corpo (TinyMCE), zona de rodapé (textarea
   simples com dica dos marcadores), dentro de uma moldura de folha
   (`.codexplus-doc-edit`, seletor **separado** de `#codexplus-doc` de
   propósito — não é lido pelo motor de PDF).
4. **`templates/article.html.twig`** — botão "Editar" passa a apontar para
   `article.form.php` (dentro do plugin); novo botão "Ficha nativa" mantém
   acesso a categoria/FAQ/anexos na tela original do GLPI.
5. **`public/css/codexplus.css`** — `.codexplus-doc` (leitura) ganhou
   centralização e sombra sutil de "papel" (moldura A4), sem fixar largura
   exata em pixel de A4 (isso encolheria demais em tela grande — a medida
   exata de página já é feita no PDF, em `codexplus.js`). Nova seção 12
   (`.codexplus-doc-edit*`) com o mesmo visual de folha para a tela de
   edição, usando só os tokens `--cx-` já existentes.
6. **`setup.php`** — versão subida de `0.5.3-alpha` para `0.5.4-alpha`, para
   o GLPI detectar a atualização e rodar a migração numa instância já
   instalada.

## Arquivos modificados

- `src/Install.php`
- `setup.php`
- `templates/article.html.twig`
- `public/css/codexplus.css`
- `docs/ROADMAP.md`
- `docs/CONTEXTO.md`

## Arquivos criados

- `front/article.form.php`
- `templates/article-edit.html.twig`
- `docs/etapas/ETAPA-4d.md` (este arquivo)

## Compatibilidade GLPI 11.0.6

- **Hooks:** nenhum hook novo. Reaproveita `Plugin::registerClass(DocumentMeta::class, ['addtabon' => 'KnowbaseItem'])` já existente.
- **Classes/métodos usados:**
  - `KnowbaseItem::getFromDB()`, `::canUpdateItem()`, `::update()` — já usados hoje em `front/newdocument.form.php` (o `add()` irmão de `update()`) e na leitura (`Wiki::getArticle()`), portanto validados neste mesmo código-fonte.
  - `KnowbaseItemTranslation::getTranslatedValue($kb, 'name')` — já usado hoje em `Wiki::getArticle()`. O uso novo com `'answer'` segue o mesmo padrão; a tabela nativa de tradução tem colunas `name` e `answer` (confirmado por busca ao código nativo do `KnowbaseItem`).
  - `Html::textarea(['enable_richtext' => true, ...])` — confirmado por busca externa como padrão real de outros plugins GLPI, não pôde ser lido diretamente no núcleo desta instância. **Ver pendência abaixo.**
  - `Migration::addField()` — mesmo padrão já usado implicitamente pela convenção do projeto (`addRight` já em uso); `addField` é o par idiomático para colunas, idempotente por design.
  - `DocumentMeta::add()` / `::update()` / `::getFromDBByCrit()` — já em uso idêntico em `front/documentmeta.form.php`.
- **Keys/parâmetros necessários:** `_glpi_csrf_token` embutido no formulário (mesmo padrão da aba nativa, `Session::getNewCSRFToken()`); nenhuma checagem explícita de CSRF no controller, por consistência com `front/newdocument.form.php` e `front/documentmeta.form.php` (nenhum dos dois chama verificação explícita hoje, e ambos estão em produção).
- **Permissões verificadas:** `Session::checkRight('plugin_codexplus_wiki', READ)` (acesso ao plugin) + `KnowbaseItem::canUpdateItem()` (o mesmo requisito que a ficha nativa exige para editar) antes de mostrar ou processar o formulário.

## Validações realizadas

- **Sintaxe:** PHP não disponível neste ambiente de análise para `php -l`; revisão manual linha a linha + checagem automatizada de balanceamento de chaves/parênteses em `src/Install.php` e `front/article.form.php` (ambos batendo). Tags Twig (`{{ }}`, `<div>`) conferidas por contagem em `article.html.twig` e `article-edit.html.twig` (todas balanceadas).
- **Fluxo da funcionalidade:** rastreado manualmente GET (mostra formulário com valores atuais) → POST `update` (grava nativo + satélite) → redirecionamento → leitura.
- **Integração com código existente:** `article.form.php` segue exatamente o padrão de permissão e upsert já usado em `documentmeta.form.php`; não duplica lógica.
- **Compatibilidade:** seletores protegidos do contrato de PDF (`#codexplus-doc`, `.codexplus-content` etc.) não foram tocados nem reaproveitados na tela de edição — a edição usa uma classe (`.codexplus-doc-edit`) deliberadamente diferente.
- **Impacto em permissão/segurança:** edição continua exigindo exatamente o mesmo direito que a ficha nativa (`canUpdateItem()`); nenhuma superfície nova de acesso foi aberta.

## Pendências ou riscos

1. **`Html::textarea()` — assinatura não confirmada no código-fonte exato do
   GLPI 11.0.6** (só validada por padrão de uso em outro plugin da
   comunidade). O código já se defende contra os dois comportamentos
   possíveis (ecoar ou retornar), mas **precisa ser testado no ambiente real
   antes de considerar a etapa fechada** — é o maior risco desta entrega.
2. **`front/knowbaseitem.form.php` (núcleo) não foi lido** — a decisão de
   chamar `KnowbaseItem::update()` direto, em vez de fazer POST para esse
   arquivo, contorna essa lacuna, mas vale confirmar em algum momento (não
   bloqueia esta etapa).
3. **Bug conhecido do GLPI 11.0.3** (não confirmado se afeta 11.0.6) sobre o
   editor rich text não habilitar em alguns contextos de plugin — testar a
   ativação do TinyMCE nos dois campos (corpo e cabeçalho) no ambiente real.
4. **Cabeçalho/rodapé por documento ainda não entram no PDF** — registrado
   como etapa futura no `ROADMAP.md` (ver "Etapa 4e"), decisão explícita do
   usuário de não redesenhar `codexplus.js` agora.
5. **Sem preview de cabeçalho/rodapé na tela de leitura** — decisão
   deliberada desta etapa (evitar mostrar algo que ainda não sai no PDF, o
   que confundiria o usuário). Só aparecem na tela de edição.
