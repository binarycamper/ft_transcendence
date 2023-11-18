import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Box, Tabs, Group, Button } from '@mantine/core';

export function Header() {
	const navigate = useNavigate();
	const pathname = useLocation().pathname;
	// const { tabValue } = useParams();

	return (
		<Box pb={120}>
			<Group justify="space-between" h="100%">
				<Group>
					<h1 className="site-title">
						<a href="/" style={{ textDecoration: 'none' }}>
							pong
						</a>
					</h1>
					<Tabs value={pathname} onChange={(value) => navigate(`${value}`)}>
						<Tabs.List>
							<Tabs.Tab value="/play">Play</Tabs.Tab>
							<Tabs.Tab value="/chat">Chat</Tabs.Tab>
							<Tabs.Tab value="/profile">Profile</Tabs.Tab>
							<Tabs.Tab value="/settings">Settings</Tabs.Tab>
						</Tabs.List>
					</Tabs>
				</Group>
				<Group>
					<Button variant="default" component="a" href="/login">
						Log in
					</Button>
					<Button component="a" href="/signup">
						Sign up
					</Button>
				</Group>
			</Group>
			<div id="outlet">
				<Outlet />
			</div>
		</Box>
	);
}
