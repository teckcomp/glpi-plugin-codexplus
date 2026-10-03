# Codex+ — roadmap

> Estado em **`v0.7.0`** + blocos de 02/10/2026 (último commit
> `f0ad6ba`) · atualizado em **02/10/2026**: folha do fluxograma, ícones
> Lucide (Q5j), **raias Q5g ✅** e **Q5h ✅** (CONTEXTO, seção 3.10).
> **Escopo de "pronto" = roadmap inteiro; produção (Debian 13, SSH 2022)
> é a etapa final.** Próximo: **reavaliar o escopo do Q5i** com Claudio,
> depois Q6. Antes, na madrugada de
> 28/09/2026: **SC1 Setor / Categorias** (`dfe0e58`), **0.7.0** (`29c5088`)
> e **instalação do zero testada** (CONTEXTO, seção 3.9). **Produção
> adiada por Claudio** até o escopo combinado ficar pronto (estimativa dele:
> ~2 dias) — ver "Ordem até produção". Antes, na noite de 27/09:
> **Biblioteca em estante B2a a B2c** (commits `23f9a5c` e `810aa85`;
> CONTEXTO, seção 3.8).
> Antes, na mesma noite: **Fluxograma Q5a a Q5f** (commits `6ef31e5` a `e694ddd`; CONTEXTO,
> seção 3.7). Próximo: **Q5g — raias verticais** (mockup antes). Antes, na
> tarde: **Q3 e
> Q4 fechados**, mais T2, Q2f, T3 e E6 (commits `5396fe9` a `a76b16c`;
> CONTEXTO, seção 3.6). Q3c cancelado. Próximo: **Q5 — Fluxograma** (mockup
> antes). Antes, no mesmo dia: **Q2 fechado** (Q2a a
> Q2e: ligações e cabos, traçado com dobras, metragem, eletrocalha; commits
> `8e71046` a `cd8a64f`; CONTEXTO, seção 3.5). Decisão de Claudio, 27/09/2026: seguir o roadmap até o fim,
> produção depois (sem corte antecipado). Antes, 26/09/2026: P1, P2, D1, S1, B1,
> R3b4, M1, E5, R4, R5, PL1 e Q1 (commits `66f9b2b` a `6a1f8ee`; detalhes no
> CONTEXTO, seção 3.5). A Etapa R está fechada, salvo R6-b e R7; o Codex+ não
> depende mais da Base de Conhecimento. Próximo: **Q2** (ligações e cabos no
> quadro). Antes, 25/09/2026 (blocos A1 e A2: auditor
> pelo perfil, Super-Admin pelo perfil, quem aprovou não valida, setor de
> auditoria). Antes, 24/09/2026 (bloco T1: tipos LAU, DTC e DIV e cliente
> vinculado). Antes, no mesmo dia (editor de documentos
> completo: E1 a E4, commits `1c793c8` a `68b7b09`). Antes, em 22/09/2026
> (criador de documentos completo: R3b2-b e R3b3, commits `d06aa30` a
> `987636c`). Antes, em 21/09/2026 (motor de diagrama em
> grafo: 2d-1, 2d-2 e o PDF igual à tela (2d-3a) prontos; falta fechar o
> 2d-3 e subir para `0.6.8-alpha`).
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
5. **Motor de diagrama em grafo** — ver "Blocos do motor" logo abaixo. A
   pedido de Claudio (20/09/2026, a partir de cinco protótipos de uso real),
   o diagrama deixou de ser uma árvore e passou a ser um grafo com posição
   livre e ligações próprias. Concluído até o 2d-2 e o 2d-3a; falta fechar o 2d-3
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

### Ordem até produção, acordada com Claudio em 20/09/2026 (revista em 26/09)

Vale sobre a lista acima quando houver conflito.

