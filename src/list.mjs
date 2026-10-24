export const STATUSES = ['All shows', 'Watching', 'Completed', 'On Hold', 'Dropped', 'Plan to Watch', 'Undecided', 'Not Interested'];
export const SORTS = {
  position: 'List order', title: 'Title', country: 'Country', year: 'Year', type: 'Type',
  score: 'My Score', mdlscore: 'MDL Score', added: 'Date Added', updated: 'Last Updated',
  rewatched: 'Times Rewatched', premiere: 'Premiere Date', started: 'Started Date',
  finished: 'Finished Date', runtime: 'Runtime', episodes: 'Episodes', watched: 'Progress',
  priority: 'Priority', rank: 'Rank',
};
export function filterOptions(items, key) {
  return [...new Set(items.flatMap(item => item[key] ?? []))]
    .filter(value => value !== '')
    .sort((a, b) => String(a).localeCompare(String(b), 'en', { numeric: true }));
}

export function selectItems(items, filters, sort = 'premiere', direction = 'desc') {
  const query = (filters.q || '').toLocaleLowerCase().trim();
  return items.filter(item => {
    if (query && ![item.title, item.nativeTitle].some(t => t?.toLocaleLowerCase().includes(query))) return false;
    if (filters.status && item.status !== filters.status) return false;
    for (const key of ['country', 'type', 'category', 'year']) if (filters[key] && String(item[key]) !== filters[key]) return false;
    for (const key of ['genres', 'tags']) if (filters[key]?.some(value => !item[key]?.includes(value))) return false;
    return true;
  }).sort((a, b) => {
    const av = a[sort], bv = b[sort];
    if (av == null || av === '') return bv == null || bv === '' ? a.position - b.position : 1;
    if (bv == null || bv === '') return -1;
    const order = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv), 'en', { numeric: true, sensitivity: 'base' });
    return (direction === 'desc' ? -order : order) || a.position - b.position;
  });
}
