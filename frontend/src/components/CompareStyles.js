import styled from 'styled-components';

export const CompareLayout = styled.main`
  padding-bottom: 90px;
  .compare-graph { padding: clamp(22px, 4vw, 40px); border: 1px solid #dfe9df; border-radius: 20px; background: linear-gradient(135deg, #fff, #f1f7f0); box-shadow: 0 18px 50px rgba(37,72,48,.06); }
  .compare-graph-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
  .compare-graph-kicker { display: inline-flex; align-items: center; gap: 8px; color: #779986; font-size: 10px; font-weight: 700; letter-spacing: .14em; }
  .compare-graph h1 { margin: 12px 0 8px; color: #244838; font: 600 clamp(25px, 3vw, 36px)/1.2 'Unbounded', sans-serif; letter-spacing: -.05em; }
  .compare-graph-header p, .compare-graph-controls p { margin: 0; color: #718276; font-size: 13px; line-height: 1.6; }
  .compare-generate { min-height: 46px; border-radius: 10px; white-space: normal; }
  .compare-graph-note { margin: 18px 0 0; color: #627b6b; font-size: 12px; line-height: 1.6; }
  .compare-graph-loading { display: grid; justify-items: center; padding: 25px 0 4px; color: #526e5d; font-size: 13px; }
  .compare-graph-loading p { margin: 3px 0 0; }
  .compare-graph-result { margin-top: 28px; padding: clamp(18px, 3vw, 28px); border: 1px solid #e1ebe0; border-radius: 15px; background: #fff; }
  .compare-graph-controls { display: flex; justify-content: space-between; align-items: end; gap: 20px; }
  .compare-graph-controls h2 { margin: 0 0 6px; color: #244838; font: 500 17px/1.35 'Unbounded', sans-serif; letter-spacing: -.04em; }
  .compare-graph-controls label { display: grid; gap: 6px; color: #61796a; font-size: 11px; font-weight: 700; }
  .compare-graph-controls select { min-width: 155px; padding: 10px 12px; border: 1px solid #dce8dd; border-radius: 8px; background: #f7faf6; color: #294b3b; }
  .compare-chart-surface { margin-top: 24px; padding: clamp(16px, 3vw, 26px); border: 1px solid #e4eee2; border-radius: 16px; background: linear-gradient(140deg, #f8fbf6, #edf5ed); }
  .compare-chart-title { display: flex; justify-content: space-between; align-items: end; gap: 12px; }
  .compare-chart-title span, .compare-insights span { color: #81a18b; font-size: 10px; font-weight: 700; letter-spacing: .12em; }
  .compare-chart-title h3 { margin: 8px 0 0; color: #244838; font: 500 17px/1.3 'Unbounded', sans-serif; letter-spacing: -.04em; }
  .compare-chart-title p { margin: 0; color: #718b79; font-size: 11px; text-align: right; }
  .compare-chart { height: 220px; margin-top: 15px; }
  .compare-insights { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
  .compare-insights > div { display: grid; gap: 7px; padding: 17px 19px; border: 1px solid #e5eee4; border-radius: 12px; background: #fbfdfb; }
  .compare-insights strong { color: #244838; font: 600 clamp(16px, 2vw, 22px)/1.2 'Unbounded', sans-serif; letter-spacing: -.04em; overflow-wrap: anywhere; }
  .compare-insights small { color: #718276; font-size: 11px; overflow-wrap: anywhere; }
  .compare-chart-key { display: grid; gap: 10px; padding: 0; margin: 18px 0 0; list-style: none; }
  .compare-chart-key li { display: flex; align-items: center; gap: 12px; min-width: 0; padding: 10px; border: 1px solid #e9f0e8; border-radius: 12px; background: #fff; color: #61796a; font-size: 12px; }
  .compare-chart-key img { flex: none; width: 48px; height: 48px; border-radius: 8px; object-fit: cover; background: #e7eee6; }
  .compare-chart-trip { display: grid; flex: 1; min-width: 0; gap: 4px; overflow-wrap: anywhere; }
  .compare-chart-trip small { display: flex; align-items: center; gap: 6px; color: #80988a; font-size: 10px; }
  .compare-chart-trip i { flex: none; width: 8px; height: 8px; border-radius: 50%; }
  .compare-chart-trip strong { color: #355747; font-size: 12px; }
  .compare-chart-key b { color: #294b3b; text-align: right; overflow-wrap: anywhere; }
  .compare-content { padding-top: 48px; }
  .compare-heading { display: flex; justify-content: space-between; align-items: end; gap: 18px; margin-bottom: 22px; }
  .compare-heading span { color: #7e9a86; font-size: 10px; font-weight: 700; letter-spacing: .14em; }
  .compare-heading h2 { margin: 8px 0 6px; color: #244838; font: 500 clamp(23px, 2.5vw, 31px)/1.25 'Unbounded', sans-serif; letter-spacing: -.05em; }
  .compare-heading p { margin: 0; color: #718276; font-size: 13px; }
  .compare-selection { display: inline-flex; align-items: center; gap: 7px; margin-top: 15px; padding: 8px 11px; border: 1px solid #dfeadf; border-radius: 30px; background: #f0f7ef; color: #587565; font-size: 11px; font-weight: 700; }
  .compare-add { flex-shrink: 0; border-radius: 10px; }
  .compare-empty { display: grid; justify-items: center; padding: clamp(45px, 8vw, 80px) 25px; border: 1px solid #e0e9df; border-radius: 20px; background: linear-gradient(145deg, #fff, #f3f8f2); text-align: center; }
  .compare-empty-icon { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 20px; background: #e4efe5; color: #47766c; }
  .compare-empty h3 { margin: 23px 0 10px; color: #244838; font: 500 21px/1.35 'Unbounded', sans-serif; letter-spacing: -.04em; }
  .compare-empty p { max-width: 370px; margin: 0 0 24px; color: #74867a; font-size: 13px; line-height: 1.7; }
  .compare-empty .button { border-radius: 10px; }
  .compare-hint { display: none; margin: 0 0 12px; color: #718276; font-size: 12px; }
  .comparison-scroll { overflow-x: auto; border: 1px solid #dfe9df; border-radius: 18px; background: #fff; box-shadow: 0 18px 50px rgba(37,72,48,.07); scrollbar-color: #aac4ae #edf3ec; scrollbar-width: thin; }
  .comparison-scroll:focus-visible { outline: 2px solid #47766c; outline-offset: 3px; }
  .comparison-table { width: 100%; min-width: 700px; table-layout: fixed; border-collapse: collapse; }
  .comparison-table th, .comparison-table td { padding: 20px; border-bottom: 1px solid #eaf0e9; border-right: 1px solid #eaf0e9; text-align: left; vertical-align: middle; }
  .comparison-table tr > :last-child { border-right: 0; }
  .comparison-table tbody tr:last-child > * { border-bottom: 0; }
  .comparison-table thead th { width: 26%; padding: 16px; vertical-align: top; background: #fff; }
  .comparison-table thead th:first-child, .comparison-table tbody th { width: 19%; }
  .comparison-table thead th:first-child { vertical-align: bottom; background: #f4f8f2; color: #698673; font-size: 10px; letter-spacing: .13em; }
  .compare-detail-heading { display: grid; justify-items: start; gap: 12px; padding: 6px; line-height: 1.6; }
  .compare-detail-heading svg { color: #6f9c7d; }
  .comparison-table tbody th { background: #f8fbf7; color: #61796a; font-size: 12px; font-weight: 700; }
  .comparison-table tbody td { color: #344c3e; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
  .comparison-table tbody tr:nth-child(even) td { background: #fbfdfb; }
  .comparison-table tbody tr:hover td { background: #f2f8f1; }
  .compare-row-label { display: flex; align-items: center; gap: 8px; }
  .compare-row-label svg { flex: none; color: #8aaa91; }
  .compare-trip-image { position: relative; overflow: hidden; height: 165px; border-radius: 12px; background: #e7eee6; }
  .compare-trip-image img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
  .compare-trip-image:hover img { transform: scale(1.05); }
  .compare-trip-number { position: absolute; top: 10px; left: 10px; padding: 7px 9px; border: 1px solid rgba(255,255,255,.35); border-radius: 20px; background: rgba(25,60,46,.78); color: #fff; font-size: 9px; letter-spacing: .1em; }
  .compare-remove { position: absolute; top: 10px; right: 10px; display: grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: 50%; background: rgba(255,255,255,.94); color: #294b3b; }
  .compare-remove:hover { background: #244838; color: white; }
  .compare-trip-place { display: flex; align-items: center; gap: 5px; margin-top: 14px; color: #799081; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
  .compare-trip-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 7px; color: #244838; font: 500 16px/1.4 'Unbounded', sans-serif; letter-spacing: -.04em; }
  .compare-trip-title svg { flex: none; color: #8eaa96; }
  .compare-trip-title:hover { color: #47766c; }
  .comparison-table .button { border-radius: 8px; font-size: 11px; white-space: normal; }
  .comparison-table tbody td.compare-price { font-size: 15px; font-weight: 700; color: #244838; }
  html[data-theme="night"] & {
    .compare-graph, .compare-empty { background: linear-gradient(135deg, #14252c, #1b3139); border-color: #46646c; }
    .compare-graph-result, .comparison-scroll, .comparison-table thead th, .compare-chart-key li { background: #14252c; border-color: #46646c; }
    .compare-chart-surface, .compare-insights > div, .comparison-table thead th:first-child, .comparison-table tbody th { background: #1b3139; border-color: #46646c; }
    .comparison-table tbody tr:nth-child(even) td { background: #192e35; }
    .comparison-table tbody tr:hover td { background: #2a454b; }
    .comparison-table th, .comparison-table td { border-color: #38515a; }
    .compare-graph h1, .compare-graph-controls h2, .compare-chart-title h3, .compare-insights strong, .compare-chart-trip strong, .compare-chart-key b, .compare-heading h2, .compare-empty h3, .compare-trip-title, .comparison-table tbody td, .comparison-table tbody td.compare-price { color: #edf5ef; }
    .compare-graph-kicker, .compare-chart-title span, .compare-insights span, .compare-heading span, .compare-row-label svg, .compare-detail-heading svg { color: #b8ddcf; }
    .compare-graph-header p, .compare-graph-controls p, .compare-graph-controls label, .compare-graph-note, .compare-graph-loading, .compare-chart-title p, .compare-insights small, .compare-chart-key li, .compare-chart-trip small, .compare-heading p, .compare-empty p, .compare-hint, .comparison-table tbody th, .comparison-table thead th:first-child, .compare-trip-place { color: #bfcec9; }
    .compare-selection, .compare-empty-icon, .compare-graph-controls select { color: #edf5ef; background: #2a454b; border-color: #547177; }
    #compare-bar-0 stop:first-child { stop-color: #83b5aa; }
    #compare-bar-0 stop:last-child { stop-color: #c6e8d9; }
    #compare-bar-1 stop:first-child { stop-color: #759ba5; }
    #compare-bar-1 stop:last-child { stop-color: #b6d2d7; }
    #compare-bar-2 stop:first-child { stop-color: #879da4; }
    #compare-bar-2 stop:last-child { stop-color: #d6e8e1; }
  }
  @media (max-width: 700px) {
    padding-bottom: 60px;
    .compare-graph { border-radius: 16px; }
    .compare-graph-header, .compare-graph-controls { align-items: flex-start; flex-direction: column; }
    .compare-generate { width: 100%; }
    .compare-chart-title { align-items: flex-start; flex-direction: column; }
    .compare-chart-title p { text-align: left; }
    .compare-chart { height: 190px; }
    .compare-insights > div { padding: 14px; }
    .compare-content { padding-top: 36px; }
    .compare-heading { align-items: flex-start; flex-direction: column; }
    .compare-hint { display: block; }
    .comparison-table { min-width: 650px; }
    .comparison-table th:first-child { position: sticky; left: 0; z-index: 1; box-shadow: 3px 0 8px rgba(37,72,48,.06); }
    .comparison-table thead th:first-child { z-index: 2; }
    .comparison-table th, .comparison-table td { padding: 15px; }
    .compare-trip-image { height: 120px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .compare-trip-image img { transition: none; }
    .compare-trip-image:hover img { transform: none; }
  }
`;
