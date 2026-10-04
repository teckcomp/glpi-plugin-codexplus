# Codex+ — contexto do projeto

> Documento de entrada. Quem for dar andamento ao plugin deve ler este
> arquivo **antes** de abrir qualquer código.
> Estado: **`v0.7.9`** · último commit de código **`ea02b8a`** ·
> atualizado em **04/10/2026 (noite, fim da sessão)**: **R6-b ✅** (prazo
> da revisão, prorrogação com motivo, "Revisão vencida" unificada,
> histórico de revisões no fim do PDF), **R7 ✅** (acesso anônimo por link
> secreto, página pública em folhas como o PDF, logo, imagens e anexos pela
> rota do link), **Visualizar em folhas A4** (mesmo motor do PDF),
> **Etapa 5 ✅** (documentos vinculados em todos os níveis: 5a lista e
> regras, 5b referência no texto e Documentos complementares, 5c/5e "Faz
> parte de", aviso ao pai e Painel, 5d PDF completo em cascata), **dados do
> documento recolhíveis em abas**, **tela cheia na leitura do fluxograma**,
> **3c fechada** (modelos de Manual, POP e PSG como dado). Seção 3.17;
> achados 140 a 148. Próximo: **caça a bugs** → produção.
> Antes:
> Estado anterior: **`v0.7.6`** · atualizado em **04/10/2026 (tarde e noite)**: **3c fechada** — planilha
> editada no lugar (3c-1), **Resumo do investimento** automático (3c-2),
> modelo completo de Proposta como **dado** da homologação (3c-3/3c-3b);
> **editores e aprovadores** (A-1 vários editores na Proposta e no Laudo,
> A-2a aprovadores como etapa antes do responsável em DIA e DIV, A-2b
> aprovadores no rodapé, leitura e PDFs); **P3 — papéis no documento**
> (perfil só com Ler, Criar, Excluir, **Auditar**, Ver todos, Anônimo,
> Gerenciar; quem montou não aprova nem audita); **J1** — fim do salto de
> rolagem ao clicar em planilha/planta/topologia. Seção 3.16; achados 129
> a 139. Próximo: **perguntar a Claudio — resto da 3c (Manual, POP, PSG
> como dado) ou R6-b**. Antes, de manhã: **3c-0** (paginação do PDF, seção
> 3.14) e **marcas** M-1/M-2 (seção 3.15); achados 123 a 128.
> Antes, em 03–04/10/2026
> (noite): **cronograma fechado (Q7b)** — datas reais, fases, marcos,
> numeração, linha "hoje", importar/exportar (`.json` + tabela para IA,
> também RACI), desenho do mockup aprovado, PDF e leitura em **paisagem**,
> **tela cheia** na edição e na leitura e **situação das tarefas** (Iniciar,
> Concluir, Reabrir no publicado, sem abrir revisão) — seção 3.13; achados
> 114 a 122. Próximo: **3c — modelos com conteúdo real**. Antes, na tarde e
> noite de 03/10: **organograma no motor de quadro, fechado** (Q6a a
> Q6f-2; motor antigo `codexplus-org.js` removido), **cópia da Planta e da
> Topologia** (Q7a) e **cronograma com datas desenhado e aprovado** (Q7b,
> feito em seguida, seção 3.13) — seção 3.12; achados 107 a 113. **Documentos encerrados** (sem
> importar/exportar de documento completo); pendentes para o fim só a aba
> de Histórico e a galeria de Modelos. Antes, no mesmo dia:
> **Q5i — importar e exportar o fluxograma em arquivo**: cópia do Codex+
> (`.json`) e **Mermaid**, o formato que toda IA gera (importar com raias,
> molduras e corredores; exportar em `.md` para levar a uma IA) — seção
> 3.11; achados 100 a 106. O `.bpmn` foi para o backlog. Antes, em
> 02/10/2026: **folha do fluxograma**, **ícones Lucide** (Q5j-1/2), **raias** (Q5g-1 a
> Q5g-3) e **Q5h completo** (trocar forma, link, busca, minimapa) — seção
> 3.10; achados 95 a 99. **Escopo de "pronto" = roadmap inteiro**;
> **produção = Debian 13 (SSH 2022)**, etapa final. Antes, na
> madrugada de 28/09/2026: **SC1 — Setor / Categorias no formulário**
> (`dfe0e58`), **versão 0.7.0** e **instalação do zero testada** numa
> instância limpa (banco idêntico ao da homologação) — seção 3.9; achados 92
> a 94. **Produção adiada por Claudio** (28/09): sobe quando o escopo
> combinado estiver pronto (ROADMAP, "Ordem até produção"). Antes, na noite
> de 27/09: **Biblioteca em estante, B2a a B2c** — três níveis (nichos dos setores,
> nichos das categorias, lombadas), estante mínima de 12 nichos com
> decoração, montantes, aparador e rolos de planta dos diagramas (seção 3.8;
> commits `23f9a5c` e `810aa85`; achados 87 a 91). Antes, na mesma noite:
> **Fluxograma, Q5a a Q5f** — subtipo de DIA sobre o motor de quadro, formas
> de fluxograma e BPMN, estilo, ligações completas, "+" rápido e alinhar
> (seção 3.7; commits `6ef31e5` a `e694ddd`; achados 81 a 86). Antes, no
> mesmo dia, sessão da tarde (T2
> ferramentas por tipo, Q2f baixar PNG, T3 duplicar como, Q3a materiais, Q3b
> legenda, E6 editor na Proposta e no Laudo, Q4a a Q4c ícones criados pelo
> Super-Admin — seção 3.6; commits `5396fe9` a `a76b16c`; Q3c cancelado).
> Antes, no mesmo dia: Q2a a Q2e (ligações,
> cabos, traçado com dobras, metragem e eletrocalha no motor de quadro —
> seção 3.5, subseção "Ligações e cabos"; commits `8e71046` a `cd8a64f`). Antes,
> 26/09/2026 (P1 papéis pelo perfil,
> P2 fluxo por tipo, D1 cronograma e RACI, S1 Self-Service, B1 Biblioteca,
> R3b4 e M1 modelos, E5 cor e realce, R4 migração, R5 fim da Base de
> Conhecimento, PL1 planilha, Q1 motor de quadro com Planta e Topologia —
> seção 3.5; commits `66f9b2b` a `6a1f8ee`). Antes, 25/09/2026 (blocos A1 e A2: auditor
> pelo perfil, Super-Admin pelo perfil, setor de auditoria — subseções
> "Auditor pelo perfil" e "Quem aprovou não valida"). Antes, 24/09: bloco T1
> (tipos LAU, DTC e DIV e cliente vinculado — subseção "Tipos novos e cliente
> vinculado"; instalado na homologação sem commit, juntado ao A2 em 25/09).
> Antes, no mesmo dia: editor de documentos
> completo: E1 a E4, commits `1c793c8` a `68b7b09` — subseção "Editor de
> documentos". Antes, 22/09: criador de documentos (R3b2-b e R3b3, commits
> `d06aa30` a `987636c`). Antes, 21/09: R6-a, revisão de
> documento publicado. Antes: (motor de diagrama em
> grafo: posição livre, arraste próprio, ligações com chefia, salvamento
> automático, PDF igual à tela e dobras à mão — seção 3.4; commits `bd41b7a`
> a `9ae6110` e o do bloco 2d-2).

---

## 1. O que é

Plugin de **gestão documental dentro do GLPI 11.0.6**. Serve como wiki, base
de conhecimento e ferramenta de produção de documentos controlados, com
exportação em PDF com a marca da empresa.

Tipos de documento (os quatro originais, o `DIA` da Etapa 9 e os três do
bloco T1, decididos por Claudio em 24/09/2026):

| Sigla | Nome | Vence? | Cliente | Observação |
|---|---|---|---|---|
| `POP` | Procedimento Operacional Padrão | 12 meses | — | |
| `PSG` | Procedimento do Sistema de Gestão | 12 meses | — | Regimento de setor que **associa POPs** |
| `MAN` | Manual | 6 meses | — | Manual técnico / de uso |
| `PRP` | Proposta | **não** | texto livre | Escopo comercial para cliente. Entregável, não conhecimento |
| `LAU` | Laudo Técnico | **não** | vinculado | Registra um momento; laudo novo é outro documento |
| `DTC` | Documentação Técnica | 12 meses | vinculado | Ganha o desenho embutido junto com a proposta (item 7 da ordem até produção) |
| `DIV` | Documento Diverso | **não** (provisório) | — | Qualquer documento sem classificação; validade "definida por quem publica" quando essa escolha existir |
| `DIA` | Diagrama | 3 meses | — | Organograma (e depois cronograma, matrizes, fluxograma) |

`LAU`, `DTC`, `DIV` e `DIA` existem só no modelo novo (`NEW_MODEL_ONLY`).
Todos seguem as mesmas permissões (setor pela categoria, papéis, validação em
duas etapas).

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
| Fluxo de aprovação com mais de duas etapas | Não há intenção de certificar ISO 9001. **Desde 21/09/2026 (Claudio) a validação tem DUAS etapas** antes de publicar — gestor do setor, depois auditor responsável (Etapa R3d). Mais etapas, ou etapas configuráveis, continuam fora |
| Caixa de tarefas pendentes | "Aguardando validação" e "Revisão atrasada" são indicadores do "Precisa de atenção" do Painel (R5), não caixa de tarefas |
| Trilha de auditoria para auditor externo | O histórico nativo do GLPI já registra alterações. O histórico de revisão com resumo (Etapa R6) é do documento, não aparato de auditoria |
| Permissão separada de ver / imprimir / baixar | O GLPI já controla visibilidade por perfil, grupo e entidade |
| Editor Markdown | O TinyMCE nativo atende. Markdown entra só como **importação** (E2) |
| Tamanho, fonte e cor livres no editor | Padronização (Claudio, 22/09/2026): estilos fixos e três tamanhos (E1) |
| Hierarquia livro → capítulo → página | Categoria → subcategoria resolve; o PSG cobre o agrupamento por setor |
| PDF via TCPDF (server-side) | Testado e descartado — ver seção 4 |
| Reskin por CSS sobre telas nativas | Abordagem original, **abandonada** — ver seção 4 |
| Caneta livre, marca-texto e reconhecimento de forma no quadro | Claudio, 26/09/2026: não precisa para o projeto (a decisão de 20/09 continua) |
| Colaboração em tempo real, comentários, votação, apresentação e IA no quadro | Funções do Miro fora do escopo; uma edição por vez, como todo documento |

> **Saiu desta tabela em 09/2026:** draw.io embutido. Entrou na Etapa 9.
> **Voltou para cá em 20/09/2026 (Claudio):** com o motor de canvas do Codex+
> (grafo com posição livre e ligações próprias — seção 3.4), o fluxograma
> passa a ser uma paleta de formas sobre o mesmo motor. Embutir o draw.io
> traria megabytes de código de terceiro no repositório público, mais o
> trabalho de enxugar e manter, para entregar o que o motor próprio já faz.
> **Preço aceito:** desenho livre de verdade (forma arbitrária, curva à mão,
> agrupamento) não existirá. Há caixa, seta e rótulo.
> **Referência do fluxograma (Claudio, 22/09/2026): Miro**, pelo modelo de
> interação (conectar pelas bordas, puxar a seta para o vazio e criar a forma
> ligada, trocar a forma sem perder ligações, rótulo na seta). Não é
> referência de escopo: o preço acima continua valendo.
> **Referência de BPMN (Claudio, 27/09/2026): Bizagi Modeler** — só a
> notação, com desenho próprio (seção 3.7). Importar e exportar `.bpmn`
> **foi para o backlog** (Claudio, 03/10/2026): não há processos no Bizagi.
> **O formato de troca é o Mermaid** (seção 3.11): é o que as IAs geram sem
> instrução, e o usuário só lida com arquivos, nunca com código.

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

`glpi_plugin_codexplus_icons` (Q4a, `0.6.10-alpha`) — ícones do quadro
criados pelo Super-Admin: `id`, `name`, `cat`, `search`, `mode`
(`color`/`mask`), `image` (MEDIUMTEXT, PNG em data URL, até 256 px e 250 KB),
`users_id`, datas. Seção 3.6.

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
| Setores | Lista própria (CommonDropdown). **A categoria pertence a um setor**; subcategorias herdam. Documento em categorias de setores diferentes mostra todos os setores. Desde a R3c o setor também define **quem cria, edita e valida** (gestores e validadores do setor) — decisão de Claudio, 20/09/2026 |
| Leitura | Alvos por documento — **perfis, grupos e usuários**, como na base nativa — e só da versão publicada. Quem tem papel no documento lê em qualquer status |
| Permissões | **Duas camadas** (Claudio, 20/09/2026): o perfil (aba Codex+ em Perfis) diz **o que** a pessoa pode fazer; o plugin diz **em quais documentos** (gestores e validadores do setor, editores do documento, alvos de leitura). Detalhe na subseção R3c |
| Versões | Tabela própria: cópia do conteúdo a cada **revisão publicada** (:00 → :01), com resumo obrigatório do que mudou. Alimenta o histórico de revisão impresso no PDF |
| Anexos e imagens | Mecanismo nativo genérico (`Document_Item`, imagens coladas via `addFiles`) — funciona com qualquer objeto |
| Acesso anônimo | Link secreto por documento (só publicados, revogável), com entrega própria e controlada de imagens e anexos |
| Base de Conhecimento nativa | O Codex+ deixa de ler e de gravar nela. Os artigos atuais ficam intocados |
| Migração | Ferramenta de uso único, só administrador, com prévia, para os 5 documentos de teste (título, conteúdo, metadados, anexos, imagens). Fora do Install (dado não é schema). O histórico de revisões nativo não migra |

#### Schema da Etapa R (criado na R1, `v0.6.0-alpha`)

Nada abaixo é lido pelas telas atuais ainda; elas seguem sobre
`glpi_knowbaseitems` até a R5. Chaves estrangeiras seguem a convenção do GLPI
(nome da tabela sem `glpi_` + `_id`) para as classes da R2/R3 não precisarem
de `getTable()` manual.

| Tabela | Uso | Campos principais |
|---|---|---|
| `glpi_plugin_codexplus_documents` | o documento (ampliada) | + `name`, `content`, `entities_id`, `is_recursive`, `users_id` (autor), `is_deleted`. `knowbaseitems_id` deixou de ser único (documento próprio nasce com 0) e sai na R5 |
| `glpi_plugin_codexplus_sectors` | setores (CommonDropdown, R2) | `name`, `comment`, `entities_id`, `is_recursive` |
| `glpi_plugin_codexplus_categories` | categorias em árvore (CommonTreeDropdown, R2) | colunas da `glpi_knowbaseitemcategories` nativa + `plugin_codexplus_sectors_id` |
| `glpi_plugin_codexplus_documents_categories` | documento ↔ categoria, N:N | único por par |
| `glpi_plugin_codexplus_documents_profiles` | alvo de leitura: perfil | `profiles_id`, `entities_id` (NULL), `is_recursive`, `no_entity_restriction` — espelho de `glpi_knowbaseitems_profiles` |
| `glpi_plugin_codexplus_documents_groups` | alvo de leitura: grupo | idem, com `groups_id` — espelho de `glpi_groups_knowbaseitems` |
| `glpi_plugin_codexplus_documents_users` | alvo de leitura: usuário | `users_id` — espelho de `glpi_knowbaseitems_users` |
| `glpi_plugin_codexplus_documentversions` | versões publicadas (R6) | `revision` (única por documento), `name`, `content`, `summary`, `users_id`, `date_published` |

O campo do link anônimo entra na R7, não antes.

#### Direitos (R1)

Aba **Codex+** em Administração → Perfis (`src/ProfileTab.php`), só em
perfis da interface padrão (achado 27). Reaproveita o formulário nativo:
estende `pages/admin/profile/base_tab.html.twig`, desenha a matriz com
`Profile::displayRightsChoiceMatrix()` e o POST vai para o
`profile.form.php` do núcleo. Sem controller próprio.

Chave em `glpi_profilerights`: continua `plugin_codexplus_wiki` (nome
histórico; renomear exigiria migrar todos os perfis sem ganho). Bits em
`src/Rights.php`:

| Bit | Coluna |
|---|---|
| 1 | Ler |
| 2 | Atualizar |
| 4 | Criar |
| 8 | Excluir (lixeira, `is_deleted`) |
| 1024 | Ver todos (ignora os alvos de leitura) |
| 2048 | Publicar para acesso anônimo |
| 4096 | Gerenciar modelos, setores e categorias (R2) |
| 8192 | **Auditar** (R3c como "Validar"; "Auditor" na A1; "Auditar" na P1) |
| 16384 | **Aprovar** (P1): pode ser o responsável, que aprova a 1ª etapa |

Desde a P1 o bit 2 se chama **Revisar e editar** (pode ser revisor). Ver
seção 3.5 para o que cada bit faz hoje.

Os bits novos **nascem desmarcados em todos os perfis**, inclusive
Super-Admin: se o Install concedesse, cada reinstalação devolveria o que foi
desmarcado. Em R1 eles só são gravados; a R3 passa a checá-los.

#### Setores e categorias (R2)

Classes `GlpiPlugin\Codexplus\Sector` (CommonDropdown) e `Category`
(CommonTreeDropdown). Cadastro em **Configurar → Listas suspensas → Codex+**
(hook `plugin_codexplus_getDropdown` no `hook.php`). Não há `front/` para
elas: o GLPI 11 manda `/plugins/codexplus/front/sector[.form].php` e
`category[.form].php` para os controllers genéricos (achado 30).

- **Direitos** (decisão de Claudio, 20/09/2026): cadastrar = bit 4096
  "Gerenciar modelos, setores e categorias"; ver = Ler ou 4096. O direito
  nativo `dropdown` **não** vale para elas. Regra única no trait
  `StructureRights`.
- **Herança:** o setor é da categoria raiz. Subcategoria grava o setor do
  pai e ignora o do formulário; mudar o setor da raiz ou mover uma
  subárvore reaplica o setor nos descendentes (UPDATE direto, sem encher o
  Histórico); categoria que vira raiz mantém o setor que tinha.
- **Relações** declaradas em `plugin_codexplus_getDatabaseRelations` (setor →
  categoria, categoria → categoria pai), para o aviso "item em uso" e o
  "substituir por" ao excluir. A ligação documento–categoria entra na R3,
  junto com a classe dela (achado 31).

#### Documento e visibilidade (R3a, `v0.6.2-alpha`)

Classe `GlpiPlugin\Codexplus\Document` (`src/Document.php`) sobre a mesma
tabela de `DocumentMeta`. Até a R5 as duas convivem: `DocumentMeta` cuida das
linhas ligadas a artigo (`knowbaseitems_id > 0`), `Document` do documento
próprio (`knowbaseitems_id = 0`). As telas atuais partem de
`glpi_knowbaseitems` com LEFT JOIN e nunca enxergam documento próprio
(conferido com Painel e Documentos na R3a).

- **Regras com fonte única em `DocumentMeta`:** `nextSequence()` (um
  sequencial por tipo para as duas classes), `sanitizeFields()`,
  `stampPublishDate()`, `expiryState()`. Não copiar em `Document`.
- **Tipo e sequencial não mudam depois de criado** (são o código); título
  vazio e tipo ausente são recusados.
- **Ligações** (`CommonDBRelation`): `Document_Profile`, `Document_Group`,
  `Document_User` (alvos, trait `TargetRelation`) e `Document_Category`.
  Ligar ou desligar exige poder atualizar o documento. Alvo de perfil ou
  grupo sem entidade informada = sem restrição de entidade (achado 34).
- **Leitura e edição:** as regras da R3a foram substituídas pelas da R3c
  (subseção seguinte). Excluir = lixeira; purgar desligado.
- **A regra existe duas vezes** — por item (`canViewItem`) e em SQL
  (`Document::getVisibilityCriteria()`, para as listagens da R5, com
  `DISTINCT`). O comando `plugins:codexplus:document:visibility` compara as
  duas e acusa `DIVERGE`. Mudou uma, rode o comando.
- **Histórico:** criação, alvos e mudança de status, responsável, revisão,
  validade, cliente e título aparecem em `glpi_logs` (achado 33). Conteúdo,
  cabeçalho e rodapé ficam fora (`getNonLoggedFields`).
- **Comandos de teste** (`src/Console/`, só para quem tem o servidor):
  `plugins:codexplus:document:create`, `…:set`, `…:visibility`. Rodam como o
  usuário de `--username`, com os direitos reais dele. Candidatos a sair na R5.
- **Relação** categoria → `documents_categories` declarada no `hook.php`
  (categoria usada por documento dá o aviso "em uso").
- **Lista de Categorias** mostra a coluna Setor por padrão (preferência
  gravada no Install só se ainda não houver nenhuma para Category).

#### Papéis e validação (R3c, `v0.6.3-alpha`)

> **Substituído em 26/09/2026 (P1, seção 3.5):** não há mais gestor de setor
> nem editores do documento. Mantido como histórico.

Decisões de Claudio, 20/09/2026. **Duas camadas:** o perfil diz o que; o
plugin diz em quais documentos. A ação só vale quando as duas concordam.
"Ver todos" dispensa os papéis, sempre dentro dos outros bits do perfil. O
Super-Admin (perfis com Configurar > Atualizar) recebe todos os bits no
Install, por OU bit a bit (reinstalar nunca tira bit).

| Ação | Perfil (bit) | Plugin (onde vale) |
|---|---|---|
| Ler | Ler | Alvo de leitura, só publicado/obsoleto. Papel no documento (gestor ou validador do setor, editor, autor, responsável) lê em qualquer status |
| Criar | Criar | Gestor do setor de **todas** as categorias informadas (categoria obrigatória) |
| Editar | Atualizar | Editor do documento ou gestor do setor, **só em rascunho** |
| Gerir (editores, alvos, responsável, obsoleto) | Atualizar | Gestor do setor. Categorias só em rascunho e só para setor que ele gere |
| Enviar para validação | Atualizar | Quem pode editar; exige categoria com setor (salvo Ver todos) |
| Validar ou devolver | **Validar** (8192; "Auditor" desde a A1) | Validador do setor que **não alterou** o documento na revisão atual. *Desde a A1: o auditor responsável do documento, escolhido entre quem tem o bit no perfil* |
| Excluir (lixeira) | Excluir | Gestor do setor |
| Setores, categorias, papéis de setor, modelos | Gerenciar modelos, setores e categorias | — |

- **Ciclo:** rascunho → validacao → publicado → obsoleto. Devolver volta a
  rascunho com motivo obrigatório (`validation_comment`). Documento nasce
  rascunho; o status só muda por `submit()`, `approve()`, `reject()` e
  `markObsolete()` — `update()` com `status` é recusado.
- **Fora de rascunho, conteúdo não muda.** Publicado só volta a ser editável
  na R6 (revisão com a versão publicada visível até a aprovação).
- **Tabelas:** `sectormembers` (setor, papel `gestor`/`validador`, usuário
  OU grupo), `documenteditors` (documento, usuário OU grupo),
  `documentcontributors` (quem alterou o documento em cada revisão: é o que
  impede quem editou de validar). Campos novos no documento: quem enviou,
  quando, quem validou, quando, motivo da devolução — todos no Histórico.
- **Setor do documento** = setores das categorias dele (Category guarda o
  setor já herdado da raiz). Documento em setores diferentes: valem os
  papéis de todos.
- **Comandos:** `plugins:codexplus:sector:member` (papéis de setor),
  `document:create` (com `--category`, `--editor`), `document:set` (edição e
  `--action=enviar|validar|devolver|obsoleto`), `document:visibility`
  (colunas Papéis, Leitura, Edição, Validação e SQL=item).

**Decididos para a R6** (Claudio, 20/09/2026): durante a revisão de um
documento publicado, os leitores continuam vendo a versão publicada com o
aviso **"Em atualização"** (tela, estante e link anônimo; não no PDF);
a revisão aberta tem **prazo** (padrão 30 dias, configurável), com indicador
"Revisão atrasada", prorrogação com motivo ou cancelamento pelo gestor;
"**revisado sem alteração**" renova a validade sem subir a revisão.

#### Página do documento (R3b1, `v0.6.4-alpha`)

`front/document.form.php` + `templates/document-form.html.twig` (CSS seção
14). Uma página só: sem `id` cria; com `id` edita (rascunho, editor/gestor)
ou mostra só leitura com os botões do fluxo que o usuário pode usar. **Não
tem regra própria**: tudo vem de `Document::can*()` e dos métodos do fluxo;
POST forjado é recusado pelas mesmas checagens (testado).

- Categorias em select múltiplo filtrado pelos setores que o usuário gere
  (`condition`; Ver todos vê todas). O servidor confere de novo. O documento
  não fica sem categoria (salvo Ver todos).
- Responsável editável só por quem gere o documento.
- TinyMCE com `enable_images = false` até a R3b3 (imagem colada ainda não
  teria onde ser guardada).
- Painel: quadro "Documentos do modelo novo (em teste)" com o botão "Novo
  documento (modelo novo)" (só para quem tem Criar e é gestor de algum setor,
  ou Ver todos) e os 10 mais recentes visíveis. Sai na R5, quando o Painel
  inteiro passa a ler o modelo novo.
