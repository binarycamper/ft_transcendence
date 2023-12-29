import axios from 'axios';

export default async function handleSignup() {
	try {
		const response = await axios.get('http://localhost:8080/auth/signup', {
			withCredentials: true,
		});
		window.location.href = response.data.url;
	} catch (error) {
		console.error('Failed to initiate signup', error);
	}
}
