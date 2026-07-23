import type { Component } from 'svelte';
import { parseWriteupMetadata, type WriteupMetadata } from './writeup-schema';

type WriteupModule = {
	default: Component;
	metadata: Record<string, unknown>;
};

export type Writeup = WriteupMetadata & {
	component: Component;
};

const modules = import.meta.glob('./writeups/*.md', { eager: true }) as Record<
	string,
	WriteupModule
>;

export const writeups = Object.entries(modules)
	.map(([path, module]) => {
		const filename = path.split('/').at(-1) ?? path;
		return {
			...parseWriteupMetadata(module.metadata, filename),
			component: module.default
		};
	})
	.filter((writeup) => writeup.published)
	.sort((left, right) => Date.parse(right.solvedAt) - Date.parse(left.solvedAt));

export const getWriteup = (slug: string) => writeups.find((writeup) => writeup.slug === slug);
