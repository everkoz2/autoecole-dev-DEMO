import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16'
});
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
async function handleEvent(stripeEvent) {
  const stripeData = stripeEvent.data.object;
  const customerId = stripeData.customer;
  const payment_intent = stripeData.payment_intent;
  const amount_total = stripeData.amount_total;
  const currency = stripeData.currency;
  console.log('Processing payment for customer:', customerId);
  console.log('Payment amount:', amount_total);
  // Récupérer l'ID de l'utilisateur à partir du customer_id
  const { data: customerData, error: customerError } = await supabase.from('stripe_customers').select('user_id').eq('customer_id', customerId).single();
  if (customerError) {
    console.error('Error fetching customer:', customerError);
    return;
  }
  console.log('Found user ID:', customerData.user_id);
  // Récupérer le prix du forfait test
  const { data: forfaitTest, error: forfaitError } = await supabase.from('forfaits').select('id, prix').eq('id', 3).single();
  if (forfaitError) {
    console.error('Error fetching forfait test:', forfaitError);
    return;
  }
  // Déterminer le forfait en fonction du prix
  let forfaitId;
  const amountInEuros = amount_total / 100; // Convert from cents to euros
  if (amountInEuros === 225) {
    forfaitId = 1;
  } else if (amountInEuros === 800) {
    forfaitId = 2;
  } else if (amountInEuros === forfaitTest.prix) {
    forfaitId = 3;
  }
  console.log('Determined forfait ID:', forfaitId);
  if (!forfaitId) {
    console.error('Could not determine forfait ID for amount:', amountInEuros);
    return;
  }
  // Récupérer le nombre d'heures du forfait
  const { data: forfaitData, error: forfaitError2 } = await supabase.from('forfaits').select('heures').eq('id', forfaitId).single();
  if (forfaitError2) {
    console.error('Error fetching forfait:', forfaitError2);
    return;
  }
  console.log('Forfait hours:', forfaitData.heures);

  // Récupérer les heures restantes actuelles de l'utilisateur
  const { data: userData, error: userError } = await supabase
    .from('utilisateurs')
    .select('heures_restantes')
    .eq('id', customerData.user_id)
    .single();

  if (userError) {
    console.error('Error fetching user hours:', userError);
    return;
  }

  const heuresActuelles = userData.heures_restantes || 0;
  const nouvellesHeures = heuresActuelles + forfaitData.heures;

  // Mettre à jour le forfait et les heures de l'utilisateur
  const { error: updateError } = await supabase
    .from('utilisateurs')
    .update({
      forfait_id: forfaitId,
      heures_restantes: nouvellesHeures // Addition des heures au lieu du remplacement
    })
    .eq('id', customerData.user_id);

  if (updateError) {
    console.error('Error updating user:', updateError);
    return;
  }
  console.log('Updated user forfait and hours. New total:', nouvellesHeures);

  // Récupérer l'URL du reçu Stripe
  let recu_url = null;
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);
    console.log('PaymentIntent:', paymentIntent);
    const latestChargeId = paymentIntent.latest_charge;
    console.log('Latest charge ID:', latestChargeId);
    if (latestChargeId) {
      const charge = await stripe.charges.retrieve(latestChargeId);
      console.log('Charge:', charge);
      recu_url = charge.receipt_url;
      console.log('Receipt URL:', recu_url);
    }
  } catch (err) {
    console.error('Error fetching receipt_url:', err);
  }
  // Créer un enregistrement de paiement
  const { data: paiementData, error: paiementError } = await supabase.from('paiements').insert({
    utilisateur_id: customerData.user_id,
    forfait_id: forfaitId,
    montant: amountInEuros,
    methode: 'stripe',
    statut: 'payé',
    stripe_payment_id: payment_intent,
    devise: currency.toUpperCase(),
    recu_url
  }).select();
  if (paiementError) {
    console.error('Error creating payment record:', paiementError);
    return;
  }
  console.log('Created payment record:', paiementData);
  // Mettre à jour le statut de la commande
  const { error: orderError } = await supabase.from('stripe_orders').update({
    status: 'completed',
    payment_status: stripeData.payment_status
  }).eq('payment_intent_id', payment_intent);
  if (orderError) {
    console.error('Error updating order:', orderError);
    return;
  }
  console.log('Updated order status');
}
Deno.serve(async (req)=>{
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: corsHeaders
      });
    }
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('No signature', {
        status: 400
      });
    }
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('Missing Stripe webhook secret');
    }
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    console.log('Received webhook event:', event.type);
    if (event.type === 'checkout.session.completed') {
      await handleEvent(event);
    }
    return new Response(JSON.stringify({
      ok: true
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});