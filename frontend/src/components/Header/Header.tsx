import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, Container, Group, Tabs } from '@mantine/core';

export function Header() {
	const navigate = useNavigate();
	const pathname = useLocation().pathname;
	// const { tabValue } = useParams();

	return (
		<Container size="xl">
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
					<Button component="a" href="/login">
						Sign in
					</Button>
				</Group>
			</Group>
			<Container size="xl" py={16}>
				<div id="outlet">
					<Outlet />
				</div>
			</Container>
		</Container>
	);
}
