"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

export default function WelcomePage() {
	return (
		<div className="relative w-full min-h-screen text-white flex items-center justify-center px-4 sm:px-6 lg:px-8">
			{/* Full Background Image */}
			<Image
				src="/bgimages/welcome.png"
				alt="Welcome background"
				fill
				priority
				quality={100}
				className="object-cover"
			/>

			{/* Gradient overlay */}
			<div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />

			{/* Content Container */}
			<div className="relative z-10 w-full max-w-md mx-auto px-6 py-12 flex flex-col justify-center items-center text-center space-y-8 sm:space-y-10">
				<div className="space-y-6 sm:space-y-8">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs sm:text-sm font-medium text-white/90 backdrop-blur">
						<span className="text-lg sm:text-xl">🤖</span>
						AI personal fitness assistant
					</div>

					<div className="space-y-3">
						<h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
							Welcome to GymApp
						</h1>
						<p className="text-sm sm:text-base text-white/80">
							Track attendance, plans, and workouts with a tap.
						</p>
					</div>

					<Button
						className="w-full max-w-xs justify-center text-base py-3"
						variant="primary"
						asChild
					>
						<Link href="/auth/login">
							Get Started <span className="ml-2">→</span>
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
