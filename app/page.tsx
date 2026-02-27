import Link from "next/link";

export default function Home() {
	return (
		<div className="aurora-shell min-h-screen px-6 py-10 md:px-10">
			<div className="mx-auto max-w-5xl space-y-6">
				<header className="glass-card-strong p-8 md:p-10">
					<p className="status-pill w-fit">Luxia Workflow</p>
					<h1 className="mt-3 text-4xl font-semibold">
						Choose Workspace
					</h1>
					<p className="mt-2 text-sm text-[var(--ink-1)]">
						Use Admin to approve new room requests and monitor
						client presence. Use Client to register a room and post
						after approval.
					</p>
				</header>
				<section className="grid gap-4 md:grid-cols-2">
					<Link
						href="/admin"
						className="glass-card p-6 transition hover:bg-white/12"
					>
						<p className="status-pill w-fit">Operations</p>
						<h2 className="mt-3 text-2xl font-semibold">
							Admin Page
						</h2>
						<p className="mt-2 text-sm text-[var(--ink-1)]">
							Approve pending rooms and monitor active client
							connections.
						</p>
					</Link>
					<Link
						href="/client"
						className="glass-card p-6 transition hover:bg-white/12"
					>
						<p className="status-pill w-fit">Onboarding</p>
						<h2 className="mt-3 text-2xl font-semibold">
							Client Page
						</h2>
						<p className="mt-2 text-sm text-[var(--ink-1)]">
							Register a room first, wait for admin approval, then
							connect and post.
						</p>
					</Link>
				</section>
			</div>
		</div>
	);
}
