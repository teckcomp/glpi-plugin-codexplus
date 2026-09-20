# Codex+ — roadmap

> Estado em `v0.6.7-alpha` · atualizado em 20/09/2026 (R1, R2, R3a, R3c,
> R3b1, identidade visual, Painel no modelo novo e demonstração de
> diagramas concluídos; próximo: completar 9a–9c ou a estante).
> Método: cada etapa é um pacote, um deploy, um teste. Nenhuma etapa depende
> de duas outras ao mesmo tempo.

---

## Ordem de execução

**Revisada por Claudio em 20/09/2026**, para apresentar o Codex+ à gestão
em 21/09: identidade visual e diagramas passam à frente do resto da Etapa R.

1. ~~Pacote 0.5.8 — manutenção e PDF~~ ✅
2. ~~R1, R2, R3a, R3c, R3b1~~ ✅
3. ~~**Identidade visual**~~ ✅ 0.6.5 — paleta, fontes, marca, Painel com donuts
   · ~~**Painel no modelo novo**~~ ✅ 0.6.6 — parte do Painel da R5 antecipada,
   indicador "Em revisão", colunas Setor e Responsável, menu "Codex+"
4. ~~**Diagramas, pacote de demonstração**~~ ✅ 0.6.7 — 9a, 9b e 9c enxutos: tipo `DIA`
   (subtipo organograma), motor do protótipo embutido, edição em rascunho,
   leitura a partir do **JSON publicado** (o SVG fica para o item 5, desvio
   aprovado por Claudio), zoom e busca, fluxo de validação atual, PDF
   paisagem. Leva junto as validades novas (Manual 6, DIA 3)
5. **Completar 9a–9c** — desfazer/refazer, salvamento automático, SVG publicado,
   **ligações extras** (reporte funcional pontilhado entre cartões) e
   **trocar com o superior pelo arraste** (Claudio, 20/09/2026: natural, sem
   botão): soltar um cartão na borda de cima de outro faz dele o novo
   superior; cada um leva a própria equipe e quem estava abaixo continua
   abaixo. Ex.: Conselho → Nahun → José vira Nahun → Conselho → José. Já
   entregues na 0.6.7-3: tela cheia, zoom com Ctrl + roda, arrastar o fundo,
   mover com marca de posição, paleta de componentes e modelos de organograma;
   na 0.6.7-5: elementos padrão de mercado, níveis editáveis por organograma e
   "Criar elemento"
6. **Estante** (parte da R5, pedida por Claudio em 20/09/2026) — tela
   Documentos como prateleira, agrupada por **Setor → Categoria**, no modelo
   novo. **Modelos** no mesmo formato (exige setor e categoria no modelo:
   schema, junto com a R3b4)
7. **Núcleo da revisão** (parte da R6) — organograma publicado atualizável
8. **R3b2** — liberar a leitura pela tela (decidir antes: Self-Service vê o Codex+?)
9. **R3b3 → R3b4 → R4 → R5 → resto da R6 → R7** — fecha a Etapa R
10. **Etapa 3c** — modelos de verdade (inclui imagem anexa no PDF da proposta)
11. **Etapa 5** — PSG e seus POPs
12. **Etapa 7** — alerta de vencimento
13. **Etapa 9d–9g** — vínculo com usuários e grupos, matrizes, fluxograma, modelos de diagrama
14. **Etapa 8** — personalização completa do PDF

A Etapa R absorve as antigas 2c (setores), 10 (responsável e histórico) e
"permissões e acesso anônimo".

Depois: marco **Pronto para produção** (fim deste documento).

---

## Concluído

