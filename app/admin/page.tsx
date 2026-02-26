"use client";

import { useState } from "react";

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

const CONTROL_PLANE =
	process.env.NEXT_PUBLIC_CONTROL_PLANE_URL ?? "http://localhost:8010";
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? "admin-token";

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
	const [audit, setAudit] = useState<Array<Record<string, string>>>([]);
	const [configKey, setConfigKey] = useState("DISPATCH_TIMEOUT_SECONDS");
	const [configValue, setConfigValue] = useState("180");
	const [reason, setReason] = useState("Operational tuning");
	const [registrationId, setRegistrationId] = useState("");
	const [clientId, setClientId] = useState("client_demo");
	const [roomId, setRoomId] = useState("room_demo");
	const [message, setMessage] = useState("");

	const refresh = async () => {
		try {
			setOverview(await api<Overview>("/v1/admin/system-overview"));
			const logs = await api<{ items: Array<Record<string, string>> }>(
				"/v1/admin/audit-logs?limit=20"
			);
			setAudit(logs.items);
		} catch (e) {
			setMessage(`Failed loading admin data: ${String(e)}`);
		}
	};

	return (
		<div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
			<h1 className="text-3xl font-bold">Luxia Admin Console</h1>
			<p className="text-slate-300">
				Platform operations, governance, and onboarding.
			</p>
			<button
				className="bg-slate-700 px-3 py-2 rounded"
				onClick={() => void refresh()}
			>
				Load Live Data
			</button>

			<section className="grid md:grid-cols-3 gap-4">
				<div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
					Active Clients: {overview?.counts?.active_clients ?? 0}
				</div>
				<div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
					Rooms: {overview?.counts?.rooms ?? 0}
				</div>
				<div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
					Pending Registrations:{" "}
					{overview?.counts?.pending_registrations ?? 0}
				</div>
			</section>

			<section className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
				<h2 className="text-xl">Config Center</h2>
				<div className="flex flex-col md:flex-row gap-2">
					<input
						className="bg-slate-800 p-2 rounded"
						value={configKey}
						onChange={(e) => setConfigKey(e.target.value)}
					/>
					<input
						className="bg-slate-800 p-2 rounded"
						value={configValue}
						onChange={(e) => setConfigValue(e.target.value)}
					/>
					<input
						className="bg-slate-800 p-2 rounded"
						value={reason}
						onChange={(e) => setReason(e.target.value)}
					/>
					<button
						className="bg-cyan-600 px-3 rounded"
						onClick={async () => {
							await api("/v1/admin/config", {
								method: "PATCH",
								body: JSON.stringify({
									key: configKey,
									value: configValue,
									reason,
								}),
							});
							setMessage("Config updated");
							await refresh();
						}}
					>
						Apply
					</button>
				</div>
			</section>

			<section className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
				<h2 className="text-xl">Client Registration Approval</h2>
				<div className="flex flex-col md:flex-row gap-2">
					<input
						className="bg-slate-800 p-2 rounded"
						placeholder="registration_id"
						value={registrationId}
						onChange={(e) => setRegistrationId(e.target.value)}
					/>
					<input
						className="bg-slate-800 p-2 rounded"
						placeholder="client_id"
						value={clientId}
						onChange={(e) => setClientId(e.target.value)}
					/>
					<input
						className="bg-slate-800 p-2 rounded"
						placeholder="initial_room_id"
						value={roomId}
						onChange={(e) => setRoomId(e.target.value)}
					/>
					<button
						className="bg-emerald-600 px-3 rounded"
						onClick={async () => {
							const out = await api<{ room_secret: string }>(
								`/v1/client-registrations/${registrationId}/approve`,
								{
									method: "POST",
									body: JSON.stringify({
										client_id: clientId,
										initial_room_id: roomId,
									}),
								}
							);
							setMessage(
								`Approved. Initial room secret: ${out.room_secret}`
							);
							await refresh();
						}}
					>
						Approve
					</button>
				</div>
			</section>

			<section className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
				<h2 className="text-xl mb-2">Audit Logs</h2>
				<div className="space-y-2 max-h-80 overflow-auto text-sm">
					{audit.map((item) => (
						<div
							key={item.id}
							className="border border-slate-800 rounded p-2"
						>
							{item.created_at} | {item.action} |{" "}
							{item.target_type}:{item.target_id}
						</div>
					))}
				</div>
			</section>

			{message ? <p className="text-cyan-300">{message}</p> : null}
		</div>
	);
}
