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

  const res = await client.query("SELECT id, title, content FROM rag_knowledge_base WHERE content ILIKE '%deposit%';");
  for (const row of res.rows) {
    console.log(`--- ${row.title} (${row.id}) ---`);
    console.log(row.content);
  }

  await client.end();
}

run().catch(console.error);