| Etapa | Entrega | Versão |
|---|---|---|
| 0 | Fundação: `setup`/`hook`/`Install`, menu em Ferramentas, direito `plugin_codexplus_wiki`, tela de estante lendo dados nativos com visibilidade nativa | v0.1.2 |
| 1 | Tela de leitura própria, badges de categoria, botão Editar condicionado a permissão, exportação de PDF pelo navegador (com imagens) | v0.2.1 |
| 1.1 | Seção "Anexos" na leitura, com nome, tipo e link de download | — |
| 2a · 2b | Tabela `glpi_plugin_codexplus_documents`, código derivado, aba "Codex+" na ficha nativa do artigo, tela **Documentos** com filtro por tipo e status e busca por código | — |
| 3a · 3b | Tabela `glpi_plugin_codexplus_templates`, tela **Modelos** (criar/editar/duplicar/excluir), 4 modelos semeados, fluxo **Novo documento** (tipo → modelo → artigo já com conteúdo e metadados) | — |
| 6a · 6b · 6c | CSS consolidado em arquivo único com tokens `--cx-`; **Painel** completo nas cinco zonas (busca, 4 indicadores, "Por tipo" + "Precisa de atenção", recentes, atalhos de modelo) | — |
| 4a | Tela de **configuração de marca**: upload de logo, posição e altura, toggles de cabeçalho, rodapé em texto livre com marcadores | v0.5.0 |
| 4b | Código, tipo, situação, responsável e cliente na tela de leitura; regra de vencimento centralizada em `DocumentMeta::expiryState()`; JSON de impressão embutido | v0.5.2 |
| 4c | Motor de paginação manual do PDF (folhas 794×1123 em `.cx-page`), logo repetido por página, rodapé com marcadores resolvidos e paginação `1 / N`. Único arquivo alterado: `public/js/codexplus.js` | v0.5.3 |
| 4d | Edição embutida no Codex+ (`article.form.php`, TinyMCE nativo via `Html::textarea`), sem sair para a ficha nativa; cabeçalho por documento (rich text) e rodapé por documento (texto com marcadores); moldura de folha (A4) na leitura. Ficha nativa continua acessível para categoria/FAQ/anexos | v0.5.4 |
| 4e | `header_html`/`footer_text` por documento (criados na 4d) passam a entrar no PDF, com prioridade sobre a marca global (`Branding`) e reaproveitando 100% do motor de paginação da 4c — nenhum arquivo de PDF recriado. Cabeçalho reserva altura fixa (`header_logo_height`), corta excesso. Todo documento (novo ou antigo sem cabeçalho) nasce/abre a edição já com a logo de `Branding` semeada em `header_html`, alinhada à esquerda — sem campo de upload novo. Único arquivo com mudança de lógica de PDF: `public/js/codexplus.js` | v0.5.5 |
| 4f | Cabeçalho deixa de ser rich text livre (TinyMCE, 4d/4e) e vira 3 áreas fixas: título (mesmo campo `name` de sempre, sem duplicidade) + logo (slot clicável, mesma logo global de `Branding`, upload direto da tela de edição via `front/header-logo.form.php` novo) lado a lado, e uma 2ª linha de dados automáticos (código · revisão · data), sempre recomposta no servidor (`Branding::composeHeaderHtml()`), nunca editada à mão. Rodapé inalterado | v0.5.6 |
| 4f-correção | Logo aparecia pequena demais na prévia da edição — bug real: CSS tinha limite fixo de 40px desconectado de `header_logo_height`. Corrigido para WYSIWYG com o PDF (mesma conversão mm→px). De passagem, teto de `header_logo_height` subiu de 30 para 40mm (30 não cabia a logo de referência, 138px ≈ 36,5mm) — corrigido nos DOIS lugares que validavam isso (`Branding::save()` e `codexplus.js`, estavam duplicados e podiam divergir) | v0.5.7 |
| 0.5.8 | Pós-auditoria: logo volta a sair no PDF (espera dupla de imagens); cabeçalho corrido montado na impressão (título + logo, uma linha), título grande e linha de identificação só na 1ª página, sem visualizações; âncoras dos títulos fora do PDF e discretas na tela; arquivo sugerido `código - título`; prévia do cabeçalho na edição sem a 2ª linha | v0.5.8 |
| R1 | Schema dos documentos próprios (documento ampliado, setores, categorias, documento–categoria, alvos de leitura, versões) e aba **Codex+ em Perfis** com a matriz de direitos. Commit `330da62` | v0.6.0 |
| R2 | Setores e categorias cadastráveis (listas suspensas), categoria ligada a setor, setor herdado na árvore; cadastro por "Gerenciar modelos, setores e categorias". Commit `26a114f` | v0.6.1 |
| R3a | Classe `Document`, ligações (categoria, perfil, grupo, usuário), visibilidade por item e em SQL, Histórico, comandos de console. Commits `5d528e4` + `6c64b4d` (restauração dos docs) | v0.6.2 |
| R3c | Papéis (gestores e validadores por setor, editores por documento), bit Validar, Super-Admin com todos os bits, validação antes de publicar. Commit `daf8941` | v0.6.3 |
| R3b1 | Página do documento no modelo novo (criar, editar, enviar, validar, devolver, obsoleto) e quadro "Documentos do modelo novo" no Painel. Commit `0f0119f` | v0.6.4 |
| Identidade visual | Paleta do protótipo do organograma nos tokens `--cx-`, IBM Plex servida do plugin (`public/fonts`), marca "monograma C+" no cabeçalho de todas as telas, Painel com donuts Por tipo e Situação (no lugar das barras) e código colorido pelo tipo | v0.6.5 |
| Painel no modelo novo | Painel lê `Document` (indicadores, donuts, atenção, recentes); indicador e fatia "Em revisão"; recentes com Categoria, Setor, Responsável e Situação; "Sem responsável" no lugar de "Sem código"; sai o quadro provisório da R3b1; "Novo documento" cria no modelo novo; menu "Codex+" com ícone `ti-square-rounded-letter-c-filled` | v0.6.6 |
| Diagramas (demonstração) | Tipo `DIA` (validade 3 meses; Manual passa a 6), tabela `glpi_plugin_codexplus_diagrams` (JSON por documento), motor do organograma (`public/js/codexplus-org.js`) na página do documento: edição em rascunho (cartões, arrastar, matriz de escalonamento, importar/exportar), leitura com zoom, ajustar e busca de pessoa, PDF em A4 paisagem; "Novo diagrama" e quadro "Diagramas" no Painel | v0.6.7 |

