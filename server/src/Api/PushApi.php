<?php

declare(strict_types=1);

namespace KwInfo\Api;

use KwInfo\Gtfs\Timetable;
use KwInfo\Http\ApiException;
use KwInfo\Http\Response;
use KwInfo\Http\Router;
use KwInfo\Live\Realtime;
use KwInfo\Push\JourneyWatcher;
use KwInfo\Push\PushRepository;
use KwInfo\Push\WebPush;

/** Powiadomienia push o obserwowanej podróży: klucz serwera, włączenie i wyłączenie dla podróży. */
final class PushApi
{
    public function key(): Response
    {
        return new Response(['key' => WebPush::keys()['public']]);
    }

    public function watch(): Response
    {
        $body = Router::body();
        [$endpoint, $p256dh, $auth] = self::subscription($body['subscription'] ?? null);
        $id = (string) ($body['journeyId'] ?? '');
        $legs = $body['legs'] ?? null;
        if ($id === '' || strlen($id) > 400 || !is_array($legs) || $legs === [] || count($legs) > 4) {
            throw new ApiException('Nieprawidłowe dane podróży.', 422);
        }
        $clean = [];
        foreach ($legs as $leg) {
            $key = (string) ($leg['key'] ?? '');
            $from = (string) ($leg['from'] ?? '');
            $to = (string) ($leg['to'] ?? '');
            if (preg_match('/^[\w.:-]{1,120}@\d{8}$/', $key) !== 1 || preg_match('/^[\w-]{1,20}$/', $from) !== 1 || preg_match('/^[\w-]{1,20}$/', $to) !== 1) {
                throw new ApiException('Nieprawidłowe dane podróży.', 422);
            }
            $clean[] = ['key' => $key, 'from' => $from, 'to' => $to];
        }
        $state = (new JourneyWatcher(new Timetable()))->legs($clean, Realtime::fromStorage())
            ?? throw new ApiException('Tego połączenia nie ma już w rozkładzie.', 404);
        $endsAt = JourneyWatcher::endsAt($state);
        if ($endsAt < time()) {
            throw new ApiException('Ta podróż już się zakończyła.', 422);
        }
        (new PushRepository())->save($endpoint, $p256dh, $auth, PushRepository::journeyId($id), $clean, $endsAt);

        return new Response(['watching' => true]);
    }

    public function unwatch(): Response
    {
        $body = Router::body();
        $endpoint = (string) ($body['endpoint'] ?? '');
        if (!WebPush::allowedEndpoint($endpoint)) {
            throw new ApiException('Nieprawidłowa subskrypcja.', 422);
        }
        $id = isset($body['journeyId']) ? PushRepository::journeyId((string) $body['journeyId']) : null;
        (new PushRepository())->delete($endpoint, $id);

        return new Response(['watching' => false]);
    }

    /** @return array{0: string, 1: string, 2: string} */
    private static function subscription(mixed $sub): array
    {
        $endpoint = is_array($sub) ? (string) ($sub['endpoint'] ?? '') : '';
        $p256dh = is_array($sub) ? (string) ($sub['keys']['p256dh'] ?? '') : '';
        $auth = is_array($sub) ? (string) ($sub['keys']['auth'] ?? '') : '';
        if (!WebPush::allowedEndpoint($endpoint) || strlen(WebPush::unb64($p256dh)) !== 65 || strlen(WebPush::unb64($auth)) !== 16) {
            throw new ApiException('Ta przeglądarka zwróciła nieobsługiwaną subskrypcję powiadomień.', 422);
        }

        return [$endpoint, $p256dh, $auth];
    }
}
