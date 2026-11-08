<script lang="ts">
  import { renderText } from '#lib/math';
  let {text}: {text: string} = $props();
  const html = $derived(renderText(text));
</script>
<span class="rich-text">{@html html}</span>
