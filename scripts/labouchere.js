var config = {
    baseBet: { type: 'balance', label: 'Base Bet', value: 0.1 },
    basePayout: { type: 'multiplier', label: 'Base Payout', value: 1.3 },
    baseMulti: { type: 'multiplier', label: 'Bet Multi', value: 1.3 },
    postBet: { type: 'text', label: 'Post Bet', value: 0 },
};

let currentBet = config.baseBet.value;
let startBal = userInfo.balance;
let prevBal = userInfo.balance;

engine.on('GAME_STARTING', () => {
    engine.bet(roundBit(currentBet), config.basePayout.value);
});

engine.on('GAME_ENDED', () => {
    let lastGame = engine.history.first();

    if (lastGame.bust < config.basePayout.value) {
        startBal -= (currentBet * config.postBet.value);
        currentBet *= config.baseMulti.value;
        startBal += (currentBet * config.postBet.value);
    }
    if (userInfo.balance >= startBal && prevBal <= startBal) {
        currentBet = config.baseBet.value
        startBal = userInfo.balance;
    }
    prevBal = userInfo.balance;
});

function roundBit(bet) {
    return Math.max(100, Math.round(bet / 100) * 100);
}