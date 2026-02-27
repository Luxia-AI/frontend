"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type RoomItem = { room_id: string; client_id: string; created_at: string };
type PendingRegistration = { id: string; requested_room_id: string };
type RoomStatus = "approved" | "pending" | "unapproved";

type PostItem = {
	id: string;
	text: string;
	createdAt: string;
	status: "processing" | "completed" | "error";
	stage: string;
	note?: string;
	finalPayload?: Record<string, unknown>;
	logs: Array<{ ts: string; line: string }>;
};

type ClaimBreakdownItem = {
	claim_segment?: unknown;
	exact_claim_segment?: unknown;
	status?: unknown;
	supporting_fact?: unknown;
	source_url?: unknown;
	alignment_debug?: {
		score?: unknown;
		support_strength?: unknown;
	};
};

type RotatingInsightBarProps = {
	lines: string[];
};

type RegistrationState = {
	orgName: string;
	email: string;
	roomId: string;
	roomPassword: string;
};

const CONTROL_PLANE =
	process.env.NEXT_PUBLIC_CONTROL_PLANE_URL ??
	"https://luxia-backend-dyenfqbrc2etc2gq.uaenorth-01.azurewebsites.net";
const SOCKET_URL =
	process.env.NEXT_PUBLIC_SOCKET_URL ??
	"https://luxia-backend-dyenfqbrc2etc2gq.uaenorth-01.azurewebsites.net";
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? "admin-token";
const CLIENT_TOKEN =
	process.env.NEXT_PUBLIC_CLIENT_TOKEN ?? "client-operator-token";
const APP_CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID ?? "client_demo";
const POLL_INTERVAL_MS = Number(
	process.env.NEXT_PUBLIC_POLL_INTERVAL_MS ?? "5000"
);

async function api<T>(
	path: string,
	token: string,
	init?: RequestInit
): Promise<T> {
	const res = await fetch(`${CONTROL_PLANE}${path}`, {
		...init,
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
			...(init?.headers ?? {}),
		},
	});
	if (!res.ok) throw new Error(await res.text());
	return (await res.json()) as T;
}

function deriveStageFromWorkerLog(
	message: string,
	level: string
): string | null {
	const m = message.toLowerCase();
	if (level === "ERROR") return "Pipeline error";
	if (m.includes("dispatch")) return "Dispatched";
	if (m.includes("evidence")) return "Looking for evidences";
	if (m.includes("web search") || m.includes("search")) return "Web search";
	if (m.includes("scrap")) return "Scraping URLs";
	if (m.includes("verdict")) return "Generating final verdict";
	if (m.includes("rank")) return "Ranking evidences";
	if (m.includes("retrieve") || m.includes("retrieval"))
		return "Retrieving context";
	return null;
}

