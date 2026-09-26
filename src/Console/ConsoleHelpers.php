<?php
namespace GlpiPlugin\Codexplus\Console;

use Group;
use Profile;
use Session;
use Symfony\Component\Console\Exception\InvalidArgumentException;
use Symfony\Component\Console\Input\InputInterface;
use User;

/**
 * Apoio aos comandos de teste da R3a (sessão de usuário, nomes -> IDs).
 *
 * Os comandos existem porque a R3a não tem tela: é por eles que se cria um
 * documento com alvo e se confere quem vê e quem não vê. Rodam COMO o
 * usuário de --username, com os direitos reais do perfil dele.
 */
trait ConsoleHelpers
{
    /** Abre a sessão do usuário e, se pedido, troca para o perfil informado. */
    protected function openSession(InputInterface $input): void
    {
        $login = (string) $input->getOption('username');
        if ($login === '') {
            throw new InvalidArgumentException('Informe --username=<login> (o usuário que executa).');
        }
        $this->loadUserSession($login);

        $profileName = (string) ($input->getOption('profile') ?? '');
        if ($profileName !== '') {
            $pid = self::profileId($profileName);
            if (!isset($_SESSION['glpiprofiles'][$pid])) {
                throw new InvalidArgumentException("O usuário $login não tem o perfil \"$profileName\".");
            }
            Session::changeProfile($pid);
        }
    }

    /** Linha de contexto: quem, perfil, grupos. */
    protected function sessionSummary(): string
    {
        $groups = [];
        foreach ($_SESSION['glpigroups'] ?? [] as $gid) {
            $g = new Group();
            if ($g->getFromDB($gid)) {
                $groups[] = $g->fields['name'];
            }
        }
        return sprintf(
            'Usuário: %s | Perfil: %s | Grupos: %s',
            $_SESSION['glpiname'] ?? '?',
            $_SESSION['glpiactiveprofile']['name'] ?? '?',
            $groups ? implode(', ', $groups) : '(nenhum)'
        );
    }

    protected static function userId(string $login): int
    {
        $u = new User();
        if (!$u->getFromDBbyName($login)) {
            throw new InvalidArgumentException("Usuário não encontrado: $login");
        }
        return (int) $u->getID();
    }

    protected static function groupId(string $name): int
    {
        $g = new Group();
        if (!$g->getFromDBByCrit(['name' => $name])) {
            throw new InvalidArgumentException("Grupo não encontrado: $name");
        }
        return (int) $g->getID();
    }

    protected static function profileId(string $name): int
    {
        $p = new Profile();
        if (!$p->getFromDBByCrit(['name' => $name])) {
            throw new InvalidArgumentException("Perfil não encontrado: $name");
        }
        return (int) $p->getID();
    }

    protected static function sectorId(string $name): int
    {
        $s = new \GlpiPlugin\Codexplus\Sector();
        if (ctype_digit($name) && $s->getFromDB((int) $name)) {
            return (int) $name;
        }
        if (!$s->getFromDBByCrit(['name' => $name])) {
            throw new InvalidArgumentException("Setor não encontrado: $name");
        }
        return (int) $s->getID();
    }

    /** Categoria por ID ou por nome (nome completo "Pai > Filha" também vale). */
    protected static function categoryId(string $name): int
    {
        $c = new \GlpiPlugin\Codexplus\Category();
        if (ctype_digit($name) && $c->getFromDB((int) $name)) {
            return (int) $name;
        }
        if ($c->getFromDBByCrit(['completename' => $name]) || $c->getFromDBByCrit(['name' => $name])) {
            return (int) $c->getID();
        }
        throw new InvalidArgumentException("Categoria não encontrada: $name");
    }

    /** Mensagens que o GLPI acumulou na sessão (erros de validação etc.). */
    protected static function flushMessages(): string
    {
        $out = [];
        foreach ($_SESSION['MESSAGE_AFTER_REDIRECT'] ?? [] as $msgs) {
            foreach ($msgs as $m) {
                $out[] = strip_tags((string) $m);
            }
        }
        $_SESSION['MESSAGE_AFTER_REDIRECT'] = [];
        return implode(' | ', $out);
    }
}
