import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

// **MODIFIER CES LIGNES POUR UTILISER import.meta.env**
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vérifie que les variables sont bien chargées avant de créer le client
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variables d\'environnement Supabase non chargées. Veuillez vérifier votre fichier .env et votre configuration Vite.');
  // Tu peux lancer une erreur ou gérer ça autrement, par exemple afficher un message à l'utilisateur
  // throw new Error('Configuration Supabase manquante.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const Auth = () => {
  // Pas besoin de isLogin, on est toujours en mode inscription
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [nomAutoecole, setNomAutoecole] = useState(''); // Nouveau champ pour le nom de l'auto-école
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth(); // On n'a plus besoin de signIn ici
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères');
      }

      // Appeler la fonction signUp du AuthContext, en passant toutes les données nécessaires
      // La fonction signUp de ton AuthContext devra être mise à jour pour accepter 'nomAutoecole'
      await signUp(email, password, firstName, lastName, phone, nomAutoecole);
      toast.success('Compte auto-école créé avec succès !');
      setSuccess(true);

      // --- NOUVELLE LOGIQUE APRÈS INSCRIPTION RÉUSSIE ---
      // Récupérer l'ID de l'auto-école et envoyer le lien élève par email
      const user = supabase.auth.getUser(); // Récupère l'utilisateur actuellement connecté/inscrit

      if (user && user.data.user) {
        const adminUserId = user.data.user.id;

        // Récupérer l'ID de l'auto-école que cet admin vient de créer
        const { data: autoecoleData, error: autoecoleError } = await supabase
          .from('auto_ecoles')
          .insert({
            nom: nomAutoecole,
            admin_id: currentUser.id
          })
          .select('id') // <-- pour récupérer l'id créé
          .single();

        if (autoecoleError) throw autoecoleError;

        // Redirige l'utilisateur vers la page de son auto-école
        if (autoecoleData && autoecoleData.id) {
          navigate(`/auto-ecole/${autoecoleData.id}`);
        }

        if (autoecoleData) {
          const autoecoleId = autoecoleData.id;
          const eleveInscriptionLink = `https://demo.verkoz.com/inscription-eleve?ecole_id=${autoecoleId}`;

          console.log("Lien d'inscription pour les élèves :", eleveInscriptionLink);

          // Appel de l'Edge Function pour envoyer l'email
          const { data: functionData, error: functionError } = await supabase.functions.invoke('send-eleve-link-email', {
              body: {
                  adminEmail: email, // L'email de l'admin
                  eleveLink: eleveInscriptionLink,
                  autoecoleName: nomAutoecole
              }
          });

          if (functionError) {
              console.error('Erreur lors de l\'envoi de l\'email par la fonction Edge:', functionError.message);
              toast.error('Email de lien élève non envoyé. Vérifiez votre boîte spam ou contactez le support.');
          } else {
              toast.success('Lien d\'inscription pour les élèves envoyé par email !');
          }

          navigate('/admin-dashboard'); // Redirige l'admin vers son tableau de bord
        } else {
          toast.warn("Auto-école non trouvée. Veuillez réessayer ou contacter le support.");
          navigate('/'); // Retour à l'accueil si problème majeur
        }

      } else {
        toast.error("Erreur: Utilisateur non trouvé après inscription. Contactez le support.");
        navigate('/'); // Retour à l'accueil en cas de problème inattendu
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      let userFriendlyMessage = errorMessage;

      // Traduire les messages d'erreur de Supabase
      if (errorMessage.includes('Email not confirmed')) {
        userFriendlyMessage = 'Veuillez confirmer votre email avant de vous connecter'; // Moins pertinent ici mais garder au cas où
      } else if (errorMessage.includes('User already registered')) {
        userFriendlyMessage = 'Un compte existe déjà avec cet email';
      } else if (errorMessage.includes('duplicate key value violates unique constraint "auto_ecoles_admin_id_key"')) {
        userFriendlyMessage = 'Cet email est déjà lié à une auto-école existante.';
      }

      toast.error(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Créer votre Auto-École
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Inscrivez-vous pour créer votre compte administrateur et votre auto-école.
          </p>
        </div>
        {success && (
          <div className="bg-green-100 text-green-800 p-4 rounded mb-4 text-center">
            🎉 Félicitations, votre auto-école a été créée avec succès !
          </div>
        )}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {/* Tous les champs nécessaires pour l'inscription de l'admin */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                Prénom
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Prénom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Nom
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Nom"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de téléphone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Numéro de téléphone (optionnel)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            {/* NOUVEAU CHAMP : Nom de l'auto-école */}
            <div>
              <label htmlFor="nomAutoecole" className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'Auto-École
              </label>
              <input
                id="nomAutoecole"
                name="nomAutoecole"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Nom de votre Auto-École"
                value={nomAutoecole}
                onChange={(e) => setNomAutoecole(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password" // Changer en new-password pour l'inscription
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="mt-1 text-sm text-gray-500">
                Le mot de passe doit contenir au moins 6 caractères
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
              ) : null}
              Créer mon Auto-École
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;
