// ErrorPage.tsx
import { useRouteError } from 'react-router-dom';

// Define a type that represents the expected shape of your error object
type RouteError = {
	statusText?: string;
	message?: string;
};

export function ErrorPage() {
	const error = useRouteError() as RouteError; // Cast the error to your defined type

	console.error(error);

	return (
		<div id="error-page">
			<h2>Error</h2>
			<p>
				<i>{error.statusText || error.message}</i>
			</p>
		</div>
	);
}
