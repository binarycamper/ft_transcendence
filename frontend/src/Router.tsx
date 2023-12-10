import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ChatPage } from './pages/Chat.page';
import { ErrorPage } from './pages/Error.page';
import { Header } from './components/Header/Header';
import { HomePage } from './pages/Home.page';
import { Login } from './pages/Login.page';
import { Play } from './pages/Play.page';
import { Profile } from './pages/Profile.page';
import { Settings } from './pages/Settings.page';
import { CompleteProfile } from './pages/CompleteProfile';
import { FriendList } from './pages/FriendList.page';
import { TwoFactorSetup } from './pages/TwoFactorSetup.page';
import AuthCallback from './pages/AuthCallback.page';

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
				element: <ChatPage />,
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
			{
				path: 'friendlist',
				element: <FriendList />,
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
		path: '/completeprofile',
		element: <CompleteProfile />,
	},
	{
		path: '/twofactorsetup',
		element: <TwoFactorSetup />,
	},
	{
		path: '/callback',
		element: <AuthCallback />,
	},
]);

export function Router() {
	return <RouterProvider router={router} />;
}
