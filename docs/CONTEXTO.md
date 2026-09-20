# Codex+ — contexto do projeto

> Documento de entrada. Quem for dar andamento ao plugin deve ler este
> arquivo **antes** de abrir qualquer código.
> Estado: `v0.5.8-alpha` · atualizado em 19/09/2026 (revisão geral após
> auditoria do servidor e do repositório; pacote 0.5.8).

---

## 1. O que é

Plugin de **gestão documental dentro do GLPI 11.0.6**. Serve como wiki, base
de conhecimento e ferramenta de produção de documentos controlados, com
exportação em PDF com a marca da empresa.

Quatro tipos de documento:

| Sigla | Nome | Vence? | Observação |
|---|---|---|---|
| `POP` | Procedimento Operacional Padrão | sim | |
| `PSG` | Procedimento do Sistema de Gestão | sim | Regimento de setor que **associa POPs** |
| `MAN` | Manual | sim | Manual técnico / de uso |
| `PRP` | Proposta | **não** | Escopo comercial para cliente. Entregável, não conhecimento |

**Tipo não é categoria.** São dois eixos independentes: um POP de Redes e um
Manual de Redes vivem na mesma categoria. A estante filtra por tipo primeiro,
depois por categoria.

**Decisão de 08/2026:** *todos* os documentos passam a ser **produzidos dentro
do Codex+** — inclusive manuais e propostas —, com upload de material
adicional quando necessário. Isso promove o editor e a qualidade do PDF de
"desejável" a requisito.

**Decisão de 09/2026:** o Codex+ ganha um módulo de **diagramas
institucionais** (organogramas, fluxogramas, matrizes de escalonamento e
RACI), como mais um tipo de documento (`DIA`). Requisitos: visível a toda a
instituição de forma fácil e rápida, criação intuitiva para não técnicos e
resultado final sem perda em relação ao protótipo aprovado. Detalhes na
Etapa 9 do `ROADMAP.md`.

**Decisão de 19/09/2026 — independência da Base de Conhecimento.** Os
documentos do Codex+ deixam de ser artigos nativos (`glpi_knowbaseitems`) e
passam a ser um objeto próprio. Motivo: permissões (duas matrizes
conflitantes), setor acima da categoria, acesso anônimo (imagens e anexos
nativos só saem com login) e histórico esbarravam todos na base nativa.
Hora certa: nada em produção e só 5 documentos de teste. Detalhes na seção
3.1 e na Etapa R do `ROADMAP.md`.

---

## 2. Escopo — o que está fora, e por quê

Registrado para não voltar à discussão sem motivo novo. **Não implemente nada
desta tabela sem alinhar antes.**

| Item | Por que não |
|---|---|
| Fluxo de aprovação multi-etapa | Não há intenção de certificar ISO 9001; autor e aprovador são a mesma pessoa |
| Caixa de tarefas pendentes | Só faz sentido com várias pessoas no fluxo |
| Trilha de auditoria para auditor externo | O histórico nativo do GLPI já registra alterações. O histórico de revisão com resumo (Etapa R6) é do documento, não aparato de auditoria |
| Permissão separada de ver / imprimir / baixar | O GLPI já controla visibilidade por perfil, grupo e entidade |
| Editor Markdown | O TinyMCE nativo atende |
| Hierarquia livro → capítulo → página | Categoria → subcategoria resolve; o PSG cobre o agrupamento por setor |
| PDF via TCPDF (server-side) | Testado e descartado — ver seção 4 |
| Reskin por CSS sobre telas nativas | Abordagem original, **abandonada** — ver seção 4 |

> **Saiu desta tabela em 09/2026:** draw.io embutido. Entra na Etapa 9,
> hospedado no próprio plugin, enxugado e estilizado, **só para fluxograma**.

---

## 3. Arquitetura

