export const cancelPullRefreshEvent = 'sesame:cancel-pull-refresh';

// Called synchronously when a long press activates sorting. The current touch
// cannot become a refresh again, even if sorting is cancelled before touchend.
export function cancelAppPullRefresh() {
  window.dispatchEvent(new Event(cancelPullRefreshEvent));
}
