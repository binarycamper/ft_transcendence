import { createBrowserRouter, RouterProvider } from 'react-router-dom';
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
import { FriendRequest } from './pages/Request.page';
import { ChatRoom } from './pages/ChatRoom.page';
import IgnoreList from './pages/IgnoreList.page';
import { PublicProfile } from './pages/PublicProfile.page';

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
				path: 'friendrequest',
				element: <FriendRequest />,
				children: [],
			},
			{
				path: 'friendrequest/chatroom',
				element: <ChatRoom />,
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
				path: 'friends',
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
	{
		path: '/ignorelist',
		element: <IgnoreList />,
	},
	{
		path: '/publicprofile',
		element: <PublicProfile />,
	},
]);

export function Router() {
	return <RouterProvider router={router} />;
}
