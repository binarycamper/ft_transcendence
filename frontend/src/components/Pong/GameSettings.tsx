import { ChangeEvent, useReducer } from 'react';
import Settings, {
	compareStuctureOfJSONs,
	defaultSettings,
	getSettingsLocalStorage,
	saveSettingsLocalStorage,
} from './GameDefaults';
/* eslint-disable no-case-declarations */

type Action =
	| { type: 'HANDLE_INPUT_CHANGE'; payload: { name: string; value: string } }
	| { type: 'RESET_SETTINGS'; payload: Settings };

function settingsReducer(state: Settings, action: Action): Settings {
	switch (action.type) {
		case 'HANDLE_INPUT_CHANGE':
			const { name, value } = action.payload;
			const [parent, child] = name.split('.');
			const newState = { ...state }; // TODO shallow copy problem?
			if (parent === 'keyMapP1' || parent === 'keyMapP2') {
				newState[parent] = {
					...newState[parent],
					[child]: value,
				};
			} else if (parent === 'aspectRatio') {
				newState[parent] = {
					...newState[parent],
					[child]: parseFloat(value),
				};
			} else if (parent in defaultSettings) {
				newState[parent] = parseFloat(value);
			}
			return newState;
		case 'RESET_SETTINGS':
			return action.payload;
		default:
			throw new Error('Unhandled action type');
	}
}

function createInitialState(initialSettings: Settings) {
	const savedSettings = getSettingsLocalStorage();
	if (!savedSettings) {
		saveSettingsLocalStorage(initialSettings);
		return initialSettings;
	}
	return savedSettings;
}

export default function GameSettings() {
	const [settings, dispatch] = useReducer(settingsReducer, defaultSettings, createInitialState);

	function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
		const { name, value } = e.target;
		dispatch({ type: 'HANDLE_INPUT_CHANGE', payload: { name, value } });
	}

	function saveSettings() {
		saveSettingsLocalStorage(settings);
		alert('Settings saved successfully!');
	}

	function resetToDefault() {
		dispatch({ type: 'RESET_SETTINGS', payload: defaultSettings });
		saveSettingsLocalStorage(defaultSettings);
	}

	if (!compareStuctureOfJSONs(settings, defaultSettings)) {
		console.log('settingsState', defaultSettings);
		console.log('Settings got corrupted! Resetting settings...');
		resetToDefault();
	}

	return (
		<div>
			{settings && (
				<div>
					<h2>Settings</h2>
					<label>
						Aspect Ratio X:
						<input
							type="number"
							name="aspectRatio.x"
							value={settings.aspectRatio.x}
							onChange={handleInputChange}
						/>
					</label>
					<br />
					<label>
						Aspect Ratio Y:
						<input
							type="number"
							name="aspectRatio.y"
							value={settings.aspectRatio.y}
							onChange={handleInputChange}
						/>
					</label>
					<br />
					<label>
						Ball Width:
						<input
							type="number"
							name="ballWidth"
							value={settings.ballWidth}
							onChange={handleInputChange}
						/>
					</label>
					<br />
					<label>
						Paddle Gap:
						<input
							type="number"
							name="paddleGap"
							value={settings.paddleGap}
							onChange={handleInputChange}
						/>
					</label>
					<br />
					<label>
						Paddle Height:
						<input
							type="number"
							name="paddleHeight"
							value={settings.paddleHeight}
							onChange={handleInputChange}
						/>
					</label>
					<br />
					<label>
						Paddle Width:
						<input
							type="number"
							name="paddleWidth"
							value={settings.paddleWidth}
							onChange={handleInputChange}
						/>
					</label>
					<br />
					<label>
						Wall Height:
						<input
							type="number"
							name="wallHeight"
							value={settings.wallHeight}
							onChange={handleInputChange}
						/>
					</label>
					<br />
					<label>
						P1 Up Key:
						<input
							type="text"
							name="keyMapP1.up"
							value={settings.keyMapP1.up}
							onChange={handleInputChange}
						/>
					</label>
					<br />
					<label>
						P1 Down Key:
						<input
							type="text"
							name="keyMapP1.down"
							value={settings.keyMapP1.down}
							onChange={handleInputChange}
						/>
					</label>
					<br />
					<label>
						P1 Modifier Key:
						<input
							type="text"
							name="keyMapP1.mod"
							value={settings.keyMapP1.mod}
							onChange={handleInputChange}
						/>
					</label>
					<br />
					<label>
						P2 Up Key:
						<input
							type="text"
							name="keyMapP2.up"
							value={settings.keyMapP2.up}
							onChange={handleInputChange}
						/>
					</label>
					<br />
					<label>
						P2 Down Key:
						<input
							type="text"
							name="keyMapP2.down"
							value={settings.keyMapP2.down}
							onChange={handleInputChange}
						/>
					</label>
					<br />
					<label>
						P2 Modifier Key:
						<input
							type="text"
							name="keyMapP2.mod"
							value={settings.keyMapP2.mod}
							onChange={handleInputChange}
						/>
					</label>
					<br />
					<button onClick={saveSettings}>Save Settings</button>
					<button onClick={resetToDefault}>Reset to Default</button>
				</div>
			)}
		</div>
	);
}