| Camada | Decisão |
|---|---|
| Dados do documento | **Nativos** (`glpi_knowbaseitems`). Herda revisões, permissões, busca, traduções e anexos |
| Metadados (tipo, código, status…) | Tabela satélite própria, ligada por `knowbaseitems_id`. **Nenhuma tabela nativa é alterada** |
| Permissões | `KnowbaseItem::canViewItem()` e `getVisibilityCriteria()` — os mesmos helpers das telas nativas |
| Telas | Próprias, em Twig, com menu em Ferramentas |
| Edição | **Desde a Etapa 4d, embutida no Codex+** (`front/article.form.php`), reaproveitando o TinyMCE nativo via `Html::textarea(['enable_richtext' => true])` só para o CORPO — não é editor próprio, não é reskin da ficha nativa. Categoria, FAQ e anexos continuam só na ficha nativa (`front/knowbaseitem.form.php`). **Desde a Etapa 4f, o cabeçalho deixou de ter TinyMCE**: é uma prévia de 3 áreas fixas (título = mesmo campo `name`, logo = slot clicável que reaproveita `Branding::storeLogo()` via `front/header-logo.form.php`, dados automáticos = texto gerado, não editável) — ver `Branding::composeHeaderHtml()`/`composeArea3()` |
| PDF | Impressão client-side pelo navegador (**não** TCPDF). **Desde a 0.5.8**, o cabeçalho é montado na hora da impressão a partir dos dados do documento (título + logo em todas as páginas; título grande e linha de identificação na 1ª) — `header_html` não é mais lido pelo PDF. Rodapé por documento (`footer_text`) continua com prioridade sobre o global (`Branding`) |
| Configuração | `Config::setConfigurationValues()` no contexto `plugin:codexplus` — sem tabela própria |
| Logo | Arquivo em `GLPI_PLUGIN_DOC_DIR/codexplus/` — dado de instância, **fora do repositório** |

### Tabelas próprias

`glpi_plugin_codexplus_documents` — metadados do documento controlado:

| Campo | Tipo | Nota |
|---|---|---|
| `id` | INT UNSIGNED | |
| `knowbaseitems_id` | INT UNSIGNED | único |
| `doctype` | VARCHAR(8) | `POP` / `PSG` / `MAN` / `PRP` |
| `sequence` | INT UNSIGNED | sequencial contínuo por tipo |
| `revision` | INT UNSIGNED | inicia em 0, sobe **manualmente** |
| `status` | VARCHAR(16) | `rascunho` / `publicado` / `obsoleto` |
| `users_id_owner` | INT UNSIGNED | responsável |
| `validity_months` | INT UNSIGNED | 0 = não vence (propostas) |
| `client_name` | VARCHAR(255) | só propostas |
| `header_html` | LONGTEXT NULL | Etapa 4d/4f: ainda gravado por `Branding::composeHeaderHtml()` na criação e na edição, mas **desde a 0.5.8 não é lido pelo PDF** (cabeçalho montado na impressão). Candidato a remoção numa etapa futura com migração |
| `footer_text` | LONGTEXT NULL | rodapé por documento, texto com marcadores (mesma sintaxe de `Branding::footer_text`, mas por documento) — Etapa 4d. Desde a Etapa 4e, entra no PDF com prioridade sobre `Branding::footer_text` |
| `date_published` | TIMESTAMP | base do cálculo de vencimento |
| `date_creation` / `date_mod` | TIMESTAMP | |

`glpi_plugin_codexplus_templates` — modelos por tipo: `id`, `name`,
`doctype`, `content` (LONGTEXT com o HTML das seções), `is_default`, datas.

### Convenção de código

Sigla + sequencial de 4 dígitos + `:` + revisão de 2 dígitos.

```
POP0001:00      PSG0001:03      MAN0012:01      PRP0018:00
```

O código é **derivado, nunca armazenado** — `DocumentMeta::getCode()` o monta
a partir de `doctype` + `sequence` + `revision`. Aparece na listagem, na
busca e no rodapé do PDF.

### Ciclo de vida

`rascunho` → `publicado` → `obsoleto`

Validade padrão de 12 meses (0 para propostas). A partir de `date_published`
+ `validity_months`, o sistema deriva `em dia` · `a vencer` (janela de 30
dias) · `vencido`.

