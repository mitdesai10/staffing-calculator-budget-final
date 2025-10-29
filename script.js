// ========================================
// Global State
// ========================================

let annualBudget = 0;
let targetMarginMin = 0.55;
let targetMarginMax = 0.60;
let maxPositions = 0;
let positions = [];
let positionIdCounter = 0;
let appliedDiscount = 0; // Percentage
let originalPositionsData = []; // Store original values before discount

const MIN_MARGIN = 0.10; // 10%
const MAX_MARGIN = 0.65; // 65% - default, overridden by location

// Location-specific margin caps
const MARGIN_CAPS = {
    onshore: 0.60,   // 60% max
    offshore: 0.95,  // 95% max
    nearshore: 0.40  // 40% max
};

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing...');
    setTimeout(initializeApp, 500);
});

function onDataLoaded() {
    console.log('✅ Data loaded');
    populateRoles();
}

function initializeApp() {
    populateRoles();
    setupEventListeners();
    console.log('✅ Ready!');
}

function populateRoles() {
    const roleSelect = document.getElementById('role');
    if (!roleSelect) return;
    
    while (roleSelect.options.length > 1) {
        roleSelect.remove(1);
    }
    
    if (rateCardData && rateCardData.length > 0) {
        rateCardData.forEach(role => {
            const option = document.createElement('option');
            option.value = role.role;
            option.textContent = role.role;
            roleSelect.appendChild(option);
        });
        console.log(`✅ ${rateCardData.length} roles loaded`);
    }
}

// ========================================
// Event Listeners
// ========================================

function setupEventListeners() {
    const setBudgetBtn = document.getElementById('setBudgetBtn');
    if (setBudgetBtn) {
        setBudgetBtn.addEventListener('click', handleSetBudget);
    }
    
    const changeBudgetBtn = document.getElementById('changeBudgetBtn');
    if (changeBudgetBtn) {
        changeBudgetBtn.addEventListener('click', handleChangeBudget);
    }
    
    const form = document.getElementById('positionForm');
    if (form) {
        form.addEventListener('submit', handleAddPosition);
    }
    
    const recalculateBtn = document.getElementById('recalculateBtn');
    if (recalculateBtn) {
        recalculateBtn.addEventListener('click', () => {
            calculateRatesAndMargins();
            updateDisplay();
        });
    }
    
    const clearBtn = document.getElementById('clearAllBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClearAll);
    }
    
    // Preview
    const roleSelect = document.getElementById('role');
    const hoursInput = document.getElementById('hours');
    const locationRadios = document.querySelectorAll('input[name="location"]');
    
    if (roleSelect) roleSelect.addEventListener('change', updatePreview);
    if (hoursInput) hoursInput.addEventListener('input', updatePreview);
    locationRadios.forEach(r => r.addEventListener('change', updatePreview));
    
    // Discount
    const discountInput = document.getElementById('discountPercent');
    const applyDiscountBtn = document.getElementById('applyDiscountBtn');
    const removeDiscountBtn = document.getElementById('removeDiscountBtn');
    
    if (discountInput) {
        discountInput.addEventListener('input', updateDiscountPreview);
    }
    
    if (applyDiscountBtn) {
        applyDiscountBtn.addEventListener('click', handleApplyDiscount);
    }
    
    if (removeDiscountBtn) {
        removeDiscountBtn.addEventListener('click', handleRemoveDiscount);
    }
}

// ========================================
// Set Budget
// ========================================

