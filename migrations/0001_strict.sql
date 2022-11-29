-- Migration number: 0001 	 2022-11-29T03:20:52.196Z

CREATE TABLE IF NOT EXISTS archive2 (
  kind text not null,
  kind_id text not null,
  content text not null,
  unixtime integer not null,
  archive_url text,
  primary key (kind, kind_id)
) STRICT;

CREATE INDEX archive2_kind_unixtime ON archive2 (kind, unixtime, kind_id);

INSERT INTO archive2(kind, kind_id, content, unixtime) SELECT kind, kind_id, content, unixtime FROM archive;

DROP INDEX archive_kind_unixtime;
DROP TABLE archive;

ALTER TABLE archive2 RENAME TO archive;