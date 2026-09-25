<?php
namespace GlpiPlugin\Codexplus\Console;

use Glpi\Console\AbstractCommand;
use GlpiPlugin\Codexplus\SectorMember;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * R3c — dá (ou tira) papel de GESTOR num setor, a um usuário ou grupo, como
 * o usuário de --username (exige o bit Gerenciar modelos, setores e
 * categorias). Sem --user/--group, só lista os papéis do setor.
 * Desde a A1 o auditor vem do perfil (coluna Auditor na aba Codex+ de
 * Perfis); --role=auditor é recusado. --remove ainda tira linha antiga de
 * auditor, para limpeza.
 *
 *   ... sector:member --username=glpi --sector="Qualidade" --role=gestor --user=joao
 *   ... sector:member --username=glpi --sector="Qualidade" --role=gestor --group="Qualidade"
 *   ... sector:member --username=glpi --sector="Qualidade" --role=gestor --user=joao --remove
 */
class SectorMemberCommand extends AbstractCommand
{
    use ConsoleHelpers;

    protected function configure()
    {
        parent::configure();
        $this->setName('plugins:codexplus:sector:member');
        $this->setDescription('Codex+ (R3c): gestores de um setor (auditor é pelo perfil desde a A1)');
        $this->addOption('username', null, InputOption::VALUE_REQUIRED, 'Login de quem executa');
        $this->addOption('profile', null, InputOption::VALUE_REQUIRED, 'Perfil a usar (nome)');
        $this->addOption('sector', null, InputOption::VALUE_REQUIRED, 'Setor (nome ou ID)');
        $this->addOption('role', null, InputOption::VALUE_REQUIRED, 'gestor (auditor é pelo perfil desde a A1)');
        $this->addOption('user', null, InputOption::VALUE_REQUIRED, 'Usuário (login)');
        $this->addOption('group', null, InputOption::VALUE_REQUIRED, 'Grupo (nome)');
        $this->addOption('remove', null, InputOption::VALUE_NONE, 'Tira o papel em vez de dar');
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        /** @var \DBmysql $DB */
        global $DB;

        $this->openSession($input);
        $output->writeln($this->sessionSummary());

        $sector = self::sectorId((string) $input->getOption('sector'));
        $row = ['plugin_codexplus_sectors_id' => $sector];

        if ($input->getOption('user') !== null || $input->getOption('group') !== null) {
            $row['role']      = (string) $input->getOption('role');
            if ($row['role'] === 'auditor') {        // só para --remove de linha antiga
                $row['role'] = SectorMember::ROLE_VALIDATOR;
            }
            $row['users_id']  = $input->getOption('user') !== null ? self::userId((string) $input->getOption('user')) : 0;
            $row['groups_id'] = $input->getOption('group') !== null ? self::groupId((string) $input->getOption('group')) : 0;

            $m = new SectorMember();
            if ($input->getOption('remove')) {
                if (!$m->getFromDBByCrit($row)) {
                    $output->writeln('<error>Esse papel não existe.</error>');
                    return Command::FAILURE;
                }
                if (!$m->can($m->getID(), PURGE) || !$m->delete(['id' => $m->getID()], true)) {
                    $output->writeln('<error>SEM DIREITO (bit Gerenciar modelos, setores e categorias).</error>');
                    return Command::FAILURE;
                }
                $output->writeln('<info>Papel removido.</info>');
            } else {
                if (!$m->can(-1, CREATE, $row)) {
                    $output->writeln('<error>SEM DIREITO (bit Gerenciar modelos, setores e categorias).</error>');
                    return Command::FAILURE;
                }
                if (!$m->add($row)) {
                    $output->writeln('<error>Não gravou: ' . self::flushMessages() . ' (papel repetido?)</error>');
                    return Command::FAILURE;
                }
                $output->writeln('<info>Papel gravado.</info>');
            }
        }

        $output->writeln('Papéis do setor ' . \Dropdown::getDropdownName('glpi_plugin_codexplus_sectors', $sector) . ':');
        $labels = SectorMember::getRoleLabels();
        foreach ($DB->request([
            'FROM'  => SectorMember::getTable(),
            'WHERE' => ['plugin_codexplus_sectors_id' => $sector],
            'ORDER' => ['role', 'id'],
        ]) as $r) {
            $m = new SectorMember();
            $m->getFromDB((int) $r['id']);
            $output->writeln(sprintf('  %-10s %s', $labels[$r['role']] ?? $r['role'], $m->getMemberName()));
        }
        return Command::SUCCESS;
    }
}
