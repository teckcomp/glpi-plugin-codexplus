# Codex+ — roadmap

> Estado em `v0.5.2-alpha` · atualizado em 13/08/2026.
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

> A numeração saiu fora de ordem de propósito: o Painel (6) veio antes do PDF
> (4) porque dependia apenas da Etapa 2, e valia mais ter a tela que mostra o
> acervo funcionando do que o PDF bonito de um acervo que ninguém enxergava.

---

## ▶ Etapa 4c — motor de paginação e a marca no PDF

**A próxima. É a etapa de maior retorno visível — é o documento que chega ao
cliente.**

Tudo o que ela precisa já está pronto: a configuração é gravada pela 4a, e a
4b já entrega os dados no HTML, em
`<script type="application/json" id="codexplus-print-config">`, com esta
forma:

```json
{
  "brand": {
    "company": "", "logo_url": "", "show_logo": true, "repeat_logo": true,
    "logo_pos": "right", "logo_mm": 14, "title_upper": true,
    "footer_show": true, "footer_text": "{codigo} · rev. {revisao}",
    "footer_pages": true
  },
  "document": {
    "title": "", "code": "POP0001:00", "revision": "00",
    "client": "", "date_mod": "2026-07-21 22:20:00"
  }
}
```

**Entrega:**

- Fatiar o conteúdo em páginas dentro do iframe de impressão (794×1123 px)
- Logo no cabeçalho, na posição e altura configuradas, repetido conforme
  `repeat_logo`
- Rodapé com o texto livre, resolvendo os marcadores `{codigo}`, `{revisao}`,
  `{titulo}`, `{empresa}`, `{data}`, `{pagina}`, `{total}`
- Paginação `1 / 2` à direita quando `footer_pages` estiver ligado
- Regras de quebra: não partir bloco de passo nem tabela no meio

**Aceite:** exportar uma proposta e obter um PDF com logo em todas as
páginas, rodapé correto e paginação coerente.

**Atenção:** o único arquivo que muda é `public/js/codexplus.js` — o do
contrato dos cinco seletores. Leia `docs/CONTEXTO.md` seção 6 antes.
Lembre também de orientar o usuário a **desmarcar** "Cabeçalhos e rodapés"
no diálogo de impressão do Chrome, senão os nativos brigam com os nossos.

---

## Etapa 3c — modelos de verdade

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
> Depende da 4c — reusa o mesmo motor de paginação.
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
