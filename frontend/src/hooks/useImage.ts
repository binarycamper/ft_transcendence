import { HttpStatusCode } from 'axios';
import { useState } from 'react';

export default function useImage(profile, setProfile) {
	// State for toggling between new and existing images
	const [useNewImage, setUseNewImage] = useState(false);
	const [imageUrl, setImageUrl] = useState('');
	const [selectedFile, setSelectedFile] = useState<File | null>(null);

	function toggleImage(profile) {
		if (profile && profile.image) {
			setUseNewImage(!useNewImage);
		}
	}

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		if (event.target.files) {
			setSelectedFile(event.target.files[0]);
		}
	}

	async function handleImageUpload() {
		if (!selectedFile) {
			return alert('Please select an image to upload.');
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
	}

	return { imageUrl, useNewImage, toggleImage, handleFileChange, handleImageUpload };
}
