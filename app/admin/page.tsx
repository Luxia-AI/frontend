"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Overview = {
	health?: Record<
		string,
		{ ok: boolean; status_code?: number; error?: string }
	>;
	counts?: {
		active_clients: number;
		rooms: number;
		pending_registrations: number;
	};
};

type PendingRegistration = {
	id: string;
	org_name: string;
	contact_email: string;
	requested_room_id: string;
	created_at: string;
};

type AuditLog = {
	id: string;
	created_at: string;
	action: string;
	target_type: string;
	target_id: string;
};

const CONTROL_PLANE =
	process.env.NEXT_PUBLIC_CONTROL_PLANE_URL ??
	"https://luxia-backend-dyenfqbrc2etc2gq.uaenorth-01.azurewebsites.net";
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? "admin-token";
const POLL_INTERVAL_MS = Number(
	process.env.NEXT_PUBLIC_POLL_INTERVAL_MS ?? "5000"
);

async function api<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${CONTROL_PLANE}${path}`, {
		...init,
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${ADMIN_TOKEN}`,
			...(init?.headers ?? {}),
		},
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return (await res.json()) as T;
}

export default function AdminPage() {
	const [overview, setOverview] = useState<Overview | null>(null);
	const [pending, setPending] = useState<PendingRegistration[]>([]);
	const [audit, setAudit] = useState<AuditLog[]>([]);
	const [registrationId, setRegistrationId] = useState("");
	const [clientId, setClientId] = useState("client_demo");
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [lastUpdated, setLastUpdated] = useState<string>("");
	const [isLoading, setIsLoading] = useState(true);
	const inFlightRef = useRef(false);

	const refresh = useCallback(async () => {
		if (inFlightRef.current) {
			return;
		}
		inFlightRef.current = true;
		try {
			const [nextOverview, nextPending, nextAudit] = await Promise.all([
				api<Overview>("/v1/admin/system-overview"),
				api<{ items: PendingRegistration[] }>(
					"/v1/admin/client-registrations/pending"
				),
				api<{ items: AuditLog[] }>("/v1/admin/audit-logs?limit=25"),
			]);
			setOverview(nextOverview);
			setPending(nextPending.items ?? []);
			setAudit(nextAudit.items ?? []);
			setLastUpdated(new Date().toLocaleTimeString());
			setError("");
		} catch (e) {
			setError(`Live refresh failed: ${String(e)}`);
		} finally {
			inFlightRef.current = false;
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
		const timer = window.setInterval(
			() => {
				void refresh();
			},
			Math.max(POLL_INTERVAL_MS, 2000)
		);
		return () => window.clearInterval(timer);
	}, [refresh]);

	const healthSummary = useMemo(() => {
		const health = overview?.health ?? {};
		const values = Object.values(health);
		if (values.length === 0) return "No service telemetry";
		const ok = values.filter((v) => v.ok).length;
		return `${ok}/${values.length} services healthy`;
	}, [overview?.health]);

	return (
		<div className="aurora-shell min-h-screen px-6 py-8 md:px-10">
			<div className="mx-auto max-w-7xl space-y-6">
				<header className="glass-card-strong fade-up p-6 md:p-8">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="status-pill w-fit">
								Admin Command Center
							</p>
							<h1 className="mt-3 text-3xl font-semibold md:text-4xl">
								Live platform operations
							</h1>
						</div>
						<div className="text-right text-xs text-[var(--ink-1)]">
							<p>
								Auto-updating every{" "}
								{Math.max(POLL_INTERVAL_MS, 2000) / 1000}s
							</p>
							<p>
								Last refresh: {lastUpdated || "initializing..."}
							</p>
						</div>
					</div>
					<p className="mt-4 text-sm text-[var(--ink-1)]">
						{healthSummary}
					</p>
					{error ? (
						<p className="mt-3 rounded-lg border border-red-300/40 bg-red-300/12 px-3 py-2 text-sm text-red-100">
							{error}
						</p>
					) : null}
					{message ? (
						<p className="mt-3 rounded-lg border border-cyan-200/40 bg-cyan-300/12 px-3 py-2 text-sm text-cyan-100">
							{message}
						</p>
					) : null}
				</header>

				<section className="grid gap-4 md:grid-cols-3">
					{[
						{
							label: "Active Clients",
							value: overview?.counts?.active_clients ?? 0,
							tone: "text-[var(--accent-a)]",
						},
						{
							label: "Rooms",
							value: overview?.counts?.rooms ?? 0,
							tone: "text-[var(--accent-b)]",
						},
						{
							label: "Pending Registrations",
							value: overview?.counts?.pending_registrations ?? 0,
							tone: "text-[var(--accent-c)]",
						},
					].map((item) => (
						<div
							key={item.label}
							className="glass-card fade-up p-5"
						>
							<p className="text-xs uppercase tracking-wide text-[var(--ink-2)]">
								{item.label}
							</p>
							<p
								className={`mt-3 text-4xl font-semibold ${item.tone}`}
							>
								{isLoading ? "..." : item.value}
							</p>
						</div>
					))}
				</section>

				<section className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
					<div className="glass-card fade-up p-5">
						<div className="flex items-center justify-between">
							<h2 className="text-lg font-semibold">
								Pending Registrations
							</h2>
							<span className="status-pill">
								{pending.length} queued
							</span>
						</div>
						<div className="mt-4 space-y-3">
							{pending.length === 0 ? (
								<p className="text-sm text-[var(--ink-1)]">
									No pending registration requests.
								</p>
							) : (
								pending.map((reg) => (
									<div
										key={reg.id}
										className="rounded-xl border border-white/20 bg-white/8 p-3 transition hover:bg-white/12"
									>
										<p className="text-sm font-medium">
											{reg.org_name}
										</p>
										<p className="text-xs text-[var(--ink-1)]">
											{reg.contact_email}
										</p>
										<p className="mt-1 text-xs text-[var(--ink-1)]">
											room: {reg.requested_room_id}
										</p>
										<p className="mt-1 break-all text-[11px] text-[var(--ink-2)]">
											{reg.id}
										</p>
										<button
											className="surface-btn secondary mt-3 text-sm"
											onClick={() => {
												setRegistrationId(reg.id);
												setClientId(
													reg.requested_room_id.replace(
														/-+/g,
														"_"
													) + "_client"
												);
											}}
										>
											Use This Request
										</button>
									</div>
								))
							)}
						</div>
					</div>

					<div className="glass-card fade-up p-5">
						<h2 className="text-lg font-semibold">
							Approve Registration
						</h2>
						<p className="mt-1 text-sm text-[var(--ink-1)]">
							Create real client + room activation.
						</p>
						<div className="mt-4 space-y-3">
							<input
								className="surface-input"
								placeholder="registration_id"
								value={registrationId}
								onChange={(e) =>
									setRegistrationId(e.target.value)
								}
							/>
							<input
								className="surface-input"
								placeholder="client_id"
								value={clientId}
								onChange={(e) => setClientId(e.target.value)}
							/>
							<button
								className="surface-btn w-full"
								onClick={async () => {
									const id = registrationId.trim();
									if (!id) {
										setMessage(
											"Registration ID is required."
										);
										return;
									}
									try {
										const out = await api<{
											room_id: string;
											message: string;
										}>(
											`/v1/client-registrations/${encodeURIComponent(id)}/approve`,
											{
												method: "POST",
												body: JSON.stringify({
													client_id: clientId.trim(),
												}),
											}
										);
										setMessage(
											`Approved ${out.room_id}. ${out.message}`
										);
										await refresh();
									} catch (e) {
										setMessage(
											`Approval failed: ${String(e)}`
										);
									}
								}}
							>
								Approve & Activate
							</button>
						</div>
						<div className="mt-6">
							<h3 className="text-sm font-semibold text-[var(--ink-1)]">
								Recent Audit Activity
							</h3>
							<div className="mt-3 max-h-[20rem] space-y-2 overflow-auto pr-1">
								{audit.map((entry) => (
									<div
										key={entry.id}
										className="rounded-lg border border-white/15 bg-black/20 p-2 text-xs"
									>
										<p className="text-[var(--ink-1)]">
											{entry.created_at}
										</p>
										<p>
											{entry.action} {"->"}{" "}
											{entry.target_type}:
											{entry.target_id}
										</p>
									</div>
								))}
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
