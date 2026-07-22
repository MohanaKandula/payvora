const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5433,
  user: 'transaction_user',
  password: 'transaction_password',
  database: 'transaction_db',
});

async function run() {
  await client.connect();
  console.log('Connected to transaction_db');

  const res = await client.query('SELECT * FROM cashback_offers;');
  console.log('Cashback Offers:');
  console.log(res.rows);

  await client.end();
}

run().catch(console.error);
