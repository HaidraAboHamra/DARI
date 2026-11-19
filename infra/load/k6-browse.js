// Load test: citizen browsing + search mix.
// Run: k6 run -e BASE=https://api.dari.sy infra/load/k6-browse.js
// Raise the stage targets step by step; scale on measurements (ARCHITECTURE.md §7).
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE || 'http://localhost:4000';
const QUERIES = ['مطعم', 'صيدلية مناوبة هلق', 'بدي سباك', 'شقة للإيجار', 'في رحلة هالأسبوع', 'كنافه', 'وظيفة'];

export const options = {
  stages: [
    { duration: '1m', target: 100 },
    { duration: '3m', target: 500 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{kind:list}': ['p(95)<250'],
    'http_req_duration{kind:search}': ['p(95)<400'],
  },
};

export default function () {
  const list = http.get(`${BASE}/api/v1/businesses?city=salamiyah&limit=12`, { tags: { kind: 'list' } });
  check(list, { 'list 200': (r) => r.status === 200 });
  const q = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const search = http.get(`${BASE}/api/v1/search?city=salamiyah&q=${encodeURIComponent(q)}`, { tags: { kind: 'search' } });
  check(search, { 'search 200': (r) => r.status === 200 });
  const news = http.get(`${BASE}/api/v1/news?city=salamiyah&limit=4`, { tags: { kind: 'list' } });
  check(news, { 'news 200': (r) => r.status === 200 });
  sleep(1 + Math.random() * 2);
}
