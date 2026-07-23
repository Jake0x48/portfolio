<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatWriteupDate } from '$lib/content/writeup-schema';
	import { writeups } from '$lib/content/writeups';
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

<section class="archive" aria-label="Published write-ups">
	<div class="archive-head" aria-hidden="true">
		<span>Challenge</span><span>Category</span><span>Difficulty</span><span>Solved</span>
	</div>
	{#each writeups as writeup (writeup.slug)}
		<a class="archive-row" href={resolve(`/writeups/${writeup.slug}`)}>
			<strong>{writeup.title}</strong>
			<span>{writeup.category}</span>
			<span class="difficulty">{writeup.difficulty}</span>
			<time datetime={writeup.solvedAt}>{formatWriteupDate(writeup.solvedAt)}</time>
		</a>
	{/each}
</section>
