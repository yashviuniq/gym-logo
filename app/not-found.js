"use client";

import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="relative w-64 h-64 mx-auto">
          <Image
            src="/notfound/silver-padlock-with-hole-middle-that-says-lock_899894-27949.png"
            alt="Page not found"
            fill
            className="object-contain drop-shadow-md"
            priority
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
          <p className="text-gray-600 mt-2">
            The page you are looking for doesn&apos;t exist or was moved.
          </p>
        </div>
        <Link
          href="/"
          className="inline-block px-5 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

