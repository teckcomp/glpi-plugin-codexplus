# Codex+ — próximo passo

> Documento de passagem. Substituído a cada fechamento de sessão.
> Gerado em **23/10/2026**, no fechamento da **3ª rodada de ajustes**
> (PL-11 a PL-22). **Produção na `v0.8.5` desde 23/10/2026, conferida por
> Claudio.** Fila pronta para a próxima sessão. Detalhes técnicos na
> CONTEXTO 3.44 (achados 186 a 197).

## Estado

- **Homologação:** tag **`v0.8.5`** (`ac2c447`); só documentação depois dela.
- **Produção:** **`v0.8.5`** (`ac2c447`) desde 23/10/2026, conferida.
  Backup antes: `/root/backup/glpi-2026-10-23-0940-antes-v085.sql` (621 MB,
  sem gzip) e `codexplus-2026-10-23-0940-antes-v085.tar.gz`.
- Homologação: `177.87.230.179`, SSH porta 2078, `resolutto` → `su -`;
  GLPI em `http://177.87.230.179:2077`. Repositório =
  `/var/www/html/glpi/plugins/codexplus`, como root. Banco `glpidb`.
- **Produção:** SSH porta 2022, chave com aspas:
  `ssh -i "%USERPROFILE%\.ssh\id_ed25519" -p 2022 resolutto@177.87.230.179`
  + `su -`. Atualiza por tag. Backup antes, em `/root/backup`.
- Envio do PC: nos dois PCs o navegador salva em **Downloads**:
  `scp -P 2078 "%USERPROFILE%\Downloads\<pacote>.tar.gz" resolutto@177.87.230.179:/tmp`
  (no cmd do Windows; o resto, no servidor).
- Console: `su -s /bin/sh www-data -c "php /var/www/html/glpi/bin/console …"`.
- Commits por arquivo (`git add <arquivos>`), para não levar junto pacote
  ainda em teste.

## O que entrou na 3ª rodada (homologação)

| Bloco | O que é | Commit |
|---|---|---|
| PL-11 | Mapa de calor: semente fixa por AP (manchas e % não mudam ao aumentar/mover pouco); tamanho do ícone pelo centro | `215f027` |
| PL-18a | Planta do quadro só sai por escolha (download falhou → pergunta; antes apagava em silêncio) | `dc70f8d` |
| PL-19 | Zoom nas imagens na leitura (clique, roda, arrastar, Esc) | `2d1ae3b` |
| PL-15a | PDF parte parágrafo/lista/tabela (substituído pelo PL-15d) | `f72184d` |
| PL-20 | Botão de voltar com presença | `04bea08` |
| PL-16 | Importar Word no padrão do Codex+ (caixas, cores, fundo/largura de célula, A− nas tabelas, tamanho das imagens); sem `.md`; `.doc` pede salvar como `.docx` | `05e6458` |
| PL-22 | Folha de espera no lugar da leitura simples enquanto as folhas montam | `77076ed` |
| PL-21 | Voltar do documento leva à Biblioteca | `c9816bc` |
| PL-15b-1 | Folhas no editor: clicar no espaço do fim da folha cria linha comum; ↓ saindo de tabela/caixa; Backspace no topo da folha não junta; Enter em caixa vazia sai | `8ebac0f` |
| PL-15d | **Mesma paginação** no editor, Visualizar e PDF (vira entre blocos; só bloco maior que a folha é partido, e o editor acompanha a numeração) | `a149535` |

Fora do repositório: `/root/cx-board-check.php` (PL-18b, diagnóstico só
leitura de quadros sem planta, imagens órfãs e conteúdo vazio). Na
homologação: 51 documentos, nenhum problema.

Decisões de Claudio nesta rodada: metragem em planta sem cota — não fazer;
Word importado converte para o padrão Codex+; "o que vejo na tela é o que
sai na impressora" (PL-15d) — marcação tracejada (PL-15c) rejeitada; leitura
simples não fica como opção (só folhas, com a folha de espera).

## Subida `v0.8.5`

