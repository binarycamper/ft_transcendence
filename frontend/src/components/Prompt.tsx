import { useBlocker } from 'react-router-dom';

interface Props {
	when: boolean;
	message: string;
}

export default function Prompt({ message, when }: Props) {
	const block = when;

	useBlocker(() => {
		if (block) {
			return !window.confirm(message);
		}
		//console.log('pressed no?');
		return false;
	});

	return <div />;

	//return <div key={block} />;
}
