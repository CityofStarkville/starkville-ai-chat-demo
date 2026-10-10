/* Reproduces the workbook with decimal demand; no whole-space rounding. */
(function () {
  'use strict';
  const rows = window.ParkingRates;
  const periods = ['Monday–Friday, 8 AM–6 PM', 'Monday–Friday, 6 PM–12 AM', 'Monday–Friday, 12 AM–8 AM', 'Saturday & Sunday, 8 AM–6 PM', 'Saturday & Sunday, 6 PM–12 AM', 'Saturday & Sunday, 12 AM–8 AM'];
  function parseSpaces(value) {
    const text = String(value).trim();
    if (!text) return 0;
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error('Use a nonnegative number with up to two decimal places.');
    const number = Number(text);
    if (number > 1000000) throw new Error('Enter no more than 1,000,000 spaces per use.');
    return Math.round(number * 100);
  }
  function calculate(values) {
    if (values.length !== rows.length) throw new Error('Enter one value for each use.');
    const units = values.map(parseSpaces);
    // Integer hundredths × integer percentages avoids floating-point artifacts.
    const demandUnits = units.map((value, i) => rows[i].rates.map(rate => value * rate));
    const totals = periods.map((_, p) => demandUnits.reduce((sum, demand) => sum + demand[p], 0));
    const base = units.reduce((sum, value) => sum + value, 0) * 100;
    const peak = Math.max(...totals);
    return {base:base / 10000, peak:peak / 10000, reduction:(base - peak) / 10000,
      percent:base ? (base - peak) / base * 100 : null,
      demands:demandUnits.map(demand => demand.map(value => value / 10000)),
      totals:totals.map(value => value / 10000), peakPeriods:totals.map((value, p) => value === peak ? p : -1).filter(p => p >= 0)};
  }
  window.ParkingCalculator = Object.freeze({calculate, periods:Object.freeze(periods)});
  const byId = id => document.getElementById(id);
  const format = value => value.toLocaleString('en-US', {maximumFractionDigits:4});
  const inputs = [];
  rows.forEach((row, i) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th'); th.scope = 'row'; th.textContent = row.name; tr.append(th);
    const inputCell = document.createElement('td'); inputCell.className = 'parking-input-cell';
    const input = document.createElement('input');
    input.id = 'spaces-' + i; input.type = 'text'; input.inputMode = 'decimal'; input.placeholder = '0'; input.maxLength = 12;
    input.setAttribute('aria-label', row.name + ': required parking spaces'); input.setAttribute('aria-describedby', 'parking-help parking-error');
    inputCell.append(input); tr.append(inputCell); inputs.push(input);
    row.rates.forEach((rate, p) => {
      const rateCell = document.createElement('td'); rateCell.className = 'parking-rate'; rateCell.textContent = rate + '%';
      const demand = document.createElement('td'); demand.id = 'demand-' + i + '-' + p; demand.textContent = '0';
      tr.append(rateCell, demand);
    });
    byId('parking-rows').append(tr);
    input.addEventListener('input', update);
  });
  function update() {
    let valid = true;
    inputs.forEach(input => {
      try { parseSpaces(input.value); input.removeAttribute('aria-invalid'); }
      catch { input.setAttribute('aria-invalid', 'true'); valid = false; }
    });
    byId('parking-error').hidden = valid;
    byId('print-calculation').disabled = !valid;
    if (!valid) {
      byId('parking-error').textContent = 'Correct the marked inputs: enter 0–1,000,000 spaces with up to two decimal places.';
      for (const id of ['base-total','peak-total','reduction-total','table-base']) byId(id).textContent = '—';
      byId('reduction-percent').textContent = 'Calculation unavailable until inputs are corrected';
      byId('peak-period').textContent = 'Correct the marked inputs to calculate peak demand.';
      rows.forEach((_, i) => periods.forEach((_, p) => { byId('demand-' + i + '-' + p).textContent = '—'; }));
      periods.forEach((_, p) => { byId('period-' + p).textContent = '—'; byId('period-' + p).classList.remove('parking-peak-cell'); });
      return;
    }
    const result = calculate(inputs.map(input => input.value));
    byId('base-total').textContent = byId('table-base').textContent = format(result.base);
    byId('peak-total').textContent = format(result.peak);
    byId('reduction-total').textContent = format(result.reduction);
    byId('reduction-percent').textContent = result.percent === null ? 'spaces · percentage unavailable until inputs are entered' : 'spaces · ' + result.percent.toFixed(2) + '% reduction';
    byId('peak-period').textContent = result.base ? 'Peak period' + (result.peakPeriods.length > 1 ? 's' : '') + ': ' + result.peakPeriods.map(p => periods[p]).join('; ') : 'Enter required parking to identify the peak time period.';
    result.demands.forEach((demand, i) => demand.forEach((value, p) => { byId('demand-' + i + '-' + p).textContent = format(value); }));
    result.totals.forEach((value, p) => {
      byId('period-' + p).textContent = format(value);
      byId('period-' + p).classList.toggle('parking-peak-cell', result.base > 0 && result.peakPeriods.includes(p));
    });
  }
  byId('reset-calculation').addEventListener('click', () => {
    inputs.forEach(input => { input.value = ''; }); byId('project-name').value = ''; update(); inputs[0].focus();
  });
  byId('print-calculation').addEventListener('click', () => { if (showAccessState()) window.print(); });
  const auth = window.StarkvilleAuth;
  function showAccessState() {
    const session = auth.getSession();
    byId('login-gate').hidden = Boolean(session); byId('workspace').hidden = !session;
    byId('workspace-nav').hidden = !session; byId('workspace-signout').hidden = !session;
    return session;
  }
  byId('workspace-login').addEventListener('click', async () => {
    try { await auth.startLogin('parking.html'); }
    catch (error) { byId('workspace-login-error').hidden = false; byId('workspace-login-error').textContent = error.message || 'Unable to start sign-in.'; }
  });
  byId('workspace-signout').addEventListener('click', () => auth.signOut());
  window.addEventListener('pageshow', showAccessState);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) showAccessState(); });
  update(); showAccessState();
})();
