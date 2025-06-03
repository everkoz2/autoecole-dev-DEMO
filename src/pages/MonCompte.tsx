import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';
import bcrypt from 'bcryptjs';
import Navigation from '../components/Navigation'; // AJOUT

interface UserInfo {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string;
  role: string;
  heures_restantes: number;
  heures_effectuees: number;
  forfait_id: number | null;
}

interface Forfait {
  id: number;
  nom: string;
  description: string;
}

interface HeuresStats {
  heures_passees: number;
  heures_a_venir: number;
  heures_en_attente?: number;
}

const MonCompte = () => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { data: userInfo, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user-info', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      return data as UserInfo;
    },
  });

  const { data: forfait, isLoading: isLoadingForfait } = useQuery({
    queryKey: ['forfait', userInfo?.forfait_id],
    queryFn: async () => {
      if (!userInfo?.forfait_id) return null;
      const { data, error } = await supabase
        .from('forfaits')
        .select('*')
        .eq('id', userInfo.forfait_id)
        .single();

      if (error) throw error;
      return data as Forfait;
    },
    enabled: !!userInfo?.forfait_id,
  });

  const { data: heuresStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['heures-stats', user?.id],
    queryFn: async () => {
      const now = new Date();
      const { data: stats, error } = await supabase
        .from('heures')
        .select('*')
        .or(`eleve_id.eq.${user?.id},moniteur_id.eq.${user?.id}`);

      if (error) throw error;

      const heuresPassees = stats.filter(h => h.heure_passee).length;

      const heuresAVenir = stats.filter(h => {
        if (h.heure_passee || !h.reserve) return false;
        const dateHeure = h.heure_debut
          ? new Date(`${h.date} ${h.heure_debut}`)
          : new Date(h.date);
        return dateHeure > now;
      }).length;

      const heuresEnAttente = userRole === 'moniteur' ? stats.filter(h => 
        !h.reserve && new Date(h.date) > now
      ).length : undefined;

      return {
        heures_passees: heuresPassees,
        heures_a_venir: heuresAVenir,
        heures_en_attente: heuresEnAttente,
      } as HeuresStats;
    },
  });

  const updatePassword = useMutation({
    mutationFn: async ({ currentPwd, newPwd }: { currentPwd: string; newPwd: string }) => {
      // Vérifier le mot de passe actuel
      const { data: user } = await supabase
        .from('utilisateurs')
        .select('mot_de_passe')
        .eq('id', userInfo?.id)
        .single();

      const isValid = await bcrypt.compare(currentPwd, user.mot_de_passe);
      if (!isValid) {
        throw new Error('Mot de passe actuel incorrect');
      }

      // Mettre à jour le mot de passe
      const hashedPassword = await bcrypt.hash(newPwd, 10);
      const { error: updateError } = await supabase
        .from('utilisateurs')
        .update({ mot_de_passe: hashedPassword })
        .eq('id', userInfo?.id);

      if (updateError) throw updateError;

      // Mettre à jour le mot de passe dans Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: newPwd
      });

      if (authError) throw authError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-info'] });
      toast.success('Mot de passe modifié avec succès');
      setIsModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    updatePassword.mutate({ currentPwd: currentPassword, newPwd: newPassword });
  };

  if (isLoadingUser || isLoadingStats || isLoadingForfait) {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mon compte</h1>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">
              Informations personnelles
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Vos informations de profil
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Nom complet</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {userInfo?.prenom} {userInfo?.nom}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{userInfo?.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
                <dd className="mt-1 text-sm text-gray-900">{userInfo?.telephone || 'Non renseigné'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Rôle</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {userInfo?.role === 'eleve' ? 'Élève' : 
                  userInfo?.role === 'moniteur' ? 'Moniteur' : 'Administrateur'}
                </dd>
              </div>
              {userRole === 'eleve' && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Forfait actuel</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {forfait ? (
                        <>
                          <div>{forfait.nom}</div>
                          <div className="text-gray-500">{forfait.description}</div>
                        </>
                      ) : (
                        'Aucun forfait'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Heures de conduite</dt>
                    <dd className="mt-1 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Heures restantes:</span>
                        <span className="font-medium">{userInfo?.heures_restantes}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Heures effectuées:</span>
                        <span className="font-medium">{heuresStats?.heures_passees}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Heures à venir:</span>
                        <span className="font-medium">{heuresStats?.heures_a_venir}</span>
                      </div>
                    </dd>
                  </div>
                </>
              )}
              {userRole === 'moniteur' && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Statistiques des heures</dt>
                  <dd className="mt-1 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Heures effectuées:</span>
                      <span className="font-medium">{heuresStats?.heures_passees}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Heures à venir:</span>
                      <span className="font-medium">{heuresStats?.heures_a_venir}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Heures en attente:</span>
                      <span className="font-medium">{heuresStats?.heures_en_attente}</span>
                    </div>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Modifier le mot de passe
          </button>
        </div>

        <Dialog
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          className="fixed z-10 inset-0 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen">
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

            <div className="relative bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
                Modifier le mot de passe
              </Dialog.Title>

              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mot de passe actuel
                  </label>
                  <input
                    type="password"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                  >
                    Modifier
                  </button>
                </div>
              </form>

              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Fermer</span>
                ×
              </button>
            </div>
          </div>
        </Dialog>
      </div>
    </>
  );
};

export default MonCompte;