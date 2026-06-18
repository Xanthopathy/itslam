<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";
  import "../styles/global.css";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="app-container">
  {@render children()}
</div>

<style>
  :global {
    :root {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
        Ubuntu, Cantarell, sans-serif;
      --color-primary: #4f46e5;
      --color-success: #10b981;
      --color-danger: #ef4444;
      --color-warning: #f59e0b;
    }
  }

  :global(body) {
    margin: 0;
    padding: 0;
    background: #f9fafb;
  }

  .app-container {
    min-height: 100vh;
  }
</style>
