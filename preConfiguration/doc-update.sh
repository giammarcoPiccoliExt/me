#!/bin/bash
set -e

# Example: run the same steps as your GitHub Actions workflow
# (You can expand this script as needed)

cd "$(dirname "$0")/.."

# Checkout, setup, install, build, version, pdf, deploy, etc
# (Add your real commands here)

echo "[doc-update] Installing dependencies..."
pip install -r requirements.txt#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "[doc-update] Setting up environment..."
pip install -r requirements.txt
pip install beautifulsoup4

echo "[doc-update] Configuring git..."
git config --global user.name "Script Runner"
git config --global user.email "script@example.com"
git fetch --all
git fetch origin gh-pages
git checkout origin/gh-pages -- latest || true

echo "[doc-update] Checking symlink..."
ls -l latest || true

echo "[doc-update] Determining next version..."
latest_version=$(readlink latest || echo "7.00.0")
echo "Latest version: $latest_version"

anno=7
last_mese=$(echo "$latest_version" | awk -F. '{print $2}')
last_patch=$(echo "$latest_version" | awk -F. '{print $3}')
mese=$(date +'%m')

if [ "$mese" != "$last_mese" ]; then
  nuova_patch=0
else
  nuova_patch=$((last_patch + 1))
fi

new_version="${anno}.${mese}.${nuova_patch}"
echo "Calcolata nuova versione: $new_version"

echo "[doc-update] Building documentation..."
mkdocs build

echo "[doc-update] Renumbering figures..."
python pdfGeneration/figureEnumerator.py site/print_page.html

echo "[doc-update] Installing wkhtmltopdf..."
wget -q https://github.com/wkhtmltopdf/wkhtmltopdf/releases/download/0.12.5/wkhtmltox_0.12.5-1.focal_amd64.deb
sudo apt install -y ./wkhtmltox_0.12.5-1.focal_amd64.deb

echo "[doc-update] Generating PDF..."
wkhtmltopdf \
  --enable-local-file-access \
  --enable-javascript \
  --javascript-delay 1000 \
  --print-media-type \
  --disable-smart-shrinking \
  --dpi 200 \
  --encoding UTF-8 \
  --header-html "file://$(pwd)/pdfGeneration/pdf-header.html" \
  --footer-html "file://$(pwd)/pdfGeneration/pdf-footer.html" \
  --user-style-sheet "file://$(pwd)/pdfGeneration/pdf-leonardo.css" \
  --footer-spacing 10 \
  --header-spacing 10 \
  --margin-top 51.317 \
  --margin-bottom 33.56 \
  --margin-left 19.138 \
  --margin-right 13 \
  "file://$(pwd)/pdfGeneration/pdf-firstPage.html" \
  "file://$(pwd)/site/print_page.html" \
  "$(pwd)/docs/personalization/SCMP_SUM.pdf"

echo "[doc-update] Logging into API..."
response=$(curl -s --location 'https://www.movincloud.com/api/iam/login' \
  -H "Content-Type: application/json" \
  -d '{
        "user": "cmp_api_test",
        "psw": "'"$PSW"'",
        "get_routes": true,
        "routes_for_module": "IAM/IAM_FE",
        "app_to_use": "TUTTE",
        "iam_fe_login": true,
        "error_on_iam_routes": false
      }')

token=$(echo "$response" | jq -r '.access_token')
if [ "$token" == "null" ] || [ -z "$token" ]; then
  echo "Login fallita: token non ricevuto"
  exit 1
fi
echo "Login ok. Token ricevuto."

echo "[doc-update] Downloading Swagger JSONs..."
apis=("finops" "provisioning" "rm" "abs" "rmreport" "rmcosts" "rmmonitoring" "rmsecurity" "rmservice" "siem" "txm" "tenant")
for api in "${apis[@]}"; do
  echo "Fetching Swagger for $api..."
  curl --silent \
    -H "Authorization: Bearer $token" \
    -H "x-Tenant: Default" \
    "https://www.movincloud.com/api/${api}/v3/api-docs" \
    -o "docs/${api}Swagger.json"
done

echo "[doc-update] Deploying docs with mike..."
mike deploy --push --update-aliases "$new_version" latest

echo "[doc-update] Done."


echo "[doc-update] Building documentation..."
mkdocs build

echo "[doc-update] Generating PDF..."
# (Add your PDF generation command here)

echo "[doc-update] Deploying docs..."
# (Add your deploy command here)

echo "[doc-update] Done."
