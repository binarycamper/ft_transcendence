import { useEffect, useRef } from 'react';
import { socket } from '../services/socket';

type UseKeyHookProps = {
	onKeyChange?: (key: string, isPressed: boolean) => void;
};
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
			//console.log('keyDown', event);
			socket.emit('keydown', { event: event.code });
			/* console.log(`D: ${event.code} [${event.key}]`); */
		}
		function handleKeyUp(event: KeyboardEvent) {
			keyState[event.code] = false;
			/* console.log(`U: ${event.code} [${event.key}]`); */
			//console.log('keyUp: ', event);
			socket.emit('keyUp', { event: event.code });
		}

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		return () => {
			window.removeEventListener('keyup', handleKeyUp);
			window.removeEventListener('keydown', handleKeyDown);
			console.log('KeyHook removed');
		};
	}, []);

	return ref.current;
}
