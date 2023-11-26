import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type UserProfile = {
	name: string;
	email: string;
	status: string;
	intraId: number;
	imageUrl: string; // Type definition for imageUrl
};

export function Profile() {
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const response = await fetch('http://localhost:8080/user/profile', {
					credentials: 'include',
				});
				if (!response.ok) {
					navigate('/login', { state: { statusText: response.statusText } });
					return;
				}
				const data: UserProfile = await response.json();
				setProfile(data);
			} catch (error) {
				const message = (error as Error).message || 'An error occurred';
				navigate('/error', { state: { message } });
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

	if (!profile) {
		return <div>Loading profile...</div>;
	}

	return (
		<div>
			<h1>Profile</h1>
			<img src={profile.imageUrl} alt={`${profile.name}'s profile`} />
			<p>Name: {profile.name}</p>
			<p>Email: {profile.email}</p>
			<p>Status: {profile.status}</p>
			<p>IntraId: {profile.intraId}</p>

			{/* File input for selecting image */}
			<input type="file" onChange={handleFileChange} />

			{/* Button for uploading image */}
			<button onClick={handleImageUpload}>Upload New Image</button>

			{/* Delete account button */}
			<button onClick={handleDelete}>Delete My Account</button>
		</div>
	);
}