function handleSetBudget() {
    const budgetInput = document.getElementById('totalBudget');
    const targetMinInput = document.getElementById('targetMarginMin');
    const targetMaxInput = document.getElementById('targetMarginMax');
    const positionCountInput = document.getElementById('positionCount');
    
    const budget = parseFloat(budgetInput.value);
    const targetMin = parseFloat(targetMinInput.value) / 100;
    const targetMax = parseFloat(targetMaxInput.value) / 100;
    const count = parseInt(positionCountInput.value);
    
    if (!budget || budget <= 0) {
        alert('❌ Please enter a valid annual budget');
        return;
    }
    
    if (!count || count < 1 || count > 50) {
        alert('❌ Please enter number of positions (1-50)');
        return;
    }
    
    if (!targetMin || !targetMax) {
        alert('❌ Please enter both minimum and maximum margin');
        return;
    }
    
    if (targetMin < 0.10 || targetMax > 0.95) {
        alert('❌ Margin range must be between 10% and 95%');
        return;
    }
    
    if (targetMin >= targetMax) {
        alert('❌ Minimum margin must be less than maximum margin');
        return;
    }
    
    annualBudget = budget;
    targetMarginMin = targetMin;
    targetMarginMax = targetMax;
    maxPositions = count;
    
    console.log('💰 Annual Budget:', formatCurrency(annualBudget));
    console.log('🎯 Target Margin Range:', (targetMarginMin * 100).toFixed(0) + '% - ' + (targetMarginMax * 100).toFixed(0) + '%');
    console.log('📊 Max Positions:', maxPositions);
    
    document.getElementById('budgetEntrySection').style.display = 'none';
    document.getElementById('calculatorLayout').style.display = 'grid';
    
    document.getElementById('budgetAmount').textContent = formatCurrency(annualBudget);
    document.getElementById('budgetMonthly').textContent = formatCurrency(annualBudget / 12);
    document.getElementById('positionCounter').textContent = `0 / ${maxPositions}`;
    document.getElementById('targetDisplay').textContent = (targetMarginMin * 100).toFixed(0) + '%-' + (targetMarginMax * 100).toFixed(0) + '%';
}

// ========================================
// Change Budget
// ========================================

function handleChangeBudget() {
    if (positions.length > 0) {
        if (!confirm('⚠️ This will clear all positions. Continue?')) {
            return;
        }
        positions = [];
    }
    
    document.getElementById('budgetEntrySection').style.display = 'block';
    document.getElementById('calculatorLayout').style.display = 'none';
}

// ========================================
// Add Position
// ========================================

function handleAddPosition(e) {
    e.preventDefault();
    
    // Check if reached max positions
    if (positions.length >= maxPositions) {
        alert(`✅ You've reached the maximum of ${maxPositions} positions!\n\nAll positions added. Check your results below.`);
        return;
    }
    
    const roleSelect = document.getElementById('role');
    const hoursInput = document.getElementById('hours');
    const selectedLocation = document.querySelector('input[name="location"]:checked');
    
    if (!roleSelect.value || !hoursInput.value || !selectedLocation) {
        alert('❌ Please fill all fields');
        return;
    }
    
    const role = roleSelect.value;
    const hours = parseFloat(hoursInput.value);
    const location = selectedLocation.value;
    
    const roleData = rateCardData.find(r => r.role === role);
    if (!roleData) {
        alert('❌ Role not found');
        return;
    }
    
    const costPerHour = roleData[location].cost;
    const monthlyCost = hours * costPerHour;
    
    const position = {
        id: ++positionIdCounter,
        role,
        hours,
        location,
        costPerHour,
        monthlyCost,
        margin: 0,
        clientRate: 0,
        monthlyRevenue: 0,
        monthlyProfit: 0
    };
    
    positions.push(position);
    console.log(`➕ Position ${positions.length}/${maxPositions} added:`, position);
    
    // Update position counter
    document.getElementById('positionCounter').textContent = `${positions.length} / ${maxPositions}`;
    
    // ONLY CALCULATE WHEN ALL POSITIONS ARE ADDED!
    if (positions.length >= maxPositions) {
        console.log('🎯 All positions added! Now calculating rates to use FULL budget...');
        calculateRatesAndMargins();
        alert(`🎉 All ${maxPositions} positions added!\n\nRates calculated to use your FULL budget of ${formatCurrency(annualBudget)}`);
        
        // Disable form
        document.getElementById('role').disabled = true;
        document.getElementById('hours').disabled = true;
        document.querySelectorAll('input[name="location"]').forEach(r => r.disabled = true);
        document.querySelector('#positionForm button[type="submit"]').disabled = true;
        document.querySelector('#positionForm button[type="submit"]').textContent = '✅ All Positions Added';
    } else {
        // Just show placeholder values until all positions added
        positions.forEach(pos => {
            pos.clientRate = 0;
            pos.monthlyRevenue = 0;
            pos.monthlyProfit = 0;
            pos.margin = 0;
        });
        console.log(`⏳ Waiting for ${maxPositions - positions.length} more position(s)...`);
    }
    
    // Update display
    updateDisplay();
    
    // Reset form
    roleSelect.value = '';
    hoursInput.value = '';
    document.querySelectorAll('input[name="location"]').forEach(r => r.checked = false);
    document.getElementById('previewBox').style.display = 'none';
    
    // Show UI elements
    document.getElementById('placeholder').style.display = 'none';
    document.getElementById('positionsContainer').style.display = 'block';
    document.getElementById('clearAllBtn').style.display = 'block';
    
    // Only show recalculate button and discount section after all positions added
    if (positions.length >= maxPositions) {
        document.getElementById('recalculateBtn').style.display = 'block';
        document.getElementById('discountSection').style.display = 'block';
        
        // Store original values for discount calculation
        saveOriginalPositionsData();
    }
}

