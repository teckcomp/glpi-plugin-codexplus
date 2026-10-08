<?php

namespace GlpiPlugin\Codexplus;

/**
 * Codex+ — fotos das pessoas do organograma (PL-3a, Claudio, 08/10/2026).
 *
 * Opção 2 do PL-3: a foto fica numa tabela própria; o organograma guarda só a
 * referência (`photo` = token de 32 hex no nó). Motivo: com 100+ pessoas a
 * foto dentro do JSON passaria do limite de 1 MB do diagrama e deixaria a
 * página pesada.
 *
 * - Duas imagens JPEG por foto, geradas no navegador a partir do mesmo
 *   recorte quadrado: `thumb` (96 px, miniatura do cartão e das linhas) e
 *   `image` (400 px, foto ampliada do PL-3b).
 * - Foto enviada nunca é sobrescrita: trocar a foto gera token novo. Assim
 *   uma versão publicada antiga continua mostrando a foto daquela época.
 * - Quem vê é quem lê o documento (front/orgphoto.send.php confere o
 *   can(READ) do documento e que a foto é DELE).
 * - Fotos que nenhuma versão usa mais ficam no banco (limpeza: Pós-produção);
 *   saem com a purga do documento.
 *
 * Não é CommonDBTM: a permissão é sempre a do documento (como Diagram).
 */
final class OrgPhoto
{
    public const THUMB_MAX_PX    = 128;
    public const IMAGE_MAX_PX    = 400;
    public const IMAGE_MIN_PX    = 48;
    public const THUMB_MAX_BYTES = 40000;
    public const IMAGE_MAX_BYTES = 250000;

    /** Token válido (32 hex, minúsculo). */
    public static function isToken($t): bool
    {
        return is_string($t) && (bool) preg_match('/^[a-f0-9]{32}$/', $t);
    }

    /**
     * Confere e decodifica um JPEG vindo do navegador (base64, com ou sem o
     * prefixo data:). null = inválido (tipo, tamanho em bytes ou em pixels).
     */
    public static function decodeJpeg(string $raw, int $maxPx, int $maxBytes): ?string
    {
        $raw = trim($raw);
        if (str_starts_with($raw, 'data:')) {
            if (!preg_match('#^data:image/jpeg;base64,#', $raw)) {
                return null;
            }
            $raw = substr($raw, strpos($raw, ',') + 1);
        }
        $bin = base64_decode($raw, true);
        if ($bin === false || $bin === '' || strlen($bin) > $maxBytes || substr($bin, 0, 3) !== "\xFF\xD8\xFF") {
            return null;
        }
        $info = @getimagesizefromstring($bin);
        if (!$info || ($info[2] ?? 0) !== IMAGETYPE_JPEG) {
            return null;
        }
        [$w, $h] = $info;
        if ($w < 16 || $h < 16 || $w > $maxPx || $h > $maxPx) {
            return null;
        }
        return $bin;
    }

    /** Grava a foto de um documento e devolve o token (null = recusada). */
    public static function store(int $documentId, string $thumb, string $image, int $userId): ?string
    {
        /** @var \DBmysql $DB */
        global $DB;

        if ($documentId <= 0) {
            return null;
        }
        $t = self::decodeJpeg($thumb, self::THUMB_MAX_PX, self::THUMB_MAX_BYTES);
        $i = self::decodeJpeg($image, self::IMAGE_MAX_PX, self::IMAGE_MAX_BYTES);
        if ($t === null || $i === null) {
            return null;
        }
        $token = bin2hex(random_bytes(16));
        $ok = $DB->insert(Install::ORG_PHOTOS_TABLE, [
            'plugin_codexplus_documents_id' => $documentId,
            'token'         => $token,
            'thumb'         => $t,
            'image'         => $i,
            'users_id'      => $userId,
            'date_creation' => $_SESSION['glpi_currenttime'] ?? date('Y-m-d H:i:s'),
        ]);
        return $ok ? $token : null;
    }

    /** Binário da foto (miniatura ou ampliada) deste documento; null = não existe. */
    public static function get(int $documentId, string $token, bool $thumb): ?string
    {
        /** @var \DBmysql $DB */
        global $DB;

        if ($documentId <= 0 || !self::isToken($token)) {
            return null;
        }
        $col = $thumb ? 'thumb' : 'image';
        $row = $DB->request([
            'SELECT' => [$col],
            'FROM'   => Install::ORG_PHOTOS_TABLE,
            'WHERE'  => ['plugin_codexplus_documents_id' => $documentId, 'token' => $token],
            'LIMIT'  => 1,
        ])->current();
        return $row ? (string) $row[$col] : null;
    }

    /** Duplicar: a cópia recebe as mesmas fotos, com os mesmos tokens. */
    public static function copyDocument(int $from, int $to): int
    {
        /** @var \DBmysql $DB */
        global $DB;

        if ($from <= 0 || $to <= 0 || $from === $to) {
            return 0;
        }
        $n = 0;
        foreach ($DB->request(['FROM' => Install::ORG_PHOTOS_TABLE, 'WHERE' => ['plugin_codexplus_documents_id' => $from]]) as $r) {
            if (countElementsInTable(Install::ORG_PHOTOS_TABLE, ['plugin_codexplus_documents_id' => $to, 'token' => $r['token']]) > 0) {
                continue;
            }
            $DB->insert(Install::ORG_PHOTOS_TABLE, [
                'plugin_codexplus_documents_id' => $to,
                'token'         => $r['token'],
                'thumb'         => $r['thumb'],
                'image'         => $r['image'],
                'users_id'      => (int) $r['users_id'],
                'date_creation' => $r['date_creation'],
            ]);
            $n++;
        }
        return $n;
    }

    public static function purgeDocument(int $documentId): void
    {
        /** @var \DBmysql $DB */
        global $DB;

        if ($documentId > 0 && $DB->tableExists(Install::ORG_PHOTOS_TABLE)) {
            $DB->delete(Install::ORG_PHOTOS_TABLE, ['plugin_codexplus_documents_id' => $documentId]);
        }
    }
}
