# Codex+ — roadmap

> Estado em `v0.5.7-alpha` · atualizado em 19/09/2026 (revisão geral após
> auditoria do servidor e do repositório).
> Método: cada etapa é um pacote, um deploy, um teste. Nenhuma etapa depende
> de duas outras ao mesmo tempo.

---

## Ordem de execução

Definida por Claudio em 19/09/2026:

1. **Pacote 0.5.8** — manutenção e PDF
2. **Etapa 9a–9c** — diagramas: tipo `DIA`, leitura e editor de organograma
3. **Etapa 3c** — modelos de verdade (inclui imagem anexa no PDF da proposta)
4. **Etapa 10** — responsável e histórico
5. **Etapa 5** — PSG e seus POPs
6. **Etapa 7** — alerta de vencimento
7. **Etapa 9d–9g** — vínculo com usuários e grupos, matrizes, fluxograma, modelos de diagrama
8. **Etapa 8** — personalização completa do PDF

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

> A numeração saiu fora de ordem de propósito: o Painel (6) veio antes do PDF
> (4) porque dependia apenas da Etapa 2, e valia mais ter a tela que mostra o
> acervo funcionando do que o PDF bonito de um acervo que ninguém enxergava.

---

## ▶ Pacote 0.5.8 — manutenção e PDF

**O próximo.** Nasce da auditoria de 19/09/2026 e da validação visual do PDF
da 4e/4f na homologação.

**Entrega:**

- **Logo ausente no PDF** (achado 21 do `CONTEXTO.md`): depois de
  `layoutPages()`, aguardar de novo as imagens pendentes antes de imprimir
- **Cabeçalho aprovado em 19/09/2026**, sobre mockup:
  - todas as páginas: uma linha só, nome do documento pequeno à esquerda e
    logo à direita (sai a 2ª linha código · revisão · data, que repetia o
    rodapé)
  - só na 1ª página: título grande em CAIXA ALTA e linha de identificação —
    cliente (proposta), setor (PSG), responsável e data de publicação (demais)
  - sem contagem de visualizações no PDF (na tela continua)
  - rodapé inalterado: `código:revisão · rev. NN` à esquerda, `N / T` à direita
- **Cabeçalho montado na hora da impressão**, a partir dos dados do
  documento, em vez do `header_html` gravado no banco. Hoje documentos
  anteriores à 4f saem sem o cabeçalho novo e o endereço da logo fica
  congelado no HTML salvo. Sem mudança de schema: a coluna continua existindo
- **Âncoras dos títulos de seção** escondidas no PDF; na tela, só ao passar o mouse
- **Nome do arquivo** sugerido: `<código> - <título>` (ex.: `POP0014-01 - Instalação de CFTV.pdf`)
- Versão alinhada em `setup.php`, `README.md` e mensagem do commit
- **Passo manual (decisão 8b):** conceder o direito de leitura do Codex+ a
  todos os perfis internos em Administração → Perfis. Quais documentos cada
  um vê continua sendo a visibilidade nativa da Base de Conhecimento

**A decidir ao abrir o pacote:** o "setor" do PSG é a categoria do documento
ou um campo novo?

**Aceite:** exportar um POP de duas páginas e obter logo nas duas, título
grande só na primeira, código só no rodapé, sem visualizações, sem ícone de
âncora, e o arquivo sugerido com o nome no padrão.

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
  nativa
- Revisão = a mesma do Codex+ (`:00`, `:01`…), sem histórico de versões novo
- Tabela satélite nova: documento, subtipo, JSON editável (rascunho) e **SVG
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

## Etapa 10 — responsável e histórico

**Registrada em 19/09/2026**, a partir da auditoria.

**Obrigatório:** ligar o histórico de `DocumentMeta` (achado 20) e fazer as
mudanças de status, responsável, validade e revisão aparecerem no
**Histórico** do próprio artigo — um lugar só para tudo.

**Candidatos, a decidir quando a etapa abrir:**

- responsável editável na tela de edição do Codex+ (hoje só na aba da ficha nativa)
- indicador "Sem responsável" em "Precisa de atenção"
- quadro **Atividade** no fim da leitura (fora do PDF): quem, quando, o quê
- histórico de revisão impresso: ao publicar nova revisão, pedir um resumo
  curto e imprimir a tabela no fim do PDF (substitui a tabela manual do
  modelo de POP). Encosta no item "trilha de auditoria" do escopo — decidir
  explicitamente

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
- [ ] Responsável e histórico funcionando (Etapa 10)
- [ ] Logo definitiva configurada
- [ ] Instalação e atualização testadas do zero numa instância limpa

---

## Decisões pendentes

- [ ] **Logo definitiva** — arquivo original (vetor ou PNG grande da versão
      escura). A enviada em 09/2026 era prévia do remove.bg: 487×92 px úteis,
      texto branco e cortada. Pendência de Claudio; não bloqueia etapas
- [ ] **Self-Service vê o Codex+?** Decidir no 9b
- [ ] **"Setor" do PSG** na linha de identificação do PDF — decidir no 0.5.8

**Decididas:**

- [x] Diagramas dentro do Codex+; fluxograma com draw.io enxugado — 09/2026
- [x] Imagem anexa no PDF: só proposta, só imagens marcadas — 19/09/2026
- [x] Indicador "PSG sem POP vinculado": exibido esmaecido com a etiqueta
      "etapa 5" até a Etapa 5 (solução da 0.5.x)
- [x] Direito de leitura do Codex+ para todos os perfis internos — 19/09/2026
- [x] Cabeçalho do PDF (0.5.8) aprovado sobre mockup — 19/09/2026
- [x] Manuais e propostas escritos dentro do Codex+ — 08/2026
- [x] Validade padrão de 12 meses; siglas `POP` `PSG` `MAN` `PRP`
