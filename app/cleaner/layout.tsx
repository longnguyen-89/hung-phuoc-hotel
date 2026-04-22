export const metadata = {
  title: "Cleaner — Hưng Phước Hotel",
  manifest: "/manifest.webmanifest",
  themeColor: "#65a30d",
};

export default function CleanerRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-brand-50">{children}</div>;
}
