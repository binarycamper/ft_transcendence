import { useState } from 'react';
import {
	Anchor,
	Button,
	/* Checkbox, */
	Container,
	Group,
	Paper,
	PasswordInput,
	TextInput,
} from '@mantine/core';
import handlePasswordReset from '../services/handlePasswordReset';
import handleSignup from '../services/handleSignup';
import useLogin from '../hooks/useLogin';
import { Form } from 'react-router-dom';

const emptyFieldWarning = 'Please fill out this field';
const errorMessage = 'Invalid username or password';

export function Login() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const { error, setError, handleLogin } = useLogin();

	return (
		<Container my={'20vh'} size={'xs'}>
			<Paper bg={'#1a1b1e'} p={60} radius="md" shadow="md" withBorder>
				<Form
					onSubmit={(event) => {
						event.preventDefault(); // Verhindern des Standard-Formular-Submits
						handleLogin(email, password); // Aufrufen der handleLogin-Funktion
					}}
				>
					<TextInput
						description="User name or email"
						error={error && (!email ? emptyFieldWarning : true)}
						onChange={(event) => setEmail(event.currentTarget.value)}
						onFocus={() => setError(false)}
						placeholder="<intraname>@student.42heilbronn.de"
						radius="md"
						size="lg"
						value={email}
					/>
					<PasswordInput
						description="Password"
						error={error && (!password ? emptyFieldWarning : errorMessage)}
						mt="lg"
						onChange={(event) => setPassword(event.currentTarget.value)}
						onFocus={() => setError(false)}
						radius="md"
						size="lg"
						value={password}
					/>
					<Button
						fullWidth
						mt="xl"
						type="submit" // Macht den Button zum Submit-Button
						radius={'md'}
						size="lg"
					>
						SIGN IN
					</Button>
				</Form>
				<Group justify="space-between">
					<Anchor<'a'> mt="xl" onClick={handleSignup} underline="never">
						Register
					</Anchor>
					<Anchor<'a'> mt="xl" onClick={handlePasswordReset} underline="never">
						Forgot password?
					</Anchor>
				</Group>
				{/* Weitere Komponenten */}
			</Paper>
		</Container>
	);
}