> A numeração saiu fora de ordem de propósito: o Painel (6) veio antes do PDF
> (4) porque dependia apenas da Etapa 2, e valia mais ter a tela que mostra o
> acervo funcionando do que o PDF bonito de um acervo que ninguém enxergava.

---

## ▶ Etapa R — documentos próprios

**Decidida por Claudio em 19/09/2026.** O Codex+ deixa de usar a Base de
Conhecimento nativa. Arquitetura-alvo em `CONTEXTO.md`, seção 3.1.

**Decisões que a guiam:**

- Setor > Categoria: setor é lista própria; a categoria pertence a um setor
- Documento pode estar em **várias categorias**
- Leitura: **alvos por documento — perfis, grupos e usuários**, como na base
  nativa
- Permissões em **duas camadas** (Claudio, 20/09/2026): perfil = o que;
  plugin = em quais documentos (gestores e validadores do setor, editores do
  documento). Publicar exige **validação**; quem editou não valida
- Acesso anônimo por **link secreto por documento** (só publicados, revogável)
- **Migrar** os 5 documentos de teste atuais

| Bloco | Entrega | Aceite |
|---|---|---|
| R1 | Schema novo (documento ampliado, categorias, setores, ligação documento–categoria, alvos de leitura, versões) e **aba Codex+ em Perfis** com Ler, Criar, Atualizar, Excluir, Ver todos, Publicar anônimo, Gerenciar modelos. Telas atuais continuam funcionando. ✅ **Concluído na 0.6.0-alpha** | Aba aparece em Perfis e grava |
| R2 | Setores e categorias cadastráveis (listas suspensas do GLPI), categoria ligada a setor, herança na árvore. Cadastro por quem tem "Gerenciar modelos" (decisão de Claudio, 20/09/2026). ✅ **Concluído na 0.6.1-alpha** | Criar setor e subcategoria e ver o setor herdado |
| R3a | Classe `Document` e ligações (categoria, perfil, grupo, usuário), leitura e edição pelos bits da R1, visibilidade por item e em SQL, Histórico ligado; comandos de console para testar. Sem telas novas. ✅ **Concluído na 0.6.2-alpha** | Criar documento com alvo num grupo e conferir quem vê e quem não vê; telas atuais inalteradas |
| R3c | Papéis: bit Validar; Super-Admin com todos os bits; gestores e validadores por setor; editores por documento; estado "em validação"; regras refeitas (alvo de leitura deixa de dar edição); comandos `sector:member` e fluxo no `document:set`. Sem telas novas. ✅ **Concluído na 0.6.3-alpha** | Pelo console: gestor cria, editor edita, quem editou não valida, validador do setor publica, leitor só vê depois de publicado |
| R3b1 | Página do documento (`front/document.form.php`): criar e editar título, tipo, categorias, responsável e corpo; botões Enviar / Validar / Devolver / Obsoleto conforme o direito; quadro "Documentos do modelo novo (em teste)" no Painel. ✅ **Concluído na 0.6.4-alpha** | Criar um POP pela tela como gestor, enviar e validar com outro usuário |
| R3b2 | Aba **Papéis** no Setor; **Editores** e **Leitura** (alvos) no documento; aba Histórico nativa. **Layout (Claudio, 20/09/2026):** editores e alvos de leitura ficam na própria página do documento, no espaço livre à direita de Categorias e Responsável (coluna "Permissões"), não em abas separadas | Montar o cenário da R3c pela interface, sem console |
| R3b3 | Imagens coladas, anexos, página de leitura com os cinco seletores do PDF e exportação em PDF | POP com imagem e anexo, publicado e exportado |
| R3b4 | "Novo documento" passa a criar no modelo novo, com os modelos (Template); somem "Mais opções" e "Ficha nativa" | Nenhum caminho da interface cria artigo na Base de Conhecimento |
| R4 | Ferramenta de migração dos 5 documentos, com prévia e confirmação | Os 5 aparecem no modelo novo com anexos e código preservados |
| R5 | Tela Documentos (estante Setor → Categoria, filtros), Painel e busca no modelo novo; indicadores "Aguardando validação" e "Revisão atrasada"; etiqueta "em atualização" na estante; lixeira; remoção da dependência da base | Estante agrupada, indicadores corretos, nada lendo `glpi_knowbaseitems` |
| R6 | Revisão de documento publicado: a publicada segue visível com o aviso **"Em atualização"** (tela e link anônimo, não no PDF) até a nova ser validada; **prazo de revisão** (padrão 30 dias, configurável) com prorrogação motivada ou cancelamento pelo gestor; "**revisado sem alteração**" (renova a validade, mantém a revisão); versões com resumo; histórico de revisão no fim do PDF; indicador "Sem responsável" | Abrir a :01, ver o aviso para o leitor, validar e ver a tabela no PDF |
| R7 | Acesso anônimo: marcar, gerar e revogar link; leitura e PDF sem login; entrega controlada de imagens e anexos (reaproveitar a abordagem de rota anônima já validada no plugin QR Service) | Abrir o link numa janela anônima; revogar e ver o link morrer |

