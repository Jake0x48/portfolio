import type { HandleClientError } from '@sveltejs/kit';
import { getErrorContent } from '$lib/errors';

export const handleError: HandleClientError = ({ error, status }) => {
	console.error('Unexpected client error', error);
	return { message: getErrorContent(status).message };
};
