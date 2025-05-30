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

    // Récupérer toutes les heures réservées non marquées comme passées
    const { data: heures, error: fetchError } = await supabase
      .from('heures')
      .select('*')
      .eq('heure_passee', false)
      .eq('reserve', true);

    if (fetchError) throw fetchError;

    // Filtrer les heures qui sont effectivement passées
    const heuresPassees = heures?.filter(heure => {
      const dateHeureFin = new Date(`${heure.date}T${heure.heure_fin}`);
      return dateHeureFin < now;
    }) ?? [];

    // Mettre à jour les heures passées
    if (heuresPassees.length > 0) {
      const { error: updateError } = await supabase
        .from('heures')
        .update({ heure_passee: true })
        .in('id', heuresPassees.map(h => h.id));

      if (updateError) throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        message: 'Successfully updated passed hours',
        updated: heuresPassees.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});