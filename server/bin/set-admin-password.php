<?php

declare(strict_types=1);

// Ustawia hasło administratora — zapisuje wyłącznie hash do server/config/admin-password.php.
//   php server/bin/set-admin-password.php

if (PHP_SAPI !== 'cli') {
    exit(1);
}

function askHidden(string $prompt): string
{
    if (PHP_OS_FAMILY === 'Windows') {
        // ukryte wpisywanie przez PowerShell (SecureString), bez echa w konsoli
        $cmd = 'powershell -NoProfile -Command "$p = Read-Host -AsSecureString \'' . $prompt . '\'; '
            . '[Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p))"';
        return rtrim((string) shell_exec($cmd), "\r\n");
    }
    echo $prompt . ': ';
    shell_exec('stty -echo');
    $value = rtrim((string) fgets(STDIN), "\r\n");
    shell_exec('stty echo');
    echo PHP_EOL;
    return $value;
}

$password = askHidden('Nowe hasło administratora');
if (mb_strlen($password) < 12) {
    fwrite(STDERR, "Hasło musi mieć co najmniej 12 znaków.\n");
    exit(1);
}
if (askHidden('Powtórz hasło') !== $password) {
    fwrite(STDERR, "Hasła nie są takie same.\n");
    exit(1);
}

$file = dirname(__DIR__) . '/config/admin-password.php';
$hash = password_hash($password, PASSWORD_DEFAULT);
file_put_contents($file, "<?php\n\n// Hash hasła administratora (użytkownik: admin). Wygenerowano " . date('Y-m-d H:i') . ".\nreturn " . var_export($hash, true) . ";\n");
@chmod($file, 0600);
echo "Zapisano hash w server/config/admin-password.php (użytkownik: admin).\n";
