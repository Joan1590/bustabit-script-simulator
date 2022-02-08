var config = {
    wager: { label: "Wager", type: "balance", value: 100 },
    maxBet: { label: "MaxBet", type: "balance", value: 10000 }
};

//Variables de apuesta y multiplicador
var currentBet = config.wager.value;
var currentPayout = 1.2;
var pos = -1;

//Esto habilita la siguiente apuesta
var run = false;

//Para saltar apuesta en bustadice
var pair = false;

//Verificador de si es bustabit o bustadice
var bustabit;

//Verificador de bustabit y bustadice
try {
    engine == true;
    bustabit = true;
} catch (e) {
    bustabit = false;
}

//Validaciones dependiendo del resultado
function getResult(multiplier) {
    run = true;
}

function roundBit(bet) {
    return Math.min(config.maxBet.value, Math.max(100, Math.round(bet / 100) * 100));
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
    } catch (error) {
        if (error.message === 'connection closed') {
            this.log('connection closed, restarting script');
            makeBet();
        } else {
            throw error;
        }
    }
}

function getMaxLoss(P) {
    return Math.abs(Math.trunc(Math.log(115792089237316195423570985008687907853269984665640564039457584007913129639936) / Math.log(1 - P)));
}