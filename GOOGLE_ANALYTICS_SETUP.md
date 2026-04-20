# Google Analytics Setup Guide for PrepLoom

## Current Status
❌ **NO Google Analytics tracking code is currently installed**

The site has cookie consent infrastructure ready, but no actual GA tracking.

## Setup Instructions

### Step 1: Get Your Google Analytics Measurement ID

1. Go to https://analytics.google.com
2. Sign in with your Google account
3. Click "Admin" (gear icon, bottom left)
4. Under "Property" column, click "Create Property"
5. Enter:
   - Property name: PrepLoom
   - Reporting time zone: Your timezone
   - Currency: Your currency
6. Click "Next" → Choose "Web" → Enter URL: https://preploom.com.ng
7. Copy your **Measurement ID** (format: `G-XXXXXXXXXX`)

### Step 2: Add Tracking Code to All HTML Files

Add this code to the `<head>` section of **EVERY HTML file**, right after the opening `<head>` tag:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX', {
    'anonymize_ip': true,
    'cookie_flags': 'SameSite=None;Secure'
  });
</script>
```

**Replace `G-XXXXXXXXXX` with your actual Measurement ID!**

### Step 3: Update cookies.js

Replace line 15-16 in `cookies.js`:

**OLD:**
```javascript
window['ga-disable-G-XXXXXXXXXX'] = false;
```

**NEW:**
```javascript
window['ga-disable-G-YOUR_ACTUAL_ID'] = false;
```

And line 18:
```javascript
window['ga-disable-G-YOUR_ACTUAL_ID'] = true;
```

### Step 4: Files That Need GA Code

Add the tracking code to these files:
- ✅ index.html
- ✅ about.html
- ✅ admin.html
- ✅ blog.html
- ✅ cambridge.html
- ✅ cisco.html
- ✅ contact.html
- ✅ dashboard.html
- ✅ duolingo.html
- ✅ gmat.html
- ✅ google.html
- ✅ ielts.html
- ✅ language-exams.html
- ✅ login.html
- ✅ my-exams.html
- ✅ pmp.html
- ✅ privacy-policy.html
- ✅ professional-exams.html
- ✅ progress.html
- ✅ resources.html
- ✅ testimonials.html
- ✅ toefl.html

### Step 5: Verify Installation

After deployment:

1. Visit your site: https://preploom.com.ng
2. Open browser DevTools (F12)
3. Go to "Network" tab
4. Filter by "gtag"
5. You should see requests to `google-analytics.com`

OR use Google Tag Assistant Chrome extension:
https://chrome.google.com/webstore/detail/tag-assistant-legacy-by-g/kejbdjndbnbjgmefkgdddjlbokphdefk

### Step 6: Check Real-Time Reports

1. Go to Google Analytics
2. Click "Reports" → "Realtime"
3. Visit your site in another tab
4. You should see yourself as an active user

## Privacy Compliance

✅ Your setup is GDPR-compliant because:
- Cookie consent banner asks permission before tracking
- IP anonymization enabled (`anonymize_ip: true`)
- Users can reject analytics cookies
- Privacy policy explains data collection

## What Gets Tracked

With GA installed, you'll see:
- Page views
- User sessions
- Traffic sources (Google, direct, social)
- Geographic location (country/city)
- Device types (mobile, desktop, tablet)
- Popular pages
- User flow through site
- Conversion events (if configured)

## Advanced: Custom Events (Optional)

Track specific actions like:

```javascript
// Track button clicks
gtag('event', 'click', {
  'event_category': 'CTA',
  'event_label': 'Start Practice Test'
});

// Track form submissions
gtag('event', 'generate_lead', {
  'event_category': 'Contact',
  'event_label': 'Contact Form'
});

// Track enrollments
gtag('event', 'sign_up', {
  'method': 'Email',
  'exam_type': 'TOEFL'
});
```

## Troubleshooting

**Not seeing data?**
- Wait 24-48 hours for initial data
- Check Measurement ID is correct
- Verify script loads (Network tab)
- Disable ad blockers when testing
- Check cookie consent was accepted

**Data looks wrong?**
- Exclude your own IP in GA settings
- Enable "Bot Filtering" in GA
- Check timezone settings match

## Alternative: Google Tag Manager (Recommended)

For easier management, consider using Google Tag Manager instead:

1. Create GTM account: https://tagmanager.google.com
2. Get GTM container code (GTM-XXXXXXX)
3. Add GTM code to all pages (simpler than GA)
4. Configure GA through GTM dashboard (no code changes needed)

Benefits:
- Add/remove tracking without editing code
- Easier to manage multiple tracking tools
- Better for non-technical team members

## Support

- GA Help: https://support.google.com/analytics
- GTM Help: https://support.google.com/tagmanager
- GDPR Compliance: https://support.google.com/analytics/answer/9019185
