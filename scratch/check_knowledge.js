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

  const res = await client.query('SELECT id, category, title, source_document, substring(content, 1, 100) as content_preview FROM rag_knowledge_base;');
  console.log('Knowledge Base Entries:');
  console.log(res.rows);

  await client.end();
}

run().catch(console.error);
