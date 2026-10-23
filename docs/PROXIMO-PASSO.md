# Codex+ — próximo passo

> Documento de passagem. Substituído a cada fechamento de sessão.
> Gerado em **23/10/2026**, no fim da **3ª rodada de ajustes** (PL-11 a
> PL-22, validados e commitados na homologação). Próximo: **subida única
> `v0.8.5`** para a produção.

## Estado

- **Homologação:** master com a 3ª rodada; versão **0.8.5** no `setup.php`
  (sem mudança de banco — a reinstalação só registra a versão).
- **Produção:** `v0.8.4` (`5f362a8`, 20/10/2026).
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

1. **Homologação:** pacote com `setup.php` 0.8.5 → `plugin:install --force
   --username=glpi codexplus` + `plugin:activate codexplus` + `plugin:list`
   → commit → tag `v0.8.5` + `git push --tags`.
2. **Produção:** rodar o `cx-board-check.php` (antes de tudo, para ver se
   já houve perda de planta) → backup (banco + pasta) → `git fetch --tags &&
   git checkout v0.8.5` → reinstalação (os mesmos 3 comandos) →
   `cache:clear` + `systemctl restart apache2` → Ctrl+F5.
3. **Conferência em produção:** mapa de calor (aumentar AP não muda nada);
   abrir quadro com planta; zoom na leitura; importar um Word; folhas do
   editor = Visualizar = PDF; clicar no espaço do fim da folha; botão
   Biblioteca; folha de espera.

## Fila depois da subida

- PL-12a — Escala com traçado e caixa própria (no lugar do `prompt`).
- PL-12b — Trazer a planta de outro Mapa de calor.
- PL-13 — Botão "Abrir…" no quadro selecionado (além do duplo clique).
- PL-14 — Salvar/Validar sem voltar ao topo.
- Depois: P-3a/P-3b/P-4 e a Pós-produção (ROADMAP).