> **Decisão de Claudio, 02/10/2026: "pronto" = roadmap inteiro.** A
> produção é a **etapa final**, depois de todas as fases (itens 7 e 11 a 15).
> **Servidor de produção: Debian 13, SSH na porta 2022** (a homologação
> segue no `177.87.230.179`). O primeiro passo da subida é o **bloco de
> conferência** desse servidor (PHP, extensões, MariaDB, espaço, acesso ao
> GitHub), só leitura. Ordem: ~~Q5g~~ ✅ → ~~Q5h~~ ✅ → **Q5i (reavaliar)**
> → Q6 → 3c → R6-b → R7 → Etapa 5 → caça a bugs → produção (com a Etapa 7
> logo depois).
>
> **Atualização, 28/09/2026 (madrugada): produção adiada por Claudio.** A
> subida de 28/09 não aconteceu; sobe "quando estiver tudo pronto"
> (estimativa de Claudio: ~2 dias). **A decidir no começo da próxima
> sessão:** "pronto" = (a) o roadmap inteiro (itens 7 e 11 a 15: ~15 a 20
> blocos, várias sessões) ou (b) o recorte para escrever documentos (R6-b,
> 3c, caça a bugs, PDF validado, logo; R7 se o acesso por link for preciso
> desde o início), com Q5g a Q6 e Etapa 5 depois, já em produção
> (sugestão). Também a confirmar: **qual servidor é a produção**. Já feito
> para a subida: B2a a B2c, **SC1**, **`0.7.0` com tag** e **instalação do
> zero testada**.
>
> **Decisão de Claudio, 27/09/2026 (noite): produção antecipada.** A regra
> "roadmap até o fim, produção depois" foi revista: a documentação sobe em
> 28/09 para Claudio começar a redigir documentos. Antes da subida, só:
> Biblioteca em estante (**B2a a B2c ✅**), versão **`0.7.0`**, **teste de
> instalação do zero** numa instância limpa (`glpi-limpo` + `glpidb_limpo`,
> apagada depois), backup e roteiro de produção, e **um documento real de
> ponta a ponta** antes de liberar para os outros. Os itens abaixo que não
> estão riscados (7, 11 a 15) continuam, agora com atualização por `git
> pull` em produção. Fluxogramas feitos antes das raias continuam válidos (o
> `lane` já é aceito pelo `validateBoard`).

1. ~~Finalizar organograma~~ ✅ (2d-3 fechado na R6-a)
2. ~~Papéis e validação~~ ✅ A1, A2 (25/09) e **P1** (26/09: papéis pelo
   perfil, sem gestor de setor nem editores; a R3b2-c foi **descartada**)
   e **P2** (fluxo por tipo)
3. ~~Cronograma e matrizes~~ ✅ **D1** (26/09)
4. ~~Permissões e Self-Service~~ ✅ **S1** (Self-Service só lê) e **B1**
   (Biblioteca como entrada de quem só lê)
5. ~~Anexos, imagens, leitura e PDF (R3b3)~~ ✅ 22/09
6. ~~Editor de documentos~~ ✅ E1 a E4 (24/09) e **E5** (cor e realce, 26/09)
7. **Motor de quadro estilo Miro** (decisão de 26/09: um motor, paletas
   Planta, Topologia, Fluxograma e Organograma) — **Q1 a Q4 ✅**, **Q5a a
   Q5f ✅**; faltam Q5g a Q5i e Q6 (Organograma no motor) — tabelas
   "Motor de quadro" e "Q5 — Fluxograma" abaixo
8. Editor de propostas: ~~mini planilha~~ ✅ **PL1**; o "mini desenho" virou
   a **Planta** do motor de quadro (Q1), também na Documentação Técnica
9. ~~Migração dos 5 documentos (R4)~~ ✅ 26/09 (os 5 migrados)
10. ~~Prateleira e corte da base nativa (R5)~~ ✅ 26/09 (Biblioteca com
    situação e lixeira; Modelos por setor/categoria foi para o backlog)
11. **Modelos com conteúdo real (3c)**
12. **Revisão R6-b** (prazo da revisão aberta, "Revisão atrasada",
    prorrogação, histórico de revisões no fim do PDF)
13. **Acesso anônimo (R7)** — seção "Acesso anônimo" na coluna Permissões,
    abaixo de Leitura (sugestão de Claudio, 26/09)
14. **PSG com POPs e PDF composto (Etapa 5)** — o link de forma do
    fluxograma para documento do Codex+ conversa com isso