> A regra de vencimento tem **fonte única**: `DocumentMeta::expiryState()`.
> `Dashboard::expiry()` apenas delega. Não duplique esse cálculo — é assim
> que o painel e o documento começam a discordar sobre o que está vencido.

---

### 3.1 Arquitetura-alvo — Etapa R (decidida em 19/09/2026)

> **Transição.** A tabela da seção 3 descreve o código **até a 0.5.8**, ainda
> apoiado na Base de Conhecimento. A Etapa R leva ao desenho abaixo. Durante
> a Etapa R, confie nesta seção para o que for novo.

| Camada | Decisão |
|---|---|
| Documento | Classe própria `GlpiPlugin\Codexplus\Document`, tabela `glpi_plugin_codexplus_documents` (a mesma de hoje, ampliada): título, conteúdo, entidade/recursivo, autor, responsável, tipo, sequencial, revisão, status, validade, cliente, datas. `dohistory` ligado: a aba Histórico nativa registra status, responsável e revisão (fecha o achado 20). Nome colide com o `Document` do núcleo: dentro do namespace, o do núcleo é `\Document` |
| Categorias | Lista própria em árvore (CommonTreeDropdown). **Um documento pode estar em várias categorias** (tabela de ligação N:N) |
| Setores | Lista própria (CommonDropdown). **A categoria pertence a um setor**; subcategorias herdam. Documento em categorias de setores diferentes mostra todos os setores. Setor é **organização**, não controle de acesso |
| Leitura | **Mesma rotina da Base de Conhecimento:** alvos por documento — **perfis, grupos e usuários**. Documento sem alvo: só autor, responsável e quem tem "Ver todos". Rascunho: só quem pode editar |
| Criação e edição | **Só por direitos de perfil** (aba Codex+ em Perfis): Ler, Criar, Atualizar, Excluir, Ver todos, Publicar para acesso anônimo, Gerenciar modelos. Uma matriz só, sem conflito com a base nativa |
| Versões | Tabela própria: cópia do conteúdo a cada **revisão publicada** (:00 → :01), com resumo obrigatório do que mudou. Alimenta o histórico de revisão impresso no PDF |
| Anexos e imagens | Mecanismo nativo genérico (`Document_Item`, imagens coladas via `addFiles`) — funciona com qualquer objeto |
| Acesso anônimo | Link secreto por documento (só publicados, revogável), com entrega própria e controlada de imagens e anexos |
| Base de Conhecimento nativa | O Codex+ deixa de ler e de gravar nela. Os artigos atuais ficam intocados |
| Migração | Ferramenta de uso único, só administrador, com prévia, para os 5 documentos de teste (título, conteúdo, metadados, anexos, imagens). Fora do Install (dado não é schema). O histórico de revisões nativo não migra |

Perde-se: tradução de artigos e a integração com FAQ nativa/Self-Service
(o acesso anônimo cobre a necessidade de leitura sem login).

---

## 4. Decisões de arquitetura que já custaram caro

### Por que as telas são próprias, e não CSS sobre o nativo

O plano original era um reskin por CSS sobre as telas nativas da base de
conhecimento (o projeto se chamava "Bookify"). **Abandonado.** Lutar contra
HTML que não é nosso gerou seletor instável a cada atualização, toolbar do
TinyMCE controlado pelo GLPI e PDF que não respeita CSS.

### Por que o PDF é client-side

O plugin "PDF export" do marketplace usa TCPDF no servidor e gera **tabelas
de metadados**, não um documento (testado e confirmado). TCPDF também não
renderiza flexbox nem CSS counters. A impressão pelo navegador respeita 100%
do CSS.

### Por que a paginação do PDF é manual (Etapa 4c)

O Chrome **não suporta** caixas de margem do `@page` nem `counter(page)`.
Rodapé com `1 / 2` não sai de graça. O caminho que funciona é paginar à mão
dentro do iframe de impressão: a folha já é controlada em 794×1123 px, então
dá para medir a altura do conteúdo, fatiar em páginas e desenhar cabeçalho e
rodapé em cada uma. Isso também resolve "logo em todas as páginas" sem
depender do comportamento errático de `position: fixed` na impressão.

