<script lang="ts">
	import { resolve } from '$app/paths';
	import { writeups } from '$lib/content/writeups';

	const featuredWriteup = writeups[0];
</script>

<svelte:head>
	<title>Jake Hunter | Cybersecurity Portfolio</title>
</svelte:head>

<section class="hero">
	<div class="hero-copy">
		<p class="eyebrow">
			<span class="status-dot"></span> Computer science student · Security researcher
		</p>
		<h1>Jake Hunter</h1>
		<p class="hero-statement">
			Finding the strange behaviour in everything, mostly myself.
		</p>
		<div class="hero-actions">
			<a class="primary-link" href={resolve('/writeups')}>Read the write-ups <span>→</span></a>
			<a href="https://app.hackthebox.com/users/70157">Hack The Box</a>
			<a href="https://hackerone.com/jakehhunter">HackerOne</a>
		</div>
	</div>
	<div class="hero-index" aria-label="Current areas of focus">
		<p>Current focus</p>
		<ol>
			<li><span>01</span> Binary exploitation</li>
			<li><span>02</span> Web security</li>
			<li><span>03</span> CTF methodology</li>
		</ol>
	</div>
</section>

<section class="featured-section" aria-labelledby="featured-heading">
	<div class="section-heading">
		<p class="eyebrow">Selected work</p>
		<h2 id="featured-heading">From the lab notes</h2>
	</div>
	{#if featuredWriteup}
		<a class="featured-writeup" href={resolve(`/writeups/${featuredWriteup.slug}`)}>
			<div>
				<p class="writeup-meta">
					<span>{featuredWriteup.category}</span><span>{featuredWriteup.difficulty}</span><span
						>{featuredWriteup.platform}</span
					>
				</p>
				<h3>{featuredWriteup.title}</h3>
				<p>{featuredWriteup.summary}</p>
			</div>
			<span class="arrow" aria-hidden="true">↗</span>
		</a>
	{/if}
</section>
