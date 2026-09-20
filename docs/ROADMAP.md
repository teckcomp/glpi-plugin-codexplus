# Codex+ — roadmap

> Estado em `v0.5.7-alpha` · atualizado em 15/09/2026.
> Método: cada etapa é um pacote, um deploy, um teste. Nenhuma etapa depende
> de duas outras ao mesmo tempo.

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

## ▶ Etapa 3c — modelos de verdade

**A próxima**, agora que a 4c está entregue e dá para calibrar as seções de
cada modelo vendo como elas caem no PDF real.

**Por quê:** com a decisão de 08/2026 de produzir *todos* os documentos dentro
do Codex+, modelo fraco vira atrito diário. Os quatro modelos semeados na 3a
são esqueletos.

**Entrega:** conteúdo real de cada modelo, com destaque para a **Proposta**
(Levantamento de necessidades, Avaliação, Materiais e mão de obra,
Planejamento de execução, Criticidades) e para o **Manual**.

**Aceite:** criar uma proposta a partir do modelo e ter um documento
apresentável ao cliente com pouca edição.

> Vem **depois** da 4c de propósito: só dá para calibrar as seções vendo como
> elas caem no PDF real.

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

## Decisões pendentes

- [ ] **Anexo de imagem entra no corpo do PDF?** Hoje a seção "Anexos" fica
      fora de `#codexplus-doc` de propósito — anexo é link de download, inútil
      no papel. Para POP isso está certo. Para **proposta** pode não estar: se
      o cliente recebe um croqui anexado, ele espera aquilo no arquivo.
- [ ] **Esconder o indicador "PSG sem POP vinculado"** do Painel até a Etapa 5,
      ou deixar exibindo `—`? É uma linha de Twig.
- [x] Manuais e propostas serão escritos dentro do Codex+ — **confirmado em
      08/2026**, com upload de material adicional quando necessário
- [x] Validade padrão de 12 meses — confirmado
- [x] Siglas `POP` `PSG` `MAN` `PRP` — confirmadas