**Importar documento pronto** (pedido de Claudio, 20/09/2026): trazer um
POP ou manual feito fora (Word `.docx`, Markdown, texto de um chat) para um
documento novo, que segue editável. Hoje já funciona colando no corpo
(TinyMCE mantém títulos, listas e tabelas); arquivo `.docx`/`.md` e imagens
dependem da R3b3 (onde a imagem é guardada). Entra logo depois da R3b3.

**Candidatos, a decidir durante a Etapa R:** quadro **Atividade** no fim da
leitura (quem, quando, o quê); indicador "Sem setor" no Painel.

---

## Etapa 9 — Diagramas institucionais

**Decidida em 09/2026.** Organogramas, fluxogramas e matrizes dentro do
Codex+, a partir de um protótipo de organograma aprovado (hierarquia em
árvore, níveis por cor, vagas e coringas, matriz de escalonamento).

**Requisitos:**

1. Visível a toda a instituição, de forma fácil e rápida
2. Criação 100% intuitiva, para quem não é técnico
3. Resultado final sem perda em relação ao protótipo, ou superior

**Decisões de arquitetura (a confirmar no 9a contra o código real):**

- Diagrama é **mais um tipo de documento**: sigla `DIA`, subtipos
  organograma, fluxograma e matriz. Herda código (`DIA0001:00`), ciclo de
  vida, validade, responsável, categorias, busca, painel e a visibilidade
  do Codex+ (Etapa R)
