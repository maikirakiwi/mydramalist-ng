import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { STATUSES, SORTS, filterOptions, selectItems } from './list.mjs';
import './styles.css';

function Icon({ name, size = 20 }) {
  const paths = {
    bookmark: <path d="M6 3h12v18l-6-4-6 4z" />,
    arrow: <path d="M7 17 17 7M7 7h10v10" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    list: <path d="M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1" />,
    filter: <><path d="M3 7h18M3 17h18" /><circle cx="8" cy="7" r="2" fill="currentColor" /><circle cx="16" cy="17" r="2" fill="currentColor" /></>,
    sort: <path d="M8 4v16m-4-4 4 4 4-4M16 20V4m-4 4 4-4 4 4" />,
    check: <path d="m5 12 4 4L19 6" />,
    play: <path d="m9 5 11 7-11 7z" />,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function DramaCard({ item, layout }) {
  const percentage = item.episodes ? Math.min(100, item.watched / item.episodes * 100) : 0;
  const statusClass = `status-${item.status.toLowerCase().replaceAll(' ', '-')}`;
  return (
    <article className={`drama-card ${layout === 'list' ? 'row-card' : ''}`}>
      <a className="poster-link" href={item.url} target="_blank" rel="noreferrer" aria-label={`View ${item.title} on MyDramaList`}>
        <img className="poster" src={item.poster?.replace('_4t.', '_4f.')} alt={`${item.title} poster`} loading="lazy" onError={event => {
          if (!event.currentTarget.dataset.fallback) {
            event.currentTarget.dataset.fallback = 'true';
            event.currentTarget.src = item.poster;
          }
        }} />
        <span className={`status-label ${statusClass}`}><span />{item.status}</span>
        <span className="poster-arrow"><Icon name="arrow" size={18} /></span>
      </a>
      <div className="card-info">
        <a className="title-link" href={item.url} target="_blank" rel="noreferrer">
          <h3 lang={item.country === 'Japan' ? 'ja' : undefined}>{item.nativeTitle || item.title}</h3>
          <p className="english-title">{item.title}</p>
        </a>
        <div className="card-meta"><span>{item.country}</span><span>·</span><span>{item.year}</span><span>·</span><span>{item.type}</span><span>·</span><span>{item.runtime} min</span></div>
        <div className="card-context"><span className={`inline-status ${statusClass}`}><span />{item.status}</span><p className="card-genres">{item.genres.join(' · ')}</p></div>
      </div>
      {layout === 'list' ? <div className="card-date"><span className="field-label">Premiere</span>{item.premiere ? <time dateTime={item.premiere}>{item.premiere}</time> : <span>—</span>}</div> : null}
      <div className={`card-progress ${item.status === 'Watching' ? 'watch-progress' : ''}`}>
        <span className="field-label">Episodes</span>
        <span className="episode-count"><Icon name={item.status === 'Completed' ? 'check' : 'play'} size={14} />{item.watched}<span className="muted"> / {item.episodes || '?'}</span></span>
        {item.status === 'Watching' ? <div className="progress-track" role="progressbar" aria-label={`${item.title} episodes watched`} aria-valuenow={item.watched} aria-valuemin={0} aria-valuemax={item.episodes}><span style={{ width: `${percentage}%` }} /></div> : null}
      </div>
      <div className="card-rating"><span className="field-label">My score</span><span className="rating"><Icon name="star" size={14} />{item.score ? item.score.toFixed(1) : '—'}</span></div>
    </article>
  );
}

function Filters({ items, filters, setFilter, reset }) {
  return (
    <div className="filter-panel" id="advanced-filters">
      <div className="filter-panel-head"><h3>Filters</h3><button className="text-button" onClick={reset}>Reset filters</button></div>
      <div className="filter-selects">
        {[
          ['country', 'Country', 'All countries'],
          ['type', 'Type', 'All types'],
          ['category', 'Category', 'All categories'],
          ['year', 'Year', 'All years'],
        ].map(([key, label, all]) => {
          const options = filterOptions(items, key);
          if (key === 'year') options.reverse();
          return <label key={key}>{label}<select aria-label={label} value={filters[key] || ''} onChange={event => setFilter(key, event.target.value)}><option value="">{all}</option>{options.map(option => <option key={option}>{option}</option>)}</select></label>;
        })}
      </div>
      {['genres', 'tags'].map(key => {
        const options = filterOptions(items, key);
        if (!options.length) return null;
        return <details key={key}>
          <summary>{key === 'genres' ? 'Genres' : 'Tags'}<span>{filters[key]?.length ? `${filters[key].length} selected` : options.length}</span></summary>
          <div className="filter-chips">{options.map(value => <label key={value} className={filters[key]?.includes(value) ? 'selected' : ''}><input type="checkbox" checked={filters[key]?.includes(value) || false} onChange={event => setFilter(key, event.target.checked ? [...(filters[key] || []), value] : filters[key].filter(v => v !== value))} />{value}</label>)}</div>
        </details>;
      })}
    </div>
  );
}

function App() {
  const [data, setData] = useState(null), [error, setError] = useState('');
  const params = new URLSearchParams(location.search);
  const [filters, setFilters] = useState(() => ({ q: params.get('q') || '', status: params.get('status') || '', country: params.get('country') || '', type: params.get('type') || '', category: params.get('category') || '', year: params.get('year') || '', genres: params.getAll('genres'), tags: params.getAll('tags') }));
  const [sort, setSort] = useState(Object.hasOwn(SORTS, params.get('sort')) ? params.get('sort') : 'premiere');
  const [direction, setDirection] = useState(params.get('direction') === 'asc' ? 'asc' : 'desc');
  const [layout, setLayout] = useState('grid'), [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const shortcut = event => {
      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.closest('input, select, textarea, [contenteditable="true"]')) {
        event.preventDefault();
        document.querySelector('.search-box input')?.focus();
      }
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/dramas.json`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('The show list could not be loaded.'); return response.json(); })
      .then(setData)
      .catch(error => { if (error.name !== 'AbortError') setError(error.message); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { for (const entry of Array.isArray(value) ? value : [value]) if (entry) query.append(key, entry); });
    if (sort !== 'premiere') query.set('sort', sort);
    if (direction !== 'desc') query.set('direction', direction);
    history.replaceState(null, '', `${location.pathname}${query.size ? `?${query}` : ''}`);
  }, [filters, sort, direction]);

  const setFilter = (key, value) => setFilters(filters => ({ ...filters, [key]: value }));
  const reset = () => setFilters({ q: '', status: '', genres: [], tags: [] });
  const items = data?.items || [], visible = selectItems(items, filters, sort, direction);
  const count = status => items.filter(item => item.status === status).length;
  const hours = Math.round(items.reduce((sum, item) => sum + item.watched * item.runtime, 0) / 60);
  const activeFilters = Object.entries(filters).filter(([key, value]) => key !== 'q' && key !== 'status' && (Array.isArray(value) ? value.length : value)).length;
  const missingSort = sort !== 'position' && items.length && items.every(item => item[sort] == null || item[sort] === '');
  const statuses = STATUSES.filter((status, index) => index === 0 || count(status) > 0 || filters.status === status);

  return <>
    <header className="site-header">
      <a className="brand" href={location.pathname}><Icon name="bookmark" size={19} />drama list<span className="brand-dot">.</span></a>
      <a className="source-link" href="https://mydramalist.com/dramalist/notmaimai" target="_blank" rel="noreferrer">MyDramaList<Icon name="arrow" size={15} /></a>
    </header>
    <main>
      <section className="profile">
        <div className="profile-top">
          <a className="avatar" href="https://github.com/maikirakiwi" target="_blank" rel="noreferrer" aria-label="maikirakiwi on GitHub"><img src="https://github.com/maikirakiwi.png?size=128" alt="maikirakiwi’s GitHub avatar" width="56" height="56" /></a>
          <div className="profile-heading"><h1>Maimai’s shows<span>.</span></h1><a href="https://mydramalist.com/profile/notmaimai" target="_blank" rel="noreferrer">@notmaimai<Icon name="arrow" size={12} /></a></div>
        </div>
        <dl className="stats" aria-label="Viewing statistics">
          <div><dt>Shows</dt><dd>{data ? items.length : '—'}</dd></div>
          <div><dt>Completed</dt><dd>{data ? count('Completed') : '—'}</dd></div>
          <div><dt>Watching</dt><dd>{data ? count('Watching') : '—'}</dd></div>
          <div><dt>Watched</dt><dd>{data ? hours.toLocaleString() : '—'}<small>hrs</small></dd></div>
        </dl>
      </section>
      <section className="collection" aria-label="Show list">
        <div className="collection-heading">
          <nav className="status-tabs" aria-label="Watch status">{statuses.map((status, index) => <button key={status} aria-pressed={(filters.status || 'All shows') === status} className={(filters.status || 'All shows') === status ? 'active' : ''} onClick={() => setFilter('status', index ? status : '')}>{status}<span>{index ? count(status) : items.length}</span></button>)}</nav>
          <span className="sync-state"><span />{data ? `Synced ${new Date(data.fetchedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Loading…'}</span>
        </div>
        <div className="toolbar">
          <label className="search-box"><Icon name="search" size={18} /><input aria-label="Search by native or English title" placeholder="Search shows…" value={filters.q} onChange={event => setFilter('q', event.target.value)} />{filters.q ? <button aria-label="Clear search" onClick={() => setFilter('q', '')}><Icon name="close" size={16} /></button> : <kbd>/</kbd>}</label>
          <button className={`filter-button ${showFilters ? 'selected' : ''}`} aria-expanded={showFilters} aria-controls="advanced-filters" onClick={() => setShowFilters(!showFilters)}><Icon name="filter" size={17} />Filters{activeFilters ? <span>{activeFilters}</span> : null}</button>
          <div className="sort-control"><span>Sort by</span><select aria-label="Sort by" value={sort} onChange={event => setSort(event.target.value)}>{Object.entries(SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button aria-label={`Sort ${direction === 'asc' ? 'descending' : 'ascending'}`} title={`Currently ${direction === 'asc' ? 'ascending' : 'descending'}`} onClick={() => setDirection(direction === 'asc' ? 'desc' : 'asc')}><Icon name="sort" size={17} /></button></div>
          <div className="view-toggle" aria-label="Display mode">{['list', 'grid'].map(mode => <button key={mode} aria-label={`${mode === 'grid' ? 'Grid' : 'List'} view`} aria-pressed={layout === mode} onClick={() => setLayout(mode)} className={layout === mode ? 'active' : ''}><Icon name={mode} size={18} /></button>)}</div>
        </div>
        {showFilters ? <Filters items={items} filters={filters} setFilter={setFilter} reset={reset} /> : null}
        <div className="results-line"><p>{data ? <><strong>{visible.length}</strong> {visible.length === 1 ? 'show' : 'shows'}{visible.length !== items.length ? ` of ${items.length}` : ''}</> : 'Loading shows…'}</p>{filters.q || filters.status || activeFilters ? <button className="text-button" onClick={reset}>Clear filters</button> : null}</div>
        {missingSort ? <p className="data-note">MyDramaList does not expose {SORTS[sort].toLowerCase()} in this public list. Shows keep their source order.</p> : null}
        {error ? <div className="empty-state"><h2>Unable to load shows</h2><p>{error}</p><button onClick={() => location.reload()}>Try again</button></div> : data && !visible.length ? <div className="empty-state"><Icon name="search" size={28} /><h2>No matching shows</h2><p>Change your search or filters.</p><button onClick={reset}>Clear filters</button></div> : <div className={`drama-grid ${layout === 'list' ? 'list-layout' : ''}`}>{visible.map(item => <DramaCard key={item.id} item={item} layout={layout} />)}</div>}
      </section>
      <footer><span>{data ? `${items.length} shows` : 'Show list'}</span><a href="https://mydramalist.com/dramalist/notmaimai" target="_blank" rel="noreferrer">Data & posters from MyDramaList<Icon name="arrow" size={13} /></a></footer>
    </main>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
