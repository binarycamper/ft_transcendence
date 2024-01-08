import { useBlocker } from 'react-router-dom';

interface Props {
	message: string;
	when: boolean;
}

export default function Prompt({ message, when }: Props) {
	const block = when;

	useBlocker(() => {
		if (block) {
			return !window.confirm(message);
		}
		return false;
	});

	return null;
}
