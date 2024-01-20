import { FormEvent, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';
import styles from '../css/ResetPassword.module.css'; // Korrigierter Pfad
import fetchUrl from '../services/fetchUrl';

export default function ResetPassword() {
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const { token } = useParams();
	const navigate = useNavigate();
	const [passwordWarning, setPasswordWarning] = useState<string[]>([]);
	const [passwordError, setPasswordError] = useState('');
	const [info, setInfo] = useState('');
	const [confirmPasswordError, setConfirmPasswordError] = useState('');
	const [confirmPasswordWarning, setConfirmPasswordWarning] = useState<string[]>([]);

	function validatePassword(password: string) {
		let error = false;
		const options = {
			translations: zxcvbnEnPackage.translations,
			graphs: zxcvbnCommonPackage.adjacencyGraphs,
			dictionary: {
				...zxcvbnCommonPackage.dictionary,
				...zxcvbnEnPackage.dictionary,
			},
		};
		zxcvbnOptions.setOptions(options);
		const result = zxcvbn(password);
		if (result.feedback.warning) {
			setPasswordError(result.feedback.warning);
			error = true;
		} else {
			setPasswordError('');
		}
		if (result.feedback.suggestions) {
			setPasswordWarning(result.feedback.suggestions);
		} else {
			setPasswordWarning([]);
		}
		if (error) {
			return false;
		}
		return true;
	}

	function handlePasswordChange(event: React.ChangeEvent<HTMLInputElement>) {
		setPassword(event.target.value);
		if (event.target.value.length > 0) {
			validatePassword(password);
		} else {
			setPasswordError('');
			setPasswordWarning([]);
		}
	}

	function handleConfirmPasswordChange(event: React.ChangeEvent<HTMLInputElement>) {
		setConfirmPassword(event.target.value);
		if (event.target.value.length > 0 || confirmPassword.length > 0) {
			validatePassword(confirmPassword);
		} else {
			setConfirmPasswordError('');
			setConfirmPasswordWarning([]);
		}
	}

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		if (password !== confirmPassword) {
			alert("Passwords don't match!");
			return;
		}

		try {
			const response = await fetch(fetchUrl('8080',`/auth/update-password`), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ newPassword: password, confirmPassword: password, token }),
			});
			if (response.ok) {
				alert('Password updated successfully!');
				navigate('/login');
			} else {
				const responseData = await response.json();
				alert(`Failed to update password: ${responseData.message}`);
			}
		} catch (error) {
			console.error('Error:', error);
		}
	}
	return (
		<div>
			<h1>Reset Your Password</h1>
			{info && <p className={styles.error}>{info}</p>}
			<form onSubmit={handleSubmit}>
				<div>
					<label htmlFor="password">Password:</label>
					<input
						id="password"
						type="password"
						className={styles.inputField}
						value={password}
						onChange={handlePasswordChange}
						required
					/>
					{passwordError && (
						<div className={styles.error}>
							<p>{passwordError}</p>
						</div>
					)}
					{passwordWarning.map((warning, index) => (
						<div key={index} className={styles.warning}>
							<p>{warning}</p>
						</div>
					))}
				</div>
				<div>
					<label htmlFor="confirm-password">Confirm Password:</label>
					<input
						id="confirm-password"
						type="password"
						className={styles.inputField}
						value={confirmPassword}
						onChange={handleConfirmPasswordChange}
						required
					/>
					{confirmPasswordError && (
						<div className={styles.error}>
							<p>{confirmPasswordError}</p>
						</div>
					)}
					{confirmPasswordWarning.map((warning, index) => (
						<div key={index} className={styles.warning}>
							<p>{warning}</p>
						</div>
					))}
				</div>
				<button type="submit" className={styles.submitButton}>
					Reset Password
				</button>
			</form>
		</div>
	);
}