15. Caça a bugs
16. Produção, com o alerta de vencimento (Etapa 7) logo depois

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
| R3d | Validação em duas etapas (gestor do setor, depois auditor responsável), revisor e janela de revisão no calendário, vencimento pelo fim da janela; campos na página do documento e aviso "aguardando …". Super-Admin pode tudo (definitivo). Precisa reinstalar. ✅ pacote `codexplus-r3d-validacao-1` (Claudio, 21/09/2026) | Gestor aprova, auditor responsável publica, janela calculada; quem editou não valida na 2ª etapa |
| R3d-1 | "Aguardando você" no Painel (gestor na 1ª etapa, auditor na 2ª, com o motivo quando falta o direito) e aviso na página do documento quando quem responde pela etapa não consegue agir. Sem schema ✅ pacote `codexplus-r3d1-aguardando-1` | O auditor entra no Codex+ e vê o que espera por ele |
| R6-a | Revisão de publicado: abrir revisão (gestor, ou revisor na janela), leitores seguem na versão publicada com "Em atualização", resumo obrigatório no envio, cancelar revisão, "revisado sem alteração" sem auditor, versões com diagrama. `v0.6.8-alpha` (fecha também o 2d-3), precisa reinstalar ✅ pacote `codexplus-r6a-revisao-1`, commit `9aace43` | Abrir a :01, ver o aviso para o leitor, validar e ver a :01 publicada |
| R3b2 | Em três blocos (Claudio, 21/09/2026): **R3b2-a** Leitura (alvos) na coluna "Permissões" do documento ✅ (pacote `codexplus-r3b2a-leitura-1`); **R3b2-b** criação já com todos os campos (categorias, responsável, auditor, revisor, janela, leitores) e Editores na mesma coluna — parte 1 (criação, editores, Cliente só em PRP) ✅ pacote `codexplus-r3b2b-criacao-1`, commit `d06aa30`; parte 2 (Duplicar, botões da versão publicada) ✅ commit `31359de`; ~~**R3b2-c** aba **Papéis** no Setor~~ (descartada: papéis pelo perfil, P1, 26/09). Self-Service é o último item desta sessão de permissões. Aba Histórico nativa. **Layout (Claudio, 20/09/2026):** editores e alvos de leitura ficam na própria página do documento, no espaço livre à direita de Categorias e Responsável (coluna "Permissões"), não em abas separadas | Montar o cenário da R3c pela interface, sem console |
| A1 | Auditor pelo perfil (Claudio, 25/09/2026): bit 8192 vira a coluna **Auditor**; auditor escolhido entre quem tem o bit na entidade, em qualquer setor; papel "auditor" do setor fora de uso; `ajax/document.auditors.php` removido. Sem schema | Auditor sem papel no setor valida; gestor sem o bit é recusado como auditor |
| A2 | Quem aprovou a 1ª etapa não valida a 2ª, salvo setor de Auditoria (caixa nova no Setor) e Super-Admin; impedido pode devolver. Super-Admin passa a ser o perfil com Configurar > Atualizar e pode tudo no fluxo; Install não lhe dá mais o bit Auditor; Ver todos não dispensa mais a validação. Schema: precisa reinstalar | Gestor-auditor aprova e não publica; no setor de Auditoria, publica; Super-Admin publica sem o bit |
| R3b3 | Imagens coladas, anexos, página de leitura com os cinco seletores do PDF e exportação em PDF. **R3b3-1** imagem colada e anexos ✅ commit `f1916b9`; **R3b3-2** leitura e PDF do documento novo ✅ commit `987636c` | POP com imagem e anexo, publicado e exportado |
| R3b4 | "Novo documento" passa a criar no modelo novo, com os modelos (Template); somem "Mais opções" e "Ficha nativa". ✅ 26/09, `a9d5ef4` (com M1: salvar como modelo, editor e direito do Codex+ em Modelos) | Nenhum caminho da interface cria artigo na Base de Conhecimento |
| R4 | Ferramenta de migração dos 5 documentos, com prévia e confirmação. ✅ 26/09, `8d6c017`; os 5 migrados | Os 5 aparecem no modelo novo com anexos e código preservados |
| R5 | Biblioteca Setor → Categoria com Situação, "Só os meus" e Lixeira; Excluir/Restaurar; busca do Painel; fim das telas antigas. ✅ 26/09, `8d6c017`. Ficaram para depois: Modelos por setor/categoria (schema) e o indicador "Revisão atrasada" (R6-b) | Estante agrupada, nada lendo `glpi_knowbaseitems` |
| R6 | Revisão de documento publicado: a publicada segue visível com o aviso **"Em atualização"** (tela e link anônimo, não no PDF) até a nova ser validada; **prazo de revisão** (padrão 30 dias, configurável) com prorrogação motivada ou cancelamento pelo gestor; "**revisado sem alteração**" (renova a validade, mantém a revisão); versões com resumo; histórico de revisão no fim do PDF; indicador "Sem responsável" | Abrir a :01, ver o aviso para o leitor, validar e ver a tabela no PDF |
| R7 | Acesso anônimo: marcar, gerar e revogar link; leitura e PDF sem login; entrega controlada de imagens e anexos (reaproveitar a abordagem de rota anônima já validada no plugin QR Service) | Abrir o link numa janela anônima; revogar e ver o link morrer |

## Editor de documentos (item 6, 22 a 24/09/2026)

Detalhes em `CONTEXTO.md`, subseção "Editor de documentos".

