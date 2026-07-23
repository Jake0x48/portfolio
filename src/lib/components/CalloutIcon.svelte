<script lang="ts">
	import Bug from 'lucide-svelte/icons/bug';
	import CircleCheck from 'lucide-svelte/icons/circle-check';
	import CircleHelp from 'lucide-svelte/icons/circle-help';
	import CircleX from 'lucide-svelte/icons/circle-x';
	import FileText from 'lucide-svelte/icons/file-text';
	import Flame from 'lucide-svelte/icons/flame';
	import Info from 'lucide-svelte/icons/info';
	import Lightbulb from 'lucide-svelte/icons/lightbulb';
	import List from 'lucide-svelte/icons/list';
	import ListCollapse from 'lucide-svelte/icons/list-collapse';
	import ListTodo from 'lucide-svelte/icons/list-todo';
	import OctagonAlert from 'lucide-svelte/icons/octagon-alert';
	import Quote from 'lucide-svelte/icons/quote';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';

	let { kind, label }: { kind: string; label: string } = $props();

	const iconGroups = [
		{ kinds: ['abstract', 'summary', 'tldr'], icon: ListCollapse, tone: 'abstract' },
		{ kinds: ['todo'], icon: ListTodo, tone: 'todo' },
		{ kinds: ['tip', 'hint'], icon: Lightbulb, tone: 'tip' },
		{ kinds: ['important'], icon: Flame, tone: 'important' },
		{ kinds: ['success', 'check', 'done'], icon: CircleCheck, tone: 'success' },
		{ kinds: ['question', 'help', 'faq'], icon: CircleHelp, tone: 'question' },
		{ kinds: ['warning', 'caution', 'attention'], icon: TriangleAlert, tone: 'warning' },
		{ kinds: ['failure', 'fail', 'missing'], icon: CircleX, tone: 'danger' },
		{ kinds: ['danger', 'error'], icon: OctagonAlert, tone: 'danger' },
		{ kinds: ['bug'], icon: Bug, tone: 'danger' },
		{ kinds: ['example'], icon: List, tone: 'example' },
		{ kinds: ['quote', 'cite'], icon: Quote, tone: 'quote' },
		{ kinds: ['note'], icon: FileText, tone: 'note' }
	];

	const callout = $derived(
		iconGroups.find((group) => group.kinds.includes(kind.toLowerCase())) ?? {
			icon: Info,
			tone: 'info'
		}
	);
</script>

<span class="callout-title" data-callout={callout.tone}>
	<span class="callout-icon" aria-hidden="true">
		<callout.icon size={18} strokeWidth={2} />
	</span>
	<strong>{label}</strong>
</span>
