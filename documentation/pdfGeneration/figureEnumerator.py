from bs4 import BeautifulSoup
import re

JS_FUNCTION = """
<script>
function analyzeTableCells() {
  document.querySelectorAll(".md-typeset table td").forEach(td => {
    const text = td.textContent.trim();
    td.removeAttribute('data-content-type');
    td.removeAttribute('data-content-length');

    if (/^\\d+(\\.\\d+)?$/.test(text)) {
      td.dataset.contentType = "number";
    } else if (text.length > 30) {
      td.dataset.contentLength = "long";
    } else if (!text.includes(" ")) {
      td.dataset.contentType = "word";
    }
  });
}

document.addEventListener("DOMContentLoaded", analyzeTableCells);

if (window.matchMedia) {
  const mediaQueryList = window.matchMedia('print');
  mediaQueryList.addEventListener('change', mql => {
    if (mql.matches) analyzeTableCells();
  });
}

window.onbeforeprint = analyzeTableCells;
</script>
"""

def clean_and_renumber_figures(html_file):
    with open(html_file, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    # Rinumera le figure
    counter = 1
    for fig in soup.find_all('figure'):
        caption = fig.find('figcaption')
        if caption:
            text = caption.text.strip()
            cleaned = re.sub(r'^(Figure|Figura)\s+\d+\s*[:–-]\s*', '', text, flags=re.IGNORECASE)
            caption.string = f'Figura {counter} – {cleaned}'
            counter += 1

    # Inserisce lo script JS prima della chiusura </body>
    body = soup.find('body')
    if body:
        body.append(BeautifulSoup(JS_FUNCTION, 'html.parser'))

    # Scrive di nuovo il file
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(str(soup))

# CLI
if __name__ == "__main__":
    import sys
    clean_and_renumber_figures(sys.argv[1])
