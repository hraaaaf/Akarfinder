"""J5: read one independently indexed historical Common Crawl WARC record.

No Mubawab HTTP. No staging, map, current availability, public admission.
No website source material, HTML or WARC bytes belong in Git.
"""
from __future__ import annotations

import argparse
import base64
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import ssl
import urllib.request
import zlib

MAX_WARC_GZ = 160_000
MAX_DECOMPRESSED = 2_500_000
MAX_BODY = 2_000_000
CC_PREFIX = 'https://data.commoncrawl.org/'
ID_URL = re.compile(r'https://www\.mubawab\.ma/fr/a/([0-9]{5,12})/[a-z0-9-]+\Z')
CC_FILENAME = re.compile(r'crawl-data/(CC-MAIN-20[0-9]{2}-[0-9]{2})/segments/[0-9.]+/warc/CC-MAIN-[0-9-]+\.warc\.gz\Z')
DIGEST = re.compile(r'[A-Z2-7]{32}\Z')


class ArchiveRejected(ValueError):
    pass


def check_index(index: dict) -> dict:
    """Validate pinned CDX metadata; never trust URL/path from WARC itself."""
    required={'crawl','timestamp','url','status','mime','digest','length','offset','filename'}
    if not isinstance(index,dict) or set(index)!=required:
        raise ArchiveRejected('INDEX_FIELDS_INVALID')
    if not isinstance(index['url'],str) or ID_URL.fullmatch(index['url']) is None:
        raise ArchiveRejected('NOT_AN_INDIVIDUAL_MUBAWAB_URL')
    m=CC_FILENAME.fullmatch(index['filename']) if isinstance(index['filename'],str) else None
    if m is None or m.group(1)!=index['crawl']:
        raise ArchiveRejected('INDEX_FILENAME_INVALID')
    if index['status'] != '200' or index['mime']!='text/html':
        raise ArchiveRejected('INDEX_HTTP_NOT_HTML_200')
    if (not isinstance(index['digest'],str) or not DIGEST.fullmatch(index['digest'])):
        raise ArchiveRejected('INDEX_DIGEST_INVALID')
    if (type(index['length']) is not int or not 1<=index['length']<=MAX_WARC_GZ
        or type(index['offset']) is not int or index['offset']<0):
        raise ArchiveRejected('INDEX_RANGE_INVALID')
    if not isinstance(index['timestamp'],str) or not re.fullmatch(r'20[0-9]{12}',index['timestamp']):
        raise ArchiveRejected('INDEX_TIME_INVALID')
    try: datetime.strptime(index['timestamp'],'%Y%m%d%H%M%S')
    except ValueError as exc: raise ArchiveRejected('INDEX_TIME_INVALID') from exc
    return index


def _headers(data:bytes) -> tuple[str,dict[str,str],bytes]:
    head,sep,body = data.partition(b'\r\n\r\n')
    if not sep or len(head)>30_000:
        raise ArchiveRejected('WARC_HEADERS_INVALID')
    try:
        lines=head.decode('ascii').split('\r\n')
    except UnicodeError as exc:
        raise ArchiveRejected('WARC_HEADERS_INVALID') from exc
    fields={}
    for line in lines[1:]:
        key,sep,val=line.partition(':')
        if not sep or not key or key.casefold() in fields:
            raise ArchiveRejected('WARC_HEADER_DUPLICATE_OR_INVALID')
        fields[key.casefold()] = val.strip()
    return lines[0],fields,body


def _sha1_b32(blob:bytes)->str:
    return base64.b32encode(hashlib.sha1(blob).digest()).decode('ascii').rstrip('=')