| Bloco | Entrega | Commit |
|---|---|---|
| E1 | Menu Estilo (Título 1-3, Parágrafo, Nota, Atenção) e A−/A/A+ só na seleção, medidas nos tokens `--cx-size-*`; sem cor e tamanho livres; colado perde fonte, tamanho e cor | `1c793c8` |
| E2 | Importar `.docx` (mammoth) e `.md` (marked) só com o corpo em branco; imagens pelo envio das coladas | `3118dd8` |
| E3 | Exportar Word (docx) com as regras do PDF (`window.CodexplusPrint`); tabela com bordas no editor | `1eaf22e` |
| E4 | Anotador de imagens editável (seta, retângulo, círculo, destaque, texto, passo, ocultar, recortar; tamanho/intensidade; marcas no `span.cx-annot`); janela nativa de imagem trocada por botão próprio | `68b7b09` |

**Importar documento pronto** — ✅ entregue no E2. Registro original (pedido de Claudio, 20/09/2026): trazer um
POP ou manual feito fora (Word `.docx`, Markdown, texto de um chat) para um
documento novo, que segue editável. Hoje já funciona colando no corpo
(TinyMCE mantém títulos, listas e tabelas); arquivo `.docx`/`.md` e imagens
dependem da R3b3 (onde a imagem é guardada). Entra logo depois da R3b3.

## Tipos novos (bloco T1, 24/09/2026)

Pedido de Claudio: Laudo Técnico, Documentação Técnica e Documento Diverso,
no padrão de POP e Manual. Detalhes em `CONTEXTO.md`, seção 1 e subseção
"Tipos novos e cliente vinculado".

| Bloco | Entrega | Commit |
|---|---|---|
| T1 | Tipos `LAU` (não vence), `DTC` (12 meses) e `DIV` (não vence, provisório), só no modelo novo, com cor própria; cliente **vinculado** a usuário ou entidade do GLPI em `LAU` e `DTC`, conforme a configuração da instalação; "Cliente" na identificação do PDF/Word e no Painel. Precisa reinstalar (`v0.6.9-alpha`). Instalado na homologação em 24/09 sem commit; juntado ao A1/A2 em 25/09 | — |

**Candidatos, a decidir durante a Etapa R:** quadro **Atividade** no fim da
leitura (quem, quando, o quê); indicador "Sem setor" no Painel.

---

## Blocos do motor de diagrama (20/09/2026)

**Decididos por Claudio em 20/09/2026.** Arquitetura em `CONTEXTO.md`, seção 3.4.

| Bloco | Entrega | Commit |
|---|---|---|
| 1a | Desfazer e refazer no organograma (histórico de estados, Ctrl+Z / Ctrl+Shift+Z) ✅ | `bd41b7a` |
| 2a | Modelo de grafo: `nodes` + `edges`, conversão do formato antigo, árvore derivada das ligações ✅ | `bd41b7a` |
| 2b | Desenho posicionado: caixas com coordenadas calculadas e ligações em SVG; a lista aninhada sai da tela ✅ | `d4871b7` |
| 2c | Posição livre com guias de alinhamento, elemento sem chefe, "Arrumar", arraste próprio, exclusão de qualquer elemento ✅ | `17e651d` |
| 1b | Salvamento automático do diagrama (`ajax/diagram.save.php`), Salvar em tela cheia sem recarregar ✅ | `17e651d` |
| 2d-1 | Ligações: criar puxando da borda, chefia ou reporte, rótulo, excluir, troca de chefe e recusa de ciclo ✅ | `f78a0c9` |
| 2d-3a | PDF imprime o desenho da tela: clona o canvas posicionado, com as ligações em SVG, sem o que é de edição. Antecipado por Claudio para a apresentação de 21/09 (o PDF só imprimia o bloco do primeiro elemento sem chefe — achado 50) ✅ | `9ae6110` |
| 2d-2 | Cotovelos à mão: alça no meio da linha selecionada; arrastando, nasce a dobra; uma alça por trecho, então quantas dobras forem precisas; encaixe na coluna e na linha do vizinho; duplo clique desfaz uma; "Endireitar" tira todas; "Arrumar" também. Pontos em `waypoints`, validados no PHP ✅ | `7f5adf0` |
| ~~2d-3~~ | ✅ Fechado em 21/09/2026: leitura e PDF do leitor conferidos com o DIA0001 publicado (cristian.b); versão sobe na R6-a. **Fechamento do organograma:** conferir a página de leitura com um diagrama publicado e o PDF com dobras; subir o `setup.php` para `0.6.8-alpha` (o GLPI pede reinstalação: bloco completo do `DEPLOY.md`) | — |

