<script lang="ts">
	import { Tabs as TabsPrimitive } from "bits-ui";
	import { cn } from "#lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: TabsPrimitive.ContentProps = $props();
</script>

<TabsPrimitive.Content
	bind:ref
	data-slot="tabs-content"
	class={cn("text-sm flex-1 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4", className)}
	{...restProps}
/>
