// ========================================
// Global State
// ========================================

let annualBudget = 0;
let minTargetMargin = 0.55;
let maxTargetMargin = 0.60;
let maxPositions = 0;
let positions = [];
let positionIdCounter = 0;
let appliedDiscount = 0; // Percentage
let originalPositionsData = []; // Store original values before discount

const MIN_MARGIN = 0.10; // 10%
const MAX_MARGIN = 0.65; // 65%

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
    const minMarginInput = document.getElementById('minMargin');
    const maxMarginInput = document.getElementById('maxMargin');
    const positionCountInput = document.getElementById('positionCount');
    
    const budget = parseFloat(budgetInput.value);
    const minMargin = parseFloat(minMarginInput.value) / 100;
    const maxMargin = parseFloat(maxMarginInput.value) / 100;
    const count = parseInt(positionCountInput.value);
    
    if (!budget || budget <= 0) {
        alert('❌ Please enter a valid annual budget');
        return;
    }
    
    if (!count || count < 1 || count > 50) {
        alert('❌ Please enter number of positions (1-50)');
        return;
    }
    
    if (!minMargin || minMargin < 0.10 || minMargin > 0.65) {
        alert('❌ Minimum margin must be between 10% and 65%');
        return;
    }
    
    if (!maxMargin || maxMargin < 0.10 || maxMargin > 0.65) {
        alert('❌ Maximum margin must be between 10% and 65%');
        return;
    }
    
    if (minMargin >= maxMargin) {
        alert('❌ Minimum margin must be less than maximum margin');
        return;
    }
    
    annualBudget = budget;
    minTargetMargin = minMargin;
    maxTargetMargin = maxMargin;
    maxPositions = count;
    
    console.log('💰 Annual Budget:', formatCurrency(annualBudget));
    console.log('🎯 Target Margin Range:', (minTargetMargin * 100).toFixed(0) + '% - ' + (maxTargetMargin * 100).toFixed(0) + '%');
    console.log('📊 Max Positions:', maxPositions);
    
    document.getElementById('budgetEntrySection').style.display = 'none';
    document.getElementById('calculatorLayout').style.display = 'grid';
    
    document.getElementById('budgetAmount').textContent = formatCurrency(annualBudget);
    document.getElementById('budgetMonthly').textContent = formatCurrency(annualBudget / 12);
    document.getElementById('positionCounter').textContent = `0 / ${maxPositions}`;
    document.getElementById('targetDisplay').textContent = (minTargetMargin * 100).toFixed(0) + '% - ' + (maxTargetMargin * 100).toFixed(0) + '%';
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
// USE FULL BUDGET - EXACTLY 100%!
// ========================================

