import axios from 'axios';
import fetchUrl from './fetchUrl';

export default async function handleSignup() {
	try {
		const response = await axios.get(fetchUrl('8080','/auth/signup'), {
			withCredentials: true,
		});
		window.location.href = response.data.url;
	} catch (error) {
		console.error('Failed to initiate signup', error);
	}
}
