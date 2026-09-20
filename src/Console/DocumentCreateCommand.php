<?php
namespace GlpiPlugin\Codexplus\Console;

use Glpi\Console\AbstractCommand;
use GlpiPlugin\Codexplus\Document;
use GlpiPlugin\Codexplus\DocumentEditor;
use GlpiPlugin\Codexplus\Document_Group;
use GlpiPlugin\Codexplus\Document_Profile;
use GlpiPlugin\Codexplus\Document_User;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * R3a/R3c — cria um documento próprio (sempre em rascunho) numa ou mais
 * categorias, como o usuário de --username. Valida os direitos dele:
 * Criar + gestor do setor de cada categoria. Alvos de leitura e editores
 * informados aqui exigem que ele também GERA o documento (Atualizar +
 * gestor do setor ou Ver todos).
 *
 *   php bin/console plugins:codexplus:document:create --username=gestor \
 *       --name="POP de teste" --category="Procedimentos" --group="Qualidade" \
 *       --editor=joao
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
        $this->addOption('owner', null, InputOption::VALUE_REQUIRED, 'Login do responsável');
        $this->addOption('recursive', null, InputOption::VALUE_NONE, 'Visível nas entidades filhas');
        $this->addOption('group', null, InputOption::VALUE_REQUIRED | InputOption::VALUE_IS_ARRAY, 'Alvo: grupo (nome), repetível');
        $this->addOption('target-profile', null, InputOption::VALUE_REQUIRED | InputOption::VALUE_IS_ARRAY, 'Alvo: perfil (nome), repetível');
        $this->addOption('user', null, InputOption::VALUE_REQUIRED | InputOption::VALUE_IS_ARRAY, 'Alvo: usuário (login), repetível');
        $this->addOption('category', null, InputOption::VALUE_REQUIRED | InputOption::VALUE_IS_ARRAY, 'Categoria (nome ou ID), repetível — obrigatória');
        $this->addOption('editor', null, InputOption::VALUE_REQUIRED | InputOption::VALUE_IS_ARRAY, 'Editor: usuário (login), repetível');
        $this->addOption('editor-group', null, InputOption::VALUE_REQUIRED | InputOption::VALUE_IS_ARRAY, 'Editor: grupo (nome), repetível');
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $this->openSession($input);
        $output->writeln($this->sessionSummary());

        $data = [
            'name'         => (string) $input->getOption('name'),
            'doctype'      => strtoupper((string) $input->getOption('doctype')),
            '_categories'  => array_map(fn ($c) => self::categoryId((string) $c), (array) $input->getOption('category')),
            'is_recursive' => $input->getOption('recursive') ? 1 : 0,
        ];
        if ($input->getOption('owner')) {
            $data['users_id_owner'] = self::userId((string) $input->getOption('owner'));
        }

        $doc = new Document();
        if (!$doc->can(-1, CREATE, $data)) {
            $output->writeln('<error>SEM DIREITO de criar documento: precisa do bit Criar E ser gestor do setor de cada categoria (ou Ver todos).</error>');
            return Command::FAILURE;
        }
        $id = $doc->add($data);
        if (!$id) {
            $output->writeln('<error>Não criou: ' . self::flushMessages() . '</error>');
            return Command::FAILURE;
        }
        $doc->getFromDB($id);
        $output->writeln(sprintf(
            '<info>Criado: #%d %s "%s" (%s) — setores: %s</info>',
            $id,
            $doc->getCode(),
            $doc->fields['name'],
            $doc->fields['status'],
            implode(', ', array_map(fn ($s) => \Dropdown::getDropdownName('glpi_plugin_codexplus_sectors', $s), $doc->getSectorIds())) ?: '(nenhum)'
        ));

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
        foreach ((array) $input->getOption('editor') as $n) {
            $links[] = [new DocumentEditor(), ['users_id' => self::userId($n)], "editor $n"];
        }
        foreach ((array) $input->getOption('editor-group') as $n) {
            $links[] = [new DocumentEditor(), ['groups_id' => self::groupId($n)], "editor grupo $n"];
        }

        $ok = true;
        foreach ($links as [$rel, $row, $label]) {
            $row['plugin_codexplus_documents_id'] = $id;
            if (!$rel->can(-1, CREATE, $row)) {
                $output->writeln("<error>Não ligou $label: SEM DIREITO (gerir o documento exige Atualizar + gestor do setor).</error>");
                $ok = false;
                continue;
            }
            if (!$rel->add($row)) {
                $output->writeln("<error>Não ligou $label: sem direito ou erro. " . self::flushMessages() . '</error>');
                $ok = false;
                continue;
            }
            $output->writeln("  + alvo/ligação: $label");
        }

        return $ok ? Command::SUCCESS : Command::FAILURE;
    }
}
