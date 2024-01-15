export interface IntraUser {
	email: string;
	id: string;
	image?: {
		versions?: {
			medium?: string;
		};
	};
	login: string;
}

export interface OAuthTokenResponse {
	access_token: string;
}
