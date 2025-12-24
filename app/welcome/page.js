"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-5">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl shadow-2xl">
        <div className="relative h-[720px] w-full">
          <Image
            src="/bgimages/welcome.png"
            alt="Welcome background"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />

          <div className="relative z-10 flex flex-col h-full justify-between p-6">
            <div className="flex items-center justify-between text-xs text-gray-100">
              <span>Welcome</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Online
              </span>
            </div>

            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-medium text-white/90 backdrop-blur">
                <span className="text-base">🤖</span>
                Your personal fitness AI assistant
              </div>

              <div>
                <h1 className="text-3xl font-bold leading-tight">Welcome to GymApp</h1>
                <p className="text-sm text-white/80 mt-2">
                  Track attendance, plans, and workouts with a tap.
                </p>
              </div>

              <Button
                className="w-full justify-center text-base py-3.5"
                variant="primary"
                asChild
              >
                <Link href="/auth/register">
                  Get Started <span className="ml-2">→</span>
                </Link>
              </Button>

              <p className="text-center text-sm text-white/80">
                Already have an account?{" "}
                <Link href="/auth/login" className="font-semibold underline">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

