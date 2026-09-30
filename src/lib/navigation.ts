// Two ways out of a pushed page that work however the page was reached.
// The root stack always has the tab navigator, (tabs), at its bottom: it is the
// first screen on a normal launch, and the root layout's anchor puts it under
// any page opened cold from a link (audit F48). The one exception is the
// first-run welcome, which replaces it.
import type { Href, useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

/**
 * Back, or somewhere sensible when there's nothing to go back to. A page
 * opened from a link as the app's first screen has no history, and a plain
 * `back()` does nothing: Back, × and Done would be dead (F48).
 */
export function goBackOr(router: Router, fallback: Href = '/'): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/**
 * Go to a tab from a pushed page. `navigate()` would push a second copy of the
 * whole tab bar on top of the page, growing the stack every time (F206), so
 * this pops back down to the tabs instead. With nothing underneath to pop
 * back to, it replaces the page with the tabs.
 */
export function goToTab(router: Router, href: Href): void {
  if (router.canGoBack()) router.dismissTo(href);
  else router.replace(href);
}
