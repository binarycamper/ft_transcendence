export function Login() {
	const handleLogin = async () => {
		try {
			const response = await fetch('http://localhost:8080/auth/login');
			if (!response.ok) {
				throw new Error('Login request failed');
			}
			const data = await response.json();
			console.log('Login Response:', data);
			// You would typically redirect the user to the login URL here

			window.location.href = data.url;
		} catch (error) {
			console.error('Failed to initiate login', error);
		}
	};

	return (
		<div>
			<button onClick={handleLogin}>Login</button>
		</div>
	);
}
