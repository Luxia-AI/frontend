import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Luxia AI - Truth through Knowledge and Retrieval",
	description:
		"A Hybrid RAG-Based Framework for Real-Time Fact Verification in Social Media Using Knowledge Graphs and Vector Embeddings",
	icons: {
		icon: "/luxia.ico",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<head>
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<meta
					name="description"
					content="A Hybrid RAG-Based Framework for Real-Time Fact Verification in Social Media Using Knowledge Graphs and Vector Embeddings"
				/>
				<title>Luxia AI - Truth through Knowledge and Retrieval</title>
				<link rel="icon" href="/favicon.ico" sizes="any" />
			</head>
			<body
				className="text-lg antialiased"
				style={{
					WebkitFontSmoothing: "antialiased",
					MozOsxFontSmoothing: "grayscale",
					textRendering: "optimizeLegibility",
				}}
			>
				{children}
			</body>
		</html>
	);
}