// ========================================
// Calculate Rates & Margins
// STRATEGY: Use FULL budget, keep average margin in target range
// ========================================

// ========================================
// Calculate Rates & Margins
// Strategy: Use FULL budget + vary individual margins to hit 55-60% average
// ========================================

function calculateRatesAndMargins() {
    if (positions.length === 0) return;
    
    const totalMonthlyCost = positions.reduce((sum, p) => sum + p.monthlyCost, 0);
    const monthlyBudget = annualBudget / 12;
    
    console.log('💰 Monthly Budget:', formatCurrency(monthlyBudget));
    console.log('💵 Monthly Cost:', formatCurrency(totalMonthlyCost));
    console.log('🎯 Target Avg Margin:', (targetMarginMin*100) + '%-' + (targetMarginMax*100) + '%');
    
    // STEP 1: Use FULL budget as target revenue
    const targetMonthlyRevenue = monthlyBudget;
    
    // STEP 2: What average margin does this give?
    const impliedAvgMargin = (targetMonthlyRevenue - totalMonthlyCost) / targetMonthlyRevenue;
    console.log('📊 Full budget implies:', (impliedAvgMargin * 100).toFixed(1) + '% avg margin');
    
    // STEP 3: Determine strategy based on implied margin
    let targetAvgMargin;
    let strategy;
    
    if (impliedAvgMargin < targetMarginMin) {
        // Budget too tight - use what we can get
        targetAvgMargin = impliedAvgMargin;
        strategy = 'use_full_budget_below_target';
        console.warn('⚠️ Full budget only gives ' + (impliedAvgMargin*100).toFixed(1) + '% (below target)');
    } else if (impliedAvgMargin >= targetMarginMin && impliedAvgMargin <= targetMarginMax) {
        // Perfect! Full budget gives margin in range
        targetAvgMargin = impliedAvgMargin;
        strategy = 'use_full_budget_in_range';
        console.log('✅ Full budget gives margin IN RANGE!');
    } else {
        // Full budget gives too high margin - need to vary individual margins
        targetAvgMargin = (targetMarginMin + targetMarginMax) / 2; // Use middle of range
        strategy = 'vary_margins_to_hit_average';
        console.log('📊 Full budget gives ' + (impliedAvgMargin*100).toFixed(1) + '% (too high)');
        console.log('🎯 Will vary individual margins to average ' + (targetAvgMargin*100).toFixed(1) + '%');
    }
    
    // STEP 4: Assign individual margins based on strategy
    let individualMargins;
    
    if (strategy === 'vary_margins_to_hit_average') {
        // Create HIGH and LOW margins that average to target
        // Offshore can go high (up to 95%), onshore goes lower
        individualMargins = positions.map(pos => {
            const locationCap = MARGIN_CAPS[pos.location] || 0.95;
            
            if (pos.location === 'offshore') {
                // Offshore: use HIGH margins (75-95%)
                const min = Math.max(0.75, targetMarginMax);
                const max = locationCap;
                return Math.random() * (max - min) + min;
            } else if (pos.location === 'onshore') {
                // Onshore: use LOWER margins (35-58%)
                const min = Math.max(0.35, targetMarginMin - 0.15);
                const max = Math.min(0.58, locationCap);
                return Math.random() * (max - min) + min;
            } else {
                // Nearshore: use LOW margins (25-38%)
                const min = Math.max(0.25, targetMarginMin - 0.25);
                const max = Math.min(0.38, locationCap);
                return Math.random() * (max - min) + min;
            }
        });
        
        console.log('📊 Strategic margins:', individualMargins.map(m => (m*100).toFixed(1)+'%').join(', '));
    } else {
        // Use margins around the target average
        individualMargins = positions.map(pos => {
            const locationCap = MARGIN_CAPS[pos.location] || 0.95;
            const min = Math.max(0.10, targetAvgMargin - 0.08);
            const max = Math.min(locationCap, targetAvgMargin + 0.08);
            return min >= max ? targetAvgMargin : (Math.random() * (max - min) + min);
        });
    }
    
    // STEP 5: Calculate revenues from these margins
    const revenues = positions.map((pos, i) => 
        pos.monthlyCost / (1 - individualMargins[i])
    );
    const totalRevenue = revenues.reduce((sum, r) => sum + r, 0);
    
    // STEP 6: Scale to hit EXACTLY our target revenue (full budget)
    const scaleFactor = targetMonthlyRevenue / totalRevenue;
    console.log('🔄 Scale factor:', scaleFactor.toFixed(4));
    
    // STEP 7: Apply scaled revenues
    positions.forEach((pos, i) => {
        pos.monthlyRevenue = revenues[i] * scaleFactor;
        pos.monthlyProfit = pos.monthlyRevenue - pos.monthlyCost;
        pos.margin = pos.monthlyProfit / pos.monthlyRevenue;
        
        // Clamp to location caps
        const locationCap = MARGIN_CAPS[pos.location] || 0.95;
        if (pos.margin > locationCap) {
            pos.margin = locationCap;
            pos.monthlyRevenue = pos.monthlyCost / (1 - pos.margin);
            pos.monthlyProfit = pos.monthlyRevenue - pos.monthlyCost;
        }
        if (pos.margin < 0.10) {
            pos.margin = 0.10;
            pos.monthlyRevenue = pos.monthlyCost / (1 - pos.margin);
            pos.monthlyProfit = pos.monthlyRevenue - pos.monthlyCost;
        }
        
        pos.clientRate = pos.monthlyRevenue / pos.hours;
    });
    
    // STEP 8: Final adjustment to use EXACTLY full budget
    const finalMonthlyRevenue = positions.reduce((sum, p) => sum + p.monthlyRevenue, 0);
    const adjustmentFactor = targetMonthlyRevenue / finalMonthlyRevenue;
    
    if (Math.abs(adjustmentFactor - 1.0) > 0.001) {
        console.log('🔧 Final adjustment:', adjustmentFactor.toFixed(4));
        positions.forEach(pos => {
            pos.monthlyRevenue *= adjustmentFactor;
            pos.monthlyProfit = pos.monthlyRevenue - pos.monthlyCost;
            pos.margin = pos.monthlyProfit / pos.monthlyRevenue;
            pos.clientRate = pos.monthlyRevenue / pos.hours;
        });
    }
    
    // STEP 9: Verify results
    const verifyRevenue = positions.reduce((sum, p) => sum + p.monthlyRevenue, 0);
    const verifyProfit = verifyRevenue - totalMonthlyCost;
    const verifyMargin = (verifyProfit / verifyRevenue) * 100;
    
    console.log('✅ RESULTS:');
    console.log('💰 Annual Revenue:', formatCurrency(verifyRevenue * 12));
    console.log('💰 Budget:', formatCurrency(annualBudget));
    console.log('📊 Usage:', ((verifyRevenue * 12 / annualBudget) * 100).toFixed(1) + '%');
    console.log('📊 Avg Margin:', verifyMargin.toFixed(1) + '%');
    console.log('🎯 Target:', (targetMarginMin*100) + '%-' + (targetMarginMax*100) + '%');
    console.log('📋 Individual:', positions.map(p => (p.margin*100).toFixed(1)+'%').join(', '));
}

