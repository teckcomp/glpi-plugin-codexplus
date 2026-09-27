<?php

namespace GlpiPlugin\Codexplus;

/**
 * Ícones criados na instalação (bloco Q4a, Claudio 27/09/2026).
 *
 * Os 34 ícones próprios do Codex+ continuam no código
 * (public/js/codexplus-icons.js). Estes são os que o Super-Admin cria a partir
 * de uma imagem: vão para a paleta de todo mundo, na categoria escolhida.
 *
 * A imagem é SEMPRE um PNG pequeno gerado no navegador (recorte quadrado,
 * 256 px). Nem SVG nem arquivo original ficam guardados: um SVG pode trazer
 * script, o PNG não. Aqui só se confere que o que chegou é mesmo um PNG
 * pequeno (até 256 px desde o Q4b-2).
 *
 * Quem cria, edita e exclui: só o Super-Admin (Rights::isSuperAdmin),
 * decisão de Claudio. Quem usa: quem abre o quadro. O quadro guarda uma CÓPIA
 * dos ícones daqui que ele usa (codexplus-board.js, campo lib): excluir um
 * ícone não estraga quadro nenhum.
 *
 * Não é CommonDBTM: sem tela nem histórico próprios.
 */
class IconLibrary
{
    /** Categorias = as do codexplus-icons.js (cor do ícone). */
    public const CATS = ['rede', 'nucleo', 'seguranca', 'estacao', 'infra', 'protecao'];
    public const MODES = ['color', 'mask'];
    public const MAX_BYTES = 250000;   // PNG decodificado (Q4b-2: 256 px)
    public const MAX_SIDE = 256;
    public const PREFIX = 'data:image/png;base64,';

    public static function table(): string
    {
        return Install::ICONS_TABLE;
    }

    /** @return array<int, array{id:int,name:string,cat:string,search:string,mode:string,image:string}> */
    public static function all(): array
    {
        global $DB;
        if (!$DB->tableExists(self::table())) {
            return [];
        }
        $out = [];
        foreach ($DB->request(['FROM' => self::table(), 'ORDER' => ['name ASC', 'id ASC']]) as $r) {
            $out[] = self::row($r);
        }
        return $out;
    }

    private static function row(array $r): array
    {
        return [
            'id'     => (int) $r['id'],
            'name'   => (string) $r['name'],
            'cat'    => (string) $r['cat'],
            'search' => (string) $r['search'],
            'mode'   => (string) $r['mode'],
            'image'  => (string) $r['image'],
        ];
    }

    /**
     * Confere e normaliza o que veio do navegador.
     *
     * @return array{0: ?array, 1: string} [dados limpos, erro]
     */
    public static function validate(array $in): array
    {
        $name = trim(preg_replace('/\s+/u', ' ', (string) ($in['name'] ?? '')) ?? '');
        if ($name === '' || mb_strlen($name) > 60) {
            return [null, __('Informe um nome de até 60 caracteres.', 'codexplus')];
        }
        $cat = (string) ($in['cat'] ?? '');
        if (!in_array($cat, self::CATS, true)) {
            return [null, __('Categoria inválida.', 'codexplus')];
        }
        $search = trim(preg_replace('/\s+/u', ' ', (string) ($in['search'] ?? '')) ?? '');
        if (mb_strlen($search) > 200) {
            $search = mb_substr($search, 0, 200);
        }
        $mode = (string) ($in['mode'] ?? 'color');
        if (!in_array($mode, self::MODES, true)) {
            $mode = 'color';
        }
        $img = (string) ($in['image'] ?? '');
        // Base64 ocupa 4/3 do arquivo: passou do teto, avisa o motivo.
        if (strlen($img) > (int) (self::MAX_BYTES * 4 / 3) + strlen(self::PREFIX) + 4) {
            return [null, __('Imagem pesada demais para ícone (foto?). Use um desenho mais simples ou recorte uma parte menor.', 'codexplus')];
        }
        if (!self::validPng($img)) {
            return [null, __('Imagem inválida: envie de novo.', 'codexplus')];
        }
        return [['name' => $name, 'cat' => $cat, 'search' => $search, 'mode' => $mode, 'image' => $img], ''];
    }

    public static function validPng(string $img): bool
    {
        if (!str_starts_with($img, self::PREFIX)) {
            return false;
        }
        $b64 = substr($img, strlen(self::PREFIX));
        if ($b64 === '' || !preg_match('/^[A-Za-z0-9+\/]+={0,2}$/', $b64)) {
            return false;
        }
        $bin = base64_decode($b64, true);
        if ($bin === false || strlen($bin) > self::MAX_BYTES || strncmp($bin, "\x89PNG\r\n\x1a\n", 8) !== 0) {
            return false;
        }
        $info = @getimagesizefromstring($bin);
        return is_array($info)
            && ($info[2] ?? 0) === IMAGETYPE_PNG
            && $info[0] >= 16 && $info[1] >= 16
            && $info[0] <= self::MAX_SIDE && $info[1] <= self::MAX_SIDE;
    }

    /** @return array{0: ?array, 1: string} [ícone gravado, erro] */
    public static function add(array $in, int $userId): array
    {
        global $DB;
        [$data, $erro] = self::validate($in);
        if ($data === null) {
            return [null, $erro];
        }
        $now = date('Y-m-d H:i:s');
        $ok = $DB->insert(self::table(), $data + ['users_id' => $userId, 'date_creation' => $now, 'date_mod' => $now]);
        if (!$ok) {
            return [null, __('Não foi possível gravar o ícone.', 'codexplus')];
        }
        return [['id' => (int) $DB->insertId()] + $data, ''];
    }
}
