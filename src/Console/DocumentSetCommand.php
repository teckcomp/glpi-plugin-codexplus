<?php
namespace GlpiPlugin\Codexplus\Console;

use Glpi\Console\AbstractCommand;
use GlpiPlugin\Codexplus\Document;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * R3a — altera status, responsável ou revisão de um documento próprio, como
 * o usuário de --username (valida Atualizar + alcance), e mostra o que a aba
 * Histórico registrou.
 *
 *   php bin/console plugins:codexplus:document:set --username=glpi --id=1 --status=rascunho
 */
class DocumentSetCommand extends AbstractCommand
{
    use ConsoleHelpers;

    protected function configure()
    {
        parent::configure();
        $this->setName('plugins:codexplus:document:set');
        $this->setDescription('Codex+ (teste R3a): altera status/responsável/revisão e mostra o Histórico');
        $this->addOption('username', null, InputOption::VALUE_REQUIRED, 'Login de quem altera');
        $this->addOption('profile', null, InputOption::VALUE_REQUIRED, 'Perfil a usar (nome)');
        $this->addOption('id', null, InputOption::VALUE_REQUIRED, 'ID do documento');
        $this->addOption('status', null, InputOption::VALUE_REQUIRED, 'rascunho, publicado ou obsoleto');
        $this->addOption('owner', null, InputOption::VALUE_REQUIRED, 'Login do novo responsável');
        $this->addOption('revision', null, InputOption::VALUE_REQUIRED, 'Nova revisão (número)');
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        /** @var \DBmysql $DB */
        global $DB;

        $this->openSession($input);
        $output->writeln($this->sessionSummary());

        $id  = (int) $input->getOption('id');
        $doc = new Document();
        if (!$doc->getFromDB($id) || (int) $doc->fields['knowbaseitems_id'] !== 0) {
            $output->writeln("<error>Documento próprio #$id não encontrado.</error>");
            return Command::FAILURE;
        }
        if (!$doc->can($id, UPDATE)) {
            $output->writeln("<error>SEM DIREITO de editar #$id.</error>");
            return Command::FAILURE;
        }

        $data = ['id' => $id];
        if ($input->getOption('status') !== null) {
            $data['status'] = (string) $input->getOption('status');
        }
        if ($input->getOption('owner') !== null) {
            $data['users_id_owner'] = self::userId((string) $input->getOption('owner'));
        }
        if ($input->getOption('revision') !== null) {
            $data['revision'] = (int) $input->getOption('revision');
        }
        if (!$doc->update($data)) {
            $output->writeln('<error>Não atualizou: ' . self::flushMessages() . '</error>');
            return Command::FAILURE;
        }
        $doc->getFromDB($id);
        $output->writeln(sprintf('<info>#%d %s agora: %s</info>', $id, $doc->getCode(), $doc->fields['status']));

        $output->writeln('Histórico (glpi_logs, mais recente primeiro):');
        foreach ($DB->request([
            'FROM'  => 'glpi_logs',
            'WHERE' => ['itemtype' => Document::class, 'items_id' => $id],
            'ORDER' => 'id DESC',
            'LIMIT' => 8,
        ]) as $log) {
            $output->writeln(sprintf(
                '  %s  %s  campo %s: "%s" -> "%s"',
                $log['date_mod'],
                $log['user_name'],
                $log['id_search_option'],
                $log['old_value'],
                $log['new_value']
            ));
        }
        return Command::SUCCESS;
    }
}
