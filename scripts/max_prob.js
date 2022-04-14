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
var currentBet = currentBalance / 10000;
var startBal = currentBalance;
var prevBal = currentBalance;
var payouts = [2, 5, 10];
var currentPayout = payouts[0];
var arrayGames = [];

//Esto habilita la siguiente apuesta
var run = false;

//Para saltar apuesta en bustadice
var pair = false;


//Validaciones dependiendo del resultado
function getResult(multiplier) {
    currentBalance = bustabit ? userInfo.balance : balance;
    if (run) {
        // Labouchere
        if (multiplier < currentPayout) {
            currentBet *= currentPayout / (currentPayout - 0.03);
        }
        if (currentBalance >= startBal && prevBal <= startBal) {
            currentBet = currentBalance / 10000;
            startBal = currentBalance;
        }
        prevBal = currentBalance;
    }

    arrayGames.push(parseFloat(multiplier));
    if (arrayGames.length > 1000) {
        arrayGames.shift();
    }
    if (arrayGames.length == 1000) {
        for (let i = 0; i < payouts.length; i++) {
            let wins = arrayGames.filter((x) => x >= payouts[i]);

            // log(`amount wins: ${wins.length}`)
            if (wins.length / arrayGames.length < .9 / payouts[i]) {
                run = true;
                currentPayout = payouts[i];
            } else {
                run = false;
            }
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
            pair = !pair;

            if (pair) {

                this.skip().then((result) => {
                    getResult(result.multiplier);
                    if (run) {
                        makeBet();
                    } else {
                        skip();
                    }
                });

            } else {

                this.bet(100, 1.01).then((result) => {
                    getResult(result.multiplier);
                    if (run) {
                        makeBet();
                    } else {
                        skip();
                    }
                });

            }
        }
        makeBet();
    } catch (error) {
        if (error.message === 'connection closed') {
            this.log('connection closed, restarting script');
            makeBet();
        } else {
            throw error;
        }
    }
}

// utils
function bayes(pa, pb) {
    return (pa * pb) / ((pa * pb) + ((1 - pa) * (1 - pb)));
}

// #Source https://bit.ly/2neWfJ2 
const median = arr => {
    const mid = Math.floor(arr.length / 2),
        nums = [...arr].sort((a, b) => a - b);
    return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
};