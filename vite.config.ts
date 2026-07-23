import tailwindcss from '@tailwindcss/vite';
import { transformerMetaHighlight } from '@shikijs/transformers';
import { escapeSvelte, mdsvex } from 'mdsvex';
import { bundledLanguages, codeToHtml, type ShikiTransformer } from 'shiki';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

type ShikiLine = Parameters<NonNullable<ShikiTransformer['line']>>[0];

const configuredBasePath = process.env.BASE_PATH;
const basePath = configuredBasePath?.startsWith('/')
	? (configuredBasePath as `/${string}`)
	: ('' as const);

const escapeAttribute = (value: string) =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');

const preserveInlineWhitespace = (html: string) =>
	html
		.split(/(<[^>]+>)/)
		.map((part) => (part.startsWith('<') ? part : part.replaceAll(' ', '&nbsp;')))
		.join('');

const calloutIconImport = `<script>
	import CalloutIcon from '$lib/components/CalloutIcon.svelte';
</script>`;

const addCalloutIconImport = (content: string) => {
	const frontmatter = content.match(/^---\s*\n[\s\S]*?\n---\s*\n/);
	if (!frontmatter) return `${calloutIconImport}\n\n${content}`;

	return `${frontmatter[0]}\n${calloutIconImport}\n${content.slice(frontmatter[0].length)}`;
};

const normalizeCallouts = (content: string) => {
	const lines = content.split('\n');
	const normalized: string[] = [];
	let hasCallouts = false;

	for (let index = 0; index < lines.length; index += 1) {
		const marker = lines[index].match(/^> \[!([\w-]+)\]\s*(.*)$/i);
		if (!marker) {
			normalized.push(lines[index]);
			continue;
		}

		const [, kind, title] = marker;
		hasCallouts = true;
		const label = title || `${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
		normalized.push(
			`> <CalloutIcon kind="${kind.toLowerCase()}" label="${escapeAttribute(label)}" />`,
			'>'
		);

		while (index + 1 < lines.length) {
			const nextLine = lines[index + 1];
			const quotedLine = nextLine.match(/^>\s?(.*)$/);
			const adjacentInlineCode = /^`\{[\w-]+\}\s*[^`\n]+`$/.test(nextLine);

			if (!quotedLine && !adjacentInlineCode) break;
			index += 1;
			const calloutLine = quotedLine?.[1] ?? nextLine;

			if (/^\d+\.\s/.test(calloutLine) && normalized.at(-1) !== '>') {
				normalized.push('>');
			}

			normalized.push(calloutLine === '' ? '>' : `> ${calloutLine}`);

			if (adjacentInlineCode) normalized.push('>');
		}
	}

	const normalizedContent = normalized.join('\n');
	return hasCallouts ? addCalloutIconImport(normalizedContent) : normalizedContent;
};

