import { load } from 'cheerio';

export const SOURCE = 'https://mydramalist.com/dramalist/notmaimai';
export function parseList(html) {
  const $ = load(html);
  const config = html.match(/window\.dramalist_json\s*=\s*({.*?});\s*<\/script>/s);
  if (!config) throw new Error('List configuration missing; refusing to replace the snapshot.');
  const settings = JSON.parse(config[1]);
  if (settings.load_more) throw new Error('Source is paginated; refusing to publish an incomplete list.');
  const items = $('tr[id^="ml"]').map((index, row) => {
    const el = $(row), text = key => el.find(`.msv2-i-${key}`).text().trim();
    const link = el.find('a.title'), image = el.find('img');
    const item = {
      id: el.attr('id').slice(2), position: index + 1,
      title: link.text().trim(), url: new URL(link.attr('href'), SOURCE).href,
      poster: image.attr('data-src') || image.attr('src'),
      status: text('status'), country: text('country'), year: Number(text('year')),
      type: text('type'), category: 'Asian (MDL)', episodes: Number(text('eps')),
      runtime: Number(text('runtime')), score: Number(text('score')),
      watched: Number(el.find('.num-seen').text()), premiere: text('premiere'),
      finished: text('finished'), started: text('started') || null,
      // shortcut: public-only fields stay unknown; use an authenticated export if those fields become necessary.
      added: text('added') || null, updated: text('updated') || null,
      rewatched: text('rewatched') ? Number(text('rewatched')) : null,
      priority: text('priority') || null, notes: text('notes'),
      genres: text('genres').split(',').map(s => s.trim()).filter(Boolean),
      tags: text('tags').split(',').map(s => s.trim()).filter(Boolean),
    };
    if (!item.title || !/^https:\/\/mydramalist\.com\//.test(item.url) || !item.status || !item.year) throw new Error('Invalid list entry.');
    return item;
  }).get();
  if (!items.length || new Set(items.map(i => i.id)).size !== items.length) throw new Error('Empty or duplicate list; keeping previous data.');
  const filters = $('.filters-category').map((_, el) => ({
    name: $(el).find('.name').first().text(),
    options: $(el).find('.el-select-dropdown__item span, .multiselect__option span').map((_, x) => $(x).text().trim()).get().filter(Boolean),
  })).get().filter(f => f.name);
  return { items, filters };
}

export function parseDetail(html) {
  const $ = load(html);
  const nativeLink = $('a').filter((_, el) => $(el).prev('b').text().includes('Native Title')).first();
  let nativeTitle = nativeLink.text().trim();
  if (!nativeTitle) {
    const label = $('b').filter((_, el) => $(el).text().includes('Native Title')).first();
    nativeTitle = label.parent().text().replace(/^.*?Native Title:\s*/, '').trim();
  }
  if (!nativeTitle || nativeTitle.length > 200) throw new Error('Native title not found.');
  const body = $.text();
  const score = $('span[itemprop="ratingValue"]').first().text() || body.match(/Score:\s*([\d.]+)/)?.[1];
  const rank = body.match(/Ranked:\s*#([\d,]+)/)?.[1];
  const tags = $('a[href*="th="]').map((_, el) => $(el).text().trim()).get();
  return { nativeTitle, mdlscore: score ? Number(score) : null, rank: rank ? Number(rank.replaceAll(',', '')) : null, tags: [...new Set(tags)] };
}
