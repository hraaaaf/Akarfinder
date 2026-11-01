#!/usr/bin/env python3
"""One-page Chrome rendering diagnostic. No crawling, challenges or login automation."""
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

TARGET = 'https://www.mubawab.ma/fr/st/rabat/appartements-a-vendre'
OUT = Path('artifacts/chrome-diagnostic')


def assess(title, body, dom):
    challenge = bool(re.search(r'(just a moment|attention required|verify you are human|checking your browser|cf-chl-|challenge-platform)', title + '\n' + body[:3000], re.I))
    if dom.get('listingbox', 0) > 0:
        return 'cards_present'
    if challenge:
        return 'challenge'
    if dom.get('listing_link_count', 0) > 0:
        return 'selector_drift_possible'
    return 'empty_or_unexpected'


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    url = os.getenv('DIAGNOSTIC_URL', TARGET)
    parsed = urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname != 'www.mubawab.ma':
        raise ValueError('Only the fixed HTTPS diagnostic target is allowed')
    data = {'utc': datetime.now(timezone.utc).isoformat(), 'url': url, 'browser': 'Chromium via Playwright', 'status': 'not_started'}
    exit_code = 2
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
            page = browser.new_page(viewport={'width': 1280, 'height': 800}, device_scale_factor=1)
            try:
                resp = page.goto(url, wait_until='domcontentloaded', timeout=35000)
                page.wait_for_timeout(3500)
                title = page.title()[:200]
                body = page.locator('body').inner_text(timeout=5000)[:6000]
                dom = page.evaluate('''() => ({
                    listingbox: document.querySelectorAll('.listingBox').length,
                    listingtitle: document.querySelectorAll('.listingTitle').length,
                    hardprice: document.querySelectorAll('.hardPrice').length,
                    listing_link_count: document.querySelectorAll('a[href*="/fr/a/"]').length,
                    anchor_count: document.querySelectorAll('a').length,
                    total_html_bytes: new Blob([document.documentElement.outerHTML]).size
                })''')
                # Bounded DOM fixture to diagnose parser selectors, no crawl.
                samples = page.eval_on_selector_all('.listingBox', '''cards => cards.slice(0, 2).map(card => {
                    const clone = card.cloneNode(true);
                    clone.querySelectorAll('script,style,iframe,img,source,video').forEach(el => el.remove());
                    return clone.outerHTML.slice(0, 24000);
                })''')
                (OUT / 'card_samples.html').write_text('<!doctype html><meta charset="utf-8">\n' + '\n'.join(samples), encoding='utf-8')
                data['sample_count'] = len(samples)
                data['sample_file'] = 'card_samples.html'
                state = assess(title, body, dom)
                data.update({'status': state, 'http_status': resp.status if resp else None,
                             'final_url': page.url, 'title': title, 'dom': dom,
                             'has_cf_clearance_cookie': bool([c for c in page.context.cookies() if c['name'] == 'cf_clearance'])})
                exit_code = 0 if state == 'cards_present' else 2
            except Exception as e:
                data.update({'status': 'browser_error', 'error': f'{type(e).__name__}: {str(e)[:350]}'})
            finally:
                try:
                    page.screenshot(path=str(OUT / 'screenshot.png'), full_page=False, timeout=5000)
                    data['screenshot_file'] = 'screenshot.png'
                except Exception as e:
                    data['screenshot_error'] = f'{type(e).__name__}: {str(e)[:160]}'
                browser.close()
    except Exception as e:
        data.update({'status': 'setup_error', 'error': f'{type(e).__name__}: {str(e)[:350]}'})
    (OUT / 'diagnostic.json').write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps(data, ensure_ascii=False))
    return exit_code


if __name__ == '__main__':
    sys.exit(run())