**Decisões que guiam estes blocos:**

- Modo **híbrido**: o elemento é ancorado (o layout posiciona) ou solto (o
  usuário posiciona). Nasce ancorado; vira solto ao ser arrastado; "Arrumar"
  devolve todo mundo ao automático
- **Um chefe por elemento**, marcado na ligação. É ele que define o time e a
  posição; as demais ligações são reporte. Ciclo de chefia é recusado
- O **draw.io sai do roadmap** (ver `CONTEXTO.md`, seção 2): o fluxograma
  passa a ser uma paleta de formas sobre este mesmo motor

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

**Fluxograma sobre o motor próprio** (decisão de Claudio, 20/09/2026 — o
draw.io embutido foi descartado). Com o grafo, a posição livre e as ligações
à mão já prontos, o fluxograma é: uma paleta de formas (início/fim, processo,
decisão, documento), o campo `shape` no nó, setas com rótulo e as dobras do
2d-2. Sem código de terceiro no repositório público.

**Preço aceito:** desenho livre (forma arbitrária, curva à mão, agrupamento)
não existirá.

| Bloco | Entrega |
|---|---|
| 9a | Tipo `DIA`, tabela satélite, entrada no "Novo documento" (mexe no Install) |
| 9b | Leitura do organograma: zoom, ajustar à tela, busca de pessoa, PDF paisagem |
| 9c | Editor de organograma: protótipo + desfazer/refazer + salvamento automático do rascunho + publicar |
| 9d | Vínculo com Usuários e Grupos; "gerar a partir do GLPI" (grupo pai + campo Supervisor) |
| 9e | Matrizes: escalonamento e RACI |
| 9f | Fluxograma: paleta de formas e setas sobre o motor próprio. **Referência de interação: Miro** (Claudio, 22/09/2026) — alças de conexão nas bordas, puxar a seta para o vazio cria a forma já ligada, trocar a forma sem perder as ligações, rótulo da seta por duplo clique, estilo (reta, cotovelo, curva) por ligação. Referência de interação, não de escopo: desenho livre continua fora |
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
os critérios abaixo estiverem cumpridos.

> **Revisto por Claudio em 27/09/2026:** sobe em 28/09 com o mínimo da
> "Ordem até produção" (instalação do zero testada, `0.7.0`, backup,
> roteiro). Os critérios abaixo passam a ser o marco de **"produção
> completa"** e seguem sendo fechados lá.

- [ ] PDF validado com documentos reais de cada tipo, principalmente proposta
- [ ] Modelos com conteúdo de verdade (3c)
- [ ] Direitos por perfil definidos e testados
- [ ] Etapa R concluída (documentos próprios, permissões, histórico, anônimo)
- [ ] Logo definitiva configurada
- [x] Instalação e atualização testadas do zero numa instância limpa ✅ 28/09
  (tag `v0.7.0`, banco idêntico ao da homologação — CONTEXTO, achado 92)

---

## Sessão de 26/09/2026 — blocos entregues

| Bloco | Entrega | Commit |
|---|---|---|
| P1 | Papéis pelo perfil: Responsável (Aprovar), Auditor (Auditar, não edita), Revisor (Revisar e editar); editam responsável, revisor e autor; observação na aprovação; sem gestor de setor nem editores | `66f9b2b` |
| P2 | Fluxo por tipo: POP/PSG/MAN/DIV/DIA completo; DTC uma etapa; PRP/LAU publicação direta | `8348aee` |
| D1 | Cronograma e matriz RACI (subtipos de DIA), grades largas, unidade dos períodos, PDF com orientação automática | `9d30375` |
| S1, B1 | Self-Service só lê (menu direto na barra); Biblioteca Setor → Categoria como entrada de quem só lê | `a9d5ef4` |
| R3b4, M1 | Criação a partir dos modelos (busca a partir de 10); Salvar como modelo; tela Modelos com o editor e o direito do Codex+ | `a9d5ef4` |
| E5 | Cor do texto e realce em paleta fixa; estilo só na linha; Enter após título vira parágrafo | `a9d5ef4` |
| R4, R5 | Migração da Base de Conhecimento; Biblioteca com situação, só os meus e lixeira; fim das telas antigas | `8d6c017` |
| PL1 | Planilha no editor (Qtd, Item, Unitário, Total; fórmulas; total perto do valor; linhas alternadas) | `820236c`, `974fa23` |
| Q1 | Motor de quadro: Planta e Topologia, 34 ícones próprios, cone em metros com escala, girar, tamanho; leitura sem recolher; PDF sem "rev." em PRP/LAU | `6a1f8ee` |