---

## 5. Achados técnicos do GLPI 11.0.6

**Custaram depuração. Não reinvestigue.**

1. **Não existe `data-glpi-page` no `<body>`.** O CSS do plugin precisa do seu
   próprio marcador.
2. **Estáticos só são servidos de `plugins/<nome>/public/`.** O roteador serve
   PHP a partir de `/ajax/`, `/front/` e `/report/`, mas CSS/JS/imagens
   **apenas** de `public/`.
3. **`Plugin::getWebDir()` está depreciado** no 11 — usar
   `$CFG_GLPI['root_doc'] . '/plugins/codexplus'`.
4. **SQL cru em string no SELECT quebra.** O construtor escapa tudo com
   crases. `'COUNT(DISTINCT x) AS total'` gera SQL inválido; o correto é a
   chave `'COUNT DISTINCT' => '...'`. Pelo mesmo motivo, `DATE_ADD` não
   funciona — cálculo de vencimento é feito em PHP.
5. **Imagens de artigo levam `loading="lazy"`** (injetado por
   `RichText::getEnhancedHtml`). Em janela de impressão elas nunca entram no
   viewport e o PDF sai sem imagem. Solução: clonar o conteúdo forçando
   `loading="eager"`, usar iframe com dimensões reais (794×1123) fora da tela
   e aguardar o carregamento de cada imagem antes de imprimir.
6. **Seletores reais:** conteúdo do artigo = `.rich_text_container`; badge de
   categoria = `.badge.badge-outline`.
7. **Relação artigo↔categoria é N:N**, via
   `glpi_knowbaseitems_knowbaseitemcategories`.
8. **`KnowbaseItem::getAnswer()`** já resolve tradução, imagens inline e
   âncoras de título — usar em vez de ler `answer` cru.
9. **`front/*.php` de plugin roda em escopo de função**, via
   `LegacyFileLoadController::__invoke()`. Declarar `global $DB, $CFG_GLPI;`
   explicitamente depois do include, senão as superglobais vêm nulas.
10. **O mesmo controller faz `$response = require($arquivo)` dentro de um
    `ob_start()`.** Arquivo que entrega binário deve **retornar um `Response`
    do Symfony** — usar `Toolbox::getFileAsResponse()`. `readfile()` + `exit`
    dispara `E_USER_WARNING` de "Unexpected output detected".
11. **`COUNT` + `GROUPBY` juntos descartam os campos do `SELECT`** no iterator
    do GLPI 11. Traga as linhas e conte em PHP.
12. **Todo `WHERE`/`ORDER` de consulta com JOIN precisa de coluna
    qualificada** (`glpi_knowbaseitems.id`, não `id`), senão o MySQL devolve
    "Column is ambiguous" (1052), que vira "Ocorreu um erro inesperado".
13. **O Twig do GLPI é strict:** variável referenciada no template **tem** que
    ser passada, e chave de array acessada **tem** que existir.
14. **JSON embutido em `<script type="application/json">`** com texto do
    usuário precisa de `JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT`
    — um `</script>` num título quebraria a página.
15. **CSRF:** o núcleo valida POST sozinho. **Nunca** `Session::checkCSRF`
    manual.
16. **`plugin:install` desativa o plugin.** Todo bloco de deploy que o inclua
    precisa de `plugin:activate` logo em seguida.
