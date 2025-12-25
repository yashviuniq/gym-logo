"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

export default function WelcomePage() {
	return (
		<div className="relative w-full min-h-screen text-white flex items-center justify-center lg:justify-end px-4 sm:px-6 lg:px-16 xl:px-24">
			{/* Responsive Background Images */}
			{/* Mobile/Portrait - welcome.png */}
			<Image
				src="/bgimages/welcome.png"
				alt="Welcome background"
				fill
				priority
				quality={100}
				sizes="100vw"
				className="object-cover object-center lg:hidden"
			/>
			{/* Desktop - welcomedesktop.png */}
			<Image
				src="/bgimages/welcomedesktop.png"
				alt="Welcome background"
				fill
				priority
				quality={100}
				sizes="100vw"
				className="object-cover object-center hidden lg:block"
			/>

			{/* Gradient overlay */}
			<div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70 lg:bg-gradient-to-r lg:from-transparent lg:via-black/20 lg:to-black/60" />

			{/* Content Container - Centered on mobile, Right-aligned on desktop */}
			<div className="relative z-10 w-full max-w-md lg:max-w-xl mx-auto lg:mx-0 px-6 py-12 flex flex-col justify-start lg:justify-center items-center lg:items-start text-center lg:text-left space-y-8 sm:space-y-10 lg:space-y-12 min-h-screen lg:min-h-0">
				<div className="space-y-6 sm:space-y-8 lg:space-y-10 mt-12 lg:mt-0">
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 text-sm sm:text-base lg:text-lg font-medium text-white/90 backdrop-blur">
						<span className="text-xl sm:text-2xl lg:text-3xl">🤖</span>
						AI personal fitness assistant
					</div>

					<div className="space-y-4 lg:space-y-6">
						<h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
							Welcome to<br />GymApp
						</h1>
						<p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-white/90 font-light">
							Track attendance, plans, and workouts with a tap.
						</p>
					</div>

					<Link
						href="/auth/login"
						className="group inline-flex items-center justify-center w-full max-w-xs lg:max-w-sm text-base lg:text-lg py-3 lg:py-4 px-6 lg:px-8 rounded-lg font-semibold bg-orange-500 text-white hover:bg-white hover:text-orange-500 transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl"
					>
						Get Started
						<span className="ml-2 inline-block transition-transform duration-300 ease-in-out group-hover:translate-x-1">
							→
						</span>
					</Link>
				</div>
			</div>
		</div>
	);
}
