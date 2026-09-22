# Codex+ — contexto do projeto

> Documento de entrada. Quem for dar andamento ao plugin deve ler este
> arquivo **antes** de abrir qualquer código.
> Estado: `v0.6.8-alpha` · atualizado em 22/09/2026 (R3b2-b parte 1:
> criação completa e editores). Antes, 21/09: R6-a, revisão de
> documento publicado. Antes: (motor de diagrama em
> grafo: posição livre, arraste próprio, ligações com chefia, salvamento
> automático, PDF igual à tela e dobras à mão — seção 3.4; commits `bd41b7a`
> a `9ae6110` e o do bloco 2d-2).

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
| Fluxo de aprovação com mais de duas etapas | Não há intenção de certificar ISO 9001. **Desde 21/09/2026 (Claudio) a validação tem DUAS etapas** antes de publicar — gestor do setor, depois auditor responsável (Etapa R3d). Mais etapas, ou etapas configuráveis, continuam fora |
| Caixa de tarefas pendentes | "Aguardando validação" e "Revisão atrasada" são indicadores do "Precisa de atenção" do Painel (R5), não caixa de tarefas |
| Trilha de auditoria para auditor externo | O histórico nativo do GLPI já registra alterações. O histórico de revisão com resumo (Etapa R6) é do documento, não aparato de auditoria |
| Permissão separada de ver / imprimir / baixar | O GLPI já controla visibilidade por perfil, grupo e entidade |
| Editor Markdown | O TinyMCE nativo atende |
| Hierarquia livro → capítulo → página | Categoria → subcategoria resolve; o PSG cobre o agrupamento por setor |
| PDF via TCPDF (server-side) | Testado e descartado — ver seção 4 |
| Reskin por CSS sobre telas nativas | Abordagem original, **abandonada** — ver seção 4 |

> **Saiu desta tabela em 09/2026:** draw.io embutido. Entrou na Etapa 9.
> **Voltou para cá em 20/09/2026 (Claudio):** com o motor de canvas do Codex+
> (grafo com posição livre e ligações próprias — seção 3.4), o fluxograma
> passa a ser uma paleta de formas sobre o mesmo motor. Embutir o draw.io
> traria megabytes de código de terceiro no repositório público, mais o
> trabalho de enxugar e manter, para entregar o que o motor próprio já faz.
> **Preço aceito:** desenho livre de verdade (forma arbitrária, curva à mão,
> agrupamento) não existirá. Há caixa, seta e rótulo.

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
| Validar ou devolver | **Validar** (8192) | Validador do setor que **não alterou** o documento na revisão atual |
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
│   ├── Branding.php           configuração de marca (4a), cabeçalho (4f)
│   ├── Rights.php             bits da matriz de direitos (R1)
│   ├── ProfileTab.php         aba Codex+ em Perfis (R1)
│   ├── StructureRights.php    direitos de setores e categorias (R2)
│   ├── Sector.php             setor, lista simples (R2)
│   ├── Category.php           categoria em árvore com setor herdado (R2)
│   ├── Document.php           documento próprio, direitos, visibilidade (R3a)
│   ├── Document_*.php         ligações: categoria, perfil, grupo, usuário (R3a)
│   ├── TargetRelation.php     comum aos três alvos de leitura (R3a)
│   ├── SectorMember.php       gestores e validadores do setor (R3c)
│   ├── DocumentEditor.php     editores do documento (R3c)
│   ├── DocumentContributor.php quem alterou cada revisão (R3c)
│   ├── Diagram.php            diagrama do documento DIA: ler, gravar, validar (0.6.7)
│   └── Console/               comandos de teste da R3a (plugins:codexplus:…)
├── ajax/
│   ├── diagram.save.php       grava só o diagrama, sem recarregar (bloco 1b)
│   └── document.targets.php   leitores do documento pela coluna Permissões (R3b2-a)
│   (templates/parts/doc-review.html.twig: auditor, revisor e janela — R3d)
├── front/                     controllers (rodam em escopo de função!)
│   └── document.form.php      documento no modelo novo (R3b1)
├── templates/                 Twig (parts/brand.html.twig: cabeçalho com a marca, 0.6.5)
├── public/                    CSS, JS e fonts/ (única pasta servida como estático)
│   └── js/codexplus-org.js    motor do diagrama: grafo, canvas, gesto, ligações
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

