import Link from "next/link";

export default function Home() {
	return (
		<div className="aurora-shell min-h-screen px-6 py-10 md:px-10">
			<div className="mx-auto max-w-6xl space-y-8">
				<header className="fade-up glass-card-strong p-7 md:p-10">
					<p className="status-pill w-fit">Luxia Control Surface</p>
					<h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
						Sleek realtime operations for modern truth pipelines.
					</h1>
					<p className="mt-4 max-w-3xl text-sm text-[var(--ink-1)] md:text-base">
						Monitor platform health, approve onboarding, and run
						multi-client live claim simulations from one polished
						workflow.
					</p>
				</header>

				<section className="grid gap-5 md:grid-cols-2">
					<Link
						href="/admin"
						className="glass-card fade-up p-6 md:p-8"
					>
						<p className="status-pill w-fit">Live Monitoring</p>
						<h2 className="mt-3 text-2xl font-semibold">
							Admin Console
						</h2>
						<p className="mt-2 text-sm text-[var(--ink-1)]">
							Auto-updating overview, pending registrations, and
							audit activity without manual refresh.
						</p>
						<p className="mt-6 text-sm text-[var(--accent-a)]">
							Open admin workspace
						</p>
					</Link>

					<Link
						href="/client"
						className="glass-card fade-up p-6 md:p-8"
					>
						<p className="status-pill w-fit">Realtime Sessions</p>
						<h2 className="mt-3 text-2xl font-semibold">
							Client Lab
						</h2>
						<p className="mt-2 text-sm text-[var(--ink-1)]">
							Manage multiple real client identities, join rooms,
							send claims, and track isolated event streams.
						</p>
						<p className="mt-6 text-sm text-[var(--accent-b)]">
							Open client workspace
						</p>
					</Link>
				</section>

				<section className="glass-card fade-up p-6 md:p-8">
					<h3 className="text-lg font-semibold">Live Entry Points</h3>
					<div className="mt-4 grid gap-3 text-sm text-[var(--ink-1)] md:grid-cols-3">
						<div className="rounded-xl border border-white/20 bg-white/8 p-3">
							Platform governance
						</div>
						<div className="rounded-xl border border-white/20 bg-white/8 p-3">
							Client onboarding + approvals
						</div>
						<div className="rounded-xl border border-white/20 bg-white/8 p-3">
							Realtime claim streaming
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
