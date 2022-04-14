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
var currentPayout = 1.1;
var summatory = 1;
var pos = Math.floor(Math.random() * 10);

//Esto habilita la siguiente apuesta
var run = true;

//Para saltar apuesta en bustadice
var pair = false;


//Validaciones dependiendo del resultado
function getResult(multiplier) {
    currentBalance = bustabit ? userInfo.balance : balance;

    if (run) {
        // Labouchere
        if (pos == 0) {
            summatory *= 20;
            currentBet *= summatory;
            pos = Math.floor(Math.random() * 10);
        } else {
            currentBet = currentBalance / 10000;
            pos--;
        }
        if (currentBalance >= startBal && prevBal <= startBal) {
            currentBet = currentBalance / 10000;
            startBal = currentBalance;
            summatory = 1;
        }
        prevBal = currentBalance;
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
                balance = result.balance;
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
                    balance = result.balance;
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