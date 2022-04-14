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

// Variables de apuesta y multiplicador
var currentBalance = bustabit ? userInfo.balance : balance;
var currentBet = currentBalance / 10000;
let currentPattern = 0;
var currentProb = .5;
var payouts = [];
const validators = [{
    pattern: "l",
    count: 0,
    position: 0
}, {
    pattern: "%l",
    count: 0,
    position: 0
}, {
    pattern: "l%",
    count: 0,
    position: 0
}, {
    pattern: "l%%",
    count: 0,
    position: 0
}, {
    pattern: "%l%",
    count: 0,
    position: 0
}, {
    pattern: "%%l",
    count: 0,
    position: 0
}, {
    pattern: "%%%l",
    count: 0,
    position: 0
}, {
    pattern: "%%l%",
    count: 0,
    position: 0
}, {
    pattern: "%l%%",
    count: 0,
    position: 0
}, {
    pattern: "l%%%",
    count: 0,
    position: 0
}, {
    pattern: "%%%%l",
    count: 0,
    position: 0
}, {
    pattern: "%%%l%",
    count: 0,
    position: 0
}, {
    pattern: "%%l%%",
    count: 0,
    position: 0
}, {
    pattern: "%l%%%",
    count: 0,
    position: 0
}, {
    pattern: "l%%%%",
    count: 0,
    position: 0
}]

// Tope de números con la cantidad de arriba
const number = 2;
var maxLossBefore = 1;
var sum = 0.01;

// controles de labouchere
var startBal = currentBalance;
var prevBal = currentBalance;

for (let i = 1.01; i <= number; i += sum) {
    let numberFixed = i.toFixed(2) * 1;
    let totalProb = Math.trunc(i) * 100;
    sum = (totalProb / 10000).toFixed(2) * 1;
    let currentMaxLoss = getCalStreakLoss(numberFixed, currentProb, totalProb);
    if (maxLossBefore < currentMaxLoss) {
        maxLossBefore = currentMaxLoss;
    } else {
        payouts.pop();
    }
    payouts.push({ number: numberFixed, maxLoss: currentMaxLoss, validators: cloneDeep(validators) });
}

var currentPayout = payouts[0].number;

// log('Numbers loaded !');
// log(payouts);

// Esto habilita la siguiente apuesta
var run = false;

// Para saltar apuesta en bustadice
var skipper = 1;


// Validaciones dependiendo del resultado
function getResult(multiplier) {

    currentBalance = bustabit ? userInfo.balance : balance;
    if (run) {
        // Labouchere
        //if (multiplier > currentPayout) {
        // currentBet *= currentPayout / (currentPayout - 0.02);
        //}
        currentBet *= currentPayout / (currentPayout - 0.02);
        if (currentBalance >= startBal && prevBal <= startBal) {
            currentBet = currentBalance / 10000;
            startBal = currentBalance;
        }
        prevBal = currentBalance;
    }

    run = false;

    for (let index = 0; index < payouts.length; index++) {
        const letter = multiplier < payouts[index].number ? "l" : "w";
        for (let jndex = 0; jndex < validators.length; jndex++) {

            let currentValidator = payouts[index].validators[jndex];

            if (currentValidator.pattern[currentValidator.position] != '%') {
                if (letter == currentValidator.pattern[currentValidator.position]) {
                    currentValidator.count++;
                } else {
                    currentValidator.count = 0;
                }
            }

            currentValidator.position++;

            if (currentValidator.position >= currentValidator.pattern.length) {
                currentValidator.position = 0;
            }

            // log({ result: multiplier, count: currentValidator.count, payout: payouts[index].number, letter: letter })
            if (currentValidator.count >= payouts[index].maxLoss && currentValidator.pattern[currentValidator.position] == "l") {
                run = true;
                currentPayout = payouts[index].number;
                currentPattern = jndex;
                break;
            }
        }
        if (run) {
            // log({ Bet: currentBet, Payout: currentPayout });
            break;
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
            skipper--;
            if (skipper < 0) {
                skipper = 1;
            }

            if (skipper > 0) {

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
function getCalStreakLoss(num, p, hands) {
    var maxStreak = 1;
    for (var i = 0; i < hands; i++) {
        if (runCal(hands, i, (1 - .99 / num)) <= p) {
            maxStreak = i;
            break;
        }
    }

    return maxStreak;
}

function runCal(hands, streak, p) {
    var k = 1 - p;

    if (streak == 0)
        odds = 1;
    else if (streak == 1)
        odds = 1 - Math.pow(k, hands);
    else {
        var single = Math.pow(p, streak);
        var single1 = single * single * k;
        var single2 = single1 * single * k;
        var single3 = single2 * single * k;
        var single4 = single3 * single * k;
        var odds = single * (1 + (hands - streak) * k);
        for (var i = 0; i < hands - streak * 2; i++) {
            odds -= single1 * (1 + k * i);
        }
        var factor = 0;
        for (var i = 0; i < hands - streak * 2 - 3; i++) {
            factor += i;
            odds += single2 * (1 + i + k * factor);
        }

        factor = 0;
        var factor2 = 0;
        for (var i = 0; i < hands - streak * 2 - 6; i++) {
            factor += i;
            factor2 += factor;
            odds -= single3 * (1 + i + factor + k * factor2);
        }

        factor = 0;
        factor2 = 0;
        var factor3 = 0;
        for (var i = 0; i < hands - streak * 2 - 9; i++) {
            factor += i;
            factor2 += factor;
            factor3 += factor2;
            odds += single4 * (1 + i + factor + factor2 + 0.7 * k * factor3);
        }

    }

    if (odds > 1)
        odds = 1;
    else if (odds < 0)
        odds = 0;

    return odds;
}

function cloneDeep(entity) {
    return /Array|Object/.test(Object.prototype.toString.call(entity))
        ? Object.assign(new entity.constructor, ...Object.keys(entity).map((prop) => ({ [prop]: cloneDeep(entity[prop]) })))
        : entity;
}

function bayes(pa, pb) {
    return (pa * pb) / ((pa * pb) + ((1 - pa) * (1 - pb)));
}