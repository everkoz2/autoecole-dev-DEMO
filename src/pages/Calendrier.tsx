import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Dialog } from '@headlessui/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import Navigation from '../components/Navigation';

interface Heure {
  id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  eleve_id: string | null;
  moniteur_id: string;
  modele_vehicule: string;
  boite_vitesse: 'manuelle' | 'automatique';
  reserve: boolean;
  moniteur: {
    prenom: string;
    nom: string;
  };
  eleve?: {
    prenom: string;
    nom: string;
  };
}

interface HeureDetails {
  date: string;
  heure_debut: string;
  heure_fin: string;
  moniteur_id?: string;
  modele_vehicule: string;
  boite_vitesse: 'manuelle' | 'automatique';
}

const Calendrier = () => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHeure, setSelectedHeure] = useState<Heure | null>(null);
  const [newHeure, setNewHeure] = useState<HeureDetails>({
    date: '',
    heure_debut: '',
    heure_fin: '',
    modele_vehicule: '',
    boite_vitesse: 'manuelle',
  });

  useEffect(() => {
    const heuresSubscription = supabase
      .channel('heures-calendar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'heures'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['heures-calendrier'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(heuresSubscription);
    };
  }, [queryClient]);

  useEffect(() => {
    if (newHeure.heure_debut) {
      const heureDebut = parseInt(newHeure.heure_debut.split(':')[0]);
      const heureFin = (heureDebut + 1).toString().padStart(2, '0');
      setNewHeure(prev => ({
        ...prev,
        heure_fin: `${heureFin}:00`
      }));
    }
  }, [newHeure.heure_debut]);

  const { data: heures, isLoading } = useQuery({
    queryKey: ['heures-calendrier'],
    queryFn: async () => {
      let query = supabase
        .from('heures')
        .select(`
          *,
          moniteur:utilisateurs!heures_moniteur_id_fkey(prenom, nom),
          eleve:utilisateurs!heures_eleve_id_fkey(prenom, nom)
        `)
        .gte('date', new Date().toISOString().split('T')[0]);

      if (userRole === 'eleve') {
        query = query.or(`reserve.eq.false,eleve_id.eq.${user?.id}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Heure[];
    },
  });

  const { data: utilisateur } = useQuery({
    queryKey: ['utilisateur-heures', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('utilisateurs')
        .select('heures_restantes')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: userRole === 'eleve',
  });

  const decrementHeures = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('decrement_heures', { user_id: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utilisateur-heures'] });
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour des heures');
    }
  });

  const reserverHeure = useMutation({
    mutationFn: async (heureId: string) => {
      const { error: heureError, data: heureData } = await supabase
        .from('heures')
        .update({ 
          eleve_id: user?.id,
          reserve: true
        })
        .eq('id', heureId)
        .select();

      if (heureError) throw heureError;

      const { error: decError } = await supabase.rpc('decrement_heures', { user_id: user?.id });
      if (decError) throw decError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heures-calendrier'] });
      queryClient.invalidateQueries({ queryKey: ['utilisateur-heures'] });
      queryClient.invalidateQueries({ queryKey: ['heures'] });
      toast.success('Heure réservée avec succès');
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast.error('Erreur lors de la réservation');
    },
  });

  const ajouterHeure = useMutation({
    mutationFn: async (heure: HeureDetails) => {
      const { error } = await supabase
        .from('heures')
        .insert({
          ...heure,
          moniteur_id: user?.id,
          reserve: false,
          heure_passee: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heures-calendrier'] });
      toast.success('Créneau ajouté avec succès');
      setIsModalOpen(false);
    },
    onError: () => {
      toast.error('Erreur lors de l\'ajout du créneau');
    },
  });

  const handleEventClick = (info: any) => {
    const heure = heures?.find(h => h.id === info.event.id);
    if (heure) {
      setSelectedHeure(heure);
      setIsModalOpen(true);
    }
  };

  const handleReservation = () => {
    if (!selectedHeure) return;
    if (userRole === 'eleve') {
      if (!utilisateur?.heures_restantes || utilisateur.heures_restantes <= 0) {
        toast.error('Vous n\'avez plus d\'heures disponibles');
        return;
      }
      reserverHeure.mutate(selectedHeure.id);
    }
  };

  const handleAjoutCreneau = () => {
    if (userRole !== 'moniteur') return;
    const dateHeure = new Date(`${newHeure.date}T${newHeure.heure_debut}`);
    if (dateHeure <= new Date()) {
      toast.error('Vous ne pouvez pas créer un créneau dans le passé');
      return;
    }
    ajouterHeure.mutate(newHeure);
  };

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

  const events = heures?.map(heure => ({
    id: heure.id,
    title: heure.reserve 
      ? `${heure.eleve?.prenom} ${heure.eleve?.nom}`
      : `Disponible - ${heure.moniteur.prenom} ${heure.moniteur.nom}`,
    start: `${heure.date}T${heure.heure_debut}`,
    end: `${heure.date}T${heure.heure_fin}`,
    backgroundColor: heure.reserve ? '#0284c7' : '#22c55e',
  }));

  return (
    <>
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Calendrier</h1>
          {userRole === 'moniteur' && (
            <button
              onClick={() => {
                setSelectedHeure(null);
                setIsModalOpen(true);
              }}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
            >
              Ajouter un créneau
            </button>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            locale="fr"
            events={events}
            eventClick={handleEventClick}
            height="auto"
            allDaySlot={false}
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
          />
        </div>

        <Dialog
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          className="fixed z-10 inset-0 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen">
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

            <div className="relative bg-white rounded-lg p-8 max-w-md w-full mx-4">
              {selectedHeure ? (
                <>
                  <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
                    Détails de l'heure
                  </Dialog.Title>
                  <div className="space-y-4">
                    <p>
                      <span className="font-medium">Date :</span>{' '}
                      {format(new Date(selectedHeure.date), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                    <p>
                      <span className="font-medium">Horaire :</span>{' '}
                      {selectedHeure.heure_debut.slice(0, 5)} - {selectedHeure.heure_fin.slice(0, 5)}
                    </p>
                    <p>
                      <span className="font-medium">Moniteur :</span>{' '}
                      {selectedHeure.moniteur.prenom} {selectedHeure.moniteur.nom}
                    </p>
                    <p>
                      <span className="font-medium">Véhicule :</span>{' '}
                      {selectedHeure.modele_vehicule}
                    </p>
                    <p>
                      <span className="font-medium">Boîte de vitesses :</span>{' '}
                      {selectedHeure.boite_vitesse}
                    </p>
                    {userRole === 'eleve' && !selectedHeure.reserve && (
                      <button
                        onClick={handleReservation}
                        className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                      >
                        Réserver cette heure
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
                    Ajouter un créneau
                  </Dialog.Title>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date</label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        value={newHeure.date}
                        onChange={(e) => setNewHeure({ ...newHeure, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Heure début</label>
                      <input
                        type="time"
                        step="3600"
                        min="08:00"
                        max="19:00"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        value={newHeure.heure_debut}
                        onChange={(e) => {
                          const value = e.target.value;
                          const [hours] = value.split(':');
                          const formattedTime = `${hours}:00`;
                          setNewHeure({ ...newHeure, heure_debut: formattedTime });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Heure fin</label>
                      <input
                        type="time"
                        disabled
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100"
                        value={newHeure.heure_fin}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Véhicule</label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        value={newHeure.modele_vehicule}
                        onChange={(e) => setNewHeure({ ...newHeure, modele_vehicule: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Boîte de vitesses
                      </label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        value={newHeure.boite_vitesse}
                        onChange={(e) => setNewHeure({ 
                          ...newHeure, 
                          boite_vitesse: e.target.value as 'manuelle' | 'automatique'
                        })}
                      >
                        <option value="manuelle">Manuelle</option>
                        <option value="automatique">Automatique</option>
                      </select>
                    </div>
                    <button
                      onClick={handleAjoutCreneau}
                      className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                    >
                      Ajouter
                    </button>
                  </div>
                </>
              )}
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedHeure(null);
                  setNewHeure({
                    date: '',
                    heure_debut: '',
                    heure_fin: '',
                    modele_vehicule: '',
                    boite_vitesse: 'manuelle',
                  });
                }}
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

export default Calendrier;