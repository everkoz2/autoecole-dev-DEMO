import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { products } from '../stripe-config';
import toast from 'react-hot-toast';
import { supabase } from '../supabase/client';

export function useStripe() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const createCheckoutSession = async (priceId: string, mode: 'payment' | 'subscription') => {
    if (!user) {
      toast.error('Vous devez être connecté pour effectuer un achat');
      throw new Error('User must be logged in');
    }

    setIsLoading(true);

    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          price_id: priceId,
          success_url: `${window.location.origin}/success`,
          cancel_url: `${window.location.origin}/forfaits`,
          mode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (!data.url) {
        throw new Error('No checkout URL received');
      }

      window.location.href = data.url;
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast.error(error.message || 'Une erreur est survenue lors de la création de la session de paiement');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkout = async (productId: keyof typeof products) => {
    const product = products[productId];
    if (!product) {
      toast.error('Produit invalide');
      throw new Error('Invalid product ID');
    }

    await createCheckoutSession(product.priceId, product.mode);
  };

  return {
    checkout,
    isLoading,
  };
}
