import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Anchor,
	Button,
	Center,
	Checkbox,
	Paper,
	PasswordInput,
	Text,
	TextInput,
} from '@mantine/core';

export function Login() {
	const navigate = useNavigate();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');

	async function handleLogin(email: string, password: string) {
		try {
			const response = await fetch('http://localhost:8080/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email, password }),
				credentials: 'include',
			});

			if (response.ok) {
				console.log('HEaders of Login: ', response.headers);
				navigate('/profile'); // Navigate to profile with the data
			} else {
				console.error('Login fehlgeschlagen');
			}
		} catch (error) {
			console.error('Failed to initiate login', error);
		}
	}

	async function handleSignup() {
		try {
			const response = await axios.get('http://localhost:8080/auth/signup', {
				withCredentials: true,
			});
			window.location.href = response.data.url;
		} catch (error) {
			console.error('Failed to initiate signup', error);
		}
	}

	const handleLoginClick = () => {
		handleLogin(email, password);
	};

	return (
		<Center my={200}>
			<Paper className="signup" radius={0} p={30}>
				<Paper withBorder shadow="md" p={100} mt={30} mb={50} radius="md">
					<TextInput
						label="Email address"
						placeholder="intra@student.42Heilbronn.de"
						size="md"
						value={email}
						onChange={(event) => setEmail(event.currentTarget.value)}
					/>
					<PasswordInput
						label="Password"
						placeholder="Your password"
						mt="md"
						size="md"
						value={password}
						onChange={(event) => setPassword(event.currentTarget.value)}
					/>
					<Checkbox label="Keep me logged in" mt="xl" size="md" />
					<Button fullWidth mt="xl" size="md" onClick={handleLoginClick}>
						Login
					</Button>
					<Text ta="center" mt="md">
						Don’t have an account?{' '}
						<Anchor<'a'> fw={700} onClick={handleSignup}>
							Register
						</Anchor>
					</Text>
				</Paper>
			</Paper>
		</Center>
	);
}