17. **Motor de paginação manual (Etapa 4c) — decisões que não são bug:**
    - A capacidade de conteúdo por página (`geo.contentH`) é **constante**
      em todas as páginas, ligue ou não `repeat_logo`/`footer_show` de
      forma variável entre elas. Calcular uma capacidade por página
      exigiria reempacotar o conteúdo página a página; a capacidade fixa
      custa, no pior caso, um respiro a mais em página sem logo — troca
      aceita pela simplicidade e previsibilidade.
    - O `counter-reset: cx-step` saiu de `.codexplus-content` (Etapa 1) e
      foi para `body`: a partir da 4c os blocos `.cx-step` ficam
      espalhados entre várias `.cx-page`, sem um contêiner comum só do
      conteúdo — o contador precisa de um ancestro comum a *todas* as
      páginas, e `body` é o único que serve.
    - Bloco isolado mais alto que uma página inteira (tabela ou imagem
      gigante) ainda assim vai sozinho para sua própria `.cx-page` e pode
      transbordar visualmente para a folha seguinte. Não dá para evitar
      sem partir o bloco, o que fere a regra "não partir passo nem tabela
      no meio". Não acontece em documento comum (POP, manual, proposta).
    - **Etapa 4e:** `header_html` (por documento, rich text livre) entra no
      cabeçalho de cada página usando a MESMA altura fixa reservada para a
      logo de canto (`header_logo_height`) — decisão explícita do usuário,
      não um valor calculado. Conteúdo que ultrapassa essa altura é cortado
      (`overflow:hidden`), nunca empurra o layout. Alternativa descartada:
      medir a altura real do `header_html` como se faz com os blocos de
      `#cx-stage` — quebraria a premissa de capacidade de página constante
      logo acima, exigindo recalcular `contentH` por página.
    - **Etapa 4f (correção sobre a 4e):** `header_html` deixou de ser texto
      livre — vira sempre 2 linhas fixas (título+logo, depois dados
      automáticos). A altura de logo sozinha (`logoPx`) não sobra espaço
      para a 2ª linha; `computeGeometry()` ganhou `headerBoxH` (=
      `logoPx + AREA3_H` quando há `header_html`, só `logoPx` no fallback
      de logo de canto) — bug pego e corrigido durante a própria
      implementação da 4f, antes de qualquer teste no ambiente real.

18. **`Html::textarea()` no 11.0.6** (confirmado no fonte, `src/Html.php`):
    com `display` padrão (`true`) ele **imprime** o HTML e devolve `true`;
    com `display => false` devolve a string. O `article.form.php` captura a
    saída com `ob_start()`, o que funciona.
19. **Toda gravação de `KnowbaseItem` gera revisão nativa**, inclusive pela
    edição do Codex+: `KnowbaseItem::pre_updateInDB()` chama
    `KnowbaseItem_Revision::createNew()`. Detalhe: a revisão grava o
    `users_id` do **autor original**, não de quem editou; quem editou fica
    na aba **Histórico** (`glpi_logs`).
20. **`DocumentMeta` não tem histórico ligado.** Trocar status,
    responsável, validade ou revisão do Codex+ não deixa rastro. Registrado
    na Etapa R (R1 e R6).
21. **Imagens inseridas durante `layoutPages()` não são esperadas.** O motor
    do PDF aguarda as imagens do conteúdo **antes** de paginar; a logo do
    cabeçalho só é criada **durante** a paginação e a impressão dispara sem
    ela. Causa da logo ausente no PDF — correção no pacote 0.5.8.
22. **`cp -r pasta/* destino` não copia arquivos ocultos.** Foi assim que o
    `.gitignore` sumiu do repositório em 31/08 (restaurado em 19/09). Usar
    sempre `cp -rf pasta/. destino/`.
23. **`scp` no cmd do Windows: destino sem barra final.**
    `"%USERPROFILE%\Downloads\"` falha porque `\"` vira aspa escapada; usar
    `"%USERPROFILE%\Downloads"`.
24. **O nome sugerido do PDF vem do título da página principal**, não do
    `<title>` do iframe de impressão. A 0.5.8 troca `document.title` na
    hora do `print()` e devolve em seguida.
25. **Dá para validar PHP no ambiente de quem gera os pacotes:**
    `apt-get install -y php-cli` funciona lá, e `php -l` passa a rodar em
    todo arquivo antes da entrega.
26. **O Codex+ não tinha aba de direitos em Perfis.** O direito
    `plugin_codexplus_wiki` existia, mas só era ajustável direto no banco.
    A Etapa R1 cria a aba.

---

## 6. Contrato de código — não quebrar

### Os cinco seletores do PDF

`public/js/codexplus.js` remonta o documento para impressão a partir destes
seletores. **São interface, não decoração.** Renomear qualquer um quebra a
exportação silenciosamente, sem erro no console:

