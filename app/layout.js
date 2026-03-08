import "@/styles/globals.css";
import SupabaseProvider from "@/components/SupabaseProvider";

export const metadata = {
  title: "Guildscape",
  description: "Guildscape - Developer gamification platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}
