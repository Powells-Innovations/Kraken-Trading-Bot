/**
 * Test Optimal Settings for 5% Capital Increase
 * Validates the stop loss and take profit calculations
 */

console.log('🧪 Testing Optimal Settings for 5% Capital Increase');
console.log('==================================================');

// Test scenarios
const testScenarios = [
    { entryPrice: 100, side: 'BUY', expectedGain: 5, expectedLoss: 2.5 },
    { entryPrice: 50, side: 'BUY', expectedGain: 5, expectedLoss: 2.5 },
    { entryPrice: 200, side: 'SELL', expectedGain: 5, expectedLoss: 2.5 },
    { entryPrice: 75, side: 'SELL', expectedGain: 5, expectedLoss: 2.5 }
];

function calculateOptimalLevels(entryPrice, side) {
    let stopLoss, takeProfit;
    
    if (side === 'BUY') {
        takeProfit = entryPrice * 1.05;  // 5% capital increase
        stopLoss = entryPrice * 0.975;   // 2.5% loss
    } else {
        takeProfit = entryPrice * 0.95;  // 5% capital increase
        stopLoss = entryPrice * 1.025;   // 2.5% loss
    }
    
    return { stopLoss, takeProfit };
}

function calculateRiskRewardRatio(entryPrice, stopLoss, takeProfit, side) {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    return reward / risk;
}

console.log('\n📊 Test Results:');
console.log('Entry Price | Side | Take Profit | Stop Loss | Risk/Reward | Gain % | Loss %');
console.log('------------|------|-------------|-----------|-------------|--------|--------');

testScenarios.forEach(scenario => {
    const { stopLoss, takeProfit } = calculateOptimalLevels(scenario.entryPrice, scenario.side);
    const riskReward = calculateRiskRewardRatio(scenario.entryPrice, stopLoss, takeProfit, scenario.side);
    
    const gainPercent = scenario.side === 'BUY' 
        ? ((takeProfit - scenario.entryPrice) / scenario.entryPrice) * 100
        : ((scenario.entryPrice - takeProfit) / scenario.entryPrice) * 100;
    
    const lossPercent = scenario.side === 'BUY'
        ? ((scenario.entryPrice - stopLoss) / scenario.entryPrice) * 100
        : ((stopLoss - scenario.entryPrice) / scenario.entryPrice) * 100;
    
    console.log(
        `${scenario.entryPrice.toFixed(2).padStart(11)} | ${scenario.side.padStart(4)} | ` +
        `${takeProfit.toFixed(2).padStart(11)} | ${stopLoss.toFixed(2).padStart(9)} | ` +
        `${riskReward.toFixed(2).padStart(11)} | ${gainPercent.toFixed(1).padStart(6)}% | ` +
        `${lossPercent.toFixed(1).padStart(6)}%`
    );
});

console.log('\n✅ Validation Results:');
console.log('=====================');

// Validate the settings
const validationResults = testScenarios.map(scenario => {
    const { stopLoss, takeProfit } = calculateOptimalLevels(scenario.entryPrice, scenario.side);
    const riskReward = calculateRiskRewardRatio(scenario.entryPrice, stopLoss, takeProfit, scenario.side);
    
    const gainPercent = scenario.side === 'BUY' 
        ? ((takeProfit - scenario.entryPrice) / scenario.entryPrice) * 100
        : ((scenario.entryPrice - takeProfit) / scenario.entryPrice) * 100;
    
    const lossPercent = scenario.side === 'BUY'
        ? ((scenario.entryPrice - stopLoss) / scenario.entryPrice) * 100
        : ((stopLoss - scenario.entryPrice) / scenario.entryPrice) * 100;
    
    return {
        gainTarget: Math.abs(gainPercent - 5) < 0.1,
        lossTarget: Math.abs(lossPercent - 2.5) < 0.1,
        riskRewardTarget: Math.abs(riskReward - 2) < 0.1
    };
});

const allValid = validationResults.every(result => 
    result.gainTarget && result.lossTarget && result.riskRewardTarget
);

if (allValid) {
    console.log('✅ All settings validated successfully!');
    console.log('✅ Take Profit: 5% capital increase target achieved');
    console.log('✅ Stop Loss: 2.5% target achieved');
    console.log('✅ Risk/Reward Ratio: 2:1 target achieved');
} else {
    console.log('❌ Some settings need adjustment');
}

console.log('\n📈 Trading Strategy Summary:');
console.log('============================');
console.log('🎯 Target Gain: 5% per trade');
console.log('🛡️  Stop Loss: 2.5% per trade');
console.log('⚖️  Risk/Reward Ratio: 2:1');
console.log('📊 Win Rate Needed: 40% for breakeven');
console.log('💰 Expected Gain: 5% on winning trades');
console.log('⚠️  Expected Loss: 2.5% on losing trades');

console.log('\n🔧 Implementation Notes:');
console.log('=======================');
console.log('• These settings are optimized for 5% capital increase');
console.log('• 2:1 risk/reward ratio provides optimal profit potential');
console.log('• Conservative approach reduces drawdowns');
console.log('• Suitable for both demo and live trading');
console.log('• Can be adjusted based on market conditions');

console.log('\n🚀 Ready for 5% capital increase trading!'); 