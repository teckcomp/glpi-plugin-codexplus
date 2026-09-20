# Codex+ — deploy e teste

> Atualizado em 19/09/2026: servidor novo, `scp` no lugar do `pscp`, pacotes
> em `.tar.gz` e **repositório = pasta do plugin**, tudo como root — mesmo
> fluxo dos demais plugins da Teckcomp.

| Item | Valor |
|---|---|
| Homologação | `177.87.230.179`, SSH porta **2078**, usuário `resolutto` |
| GLPI | `/var/www/html/glpi` |
| Repositório no servidor | `/var/www/html/glpi/plugins/codexplus` (a própria pasta do plugin) |
| Produção | Codex+ **não instalado** |

`resolutto` não tem sudo: entre, rode **`su -` sozinho**, e só cole os
comandos depois que o prompt virar `root@debian`. Colado junto num bloco só,
o `su -` abre uma sessão nova e o resto do bloco não roda nela.

---

## 1. Enviar o pacote (cmd do Windows)

```cmd
scp -P 2078 "%USERPROFILE%\Downloads\codexplus-<versao>.tar.gz" resolutto@177.87.230.179:/tmp/
```

- Porta com **P maiúsculo** no `scp` (no `ssh` é minúsculo).
- Ao baixar do servidor, destino **sem barra final**:
  `"%USERPROFILE%\Downloads"` (com barra, `\"` vira aspa escapada).
- Nome do pacote **sempre com a versão**: dois arquivos de mesmo nome
  colidem no Downloads e o antigo é reenviado sem ninguém perceber.
- O pacote traz a pasta `codexplus/` na raiz e só os arquivos que mudaram.
  O servidor **não tem** `zip`/`unzip`: pacotes em `.tar.gz`.

---

## 2. Aplicar (root)

```bash
ssh -p 2078 resolutto@177.87.230.179
su -
```

Depois que o prompt virar `root@debian`:

### Quando `setup.php` (versão) ou `src/Install.php` mudou

```bash
md5sum /tmp/codexplus-<versao>.tar.gz
cd /var/www/html/glpi/plugins/codexplus && git pull
cd /var/www/html/glpi/plugins && tar -xzf /tmp/codexplus-<versao>.tar.gz
chown -R www-data:www-data /var/www/html/glpi/plugins/codexplus

cd /var/www/html/glpi
sudo -u www-data php bin/console plugin:install --username=glpi codexplus
sudo -u www-data php bin/console plugin:activate codexplus
sudo -u www-data php bin/console cache:clear
systemctl restart apache2

sudo -u www-data php bin/console plugin:list | grep -i codexplus
```

> **Regra do projeto:** todo bloco com `plugin:install` **precisa** de
> `plugin:activate` logo em seguida (o install **desativa** o plugin) e
> termina com `plugin:list | grep` para confirmar estado e versão.

### Quando mudou só Twig, CSS, JS ou PHP de `src/`/`front/`

```bash
md5sum /tmp/codexplus-<versao>.tar.gz
cd /var/www/html/glpi/plugins/codexplus && git pull
cd /var/www/html/glpi/plugins && tar -xzf /tmp/codexplus-<versao>.tar.gz
chown -R www-data:www-data /var/www/html/glpi/plugins/codexplus

cd /var/www/html/glpi
sudo -u www-data php bin/console cache:clear
systemctl restart apache2
```

Não reinstale por precaução.

| Mudou | Ação |
|---|---|
| `src/`, `front/` (PHP) | `cache:clear` + `restart apache2` (OPcache — essencial) |
| `templates/*.twig` | `cache:clear`; se não atualizar, purgar `files/_cache/templates/*` |
| `public/` (CSS/JS) | **Ctrl+F5** no navegador |
| `setup.php` (versão), `src/Install.php` | bloco completo acima |
| só `docs/` ou `README.md` | extrair e `chown`; nada mais |

O console recusa rodar como root puro: use sempre `sudo -u www-data`.

---

## 3. Versionar (root, depois do teste aprovado)

Como a pasta implantada **é** o repositório, versionar é só registrar o que
já está lá:

```bash
cd /var/www/html/glpi/plugins/codexplus
git status --short && git diff --stat
git add -A && git commit -m "Codex+ v<versao>: <resumo sem acentos>" && git push
git log --oneline -1
```

- O `git status --short` tem que listar **só** os arquivos do pacote. Coisa
  a mais é sinal de edição manual no servidor: pare e investigue.
- No `push`, a senha é um **token de acesso pessoal** do GitHub. Nunca cole
  token em chat nem em arquivo do repositório.
- A versão na mensagem do commit tem que ser a mesma do `setup.php`.
- **Teste reprovado:** `git checkout -- . && git clean -fd` devolve a pasta
  ao último commit (e reinstale se a versão tinha mudado).
- O root usa `safe.directory` para esta pasta (configurado em 19/09/2026).

> O **logo não entra no commit**: mora em `files/_plugins/codexplus/`, fora
> da pasta do plugin. Dado de instância não se versiona.

---

## 4. Diagnóstico

"Ocorreu um erro inesperado" → o log útil é o interno do GLPI:

```bash
tail -n 100 /var/www/html/glpi/files/_log/php-errors.log
```

Se uma correção "não fez efeito", confirme **primeiro** que o arquivo novo
chegou (o `git status` já mostra) ou:

```bash
grep -c "<trecho_que_só_existe_na_versão_nova>" \
  /var/www/html/glpi/plugins/codexplus/<arquivo>
```

Para um retrato completo do estado (plugin, repositório, banco, direitos,
erros) há o script de auditoria somente leitura usado em 19/09/2026,
rodado como root.

Quem gera os pacotes valida antes de entregar: `php -l` em todo PHP (o
ambiente dele instala `php-cli`), `node --check` e teste em DOM headless
(jsdom) no JS.
