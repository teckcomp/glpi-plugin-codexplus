# Etapa 4c — motor de paginação e a marca no PDF

## Objetivo

Fazer a exportação de PDF (pelo navegador, client-side, desde a Etapa 1)
parar de ser um documento único e comprido e passar a ser um PDF **paginado
de verdade**: folhas A4 discretas, com o logo da empresa repetido no
cabeçalho de cada página, rodapé com o texto livre configurado (marcadores
resolvidos) e paginação `N / total`, sem partir um bloco de passo (`.cx-step`)
ou uma tabela no meio.

Esta era a próxima etapa apontada no `docs/ROADMAP.md` (seção "▶ Etapa 4c"),
com aceite definido como: exportar uma proposta e obter um PDF com logo em
todas as páginas, rodapé correto e paginação coerente.

## Contexto analisado

Antes de tocar em qualquer arquivo, foram lidos, nesta ordem (conforme
`README.md` manda):

- `docs/CONTEXTO.md` — arquitetura, os achados técnicos do GLPI 11.0.6
  (itens 1–16) e o **contrato de código** da seção 6 (os cinco seletores do
  PDF, que não podem mudar de nome).
- `docs/ROADMAP.md` — confirmação de que 4c é a próxima etapa, com o formato
  já fechado do JSON de `#codexplus-print-config` (entregue na Etapa 4b) e o
  critério de aceite.
- `docs/REFERENCIAS.md` — limitações de navegador que já haviam sido
  mapeadas (Chrome não suporta caixas de margem do `@page` nem
  `counter(page)`; `position: fixed` errático na impressão; `loading="lazy"`
  quebra imagem fora do viewport) e o layout do PDF aprovado em mockup
  (07/2026): logo no canto superior direito em todas as páginas, título em
  caixa alta, rodapé com código+revisão à esquerda e paginação à direita.
- `docs/DEPLOY.md` — regra de que mudança em `setup.php` (versão) exige o
  bloco completo de deploy (`plugin:install` + `plugin:activate` +
  `cache:clear`).

Arquivos de código lidos e mapeados antes de qualquer edição:

| Arquivo | Por que foi lido |
|---|---|
| `public/js/codexplus.js` | É o único arquivo que a 4c deveria tocar (contrato da seção 6 do CONTEXTO.md). Precisava entender a função `exportPdf()`, a espera de carregamento de imagens e a `PRINT_CSS` existente antes de estender qualquer coisa. |
| `templates/article.html.twig` | Confirmar os cinco seletores (`#codexplus-doc`, `.codexplus-doc-title`, `.codexplus-doc-meta`, `.codexplus-content`, `#codexplus-pdf`) e a tag `#codexplus-print-config` da Etapa 4b — para não duplicar nem redefinir nada que já existe no Twig. |
| `front/article.php` | Confirmar a forma exata do JSON que a 4b já entrega (`brand.*`, `document.*`) — chaves e tipos, para o JS consumir sem inventar formato. |
| `src/Branding.php` | Confirmar os valores possíveis de cada chave de marca (`DEFAULTS`, `getLogoPositions()`, `getMarkers()`) e as regras de normalização já aplicadas no PHP (altura do logo entre 6–30 mm, posição só `left`/`right`), para não reimplementar validação divergente no JS. |
| `src/DocumentMeta.php` | Confirmar que o código do documento é derivado (`getCode()`) e onde `revision`/`client_name` vêm de — usados nos marcadores do rodapé. |
| `public/css/codexplus.css` | Levantar as seções já numeradas (1–13) e confirmar que **nenhuma** delas precisava mudar — o CSS de impressão sempre foi mantido à parte, dentro do próprio `codexplus.js` (padrão já existente desde a Etapa 1, preservado aqui). |
| `templates/config.html.twig` | Confirmar que a tela de configuração de marca (4a) já expõe tudo que a 4c precisa consumir (logo, posição, altura, toggles, texto do rodapé, marcadores) — nenhuma tela nova era necessária. |

Conclusão da análise: a Etapa 4c é **só front-end**. Não há necessidade de
nova tabela, nova rota, novo hook ou nova tela — o roadmap já havia
identificado isso ("o único arquivo que muda é `public/js/codexplus.js`").

## Alterações realizadas

Todas dentro de `public/js/codexplus.js` (arquivo único, reescrito de forma
incremental sobre o que já existia — nenhuma função da Etapa 1 foi removida,
só estendida):

