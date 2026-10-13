"""Read published WordPress property posts and verify minimal facts in HTML."""
from pathlib import Path
import argparse
import json
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from urllib.parse import urlsplit, urlencode
from pipeline import Client, ROOT, VERSION, TYPES, canonical, clean, date, export, extract, fold, number

class PropertyDetails(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.label, self.value, self.fields = [], [], [], []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self.stack.append((tag, a))
        if tag == 'li' and any(b.get('id') == 'property-detail-wrap' for t, b in self.stack):
            self.label, self.value = [], []
    def handle_data(self, data):
        if not any(a.get('id') == 'property-detail-wrap' for t, a in self.stack):
            return
        if any(t == 'strong' for t, a in self.stack):
            self.label.append(data)
        elif any(t == 'span' for t, a in self.stack):
            self.value.append(data)
    def handle_endtag(self, tag):
        if tag == 'li' and self.label:
            self.fields.append((clean(' '.join(self.label)), clean(' '.join(self.value))))
            self.label, self.value = [], []
        for i in range(len(self.stack)-1, -1, -1):
            if self.stack[i][0] == tag:
                self.stack = self.stack[:i]
                break

def detail_values(html):
    parser = PropertyDetails()
    parser.feed(html)
    out = {}
    for label, value in parser.fields:
        label = fold(label).rstrip(':').strip()
        if label == 'prix':
            m = re.fullmatch(r'([\d\s.,]+)\s*(DHs?|MAD)', value, re.I)
            if m and number(m[1]):
                out.update(prix=number(m[1]), devise='MAD')
        if label == 'surface':
            m = re.fullmatch(r'([\d\s.,]+)\s*m[²2]', value)
            if m and number(m[1]):
                out['superficie'] = number(m[1])
    return out

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--origin', default='https://limmobiliersansfrontieres.com')
    p.add_argument('--output', type=Path, default=ROOT / 'data' / 'annonces-fraiches')
    args = p.parse_args()
    origin = canonical(args.origin).rstrip('/')
    if origin != 'https://limmobiliersansfrontieres.com':
        p.error('This adapter has only been reviewed for limmobiliersansfrontieres.com')
    output = args.output
    output.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(output / 'checkpoint.sqlite')
    db.execute('CREATE TABLE IF NOT EXISTS observations (url TEXT PRIMARY KEY, payload TEXT NOT NULL)')
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=7)).replace(microsecond=0)
    client = Client(origin)
    terms = {}
    stats = {'run_id':now.isoformat(),'sources':[{'origin':origin,'channel':'public_wordpress_published_properties'}],'discovered':0,'fetched':0,'errors':[]}
    def term(taxonomy, ids):
        if len(ids) != 1:
            return None
        key = (taxonomy, ids[0])
        if key not in terms:
            u = origin + '/wp-json/wp/v2/' + taxonomy + '/' + str(ids[0]) + '?_fields=id,name'
            d = json.loads(client.get(u))
            if d.get('id') != ids[0]:
                raise ValueError('taxonomy_identity_mismatch')
            terms[key] = clean(d.get('name'))
        return terms[key]
    for page in range(1, 11):
        query = urlencode({'status':'publish','after':cutoff.isoformat(),'orderby':'date','order':'desc','per_page':100,'page':page,'_fields':'id,date_gmt,link,property_city,property_area,property_type'})
        feed_url = origin + '/wp-json/wp/v2/properties?' + query
        try:
            posts = json.loads(client.get(feed_url))
            if not isinstance(posts,list):
                raise ValueError('unexpected_feed_shape')
            for post in posts:
                url = canonical(post.get('link',''))
                if urlsplit(url).netloc != urlsplit(origin).netloc or not urlsplit(url).path.startswith('/property/'):
                    raise ValueError('property_identity_mismatch')
                stats['discovered'] += 1
                # date_gmt is publication time in GMT, documented by WordPress.
                published = post.get('date_gmt','') + 'Z'
                if not date(published) or not cutoff < date(published) <= now:
                    continue
                html = client.get(url)
                stats['fetched'] += 1
                row = extract(html,url)
                if date(row.get('date_publication')) and date(row['date_publication']) != date(published):
                    row['erreur'] = 'feed_detail_publication_mismatch'
                row.update(date_publication=published,http_status=200,verifie_le=datetime.now(timezone.utc).isoformat(),run_id=stats['run_id'])
                row['preuves']['date_publication'] = 'wordpress:published-property.date_gmt:UTC'
                for taxonomy,field in [('property_city','ville'),('property_area','quartier'),('property_type','type')]:
                    label = term(taxonomy,post.get(taxonomy,[]))
                    if label:
                        if field == 'type':
                            label = TYPES.get(fold(label)) or TYPES.get(fold(label).rstrip('s'))
                        if label:
                            row[field] = label
                            row['preuves'][field] = 'wordpress:bound-property.' + taxonomy + ':public-term.name'
                values = detail_values(html)
                row.update(values)
                for field in ('prix','superficie'):
                    if field in values:
                        row['preuves'][field] = 'lsf:property-detail-wrap:' + ('Prix:DH' if field=='prix' else 'Surface:m2')
                db.execute('INSERT OR REPLACE INTO observations VALUES (?,?)',(url,json.dumps(row,ensure_ascii=False)))
                db.commit()
            if len(posts)<100:
                break
        except Exception as e:
            stats['errors'].append({'feed_url':feed_url,'error':str(e)[:250]})
            break
    report = export(db,output,datetime.now(timezone.utc),200000,stats)
    print(json.dumps(report,ensure_ascii=True,indent=2),flush=True)
    db.close()

if __name__ == '__main__':
    main()