// ========================================
// Update Display
// ========================================

function updateDisplay() {
    renderTable();
    updateFinancials();
    updateWarnings();
}

function renderTable() {
    const tbody = document.getElementById('positionsTableBody');
    const badge = document.getElementById('positionBadge');
    
    badge.textContent = `${positions.length} position${positions.length !== 1 ? 's' : ''}`;
    tbody.innerHTML = '';
    
    const allPositionsAdded = positions.length >= maxPositions;
    
    positions.forEach(pos => {
        const row = document.createElement('tr');
        
        if (!allPositionsAdded) {
            // Show pending until all positions added
            row.innerHTML = `
                <td class="role-cell">${pos.role}</td>
                <td>${pos.hours}</td>
                <td><span class="location-badge ${pos.location}">${capitalize(pos.location)}</span></td>
                <td>${formatCurrency(pos.monthlyCost)}/mo</td>
                <td class="pending-cell">Pending...</td>
                <td class="pending-cell">Pending...</td>
                <td class="pending-cell">Pending...</td>
                <td class="pending-cell">Pending...</td>
                <td><button class="btn-delete" onclick="deletePosition(${pos.id})">🗑️</button></td>
            `;
        } else {
            // Show actual calculated values
            let marginClass = '';
            let marginIcon = '';
            const marginPercent = pos.margin * 100;
            const maxMarginForLocation = (MARGIN_CAPS[pos.location] || MAX_MARGIN) * 100;
            
            // Color code based on percentage of location max
            const percentOfMax = marginPercent / maxMarginForLocation;
            
            if (percentOfMax >= 0.85) {
                marginClass = 'excellent';
                marginIcon = '🎉';
            } else if (percentOfMax >= 0.65) {
                marginClass = 'good';
                marginIcon = '✅';
            } else if (percentOfMax >= 0.40) {
                marginClass = 'warning';
                marginIcon = '⚠️';
            } else {
                marginClass = 'danger';
                marginIcon = '❌';
            }
            
            row.innerHTML = `
                <td class="role-cell">${pos.role}</td>
                <td>${pos.hours}</td>
                <td><span class="location-badge ${pos.location}">${capitalize(pos.location)}</span></td>
                <td>${formatCurrency(pos.monthlyCost)}/mo</td>
                <td>${formatCurrency(pos.clientRate)}/hr</td>
                <td>${formatCurrency(pos.monthlyRevenue)}/mo</td>
                <td class="profit-cell">${formatCurrency(pos.monthlyProfit)}/mo</td>
                <td class="margin-cell ${marginClass}">${marginIcon} ${marginPercent.toFixed(1)}%</td>
                <td><button class="btn-delete" onclick="deletePosition(${pos.id})">🗑️</button></td>
            `;
        }
        
        tbody.appendChild(row);
    });
}

