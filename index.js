require("dotenv").config();
const Web3 = require('web3');
const db = require("./db");
const DB_BATCH_SIZE=Number.parseInt(process.env.db_insert_batch_size || 10);
const TX_BATCH_SIZE=Number.parseInt((process.env.tx_fetch_batch_size || 10));
const web3 = new Web3(process.env.provider);
console.info("subscribing to pending transactions ...");

let subscription = web3.eth.subscribe('pendingTransactions', (function () {
    console.info("subscribing to pending transactions: success");
    let batch = [];
    let pushToDBBatchForInsert = getBatchForDB(db, DB_BATCH_SIZE);
    return async function (error, transaction) {
        if (error) {
            return console.error("Error while subscribing", error);
        }
        batch.push(web3.eth.getTransaction.request(transaction, function (error, tx) {
            if (error) {
                return console.error("Error while fetch tx: ", transaction);
            }
            tx && pushToDBBatchForInsert(tx);
        }));
        if (batch.length >= TX_BATCH_SIZE) {
            handleBatch(...batch);
            batch = [];
        }
    }
})());
function handleBatch(...batch) {
    let batchRequest = new web3.eth.BatchRequest();
    batch.map(r => batchRequest.add(r));
    batchRequest.execute();
}
function getMappingDB2Tx(){
    let mapping = new Map();
    mapping.set("from_address", {name: "from", type: "string"});
    mapping.set("gas", "gas");
    mapping.set("gas_price", "gasPrice");
    mapping.set("hash", {name: "hash", type: "string"});
    mapping.set("nonce", "nonce");
    mapping.set("r", {name: "r", type: "string"});
    mapping.set("s", {name: "s", type: "string"});
    mapping.set("to_address", {name: "to", type: "string"});
    mapping.set("v", {name: "v", type: "string"});
    mapping.set("value", "value");
    mapping.set("arrival_timestamp", {name: "arrivalTimestamp", type: 'timestamp', value: 'Now()'});
    return mapping;
}
function getBatchForDB(db, batchSize = 10){
    let batch = [];
    return (tx) => {
        tx.arrivalTimestamp = (new Date()).getTime()/1000;
        batch.push(tx);
        if (batch.length < batchSize) {
            return;
        }
        persistTxs(batch, db);
        batch = [];
    };
}
function persistTxs(txs, db) {
    (async () => {
        const client = await db.connect()
        const columns = [...getMappingDB2Tx().keys()];
        try {
            const query = `INSERT INTO pending_txs(${columns.join(", ")}) VALUES ${convertTxs2DBList(txs)}`;
            console.info("Inserting to DB: ...");
            const res = await client.query(query);
            console.info(`Total Rows Inserted: ${res.rowCount}`);
        } finally {
            // Make sure to release the client before any error handling,
            // just in case the error handling itself throws an error.
            client.release()
        }
    })().catch(err => console.log(err.stack))
}
function convertTxs2DBList(txs){
    return txs.map((tx) => {
        const txKeys = [...getMappingDB2Tx().values()];
        return "("+txKeys.map(key => {
            if (key && key.name && key.type == "string") {
                return `'${tx[key.name]}'`;
            } else if (key && key.name && key.value) {
                return key.value;
            }
            return tx[key];
        }).join(", ")+")";
    }).join(", ");
}

// unsubscribes the subscription
subscription.unsubscribe(function (error, success) {
    if (success)
        console.log('Successfully unsubscribed!');
});
