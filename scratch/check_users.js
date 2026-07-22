const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5431,
  user: 'account_user',
  password: 'account_password',
  database: 'account_db',
});

async function run() {
  await client.connect();
  console.log('Connected to account_db');

  const res = await client.query('SELECT id, username, email, kyc_status, mfa_enabled FROM accounts;');
  console.log('Accounts in Database:');
  console.log(res.rows);

  await client.end();
}

run().catch(console.error);