## Sessão de 27/09/2026 — blocos entregues

| Bloco | Entrega | Commit |
|---|---|---|
| Q2a | Item `link`: alças nas quatro bordas, a ligação acompanha os ícones, rótulo, PNG; `clean()` descarta ligação órfã | `8e71046` |
| Q2b | 9 tipos de cabo com cor e traço, pontas, numeração P-001, painel (portas, velocidade, VLAN, PoE, tamanho do nome); nome pelo tamanho dos ícones; clique em qualquer zoom | `87c94a7` (junto do Q2c) |
| Q2c | Traçado reto, cotovelo e curvo; dobra por duplo clique, livre e com encaixe (Alt solta), Ctrl + duplo clique apaga; cotovelo sem ganchos; religar pela ponta | `87c94a7` |
| Q2d | Metragem pela escala e pelo traçado, sobra ajustável, ou manual; metros no nome | `290d92b` |
| Q2e | Eletrocalha e canaleta: desenho por cliques com encaixe, pontos editáveis, metragem, abaixo dos cabos | `cd8a64f` |
| T2 | Ferramentas do editor por tipo: POP/PSG/MAN texto e imagens; PRP + Planilha e Planta; LAU/DTC + Planta e Topologia; DIV tudo | `5396fe9` |
| Q2f | Baixar PNG do quadro (Planta e Topologia), estado atual, sem fechar | `5abf41a` |
| T3 | Duplicar como outro tipo (documento novo, código e fluxo do tipo novo; DIA fora; regras do cliente) | `5149252` |
| Q3a | Lista de materiais no painel do quadro (sem seleção: o quadro; com seleção: a seleção) | `4328f38` |
| Q3b | Legenda do quadro no documento, como imagem logo abaixo; liga/desliga; duplo clique abre o quadro | `a3266a8` |
| Q3c | "Levar para a planilha" — **cancelado** por Claudio | — |
| E6 | Editor na Proposta e no Laudo (edita o rascunho, não publica; mesmo papel do revisor) | `254c576` |
| Q4a | "+ Ícone" do Super-Admin: tabela nova, recorte, nome, categoria, busca; cópia do ícone no quadro (`0.6.10-alpha`, reinstalar) | `bed0707` |
| Q4b | Tirar o fundo (cantos, tolerância, borda suave) e silhueta na cor da categoria; ícone em 256 px | `c4cdd5e` |
| Q4c | Gerenciar ícones criados: editar (silhueta repintada) e excluir (quadros mantêm a cópia) | `a76b16c` |
| B2a, B2b | Biblioteca em estante (modelo C): três níveis com endereço (nichos dos setores, nichos das categorias, lombadas); 5 fichários recentes por nicho; mínimo de 12 nichos (4 × 3) com decoração; Estante/Lista; "+ Novo documento" com a categoria preenchida | `23f9a5c` |
| B2c | Montantes verticais; no nível 1, aparador e até 3 diagramas como rolos de planta (papel `#2A0A0E`) | `810aa85` |
| SC1 | Setor / Categorias no formulário: setor filtra categorias; "+" só do Super-Admin; obrigatórios para sair do rascunho | `dfe0e58` |
| 0.7.0 | Versão 0.7.0 com tag `v0.7.0`; instalação do zero testada numa instância limpa | `29c5088` |

## Motor de quadro (decidido em 26/09/2026)

Um motor, no estilo Miro, com paletas. Detalhes e decisões no CONTEXTO,
seção 3.5.

| Bloco | Entrega | Situação |
|---|---|---|
| Q1 | Quadro, ícones, Planta (fundo, transparência, girar, escala) e Topologia (zonas); agrupar, travar, tamanho, girar; cone em metros | ✅ `6a1f8ee` |
| Q2 | **Ligações e cabos**: alças nas bordas, a ligação acompanha os ícones; tipos (UTP Cat5e/6/6A, fibra, coaxial, elétrica, sem fio, lógica) com cor e traço; reto, cotovelo, curvo, dobras à mão; pontas; rótulo, identificação do cabo (P-001), portas, velocidade, VLAN; **metragem pela escala** com sobra (10%); eletrocalha e canaleta | ✅ 27/09 (Q2a a Q2e) |
| Q3 | Legenda automática no documento (imagem); **lista de materiais** no painel. "Levar para a planilha" cancelado | ✅ 27/09 (Q3a, Q3b) |
| Q4 | **"+ Ícone" a partir de imagem**, só o Super-Admin: recorte, tirar fundo, silhueta, 256 px; gerenciar (editar, excluir) | ✅ 27/09 (Q4a a Q4c) |
| Q5 | **Fluxograma** sobre o motor (subtipo de DIA) — Q5a a Q5f ✅; faltam Q5g a Q5i (tabela abaixo) | em andamento |
| Q6 | **Organograma migrado para o motor**, conferindo item por item com o atual (chefia, Arrumar, matriz, busca, modelos, PDF); só então o motor antigo sai | |

