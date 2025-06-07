import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import Navigation from '../components/Navigation';

const Accueil = () => {
  const { user } = useAuth();
  const { autoEcoleSlug } = useParams();

  const { data: autoEcole } = useQuery({
    queryKey: ['auto-ecole', autoEcoleSlug],
    queryFn: async () => {
      if (!autoEcoleSlug) return null;
      const { data, error } = await supabase
        .from('auto_ecoles')
        .select('*')
        .eq('slug', autoEcoleSlug)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!autoEcoleSlug
  });

  // Page d'accueil générale (pas dans une auto-école)
  if (!autoEcoleSlug) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-6xl">
                Bienvenue sur la Démo Auto-École
              </h1>
              <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
                Découvrez notre solution complète de gestion d'auto-école. Testez gratuitement toutes les fonctionnalités et créez votre propre auto-école en quelques clics.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  to="/creer-auto-ecole"
                  className="inline-block bg-primary-600 py-3 px-8 rounded-full text-white font-semibold hover:bg-primary-700 transition-colors"
                >
                  Créer mon auto-école
                </Link>
                <a
                  href="#fonctionnalites"
                  className="inline-block bg-white py-3 px-8 rounded-full text-primary-600 font-semibold border-2 border-primary-600 hover:bg-primary-50 transition-colors"
                >
                  En savoir plus
                </a>
                {!user && (
                  <Link
                    to="/auth"
                    className="inline-block bg-primary-100 py-3 px-8 rounded-full text-primary-700 font-semibold border-2 border-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    Se connecter à une auto-école
                  </Link>
                )}
              </div>
            </div>

            <div id="fonctionnalites" className="mt-20">
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
                Fonctionnalités principales
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Gestion des élèves
                  </h3>
                  <p className="text-gray-600">
                    Suivez les progrès de vos élèves, gérez leurs heures de conduite et leurs documents administratifs.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Planning intégré
                  </h3>
                  <p className="text-gray-600">
                    Organisez facilement les leçons de conduite avec un calendrier interactif pour les moniteurs et les élèves.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Paiements en ligne
                  </h3>
                  <p className="text-gray-600">
                    Proposez des forfaits et acceptez les paiements en ligne en toute sécurité.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-20">
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
                Comment ça marche ?
              </h2>
              <div className="grid gap-8 max-w-3xl mx-auto">
                <div className="flex items-start gap-4">
                  <div className="bg-primary-100 rounded-full p-3">
                    <span className="text-primary-600 font-bold text-xl">1</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Créez votre auto-école
                    </h3>
                    <p className="text-gray-600">
                      Remplissez le formulaire avec les informations de votre auto-école. C'est rapide et gratuit !
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-primary-100 rounded-full p-3">
                    <span className="text-primary-600 font-bold text-xl">2</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Personnalisez votre espace
                    </h3>
                    <p className="text-gray-600">
                      Ajoutez vos forfaits, configurez vos moniteurs et personnalisez votre interface.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-primary-100 rounded-full p-3">
                    <span className="text-primary-600 font-bold text-xl">3</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Invitez vos élèves
                    </h3>
                    <p className="text-gray-600">
                      Partagez le lien de votre auto-école avec vos élèves pour qu'ils puissent s'inscrire.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Page d'accueil d'une auto-école (avec slug)
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0">
              <img
                src="https://images.pexels.com/photos/3806753/pexels-photo-3806753.jpeg"
                alt="Auto-école"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black opacity-50"></div>
            </div>

            <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {autoEcole?.nom || 'Auto École'}
              </h1>
              <p className="mt-6 text-xl text-gray-100 max-w-3xl">
                Bienvenue dans votre espace de formation. Commencez votre apprentissage de la conduite avec des moniteurs expérimentés.
              </p>
              {!user && (
                <div className="mt-10">
                  <Link
                    to="/auth"
                    className="inline-block bg-primary-600 py-3 px-8 rounded-full text-white font-semibold hover:bg-primary-700 transition-colors"
                  >
                    Commencer maintenant
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Features Section */}
          <div className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                  Pourquoi nous choisir ?
                </h2>
                <p className="mt-4 text-lg text-gray-500">
                  Des services adaptés à vos besoins pour une formation de qualité
                </p>
              </div>

              <div className="mt-20">
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="pt-6">
                    <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                      <div className="-mt-6">
                        <div>
                          <span className="inline-flex items-center justify-center p-3 bg-primary-500 rounded-md shadow-lg">
                            <img
                              src="https://images.pexels.com/photos/5836/yellow-metal-design-decoration.jpg"
                              alt="Expérience"
                              className="h-8 w-8 rounded"
                            />
                          </span>
                        </div>
                        <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                          Moniteurs expérimentés
                        </h3>
                        <p className="mt-5 text-base text-gray-500">
                          Une équipe de professionnels qualifiés et passionnés pour vous accompagner
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                      <div className="-mt-6">
                        <div>
                          <span className="inline-flex items-center justify-center p-3 bg-primary-500 rounded-md shadow-lg">
                            <img
                              src="https://images.pexels.com/photos/8294606/pexels-photo-8294606.jpeg"
                              alt="Véhicules"
                              className="h-8 w-8 rounded"
                            />
                          </span>
                        </div>
                        <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                          Véhicules récents
                        </h3>
                        <p className="mt-5 text-base text-gray-500">
                          Une flotte de véhicules modernes et bien entretenus pour votre apprentissage
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                      <div className="-mt-6">
                        <div>
                          <span className="inline-flex items-center justify-center p-3 bg-primary-500 rounded-md shadow-lg">
                            <img
                              src="https://images.pexels.com/photos/4386442/pexels-photo-4386442.jpeg"
                              alt="Flexibilité"
                              className="h-8 w-8 rounded"
                            />
                          </span>
                        </div>
                        <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                          Horaires flexibles
                        </h3>
                        <p className="mt-5 text-base text-gray-500">
                          Des créneaux adaptés à votre emploi du temps pour plus de flexibilité
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-gray-50">
            <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
                    Nos horaires
                  </h2>
                  <div className="mt-8 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Lundi - Vendredi</span>
                      <span className="font-medium">9h00 - 19h00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Samedi</span>
                      <span className="font-medium">9h00 - 17h00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Dimanche</span>
                      <span className="font-medium text-red-600">Fermé</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
                    Contact
                  </h2>
                  <div className="mt-8 space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Adresse</h3>
                      <p className="mt-2 text-gray-600">
                        Rue de la Liberté<br />
                        21000 Dijon
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Téléphone</h3>
                      <p className="mt-2 text-gray-600">01 23 45 67 89</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Email</h3>
                      <p className="mt-2 text-gray-600">contact@auto-ecole-croussey.fr</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-16">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2707.6044233150723!2d5.03798857680362!3d47.32168097106635!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47f29db7c7f6b1d7%3A0xb2198c7a097e81d7!2sRue%20de%20la%20Libert%C3%A9%2C%2021000%20Dijon!5e0!3m2!1sfr!2sfr!4v1684408621396!5m2!1sfr!2sfr"
                  className="w-full h-96 rounded-lg shadow-lg"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe> 
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Accueil;