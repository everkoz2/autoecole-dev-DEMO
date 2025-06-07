import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    console.log('Checking for passed hours at:', now.toISOString());

    // Récupérer toutes les heures réservées non marquées comme passées
    const { data: heures, error: fetchError } = await supabase
      .from('heures')
      .select('*')
      .eq('heure_passee', false)
      .eq('reserve', true);

    if (fetchError) throw fetchError;

    console.log(`Found ${heures?.length || 0} reserved hours to check`);

    // Filtrer les heures qui sont effectivement passées (utiliser heure_debut au lieu de heure_fin)
    const heuresPassees = heures?.filter(heure => {
      const dateHeureDebut = new Date(`${heure.date}T${heure.heure_debut}`);
      const isPassed = dateHeureDebut < now;
      
      if (isPassed) {
        console.log(`Hour ${heure.id} is passed: ${dateHeureDebut.toISOString()} < ${now.toISOString()}`);
      }
      
      return isPassed;
    }) ?? [];

    console.log(`Found ${heuresPassees.length} hours that should be marked as passed`);

    // Mettre à jour les heures passées
    if (heuresPassees.length > 0) {
      const { error: updateError } = await supabase
        .from('heures')
        .update({ heure_passee: true })
        .in('id', heuresPassees.map(h => h.id));

      if (updateError) throw updateError;
      
      console.log(`Successfully updated ${heuresPassees.length} hours as passed`);
    }

    return new Response(
      JSON.stringify({ 
        message: 'Successfully updated passed hours',
        updated: heuresPassees.length,
        checked: heures?.length || 0,
        timestamp: now.toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error updating passed hours:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});