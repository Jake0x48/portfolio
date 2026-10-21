import { describe, expect, it, vi } from 'vitest';
import { getErrorContent } from './errors';
import { handleError as clientError } from '../hooks.client';
import { handleError as serverError } from '../hooks.server';

describe('error content', () => {
	it.each([400, 403, 404])('provides a non-retryable page for %s', (status) => {
		expect(getErrorContent(status).retry).toBe(false);
		expect(getErrorContent(status).title).not.toBe(getErrorContent(500).title);
	});
	it.each([500, 502, 503])('offers recovery for %s', (status) => {
		expect(getErrorContent(status).retry).toBe(true);
	});
	it.each([clientError, serverError])(
		'keeps internal errors out of the public response',
		async (handler) => {
			const log = vi.spyOn(console, 'error').mockImplementation(() => {});
			try {
				const result = await handler({
					error: new Error('private internal detail'),
					status: 500
				} as Parameters<typeof handler>[0]);
				expect(result).toEqual({ message: getErrorContent(500).message });
				expect(JSON.stringify(result)).not.toContain('private internal detail');
				expect(log).toHaveBeenCalledOnce();
			} finally {
				log.mockRestore();
			}
		}
	);
});
