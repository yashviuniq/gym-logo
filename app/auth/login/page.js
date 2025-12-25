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

		// Redirect based on role
		if (data.user?.role === "admin") {
			router.push("/admin/dashboard");
		} else {
			router.push("/profile");
		}
	};

	return (
		<div className="relative w-full min-h-screen text-white flex flex-col items-center justify-end lg:justify-center lg:items-start px-4 sm:px-6 lg:px-16 xl:px-24 pb-8 sm:pb-12 lg:pb-0">
			{/* Responsive Background Images */}
			{/* Mobile/Portrait - loginbg.png */}
			<Image
				src="/bgimages/loginbg.png"
				alt="Machine background"
				fill
				priority
				quality={100}
				sizes="100vw"
				className="object-cover object-center lg:hidden"
			/>
			{/* Desktop - loginbgdesktop.png */}
			<Image
				src="/bgimages/loginbgdesktop.png"
				alt="Machine background"
				fill
				priority
				quality={100}
				sizes="100vw"
				className="object-cover object-center hidden lg:block"
			/>

			{/* Gradient overlay */}
			<div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70 lg:bg-gradient-to-r lg:from-black/60 lg:via-black/20 lg:to-transparent" />
			<div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-white/80 via-white/40 to-transparent blur-xl lg:hidden" />

			{/* Content Container - Bottom on mobile, Left-aligned on desktop */}
			<div className="relative z-10 w-full max-w-md lg:max-w-lg mx-auto lg:mx-0">
				<div className="w-full space-y-6 bg-white/5 backdrop-blur-xl rounded-2xl p-6 sm:p-8 lg:p-10 border border-orange-500/60 shadow-[0_0_30px_rgba(249,115,22,0.4)]">
					<div>
						<h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-orange-500">
							Welcome Back
						</h1>
						<p className="text-sm sm:text-base lg:text-lg text-white/80 mt-2">
							Sign in to your account
						</p>
					</div>

					<form onSubmit={handleLogin} className="space-y-4 lg:space-y-5">
						<div>
							<label className="block text-xs sm:text-sm lg:text-base font-medium text-white/90 mb-2">
								Email
							</label>
							<input
								type="email"
								className="w-full px-4 py-2.5 sm:py-3 lg:py-3.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none transition text-sm lg:text-base"
								placeholder="Enter your email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>

						<div>
							<label className="block text-xs sm:text-sm lg:text-base font-medium text-white/90 mb-2">
								Password
							</label>
							<input
								type="password"
								className="w-full px-4 py-2.5 sm:py-3 lg:py-3.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none transition text-sm lg:text-base"
								placeholder="Enter your password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
						</div>

						{error && (
							<div className="bg-red-500/20 backdrop-blur-sm text-red-200 px-3 py-2 rounded-lg text-xs sm:text-sm border border-red-500/30">
								{error}
							</div>
						)}

						<button
							type="submit"
							disabled={loading}
							className="w-3/5 lg:w-auto mx-auto block px-12 lg:px-16 bg-orange-500 text-white py-2.5 lg:py-3 rounded-lg font-semibold hover:bg-white hover:text-orange-500 transition-all duration-300 disabled:opacity-50 text-sm sm:text-base shadow-lg shadow-orange-500/30"
						>
							{loading ? "Signing in..." : "Sign In"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
