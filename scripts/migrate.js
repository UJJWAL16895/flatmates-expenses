const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Simple parser for .env.local since we don't have dotenv loaded directly in scripts
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local file not found! Please create it based on .env.example or PRD.');
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      // Remove surrounding quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  });
  return env;
}

async function runMigrations() {
  const env = loadEnv();
  const connectionString = env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL is not set in .env.local!');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  const sqlFiles = [
    '001_create_tables.sql',
    '002_create_indexes.sql',
    '003_seed_members.sql'
  ];

  try {
    for (const file of sqlFiles) {
      const filePath = path.join(__dirname, '..', 'sql', file);
      console.log(`Running migration: ${file}...`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Migration file not found: ${filePath}`);
      }

      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Execute the SQL statements
      await pool.query(sql);
      console.log(`Migration ${file} completed successfully.`);
    }

    console.log('\nAll migrations completed successfully!');
  } catch (err) {
    console.error('\nMigration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
