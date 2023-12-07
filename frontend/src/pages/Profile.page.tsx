import { HttpStatusCode } from 'axios';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type UserProfile = {
	name: string;
	nickname: string;
	email: string;
	status: string;
	intraId: number;
	imageUrl: string;
	image?: string;
	id: string;
};

export function Profile() {
	// State for holding the user profile
	const [profile, setProfile] = useState<UserProfile | null>(null);
	// State for holding the selected file
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	// State for toggling between new and existing images
	const [useNewImage, setUseNewImage] = useState(false);
	// State for holding the image URL
	const [imageUrl, setImageUrl] = useState('');
	const [newNickname, setNewNickname] = useState(''); // State to hold the new nickname input by the user
	const [nicknameError, setNicknameError] = useState(''); // State to hold any error message
	const navigate = useNavigate();

	useEffect(() => {
		let isSubscribed = true; // This flag will prevent state updates if the component is unmounted

		// Define the function to fetch the user's profile data
		const fetchProfile = async () => {
			// Introduce a delay before fetching profile data that database is up to date.
			const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
			await delay(500); // Wait for 0.5 seconds
			try {
				const response = await fetch('http://localhost:8080/user/profile', {
					credentials: 'include',
				});
				if (!response.ok) {
					throw new Error('Profile fetch failed');
				}
				const profileData: UserProfile = await response.json();
				console.log('User profile data: ', profileData);
				if (isSubscribed) {
					setProfile(profileData);
				}
			} catch (error) {
				console.error('Error fetching profile:', error);
				if (isSubscribed) {
					navigate('/login'); // Redirect to error page only if the component is still mounted
				}
			}
		};

		// Call fetchProfile when the component mounts
		fetchProfile();

		// Set up an interval to fetch the profile every 300 seconds
		const intervalId = setInterval(fetchProfile, 30000); // 300000 ms = 300 seconds

		// Clean up the interval and the isSubscribed flag when the component unmounts
		return () => {
			clearInterval(intervalId);
		};
	}, [navigate]);

	const toggleImage = () => {
		if (profile && profile.image) {
			setUseNewImage(!useNewImage);
		}
	};

	const fetchImage = async (image: string) => {
		try {
			const response = await fetch(image, {
				method: 'GET',
				credentials: 'include', // Necessary for cookies, e.g. when using sessions
			});
			if (!response.ok) {
				throw new Error(`Image fetch failed: ${response.statusText}`);
			}
			const blob = await response.blob();
			setImageUrl(URL.createObjectURL(blob));
		} catch (error) {
			console.error('Error fetching image:', error);
		}
	};

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files) {
			setSelectedFile(event.target.files[0]);
		}
	};

	const handleImageUpload = async () => {
		if (!selectedFile) {
			alert('Please select an image to upload.');
			return;
		}

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
	};

	const handleDelete = async () => {
		if (
			window.confirm('Are you sure you want to delete your account? This action cannot be undone.')
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
	};

	const changeNickname = async () => {
		// Trim the newNickname to remove whitespace from both ends and check if it's empty
		if (!newNickname.trim()) {
			setNicknameError('Nickname cannot be empty.');
			return; // Exit the function early if the nickname is empty
		}

		if (newNickname.length > 100) {
			setNicknameError('Nickname must be smaller then 100.');
			return; // Exit the function early if the nickname is empty
		}
		// Reset error message
		setNicknameError('');

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
					setNicknameError(messages.join(' ')); // Join all messages into a single string
				} else {
					// If it's not an array, it might be a single message
					setNicknameError(errorData.message || 'An unexpected error occurred.');
				}
			}
		} catch (error) {
			setNicknameError('Failed to change nickname. Please try again.');
		}
	};

	if (!profile) {
		return <div>Loading profile...</div>;
	}

	return (
		<div>
			<h1>Profile</h1>
			<img
				src={useNewImage && profile.image ? imageUrl : profile.imageUrl}
				alt={`${profile.name}'s profile`}
			/>
			{profile.image && (
				<button onClick={toggleImage}>
					{useNewImage ? 'Show Original Image' : 'Show New Image'}
				</button>
			)}
			<p>Name: {profile.name}</p>
			<p>Nickname: {profile.nickname}</p>
			<p>Email: {profile.email}</p>
			<p>Status: {profile.status}</p>
			<p>IntraId: {profile.intraId}</p>
			<input type="file" onChange={handleFileChange} />
			<button onClick={handleImageUpload}>Upload New Image</button>
			<button onClick={handleDelete}>Delete My Account</button>
			<button onClick={changeNickname}>Change Nickname</button>
			<input
				type="text"
				value={newNickname}
				onChange={(e) => setNewNickname(e.target.value)}
				placeholder="Enter new nickname"
			/>
			<button onClick={changeNickname}>Change Nickname</button>
			{nicknameError && <p style={{ color: 'red' }}>{nicknameError}</p>}
		</div>
	);
}
