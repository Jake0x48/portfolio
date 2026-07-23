import { error } from '@sveltejs/kit';
import { getWriteup, writeups } from '$lib/content/writeups';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => writeups.map(({ slug }) => ({ slug }));

export const load: PageLoad = ({ params }) => {
	if (!getWriteup(params.slug)) error(404, 'Write-up not found');

	return { slug: params.slug };
};
