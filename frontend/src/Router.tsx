import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AuthCallback from './pages/AuthCallback.page';
import Header from './components/Header/Header';
import Blocklist from './pages/Blocklist.page';
import { ChatRoom } from './pages/ChatRoom.page';
import { CompleteProfile } from './pages/CompleteProfile';
import { ErrorPage } from './pages/Error.page';
import { FriendList } from './pages/FriendList.page';
import { FriendRequest } from './pages/Request.page';
import { Login } from './pages/Login.page';
import { Profile } from './pages/Profile.page';
import { PublicProfile } from './pages/PublicProfile.page';
import { Settings } from './pages/Settings.page';
import { TwoFactorSetup } from './pages/TwoFactorSetup.page';
import { ChatRoomList } from './pages/ChatRoomList.page';
import ResetPassword from './pages/ResetPassword.page';
import ResetAccount from './pages/ResetAccount.page';
import VerifyResetToken from './pages/VerifyResetToken.page';
import PongPage from './pages/Pong.page';
import { PongGameWrapper } from './components/Pong/PongGame';
import { MatchHistory } from './pages/MatchHistory.page';
import fetchUrl from './services/fetchUrl';
import AllUsersPage from './pages/AllUsers.page';

const router = createBrowserRouter([
	{
		path: '/',
		element: <Header />,
		errorElement: <ErrorPage />,
		children: [
			{
				path: '/',
				element: <PongPage />,
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
				path: 'chatroomlist',
				element: <ChatRoomList />,
			},
			{
				path: '/matchhistory',
				element: <MatchHistory />,
			},
			{
				path: 'play',
				element: <PongPage />,
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
				path: 'alluser',
				element: <AllUsersPage />,
			},
			{
				path: 'friends',
				element: <FriendList />,
			},
			{
				path: '/login',
				element: <Login />,
			},
			{
				path: '*',
				element: <ErrorPage />,
			},
			{
				path: '/game',
				children: [
					{
						path: ':id',
						element: <PongGameWrapper />,
						loader: async ({ params }) => {
							return fetch(fetchUrl('8080', `/pong/${params.id}`));
						},
					},
				],
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
		path: '/blocklist',
		element: <Blocklist />,
	},
	{
		path: '/publicprofile',
		element: <PublicProfile />,
	},
	{
		path: '/reset-account',
		element: <ResetAccount />,
	},
	{
		element: <ResetPassword />,
	},
	{
		path: '/reset-password/:token',
		element: <VerifyResetToken />,
	},
]);

export function Router() {
	return <RouterProvider router={router} />;
}