function updateFinancials() {
    if (positions.length === 0) {
        document.getElementById('monthlyRevenue').textContent = '$0';
        document.getElementById('monthlyCost').textContent = '$0';
        document.getElementById('monthlyProfit').textContent = '$0';
        document.getElementById('annualRevenue').textContent = '$0';
        document.getElementById('annualCost').textContent = '$0';
        document.getElementById('annualProfit').textContent = '$0';
        document.getElementById('avgMargin').textContent = '0%';
        return;
    }
    
    const monthlyRev = positions.reduce((sum, p) => sum + p.monthlyRevenue, 0);
    const monthlyCost = positions.reduce((sum, p) => sum + p.monthlyCost, 0);
    const monthlyProfit = monthlyRev - monthlyCost;
    
    const annualRev = monthlyRev * 12;
    const annualCost = monthlyCost * 12;
    const annualProfit = annualRev - annualCost;
    
    const avgMargin = monthlyRev > 0 ? (monthlyProfit / monthlyRev) * 100 : 0;
    
    document.getElementById('monthlyRevenue').textContent = formatCurrency(monthlyRev);
    document.getElementById('monthlyCost').textContent = formatCurrency(monthlyCost);
    document.getElementById('monthlyProfit').textContent = formatCurrency(monthlyProfit);
    document.getElementById('annualRevenue').textContent = formatCurrency(annualRev);
    document.getElementById('annualCost').textContent = formatCurrency(annualCost);
    document.getElementById('annualProfit').textContent = formatCurrency(annualProfit);
    
    const marginElement = document.getElementById('avgMargin');
    marginElement.textContent = avgMargin.toFixed(1) + '%';
    marginElement.className = 'margin';
    
    if (avgMargin >= 60) marginElement.classList.add('excellent');
    else if (avgMargin >= targetMargin * 100) marginElement.classList.add('good');
    else if (avgMargin >= 30) marginElement.classList.add('warning');
    else marginElement.classList.add('danger');
}