- Editores e alvos de leitura ainda só pelo console (R3b2).

#### Coluna "Permissões" (R3b2-a, 21/09/2026)

Leitores (grupo, perfil, usuário) pela tela, na coluna à direita de
Categorias e Responsável (layout de Claudio, 20/09/2026), em
`templates/parts/doc-permissions.html.twig`, incluída na edição **e** na
visão: alvo de leitura é acesso, não conteúdo, então muda em qualquer status
— é justamente no publicado que se escolhe quem lê.

- **Quem vê a coluna:** quem gere o documento (muda), quem tem papel nele ou
  Ver todos (só a lista). O leitor comum não vê quem mais lê.
- **Não é formulário.** `public/js/codexplus-perm.js` manda para
  `ajax/document.targets.php` (`acao` = add, del ou list) e troca a lista
  pela que o servidor devolve. Recarregar no meio de uma edição perderia o
  que não foi salvo. Os campos têm nome `_cxt_*`, que o Salvar ignora.
- **Regra nenhuma nova:** o endpoint usa `can()` das ligações (trait
  `TargetRelation`: gerir o documento). Recusa o mesmo alvo duas vezes (as
  tabelas espelham as nativas e não têm chave única) e só apaga ligação do
  próprio documento. Perfil e grupo entram sem restrição de entidade; alvo
  restrito (só pelo console) aparece com a entidade entre parênteses.
- **Lista com fonte única:** `Document::listTargets()` (grupos, perfis,
  usuários, cada bloco por nome), usada pelo controller e pelo endpoint. A
  marcação do item está no Twig e no JS (`listaHtml`): mudou uma, mude a outra.
- **CSRF** como no autosave do diagrama (achado 43): a coluna tem o próprio
  campo de token, e o token novo de cada resposta vai para todos os campos da
  página.

#### Criação completa e editores na coluna (R3b2-b, parte 1, 22/09/2026)

Pedido de Claudio (21 e 22/09/2026): a criação já com tudo o que o documento
precisa, e o campo Cliente só em proposta.

- **Criação** mostra Responsável (começa com quem cria), Auditor
  responsável, Revisor e janela, e a coluna Permissões. O modelo já aceitava
  esses campos na criação (`Document::prepareInputForAdd` →
  `checkManagedFields`); só a tela e o controller não os mandavam.
- **Auditor por categoria:** a lista nasce vazia e é pedida a
  `ajax/document.auditors.php` a cada troca de categoria
  (`public/js/codexplus-docform.js`). O endpoint só lê e responde com a regra
  de `Document::canCreateIn`; o escolhido é conferido de novo ao gravar.
- **Cliente** (`client_name`) só em PRP: na criação o campo aparece e some
  com o tipo (`[data-cx-only-type]`), e o controller descarta o valor nos
  outros tipos.
- **Coluna Permissões com duas seções**, Leitura e Edição. Editores (usuário
  ou grupo) pelo mesmo endpoint `ajax/document.targets.php`, tipos
  `editor_user` e `editor_group`. Fonte única: `Document::PERM_TYPES`,
  `permRow()`, `listEditors()`. A linha "Editores" do rodapé só aparece
  quando a coluna não está na tela (leitor comum).
- **Coluna na criação ("pendente"):** o documento ainda não existe, então o
  JS guarda cada escolha num `_cxn_perm[]` ("tipo:id") dentro do formulário e
  o controller grava depois do Criar rascunho, pelas mesmas classes e
  checagens. Falhou algum: o rascunho fica criado e o aviso diz qual. Só
  aparece para quem tem Atualizar (sem ele, as ligações seriam recusadas).
- **Limitação conhecida:** criação recusada (auditor fora do setor, janela
  com uma data só) volta com o formulário vazio. A tela evita os dois casos.

#### Duplicar e botões da versão publicada (R3b2-b, parte 2, 22/09/2026)

- **Duplicar** (botão ao lado do código): documento NOVO, com código novo,
  a partir de um existente — título com "(cópia)", categorias, corpo (ou
  diagrama) e, em proposta, o cliente. Copia o que está **gravado** (numa
  revisão em andamento, a revisão). Responsável = quem duplica. **Não copia**
  auditor, revisor, janela, leitores nem editores: a cópia nasce como
  qualquer documento novo. Quem pode: quem lê o documento e pode criar em
  todas as categorias dele (`Document::canCreateIn`, a regra da criação).
  Não aparece na visão de uma versão publicada (`?version=N`).
- **"Ver a versão publicada"** e **"Voltar para a revisão em andamento"**
  deixaram de ser link no meio do texto e viraram botões dentro do aviso
  (`.cx-notice-actions`) — Claudio não os achava.

#### Imagem colada e anexos (R3b3-1, 22/09/2026)

- **Mecanismo nativo, como no KnowbaseItem:** o TinyMCE do documento abre
  com `enable_images` e `enable_fileupload`. O upload vai todo em `_filename`
  (com `_tag_`/`_prefix_`) — imagem colada inclusive, quando há área de
  anexos. O controller repassa esses campos (`$postedFiles`) e
  `Document::post_addItem`/`post_updateItem` chamam `addFiles`
  (`content_field = content`, `force_update`), que cria o documento do GLPI,
  a ligação `Document_Item` e regrava o corpo com o link definitivo.
- **Quem baixa:** o link leva `itemtype=GlpiPlugin\Codexplus\Document` e
  `items_id`, e o GLPI entrega se a pessoa lê o documento
  (`\Document::canViewFileFromItem` → nosso `can(READ)`). Conferido: leitor
  do publicado baixa; auditor de outro setor, não (achado 55).
- **Lista "Anexos"** (`Document::listAttachments`) fora de `#codexplus-doc`:
  não vai para o PDF. Imagem colada no corpo não entra na lista. Tirar =
  desfazer a ligação (o arquivo fica no GLPI), só quem edita, em rascunho;
  conta como alteração (quem tirou não valida).
- **Duplicar** liga os mesmos arquivos à cópia e reaponta o `items_id` dos
  links das imagens para ela.
- **Imagem sem link em volta** (Claudio, 22/09/2026): o GLPI embrulha a
  imagem colada num `<a target="_blank">`, e o editor passava a tratá-la como
  link. `addFiles` é chamado com `_add_link = false`, e
  `Document::unwrapImageLinks()` limpa o que já estava gravado no primeiro
  Salvar em rascunho (só o link para o próprio arquivo da imagem; links do
  usuário ficam).
- **Versões:** o corpo guardado na versão aponta para os mesmos arquivos,
  ligados ao mesmo documento; nada muda na revisão.

#### Leitura e PDF do documento novo (R3b3-2, 22/09/2026)

- A **visão** de `front/document.form.php` leva os cinco seletores do PDF
  (`#codexplus-doc`, `.codexplus-doc-title`, `.codexplus-content`,
  `#codexplus-pdf`, `#codexplus-print-config`) e usa o motor da 4c sem
  mudança: cabeçalho com título e logo, rodapé com marcadores, paginação.
  O JSON vem de `Branding::printConfig()` (o `front/article.php` do modelo
  antigo ainda monta o seu à mão até a R5).
- **Visualizar e PDF:** quem edita vê o botão na edição; `?view=1` abre a
  visão de leitura (com Editar para voltar). Mostra o que está salvo.
  **Só o documento** (Claudio, 25/09/2026): nessa janela não aparecem a
  revisão periódica editável, a coluna Permissões nem o fluxo; auditor,
  revisor, janela e editores saem como texto na linha de dados. Sem
  `?view=1` (documento fora de rascunho, que não tem janela de edição) a
  página continua com a gestão.
- **Versão não vigente sai marcada:** rascunho e etapas de validação levam
  "RASCUNHO — não é a versão vigente" (ou a etapa) na linha de
  identificação; obsoleto, "OBSOLETO". Chave `draft` no JSON, aceita por
  `getPrintConfig()` (que só copia chaves conhecidas — chave nova no JSON
  exige a linha lá também).
- **Leitor durante a revisão** imprime a versão publicada em vigor (código,
  título, corpo e data de publicação dela).
- **Diagrama** continua com o PDF do próprio motor (seção 3.4).
- **Cabeçalho e rodapé trocados** (Claudio, 22/09/2026, sobre o PDF real):
  o texto do rodapé configurado (código · revisão, com marcadores) vai para
  o cabeçalho corrido, acima do título, no lugar do título pequeno; a linha
  de identificação (aviso de rascunho · setor · responsável · data) sai de
  baixo do título grande e vai para o rodapé de todas as páginas, com a
  paginação. Com o rodapé desligado, a identificação fica sob o título. Vale
  para os dois modelos (o motor é um só). De passagem: `{revisao}` 0 saía
  vazio.

#### Editor de documentos (E1 a E4, 22 a 24/09/2026)

Item 6 da ordem até produção, pedido de Claudio: "TinyMCE melhorado",
tamanho de fonte, importar, exportar e editor de imagem. Tudo no navegador,
sem schema novo e sem tocar no núcleo. Arquivos: `public/js/codexplus-editor.js`
(E1, E2, ligação do E4), `public/js/codexplus-export.js` (E3),
`public/js/codexplus-annotate.js` (E4) e as bibliotecas em `public/lib/`
(cada uma com LICENSE e VERSION, carregadas só no clique).

**Como o plugin mexe no TinyMCE do GLPI (achado 59).** `Html::initEditorSystem`
guarda a configuração em `tinymce_editor_configs[id]` e chama `tinyMCE.init` no
mesmo passo. `CodexplusEditor.prepare(id)` põe um *setter* nessa chave: a
configuração passa por `customize()` antes do init. Só o editor
`codexplus-doc-content` é alterado. A linha no template antes de
`widgets.content` garante a ordem.

- **E1 — estilos fixos** (`1c793c8`). Menu **Estilo**: Título 1, 2 e 3 (`h2`,
  `h3`, `h4`: o `h1` é o título do documento no PDF), Parágrafo, **Nota** e
  **Atenção** (`p.cx-callout` + `cx-callout-note`/`-attention`, as classes que
  o PDF já conhecia). Botões **A− A A+** só na **seleção** (`span.cx-size-sm`/
  `-lg`, formato em linha como o negrito; na 1ª versão era o bloco inteiro e
  Claudio recusou). Trocar tamanho tira o outro antes: nunca span dentro de
  span (com `em`, multiplicaria). Título tira os tamanhos de dentro. **Medidas
  com fonte única nos tokens `--cx-size-sm` e `--cx-size-lg`** (seção 1 do
  CSS): tela, editor e PDF leem de lá; mudar o valor muda até os documentos já
  gravados. Barra sem cor livre; colado ou importado perde `font-family`,
  `font-size`, `color` e `background-color` (`invalid_styles`) — cor que já
  estava gravada some no próximo Salvar do rascunho.
- **E2 — importar** (`3118dd8`). Botão **Importar** só com o **corpo em
  branco** (decisão de Claudio: documento em andamento não importa; copiar e
  colar é livre). `.docx` pelo mammoth.js 1.12.3 (BSD-2), `.md` pelo marked
  18.0.14 (MIT). Títulos deslocados um nível (h1→h2, h2→h3, h3+→h4), âncoras
  vazias do Word fora. Inserção por `setRichTextEditorContent` do GLPI (o
  caminho da colagem): as imagens do arquivo sobem como imagem colada e são
  gravadas ao Salvar. `.doc` antigo é recusado com a instrução de salvar como
  `.docx`.
- **E3 — exportar Word** (`1eaf22e`). Botão **Exportar Word** ao lado do
  Exportar PDF, na visão de leitura (não em diagrama). Biblioteca docx 9.7.2
  (MIT, `dist/index.iife.js` minificado com terser). **Usa as regras do PDF**:
  `codexplus.js` expõe `window.CodexplusPrint` (config, marcadores, linha de
  identificação, nome do arquivo) — nada copiado. Cabeçalho com código · rev e
  logo; título com traço; rodapé com a identificação (inclusive RASCUNHO) e
  `N / M` em campos do Word. Títulos viram os **estilos de título do Word**
  (painel de navegação e sumário funcionam). Nota/Atenção com faixa e fundo,
  A−/A+ como tamanho, listas numeradas recomeçando a cada lista, tabelas,
  links e imagens (baixadas com a sessão; SVG/WebP passam por canvas e viram
  PNG). No mesmo pacote: tabela no **editor** com largura total e bordas.
- **E4 — anotador de imagens** (`68b7b09`). Botão **Anotar** na barra e na
  barrinha que aparece ao clicar numa imagem. Ferramentas: Selecionar, Seta,
  Retângulo, Círculo, Destaque, Texto, Passo (①②③ automático, renumera ao
  excluir), Ocultar (pixela: senha, IP, dado pessoal) e Recortar; 5 cores
  fixas; **Tamanho P/M/G** por marca, que no Destaque e no Ocultar é a
  **intensidade**. Destaque nasce amarelo e aceita as outras cores (cor
  guardada à parte). Desfazer, refazer, Delete, duplo clique edita texto.
  **Editável depois** (opção 2 de Claudio), sem tabela nova:
  `<span class="cx-annot" data-cx-orig="URL do print" data-cx-annot='{"v":1,
  "w","h","crop","marks":[…]}'><img src="PNG anotado"></span>`. Marcas em
  pixels do **original**. Ao Salvar o GLPI troca só a `<img>` (achado 56) e o
  span fica. O PNG anotado sobe por `uploadFile` + `uploaded_images` do
  `fileupload.js` (achado 60), com nome `cx-anotacao-*.png`; PNG de anotação
  substituída fica órfão e `Document::listAttachments` o ignora pelo nome. O
  original não aparece em Anexos porque a URL dele (com `docid=`) está no
  corpo. **Imagem recém-colada precisa ser salva antes de anotar** (sem
  endereço fixo do original). O Salvar espera o envio da imagem anotada
  terminar (senão gravaria `blob:`). Duplicar reaponta também o `data-cx-orig`
  (a regex do `items_id` pega todas as ocorrências). Leitura, PDF e Word usam
  só a `<img>`.
- **Janela nativa "Inserir/editar imagem" removida** (E4-3, achado 58): o
  plugin `image` do TinyMCE sai da configuração; no lugar, o botão próprio
  `cxinsertimage` (arquivo do computador, pelo mesmo envio das coladas). Colar
  e arrastar continuam pelo `glpi_upload_doc`. Bônus: imagem por endereço
  externo, que não sairia no PDF nem no acesso anônimo (R7), deixa de existir.

#### Tipos novos e cliente vinculado (bloco T1, `v0.6.9-alpha`, 24/09/2026)

Decisões de Claudio, 24/09/2026. Tipos na tabela da seção 1; aqui, o cliente.

- **Onde os clientes estão depende da instalação.** Na Teckcomp, cadastrados
  como usuários; em outros cenários, como entidades. A configuração do
  Codex+ (`front/config.form.php`, seção "Clientes dos documentos") grava
  `client_source` (`User` ou `Entity`) no contexto `plugin:codexplus`
  (`Branding::DEFAULTS`, `getClientSources()`, `clientSource()`).
- **Vínculo no padrão do `Document_Item` nativo:** colunas
  `client_itemtype` + `client_items_id` no documento, com índice `client`.
  O tipo vai gravado junto: mudar a configuração não estraga os documentos
  antigos, e documento já vinculado mantém a lista do tipo dele na edição.
- **Só em `LAU` e `DTC`** (`DocumentMeta::CLIENT_LINK_TYPES`,
  `linksClient()`). Proposta continua em texto livre
  (`CLIENT_TEXT_TYPES`): o cliente pode ainda não estar cadastrado.
  `hasClient()` cobre os dois.
- **Regra com fonte única em `Document::normalizeClient()`**, chamada no
  `prepareInputForAdd` e no `prepareInputForUpdate`: tipo sem vínculo
  ignora os campos; id 0 ou -1 tira o cliente; itemtype fora da lista vira
  o da configuração; cadastro inexistente é recusado; a entidade raiz não é
  cliente (a lista usa `used => [0]` e `-1` como vazio). Os dois campos
  estão em `CONTENT_FIELDS`: fora de rascunho não mudam, e mudar conta como
  alteração (quem mudou não valida).
- **`client_name` vira o retrato do nome** na hora da escolha. Por isso o
  Histórico (opção de busca 9, achado 33), o Painel e a estante funcionam sem
  mudança. A tela e o PDF usam o nome **atual** (`Document::clientLabel()`),
  e o retrato só se o cadastro sumiu.
- **Não dá leitura a ninguém.** Quem lê continua na coluna Permissões.
- **PDF e Word:** "Cliente:" na linha de identificação de qualquer tipo que
  tenha cliente (`buildIdentLine` deixou de testar `PRP`; quem monta o JSON
  só manda cliente nesses tipos). Proposta continua sem "Responsável".
- **Formulário:** `data-cx-only-type` aceita lista separada por espaço
  (`"LAU DTC"`) em `codexplus-docform.js`.
- **Duplicar** copia o vínculo.

#### Validação em duas etapas e revisão periódica (R3d, 21/09/2026)

Decisões de Claudio, 21/09/2026, sobre as da R3c:

- **Duas etapas.** rascunho → `aprovacao` (aguardando gestor) →
  `validacao` (aguardando auditor) → publicado. Devolver vale nas duas, com
  motivo. Métodos: `submit()`, `managerApprove()`, `approve()`, `reject()`.
- **1ª etapa, gestor do setor** (`canApprove`: Atualizar + gestor). Aprova
  mesmo tendo editado: só gestor cria, e ele é quase sempre o autor.
- **2ª etapa, auditor responsável** (`users_id_auditor`, `canValidate`): bit
  Validar + ser o auditor do documento + ainda auditor do setor + não ter
  alterado nesta revisão. O papel "validador" do setor passou a se chamar
  **Auditor** (a chave gravada continua `validador`; console aceita
  `--role=auditor`). O auditor é escolhido por quem gere o documento, entre os
  auditores do setor (usuários diretos e membros dos grupos —
  `SectorMember::usersOfRole()`), só em rascunho; enviar exige auditor.
- **Super-Admin pode tudo, definitivo** (Claudio, 21/09/2026): "Ver todos"
  envia sem auditor e passa pelas duas etapas. Não é pendência de produção.
  *Desde a A2 o Super-Admin é o perfil com Configurar > Atualizar, não o Ver
  todos (subseção "Quem aprovou não valida").*
- **Revisor** (`users_id_reviewer`): papel novo, só para a revisão
  periódica. Tem papel no documento (lê em qualquer status). Abrir a revisão e
  "revisado sem alteração" continuam na R6.
- **Janela de revisão** (`review_start`, `review_end`, datas): quem gere o
  documento escolhe, em qualquer status (fora de rascunho, pelo formulário
  "Salvar revisão periódica"). As duas datas ou nenhuma. Vazia na publicação,
  é calculada pela regra do tipo (`Document::defaultWindow`): fim = publicação
  + validade do tipo; início = fim − 30 dias. **O vencimento passa a ser o fim
  da janela** (`DocumentMeta::expiryState(..., $reviewEnd)`, ainda fonte
  única; sem janela, a regra antiga).
- **Aviso "aguardando …"** na página: gestores do setor ou o auditor
  (`Document::pendingWith()`). E-mail ao enviar fica para a Etapa 7.
- **"Aguardando você" no Painel (R3d-1)** — `Dashboard::pendingForMe()`: 1ª
  etapa para o gestor do setor, 2ª para o auditor responsável. Mesma regra dos
  botões; quem responde pela etapa mas não pode agir (perfil sem o bit,
  auditor que editou ou saiu do setor) aparece com o motivo e sem o botão. O
  Ver todos não entra só por poder tudo. Na página do documento, o mesmo
  motivo vira aviso (antes o botão só sumia — caso real: perfil Tecnicos N1
  sem o bit Validar, 21/09/2026).
- Documento que estava em `validacao` antes da R3d fica na 2ª etapa, sem
  auditor: só o Super-Admin valida (ou devolve, para escolher o auditor).

#### Auditor pelo perfil (bloco A1, 25/09/2026)

Decisão de Claudio, 25/09/2026: o auditor, na rotina, é alguém do setor de
Auditoria, e cadastrá-lo como auditor em cada setor não faz sentido. **O
auditor passa a vir do perfil**, e o papel "auditor" do setor sai de uso.
Substitui o que a R3d diz sobre auditores do setor.

- **Coluna "Auditor"** na aba Codex+ de Perfis: é o bit 8192, antes rotulado
  "Validar". Mesmo bit, sem migração: perfil que o tinha continua valendo.
- **Quem pode ser auditor** (`Rights::auditorUsers($entidade)`): usuário
  ativo, não excluído, com um perfil da interface padrão que tenha o bit,
  atribuído na entidade do documento ou numa entidade acima com recursivo.
  Vale para **qualquer setor**. Perfil Self-Service fica fora (achado 27). O
  Super-Admin aparece na lista (tem todos os bits).
- **Validar** (`canValidate`): bit no perfil **ativo** + ser o auditor
  responsável + não ter alterado nesta revisão. Quem tem mais de um perfil
  precisa estar no que tem o bit; o aviso da página e o motivo do Painel
  dizem isso.
- **Lista na página:** vem pronta do servidor, pela entidade (na criação, a
  entidade ativa). `ajax/document.auditors.php` e a parte do auditor em
  `codexplus-docform.js` saíram: a lista não depende mais das categorias.
  Auditor gravado que perdeu o perfil aparece como "(sem perfil de auditor)";
  enviar recusa.
- **Setor:** só Gestores. Linhas antigas `validador` em `sectormembers`
  continuam no banco, não são lidas por regra nenhuma e aparecem no console
  como "Auditor (fora de uso)"; `--role=auditor` é recusado (serve só com
  `--remove`, para limpar). Higiene fora do Install.
- **Leitura:** o auditor de setor dava papel (lia rascunho de todo o setor).
  Isso acabou: o auditor lê em qualquer status só os documentos em que é o
  auditor responsável.

#### Quem aprovou não valida; Super-Admin pelo perfil (bloco A2, 25/09/2026)

Decisões de Claudio, 25/09/2026. **Precisa reinstalar** (coluna nova).

- **Super-Admin = perfil com Configurar > Atualizar** (`Rights::isSuperAdmin()`,
  o mesmo critério do Install), e não mais "Ver todos". **Pode tudo no fluxo,
  sem regra**: valida qualquer documento sem o bit Auditor, e só ele envia sem
  auditor escolhido. Não aparece na lista de auditores, mesmo com o bit.
- **O Install deixa de dar o bit Auditor ao Super-Admin** (`Rights::ALL &
  ~Rights::VALIDATE`). É OU bit a bit, então não tira: quem já tinha desmarca
  uma vez na aba de Perfis, e a reinstalação não devolve.
- **"Ver todos" não dispensa mais as regras da validação.** Continua valendo
  para leitura, criação e gestão. Motivo: na homologação o perfil Auditoria
  tem Ver todos, e com a regra antiga validava qualquer documento, sem ter
  sido escolhido e mesmo tendo editado.
- **Quem aprovou a 1ª etapa não valida a 2ª** (`users_id_approver`), salvo em
  documento **só de setor de auditoria** (`Document::isAuditSectorOnly()`:
  todos os setores do documento marcados; basta um setor comum para a regra
  valer). "Quem editou não valida" continua valendo também no setor de
  auditoria.
- **Setor de auditoria:** campo `is_audit` em `glpi_plugin_codexplus_sectors`
  (Sim/Não no cadastro do Setor, coluna na lista, no Histórico pela opção de
  busca 10).
- **O auditor impedido pode devolver** (`canReject`): editou ou aprovou a 1ª
  etapa, com o bit Auditor. Sem isso o documento ficava preso até o
  Super-Admin agir.
- **Motivo com fonte única:** `Document::validationBlocker()` devolve
  `perfil`, `alterou` ou `aprovou`; a página (`validation_block`,
  `missing_right`), o Painel e a mensagem do `approve()` leem dele.
- **A seguir:** R3b2-c (aba Papéis no Setor, só Gestores).

#### Revisão de documento publicado (R6-a, `v0.6.8-alpha`, 21/09/2026)

