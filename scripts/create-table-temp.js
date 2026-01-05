const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://enafjwrvcmxzoxpkrocy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuYWZqd3J2Y214em94cGtyb2N5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTEyMTAyMiwiZXhwIjoyMDc2Njk3MDIyfQ.rZzNWTG8EgalOa4ivgaTF27tSly_XD9Kx3yq_cfsPCI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  console.log('Création de la table invoice_counter...');
  
  const { data, error } = await supabase
    .from('invoice_counter')
    .select('*')
    .limit(1);
  
  if (error && error.code === 'PGRST116') {
    console.log('Table inexistante, création...');
    console.log('Note: Impossible de créer via le client JS, il faut utiliser le SQL editor');
  } else if (error) {
    console.log('Erreur:', error);
  } else {
    console.log('Table existe déjà:', data);
  }
}

createTable().then(() => process.exit(0)).catch(console.error);
