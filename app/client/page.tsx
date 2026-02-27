"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type ConnectionState = "disconnected" | "connected" | "joined" | "error";

type ClientProfile = {
	id: string;
	label: string;
	clientId: string;
	accessToken: string;
	roomId: string;
	joinPassword: string;
	connectionState: ConnectionState;
};

type ClientSessionLog = {
	ts: string;
	text: string;
	kind: "system" | "auth" | "worker";
};

type RegistrationForm = {
	orgName: string;
	contactEmail: string;
	roomId: string;
	roomPassword: string;
};

const CONTROL_PLANE =
	process.env.NEXT_PUBLIC_CONTROL_PLANE_URL ??
	"https://luxia-backend-dyenfqbrc2etc2gq.uaenorth-01.azurewebsites.net";
const SOCKET_URL =
	process.env.NEXT_PUBLIC_SOCKET_URL ??
	"https://luxia-backend-dyenfqbrc2etc2gq.uaenorth-01.azurewebsites.net";

function safeParsePresets(): ClientProfile[] {
	const raw = process.env.NEXT_PUBLIC_CLIENT_PRESETS;
	if (!raw) {
		return [
			{
				id: crypto.randomUUID(),
				label: "Demo Client",
				clientId: "client_demo",
				accessToken: "client-operator-token",
				roomId: "room-demo",
				joinPassword: "ChangeMe123!",
				connectionState: "disconnected",
			},
		];
	}
	try {
		const parsed = JSON.parse(raw) as Array<Record<string, string>>;
		return parsed.map((item, idx) => ({
			id: crypto.randomUUID(),
			label: item.label || `Client ${idx + 1}`,
			clientId: item.clientId || "",
			accessToken: item.accessToken || "",
			roomId: item.roomId || "",
			joinPassword: item.joinPassword || "",
			connectionState: "disconnected",
		}));
	} catch {
		return [];
	}
}

