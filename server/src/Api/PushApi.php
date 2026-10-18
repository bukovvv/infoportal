<?php

declare(strict_types=1);

namespace KwInfo\Api;

use KwInfo\Gtfs\Timetable;
use KwInfo\Http\ApiException;
use KwInfo\Http\RateLimit;
use KwInfo\Http\Response;
use KwInfo\Http\Router;
use KwInfo\Live\Realtime;
use KwInfo\Push\JourneyWatcher;
use KwInfo\Push\PushRepository;
use KwInfo\Push\RouteRepository;
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
        RateLimit::hit('push');
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
        RateLimit::hit('push');
        $body = Router::body();
        $endpoint = (string) ($body['endpoint'] ?? '');
        if (!WebPush::allowedEndpoint($endpoint)) {
            throw new ApiException('Nieprawidłowa subskrypcja.', 422);
        }
        $id = isset($body['journeyId']) ? PushRepository::journeyId((string) $body['journeyId']) : null;
        (new PushRepository())->delete($endpoint, $id);

        return new Response(['watching' => false]);
    }

    /**
     * Powiadomienia o trasie A–B: okienka czasu (kierunek ab/ba, dni 1–7 = pn–nd, godziny GG:MM) i opcje wyszukiwania.
     * Przeglądarka wysyła wpis ponownie przy otwarciu strony (odnawia go przed usunięciem po RouteRepository::STALE).
     */
    public function watchRoute(): Response
    {
        RateLimit::hit('push');
        $body = Router::body();
        [$endpoint, $p256dh, $auth] = self::subscription($body['subscription'] ?? null);
        $id = (string) ($body['routeId'] ?? '');
        $tt = new Timetable();
        $from = $tt->station((string) ($body['from'] ?? ''));
        $to = $tt->station((string) ($body['to'] ?? ''));
        $windows = $body['windows'] ?? null;
        if ($id === '' || strlen($id) > 200 || $from === null || $to === null || $from['id'] === $to['id'] || !is_array($windows) || $windows === [] || count($windows) > 4) {
            throw new ApiException('Nieprawidłowe dane trasy.', 422);
        }
        $clean = [];
        foreach ($windows as $w) {
            $days = is_array($w['days'] ?? null) ? array_values(array_unique(array_map('intval', $w['days']))) : [];
            sort($days);
            $start = self::clock((string) ($w['start'] ?? ''));
            $end = self::clock((string) ($w['end'] ?? ''));
            if (!in_array($w['dir'] ?? '', ['ab', 'ba'], true) || $days === [] || min($days) < 1 || max($days) > 7 || $start === null || $end === null) {
                throw new ApiException('Nieprawidłowe dane trasy.', 422);
            }
            if ($end <= $start || $end - $start > 6 * 3600) {
                throw new ApiException('Okienko powiadomień musi kończyć się później niż zaczyna i trwać najwyżej 6 godzin.', 422);
            }
            $clean[] = ['dir' => $w['dir'], 'days' => $days, 'start' => $start, 'end' => $end];
        }
        $options = is_array($body['options'] ?? null) ? $body['options'] : [];
        $agencies = array_values(array_filter((array) ($options['agencies'] ?? []), static fn ($a): bool => is_string($a) && preg_match('/^[A-Z]{2,4}$/', $a) === 1));
        $options = [
            'transfers' => max(0, min(2, (int) ($options['transfers'] ?? 2))),
            'minTransfer' => max(2, min(30, (int) ($options['minTransfer'] ?? 3))),
            'agencies' => array_slice($agencies, 0, 5),
        ];
        (new RouteRepository())->save($endpoint, $p256dh, $auth, PushRepository::journeyId($id), $from['id'], $to['id'], $options, $clean, time());

        return new Response(['watching' => true]);
    }

    public function unwatchRoute(): Response
    {
        RateLimit::hit('push');
        $body = Router::body();
        $endpoint = (string) ($body['endpoint'] ?? '');
        if (!WebPush::allowedEndpoint($endpoint) || !isset($body['routeId'])) {
            throw new ApiException('Nieprawidłowa subskrypcja.', 422);
        }
        (new RouteRepository())->delete($endpoint, PushRepository::journeyId((string) $body['routeId']));

        return new Response(['watching' => false]);
    }

    /** 'GG:MM' → sekundy od północy. */
    private static function clock(string $value): ?int
    {
        if (preg_match('/^([01]\d|2[0-3]):([0-5]\d)$/', $value, $m) !== 1) {
            return null;
        }

        return (int) $m[1] * 3600 + (int) $m[2] * 60;
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
