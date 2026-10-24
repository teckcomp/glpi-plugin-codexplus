# Codex+ — próximo passo

> Documento de passagem. Substituído a cada fechamento de sessão.
> Gerado em **24/10/2026 (noite)**, no fechamento da sessão do **contrato
> da folha** (RV-1 + PL-28), aprovado por Claudio. Detalhes na CONTEXTO
> 3.46 (achados 208 a 218). "Primeira batalha" vencida; o resto fica para a
> próxima sessão.

## Estado

- **Produção:** **`v0.8.5`** (`ac2c447`) — **ainda com o editor em folhas
  (PL-7/PL-15b)** que deformou um documento em 17/10. Avisar a equipe para
  não editar documentos longos até a subida da `v0.8.6`.
- **Homologação:** `c8ecce1` (RV-1) + pacote **pl28-6 aplicado e aprovado,
  sem commit**. Primeira coisa da próxima sessão (como root):

  ```bash
  cd /var/www/html/glpi/plugins/codexplus && git status --short   # 3 arquivos M
  git add public/js/codexplus-editor.js public/js/codexplus.js templates/document-form.html.twig
  git commit -m "PL-28: regua da folha no editor; PDF e Visualizar como impressora (recorte continuo, clipPlan compartilhado); marcador de linha vazia; protecao de blocos no Delete/Backspace" && git push && git log --oneline -1
  rm -f /tmp/codexplus-pl28-*.tar.gz
  ```
- MAN0006 (id 55) agora tem o manual de automatização importado (21 folhas),
  usado como documento de validação; tem dezenas de linhas vazias deixadas
  pelo autor (são conteúdo, imprimem onde estão).
- Acessos e envio: iguais (SSH 2078 homologação, 2022 produção,
  `scp -P 2078 "%USERPROFILE%\Downloads\<pacote>.tar.gz"
  resolutto@177.87.230.179:/tmp`).

## Contrato da folha (Claudio, 24/10/2026 — vale para tudo que vier)

1. O PDF é **só o modelo** (A4, margens, cabeçalho, rodapé). Não decide nada.
2. O editor mostra a **régua** do modelo por cima do texto, sem mover nada.
3. PDF e Visualizar são uma **impressora**: folha N = recorte contíguo do
   texto diagramado; nada se move, se perde ou encolhe. Linha vazia é
   conteúdo.
4. Corte sempre **entre linhas** (texto, tabela, imagem, linha vazia).
5. Editor sem "vida própria": Enter empurra, Backspace puxa, imagem mantém a
   proporção; Delete/Backspace não apagam bloco vizinho.
6. Mudou tipografia no `PRINT_CSS`? Mude o par em `rulerTypoCss()`.

## Fila (próxima sessão), em ordem — um pacote por item

1. **Commit do PL-28** (bloco acima).
2. **PL-29** — `td, th { print-color-adjust: exact }` no `PRINT_CSS`
   (cabeçalho de tabela importada sai cinza no PDF, achado 217).
3. **Subida `v0.8.6`** — RV-1 + PL-28 + PL-29. Rotina: bump em `setup.php`,
   commit `release: 0.8.6`, tag, push; produção: backup (dump + tar em
   `/root/backup`, conferir "Dump completed"), `git fetch --tags &&
   git checkout v0.8.6`, `plugin:install --force --username=glpi codexplus`,
   `plugin:activate`, `cache:clear`, `systemctl restart apache2`,
   `plugin:list | grep codexplus`. Sem banco: volta é `git checkout v0.8.5`.
4. **PL-25a** — botões de alinhamento no editor.
5. **PL-24** — dados do documento recolhíveis na leitura.
6. **PL-28b** — PDF composto e legenda/figura no molde da impressora.
7. **PL-26** — visual dos editores no layout do plugin (mockup antes).
8. Depois: PL-18c (quadro que some), PL-14, PL-13, PL-12a, PL-12b,
   P-3a/P-3b/P-4, Pós-produção.

## Rotina de medição (achado 218) — usar em qualquer mudança de layout do editor

No console do navegador (F12), na edição e no Visualizar, listar
`TAG:altura` de cada filho de topo (no Visualizar, filhos do `.cx-clip` da
folha 1, sem `.cx-heading`); comparar as duas listas. Divergência = regra do
tema do GLPI sem par em `rulerTypoCss()`. Comandos prontos no histórico do
chat de 24/10 (sessão "contrato da folha").

## Ferramentas de teste no contêiner do assistente

Chromium (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`), TinyMCE 7.9 via npm,
PHP 8.3 + Twig 3.21. O harness do editor precisa simular o tema do GLPI
(valores do achado 210: Inter 14/20, `p{margin-bottom:16px}`, body com
margem 15 e `position:relative`, reboot do Bootstrap com `box-sizing`,
`img{vertical-align:middle}`, `tr,td,th{border-width:0}`).