Decisões de Claudio, 21/09/2026.

- **Versões guardadas.** Cada publicação grava título, corpo e **diagrama**
  (coluna nova `diagram`) em `glpi_plugin_codexplus_documentversions`, uma
  linha por revisão (`DocumentVersion::snapshot`, chamado em `approve()`).
  Documento publicado antes da R6 ganha a cópia ao abrir a primeira revisão
  (dado não vai no Install). `DocumentVersion` não é CommonDBTM (permissão é
  a do documento) nem entra em getDatabaseRelations (achado 38).
- **Abrir revisão** (`openRevision`): gestor do setor a qualquer momento, ou
  o **revisor dentro da janela** (com Atualizar). A revisão sobe (:00 → :01)
  e o documento volta a rascunho **com o conteúdo atual**. O revisor passa a
  editar a revisão, junto com os editores.
- **Leitores durante a revisão** veem a **versão publicada anterior** — tela
  e PDF — com o aviso "Em atualização" (só na tela). `isInRevision()` =
  revisão > 0 fora de publicado/obsoleto; `canViewItem` e a SQL aceitam esse
  estado para os alvos. Quem tem papel vê a revisão em andamento e abre a
  publicada por `?version=N` (só leitura, sem fluxo nem Permissões).
- **Envio de uma revisão exige o resumo** do que mudou (`revision_summary`),
  escrito por quem envia; vai para a versão ao publicar. Publicar uma revisão
  é publicação nova: data de hoje e janela recalculada.
- **Cancelar revisão** (gestor): descarta a revisão e restaura título, corpo
  e diagrama da versão anterior, como publicado.
- **Revisado sem alteração** (`confirmNoChange`, gestor ou revisor na
  janela): vale na hora, **sem auditor**; renova a janela a partir de hoje
  pela regra do tipo, sem subir a revisão. Tipo sem validade (proposta):
  janela à mão.
- **Painel:** revisão em andamento conta como publicado (é o que está no ar),
  com a etiqueta "em atualização" e o código da versão em vigor; entra em
  "Em revisão".
- **R6-b (depois):** prazo da revisão aberta, "Revisão atrasada",
  prorrogação motivada, histórico de revisões no fim do PDF.

Perde-se: tradução de artigos e a integração com FAQ nativa/Self-Service
(o acesso anônimo cobre a necessidade de leitura sem login).

### 3.5 Sessão de 26/09/2026 — papéis, fluxos, Biblioteca, planilha e quadro

> Decisões de Claudio, 26/09/2026. **Substituem** o que as subseções R3c,
> R3b2-a/b (editores) e R3d dizem sobre gestor do setor, editores do
> documento e "quem editou não valida". O que vale hoje está aqui.
> Commits `66f9b2b` a `6a1f8ee`.

#### Papéis pelo perfil (bloco P1, `66f9b2b`)

- **Sem papel de setor e sem lista de editores.** O setor é só organização
  da estante. `SectorMember`, `DocumentEditor` e o comando `sector:member`
  saíram; as tabelas `sectormembers` e `documenteditors` ficam no banco sem
  uso (limpeza no backlog).
- **Bits do perfil** (aba Codex+ de Perfis): **Ler** (1), **Criar** (4),
  **Revisar e editar** (2), **Aprovar** (16384, novo), **Auditar** (8192),
  Excluir (8), Ver todos (1024), Publicar anônimo (2048), Gerenciar modelos,
  setores e categorias (4096). `Rights::usersWithBit()` monta as listas:
  `approverUsers` (Aprovar, com Super-Admin), `auditorUsers` (Auditar, sem
  Super-Admin), `reviewerUsers` (Revisar e editar, com Super-Admin).
- **No documento:** **Responsável** = gestor do documento (escolhido entre
  quem tem Aprovar; aprova a 1ª etapa e gere o documento), **Auditor**
  (Auditar; aprova e publica ou devolve com o que corrigir, **não edita**),
  **Revisor** (Revisar e editar). **Editam o rascunho:** responsável, revisor
  e autor. **Gere** (leitores, papéis, janela, categorias, obsoleto,
  excluir): o responsável; em rascunho, também o autor. Criar exige só o
  bit Criar, em qualquer categoria.
- **Observação na aprovação e na auditoria** (opcional), em
  `validation_comment`, mostrada na página ("Observação do responsável" /
  "Observação da auditoria"). Devolver exige "o que corrigir".
- **Regras que ficam:** "quem aprovou não audita" (salvo setor de auditoria
  e Super-Admin); responsável e auditor não podem ser a mesma pessoa no
  envio. **Saiu:** "quem editou não valida" (o auditor não edita).
