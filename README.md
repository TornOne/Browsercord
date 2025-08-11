## Browsercord

This library is meant to be used in browsers. It provides a simple interface for access to the Discord Gateway API. (A mostly read-only WebSocket API for listening to events.)

CORS prevents in-browser HTTP requests to Discord, preventing most forms of sending information. That's why this library only allows listening to events as they happen in real-time.  
Still, it has a variety of uses by responding to user actions inside the browser window instead of inside Discord.

## Usage

[Releases](https://github.com/TornOne/Browsercord/releases/latest) has a pre-compiled JS file for use.

Create one new Browsercord object per bot, providing it with your own bot's authentication token and [intents](https://discord.com/developers/docs/events/gateway#gateway-intents).  
Connect, and subscribe to the [events](https://discord.com/developers/docs/events/gateway-events#receive-events) you care about. (Event names are in uppercase e.g. "MESSAGE_CREATE")

Here is the full public class definition (using TypeScript notation):
```ts
export class Browsercord(authToken: string, intents: number) {
	async connect(): Promise<void>
	disconnect(): void
	subscribe(eventName: string, callback: (json: unknown) => void): void
	unsubscribe(eventName: string, callback: (json: unknown) => void): void
	joinVoice(guildId: string, channelId: string): void
	leaveVoice(guildId: string): void
}
```
