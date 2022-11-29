-- Migration number: 0000 	 2022-11-28T19:14:57.078Z
CREATE TABLE IF NOT EXISTS archive (
  kind string not null,
  kind_id string not null,
  content string not null,
  unixtime integer not null,
  primary key (kind, kind_id)
);

CREATE INDEX archive_kind_unixtime ON archive (kind, unixtime);