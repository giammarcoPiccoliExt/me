import json
from jinja2 import Template
import os

# Carica config.json
with open("preConfiguration/config.json") as f:
    config = json.load(f)

# Percorso cartella template
template_folder = "preConfiguration"

def render_template(filename, context):
    path = os.path.join(template_folder, filename)
    with open(path) as f:
        template = Template(f.read())
    return template.render(**context)

def save_rendered(content, filename):
    path = os.path.join(template_folder, filename)
    with open(path, "w") as f:
        f.write(content)

# Lista dei template da generare e nomi file output (senza .j2)
templates = [
    ("pdf-header.html.j2", "../documentation/pdfGeneration/pdf-header.html"),
    ("pdf-footer.html.j2", "../documentation/pdfGeneration/pdf-footer.html"),
    ("pdf-firstPage.html.j2", "../documentation/pdfGeneration/pdf-firstPage.html"),
]

for tpl_file, out_file in templates:
    rendered = render_template(tpl_file, config)
    save_rendered(rendered, out_file)
    print(f"Generato {out_file}")
