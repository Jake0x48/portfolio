<script lang="ts">
	import { resolve } from '$app/paths';
	import { writeups } from '$lib/content/writeups';
</script>

<svelte:head>
	<title>Jake Hunter | Cybersecurity Portfolio</title>
</svelte:head>

<section class="hero portfolio-hero">
	<div class="hero-copy">
		<p class="eyebrow">
			<span class="status-dot"></span> Computer science student · Security researcher
		</p>
		<h1>Jake Hunter</h1>
		<p class="hero-statement">Finding the strange behaviour in everything, mostly myself.</p>
		<p class="hero-description">
			Hi, I'm Jake. I study computer science, poke at software, and occasionally get it to do
			something deeply unreasonable. This is where I keep my security write-ups and things I've
			built.
		</p>
		<div class="hero-actions">
			<a class="primary-link" href="#work">Have a look around <span aria-hidden="true">↓</span></a>
			<a href="#about">A little about me <span aria-hidden="true">↗</span></a>
		</div>
	</div>
	<aside class="hero-index" aria-label="Areas of focus">
		<div class="hero-index-heading">
			<p>At a glance</p>
			<p>01 / Profile</p>
		</div>
		<dl>
			<div>
				<dt>Studying</dt>
				<dd>Computer science. Computers continue to be a bit weird.</dd>
			</div>
			<div>
				<dt>Investigating</dt>
				<dd>Binary exploitation, allocator internals, and reliable exploit development.</dd>
			</div>
			<div>
				<dt>Leaving evidence</dt>
				<dd>Code on GitHub. The longer explanations live here.</dd>
			</div>
		</dl>
	</aside>
</section>

<section id="work" class="portfolio-section" aria-labelledby="work-heading">
	<div class="section-heading portfolio-heading">
		<div>
			<p class="eyebrow">02 / Selected work</p>
			<h2 id="work-heading">Things I've been up to.</h2>
		</div>
		<a href="https://github.com/Jake0x48">My GitHub <span aria-hidden="true">↗</span></a>
	</div>
	<div class="work-grid">
		<article class="work-card">
			<p class="eyebrow">Development / This website</p>
			<h3>This very website.</h3>
			<p>
				You're looking at it. I built this with SvelteKit and TypeScript to give my projects and
				write-ups somewhere to live. It has code highlighting and a dark mode. Make yourself at
				home.
			</p>
			<ul class="skill-tags" aria-label="Technologies">
				<li>SvelteKit</li>
				<li>TypeScript</li>
				<li>mdsvex</li>
			</ul>
			<a href="https://github.com/Jake0x48"
				>Find my code on GitHub <span aria-hidden="true">↗</span></a
			>
		</article>
		{#each writeups.slice(0, 2) as writeup (writeup.slug)}
			<article class="work-card">
				<p class="eyebrow">Security research / {writeup.platform}</p>
				<h3>{writeup.title}</h3>
				<p>{writeup.summary}</p>
				<ul class="skill-tags" aria-label="Research categories">
					<li>{writeup.category}</li>
					<li class="difficulty-badge" data-difficulty={writeup.difficulty.toLowerCase()}>
						{writeup.difficulty}
					</li>
				</ul>
				<a href={resolve('/writeups/[slug]', { slug: writeup.slug })}
					>Read the write-up <span aria-hidden="true">↗</span></a
				>
			</article>
		{/each}
	</div>
</section>

<section id="about" class="portfolio-section about-section" aria-labelledby="about-heading">
	<div class="section-heading">
		<p class="eyebrow">03 / About me</p>
		<h2 id="about-heading">Hello again.</h2>
	</div>
	<div class="about-copy">
		<p class="about-lead">
			I'm interested in what happens when software does something it really shouldn't. Binary
			exploitation and heap behaviour are particular favourites. I realise this is an odd idea of
			fun.
		</p>
		<p>
			A lot of the work here comes from hands-on security challenges. I like figuring out why
			something works, then writing it down in enough detail that someone else can follow along.
			Future me is also someone else. He will have forgotten.
		</p>
		<div class="focus-list">
			<div>
				<h3>Security research</h3>
				<p>
					Following what happens in memory and figuring out how to make a bug misbehave on purpose.
				</p>
			</div>
			<div>
				<h3>Software development</h3>
				<p>
					I also make things that are supposed to work. Mostly with TypeScript and SvelteKit,
					including this site.
				</p>
			</div>
			<div>
				<h3>Writing it down</h3>
				<p>
					The steps, the reasoning, and why that one weird detail mattered. "It worked somehow"
					would make for a very short write-up.
				</p>
			</div>
		</div>
	</div>
</section>

<section class="portfolio-section notes-section" aria-labelledby="notes-heading">
	<div class="section-heading portfolio-heading">
		<div>
			<p class="eyebrow">04 / Write-ups</p>
			<h2 id="notes-heading">This requires some explanation.</h2>
		</div>
		<a href={resolve('/writeups')}>All write-ups <span aria-hidden="true">→</span></a>
	</div>
	{#each writeups.slice(0, 3) as writeup (writeup.slug)}
		<a class="note-row" href={resolve('/writeups/[slug]', { slug: writeup.slug })}
			><span class="eyebrow">{writeup.category}</span>
			<h3>{writeup.title}</h3>
			<span>{writeup.platform}</span><span aria-hidden="true">↗</span></a
		>
	{:else}<p>
			Nothing here just yet. There's code to poke around on my GitHub in the meantime.
		</p>{/each}
</section>

<section id="contact" class="portfolio-section contact-section" aria-labelledby="contact-heading">
	<div class="section-heading">
		<p class="eyebrow">05 / Connect</p>
		<h2 id="contact-heading">I'm also over here.</h2>
		<p>More code, security research, and evidence that I do occasionally leave this website.</p>
	</div>
	<div class="contact-links">
		<a href="https://github.com/Jake0x48" rel="me">GitHub <span aria-hidden="true">↗</span></a><a
			href="https://hackerone.com/jakehhunter"
			rel="me">HackerOne <span aria-hidden="true">↗</span></a
		><a href="https://app.hackthebox.com/users/70157" rel="me"
			>Hack The Box <span aria-hidden="true">↗</span></a
		>
	</div>
</section>
