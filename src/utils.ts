export function eventAsPromise(obj: EventTarget, eventName: string): Promise<void> {
	return new Promise(resolve => obj.addEventListener(eventName, () => resolve(), { once: true }));
}