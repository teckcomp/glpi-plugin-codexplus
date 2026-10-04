<?php

namespace GlpiPlugin\Codexplus;

use Config as GlpiConfig;

/**
 * Codex+ — configuração de marca do documento (Etapa 4a).
 *
 * POR QUE SEM TABELA PRÓPRIA: Config::setConfigurationValues() do núcleo já
 * faz upsert em glpi_configs por contexto (src/Config.php:1490 do 11.0.6).
 * Criar uma tabela satélite só para meia dúzia de chaves seria schema a mais
 * para manter, migrar e desinstalar, sem ganho nenhum.
 *
 * POR QUE O LOGO NÃO VAI NO REPOSITÓRIO: o logo é dado da INSTÂNCIA, não do
 * plugin. Se morasse em plugins/codexplus/public/, todo `unzip -o` de um
 * deploy novo o apagaria, e o arquivo acabaria versionado no git por
 * acidente. Ele vai para GLPI_PLUGIN_DOC_DIR (= GLPI_VAR_DIR/_plugins,
 * ver Glpi\Application\SystemConfigurator:109), que é área gravável de
 * dados e sobrevive a qualquer atualização do plugin.
 *
 * CONSEQUÊNCIA: como o roteador do GLPI 11 só serve estáticos de
 * plugins/<nome>/public/, um arquivo em _plugins/ NÃO tem URL direta.
 * Por isso existe front/logo.send.php, que lê o arquivo e o devolve.
 */
class Branding
{
    /** Contexto usado em glpi_configs. */
    public const CONTEXT = 'plugin:codexplus';

    /** Subpasta dentro de GLPI_PLUGIN_DOC_DIR. */
    public const LOGO_DIR = 'codexplus';

    /** Tamanho máximo aceito no upload do logo (bytes). */
    public const LOGO_MAX_BYTES = 2097152; // 2 MB

    /**
     * Extensões aceitas => tipo MIME devolvido ao servir.
     *
     * SVG está fora DE PROPÓSITO: SVG é XML executável e servi-lo inline
     * abriria XSS. PNG com transparência resolve o caso de uso.
     */
    public const LOGO_TYPES = [
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
    ];

    /**
     * Valores padrão. Toda chave gravável precisa estar aqui — save() usa
     * este array como lista branca, então campo que não estiver listado é
     * simplesmente ignorado no POST.
     */
    public const DEFAULTS = [
        // Identificação
        'company_name'           => '',
        'logo_filename'          => '',

        // Cabeçalho (posição e tamanho do logo; sem texto livre, para não
        // permitir cabeçalho que empurre o conteúdo para fora da margem)
        'header_show_logo'       => '1',
        'header_logo_position'   => 'right',   // right | left
        'header_logo_height'     => '14',      // mm
        'header_repeat'          => '1',       // logo em todas as páginas

        // Título
        'title_uppercase'        => '1',

        // Rodapé (texto livre com marcadores)
        'footer_show'            => '1',
        'footer_text'            => '{codigo} · rev. {revisao}',
        'footer_show_pagination' => '1',

        // Bloco T1 (Claudio, 24/09/2026): onde os clientes estão cadastrados
        // nesta instalação. Vale para Laudo e Documentação Técnica.
        'client_source'          => 'User',     // User | Entity

        // R6-b (Claudio, 04/10/2026): prazo, em dias, de uma revisão aberta.
        'revision_deadline_days' => '30',
    ];

    /** Fontes aceitas para o cliente vinculado (itemtype do GLPI). */
    public static function getClientSources(): array
    {
        return [
            'User'   => __('Usuários do GLPI', 'codexplus'),
            'Entity' => __('Entidades do GLPI', 'codexplus'),
        ];
    }

    /** Itemtype usado no campo Cliente dos documentos novos. */
    public static function clientSource(): string
    {
        $v = self::get('client_source');
        return array_key_exists($v, self::getClientSources()) ? $v : 'User';
    }

    /**
     * Marcadores aceitos no texto do rodapé.
     * Chave => descrição exibida na tela de configuração.
     */
    public static function getMarkers(): array
    {
        return [
            '{codigo}'  => __('Código do documento (ex.: POP0014)', 'codexplus'),
            '{revisao}' => __('Revisão com 2 dígitos (ex.: 01)', 'codexplus'),
            '{titulo}'  => __('Título do documento', 'codexplus'),
            '{empresa}' => __('Nome da empresa configurado acima', 'codexplus'),
            '{data}'    => __('Data da última atualização', 'codexplus'),
            '{pagina}'  => __('Número da página', 'codexplus'),
            '{total}'   => __('Total de páginas', 'codexplus'),
        ];
    }

    public static function getLogoPositions(): array
    {
        return [
            'right' => __('Canto superior direito', 'codexplus'),
            'left'  => __('Canto superior esquerdo', 'codexplus'),
        ];
    }

