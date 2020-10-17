create table pending_txs
(
    hash varchar(66),
    nonce bigint,
    transaction_index bigint,
    from_address varchar(42),
    to_address varchar(42),
    value numeric(38),
    gas bigint,
    gas_price bigint,
    input text,
    r varchar(66),
    s varchar(66),
    v varchar(66),
    arrival_timestamp timestamp
);

alter table pending_txs add constraint transactions_pk primary key (hash);

create index pending_txs_arrival_timestamp_index on pending_txs (arrival_timestamp desc);

create index pending_txs_from_address_arrival_timestamp_index on pending_txs (from_address, arrival_timestamp desc);
create index pending_txs_to_address_arrival_timestamp_index on pending_txs (to_address, arrival_timestamp desc);