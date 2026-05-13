import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata = {
	title: "Gym Management App",
	description: "Gym Management PWA",
	manifest: "/manifest.json",
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "GymApp",
	},
	icons: {
		icon: [
			{ url: "/icons/landing-screen.png", sizes: "540x720", type: "image/png" },
			{ url: "/icons/landing-screen.png", sizes: "16x16", type: "image/png" },
			{ url: "/icons/landing-screen.png", sizes: "32x32", type: "image/png" },
			{ url: "/icons/landing-screen.png", sizes: "96x96", type: "image/png" },
			{ url: "/icons/landing-screen.png", sizes: "192x192", type: "image/png" },
			{ url: "/icons/landing-screen.png", sizes: "512x512", type: "image/png" },
		],
		apple: [
			{ url: "/icons/landing-screen.png", sizes: "540x720", type: "image/png" },
		],
	},
};

export const viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: "cover",
	themeColor: "#000000",
};

export default function RootLayout({ children }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				suppressHydrationWarning
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<ClientProviders>
					{children}
				</ClientProviders>
			</body>
		</html>
	);
}
