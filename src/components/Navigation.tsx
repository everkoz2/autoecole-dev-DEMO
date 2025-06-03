import React, { Fragment } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Navigation() {
  const { user, userRole, signOut } = useAuth();
  const location = useLocation();
  const { autoEcoleId } = useParams();

  const navigation = [
    { name: 'Accueil', href: autoEcoleId ? `/${autoEcoleId}` : '/', roles: [] },
    ...((!autoEcoleId && !user) ? [{ name: 'Créer une auto-école', href: '/creer-auto-ecole', roles: [] }] : []),
    ...(autoEcoleId ? [
      { name: 'Forfaits', href: `/${autoEcoleId}/forfaits`, roles: [] },
      { name: 'Calendrier', href: `/${autoEcoleId}/calendrier`, roles: ['eleve', 'moniteur', 'admin'] },
      { name: 'Mes heures', href: `/${autoEcoleId}/mes-heures`, roles: ['eleve', 'moniteur'] },
      { name: 'Mes documents', href: `/${autoEcoleId}/mes-documents`, roles: ['eleve'] },
      { name: "Livret d'apprentissage", href: `/${autoEcoleId}/livret-apprentissage`, roles: ['eleve'] },
      { name: 'Mes factures', href: `/${autoEcoleId}/mes-factures`, roles: ['eleve'] },
      { name: 'Élèves', href: `/${autoEcoleId}/eleves`, roles: ['moniteur'] },
      { name: 'Gestion utilisateurs', href: `/${autoEcoleId}/gestion-utilisateurs`, roles: ['admin'] },
      { name: 'Logs', href: `/${autoEcoleId}/logs`, roles: ['admin'] },
    ] : [])
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.length === 0 || (userRole && item.roles.includes(userRole))
  );

  return (
    <Disclosure as="nav" className="bg-primary-600">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <div className="flex flex-shrink-0 items-center">
                  <Link to="/" className="text-white text-xl font-bold">
                    {autoEcoleId ? 'Auto École' : 'Démo Auto École'}
                  </Link>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {filteredNavigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={classNames(
                        location.pathname === item.href
                          ? 'border-white text-white'
                          : 'border-transparent text-gray-300 hover:border-gray-300 hover:text-gray-100',
                        'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium'
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                {user ? (
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                        <span className="sr-only">Open user menu</span>
                        <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center text-white">
                          {user.email?.[0].toUpperCase()}
                        </div>
                      </Menu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to={autoEcoleId ? `/${autoEcoleId}/mon-compte` : '/mon-compte'}
                              className={classNames(
                                active ? 'bg-gray-100' : '',
                                'block px-4 py-2 text-sm text-gray-700'
                              )}
                            >
                              Mon compte
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => signOut()}
                              className={classNames(
                                active ? 'bg-gray-100' : '',
                                'block w-full text-left px-4 py-2 text-sm text-gray-700'
                              )}
                            >
                              Se déconnecter
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                ) : autoEcoleId ? (
                  <Link
                    to="/auth"
                    className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Se connecter
                  </Link>
                ) : null}
              </div>
              <div className="-mr-2 flex items-center sm:hidden">
                <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-primary-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="sm:hidden">
            <div className="space-y-1 pb-3 pt-2">
              {filteredNavigation.map((item) => (
                <Disclosure.Button
                  key={item.name}
                  as={Link}
                  to={item.href}
                  className={classNames(
                    location.pathname === item.href
                      ? 'bg-primary-700 text-white'
                      : 'text-gray-300 hover:bg-primary-700 hover:text-white',
                    'block px-3 py-2 rounded-md text-base font-medium'
                  )}
                >
                  {item.name}
                </Disclosure.Button>
              ))}
            </div>
            <div className="border-t border-primary-700 pb-3 pt-4">
              {user ? (
                <div className="space-y-1">
                  <Disclosure.Button
                    as={Link}
                    to={autoEcoleId ? `/${autoEcoleId}/mon-compte` : '/mon-compte'}
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-primary-700 hover:text-white"
                  >
                    Mon compte
                  </Disclosure.Button>
                  <Disclosure.Button
                    as="button"
                    onClick={() => signOut()}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-primary-700 hover:text-white"
                  >
                    Se déconnecter
                  </Disclosure.Button>
                </div>
              ) : autoEcoleId ? (
                <Disclosure.Button
                  as={Link}
                  to="/auth"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-primary-700 hover:text-white"
                >
                  Se connecter
                </Disclosure.Button>
              ) : null}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}