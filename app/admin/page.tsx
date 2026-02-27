"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Overview = {
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
};

type RoomItem = {
	room_id: string;
	client_id: string;
	created_at: string;
};

type AuditLog = {
	id: string;
	created_at: string;
	action: string;
	target_type: string;
	target_id: string;
};

type PresenceState = {
	clientId: string;
	roomId: string;
	status: "connected" | "joined" | "disconnected";
	at: string;
};

const CONTROL_PLANE =
	process.env.NEXT_PUBLIC_CONTROL_PLANE_URL ??
	"https://luxia-backend-dyenfqbrc2etc2gq.uaenorth-01.azurewebsites.net";
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? "admin-token";
const APP_CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID ?? "client_demo";
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
	if (!res.ok) throw new Error(await res.text());
	return (await res.json()) as T;
}

export default function AdminPage() {
	const [overview, setOverview] = useState<Overview | null>(null);
	const [pending, setPending] = useState<PendingRegistration[]>([]);
	const [rooms, setRooms] = useState<RoomItem[]>([]);
	const [audit, setAudit] = useState<AuditLog[]>([]);
	const [presence, setPresence] = useState<Record<string, PresenceState>>({});
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [lastUpdated, setLastUpdated] = useState("");
	const lockRef = useRef(false);

	const refresh = useCallback(async () => {
		if (lockRef.current) return;
		lockRef.current = true;
		try {
			const [nextOverview, nextPending, nextRooms, nextAudit] =
				await Promise.all([
					api<Overview>("/v1/admin/system-overview"),
					api<{ items: PendingRegistration[] }>(
						"/v1/admin/client-registrations/pending"
					),
					api<{ items: RoomItem[] }>("/v1/client/rooms"),
					api<{ items: AuditLog[] }>("/v1/admin/audit-logs?limit=20"),
				]);
			setOverview(nextOverview);
			setPending(nextPending.items ?? []);
			setRooms(nextRooms.items ?? []);
			setAudit(nextAudit.items ?? []);
			setError("");
			setLastUpdated(new Date().toLocaleTimeString());
		} catch (e) {
			setError(`Refresh failed: ${String(e)}`);
		} finally {
			lockRef.current = false;
		}
	}, []);

	useEffect(() => {
		void refresh();
		const timer = window.setInterval(
			() => void refresh(),
			Math.max(POLL_INTERVAL_MS, 2000)
		);
		return () => window.clearInterval(timer);
	}, [refresh]);

	useEffect(() => {
		const channel = new BroadcastChannel("luxia-client-presence");
		channel.onmessage = (event: MessageEvent<PresenceState>) => {
			const payload = event.data;
			if (!payload?.clientId) return;
			setPresence((prev) => ({
				...prev,
				[payload.clientId]: payload,
			}));
		};
		return () => channel.close();
	}, []);

	const approve = async (item: PendingRegistration) => {
		const clientId = APP_CLIENT_ID;
		try {
			const out = await api<{ room_id: string; message: string }>(
				`/v1/client-registrations/${encodeURIComponent(item.id)}/approve`,
				{
					method: "POST",
					body: JSON.stringify({ client_id: clientId }),
				}
			);
			setMessage(`Approved ${out.room_id}. ${out.message}`);
			await refresh();
		} catch (e) {
			setMessage(`Approval failed: ${String(e)}`);
		}
	};

	const connectedClients = useMemo(
		() =>
			Object.values(presence).filter(
				(client) =>
					client.status === "connected" || client.status === "joined"
			),
		[presence]
	);

	return (
		<div className="aurora-shell min-h-screen px-6 py-8 md:px-10">
			<div className="mx-auto max-w-7xl space-y-5">
				<header className="glass-card-strong fade-up p-6 md:p-8">
					<p className="status-pill w-fit">Admin Workspace</p>
					<h1 className="mt-3 text-3xl font-semibold">
						Approve Rooms & Monitor Clients
					</h1>
					<p className="mt-2 text-sm text-[var(--ink-1)]">
						Last refresh: {lastUpdated || "initializing..."}
					</p>
					{error ? (
						<p className="mt-3 text-xs text-red-200">{error}</p>
					) : null}
					{message ? (
						<p className="mt-3 text-xs text-cyan-100">{message}</p>
					) : null}
				</header>

				<section className="grid gap-4 md:grid-cols-3">
					<div className="glass-card fade-up p-4 text-center">
						<p className="text-xs text-[var(--ink-2)]">
							Active Clients
						</p>
						<p className="mt-1 text-3xl font-semibold text-[var(--accent-a)]">
							{overview?.counts?.active_clients ?? 0}
						</p>
					</div>
					<div className="glass-card fade-up p-4 text-center">
						<p className="text-xs text-[var(--ink-2)]">Rooms</p>
						<p className="mt-1 text-3xl font-semibold text-[var(--accent-b)]">
							{overview?.counts?.rooms ?? 0}
						</p>
					</div>
					<div className="glass-card fade-up p-4 text-center">
						<p className="text-xs text-[var(--ink-2)]">Pending</p>
						<p className="mt-1 text-3xl font-semibold text-[var(--accent-c)]">
							{overview?.counts?.pending_registrations ?? 0}
						</p>
					</div>
				</section>

				<section className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
					<div className="glass-card fade-up p-4">
						<h2 className="text-lg font-semibold">
							Pending Room Requests
						</h2>
						<div className="mt-3 max-h-[28rem] space-y-2 overflow-auto">
							{pending.length === 0 ? (
								<p className="text-sm text-[var(--ink-1)]">
									No pending room requests.
								</p>
							) : (
								pending.map((item) => (
									<div
										key={item.id}
										className="rounded-lg border border-white/15 bg-white/8 p-3 transition hover:bg-white/12"
									>
										<p className="text-sm font-semibold">
											{item.requested_room_id}
										</p>
										<p className="mt-1 text-[11px] text-[var(--ink-2)]">
											Requested by {item.org_name}
										</p>
										<button
											className="surface-btn mt-2 w-full text-xs"
											onClick={() => void approve(item)}
										>
											Approve Room
										</button>
									</div>
								))
							)}
						</div>
					</div>

					<div className="space-y-5">
						<div className="glass-card fade-up p-4">
							<h2 className="text-lg font-semibold">
								Connected Clients
							</h2>
							<div className="mt-3 max-h-52 space-y-2 overflow-auto">
								{connectedClients.length === 0 ? (
									<p className="text-sm text-[var(--ink-1)]">
										No connected clients right now.
									</p>
								) : (
									connectedClients.map((c) => (
										<div
											key={`${c.clientId}-${c.at}`}
											className="rounded-lg border border-white/15 bg-black/20 p-2 text-xs"
										>
											<p className="font-semibold">
												{c.clientId}
											</p>
											<p>room: {c.roomId}</p>
											<p>
												status:{" "}
												<span className="uppercase">
													{c.status}
												</span>
											</p>
											<p className="text-[var(--ink-2)]">
												{new Date(
													c.at
												).toLocaleTimeString()}
											</p>
										</div>
									))
								)}
							</div>
						</div>

						<div className="glass-card fade-up p-4">
							<h2 className="text-lg font-semibold">
								Approved Rooms
							</h2>
							<div className="mt-3 max-h-52 space-y-2 overflow-auto">
								{rooms.length === 0 ? (
									<p className="text-sm text-[var(--ink-1)]">
										No approved rooms yet.
									</p>
								) : (
									rooms.map((room) => (
										<div
											key={room.room_id}
											className="rounded-lg border border-white/15 bg-black/20 p-2 text-xs"
										>
											<p className="font-semibold">
												{room.room_id}
											</p>
											<p>client: {room.client_id}</p>
										</div>
									))
								)}
							</div>
						</div>
					</div>
				</section>

				<section className="glass-card fade-up p-4">
					<h2 className="text-lg font-semibold">Recent Audit</h2>
					<div className="mt-3 max-h-48 space-y-2 overflow-auto text-xs">
						{audit.map((entry) => (
							<div
								key={entry.id}
								className="rounded-lg border border-white/15 bg-black/20 p-2"
							>
								<p className="text-[var(--ink-2)]">
									{entry.created_at}
								</p>
								<p>
									{entry.action} {"->"} {entry.target_type}:
									{entry.target_id}
								</p>
							</div>
						))}
					</div>
				</section>
			</div>
		</div>
	);
}
