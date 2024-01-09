import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import useAuthentication from '../../hooks/useAuthentication';
import { Button, Container, Group, Tabs } from '@mantine/core';

export default function Header() {
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const { isAuthenticated, handleLogout } = useAuthentication();

	return (
		<Container size="xl">
			<Group justify="space-between">
				<Group>
					<h1 className="site-title">
						<Link to="/" style={{ textDecoration: 'none' }}>
							pong
						</Link>
					</h1>
					<Tabs mt={8} onChange={(value) => navigate(`${value}`)} value={pathname}>
						<Tabs.List>
							<Tabs.Tab value="/play">Play</Tabs.Tab>
							<Tabs.Tab value="/friendrequest">Requests</Tabs.Tab>
							<Tabs.Tab value="/chatroom">Chatrooms</Tabs.Tab>
							<Tabs.Tab value="/chatroomlist">Chatroomlist</Tabs.Tab>
							<Tabs.Tab value="/profile">Profile</Tabs.Tab>
							<Tabs.Tab value="/friends">FriendList</Tabs.Tab>
							<Tabs.Tab value="/settings">Settings</Tabs.Tab>
						</Tabs.List>
					</Tabs>
				</Group>
				{isAuthenticated ? (
					<Button variant="outline" onClick={handleLogout}>
						SIGN OUT
					</Button>
				) : (
					<Button component="a" onClick={() => navigate('/login')}>
						SIGN IN
					</Button>
				)}
			</Group>
			<Outlet />
		</Container>
	);
}
