import Link from "next/link";

export default function Home() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-900 text-slate-100 p-8">
			<div className="max-w-4xl mx-auto space-y-8">
				<h1 className="text-5xl font-bold">Luxia Platform</h1>
				<p className="text-lg text-slate-300">
					Research-grade claim verification control plane and realtime
					client network.
				</p>
				<div className="grid md:grid-cols-2 gap-4">
					<Link
						href="/admin"
						className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 hover:border-cyan-400 transition-colors"
					>
						<h2 className="text-2xl font-semibold">
							Admin Console
						</h2>
						<p className="text-slate-300 mt-2">
							System overview, governance, onboarding approvals,
							and audit logs.
						</p>
					</Link>
					<Link
						href="/client"
						className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 hover:border-emerald-400 transition-colors"
					>
						<h2 className="text-2xl font-semibold">
							Client Portal
						</h2>
						<p className="text-slate-300 mt-2">
							Join your rooms, submit claims, and stream verdict
							updates in realtime.
						</p>
					</Link>
				</div>
			</div>
		</div>
	);
}
