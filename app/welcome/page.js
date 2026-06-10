"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Dumbbell,
  Users,
  TrendingUp,
  Target,
  Calendar,
  Clock,
  Sparkles,
  ChevronRight,
  CheckCircle,
  Award,
  BarChart3,
  Smartphone,
  Cloud,
} from "lucide-react";
import SSLogo from "@/components/shared/SSLogo";

export default function WelcomePage() {
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = [
    {
      icon: <Dumbbell className="h-6 w-6" />,
      title: "Smart Workout Plans",
      description: "Workout routines tailored to member goals and trainer flow.",
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Member Management",
      description: "Attendance, memberships, dues, and profiles in one command center.",
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Growth Analytics",
      description: "Revenue and retention signals built for fast daily decisions.",
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Goal Tracking",
      description: "Progress, streaks, points, and milestones for every member.",
    },
  ];

  const stats = [
    { value: "24/7", label: "Access" },
    { value: "100+", label: "Gyms" },
    { value: "10K+", label: "Members" },
    { value: "99%", label: "Satisfaction" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [features.length]);

  return (
    <div className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{ backgroundImage: "url('/bgimages/loginbgdesktop.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#050505_0%,rgba(5,5,5,0.94)_36%,rgba(5,5,5,0.72)_64%,rgba(5,5,5,0.92)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_22%,rgba(240,129,61,0.24),transparent_28%),linear-gradient(180deg,rgba(5,5,5,0.35),#050505_92%)]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px),
                              linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      <main className="relative z-10">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <SSLogo size="md" />
          <Link
            href="/auth/login"
            className="rounded-full border border-white/15 bg-white/8 px-5 py-2 text-sm font-bold text-white backdrop-blur-md transition hover:border-[#f0813d]/70 hover:text-[#f0813d]"
          >
            Login
          </Link>
        </nav>

        <section className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:pb-20">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#f0813d]/30 bg-[#f0813d]/10 px-4 py-2 text-sm font-bold text-[#f0813d] backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Premium Gym Operating System
            </div>

            <h1 className="text-5xl font-black leading-[0.95] tracking-normal text-white sm:text-6xl lg:text-7xl">
              Command your gym with
              <span className="block text-[#f0813d]">SS precision.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72 sm:text-xl">
              A polished control room for memberships, attendance, trainers, payments, and member progress.
              Built for gyms that want speed, clarity, and a premium brand feel from the first screen.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/login"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#f0813d] px-7 py-4 text-sm font-black uppercase tracking-[0.16em] text-black shadow-[0_18px_42px_rgba(240,129,61,0.28)] transition hover:bg-white active:scale-95"
              >
                Enter Dashboard
                <ChevronRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-white/14 bg-white/8 px-7 py-4 text-sm font-bold text-white backdrop-blur transition hover:border-white/30 hover:bg-white/12 active:scale-95"
              >
                View System
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="border-l border-[#f0813d]/60 bg-white/[0.04] px-4 py-3">
                  <div className="text-2xl font-black text-white">{stat.value}</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/45">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[28px] border border-white/12 bg-[#0d0d0d]/82 shadow-[0_28px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f0813d]">Live Overview</p>
                    <h2 className="mt-1 text-xl font-black text-white">SS Command Deck</h2>
                  </div>
                  <SSLogo size="sm" showWordmark={false} />
                </div>
              </div>

              <div className="space-y-5 p-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ["Revenue", "$48.2K"],
                    ["Members", "1,284"],
                    ["Check-ins", "326"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
                      <p className="text-xs font-bold text-white/45">{label}</p>
                      <p className="mt-2 text-xl font-black text-white">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-[#f0813d]/20 bg-[#f0813d]/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#1a1c1c] text-white">
                      {features[currentFeature].icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-white">{features[currentFeature].title}</h3>
                      <p className="mt-1 text-sm leading-6 text-white/60">{features[currentFeature].description}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-1.5">
                    {features.map((_, idx) => (
                      <button
                        key={idx}
                        aria-label={`Show feature ${idx + 1}`}
                        onClick={() => setCurrentFeature(idx)}
                        className={`h-1.5 rounded-full transition-all ${
                          currentFeature === idx ? "w-8 bg-[#f0813d]" : "w-4 bg-white/18"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid gap-3">
                  {[
                    "Real-time attendance and member status",
                    "Billing, renewals, and payment intelligence",
                    "Trainer, diet, workout, and progress control",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                      <CheckCircle className="h-5 w-5 text-[#f0813d]" />
                      <span className="text-sm font-semibold text-white/78">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-white/10 bg-[#080808] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#f0813d]">Built for daily control</p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Everything stays sharp, fast, and on brand.</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                [Calendar, "Attendance Tracking", "QR check-ins and live monitoring"],
                [BarChart3, "Business Analytics", "Revenue, dues, growth, and retention"],
                [Smartphone, "Member App", "Progress, bookings, and updates"],
                [Clock, "Class Scheduling", "Trainer calendars and session flow"],
                [Award, "Achievement Engine", "Goals, streaks, points, and motivation"],
                [Cloud, "Cloud Sync", "Every team role stays aligned"],
              ].map(([Icon, title, description]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-[#f0813d]/40 hover:bg-white/[0.055]">
                  <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-[#1a1c1c] text-white ring-1 ring-white/10">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-black text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 bg-[#050505] px-4 py-8 text-center text-xs text-white/38">
          <p>(c) {new Date().getFullYear()} SS Fitness. All rights reserved.</p>
          <p className="mt-1">Created by Shabiya Solutions</p>
        </footer>
      </main>
    </div>
  );
}
