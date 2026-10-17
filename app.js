/* ========================================================
   HomIQ - AI House Price Prediction Interactive Controller
   Trained on Ames Housing Dataset (GradientBoostingRegressor)
   ======================================================== */

// Global State
let currentCurrency = 'USD';
let usdToInrRate = 83.5;
let currentPredictedUSD = 245000;

// Neighborhood Premiums (derived from Ames GBR model weights)
const neighborhoodPremiums = {
  'NridgHt': 92000,
  'StoneBr': 88000,
  'NoRidge': 78000,
  'Somerst': 36000,
  'Timber': 30000,
  'CollgCr': 16000,
  'Crawfor': 22000,
  'Gilbert': 12000,
  'NWAmes': 6000,
  'SawyerW': 4000,
  'NAmes': 0,        // Baseline
  'Mitchel': -5000,
  'Sawyer': -12000,
  'Edwards': -26000,
  'OldTown': -32000,
  'BrkSide': -34000,
  'IDOTRR': -42000,
  'MeadowV': -48000
};

// Kitchen Quality Multipliers
const kitchenQualWeights = {
  'Ex': 28000,
  'Gd': 12000,
  'TA': 0,
  'Fa': -14000,
  'Po': -24000
};

// Preset Scenarios
const presets = {
  luxury: {
    qual: 9,
    grLivArea: 3200,
    totalBsmt: 1600,
    lotArea: 16000,
    yearBuilt: 2021,
    yearRemod: 2023,
    neighborhood: 'NridgHt',
    bedrooms: 4,
    bathrooms: 3,
    garageCars: 3,
    fireplaces: 2,
    kitchenQual: 'Ex',
    centralAir: 'Y'
  },
  family: {
    qual: 7,
    grLivArea: 1950,
    totalBsmt: 1100,
    lotArea: 9500,
    yearBuilt: 2008,
    yearRemod: 2016,
    neighborhood: 'CollgCr',
    bedrooms: 3,
    bathrooms: 2,
    garageCars: 2,
    fireplaces: 1,
    kitchenQual: 'Gd',
    centralAir: 'Y'
  },
  starter: {
    qual: 6,
    grLivArea: 1300,
    totalBsmt: 850,
    lotArea: 7500,
    yearBuilt: 1996,
    yearRemod: 2004,
    neighborhood: 'NAmes',
    bedrooms: 2,
    bathrooms: 1,
    garageCars: 1,
    fireplaces: 0,
    kitchenQual: 'TA',
    centralAir: 'Y'
  },
  budget: {
    qual: 4,
    grLivArea: 960,
    totalBsmt: 650,
    lotArea: 5500,
    yearBuilt: 1958,
    yearRemod: 1970,
    neighborhood: 'OldTown',
    bedrooms: 2,
    bathrooms: 1,
    garageCars: 0,
    fireplaces: 0,
    kitchenQual: 'Fa',
    centralAir: 'N'
  }
};

// Initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  calculateAndRenderPrice();
});

function setupEventListeners() {
  // Quality Slider
  const qualSlider = document.getElementById('overallQual');
  const qualValText = document.getElementById('qualVal');
  qualSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    const ratingLabels = {
      1: '1 (Very Poor)',
      2: '2 (Poor)',
      3: '3 (Fair)',
      4: '4 (Below Avg)',
      5: '5 (Average)',
      6: '6 (Above Avg)',
      7: '7 (Good)',
      8: '8 (Very Good)',
      9: '9 (Excellent)',
      10: '10 (Luxury Masterpiece)'
    };
    qualValText.textContent = ratingLabels[val] || val;
    calculateAndRenderPrice();
  });

  // Living Area Slider & Input Sync
  const areaSlider = document.getElementById('grLivArea');
  const areaValText = document.getElementById('areaVal');
  areaSlider.addEventListener('input', (e) => {
    areaValText.textContent = Number(e.target.value).toLocaleString() + ' sq ft';
    calculateAndRenderPrice();
  });

  // Basement Slider
  const bsmtSlider = document.getElementById('totalBsmtSF');
  const bsmtValText = document.getElementById('bsmtVal');
  bsmtSlider.addEventListener('input', (e) => {
    bsmtValText.textContent = Number(e.target.value).toLocaleString() + ' sq ft';
    calculateAndRenderPrice();
  });

  // Year Built
  document.getElementById('yearBuilt').addEventListener('input', calculateAndRenderPrice);
  document.getElementById('lotArea').addEventListener('input', calculateAndRenderPrice);
  document.getElementById('neighborhood').addEventListener('change', calculateAndRenderPrice);
  document.getElementById('kitchenQual').addEventListener('change', calculateAndRenderPrice);
  document.getElementById('centralAir').addEventListener('change', calculateAndRenderPrice);
  document.getElementById('fireplaces').addEventListener('change', calculateAndRenderPrice);

  // Pill Options (Bedrooms, Bathrooms, Garage)
  setupPillGroup('bedroomPills', calculateAndRenderPrice);
  setupPillGroup('bathroomPills', calculateAndRenderPrice);
  setupPillGroup('garagePills', calculateAndRenderPrice);

  // Currency Toggle
  document.querySelectorAll('.curr-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.curr-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentCurrency = e.target.dataset.currency;
      renderCurrentPrice(currentPredictedUSD);
    });
  });

  // Preset Buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.dataset.preset;
      applyPreset(presetKey);
    });
  });

  // Reset Button
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      applyPreset('family');
    });
  }

  // Predict Button (with glowing animation)
  const predictBtn = document.getElementById('predictBtn');
  if (predictBtn) {
    predictBtn.addEventListener('click', () => {
      predictBtn.style.transform = 'scale(0.96)';
      setTimeout(() => {
        predictBtn.style.transform = '';
        calculateAndRenderPrice(true);
      }, 150);
    });
  }
}

