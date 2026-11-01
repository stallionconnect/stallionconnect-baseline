# Stallion Connect Pvt Ltd — Website

Company website for **Stallion Connect Pvt Ltd**: call centre, BPO, sales, customer support, recruitment and back-office services.

Live site: https://stallionconnect.github.io/stallionconnect-baseline/

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home |
| `about.html` | About Us |
| `services.html` | Services (all 7 service lines) |
| `industries.html` | Industries |
| `careers.html` | Careers and job application form |
| `contact.html` | Contact and enquiry form |

Styles live in `assets/css/styles.css`, scripts in `assets/js/main.js` and images in `assets/img/`. There is no build step: edit the files and push.

The layout is rem-based and scales with the viewport (designed at 1920px wide). Scrolling is the browser's own: Lenis smooth scrolling was removed because it made the pages lag. Photos are free Unsplash images linked from `images.unsplash.com`; swap them for the company's own photos when available.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 5500
```

then visit http://localhost:5500.

## Before launch

- **Forms** run in demo mode and send nothing. Set `FORM_ENDPOINT` in `assets/js/main.js` (for example a Formspree form URL) to receive enquiries and job applications by email.
- **Placeholders** are marked `TODO` in the HTML: office address, phone number, working hours, social media links, the "24×7" figure, careers perks and job openings.
- **Logo**: `assets/img/` holds the final logo with the tagline "Where every connection counts": colour and white full lockups (`logo.png`, `logo-white.png`), compact versions without the tagline for the header (`logo-compact*.png`), and the icon alone (`logo-mark*.png`).