- Revisão = a mesma do Codex+ (`:00`, `:01`…), sem histórico de versões novo
- Tabela própria do diagrama, ligada ao documento: subtipo, JSON editável (rascunho) e **SVG
  da versão publicada**. Nenhuma tabela nativa alterada
- Leitura usa o SVG publicado (rápido, sem carregar editor). PDF: **uma
  página paisagem, ajustada para caber** — não usa a paginação da 4c
- O mesmo componente desenha no editor e na leitura: é a garantia de "sem perda"
- Cores de nível viram tokens `--cx-`

**Fluxograma com draw.io** (Apache 2.0), hospedado em `public/`, modo
embutido, offline, sem chamada externa. Enxugado em três camadas:

1. parâmetros de abertura: interface mínima, sem menus de arquivo, nuvem e
   publicação, em português
2. configuração enviada pelo Codex+: só a biblioteca de fluxograma mais uma
   biblioteca própria (início/fim, processo, decisão, documento, raia por
   nível), estilo padrão de formas e setas, paleta restrita aos tokens, fonte
3. remoção das bibliotecas de formas não usadas (com teste: há dependências
   internas)

Nomes exatos de parâmetros e chaves: **conferir no fonte do draw.io** no
bloco, não supor. Salva XML (editável) e SVG (publicação).

| Bloco | Entrega |
|---|---|
| 9a | Tipo `DIA`, tabela satélite, entrada no "Novo documento" (mexe no Install) |
| 9b | Leitura do organograma: zoom, ajustar à tela, busca de pessoa, PDF paisagem |
| 9c | Editor de organograma: protótipo + desfazer/refazer + salvamento automático do rascunho + publicar |
| 9d | Vínculo com Usuários e Grupos; "gerar a partir do GLPI" (grupo pai + campo Supervisor) |
| 9e | Matrizes: escalonamento e RACI |
| 9f | Fluxograma com draw.io embutido, enxugado e estilizado |
| 9g | Modelos prontos de diagrama (reaproveita o sistema de modelos da etapa 3) |

**Validar no 9b:** a leitura abre na **interface simplificada** (Self-Service)?
A decisão de dar acesso ao Self-Service depende disso.

**Testar o 9c com alguém não técnico** (RH ou coordenação).

---

## Etapa 3c — modelos de verdade

**Por quê:** com a decisão de 08/2026 de produzir *todos* os documentos dentro
do Codex+, modelo fraco vira atrito diário. Os quatro modelos semeados na 3a
são esqueletos.

**Entrega:**

- Conteúdo real de cada modelo, com destaque para a **Proposta**
  (Levantamento de necessidades, Avaliação, Materiais e mão de obra,
  Planejamento de execução, Criticidades) e para o **Manual**
- **Imagem anexa no PDF da proposta** (decidido em 19/09/2026): só em
  propostas, e só as imagens marcadas "incluir no PDF". Em POP, anexo
  continua sendo só link de download

**Aceite:** criar uma proposta a partir do modelo e ter um documento
apresentável ao cliente com pouca edição.

---

## Etapa 5 — PSG e seus POPs

**Tabela** `glpi_plugin_codexplus_psg_items`: `id`, `psg_documents_id`,
`pop_documents_id`, `rank`.

**Entrega:**

- Na leitura de um PSG, seção "Procedimentos vinculados" com os POPs em ordem
- Interface para vincular, desvincular e reordenar
- **PDF composto:** exportar o PSG gerando um arquivo único com o regimento
  seguido de todos os POPs vinculados, cada um começando em página nova, com
  sumário no início

**Aceite:** um PSG com 3 POPs gera um PDF único, paginado corretamente, com
sumário.

