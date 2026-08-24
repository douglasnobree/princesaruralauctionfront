import type { User } from "./user";

export interface SessionData {
	user: User;
	accessToken: string;
	expiresAt: number;
}
