-- Time-ordered UUIDv7 for rows created inside SQL (set-based fan-outs).
-- Keeps every primary key in the system sortable by creation time, like the app-generated ones.
CREATE OR REPLACE FUNCTION uuid_generate_v7() RETURNS uuid AS $$
DECLARE
  ts_ms bytea := substring(int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3);
  bytes bytea := ts_ms || substring(uuid_send(gen_random_uuid()) FROM 7);
BEGIN
  bytes := set_byte(bytes, 6, (b'0111' || get_byte(bytes, 6)::bit(4))::bit(8)::int);
  bytes := set_byte(bytes, 8, (b'10' || get_byte(bytes, 8)::bit(6))::bit(8)::int);
  RETURN encode(bytes, 'hex')::uuid;
END
$$ LANGUAGE plpgsql VOLATILE;
