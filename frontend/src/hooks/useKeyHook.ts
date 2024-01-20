import { getGameSettings } from '../components/Pong/GameDefaults';
import { gameSocket as socket } from '../services/socket';
import { useEffect } from 'react';

export interface KeyMap {
	down: string;
	mod: string;
	up: string;
}

export default function useKeyHook() {
	useEffect(() => {
		const settings = getGameSettings();
		const { keyMapP1, keyMapP2 } = settings;
		const mapping = {
			[keyMapP1.down]: { key: 'down', player: 1 },
			[keyMapP1.mod]: { key: 'mod', player: 1 },
			[keyMapP1.up]: { key: 'up', player: 1 },
			[keyMapP2.down]: { key: 'down', player: 2 },
			[keyMapP2.mod]: { key: 'mod', player: 2 },
			[keyMapP2.up]: { key: 'up', player: 2 },
		};

		function translateKeyEvent(event: KeyboardEvent) {
			return mapping[event.code];
			/* switch (event.code) {
				case keyMapP1.down:
					return { key: 'down', player: 1 };
				case keyMapP1.mod:
					return { key: 'mod', player: 1 };
				case keyMapP1.up:
					return { key: 'up', player: 1 };
				case keyMapP2.down:
					return { key: 'down', player: 2 };
				case keyMapP2.mod:
					return { key: 'mod', player: 2 };
				case keyMapP2.up:
					return { key: 'up', player: 2 };
				default:
					return null;
			} */
		}

		function handleKeyEvent(event: KeyboardEvent, pressed: boolean) {
			const action = translateKeyEvent(event);
			if (!action) return;

			event.preventDefault();
			if (event.repeat) return;

			const { key, player } = action;
			socket.emit('update-keystate', { key, player, pressed });
		}

		function handleKeyDown(event: KeyboardEvent) {
			/* console.log(`D: ${event.code} [${event.key}]`); */
			handleKeyEvent(event, true);
		}

		function handleKeyUp(event: KeyboardEvent) {
			/* console.log(`U: ${event.code} [${event.key}]`); */
			handleKeyEvent(event, false);
		}

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		/* console.log('KeyHook added'); */

		return () => {
			window.removeEventListener('keyup', handleKeyUp);
			window.removeEventListener('keydown', handleKeyDown);
			socket.off('update-keystate');
			/* console.log('KeyHook removed'); */
		};
	}, []);
}
