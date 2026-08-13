// Get elements
const monthlyTab = document.getElementById('monthly-tab');
const oneTimeTab = document.getElementById('one-time-tab');
const monthlyContent = document.getElementById('monthly-content');
const oneTimeContent = document.getElementById('one-time-content');
const tierButtons = document.querySelectorAll('.tier-btn');
const monthlyDonateBtn = document.getElementById('monthly-donate-btn');
const oneTimeDonateBtn = document.getElementById('one-time-donate-btn');
const oneTimeAmountInput = document.getElementById('one-time-amount');

// Set default selected amount
let selectedAmount = '25';

// Tab switching
[monthlyTab, oneTimeTab].forEach((tab, index) => {
  tab.addEventListener('click', () => {
    [monthlyTab, oneTimeTab].forEach((t, i) => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    [monthlyContent, oneTimeContent].forEach((content, i) => {
      content.hidden = i !== index;
    });
  });
});

// Tier selection (monthly)
tierButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    tierButtons.forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedAmount = btn.getAttribute('data-amount');
  });
});

// Donation buttons
const businessEmail = 'donate@louisvillemakesgames.org';
const currency = 'USD';

monthlyDonateBtn.addEventListener('click', () => {
  const itemName = 'Monthly Donation';
  const url = new URL('https://www.paypal.com/cgi-bin/webscr');
  url.searchParams.set('cmd', '_xclick-subscriptions');
  url.searchParams.set('business', businessEmail);
  url.searchParams.set('item_name', itemName);
  url.searchParams.set('currency_code', currency);
  url.searchParams.set('a3', selectedAmount);
  url.searchParams.set('p3', '1');
  url.searchParams.set('t3', 'M');
  url.searchParams.set('src', '1');
  url.searchParams.set('sra', '1');
  window.open(url.toString(), '_blank');
});

oneTimeDonateBtn.addEventListener('click', () => {
  const itemName = 'One-Time Donation';
  const amount = oneTimeAmountInput.value || '25';
  const url = new URL('https://www.paypal.com/cgi-bin/webscr');
  url.searchParams.set('cmd', '_donations');
  url.searchParams.set('business', businessEmail);
  url.searchParams.set('item_name', itemName);
  url.searchParams.set('currency_code', currency);
  url.searchParams.set('amount', amount);
  window.open(url.toString(), '_blank');
});
