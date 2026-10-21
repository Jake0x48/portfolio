import type { HandleServerError } from '@sveltejs/kit';
import { getErrorContent } from '$lib/errors';

export const handleError: HandleServerError = ({ error, status }) => {
	console.error('Unexpected server error', error);
	return { message: getErrorContent(status).message };
};