```
#codexplus-doc            contêiner do que vai para o PDF
.codexplus-doc-title      vira o <h1>
.codexplus-doc-meta       só fallback da linha de identificação (0.5.8)
.codexplus-content        o corpo do documento
#codexplus-pdf            o botão que dispara a exportação
```

Desde a 0.5.8, a linha de identificação da 1ª página vem de
`#codexplus-print-config` (`buildIdentLine()`), não da raspagem de
`.codexplus-doc-meta` — que trazia a contagem de visualizações.

Elemento novo dentro de `#codexplus-doc` **não** entra no PDF
automaticamente — o JS monta o HTML a partir dos seletores acima, não clona o
contêiner inteiro.

### Outras regras

- Design tokens CSS com prefixo `--cx-`, declarados em `:root`
- CSS em **arquivo único** (`public/css/codexplus.css`), seções numeradas
- Antes de criar classe nova, procure a existente — `.codexplus-status--*` já
  cobre status e vencimento; `.cx-code-chip` já cobre o código colorido
- Migração de schema **só** em `Install::install`, idempotente
  (`tableExists` / `fieldExists`). Higiene de dados não vai no Install
- Títulos em CAIXA ALTA no PDF (configurável desde a 4a)

---

## 7. Ambiente

| Item | Valor |
|---|---|
| Homologação | `177.87.230.179`, SSH na porta **2078** (Debian, GLPI 11.0.6) |
| Usuário de acesso | `resolutto` (sem sudo); **todo o trabalho é feito como root** (`su -`) |
| Caminho do GLPI | `/var/www/html/glpi` |
| Dono dos arquivos do plugin | `www-data:www-data` |
| Repositório no servidor | **a própria pasta do plugin**, `plugins/codexplus` (desde 19/09/2026, igual aos demais plugins da Teckcomp) |
| Repositório remoto | `github.com/teckcomp/glpi-plugin-codexplus` (público) |
| PC de desenvolvimento | Windows, sem Git local; transferência por `scp` (OpenSSH do Windows) |
| Ferramentas no servidor | `git` sim; `zip`/`unzip` **não** — pacotes em `.tar.gz` |
| Produção | **Codex+ não instalado.** Só sobe ao atingir o marco "Pronto para produção" (ver `ROADMAP.md`) |

O servidor antigo `192.168.1.50` não é mais usado (substituído em 09/2026).

Ver `docs/DEPLOY.md` para o fluxo completo de publicação e teste.

---

## 8. Onde estão as coisas

```
codexplus/
├── setup.php                  registro do plugin, hooks, versão
├── hook.php                   install/uninstall
├── src/
│   ├── Install.php            schema, direitos, modelos semeados
│   ├── Wiki.php               estante, listagem, leitura do artigo
│   ├── DocumentMeta.php       metadados, código derivado, vencimento
│   ├── Template.php           modelos por tipo
│   ├── Dashboard.php          indicadores do painel
│   └── Branding.php           configuração de marca (4a), cabeçalho (4f)
├── front/                     controllers (rodam em escopo de função!)
├── templates/                 Twig
├── public/                    CSS e JS (única pasta servida como estático)
└── docs/                      esta documentação
```

---

## 9. Colaboração

Mais de uma pessoa trabalha no plugin. Regras (definidas em 19/09/2026):

1. **O GitHub é a fonte da verdade.** Nada vai para o servidor sem estar
   antes no repositório. Em 09/2026 três etapas (4e, 4f e a correção da
   logo) ficaram duas semanas só no servidor, sem cópia versionada.
2. **`git pull` antes de começar** qualquer trabalho.
3. **Um commit por etapa**, com a mesma versão do `setup.php` na mensagem e
   no `README.md`.
4. **Decisão de produto registrada com o nome de quem decidiu.** "Decisão do
   usuário" é ambíguo com mais de uma pessoa no projeto.
5. Seguir o `docs/DEPLOY.md` à risca, inclusive o comando de cópia com
   `pasta/.` (achado 22).

