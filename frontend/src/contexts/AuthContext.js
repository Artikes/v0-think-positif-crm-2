import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, supabaseConfigured, ROLES } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId, userMeta) => {
    if (!supabase) return null;
    try {
      console.log('[v0] fetchProfile called for userId:', userId);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('[v0] fetchProfile result:', { data, error: error?.code, errorMsg: error?.message });

      if (data) return data;

      // Profile doesn't exist (user created before trigger or trigger failed)
      // Auto-create it from the auth user metadata
      console.log('[v0] No profile found, auto-creating...');
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const meta = userMeta || authUser?.user_metadata || {};
      const email = authUser?.email || '';

      const profilePayload = {
        id: userId,
        email: email,
        name: meta.name || meta.full_name || email.split('@')[0] || 'Utilisateur',
        role: meta.role || 'admin',
      };
      console.log('[v0] Creating profile with:', profilePayload);

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })
        .select()
        .single();

      console.log('[v0] Upsert result:', { newProfile, insertError: insertError?.message });

      if (insertError) {
        console.error('[v0] Error creating profile:', insertError);
        // Even if upsert fails, return a local fallback so the UI works
        return profilePayload;
      }
      return newProfile;
    } catch (error) {
      console.error('[v0] Error in fetchProfile:', error);
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
    let timeoutId;

    // Get initial session
    const initializeAuth = async () => {
      if (!supabaseConfigured || !supabase) {
        console.error('Supabase not configured - redirecting to login');
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        // Use getSession first to get cached session quickly
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[v0] getSession result:', { hasSession: !!session, hasUser: !!session?.user });
        
        if (!mounted) return;
        
        if (session?.user) {
          // Validate token with server using getUser
          const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser();
          console.log('[v0] getUser result:', { hasUser: !!validatedUser, error: userError?.message });

          if (!mounted) return;
          
          if (validatedUser) {
            setUser(validatedUser);
            const profileData = await fetchProfile(validatedUser.id, validatedUser.user_metadata);
            console.log('[v0] Profile loaded:', { hasProfile: !!profileData, name: profileData?.name });
            if (mounted) setProfile(profileData);
          } else {
            // Session exists but token is invalid - clear it
            console.log('[v0] Session invalid, clearing...');
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('[v0] Error getting session:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    if (!supabase) {
      return () => { mounted = false; };
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event);
        
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session.user);
          const profileData = await fetchProfile(session.user.id, session.user.user_metadata);
          if (mounted) setProfile(profileData);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Safety timeout - ensure loading is set to false
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.log('Safety timeout triggered');
        setLoading(false);
      }
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async (email, password, name, role = ROLES.EMPLOYEE) => {
    if (!supabase) throw new Error('Supabase non configuré');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } }
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    if (!supabase) throw new Error('Supabase non configuré');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    if (!supabase) throw new Error('Supabase non configuré');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const isAdmin = () => profile?.role === ROLES.ADMIN;
  const isEmployee = () => profile?.role === ROLES.EMPLOYEE;

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      isAdmin,
      isEmployee,
      refreshProfile: async () => {
        if (user) {
          const data = await fetchProfile(user.id);
          setProfile(data);
        }
      }
    }}>
      {children}
    </AuthContext.Provider>
  );
};
