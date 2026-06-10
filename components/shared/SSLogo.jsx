"use client";

export default function SSLogo({ size = "md", showWordmark = true, className = "" }) {
  const sizes = {
    sm: "w-11 h-11 text-base",
    md: "w-14 h-14 text-xl",
    lg: "w-20 h-20 text-3xl",
  };

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className={`${sizes[size] || sizes.md} relative grid place-items-center`}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full drop-shadow-[0_16px_30px_rgba(240,129,61,0.28)]">
          <polygon
            points="50 3 91 26.5 91 73.5 50 97 9 73.5 9 26.5"
            fill="#1a1c1c"
            stroke="#f0813d"
            strokeWidth="4"
          />
          <polygon
            points="50 13 82 31.5 82 68.5 50 87 18 68.5 18 31.5"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.16"
            strokeWidth="2"
          />
          <path
            d="M30 35H56C62 35 66 38.5 66 44C66 50 61.5 53 55 53H44C39 53 36 55 36 59C36 63 39.5 65 45 65H70"
            fill="none"
            stroke="#f0813d"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M70 35H44C38 35 34 38.5 34 44C34 50 38.5 53 45 53H56C61 53 64 55 64 59C64 63 60.5 65 55 65H30"
            fill="none"
            stroke="#ffffff"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {showWordmark && (
        <div className="leading-none">
          <div className="text-xl font-black tracking-[0.18em] text-white">SS</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[#f0813d]">
            Fitness
          </div>
        </div>
      )}
    </div>
  );
}
