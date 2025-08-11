import * as utils from "./utils";
import { type GatewayEvent, type Hello, type Ready, GatewayOpcode } from "./types";

//https://discord.com/developers/docs/events/gateway
//https://discord.com/developers/docs/events/gateway-events

export class Browsercord {
	private socket?: WebSocket;
	private resolveReady?: () => void;

	private readonly opcodeEventActions = new Map<GatewayOpcode, (json: unknown) => void>();
	private readonly eventSubscriptions = new Map<string, Set<(json: unknown) => void>>();
	private heartbeatAcknowledged = false;
	private hearbeatLoop?: number;
	private lastS?: number;
	private sessionId?: string;
	private resumeGatewayUrl?: string;

	private helloResponse: () => void;

	constructor(private readonly authToken: string, private readonly intents: number) {
		this.opcodeEventActions.set(GatewayOpcode.Heartbeat, this.heartbeat);
		this.opcodeEventActions.set(GatewayOpcode.Hello, this.hello);
		this.opcodeEventActions.set(GatewayOpcode.HeartbeatAck, this.heartbeatAck);
		this.opcodeEventActions.set(GatewayOpcode.Reconnect, this.reconnect);

		this.subscribe("READY", this.onReady);
		this.subscribe("RESUMED", this.onResumed);

		this.helloResponse = (): void => {
			console.log("Identifying");
			this.send(GatewayOpcode.Identify, {
				token: this.authToken,
				properties: {
					os: "linux",
					browser: "Browsercord",
					device: "Browsercord"
				},
				intents: this.intents
			});

			this.helloResponse = (): void => {
				console.log("Resuming");
				this.send(GatewayOpcode.Resume, {
					token: this.authToken,
					// eslint-disable-next-line @typescript-eslint/naming-convention
					session_id: this.sessionId,
					seq: this.lastS
				});
			};
		};
	}

	async connect(): Promise<void> {
		console.log("Getting gateway address");
		const gatewayUrl = (await (await fetch("https://discord.com/api/v10/gateway")).json() as Record<string, unknown>).url as string;
		await this.openSocket(gatewayUrl);
	}

	private async openSocket(gatewayUrl: string): Promise<void> {
		console.log(`Connecting to ${gatewayUrl}`);
		this.socket = new WebSocket(`${gatewayUrl}/?v=10&encoding=json`);
		this.socket.addEventListener("message", event => this.onMessage(event as MessageEvent<string>));
		this.socket.addEventListener("close", event => {
			clearInterval(this.hearbeatLoop);
			console.log(`Socket closed ${event.wasClean ? "cleanly" : "uncleanly"} - ${event.code} ${event.reason}`);
		}, { once: true });
		await utils.eventAsPromise(this.socket, "open");

		console.log("Connection successful. Waiting for Hello.");
		return new Promise<void>(resolve => this.resolveReady = resolve);
	}

	disconnect(): void {
		this.socket?.close(1000);
	}

	subscribe(eventName: string, callback: (json: unknown) => void): void {
		let subscribers = this.eventSubscriptions.get(eventName);
		if (subscribers === undefined) {
			subscribers = new Set<(json: unknown) => void>();
			this.eventSubscriptions.set(eventName, subscribers);
		}
		subscribers.add(callback);
	}

	unsubscribe(eventName: string, callback: (json: unknown) => void): void {
		this.eventSubscriptions.get(eventName)?.delete(callback);
	}

	joinVoice(guildId: string, channelId: string | null): void {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		this.send(GatewayOpcode.VoiceStateUpdate, { guild_id: guildId, channel_id: channelId, self_mute: false, self_deaf: false });
	}

	leaveVoice(guildId: string): void {
		this.joinVoice(guildId, null);
	}

	private onMessage(event: MessageEvent<string>): void {
		const gatewayEvent = JSON.parse(event.data) as GatewayEvent;
		if (gatewayEvent.op > GatewayOpcode.Dispatch) {
			this.opcodeEventActions.get(gatewayEvent.op)?.call(this, gatewayEvent.d);
		} else if (gatewayEvent.op === GatewayOpcode.Dispatch) {
			this.lastS = gatewayEvent.s;
			for (const event of this.eventSubscriptions.get(gatewayEvent.t!) ?? []) {
				event.call(this, gatewayEvent.d);
			}
		}
	}

	private send(op: number, d: unknown): void {
		this.socket?.send(JSON.stringify({ op, d }));
	}

	private hello(json: unknown): void {
		const interval = (json as Hello).heartbeat_interval;
		console.log(`Starting heartbeat with ${interval}ms interval`);
		this.hearbeatLoop = setTimeout(() => {
			this.heartbeat();
			this.hearbeatLoop = setInterval(() => {
				if (!this.heartbeatAcknowledged) {
					this.disconnect();
					void this.reconnect(null);
					console.warn("Heartbeat not acknowledged. Reconnecting.");
					return;
				}
				this.heartbeat();
				this.heartbeatAcknowledged = false;
			}, interval);
		}, Math.random() * interval);

		this.helloResponse();
	}

	private heartbeat(): void {
		this.send(GatewayOpcode.Heartbeat, this.lastS ?? null);
	}

	private heartbeatAck(): void {
		this.heartbeatAcknowledged = true;
	}

	private onReady(json: unknown): void {
		this.resolveReady!();
		console.log("Identification successful");

		const ready = json as Ready;
		this.sessionId = ready.session_id;
		this.resumeGatewayUrl = ready.resume_gateway_url;
	}

	private onResumed(_: unknown): void {
		this.resolveReady!();
		console.log("Resumed");
	}

	private reconnect(_: unknown): Promise<void> {
		return this.openSocket(this.resumeGatewayUrl!);
	}
}