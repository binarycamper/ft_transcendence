import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AuthCallback from './pages/AuthCallback.page';
import Header from './components/Header/Header';
import IgnoreList from './pages/IgnoreList.page';
import { ChatRoom } from './pages/ChatRoom.page';
import { CompleteProfile } from './pages/CompleteProfile';
import { ErrorPage } from './pages/Error.page';
import { FriendList } from './pages/FriendList.page';
import { FriendRequest } from './pages/Request.page';
import { HomePage } from './pages/Home.page';
import { Login } from './pages/Login.page';
import { Play } from './pages/Play.page';
import { Profile } from './pages/Profile.page';
import { PublicProfile } from './pages/PublicProfile.page';
import { Settings } from './pages/Settings.page';
import { Spiel } from './pages/Spiel.page';
import { TwoFactorSetup } from './pages/TwoFactorSetup.page';

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
				path: 'chatroom',
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
			{
				path: '/login',
				element: <Login />,
			},
		],
	},
	{
		path: '/about',
		element: <div>about</div>,
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
	{
		path: '/spiel',
		element: <Spiel />,
	},
]);

export function Router() {
	return <RouterProvider router={router} />;
}
