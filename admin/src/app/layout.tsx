import type { Metadata } from "next";
import { AppChrome } from "./components/AppChrome";
import { getAdminSession } from "@/lib/admin-auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "TapAddis Admin",
  description: "Closed-loop transit demo dashboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAdminSession();

  return (
    <html lang="en">
      <body>
        <AppChrome session={session}>{children}</AppChrome>
      </body>
    </html>
  );
}
