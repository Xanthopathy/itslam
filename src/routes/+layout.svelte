<script lang="ts">
  import "../styles/global.css";
  import favicon from "$lib/assets/favicon.svg";
  import { gameEngine } from "$lib/gameStore.svelte";

  let { children } = $props();

  const status = $derived(gameEngine.state.status);

  const pageTitle = $derived.by(() => {
    let title = "ITSLAM";
    if (status === "lobby") title += " | In Lobby";
    else if (status === "playing") title += " | In Game";
    else if (status === "finished") title += " | Game Over";
    return title;
  });
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
