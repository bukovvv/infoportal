<?php

declare(strict_types=1);

namespace KwInfo\Http;

use Throwable;

final class Router
{
    /** @var array<int, array{0: string, 1: string, 2: callable}> */
    private array $routes = [];

    public function get(string $pattern, callable $handler): void
    {
        $this->routes[] = ['GET', $pattern, $handler];
    }

    public function post(string $pattern, callable $handler): void
    {
        $this->routes[] = ['POST', $pattern, $handler];
    }

    public function put(string $pattern, callable $handler): void
    {
        $this->routes[] = ['PUT', $pattern, $handler];
    }

    public function delete(string $pattern, callable $handler): void
    {
        $this->routes[] = ['DELETE', $pattern, $handler];
    }

    public function dispatch(string $method, string $path): Response|FileResponse|RawResponse
    {
        $path = '/' . trim($path, '/');
        $allowed = false;
        try {
            foreach ($this->routes as [$verb, $pattern, $handler]) {
                $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $pattern) . '$#';
                if (preg_match($regex, $path, $m) !== 1) {
                    continue;
                }
                if ($verb !== $method) {
                    $allowed = true;
                    continue;
                }
                RateLimit::hit('api');
                $params = array_map('rawurldecode', array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY));
                $result = $handler($params);
                return $result instanceof Response || $result instanceof FileResponse || $result instanceof RawResponse ? $result : new Response($result);
            }
            throw new ApiException($allowed ? 'Niedozwolona metoda.' : 'Nie znaleziono zasobu.', $allowed ? 405 : 404);
        } catch (ApiException $e) {
            return new Response(['error' => $e->getMessage()], $e->status, $e->headers);
        } catch (Throwable $e) {
            error_log('[kw-api] ' . $e::class . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
            $message = $e instanceof \RuntimeException && str_contains($e->getMessage(), 'Rozkład nie został')
                ? $e->getMessage()
                : 'Wystąpił błąd serwera. Spróbuj ponownie za chwilę.';
            return new Response(['error' => $message], 500);
        }
    }

    /** @return array<string, mixed> */
    public static function body(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            throw new ApiException('Nieprawidłowe dane żądania.', 400);
        }

        return $data;
    }
}
