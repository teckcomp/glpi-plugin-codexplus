# Codex+ — contexto do projeto

> Documento de entrada. Quem for dar andamento ao plugin deve ler este
> arquivo **antes** de abrir qualquer código.
> Estado: `v0.5.2-alpha` · atualizado em 13/08/2026.

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

---

## 2. Escopo — o que está fora, e por quê

Registrado para não voltar à discussão sem motivo novo. **Não implemente nada
desta tabela sem alinhar antes.**

| Item | Por que não |
|---|---|
| Fluxo de aprovação multi-etapa | Não há intenção de certificar ISO 9001; autor e aprovador são a mesma pessoa |
| Caixa de tarefas pendentes | Só faz sentido com várias pessoas no fluxo |
| Trilha de auditoria para auditor externo | O histórico nativo do GLPI já registra alterações |
| Permissão separada de ver / imprimir / baixar | O GLPI já controla visibilidade por perfil, grupo e entidade |
| Editor Markdown | O TinyMCE nativo atende |
| draw.io embutido | Reavaliar depois da Etapa 5; hoje croqui entra como imagem anexada |
| Hierarquia livro → capítulo → página | Categoria → subcategoria resolve; o PSG cobre o agrupamento por setor |
| PDF via TCPDF (server-side) | Testado e descartado — ver seção 4 |
| Reskin por CSS sobre telas nativas | Abordagem original, **abandonada** — ver seção 4 |

---

## 3. Arquitetura

| Camada | Decisão |
|---|---|
| Dados do documento | **Nativos** (`glpi_knowbaseitems`). Herda revisões, permissões, busca, traduções e anexos |
| Metadados (tipo, código, status…) | Tabela satélite própria, ligada por `knowbaseitems_id`. **Nenhuma tabela nativa é alterada** |
| Permissões | `KnowbaseItem::canViewItem()` e `getVisibilityCriteria()` — os mesmos helpers das telas nativas |
| Telas | Próprias, em Twig, com menu em Ferramentas |
| PDF | Impressão client-side pelo navegador (**não** TCPDF) |
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

---

## 6. Contrato de código — não quebrar

### Os cinco seletores do PDF

`public/js/codexplus.js` remonta o documento para impressão a partir destes
seletores. **São interface, não decoração.** Renomear qualquer um quebra a
exportação silenciosamente, sem erro no console:

```
#codexplus-doc            contêiner do que vai para o PDF
.codexplus-doc-title      vira o <h1>
.codexplus-doc-meta       vira a linha de metadados
.codexplus-content        o corpo do documento
#codexplus-pdf            o botão que dispara a exportação
```

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
| Servidor de homologação | `192.168.1.50` (Debian, acesso via PuTTY, usuário `teckcomp`) |
| Caminho do GLPI | `/var/www/html/glpi` |
| Dono dos arquivos | `www-data:www-data` |
| PC de desenvolvimento | `192.168.1.2` (Windows, sem Git local) |
| Versão do GLPI | 11.0.6 · PHP 8.2+ · MySQL (`glpidb`) |
| Repositório | `github.com/teckcomp/glpi-plugin-codexplus` |

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
│   └── Branding.php           configuração de marca (Etapa 4a)
├── front/                     controllers (rodam em escopo de função!)
├── templates/                 Twig
├── public/                    CSS e JS (única pasta servida como estático)
└── docs/                      esta documentação
```
