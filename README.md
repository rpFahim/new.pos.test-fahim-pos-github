# Fahim POS

A compact, responsive GitHub Pages-ready point-of-sale starter that works in modern desktop and mobile browsers. The desktop layout uses a single-row sale-entry strip, a dense product table and a right-side billing summary.

## Included

- Barcode/product-code entry and searchable product catalogue
- Cart quantity, stock limits, discount, paid, due and change calculations
- Optional customer flow: mobile lookup, new-name entry or skip
- Saved Light/Dark theme and 58mm/80mm receipt setting
- Compact thermal receipt printing
- Local sales, customer and stock storage
- Installable PWA shell with offline reopening after the first successful visit
- Keyboard shortcuts: F2, F3, F7, F8, Delete and Ctrl+Shift+X

## Publish with GitHub Pages

1. Create a new GitHub repository.
2. Upload every file and folder from this project, including `.github`.
3. Open **Repository Settings → Pages**.
4. Under **Build and deployment**, select **GitHub Actions**.
5. Push or upload to the `main` branch. The included workflow publishes the site automatically.

The live address will normally be:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`

## Test products

- `1004` — Premium Notebook
- `1005` — Blue Ball Pen
- `8941100500012` — Wireless Mouse

Test existing customer: `01712345678`

## Important production note

This starter stores data in the current browser using Local Storage. It is suitable for UI testing and a single-device prototype. A production multi-device shop requires a protected backend database, login/permissions, server-side invoice numbering, sync-conflict rules and verified backups.
