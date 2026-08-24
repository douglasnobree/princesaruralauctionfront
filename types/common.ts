export interface ActionResult<T = unknown, E = string> {
	success: boolean;
	error?: E;
	errorCode?: string;
	errorDetails?: Record<string, unknown>;
	correlationId?: string;
	errors?: Record<string, string[]> | unknown;
	data?: T;
}
