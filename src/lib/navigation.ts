// Going back when there may be nowhere to go back to. A screen opened
// directly (a link, a notification, a reload on the web) has no history, and a
// bare back does nothing, leaving the cook stuck. Home is the sensible place
// to land instead.
type Router = { canGoBack: () => boolean; back: () => void; replace: (href: '/') => void };

export function goBack(router: Router): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
