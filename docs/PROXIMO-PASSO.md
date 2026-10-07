# Codex+ — próximo passo

> Documento de passagem. Substituído a cada fechamento de sessão.
> Gerado em 06/10/2026, depois do **Q8 ✅** (`aef34d4`) e da mudança de
> rumo: Q8-5, Q5i-5 e Q5i-6 para a Pós-produção.

## Estado

- Versão: **`0.7.15`**; último commit de código **`aef34d4`** (Q8-6); docs
  neste pacote. Plugin 0.7.15 habilitado na homologação. Catálogo do mapa
  de calor com o XV2-2X e os perfis de referência. Ação automática
  `codexplusexpiry` ativa; notificações por e-mail **desligadas** na
  homologação (Claudio: a Teckcomp não usa; pronto para terceiros).
- **Banco da homologação: `glpidb`** (achado 159) — consulta direta com
  `mysql "$DBN"`, nome tirado do `config/config_db.php`.
- Homologação: `177.87.230.179`, SSH porta 2078, `resolutto` → **`su -`**
  (achado 93); GLPI em `http://177.87.230.179:2077`. GLPI 11.0.6, PHP 8.4,
  MariaDB 11.8. Repositório = `/var/www/html/glpi/plugins/codexplus`, como root.
- **Produção (futura): Debian 13, SSH porta 2022.** Depois do F-0.
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
- **Fonte da verdade: `docs/CONTEXTO.md`** (seções 3.17 a 3.26, achados
  até 170) e `docs/ROADMAP.md`, seções **"Reta final antes da produção"**,
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
13. **F-0** — 0.8.0, tag, instalação do zero, docs → **P-1 a P-4** (produção)

## Próximo passo imediato

**F-0** — fechamento antes da produção (ROADMAP, Reta final, linha 13):
versão **0.8.0** no `setup.php` (reinstalação), tag `v0.8.0`, **instalação
do zero** numa instância limpa conferida pelo `information_schema` contra a
homologação atualizada (achado 92), docs. Depois: **P-1 a P-4** (produção,
Debian 13, SSH 2022).

Lembretes do container (achados 153, 154, 157, 158, 164, 168): `mysqld` por
`setsid nohup` no mesmo comando; `php -S` com `< /dev/null`; parar
servidor pelo PID salvo, **nunca** `pkill -f` com o padrão na linha; login
por script numa sessão Python só, com `Referer` nos POST; jsdom não tem
canvas (testar a grade). Playwright: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`.
Container novo pode precisar de `apt-get install php8.3-cli php8.3-mysql
php8.3-mbstring php8.3-xml php8.3-curl php8.3-gd php8.3-intl php8.3-zip
php8.3-bcmath php8.3-bz2 mariadb-server` (tirar o repositório do Node do
`sources.list.d`, dá 403) e do GLPI 11.0.6 baixado do GitHub.
