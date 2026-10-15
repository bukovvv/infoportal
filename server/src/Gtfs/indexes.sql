CREATE INDEX idx_stop_times_station ON stop_times (station_id);
CREATE INDEX idx_stop_times_stop ON stop_times (stop_id);
CREATE INDEX idx_service_dates_date ON service_dates (date);
CREATE INDEX idx_trips_service ON trips (service_id);
CREATE INDEX idx_trips_block ON trips (block_id);
CREATE INDEX idx_trip_numbers_trip ON trip_numbers (trip_id);
CREATE INDEX idx_trips_agency ON trips (agency);
