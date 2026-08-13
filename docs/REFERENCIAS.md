# Codex+ — referências usadas no desenvolvimento

> O que foi consultado, para quê, e o que foi aproveitado ou descartado.
> Serve para não refazer avaliação já feita.

---

## 1. Fonte do GLPI 11.0.6

**A referência mais importante.** A regra do projeto é: antes de gerar código
"no escuro", consultar o fonte real em vez de estimar seletores ou APIs.

```
https://codeload.github.com/glpi-project/glpi/tar.gz/refs/tags/11.0.6
```

Arquivos que já foram consultados e o que responderam:

| Arquivo | O que resolveu |
|---|---|
| `src/Config.php` | `getConfigurationValues()` / `setConfigurationValues()` (upsert por contexto) — dispensou tabela de configuração própria |
| `src/Plugin.php` | Como o `config_page` vira URL; hook só vale para plugin **ativado** |
| `src/Glpi/Plugin/Hooks.php` | Lista canônica dos nomes de hook |
| `src/Glpi/Application/SystemConfigurator.php` | `GLPI_PLUGIN_DOC_DIR` = `GLPI_VAR_DIR/_plugins` |
| `src/Glpi/Controller/LegacyFileLoadController.php` | `front/*.php` roda em escopo de função e dentro de `ob_start()`; deve retornar `Response` |
| `src/Toolbox.php` | `getFileAsResponse()` — entrega de binário com ETag e 304 |
| `src/Document.php` | Padrão `return $doc->getAsResponse()` usado pelo núcleo |
| `src/KnowbaseItem.php` | `getAnswer()`, `canViewItem()`, `getVisibilityCriteria()` |
| `front/document.send.php` | Modelo de endpoint que serve arquivo |

---

## 2. Produtos estudados

### BookStack — `bookstackapp.com`

Inspiração visual original do projeto (que na época se chamava "Bookify").

- **Aproveitado:** a ideia de leitura confortável, estante navegável, e a
  noção de que documentação merece tela própria e não formulário de CRUD.
- **Descartado:** a hierarquia livro → capítulo → página. Categoria →
  subcategoria do GLPI já resolve, e o PSG cobre o agrupamento por setor.
  Também ficaram de fora o editor Markdown e o draw.io embutido.

### Qualyteam — gestão documental ISO 9001 (requisito 7.5)

- **Aproveitado:** a **convenção de código** (`POP0001:00`) e todo o
  vocabulário de documento controlado — revisão, validade, responsável,
  status, obsolescência.
- **Descartado deliberadamente:** fluxo de aprovação multi-etapa e trilha de
  auditoria. **Não há intenção de certificar ISO 9001** — o uso é organização
  interna, e autor e aprovador são a mesma pessoa.

### Plugin "PDF export" do marketplace do GLPI

- **Testado e descartado.** Usa TCPDF no servidor e gera tabelas de
  metadados, não um documento. TCPDF também não renderiza flexbox nem CSS
  counters. Foi o que levou à decisão de imprimir pelo navegador.

### ProjectPlus — `github.com/teckcomp/glpi-plugin-projectplus`

Plugin irmão, do mesmo autor. **É o padrão de código do Codex+**: estrutura de
`setup`/`hook`/`Install`, organização de `src/`, menu, Twig e modelos. A
Etapa 7 (alerta por e-mail) deve reaproveitar seu `Notification.php`.

---

## 3. Limitações de navegador que moldaram o PDF

| Limitação | Consequência no projeto |
|---|---|
| Chrome não suporta caixas de margem do `@page` nem `counter(page)` | Paginação `1 / 2` precisa ser feita à mão em JS (Etapa 4c) |
| `position: fixed` na impressão tem comportamento errático entre versões | Logo repetido não pode depender disso — vem do mesmo motor de paginação |
| Bloqueio de impressão de fundos | A marca é só um logo no cabeçalho, sem faixas nem marca d'água — por isso não há risco |
| `loading="lazy"` impede o carregamento fora do viewport | Iframe de impressão precisa de dimensões reais (794×1123) e `loading="eager"` forçado |

---

## 4. Layout do PDF aprovado

Fechado em mockup, em 07/2026:

- Logo no canto superior direito, em **todas as páginas**
- Título em **CAIXA ALTA**, seguido da linha de cliente (proposta) ou setor (PSG)
- Seções em negrito e caixa alta, conteúdo em texto corrido
- Rodapé: código com revisão à esquerda, paginação `1 / 2` à direita
- Sem faixas diagonais, sem marca d'água — visual limpo
- A4 retrato, margens 18 mm × 16 mm

A Etapa 4a tornou esses itens configuráveis (Nível 2: campos e toggles). O
Nível 3 — template inteiro editável — é a Etapa 8.