Fora (Claudio, 26/09): caneta livre, marca-texto, reconhecimento de forma,
colaboração em tempo real, comentários, votação, apresentação, IA.
Fora do fluxograma (Claudio, 27/09): **ícones de rede** — cada paleta com os
seus elementos (CONTEXTO, seção 3.7).

### Q5 — Fluxograma (27/09/2026, com mockup de Claudio antes de cada escolha)

| Bloco | Entrega | Situação |
|---|---|---|
| Q5a | Subtipo `fluxograma` de DIA; motor aberto pelo documento (`codexplus-flow.js`); leitura em SVG; PNG e PDF | ✅ `6ef31e5` |
| Q5b | Formas com texto dentro; ligação de fluxo com Sim/Não; **elementos separados por paleta** | ✅ `ca747d2` |
| Q5c | 8 alças (altura mínima pelo texto), barra flutuante (12 tons, negrito, letra), camadas | ✅ `086544f` |
| Q5d | Ligação: cor, espessura, traço, pontas, cantos arredondados, balão colorido e deslizante | ✅ `a12638a` |
| Q5e-1 | 9 formas de fluxograma clássico; paleta em seções recolhíveis | ✅ `6541123` |
| Q5e-2 | BPMN: eventos (com tipos), tarefa (com tipos), subprocesso, gateways X/+/O, objeto de dados, anotação, grupo | ✅ `4ceb8d4` |
| Q5f | "+" rápido, mini-paleta ao soltar no vazio, alinhar e distribuir | ✅ `e694ddd` |
| Folha | Seletor de tamanho da folha (Padrão, Médio, Grande, Máximo, Personalizado) | ✅ `da90cbc` |
| Q5j-1 | Ícone genérico (Lucide ISC, 56 desenhos) como forma: traço no tom da borda, nome embaixo | ✅ `00249c1` |
| Q5j-2 | Paleta com os 56 ícones em subgrupos e busca "forma ou ícone" | ✅ `6601983` |
| Q5g | **Raias com orientação por fluxograma** (horizontal ou vertical): cabeçalho com ícone, título, descrição e tom; reordenar, espessura, comprimento e tamanho do cabeçalho pelo arraste; excluir deixa as formas soltas | ✅ `ae802bc` (Q5g-1 a Q5g-3) |
| Q5h | Trocar forma (`42a4954`); link para documento ou URL, leitura clicável e lista no PDF (`e441519`); busca Ctrl+F (`35d11e4`); minimapa (`f0ad6ba`). **Sem imagem nem tabela no fluxograma** (Claudio, 02/10) | ✅ |
| Q5i | Importar e exportar `.bpmn` (BPMN 2.0 XML — Bizagi, Camunda, Signavio). **Reavaliar o escopo**: não há processos no Bizagi; o Miro não exporta (o fluxo da Ponto Telecom entrou pelo script do Console). Pontos levantados em 02/10: raias horizontais do Bizagi, as 9 formas clássicas sem equivalente BPMN, cores só pela extensão de cor | **próximo** (decidir escopo) |


## Backlog (pequenos ajustes, revisar no fim das etapas)

- Quadro: PNG com planta de fundo usa a área inteira do quadro (sobra
  branco em volta da planta); recortar só a área útil (observação no Q2f)
- Quadro: **régua** para conferir a escala (medir outra cota depois de
  definir a escala) — sugestão de 27/09, depois do erro de medida na planta
- Quadro: cabo encaixar no **contorno real** do ícone (hoje sai da borda da
  caixa quadrada; em ícones baixos, como o switch, a borda norte fica
  ~15 px acima do desenho)
- Quadro: desvio automático de obstáculos no cotovelo (hoje se resolve com
  dobra); só se fizer falta no uso real
- Fluxograma: texto solto com largura e quebra de linha (hoje as alças do
  texto mudam a letra)
- Fluxograma: mini-paleta com "mais formas" (hoje as 9 mais usadas)

- Tabelas `sectormembers` e `documenteditors` sem uso: apagar
- Textos de ajuda dos comandos de console (ainda citam gestor do setor)
- Biblioteca: filtro "incluir obsoletos" para quem só lê; estante e busca no
  Self-Service já existem pela Biblioteca
