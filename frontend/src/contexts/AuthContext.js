import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, supabaseConfigured, ROLES } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId, userMeta) => {
    if (!supabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) return data;

      // Profile doesn't exist - auto-create from auth user metadata
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const meta = userMeta || authUser?.user_metadata || {};
      const email = authUser?.email || '';

      const profilePayload = {
        id: userId,
        email: email,
        name: meta.name || meta.full_name || email.split('@')[0] || 'Utilisateur',
        role: meta.role || 'admin',
      };

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating profile:', insertError);
        // Return the payload as fallback so the UI works
        return profilePayload;
      }
      return newProfile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Return a minimal fallback profile so the app doesn't break
      return {
        id: userId,
        name: userMeta?.name || userMeta?.full_name || 'Utilisateur',
        email: userMeta?.email || '',
        role: userMeta?.role || 'admin',
      };
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    // Use onAuthStateChange as the SINGLE source of truth.
    // It fires INITIAL_SESSION on mount (replaces getSession), and then
    // fires on every subsequent sign-in / sign-out / token-refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);

          // Defer profile fetch to avoid blocking Supabase's internal lock
          setTimeout(async () => {
            if (!mounted) return;
            const profileData = await fetchProfile(session.user.id, session.user.user_metadata);
            if (mounted) {
              setProfile(profileData);
              setLoading(false);
            }
          }, 0);
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Safety timeout
    const timeoutId = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async (email, password, name, role = ROLES.EMPLOYEE) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } }
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const isSuperAdmin = () => profile?.role === ROLES.SUPERADMIN;
  const isAdmin = () => profile?.role === ROLES.ADMIN || profile?.role === ROLES.SUPERADMIN;
  const isEmployee = () => profile?.role === ROLES.EMPLOYEE;
  const isApproved = () => profile?.approved === true;

  const refreshProfile = async () => {
    if (user) {
      const data = await fetchProfile(user.id);
      setProfile(data);
      return data;
    }
    return null;
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      logout,
      isSuperAdmin,
      isAdmin,
      isEmployee,
      isApproved,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};
