# Baggage Tracing Desk — Version 1.0

A browser-based baggage tracing case manager built with HTML, CSS, JavaScript, and LocalStorage. Designed for static hosting on GitHub Pages.

## Included features

- Staff sign-in screen (demo-only client-side login)
- Dashboard counts and status breakdown
- Create, view, edit, search, filter, and delete tracing cases
- Case history for status changes and notes
- Filtered reports
- CSV export
- Excel-compatible `.xls` export (opens as a spreadsheet; it is not a native `.xlsx` workbook)
- JSON backup, merge restore, and replace restore
- Responsive layout for desktop and mobile

## Demo login

- Username: `staff`
- Password: `Airport123!`

To change the demo credentials, edit `DEMO_USERNAME` and `DEMO_PASSWORD` near the top of `app.js`.

## Deploy to GitHub Pages

1. Download and unzip this project.
2. Create a new GitHub repository (for example `baggage-tracing-desk`).
3. Upload `index.html`, `styles.css`, `app.js`, and `README.md` to the repository root.
4. In the repository, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select branch `main` and folder `/(root)`, then click **Save**.
7. Wait for GitHub Pages to publish the site. Open the URL shown in the Pages section.

No build step or server is required.

## Important limitations — please read

**This login is only a convenience screen, not real security.** The username and password are in the downloaded JavaScript and can be viewed by anyone who can access the site. It must not be used to protect sensitive passenger information.

**LocalStorage is local to one browser profile on one device.** Records do not synchronize across computers or staff members. If browser storage is cleared, the data can be lost. Use JSON backups frequently and store backups securely.

**GitHub Pages is static public hosting.** Even if you do not link the site publicly, anyone who has the URL may be able to access it. Do not place sensitive passenger data on a public deployment. For real operational use with private staff access, multiple users, and a shared database, use a backend with server-side authentication and access controls.

The app uses a Google Fonts stylesheet for typography; if the font host is unavailable, fallback fonts are used.