    /**
     * Devolve a configuração completa, já com os padrões aplicados para as
     * chaves ainda não gravadas.
     */
    public static function getAll(): array
    {
        $stored = GlpiConfig::getConfigurationValues(self::CONTEXT);
        $out    = [];

        foreach (self::DEFAULTS as $key => $default) {
            $out[$key] = array_key_exists($key, $stored) && $stored[$key] !== null
                ? (string) $stored[$key]
                : $default;
        }

        return $out;
    }

    public static function get(string $key): string
    {
        $all = self::getAll();
        return $all[$key] ?? '';
    }

    /**
     * JSON de #codexplus-print-config (contrato com public/js/codexplus.js):
     * a marca vem daqui, o documento vem de quem chama. Criado na R3b3-2 para
     * a página do documento do modelo novo. front/article.php (modelo antigo)
     * ainda monta o seu igual, à mão: sai na R5 com a base nativa.
     *
     * Chaves de $document: title, code, revision, client, date_mod, doctype,
     * owner, date_published, header_html, footer_text; opcionais sector e
     * draft (aviso na linha de identificação quando não é a versão vigente).
     * As flags JSON_HEX_* não são opcionais (achado 14).
     */
    public static function printConfig(array $document, int $brandId = 0): string
    {
        // M-1: nome, logo, altura e cor vêm da MARCA (Brand::forPrint); o
        // resto (posição, repetição, caixa alta, rodapé) continua global.
        $brand = Brand::forPrint($brandId);
        $json = json_encode(
            [
                'brand'    => [
                    'company'      => $brand['company'],
                    'logo_url'     => $brand['logo_url'],
                    'color'        => $brand['color'],
                    'show_logo'    => self::get('header_show_logo') === '1',
                    'repeat_logo'  => self::get('header_repeat') === '1',
                    'logo_pos'     => self::get('header_logo_position'),
                    'logo_mm'      => $brand['logo_mm'],
                    'title_upper'  => self::get('title_uppercase') === '1',
                    'footer_show'  => self::get('footer_show') === '1',
                    'footer_text'  => self::get('footer_text'),
                    'footer_pages' => self::get('footer_show_pagination') === '1',
                ],
                'document' => $document,
            ],
            JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
        );
        return $json !== false ? $json : '{}';
    }

    /**
     * Grava a configuração. Só as chaves de DEFAULTS são aceitas.
     * Caixas de seleção não enviam nada quando desmarcadas, então cada
     * chave booleana é normalizada explicitamente para '0' ou '1'.
     */
    public static function save(array $input): void
    {
        $booleans = [
            'header_show_logo',
            'header_repeat',
            'title_uppercase',
            'footer_show',
            'footer_show_pagination',
        ];

        $values = [];

        foreach (self::DEFAULTS as $key => $default) {
            if ($key === 'logo_filename') {
                continue; // M-1: a logo é da marca (Brand)
            }

            if (in_array($key, $booleans, true)) {
                $values[$key] = !empty($input[$key]) ? '1' : '0';
                continue;
            }

            if (!array_key_exists($key, $input)) {
                continue;
            }

            $values[$key] = (string) $input[$key];
        }

        // Altura do logo: entre 6 e 40 mm. Fora disso o cabeçalho come a
        // primeira linha do conteúdo ou vira um selo minúsculo.
        if (isset($values['header_logo_height'])) {
            $h = (int) $values['header_logo_height'];
            // Teto subiu de 30 para 40mm nesta correção: uma logo de 138px de
            // altura nativa (~36,5mm a 96dpi) passava do teto antigo. Segue
            // sendo um valor fixo por página (não a altura nativa da imagem
            // em si) — a arquitetura de altura de cabeçalho constante
            // (achado 17, CONTEXTO.md) continua exigindo um teto, só mais alto.
            $values['header_logo_height'] = (string) max(6, min(40, $h ?: 14));
        }

        if (
            isset($values['header_logo_position'])
            && !array_key_exists($values['header_logo_position'], self::getLogoPositions())
        ) {
            $values['header_logo_position'] = 'right';
        }

        if (isset($values['revision_deadline_days'])) {
            $d = (int) $values['revision_deadline_days'];
            $values['revision_deadline_days'] = (string) max(1, min(365, $d ?: 30));
        }

        if (
            isset($values['client_source'])
            && !array_key_exists($values['client_source'], self::getClientSources())
        ) {
            $values['client_source'] = 'User';
        }

        // Nome da empresa e rodapé são texto livre: guarda cru, escapa na
        // exibição (o Twig escapa por padrão; o JS do PDF escapa também).
        if (isset($values['company_name'])) {
            $values['company_name'] = trim($values['company_name']);
        }
        if (isset($values['footer_text'])) {
            $values['footer_text'] = trim($values['footer_text']);
        }

        GlpiConfig::setConfigurationValues(self::CONTEXT, $values);
    }

