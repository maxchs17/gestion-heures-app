// Script pour créer la table invoice_counter dans Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nlbwixesclswvjpjsqyp.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createInvoiceCounterTable() {
  console.log('Création de la table invoice_counter...');

  // Exécuter le SQL pour créer la table
  const { data, error } = await supabase.rpc('exec_raw_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS invoice_counter (
        id INTEGER PRIMARY KEY DEFAULT 1,
        current_number INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      INSERT INTO invoice_counter (id, current_number)
      VALUES (1, 0)
      ON CONFLICT (id) DO NOTHING;
    `
  });

  if (error) {
    console.error('Erreur:', error);
    console.log('\n⚠️  Le script a échoué. Exécutez ce SQL manuellement dans Supabase:\n');
    console.log(`
-- Créer la table pour le compteur de factures
CREATE TABLE IF NOT EXISTS invoice_counter (
  id INTEGER PRIMARY KEY DEFAULT 1,
  current_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer la valeur initiale
INSERT INTO invoice_counter (id, current_number)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;
    `);
    process.exit(1);
  }

  console.log('✓ Table invoice_counter créée avec succès!');
  process.exit(0);
}

createInvoiceCounterTable();