- Homologação: **tag `v0.8.5` em `ac2c447`** (setup 0.8.5, Habilitado).
  Sobra do PL-15c no `codexplus-editor.js` desfeita antes da tag.
- **Produção:** roteiro (SSH porta 2022, `su -`):
  1. `php /root/cx-board-check.php` (**v2**, md5 `3d3afd8dec2cfd94ae38adb6aa8a7b38`) antes
     de mexer: retrato de planta sumida, **quadro inteiro sumido** e imagens
     órfãs;
  2. backup em `/root/backup` (`mysqldump --single-transaction` + tar da
     pasta; conferir `-- Dump completed`);
  3. `git fetch --tags && git checkout v0.8.5` → `plugin:install --force
     --username=glpi codexplus` + `plugin:activate` + `plugin:list` →
     `cache:clear` + `systemctl restart apache2` → Ctrl+F5;
  4. conferência: mapa de calor (aumentar AP não muda nada), quadro com
     planta (abrir, mexer, salvar), zoom, importar Word, folhas do editor =
     Visualizar = PDF, espaço do fim da folha, botão Biblioteca, folha de
     espera.
- Avisar a equipe: na pergunta "Não foi possível carregar a imagem da
  planta", responder **Cancelar** e recarregar; PDFs exportados de novo
  podem ter outra paginação (igual à tela); Importar só aceita `.docx`.

## Diagnóstico da produção (23/10/2026, antes da subida)

`cx-board-check.php` v2: 47 documentos, 40 quadros, **nenhum "QUADRO
SUMIU"** (só compara com revisão publicada). Sem planta: DTC0006 (mapas 2
e 3), DTC0007 (plantas 1 e 2), DTC0008 (mapa 2), LAU0001 (plantas 1 e 2),
DIV0003 (mapa 1). Pendente com Claudio: quais tinham planta (reenviar pelo
"Enviar planta").

## Fila pronta (próxima sessão), em ordem

1. **PL-18c — quadro inteiro que some** (Claudio, 23/10/2026: "perdi o
   documento todo" = a topologia ou a planta inteira, não o documento).
   Perda de dado: primeiro da fila. Começar pela saída do
   `cx-board-check.php` v2 da produção (linhas "QUADRO SUMIU"; atenção: um
   quadro apagado de propósito também aparece). Hipóteses a testar no
   TinyMCE real: Delete/Backspace ao lado do quadro (bloco travado), colar
   por cima, undo depois de salvar quadro, e o GLPI limpando o
   `data-cx-board` ao gravar. Quando acontecer: **não salvar**, mandar o
   código do documento e `tail -n 100 /var/www/html/glpi/files/_log/php-errors.log`.
2. **PL-14** — Salvar/Validar sem voltar ao topo (restaurar a rolagem após
   o envio; só JS).
3. **PL-13** — Botão "Abrir planta/mapa/topologia" na barra flutuante do
   quadro selecionado (além do duplo clique).
4. **PL-12a** — Escala com traçado (linha seguindo o mouse, marcas A/B) e
   caixa própria no lugar do `prompt`.
5. **PL-12b** — "Trazer do Mapa de calor N" no Como começar (copia fundo,
   escala, paredes, Áreas e APs com rádio e semente).
6. **P-3a / P-3b / P-4** — cadastros, documentos escolhidos, ponta a ponta
   na produção.
7. **Pós-produção** (ROADMAP): (1) marca d'água RASCUNHO; (2) Word sem
   histórico e complementares; (3) PDF em cascata; depois os demais.

Fora da fila (decidido): metragem em planta sem cota; marcação tracejada
no editor; leitura simples como opção; editor partindo bloco no meio
(PL-15b-2).

## Ferramentas de teste usadas nesta rodada (no contêiner do assistente)

- Chromium (Playwright) com o `codexplus.js` real para comparar folhas do
  editor (`planBreaks`) com o Visualizar, folha a folha.
- **TinyMCE 7.9 via npm** com o `codexplus-editor.js` real e as folhas
  desenhadas — testes de cursor, clique no espaço, setas, Backspace, Enter.
- PHP 8.3 + MariaDB com banco montado para o `cx-board-check.php`.
