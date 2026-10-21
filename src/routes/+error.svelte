<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getErrorContent } from '$lib/errors';
	const content = $derived(getErrorContent(page.status));
</script>

<svelte:head>
	<title>{page.status} · {content.title} | Jake Hunter</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<section class="error-page" aria-labelledby="error-heading">
	<div class="error-number" aria-hidden="true">{page.status}</div>
	<div class="error-copy">
		<p class="eyebrow">Request interrupted · {page.status}</p>
		<h1 id="error-heading">{content.title}</h1>
		<p class="error-message">{content.message}</p>
		<div class="hero-actions">
			<a class="primary-link" href={resolve('/')}
				>Back to the portfolio <span aria-hidden="true">→</span></a
			>
			<a href={resolve('/writeups')}>Browse write-ups</a>
			{#if content.retry}<button type="button" onclick={() => window.location.reload()}
					>Reload page <span aria-hidden="true">↻</span></button
				>{/if}
		</div>
		<p class="error-note">Curiosity sometimes leads to a dead end. This one has a way back.</p>
	</div>
</section>

<style lang="scss">
	.error-page {
		display: grid;
		grid-template-columns: 0.8fr 1.2fr;
		align-items: center;
		gap: clamp(32px, 6vw, 90px);
		min-height: 65vh;
		padding: 80px 0;
	}
	.error-number {
		color: var(--signal-dark);
		font: 600 clamp(7rem, 18vw, 15rem)/1 var(--font-prose);
	}
	h1 {
		margin: 0;
		font: 600 clamp(2.4rem, 5vw, 4.5rem)/1.1 var(--font-prose);
	}
	.error-message {
		max-width: 580px;
		margin: 28px 0;
		color: var(--muted);
		font-size: 1.15rem;
		line-height: 1.65;
	}
	button {
		border: 0;
		padding: 10px 0;
		color: var(--ink);
		background: none;
		font: inherit;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	a:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--signal);
		outline-offset: 5px;
	}
	.error-note {
		margin: 36px 0 0;
		color: var(--muted);
		font: 0.75rem/1.6 var(--font-mono);
	}
	@media (max-width: 760px) {
		.error-page {
			grid-template-columns: 1fr;
			padding: 48px 0 64px;
			gap: 24px;
		}
		.error-number {
			font-size: 6rem;
		}
	}
</style>