> É a função que nenhuma das referências (BookStack, GLPI nativo) entrega.
> Depende da 4c (concluída) — reusa o mesmo motor de paginação, chamando
> `layoutPages()` uma vez por documento vinculado dentro do mesmo `#cx-stage`.
> Destrava também o indicador "PSG sem POP vinculado" do Painel, que hoje
> exibe `—` justamente por falta desta tabela.

---

## Etapa 7 — alerta de vencimento

Cron horário que verifica documentos vencidos ou a vencer e notifica o
responsável por e-mail, usando o mailer nativo do GLPI. Reaproveitar o padrão
de `Notification.php` do ProjectPlus.

**Aceite:** documento com validade estourada gera e-mail ao responsável, sem
repetir todo dia.

---

## Etapa 8 — Nível 3 de personalização do PDF

Template HTML do PDF editável por inteiro, e não só os campos que a 4a expõe.

**Adiado, não descartado.** Só dá para saber se o Nível 2 (campos + toggles) é
insuficiente depois de emitir proposta de verdade por alguns meses. Reavaliar
depois da Etapa 5.

---

## Marco — Pronto para produção

O Codex+ **não está em produção** (decisão de 19/09/2026). Sobe quando todos
os critérios abaixo estiverem cumpridos:

- [ ] PDF validado com documentos reais de cada tipo, principalmente proposta
- [ ] Modelos com conteúdo de verdade (3c)
- [ ] Direitos por perfil definidos e testados
- [ ] Etapa R concluída (documentos próprios, permissões, histórico, anônimo)
- [ ] Logo definitiva configurada
- [ ] Instalação e atualização testadas do zero numa instância limpa

---

## Decisões pendentes

- [ ] **Logo definitiva** — arquivo original (vetor ou PNG grande da versão
      escura). A enviada em 09/2026 era prévia do remove.bg: 487×92 px úteis,
      texto branco e cortada. Pendência de Claudio; não bloqueia etapas
- [ ] **Self-Service vê o Codex+?** Decidir na Etapa R. Atenção ao achado 27: o GLPI tira da sessão do Self-Service todo direito de plugin; liberar exige acrescentar o direito a `Profile::$helpdesk_rights`

**Decididas:**

- [x] Diagramas dentro do Codex+; fluxograma com draw.io enxugado — 09/2026
- [x] Imagem anexa no PDF: só proposta, só imagens marcadas — 19/09/2026
- [x] Indicador "PSG sem POP vinculado": exibido esmaecido com a etiqueta
      "etapa 5" até a Etapa 5 (solução da 0.5.x)
- [x] Cabeçalho do PDF (0.5.8) aprovado sobre mockup — 19/09/2026
- [x] Setor próprio, acima da categoria, para todos os tipos, lista do Codex+ — 19/09/2026
- [x] **Independência da Base de Conhecimento** (Etapa R) — 19/09/2026
- [x] Várias categorias por documento; leitura por perfis, grupos e usuários; edição só por perfil — 19/09/2026
- [x] Acesso anônimo por link secreto por documento — 19/09/2026
- [x] Migrar os 5 documentos de teste — 19/09/2026
- [x] Repositório = pasta do plugin, trabalho como root — 19/09/2026
- [x] Manuais e propostas escritos dentro do Codex+ — 08/2026
- [x] Validade padrão de 12 meses; siglas `POP` `PSG` `MAN` `PRP`
- [x] **Validades por tipo** (Claudio, 20/09/2026): POP e PSG 12 meses;
      Manual **6**; diagramas (organograma, fluxograma, matrizes) **3**;
      Proposta e "documentos diversos" **definida por quem publica**. Manual
      e DIA entram no pacote de diagramas; a escolha na publicação e o tipo
      "documentos diversos" (sigla e nome a definir) ficam para depois
- [x] **Identidade visual** (Claudio, 20/09/2026): mockup do Painel aprovado;
      donuts voltam no lugar das barras de proporção de 07/2026; marca do
      produto = monograma C+ (a logo da empresa continua no PDF)
