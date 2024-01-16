import { ColorSchemeToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';
import GameSettings from '../components/Pong/GameSettings';

export function Settings() {
	return (
		<>
			<ColorSchemeToggle />
			<GameSettings />
		</>
	);
}
