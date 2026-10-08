# Codex+ — próximo passo

> Documento de passagem. Substituído a cada fechamento de sessão.
> Gerado em 08/10/2026 (noite), depois da subida da **`v0.8.3`** para a
> produção (PL-1, PL-2, PL-3a, PL-3b — CONTEXTO 3.29 a 3.33). Validação com
> uso real segue até ~21/10/2026.

## Estado

- Versão: **`0.8.3`**, tag **`v0.8.3`** (`a71a149`), **na homologação e na
  produção**. Os commits de docs depois da tag não precisam de subida. Catálogo do mapa
  de calor com o XV2-2X e os perfis de referência. Ação automática
  `codexplusexpiry` ativa; notificações por e-mail **desligadas** na
  homologação (Claudio: a Teckcomp não usa; pronto para terceiros).
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
- **Fonte da verdade: `docs/CONTEXTO.md`** (seções 3.17 a 3.27, achados
  até 171) e `docs/ROADMAP.md`, seções **"Reta final antes da produção"**,
  **"Pós-produção"** e "Decisões pendentes → Da Reta final".

## Regras de trabalho (Claudio)

- **Antes da produção, só a Reta final** (04/10, fim da noite): 12 blocos
  + F-0. Todo o resto, inclusive a caça a bugs anotada, é Pós-produção.
  Não puxar item da Pós-produção para dentro de um bloco da Reta final.
- Acelerar: pacotes maiores quando o risco é baixo, mockup só quando a tela
  muda de verdade.
- Um pacote por bloco, validado antes, roteiro de teste e **commit antes do
  pacote seguinte**. Clonar do GitHub no último commit antes de mexer
  (achado 71).
- **Validação no container** (achado 136): GLPI 11.0.6 real + MariaDB,
  harness PHP com o Kernel, tela pelo `php -S` + Chromium (sem Chromium:
  login por script numa sessão Python só, achado 154). **MariaDB e
  `php -S` morrem entre comandos: subir no mesmo comando**; `cache:clear`
  depois de trocar Twig (achado 140).
- **Toda regra prometida no texto da entrega entra no harness** (achado 139).
- **Modelo é dado da instalação, nunca semente do Install** (achado 137).

## Ordem da Reta final

1. ~~**HV-1**~~ ✅ `7a54900` — aba Histórico + "incluir obsoletos" na Biblioteca
2. ~~**AP-1**~~ ✅ `42a84c0` — aprovadores por versão + "Aguardando aprovadores" (0.7.10)
3. ~~**MO-1**~~ ✅ `1f46cb7` — modelos por setor e categoria (0.7.11)
4. ~~**MO-2**~~ ✅ `fd1db9b` — imagens e quadros viram marcadores nos modelos
5. ~~**Q7c-1**~~ ✅ `b92a242` — primeira fase não sobe acima das soltas; tela cheia estica
6. ~~**Q7c-2**~~ ✅ `b92a242` — histórico das marcações no balão do selo (0.7.12)
7. ~~**Q5k**~~ ✅ `04ea10c` — texto solto com largura; "…" na mini-paleta; quebra pela largura real
8. ~~**7a**~~ ✅ `e04c5d0` — ação automática diária e marcas (0.7.13)
9. ~~**7b**~~ ✅ `7cc27fe` — notificação nativa (0.7.14)
10. ~~**Q8**~~ ✅ `ada92f4`…`aef34d4` — mapa de calor Wi-Fi (Q8-5 → Pós-produção)
11. ~~**Q5i-5**~~ → Pós-produção (06/10: o Mermaid pela IA já resolve)
12. ~~**Q5i-6**~~ → Pós-produção (mesmo motivo)
13. ~~**F-0**~~ ✅ tag `v0.8.0` — instalação do zero idêntica à homologação → **P-1 a P-4** (produção)

## Regra para as próximas mudanças (Claudio, 08/10/2026)

Tudo na **homologação primeiro**, um pacote por bloco com commit (sem tag)
antes do pacote seguinte; quando o conjunto estiver validado, **uma subida
só** para a produção pela tag final (backup → checkout da tag →
reinstalação → conferência no navegador).

## Próximo passo imediato

**Validação em produção até ~21/10/2026** — Claudio usa o Codex+ 0.8.3 nas
rotinas reais. O que surgir vira um novo conjunto PL-n (mesma regra acima).

Depois da validação, como pós-produção: **P-3a** (cadastros da homologação;
começar por um script de leitura nos dois servidores — usuários, grupos e o
que existe de cada lado; correspondência por login e nome de grupo),
**P-3b** (documentos escolhidos, lista com Claudio) e **P-4** (ponta a ponta
e ação automática de vencimento). Em paralelo, a lista **Pós-produção** do
ROADMAP (novos: (3) fotos no PDF em cascata, (38) limpeza de fotos sem uso,
(39) seção de acesso anônimo no rascunho).

Lembretes do container (achados 153, 154, 157, 158, 164, 168): `mysqld` por
`setsid nohup` no mesmo comando; `php -S` com `< /dev/null`; parar
servidor pelo PID salvo, **nunca** `pkill -f` com o padrão na linha; login
por script numa sessão Python só, com `Referer` nos POST; jsdom não tem
canvas (testar a grade). Playwright: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`.
Container novo pode precisar de `apt-get install php8.3-cli php8.3-mysql
php8.3-mbstring php8.3-xml php8.3-curl php8.3-gd php8.3-intl php8.3-zip
php8.3-bcmath php8.3-bz2 mariadb-server` (tirar o repositório do Node do
`sources.list.d`, dá 403) e do GLPI 11.0.6 baixado do GitHub.
