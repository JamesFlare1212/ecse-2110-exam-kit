<script lang="ts">
  // Compatibility entry point. Both bridge families use one native interaction UI.
  import Converter from './Converter.svelte';
  import type {ComponentProps} from 'svelte';
  const props:ComponentProps<typeof Converter>=$props();
</script>
<Converter {...props}/>