const normalizeBlockReferences = (content: string) => {
	let fenceMarker: string | undefined;

	return content
		.split('\n')
		.map((line) => {
			const fence = line.match(/^\s*(`{3,}|~{3,})/);
			if (fence) {
				if (!fenceMarker) fenceMarker = fence[1][0];
				else if (fence[1][0] === fenceMarker) fenceMarker = undefined;
				return line;
			}

			if (fenceMarker) return line;

			const marker = line.match(/^(.*?)(?:\s+|^)\^([\w-]+)\s*$/);
			if (!marker) return line;

			const [, contentBeforeMarker, blockId] = marker;
			const anchor = `<span id="^${blockId}" class="obsidian-block-anchor" aria-hidden="true"></span>`;
			return contentBeforeMarker ? `${contentBeforeMarker} ${anchor}` : anchor;
		})
		.join('\n');
};

const highlightInlineCode = async (code: string, language: string) => {
	const supportedLanguage = language in bundledLanguages ? language : 'text';
	const html = await codeToHtml(code, {
		lang: supportedLanguage,
		themes: {
			light: 'github-light',
			dark: 'github-dark'
		}
	});
	const style = html.match(/<pre[^>]*style="([^"]+)"/)?.[1] ?? '';
	const highlightedCode = preserveInlineWhitespace(
		html.match(/<code>([\s\S]*)<\/code>/)?.[1] ?? escapeAttribute(code)
	);

	return `<code class="shiki-inline" style="${style}">${highlightedCode}</code>`;
};

const parseLineRanges = (value: string) =>
	value.split(',').flatMap((part) => {
		const [start, end = start] = part.split('-').map(Number);
		return Number.isInteger(start) && Number.isInteger(end) && start > 0 && end >= start
			? [{ start, end }]
			: [];
	});

const transformerCollapseLines = (metastring?: string | null): ShikiTransformer => {
	const collapseValue = metastring?.match(/collapse=\{([\d,-]+)\}/)?.[1];
	const ranges = collapseValue ? parseLineRanges(collapseValue) : [];

	return {
		name: 'portfolio:collapse-lines',
		root(root) {
			if (ranges.length === 0) return;

			const segments: Array<{ collapsed: boolean; lines: ShikiLine[] }> = [];
			for (const line of this.lines) {
				const lineNumber = this.lines.indexOf(line) + 1;
				const collapsed = ranges.some(
					(range) => lineNumber >= range.start && lineNumber <= range.end
				);
				const currentSegment = segments.at(-1);

				if (currentSegment?.collapsed === collapsed) currentSegment.lines.push(line);
				else segments.push({ collapsed, lines: [line] });
			}

			const createPre = (lines: ShikiLine[]) => ({
				type: 'element' as const,
				tagName: 'pre',
				properties: { ...this.pre.properties },
				children: [
					{
						type: 'element' as const,
						tagName: 'code',
						properties: { ...this.code.properties },
						children: lines.flatMap((line, index) =>
							index === lines.length - 1 ? [line] : [line, { type: 'text' as const, value: '\n' }]
						)
					}
				]
			});

			root.children = [
				{
					type: 'element',
					tagName: 'div',
					properties: { className: ['shiki-code-block'] },
					children: segments.map((segment) => {
						if (!segment.collapsed) return createPre(segment.lines);

						const lineCount = segment.lines.length;
						return {
							type: 'element',
							tagName: 'details',
							properties: { className: ['shiki-collapse'] },
							children: [
								{
									type: 'element',
									tagName: 'summary',
									properties: {},
									children: [
										{
											type: 'text',
											value: `${lineCount} collapsed ${lineCount === 1 ? 'line' : 'lines'}`
										}
									]
								},
								createPre(segment.lines)
							]
						};
					})
				}
			];
		}
	};
};

const normalizeObsidianMarkdown = {
	name: 'normalize-obsidian-markdown',
	markup: async ({ content, filename }: { content: string; filename?: string }) => {
		if (!filename?.endsWith('.md')) return;
		const normalizedContent = normalizeCallouts(normalizeBlockReferences(content));
		const inlineCodePattern = /`\{([\w-]+)\}\s*([^`\n]+)`/g;
		const inlineMatches = [...normalizedContent.matchAll(inlineCodePattern)];
		const highlightedInlineCode = await Promise.all(
			inlineMatches.map((match) => highlightInlineCode(match[2], match[1]))
		);
		let inlineIndex = 0;

		return {
			code: normalizedContent.replace(inlineCodePattern, () => highlightedInlineCode[inlineIndex++])
		};
	}
};

const highlight = async (code: string, language?: string | null, metastring?: string | null) => {
	const requestedLanguage = language ?? 'text';
	const supportedLanguage = requestedLanguage in bundledLanguages ? requestedLanguage : 'text';
	const wrap = !/(?:^|\s)wrap=false(?:\s|$)/.test(metastring ?? '');
	const highlightMeta = (
		metastring
			?.replace(/collapse=\{[\d,\s-]+\}/g, '')
			.replace(/(?:^|\s)wrap=false(?=\s|$)/g, ' ') ?? ''
	).replace(/\{([\d,\s-]+)\}/g, (_match, ranges: string) => {
		return `{${ranges.replaceAll(/\s/g, '')}}`;
	});
	const html = await codeToHtml(code, {
		lang: supportedLanguage,
		meta: { __raw: highlightMeta },
		themes: {
			light: 'github-light',
			dark: 'github-dark'
		},
		transformers: [transformerMetaHighlight(), transformerCollapseLines(metastring)]
	});
	const title = metastring
		?.match(/title=(?:"([^"]*)"|'([^']*)'|([^\s]+))/)
		?.slice(1)
		.find(Boolean);
	const label = title ? `Code: ${title}` : `Code example in ${supportedLanguage}`;
	const attributes = [
		'role="region"',
		`aria-label="${escapeAttribute(label)}"`,
		title ? `data-title="${escapeAttribute(title)}"` : '',
		wrap ? '' : 'data-wrap="false"'
	]
		.filter(Boolean)
		.join(' ');
	const titleTarget = html.includes('class="shiki-code-block"')
		? '<div class="shiki-code-block"'
		: '<pre ';
	const titledHtml = html
		.replace(titleTarget, `${titleTarget} ${attributes}`)
		.replaceAll(' tabindex="0"', '');

	return escapeSvelte(titledHtml);
};

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: adapter({ fallback: '404.html' }),
			paths: {
				base: basePath
			},
			preprocess: [
				vitePreprocess(),
				normalizeObsidianMarkdown,
				mdsvex({
					extensions: ['.svx', '.md'],
					highlight: { highlighter: highlight }
				})
			],
			extensions: ['.svelte', '.svx', '.md']
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
