var config = {

};

//Verificador de si es bustabit o bustadice
var bustabit;

//Verificador de bustabit y bustadice
try {
    engine == true;
    bustabit = true;
} catch (e) {
    bustabit = false;
}

// Base variables
var baseDifficulty = 5;
var maxDifficulty = 13;

//Variables de apuesta y multiplicador
var currentBalance = bustabit ? userInfo.balance : balance;
var currentBet = currentBalance / 100000;
var stepBalance = currentBalance;
var currentPayout = 0;
var difficulty = baseDifficulty;
var startBalance = currentBalance;
var endBalance = currentBalance;
var payouts = [
    // { "payout": 14, "losses": 0, "maxLosses": 14 * difficulty },
];

// for to create the payouts from 2 to 200 in 1 increments
for (let i = 2; i <= 200; i++) {
    payouts.push({ "payout": i, "losses": 0, "maxLosses": i * difficulty });
}

for (let i = 210; i <= 1000; i += 10) {
    payouts.push({ "payout": i, "losses": 0, "maxLosses": i * difficulty });
}
// reverse the payouts array
// payouts.reverse();

// Esto habilita la siguiente apuesta
var run = false;

// replace area

//Validaciones dependiendo del resultado
function getResult(multiplier) {
    currentBalance = bustabit ? userInfo.balance : balance;

    if (run) {
        endBalance = currentBalance;
        // Martingale
        if (multiplier < currentPayout) {
            if (difficulty >= maxDifficulty - 2) {
                currentBet *= (currentPayout / (currentPayout - 1) - 1) * (difficulty / (maxDifficulty - difficulty)) + 1;
            }
            run = true;
        } else {
            currentBet *= (currentPayout / (currentPayout - 1) - 1) * (difficulty / (maxDifficulty - difficulty)) + 1;
            if (endBalance < stepBalance) {
                difficulty++;
            }
            run = false;
        }

        if (endBalance > startBalance) {
            currentPayout = 0;
            difficulty = baseDifficulty;
            currentBet = currentBalance / 100000;
            startBalance = endBalance;
        }
    }

    for (let i = 0; i < payouts.length; i++) {
        payouts[i].maxLosses = payouts[i].payout * difficulty;
        if (multiplier < payouts[i].payout) {
            payouts[i].losses++;
        } else {
            payouts[i].losses = 0;
        }

        if (payouts[i].losses >= payouts[i].maxLosses && !run) {
            if (currentPayout != payouts[i].payout) {
                stepBalance = endBalance;
            }
            currentPayout = payouts[i].payout;
            run = true;
        }

    }
}

function roundBit(bet) {
    return Math.max(100, Math.round(bet / 100) * 100);
}

//Bustabit Apuesta (No modificar)
if (bustabit) {
    // engine.bet(roundBit(currentBet), currentPayout);

    engine.on('GAME_ENDED', () => {
        var lastGame = engine.history.first();
        getResult(lastGame.bust);
    });

    engine.on('GAME_STARTING', () => {
        if (run) {
            log(`Bet: ${currentBet} Payout: ${currentPayout} Difficulty: ${difficulty}`);
            engine.bet(roundBit(currentBet), currentPayout);
        }
    });

} else {

    //Bustadice Apuesta (No modificar)
    this.stop = function () { };
    try {
        const makeBet = () => {
            this.bet(roundBit(currentBet), currentPayout).then((result) => {
                getResult(result.multiplier);
                if (run) {
                    makeBet();
                } else {
                    skip();
                }
            });
        }
        const skip = () => {
            this.skip().then((result) => {
                getResult(result.multiplier);
                if (run) {
                    makeBet();
                } else {
                    skip();
                }
            });
        }
        if (run) {
            makeBet();
        } else {
            skip();
        }
    } catch (error) {
        if (error.message === 'connection closed') {
            this.log('connection closed, restarting script');
            makeBet();
        } else {
            throw error;
        }
    }
}