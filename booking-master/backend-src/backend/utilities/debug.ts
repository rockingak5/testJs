export function debug() {
	const debug = 1;
	if (debug) {
		throw new Error('debug');
	}
}
