CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE routes (
    route_id TEXT PRIMARY KEY,
    short_name TEXT,
    long_name TEXT,
    type INTEGER,
    color TEXT,
    text_color TEXT
);
CREATE TABLE trips (
    trip_id TEXT PRIMARY KEY,
    route_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    shape_id TEXT,
    short_name TEXT,
    headsign TEXT,
    category TEXT,
    name TEXT,
    block_id TEXT,
    is_bus INTEGER NOT NULL DEFAULT 0,
    agency TEXT NOT NULL DEFAULT 'KW'
);
CREATE TABLE trip_numbers (number TEXT NOT NULL, trip_id TEXT NOT NULL, PRIMARY KEY (number, trip_id));
CREATE TABLE stop_times (
    trip_id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    station_id TEXT NOT NULL,
    stop_id TEXT NOT NULL,
    arr INTEGER,
    dep INTEGER,
    dist REAL,
    platform TEXT,
    track TEXT,
    pickup INTEGER NOT NULL DEFAULT 0,
    dropoff INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (trip_id, seq)
);
CREATE TABLE stations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lat REAL,
    lon REAL,
    daily INTEGER NOT NULL DEFAULT 0,
    lines TEXT,
    kw INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE service_dates (service_id TEXT NOT NULL, date INTEGER NOT NULL, PRIMARY KEY (service_id, date));
CREATE TABLE shapes (shape_id TEXT PRIMARY KEY, points TEXT NOT NULL);
