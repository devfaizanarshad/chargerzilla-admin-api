// Database Analysis Script for Chargerzilla
const { Client } = require('pg');

const client = new Client({
  host: 'chargerzillaprod-july3-2025-bk-11232025.cfwo2waymhex.us-east-1.rds.amazonaws.com',
  database: 'chargerzilla-prod2',
  user: 'chargerzilladb24',
  password: 'Px7$yLq9#bTfRwC',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

async function analyzeDatabase() {
  try {
    await client.connect();
    console.log('Connected to database successfully!\n');

    // 1. Get all tables
    console.log('='.repeat(80));
    console.log('1. ALL TABLES IN DATABASE');
    console.log('='.repeat(80));
    const tablesQuery = `
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    const tablesResult = await client.query(tablesQuery);
    console.log(`Found ${tablesResult.rows.length} tables:\n`);
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name} (${row.table_type})`);
    });

    // 2. Get detailed schema for each table
    console.log('\n' + '='.repeat(80));
    console.log('2. DETAILED TABLE SCHEMAS');
    console.log('='.repeat(80));
    
    for (const table of tablesResult.rows) {
      if (table.table_type === 'BASE TABLE') {
        console.log(`\n--- ${table.table_name} ---`);
        const columnsQuery = `
          SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position;
        `;
        const columnsResult = await client.query(columnsQuery, [table.table_name]);
        columnsResult.rows.forEach(col => {
          let typeStr = col.data_type;
          if (col.character_maximum_length) {
            typeStr += `(${col.character_maximum_length})`;
          }
          console.log(`  ${col.column_name}: ${typeStr} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
        });
      }
    }

    // 3. Get all foreign key relationships
    console.log('\n' + '='.repeat(80));
    console.log('3. FOREIGN KEY RELATIONSHIPS');
    console.log('='.repeat(80));
    const fkQuery = `
      SELECT
        tc.table_name AS source_table,
        kcu.column_name AS source_column,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name;
    `;
    const fkResult = await client.query(fkQuery);
    console.log(`\nFound ${fkResult.rows.length} foreign key relationships:\n`);
    fkResult.rows.forEach(fk => {
      console.log(`  ${fk.source_table}.${fk.source_column} -> ${fk.target_table}.${fk.target_column}`);
    });

    // 4. Get primary keys
    console.log('\n' + '='.repeat(80));
    console.log('4. PRIMARY KEYS');
    console.log('='.repeat(80));
    const pkQuery = `
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name;
    `;
    const pkResult = await client.query(pkQuery);
    pkResult.rows.forEach(pk => {
      console.log(`  ${pk.table_name}: ${pk.column_name}`);
    });

    // 5. Get indexes
    console.log('\n' + '='.repeat(80));
    console.log('5. INDEXES');
    console.log('='.repeat(80));
    const indexQuery = `
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;
    const indexResult = await client.query(indexQuery);
    indexResult.rows.forEach(idx => {
      console.log(`  ${idx.tablename}: ${idx.indexname}`);
    });

    // 6. Row counts for each table
    console.log('\n' + '='.repeat(80));
    console.log('6. ROW COUNTS');
    console.log('='.repeat(80));
    for (const table of tablesResult.rows) {
      if (table.table_type === 'BASE TABLE') {
        const countResult = await client.query(`SELECT COUNT(*) FROM "${table.table_name}"`);
        console.log(`  ${table.table_name}: ${countResult.rows[0].count} rows`);
      }
    }

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await client.end();
  }
}

analyzeDatabase();
