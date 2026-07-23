export type WriteupMetadata = {
	title: string;
	slug: string;
	summary: string;
	platform: string;
	category: string;
	difficulty: string;
	architecture?: string;
	solvedAt: string;
	published: boolean;
	tags: string[];
};

const requiredString = (metadata: Record<string, unknown>, key: string, source: string) => {
	const value = metadata[key];
	if (typeof value !== 'string' || value.trim() === '') {
		throw new Error(`${source}: frontmatter field "${key}" must be a non-empty string`);
	}
	return value;
};

const titleCase = (value: string) =>
	value
		.split('-')
		.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
		.join(' ');

export const parseWriteupMetadata = (
	metadata: Record<string, unknown>,
	filename: string
): WriteupMetadata => {
	const slug = filename.replace(/\.md$/, '');
	const solvedAt = requiredString(metadata, 'solved_on', filename);

	if (Number.isNaN(Date.parse(solvedAt))) {
		throw new Error(`${filename}: frontmatter field "solved_on" must be a valid date`);
	}

	if (metadata.published !== true && metadata.published !== false) {
		throw new Error(`${filename}: frontmatter field "published" must be a boolean`);
	}

	if (!Array.isArray(metadata.tags) || !metadata.tags.every((tag) => typeof tag === 'string')) {
		throw new Error(`${filename}: frontmatter field "tags" must be an array of strings`);
	}

	return {
		title: requiredString(metadata, 'title', filename),
		slug,
		summary: requiredString(metadata, 'summary', filename),
		platform: titleCase(requiredString(metadata, 'platform', filename)),
		category: titleCase(requiredString(metadata, 'category', filename)),
		difficulty: titleCase(requiredString(metadata, 'difficulty', filename)),
		architecture: typeof metadata.arch === 'string' ? metadata.arch : undefined,
		solvedAt,
		published: metadata.published,
		tags: metadata.tags
	};
};

export const formatWriteupDate = (date: string, style: 'short' | 'long' = 'short') =>
	new Intl.DateTimeFormat('en-GB', {
		day: '2-digit',
		month: style === 'short' ? 'short' : 'long',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(new Date(date));
