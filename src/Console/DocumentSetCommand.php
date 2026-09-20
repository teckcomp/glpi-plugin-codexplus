<?php
namespace GlpiPlugin\Codexplus\Console;

use Glpi\Console\AbstractCommand;
use GlpiPlugin\Codexplus\Document;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * R3a/R3c — age sobre um documento próprio como o usuário de --username:
 * edita título/conteúdo/responsável, ou executa um passo do fluxo
 * (enviar, validar, devolver, obsoleto). Mostra o que a aba Histórico
 * registrou.
 *
 *   ... document:set --username=editor --id=1 --content="<p>texto</p>"
 *   ... document:set --username=editor --id=1 --action=enviar
 *   ... document:set --username=validador --id=1 --action=validar
 *   ... document:set --username=validador --id=1 --action=devolver --comment="falta o passo 3"
 *   ... document:set --username=gestor --id=1 --action=obsoleto
 */
class DocumentSetCommand extends AbstractCommand
{
    use ConsoleHelpers;

    protected function configure()
    {
        parent::configure();
        $this->setName('plugins:codexplus:document:set');
        $this->setDescription('Codex+ (teste R3c): edita ou move o documento no fluxo (enviar/validar/devolver/obsoleto)');
        $this->addOption('username', null, InputOption::VALUE_REQUIRED, 'Login de quem age');
        $this->addOption('profile', null, InputOption::VALUE_REQUIRED, 'Perfil a usar (nome)');
        $this->addOption('id', null, InputOption::VALUE_REQUIRED, 'ID do documento');
        $this->addOption('name', null, InputOption::VALUE_REQUIRED, 'Novo título');
        $this->addOption('content', null, InputOption::VALUE_REQUIRED, 'Novo conteúdo (HTML)');
        $this->addOption('owner', null, InputOption::VALUE_REQUIRED, 'Login do novo responsável');
        $this->addOption('action', null, InputOption::VALUE_REQUIRED, 'enviar, validar, devolver ou obsoleto');
        $this->addOption('comment', null, InputOption::VALUE_REQUIRED, 'Motivo (obrigatório para devolver)');
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
        if (!$doc->can($id, READ)) {
            $output->writeln("<error>SEM DIREITO de ver #$id.</error>");
            return Command::FAILURE;
        }

        $ok = true;

        // 1) Edição (título, conteúdo, responsável).
        $data = ['id' => $id];
        if ($input->getOption('name') !== null) {
            $data['name'] = (string) $input->getOption('name');
        }
        if ($input->getOption('content') !== null) {
            $data['content'] = (string) $input->getOption('content');
        }
        if ($input->getOption('owner') !== null) {
            $data['users_id_owner'] = self::userId((string) $input->getOption('owner'));
        }
        if (count($data) > 1) {
            $isOwnerOnly = array_keys($data) === ['id', 'users_id_owner'];
            $allowed = $isOwnerOnly ? $doc->canManage() : $doc->can($id, UPDATE);
            if (!$allowed) {
                $output->writeln(sprintf(
                    '<error>SEM DIREITO de editar #%d (status: %s). Editar exige Atualizar + editor do documento ou gestor do setor, e só em rascunho.</error>',
                    $id,
                    $doc->fields['status']
                ));
                return Command::FAILURE;
            }
            if (!$doc->update($data)) {
                $output->writeln('<error>Não alterou: ' . self::flushMessages() . '</error>');
                return Command::FAILURE;
            }
            $output->writeln('<info>Alterado.</info>');
        }

        // 2) Passo do fluxo.
        $action = (string) ($input->getOption('action') ?? '');
        if ($action !== '') {
            $doc->getFromDB($id);
            switch ($action) {
                case 'enviar':
                    $ok = $doc->submit();
                    break;
                case 'validar':
                    $ok = $doc->approve();
                    break;
                case 'devolver':
                    $ok = $doc->reject((string) ($input->getOption('comment') ?? ''));
                    break;
                case 'obsoleto':
                    $ok = $doc->markObsolete();
                    break;
                default:
                    $output->writeln("<error>Ação desconhecida: $action (use enviar, validar, devolver ou obsoleto).</error>");
                    return Command::FAILURE;
            }
            if (!$ok) {
                $output->writeln('<error>NEGADO: ' . self::flushMessages() . '</error>');
            }
        }

        $doc->getFromDB($id);
        $output->writeln(sprintf('#%d %s status: <info>%s</info>', $id, $doc->getCode(), $doc->fields['status']));

        $output->writeln('Histórico (mais recente primeiro):');
        foreach ($DB->request([
            'FROM'  => 'glpi_logs',
            'WHERE' => ['itemtype' => Document::class, 'items_id' => $id],
            'ORDER' => 'id DESC',
            'LIMIT' => 5,
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
        return $ok ? Command::SUCCESS : Command::FAILURE;
    }
}
