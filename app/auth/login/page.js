"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);

	const handleLogin = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			setError(error.message);
			setLoading(false);
			return;
		}

		// Redirect based on role/userType
		const user = data.user;
		if (user?.role === "owner" || user?.role === "admin" || user?.role === "trainer") {
			router.push("/admin/dashboard");
		} else {
			router.push("/user/dashboard");
		}
	};

	return (
		<div className="relative w-full min-h-screen text-white flex flex-col items-center justify-end px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
			{/* Full Background Image */}
			<Image
				src="/bgimages/loginbg.png"
				alt="Machine background"
				fill
				priority
				quality={100}
				className="object-cover"
			/>

			{/* Gradient overlay */}
			<div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />
			<div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-white/80 via-white/40 to-transparent blur-xl" />

			{/* Content Container - Positioned at Bottom */}
			<div className="relative z-10 w-full max-w-md mx-auto">
				<div className="w-full space-y-6 bg-black/50 backdrop-blur-md rounded-2xl p-6 sm:p-8">
					<div>
						<h1 className="text-3xl sm:text-4xl font-bold leading-tight text-orange-500">
							Welcome Back
						</h1>
						<p className="text-sm sm:text-base text-white/80 mt-2">
							Sign in to your account
						</p>
					</div>

					<form onSubmit={handleLogin} className="space-y-4">
						<div>
							<label className="block text-xs sm:text-sm font-medium text-white/90 mb-2">
								Email
							</label>
							<input
								type="email"
								className="w-full px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 focus:border-transparent outline-none transition text-sm"
								placeholder="Enter your email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>

						<div>
							<label className="block text-xs sm:text-sm font-medium text-white/90 mb-2">
								Password
							</label>
							<input
								type="password"
								className="w-full px-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 focus:border-transparent outline-none transition text-sm"
								placeholder="Enter your password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
						</div>

						{error && (
							<div className="bg-red-500/20 text-red-200 px-3 py-2 rounded-lg text-xs sm:text-sm border border-red-500/30">
								{error}
							</div>
						)}

						<button
							type="submit"
							disabled={loading}
							className="w-full bg-white text-black py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-gray-100 transition disabled:opacity-50 text-sm sm:text-base"
						>
							{loading ? "Signing in..." : "Sign In"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
