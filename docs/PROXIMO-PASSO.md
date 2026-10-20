# Codex+ — próximo passo

> Documento de passagem. Substituído a cada fechamento de sessão.
> Gerado em **20/10/2026**, no fim da sessão de 19–20/10: **2ª rodada de
> ajustes do uso real (PL-4 a PL-10) validada e commitada na homologação**
> (CONTEXTO 3.34 a 3.42, achados 175 a 181). A produção segue na `v0.8.3`.

## Estado

- **Homologação: `c873357`** (master), sem tag. Tudo validado por Claudio.
- **Produção: `v0.8.3`** (`a71a149`, 08/10/2026).
- Versão no `setup.php`: **0.8.3** — nenhum bloco da rodada mexeu no banco
  nem na versão (todos sem reinstalar).
- **Banco da homologação: `glpidb`** (achado 159) — consulta direta com
  `mysql "$DBN"`, nome tirado do `config/config_db.php`.
- Homologação: `177.87.230.179`, SSH porta 2078, `resolutto` → **`su -`**
  (achado 93); GLPI em `http://177.87.230.179:2077`. GLPI 11.0.6, PHP 8.4,
  MariaDB 11.8. Repositório = `/var/www/html/glpi/plugins/codexplus`, como root.
- **Produção: Debian 13, SSH porta 2022**, chave do PC "Analista Resolutto"
  — **com aspas** (achado 174):
  `ssh -i "%USERPROFILE%\.ssh\id_ed25519" -p 2022 resolutto@177.87.230.179`
  + `su -`. Repositório em tag (`git describe --tags`); atualizar por
  `git fetch --tags && git checkout <tag>` + reinstalação + `cache:clear` +
  restart. Backup antes, em `/root/backup`, conferido pelo nome e pelo
  `-- Dump completed`.
- Envio do PC (cmd do Windows) — **sempre as duas linhas**, uma por PC
  (achado 98):
  ```
  :: PC "Analista Resolutto"
  scp -P 2078 "%USERPROFILE%\Documents\<pacote>.tar.gz" resolutto@177.87.230.179:/tmp
  :: PC "Pc"
  scp -P 2078 "%USERPROFILE%\Downloads\<pacote>.tar.gz" resolutto@177.87.230.179:/tmp
  ```
- Aplicar: `git status --short` **vazio**, `md5sum`, `tar xzf
  /tmp/<pacote>.tar.gz -C /var/www/html/glpi/plugins`, `chown -R
  www-data:www-data …/codexplus`, `grep -c` do token novo (achado 114).
  Só JS/CSS: Ctrl+F5. PHP/Twig: `cache:clear` + `systemctl restart
  apache2`. **Console sempre por** `su -s /bin/sh www-data -c "php
  /var/www/html/glpi/bin/console …"` — `runuser` não está no PATH
  (achado 149). Versão nova no `setup.php`: `plugin:install --force
  --username=glpi codexplus` + `plugin:activate codexplus` + `plugin:list |
  grep -i codexplus`. **Bloco de commit sempre começa com `cd` para a pasta
  do plugin** (achado 127).
- **Fonte da verdade: `docs/CONTEXTO.md`** (seções 3.34 a 3.42 desta rodada,
  achados até 181) e `docs/ROADMAP.md`, seções **"Ajustes do uso em
  produção — 2ª rodada"** e **"Pós-produção"**.

## O que entrou na rodada (homologação, falta subir)

| Bloco | O que é | Commit |
|---|---|---|
| PL-4 | Barra do editor presa ao rolar; link público no diagrama (fotos pelo link) | `1f8ca8d` |
| PL-5 | Responsável com Auditor no perfil faz todos os papéis e publica direto | `26d2d3c` |
| PL-6 | Realce nas 5 cores fortes (texto branco); cor Branco; link público com cor | `f81470b` |
| PL-7 | Editor sempre em folhas, a folha vira onde o PDF vira | `1410eaf` |
| PL-9 | Biblioteca: Setor, Categoria, Tipo e busca na linha das abas | `97e0fbb` |
| PL-8a | Tabela como no Word: cor/fundo/bordas por célula, botão direito, colar do Word | `2734581` |
| PL-8b | Estilos de tabela 1 a 5 com personalização (cor livre, claro/escuro, bordas, listras) | `8856734` |
| PL-10 | Correção do pulo para o início e do traço vertical (cursor falso) | `c873357` |

## Próximo passo imediato: subida única `v0.8.4`

