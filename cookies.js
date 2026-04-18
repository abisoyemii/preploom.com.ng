(function () {
  const COOKIE_KEY = 'preploom_cookie_consent';

  // Load saved preferences
  function getConsent() {
    try { return JSON.parse(localStorage.getItem(COOKIE_KEY)); } catch { return null; }
  }

  function saveConsent(prefs) {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ ...prefs, timestamp: Date.now() }));
  }

  // Apply consent — enable/disable Google Analytics & Ads based on choice
  function applyConsent(prefs) {
    if (prefs.analytics) {
      window['ga-disable-G-XXXXXXXXXX'] = false;
    } else {
      window['ga-disable-G-XXXXXXXXXX'] = true;
    }

  }

  function removeBanner() {
    const banner = document.getElementById('cookie-banner');
    const modal = document.getElementById('cookie-modal');
    if (banner) banner.remove();
    if (modal) modal.remove();
  }

  function acceptAll() {
    const prefs = { essential: true, analytics: true, preferences: true };
    saveConsent(prefs);
    applyConsent(prefs);
    removeBanner();
  }

  function rejectAll() {
    const prefs = { essential: true, analytics: false, preferences: false };
    saveConsent(prefs);
    applyConsent(prefs);
    removeBanner();
  }

  function saveCustom() {
    const prefs = {
      essential: true,
      analytics: document.getElementById('cookie-analytics').checked,
      preferences: document.getElementById('cookie-preferences').checked,
    };
    saveConsent(prefs);
    applyConsent(prefs);
    removeBanner();
  }

  function openModal() {
    document.getElementById('cookie-modal').style.display = 'flex';
  }

  function closeModal() {
    document.getElementById('cookie-modal').style.display = 'none';
  }

  function createBanner() {
    // Banner HTML
    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.innerHTML = `
      <div id="cookie-banner-inner">
        <div id="cookie-banner-text">
          <strong>🍪 We use cookies</strong>
          <p>We use cookies to enhance your experience and analyse traffic. 
          See our <a href="privacy-policy.html" style="color:#93c5fd;">Privacy Policy</a> for details.</p>
        </div>
        <div id="cookie-banner-actions">
          <button id="cookie-manage-btn">Manage Preferences</button>
          <button id="cookie-reject-btn">Reject Non-Essential</button>
          <button id="cookie-accept-btn">Accept All</button>
        </div>
      </div>
    `;

    // Modal HTML
    const modal = document.createElement('div');
    modal.id = 'cookie-modal';
    modal.innerHTML = `
      <div id="cookie-modal-box">
        <h3>Cookie Preferences</h3>
        <p style="color:#64748b;font-size:0.9rem;margin-bottom:1.5rem;">
          Choose which cookies you allow. Essential cookies are always active.
        </p>
        <div class="cookie-option">
          <div>
            <strong>Essential Cookies</strong>
            <p>Required for the site to function. Cannot be disabled.</p>
          </div>
          <label class="cookie-toggle"><input type="checkbox" checked disabled><span class="cookie-slider"></span></label>
        </div>
        <div class="cookie-option">
          <div>
            <strong>Analytics Cookies</strong>
            <p>Help us understand how visitors use the site (Google Analytics).</p>
          </div>
          <label class="cookie-toggle"><input type="checkbox" id="cookie-analytics"><span class="cookie-slider"></span></label>
        </div>
        <div class="cookie-option">
          <div>
            <strong>Preference Cookies</strong>
            <p>Remember your settings like exam preferences.</p>
          </div>
          <label class="cookie-toggle"><input type="checkbox" id="cookie-preferences"><span class="cookie-slider"></span></label>
        </div>
        <div id="cookie-modal-actions">
          <button id="cookie-modal-cancel">Cancel</button>
          <button id="cookie-modal-save">Save My Preferences</button>
        </div>
      </div>
    `;

    // Styles
    const style = document.createElement('style');
    style.textContent = `
      #cookie-banner {
        position: fixed;
        bottom: 0; left: 0; right: 0;
        background: #0f172a;
        color: white;
        z-index: 99999;
        padding: 1rem 1.5rem;
        box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
        animation: slideUp 0.4s ease-out;
      }
      @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      #cookie-banner-inner {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 2rem;
        flex-wrap: wrap;
      }
      #cookie-banner-text { flex: 1; min-width: 250px; }
      #cookie-banner-text p { font-size: 0.85rem; color: #94a3b8; margin-top: 0.25rem; }
      #cookie-banner-actions {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        align-items: center;
      }
      #cookie-banner-actions button {
        padding: 0.6rem 1.2rem;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
        white-space: nowrap;
      }
      #cookie-accept-btn { background: #1d4ed8; color: white; }
      #cookie-accept-btn:hover { background: #1e40af; }
      #cookie-reject-btn { background: transparent; color: #94a3b8; border: 1px solid #334155 !important; }
      #cookie-reject-btn:hover { background: #1e293b; color: white; }
      #cookie-manage-btn { background: transparent; color: #93c5fd; text-decoration: underline; padding: 0.6rem 0.5rem; }

      #cookie-modal {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.6);
        z-index: 100000;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      #cookie-modal-box {
        background: white;
        border-radius: 16px;
        padding: 2rem;
        max-width: 520px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      }
      #cookie-modal-box h3 { font-size: 1.3rem; color: #0f172a; margin-bottom: 0.5rem; }
      .cookie-option {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 0;
        border-bottom: 1px solid #e5e7eb;
        gap: 1rem;
      }
      .cookie-option strong { font-size: 0.95rem; color: #111827; }
      .cookie-option p { font-size: 0.8rem; color: #64748b; margin-top: 0.2rem; }
      .cookie-toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
      .cookie-toggle input { opacity: 0; width: 0; height: 0; }
      .cookie-slider {
        position: absolute; inset: 0;
        background: #cbd5e1; border-radius: 24px; cursor: pointer;
        transition: 0.3s;
      }
      .cookie-slider::before {
        content: ''; position: absolute;
        width: 18px; height: 18px; left: 3px; bottom: 3px;
        background: white; border-radius: 50%; transition: 0.3s;
      }
      .cookie-toggle input:checked + .cookie-slider { background: #1d4ed8; }
      .cookie-toggle input:checked + .cookie-slider::before { transform: translateX(20px); }
      .cookie-toggle input:disabled + .cookie-slider { background: #1d4ed8; opacity: 0.6; cursor: not-allowed; }
      .cookie-toggle input:disabled + .cookie-slider::before { transform: translateX(20px); }
      #cookie-modal-actions {
        display: flex; gap: 1rem; margin-top: 1.5rem; justify-content: flex-end;
      }
      #cookie-modal-cancel {
        padding: 0.75rem 1.5rem; border-radius: 8px; border: 1px solid #e5e7eb;
        background: white; color: #64748b; font-weight: 600; cursor: pointer;
      }
      #cookie-modal-save {
        padding: 0.75rem 1.5rem; border-radius: 8px; border: none;
        background: #1d4ed8; color: white; font-weight: 600; cursor: pointer;
      }
      #cookie-modal-save:hover { background: #1e40af; }
      @media (max-width: 600px) {
        #cookie-banner-inner { flex-direction: column; align-items: flex-start; gap: 1rem; }
        #cookie-banner-actions { width: 100%; }
        #cookie-accept-btn, #cookie-reject-btn { flex: 1; text-align: center; }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(banner);
    document.body.appendChild(modal);

    document.getElementById('cookie-accept-btn').addEventListener('click', acceptAll);
    document.getElementById('cookie-reject-btn').addEventListener('click', rejectAll);
    document.getElementById('cookie-manage-btn').addEventListener('click', openModal);
    document.getElementById('cookie-modal-save').addEventListener('click', saveCustom);
    document.getElementById('cookie-modal-cancel').addEventListener('click', closeModal);
  }

  // Init
  const saved = getConsent();
  if (saved) {
    applyConsent(saved); // Re-apply saved preferences on every page load
  } else {
    // Show banner after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createBanner);
    } else {
      createBanner();
    }
  }
})();
