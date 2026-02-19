import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://collabboard.app"),
  title: {
    default: "CollabBoard",
    template: "%s | CollabBoard",
  },
  description: "Real-time collaborative whiteboard for teams",
  openGraph: {
    title: "CollabBoard",
    description: "Real-time collaborative whiteboard for teams",
    type: "website",
    siteName: "CollabBoard",
  },
  twitter: {
    card: "summary_large_image",
    title: "CollabBoard",
    description: "Real-time collaborative whiteboard for teams",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="h-full">
          <Toaster position="bottom-right" />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