- Modelos organizados por setor e categoria (schema)
- Imagens dentro de modelos (copiar o arquivo para cada documento novo)
- "Autor:" vazio em documentos migrados sem autor: mostrar "—"
- Planilha: gráficos, SE/PROCV e mesclar células ficam fora por ora

## Decisões pendentes

- [ ] **Logo definitiva** — arquivo original (vetor ou PNG grande da versão
      escura). A enviada em 09/2026 era prévia do remove.bg: 487×92 px úteis,
      texto branco e cortada. Pendência de Claudio; não bloqueia etapas
- [x] **Self-Service vê o Codex+?** Sim, só leitura, condicionado à coluna
      Leitura do documento — Claudio, 26/09/2026 (S1)
- [ ] **Tabela e imagem dentro do fluxograma** (estavam no escopo original
      do Q5): fazer num bloco próprio ou cortar? Decidir antes do Q5h

**Decididas:**

- [x] **Papéis pelo perfil** (Responsável/Aprovar, Auditor/Auditar,
      Revisor/Revisar e editar), sem gestor de setor nem editores; o
      auditor não edita — Claudio, 26/09/2026 (P1)
- [x] **Fluxo por tipo**: DTC uma etapa; PRP e LAU publicação direta;
      diagramas seguem POP e Manual — Claudio, 26/09/2026 (P2)
- [x] **Quem só lê entra na Biblioteca; quem produz, no Painel**; a aba
      Documentos antiga sai — Claudio, 26/09/2026 (B1, R5)
- [x] **Um motor de quadro só**, estilo Miro, com Planta, Topologia,
      Fluxograma e Organograma; ícones próprios; caneta livre fora —
      Claudio, 26/09/2026
- [x] **Ícone que falta**: genérico na hora, "+ Ícone" a partir de imagem,
      e o conjunto oficial pela especificação — Claudio, 26/09/2026
- [x] **Elementos por paleta**: mesmo motor e interações; Planta/Topologia
      com ícones, diagramas com elementos próprios — Claudio, 27/09/2026
- [x] **Fluxograma**: DIA próprio, cor por tipo, cotovelo com seta, Sim/Não,
      raias verticais, "+" e puxar para o vazio (mockup do Q5); barra
      flutuante, 12 tons, 8 alças (Q5c); estilo da ligação na barra, seta
      cheia (Q5d); 21 elementos extras, BPMN pelo Bizagi (Q5e) — Claudio,
      27/09/2026

- [x] **Auditor pelo perfil**, não pelo setor (bit Auditor na aba Codex+ de
      Perfis) — Claudio, 25/09/2026 (A1)
- [x] **Mesmo usuário nas duas etapas:** não, salvo Super-Admin e documentos
      do setor de Auditoria — Claudio, 25/09/2026 (A2)
- [x] **Super-Admin = perfil com Configurar > Atualizar**, pode tudo no
      fluxo sem regra; "Ver todos" não dispensa a validação — Claudio,
      25/09/2026 (A2)

- [x] Diagramas dentro do Codex+ — 09/2026
- [x] **draw.io descartado**; fluxograma sobre o motor próprio — 20/09/2026
- [x] **Diagrama é grafo, não árvore**: posição livre híbrida, ligações
      próprias, um chefe por elemento, cotovelos à mão — 20/09/2026
- [x] **Validação em duas etapas** (1ª gestor do setor, 2ª auditor responsável), **revisor** como papel próprio e **janela de revisão** no calendário — 21/09/2026
- [x] **Super-Admin pode tudo**, inclusive validar o que editou, em definitivo — 21/09/2026
- [x] **Cronograma** entra como subtipo de `DIA`, com períodos relativos
      (S1, S2…) em vez de datas; bloco embutido na proposta fica para
      depois — 20/09/2026
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
      e DIA entram no pacote de diagramas; a escolha na publicação fica para
      depois (até lá, Proposta e Diverso não vencem)
- [x] **Tipos `LAU`, `DTC` e `DIV`** (Claudio, 24/09/2026): Laudo Técnico
      não vence; Documentação Técnica 12 meses; Documento Diverso é o
      "documentos diversos" acima. Mesmas permissões de todos os tipos
- [x] **Cliente vinculado** (Claudio, 24/09/2026): em Laudo e Documentação
      Técnica, a usuário OU entidade do GLPI, escolhido na configuração da
      instalação; proposta segue em texto livre
- [x] **Identidade visual** (Claudio, 20/09/2026): mockup do Painel aprovado;
      donuts voltam no lugar das barras de proporção de 07/2026; marca do
      produto = monograma C+ (a logo da empresa continua no PDF)
