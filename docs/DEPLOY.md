# Codex+ — deploy e teste

Ambiente de homologação: `192.168.1.50`, GLPI em `/var/www/html/glpi`.

---

## Enviar o pacote

O desenvolvimento é feito em PC Windows sem Git local; o Git roda **no
servidor**. Envio por `pscp`:

```cmd
pscp "%USERPROFILE%\Downloads\codexplus-<etapa>.zip" teckcomp@192.168.1.50:/tmp/
```

(No PowerShell, `$env:USERPROFILE`.)

Nomeie o zip **sempre com a versão ou a etapa** — dois arquivos de mesmo nome
colidem no Downloads e o `pscp` acaba reenviando o antigo.

O zip deve conter a pasta `codexplus/` na raiz, para extrair a partir de
`plugins/`.

---

## Aplicar no servidor

### Quando `setup.php` (versão) ou `Install.php` mudou

```bash
cd /var/www/html/glpi/plugins
unzip -o /tmp/codexplus-<etapa>.zip
chown -R www-data:www-data /var/www/html/glpi/plugins/codexplus

cd /var/www/html/glpi
sudo -u www-data php bin/console plugin:install --username=glpi codexplus
sudo -u www-data php bin/console plugin:activate codexplus
sudo -u www-data php bin/console cache:clear
systemctl restart apache2

sudo -u www-data php bin/console plugin:list | grep -i codexplus
```

> **Regra do projeto:** todo bloco que inclui `plugin:install` **precisa** de
> `plugin:activate` logo em seguida — o install **desativa** o plugin — e deve
> terminar com `plugin:list | grep` para confirmar estado e versão.

### Quando mudou só Twig, CSS ou PHP de `src/`/`front/`

```bash
cd /var/www/html/glpi/plugins
unzip -o /tmp/codexplus-<etapa>.zip
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

Como root puro o console recusa — use sempre `sudo -u www-data`.

---

## Diagnóstico

"Ocorreu um erro inesperado" → o log útil é o interno do GLPI:

```bash
sudo tail -n 100 /var/www/html/glpi/files/_log/php-errors.log
```

O log do Apache normalmente só tem ruído de inicialização.

Se uma correção "não fez efeito", confirme **primeiro** que o arquivo novo
chegou ao servidor — arquivo antigo é a causa mais comum:

```bash
grep -c "<trecho_que_só_existe_na_versão_nova>" \
  /var/www/html/glpi/plugins/codexplus/<arquivo>
```

Não há PHP no ambiente de quem gera os pacotes, então `php -l` não roda antes
do envio: erros de sintaxe aparecem só na ativação.

---

## Fechar no Git

Depois do teste aprovado, e **só** depois:

```bash
cd ~/glpi-plugin-codexplus
git pull
rm -rf /tmp/cx && unzip -o /tmp/codexplus-<versao>.zip -d /tmp/cx
cp -rf /tmp/cx/codexplus/* ~/glpi-plugin-codexplus/
git status && git add -A
git commit -m "<mensagem sem acentos>"
git push origin master
git log --oneline -1
```

A pasta do repositório é **separada** da pasta do plugin implantado.

Se houve commit pela interface web do GitHub, rode `git pull` antes do push.

> O **logo não entra no commit**: ele mora em `files/_plugins/codexplus/`,
> fora da pasta do plugin. Foi essa a razão da decisão — dado de instância não
> se versiona, e assim não há risco de publicar a marca por acidente.
