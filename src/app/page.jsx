import {css, javascript} from '../generated/quest-shell';

// React owns the shell. The existing quest controller owns its child subtree.
// Keeping that subtree opaque also preserves the active view during hydration.
export default function HomePage() {
  const contents = '<div id="app"><main class="quest-hero" role="status">正在打开任务板…</main></div>'
    + '<script>' + javascript + '</script>';
  return <>
    <style dangerouslySetInnerHTML={{__html: css}} />
    <div suppressHydrationWarning dangerouslySetInnerHTML={{__html: contents}} />
  </>;
}
