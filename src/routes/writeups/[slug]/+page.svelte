<script lang="ts">
	import { formatWriteupDate } from '$lib/content/writeup-schema';
	import { getWriteup } from '$lib/content/writeups';
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { PageProps } from './$types';

	type TocItem = {
		id: string;
		label: string;
		level: 2 | 3;
	};

	let { data }: PageProps = $props();
	const writeup = $derived(getWriteup(data.slug)!);
	const Content = $derived(writeup.component);
	let tocItems = $state<TocItem[]>([]);
	let activeHeadingId = $state('');

	function setupTableOfContents(articleElement: HTMLElement) {
		return untrack(() => {
			const usedIds = new SvelteSet<string>();
			const headings = Array.from(articleElement.querySelectorAll<HTMLHeadingElement>('h2, h3'));
			let highlightedElement: HTMLElement | undefined;
			let highlightTimeout: ReturnType<typeof setTimeout> | undefined;

			tocItems = headings.map((heading) => {
				const baseId =
					heading.id ||
					heading.textContent
						?.trim()
						.toLowerCase()
						.replace(/[^a-z0-9]+/g, '-')
						.replace(/(^-|-$)/g, '') ||
					'section';
				let id = baseId;
				let suffix = 2;

				while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
				usedIds.add(id);
				heading.id = id;

				return {
					id,
					label: heading.textContent?.trim() || 'Untitled section',
					level: Number(heading.tagName.slice(1)) as 2 | 3
				};
			});

			activeHeadingId = tocItems[0]?.id ?? '';
			const observer = new IntersectionObserver(
				(entries) => {
					const visibleHeading = entries.find((entry) => entry.isIntersecting);
					if (visibleHeading) activeHeadingId = visibleHeading.target.id;
				},
				{ rootMargin: '-15% 0px -75% 0px' }
			);

			const highlightBlockReference = (hash: string) => {
				const decodedHash = decodeURIComponent(hash);
				if (!decodedHash.startsWith('#^')) return;

				const anchor = document.getElementById(decodedHash.slice(1));
				if (
					!anchor?.classList.contains('obsidian-block-anchor') ||
					!articleElement.contains(anchor)
				) {
					return;
				}

				const parent = anchor.parentElement;
				const target = parent === articleElement ? anchor.nextElementSibling : parent;
				if (!(target instanceof HTMLElement)) return;

				highlightedElement?.classList.remove('block-reference-highlight');
				if (highlightTimeout) clearTimeout(highlightTimeout);
				target.classList.remove('block-reference-highlight');
				void target.offsetWidth;
				target.classList.add('block-reference-highlight');
				highlightedElement = target;
				highlightTimeout = setTimeout(() => {
					target.classList.remove('block-reference-highlight');
					if (highlightedElement === target) highlightedElement = undefined;
				}, 2800);
			};

			const handleBlockReferenceClick = (event: MouseEvent) => {
				if (!(event.target instanceof Element)) return;
				const link = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
				if (link && articleElement.contains(link)) highlightBlockReference(link.hash);
			};
			const handleHashChange = () => highlightBlockReference(window.location.hash);

			headings.forEach((heading) => observer.observe(heading));
			articleElement.addEventListener('click', handleBlockReferenceClick);
			window.addEventListener('hashchange', handleHashChange);
			queueMicrotask(() => highlightBlockReference(window.location.hash));

			return () => {
				observer.disconnect();
				articleElement.removeEventListener('click', handleBlockReferenceClick);
				window.removeEventListener('hashchange', handleHashChange);
				if (highlightTimeout) clearTimeout(highlightTimeout);
			};
		});
	}
</script>

<svelte:head>
	<title>{writeup.title} | Jake Hunter</title>
	<meta name="description" content={writeup.summary} />
</svelte:head>

<header class="article-header">
	<p class="eyebrow">{writeup.platform} · {writeup.category} · {writeup.difficulty}</p>
	<div class="article-heading">
		<h1>{writeup.title}</h1>
		{#if writeup.visual}
			<figure class:article-ascii={writeup.visual.type === 'ascii'} class="article-visual">
				{#if writeup.visual.type === 'ascii'}
					<pre aria-hidden="true">{writeup.visual.content}</pre>
				{:else}
					<img src={writeup.visual.src} alt={writeup.visual.alt} fetchpriority="high" />
				{/if}
			</figure>
		{/if}
	</div>
	<p class="article-deck">{writeup.summary}</p>
	<div class="article-byline">
		<span>Jake Hunter</span>
		<time datetime={writeup.solvedAt}>Solved {formatWriteupDate(writeup.solvedAt, 'long')}</time>
		<span>Technical write-up</span>
	</div>
</header>

<div class="article-frame">
	<aside class="article-rail">
		<p>Classification</p>
		<dl>
			{#if writeup.architecture}
				<div>
					<dt>Architecture</dt>
					<dd>{writeup.architecture}</dd>
				</div>
			{/if}
			<div>
				<dt>Platform</dt>
				<dd>{writeup.platform}</dd>
			</div>
			<div>
				<dt>Category</dt>
				<dd>{writeup.category}</dd>
			</div>
			<div>
				<dt>Difficulty</dt>
				<dd>
					<span class="difficulty-badge" data-difficulty={writeup.difficulty.toLowerCase()}
						>{writeup.difficulty}</span
					>
				</dd>
			</div>
			<div>
				<dt>Status</dt>
				<dd>Published</dd>
			</div>
		</dl>
	</aside>
	{#key writeup.slug}
		<article class="writeup-body prose" {@attach setupTableOfContents}>
			<Content />
		</article>
	{/key}
	<nav class="article-toc" aria-label="Table of contents">
		<p>On this page</p>
		<ol>
			{#each tocItems as item (item.id)}
				<li class:toc-subsection={item.level === 3} class:toc-active={item.id === activeHeadingId}>
					<a
						href={`#${item.id}`}
						aria-current={item.id === activeHeadingId ? 'location' : undefined}
					>
						{item.label}
					</a>
				</li>
			{/each}
		</ol>
	</nav>
</div>
