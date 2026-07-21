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
  console.log('Connected to transaction_db (port 5433)');

  await client.query(`
    CREATE TABLE IF NOT EXISTS rag_knowledge_base (
      id VARCHAR(50) PRIMARY KEY,
      category VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      keywords TEXT NOT NULL,
      source_document VARCHAR(100) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Table rag_knowledge_base verified/created.');

  const seedData = [
    {
      id: 'RAG-CASHBACK-01',
      category: 'CASHBACK',
      title: 'Percentage Cashback Formula & Calculation',
      content: 'PayVora calculates percentage cashback dynamically using the formula: Cashback = Transaction Amount * (Offer Percentage / 100.0). For instance, a $52.00 Groceries payment with a 10% offer yields exactly $5.20 credited instantly to the user Cashback Wallet. Fixed cashback is secondary to percentage cashback to ensure mathematically accurate rewards.',
      keywords: 'cashback percentage formula reward credit grocery purchase calculate percentage fixed rebate wallet',
      source_document: 'PayVora Cashback Rules v2.4'
    },
    {
      id: 'RAG-CASHBACK-02',
      category: 'RENT_REBATE',
      title: 'Housing & Rent Rebate Processing',
      content: 'Rent and housing utility payments automatically qualify for monthly rent rebates (e.g. 5% rebate up to max monthly cap). Rent rebate transactions credit directly to the user main wallet balance and show under transaction statements.',
      keywords: 'rent rebate housing monthly cash reward statement credit payment tenant landlord',
      source_document: 'PayVora Housing Policy v1.8'
    },
    {
      id: 'RAG-RESERVED-01',
      category: 'LEDGER',
      title: 'Reserved Rewards & Double-Entry Audit Ledger',
      content: 'Reserved Rewards in the Admin Dashboard tracks total unredeemed cashback balances held across all user cashback wallets. When users redeem rewards to their main balance or when administrative double-entry reconciliation entries (REDEEMED ledger entries) are posted, Reserved Rewards updates dynamically to reflect net unredeemed liability.',
      keywords: 'reserved rewards unredeemed balance ledger double-entry audit total cash pool balance admin dashboard zero',
      source_document: 'PayVora Ledger Compliance Architecture v3.0'
    },
    {
      id: 'RAG-YIELD-01',
      category: 'YIELD_VAULT',
      title: 'Yield Vault 4.5% APY Daily Accrual',
      content: 'Funds deposited in the PayVora Yield Vault earn a guaranteed 4.5% APY yield, compounded and distributed daily. Yield Vault assets are backed 70% by US Treasury Bills, 15% Corporate AAA Bonds, and 10% Money Market Funds, providing liquid institutional safety.',
      keywords: 'yield vault 4.5% APY interest daily accrual treasury bills bonds investment savings return',
      source_document: 'PayVora Treasury & Vault Guide v2.1'
    },
    {
      id: 'RAG-SECURITY-01',
      category: 'SECURITY',
      title: '4-Digit Transaction PIN & Security Settings',
      content: 'Every outgoing transfer, withdrawal, or sensitive administrative action requires verification via a 4-digit Transaction PIN. Users can update or reset their PIN anytime in Settings -> Security & PIN.',
      keywords: 'PIN transaction pin security code reset change 4-digit mfa verification password',
      source_document: 'PayVora Security Standards v1.2'
    },
    {
      id: 'RAG-RECHARGE-01',
      category: 'RECHARGES',
      title: 'Mobile Recharges & Utility Payments',
      content: 'Users can pay mobile prepaid recharges, electricity, gas, and water bills with zero service fees. Recharges process instantly and qualify for active cashback campaign rewards.',
      keywords: 'recharge mobile utility electricity bill payment cashback offer zero fee instant prepaid',
      source_document: 'PayVora Utilities Service Guide v1.0'
    }
  ];

  for (const item of seedData) {
    await client.query(`
      INSERT INTO rag_knowledge_base (id, category, title, content, keywords, source_document, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (id) DO UPDATE SET
        category = EXCLUDED.category,
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        keywords = EXCLUDED.keywords,
        source_document = EXCLUDED.source_document,
        updated_at = NOW();
    `, [item.id, item.category, item.title, item.content, item.keywords, item.source_document]);
  }

  console.log('Successfully seeded 6 knowledge documents into rag_knowledge_base table!');

  const countRes = await client.query('SELECT COUNT(*) FROM rag_knowledge_base;');
  console.log('Total RAG Knowledge Documents:', countRes.rows[0].count);

  await client.end();
}

run().catch(console.error);
