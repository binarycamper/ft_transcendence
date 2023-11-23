import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Chat } from './pages/Chat.page';
import { ErrorPage } from './pages/Error.page';
import { Header } from './components/Header/Header';
import { HomePage } from './pages/Home.page';
import { Login } from './pages/Login.page';
import { Play } from './pages/Play.page';
import { Profile } from './pages/Profile.page';
import { Settings } from './pages/Settings.page';
import { Signup } from './pages/Signup.page';
import { CompleteProfile } from './pages/Complete-profile';

const router = createBrowserRouter([
	{
		path: '/',
		element: <Header />,
		errorElement: <ErrorPage />,
		children: [
			{
				path: '/',
				element: <HomePage />,
			},
			{
				path: 'chat',
				element: <Chat />,
			},
			{
				path: 'play',
				element: <Play />,
			},
			{
				path: 'profile',
				element: <Profile />,
			},
			{
				path: 'settings',
				element: <Settings />,
			},
		],
	},
	{
		path: '/about',
		element: <div>about</div>,
	},
	{
		path: '/login',
		element: <Login />,
	},
	{
		path: '/complete-profile',
		element: <CompleteProfile />,
	},
	{
		path: '/signup',
		element: <Signup />,
	},
]);

export function Router() {
	return <RouterProvider router={router} />;
}