function labelForStage(stageRaw: unknown): string {
	const stage = String(stageRaw || "")
		.trim()
		.toLowerCase();
	if (!stage) return "Processing";
	if (stage === "started") return "In queue";
	if (stage === "retrieval_done") return "Retrieval done";
	if (stage === "search_done") return "Web search done";
	if (stage === "extraction_done") return "Evidence extraction done";
	if (stage === "ingestion_done") return "Knowledge ingestion done";
	if (stage === "completed") return "Final verdict ready";
	if (stage === "error") return "Pipeline error";
	return stage
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function verdictBadgeClasses(verdictRaw: unknown): string {
	const verdict = String(verdictRaw || "").toUpperCase();
	if (verdict.includes("TRUE") || verdict.includes("VALID")) {
		return "bg-emerald-500/20 border-emerald-300/50 text-emerald-100";
	}
	if (verdict.includes("FALSE") || verdict.includes("INVALID")) {
		return "bg-rose-500/20 border-rose-300/50 text-rose-100";
	}
	if (verdict.includes("PARTIALLY") || verdict.includes("MIXED")) {
		return "bg-amber-500/20 border-amber-300/50 text-amber-100";
	}
	return "bg-cyan-500/20 border-cyan-300/50 text-cyan-100";
}

function formatPercent(value: unknown): string {
	const numeric =
		typeof value === "number"
			? value
			: typeof value === "string"
				? Number.parseFloat(value)
				: Number.NaN;
	if (!Number.isFinite(numeric)) return "N/A";
	const normalized = numeric <= 1 ? numeric * 100 : numeric;
	return `${Math.round(normalized * 10) / 10}%`;
}

function subclaimUnderline(statusRaw: unknown): string {
	const status = String(statusRaw || "").toUpperCase();
	if (status.includes("VALID") || status.includes("SUPPORTED")) {
		return "decoration-emerald-300/90";
	}
	if (status.includes("INVALID") || status.includes("REFUTED")) {
		return "decoration-rose-300/90";
	}
	if (status.includes("PARTIAL") || status.includes("MIXED")) {
		return "decoration-amber-300/90";
	}
	return "decoration-cyan-300/90";
}

function subclaimStatusBadge(statusRaw: unknown): string {
	const status = String(statusRaw || "").toUpperCase();
	if (status.includes("VALID") || status.includes("SUPPORTED")) {
		return "bg-emerald-500/20 border-emerald-300/50 text-emerald-100";
	}
	if (status.includes("INVALID") || status.includes("REFUTED")) {
		return "bg-rose-500/20 border-rose-300/50 text-rose-100";
	}
	if (status.includes("PARTIAL") || status.includes("MIXED")) {
		return "bg-amber-500/20 border-amber-300/50 text-amber-100";
	}
	return "bg-cyan-500/20 border-cyan-300/50 text-cyan-100";
}

function collectInsightLines(post: PostItem): string[] {
	const payload = post.finalPayload;
	if (!payload) return [];
	const lines: string[] = [];
	const rationale = String(
		payload.verdict_rationale ?? payload.rationale ?? ""
	).trim();
	if (rationale) lines.push(rationale);
	const keyFindings = Array.isArray(payload.key_findings)
		? (payload.key_findings as unknown[])
		: [];
	for (const finding of keyFindings) {
		const text = String(finding ?? "").trim();
		if (text) lines.push(text);
	}
	const evidence = Array.isArray(payload.evidence)
		? (payload.evidence as Array<Record<string, unknown>>)
		: [];
	for (const ev of evidence) {
		const text = String(ev.statement ?? "").trim();
		if (text) lines.push(text);
	}
	return Array.from(new Set(lines)).slice(0, 14);
}

function RotatingInsightBar({ lines }: RotatingInsightBarProps) {
	const [index, setIndex] = useState(0);
	const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");
	const pausedRef = useRef(false);

	useEffect(() => {
		if (lines.length <= 1) return;
		const displayMs = 4200;
		const turnMs = 360;
		const timer = window.setInterval(() => {
			if (pausedRef.current) return;
			setPhase("out");
			window.setTimeout(() => {
				if (pausedRef.current) return;
				setIndex((prev) => (prev + 1) % lines.length);
				setPhase("in");
				window.setTimeout(() => {
					if (!pausedRef.current) setPhase("idle");
				}, turnMs);
			}, turnMs);
		}, displayMs);
		return () => window.clearInterval(timer);
	}, [lines]);

	if (lines.length === 0) return null;
	const safeIndex = index % lines.length;
	const safePhase = lines.length <= 1 ? "idle" : phase;

	return (
		<div
			className="insight-rotor"
			onMouseEnter={() => {
				pausedRef.current = true;
			}}
			onMouseLeave={() => {
				pausedRef.current = false;
			}}
			onFocus={() => {
				pausedRef.current = true;
			}}
			onBlur={() => {
				pausedRef.current = false;
			}}
			tabIndex={0}
			aria-label="Rotating insights"
		>
			<p className={`insight-rotor-line insight-rotor-line-${safePhase}`}>
				{lines[safeIndex]}
			</p>
		</div>
	);
}

export default function ClientPage() {
	const [form, setForm] = useState<RegistrationState>({
		orgName: "",
		email: "",
		roomId: "",
		roomPassword: "",
	});
	const [roomEditedManually, setRoomEditedManually] = useState(false);
	const [registrationId, setRegistrationId] = useState("");
	const [registrationMsg, setRegistrationMsg] = useState("");
	const [roomStatus, setRoomStatus] = useState<RoomStatus>("unapproved");
	const [socketState, setSocketState] = useState<
		"disconnected" | "connected" | "joined" | "error"
	>("disconnected");
	const [joinPassword, setJoinPassword] = useState("");
	const [composer, setComposer] = useState("");
	const [posts, setPosts] = useState<PostItem[]>([]);
	const [statusMsg, setStatusMsg] = useState("");
	const [evidencePostId, setEvidencePostId] = useState<string | null>(null);
	const socketRef = useRef<Socket | null>(null);
	const presenceRef = useRef<BroadcastChannel | null>(null);
	const jobToPostRef = useRef<Record<string, string>>({});

	const socialTitle = useMemo(() => {
		const base = form.orgName.trim() || "Social";
		return `${base} Feed`;
	}, [form.orgName]);

	useEffect(() => {
		presenceRef.current = new BroadcastChannel("luxia-client-presence");
		return () => {
			presenceRef.current?.close();
			presenceRef.current = null;
		};
	}, []);

	const emitPresence = (status: "connected" | "joined" | "disconnected") => {
		presenceRef.current?.postMessage({
			clientId: APP_CLIENT_ID,
			roomId: form.roomId,
			status,
			at: new Date().toISOString(),
		});
	};

	const pushPost = (post: PostItem) => {
		setPosts((prev) => [post, ...prev].slice(0, 200));
	};

	const patchPost = (id: string, patch: Partial<PostItem>) => {
		setPosts((prev) =>
			prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
		);
	};

	const patchPostStage = (id: string, stage: string) => {
		setPosts((prev) =>
			prev.map((p) => {
				if (p.id !== id) return p;
				const hasFinalVerdict =
					p.status === "completed" &&
					!!String(p.finalPayload?.verdict ?? "").trim();
				if (hasFinalVerdict) {
					return p.stage ? { ...p, stage: "" } : p;
				}
				return { ...p, stage };
			})
		);
	};

	const appendPostLog = (id: string, line: string) => {
		setPosts((prev) =>
			prev.map((p) =>
				p.id === id
					? {
							...p,
							logs: [
								...p.logs,
								{ ts: new Date().toLocaleTimeString(), line },
							].slice(-120),
						}
					: p
			)
		);
	};

	const downloadClaimJson = (post: PostItem) => {
		if (!post.finalPayload) return;
		const payload = {
			claim_id: post.id,
			claim_text: post.text,
			received_at: post.createdAt,
			result: post.finalPayload,
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const slug = post.text
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 40);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `claim-${slug || post.id}.json`;
		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();
		URL.revokeObjectURL(url);
	};

	const renderClaimText = (post: PostItem): ReactNode => {
		const breakdownRaw = post.finalPayload?.claim_breakdown;
		if (!Array.isArray(breakdownRaw) || breakdownRaw.length === 0) {
			return (
				<p className="mt-2 whitespace-pre-wrap text-sm">{post.text}</p>
			);
		}
		const text = post.text;
		const textLower = text.toLowerCase();
		const matches: Array<{
			start: number;
			end: number;
			item: ClaimBreakdownItem;
		}> = [];

		for (const rawItem of breakdownRaw as ClaimBreakdownItem[]) {
			const segment = String(rawItem.exact_claim_segment ?? "").trim();
			if (!segment) continue;
			const start = textLower.indexOf(segment.toLowerCase());
			if (start < 0) continue;
			const end = start + segment.length;
			const overlaps = matches.some(
				(m) => start < m.end && end > m.start
			);
			if (overlaps) continue;
			matches.push({ start, end, item: rawItem });
		}

		if (matches.length === 0) {
			return (
				<p className="mt-2 whitespace-pre-wrap text-sm">{post.text}</p>
			);
		}

		matches.sort((a, b) => a.start - b.start);
		const nodes: ReactNode[] = [];
		let cursor = 0;
		for (let i = 0; i < matches.length; i += 1) {
			const match = matches[i];
			if (cursor < match.start) {
				nodes.push(
					<span key={`plain-${post.id}-${i}-${cursor}`}>
						{text.slice(cursor, match.start)}
					</span>
				);
			}
			const segmentText = text.slice(match.start, match.end);
			const supportingFact = String(
				match.item.supporting_fact ?? ""
			).trim();
			const sourceUrl = String(match.item.source_url ?? "").trim();
			const statusLabel = String(
				match.item.status ?? "UNKNOWN"
			).toUpperCase();
			const scoreValue =
				match.item.alignment_debug?.score ??
				match.item.alignment_debug?.support_strength;
			nodes.push(
				<span
					key={`subclaim-${post.id}-${i}-${match.start}`}
					className={`group/subclaim relative cursor-help decoration-2 underline underline-offset-4 transition-colors duration-200 ${subclaimUnderline(
						match.item.status
					)}`}
					tabIndex={0}
				>
					{segmentText}
					<span className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-80 max-w-[90vw] translate-y-1 scale-95 rounded-xl border border-white/20 bg-[#050e1be6] p-3 text-xs opacity-0 shadow-2xl backdrop-blur-xl transition-all duration-200 ease-[var(--ease-standard)] group-hover/subclaim:pointer-events-auto group-hover/subclaim:translate-y-0 group-hover/subclaim:scale-100 group-hover/subclaim:opacity-100 group-focus-within/subclaim:pointer-events-auto group-focus-within/subclaim:translate-y-0 group-focus-within/subclaim:scale-100 group-focus-within/subclaim:opacity-100">
						<span className="flex items-center gap-2">
							<span
								className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${subclaimStatusBadge(
									match.item.status
								)}`}
							>
								{statusLabel}
							</span>
							<span className="text-[var(--ink-1)]">
								score:{" "}
								<span className="font-semibold">
									{formatPercent(scoreValue)}
								</span>
							</span>
						</span>
						{supportingFact ? (
							<span className="mt-2 block text-[var(--ink-1)]">
								<span className="font-semibold text-[var(--ink-0)]">
									Supporting fact:
								</span>{" "}
								{supportingFact}
							</span>
						) : null}
						{sourceUrl ? (
							<span className="mt-1 block">
								<a
									href={sourceUrl}
									target="_blank"
									rel="noreferrer noopener"
									className="break-all text-cyan-200 underline underline-offset-2"
								>
									{sourceUrl}
								</a>
							</span>
						) : null}
					</span>
				</span>
			);
			cursor = match.end;
		}
		if (cursor < text.length) {
			nodes.push(
				<span key={`plain-tail-${post.id}`}>{text.slice(cursor)}</span>
			);
		}

		return <p className="mt-2 whitespace-pre-wrap text-sm">{nodes}</p>;
	};

	useEffect(() => {
		let active = true;
		if (!form.roomId.trim()) return;

		const refreshStatus = async () => {
			try {
				const [rooms, pending] = await Promise.all([
					api<{ items: RoomItem[] }>("/v1/client/rooms", ADMIN_TOKEN),
					api<{ items: PendingRegistration[] }>(
						"/v1/admin/client-registrations/pending",
						ADMIN_TOKEN
					),
				]);
				if (!active) return;
				const id = form.roomId.trim();
				const approved = rooms.items.some((r) => r.room_id === id);
				const pendingExists = pending.items.some(
					(p) => p.requested_room_id === id
				);
				setRoomStatus(
					approved
						? "approved"
						: pendingExists
							? "pending"
							: "unapproved"
				);
			} catch {
				if (!active) return;
				setStatusMsg("Could not refresh approval status.");
			}
		};

		void refreshStatus();
		const timer = window.setInterval(
			() => void refreshStatus(),
			Math.max(POLL_INTERVAL_MS, 2000)
		);
		return () => {
			active = false;
			window.clearInterval(timer);
		};
	}, [form.roomId]);

	useEffect(() => {
		return () => {
			socketRef.current?.disconnect();
			presenceRef.current?.postMessage({
				clientId: APP_CLIENT_ID,
				roomId: form.roomId,
				status: "disconnected",
				at: new Date().toISOString(),
			});
			socketRef.current = null;
		};
	}, [form.roomId]);

	const registerRoom = async () => {
		try {
			const payload = {
				org_name: form.orgName.trim(),
				contact_email: form.email.trim(),
				room_id: form.roomId.trim().toLowerCase(),
				room_password: form.roomPassword,
			};
			const res = await fetch(
				`${CONTROL_PLANE}/v1/client-registrations`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				}
			);
			const body = (await res.json()) as {
				id?: string;
				detail?: string;
				status?: string;
			};
			if (!res.ok) {
				setRegistrationMsg(
					`Registration failed: ${body.detail ?? "unknown error"}`
				);
				return;
			}
			setRegistrationId(body.id ?? "");
			setRegistrationMsg(
				`Request sent. Registration ID: ${body.id ?? "n/a"}. Waiting for admin approval...`
			);
		} catch (e) {
			setRegistrationMsg(`Registration failed: ${String(e)}`);
		}
	};

	const connect = () => {
		if (roomStatus !== "approved") {
			setStatusMsg(`Room is ${roomStatus}. Wait for admin approval.`);
			return;
		}
		if (socketRef.current?.connected) return;
		const socket = io(SOCKET_URL, {
			path: "/socket.io",
			transports: ["websocket"],
		});
		socketRef.current = socket;
		socket.on("connect", () => {
			setSocketState("connected");
			setStatusMsg("Connected. Join room to start posting.");
			emitPresence("connected");
		});
		socket.on("disconnect", () => {
			setSocketState("disconnected");
			emitPresence("disconnected");
		});
		socket.on("join_room_success", () => {
			setSocketState("joined");
			setStatusMsg("Joined room successfully.");
			emitPresence("joined");
		});
		socket.on("auth_error", (data: { message?: string }) => {
			setSocketState("error");
			setStatusMsg(data?.message || "Authorization failed.");
		});
		socket.on("worker_update", (data: Record<string, unknown>) => {
			const claimId = String(data.client_claim_id || "");
			const jobId = String(data.job_id || "");
			if (jobId && claimId) {
				jobToPostRef.current[jobId] = claimId;
			}
			if (claimId) {
				const status = String(data.status || "").toLowerCase();
				const verdict = String(data.verdict ?? "").trim();
				const completedWithoutVerdict =
					status === "completed" && !verdict;
				const stage = completedWithoutVerdict
					? "Pipeline error"
					: status === "completed"
						? ""
						: status === "error"
							? "Pipeline error"
							: "Processing";
				patchPost(claimId, {
					status: completedWithoutVerdict
						? "error"
						: status === "completed"
							? "completed"
							: status === "error"
								? "error"
								: "processing",
					stage,
					note: completedWithoutVerdict
						? "Final verdict was not received from the RAG system."
						: String(data.message ?? data.rationale ?? ""),
					finalPayload:
						status === "completed" && !completedWithoutVerdict
							? data
							: undefined,
				});
				appendPostLog(
					claimId,
					`[worker_update] status=${status || "unknown"} message=${String(
						data.message ?? data.rationale ?? ""
					)}`
				);
				const stageEvents = Array.isArray(data.stage_events)
					? (data.stage_events as Array<Record<string, unknown>>)
					: [];
				for (const stageEvent of stageEvents) {
					if (status === "completed" && verdict) {
						continue;
					}
					const stageLabel = labelForStage(stageEvent.stage);
					patchPostStage(claimId, stageLabel);
					appendPostLog(
						claimId,
						`[worker_stage] ${String(stageEvent.stage ?? "stage")} ${JSON.stringify(
							stageEvent.payload ?? {}
						)}`
					);
				}
			} else if (
				String(data.status || "").toLowerCase() === "completed"
			) {
				const verdict = String(data.verdict ?? "").trim();
				const completedWithoutVerdict = !verdict;
				pushPost({
					id: crypto.randomUUID(),
					text: String(data.claim || "RAG result"),
					createdAt: new Date().toISOString(),
					status: completedWithoutVerdict ? "error" : "completed",
					stage: completedWithoutVerdict ? "Pipeline error" : "",
					note: completedWithoutVerdict
						? "Final verdict was not received from the RAG system."
						: String(data.message ?? data.rationale ?? ""),
					finalPayload: completedWithoutVerdict ? undefined : data,
					logs: [
						{
							ts: new Date().toLocaleTimeString(),
							line: "[worker_update] completed",
						},
					],
				});
			}
		});
		socket.on("worker_stage", (data: Record<string, unknown>) => {
			const explicitClaimId = String(data.client_claim_id || "");
			const jobId = String(data.job_id || "");
			const mappedByJob = jobId ? jobToPostRef.current[jobId] : "";
			const targetId =
				explicitClaimId ||
				mappedByJob ||
				posts.find((p) => p.status === "processing")?.id ||
				posts[0]?.id;
			if (!targetId) return;
			const stageLabel = labelForStage(data.stage);
			patchPostStage(targetId, stageLabel);
			appendPostLog(
				targetId,
				`[worker_stage] ${String(data.stage ?? "stage")} ${JSON.stringify(
					data.stage_payload ?? {}
				)}`
			);
		});
		socket.on("worker_log", (data: Record<string, unknown>) => {
			const level = String(data.level || "INFO").toUpperCase();
			const message = String(data.message || "");
			const explicitClaimId = String(data.client_claim_id || "");
			const jobId = String(data.job_id || "");
			const mappedByJob = jobId ? jobToPostRef.current[jobId] : "";
			const targetId =
				explicitClaimId ||
				mappedByJob ||
				posts.find((p) => p.status === "processing")?.id ||
				posts[0]?.id;
			if (!targetId) return;
			appendPostLog(targetId, `[${level}] ${message}`);
			const stage = deriveStageFromWorkerLog(message, level);
			if (stage) {
				patchPostStage(targetId, stage);
			}
		});
	};

	const joinRoom = () => {
		if (roomStatus !== "approved") {
			setStatusMsg(`Room is ${roomStatus}. You cannot join yet.`);
			return;
		}
		if (!joinPassword.trim()) {
			setStatusMsg("Room password is required to join.");
			return;
		}
		const socket = socketRef.current;
		if (!socket?.connected) {
			setStatusMsg("Connect first.");
			return;
		}
		socket.emit("join_room", {
			room_id: form.roomId.trim(),
			client_id: APP_CLIENT_ID,
			access_token: CLIENT_TOKEN,
			password: joinPassword.trim(),
		});
	};

	const publish = () => {
		if (!composer.trim()) return;
		if (roomStatus !== "approved") {
			setStatusMsg(`Room is ${roomStatus}. Posting disabled.`);
			return;
		}
		if (socketState !== "joined") {
			setStatusMsg("Join room before posting.");
			return;
		}
		const socket = socketRef.current;
		if (!socket?.connected) return;
		const claimId = crypto.randomUUID();
		const text = composer.trim();
		setComposer("");
		pushPost({
			id: claimId,
			text,
			createdAt: new Date().toISOString(),
			status: "processing",
			stage: "In Queue",
			note: "Queued for verification",
			logs: [
				{
					ts: new Date().toLocaleTimeString(),
					line: "[client] queued",
				},
			],
		});
		socket.emit("post_message", {
			room_id: form.roomId.trim(),
			client_id: APP_CLIENT_ID,
			access_token: CLIENT_TOKEN,
			client_claim_id: claimId,
			claim: text,
		});
	};

	const timeline = useMemo(() => posts, [posts]);
	const canUseRealtime = roomStatus === "approved";
	const canJoin = canUseRealtime && socketState === "connected";
	const canPost =
		canUseRealtime && socketState === "joined" && !!composer.trim();

	return (
		<div className="aurora-shell min-h-screen px-6 py-8 md:px-10">
			<div className="mx-auto max-w-5xl space-y-5">
				<header className="glass-card-strong fade-up p-6 md:p-8">
					<p className="status-pill w-fit">Client Workspace</p>
					<h1 className="mt-3 text-3xl font-semibold">
						{roomStatus === "approved"
							? socialTitle
							: "Register Room, Wait Approval"}
					</h1>
					<p className="mt-2 text-sm text-[var(--ink-1)]">
						Start by submitting room registration. Posting is
						unlocked automatically once admin approves.
					</p>
					{canUseRealtime ? (
						<div className="mt-4 rounded-xl border border-white/15 bg-black/20 p-3">
							<div className="text-xs text-[var(--ink-1)]">
								socket:{" "}
								<span className="font-semibold uppercase">
									{socketState}
								</span>
							</div>
							{socketState !== "joined" ? (
								<input
									className="surface-input mt-2 text-sm"
									placeholder="Room password (required to join)"
									type="password"
									value={joinPassword}
									onChange={(e) =>
										setJoinPassword(e.target.value)
									}
								/>
							) : null}
							<div className="mt-2 flex flex-wrap gap-2">
								<button
									className="surface-btn secondary text-sm"
									onClick={connect}
								>
									Connect
								</button>
								<button
									className="surface-btn text-sm"
									onClick={joinRoom}
									disabled={!canJoin}
								>
									Join Room
								</button>
							</div>
							{statusMsg ? (
								<p className="mt-2 text-xs text-[var(--ink-1)]">
									{statusMsg}
								</p>
							) : null}
						</div>
					) : null}
				</header>

				{roomStatus !== "approved" ? (
					<section className="glass-card fade-up p-4">
						<h2 className="text-lg font-semibold">
							Room Registration
						</h2>
						<div className="mt-3 space-y-2">
							<input
								className="surface-input text-sm"
								placeholder="Organization name"
								value={form.orgName}
								onChange={(e) => {
									const nextOrg = e.target.value;
									if (roomEditedManually) {
										setForm((p) => ({
											...p,
											orgName: nextOrg,
										}));
										return;
									}
									const slug = nextOrg
										.trim()
										.toLowerCase()
										.replace(/[^a-z0-9]+/g, "-")
										.replace(/^-+|-+$/g, "")
										.slice(0, 64);
									setForm((p) => ({
										...p,
										orgName: nextOrg,
										roomId: slug,
									}));
								}}
							/>
							<input
								className="surface-input text-sm"
								placeholder="Contact email"
								value={form.email}
								onChange={(e) =>
									setForm((p) => ({
										...p,
										email: e.target.value,
									}))
								}
							/>
							<input
								className="surface-input text-sm"
								placeholder="Room name (auto from org)"
								value={form.roomId}
								onChange={(e) => {
									setRoomEditedManually(true);
									setForm((p) => ({
										...p,
										roomId: e.target.value,
									}));
								}}
							/>
							<input
								className="surface-input text-sm"
								placeholder="Room password"
								type="password"
								value={form.roomPassword}
								onChange={(e) =>
									setForm((p) => ({
										...p,
										roomPassword: e.target.value,
									}))
								}
							/>
							<button
								className="surface-btn w-full text-sm"
								onClick={registerRoom}
							>
								Send Approval Request
							</button>
						</div>
						<p className="mt-3 text-xs text-[var(--ink-1)]">
							Registration ID: {registrationId || "not submitted"}
						</p>
						<p className="mt-1 text-xs text-[var(--ink-1)]">
							Room status:{" "}
							<span className="font-semibold uppercase">
								{roomStatus}
							</span>
						</p>
						<p className="mt-1 text-xs text-[var(--ink-1)]">
							client_id:{" "}
							<span className="font-semibold">
								{APP_CLIENT_ID}
							</span>{" "}
							(app-managed)
						</p>
						{registrationMsg ? (
							<p className="mt-2 text-xs text-cyan-100">
								{registrationMsg}
							</p>
						) : null}
					</section>
				) : (
					<section className="glass-card fade-up p-4">
						<h2 className="text-lg font-semibold">Post Submit</h2>
						<textarea
							className="surface-input mt-3 min-h-24 text-sm"
							placeholder="Write your post text..."
							value={composer}
							onChange={(e) => setComposer(e.target.value)}
						/>
						<button
							className="surface-btn mt-3 w-full text-sm"
							onClick={publish}
							disabled={!canPost}
						>
							Post
						</button>
					</section>
				)}

				<section className="space-y-3">
					{timeline.map((post) => (
						<article
							key={post.id}
							className="glass-card post-card-motion p-4"
						>
							<div className="grid items-center gap-2 text-xs text-[var(--ink-2)] md:grid-cols-[auto_1fr_auto]">
								<span>
									{new Date(
										post.createdAt
									).toLocaleTimeString()}
								</span>
								<RotatingInsightBar
									lines={collectInsightLines(post)}
								/>
								<div className="flex items-center justify-end gap-2">
									{post.status === "completed" &&
									post.finalPayload?.verdict ? (
										<span
											className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${verdictBadgeClasses(
												post.finalPayload.verdict
											)}`}
										>
											{String(post.finalPayload.verdict)}
										</span>
									) : null}
									{post.stage ? (
										<span className="status-pill">
											{post.stage}
										</span>
									) : null}
								</div>
							</div>
							{renderClaimText(post)}
							{post.note ? (
								<p className="mt-1 text-xs text-[var(--ink-1)]">
									{post.note}
								</p>
							) : null}
							<details className="details-panel details-smooth mt-3 rounded-lg border border-white/15 bg-transparent">
								<summary className="cursor-pointer text-xs font-semibold text-[var(--ink-1)]">
									Job Logs ({post.logs.length})
								</summary>
								<div className="details-content mt-2 max-h-40 space-y-1 overflow-auto text-xs">
									{post.logs.map((log, i) => (
										<div
											key={`${log.ts}-${i}`}
											className="font-mono text-[var(--ink-1)]"
										>
											[{log.ts}] {log.line}
										</div>
									))}
								</div>
							</details>
							{post.status === "completed" &&
							post.finalPayload ? (
								<details className="details-panel details-smooth mt-3 rounded-lg border border-white/15 bg-transparent text-xs">
									<summary className="cursor-pointer font-semibold text-[var(--ink-1)]">
										Final RAG Output
									</summary>
									<div className="details-content">
										<div className="mt-2 grid gap-1 md:grid-cols-2">
											<p>
												verdict:{" "}
												<span
													className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${verdictBadgeClasses(
														post.finalPayload
															.verdict
													)}`}
												>
													{String(
														post.finalPayload
															.verdict ?? "N/A"
													)}
												</span>
											</p>
											<p>
												truthfulness:{" "}
												<span className="font-semibold">
													{formatPercent(
														post.finalPayload
															.truthfulness_percent ??
															post.finalPayload
																.truthfulness
													)}
												</span>
											</p>
											<p>
												confidence:{" "}
												<span className="font-semibold">
													{formatPercent(
														post.finalPayload
															.verdict_confidence ??
															post.finalPayload
																.confidence
													)}
												</span>
											</p>
											<p>
												job_id:{" "}
												<span className="font-semibold">
													{String(
														post.finalPayload
															.job_id ?? "N/A"
													)}
												</span>
											</p>
										</div>
										<p className="mt-2 text-[var(--ink-1)]">
											{String(
												post.finalPayload
													.verdict_rationale ??
													post.finalPayload
														.rationale ??
													""
											)}
										</p>
										<div className="mt-3 flex flex-wrap gap-2">
											{Array.isArray(
												post.finalPayload.evidence
											) &&
											post.finalPayload.evidence.length >
												0 ? (
												<button
													className="surface-btn secondary text-xs"
													onClick={() =>
														setEvidencePostId(
															post.id
														)
													}
												>
													View Evidence (
													{
														post.finalPayload
															.evidence.length
													}
													)
												</button>
											) : null}
											<button
												className="surface-btn secondary text-xs"
												onClick={() =>
													downloadClaimJson(post)
												}
											>
												Download JSON
											</button>
										</div>
									</div>
								</details>
							) : null}
						</article>
					))}
					{timeline.length === 0 ? (
						<div className="glass-card p-4 text-sm text-[var(--ink-1)]">
							No posts yet. Submit registration and wait for
							approval first.
						</div>
					) : null}
				</section>
				{evidencePostId ? (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
						<div className="glass-card-strong w-full max-w-3xl p-4">
							<div className="flex items-center justify-between">
								<h3 className="text-lg font-semibold">
									Evidence Sources
								</h3>
								<button
									className="surface-btn secondary text-xs"
									onClick={() => setEvidencePostId(null)}
								>
									Close
								</button>
							</div>
							<div className="mt-3 max-h-[60vh] space-y-2 overflow-auto">
								{(
									timeline.find(
										(p) => p.id === evidencePostId
									)?.finalPayload?.evidence as
										| Array<Record<string, unknown>>
										| undefined
								)?.map((ev, idx) => (
									<div
										key={`ev-${idx}`}
										className="rounded-lg border border-white/15 bg-black/20 p-3 text-xs"
									>
										<p className="font-semibold">
											#{idx + 1}{" "}
											{String(ev.grade ?? "N/A")}
										</p>
										{String(ev.source_url ?? "").trim() ? (
											<a
												href={String(ev.source_url)}
												target="_blank"
												rel="noreferrer noopener"
												className="mt-1 block break-all text-cyan-200 underline underline-offset-2"
											>
												{String(ev.source_url)}
											</a>
										) : (
											<p className="mt-1 break-all text-[var(--ink-1)]">
												No source URL
											</p>
										)}
										<p className="mt-1 text-[var(--ink-1)]">
											{String(ev.statement ?? "")}
										</p>
									</div>
								))}
							</div>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}