1. **Leitura defensiva da configuração** — `getPrintConfig()`: lê
   `#codexplus-print-config`, com `try/catch` no `JSON.parse` e padrões
   seguros (sem logo, sem rodapé) se a tag não existir ou o JSON vier
   inválido. Normaliza valores (`show_logo` só é `true` se também houver
   `logo_url`; `logo_pos` só aceita `left`/`right`; `logo_mm` é fixado entre
   6 e 30).
2. **Geometria de página** — `computeGeometry()`: deriva, a partir da
   configuração, a altura reservada para cabeçalho (logo) e rodapé, e a
   altura útil de conteúdo por página (`contentH`), em cima da folha A4 a
   96dpi (794×1123 px) já usada desde a Etapa 1.
3. **CSS dependente de configuração** — `buildPageCss()`: gera as regras de
   `.cx-page`, `.cx-page-header`, `.cx-page-content` e `.cx-page-footer` com
   os valores calculados. Substitui o antigo `@page{margin:18mm 16mm}` por
   `@page{margin:0}` — a margem passa a ser desenhada à mão dentro de cada
   `.cx-page`, para poder colocar logo e rodapé dentro dela.
4. **Resolução de marcadores** — `resolveMarkers()` e `formatDate()`:
   resolvem `{codigo}`, `{revisao}`, `{titulo}`, `{empresa}`, `{data}`,
   `{pagina}`, `{total}` no texto livre do rodapé, com o mesmo conjunto de
   marcadores documentado em `Branding::getMarkers()`. Token desconhecido é
   devolvido como veio, sem quebrar o texto.
5. **Motor de paginação** — `layoutPages()`: mede a altura de cada filho
   direto de `#cx-stage` (cada um tratado como bloco atômico — nunca
   partido no meio) e os distribui em folhas `.cx-page`, respeitando
   `contentH`. Título e metadados entram agrupados em `.cx-heading`, um
   único bloco, para nunca se separarem entre páginas.
6. **Montagem de cada folha** — `buildPageEl()`: desenha o cabeçalho (logo,
   condicionado a `repeat_logo` a partir da 2ª página), o conteúdo da
   página e o rodapé (texto resolvido + paginação `N / total`, se
   `footer_pages` estiver ligado).
7. **Ordem de execução ajustada em `exportPdf()`**: a paginação só acontece
   dentro de `doPrint()`, **depois** que todas as imagens já carregaram —
   mover nós já carregados de lugar no DOM não os recarrega, então a
   paginação não reintroduz o problema do `loading="lazy"` que a Etapa 1 já
   havia resolvido.
8. **Ajuste de escopo do contador CSS**: `counter-reset: cx-step` saiu de
   `.codexplus-content` e foi para `body`, porque os blocos `.cx-step`
   agora ficam espalhados entre várias `.cx-page` — o contador precisa de
   um ancestro comum a todas elas.

Nenhuma função, seletor ou comportamento da Etapa 1 foi removido: a espera
de imagens (`pending`/`remaining`/timeout de 8s), o clone com
`loading="eager"`, a montagem de metadados item a item e o contrato dos
cinco seletores continuam exatamente como estavam.

## Arquivos modificados

- `public/js/codexplus.js` (único arquivo de código alterado, conforme o
  próprio roadmap já previa)
- `setup.php` — versão `0.5.2-alpha` → `0.5.3-alpha`
- `docs/ROADMAP.md` — Etapa 4c movida de "próxima" para "concluído"; nota da
  Etapa 5 atualizada (dependência da 4c agora satisfeita)
- `docs/CONTEXTO.md` — novo achado técnico (item 17) documentando as três
  decisões de design do motor de paginação que não são bugs
- `README.md` — estado do projeto e bullet de exportação em PDF atualizados

## Compatibilidade GLPI 11.0.6

- **Hooks:** nenhum hook novo. `ADD_JAVASCRIPT`/`ADD_CSS` já registrados no
  `setup.php` desde a Etapa 0 continuam servindo o mesmo arquivo, sem
  mudança de caminho (`public/js/codexplus.js`, servido pelo roteador de
  `plugins/codexplus/public/`).
- **Classes/métodos:** nenhuma classe PHP tocada. O JS só lê dados que o PHP
  (`front/article.php`, Etapa 4b) já entrega prontos em
  `#codexplus-print-config`; não há chamada nova a nenhum método do núcleo.
- **Twig:** nenhum template tocado. `templates/article.html.twig` continua
  emitindo exatamente os mesmos seis elementos (cinco do contrato original +
  a tag JSON da 4b) que este arquivo já esperava.
- **Permissões:** inalteradas — a exportação continua acontecendo
  inteiramente no navegador, sobre um artigo que o usuário já teve
  permissão de ver na tela de leitura (`Session::checkRight` em
  `front/article.php`, Etapa 1). Nenhuma nova rota, nenhum novo endpoint.
