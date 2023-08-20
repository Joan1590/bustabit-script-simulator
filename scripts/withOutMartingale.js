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

//Variables de apuesta y multiplicador
var currentBalance = bustabit ? userInfo.balance : balance;
var currentBet = currentBalance / 100000;
var currentPayout = 1.5;
var payouts = [
];

// for to create the payouts from 2 to 200 in 1 increments
for (let i = 2; i <= 200; i++) {
    payouts.push({ "payout": i, "losses": 0, "maxLosses": i * 3 });
}

for (let i = 210; i <= 1000; i += 10) {
    payouts.push({ "payout": i, "losses": 0, "maxLosses": i * 3 });
}

// reverse the payouts array
// payouts.reverse();

//Esto habilita la siguiente apuesta
var run = false;

// replace area

//Validaciones dependiendo del resultado
function getResult(multiplier) {
    currentBalance = bustabit ? userInfo.balance : balance;

    if (run) {
        // Martingale
        if (multiplier < currentPayout) {
            // currentBet *= currentPayout / (currentPayout - 1);
            run = true;
        } else {
            currentBet = currentBalance / 100000;
            run = false;
        }
    }

    for (let i = 0; i < payouts.length; i++) {
        if (multiplier < payouts[i].payout) {
            payouts[i].losses++;
        } else {
            payouts[i].losses = 0;
        }


        if (payouts[i].losses >= payouts[i].maxLosses && !run) {
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