def inspect_record(compressed:bytes,index:dict)->tuple[dict,bytes]:
    index=check_index(index)
    if not isinstance(compressed,bytes) or len(compressed)!=index['length'] or compressed[:2]!=b'\x1f\x8b':
        raise ArchiveRejected('WARC_GZIP_RANGE_MISMATCH')
    # Bounded gzip decompression; refuse concatenated/extra members.
    try:
        decomp=zlib.decompressobj(wbits=31)
        raw=decomp.decompress(compressed, MAX_DECOMPRESSED+1)
        if (len(raw)>MAX_DECOMPRESSED or not decomp.eof or decomp.unused_data
                or decomp.unconsumed_tail or decomp.flush()):
            raise ArchiveRejected('WARC_DECOMPRESSED_NOT_BOUNDED')
    except zlib.error as exc:
        raise ArchiveRejected('WARC_GZIP_INVALID') from exc
    first,wh,content=_headers(raw)
    if (first not in {'WARC/1.0','WARC/1.1'} or wh.get('warc-type')!='response'
        or wh.get('warc-target-uri')!=index['url']):
        raise ArchiveRejected('WARC_SOURCE_IDENTITY_MISMATCH')
    capture=wh.get('warc-date')
    try:
        dt=datetime.fromisoformat(capture.replace('Z','+00:00'))
        index_time=datetime.strptime(index['timestamp'],'%Y%m%d%H%M%S').replace(tzinfo=timezone.utc)
        if dt.tzinfo is None or abs((dt-index_time).total_seconds())>60:
            raise ValueError
    except (ValueError,TypeError,AttributeError) as exc:
        raise ArchiveRejected('WARC_CAPTURE_TIME_CONFLICT') from exc
    expected_len=wh.get('content-length')
    if not expected_len or not expected_len.isdecimal():
        raise ArchiveRejected('WARC_CONTENT_LENGTH_MISSING')
    if len(content)<int(expected_len) or content[int(expected_len):].strip(b'\r\n'):
        raise ArchiveRejected('WARC_CONTENT_LENGTH_INVALID')
    first_http,http_headers,body=_headers(content[:int(expected_len)])
    if not re.fullmatch(r'HTTP/(1\.[01]|2(?:\.0)?) 200(?:\s.*)?',first_http):
        raise ArchiveRejected('ARCHIVED_HTTP_NOT_200')
    mime=http_headers.get('content-type','').lower()
    if not mime.startswith(('text/html','application/xhtml+xml')):
        raise ArchiveRejected('ARCHIVED_HTTP_NOT_HTML')
    if http_headers.get('content-encoding','identity').lower() not in ('identity',''):
        raise ArchiveRejected('ARCHIVED_BODY_ENCODING_NEEDS_REVIEW')
    if not body or len(body)>MAX_BODY:
        raise ArchiveRejected('ARCHIVED_HTML_SIZE_INVALID')
    # The index digest is Common Crawl's WARC-Payload-Digest (SHA1 of payload).
    if wh.get('warc-payload-digest','').lower().split(':',1)[0]!='sha1':
        raise ArchiveRejected('WARC_PAYLOAD_DIGEST_MISSING')
    from_warc=wh['warc-payload-digest'].split(':',1)[1].upper()
    from_index=index['digest'].upper()
    actual=_sha1_b32(body)
    if actual!=from_warc or actual!=from_index:
        raise ArchiveRejected('WARC_PAYLOAD_DIGEST_MISMATCH')
    if not body.lstrip(b'\xef\xbb\xbf \r\n\t').lower().startswith((b'<!doctype html',b'<html',b'<?xml')):
        raise ArchiveRejected('ARCHIVED_DOCUMENT_NOT_HTML')
    try: body.decode('utf-8','strict')
    except UnicodeError as exc: raise ArchiveRejected('ARCHIVED_UTF8_INVALID') from exc
    return {
      'kind':'commoncrawl_historical_http_response',
      'source_url':index['url'],
      'source_offer_id':ID_URL.fullmatch(index['url']).group(1),
      'archive_crawl':index['crawl'],
      'archived_at_utc':dt.astimezone(timezone.utc).isoformat().replace('+00:00','Z'),
      'html_sha256':hashlib.sha256(body).hexdigest(),
      'raw_warc_gz_sha256':hashlib.sha256(compressed).hexdigest(),
      'warc_sha1_payload_index_match':True,
      'html_byte_count':len(body),
      'archived_http_status':200,
      'independent_current_activity_verified':False,
      'same_physical_property_verified':False,
      'eligible_for_private_detail_staging':False,
      'eligible_for_public_admission':False,
      'db_writes':0,
    },body


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):
        raise ArchiveRejected('COMMONCRAWL_REDIRECT_REQUIRES_REVIEW')


def download_one_warc(index:dict, folder:Path, *, approved:bool=False)->dict:
    """At most one HTTP Range GET to Common Crawl, NEVER to Mubawab."""
    index=check_index(index)
    if not approved or os.environ.get('AKAR_CC_WARC_APPROVED')!='approved':
        raise ArchiveRejected('COMMONCRAWL_NETWORK_NOT_APPROVED')
    if folder.exists() or folder.is_symlink():
        raise ArchiveRejected('EVIDENCE_DESTINATION_MUST_BE_NEW')
    # CC_FILENAME forbids external URLs and path traversal.
    start=index['offset']; stop=start+index['length']-1
    req=urllib.request.Request(CC_PREFIX+index['filename'],headers={
        'User-Agent':'Akarfinder-Historical-Archive-Validation/0.1',
        'Range':f'bytes={start}-{stop}',
        'Accept-Encoding':'identity',
    },method='GET')
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}),_NoRedirect(),
        urllib.request.HTTPSHandler(context=ssl.create_default_context()))
    with opener.open(req,timeout=20) as response:
        if response.status!=206 or response.headers.get('Content-Range','')!=f'bytes {start}-{stop}/*':
            # Some CC servers supply a known file total instead of *; check below.
            hdr=response.headers.get('Content-Range','')
            if response.status!=206 or not re.fullmatch(
                rf'bytes {start}-{stop}/[0-9]+',hdr):
                raise ArchiveRejected('COMMONCRAWL_HTTP_RANGE_NOT_EXACT')
        compressed=response.read(index['length']+1)
    manifest,html=inspect_record(compressed,index)
    folder.mkdir(mode=0o700,parents=True)
    (folder/'original.warc.gz').write_bytes(compressed)
    (folder/'source.html').write_bytes(html)
    (folder/'archive.index.json').write_text(json.dumps(index,indent=2)+'\n',encoding='utf8')
    (folder/'archive.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
    for path in folder.iterdir(): path.chmod(0o600)
    return manifest


def main():
    cli=argparse.ArgumentParser()
    cli.add_argument('--index',type=Path,required=True)
    cli.add_argument('--warc-gz',type=Path)
    cli.add_argument('--download-once',action='store_true')
    cli.add_argument('--private-output',type=Path)
    args=cli.parse_args()
    index=json.loads(args.index.read_text(encoding='utf8'))
    if args.download_once:
        if args.warc_gz or not args.private_output: cli.error('invalid download options')
        report=download_one_warc(index,args.private_output,approved=True)
    else:
        if not args.warc_gz: cli.error('offline replay requires --warc-gz')
        report,_=inspect_record(args.warc_gz.read_bytes(),index)
    print(json.dumps(report,sort_keys=True))

if __name__=='__main__': main()