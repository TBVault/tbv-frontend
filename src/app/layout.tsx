import "./globals.css";

import SessionProvider from "@/components/SessionProvider";
import Header from "@/components/Header";

export const metadata = {
  title: "The Bhakti Vault",
  description: "H.G. Vaisesika Dasa's Lecture Archive",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <Header />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
