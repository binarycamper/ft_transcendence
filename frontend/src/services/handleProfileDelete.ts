export default async function handleProfileDelete() {
	if (
		window.confirm('Are you sure you want to delete your account? This action cannot be undone!')
	) {
		try {
			const response = await fetch('http://localhost:8080/user/delete?confirm=true', {
				method: 'DELETE',
				credentials: 'include',
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = await response.json();
			console.log('Account deletion successful:', result);
			localStorage.clear();
			window.location.replace('/'); // loads fresh dashboard page
		} catch (error) {
			console.error('There was an error deleting the account:', error);
		}
	}
}