function updateWarnings() {
    const container = document.getElementById('warningsContainer');
    container.innerHTML = '';
    
    if (positions.length === 0) return;
    
    const monthlyRev = positions.reduce((sum, p) => sum + p.monthlyRevenue, 0);
    const monthlyCost = positions.reduce((sum, p) => sum + p.monthlyCost, 0);
    const annualRev = monthlyRev * 12;
    const annualCost = monthlyCost * 12;
    const avgMargin = monthlyRev > 0 ? ((monthlyRev - monthlyCost) / monthlyRev) * 100 : 0;
    
    // Over budget - only if TRULY over (more than 0.5% over to account for rounding)
    const budgetDifference = annualRev - annualBudget;
    if (budgetDifference > annualBudget * 0.005) { // More than 0.5% over
        const warning = document.createElement('div');
        warning.className = 'warning-box danger';
        warning.innerHTML = `
            <div class="warning-icon">❌</div>
            <div class="warning-text">
                <strong>Over Budget!</strong><br>
                <small>Revenue: ${formatCurrency(annualRev)} exceeds budget: ${formatCurrency(annualBudget)} by ${formatCurrency(budgetDifference)}</small>
            </div>
        `;
        container.appendChild(warning);
    }
    
    // Below target range
    if (avgMargin < targetMarginMin * 100 - 0.5) { // At least 0.5% below minimum
        const warning = document.createElement('div');
        warning.className = 'warning-box warning';
        warning.innerHTML = `
            <div class="warning-icon">⚠️</div>
            <div class="warning-text">
                <strong>Below Target Range</strong><br>
                <small>Current: ${avgMargin.toFixed(1)}% | Target: ${(targetMarginMin * 100).toFixed(0)}%-${(targetMarginMax * 100).toFixed(0)}%</small>
            </div>
        `;
        container.appendChild(warning);
    }
    
    // Budget too low - only if margin is negative or very low (below 5%)
    const actualMargin = annualRev > 0 ? ((annualRev - annualCost) / annualRev) : 0;
    if (actualMargin < 0.05) {
        const minBudget = annualCost / (1 - MIN_MARGIN);
        const warning = document.createElement('div');
        warning.className = 'warning-box danger';
        warning.innerHTML = `
            <div class="warning-icon">🚨</div>
            <div class="warning-text">
                <strong>Budget Too Low!</strong><br>
                <small>Need ${formatCurrency(minBudget)} for 10% margin. Current margin: ${(actualMargin * 100).toFixed(1)}%</small>
            </div>
        `;
        container.appendChild(warning);
    }
}

