import { describe, expect, it } from 'vitest';
import { formatWriteupDate, parseWriteupMetadata } from './writeup-schema';

const validMetadata = {
	title: 'Forks And Knives',
	summary: 'A forking server exploit.',
	platform: 'hack-the-box',
	category: 'pwn',
	difficulty: 'medium',
	solved_on: '2026-07-04T17:16:00',
	published: true,
	tags: ['ctf', 'pwn']
};

describe('parseWriteupMetadata', () => {
	it('normalizes display values and derives the slug', () => {
		expect(parseWriteupMetadata(validMetadata, 'forks-and-knives.md')).toMatchObject({
			slug: 'forks-and-knives',
			platform: 'Hack The Box',
			category: 'Pwn',
			difficulty: 'Medium'
		});
	});

	it('rejects missing publication state', () => {
		expect(() =>
			parseWriteupMetadata({ ...validMetadata, published: undefined }, 'draft.md')
		).toThrow('frontmatter field "published" must be a boolean');
	});
});

describe('formatWriteupDate', () => {
	it('formats dates consistently in UTC', () => {
		expect(formatWriteupDate(validMetadata.solved_on)).toBe('04 Jul 2026');
	});
});
