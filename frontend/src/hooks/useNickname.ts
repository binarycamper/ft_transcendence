import { useState } from 'react';

export default function useNickname(profile, setProfile) {
	const [newNickname, setNewNickname] = useState('');
	const [errorNickname, setErrorNickname] = useState('');

	async function changeNickname() {
		if (!newNickname.trim()) return setErrorNickname('Nickname cannot be empty.');

		if (newNickname.length > 100) return setErrorNickname('Nickname must be smaller than 100.');

		setErrorNickname('');

		try {
			const response = await fetch('http://localhost:8080/user/editName', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({ nickname: newNickname.trim() }), // Send the trimmed nickname
			});

			if (response.ok) {
				const updatedProfile = await response.json();
				if (profile) {
					setProfile({
						...profile,
						nickname: updatedProfile.nickname, // Update the nickname in the state
					});
				}
				window.location.reload(); // Refreshes the current page
			} else {
				const errorData = await response.json();
				if (Array.isArray(errorData.message)) {
					const messages = (errorData.message as Array<any>).map((errorItem) =>
						Object.values(errorItem.constraints || {}).join('. '),
					);
					setErrorNickname(messages.join(' ')); // Join all messages into a single string
				} else {
					// If it's not an array, it might be a single message
					setErrorNickname(errorData.message || 'An unexpected error occurred.');
				}
			}
		} catch (error) {
			setErrorNickname('Failed to change nickname. Please try again.');
		}
	}

	return { newNickname, changeNickname, setNewNickname, errorNickname };
}
