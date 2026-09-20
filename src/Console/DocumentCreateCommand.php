<?php
namespace GlpiPlugin\Codexplus\Console;

use Glpi\Console\AbstractCommand;
use GlpiPlugin\Codexplus\Document;
use GlpiPlugin\Codexplus\Document_Category;
use GlpiPlugin\Codexplus\Document_Group;
use GlpiPlugin\Codexplus\Document_Profile;
use GlpiPlugin\Codexplus\Document_User;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * R3a — cria um documento próprio com alvos de leitura, como o usuário de
 * --username (valida os direitos dele: Criar; e Atualizar para os alvos).
 *
 *   php bin/console plugins:codexplus:document:create --username=glpi \
 *       --name="POP de teste" --doctype=POP --status=publicado --group="TI"
 */
class DocumentCreateCommand extends AbstractCommand
{
    use ConsoleHelpers;

    protected function configure()
    {
        parent::configure();
        $this->setName('plugins:codexplus:document:create');
        $this->setDescription('Codex+ (teste R3a): cria documento próprio com alvos de leitura');
        $this->addOption('username', null, InputOption::VALUE_REQUIRED, 'Login de quem cria');
        $this->addOption('profile', null, InputOption::VALUE_REQUIRED, 'Perfil a usar (nome); padrão: o do usuário');
        $this->addOption('name', null, InputOption::VALUE_REQUIRED, 'Título');
        $this->addOption('doctype', null, InputOption::VALUE_REQUIRED, 'POP, PSG, MAN ou PRP', 'POP');
        $this->addOption('status', null, InputOption::VALUE_REQUIRED, 'rascunho, publicado ou obsoleto', 'rascunho');
        $this->addOption('owner', null, InputOption::VALUE_REQUIRED, 'Login do responsável');
        $this->addOption('recursive', null, InputOption::VALUE_NONE, 'Visível nas entidades filhas');
        $this->addOption('group', null, InputOption::VALUE_REQUIRED | InputOption::VALUE_IS_ARRAY, 'Alvo: grupo (nome), repetível');
        $this->addOption('target-profile', null, InputOption::VALUE_REQUIRED | InputOption::VALUE_IS_ARRAY, 'Alvo: perfil (nome), repetível');
        $this->addOption('user', null, InputOption::VALUE_REQUIRED | InputOption::VALUE_IS_ARRAY, 'Alvo: usuário (login), repetível');
        $this->addOption('category', null, InputOption::VALUE_REQUIRED | InputOption::VALUE_IS_ARRAY, 'Categoria (ID), repetível');
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $this->openSession($input);
        $output->writeln($this->sessionSummary());

        $data = [
            'name'         => (string) $input->getOption('name'),
            'doctype'      => strtoupper((string) $input->getOption('doctype')),
            'status'       => (string) $input->getOption('status'),
            'is_recursive' => $input->getOption('recursive') ? 1 : 0,
        ];
        if ($input->getOption('owner')) {
            $data['users_id_owner'] = self::userId((string) $input->getOption('owner'));
        }

        $doc = new Document();
        if (!$doc->can(-1, CREATE, $data)) {
            $output->writeln('<error>SEM DIREITO de criar documento (bit Criar na aba Codex+ do perfil).</error>');
            return Command::FAILURE;
        }
        $id = $doc->add($data);
        if (!$id) {
            $output->writeln('<error>Não criou: ' . self::flushMessages() . '</error>');
            return Command::FAILURE;
        }
        $doc->getFromDB($id);
        $output->writeln(sprintf('<info>Criado: #%d %s "%s" (%s)</info>', $id, $doc->getCode(), $doc->fields['name'], $doc->fields['status']));

        $links = [];
        foreach ((array) $input->getOption('group') as $n) {
            $links[] = [new Document_Group(), ['groups_id' => self::groupId($n)], "grupo $n"];
        }
        foreach ((array) $input->getOption('target-profile') as $n) {
            $links[] = [new Document_Profile(), ['profiles_id' => self::profileId($n)], "perfil $n"];
        }
        foreach ((array) $input->getOption('user') as $n) {
            $links[] = [new Document_User(), ['users_id' => self::userId($n)], "usuário $n"];
        }
        foreach ((array) $input->getOption('category') as $n) {
            $links[] = [new Document_Category(), ['plugin_codexplus_categories_id' => (int) $n], "categoria #$n"];
        }

        $ok = true;
        foreach ($links as [$rel, $row, $label]) {
            $row['plugin_codexplus_documents_id'] = $id;
            if (!$rel->can(-1, CREATE, $row) || !$rel->add($row)) {
                $output->writeln("<error>Não ligou $label: sem direito ou erro. " . self::flushMessages() . '</error>');
                $ok = false;
                continue;
            }
            $output->writeln("  + alvo/ligação: $label");
        }

        return $ok ? Command::SUCCESS : Command::FAILURE;
    }
}
