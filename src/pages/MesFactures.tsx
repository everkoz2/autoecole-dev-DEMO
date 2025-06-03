import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';

interface Paiement {
  id: string;
  montant: number;
  methode: string;
  statut: string;
  created_at: string;
  recu_url: string | null;
  forfait: {
    nom: string;
    description: string;
  };
}

const methodePaiementLabels = {
  stripe: 'Carte bancaire',
  paypal: 'PayPal',
  especes: 'Espèces',
};

const statutPaiementLabels = {
  en_attente: 'En attente',
  paye: 'Payé',
  rembourse: 'Remboursé',
};

const statutPaiementColors = {
  en_attente: 'bg-yellow-100 text-yellow-800',
  paye: 'bg-green-100 text-green-800',
  rembourse: 'bg-red-100 text-red-800',
};

const MesFactures = () => {
  const { user } = useAuth();

  const { data: paiements, isLoading } = useQuery({
    queryKey: ['paiements', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paiements')
        .select(`
          *,
          forfait:forfaits(nom, description)
        `)
        .eq('utilisateur_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Paiement[];
    },
  });

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mes factures</h1>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">
              Historique des paiements
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Tous vos achats de forfaits et d'heures
            </p>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {paiements?.map((paiement) => (
                <li key={paiement.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {paiement.forfait.nom}
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">
                        {paiement.forfait.description}
                      </p>
                      <div className="mt-2 flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statutPaiementColors[paiement.statut]}`}>
                          {statutPaiementLabels[paiement.statut]}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                          via {methodePaiementLabels[paiement.methode]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Date : {new Date(paiement.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="ml-4 flex flex-col items-end">
                      <span className="text-lg font-medium text-gray-900">
                        {paiement.montant.toFixed(2)}€
                      </span>
                      {paiement.recu_url && (
                        <a
                          href={paiement.recu_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 text-primary-600 hover:text-primary-500 text-sm"
                        >
                          Voir le reçu
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
              {paiements?.length === 0 && (
                <li className="px-4 py-8 sm:px-6 text-center text-gray-500">
                  Aucune facture disponible
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default MesFactures;