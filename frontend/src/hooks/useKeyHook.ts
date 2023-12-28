import { useEffect, useRef } from 'react';

export type KeyMap = {
	up: string;
	down: string;
	mod: string;
};

export type KeyState = {
	[key: string]: boolean;
};

export default function useKeyHook(): KeyState {
	const ref = useRef<KeyState>({});

	useEffect(() => {
		const keyState = ref.current;
		function handleKeyDown(event: KeyboardEvent) {
			if (event.code.startsWith('Arrow')) {
				event.preventDefault();
			}
			if (event.repeat) return;
			keyState[event.code] = true;
			/* console.log(`D: ${event.code} [${event.key}]`); */
		}
		function handleKeyUp(event: KeyboardEvent) {
			keyState[event.code] = false;
			/* console.log(`U: ${event.code} [${event.key}]`); */
		}

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		console.log('KeyHook added');

		return () => {
			window.removeEventListener('keyup', handleKeyUp);
			window.removeEventListener('keydown', handleKeyDown);
			console.log('KeyHook removed');
		};
	}, []);

	return ref.current;
}
