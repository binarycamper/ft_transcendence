import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type UserProfile = {
	name: string;
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
			const response = await fetch('http://localhost:8080/user/image', {
				method: 'POST',
				credentials: 'include',
				body: formData,
			});

			if (!response.ok) {
				throw new Error('Failed to upload image.');
			}

			const result = await response.json();
			setProfile({ ...profile, imageUrl: result.imageUrl } as UserProfile); // Update the profile image
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
	 * Todoo: navigate to an edit page or implement it here.
	 * requests:
	 * Post /user/editMmail { email: new@email.de }
	 *
	 * Post /user/editPassword {passwort: 123}
	 *
	 * Post /user/editName {name: Lorem}
	 */
	const handleEdit = () => {
		navigate('/edit');
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
			<p>Email: {profile.email}</p>
			<p>Status: {profile.status}</p>
			<p>IntraId: {profile.intraId}</p>
			<input type="file" onChange={handleFileChange} />
			<button onClick={handleImageUpload}>Upload New Image</button>
			<button onClick={handleDelete}>Delete My Account</button>
			<button onClick={handleEdit}>Edit My Profile</button>
		</div>
	);
}
