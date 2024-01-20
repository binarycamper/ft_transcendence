import { FormEvent, useState } from 'react';
import fetchUrl from '../services/fetchUrl';

export default function ResetAccount() {
	const [email, setEmail] = useState('');

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		try {
			const response = await fetch(fetchUrl('8080','/auth/reset-password'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email }),
			});
			if (response.ok) {
				console.log('E-mail sent for password reset.');
			} else {
				console.log('Password reset email sent. Error sending the email.');
			}
		} catch (error) {
			console.error('Error:', error);
		}
	}

	return (
		<div>
			<h1>Reset Account</h1>
			<form onSubmit={handleSubmit}>
				<label>
					E-Mail:
					<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
				</label>
				<button type="submit"> Confirm </button>
			</form>
		</div>
	);
}
