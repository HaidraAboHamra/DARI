// UX audit of the app's web build at phone size: tap targets, text size, contrast, per screen.
// Run against the app's web build (pnpm --filter @dari/mobile export:web, served on :8081) and a local API.
// See docs/UX_STUDY.md for the results.
// Usage: node ux-audit.js <outdir> <label>   (PHONE env = test login)
const { chromium } = require('playwright');
const fs = require('fs');
const [OUT, LABEL] = [process.argv[2], process.argv[3] || 'before'];
const B = 'http://localhost:8081';
const PHONE = process.env.PHONE || '0900000013';
const SLUG = encodeURIComponent('برغر-هاوس-f04');

async function measure(p) {
  return p.evaluate(() => {
    const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
    const lum = ([r, g, b]) => {
      const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a, b) => {
      const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (l1 + 0.05) / (l2 + 0.05);
    };
    const bgOf = (el) => {
      for (let e = el; e; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (s.backgroundImage && s.backgroundImage !== 'none') return null; // over a photo/gradient: skip
        const c = parse(s.backgroundColor);
        if (c.length === 4 ? c[3] > 0.9 : c.length === 3) return c.slice(0, 3);
      }
      return [255, 255, 255];
    };
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight * 3 && getComputedStyle(el).visibility !== 'hidden';
    };
    // Tap targets: RN-web Pressables are tabindex=0 / role=button; also inputs.
    const targets = [...document.querySelectorAll('[tabindex="0"],[role="button"],button,a[href],input,textarea')].filter(visible);
    const small = targets
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => Math.min(r.width, r.height) < 44)
      .map(({ el, r }) => ({ label: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }));
    // Text: leaf elements with own text.
    const texts = [...document.querySelectorAll('div,span')].filter((el) => visible(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    let tiny = 0;
    const tinySamples = [];
    const lowContrast = [];
    for (const el of texts) {
      const s = getComputedStyle(el);
      const size = parseFloat(s.fontSize);
      const text = el.textContent.trim().slice(0, 24);
      if (size < 13) {
        tiny++;
        if (tinySamples.length < 8) tinySamples.push(`${size}px «${text}»`);
      }
      const bg = bgOf(el);
      const fg = parse(s.color);
      if (!bg || fg.length < 3) continue;
      const alpha = fg.length === 4 ? fg[3] : 1;
      const mixed = fg.slice(0, 3).map((v, i) => v * alpha + bg[i] * (1 - alpha));
      const cr = ratio(mixed, bg);
      const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
      if (cr < (large ? 3 : 4.5)) lowContrast.push(`${cr.toFixed(2)} ${size}px «${text}»`);
    }
    return { targets: targets.length, smallTargets: small.length, smallSamples: small.slice(0, 10), texts: texts.length, tiny, tinySamples, lowContrast: lowContrast.length, lowSamples: [...new Set(lowContrast)].slice(0, 10) };
  });
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const report = {};
  const go = async (name, url, wait) => {
    await p.goto(B + url);
    await p.waitForSelector(wait, { timeout: 25000 });
    await p.waitForTimeout(3600); // intro + images
    report[name] = await measure(p);
    await p.screenshot({ path: `${OUT}/${LABEL}-${name}.png` });
    console.log(name, JSON.stringify({ targets: report[name].targets, small: report[name].smallTargets, tiny: report[name].tiny, lowContrast: report[name].lowContrast }));
  };

  await go('login', '/login', 'input[placeholder="09xx xxx xxx"]');
  await p.fill('input[placeholder="09xx xxx xxx"]', PHONE);
  await p.click('text=أرسل الرمز');
  await p.waitForSelector('text="دخول"');
  const inputs = await p.$$('input');
  await inputs[inputs.length - 1].fill('123456');
  await p.click('text="دخول"');
  await p.waitForTimeout(1500);

  await go('home', '/', 'text=شو بدك اليوم؟');
  await go('food', '/food', 'text=كل المطاعم');
  await go('restaurant', `/b/${SLUG}`, 'text=الأكثر طلباً');
  // Put something in the cart for the cart screen.
  await p.click('[aria-label="أضف بطاطا بالجبنة"] >> nth=0');
  await p.click('[aria-label="أضف ميلك شيك أوريو"] >> nth=0');
  await p.click('[aria-label="دبل تشيز برغر"] >> nth=0');
  await p.waitForSelector('text=اجعلها وجبة');
  await p.waitForTimeout(800);
  report.sheet = await measure(p);
  await p.screenshot({ path: `${OUT}/${LABEL}-sheet.png` });
  console.log('sheet', JSON.stringify({ targets: report.sheet.targets, small: report.sheet.smallTargets, tiny: report.sheet.tiny, lowContrast: report.sheet.lowContrast }));
  await go('cart', '/cart', 'text=الدفع نقداً عند الاستلام');
  await go('orders', '/orders', 'text=طلباتي');
  await go('account', '/account', 'text=تسجيل الخروج');
  fs.writeFileSync(`${OUT}/${LABEL}-audit.json`, JSON.stringify(report, null, 1));
  await b.close();
})().catch((e) => {
  console.error('FAIL', e.message);
  process.exit(1);
});