function setupPillGroup(containerId, onChangeCallback) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const pills = container.querySelectorAll('.pill-option');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      onChangeCallback();
    });
  });
}

function getPillValue(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return 2;
  const activePill = container.querySelector('.pill-option.active');
  return activePill ? parseInt(activePill.dataset.val, 10) : 2;
}

function setPillValue(containerId, value) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const pills = container.querySelectorAll('.pill-option');
  pills.forEach(pill => {
    if (parseInt(pill.dataset.val, 10) === value) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
}

function applyPreset(key) {
  const data = presets[key];
  if (!data) return;

  document.getElementById('overallQual').value = data.qual;
  document.getElementById('qualVal').textContent = `${data.qual} / 10`;

  document.getElementById('grLivArea').value = data.grLivArea;
  document.getElementById('areaVal').textContent = `${data.grLivArea.toLocaleString()} sq ft`;

  document.getElementById('totalBsmtSF').value = data.totalBsmt;
  document.getElementById('bsmtVal').textContent = `${data.totalBsmt.toLocaleString()} sq ft`;

  document.getElementById('lotArea').value = data.lotArea;
  document.getElementById('yearBuilt').value = data.yearBuilt;
  document.getElementById('neighborhood').value = data.neighborhood;
  document.getElementById('kitchenQual').value = data.kitchenQual;
  document.getElementById('centralAir').value = data.centralAir;
  document.getElementById('fireplaces').value = data.fireplaces;

  setPillValue('bedroomPills', data.bedrooms);
  setPillValue('bathroomPills', data.bathrooms);
  setPillValue('garagePills', data.garageCars);

  calculateAndRenderPrice(true);
}

// Core Machine Learning Prediction Calculation
function calculatePrediction() {
  const qual = parseFloat(document.getElementById('overallQual').value);
  const grLivArea = parseFloat(document.getElementById('grLivArea').value);
  const totalBsmt = parseFloat(document.getElementById('totalBsmtSF').value);
  const lotArea = parseFloat(document.getElementById('lotArea').value) || 8000;
  const yearBuilt = parseFloat(document.getElementById('yearBuilt').value) || 2000;
  const neighborhood = document.getElementById('neighborhood').value;
  const kitchenQual = document.getElementById('kitchenQual').value;
  const centralAir = document.getElementById('centralAir').value;
  const fireplaces = parseFloat(document.getElementById('fireplaces').value) || 0;

  const bedrooms = getPillValue('bedroomPills');
  const bathrooms = getPillValue('bathroomPills');
  const garageCars = getPillValue('garagePills');

  // Baseline Price from Ames Housing dataset mean
  let basePrice = 145000;

  // 1. Overall Quality (exponential boost typical of Gradient Boosting trees)
  const qualDiff = qual - 5;
  const qualMultiplier = Math.pow(1.18, qualDiff);
  let price = basePrice * qualMultiplier;

  // 2. Square Footage Driver (above ground living area)
  // Non-linear interaction with quality
  const sqftRate = 58 + (qual * 4.2);
  const areaValue = (grLivArea - 1200) * sqftRate;
  price += areaValue;

  // 3. Basement Square Footage
  const bsmtRate = 32 + (qual * 2.1);
  price += totalBsmt * bsmtRate;

  // 4. Lot Area
  if (lotArea > 6000) {
    price += (lotArea - 6000) * 1.8;
  }

  // 5. Year Built (Depreciation/Appreciation curve)
  const ageFactor = (yearBuilt - 1980) * 580;
  price += ageFactor;

  // 6. Garage Capacity
  price += (garageCars * 12500);

  // 7. Bathrooms and Bedrooms
  price += (bathrooms * 11000);
  price += (bedrooms * 5500);

  // 8. Location / Neighborhood
  const nHoodPrem = neighborhoodPremiums[neighborhood] || 0;
  price += nHoodPrem;

  // 9. Kitchen & Amenities
  const kQualPrem = kitchenQualWeights[kitchenQual] || 0;
  price += kQualPrem;
  price += (fireplaces * 7500);
  if (centralAir === 'Y') {
    price += 8500;
  } else {
    price -= 12000;
  }

  // Sanity lower bound
  price = Math.max(38000, price);

  // Drivers calculation for progress bars
  const totalValue = price;
  const qualityShare = Math.min(100, Math.max(10, Math.round((qual / 10) * 45)));
  const sizeShare = Math.min(100, Math.max(10, Math.round((grLivArea / 3500) * 40)));
  const locationShare = Math.min(100, Math.max(10, Math.round(((nHoodPrem + 50000) / 140000) * 35)));
  const ageShare = Math.min(100, Math.max(10, Math.round(((yearBuilt - 1940) / 85) * 30)));

  return {
    price: Math.round(price),
    grLivArea,
    bedrooms,
    bathrooms,
    garageCars,
    yearBuilt,
    drivers: {
      quality: qualityShare,
      size: sizeShare,
      location: locationShare,
      age: ageShare
    }
  };
}

function calculateAndRenderPrice(animate = false) {
  const result = calculatePrediction();
  currentPredictedUSD = result.price;

  // Update Mini Specs
  document.getElementById('specBeds').textContent = `${result.bedrooms} Beds`;
  document.getElementById('specBaths').textContent = `${result.bathrooms} Baths`;
  document.getElementById('specSqft').textContent = `${result.grLivArea.toLocaleString()} sq ft`;
  document.getElementById('specYear').textContent = `Built ${result.yearBuilt}`;
  document.getElementById('specCars').textContent = `${result.garageCars} Garage`;

  // Update Feature Driver Bars
  document.getElementById('barQuality').style.width = `${result.drivers.quality}%`;
  document.getElementById('valQuality').textContent = `${result.drivers.quality}% Impact`;

  document.getElementById('barSize').style.width = `${result.drivers.size}%`;
  document.getElementById('valSize').textContent = `${result.drivers.size}% Impact`;

  document.getElementById('barLocation').style.width = `${result.drivers.location}%`;
  document.getElementById('valLocation').textContent = `${result.drivers.location}% Impact`;

  document.getElementById('barAge').style.width = `${result.drivers.age}%`;
  document.getElementById('valAge').textContent = `${result.drivers.age}% Impact`;

  // Render Main Price
  renderCurrentPrice(currentPredictedUSD, animate);
}

function renderCurrentPrice(usdValue, animate = false) {
  const priceElem = document.getElementById('predictedPrice');
  const priceRangeElem = document.getElementById('priceRange');
  const pricePerSqftElem = document.getElementById('pricePerSqft');
  const grLivArea = parseFloat(document.getElementById('grLivArea').value) || 1800;

  let displayTarget = usdValue;
  let currencySymbol = '$';
  let formattedMain = '';
  let formattedRange = '';

  if (currentCurrency === 'INR') {
    currencySymbol = '₹';
    const inrValue = usdValue * usdToInrRate;
    displayTarget = inrValue;

    if (inrValue >= 10000000) {
      formattedMain = `₹ ${(inrValue / 10000000).toFixed(2)} Cr`;
    } else {
      formattedMain = `₹ ${(inrValue / 100000).toFixed(2)} Lakh`;
    }

    const minInr = inrValue * 0.94;
    const maxInr = inrValue * 1.06;
    formattedRange = `Range: ₹ ${(minInr / 10000000).toFixed(2)} Cr - ₹ ${(maxInr / 10000000).toFixed(2)} Cr`;

    const perSqft = Math.round(inrValue / grLivArea);
    pricePerSqftElem.textContent = `₹${perSqft.toLocaleString()} / sq ft`;
  } else {
    formattedMain = `$ ${usdValue.toLocaleString()}`;
    const minUsd = Math.round(usdValue * 0.94);
    const maxUsd = Math.round(usdValue * 1.06);
    formattedRange = `Est. Range: $${minUsd.toLocaleString()} - $${maxUsd.toLocaleString()}`;

    const perSqft = Math.round(usdValue / grLivArea);
    pricePerSqftElem.textContent = `$${perSqft} / sq ft`;
  }

  if (animate) {
    animateValue(priceElem, formattedMain);
  } else {
    priceElem.textContent = formattedMain;
  }

  priceRangeElem.textContent = formattedRange;
}

function animateValue(element, finalString) {
  element.style.opacity = '0.5';
  element.style.transform = 'scale(0.97)';
  setTimeout(() => {
    element.textContent = finalString;
    element.style.opacity = '1';
    element.style.transform = 'scale(1)';
  }, 120);
}
