import BottomNav from "@/components/layout/BottomNav";

export default function CustomerLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f1efed] flex items-center justify-center py-0 md:py-8 font-sans">
      {/* Device framing / mobile container wrapper for responsive integrity */}
      <div className="mobile-view-container relative flex flex-col w-full min-h-screen md:min-h-[850px] md:h-[850px] max-w-md overflow-hidden">
        
        {/* Scrollable page body */}
        <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
          {children}
        </div>
        
        {/* Navigation pinned inside the relative shell */}
        <BottomNav role="customer" />
      </div>
    </div>
  );
}
