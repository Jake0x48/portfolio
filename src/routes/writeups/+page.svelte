<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatWriteupDate } from '$lib/content/writeup-schema';
	import { writeups } from '$lib/content/writeups';

	let query = $state('');
	let category = $state('');
	let difficulty = $state('');
	let sort = $state('newest');
	const categories = [...new Set(writeups.map((entry) => entry.category))].sort();
	const difficulties = [...new Set(writeups.map((entry) => entry.difficulty))].sort();
	const results = $derived(
		writeups
			.filter(
				(entry) =>
					(!category || entry.category === category) &&
					(!difficulty || entry.difficulty === difficulty) &&
					[entry.title, entry.summary, entry.platform, entry.category, ...entry.tags]
						.join(' ')
						.toLowerCase()
						.includes(query.trim().toLowerCase())
			)
			.sort((a, b) =>
				sort === 'title'
					? a.title.localeCompare(b.title)
					: sort === 'oldest'
						? Date.parse(a.solvedAt) - Date.parse(b.solvedAt)
						: Date.parse(b.solvedAt) - Date.parse(a.solvedAt)
			)
	);
	function resetFilters() {
		query = '';
		category = '';
		difficulty = '';
		sort = 'newest';
	}
</script>

<svelte:head>
	<title>Write-ups | Jake Hunter</title>
	<meta
		name="description"
		content="Cybersecurity challenge write-ups covering binary exploitation and web security."
	/>
</svelte:head>

<section class="page-intro">
	<p class="eyebrow">Research archive · {writeups.length.toString().padStart(2, '0')} published</p>
	<h1>CTF write-ups</h1>
	<p>Reproducible notes on the reasoning, dead ends, and techniques behind each solve.</p>
</section>

