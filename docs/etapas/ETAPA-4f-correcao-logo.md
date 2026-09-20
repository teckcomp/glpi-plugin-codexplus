# Correção pós-4f — logo pequena demais no slot e teto de altura

## Objetivo

Corrigir o relato de que a logo "ficou pequena" depois da Etapa 4f, e
garantir que uma logo de referência 250×138px PNG/RGBA seja aceita,
armazenada e exibida sem perda de transparência e sem ficar
desproporcionalmente reduzida.

## Contexto analisado

Antes de alterar qualquer coisa, revalidado:

- `Branding::storeLogo()` — usa `move_uploaded_file()`, sem reprocessar via
  GD. **PNG com canal alfa (RGBA) já era preservado corretamente antes
  desta correção** — não havia bug aqui, só confirmação.
- `front/logo.send.php` — `Toolbox::getFileAsResponse()` entrega os bytes
  originais com o MIME correto (`Branding::getLogoMime()`). Também sem bug.
- `public/css/codexplus.css` (tela de edição, Etapa 4f) — **bug real**: o
  slot de logo tinha `height: 44px` fixo no contêiner e `max-height: 40px`
  fixo na imagem, sem nenhuma relação com `header_logo_height` (Configurar
  → Codex+, 6–30mm na época). A prévia da edição SEMPRE aparecia pequena,
  não importa o que estivesse configurado.
- `src/Branding.php` (`save()`) e `public/js/codexplus.js`
  (`getPrintConfig()`) — confirmado que o teto de `header_logo_height` era
  **30mm em DOIS lugares** (validação PHP na gravação + clamp JS na
  exportação), duplicado. Uma logo de 138px de altura nativa (~36,5mm a
  96dpi) passa desse teto — mesmo configurando o máximo permitido, a logo
  nunca apareceria em tamanho próximo do nativo.

## Alterações realizadas

1. **`src/Branding.php`** — teto de `header_logo_height` subiu de 30mm para
   **40mm** (`save()`, validação de entrada).
2. **`public/js/codexplus.js`** — o mesmo teto, duplicado no
   `getPrintConfig()` (normalização client-side, usada na exportação em
   PDF), também subiu de 30 para 40mm. **Bug pego nesta correção**: sem
   este segundo ajuste, um valor salvo entre 31–40mm passaria pela tela de
   configuração mas seria encolhido de volta para 30mm silenciosamente na
   hora de exportar o PDF — as duas validações precisavam concordar.
3. **`templates/config.html.twig`** — `max="30"` → `max="40"` no campo
   "Altura do logo (mm)"; texto de ajuda atualizado.
4. **`front/article.form.php`** (GET) — novo `$logoHeightPx`, convertendo
   `header_logo_height` (mm) para px com a mesma fórmula usada no PDF
   (96dpi), passado ao template como `logo_height_px`.
5. **`templates/article-edit.html.twig`** — as duas tags `<img>` do slot de
   logo (variante clicável e variante estática) ganharam
   `style="height:{{ logo_height_px }}px;"` — a prévia da edição passa a
   mostrar exatamente o tamanho que sai no PDF (WYSIWYG), em vez de um
   valor fixo desconectado.
6. **`public/css/codexplus.css`** — removidos os dois limites fixos
   (`height: 44px` do contêiner, `max-height: 40px` da imagem). Contêiner
   agora usa `min-height: 44px` (só evita colapsar quando não há logo
   configurada, mostrando o ícone de "adicionar imagem"); imagem usa
   `max-height: 160px` como rede de segurança (não deveria entrar em ação
   com uma configuração válida — 40mm ≈ 151px), com a altura real vindo do
   `style` inline.
7. **`setup.php`** — versão `0.5.6-alpha` → `0.5.7-alpha`.

## Arquivos modificados

- `src/Branding.php`
- `public/js/codexplus.js`
- `templates/config.html.twig`
- `front/article.form.php`
- `templates/article-edit.html.twig`
- `public/css/codexplus.css`
- `setup.php`
- `docs/ROADMAP.md`

## Arquivos criados

- `docs/etapas/ETAPA-4f-correcao-logo.md` (este arquivo)

Nenhuma coluna de banco nova, nenhuma migração — só validação de faixa e
CSS/estilo inline.

## Compatibilidade GLPI 11.0.6

- Nenhuma classe/método novo do núcleo usado nesta correção.
- Nenhuma mudança de permissão — upload continua exigindo `config` UPDATE,
  inalterado desde a 4f.

## Validações realizadas

- Revisão manual (PHP não disponível neste ambiente): balanceamento de
  chaves nos 2 arquivos PHP tocados, OK.
- Rastreado o valor de `header_logo_height` pelos 3 pontos que agora
  precisam concordar: `Branding::save()` (grava, teto 40), `front/article.php`
  → `cfg.brand.logo_mm` → `getPrintConfig()` (exporta PDF, teto 40, igual),
  `front/article.form.php` → `logo_height_px` (prévia da edição, sem teto
  próprio — usa o valor já validado na gravação).
- Confirmado que `Branding::storeLogo()`/`logo.send.php` não faziam (e
  continuam não fazendo) nenhum reprocessamento que perderia transparência
  — nenhuma mudança necessária nesses dois arquivos.

## Pendências ou riscos

1. **Nada testado no ambiente real.** Checklist mínimo:
   - Configurar → Codex+: subir "Altura do logo" para um valor entre 31 e
     40mm, salvar, confirmar que NÃO volta para 30 sozinho
   - Prévia da edição de um documento: confirmar que a logo aparece do
     mesmo tamanho configurado (não mais travada em ~40px)
   - Exportar em PDF: confirmar que o tamanho da logo bate com a prévia da
     edição (mesma altura, já que os dois usam a mesma conversão mm→px)
   - Reenviar a logo 250×138px PNG com fundo transparente pelo slot;
     confirmar que a transparência aparece corretamente tanto na prévia da
     edição quanto no PDF exportado
2. **O teto de 40mm ainda é menor que a altura nativa da logo de
   referência convertida (138px ≈ 36,5mm cabe; mas se a logo for maior que
   isso, ainda corta).** Não foi pedido remover o teto por completo — a
   arquitetura de altura de cabeçalho constante (achado 17, CONTEXTO.md)
   continua exigindo algum valor máximo fixo, por página. Se uma logo mais
   alta que 40mm for usada no futuro, o teto precisa subir de novo (mesmo
   padrão desta correção, nos mesmos 2 lugares: `Branding.php` e
   `codexplus.js`).
