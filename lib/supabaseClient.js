import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create Supabase client for database operations
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Auth state management
let currentUser = null;
let authChangeCallbacks = [];

// Helper to notify all auth state change listeners
const notifyAuthChange = (event, user) => {
  authChangeCallbacks.forEach((callback) => callback(event, { user }));
};

// Custom auth implementation using member_credentials table
export const supabase = {
  // Expose the raw client for direct database queries
  client: supabaseClient,

  auth: {
    signInWithPassword: async ({ email, password }) => {
      try {
        // First, check if it's an admin/owner/trainer login (profiles table)
        // Try matching by email OR phone
        const { data: profile, error: profileError } = await supabaseClient
          .from("profiles")
          .select("id, first_name, last_name, phone, email, password, role")
          .or(`email.eq.${email},phone.eq.${email}`)
          .single();

        if (profile && !profileError) {
          // Check password from database
          if (profile.password && password === profile.password) {
            currentUser = {
              id: profile.id,
              email: profile.email || profile.phone,
              name: `${profile.first_name} ${profile.last_name}`,
              phone: profile.phone,
              role: profile.role,
              userType: "admin",
            };
            localStorage.setItem("gymUser", JSON.stringify(currentUser));
            notifyAuthChange("SIGNED_IN", currentUser);
            return { data: { user: currentUser }, error: null };
          }
        }

        // Check member_credentials table for member login
        const { data: credential, error: credError } = await supabaseClient
          .from("member_credentials")
          .select(`
            id,
            member_id,
            login_type,
            login_value,
            password,
            members (
              id,
              full_name,
              phone,
              email,
              profile_image,
              gym_id
            )
          `)
          .eq("login_value", email)
          .single();

        if (credError || !credential) {
          return { 
            data: null, 
            error: { message: "Invalid email or phone number" } 
          };
        }

        // Verify password (in production, use proper hashing like bcrypt)
        // For now, we do a simple comparison
        if (credential.password !== password) {
          return { 
            data: null, 
            error: { message: "Invalid password" } 
          };
        }

        // Build user object from member data
        currentUser = {
          id: credential.member_id,
          email: credential.login_value,
          name: credential.members?.full_name,
          phone: credential.members?.phone,
          profileImage: credential.members?.profile_image,
          gymId: credential.members?.gym_id,
          role: "member",
          userType: "member",
        };

        localStorage.setItem("gymUser", JSON.stringify(currentUser));
        notifyAuthChange("SIGNED_IN", currentUser);
        return { data: { user: currentUser }, error: null };
      } catch (err) {
        console.error("Login error:", err);
        return { 
          data: null, 
          error: { message: "An error occurred during login" } 
        };
      }
    },

    getUser: async () => {
      if (!currentUser) {
        const stored = localStorage.getItem("gymUser");
        currentUser = stored ? JSON.parse(stored) : null;
      }
      return { data: { user: currentUser } };
    },

    signOut: async () => {
      currentUser = null;
      localStorage.removeItem("gymUser");
      notifyAuthChange("SIGNED_OUT", null);
      return { error: null };
    },

    onAuthStateChange: (callback) => {
      authChangeCallbacks.push(callback);
      
      // Return subscription object with unsubscribe method
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authChangeCallbacks = authChangeCallbacks.filter(
                (cb) => cb !== callback
              );
            },
          },
        },
      };
    },
  },

  // Expose commonly used database methods
  from: (table) => supabaseClient.from(table),
  rpc: (fn, params) => supabaseClient.rpc(fn, params),
};
