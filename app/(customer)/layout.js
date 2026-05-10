import BottomNav from "@/components/layout/BottomNav";

export default function CustomerLayout({ children }) {
  return (
    <div>
      {children}
      <BottomNav role="customer" />
    </div>
  );
}
