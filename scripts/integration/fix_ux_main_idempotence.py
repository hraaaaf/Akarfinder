from pathlib import Path
import re

path = Path("components/search/LightZillowSearchShell.tsx")
text = path.read_text()

text = re.sub(
    r'(  const \[indexedTotalCount, setIndexedTotalCount\] = useState<number \| null>\(null\);\n){2,}',
    '  const [indexedTotalCount, setIndexedTotalCount] = useState<number | null>(null);\n',
    text,
)

if text.count('const [indexedTotalCount, setIndexedTotalCount]') != 1:
    raise SystemExit('indexedTotalCount state must appear exactly once')

path.write_text(text)
