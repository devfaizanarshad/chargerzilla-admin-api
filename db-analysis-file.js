// Database Analysis Script for Chargerzilla - File Output
const { Client } = require('pg');
const fs = require('fs');

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

let output = '';

function log(text) {
    output += text + '\n';
}

async function analyzeDatabase() {
    try {
        await client.connect();
        log('Connected to database successfully!\n');

        // 1. Get all tables
        log('='.repeat(80));
        log('1. ALL TABLES IN DATABASE');
        log('='.repeat(80));
        const tablesQuery = `
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
        const tablesResult = await client.query(tablesQuery);
        log(`Found ${tablesResult.rows.length} tables:\n`);
        tablesResult.rows.forEach(row => {
            log(`  - ${row.table_name} (${row.table_type})`);
        });

        // 2. Get detailed schema for each table
        log('\n' + '='.repeat(80));
        log('2. DETAILED TABLE SCHEMAS');
        log('='.repeat(80));

        for (const table of tablesResult.rows) {
            if (table.table_type === 'BASE TABLE') {
                log(`\n--- ${table.table_name} ---`);
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
                    log(`  ${col.column_name}: ${typeStr} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
                });
            }
        }

        // 3. Get all foreign key relationships
        log('\n' + '='.repeat(80));
        log('3. FOREIGN KEY RELATIONSHIPS');
        log('='.repeat(80));
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
        log(`\nFound ${fkResult.rows.length} foreign key relationships:\n`);
        fkResult.rows.forEach(fk => {
            log(`  ${fk.source_table}.${fk.source_column} -> ${fk.target_table}.${fk.target_column}`);
        });

        // 4. Get primary keys
        log('\n' + '='.repeat(80));
        log('4. PRIMARY KEYS');
        log('='.repeat(80));
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
            log(`  ${pk.table_name}: ${pk.column_name}`);
        });

        // 5. Row counts for each table
        log('\n' + '='.repeat(80));
        log('5. ROW COUNTS');
        log('='.repeat(80));
        for (const table of tablesResult.rows) {
            if (table.table_type === 'BASE TABLE') {
                const countResult = await client.query(`SELECT COUNT(*) FROM "${table.table_name}"`);
                log(`  ${table.table_name}: ${countResult.rows[0].count} rows`);
            }
        }

        // 6. Sample data from key tables
        log('\n' + '='.repeat(80));
        log('6. SAMPLE DATA FROM KEY TABLES');
        log('='.repeat(80));

        // Sample charging_stations
        log('\n--- Sample charging_stations (5 rows) ---');
        const chargingResult = await client.query('SELECT * FROM charging_stations LIMIT 5');
        if (chargingResult.rows.length > 0) {
            log('Columns: ' + Object.keys(chargingResult.rows[0]).join(', '));
        }

        // Sample users (master_user)
        log('\n--- Sample master_user (all rows) ---');
        const usersResult = await client.query('SELECT * FROM master_user');
        usersResult.rows.forEach(row => {
            log(JSON.stringify(row));
        });

        // Sample Booking
        log('\n--- Sample Booking (5 rows) ---');
        const bookingResult = await client.query('SELECT * FROM "Booking" LIMIT 5');
        if (bookingResult.rows.length > 0) {
            log('Columns: ' + Object.keys(bookingResult.rows[0]).join(', '));
            bookingResult.rows.forEach(row => {
                log(JSON.stringify(row));
            });
        }

        // Sample ChargerListing
        log('\n--- Sample ChargerListing (5 rows) ---');
        const listingResult = await client.query('SELECT * FROM "ChargerListing" LIMIT 5');
        if (listingResult.rows.length > 0) {
            log('Columns: ' + Object.keys(listingResult.rows[0]).join(', '));
            listingResult.rows.forEach(row => {
                log(JSON.stringify(row));
            });
        }

        // Sample ChargerMedia
        log('\n--- Sample ChargerMedia (5 rows) ---');
        const mediaResult = await client.query('SELECT * FROM "ChargerMedia" LIMIT 5');
        if (mediaResult.rows.length > 0) {
            log('Columns: ' + Object.keys(mediaResult.rows[0]).join(', '));
            mediaResult.rows.forEach(row => {
                log(JSON.stringify(row));
            });
        }

        // Write to file
        fs.writeFileSync('db-analysis-output.txt', output);
        console.log('Analysis complete! Output written to db-analysis-output.txt');

    } catch (error) {
        log('Database error: ' + error.message);
        fs.writeFileSync('db-analysis-output.txt', output);
        console.error('Error:', error);
    } finally {
        await client.end();
    }
}

analyzeDatabase();
