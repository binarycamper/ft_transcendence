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

	useEffect(() => {
		// Fetch the user's profile data
		const fetchProfile = async () => {
			try {
				const response = await fetch('http://localhost:8080/user/profile', {
					credentials: 'include',
				});
				if (!response.ok) {
					throw new Error('Profile fetch failed');
				}
				const profileData: UserProfile = await response.json();
				setProfile(profileData);
				if (profileData.image) {
					// If there is a new image, fetch it
					fetchImage(profileData.image);
				}
			} catch (error) {
				console.log('Error fetching profile:', error);
				navigate('/login'); // Redirect to error page
			}
		};

		fetchProfile();
	}, [navigate]);

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
				const errorMessage =
					responseData.message || 'There was an error processing your request.';
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
			window.confirm(
				'Are you sure you want to delete your account? This action cannot be undone.',
			)
		) {
			try {
				const response = await fetch(
					'http://localhost:8080/user/delete?confirm=true',
					{
						method: 'DELETE',
						credentials: 'include',
					},
				);

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const result = await response.json();
				console.log('Account deletion successful:', result);
				localStorage.clear();
				navigate('/');
			} catch (error) {
				console.error('There was an error deleting the account:', error);
			}
		}
	};

	/*
	 * Todoo:
	 *
	 * Request always with credentials!:
	 * Post /user/editName {Nickname: Lorem}
	 *
	 * If response == OK then redirect to profile, stay & refresh or whatever
	 * else explain error, like name already taken
	 */
	const changeNickname = async () => {
		// Trim the newNickname to remove whitespace from both ends and check if it's empty
		if (!newNickname.trim()) {
			setNicknameError('Nickname cannot be empty.');
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
			} else if (response.status === HttpStatusCode.BadRequest) {
				const errorData = await response.json();
				setNicknameError(errorData.message);
			} else {
				throw new Error('Failed to change nickname.');
			}
		} catch (error) {
			if (error instanceof Error) {
				console.error('Error changing nickname:', error);
				setNicknameError(error.message || 'An unexpected error occurred.');
			} else {
				console.error('An unexpected error occurred:', error);
				setNicknameError('An unexpected error occurred.');
			}
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