function calculateRatesAndMargins() {
    if (positions.length === 0) return;
    
    // Step 1: Calculate total costs
    const totalMonthlyCost = positions.reduce((sum, p) => sum + p.monthlyCost, 0);
    const totalAnnualCost = totalMonthlyCost * 12;
    
    console.log('📊 Total Annual Cost:', formatCurrency(totalAnnualCost));
    console.log('💰 Annual Budget:', formatCurrency(annualBudget));
    console.log('🎯 Target Margin Range:', (minTargetMargin * 100).toFixed(1) + '% - ' + (maxTargetMargin * 100).toFixed(1) + '%');
    
    // Step 2: Target monthly revenue from full budget
    const targetMonthlyRevenue = annualBudget / 12;
    
    // Step 3: Calculate what average margin this budget would give us
    const impliedAvgMargin = targetMonthlyRevenue > 0 ? 
        (targetMonthlyRevenue - totalMonthlyCost) / targetMonthlyRevenue : 0;
    
    console.log('📈 Implied avg margin with full budget:', (impliedAvgMargin * 100).toFixed(1) + '%');
    
    // Check if budget is too low
    if (impliedAvgMargin < MIN_MARGIN) {
        console.error('❌ Budget too low for minimum 10% margin!');
        alert(`❌ Budget too low!\n\nYour costs: ${formatCurrency(totalAnnualCost)}/year\nYour budget: ${formatCurrency(annualBudget)}/year\n\nThis gives only ${(impliedAvgMargin * 100).toFixed(1)}% margin.\nYou need at least ${formatCurrency(totalAnnualCost / (1 - MIN_MARGIN))} for 10% margin.`);
        return;
    }
    
    // Step 4: Determine target average margin within the range
    // If the implied margin is within range, use it. Otherwise, clamp to range.
    let targetAvgMargin;
    if (impliedAvgMargin >= minTargetMargin && impliedAvgMargin <= maxTargetMargin) {
        targetAvgMargin = impliedAvgMargin;
        console.log('✅ Using implied margin (within range):', (targetAvgMargin * 100).toFixed(1) + '%');
    } else if (impliedAvgMargin < minTargetMargin) {
        targetAvgMargin = minTargetMargin;
        console.log('⬆️ Adjusting to minimum margin:', (targetAvgMargin * 100).toFixed(1) + '%');
    } else {
        targetAvgMargin = maxTargetMargin;
        console.log('⬇️ Adjusting to maximum margin:', (targetAvgMargin * 100).toFixed(1) + '%');
    }
    
    // Step 5: Calculate actual monthly revenue based on target average margin
    const actualMonthlyRevenue = totalMonthlyCost / (1 - targetAvgMargin);
    const actualAnnualRevenue = actualMonthlyRevenue * 12;
    
    console.log('💵 Target monthly revenue:', formatCurrency(actualMonthlyRevenue));
    console.log('💰 Target annual revenue:', formatCurrency(actualAnnualRevenue));
    
    // Step 6: Assign random margins between 10-65% to each position
    const randomMargins = positions.map(() => 
        Math.random() * (MAX_MARGIN - MIN_MARGIN) + MIN_MARGIN
    );
    
    // Calculate revenue each position would generate with these random margins
    const revenues = positions.map((pos, i) => 
        pos.monthlyCost / (1 - randomMargins[i])
    );
    
    const totalRandomRevenue = revenues.reduce((sum, r) => sum + r, 0);
    
    // Scale factor to hit our target revenue (which gives us our target average margin)
    const scaleFactor = actualMonthlyRevenue / totalRandomRevenue;
    
    console.log('🔄 Scale factor:', scaleFactor.toFixed(4));
    
    // Apply scaled revenues and calculate final margins
    positions.forEach((pos, i) => {
        pos.monthlyRevenue = revenues[i] * scaleFactor;
        pos.monthlyProfit = pos.monthlyRevenue - pos.monthlyCost;
        pos.margin = pos.monthlyRevenue > 0 ? pos.monthlyProfit / pos.monthlyRevenue : 0;
        
        // Clamp individual position margins to 10-65% range
        if (pos.margin < MIN_MARGIN) {
            pos.margin = MIN_MARGIN;
            pos.monthlyRevenue = pos.monthlyCost / (1 - pos.margin);
            pos.monthlyProfit = pos.monthlyRevenue - pos.monthlyCost;
        }
        if (pos.margin > MAX_MARGIN) {
            pos.margin = MAX_MARGIN;
            pos.monthlyRevenue = pos.monthlyCost / (1 - pos.margin);
            pos.monthlyProfit = pos.monthlyRevenue - pos.monthlyCost;
        }
        
        pos.clientRate = pos.hours > 0 ? pos.monthlyRevenue / pos.hours : 0;
    });
    
    // Step 7: Verify final average margin
    const finalMonthlyRevenue = positions.reduce((sum, p) => sum + p.monthlyRevenue, 0);
    const finalMonthlyProfit = finalMonthlyRevenue - totalMonthlyCost;
    const finalAvgMargin = finalMonthlyRevenue > 0 ? finalMonthlyProfit / finalMonthlyRevenue : 0;
    const finalAnnualRevenue = finalMonthlyRevenue * 12;
    
    console.log('✅ Calculations complete!');
    console.log('💰 Final Annual Revenue:', formatCurrency(finalAnnualRevenue));
    console.log('📊 Final Average Margin:', (finalAvgMargin * 100).toFixed(1) + '%');
    console.log('📋 Position margins:', positions.map(p => (p.margin * 100).toFixed(1) + '%').join(', '));
    
    // Check if final average margin is within target range
    const marginInRange = finalAvgMargin >= minTargetMargin && finalAvgMargin <= maxTargetMargin;
    if (marginInRange) {
        console.log('✅ Average margin is within target range!');
    } else if (finalAvgMargin < minTargetMargin) {
        console.log('⚠️ Average margin slightly below range due to margin clamping');
    } else {
        console.log('⚠️ Average margin slightly above range due to margin clamping');
    }
    
    // Show budget comparison
    const budgetDiff = finalAnnualRevenue - annualBudget;
    const budgetUtilization = (finalAnnualRevenue / annualBudget) * 100;
    
    if (Math.abs(budgetDiff) > annualBudget * 0.01) {
        console.log('ℹ️ Revenue vs Budget: ' + formatCurrency(finalAnnualRevenue) + ' vs ' + formatCurrency(annualBudget));
        console.log('ℹ️ Difference: ' + formatCurrency(Math.abs(budgetDiff)) + ' (' + budgetUtilization.toFixed(1) + '%)');
        
        if (budgetDiff > 0) {
            console.log('💡 Revenue exceeds budget to meet minimum margin target');
        } else {
            console.log('💡 Revenue under budget to meet maximum margin target');
        }
    }
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
            
            if (marginPercent >= 60) {
                marginClass = 'excellent';
                marginIcon = '🎉';
            } else if (marginPercent >= 50) {
                marginClass = 'good';
                marginIcon = '✅';
            } else if (marginPercent >= 30) {
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
    else if (avgMargin >= minTargetMargin * 100) marginElement.classList.add('good');
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
    if (avgMargin < minTargetMargin * 100 - 0.5) { // At least 0.5% below minimum target
        const warning = document.createElement('div');
        warning.className = 'warning-box warning';
        warning.innerHTML = `
            <div class="warning-icon">⚠️</div>
            <div class="warning-text">
                <strong>Below Target Range</strong><br>
                <small>Current: ${avgMargin.toFixed(1)}% | Target: ${(minTargetMargin * 100).toFixed(0)}% - ${(maxTargetMargin * 100).toFixed(0)}%</small>
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
