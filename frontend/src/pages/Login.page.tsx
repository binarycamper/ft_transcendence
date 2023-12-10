// import axios from 'axios';
// import { useState } from 'react';
// import { Navigate, useNavigate } from 'react-router-dom';
// import {
// 	Anchor,
// 	Button,
// 	Center,
// 	Checkbox,
// 	Paper,
// 	PasswordInput,
// 	Text,
// 	TextInput,
// } from '@mantine/core';

// async function handleSignup() {
// 	try {
// 		const response = await axios.get('http://localhost:8080/auth/signup', {
// 			withCredentials: true,
// 		});

// 		window.location.href = response.data.url;
// 	} catch (error) {
// 		console.error('Failed to initiate signup', error);
// 	}
// }

// // async function handleLogin() {
// // 	try {
// // 		const response = await axios.post('http://localhost:8080/auth/login', {
// // 			withCredentials: true,
// // 		});

// // 		window.location.href = response.data.url;
// // 	} catch (error) {
// // 		console.error('Failed to initiate login', error);
// // 	}
// // }

// async function handleLogin(email: string, password: string) {
// 	try {
// 		const response = await fetch('http://localhost:8080/auth/login', {
// 			method: 'POST',
// 			headers: {
// 				'Content-Type': 'application/json', // Setzen Sie den Content-Type auf application/json
// 			},
// 			body: JSON.stringify({ email, password }),
// 			credentials: 'include',
// 		});

// 		console.log(response);

// 		if (response.ok) {
// 			const data = await response.json(); // Parsen Sie die JSON-Antwort
// 			console.log('data: ', data);
// 			navigate('/profile');
// 			// window.location.href = '/profile'; // Navigieren zum Profilbereich
// 			// window.location.href = data.data.url; // Navigieren zum Profilbereich
// 		} else {
// 			console.error('Login fehlgeschlagen');
// 		}
// 	} catch (error) {
// 		console.error('Failed to initiate login', error);
// 	}
// }

// export function Login() {
// 	const [email, setEmail] = useState(''); // Zustand für die E-Mail-Adresse
// 	const [password, setPassword] = useState(''); // Zustand für das Passwort
// 	const navigate = useNavigate();

// 	// Event-Handler für den Login-Button
// 	const handleLoginClick = () => {
// 		handleLogin(email, password);
// 	};

// 	return (
// 		<Center my={200}>
// 			<Paper className="signup" radius={0} p={30}>
// 				<Paper withBorder shadow="md" p={100} mt={30} mb={50} radius="md">
// 					<TextInput
// 						label="Email address"
// 						placeholder="intra@student.42Heilbronn.de"
// 						size="md"
// 						value={email}
// 						onChange={(event) => setEmail(event.currentTarget.value)}
// 					/>
// 					<PasswordInput
// 						label="Password"
// 						placeholder="Your password"
// 						mt="md"
// 						size="md"
// 						value={password}
// 						onChange={(event) => setPassword(event.currentTarget.value)}
// 					/>
// 					<Checkbox label="Keep me logged in" mt="xl" size="md" />
// 					<Button fullWidth mt="xl" size="md" onClick={handleLoginClick}>
// 						Login
// 					</Button>
// 					<Text ta="center" mt="md">
// 						<Anchor<'a'> fw={700} onClick={handleSignup}>
// 							Register
// 						</Anchor>
// 					</Text>
// 				</Paper>
// 			</Paper>
// 		</Center>
// 	);
// }

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
				const data = await response.json();
				navigate('/profile'); // Verwenden Sie navigate innerhalb der Komponente
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
						Don’t have an account? Register now
						<Anchor<'a'> fw={700} onClick={handleSignup}>
							Register
						</Anchor>
					</Text>
				</Paper>
			</Paper>
		</Center>
	);
}
