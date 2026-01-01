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
  Shield,
  Sparkles,
  ChevronRight,
  CheckCircle,
  Award,
  BarChart3,
  Smartphone,
  Cloud
} from "lucide-react";

export default function WelcomePage() {
  const [currentFeature, setCurrentFeature] = useState(0);
  
  const features = [
    {
      icon: <Dumbbell className="w-6 h-6" />,
      title: "Smart Workout Plans",
      description: "AI-powered workout routines tailored to your members' goals"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Member Management",
      description: "Track attendance, memberships, and payments effortlessly"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Growth Analytics",
      description: "Real-time insights to help your gym thrive"
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Goal Tracking",
      description: "Monitor member progress and celebrate achievements"
    }
  ];

  const stats = [
    { value: "24/7", label: "Access" },
    { value: "100+", label: "Gyms" },
    { value: "10K+", label: "Members" },
    { value: "99%", label: "Satisfaction" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 overflow-hidden ">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-60 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-1/4 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px),
                              linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
      </div>

      <main className="relative z-10 px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left Content */}
            <div className="flex-1 space-y-8 lg:space-y-12 pt-1 lg:pt-10">
              {/* Logo & Tagline */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Dumbbell className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-white">GymFlow</span>
                </div>
                
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-white/90">AI-Powered Gym Management</span>
                </div>
              </div>

              {/* Hero Text */}
              <div className="space-y-6">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight">
                  Transform Your<br />
                  <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                    Gym Management
                  </span>
                </h1>
                
                <p className="text-xl text-gray-300 max-w-2xl">
                  The complete solution for modern gyms. Manage members, track workouts, and grow your business with our intelligent platform.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/auth/login"
                  className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-blue-500/25 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <span>Get Started</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                
                <Link
                  href="#features"
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 active:scale-95 transition-all duration-300"
                >
                  Explore Features
                </Link>
              </div>
            </div>

            {/* Right Content - Feature Showcase */}
            <div className="flex-1 relative lg:pl-12">
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Smart Dashboard</h3>
                    <div className="flex space-x-1">
                      {features.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentFeature(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            currentFeature === idx 
                              ? "bg-blue-500 w-4" 
                              : "bg-white/30"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Feature Display */}
                  <div className="relative h-48 overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10">
                    <div className="absolute inset-0 p-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                            {features[currentFeature].icon}
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">
                              {features[currentFeature].title}
                            </h4>
                            <p className="text-sm text-gray-400">
                              {features[currentFeature].description}
                            </p>
                          </div>
                        </div>
                        
                        {/* Mock Dashboard Preview */}
                        <div className="grid grid-cols-3 gap-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-6 bg-gradient-to-r from-gray-700 to-gray-800 rounded animate-pulse"></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feature List */}
                  <div className="space-y-3">
                    {[
                      "Real-time member tracking",
                      "Automated billing & payments",
                      "Smart workout planning",
                      "Progress analytics"
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div id="features" className="pt-24 lg:pt-32 pb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Everything You Need to Succeed
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                From member management to advanced analytics, we've got you covered
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: <Calendar className="w-8 h-8" />,
                  title: "Attendance Tracking",
                  description: "QR-based check-ins, real-time monitoring",
                  color: "from-blue-500 to-blue-600"
                },
                {
                  icon: <BarChart3 className="w-8 h-8" />,
                  title: "Business Analytics",
                  description: "Revenue reports, growth insights",
                  color: "from-indigo-500 to-indigo-600"
                },
                {
                  icon: <Smartphone className="w-8 h-8" />,
                  title: "Mobile App",
                  description: "Member app for bookings & progress",
                  color: "from-purple-500 to-purple-600"
                },
                {
                  icon: <Clock className="w-8 h-8" />,
                  title: "Class Scheduling",
                  description: "Automated booking and reminders",
                  color: "from-pink-500 to-pink-600"
                },
                {
                  icon: <Award className="w-8 h-8" />,
                  title: "Goal Achievement",
                  description: "Track and celebrate member milestones",
                  color: "from-emerald-500 to-emerald-600"
                },
                {
                  icon: <Cloud className="w-8 h-8" />,
                  title: "Cloud Sync",
                  description: "Access data anywhere, anytime",
                  color: "from-cyan-500 to-cyan-600"
                }
              ].map((feature, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-blue-500/30 hover:scale-[1.02] transition-all duration-300 group"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-blue-500/25 transition-shadow`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 backdrop-blur-sm rounded-2xl p-8 lg:p-12 text-center border border-white/10 mt-12">
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-white">
                Ready to Transform Your Gym?
              </h2>
              <p className="text-gray-300 text-lg">
                Join thousands of successful gyms using our platform
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-blue-500/25 active:scale-95 transition-all duration-300"
              >
                <span>Start Free </span>
                <ChevronRight className="w-5 h-5" />
              </Link>
              
            </div>
          </div>

          {/* Footer */}
          <div className="pt-12 pb-8 text-center">
            <div className="text-gray-500 text-sm mb-2">
              © {new Date().getFullYear()} GymFlow • All rights reserved
            </div>
            <div className="text-gray-400 text-xs">
              Created by Shabiya Solutions
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}