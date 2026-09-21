<?php
namespace GlpiPlugin\Codexplus\Console;

use Glpi\Console\AbstractCommand;
use GlpiPlugin\Codexplus\Document;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Helper\Table;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * R3a/R3c — o que o usuário de --username enxerga entre os documentos próprios.
 *
 * Para cada documento compara as DUAS formas da regra: a consulta SQL
 * (Document::getVisibilityCriteria, que as listagens da R5 vão usar) e o
 * teste por item (canViewItem). Se discordarem, a regra está errada: o
 * comando marca DIVERGE e termina com código 1.
 *
 *   php bin/console plugins:codexplus:document:visibility --username=tech
 */
class DocumentVisibilityCommand extends AbstractCommand
{
    use ConsoleHelpers;

    protected function configure()
    {
        parent::configure();
        $this->setName('plugins:codexplus:document:visibility');
        $this->setDescription('Codex+ (teste R3a): quem vê o quê — SQL x canViewItem');
        $this->addOption('username', null, InputOption::VALUE_REQUIRED, 'Login a simular');
        $this->addOption('profile', null, InputOption::VALUE_REQUIRED, 'Perfil a usar (nome)');
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        /** @var \DBmysql $DB */
        global $DB;

        $this->openSession($input);
        $output->writeln($this->sessionSummary());

        $table = Document::getTable();

        // Pela SQL (com os critérios de visibilidade).
        $vis = Document::getVisibilityCriteria();
        $bySql = [];
        foreach ($DB->request([
            'SELECT'    => [$table . '.id'],
            'DISTINCT'  => true,
            'FROM'      => $table,
            'LEFT JOIN' => $vis['LEFT JOIN'],
            'WHERE'     => [$table . '.knowbaseitems_id' => 0, $table . '.is_deleted' => 0] + $vis['WHERE'],
        ]) as $row) {
            $bySql[(int) $row['id']] = true;
        }

        // Todos os documentos próprios, sem filtro, para o teste por item.
        $rows = [];
        $diverge = 0;
        foreach ($DB->request([
            'SELECT' => ['id'],
            'FROM'   => $table,
            'WHERE'  => ['knowbaseitems_id' => 0, 'is_deleted' => 0],
            'ORDER'  => 'id',
        ]) as $row) {
            $id  = (int) $row['id'];
            $doc = new Document();
            $doc->getFromDB($id);

            $item = $doc->can($id, READ);
            $sql  = isset($bySql[$id]);
            $edit = $doc->can($id, UPDATE);
            $val  = $doc->canValidate();
            $apr  = $doc->canApprove();
            $roles = array_filter([
                $doc->isManager() ? 'G' : '',
                $doc->isValidator() ? 'A' : '',
                $doc->isAuditor() ? 'AR' : '',
                $doc->isReviewer() ? 'R' : '',
                $doc->isEditor() ? 'E' : '',
                $doc->isContributor() ? 'alterou' : '',
            ]);
            if ($item !== $sql) {
                $diverge++;
            }

            $t = $doc->getTargets();
            $rows[] = [
                $id,
                $doc->getCode(),
                mb_strimwidth((string) $doc->fields['name'], 0, 28, '…'),
                $doc->fields['status'],
                sprintf('%dP %dG %dU', count($t['profiles']), count($t['groups']), count($t['users'])),
                $roles ? implode(' ', $roles) : '-',
                $item ? 'VÊ' : '-',
                $edit ? 'EDITA' : '-',
                $apr ? 'APROVA' : ($val ? 'VALIDA' : '-'),
                $item === $sql ? 'ok' : '<error>DIVERGE</error>',
            ];
        }

        (new Table($output))
            ->setHeaders(['ID', 'Código', 'Título', 'Status', 'Alvos', 'Papéis', 'Leitura', 'Edição', 'Aprovação', 'SQL=item'])
            ->setRows($rows)
            ->render();

        $legacy = countElementsInTable($table, ['knowbaseitems_id' => ['>', 0]]);
        $output->writeln(sprintf('(%d linha(s) de artigo nativo na mesma tabela, fora desta lista até a R4)', $legacy));
        $output->writeln('Papéis: G = gestor do setor, A = auditor do setor, AR = auditor responsável, R = revisor, E = editor; "alterou" = mexeu nesta revisão (não valida). Aprovação: APROVA = 1ª etapa (gestor), VALIDA = 2ª etapa (auditor).');

        if ($diverge > 0) {
            $output->writeln("<error>$diverge divergência(s) entre SQL e canViewItem.</error>");
            return Command::FAILURE;
        }
        return Command::SUCCESS;
    }
}
