import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: any;
  userRole: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string, phone: string, nomAutoecole: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const navigate = useNavigate();

  const fetchUserRole = async (userId: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('utilisateurs')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return '';
      }
      return data?.role || '';
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      return '';
    }
  };

  const signOut = async () => {
    try {
      setIsAuthLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setUserRole('');
      navigate('/'); // Redirige vers la page d'accueil après déconnexion
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let initialSessionChecked = false;

    const handleAuthChange = async (event: string, session: any) => {
      if (!mounted) return;

      try {
        if (session?.user) {
          const role = await fetchUserRole(session.user.id);
          if (mounted) {
            setUser(session.user);
            setUserRole(role);
          }
        } else {
          if (mounted) {
            setUser(null);
            setUserRole('');
          }
        }
      } catch (error) {
        console.error('Error in handleAuthChange:', error);
      } finally {
        if (mounted) {
          setIsAuthLoading(false);
          if (!initialSessionChecked) {
            setIsBootstrapping(false);
            initialSessionChecked = true;
          }
        }
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        handleAuthChange('INITIAL_SESSION', session);
      }
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'INITIAL_SESSION') {
        handleAuthChange(event, session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsAuthLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;

      if (data.session) {
        const role = await fetchUserRole(data.user.id);
        setUser(data.user);
        setUserRole(role);
        navigate('/');
      }
    } catch (error: any) {
      let message = 'Email ou mot de passe incorrect';
      toast.error(message);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

const signUp = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  phone: string,
  nomAutoecole: string
) => {
  try {
    setIsAuthLoading(true);
    // Création du compte Auth sécurisé
    const { data: { user: newUser }, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    if (!newUser) throw new Error("Utilisateur non créé");

    // Insertion du profil (sans mot de passe)
    const { error: profileError } = await supabase
      .from('utilisateurs')
      .insert({
        id: newUser.id,
        email,
        prenom: firstName,
        nom: lastName,
        telephone: phone,
        role: 'admin',
        heures_restantes: 0
      });
    if (profileError) throw profileError;

    // ...suite logique (création auto_ecole, etc)...
  } catch (error) {
    // ...gestion d'erreur...
  } finally {
    setIsAuthLoading(false);
  }
};

  if (isBootstrapping) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userRole, signIn, signUp, signOut, isAuthLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};