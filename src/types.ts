/* eslint-disable @typescript-eslint/naming-convention */

export interface GatewayEvent {
	op: GatewayOpcode,
	d: unknown,
	s?: number,
	t?: string
}

export interface Hello {
	heartbeat_interval: number;
}

export interface Ready {
	v: number,
	user: unknown, //TODO: Make user interface
	guilds: unknown[], //TODO: Make guild interface
	session_id: string,
	resume_gateway_url: string,
	shard?: [ number, number ],
	application: unknown //TODO: Make application interface
}

export enum GatewayOpcode {
	Dispatch = 0,
	Heartbeat = 1,
	Identify = 2,
	PresenceUpdate = 3,
	VoiceStateUpdate = 4,
	Resume = 6,
	Reconnect = 7,
	RequestGuildMembers = 8,
	InvalidSession = 9,
	Hello = 10,
	HeartbeatAck = 11,
	RequestSoundboardSounds = 31
}