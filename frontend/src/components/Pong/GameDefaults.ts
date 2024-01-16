import { KeyMap } from '../../hooks/useKeyHook';

const LOCAL_STORAGE_KEY = 'settings';

export function saveSettingsLocalStorage(settings: Settings) {
	localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
}

export function getSettingsLocalStorage(): Settings | null {
	const savedSettings = localStorage.getItem(LOCAL_STORAGE_KEY);
	return savedSettings ? (JSON.parse(savedSettings) as Settings) : null;
}

export function getGameSettings() {
	const savedSettings = getSettingsLocalStorage();
	// if (!savedSettings) return defaultSettings; /* reference */
	if (!savedSettings)
		return JSON.parse(JSON.stringify(defaultSettings)) as Settings; /* deep copy */

	return { ...defaultSettings, ...savedSettings };
}

/* percentages */
export default class Settings {
	constructor(settings?: Partial<Settings>) {
		Object.assign(this, settings);
	}

	aspectRatio = { x: 4, y: 3 };
	ballAccel = 2;
	ballSpeed = 60;
	ballWidth = 2.5;
	computer = false;
	keyMapP1 = defaultKeyMapR;
	keyMapP2 = defaultKeyMapL;
	paddleGap = 2.5;
	paddleHeight = 20;
	paddleSpeed = 60;
	paddleWidth = 2;
	side: 'left' | 'right' = 'left';
	wallHeight = 2;
	[key: string]: unknown;
}

const defaultKeyMapL: KeyMap = {
	up: 'KeyW',
	down: 'KeyS',
	mod: 'ShiftLeft',
};

const defaultKeyMapR: KeyMap = {
	up: 'ArrowUp',
	down: 'ArrowDown',
	mod: 'ShiftRight',
};

export const defaultSettings = new Settings();

type Obj = Record<string, unknown>;
export function compareStuctureOfJSONs(objA: Obj, objB: Obj): boolean {
	const keysA = Object.keys(objA);
	const keysB = Object.keys(objB);
	if (keysA.length !== keysB.length) return false;

	for (const key of keysA) {
		if (!keysB.includes(key)) return false;

		if (typeof objA[key] !== typeof objB[key]) return false;

		if (typeof objA[key] === typeof {})
			if (!compareStuctureOfJSONs(objA[key] as Obj, objB[key] as Obj)) return false;
	}

	return true;
}