1. **Homologação** (pacote pequeno da próxima sessão): versão **0.8.4** no
   `setup.php` → `plugin:install --force --username=glpi codexplus` +
   `plugin:activate codexplus` + `plugin:list | grep -i codexplus` →
   conferência rápida → commit → **tag `v0.8.4`** + `git push --tags`.
   (Sem mudança de banco; a reinstalação só registra a versão.)
2. **Produção** (SSH porta 2022, `su -`): backup em `/root/backup` (banco +
   pasta do plugin, conferido pelo nome e pelo `-- Dump completed`) →
   `git fetch --tags && git checkout v0.8.4` → reinstalação (mesmos 3
   comandos) → `cache:clear` + `systemctl restart apache2` → Ctrl+F5.
3. **Conferência em produção** (um item por bloco):
   - documento longo: folhas no editor, clicar em vários pontos (nada pula,
     sem traço no meio de planilha/planta), setas atravessando a faixa;
   - realce forte e cor Branco; link público de um texto com cor;
   - tabela: botão direito, Propriedades da célula (cor e borda tracejada),
     colar uma tabela do Word, Estilo 1 a 5 + Personalizar; PDF e Word;
   - link público de um diagrama (fluxograma e organograma com foto);
   - Biblioteca: Setor → Categoria → Tipo; busca com Enter;
   - responsável com Auditor: Publicar direto num POP.

## Depois da subida

- **P-3a** — cadastros da homologação: começar por um **script de leitura**
  nos dois servidores (usuários, grupos e o que existe de cada lado;
  correspondência por login e nome de grupo).
- **P-3b** — documentos escolhidos (lista com Claudio).
- **P-4** — ponta a ponta na produção e ação automática de vencimento.
- **Pós-produção** (ROADMAP), começando pelo que o usuário vê todo dia:
  (1) marca d'água RASCUNHO fora da versão vigente; (2) Word sem histórico
  e sem complementares; (3) PDF em cascata (RACI/cronograma como nota,
  organograma vinculado sem fotos); (4) leitura comum em folhas?; (12)
  tabela/planilha maior que uma folha repetindo o cabeçalho. Novos desta
  rodada: (40) Importar `.docx` com cores de tabela; (41) guias tracejadas
  na tabela sem bordas (só se incomodar); (37) guardar os mockups PL-8 e
  PL-9 em `docs/`.

## Regras de trabalho (Claudio)

- **Feedback da produção tem prioridade sobre a Pós-produção.**
- Tudo na **homologação primeiro**, um pacote por bloco, validado antes, com
  roteiro de teste e **commit antes do pacote seguinte**; quando o conjunto
  fecha, **uma subida só** para a produção pela tag.
- Clonar do GitHub no último commit antes de mexer (achado 71). **Cuidado
  com `git stash` + `git checkout -- .` no clone**: o pacote ainda não
  commitado por Claudio some do clone — guardar a cópia do pacote antes.
- **Validação no container** (achado 136): GLPI 11.0.6 real + MariaDB,
  harness PHP com o Kernel, tela pelo `php -S` + Chromium (Playwright).
  Toda regra prometida no texto da entrega entra no harness (achado 139).
- Pedido ambíguo de tela: **confirmar com print ou mockup antes de
  codificar** (lição do PL-7: "quebra de página" era ver as folhas, não
  Ctrl+Enter). Mockup só quando a tela muda de verdade.
- Modelo é dado da instalação, nunca semente do Install (achado 137).

## Lembretes do container

Achados 153, 154, 157, 158, 164, 168, 175, 177, 179: `mysqld` por `setsid
nohup` no mesmo comando; `php -S` com `< /dev/null` (e `setsid nohup … &`
dentro de parênteses, senão o comando trava até o limite); parar servidor
pelo PID salvo, **nunca** `pkill -f` com o padrão na linha; login por script
numa sessão Python só, com `Referer` nos POST; jsdom não tem canvas.
Playwright: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; aba nova na mesma
sessão = `context.new_page()`; TinyMCE 7 = `tinymce.get()`; token de teste
gerado em Python (o shell é `sh`, sem `{1..48}`). Teste de "pulo" na tela:
medir a posição NA TELA do bloco clicado antes e depois. Container novo pode
precisar de `apt-get install php8.3-cli php8.3-mysql php8.3-mbstring
php8.3-xml php8.3-curl php8.3-gd php8.3-intl php8.3-zip php8.3-bcmath
php8.3-bz2 mariadb-server` (tirar o repositório do Node do
`sources.list.d`, dá 403) e do GLPI 11.0.6 baixado do GitHub
(`db:install … --allow-superuser`).
