import { useRouteError } from 'react-router-dom';
import useTitle from '../hooks/useTitle';

interface RouteError {
	message?: string;
	statusText?: string;
}

export function ErrorPage() {
	useTitle('Page not found • pong');
	const error = useRouteError() as RouteError;
	console.error(error);

	return (
		<div id="error-page">
			<h2>Error</h2>
			<p>
				<i>{error?.statusText ?? error?.message}</i>
			</p>
			<p>
				<i>404 Page Not Found</i>
			</p>
		</div>
	);
}
