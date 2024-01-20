import { FormEvent, useState } from 'react';
import fetchUrl from '../services/fetchUrl';
import { useNavigate } from 'react-router-dom';

export default function ResetAccount() {
	const [email, setEmail] = useState('');
	const navigate = useNavigate();

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		try {
			const response = await fetch(fetchUrl('8080', '/auth/reset-password'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email }),
			});
			if (response.ok) {
				alert('E-mail sent for password reset.');
				navigate('/login');
			} else {
				alert('Ups, something went wrong. Try later Again.');
				navigate('/login');
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