- **Chaves/parâmetros:** as chaves lidas de `#codexplus-print-config`
  (`brand.company`, `brand.logo_url`, `brand.show_logo`,
  `brand.repeat_logo`, `brand.logo_pos`, `brand.logo_mm`,
  `brand.title_upper`, `brand.footer_show`, `brand.footer_text`,
  `brand.footer_pages`, `document.title`, `document.code`,
  `document.revision`, `document.client`, `document.date_mod`) foram
  conferidas uma a uma contra `front/article.php` e `src/Branding.php`
  antes do uso — nenhuma foi assumida.
- **JS puro / navegador:** todas as APIs usadas (`JSON.parse`,
  `getBoundingClientRect`, `createElement`, `createDocumentFragment`,
  `cloneNode`, `querySelectorAll`) são padrão e já eram usadas (ou têm
  equivalente direto) no arquivo original da Etapa 1 — nenhuma dependência
  nova, nenhuma biblioteca externa.

## Validações realizadas

- **Sintaxe:** `node --check public/js/codexplus.js` — sem erros, antes e
  depois de copiar para dentro do pacote do plugin.
- **Fluxo da funcionalidade:** revisão manual da ordem de execução —
  configuração lida → geometria calculada → HTML "achatado" montado →
  iframe carregado → espera de imagens (inalterada da Etapa 1) → paginação
  → impressão. Confirmado que a paginação só roda depois das imagens
  prontas, para não reabrir o problema do `loading="lazy"`.
- **Integração com código existente:** os cinco seletores do contrato
  (`#codexplus-doc`, `.codexplus-doc-title`, `.codexplus-doc-meta`,
  `.codexplus-content`, `#codexplus-pdf`) permanecem exatamente com os
  mesmos nomes e mesmo uso — `templates/article.html.twig` não precisou de
  nenhuma alteração. Conferido bloco a bloco contra `docs/CONTEXTO.md`
  seção 6.
- **Compatibilidade:** nenhuma API do núcleo do GLPI foi usada neste
  arquivo (é puro JS de navegador), então os achados técnicos do GLPI
  11.0.6 (seção 5 do CONTEXTO.md) que dizem respeito a PHP/SQL/Twig não se
  aplicam a esta etapa. Os achados que **de fato** se aplicavam (`@page`
  sem suporte a caixas de margem, `loading="lazy"`, `position: fixed`
  errático) foram todos respeitados no desenho da solução.
- **Segurança/XSS:** o texto do rodapé (`footer_text`, texto livre
  configurado pelo administrador) é inserido no DOM via `textContent`, não
  via `innerHTML` — não há injeção de HTML possível através dele, mesmo que
  contenha caracteres especiais. O título do documento continua escapado do
  mesmo jeito que já era na Etapa 1 (`replace(/</g, '&lt;')` antes de entrar
  na string do HTML).

## Pendências ou riscos

- **Bloco isolado maior que uma página inteira** (uma tabela muito longa ou
  uma imagem enorme) ainda vai sozinho para sua própria página e pode
  transbordar visualmente para a folha seguinte — documentado em
  `docs/CONTEXTO.md`, achado 17. Não é esperado em documento comum (POP,
  manual, proposta), mas vale um teste dedicado com uma tabela grande antes
  de liberar para uso real.
- **Teste em servidor ainda não realizado.** Este ambiente de trabalho não
  tem acesso ao servidor de homologação (`192.168.1.50`) nem a um
  navegador real para gerar um PDF de fato. A validação feita aqui foi
  sintática e de fluxo lógico — falta o teste do critério de aceite do
  roadmap ("exportar uma proposta e obter um PDF com logo em todas as
  páginas, rodapé correto e paginação coerente"), a ser feito após o
  deploy, seguindo `docs/DEPLOY.md`.
- **Deploy:** como `setup.php` mudou de versão, o deploy desta etapa precisa
  do bloco completo (`plugin:install` → `plugin:activate` →
  `cache:clear` → `plugin:list | grep` para conferir), mesmo sem mudança de
  schema — é a regra do próprio `docs/DEPLOY.md`.
- **Etapa 3c** (modelos de verdade) já pode começar — dependia de ver como
  as seções caem no PDF real, o que a 4c agora entrega.
- **Etapa 5** (PSG e seus POPs) também está destravada na parte de
  paginação: o PDF composto poderá reusar `layoutPages()` chamando-a uma
  vez por documento vinculado dentro do mesmo `#cx-stage`, mas isso ainda
  não foi implementado — é trabalho da própria Etapa 5.
