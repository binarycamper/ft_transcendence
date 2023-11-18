import { useRouteError } from 'react-router-dom';

export function ErrorPage() {
	const error = useRouteError();
	console.error(error);

	return (
		<div id="error-page">
			<p>Error page</p>
			<p>
				<i>{error.statusText || error.message}</i>
			</p>
		</div>
	);
}
