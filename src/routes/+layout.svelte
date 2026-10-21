<script lang="ts">
	import { resolve } from '$app/paths';
	import '@aptre/pragmasevka/font.css';
	import Moon from 'lucide-svelte/icons/moon';
	import Sun from 'lucide-svelte/icons/sun';
	import { onMount } from 'svelte';
	import '$lib/styles/tailwind.css';
	import '$lib/styles/app.scss';
	import favicon from '$lib/assets/favicon.svg';

	type Theme = 'light' | 'dark';

	let { children } = $props();
	let theme = $state<Theme>('light');

	function applyTheme(nextTheme: Theme, persist = true) {
		theme = nextTheme;
		document.documentElement.dataset.theme = nextTheme;
		document
			.querySelector('meta[name="theme-color"]')
			?.setAttribute('content', nextTheme === 'dark' ? '#17131b' : '#f5f2f7');
		if (persist) localStorage.setItem('theme', nextTheme);
	}

	function toggleTheme() {
		applyTheme(theme === 'dark' ? 'light' : 'dark');
	}

	onMount(() => {
		theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
		const colorScheme = matchMedia('(prefers-color-scheme: dark)');
		const syncSystemTheme = (event: MediaQueryListEvent) => {
			if (localStorage.getItem('theme') === null)
				applyTheme(event.matches ? 'dark' : 'light', false);
		};

		colorScheme.addEventListener('change', syncSystemTheme);
		return () => colorScheme.removeEventListener('change', syncSystemTheme);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta
		name="description"
		content="Jake Hunter's cybersecurity portfolio, featuring CTF write-ups and security research."
	/>
</svelte:head>

<header class="site-header">
	<a class="wordmark" href={resolve('/')} aria-label="Jake Hunter, home">
		<span>JH</span>
		Jake Hunter
	</a>
	<div class="header-actions">
		<nav aria-label="Primary navigation">
			<a href={resolve('/#work')}>Work</a>
			<a href={resolve('/#about')}>About</a>
			<a href={resolve('/writeups')}>Write-ups</a>
			<a href={resolve('/#contact')}>Connect</a>
		</nav>
		<button
			class="theme-toggle"
			type="button"
			onclick={toggleTheme}
			aria-label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
			title={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
		>
			{#if theme === 'dark'}
				<Sun size={17} aria-hidden="true" />
			{:else}
				<Moon size={17} aria-hidden="true" />
			{/if}
		</button>
	</div>
</header>

<main>{@render children()}</main>

<footer class="site-footer">
	<p>
		Built with <a href="https://kit.svelte.dev/" rel="noopener noreferrer" target="_blank"
			>SvelteKit</a
		>. Notes compiled from
		<a href="https://obsidian.md/" rel="noopener noreferrer" target="_blank">Obsidian Markdown</a>.
	</p>
	<p>© {new Date().getFullYear()} Jake Hunter</p>
</footer>
