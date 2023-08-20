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
var baseDivider = 1000000;
var currentBet = currentBalance / baseDivider;
var currentPayout = 1.5;
var difficulty = 1;
var payouts = [
];

// skips for bustadice
var batchSizeBase = 26;
var batchSize = batchSizeBase;
var skips = 1000;
var losses = 0;
var base = () => { };

// for to create the payouts from 2 to 200 in 1 increments
for (let i = 2; i <= 17; i++) {
    payouts.push({ "payout": i, "losses": 0, "maxLosses": i * 7 });
}

for (let i = 18; i <= 200; i++) {
    payouts.push({ "payout": i, "losses": 0, "maxLosses": i * 7 });
}
/*
for (let i = 210; i <= 1000; i += 10) {
    payouts.push({ "payout": i, "losses": 0, "maxLosses": i * 10 });
}
*/

// reverse payouts array
payouts.reverse();

// this enables the bot to run
var run = false;

// replace area

// validations for the result
function getResult(multiplier) {
    currentBalance = bustabit ? userInfo.balance : balance;
    batchSize = batchSizeBase;

    if (run) {
        // Martingale
        if (multiplier < currentPayout) {
            losses += currentBet
            run = true;

            // use difficulty to determine the add from the bet
            if (difficulty == 1) {
                
                for (let index = 2; index < 10; index++) {

                    if (multiplier  > (currentPayout / index) &&
                        (currentPayout / index) > 2) {
                        difficulty = index;
                        currentPayout /= difficulty;
                        break;
                    }
                }
            }
        } else {
            losses = 0;
            run = false;

            if (difficulty > 1) {
                difficulty = 1;
            }
        }

        currentBet = getNextBet(losses, currentPayout);

        // console.log(`Bet: ${currentBet} | Payout: ${currentPayout} | Multiplier: ${multiplier} | Difficulty: ${difficulty}`);
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

        if (payouts[i].maxLosses - payouts[i].losses > 0 && payouts[i].maxLosses - payouts[i].losses < batchSize) {
            batchSize = payouts[i].maxLosses - payouts[i].losses;
        }

    }

    base();
}

function getNextBet(vlosses, vpayout){
    if(vlosses == 0 || vlosses < vpayout) return currentBalance / baseDivider;
    let vbet = currentBalance / baseDivider;
    while (vlosses >= vpayout){
        vbet *= (vpayout/(vpayout-1));
        vlosses -= vbet;
    }
    return vbet;
}

function roundBit(bet) {
    return Math.max(100, Math.round(bet / 100) * 100);
}

let sleep = ms => new Promise(r => setTimeout(r, ms));

// bustabit functions
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

    // bustadice functions
    this.stop = function () { };
    (async () => {
        while (true) {

            if (skips < batchSize) {
                break;
            }

            if (!run) {

                let batch = [];

                for (let i = 0; i < batchSize; i++) {
                    batch.push(this.skip());
                    await sleep(1);
                }

                // Try catch to save the numbers on batch
                await Promise.all(batch).then(res => {
                    // Process the results
                    res.forEach(r => getResult(r.multiplier));
                }).catch(err => {
                    console.log("error in batch");
                    console.log(err);
                    getResult(10000);
                });

                skips -= batchSize;
            } else {
                try {
                    let result = await this.bet(roundBit(currentBet), currentPayout);
                    balance = result.balance;
                    getResult(result.multiplier);
                } catch (e) {
                    console.log("error in bet");
                    console.log(e);
                    getResult(10000);
                }
            }
        }
        while (skips >= 0) {
            try {
                if (run) {
                    let result = await this.bet(roundBit(currentBet), currentPayout);
                    balance = result.balance;
                    getResult(result.multiplier);
                } else {
                    let result = await this.skip();
                    getResult(result.multiplier);
                    skips--;
                }
            } catch (e) {
                console.log("error in last");
                console.log(e);
                getResult(10000);
                break;
            }
        }
    })();
}