import { HttpStatusCode } from 'axios';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type UserProfile = {
	achievements: string[];
	email: string;
	gamesLost: number;
	gamesWon: number;
	has2FA: boolean;
	id: string;
	image?: string /* customImageUpload */;
	imageUrl: string /* intraImageURL */;
	intraId: number;
	ladderLevel: number;
	name: string;
	nickname: string;
	status: string;
};

export default function useProfile() {
	const navigate = useNavigate();

	const [profile, setProfile] = useState<UserProfile | null>(null);

	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [isCustomImage, setIsCustomImage] = useState(false);
	const [customImageURL, setCustomImageURL] = useState('');

	const [newNickname, setNewNickname] = useState('');
	const [errorNickname, setErrorNickname] = useState('');

	const [has2FA, setHas2FA] = useState(false);

	useEffect(() => {
		let isSubscribed = true; // This flag will prevent state updates if the component is unmounted

		async function fetchProfile() {
			// Introduce a delay before fetching profile data that database is up to date.
			const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
			await delay(500); // Wait for 0.5 seconds
			try {
				const response = await fetch('http://localhost:8080/user/profile', {
					credentials: 'include',
				});
				if (!response.ok) {
					navigate('/login');
				}
				const profileData: UserProfile = await response.json();
				// console.log('User profile data: ', profileData);
				if (isSubscribed) {
					setProfile(profileData);
					if (profileData.image) {
						fetchImage(profileData.image);
					}
				}

				// Set the 2FA status
				setHas2FA(profileData.isTwoFactorAuthenticationEnabled);
			} catch (error) {
				console.error('Error fetching profile:', error);
				if (isSubscribed) {
					navigate('/login');
				}
			}
		}

		fetchProfile();
		/* fetch every 30 seconds, while component is active */
		const intervalId = setInterval(fetchProfile, 30_000);

		return () => {
			isSubscribed = false;
			clearInterval(intervalId);
		};
	}, [navigate]);

	function toggleImage() {
		if (profile && profile.image) {
			setIsCustomImage(!isCustomImage);
		}
	}

	async function fetchImage(image: string) {
		try {
			const response = await fetch(image, {
				method: 'GET',
				credentials: 'include',
			});
			if (!response.ok) {
				throw new Error(`Image fetch failed: ${response.statusText}`);
			}
			const blob = await response.blob();
			setCustomImageURL(URL.createObjectURL(blob));
		} catch (error) {
			console.error('Error fetching image:', error);
		}
	}

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		if (event.target.files) {
			setSelectedFile(event.target.files[0]);
		}
	}

	async function handleImageUpload() {
		if (!selectedFile) return alert('Please select an image to upload.');

		const formData = new FormData();
		formData.append('image', selectedFile);
		try {
			const response = await fetch('http://localhost:8080/user/uploadImage', {
				method: 'POST',
				credentials: 'include',
				body: formData,
			});

			let responseData;
			if (response.status === HttpStatusCode.BadRequest) {
				responseData = await response.json(); // Read and store the response body
				const errorMessage = responseData.message || 'There was an error processing your request.';
				console.log(errorMessage);
				const userGuidance =
					'Please ensure the file is an image with one of the following types: .jpg, .jpeg, .png';
				console.log(userGuidance);
			} else if (!response.ok) {
				throw new Error('Failed to upload image.');
			} else {
				responseData = await response.json(); // Read and store the response body for a successful response
				setProfile({
					...profile,
					imageUrl: responseData.imageUrl,
				} as UserProfile); // Update the profile image
			}
		} catch (error) {
			console.error('Error uploading image:', error);
		}
		window.location.reload(); // Refreshes the current page
	}

	async function changeNickname() {
		if (!newNickname.trim()) return setErrorNickname('Nickname cannot be empty.');

		if (newNickname.length > 100) return setErrorNickname('Nickname must be smaller than 100.');

		setErrorNickname(''); // Reset error message

		try {
			const response = await fetch('http://localhost:8080/user/editName', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({ nickname: newNickname.trim() }), // Send the trimmed nickname
			});

			if (response.ok) {
				const updatedProfile = await response.json();
				if (profile) {
					setProfile({
						...profile,
						nickname: updatedProfile.nickname, // Update the nickname in the state
					});
				}
				window.location.reload(); // Refreshes the current page
			} else {
				const errorData = await response.json();
				if (Array.isArray(errorData.message)) {
					const messages = (errorData.message as Array<any>).map((errorItem) =>
						Object.values(errorItem.constraints || {}).join('. '),
					);
					setErrorNickname(messages.join(' ')); // Join all messages into a single string
				} else {
					// If it's not an array, it might be a single message
					setErrorNickname(errorData.message || 'An unexpected error occurred.');
				}
			}
		} catch (error) {
			setErrorNickname('Failed to change nickname. Please try again.');
		}
	}

	async function handleToggle2FA() {
		try {
			const response = await fetch(`http://localhost:8080/auth/toggle-2fa`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({
					has2FA,
				}),
			});

			if (response.ok) {
				if (!has2FA) {
					navigate('/twofactorsetup');
				} else if (has2FA) {
					window.location.reload();
				}

				// window.location.reload();
			} else {
				console.error('Failed to change 2FA status');
			}
		} catch (error) {
			console.error('Failed to change 2FA status:', error);
		}
	}

	return {
		changeNickname,
		customImageURL,
		errorNickname,
		handleFileChange,
		handleImageUpload,
		handleToggle2FA,
		isCustomImage,
		newNickname,
		profile,
		setNewNickname,
		toggleImage,
		has2FA,
	};
}