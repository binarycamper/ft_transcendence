import axios from 'axios';
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

export function Login() {
	return (
		<Center my={200}>
			<Paper className="login" radius={0} p={30}>
				<Paper withBorder shadow="md" p={100} mt={30} mb={50} radius="md">
					<TextInput label="Email address" placeholder="intra@student.42Heilbronn.de" size="md" />
					<PasswordInput label="Password" placeholder="Your password" mt="md" size="md" />
					<Checkbox label="Keep me logged in" mt="xl" size="md" />
					<Button fullWidth mt="xl" size="md">
						Login
					</Button>
				</Paper>
				<Text ta="center" mt="md">
					<Anchor<'a'> fw={700} onClick={handleSignup}>
						Register
					</Anchor>
				</Text>
			</Paper>
		</Center>
	);
}
