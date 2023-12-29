import { useNavigate } from 'react-router-dom';

export default function use2FA() {
	const navigate = useNavigate();

	async function handleToggle2FA(is2FAEnabled: boolean) {
		try {
			const response = await fetch(
				`http://localhost:8080/auth/toggle-2fa?enable2FA=${!is2FAEnabled}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					credentials: 'include',
				},
			);
			if (response.status === 303) {
				const res = await fetch(`http://localhost:8080/user/id`, {
					method: 'GET',
					credentials: 'include',
				});
				const data = await res.json();
				navigate('/twofactorsetup', { state: { userId: data.id } });
			}

			if (response.ok) {
				window.location.reload();
			}
		} catch (error) {
			console.error('Failed to change 2FA status', error);
		}
	}

	return handleToggle2FA;
}
