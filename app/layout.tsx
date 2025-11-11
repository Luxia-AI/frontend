import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Luxia AI Research Project",
	description: "Truth through Knowledge and Retrieval",
};

export const viewport: Viewport = {
	colorScheme: "light dark",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning={true} className="dark">
			<body className="antialiased">{children}</body>
		</html>
	);
}
