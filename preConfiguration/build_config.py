import json
import yaml
from jinja2 import Template

# Carica le variabili base (site_name, author)
with open("preConfiguration/config.json") as f:
    config = json.load(f)

# Carica nav da nav.yml e converti in stringa YAML
with open("preConfiguration/nav_config.yml") as f:
    nav_yaml = f.read()

# Carica il template
with open("preConfiguration/mkdocs-template.yml.j2") as f:
    template = Template(f.read())

# Genera mkdocs.yml
output = template.render(**config, nav_yaml=nav_yaml)

# Salva mkdocs.yml
with open("documentation/mkdocs.yml", "w") as f:
    f.write(output)

print("✅ mkdocs.yml generato con successo.")