    // ---------------------------------------------------------------------
    // Logo
    // ---------------------------------------------------------------------

    /** Pasta onde o logo é guardado, criada sob demanda. */
    public static function getLogoDir(): string
    {
        return GLPI_PLUGIN_DOC_DIR . '/' . self::LOGO_DIR;
    }

    /** Caminho absoluto do logo, ou null se não houver nenhum gravado. */
    public static function getLogoPath(): ?string
    {
        $name = self::get('logo_filename');
        if ($name === '') {
            return null;
        }

        // basename() defensivo: mesmo vindo da nossa própria config, nunca
        // deixar o nome escapar da pasta.
        $path = self::getLogoDir() . '/' . basename($name);

        return is_file($path) ? $path : null;
    }

    public static function hasLogo(): bool
    {
        return self::getLogoPath() !== null;
    }

    /**
     * URL para exibir o logo. O parâmetro `v` é só quebra-cache: o nome do
     * arquivo é sempre o mesmo, então sem isso o navegador mostraria o logo
     * antigo depois de uma troca.
     */
    public static function getLogoUrl(): string
    {
        global $CFG_GLPI;

        $path = self::getLogoPath();
        if ($path === null) {
            return '';
        }

        return $CFG_GLPI['root_doc']
            . '/plugins/codexplus/front/logo.send.php?v='
            . (int) @filemtime($path);
    }

    /** Tipo MIME do logo gravado (para o cabeçalho HTTP e o data URI). */
    public static function getLogoMime(): string
    {
        $name = self::get('logo_filename');
        $ext  = strtolower(pathinfo($name, PATHINFO_EXTENSION));

        return self::LOGO_TYPES[$ext] ?? 'application/octet-stream';
    }

    // M-1: o envio e a remoção de logo passaram para Brand (uma logo por
    // marca). A logo antiga (logo.png/jpg) só é lida pela semente da 1ª marca
    // (Brand::seedFromConfig) e como reserva sem marca nenhuma.

    // ---------------------------------------------------------------------
    // Cabeçalho estruturado por documento (Etapa 4f)
    // ---------------------------------------------------------------------

    /**
     * Área 3 do cabeçalho — dados automáticos, fixos, sem opção de
     * configuração (decisão explícita do usuário, Etapa 4f: nada de
     * campo/tela para isso). Reaproveitada tanto na prévia somente-leitura
     * da tela de edição (front/article.form.php, GET) quanto na marcação
     * final gravada por composeHeaderHtml() — fonte única, evita compor o
     * mesmo texto em dois lugares com uma pequena diferença um dia.
     *
     * $bareCode vem de DocumentMeta::getBareCode() (sem sufixo de revisão —
     * a revisão já aparece ao lado, separada). Documento ainda sem tipo
     * classificado (sequencial não gerado) mostra só a data.
     */
    public static function composeArea3(string $bareCode, string $revision2, string $dateStr): string
    {
        return $bareCode !== ''
            ? sprintf('%s · rev. %s · %s', $bareCode, $revision2, $dateStr)
            : $dateStr;
    }

    /**
     * Marcação do cabeçalho estruturado (Etapa 4f): título + logo lado a
     * lado (linha 1) e Área 3 (linha 2). Substitui getDefaultHeaderHtml()
     * da Etapa 4e — o cabeçalho deixou de ser semeado-e-editável-livremente
     * por TinyMCE; passa a ser sempre RECOMPOSTO por inteiro no salvamento
     * (front/article.form.php) e na criação (front/newdocument.form.php),
     * nunca editado à mão. Continua sendo gravado na mesma coluna
     * `header_html` e lido pelo mesmo pipeline até o PDF (Etapa 4e,
     * `cfg.document.header_html` em codexplus.js) — nenhuma mudança ali.
     *
     * As classes `cx-header-*` têm CSS próprio tanto no PDF
     * (buildPageCss() em codexplus.js, variante `.cx-page-header--doc`)
     * quanto na prévia da tela de edição (public/css/codexplus.css) — os
     * nomes de classe são o único contrato entre esta função e os dois.
     */
    public static function composeHeaderHtml(
        string $title,
        string $bareCode,
        string $revision2,
        string $dateStr
    ): string {
        $logoImg = '';
        if (self::hasLogo()) {
            $height = (int) self::get('header_logo_height');
            $height = $height > 0 ? $height : 14;
            $logoImg = '<img class="cx-header-logo" src="' . htmlescape(self::getLogoUrl())
                . '" alt="" style="height:' . $height . 'mm;">';
        }

        return '<div class="cx-header-row cx-header-row-1">'
            . '<span class="cx-header-title">' . htmlescape($title) . '</span>'
            . $logoImg
            . '</div>'
            . '<div class="cx-header-row cx-header-row-2">'
            . htmlescape(self::composeArea3($bareCode, $revision2, $dateStr))
            . '</div>';
    }
}
