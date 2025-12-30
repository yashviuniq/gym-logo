import React, { Suspense } from "react";
import EditMemberClient from "./EditMemberClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 pb-24">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      }
    >
      <EditMemberClient />
    </Suspense>
  );
}