export default function ClientPage() {
	const initialProfiles = useMemo(() => safeParsePresets(), []);
	const [profiles, setProfiles] = useState<ClientProfile[]>(initialProfiles);
	const [selectedProfileId, setSelectedProfileId] = useState<string>(
		initialProfiles[0]?.id ?? ""
	);
	const [claim, setClaim] = useState(
		"Vitamin C cures common cold instantly."
	);
	const [registration, setRegistration] = useState<RegistrationForm>({
		orgName: "",
		contactEmail: "",
		roomId: "",
		roomPassword: "",
	});
	const [registrationMessage, setRegistrationMessage] = useState("");
	const [logsByProfile, setLogsByProfile] = useState<
		Record<string, ClientSessionLog[]>
	>({});
	const socketsRef = useRef<Record<string, Socket>>({});

	const selectedProfile = useMemo(
		() => profiles.find((p) => p.id === selectedProfileId) ?? null,
		[profiles, selectedProfileId]
	);

	useEffect(() => {
		return () => {
			Object.values(socketsRef.current).forEach((socket) =>
				socket.disconnect()
			);
			socketsRef.current = {};
		};
	}, []);

	const appendLog = (profileId: string, entry: ClientSessionLog) => {
		setLogsByProfile((prev) => {
			const bucket = prev[profileId] ?? [];
			return {
				...prev,
				[profileId]: [entry, ...bucket].slice(0, 200),
			};
		});
	};

	const updateProfile = (id: string, patch: Partial<ClientProfile>) => {
		setProfiles((prev) =>
			prev.map((profile) =>
				profile.id === id ? { ...profile, ...patch } : profile
			)
		);
	};

	const addProfile = () => {
		const newProfile: ClientProfile = {
			id: crypto.randomUUID(),
			label: `Client ${profiles.length + 1}`,
			clientId: "",
			accessToken: "",
			roomId: "",
			joinPassword: "",
			connectionState: "disconnected",
		};
		setProfiles((prev) => [newProfile, ...prev]);
		setSelectedProfileId(newProfile.id);
	};

	const removeProfile = (id: string) => {
		const socket = socketsRef.current[id];
		if (socket) {
			socket.disconnect();
			delete socketsRef.current[id];
		}
		setProfiles((prev) => {
			const nextProfiles = prev.filter((profile) => profile.id !== id);
			if (selectedProfileId === id) {
				setSelectedProfileId(nextProfiles[0]?.id ?? "");
			}
			return nextProfiles;
		});
	};

	const connectProfile = (profile: ClientProfile) => {
		const existing = socketsRef.current[profile.id];
		if (existing?.connected) {
			return;
		}
		const socket = io(SOCKET_URL, {
			path: "/socket.io",
			transports: ["websocket"],
		});
		socketsRef.current[profile.id] = socket;
		socket.on("connect", () => {
			updateProfile(profile.id, { connectionState: "connected" });
			appendLog(profile.id, {
				ts: new Date().toISOString(),
				kind: "system",
				text: `connected sid=${socket.id}`,
			});
		});
		socket.on("disconnect", () => {
			updateProfile(profile.id, { connectionState: "disconnected" });
			appendLog(profile.id, {
				ts: new Date().toISOString(),
				kind: "system",
				text: "disconnected",
			});
		});
		socket.on("join_room_success", (data) => {
			updateProfile(profile.id, { connectionState: "joined" });
			appendLog(profile.id, {
				ts: new Date().toISOString(),
				kind: "system",
				text: `join ok ${JSON.stringify(data)}`,
			});
		});
		socket.on("auth_error", (data: { message?: string; code?: string }) => {
			updateProfile(profile.id, { connectionState: "error" });
			appendLog(profile.id, {
				ts: new Date().toISOString(),
				kind: "auth",
				text: `auth error ${data.message ?? data.code ?? "unknown"}`,
			});
		});
		socket.on("worker_update", (data) => {
			appendLog(profile.id, {
				ts: new Date().toISOString(),
				kind: "worker",
				text: `worker_update ${JSON.stringify(data)}`,
			});
		});
	};

	const joinRoom = (profile: ClientProfile) => {
		const socket = socketsRef.current[profile.id];
		if (!socket?.connected) {
			appendLog(profile.id, {
				ts: new Date().toISOString(),
				kind: "auth",
				text: "connect socket first",
			});
			return;
		}
		socket.emit("join_room", {
			room_id: profile.roomId.trim(),
			client_id: profile.clientId.trim(),
			access_token: profile.accessToken.trim(),
			password: profile.joinPassword,
		});
	};

	const disconnectProfile = (profileId: string) => {
		const socket = socketsRef.current[profileId];
		if (socket) {
			socket.disconnect();
			delete socketsRef.current[profileId];
		}
		updateProfile(profileId, { connectionState: "disconnected" });
	};

	const sendClaim = () => {
		if (!selectedProfile || selectedProfile.connectionState !== "joined") {
			return;
		}
		const socket = socketsRef.current[selectedProfile.id];
		if (!socket?.connected) {
			return;
		}
		socket.emit("post_message", {
			room_id: selectedProfile.roomId.trim(),
			client_id: selectedProfile.clientId.trim(),
			access_token: selectedProfile.accessToken.trim(),
			client_claim_id: crypto.randomUUID(),
			claim,
		});
	};

	const createRegistration = async () => {
		try {
			const res = await fetch(
				`${CONTROL_PLANE}/v1/client-registrations`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						org_name: registration.orgName.trim(),
						contact_email: registration.contactEmail.trim(),
						room_id: registration.roomId.trim().toLowerCase(),
						room_password: registration.roomPassword,
					}),
				}
			);
			const payload = (await res.json()) as {
				id?: string;
				status?: string;
				detail?: string;
			};
			if (!res.ok) {
				setRegistrationMessage(payload.detail ?? "Registration failed");
				return;
			}
			setRegistrationMessage(
				`Registration submitted: ${payload.id ?? "unknown"} (${payload.status ?? "pending"})`
			);
		} catch (e) {
			setRegistrationMessage(`Registration failed: ${String(e)}`);
		}
	};

	return (
		<div className="aurora-shell min-h-screen px-5 py-8 md:px-8">
			<div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[320px_1fr]">
				<aside className="glass-card fade-up p-4">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold">
							Client Sessions
						</h2>
						<button
							className="surface-btn text-sm"
							onClick={addProfile}
						>
							New
						</button>
					</div>
					<div className="mt-4 space-y-2">
						{profiles.map((profile) => (
							<button
								key={profile.id}
								className={`w-full rounded-xl border p-3 text-left transition ${
									selectedProfileId === profile.id
										? "border-cyan-200/60 bg-cyan-200/10"
										: "border-white/15 bg-white/6 hover:bg-white/10"
								}`}
								onClick={() => setSelectedProfileId(profile.id)}
							>
								<div className="flex items-center justify-between gap-2">
									<p className="truncate text-sm font-semibold">
										{profile.label}
									</p>
									<span className="status-pill capitalize">
										{profile.connectionState}
									</span>
								</div>
								<p className="mt-1 truncate text-xs text-[var(--ink-1)]">
									{profile.clientId || "no client_id"}
								</p>
								<div className="mt-2 flex gap-2">
									<button
										className="surface-btn secondary text-xs"
										onClick={(e) => {
											e.stopPropagation();
											removeProfile(profile.id);
										}}
									>
										Remove
									</button>
								</div>
							</button>
						))}
					</div>
				</aside>

				<main className="space-y-5">
					<section className="glass-card-strong fade-up p-5 md:p-6">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p className="status-pill w-fit">
									Realtime Client Lab
								</p>
								<h1 className="mt-3 text-3xl font-semibold">
									Multi-client live simulation
								</h1>
							</div>
							<div className="text-xs text-[var(--ink-1)]">
								Each session uses real token + client_id scope
							</div>
						</div>
					</section>

					<section className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
						<div className="glass-card fade-up p-5">
							<h2 className="text-lg font-semibold">
								Selected Session
							</h2>
							{selectedProfile ? (
								<div className="mt-4 grid gap-3 md:grid-cols-2">
									<input
										className="surface-input"
										placeholder="Label"
										value={selectedProfile.label}
										onChange={(e) =>
											updateProfile(selectedProfile.id, {
												label: e.target.value,
											})
										}
									/>
									<input
										className="surface-input"
										placeholder="client_id"
										value={selectedProfile.clientId}
										onChange={(e) =>
											updateProfile(selectedProfile.id, {
												clientId: e.target.value,
											})
										}
									/>
									<input
										className="surface-input md:col-span-2"
										placeholder="Bearer token"
										value={selectedProfile.accessToken}
										onChange={(e) =>
											updateProfile(selectedProfile.id, {
												accessToken: e.target.value,
											})
										}
									/>
									<input
										className="surface-input"
										placeholder="room_id"
										value={selectedProfile.roomId}
										onChange={(e) =>
											updateProfile(selectedProfile.id, {
												roomId: e.target.value,
											})
										}
									/>
									<input
										className="surface-input"
										placeholder="Room password"
										type="password"
										value={selectedProfile.joinPassword}
										onChange={(e) =>
											updateProfile(selectedProfile.id, {
												joinPassword: e.target.value,
											})
										}
									/>
								</div>
							) : (
								<p className="mt-3 text-sm text-[var(--ink-1)]">
									Create a session profile to start.
								</p>
							)}

							<div className="mt-4 flex flex-wrap gap-2">
								<button
									className="surface-btn"
									disabled={!selectedProfile}
									onClick={() =>
										selectedProfile &&
										connectProfile(selectedProfile)
									}
								>
									Connect
								</button>
								<button
									className="surface-btn"
									disabled={!selectedProfile}
									onClick={() =>
										selectedProfile &&
										joinRoom(selectedProfile)
									}
								>
									Join Room
								</button>
								<button
									className="surface-btn secondary"
									disabled={!selectedProfile}
									onClick={() =>
										selectedProfile &&
										disconnectProfile(selectedProfile.id)
									}
								>
									Disconnect
								</button>
							</div>

							<div className="mt-6">
								<h3 className="text-sm font-semibold text-[var(--ink-1)]">
									Claim Composer
								</h3>
								<textarea
									className="surface-input mt-2 min-h-28"
									value={claim}
									onChange={(e) => setClaim(e.target.value)}
								/>
								<button
									className="surface-btn mt-3 w-full"
									disabled={
										selectedProfile?.connectionState !==
										"joined"
									}
									onClick={sendClaim}
								>
									Send Claim
								</button>
							</div>
						</div>

						<div className="glass-card fade-up p-5">
							<h2 className="text-lg font-semibold">
								Onboarding Registration
							</h2>
							<p className="mt-1 text-sm text-[var(--ink-1)]">
								Create org + room request for admin approval.
							</p>
							<div className="mt-4 space-y-3">
								<input
									className="surface-input"
									placeholder="Organization name"
									value={registration.orgName}
									onChange={(e) =>
										setRegistration((prev) => ({
											...prev,
											orgName: e.target.value,
										}))
									}
								/>
								<input
									className="surface-input"
									placeholder="Contact email"
									value={registration.contactEmail}
									onChange={(e) =>
										setRegistration((prev) => ({
											...prev,
											contactEmail: e.target.value,
										}))
									}
								/>
								<input
									className="surface-input"
									placeholder="Universal room name"
									value={registration.roomId}
									onChange={(e) =>
										setRegistration((prev) => ({
											...prev,
											roomId: e.target.value,
										}))
									}
								/>
								<input
									className="surface-input"
									placeholder="Room password"
									type="password"
									value={registration.roomPassword}
									onChange={(e) =>
										setRegistration((prev) => ({
											...prev,
											roomPassword: e.target.value,
										}))
									}
								/>
								<button
									className="surface-btn w-full"
									onClick={createRegistration}
								>
									Submit Registration
								</button>
								{registrationMessage ? (
									<p className="rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-xs text-[var(--ink-1)]">
										{registrationMessage}
									</p>
								) : null}
							</div>
						</div>
					</section>

					<section className="glass-card fade-up p-5">
						<h2 className="text-lg font-semibold">
							Session Event Stream
						</h2>
						<div className="mt-3 max-h-[28rem] space-y-2 overflow-auto pr-1">
							{selectedProfile &&
							(logsByProfile[selectedProfile.id] ?? []).length >
								0 ? (
								(logsByProfile[selectedProfile.id] ?? []).map(
									(log, idx) => (
										<div
											key={`${log.ts}-${idx}`}
											className="rounded-lg border border-white/15 bg-black/20 p-2 text-xs"
										>
											<p className="font-mono text-[11px] text-[var(--ink-2)]">
												{log.ts}
											</p>
											<p className="mt-1">
												<span className="mr-2 uppercase text-[10px] text-[var(--ink-2)]">
													{log.kind}
												</span>
												{log.text}
											</p>
										</div>
									)
								)
							) : (
								<p className="text-sm text-[var(--ink-1)]">
									No events yet for the selected client
									session.
								</p>
							)}
						</div>
					</section>
				</main>
			</div>
		</div>
	);
}
