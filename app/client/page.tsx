"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const CONTROL_PLANE =
	process.env.NEXT_PUBLIC_CONTROL_PLANE_URL ?? "http://localhost:8010";
const SOCKET_URL =
	process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:8000";
const CLIENT_TOKEN =
	process.env.NEXT_PUBLIC_CLIENT_TOKEN ?? "client-operator-token";
const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID ?? "client_demo";

export default function ClientPage() {
	const socketRef = useRef<Socket | null>(null);
	const [roomId, setRoomId] = useState("room_demo");
	const [claim, setClaim] = useState(
		"Vitamin C cures common cold instantly."
	);
	const [logs, setLogs] = useState<string[]>([]);
	const [rooms, setRooms] = useState<Array<{ room_id: string }>>([]);

	const addLog = (line: string) =>
		setLogs((prev) =>
			[`${new Date().toISOString()} ${line}`, ...prev].slice(0, 100)
		);

	useEffect(() => {
		void fetch(`${CONTROL_PLANE}/v1/client/rooms`, {
			headers: { Authorization: `Bearer ${CLIENT_TOKEN}` },
		})
			.then((r) => r.json())
			.then((d: { items?: Array<{ room_id: string }> }) =>
				setRooms(d.items ?? [])
			)
			.catch(() => undefined);
	}, []);

	const connect = () => {
		if (socketRef.current?.connected) return;
		const socket = io(SOCKET_URL, {
			path: "/socket.io",
			transports: ["websocket"],
		});
		socket.on("connect", () => addLog(`connected sid=${socket.id}`));
		socket.on("join_room_success", (data) =>
			addLog(`join ok ${JSON.stringify(data)}`)
		);
		socket.on("auth_error", (data) =>
			addLog(`auth error ${JSON.stringify(data)}`)
		);
		socket.on("worker_update", (data) =>
			addLog(`worker_update ${JSON.stringify(data)}`)
		);
		socket.on("disconnect", () => addLog("disconnected"));
		socketRef.current = socket;
	};

	const joinRoom = () => {
		socketRef.current?.emit("join_room", {
			room_id: roomId,
			client_id: CLIENT_ID,
			access_token: CLIENT_TOKEN,
		});
	};

	const sendClaim = () => {
		socketRef.current?.emit("post_message", {
			room_id: roomId,
			client_id: CLIENT_ID,
			access_token: CLIENT_TOKEN,
			client_claim_id: crypto.randomUUID(),
			claim,
		});
	};

	return (
		<div className="min-h-screen bg-slate-100 text-slate-900 p-6 space-y-4">
			<h1 className="text-3xl font-bold">Client Portal</h1>
			<p>
				Connect your social-media client, submit claims, and receive
				realtime verdicts.
			</p>

			<div className="flex flex-wrap gap-2 items-center">
				<select
					className="border rounded p-2"
					value={roomId}
					onChange={(e) => setRoomId(e.target.value)}
				>
					{rooms.length ? (
						rooms.map((r) => (
							<option key={r.room_id}>{r.room_id}</option>
						))
					) : (
						<option>{roomId}</option>
					)}
				</select>
				<button
					className="bg-slate-900 text-white px-3 py-2 rounded"
					onClick={connect}
				>
					Connect
				</button>
				<button
					className="bg-cyan-600 text-white px-3 py-2 rounded"
					onClick={joinRoom}
				>
					Join Room
				</button>
			</div>

			<textarea
				className="w-full border rounded p-2 min-h-28"
				value={claim}
				onChange={(e) => setClaim(e.target.value)}
			/>
			<button
				className="bg-emerald-600 text-white px-3 py-2 rounded"
				onClick={sendClaim}
			>
				Send Claim
			</button>

			<div className="bg-black text-green-300 rounded p-3 min-h-64 max-h-96 overflow-auto text-xs">
				{logs.map((l, i) => (
					<div key={`${i}-${l}`}>{l}</div>
				))}
			</div>
		</div>
	);
}
