var config = {
    baseBet: { type: 'balance', label: 'Base Bet', value: 0.1 },
    //basePayout: { type: 'multiplier', label: 'Base Payout', value: 1.5 },
    //baseMulti: { type: 'multiplier', label: 'Bet Multi', value: 1.08 },
    // postBet: { type: 'text', label: 'Post Bet', value: 0.008 },
};
// variable basePayout is = to getRandomArbitrary with params 1.5 and 1.8
let basePayout = getRandomArbitrary(1.5, 1.8);
let postBet = getRandomArbitrary(-0.08, 0.08);
let baseMulti = getRandomArbitrary(1.1, 1.5);
let currentBet = config.baseBet.value;
let startBal = userInfo.balance;
let prevBal = userInfo.balance;

engine.on('GAME_ENDED', () => {
    let lastGame = engine.history.first();
    if (lastGame.bust < basePayout) {
        startBal -= (currentBet * postBet);
        currentBet *= baseMulti;
        startBal += (currentBet * postBet);
    }
    if (userInfo.balance >= startBal && prevBal <= startBal) {
        currentBet = config.baseBet.value
        startBal = userInfo.balance;
        postBet = getRandomArbitrary(0.01, 0.5);
        baseMulti = getRandomArbitrary(1.1, 1.5);
        // update variable basePayout is = to getRandomArbitrary with params 1.5 and 1.8
        basePayout = getRandomArbitrary(1.5, 1.8);
    }
    prevBal = userInfo.balance;
    engine.bet(roundBit(currentBet), basePayout);
});

function roundBit(bet) {
    return Math.max(100, Math.round(bet / 100) * 100);
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}