<section class="research-archive" aria-label="Published write-ups">
	<div class="archive-tools">
		<label class="search-field"
			>Search the archive<input
				type="search"
				bind:value={query}
				placeholder="Challenge, technique, or keyword…"
			/></label
		>
		<label
			>Category<select bind:value={category}
				><option value="">All categories</option>{#each categories as item (item)}<option
						value={item}>{item}</option
					>{/each}</select
			></label
		>
		<label
			>Difficulty<select bind:value={difficulty}
				><option value="">All difficulties</option>{#each difficulties as item (item)}<option
						value={item}>{item}</option
					>{/each}</select
			></label
		>
		<label
			>Sort by<select bind:value={sort}
				><option value="newest">Newest solved</option><option value="oldest">Oldest solved</option
				><option value="title">Title A–Z</option></select
			></label
		>
	</div>
	<div class="results-heading">
		<p role="status">{results.length} of {writeups.length} write-ups</p>
		{#if query || category || difficulty || sort !== 'newest'}<button
				type="button"
				onclick={resetFilters}>Reset view <span aria-hidden="true">↺</span></button
			>{/if}
	</div>
	{#if results.length}
		<div class="table-scroll" role="region" aria-label="Write-ups table" tabindex="0">
			<table>
				<caption class="visually-hidden"
					>Published challenges with category, difficulty, and solve date</caption
				>
				<thead
					><tr
						><th scope="col">Challenge / Research</th><th scope="col">Category</th><th scope="col"
							>Difficulty</th
						><th scope="col">Solved</th></tr
					></thead
				>
				<tbody
					>{#each results as entry (entry.slug)}
						<tr
							><th scope="row"
								><p class="platform">{entry.platform}</p>
								<a href={resolve('/writeups/[slug]', { slug: entry.slug })}
									>{entry.title}<span aria-hidden="true">↗</span></a
								>
								<p class="summary">{entry.summary}</p></th
							><td><span class="category-label">{entry.category}</span></td><td
								><span class="difficulty-badge" data-difficulty={entry.difficulty.toLowerCase()}
									>{entry.difficulty}</span
								></td
							><td><time datetime={entry.solvedAt}>{formatWriteupDate(entry.solvedAt)}</time></td
							></tr
						>
					{/each}</tbody
				>
			</table>
		</div>
	{:else}
		<div class="empty-state">
			<p class="eyebrow">No matches</p>
			<h2>No write-ups found.</h2>
			<p>Try a broader keyword or remove a filter to explore the archive.</p>
			<button type="button" onclick={resetFilters}
				>Show all write-ups <span aria-hidden="true">→</span></button
			>
		</div>
	{/if}
</section>

<style lang="scss">
	.research-archive {
		padding: 40px 0 100px;
	}
	.archive-tools {
		display: grid;
		grid-template-columns: minmax(240px, 2fr) repeat(3, minmax(140px, 1fr));
		gap: 16px;
	}
	label {
		display: grid;
		gap: 10px;
		color: var(--muted);
		font: 0.72rem/1.4 var(--font-mono);
	}
	input,
	select {
		width: 100%;
		min-width: 0;
		height: 46px;
		padding: 10px 12px;
		border: 1px solid var(--rule-strong);
		border-radius: 0;
		background: var(--paper);
		color: var(--ink);
		font: 0.85rem var(--font-mono);
	}
	input::placeholder {
		color: var(--muted);
	}
	input:focus-visible,
	select:focus-visible,
	button:focus-visible,
	a:focus-visible,
	.table-scroll:focus-visible {
		outline: 2px solid var(--signal);
		outline-offset: 4px;
	}
	.results-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 64px;
		gap: 16px;
		font: 0.75rem var(--font-mono);
		color: var(--muted);
	}
	button {
		border: 0;
		padding: 10px 0;
		background: none;
		color: var(--ink);
		cursor: pointer;
		font: inherit;
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.table-scroll {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
	}
	thead th {
		padding: 16px;
		border-block: 1px solid var(--rule-strong);
		color: var(--muted);
		font: 0.7rem var(--font-mono);
		text-transform: uppercase;
		white-space: nowrap;
	}
	tbody th,
	td {
		padding: 28px 16px;
		border-bottom: 1px solid var(--line);
		vertical-align: middle;
	}
	tbody th {
		width: 58%;
		font-weight: 400;
	}
	tbody tr:hover,
	tbody tr:focus-within {
		background: color-mix(in srgb, var(--signal) 5%, transparent);
	}
	.platform {
		margin: 0 0 10px;
		color: var(--signal-dark);
		font: 0.68rem var(--font-mono);
		text-transform: uppercase;
	}
	tbody a {
		display: inline-flex;
		gap: 20px;
		align-items: baseline;
		font: 600 clamp(1.5rem, 2.5vw, 2rem)/1.2 var(--font-prose);
		text-decoration: none;
	}
	tbody a span {
		color: var(--signal-dark);
		font: 1.2rem var(--font-mono);
	}
	tbody a:hover {
		text-decoration: underline;
		text-underline-offset: 5px;
	}
	.summary {
		max-width: 580px;
		margin: 12px 0 0;
		color: var(--muted);
		font-size: 0.95rem;
		line-height: 1.6;
	}
	.category-label,
	time {
		font: 0.75rem var(--font-mono);
		white-space: nowrap;
	}
	time {
		color: var(--muted);
	}
	.empty-state {
		padding: 64px 24px;
		text-align: center;
		border-block: 1px solid var(--rule-strong);
	}
	.empty-state h2 {
		font: 600 2rem var(--font-prose);
	}
	.empty-state > p:not(.eyebrow) {
		color: var(--muted);
		line-height: 1.6;
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	@media (max-width: 900px) {
		.archive-tools {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
		.search-field {
			grid-column: 1 / -1;
		}
	}
	@media (max-width: 600px) {
		.archive-tools {
			grid-template-columns: 1fr 1fr;
		}
		.search-field {
			grid-column: 1 / -1;
		}
		table {
			min-width: 700px;
		}
		tbody th {
			min-width: 330px;
		}
		.research-archive {
			padding-top: 28px;
		}
	}
</style>