// ========================================
// Preview
// ========================================

function updatePreview() {
    const roleSelect = document.getElementById('role');
    const hoursInput = document.getElementById('hours');
    const selectedLocation = document.querySelector('input[name="location"]:checked');
    const preview = document.getElementById('previewBox');
    
    if (!roleSelect.value || !hoursInput.value || !selectedLocation) {
        preview.style.display = 'none';
        return;
    }
    
    const role = roleSelect.value;
    const hours = parseFloat(hoursInput.value);
    const location = selectedLocation.value;
    
    const roleData = rateCardData.find(r => r.role === role);
    if (!roleData) return;
    
    const cost = roleData[location].cost * hours;
    document.getElementById('previewCost').textContent = formatCurrency(cost) + '/month';
    preview.style.display = 'block';
}

// ========================================
// Delete Position
// ========================================

window.deletePosition = function(id) {
    positions = positions.filter(p => p.id !== id);
    
    // Update counter
    document.getElementById('positionCounter').textContent = `${positions.length} / ${maxPositions}`;
    
    // Re-enable form if was disabled
    if (positions.length < maxPositions) {
        document.getElementById('role').disabled = false;
        document.getElementById('hours').disabled = false;
        document.querySelectorAll('input[name="location"]').forEach(r => r.disabled = false);
        const submitBtn = document.querySelector('#positionForm button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Position';
    }
    
    if (positions.length === 0) {
        document.getElementById('placeholder').style.display = 'block';
        document.getElementById('positionsContainer').style.display = 'none';
        document.getElementById('recalculateBtn').style.display = 'none';
        document.getElementById('clearAllBtn').style.display = 'none';
        updateFinancials();
        updateWarnings();
    } else {
        calculateRatesAndMargins();
        updateDisplay();
    }
};

// ========================================
// Clear All
// ========================================

function handleClearAll() {
    if (!confirm('🗑️ Clear all positions?')) return;
    
    positions = [];
    document.getElementById('positionCounter').textContent = `0 / ${maxPositions}`;
    
    // Re-enable form
    document.getElementById('role').disabled = false;
    document.getElementById('hours').disabled = false;
    document.querySelectorAll('input[name="location"]').forEach(r => r.disabled = false);
    const submitBtn = document.querySelector('#positionForm button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Position';
    
    document.getElementById('placeholder').style.display = 'block';
    document.getElementById('positionsContainer').style.display = 'none';
    document.getElementById('recalculateBtn').style.display = 'none';
    document.getElementById('clearAllBtn').style.display = 'none';
    updateFinancials();
    updateWarnings();
}

// ========================================
// Discount Functions
// ========================================

function saveOriginalPositionsData() {
    originalPositionsData = positions.map(pos => ({
        id: pos.id,
        clientRate: pos.clientRate,
        monthlyRevenue: pos.monthlyRevenue,
        monthlyProfit: pos.monthlyProfit,
        margin: pos.margin
    }));
}

function updateDiscountPreview() {
    const discountInput = document.getElementById('discountPercent');
    const preview = document.getElementById('discountPreview');
    
    const discount = parseFloat(discountInput.value) || 0;
    
    if (discount <= 0 || positions.length === 0) {
        preview.style.display = 'none';
        return;
    }
    
    // Use original data if available, otherwise current data
    const baseData = originalPositionsData.length > 0 ? originalPositionsData : positions;
    
    const originalMonthlyRev = baseData.reduce((sum, p) => sum + p.monthlyRevenue, 0);
    const originalAnnualRev = originalMonthlyRev * 12;
    const discountAmount = originalAnnualRev * (discount / 100);
    const finalAnnualRev = originalAnnualRev - discountAmount;
    
    const monthlyCost = positions.reduce((sum, p) => sum + p.monthlyCost, 0);
    const annualCost = monthlyCost * 12;
    const newProfit = finalAnnualRev - annualCost;
    const newMargin = finalAnnualRev > 0 ? (newProfit / finalAnnualRev) * 100 : 0;
    
    document.getElementById('originalRevenue').textContent = formatCurrency(originalAnnualRev) + '/year';
    document.getElementById('discountAmount').textContent = '-' + formatCurrency(discountAmount);
    document.getElementById('finalRevenue').textContent = formatCurrency(finalAnnualRev) + '/year';
    document.getElementById('newMargin').textContent = newMargin.toFixed(1) + '%';
    
    preview.style.display = 'block';
}

function handleApplyDiscount() {
    const discountInput = document.getElementById('discountPercent');
    const discount = parseFloat(discountInput.value) || 0;
    
    if (discount <= 0) {
        alert('❌ Please enter a discount percentage greater than 0');
        return;
    }
    
    if (discount > 50) {
        alert('⚠️ Discount cannot exceed 50%');
        return;
    }
    
    if (positions.length === 0) {
        alert('❌ No positions to apply discount to');
        return;
    }
    
    // Save original data if not already saved
    if (originalPositionsData.length === 0) {
        saveOriginalPositionsData();
    }
    
    appliedDiscount = discount;
    
    // Apply discount to all positions
    const discountMultiplier = 1 - (discount / 100);
    
    positions.forEach(pos => {
        const original = originalPositionsData.find(o => o.id === pos.id);
        if (original) {
            pos.clientRate = original.clientRate * discountMultiplier;
            pos.monthlyRevenue = original.monthlyRevenue * discountMultiplier;
            pos.monthlyProfit = pos.monthlyRevenue - pos.monthlyCost;
            pos.margin = pos.monthlyRevenue > 0 ? pos.monthlyProfit / pos.monthlyRevenue : 0;
        }
    });
    
    console.log(`💰 Applied ${discount}% discount to all positions`);
    
    // Update display
    updateDisplay();
    
    // Show applied badge
    document.getElementById('appliedDiscountPercent').textContent = discount;
    document.getElementById('discountAppliedBadge').style.display = 'block';
    document.getElementById('removeDiscountBtn').style.display = 'inline-block';
    document.getElementById('applyDiscountBtn').textContent = 'Update Discount';
    
    // Hide preview
    document.getElementById('discountPreview').style.display = 'none';
}

function handleRemoveDiscount() {
    if (!confirm('Remove discount and restore original rates?')) {
        return;
    }
    
    appliedDiscount = 0;
    
    // Restore original values
    positions.forEach(pos => {
        const original = originalPositionsData.find(o => o.id === pos.id);
        if (original) {
            pos.clientRate = original.clientRate;
            pos.monthlyRevenue = original.monthlyRevenue;
            pos.monthlyProfit = original.monthlyProfit;
            pos.margin = original.margin;
        }
    });
    
    console.log('✅ Discount removed, original rates restored');
    
    // Update display
    updateDisplay();
    
    // Reset UI
    document.getElementById('discountPercent').value = '0';
    document.getElementById('discountAppliedBadge').style.display = 'none';
    document.getElementById('removeDiscountBtn').style.display = 'none';
    document.getElementById('applyDiscountBtn').textContent = 'Apply Discount';
    document.getElementById('discountPreview').style.display = 'none';
}

// ========================================
// Utilities
// ========================================

function formatCurrency(value) {
    if (isNaN(value)) return '$0.00';
    return '$' + Math.abs(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

console.log('✅ Script loaded');
