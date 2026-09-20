# Codex+ — deploy e teste

> Atualizado em 19/09/2026: servidor novo, `scp` no lugar do `pscp`, pacotes
> em `.tar.gz`, cópia que preserva arquivos ocultos.

| Item | Valor |
|---|---|
| Homologação | `177.87.230.179`, SSH porta **2078**, usuário `resolutto` |
| GLPI | `/var/www/html/glpi` |
| Repositório no servidor | `~/glpi-plugin-codexplus` (usuário `resolutto`) |
| Produção | Codex+ **não instalado** |

`resolutto` **não tem sudo**. Aplicar pacote exige root (`su -`); versionar
é com o próprio `resolutto`, para o repositório não ficar com dono root.

---

## 1. Enviar o pacote (cmd do Windows)

```cmd
scp -P 2078 "%USERPROFILE%\Downloads\codexplus-<versao>.tar.gz" resolutto@177.87.230.179:/tmp/
```

- Porta com **P maiúsculo** no `scp` (no `ssh` é minúsculo).
- Destino local **sem barra final** quando for baixar do servidor:
  `"%USERPROFILE%\Downloads"`. Com barra, o Windows lê `\"` como aspa
  escapada e o comando falha.
- Nome do pacote **sempre com a versão**: dois arquivos de mesmo nome
  colidem no Downloads e o antigo é reenviado sem ninguém perceber.
- O pacote tem a pasta `codexplus/` na raiz. O servidor **não tem**
  `zip`/`unzip`: pacotes vêm em `.tar.gz`.

---

## 2. Aplicar no servidor (root)

```bash
ssh -p 2078 resolutto@177.87.230.179
su -
```

### Quando `setup.php` (versão) ou `src/Install.php` mudou

```bash
cd /var/www/html/glpi/plugins
tar -xzf /tmp/codexplus-<versao>.tar.gz
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
cd /var/www/html/glpi/plugins
tar -xzf /tmp/codexplus-<versao>.tar.gz
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

O console recusa rodar como root puro: use sempre `sudo -u www-data` (como
root, o `sudo` funciona).

---

## 3. Versionar (usuário `resolutto`, depois do teste aprovado)

Saia do root (`exit`) antes. O GitHub é a fonte da verdade: **nada fica só
no servidor**.

```bash
cd ~/glpi-plugin-codexplus
git pull
rm -rf /tmp/cx && mkdir /tmp/cx && tar -xzf /tmp/codexplus-<versao>.tar.gz -C /tmp/cx
cp -rf /tmp/cx/codexplus/. ~/glpi-plugin-codexplus/
git status
git add -A
git commit -m "Codex+ v<versao>: <resumo sem acentos>"
git push origin master
git log --oneline -1
```

- **`codexplus/.` e não `codexplus/*`**: o `*` não copia arquivos ocultos, e
  o `git add -A` registra a ausência como exclusão. Foi assim que o
  `.gitignore` sumiu em 31/08.
- No `push`, a senha é um **token de acesso pessoal** do GitHub, não a senha
  da conta. Nunca cole token em chat nem em arquivo do repositório.
- Se houve commit pela interface web do GitHub, `git pull` antes do push.
- A versão na mensagem do commit tem que ser a mesma do `setup.php`.

> O **logo não entra no commit**: mora em `files/_plugins/codexplus/`, fora
> da pasta do plugin. Dado de instância não se versiona.

---

## 4. Diagnóstico

"Ocorreu um erro inesperado" → o log útil é o interno do GLPI:

```bash
tail -n 100 /var/www/html/glpi/files/_log/php-errors.log
```

O log do Apache normalmente só tem ruído de inicialização.

Se uma correção "não fez efeito", confirme **primeiro** que o arquivo novo
chegou ao servidor — arquivo antigo é a causa mais comum:

```bash
grep -c "<trecho_que_só_existe_na_versão_nova>" \
  /var/www/html/glpi/plugins/codexplus/<arquivo>
```

Para um retrato completo do estado (plugin implantado, repositório, banco,
direitos, erros), existe o script de auditoria somente leitura usado em
19/09/2026: `bash /tmp/codexplus-auditoria-2.sh`, rodado como root.

Não há PHP no ambiente de quem gera os pacotes: `php -l` não roda antes do
envio, e erros de sintaxe aparecem só na ativação.
