"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { saveSession, SESSION_KEYS } from "@/lib/sessionStorage";
import Link from "next/link";
import { 
  Dumbbell, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff,
  Shield,
  Smartphone,
  ArrowRight,
  AlertCircle,
  User,
  Building
} from "lucide-react";
import SSLogo from "@/components/shared/SSLogo";

export default function LoginPage() {
  const router = useRouter();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState("admin"); // "admin", "trainer", or "member"
  const [showContactModal, setShowContactModal] = useState(false);

  // Helper function to detect if input is email or phone
  const isEmail = (input) => {
    return input.includes("@") && input.includes(".");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const isEmailLogin = isEmail(emailOrPhone);
      
      if (userType === "admin") {
        // Admin/Owner login through profiles table
        const searchField = isEmailLogin ? "email" : "phone";
        
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq(searchField, emailOrPhone)
          .in("role", ["superadmin", "admin", "owner", "view_only"])
          .maybeSingle();

        if (profileError || !profile) {
          setError("Invalid email/phone or password");
          setLoading(false);
          return;
        }

        // Verify password
        if (profile.password !== password) {
          setError("Invalid email/phone or password");
          setLoading(false);
          return;
        }

        // Check if account is deactivated by superadmin
        if (profile.is_active === false) {
          setError("Your account has been deactivated. Contact your super admin.");
          setLoading(false);
          return;
        }

        // Store user info with permissions
        const userData = {
          id: profile.id,
          name: `${profile.first_name} ${profile.last_name}`,
          email: profile.email,
          phone: profile.phone,
          role: profile.role,
          gym_id: profile.gym_id,
          permissions: profile.permissions
        };
        
        // Save to persistent storage (IndexedDB + localStorage)
        await saveSession(SESSION_KEYS.USER, JSON.stringify(userData));
        // Set session expiry to 30 days for PWA
        const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000);
        await saveSession(SESSION_KEYS.EXPIRY, expiryTime.toString());
        localStorage.removeItem("selectedGym");
        
        router.push("/admin/dashboard");
        
      } else if (userType === "trainer") {
        // Trainer login - fetch profile data from profiles table
        const searchField = isEmailLogin ? "email" : "phone";
        
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq(searchField, emailOrPhone)
          .eq("role", "trainer")
          .maybeSingle();

        if (profileError || !profile) {
          setError("Invalid email/phone or password");
          setLoading(false);
          return;
        }

        // Verify password
        if (profile.password !== password) {
          setError("Invalid email/phone or password");
          setLoading(false);
          return;
        }

        // Store trainer info with gym_id
        const trainerData = {
          id: profile.id,
          name: `${profile.first_name} ${profile.last_name}`,
          email: profile.email,
          phone: profile.phone,
          role: "trainer",
          gym_id: profile.gym_id,
          userType: "trainer"
        };
        
        // Save to persistent storage (IndexedDB + localStorage)
        await saveSession(SESSION_KEYS.USER, JSON.stringify(trainerData));
        // Set session expiry to 30 days for PWA
        const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000);
        await saveSession(SESSION_KEYS.EXPIRY, expiryTime.toString());
        localStorage.removeItem("selectedGym");
        
        // Save trainer login timestamp (used to detect credential changes by admin)
        localStorage.setItem("trainer_login_at", Date.now().toString());
        
        router.push("/trainer/dashboard");
      } else {
        // Member login through member_credentials table
        const loginType = isEmailLogin ? "email" : "phone";
        
        const { data: credentials, error: credError } = await supabase
          .from("member_credentials")
          .select(`
            *,
            members (
              id,
              full_name,
              email,
              phone,
              gym_id,
              profile_image
            )
          `)
          .eq("login_type", loginType)
          .eq("login_value", emailOrPhone)
          .maybeSingle();

        if (credError || !credentials) {
          setError("Invalid email/phone or password");
          setLoading(false);
          return;
        }

        // Verify password
        if (credentials.password !== password) {
          setError("Invalid email/phone or password");
          setLoading(false);
          return;
        }

        // Store member info
        const member = credentials.members;
        const memberData = {
          id: member.id,
          name: member.full_name,
          email: member.email,
          phone: member.phone,
          role: "member",
          gym_id: member.gym_id,
          profileImage: member.profile_image
        };
        
        // Save to persistent storage (IndexedDB + localStorage)
        await saveSession(SESSION_KEYS.USER, JSON.stringify(memberData));
        localStorage.setItem("member", JSON.stringify(memberData)); // compatibility
        // Set session expiry to 30 days for PWA
        const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000);
        await saveSession(SESSION_KEYS.EXPIRY, expiryTime.toString());
        localStorage.removeItem("selectedGym");
        
        router.push("/user/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred during login");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-42"
          style={{ backgroundImage: "url('/bgimages/loginbgdesktop.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#050505_0%,rgba(5,5,5,0.92)_42%,rgba(156,68,0,0.28)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,rgba(240,129,61,0.22),transparent_30%),linear-gradient(180deg,rgba(5,5,5,0.2),#050505_92%)]" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px),
                            linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
      </div>

      <main className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo and Header */}
          <div className="text-center mb-10">
            <div className="mb-6 flex justify-center">
              <SSLogo size="lg" />
            </div>
            <h1 className="text-4xl font-black text-white mb-2">Welcome Back</h1>
            <p className="text-lg text-gray-400 mb-6">SS Fitness command access</p>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <Shield className="w-4 h-4 text-[#f0813d]" />
              <span className="text-sm font-medium text-white/90">Secure Login</span>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-[#0d0d0d]/86 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
            {/* User Type Selector */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <button
                onClick={() => setUserType("admin")}
                className={`py-3 rounded-lg text-xs font-medium transition-all flex flex-col items-center justify-center gap-1 ${
                  userType === "admin"
                    ? "bg-[#f0813d] text-black shadow-lg shadow-[#f0813d]/20"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Admin</span>
              </button>
              <button
                onClick={() => setUserType("trainer")}
                className={`py-3 rounded-lg text-xs font-medium transition-all flex flex-col items-center justify-center gap-1 ${
                  userType === "trainer"
                    ? "bg-[#f0813d] text-black shadow-lg shadow-[#f0813d]/20"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                <Dumbbell className="w-4 h-4" />
                <span>Trainer</span>
              </button>
              <button
                onClick={() => setUserType("member")}
                className={`py-3 rounded-lg text-xs font-medium transition-all flex flex-col items-center justify-center gap-1 ${
                  userType === "member"
                    ? "bg-[#f0813d] text-black shadow-lg shadow-[#f0813d]/20"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                <User className="w-4 h-4" />
                <span>Member</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  <div className="flex items-center gap-2">
                    {emailOrPhone.includes("@") ? (
                      <Mail className="w-4 h-4" />
                    ) : (
                      <Smartphone className="w-4 h-4" />
                    )}
                    Email Address or Phone Number
                  </div>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f0813d]/50 focus:border-[#f0813d]/50 outline-none transition-all text-sm"
                    placeholder="Enter email or phone number"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    required
                  />
                  {emailOrPhone.includes("@") ? (
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  ) : (
                    <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password
                  </div>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f0813d]/50 focus:border-[#f0813d]/50 outline-none transition-all text-sm"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
         

              {/* Error Message */}
              {error && (
                <div className="bg-[#f0813d]/20 backdrop-blur-sm rounded-lg p-3 border border-[#f0813d]/30 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-[#f0813d] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-orange-200">{error}</p>
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-5 bg-[#f0813d] text-black font-black rounded-lg hover:bg-white hover:shadow-xl hover:shadow-[#f0813d]/25 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Demo Credentials */}
            
            </form>

            {/* Footer Links */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-400">
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => setShowContactModal(true)}
                    className="text-[#f0813d] hover:text-[#f0813d] font-medium transition-colors"
                  >
                    Contact Admin
                  </button>
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Link
                    href="/"
                    className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
                  >
                    ← Back to Home
                  </Link>
                  <span className="text-gray-500">•</span>
                  
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Notice */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} SFit.ai • Created by Shabiya Solutions
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Secure login with end-to-end encryption
            </p>
          </div>
        </div>
      </main>

      {/* Contact Admin Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-md w-full border border-white/10 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f0813d] to-[#f0813d] flex items-center justify-center">
                  <Building className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Contact Admin</h3>
                  <p className="text-sm text-gray-400">Get in touch with us</p>
                </div>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <AlertCircle className="w-5 h-5 text-gray-400 rotate-45" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Email */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-[#f0813d]/20 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1">Email Address</p>
                    <a 
                      href="mailto:shaibyasolutions@gmail.com"
                      className="text-white font-medium hover:text-[#f0813d] transition-colors"
                    >
                      shaibyasolutions@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-[#f0813d]/20 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1">Phone Number</p>
                    <a 
                      href="tel:+917498341146"
                      className="text-white font-medium hover:text-[#f0813d] transition-colors"
                    >
                      +91 7498341146
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <p className="text-xs text-gray-400 text-center">
                Our team will get back to you within 24 hours
              </p>
            </div>

            <button
              onClick={() => setShowContactModal(false)}
              className="w-full mt-4 py-3 bg-gradient-to-r from-[#f0813d] to-[#f0813d] text-white font-semibold rounded-lg hover:shadow-xl hover:shadow-[#f0813d]/25 active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