- **Super-Admin** (Configurar > Atualizar) pode tudo e **lê tudo pela
  regra** (`canViewItem` e `getVisibilityCriteria`), mesmo sem Ver todos.
  **"Ver todos" é só leitura** — é onde mora a "leitura completa" de
  auditoria e revisão (decisão de 20/09: "auditor com Ler e Ver todos lê
  tudo, mas não edita").

#### Fluxo por tipo (bloco P2, `8348aee`)

Fonte única em `DocumentMeta::FLOW_BY_TYPE` / `flowOf()`:

| Fluxo | Tipos | Como publica |
|---|---|---|
| `full` | POP, PSG, MAN, DIV, DIA | Responsável aprova → auditor audita e publica |
| `one` | DTC | Responsável aprova e já publica; tem revisor e revisão periódica, sem auditor |
| `direct` | PRP, LAU | O responsável clica **Publicar** no rascunho; sem auditor, revisor nem revisão periódica; revisão (:01) também publica direto, com resumo |

`Document::dropUnusedRoles()` ignora os papéis que o tipo não usa; na
criação, `data-cx-only-type` mostra e esconde os campos. No PDF e no Word
dos tipos `direct` o "rev. {revisao}" sai do cabeçalho (`norev` no JSON de
impressão).

#### Self-Service e Biblioteca (blocos S1 e B1, `a9d5ef4`)

- **Self-Service só lê**, condicionado à coluna Leitura do documento.
  `plugin_init` acrescenta `plugin_codexplus_wiki` a
  `Profile::$helpdesk_rights` (achado 27) e reduz o direito da sessão a Ler.
  `Document::bit()` recusa qualquer bit além de Ler na interface
  simplificada (defesa). Aba Codex+ em Perfis aparece também no perfil
  Self-Service, só com "Ler". Páginas usam `Wiki::pageHeader()` /
  `pageFooter()` (`Html::helpHeader` na interface simplificada).
- **Menu:** no Self-Service o Codex+ entra **direto na barra** (depois de
  FAQ) por `Hooks::REDEFINE_MENUS` (`plugin_codexplus_redefine_menus` no
  hook.php).
- **Quem só lê entra na Biblioteca; quem produz, no Painel.**
  `Rights::isProducer()` = Super-Admin ou qualquer bit além de Ler (Criar,
  Revisar e editar, Aprovar, Auditar, Ver todos, Gerenciar). O Self-Service
  nunca é produtor. O Painel redireciona leitores para a Biblioteca.
- **Biblioteca** (`src/Library.php`, `front/library.php`,
  `templates/library.html.twig`): prateleira **Setor → Categoria** (blocos
  que abrem e fecham), busca por título/código e filtro por tipo no
  navegador; documento em várias categorias aparece em cada uma; sem
  categoria vai para "Sem setor / Sem categoria". Cliente só nos tipos com
  cliente.

#### Criação pelos modelos e tela Modelos (blocos R3b4 e M1, `a9d5ef4`)

- Campo **Modelo** ao lado do Tipo (no DIA o lugar é do Subtipo): modelos do
  tipo, padrão marcado, "Em branco"; preenche o corpo; pergunta antes de
  substituir texto escrito; busca (Select2) a partir de 10 opções
  (`Template::listForCreation`, `codexplus-docform.js`).
- **Salvar como modelo** na página do documento (quem tem Gerenciar
  modelos; não em diagrama): o corpo gravado vira modelo do mesmo tipo.
  **Modelo não guarda imagem** (`Template::stripImages`): a imagem é arquivo
  de um documento só.
- Tela **Modelos**: direito do Codex+ (Gerenciar modelos), mesmo editor dos
  documentos (sem botões de imagem), tipos sem DIA.
- Saíram os caminhos que criavam artigo na Base de Conhecimento.

#### Editor: cor, realce e estilo (bloco E5, `a9d5ef4`)

- **Cor do texto** (5) e **realce** (4) em **paleta fixa**, por classe
  (`cx-fg-*`, `cx-bg-*`), fonte única em `PALETTE` (`codexplus-editor.js`):
  editor, leitura (folha injetada na página), PDF (`sizeCss`) e Word.
  Realces em tom forte (Claudio pediu: os claros puxavam para o pastel).
- Estilo (título/parágrafo) é **de bloco** por natureza; a seleção que só
  encosta na linha vizinha não a leva junto; Enter depois de título gera
  parágrafo.
- O E5 foi pedido num trecho de conversa que se perdeu; apareceu na cópia
  de trabalho de quem gera pacotes antes de ser explicado (achado 71).

#### Migração e fim da Base de Conhecimento (blocos R4 e R5, `8d6c017`)

- **R4** (`src/LegacyMigration.php`, `front/migrate.php`, só Super-Admin,
  prévia e confirmação): a linha do documento é a mesma (código, situação,
  responsável, datas preservados); do artigo vêm título, corpo, entidade,
  autor, categorias (criadas no Codex+ pelo caminho, sem setor), leitores
  (perfil, grupo, usuário; por entidade não existe no Codex+ e é avisado) e
  arquivos (Document_Item a mais e links das imagens reapontados). Grava a
  data de hoje e "Migrado do artigo #N" no Histórico. Artigo intocado.
  **Os 5 documentos foram migrados em 26/09/2026.**
- **R5:** Biblioteca para quem produz com **Situação** (padrão Publicados),
  "Só os meus" (responsável) e **Lixeira** com Restaurar; botão **Excluir**
  na página do documento; busca do Painel abre a Biblioteca em "Todos".
  **Saíram** a aba Documentos antiga (`wiki.php`), leitura/edição de artigo,
  "Novo documento" antigo, a aba Codex+ na ficha do artigo e o envio de logo
  da edição antiga. Abas: Painel · Biblioteca · Modelos (Modelos só para
  quem gerencia). O Codex+ não lê mais `glpi_knowbaseitems` (só a Migração,
  enquanto houver o que migrar). Recomendação a Claudio: tirar o direito
  nativo da Base de Conhecimento dos perfis (menos Super-Admin) e o "Ler"
  de Gestão > Documentos dos leitores (achado 55).

#### Cronograma e matriz RACI (bloco D1, `9d30375`)

Subtipos de `DIA` (campo Subtipo na criação; `kind` no JSON é a fonte do
subtipo, `Diagram::subtypeOf`). Motor de grade `public/js/codexplus-grid.js`:
cronograma (tarefas × períodos relativos S/M/T/A, célula vazio → período →
marco) e RACI (atividades × papéis, R/A/C/I, aviso de "A" ausente ou
repetido). Colunas com largura mínima e rolagem, primeira coluna fixa. PDF
com **orientação automática** (retrato se couber; senão paisagem, colunas
em blocos repetindo Tarefa/Responsável). Diagramas seguem o fluxo de POP e
Manual.

#### Planilha no editor (bloco PL1, `820236c` e `974fa23`)

Botão **Planilha** (`public/js/codexplus-sheet.js`): bloco
`div.cx-sheet[contenteditable=false][data-cx-sheet]` com a `<table>` já
calculada; duplo clique reabre. Colunas texto/número/moeda; fórmula da
coluna (`=A*C`) e da célula (`=A1*C1`, SOMA, MÉDIA, MIN, MAX), sem eval;
números pt-BR. Modelo padrão da proposta: **Qtd, Item, Unitário, Total**.
Total soma a coluna calculada, com "Total" colado no valor; linhas
alternadas em azul; linha vazia sai em branco; bordas próprias. Leitura,
PDF e Word usam a tabela.

#### Motor de quadro — Planta e Topologia (bloco Q1, `6a1f8ee`)

**Decisão: um motor de quadro só, no estilo Miro, com paletas** —
Planta (Proposta), Topologia (Documentação Técnica), depois Fluxograma e
Organograma (migrado, conferindo item por item). Os dois blocos (Planta e
Topologia) ficam disponíveis no editor dos dois tipos.

- Arquivos: `public/js/codexplus-board.js` (motor) e
  `public/js/codexplus-icons.js` (ícones).
- **Ícones próprios** (34, sem terceiros), 6 categorias com cor
  (rede, núcleo, segurança, estações, infraestrutura, proteção), padrão:
  viewBox 48, área útil 44, traço 2 arredondado, preenchimento claro + traço
  da categoria, sem texto, câmeras apontando para a direita. **Equipamento
  genérico** com categoria escolhida. Ícone novo = uma linha em `LIST`.
- **Gravado no corpo:** `span.cx-board[data-cx-board=JSON]` com, na planta,
  a imagem da planta (primeira `<img>`, escondida) e o **PNG do quadro**
  (última `<img>`, a única que aparece). Imagens sobem como coladas
  (`cx-quadro-*.png`, `cx-quadro-fundo-*.jpg`), ignoradas na lista de
  Anexos. **Regra por posição**, não por classe (achado 67).
- **Quadro:** paleta com busca; arrastar o fundo move a vista, roda dá
  zoom, Shift + arrastar seleciona em área; grade 10 e guias de
  alinhamento; zona/área, texto; agrupar, travar, copiar/colar, duplicar,
  excluir, desfazer/refazer; Ícone −/+ e alça de tamanho; **girar** ícone
  (R, 90°; painel de 15 em 15°); o nome acompanha o tamanho e não gira.
- **Câmeras:** um ícone por câmera, nascem **sem cone**; "Mostrar o cone"
  no painel, com direção, abertura e **alcance em metros** (rótulo na ponta).
- **Planta:** enviar planta (imagem, até 2400 px), transparência, **girar
  planta 90°** (itens giram junto), **Escala** (dois pontos + metros;
  `pxm` no JSON; sem escala, 1 m = 20 px aproximado; trocar a planta zera).
- **Painel do ícone:** rótulo, modelo, IP, VLAN, observação.
- **Especificação de ícones** para o conjunto oficial combinada com Claudio
  (SVG simples, viewBox 48, traço 2, cores da tabela de categorias, nome
  `categoria-nome.svg`, `icones.csv` com nome, categoria, busca, cone).

#### Ligações e cabos — Q2a a Q2e (27/09/2026)

Tudo no JSON do quadro (`data-cx-board`), validado em `clean()`; sem schema.
Arquivo `public/js/codexplus-board.js` e fim da seção 23 do CSS. Commits
`8e71046` (Q2a), `87c94a7` (Q2b e Q2c juntos, achado 75), `290d92b` (Q2d) e
`cd8a64f` (Q2e).

- **Item `link`**: `{a:{id,side}, b:{id,side}, kind, route, wp, ends, label,
  cable, pa, pb, vel, vlan, poe, showId, fs, len:{mode,m,extra}, showM}`.
  `side` = n/l/s/o (borda do ícone; a borda sul fica **abaixo do nome e do
  IP**). Sem x/y: a posição vem dos ícones e a ligação acompanha. Ligação sem
  um dos ícones é descartada no `clean()` e sai junto ao excluir o ícone.
  Camadas: zonas → eletrocalhas → ligações → ícones e textos.
- **Criar:** ícone selecionado mostra 4 alças azuis fora das bordas; puxar até
  outro ícone liga na borda mais próxima de onde soltou. Soltar no vazio não
  cria nada (forma ligada é do Fluxograma, Q5). Nasce **UTP Cat6, cotovelo,
  P-00n** (Claudio, 27/09/2026, no mockup).
- **Tipos** (`LINK_KINDS`, tipo novo = uma linha): Cat5e, Cat6, Cat6A (azul,
  engrossando), fibra (roxo), coaxial/vídeo (laranja), elétrica (vermelho),
  sem fio (tracejado), lógica/VPN (pontilhado, nasce com seta), outros.
  Pontas: sem seta, no destino, nas duas (triângulo desenhado, sem
  `<marker>`, para o PNG).
- **Nome do cabo:** identificação (P-001, próximo número livre; colar dá
  número novo), rótulo, metros e PoE, em caixinha no meio do traçado. O
  tamanho **acompanha o menor ícone das pontas**, como o nome do ícone, com
  Pequeno/Médio/Grande (Claudio, 27/09/2026: com ícones reduzidos o nome do
  cabo ficava grande demais).
- **Traçado:** reto, cotovelo, curvo. **Dobra = duplo clique no cabo; Ctrl
  (Cmd) + duplo clique na dobra apaga** — proposta de Claudio, 27/09/2026,
  que substituiu o ponto no meio de cada trecho (criava dobra a cada
  arraste). Dobra **livre, sem grade**, encaixa na linha/coluna da dobra ou
  ponta vizinha a 6 px de tela (guia rosa); **Alt** solta. Endireitar tira
  todas. O cotovelo vira sempre perpendicular ao trecho anterior e junta
  trechos alinhados (sem ganchos). Mover os dois ícones leva as dobras;
  mover um só não. **Religar:** bolinha branca na ponta arrasta para outra
  borda ou outro ícone.
- **Metragem:** automática = traçado desenhado ÷ escala (`pxm`) + sobra (10%,
  ajustável); ou manual. Sem escala, 1 m = 20 px, com aviso no painel.
- **Escala:** uma medida basta — a planta é gravada com a proporção
  original. Duas medidas que dão escalas muito diferentes indicam metros
  digitados errados: medir a maior cota escrita na planta, nas mesmas faces
  que ela mede (cota de cômodo é interna); 1 pé = 0,3048 m (Claudio e
  Claude, 27/09/2026).
- **Eletrocalha e canaleta** (item `duct {pts, kind, label, showM, fs}`):
  botão Eletrocalha (atalho E); cada clique é um ponto, duplo clique ou Enter
  termina, Esc cancela sem fechar o quadro; pontos livres com o mesmo
  encaixe das dobras. Duplo clique na faixa cria ponto, Ctrl + duplo clique
  apaga (mínimo 2). Metragem própria, sem sobra. Nome a 1/4 do caminho, para
  não colidir com o do cabo que passa por dentro.
- **Faixa de clique** de cabo e eletrocalha com 14–16 px **na tela** em
  qualquer zoom (achado 74).

#### Leitura sem recolher (achado 65)

`RichText::getEnhancedHtml(..., ['text_maxsize' => 0])` na página do
documento: o GLPI recolhia corpo acima de ~4000 caracteres ("..." com
degradê) e o PDF saía em branco. Vale para todos os tipos.

### 3.6 Sessão de 27/09/2026 (tarde) — ferramentas por tipo, quadro e ícones

> Decisões de Claudio, 27/09/2026. Commits `5396fe9` a `a76b16c`
> (`0.6.10-alpha` desde o Q4a, que criou a tabela de ícones). Tudo foi
> entregue em pacotes pequenos com mockup antes (achado 75 respeitado:
> commit de cada bloco antes do seguinte).

#### Ferramentas do editor por tipo (bloco T2, `5396fe9`)

Matriz em `TOOLS_BY_TYPE` (`codexplus-editor.js`), decidida por Claudio:

| Tipo | Texto e imagens | Planilha | Planta | Topologia |
|---|---|---|---|---|
| POP, PSG, MAN | ✓ | | | |
| PRP | ✓ | ✓ | ✓ | |
| LAU, DTC | ✓ | | ✓ | ✓ |
| DIV | ✓ | ✓ | ✓ | ✓ |
| DIA | editor próprio por subtipo (regra à parte) | | | |

- O tipo vem do `select[name=doctype]` (documento novo e tela Modelos, onde
  muda na hora) ou do `data-cx-doctype` na zona do corpo (documento criado).
  Tipo desconhecido ou vazio mostra tudo.
- Esconde pelo CSS em `html[data-cx-hide~=…] [data-mce-name=…]` (achado 76),
  com guarda no clique. **Esconder não bloqueia o que já está no texto:**
  planilha e quadro existentes abrem com duplo clique em qualquer tipo.

#### Quadro: baixar PNG (bloco Q2f, `5abf41a`)

Botão **Baixar PNG** na barra do quadro (Planta e Topologia): o mesmo
`toPng()` do Salvar, com o estado atual (mesmo sem salvar), sem fechar o
quadro. Nome `planta|topologia-<título-sem-acento>-AAAA-MM-DD.png`.

#### Duplicar como (bloco T3, `5149252`)

O tipo **não muda** depois de criado (forma o código). Para "converter"
(ex.: um DIV que virou POP): **Duplicar como ▾**, ao lado do Duplicar, com os
outros tipos pelo nome completo (Claudio preferiu dois botões a um select).
Nasce documento novo, em rascunho, com o código, o fluxo e a validade do tipo
novo; título igual (sem "(cópia)"); o original não muda. DIA fica fora nos
dois sentidos. Cliente: Proposta→Proposta leva o texto; LAU↔DTC leva o
vínculo; LAU/DTC→Proposta leva o nome como texto; os demais casos não levam
e avisam (`DocumentMeta::duplicateTargets`, `duplicateType`, `clientCarry`).

#### Lista de materiais e legenda (blocos Q3a `4328f38` e Q3b `a3266a8`)

- **Q3a — materiais no painel do quadro** (`materials()`): sem seleção, o
  painel da direita mostra "Materiais deste quadro"; com vários itens,
  "Materiais da seleção" (entra também o cabo entre dois ícones
  selecionados). Equipamentos pelo nome do ícone, com "· modelo" quando o
  Modelo está preenchido (genérico: pelo rótulo); cabos por tipo, **metro
  inteiro para cima em cada lance**, somados (Sem fio e Lógica/VPN fora);
  eletrocalha e canaleta por trecho, para cima, sem sobra; aviso de metros
  aproximados sem escala. Só leitura.
- **Q3b — legenda no documento, como imagem** (Claudio escolheu imagem a
  tabela de texto: só a imagem mostra o símbolo; leitura, PDF e Word já
  funcionam). Caixa "Legenda abaixo do quadro" (campo `legend` do JSON;
  quadro novo nasce marcado, quadro gravado antes do Q3b fica sem até
  marcar). Ao salvar, gera `cx-quadro-legenda-*.png` (1, 2 ou 3 colunas; um
  item por tipo usado: cabos, inclusive sem fio e lógica, eletrocalha,
  canaleta e ícones) num `span.cx-board-legend[contenteditable=false]` no
  parágrafo logo abaixo do quadro. PNG em 2x com `width`/`height` de 1x
  (achado 78). Duplo clique na legenda abre o quadro. Legenda sem quadro
  antes dela sai do gravado pelo `PreProcess` (achado 77).
- **Q3c ("Levar para a planilha") — cancelado por Claudio** (27/09/2026):
  não é necessário. Não voltar como pendência.

#### Editor na Proposta e no Laudo (bloco E6, `254c576`)

> **Ajusta o P1** (que tirou a lista de editores): no fluxo direto há um
> papel para quem monta o documento para o responsável.

Campo **Editor** na Proposta e no Laudo (espaço que ficava vazio sem auditor
e revisão periódica). É o **mesmo papel do revisor** (`users_id_reviewer`,
bit Revisar e editar): edita o rascunho e vê o documento; **não publica** —
o `canPublishDirect()` continua só com o responsável (Claudio: "para publicar
necessita autorização do Responsável"). Vem num campo próprio
(`users_id_editor`) porque, na criação, o "Revisor" dos outros tipos também
está na página; `Document::dropUnusedRoles()` converte no fluxo direto e
descarta nos outros. Linha de papéis mostra "Editor"; fora de rascunho o
botão é "Salvar editor". A tabela `documenteditors` continua sem uso.

#### Ícones criados pelo Super-Admin (blocos Q4a `bed0707`, Q4b `c4cdd5e`, Q4c `a76b16c`)

- **Só o Super-Admin** (`Rights::isSuperAdmin()`) cria, edita e exclui
  (Claudio, 27/09/2026); todos veem e usam. `src/IconLibrary.php`,
  `ajax/icons.php` (GET lista + `can_create`; POST `add`, `update`,
  `delete`, token novo em toda resposta, inclusive de erro).
- **Imagem:** o navegador gera um **PNG de 256 px** do recorte quadrado
  (Q4b-2: 96 px pixelava com zoom, ícone grande e PNG em 2x — achado 79). SVG
  enviado também vira PNG (script não passa). O servidor confere assinatura,
  tamanho (até 256 px) e peso (até 250 KB, com mensagem própria).
- **Janela "+ Ícone"** (paleta): escolher imagem (PNG, JPG, WebP, SVG, até
  2 MB), recorte arrastável com tamanho, nome (sugerido pelo arquivo),
  categoria, busca, prévia em 3 tamanhos. **Tirar o fundo** (cor mais comum
  dos 4 cantos, só o que está ligado à borda — o branco de dentro fica —,
  tolerância, borda suave; imagem com canto transparente não é mexida).
  **Silhueta na cor da categoria** (gravada já pintada; o quase branco fica
  branco; trocar a categoria no Gerenciar repinta). Esc fecha só a janela.
- **Paleta:** ícone criado entra na categoria escolhida, com ponto azul;
  chave `u<id>`. "Gerenciar ícones criados (N)" no fim da paleta: editar
  (nome, categoria, busca) e excluir.
- **Cópia no quadro:** ao salvar, o JSON guarda os ícones criados que usa
  (campo `lib`). Excluir da biblioteca não estraga quadro: a cópia desenha o
  ícone mas **não o devolve à paleta** (`addCustom(…, onlyMissing)`).
  Quadro aberto espera a biblioteca antes do `clean()` (ícone desconhecido
  vira genérico).

### 3.7 Sessão de 27/09/2026 (noite) — Fluxograma (Q5a a Q5f)

> Decisões de Claudio, 27/09/2026, sempre com mockup antes. Commits
> `6ef31e5` (Q5a) a `e694ddd` (Q5f), um por bloco (achado 75 respeitado).
> Sem schema novo: continua `0.6.10-alpha`.

#### Princípio: um motor, elementos por paleta

**Decisão de Claudio (27/09/2026):** o motor de quadro e as interações são os
mesmos (selecionar, arrastar, alças, ligar, dobras, desfazer, agrupar,
travar, zoom, PNG), mas **cada paleta tem os seus elementos**. Planta e
Topologia: ícones, cabos, eletrocalha. Fluxograma (e, no Q6, o Organograma):
formas próprias e ligação de fluxo, **sem ícones de rede**. O `clean()` do
motor aplica isso ao abrir qualquer quadro (achado 84).

#### Fluxograma no DIA (bloco Q5a, `6ef31e5`)

- **Subtipo `fluxograma` de `DIA`** (documento próprio, com código,
  validade e ciclo), gravado em `glpi_plugin_codexplus_diagrams.data` como
  `{ "kind": "fluxograma", "board": {…JSON do quadro…} }`.
- `src/Diagram.php`: `SUBTYPE_FLOW`, `starter()`, `subtypeOf()` e
  **`validateBoard()`** — confere a FORMA (tipos de item `icon zone text link
  duct shape lane`, chaves seguras, profundidade 4, texto até 2000, até 3000
  itens, 1 MB; `lib` só PNG em `data:` com chave `uN`). O SIGNIFICADO de
  cada item é conferido pelo `clean()` do motor. Validação idempotente
  (Salvar do formulário com diagrama igual não conta como alteração).
- `public/js/codexplus-flow.js` (novo): monta `[data-cx-flow]` — leitura em
  **SVG vetorial** (o mesmo do PNG), "Abrir o fluxograma" (motor em tela
  cheia via `open(null, null, 'fluxograma', host)`), gravação por
  `ajax/diagram.save.php`, hidden `_diagram` sincronizado, **Baixar PNG** e
  **Exportar PDF** (iframe fora da tela, A4 com orientação pelo formato do
  desenho, título e código no topo; o "Exportar PDF" do topo da leitura o
  aciona). Q5a-2 tirou "Materiais" do painel; Q5a-3 antecipou o PDF.
- Motor: `open()` aceita `host {data, title, save(D)}`; `boardSvg()` saiu de
  dentro do `toPng()`; aviso pelo `glpi_toast_*` quando não há editor.

#### Formas e ligação de fluxo (bloco Q5b, `ca747d2`)

- Item `shape {x, y, w, h, shape, text, fill, line, ink, b, fs, mk}`; texto
  **dentro da forma** (quebra por palavra; duplo clique ou começar a digitar;
  Enter termina, Shift+Enter quebra a linha, Esc cancela).
- Ligação `kind: 'fluxo'` (sem número de cabo e sem metros), cotovelo com
  seta; a **1ª saída da Decisão (e do Gateway X) nasce "Sim", a 2ª "Não"**.

#### Tamanho, estilo e camadas (blocos Q5c e Q5c-2, `086544f`)

- **Oito alças** (Shift mantém a proporção, Alt solta da grade); **a altura
  nunca fica menor que o texto**; formas redondas continuam redondas. Texto
  solto: 4 alças de canto que mudam a letra.
- **Barra flutuante sobre a seleção** (Claudio): Fundo, Borda e Texto em **12
  tons fixos** (`FLOW_COLORS`, cada tom com fundo, borda e texto), negrito,
  tamanho da letra, Frente/Trás (a moldura fica sempre no fundo). Letra
  também no painel. Q5c-2 corrigiu a posição da barra (achado 81).

#### Ligação completa (bloco Q5d, `a12638a`)

- Na barra da ligação: cor (12 tons), **espessura Fina/Média/Grossa** (também
  no painel — o antigo "P/M/G" era o texto do rótulo, achado 85), traço
  contínuo/tracejado/pontilhado, ponta no início e no fim (seta cheia,
  aberta, losango, círculo, nada), traçado, **cor do balão**.
- **Balão desliza ao longo da linha** (arrastar; `lt` 0,05 a 0,95); duplo
  clique no balão vai ao campo Rótulo.
- Referência visual de Claudio: **cantos arredondados** no cotovelo, ponta
  proporcional à espessura, linha que para antes da ponta, trecho reto
  final que cabe a ponta.

#### Elementos (blocos Q5e-1 `6541123` e Q5e-2 `4ceb8d4`)

- Paleta em **seções recolhíveis**: *Fluxograma* (15: início/fim, processo,
  decisão, documento, dados, conector, subprocesso, banco de dados, entrada
  e operação manual, preparação, atraso, vários documentos, conector de
  página, nota adesiva) e *BPMN* (eventos de início, intermediário e fim
  com tipo simples/mensagem/temporizador, tarefa com tipo
  usuário/serviço/manual, subprocesso [+], gateways X/+/O, objeto de dados,
  anotação, grupo).
- **Bizagi Modeler como referência de BPMN** (Claudio): só a notação (padrão
  aberto da OMG), com desenho próprio — nada de arte de terceiros no
  repositório público.
- BPMN como no Bizagi: eventos e objeto de dados com o **nome embaixo**;
  gateways com o nome **acima e à esquerda** (longe das 4 pontas); alças,
  guias e alinhamento pela forma, não pelo nome (`coreBox`). Grupo sem
  fundo, nasce atrás; anotação e grupo sem "Fundo" na barra.

#### "+" rápido, mini-paleta, alinhar (bloco Q5f, `e694ddd`)

- A bolinha azul da forma tem "+": **clique** cria a próxima forma ligada
  naquela direção (90 de espaço, centrada, anda um passo se o lugar estiver
  ocupado; processo repete, início/decisão/dados levam a processo, BPMN leva
  a tarefa); **arrastar até outra forma** liga; **arrastar para o vazio**
  abre a mini-paleta (9 formas) e a escolhida nasce ligada no ponto solto.
- **Alinhar** (6) com 2 ou mais selecionados e **Distribuir** (2) com 3 ou
  mais, na barra flutuante.

### 3.8 Sessão de 27/09/2026 (noite, depois do Q5) — Biblioteca em estante

> Decisões de Claudio, 27/09/2026, sempre com mockup antes (referências dele:
> a prateleira do Adendo 2 do Pessoas+ e duas fotos de estante). Commits
> `23f9a5c` (B2a + B2b, um commit: o B2a não chegou a ser aplicado sozinho) e
> `810aa85` (B2c). Sem schema novo: continua `0.6.10-alpha`.

#### Por que agora

Claudio antecipou a produção para 28/09 para começar a redigir documentos
(ROADMAP, "Ordem até produção"). A Biblioteca é a porta de quem só lê, então
ganhou a estante antes da subida. O motor de quadro (Q5g em diante), 3c,
R6-b, R7 e Etapa 5 seguem depois, já em produção.

#### Três níveis, cada um com endereço (blocos B2a e B2b, `23f9a5c`)

- **`library.php`** (sem parâmetro): estante com **um nicho por setor**; no
  nicho, os **5 fichários mais recentes** que passam no filtro (lombada:
  código com revisão, título, cor do tipo, bolinha da situação) e "+N"; na
  tábua, nome e total. Clique no fichário abre o documento; no resto do nicho
  (ou no nome na tábua), entra no setor.
- **`?setor=ID`**: nichos das **categorias** do setor, mesma regra.
- **`?setor=ID&cat=ID`**: as **lombadas** da categoria em pé sobre a tábua,
  botão **Estante/Lista** (lembrado no navegador) e **"+ Novo documento"**
  (quem tem Criar), que abre o formulário com a **categoria preenchida**
  (`document.form.php?cat=`).
- **`?q=`**: busca em toda a Biblioteca (a estante inteira, filtrando ao
  digitar); nos níveis 1 e 2, a busca é um formulário (Enter).
- Caminho no topo (**Biblioteca › Setor › Categoria**); Voltar do navegador
  funciona; os filtros (situação, tipo, só os meus) vão junto nos links.
- **Estilo "barra escura"** (modelo C de Claudio): sem fundo, tábua
  `#444441`. Rascunho e em validação na **mesma prateleira, tracejados**, só
  para quem produz. Lixeira sempre em lista.
- **Estante mínima de 12 nichos, 4 por linha** (Claudio); os vazios ganham
  **decoração** (8 desenhos próprios em `parts/lib-decor.html.twig`: vaso,
  livros, relógio, troféu, caixa, luminária, quadro, globo), escolhida pela
  posição e pelo nível (não muda a cada recarga, nunca igual à vizinha —
  `Library::decor()`). Do 13º em diante, cresce uma linha de 4. Tela estreita:
  2 por linha.
- `Library::shelf()` passou a devolver `id` e `recent` (por recência) de
  setor e categoria; `Library::counts()` conta o nível aberto.

#### Montantes, aparador e rolos de planta (bloco B2c, `810aa85`)

- **Montante vertical** de 14 px entre as colunas, de cima a baixo (achado 89).
- **Só no nível 1:** no nicho do setor, os documentos que não são diagrama à
  esquerda (até 5) e, depois de um **aparador**, os **diagramas como rolos de
  planta em pé** (até 3, "+N"): papel quase preto **`#2A0A0E`** (escolha de
  Claudio entre três tons; variável `--cx-roll`), tampa oval, etiqueta na cor
  do DIA com o código, bolinha da situação; rascunho com etiqueta tracejada.
  Na tábua: "17 · 3 diagramas". Setor sem diagrama não tem aparador.
- Nos níveis 2 e 3 os diagramas seguem como fichários e lombadas.

### 3.9 Madrugada de 28/09/2026 — Setor / Categorias, 0.7.0, instalação do zero

> Decisões de Claudio, com mockup antes. Commits `dfe0e58` (SC1) e `29c5088`
> (0.7.0, tag `v0.7.0`). Sem schema novo.

#### Onde o documento mora e quem o vê (esclarecido com Claudio)

- **Prateleira ≠ leitura.** O setor e a categoria dizem **onde** o documento
  mora na estante; **quem abre** é quem está na **Leitura** dele (usuário,
  grupo ou perfil). Pertencer a um setor não dá acesso a nada. Para o
  leitor, o documento aparece quando: publicado (ou em revisão, com a
  versão anterior) + perfil com Ler + na Leitura + entidade.
- **Um lugar só (decisão de Claudio).** Documento feito pelo T.I. e usado
  pelo Comercial e Compras mora em **T.I. › categoria**; Comercial e Compras
  entram na Leitura e o encontram no nicho do T.I. ou pela busca. Categoria
  com o mesmo nome em dois setores são duas categorias (a do setor escolhido
  é a que vale).

#### Setor / Categorias no formulário (bloco SC1, `dfe0e58`)

- Mesma linha, **Setor antes**: o setor filtra as categorias (só as dele;
  várias, todas do mesmo setor). Trocar de setor tira as do anterior, com
  aviso. Linha "Na estante: Setor › Categoria".
- **"+" só para o Super-Admin** (Claudio): cria setor, ou categoria já no
  setor escolhido, ali mesmo (`ajax/placement.php`; nome repetido no mesmo
  lugar devolve o existente). Renomear e excluir continuam em Listas
  suspensas.
- **Obrigatórios para sair do rascunho** (Claudio): Enviar e Publicar direto
  exigem ao menos uma categoria, com setor, todas do mesmo setor
  (`Document::placementError()`). Rascunho pode ficar sem.
- Documento antigo em dois setores: vale o da 1ª categoria, aviso na tela, e
  ao salvar ficam só as desse setor. Publicado mostra só texto.
- Parcial `templates/parts/doc-placement.html.twig`; comportamento em
  `codexplus-docform.js` (`placement`). SC1-2: alinhamento (achado 94).
- Na homologação ficaram 8 documentos de teste sem categoria (7 rascunhos e
  o publicado id 7, "Teste R3a", no "Sem setor"); produção começa vazia.

#### 0.7.0 e instalação do zero (`29c5088`, tag `v0.7.0`)

- Versão `0.7.0` (sem schema novo); na homologação, `plugin:install --force`
  + `plugin:activate` (achado 63).
- **Teste do zero:** GLPI 11.0.6 novo em `/var/www/html/glpi-limpo`, banco
  `glpidb_limpo`, Codex+ clonado pela tag → instalou e ativou; **121
  colunas idênticas** às da homologação (achado 92); Super-Admin nasce com
  todos os direitos (23567), os outros perfis só com Ler. Tudo apagado
  depois. Critério do marco cumprido.

### 3.10 Sessão de 02/10/2026 — folha, ícones, raias e Q5h

Commits: `3ef507d` (docs de 28/09), `da90cbc` (folha), `00249c1` (Q5j-1),
`6601983` (Q5j-2), `ae802bc` (**Q5g-1 a Q5g-3 num commit só**: o Q5g-1 e
o Q5g-2 não foram commitados à parte — achado 99), `42a4954` (Q5h-1),
`e441519` (Q5h-2), `35d11e4` (Q5h-3), `f0ad6ba` (Q5h-4). Versão segue
`0.7.0`; nenhum bloco mexeu no banco. Só o Q5j-1 mexeu no `setup.php`
(lista de scripts).

#### Decisões de Claudio (02/10/2026)

- **"Pronto para produção" = roadmap inteiro.** Produção é a **etapa
  final**: só depois de todas as fases. **Servidor de produção: o Debian 13
  com SSH na porta 2022**; o `177.87.230.179` segue como homologação. O
  bloco de conferência do servidor (PHP, extensões, MariaDB, espaço,
  GitHub) é o **primeiro passo da etapa de produção**, não antes.
- Fluxo do Miro importado para validação pelo **script no Console** (outro
  chat): grava pelo `ajax/diagram.save.php`, sem botão de importar e sem
  depender do Q5i. Validado na homologação (fluxo da Ponto Telecom).
- **Folha**: botão para escolher o tamanho (não crescer sozinha).
- **Ícones genéricos: biblioteca Lucide (ISC)**, com 56 escolhidos.
- **Raias: orientação escolhida por fluxograma** (horizontal ou vertical;
  a primeira raia decide). Substitui "só verticais" do mockup do Q5.
- **Excluir raia: as formas ficam no quadro, soltas.**
- **Nem imagem nem tabela dentro do fluxograma**; em troca, **link** na
  forma, para **documento do Codex+ e endereço externo** (os dois).
- Q5i: **reavaliar o escopo antes de começar** (não há processos no Bizagi;
  o Miro não exporta).

#### Folha do fluxograma (`da90cbc`)

- Seletor **Folha** na barra (só no fluxograma): Padrão 1400 × 900, Médio
  2400 × 1500, Grande 3600 × 2200, Máximo 6000 × 4000 e Personalizado
  (largura × altura). Cresce para a direita e para baixo; nunca fica menor
  que o desenho (avisa e para no menor que cabe); entra no desfazer. O PNG,
  a leitura e o PDF recortam pelo conteúdo: a folha só muda o editor.

#### Ícones genéricos (Q5j-1 `00249c1`, Q5j-2 `6601983`)

- Catálogo `public/js/codexplus-lucide.js` (`window.CodexplusLucide`:
  `CATS`, `NAME`, `SVG`), gerado do pacote `lucide-static` 1.50.0 e saneado
  (só `path`, `circle`, `rect`, `line`, `polyline`, com números). Licença em
  `LICENSES/lucide-ISC.txt`; aviso no README. Carregado pelo `setup.php`
  antes do motor. Nada vem da internet.
- Forma `shape: 'ico'` com `ico: '<chave>'`: quadrada, sem fundo, nome
  embaixo; traço no tom da **Borda**, nome no tom do **Texto**; traço de no
  máximo 4 px na tela. Chave fora do catálogo é preservada e desenha "?".
  Painel: seletor **Desenho**. Planta e Topologia descartam.
- Paleta: seção **Ícones** com 7 subgrupos; busca **"Buscar forma ou
  ícone"** (sem acento; nome, chave em inglês ou grupo).

#### Raias (Q5g-1 a Q5g-3, `ae802bc`)

- Item `lane` nos `items` (o servidor só guarda `v`, `mode`, `w`, `h`,
  `items` e `lib` — achado 97): `{ dir: 'h'|'v', x, y, w, h, hd, title,
  desc, ico, tone }`. `laneLayout()` mantém as raias encostadas, com o
  comprimento e o cabeçalho (`hd`) da primeira; `clean()` força a
  orientação da primeira gravada. Desenhadas por `laneSvg()` no fundo
  (antes das molduras), recortadas pela moldura arredondada (`clipPath`
  com id novo a cada desenho — achado 96).
- Paleta **Raias**: "Raia horizontal"/"Raia vertical" (clique inclui; a
  outra orientação fica apagada). A primeira ocupa a folha.
- Seleção **pelo cabeçalho**; o corpo deixa o clique passar. Painel:
  título, descrição, ícone (um dos 56 ou nenhum) e cor (12 tons). Duplo
  clique no cabeçalho vai ao título.
- Pertencer: forma ou texto com o **centro** dentro da raia.
- Arrastar o **cabeçalho** reordena (linha azul de destino); a **linha
  entre raias** muda a espessura (as seguintes andam com as formas); a
  **ponta do conjunto** muda o comprimento; a **linha do cabeçalho** muda o
  tamanho dele (80–600 nas horizontais, 50–400 nas verticais; o conjunto
  estica e as formas de dentro andam junto). Mínimos de espessura: 90 / 160.
  Dobras de ligação andam quando as duas pontas andam igual (`moveMap`).
- Excluir: as raias seguintes sobem com as formas; as da excluída ficam
  soltas logo depois do conjunto. Raia não copia, não duplica, não agrupa,
  não anda pelas setas.

#### Q5h (`42a4954`, `e441519`, `35d11e4`, `f0ad6ba`)

- **Q5h-1 Trocar forma:** campo **Tipo de forma** no painel (Fluxograma e
  BPMN; não para Ícone e Grupo). Mantém texto, centro, ligações, link e as
  cores escolhidas; cor que era a padrão do tipo antigo vira a do novo;
  tamanho do tipo quando um dos dois é quadrado/nome embaixo/nota/anotação.
- **Q5h-2 Link:** `lk: { t: 'doc', id, n }` ou `{ t: 'url', u }` (só
  `http`/`https`, sem aspas nem `<>`; `cleanLk`). Busca em
  `ajax/document.search.php` (GET, até 20, **mesma visibilidade das
  listagens**, título ou código `POP0012`/`pop 12`/`12`, sem o próprio
  documento). Corrente no canto da forma (meio da aresta no losango, 45° no
  círculo). Leitura: clique abre (documento na mesma aba, URL em aba nova).
  PDF: lista **"Links do fluxograma"** abaixo do desenho.
- **Q5h-3 Busca:** botão **Buscar** e **Ctrl+F** no quadro; caixa no canto,
  sem acento, contorna todos os achados (formas, raias, textos, molduras,
  rótulos), Enter/Shift+Enter centraliza e seleciona; Esc fecha só a busca.
- **Q5h-4 Minimapa:** canto de baixo à direita, folha e desenho em blocos de
  cor, retângulo da vista; clicar ou arrastar move a vista; botão **Mapa**.
  Busca e minimapa valem também na Planta e na Topologia.

#### Testes

- Cada bloco com testes em jsdom (ponteiro simulado com `clientX/Y` a partir
  de `view`, exposto em `root.__cx.view()` só para teste) — 215 no total ao
  fim da sessão — e o desenho conferido rasterizando com `cairosvg`.
- O `ajax/document.search.php` passou no `php -l`; a consulta só roda no
  MariaDB do servidor (validada por Claudio).

### 3.11 Sessão de 03/10/2026 — Q5i: importar e exportar o fluxograma

Commits: `3ad7ef9` (docs de 02/10), `63ef88e` (Q5i-1), `e9c1528` (Q5i-2),
`1c71a21` (Q5i-3). Versão segue `0.7.0`; nada no banco, no instalador nem
no PHP: só `public/js/codexplus-board.js` e `public/css/codexplus.css`.
Mockup das telas aprovado antes (montado sobre o print real da barra).

#### Decisões de Claudio (03/10/2026)

- **`.bpmn` para o backlog** (opção d): não há processos no Bizagi e o Miro
  não exporta. O Q5i virou importar e exportar **para o uso real**: trazer
  fluxos feitos por IA.
- **Formato universal = um formato que as IAs já conhecem**, não um formato
  inventado pelo Codex+ (esse exigiria ensinar a IA a cada vez). Escolhido o
  **Mermaid `flowchart`**: toda IA gera sem instrução, tem grupos
  (`subgraph`) que viram raias, e roda em GitHub, Notion e Confluence.
  draw.io fica como opção futura (fidelidade maior, IAs erram mais).
- **Só arquivos e botões, nunca código à vista.** Importar = escolher,
  arrastar ou colar (Ctrl+V); o conteúdo não aparece, só um resumo.
- **Botões Importar e Exportar na barra do fluxograma**, depois da Folha.
  **Baixar PNG e Exportar PDF ficam onde estão** (outra rotina).
- **Imagem e PDF passam pela IA do usuário** (pedir o fluxo em Mermaid);
  perda de ~10 a 20% aceita por Claudio. Importar imagem direto pela API
  (Q5i-4) fica opcional: chave, custo e dado saindo do servidor.
- **Levar documentos de homologação para produção: por scripts nossos, na
  hora** (só os que ficaram bons). Nenhuma rotina no plugin para isso.
- O resultado visual da montagem em raias foi aprovado por Claudio sobre o
  protótipo (imagem 01, "Fluxo Ideal — Comercial / Compras / Técnica /
  Financeiro").

#### Q5i-1 — cópia do fluxo em arquivo (`63ef88e`)

- **Exportar → "Guardar uma cópia do fluxo"**: baixa
  `fluxograma-<título>-AAAA-MM-DD.json` =
  `{ formato: 'codexplus-quadro', versao: 1, origem, titulo, exportado,
  quadro }` (quadro inteiro, com `lib`). Os links para documento já levam
  código e título no `n`.
- **Importar**: janela com área de soltar, "Escolher arquivo" e área "cole
  com Ctrl+V". Aceita também o quadro puro (`{ mode, items }`) e o registro
  do DIA (`{ kind, board }`); tolera texto em volta e BOM. Recusa: versão
  mais nova do formato, outro tipo de quadro, imagem/PDF (orienta), mais de
  1 MB. Arrastar o arquivo direto para o quadro abre a importação.
- **Resumo** antes de aplicar: nome, origem, contagens (formas, áreas,
  ligações) e avisos (itens que não entram, texto cortado em 500, links para
  documento vindos de outro ambiente — compara `origem` com
  `location.origin`). "Substituir desenho" grava um passo no histórico:
  **Ctrl+Z desfaz só a importação**; nada é gravado até Salvar.
- `readIo(txt, mode, here)` é pura (testável); tudo passa pelo `clean()`.

#### Q5i-2 — importar Mermaid (`e9c1528`)

- **Leitor próprio** (`parseMermaid`), sem a biblioteca do Mermaid (3 MB):
  `flowchart`/`graph`, direção, `subgraph` (aninhado), nós em todas as
  notações (`[ ]`, `( )`, `([ ])`, `{ }`, `[[ ]]`, `[( )]`, `(( ))`, `{{ }}`,
  `[/ /]`, `[\ \]`, `[/ \]`, `[\ /]`, `>`, `@{ shape, label }`),
  cadeias e `&`, rótulos (`|x|`, `-- x -->`, `-. x .->`, `== x ==>`),
  traços (`-.->`, `==>`, `---`, `<-->`, `--o`, `~~~` invisível), `classDef`,
  `class`, `:::`, `style`, `<br>`, entidades, comentários `%%` (o primeiro
  vira título), front matter `title:`, bloco ```mermaid com texto em volta.
  `click`, ícones `fa:`/`icon:` e formas sem par viram aviso; outros tipos
  de diagrama (sequência, classes…) são recusados com orientação.
- **Montagem** (`mermaidBoard`): `subgraph` de primeiro nível = **raia**
  (`LR` horizontais, `TD` verticais; título `<br>` descrição); segundo
  nível = **moldura** na raia (mais fundo achata, com aviso); formas fora de
  grupo vão para a raia "Sem área". Por bloco (raia ou moldura): voltas
  (ciclos) fora pela ordem do texto; coluna = caminho mais longo **dentro
  da raia** (cada raia começa no início, como no original); linha herdada
  de quem alimenta (a 1ª saída segue na mesma linha; Sim antes de Não);
  raízes novas ganham linha nova. Coluna uniforme (forma mais larga + 50).
- **Ligações**: cotovelo; troca de raia sai pelo lado da outra raia e corre
  num **corredor** no fim da raia (14 px reservados); com forma embaixo na
  mesma coluna, sai pela frente; volta corre num corredor logo abaixo das
  linhas da raia. Círculo vira início/fim/conector pelo grau.
- **Cor pelo matiz** (achado 104): `fill` vira o tom mais próximo; sem cor,
  cinza/branco; fundo escuro, a variante forte. Tom exato da paleta volta
  igual.
- Janela: textos para IA e a dica "me entregue esse fluxo como arquivo
  Mermaid, com um grupo (subgraph) para cada área".

#### Q5i-3 — levar para uma IA (`1c71a21`)

- **Exportar → "Levar para uma IA"**: baixa `...-ia.md` (achado 102) com
  título, duas linhas de instrução para a IA e o bloco ```mermaid
  (`boardToMermaid`): raias = `subgraph` com `style`, molduras = subgraph
  interno, todas as formas (as sem par em `@{ shape }`), texto solto =
  `text`, ligações com rótulo e traço, cores que diferem da padrão do tipo
  em `classDef`. Não vão: posições (refeitas na volta), ícones das raias,
  links das formas, cores das ligações.
- Ida e volta sem IA preserva formas, cores, textos, raias, moldura,
  ligações **e posições**; exportar de novo gera o mesmo arquivo. Tarefa,
  gateways, objeto de dados, grupo e ícone voltam como a forma mais
  próxima (Processo, Decisão, Documento).

#### Testes

- jsdom: 48 (Q5i-1), 35 (Q5i-2), 48 (Q5i-3) — 131 na sessão, 346 no
  total do motor. Telas rasterizadas no Chromium (playwright) a 1915 px; o
  desenho da imagem 01 importado no editor real. Arquivos gerados validados
  pela **biblioteca oficial do Mermaid** (achado 106).
- Claudio validou os três na homologação; o fluxo da imagem 01 entrou como
  no teste. **Falta acompanhar no uso:** fluxos pedidos a IAs reais
  (ChatGPT, Claude, Gemini), pelas duas portas (arquivo e Ctrl+V) — cada IA
  escreve diferente; arquivo que der problema vira correção do leitor.

### 3.12 Sessão de 03/10/2026 (tarde e noite) — Q6 organograma no motor, Q7a, Q7b desenhado

Commits: `b2bc060` (docs de 03/10, manhã), `b95447d` (Q6a-1), `0944044`
(Q6b-1), `a0acb83` (Q6b-2), `55d4ee7` (Q6b-3), `895d928` (Q6c), `446841e`
(Q6d), `42ac39f` (Q6e), `ab3a3b5` (Q7a + Q6f-1), `e1070d0` (Q6f-2). Versão
segue `0.7.0`; nada no banco nem no instalador. Mockups aprovados antes de
cada bloco grande (montados sobre o código real no Chromium).

#### Decisões de Claudio (03/10/2026)

- **Organograma no motor de quadro** (um motor só, elementos por paleta),
  **mantendo o JSON gravado de sempre** (`kind, nodes, edges, levels, esc,
  elements`): sem converter banco nem versões publicadas. O motor traduz ao
  abrir e ao salvar.
- **Edição em tela cheia** (como o fluxograma); a página mostra legenda,
  desenho e a **matriz de escalonamento, editável na página** (grava sozinha).
- **Dobras manuais das ligações descartadas** (eram testes): a ligação é
  sempre o cotovelo automático. Puxar ligação no quadro (diálogo "Quem é o
  chefe?") **não entrou**: o painel faz o mesmo (Responde a / Também reporta a).
- **Importar/exportar em todos os diagramas**: organograma (`.json` +
  Mermaid com a matriz em tabela), Planta e Topologia (`.json`; **a imagem
  da planta vai junto**), cronograma e RACI em tabela (Q7b-3).
- **Documentos encerrados**: sem importar/exportar de documento completo.
  Pendentes só a **aba de Histórico** e a **galeria de Modelos**, no fim.
- **Organograma fechado** (Q6a a Q6f-2); ajustes só conforme o uso.
- **Cronograma (Q7b)**: datas reais, fases com tarefas, marcos, linha
  "hoje", e **acompanhamento separado do planejamento** — planejamento
  (tarefas, datas, responsáveis) segue revisão e validação; **situação e
  data de conclusão** são marcadas no documento publicado **sem abrir
  revisão**, com registro de quem e quando (botões Iniciar / Concluir /
  Reabrir, e "Concluir selecionadas").

#### Organograma: arquitetura (Q6a a Q6e)

- `public/js/codexplus-orgdraw.js` — **o desenho** (funções puras): `normalize`
  (regras do motor antigo; tira `waypoints`), `layout` (árvore HGAP 14 / VGAP
  48, regra linha × cartão, soltos com equipe junto), medida de texto por
  canvas com as fontes IBM Plex (fallback por caracteres no jsdom), `svg`,
  `parts` (ligações, cartões e caixas de cartão e de cada pessoa listada,
  para o quadro), legenda, matriz, modelos (`TEMPLATES`, `fromTemplate`),
  `levelUsed`. Também a **página** (`[data-cx-orgview]`, leitura e edição):
  legenda, desenho com zoom/ajustar/tela cheia/busca, matriz (editável com
  `data-editable="1"`, autosave 900 ms), PDF (A4 pela forma, matriz na página
  2), **PNG 2× com as fontes embutidas** (achado 110), e "Abrir o organograma".
- `public/js/codexplus-board.js` — **modo `organograma`** (`var org`): `D.org`
  é a verdade; a cada `render()` o `orgSync()` refaz o arranjo e `D.items`
  vira caixas `org` (cartão) e `orow` (pessoa listada). Pintura, seleção,
  busca, minimapa e ajuste usam essas caixas. Tudo do organograma fica atrás
  de `if (org)`; **fluxograma, planta e topologia não passam por esse código**
  (regressão automática: dados, desenho e barra idênticos ao quadro de antes).
- Edição (Q6b): painel (nome, cargo, nível, chefia, reportes, observação,
  marcações; subordinado; excluir com confirmação e subordinados subindo),
  paleta (5 elementos + "Criar elemento"), arrastar com **zonas** (centro =
  na equipe, bordas = ao lado, vazio = solto) e diálogo "Mover…" (levar a
  equipe junto ou deixá-la). Níveis e Modelos em diálogo (Q6c).
- Q6e: Importar/Exportar no quadro, mesmo diálogo do fluxograma. Mermaid:
  `"Nome<br>Cargo"`, área = `[[ ]]`, `-->` chefia, `-.->` reporte, nível =
  `classDef`, matriz = tabela Markdown, `<!-- codexplus-org {...} -->` com os
  níveis exatos. Sem classes (IA), níveis pela profundidade; segunda chefia
  vira reporte; `subgraph` ignorado; sem tabela, a matriz atual fica. Lê
  também o JSON do editor antigo e o do protótipo (árvore).
- **Q6f-1/2 (pedidos de Claudio no uso)**: **guias** ao arrastar (bordas,
  centro, meio exato entre vizinhos, mesma distância de um par, medida em px;
  Alt desliga; sem guia, grade de 10); **alinhamento automático** ao entrar
  numa equipe de colegas soltos (mesma linha e espaço; abre espaço empurrando
  cartões soltos encavalados); **subordinados soltos vão junto**; crescer para
  a **esquerda e para cima** (achado 111).
- Motor antigo `codexplus-org.js` **removido** no Q6d (e do `setup.php`).

#### Q7a — cópia da Planta e da Topologia (`ab3a3b5`)

Barra ganha **Importar** e **Exportar cópia** (`.json`, `formato:
'codexplus-quadro'`). Na Planta o pacote leva `planta` (data URL da imagem;
limite 12 MB). Ctrl+Z volta o desenho, não a imagem (igual ao "Trocar
planta"). Cópia de outro tipo de quadro é recusada com mensagem clara.

#### Q7b — cronograma com datas (aprovado; feito na seção 3.13)

Mockups aprovados (`q7b-mockup-cronograma.png` e `q7b-mockup-situacao.png`,
com o cronograma ShopMap). Modelo hoje: `periods[]` relativos e `rows[]
{name, owner, cells[]}` com `''/'b'/'m'` (motor de grade
`codexplus-grid.js`, validado em `Diagram::validateGrid`). Proposta:

- **Q7b-1**: tarefa com **início e fim** (dd/mm/aaaa); colunas por semana ou
  mês com data no cabeçalho; barra desenhada pelas datas; editar na tabela e
  **arrastando a barra** (mover; alças nas pontas). Cronograma antigo
  (S1, S2…) continua abrindo.
- **Q7b-2**: **fases** (linha com resumo calculado e ▾ recolher), **marcos**
  (◆ com data), numeração automática (1, 1.1…), linha **"hoje"**, PDF novo.
- **Q7b-3**: Importar/Exportar (`.json` + **tabela Markdown** de ida e volta,
  também para a RACI). Teste combinado: importar o cronograma ShopMap pela IA.
- **Q7b-4**: **situação** (Não iniciada / Em andamento / Concluída + data de
  conclusão), **Atrasada** e **Concluída com atraso** calculadas, % da fase,
  marco atingido/atrasado, resumo no topo; botões **Iniciar / Concluir /
  Reabrir** e "Concluir selecionadas"; grava no publicado **sem revisão**,
  com registro de quem e quando (schema a decidir no bloco).
- Fora por ora: % por tarefa, dependências (setas), dias úteis e feriados.

#### Testes

DIA0001 real (42 elementos) como caso de teste, **fora do repositório**
(nomes de pessoas). Geometria do desenho novo × motor antigo (diferença máx.
1 px), 31 testes jsdom do desenho, testes ponta a ponta por bloco no
Chromium (página servida por HTTP, para as fontes do PNG), regressão do
quadro (fluxograma, planta, topologia) contra o arquivo anterior ao Q6.

### 3.13 Sessão de 03–04/10/2026 (noite) — Q7b: cronograma completo

Commits: `1f8085f` (docs de 03/10, noite), `27d330e` (Q7b-1), `4bd1e87`
(Q7b-2), `913c6d4` (Q7b-3 + Q7b-2b), `19ca003` (paisagem e tela cheia),
`2366adb` (Q7b-4, **versão 0.7.1**). Claudio pediu **blocos grandes**
(um pacote por bloco, validado antes de entregar).

#### Decisões de Claudio (03–04/10/2026)

- **Q7b-1 e Q7b-2 em bloco único cada** (o resto do método não muda:
  pacote, roteiro, commit antes do próximo).
- **Seguir o mockup aprovado à risca** (`q7b-mockup-cronograma.png`,
  `q7b-mockup-situacao.png`): o Q7b-1/2 foi feito só pela descrição escrita
  e divergiu; o **Q7b-2b** alinhou (achado 116). **Sem a coluna Dias**;
  **datas em dd/mm** na tabela (ano no `title` e ao editar).
- **PDF do cronograma e da RACI sempre em A4 paisagem**; a **leitura**
  deles usa a folha larga (1320 px, como a edição) — os outros documentos
  continuam na folha de 900 px.
- **Tela cheia** no cronograma e na RACI, na edição e na leitura.
- **Situação (Q7b-4)**: `id` fixo por linha + tabela separada; marca quem
  pode **editar e gerir** o documento (responsável, revisor, autor) e o
  Super-Admin; **data de conclusão editável** (padrão hoje, nunca no
  futuro); atrasos, % e resumo **calculados na hora**, nunca gravados.

#### Formato gravado (cronograma com datas)

`{ kind: 'cronograma', mode: 'datas', scale: 'S'|'M', rows: [...] }`, linha
= `{ name, owner, start, end, id }` (tarefa), `{ type: 'fase', name, owner,
id }` (sem datas; resumo calculado das linhas abaixo até a próxima fase) ou
`{ type: 'marco', name, owner, start, end (= start), id }`. Datas
AAAA-MM-DD. Sem `mode`, é o cronograma antigo (S1, S2…), que abre igual e
ganha **Usar datas** (converte; Desfazer volta). `Diagram::validateDated`
confere tudo; **linha sem `id` ganha `r` + posição** (determinístico: o
mesmo id em toda leitura até a próxima gravação; achado 120).

#### Motor (`public/js/codexplus-grid.js`)

- **Q7b-1**: início e fim, escala semanas/meses, barra pelas datas, editar
  na tabela e **arrastando** (mover; alças nas pontas; desenhar a barra numa
  tarefa sem datas).
- **Q7b-2**: fases (▾ recolhe só na tela), marcos ◆, numeração automática
  (**marco sem número**), subir/descer (a fase leva as linhas dela), linha
  **hoje** tracejada, PDF que estica a linha do tempo quando cabe numa folha.
- **Q7b-2b** (mockup): barra Fase · Tarefa · Marco · Escala · **Hoje** ·
  Desfazer … Importar · Exportar · Exportar PDF; colunas Nº · Fase, tarefa ou
  marco · Responsável · Início · Fim fixas ao rolar; meses curtos seguindo as
  semanas; **seleção** de linha (inserir abaixo dela); semana de ~44 px.
- **Q7b-3**: **Importar/Exportar** em cronograma e RACI — cópia `.json`
  (`formato: 'codexplus-grade'`) e **tabela Markdown** para levar a uma IA,
  de ida e volta. O leitor aceita cabeçalhos em português e inglês, datas
  dd/mm/aaaa, dd/mm/aa e ISO, deduz fase (numeração 1 → 1.1, "Fase…" sem
  datas) e marco (Dias = 0, ◆); RACI aceita palavras e "R/A". Tabela
  importada **herda o id** da linha atual de mesmo tipo e nome.
- **Paisagem e tela cheia**: `printPlan`/`gdPrintPlan` sempre paisagem;
  classe `cx-docpage--paisagem` na leitura; tela cheia igual à do
  organograma (API do navegador ou classe `is-full`), cabeçalho fixo ao
  rolar, diálogos anexados dentro da tela cheia (achado 121).
- **Q7b-4 (situação)**, só na **leitura do publicado** (também da versão
  publicada durante uma revisão, e do obsoleto, só para ver): resumo no topo
  (concluídas, atrasadas, com atraso, marcos atrasados, última marcação),
  coluna **Situação** com selos, barras pela situação (✓ verde, ✓ âmbar,
  vermelha com extensão rosa até hoje, azul, clara), progresso na barra da
  fase, ◆ vermelho/âmbar, caixinhas + **Iniciar / Concluir (n) / Reabrir**
  para quem pode marcar, diálogo da data de conclusão, PDF com a situação.
  Na edição nada disso aparece.

#### Situação: servidor

- `src/ScheduleStatus.php` + tabela **`glpi_plugin_codexplus_schedulestatus`**
  (documento, `row_key`, `state` andamento/concluida, `date_start`,
  `date_done`, `users_id`, `date_mod`; único por documento + linha).
- `ajax/schedule.status.php`: ações `iniciar`, `concluir` (com `data`),
  `reabrir`; só tarefas da versão que a leitura mostra
  (`ScheduleStatus::shownDiagram`); devolve a situação inteira e o token novo.
- `Document::canMarkSchedule()`: publicado ou em revisão + (Super-Admin ou
  `isEditor()`). A purga do documento apaga a situação.
- Regras de cálculo (no navegador): concluída depois do Fim = **com
  atraso**; não concluída com Fim antes de hoje = **atrasada N d**; fase =
  % de tarefas concluídas + quantas atrasadas; marco = tarefas acima dele na
  mesma fase: todas concluídas até a data → atingido; data passada sem todas
  → atrasado.

#### Testes da sessão

jsdom: 158 (motor) + 55 (importar/exportar) + 50 (situação, com o **mockup
de situação como gabarito**: 10 de 30, 3 atrasadas, 2 com atraso, 1 marco;
Fase 1 82% · 2 atrasadas). Harness PHP: 17 (`validate`, ids) + 18
(`ScheduleStatus` com banco falso). Twig estrito (template e trechos
renderizados). Chromium: quatro roteiros de ponta a ponta (arrastar, fases,
importar/exportar, tela cheia) e o da situação, com hoje fixo e o endpoint
simulado por interceptação (achado 122).

### 3.14 Sessão de 04/10/2026 — 3c-0: paginação do PDF

Commit `5561ec6`. Só `public/js/codexplus.js` (`layoutPages()` e CSS do
rodapé). Vale para todo documento de texto (POP, PSG, MAN, PRP, LAU, DTC,
DIV); diagramas têm o PDF do próprio motor e o Word pagina sozinho.

Claudio mandou PDFs com o rodapé por cima do texto e títulos sozinhos no
pé da página ("em todos os documentos"). Causas e regras:

- **Altura com margens**: o motor somava `getBoundingClientRect().height`,
  que não conta margem (parágrafo 9 px, título 26 px, tabela 12 px); a
  página enchia acima do que cabia. Agora soma margem de cima e de baixo.
- **Margem que vaza**: `div.cx-sheet > table` (planilha) deixava a margem da
  tabela escapar do `div` (achado 123). Filhos diretos `div`, `p` e
  `blockquote` do palco e da folha ganham `display: flow-root`.
- **Folga de 8 px** antes do rodapé (arredondamento de fonte do Windows).
- **Título desce com o bloco seguinte**: h1–h6, o bloco do título do
  documento e **parágrafo curto todo em negrito** (como os documentos são
  escritos hoje).
- **Legenda acompanha o quadro** (Q3b).
- **Imagens reduzidas para caber**: bloco (ou quadro + legenda) maior que a
  folha tem **todas** as imagens reduzidas na mesma proporção, até 35% (o
  DTC0005 tinha duas fotos em pé no mesmo parágrafo).
- **Parágrafo vazio** não abre página nem gera folha em branco.
- **Rodapé** em até duas linhas (8 pt), sem reticências.

Validação: os 26 documentos da homologação, com o tamanho real de cada
imagem, medidos em modo impressão (achados 124 e 125) — antes 5 com
problema, depois 0. Limite que fica: bloco sem imagem maior que uma folha
(planilha de ~30+ linhas) ainda transborda; partir planilha repetindo o
cabeçalho seria bloco próprio.

**Hábitos de escrita que o motor não adivinha** (vão para os modelos da
3c): uma foto por parágrafo (Enter, não Shift+Enter); título como
parágrafo próprio ou Estilo → Título, não no fim do parágrafo de cima.

### 3.15 Sessão de 04/10/2026 — marcas (M-1 e M-2) e ícone do plugin

Pedido de Claudio: cliente com **várias logomarcas** (empresas de um mesmo
dono, financeiro e compras em comum), **numa entidade só** do GLPI. O
documento sai com a logo da marca de referência. Mockup aprovado
(`m1-mockup-marcas.png`, com as logos de Ponto, Cacta, 4B e Buzz Telecom).

#### Decisões de Claudio (04/10/2026)

- Marca **escolhida no documento** (entidade só; com entidades separadas
  daria para ligar marca a entidade — não é o caso).
- **Por marca**: nome da empresa (`{empresa}`), logo, altura da logo e
  **cor principal**. **Globais**: posição e repetição da logo, caixa alta,
  rodapé.
- **Cor sugerida pela logo**, editável, escurecida se ilegível.
- A cor vale para o título, o filete e — além do mockup, aceito — os
  títulos do corpo e o círculo dos passos (tudo que era o azul fixo
  `#0c447c`), no PDF e no Word.

#### M-1 — cadastro (`1525c34`, versão 0.7.2)

- Tabela **`glpi_plugin_codexplus_brands`** (`name`, `logo_filename`,
  `logo_mm`, `color`, `is_default`, datas). `src/Brand.php` (não é
  CommonDBTM, como IconLibrary). Gerencia quem tem Configurar > Atualizar.
- Logo em `GLPI_PLUGIN_DOC_DIR/codexplus/brands/brand-<id>.png|jpg` (só
  PNG/JPG, `getimagesize`), entregue por `front/logo.send.php?brand=ID`.
- **Semente** (Install, tabela vazia): 1ª marca com o nome da empresa, a
  altura e uma **cópia** da logo da configuração antiga (que fica no
  lugar); cor `#0c447c`, padrão. Na homologação nasceu "Marca principal"
  (nome da empresa estava vazio) — renomear para Resolutto IT Solutions.
- Tela: seção **Marcas** no topo da configuração (lista, Editar, Tornar
  padrão, Excluir, Nova marca). "Nome da empresa", "Logo" e "Altura do
  logo" saíram do formulário geral.
- **Cor pela logo** (`public/js/codexplus-brand.js`, no navegador): ignora
  transparente, quase branco e, com os 4 cantos opacos, o fundo; com pixels
  saturados vence a faixa de matiz mais presente, senão o cinza mais
  presente; escurece até contraste 4,5 com o branco. Nas logos de teste:
  Ponto `#252242` (o marinho vence o laranja), Cacta `#8dd350` →
  `#4e8321`, 4B cinza `#3a3c40`, Buzz errado (achado 128).
- `Branding::printConfig($doc, $brandId)` → `Brand::forPrint()`; chave
  nova `brand.color` no JSON (aceita em `getPrintConfig`, só `#rrggbb`);
  `brandCss()` no PDF; `INK` do Word lido a cada exportação.

#### M-2 — marca do documento (`c4ad5ff`, versão 0.7.3)

- Coluna `plugin_codexplus_brands_id` no documento e na versão publicada.
  Documento existente ficou **preso à marca padrão do dia da instalação**
  (linhas com 0, idempotente): trocar a padrão não muda documento antigo.
- Na `CONTENT_FIELDS`: muda **só em rascunho** e conta como alteração.
  Escolha vazia ou inválida vira a padrão (`Brand::resolveId`). Cancelar
  revisão devolve a marca da versão.
- Campo **Marca** depois do Cliente, só com **mais de uma marca** e fora
  de DIA; logo da escolhida ao lado do select (select nativo não mostra
  imagem nas opções — lista com logos fica para se fizer falta). Leitura:
  "Marca: X" na linha de dados.
- Duplicar e Duplicar como levam a marca. Versão publicada imprime com a
  marca com que foi publicada.
- Marca em uso (documento ou versão) **não se exclui**; a padrão e a última
  também não.

#### Ícone do plugin (no commit do M-1)

`logo.png` (256 px, monograma C+) na raiz do plugin: o GLPI 11.0.6 usa no
lugar da letra colorida em Configurar → Plugins (achado 126).

#### Testes

PHP contra MariaDB real com stub mínimo do GLPI (`$DB` sobre mysqli,
Config, Session, Migration): 30 (M-1) + 13 (M-2). Cor pela logo no
Chromium com as 4 logos. Twig 3.14 estrito: tela de configuração (4
estados) e o campo Marca (4 casos). PDF com a marca Cacta no harness da
paginação.

### 3.16 Sessão de 04/10/2026 (tarde e noite) — 3c, editores, aprovadores, P3, J1

Commits: `3b6cd55` (3c-1), `bff4a1c` (A-1), `2dde64c` (A-2a), `45a58b4`
(P3), `ebc6f25` (A-2b), `c5d10bb` (3c-2 + J1, num commit só), `ae40fe3`
(3c-3), `382b7de` (3c-3b). Versões: 0.7.4 (A-1, Install), 0.7.5 (A-2a,
tabela nova), 0.7.6 (3c-3). Mockup aprovado à mão antes de cada bloco com
tela nova.

#### Decisões de Claudio (04/10/2026)

- **Proposta (3c):** total geral sim (bloco **Resumo do investimento**,
  logo depois da última planilha, cabeçalho **RESUMO**); **sem** condições
  comerciais e **sem** aceite com assinatura.
- **Planilha editada direto no documento**; colunas, tipos, fórmulas,
  excluir e reordenar linhas pelo botão **Parâmetros** (o duplo clique não
  abre mais a janela).
- **Vários editores** na Proposta e no Laudo (só usuários).
- **Aprovadores** (vários, só usuários) em **Diagrama e Documento Diverso**:
  etapa nova antes do responsável; cada um aprova, **em qualquer ordem**;
  qualquer um devolve e a devolução **zera** as aprovações; **sem aprovador,
  fluxo de antes**; aparecem no rodapé da edição, na leitura e no PDF.
- **P3 — papéis no documento:** saem do perfil "Revisar e editar" e
  "Aprovar"; responsável, editores, revisor e aprovadores são escolhidos no
  documento entre **quem tem Ler** (interface padrão). **Auditar continua no
  perfil.** **Quem montou o documento (autor, editores, revisor) não aprova
  nem audita** (o responsável também não é aprovador: já aprova a etapa
  dele). Substitui o P1 (26/09) na parte dos bits.
- **Modelo é dado da instalação, não código do plugin.** O modelo completo
  de Proposta (Resolutto) fica no banco da homologação e vai para produção
  como dado, por comando, junto com os documentos. Sem exportar/importar de
  modelos — salvo para importar **modelos prontos distribuídos pela
  internet**, ideia para a **galeria de Modelos** (catálogo público da
  Teckcomp, importável pela tela Modelos; a decidir quando chegar a vez).
- Terceiros: recebem o plugin com modelos genéricos e montam os seus pelo
  "Salvar como modelo".

#### 3c-1 — planilha no lugar (`3b6cd55`, só JS)

- Ilhas `contenteditable=true` (células de texto, número e moeda) dentro do
  bloco travado (TinyMCE 7.9, achado 132). Travadas, com fundo cinza: coluna
  calculada, Total e célula com fórmula própria (`=`).
- Cada tecla grava no JSON (`data-cx-sheet`) e refaz calculadas e Total;
  ao sair, a célula é formatada. Tab/Shift+Tab, Enter desce, Backspace e
  Delete não apagam para fora da célula, colar só texto. **"+ Linha"** e
  **"⚙ Parâmetros"** (`data-mce-bogus="all"`, só no editor).
- `PreProcess` refaz a tabela pelo JSON: o gravado é igual ao de antes (sem
  migração). `parseNum`: "1.460" sem vírgula = 1460.

#### A-1 — vários editores (`bff4a1c`, 0.7.4)

- Tabela `documenteditors` (existia desde a R3c, sem uso; `groups_id` = 0).
  `src/DocumentEditor.php`. `users_id_reviewer` = **espelho do primeiro
  editor** (Histórico, busca, console). Install copia o editor antigo, uma
  vez. Campo múltiplo `users_id_editor[]` (achado 134). Histórico: "Editores:
  A → A, B" (mensagem simples; a aba Histórico ainda não existe — conferir
  em `glpi_logs`).

#### A-2a — aprovadores (`2dde64c`, 0.7.5)

- Tabela **`glpi_plugin_codexplus_documentapprovers`** (`users_id`,
  `date_approved` nulo = pendente). `src/DocumentApprover.php`.
- **O status continua `aprovacao`** durante a etapa (trava, visibilidade e
  revisão sem mudança); `signersPending()` decide se a vez é dos aprovadores
  ou do responsável. Selo "Aguardando aprovadores" e aviso "(1 de 2 já
  aprovaram)". Efeito colateral aceito: no filtro de status do Painel eles
  contam como "Aguardando responsável".
- Envio zera as aprovações e recusa aprovador sem Ler; responsável e
  Super-Admin **não pulam** a etapa; aprovador vê o documento (visibilidade
  por subconsulta) e aparece no "Aguardando você" do Painel.

#### P3 — papéis no documento (`45a58b4`)

- `Rights::roleUsers()` = quem tem Ler (o nome `approverUsers` /
  `reviewerUsers` ficou, apontando para ela). `Document::canUpdate()` estático
  exige só Ler; editar é do papel (`canUpdateItem`).
- `roleConflict()`: conferido ao escolher papéis, no envio (pega documento
  antigo com conflito) e na hora de agir (`builtByMe()` = autor, editores,
  revisor ou quem alterou na revisão). Auditor e aprovador bloqueados ainda
  devolvem. Exceção do A2 (setor de auditoria) mantida só para o auditor.
- `isProducer()`: quem só tem Ler mas tem papel em algum documento entra no
  Painel. Matriz do perfil sem "Revisar e editar" e "Aprovar"; texto da aba
  reescrito (sai "Etapa de transição").
- **Correção registrada:** a regra "quem editou não valida" estava citada no
  código do auditor mas **não era conferida** desde algum bloco anterior;
  voltou no P3 (achado 139).

#### A-2b — aprovadores na tela e no PDF (`ebc6f25`)

- `approverSummary()`: "Ana (05/10/2026), Bia (pendente)"; na versão
  publicada mostrada durante revisão, só os nomes (as datas já são da rodada
  nova — guardar quem aprovou cada versão pediria coluna na tabela de
  versões: backlog).
- Linha de identificação do PDF e do Word (`d.approvers`); PDFs dos três
  motores de diagrama (`data-sign` → linha abaixo do título). Aviso do PDF
  "AGUARDANDO APROVADORES".

#### 3c-2 — Resumo do investimento e J1 (`c5d10bb`)

- Botão **Resumo** (Proposta e DIV) insere `div.cx-sum` logo depois da
  última planilha; segunda vez só avisa. Linha por planilha com o nome = a
  **última linha** do bloco acima dela (achado 138), valor = total da última
  coluna em moeda somada; **Total geral**. Refaz a cada tecla, ao renomear,
  apagar, desfazer, abrir e gravar. Gravado = tabela comum.
- Com o botão novo, em 1920 px, **Importar, <> e Tela cheia** foram para o
  "•••" da barra.
- **J1 — salto de rolagem** (achados 129 e 130) e clique perdido na célula
  depois de selecionar a planilha (achado 131).

#### 3c-3 e 3c-3b — modelo de Proposta como dado (`ae40fe3`, `382b7de`)

- Modelo "Proposta — completa (levantamento, planilhas, resumo e escopo)":
  seis seções, duas planilhas (Materiais, Mão de obra) gravadas só com o
  JSON, Resumo, Atenção, Escopo com orientação (planta não cabe vazia num
  modelo: é imagem enviada). **Está no banco da homologação** (id 5 no teste;
  conferir o id real) e **não** no código (3c-3b).
- Fica do 3c-3 a parte genérica: **planilha remontada pelo JSON** quando a
  tabela não bate (`decorate`). Modelo padrão de Proposta do plugin agora é
  genérico (Objetivo, Escopo, Investimento, Prazos, Observações) — só vale
  em instalação nova.
- Sobra na homologação o marcador `codexplus_3c3_prp_full` em
  `glpi_configs` (inofensivo).

#### Testes da sessão

**Ambiente novo de validação** (achado 136): GLPI 11.0.6 real (tgz do
GitHub) + MariaDB no container, plugin copiado e instalado pelo console;
harness PHP com o Kernel do GLPI; tela pelo `php -S` com o roteador
`public/index.php` e Chromium (login `glpi`/`glpi`). Harnesses: A-1 (21),
A-2a + P3 (51), A-2b (5 de tela), 3c-1 (21 + roteiro 2 no TinyMCE 7.9.2),
3c-2 (10), 3c-3 (10 de tela + Install), J1 (salto medido com e sem a
correção, achado 133).

### 3.2 Identidade visual (`v0.6.5-alpha`)

Aprovada por Claudio em 20/09/2026, sobre mockup. **Só a tela**: o PDF monta
o próprio CSS em `codexplus.js` e continua em Arial.

- **Paleta:** a do protótipo do organograma (Etapa 9), nos tokens `--cx-` da
  seção 1 do CSS. Cada tipo tem cor própria (`--cx-type-POP` etc., com `-bg`
  e `-ink`) e os níveis do organograma já têm tokens (`--cx-l-*`). Cor de
  status continua semântica.
- **Fontes:** IBM Plex Sans, Sans Condensed (títulos, números) e Mono
  (códigos), só o subconjunto latino, em `public/fonts/` com a licença OFL.
  Nada de Google Fonts: o servidor não chama nada externo.
- **Marca do produto:** "monograma C+", SVG embutido em
  `templates/parts/brand.html.twig`, incluído no cabeçalho de todas as telas
  (`include ... with {title, subtitle} only`). A marca é do produto e fica no
  repositório; a **logo da empresa** continua dado da instalação e sai no PDF.
  O menu do GLPI mantém o ícone Tabler `ti ti-book-2` (ícone próprio ali
  exigiria mexer no núcleo).
- **Painel:** donuts "Por tipo" e "Situação" (conic-gradient montado no
  Twig, sem biblioteca) no lugar das barras de proporção; "Em dia" =
  publicado que não está a vencer nem vencido (inclui proposta); "Outros" =
  obsoleto ou sem metadados, só aparece se houver. Código dos recentes
  colorido pelo tipo (`.cx-code-type-*`); a situação fica na última coluna.
- **Painel no modelo novo (0.6.6, Claudio):** `Dashboard::loadAllNew()` lê
  `Document` com `Document::getVisibilityCriteria()` e devolve o mesmo formato
  de `loadAll()` mais `sector` e `owner`, para `getCounters`, `getByType`,
  `getAttention` e `getRecent` servirem aos dois modelos até a R5. "Em
  revisão" = status `validacao` (a R6 soma a revisão aberta). Indicadores e
  legendas não são links enquanto a tela Documentos listar o modelo antigo.
  Os atalhos "Criar a partir de um modelo" saíram do Painel até a R3b4.
- **Menu:** "Codex+" com o ícone Tabler `ti ti-square-rounded-letter-c-filled`
  (`Wiki::getIcon()`), o mais próximo da marca. Aparece só depois de sair e
  entrar (achado 32).

---

### 3.3 Diagramas — demonstração (`v0.6.7-alpha`)

Pacote enxuto da Etapa 9 (9a–9c) para a apresentação à gestão de 21/09
(Claudio, 20/09/2026).

- **Tipo `DIA`** em `DocumentMeta::DOCTYPE_KEYS`, só no modelo novo
  (`NEW_MODEL_ONLY`: o fluxo antigo de "Novo documento" usa
  `getLegacyDoctypes()` e não o oferece). Validade padrão por tipo em
  `DocumentMeta::VALIDITY_BY_TYPE` / `defaultValidity()`: POP e PSG 12,
  Manual 6, DIA 3, Proposta 0 (até a escolha na publicação existir).
- **Tabela** `glpi_plugin_codexplus_diagrams`: um por documento
  (`plugin_codexplus_documents_id` único), `subtype` (`organograma`), `data`
  (JSON). `src/Diagram.php` lê, grava e **valida** (forma, níveis, limites de
  tamanho e profundidade). Não é CommonDBTM: a permissão é sempre a do
  documento, checada antes em `front/document.form.php`. Purga junto com o
  documento (`Document::cleanDBonPurge`).
- **Motor** `public/js/codexplus-org.js` (carregado pelo hook, como o
  `codexplus.js`), adaptado do protótipo aprovado. `[data-cx-org]` monta
  edição (`data-editable="1"`, grava o JSON num hidden `_diagram` que vai no
  Salvar) ou leitura (zoom, ajustar, busca de pessoa sem acento). Todos os
  botões são `type="button"` e Enter nos campos não envia o formulário (o
  editor vive dentro do form do documento). CSS na seção 16, cores de nível
  nos tokens `--cx-l-*`.
- **Salvar** um diagrama alterado registra quem alterou
  (`DocumentContributor`: quem editou não valida) e atualiza `date_mod`.
- **PDF:** iframe fora da tela com o CSS do plugin, A4 paisagem, árvore
  ajustada para caber numa página e matriz na seguinte; nome sugerido
  `código - título` (achado 24).
- **0.6.7-3 (Claudio, 20/09/2026):** botão **Tela cheia** (edição e leitura;
  API de tela cheia do navegador, com classe `is-full` de reserva); zoom com
  Ctrl + roda centrado no ponteiro; arrastar o fundo para navegar; soltar
  um cartão **à esquerda ou à direita** de outro (vira colega, na ordem) ou
  **em cima** (vira subordinado), com marca de posição, e a árvore se
  reorganiza; **paleta** (Pessoa, Equipe, Vaga, Coringa NOC) arrastável;
  **Modelos** genéricos (estrutura funcional, suporte de TI com matriz ITIL,
  escritório de projetos, clínica, em branco), aplicados com dois cliques.
  Ligações extras (reporte funcional pontilhado) ficam para depois.
- **0.6.7-5 (Claudio, 20/09/2026): elementos padrão de mercado.** Paleta:
  Cargo, Área ou equipe, Vaga em aberto, Assessoria e Terceiro ou consultor
  (tracejado). Cada organograma guarda os **próprios níveis** em `levels`
  (chave, nome, cor), editáveis pelo botão **Níveis** (renomear, cor, criar,
  subir; nível em uso não se exclui), e os **elementos criados** em
  `elements` (nome, pessoa ou equipe, nível fixo ou "conforme a posição",
  tracejado), pelo "Criar elemento" da paleta. Padrão dos novos: Conselho,
  Diretoria, Gerência, Coordenação, Supervisão, Especialista, Operacional
  (`Diagram::starter()` e `STD_LEVELS` no motor: manter iguais). Organograma
  salvo antes, sem `levels`, abre com os níveis que já usava (N1, N2, NOC) e o
  NOC continua tracejado. Nó ganha `kind` (vaga, assessoria, terceiro,
  `el:<id>`) e `dashed`. `Diagram::validate()` aceita as chaves de nível do
  próprio diagrama e cor só em `#rrggbb` (a cor vai para um `style`).
  Biblioteca de elementos da empresa inteira = Etapa 9g (banco).
- **Regra de desenho:** quem não tem subordinados é **linha** no cartão do
  chefe; quem tem é **cartão próprio**. **0.6.7-6 (Claudio, 20/09/2026):**
  arrastar alguém com equipe e soltar numa lista (linha de um cartão, ou no
  meio de um cartão) abre a escolha: **deixar a equipe com o chefe atual**
  (os subordinados diretos sobem para o lugar dele, cada um com a própria
  equipe, e ele entra na lista como linha) ou **levar a equipe junto** (vira
  cartão). Ao lado de um cartão não pergunta. Durante o arraste, uma faixa
  avisa quantos subordinados a pessoa tem.
- **Desvio aprovado:** a leitura desenha do JSON publicado; o SVG da versão
  publicada, desfazer/refazer e o salvamento automático ficam para completar
  a 9a–9c. Sem nomes de pessoas no código (repositório público): o DIA nasce
  só com o topo, e o organograma real entra por "Importar ou exportar".

### 3.4 Motor de diagrama — grafo em canvas (20/09/2026)

> Substitui o desenho em árvore da seção 3.3 a partir dos blocos 2a–2d.
> **Decidido por Claudio em 20/09/2026**, a partir de cinco protótipos de uso
> real: inverter posições, arrastar sem perder ligações, criar elemento solto
> e ligar à mão. Nada disso cabia numa árvore.

**Formato gravado** (`glpi_plugin_codexplus_diagrams.data`):

```
{ "kind": "organograma",
  "levels": [ { key, label, color } ],
  "nodes":  [ { id, name, role, lvl, x, y, note, pend, group, dashed, kind } ],
  "edges":  [ { id, from, to, boss, style, label, waypoints: [ {x, y} ] } ],
  "esc":    [ ... ] }
```

- **`kids` não existe mais.** A hierarquia é lida das ligações. O `kids` que o
  desenho usa é montado a cada `rebuild()` e retirado na gravação (`ser()`
  filtra a chave) — nunca vai para o banco.
- **`x`/`y` ausentes = ancorado:** quem posiciona é o layout. Com as duas
  coordenadas, o elemento fica onde o usuário largou e **leva a equipe junto**
  (o deslocamento vale para toda a descendência).
- **`boss` decide tudo.** Uma ligação de chefia por elemento; ela define o
  time, a posição no arranjo e a cadeia de hierarquia. As demais são reporte:
  aparecem no desenho e não mexem em nada. Ciclo de chefia é recusado — o
  arranjo percorre essa cadeia — e a ligação entra como reporte, com o motivo
  na tela, em vez de se perder.
- **Compatibilidade:** `Diagram::validate()` e o `normalize()` do motor aceitam
  o formato antigo (`tree` com `kids`) e convertem; ligação sem marca de
  chefia, num diagrama onde **nenhuma** tem, vira chefia. A conversão acontece
  ao abrir; o formato novo só é gravado no primeiro salvamento.

**Desenho.** A lista aninhada saiu da tela: cada cartão é uma caixa posicionada
por `layoutTree()` e as ligações são traçadas em SVG, uma `<path>` por ligação
mais uma trilha invisível de 14 px que é a área de clique. Vira caixa quem tem
equipe, quem não tem chefe ou quem foi posicionado à mão; os demais são linhas
dentro do cartão do chefe. O traçado escolhe por onde sair conforme a posição
relativa (abaixo, acima, ao lado): receita única gerava traço solto no meio.
Elementos que passam da borda são acomodados por uma **origem de desenho**,
nunca mexendo na coordenada gravada — senão a posição vista e a gravada
divergem, e o cartão "anda sozinho" na abertura seguinte.

**Gesto.** O arraste nativo do navegador foi abandonado (achado 45): o gesto é
próprio, com uma cópia do cartão seguindo o cursor, guias de alinhamento a 8 px
e grade de 10 px como reserva. Limiar de 4 px separa clique de arraste; Esc
cancela.

**Salvamento automático** (`ajax/diagram.save.php`): grava só o diagrama, 2,5 s
depois da última mudança, sem recarregar. Repete as permissões do formulário
(`can($id, UPDATE)`), nunca reimplementa regra. Existe também para o Salvar da
tela cheia — recarregar derruba a tela cheia e o navegador não deixa voltar a
ela sem um clique do usuário.

**Dobras à mão (bloco 2d-2).** `waypoints` fica na ligação, na mesma
coordenada do `x`/`y` dos nós; sem dobra, a chave não existe e vale o traçado
automático. A linha passa pelos pontos em ordem, em retas; a ponta sai do lado
da caixa voltado para a primeira dobra (e chega pelo lado voltado para a
última), e ponto dentro do vão da caixa puxa a ponta para a mesma coluna — é o
que deixa a descida reta. Alças só na ligação selecionada: vazada no meio de
cada trecho (arrastar cria a dobra ali), cheia em cada dobra (arrastar move,
duplo clique desfaz). A dobra gruda na coluna ou na linha do vizinho (dobra
anterior e seguinte, ou centro da caixa na ponta), senão na grade; é assim que
se faz ângulo reto sem mira. Esc devolve como estava. "Endireitar" (painel da
ligação) tira todas; **"Arrumar" também**, porque dobra feita para um arranjo à
mão não serve ao automático. Durante o arraste só o SVG é redesenhado
(`drawLinks()`, separado do `layoutTree()`); o canvas alarga para caber dobra
fora das caixas. `Diagram::validate()` aceita até 20 pontos por ligação, com
coordenada inteira entre 0 e 20000 (achado 49).

**PDF (bloco 2d-3a).** `printCanvasHtml()` clona o canvas já desenhado — caixas
posicionadas e ligações em SVG — e tira portas, trilhas de clique, alças,
guias, seleção e destaque de busca; cada caixa leva a largura medida na tela,
para uma fonte atrasada no iframe não alargar o cartão por cima do vizinho. O
que se vê é o que sai, com posições, reportes e dobras. A lista aninhada
(`card()`) ficou só como reserva, e cobrindo todos os blocos (achado 50).

### 3.17 Sessão de 04/10/2026 (noite) — R6-b, R7, Etapa 5, telas

Commits: `96cbe2b` (3c-4), `f757c31` (R6-b1, 0.7.7), `207cda4` (R6-b2),
`ed00235` (R7-1, 0.7.8), `e8acd88` (R7-2a), `02e4f7c` (R7-2b), `ac6be3d`
(5a, 0.7.9), `d3e22fa` (dados em abas + tela cheia do fluxograma),
`9d48dae` (5b), `7315adf` (5c/5e), `ea02b8a` (5d).

#### 3c-4 — modelos de Manual, POP e PSG (`96cbe2b`)

- Três modelos completos entraram como **dado** na homologação por SQL
  único (Manual "passo a passo com prints (padrão Resolutto)", "POP —
  procedimento completo", "PSG — regimento completo"), padrão de cada tipo.
- Sementes do plugin (só instalação nova) sem a tabela "Histórico de
  revisão" escrita à mão (a R6-b imprime) e sem "Procedimentos vinculados"
  no PSG (a Etapa 5 lista).
- Imagem anexa no PDF da proposta (19/09): **cancelada** (a Planta cobre).

#### R6-b — prazo da revisão e histórico no PDF (`f757c31`, `207cda4`)

- Coluna `revision_due` no documento e tabela
  `glpi_plugin_codexplus_revisionevents` (aberta, prorrogada,
  sem_alteracao, cancelada; `RevisionEvent`).
- Abrir revisão: prazo = hoje + dias da Configuração (padrão 30, 1–365,
  campo em Configuração). Prorrogar: responsável ou Super-Admin, data ≥ hoje
  e diferente da atual, motivo obrigatório. Publicar ou cancelar zera o prazo.
  Revisão aberta antes da 0.7.7 fica "sem prazo" e ganha "Definir prazo".
- **"Revisão vencida" do Painel é uma linha só** (Claudio): publicado
  vencido **sem** revisão aberta + revisão aberta **fora do prazo** (+
  revisão sem prazo com o publicado vencido). Revisão aberta no prazo não
  entra. Lista que abre com o motivo de cada documento.
- Página: faixa vermelha "Revisão atrasada" só para quem tem papel.
- Histórico de revisões no fim do PDF (`DocumentVersion::history`): uma
  linha por publicação e por "revisado sem alteração", até a revisão
  impressa. Proposta e Laudo (fluxo direto) sem histórico.

#### R7 — acesso anônimo (`ed00235`, `e8acd88`, `02e4f7c`)

- Colunas `anon_token`, `anon_users_id`, `anon_date`, `anon_hits`,
  `anon_last`. Token de 48 hex; gerar de novo troca; revogar apaga. Gerir:
  responsável ou Super-Admin **com o bit Anônimo**. Só publicado ou em
  revisão (mostra a publicada com "Em atualização"); diagrama fora
  (Claudio: não precisa). Rascunho nunca publicado não tem a seção.
- `front/public.php` é a **única** rota liberada no Firewall
  (`STRATEGY_NO_CHECK`, registrado no `plugin_init`); confere o token e
  responde 404 neutro em qualquer outro caso. `?logo=1` entrega a logo da
  marca do documento; `?f=N` entrega imagem do corpo ou anexo **ligado a
  este documento e citado no corpo mostrado ou listado como anexo**.
- Seção "Acesso anônimo" na coluna Permissões, com formulário próprio fora
  do formulário de edição (`form=` nos botões).

#### Visualizar e link público em folhas A4 (`e8acd88`)

- `public/js/codexplus.js`: `buildPrint()` monta o HTML da impressão;
  `renderSheets()` mostra as folhas num iframe visível (escala no celular);
  `exportPdf()` usa o mesmo HTML. O artigo original só some quando as
  folhas estão prontas (falha = continua como antes).
- **Visualizar** mostra a versão que está na tela: numa revisão em
  andamento, o rascunho (:01); o link público mostra a publicada (:00).
  Marca d'água "RASCUNHO" nas folhas ficou para a caça a bugs.

#### Etapa 5 — documentos vinculados (`ac6be3d`, `9d48dae`, `7315adf`, `ea02b8a`)

- Tabela `glpi_plugin_codexplus_documentlinks` (pai, filho, rank),
  `src/DocumentLink.php`. Pares: PSG→POP/DIA, POP→MAN/DIA, MAN→DIA. Vários
  pais; sem ciclo; sem duplicado. **Gerem: responsável e editores (autor,
  revisor, editores da A-1) e Super-Admin, a qualquer momento** (Claudio).
- 5a: seção "Documentos vinculados" (netos em cinza), busca por título ou
  número, arrastar para reordenar, X para desvincular
  (`public/js/codexplus-links.js`, `parts/doc-links-rows.html.twig`).
- 5b: botão **Referência** no editor (`codexplus-docref.js`) insere
  `<a class="cx-docref" href="…?id=N">`. Ao salvar, o citado vira vinculado
  (`syncRefs`); citado não sai pela lista; na leitura o texto vira **código
  da versão em vigor + título atuais** (`resolveRefs`). "Documentos
  complementares" no **fim do documento** (Claudio: só no fim), na tela,
  nas folhas e no PDF; no link público apontam para o link público do
  citado, quando há.
- 5c/5e: "Faz parte de" na página do filho; aviso ao pai quando um
  vinculado fica obsoleto ou vencido ("cabe revisar"); Painel com
  "Vinculado obsoleto ou vencido" e "PSG sem POP vinculado" de verdade.
- 5d: **PDF completo** no Visualizar (só com vinculados): sumário na 1ª
  folha, cada documento em folha nova com o próprio cabeçalho, numeração
  única, versão publicada de cada vinculado, sem acesso / sem versão
  publicada com nota, repetido só no sumário ("ver página N"), fluxograma e
  organograma em folha A4 deitada (`@page land`). Matriz e cronograma: folha
  com nota (limite conhecido). Só interno.

#### Telas (`d3e22fa`)

- Dados do documento **recolhíveis em três abas** (Lugar e tipo; Pessoas e
  revisão; Permissões e link), faixa de resumo com "falta" em vermelho,
  preferência no `localStorage`; abre sozinho quando falta algo para enviar
  (`codexplus-meta.js`). Só tela: campos no mesmo formulário.
- Fluxograma: **Tela cheia** na leitura com zoom (−, +, Ajustar, Ctrl+roda).

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
27. **Perfil Self-Service perde todo direito de plugin na sessão.**
    `Session::changeProfile()` chama `Profile::cleanProfile()`, que, na
    interface simplificada, descarta tudo que não estiver em
    `Profile::$helpdesk_rights` (lista estática pública do núcleo). Por isso
    a aba Codex+ só aparece em perfis da interface padrão. Se for decidido
    dar acesso ao Self-Service, o caminho a testar é o plugin acrescentar
    `plugin_codexplus_wiki` a essa lista no `plugin_init`.
28. **`Migration::dropKey()` + `addKey()` com o mesmo nome não funciona numa
    passada só.** O `addKey` confere `isIndex()` na hora da chamada, quando
    o índice antigo ainda existe, e não enfileira nada. Para trocar um
    índice único por comum, a R1 usa SQL direto com guarda
    (`SHOW INDEX … Non_unique = 0`).
29. **Dá para testar o Install contra banco real no ambiente de quem gera os
    pacotes:** `apt-get install mariadb-server php-mysql` funciona lá. A R1
    foi validada instalando a 0.5.8, atualizando para a 0.6.0 com 5
    documentos, rodando duas vezes, comparando com a instalação do zero
    (schema idêntico) e desinstalando. O Twig 3.23 (versão do
    `composer.lock` do GLPI 11.0.6) baixa pelo GitHub e renderiza os
    templates do plugin sobre os templates reais do núcleo.
30. **Lista suspensa de plugin não precisa de `front/`.** Quando a URL não
    corresponde a arquivo nem rota, o `LegacyItemtypeRouteListener` do GLPI
    11 procura a classe `GlpiPlugin\<Plugin>\<Item>` a partir de
    `/plugins/<plugin>/front/<item>[.form].php` e, se for `CommonDropdown`,
    usa `DropdownFormController`/`GenericListController` do núcleo. Os
    direitos checados são os `can*()` estáticos da classe.
31. **Relação declarada para tabela sem classe gera aviso.**
    `DbUtils::getDbRelations()` emite `E_USER_WARNING` se a tabela de origem
    ou de destino de `plugin_<x>_getDatabaseRelations` não corresponder a um
    itemtype. Declarar relação só junto com a classe da tabela.

32. **O menu do GLPI fica guardado na sessão** (`$_SESSION['glpimenu']`,
    `Html::generateMenuSession`). Título da página e botão "+ Adicionar" das
    listas suspensas vêm dele. Plugin atualizado ou direito alterado só
    aparecem no menu depois de **sair e entrar** (ou trocar de perfil).
    `Session::reloadCurrentProfile()` recarrega os direitos mas não o menu.
    As checagens do servidor valem na hora; é só o botão que atrasa.
33. **`dohistory` só registra campo que tem opção de busca.**
    `Log::constructHistory()` percorre as `SearchOption` do itemtype para
    achar o campo alterado; campo sem opção é ignorado em silêncio. Por isso
    `Document::rawSearchOptions()` declara status, responsável (com
    `linkfield => users_id_owner`), revisão etc. mesmo antes de haver busca.
34. **`CommonDBRelation` copia a entidade do item 1 para a ligação.**
    `addNeededInfoToInput()` preenche `entities_id` com a entidade do
    documento quando o input não traz uma. Na base nativa não aparece porque
    `KnowbaseItem` não tem entidade. Nos alvos do Codex+ o `entities_id` é a
    entidade DO ALVO: `Document_Profile` e `Document_Group` usam
    `$disableAutoEntityForwarding = true`.
35. **`CommonDBVisible::showVisibility()` não serve para classe com
    namespace**: monta nomes como `'Group_' . static::class`. `Document`
    estende `CommonDBTM` com `haveVisibilityAccess()` própria (espelho da
    nativa, sem alvo por entidade); a tela de alvos da R3b é própria.
36. **O mapa tabela → classe é por requisição e o primeiro vence.**
    `DbUtils::getTableForItemType()` grava `glpiitemtypetables[tabela]`;
    `DocumentMeta` (com `getTable()` fixado) e `Document` usam a mesma
    tabela. Na R3a o mapa resolveu para `Document`, mas não dependa disso
    até a R5 remover `DocumentMeta`.
37. **Plugin pode ter comando de console sem registro:** o `CommandLoader`
    carrega de `src/` todo arquivo `*Command.php` cujo nome comece com
    `plugins:<plugin>:`. `AbstractCommand::loadUserSession()` abre a sessão de
    outro usuário e os direitos valem de verdade (no console `isCron()` é
    falso). `plugin:uninstall` pede confirmação: no roteiro, use `-n`.

38. **Plugin: classe com maiúscula no meio não é achada pela tabela.**
    `getItemTypeForTable('glpi_plugin_codexplus_sectormembers')` deduz
    `GlpiPlugin\Codexplus\Sectormember`; o autoloader PSR-4 do plugin
    procura `src/Sectormember.php` e não acha `SectorMember.php` (Linux
    diferencia maiúsculas). Só funciona se a classe já tiver sido carregada
    na requisição. Consequência: não declarar em
    `plugin_codexplus_getDatabaseRelations` tabela de classe assim
    (`SectorMember`, `DocumentEditor`); a limpeza vai no `cleanDBonPurge`.
    `Document_Category` e afins funcionam porque cada parte do nome é uma
    palavra só.
39. **`Migration::addRight()` só insere, nunca atualiza:** perfil que já tem
    a linha do direito não ganha bit novo por ele. Para dar bit a perfil
    existente (Super-Admin na R3c), ler e gravar `glpi_profilerights` com OU
    bit a bit.
40. **Pacote velho em `/tmp` é risco.** Em 20/09/2026 um
    `codexplus-docs-0.5.7-1.tar.gz` extraído depois da 0.6.2 (histórico do
    shell, linha 498) devolveu os documentos da 0.5.7 ao commit `5d528e4`;
    corrigido em `6c64b4d`. Regra no `DEPLOY.md`: apagar o pacote depois do
    commit.

41. **Select múltiplo por AJAX (`Dropdown::show` com `multiple`) usa o
    `name` como veio**: sem `"[]"` no nome, o PHP recebe só o último valor.
    Mas no modo `readonly` o próprio GLPI acrescenta `"[]"`. Por isso
    `document.form.php` passa `_categories[]` editável e `_categories`
    somente leitura. E as opções já escolhidas vão em **`value`**, não em
    `values`: com `multiple`, `Dropdown::show` faz
    `$params['values'] = $params['value'] ?? []` e apaga o que veio em
    `values` (o campo abria vazio e o Salvar reclamava de categoria).
42. **`Html::textarea` nasce com `enable_images = true`**: sem um destino
    para os arquivos (`filecontainer`/`addFiles`), imagem colada no TinyMCE
    se perde. Desligar até existir o destino (R3b3).

---

43. **O token CSRF é consumido a cada POST.** `Session::validateCSRF` (fonte
    do 11.0.6) faz `unset($_SESSION['glpicsrftokens'][$token])` ao validar.
    Endpoint chamado mais de uma vez pela mesma página precisa devolver
    `Session::getNewCSRFToken(true)` e o JS trocar o valor em **todos** os
    `[name="_glpi_csrf_token"]` — os formulários de fluxo compartilham o mesmo
    token, e sem isso "Enviar para validação" quebra depois de um autosave.
44. **Elemento que aparece durante o arraste e está no fluxo desloca o mapa.**
    A faixa "fulano tem N subordinados" empurrava o canvas ~40 px para baixo
    no instante em que o gesto começava, e o ponto de soltura era medido
    depois disso: o cartão caía deslocado da guia. Aviso que aparece durante
    gesto tem que ser `position: absolute` e `pointer-events: none`.
45. **Arraste nativo (HTML5 drag and drop) não serve para canvas.** Ele
    desenha um fantasma próprio, o elemento real não acompanha o cursor, e
    qualquer mudança de layout no meio do gesto estraga a conta do ponto de
    soltura. Três rodadas de teste até trocar por `pointerdown`/`pointermove`/
    `pointerup`. Com gesto próprio, `document.elementFromPoint` acha o alvo —
    a cópia que segue o cursor precisa de `pointer-events: none`.
46. **Sem `user-select: none`, pressionar sobre o texto do cartão inicia
    seleção de texto**, e o arraste só pega na borda. Era o "preciso clicar
    muitas vezes para pegar o cartão".
47. **Redesenhar a árvore ao selecionar mata o gesto em curso:** o elemento
    sob o cursor é trocado por outro. `select()` só acende a classe no
    elemento que já está lá.
48. **`var` içado engana:** `rebuild()` chamado no mount antes da linha
    `var byId = {}, parentOf = {}, T = null;` funcionava, e logo depois a
    declaração zerava o que ele tinha montado. Declarar acima da primeira
    chamada, não junto das funções.
49. **`Diagram::validate()` descarta toda chave que não conhece.** Campo novo no
    JSON do motor (como `waypoints` no 2d-2) some no primeiro salvamento se o
    PHP não for alterado junto — sem erro, o desenho só volta ao que era.
50. **O PDF do organograma desenhava a partir de `T`** (o primeiro elemento sem
    chefe), enquanto a tela desenha todos os blocos (`roots()`). Num diagrama
    ajustado à mão a tela parece uma árvore só, mas a chefia gravada pode ter
    mais de um bloco (DIA0001: o Tiago sem chefe e chefe do Rhuan) — o PDF saiu
    com 3 de 36 pessoas. Corrigido no 2d-3a. Regra: nada novo desenha a partir
    de `T`. O "Arrumar" revela a chefia gravada: vale conferir antes de usar.
51. **Template Twig alterado só aparece depois de `cache:clear`**: o GLPI
    guarda o Twig compilado e serve a versão antiga até limpar.
52. **Comando de console de plugin não pode ter opção `--version`**: colide
    com a opção global do Symfony Console.
53. **Dá para renderizar a página real do plugin no GLPI de quem gera os
    pacotes**: um comando de console temporário (fora do repositório) abre a
    sessão de um usuário, faz `include` de `front/<página>.php` dentro de
    `ob_start()` e grava o HTML. Apagar antes de empacotar.
54. **`can()` recebe o input por referência e o altera.** Em `CommonDBChild`
    (editores) ele acrescenta `entities_id` e `is_recursive`; usar o mesmo
    array depois numa consulta à tabela de editores dá "Unknown column"
    (1054). Busca de repetido com uma cópia, ou antes do `can()`.
55. **Direito nativo Gestão > Documentos: Ler libera qualquer arquivo.**
    `\Document::canViewFile` testa primeiro `can(READ)` do próprio documento
    do GLPI: perfil com esse direito baixa imagem e anexo de qualquer
    documento do Codex+, mesmo sem ler o documento. É a mesma regra da base
    nativa. Para o controle do Codex+ valer, esse direito tem que estar
    desligado nos perfis de leitores comuns.

56. **Ao Salvar, o GLPI troca só a tag `<img>` da imagem enviada.**
    `Toolbox::convertTagToImage` (11.0.6) acha `<img ...id="tag"...>` por regex
    e põe no lugar a `<img>` definitiva, levando só `width`/`height`. O que
    está em volta (um `<span>` com dados) fica intacto — é onde o anotador (E4)
    guarda as marcas.
57. **A leitura passa pelo sanitizador do GLPI**
    (`RichText::getEnhancedHtml` → `getSafeHtml`, Symfony HtmlSanitizer):
    `class` e `style` ficam em qualquer elemento; `data-*` só os de menção em
    `span`. Por isso os dados do anotador existem no gravado e no editor, não
    na leitura — que não precisa deles.
58. **A janela nativa "Inserir/editar imagem" do TinyMCE prendia o Salvar**
    (24/09/2026): na largura normal ela abria sobre o Salvar com a imagem
    anotada ainda em `blob:`; com o F12 aberto (editor estreito, barra
    recolhida em "…") não acontecia. O gatilho exato não foi achado; o plugin
    `image` saiu do editor do Codex+ e o problema sumiu. Se voltar, o sintoma
    será o seletor de arquivos do botão próprio abrindo no Salvar.
59. **Configuração do TinyMCE do GLPI é interceptável sem mexer no núcleo:**
    `tinymce_editor_configs[id]` é gravada e usada no mesmo passo (dentro de
    `$(function(){})`); um `Object.defineProperty` com *setter* nessa chave,
    instalado antes, recebe a configuração e a devolve ajustada.
60. **Inserir HTML ou imagem pelo caminho da colagem do GLPI:**
    `setRichTextEditorContent(id, html)` (fileupload.js) usa
    `mceInsertClipboardContent`, e o `PastePreProcess` do `glpi_upload_doc`
    envia toda `<img>` `data:`/`blob:`. Para enviar um blob próprio já no
    corpo: `data-upload_id` na `<img>`, `uploaded_images.push({upload_id,
    filename})` e `uploadFile(blob, editor)` (blob com `.name`); ao terminar o
    GLPI põe o `id` da tag na `<img>` — antes disso, Salvar grava `blob:`.
61. **Testar o editor em jsdom (quem gera os pacotes):** TinyMCE 7.9.2 do npm
    roda, mas seleção e formatação só no modo `inline` (a seleção dentro do
    iframe não funciona); é preciso simular `isContentEditable` (jsdom não
    tem; considerar a propriedade `contentEditable`), `Range.
    getBoundingClientRect`, `URL.createObjectURL` e `matchMedia`; ArrayBuffer
    tem que ser do mesmo *realm* da janela (`new w.Uint8Array(buf).buffer`);
    `docx` `Packer.toBlob` não termina no jsdom (no teste, usar o Packer do
    Node); o anotador precisa do pacote `canvas`. Conferência visual do
    `.docx` pelo LibreOffice (`soffice --headless --convert-to pdf`).
62. **Clicar fora do editor "clica" os botões ativos da barra.**
    `Html::initEditorSystem` (11.0.6) liga em `document` um clique que faz
    `$('.tox-tbtn.tox-tbtn--enabled').trigger('click')` para fechar menus;
    `tox-tbtn--enabled` é também a classe do botão de alternar **ativo**. Com
    o cursor em texto normal o "A" do tamanho (E1) fica ativo: clicar no
    título executava o A, que chama `editor.focus()`, e a página voltava ao
    corpo sem deixar digitar (Claudio, 25/09/2026). Negrito ativo sofria o
    mesmo. Correção em `codexplus-editor.js` (`guardSyntheticClicks`): clique
    sem `isTrusted` num botão deste editor é barrado na captura.
63. **`plugin:install` sem `--force` não roda o Install quando a versão é a
    mesma**: responde "já está instalado" e sai. Bloco com schema novo sem
    subir a versão (A2, 25/09/2026) precisa de `--force` (o `DEPLOY.md` já
    traz). Com `--force` o plugin é desativado: `plugin:activate` em seguida.
64. **Pacote instalado e não commitado some da história.** O T1 (0.6.9) foi
    instalado na homologação em 24/09 e ficou fora do GitHub; o A1 e o A2
    foram gerados a partir do GitHub e sobrescreveram 8 arquivos dele (o
    conteúdo foi recuperado do pacote em `/tmp` e juntado em 25/09). Antes de
    gerar pacote: `git status --short` no servidor tem que vir vazio.

65. **O GLPI recolhe texto longo na leitura.** `RichText::getEnhancedHtml`
    embrulha em `div.long_text` com "..." todo conteúdo acima de
    `GLPI_TEXT_MAXSIZE` (~4000 caracteres). Planilha e quadro guardam dados
    no corpo e passam disso; o PDF paginava o bloco recolhido e saía em
    branco. Usar `['text_maxsize' => 0]`.
66. **`<img data:>` inserida pelo `insertContent` é enviada pelo GLPI.** O
    `glpi_upload_doc` (achado 60) sobe e troca a imagem no meio do caminho —
    o bloco do quadro ficava vazio. Criar o bloco com marcador de texto e a
    `<img>` pelo DOM, já com o blob e o `data-upload_id`.
67. **Classe da `<img>` não sobrevive ao Salvar** (consequência do achado
    56: o GLPI troca a tag inteira). Marcar imagem por **posição** dentro do
    invólucro, não por classe: no quadro, a planta é a primeira `<img>` e só a
    última aparece (`img:not(:last-of-type)` escondida).
68. **Bloco `contenteditable="false"` com `data-*` sobrevive ao Salvar** no
    TinyMCE do GLPI (planilha, quadro). Na leitura o sanitizador tira os
    `data-*` (achado 57): leitura, PDF e Word usam o HTML renderizado.
69. **Self-Service e plugin:** a sessão começa antes do `plugin_init`
    (`SessionStart` 130 > `InitializePlugins` 110), então o `plugin_init`
    pode acrescentar o direito a `Profile::$helpdesk_rights` e reduzir o
    direito da sessão. `Hooks::REDEFINE_MENUS` vale também para o menu da
    interface simplificada (entrada direta na barra). Páginas próprias usam
    `Html::helpHeader()` / `helpFooter()` nessa interface.
70. **Planilha: célula vazia encolhe a linha** e as bordas dependiam da
    regra geral de tabela do editor. Célula vazia leva `&nbsp;`, e a
    planilha tem bordas próprias (`.cx-sheet-table`).
71. **Alterações que não foram pedidas na cópia de trabalho de quem gera os
    pacotes** (26/09: o E5 apareceu antes de ser explicado, vindo de um
    trecho de conversa perdido). Antes de empacotar: `git status` e
    `git diff` da cópia; nada entra no pacote sem ter sido pedido e
    explicado a Claudio.
72. **O jsdom não simula a captura do ponteiro** (`setPointerCapture`). No
    navegador, depois do `pointerdown` com captura, o `dblclick` chega no
    quadro e não na dobra: o Q2c passou nos testes e falhou com Claudio.
    Duplo clique agora é detectado no próprio `pointerdown` (tempo < 400 ms,
    distância < 8 px). Interação de arraste ou duplo clique **sempre** leva
    um passo no roteiro de teste, mesmo com testes verdes.
73. **Grade atrapalha ajuste fino.** Com zoom alto, a grade de 10 px da
    planta vira saltos de ~30 px na tela e o cabo não encostava na parede.
    Dobras e pontos de eletrocalha ficam livres (0,1 px), com encaixe nos
    vizinhos e Alt para soltar. A grade continua só para ícones, zonas e
    textos.
74. **Traço fino fica impossível de clicar com zoom baixo.** Faixa de
    clique transparente com `vector-effect="non-scaling-stroke"`: largura
    fixa na tela.
75. **Pacote gerado sobre bloco sem commit leva os dois.** O Q2b estava
    aplicado e aprovado, mas sem commit, quando o Q2c foi aplicado; o commit
    `87c94a7` levou os dois. Commit do bloco aprovado **antes** de aplicar o
    pacote seguinte; se não deu, o roteiro do pacote novo avisa.
76. **TinyMCE 7 marca cada botão da barra com `data-mce-name`** (inclusive
    dentro da gaveta "…" do modo floating, que fica **fora** do contêiner do
    editor). Para esconder botão por regra (T2): marca no `<html>` e CSS
    `html[data-cx-hide~="x"] [data-mce-name="x"]`. A barra não se remonta
    depois do `init`.
77. **O `PreProcess` do TinyMCE recebe uma CÓPIA do corpo** (clone num
    documento novo; `e.node` é o `body` desse documento). Dá para limpar o
    que vai para o gravado (legenda órfã, Q3b) sem mexer no que está na tela.
78. **Imagem nítida no documento:** o GLPI mantém `width`/`height` da `<img>`
    ao trocar a tag (achado 56). Gerar o PNG em 2x e gravar `width`/`height`
    de 1x (legenda do Q3b).
79. **Ícone em imagem precisa de resolução de sobra.** Ícone vetorial não
    pixela; o criado a partir de imagem, sim: zoom do quadro, ícone grande
    (até 160 px) e PNG do documento em 2x. 256 px e
    `imageSmoothingQuality = 'high'` na redução. Imagem de origem pequena não
    tem conserto.
80. **Validação local de Twig e PHP:** `php8.3-cli` + `php8.3-mbstring` pelo
    apt e o Twig 3 (tarball do GitHub) renderizam parciais em modo estrito
    (`strict_variables`), sem o GLPI. Pega variável faltando antes do teste
    de Claudio. O `insertContent` do TinyMCE **não roda no jsdom** (caminho
    de quadro novo só se confere no navegador).
81. **`<svg>` não tem `offsetLeft`/`offsetTop`** (só elemento HTML tem): a
    conta dava `NaN`, o navegador ignorava a posição e a barra flutuante caía
    cortada no canto do palco (Q5c-1). Posição de coisa HTML sobre o SVG =
    `svg.getBoundingClientRect()` menos o do palco. O jsdom também não tem
    essas propriedades, e o teste só pegou depois de simular retângulos
    reais de tela — teste de posição precisa de `getBoundingClientRect`
    falso com números de verdade.
82. **jsdom e o tempo:** o duplo clique do motor é detectado por intervalo
    (400 ms); testes seguidos rápido demais viram duplo clique sem querer —
    esperar entre eles. O `setTimeout(fit)` da abertura nem sempre roda
    antes do teste: chamar `act('fit')` logo depois de abrir.
83. **Desenho se confere rasterizando.** `_boardSvg()` + `cairosvg` (SVG
    serializado com `XMLSerializer`, não `outerHTML`) mostrou o que nenhum
    teste de DOM pegou: metros aparecendo na ligação de fluxo, ponta grossa
    encavalando no cotovelo, nome do gateway sobre a saída "Não", espaço de
    60 apertado para o balão. Bloco visual só sai depois de ver a imagem.
84. **Elementos por paleta se garantem no `clean()`**, ao abrir: fluxograma
    descarta ícone e eletrocalha e força ligação `fluxo`; Planta e Topologia
    descartam forma. Dado antigo abre sem o que não pertence à paleta.
85. **Nome de campo pelo que ele muda.** "Pequeno/Médio/Grande" sem dizer do
    quê levou Claudio a achar que era a espessura da linha (era o texto do
    rótulo). Rótulos explícitos: "Espessura da linha", "Tamanho do texto do
    rótulo", "Tamanho da letra".
86. **Forma sem fundo precisa de área de clique.** Anotação: retângulo com
    `fill-opacity="0"` (conta como pintado, recebe o clique); Grupo: sem
    fundo de propósito (o que está dentro continua clicável) e borda
    transparente larga só na tela.
87. **Uma lista, duas vistas.** A Biblioteca filtra no cliente escondendo o
    `<li>`; a lombada mora dentro do mesmo `<li>`, e a vista (Estante/Lista)
    é só CSS pelo `data-view` do contêiner. Como a estante dá `display:block`
    ao `<li>`, o `[hidden]` precisa de `display: none !important`.
88. **Tábua contínua com um gradiente.** `repeating-linear-gradient` (164 px
    transparente + 26 px de tábua) no `<ul>` e `gap` vertical de 26 px: cada
    linha de lombadas cai exatamente sobre uma tábua, inclusive a última
    linha incompleta (`padding-bottom` de 26 px).
89. **Montante no vão da grade.** `column-gap: 14px` + `::after` de 14 px à
    direita de cada nicho (`:nth-child(4n)` sem; na tela estreita, `2n`), com
    `row-gap: 0` e o respiro dentro do nicho (`padding-top`) — assim o
    montante é contínuo de cima a baixo.
90. **Nicho clicável com links dentro não pode ser `<a>`** (link dentro de
    link é inválido): o nicho é `div[data-href]` com clique em JS que ignora
    cliques em `a`; o nome na tábua é o `<a>` real (teclado e leitor de tela).
91. **Harness do controlador.** Um GLPI de mentira (`inc/includes.php` com
    `Session`, `Html`, `TemplateRenderer` usando o Twig 3.14 de verdade e os
    stubs das classes vizinhas) roda o `front/library.php` e a `Library`
    reais sobre 100 documentos de exemplo, em todos os modos. Screenshot e
    teste de clique no Chrome headless (`--screenshot`, `--dump-dom` com um
    script que escreve o resultado no `<title>`). Mais forte que renderizar
    só o template.
92. **Instalação do zero se confere pelo `information_schema`.** Listar
    tabela, coluna, tipo, nulo e padrão das tabelas `glpi\_plugin\_codexplus%`
    nos dois bancos (`mysql -N`), ordenar e fazer `diff`: igual = o
    instalador novo e as atualizações chegam ao mesmo banco. GLPI novo pelo
    console: `database:install --db-host --db-name --db-user --db-password
    --default-language=pt_BR -n`; plugin por `git clone --branch <tag>`.
93. **`su` sem hífen não traz `/usr/sbin` no `PATH`** (`a2ensite`,
    `apache2ctl`… "comando não encontrado"). Entrar como root com `su -`.
94. **O GLPI estiliza todo `<select>`** (borda, altura, padding): um select
    dentro de outra caixa (os chips do SC1) precisa zerar isso com
    `!important`, senão vira caixa dentro de caixa e corta o texto.
95. **Painel do quadro redesenhado no meio de um `input`.** O `change` que
    o navegador dispara depois cai num elemento já fora da página e não
    chega ao `props`: o `props.__snap` não volta a `false` e as alterações
    seguintes viram um passo só do Ctrl+Z. Quem chama `drawProps()` dentro
    do `input` zera `__snap` na hora. O `change` genérico redesenha o painel
    em todo `select`: campos com vida própria (`data-lk`) ficam fora, senão
    o resultado de uma busca assíncrona some.
96. **`clipPath` com id novo a cada desenho.** O mesmo quadro aparece na
    página (leitura) e no editor ao mesmo tempo, e ids repetidos fazem o
    navegador usar o recorte do primeiro, com a geometria antiga.
97. **O servidor só guarda `v`, `mode`, `w`, `h`, `items` e `lib` do
    quadro** (`Diagram::validate`). Dado novo do fluxograma mora num item
    (raia como item `lane`; o tamanho do cabeçalho repetido em cada raia).
98. **Downloads do Claudio:** no PC "Analista Resolutto" o navegador salva
    em **Documentos**; no PC "Pc", em **Downloads**. O comando de envio
    traz as duas linhas. Para achar um pacote: `dir /s /b
    "%USERPROFILE%\<nome>*"`.
99. **Commit pulado junta blocos.** Q5g-1 e Q5g-2 foram aplicados sem
    commit e entraram no commit do Q5g-3 (`ae802bc`). O código está certo,
    mas o histórico perde a divisão. Reforça o achado 75: commit do bloco
    aprovado antes do pacote seguinte; o primeiro `git status` de cada
    pacote tem que sair vazio.

100. **Ctrl+V com janela aberta sobre o quadro.** O `onKey` do quadro
    (captura no `document`) faz `preventDefault` no Ctrl+V e mataria o
    evento `paste`. Janela de importar aberta: o `onKey` sai antes. O
    colar sem campo de texto é um ouvinte `paste` no `document` enquanto a
    janela está aberta — funciona em HTTP (`navigator.clipboard.readText`
    só em HTTPS, e a homologação é HTTP).
101. **Arquivo solto fora da área certa abre no navegador** e o desenho não
    salvo se perde. O quadro previne `dragover`/`drop` de arquivos em toda
    a janela; só a área de soltar e o palco tratam o arquivo.
102. **`.mmd` é extensão de outro formato** (karaokê,
    `application/vnd.chipnuts.karaoke-mmd`): sistemas e IAs podem recusar o
    anexo. O Mermaid sai em `.md`; a importação reconhece pelo conteúdo,
    qualquer extensão.
103. **O Mermaid sozinho põe os `subgraph` lado a lado**, pequenos (não são
    raias). A dagre agrupa, mas não monta faixas alinhadas. O layout é
    próprio: colunas por caminho mais longo **por raia**, voltas fora, linha
    herdada de quem alimenta. Colunas globais (sem reiniciar por raia)
    viram uma escada de 6000 px.
104. **Cor de fundo se compara pelo matiz, não em RGB.** Fundos claros ficam
    perto de tudo: em RGB o rosa `#fdd` caiu em âmbar. Pelo matiz (HSL),
    com cinza/branco pela saturação e a variante forte pela claridade. O
    tom exato da paleta é conferido antes (ida e volta sem perda).
105. **Ligação entre raias entra pelo lado errado e parece seta dupla.**
    Escolher os lados só pela posição horizontal fazia a seta de uma raia
    entrar pela direita da forma de destino, colada na saída dela. Troca de
    raia sai pelo lado da outra raia e corre por corredor no fim da raia;
    com forma embaixo na mesma coluna, sai pela frente e desce ao lado.
106. **Conferir Mermaid gerado com a biblioteca oficial:** `npm i
    mermaid@11` e `mermaid.render()` no Chromium (playwright). O leitor
    próprio é testado contra as mesmas amostras; os dois têm que concordar.
107. **`hidden` não esconde botão com classe que define `display`**
    (`.codexplus-btn`, `.cx-board-pal-top`): o CSS da classe vence o
    atributo. Esconder com `style.display = 'none'` (ou CSS próprio).
108. **Duas `function` com o mesmo nome no mesmo escopo**: a segunda substitui
    a primeira em silêncio, inclusive nas chamadas anteriores (o `build()` do
    quadro é um escopo só, com centenas de funções). Q6c: `orgLevels()`
    (lista) quase foi trocada pelo diálogo de mesmo nome. Procurar o nome
    antes de declarar.
109. **`min-width`/`max-width` do cartão do organograma são de conteúdo**
    (`box-sizing: content-box`): 178–230 **mais** as bordas (6 + 1). Quem
    mede em JS soma as bordas depois de limitar.
110. **SVG desenhado como imagem não enxerga as fontes da página.** Para o
    PNG (SVG → `<img>` → canvas), embutir `@font-face` com as fontes em data
    URL dentro do SVG (`fontCss()` no `codexplus-orgdraw.js`).
111. **`Diagram::coord()` grava posição como inteiro >= 0.** Na edição, a
    posição pode ficar negativa (a origem do desenho compensa, inclusive no
    desfazer); **ao gravar**, o organograma inteiro é deslocado até a mais
    negativa virar 0 (`orgNormPos()`), fixando antes o topo ancorado.
112. **Medir deslocamento no espaço gravado, não no da tela**: quando o
    arranjo cresce para a esquerda ou para cima, a origem muda e a caixa
    "anda" sem ninguém mexer. `orgBoxNow()` desconta `ORG_PAD` e a origem.
113. **Playwright: `page.evaluate("window.x = function(){…}")` executa a
    função** (texto que é uma expressão de função vira função a chamar).
    Embrulhar em `(function(){ … })()`. E `inner_text` não lê texto de SVG:
    usar `textContent`.
114. **Pacote enviado mas não extraído**: md5 certo e "nada mudou" na tela.
    Antes de suspeitar de cache, rodar o `grep -c` do token novo no
    servidor (deu 0 na tela cheia, 03/10). Com 0, é o `tar` que faltou.
115. **Conferir a cópia testada**: os roteiros do Chromium rodam numa pasta
    de teste; uma vez rodaram contra o JS anterior (esquecido de copiar).
    Antes de cada rodada, `grep -c <token novo>` na pasta de teste.
116. **Mockup aprovado tem que estar à mão antes de construir**: os mockups
    do Q7b não estavam no repositório nem na base; o Q7b-1/2 saiu da
    descrição escrita e divergiu (colunas, marco, cabeçalho, botões). Pedir
    as imagens no começo do bloco e montar a comparação "mockup × código"
    com os mesmos dados antes de entregar.
117. **Achado 107 de novo, na barra da grade**: com a barra visível na
    leitura, o Exportar PDF escondido (`hidden`) reaparecia —
    `.cx-grid-bar [hidden] { display: none !important; }`.
118. **Campo de edição de 100% numa célula com outros elementos** é
    empurrado para fora (célula com `overflow: hidden` mostra só "l…"):
    caixa flexível (`.cx-gd-nome`) com o texto em `flex: 1; min-width: 0`.
    Esconder os botões da linha com `:focus-within` **engole o clique** nos
    próprios botões: usar uma classe posta pelo JS (`is-editando`).
119. **Situação só no publicado**: na edição de um rascunho nada muda (é o
    esperado — não é pacote faltando). Para testar, publicar o documento.
120. **Id por linha sem migração**: `validate` dá `r` + posição a quem não
    tem id — estável enquanto o JSON não muda (leitura e versões
    publicadas, que passam por `validate`), gravado na próxima edição.
    Linha nova no motor: `t` + 6 caracteres aleatórios. Tabela de IA (sem
    id) herda pelo tipo + nome.
121. **Tela cheia só mostra o que está dentro dela**: diálogo anexado ao
    `body` fica invisível; anexar ao `document.fullscreenElement` quando
    houver. E o Esc da reserva por CSS precisa ignorar diálogos abertos.
122. **Testes com data fixa**: jsdom — trocar `window.Date` por subclasse
    (construtor sem argumentos = data fixa; manter `Date.UTC`) **antes** do
    `eval` do motor; Playwright — o mesmo por `add_init_script`. Endpoint
    simulado com `page.route()` (`route.fulfill` com o JSON da resposta).

123. **`getBoundingClientRect()` não inclui margem, e margem de filho vaza
    do pai** sem padding/borda (`div.cx-sheet > table`). Paginação manual
    soma margens e usa `display: flow-root` no bloco, igual na medição e na
    folha.
124. **Teste de paginação mede em modo impressão e com DOCTYPE.**
    `page.emulate_media(media='print')`; e `outerHTML` não traz o
    `<!DOCTYPE>` — `set_content` sem ele cai em modo quirks, a tabela perde
    o `line-height` herdado e as linhas ficam ~6 px mais baixas (o teste do
    pacote -1 passou e o PDF real ainda sobrepunha).
125. **Conferir todos os documentos de uma vez**: no servidor, um
    `doc-<id>.html` por documento (`mysql -N --raw ... SELECT content`) e
    as dimensões das imagens por `file -b` em `GLPI_DOC_DIR/<filepath>`
    (`imagens.tsv`); no harness, cada imagem vira um retângulo do mesmo
    tamanho. JPEG: a dimensão é a que vem depois de `precision 8,` (a
    primeira `NxN` é a densidade).
126. **Ícone do plugin no GLPI 11.0.6**: `logo.png` na raiz da pasta do
    plugin (`Glpi\Marketplace\View`, linhas 248–251; servido pela rota
    `/Plugin/{key}/Logo`). Sem ele, a letra colorida; plugins do
    Marketplace usam o logo de lá.
127. **Bloco de commit começa com `cd` para a pasta do plugin**: o bloco de
    aplicar termina em `/var/www/html/glpi` (console), e o commit do M-2
    rodou lá ("not a git repository"). E o `logo.png` aplicado antes do
    commit do M-1 entrou nele (achado 75 de novo).
128. **Logo com fundo escuro e texto branco não serve no PDF** (Buzz):
    tirar o fundo deixa o texto invisível no papel. Precisa da versão para
    fundo claro. Logo pequena (Ponto, 241×43) sai borrada: para 14 mm de
    altura, ~110 px de altura.

129. **TinyMCE 7.9 + autoresize pula a página ao receber o foco.** No
    `focusin` vindo de fora do editor (Chrome e Safari), o FocusController
    chama `iframe.scrollIntoView({block:'center'})` se o **topo** do iframe
    está fora da tela — com autoresize, quase sempre. A página ia para o
    meio do documento entre apertar e soltar o botão, e o clique caía em
    outro lugar. Correção (J1, `codexplus-editor.js`): sobrescrever o
    `scrollIntoView` **da instância** do iframe e só rolar se ele estiver
    inteiro fora da tela.
130. **Bloco travado selecionado rola até o fim.** Com um `contenteditable=
    false` selecionado, o TinyMCE dá foco ao `body` e ao
    `.mce-offscreen-selection` sem `preventScroll`; o navegador rola até o
    contêiner. Correção: no `HTMLElement.prototype.focus` da janela do
    iframe, `preventScroll:true` para esses dois.
131. **Clique em célula editável depois de selecionar o bloco se perde**
    (cursor fora da planilha). No `click`, se o alvo é `td.cx-sheet-edit` e
    a seleção não está nele: `focus()` + `caretRangeFromPoint` (ou
    `select(td, true)` + `collapse`).
132. **Ilhas editáveis no TinyMCE 7.9:** `contenteditable=true` dentro de
    `contenteditable=false` funciona (foco e digitação no `td`). Marcas só
    no editor; botões com `data-mce-bogus="all"` (saem do `getContent` e do
    Desfazer); `PreProcess` recebe uma **cópia** — refazer ali a tabela pelo
    JSON. Atalhos (Tab, Enter) no `keydown` com `prepend` +
    `stopImmediatePropagation` (passam na frente do plugin `table`).
133. **Medir salto de rolagem no Playwright:** `locator.click()` rola o
    alvo para a tela antes de clicar (mascara o bug) — usar `page.mouse.click`
    em coordenadas de algo já visível; e a página do GLPI tem rolagem suave:
    `scroll-behavior:auto` antes de medir, senão mede no meio da animação.
134. **`Dropdown::showFromArray` com `multiple`:** gera `name[]` e um hidden
    `name` vazio antes do select — sem nada escolhido chega `''` (dá para
    esvaziar a lista). Tratar `''`, id solto e array (`DocumentEditor::
    normalize`).
135. **`post_updateItem` roda em todo update bem-sucedido** e `$this->input`
    ainda tem as chaves com `_` (listas como `_editors`, `_approvers`):
    gravar listas filhas ali. Comparar listas como conjunto (ordem da tela
    não é mudança) e manter primeiro quem já estava.
136. **Harness com o GLPI real no container:** `define('TU_USER', …)` antes
    do autoload (sem ele, `Session::init` quebra no `session_regenerate_id`
    do CLI); `Kernel('development')->boot()`; MariaDB e `php -S` morrem
    entre chamadas — subir no mesmo comando. Cache estático das nossas
    classes (`DocumentApprover`, `DocumentEditor`) dura o processo inteiro:
    em teste, mexer pela API, não por SQL direto.
137. **Modelo de cenário não vai no Install.** Modelo com a cara de um
    cliente é dado da instalação: leva-se como linha da tabela de modelos
    (`mysqldump --where`), nunca por semente. O plugin só traz modelos
    genéricos (3c-3b).
138. **Texto colado de fora junta várias "linhas" num parágrafo** com `<br>`
    ("AVALIAÇÃO; texto… <br> MATERIAIS…:"). Para pegar o título logo acima
    de um bloco: última linha do elemento anterior, contando `<br>` e
    blocos filhos como quebra.
139. **Regra prometida na entrega precisa de teste.** No A-2a foi dito que
    "quem editou não valida" valia para os aprovadores, e não estava
    implementado — nem para o auditor (o comentário citava a regra, o código
    não conferia). Toda regra escrita no texto da entrega entra no harness.
140. **Twig no container fica em cache:** depois de trocar template no
    ambiente de validação, `cache:clear` antes do teste de tela, senão a
    página sai com o Twig antigo e o teste acusa falso erro.
141. **`Branding::save()` zera os interruptores que não vieram no POST.**
    Chamar com uma chave só (harness) desliga logo, rodapé etc. Na tela não
    acontece (o formulário manda tudo); em teste, passe a configuração
    inteira.
142. **Condições do `DBmysqlIterator` somadas com `+` perdem chaves
    numéricas** (a visibilidade sumia da busca de vinculados). Junte blocos
    como elementos (`[$a, $b]`), nunca `$a + $b`.
143. **O sanitizador da leitura codifica `=` em `href` como `&#61;`.** Quem
    lê o `id=` de um link já sanitizado tem que aceitar `=` e `&#61;`.
144. **Rota sem login no GLPI 11:**
    `Firewall::addPluginStrategyForLegacyScripts('codexplus',
    '#^/front/public\.php$#', STRATEGY_NO_CHECK)` no `plugin_init`. A página
    não pode depender de sessão; arquivo do GLPI sai por
    `\Document::getAsResponse()` (ou `Toolbox::getFileAsResponse`) com
    `return`.
145. **Front que às vezes responde JSON:** o `Wiki::pageHeader()` tem que
    ficar de fora nesse pedido (senão sai HTML antes do JSON).
146. **Macros Twig no meio do template quebram;** lista recursiva vai por
    `include` de um parcial (`parts/doc-links-rows.html.twig`).
147. **TinyMCE grava o `href` absoluto** (com host). Quem lê citações não
    pode depender do host; a leitura reescreve o link.
148. **Folha deitada no meio do PDF retrato:** `@page land{size:A4
    landscape}` + `.cx-page--land{page:land}` (Chrome/Edge). Paginação de
    vários documentos: `planPages()` por palco `.cx-stage`, montagem e
    numeração depois.

## 6. Contrato de código — não quebrar

### Os cinco seletores do PDF

`public/js/codexplus.js` remonta o documento para impressão a partir destes
seletores. Desde a R3b3-2 eles existem em dois templates: `article.html.twig`
(modelo antigo) e a visão de `document-form.html.twig` (modelo novo). **São interface, não decoração.** Renomear qualquer um quebra a
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

Desde o E3 os mesmos seletores alimentam o **Word** (`codexplus-export.js`,
botão `#codexplus-docx`), que lê a configuração por `window.CodexplusPrint`.

Elemento novo dentro de `#codexplus-doc` **não** entra no PDF
automaticamente — o JS monta o HTML a partir dos seletores acima, não clona o
contêiner inteiro.

### Outras regras

- Design tokens CSS com prefixo `--cx-`, declarados em `:root`. Os tamanhos
  do editor (`--cx-size-sm`, `--cx-size-lg`) são **proporção** (0,87 e 1,2),
  lida também pelo JS do editor, do PDF e do Word — não trocar por px
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
| Produção (futura) | **Debian 13, SSH na porta 2022** (decisão de 02/10/2026); recebe o Codex+ só na etapa final, depois da conferência do servidor |
| Usuário de acesso | `resolutto` (sem sudo); **todo o trabalho é feito como root** (`su -`) |
| Caminho do GLPI | `/var/www/html/glpi` |
| Dono dos arquivos do plugin | `www-data:www-data` |
| Repositório no servidor | **a própria pasta do plugin**, `plugins/codexplus` (desde 19/09/2026, igual aos demais plugins da Teckcomp) |
| Repositório remoto | `github.com/teckcomp/glpi-plugin-codexplus` (público) |
| PC de desenvolvimento | Windows, sem Git local; transferência por `scp` (OpenSSH do Windows). Dois PCs: "Analista Resolutto" salva em `Documents`, "Pc" em `Downloads` (achado 98) |
| Ferramentas no servidor | `git` sim; `zip`/`unzip` **não** — pacotes em `.tar.gz` |
| Produção | **Codex+ não instalado.** Só sobe ao atingir o marco "Pronto para produção" (ver `ROADMAP.md`) |

O servidor antigo `192.168.1.50` não é mais usado (substituído em 09/2026).

Ver `docs/DEPLOY.md` para o fluxo completo de publicação e teste.

---

## 8. Onde estão as coisas

```
codexplus/
├── setup.php                  registro do plugin, hooks, versão, Self-Service (S1)
├── logo.png                   ícone do plugin em Configurar → Plugins (achado 126)
├── hook.php                   install/uninstall, menu direto no Self-Service (B1)
├── src/
│   ├── Install.php            schema, direitos, modelos semeados
│   ├── Wiki.php               entrada do menu e cabeçalho das páginas (R5)
│   ├── Library.php            Biblioteca: Setor → Categoria, lixeira, nichos e decoração (B1, R5, B2)
│   ├── LegacyMigration.php    migração da Base de Conhecimento (R4)
│   ├── DocumentMeta.php       tipos, código, vencimento, fluxo por tipo (P2)
│   ├── Template.php           modelos por tipo, lista da criação, sem imagem (R3b4, M1)
│   ├── Dashboard.php          indicadores do Painel (modelo novo)
│   ├── Branding.php           marca, cabeçalho, JSON de impressão
│   ├── Rights.php             bits, Super-Admin, roleUsers (quem tem Ler, P3), auditores, isProducer (P1, B1, P3)
│   ├── ProfileTab.php         aba Codex+ em Perfis (Self-Service só Ler)
│   ├── StructureRights.php    direitos de setores e categorias (R2)
│   ├── Sector.php             setor (organização; setor de auditoria)
│   ├── Category.php           categoria em árvore com setor herdado (R2)
│   ├── Document.php           documento, papéis, fluxo, visibilidade
│   ├── Document_*.php         ligações: categoria, perfil, grupo, usuário (R3a)
│   ├── TargetRelation.php     comum aos três alvos de leitura (R3a)
│   ├── DocumentContributor.php quem alterou cada revisão (histórico)
│   ├── DocumentEditor.php     editores da Proposta e do Laudo (A-1)
│   ├── DocumentApprover.php   aprovadores de DIA e DIV, data de cada aprovação (A-2a)
│   ├── DocumentVersion.php    versões publicadas (R6-a)
│   ├── Diagram.php            diagrama DIA: organograma, cronograma (com datas: Q7b), RACI (D1), fluxograma (Q5a)
│   ├── ScheduleStatus.php     situação das tarefas do cronograma (Q7b-4)
│   ├── Brand.php              marcas: nome, logo, altura, cor, padrão; marca para a impressão (M-1, M-2)
│   ├── IconLibrary.php        ícones do quadro criados pelo Super-Admin (Q4)
│   └── Console/               comandos de teste (plugins:codexplus:…)
├── ajax/
│   ├── diagram.save.php       grava só o diagrama, sem recarregar
│   ├── schedule.status.php    Iniciar / Concluir / Reabrir tarefas no publicado (Q7b-4)
│   ├── icons.php              ícones criados: lista, criar, editar, excluir (Q4)
│   └── document.targets.php   leitores pela coluna Permissões
├── front/                     controllers (rodam em escopo de função!)
│   ├── dashboard.php          Painel (quem produz)
│   ├── library.php            Biblioteca (entrada de quem só lê)
│   ├── document.form.php      documento: criar, editar, ler, fluxo
│   ├── templates.php          Modelos (Gerenciar modelos)
│   ├── migrate.php            Migração (Super-Admin, R4)
│   └── config.form.php        configuração de marca e clientes
├── templates/                 Twig (library, migrate, document-form, parts/…)
├── public/                    CSS, JS e fonts/ (única pasta servida como estático)
│   ├── js/codexplus.js        PDF (paginação manual)
│   ├── js/codexplus-org.js    motor do organograma (grafo)
│   ├── js/codexplus-grid.js   cronograma e RACI (D1); com datas, fases, marcos, importar/exportar, tela cheia e situação (Q7b)
│   ├── js/codexplus-editor.js estilos, tamanhos, cor e realce, importar, botões (E1–E5), ferramentas por tipo (T2), sem salto de rolagem (J1)
│   ├── js/codexplus-sheet.js  planilha no editor (PL1), edição no lugar e Parâmetros (3c-1), Resumo do investimento (3c-2)
│   ├── js/codexplus-board.js  motor de quadro: Planta e Topologia (Q1), ligações, cabos e eletrocalha (Q2), PNG (Q2f), materiais e legenda (Q3), + Ícone (Q4); fluxograma: formas, BPMN, barra de estilo, ligação de fluxo, "+" rápido, alinhar (Q5b a Q5f); importar e exportar (cópia .json e Mermaid, Q5i)
│   ├── js/codexplus-flow.js   fluxograma no documento DIA: leitura em SVG, abrir o motor, gravar, PNG e PDF (Q5a)
│   ├── js/codexplus-icons.js  ícones próprios do quadro (Q1) e os criados na instalação (Q4)
│   ├── js/codexplus-export.js exportar Word (E3)
│   ├── js/codexplus-annotate.js anotador de imagens (E4)
│   ├── js/codexplus-brand.js  cor da marca a partir da logo; logo ao lado do campo Marca (M-1, M-2)
│   └── lib/                   mammoth, marked, docx (licença e versão em cada pasta)
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
