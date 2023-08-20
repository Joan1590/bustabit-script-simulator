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

var info = {
    basePayoutDifficulty: 10,
    currentBalance: bustabit ? userInfo.balance : balance,
    baseDivider: 100000,
    currentBet: 100,
    currentPayout: 1.5,
    difficulty: 1,
    payoutDifficulty: 1,
    losses: 0,
    run: false,
    payouts: [],
    batchSizeBase: 500,
    batchSize: 1,
    skips: 1000,
    beforeBalance: 0,
    afterBalance: 0,
    maxBet: 100,
}

info.currentBet = info.currentBalance / info.baseDivider;
info.payoutDifficulty = info.basePayoutDifficulty;
info.batchSize = info.batchSizeBase;
info.beforeBalance = info.currentBalance;
info.afterBalance = info.currentBalance;
info.maxBet = 999999999;

// console.log(info.payouts);
// Base variables
var base = () => { };

// for to create the payouts from 2 to 200 in 1 increments
for (let i = 2; i <= 1500; i++) {
    info.payouts.push({ "payout": i, "losses": 0, "maxLosses": i * info.payoutDifficulty });
}
// reverse payouts array
info.payouts.reverse();

// replace area

info.skips = 1000;

// validations for the result
function getResult(multiplier) {
    info.currentBalance = bustabit ? userInfo.balance : balance;
    info.batchSize = info.batchSizeBase;

    if (info.run) {
        info.afterBalance = info.currentBalance;
        if (multiplier < info.currentPayout) {
            info.losses += info.currentBet;
            info.run = true;

            // if (difficulty == 1) {

            for (let index = 1.1; index <= 2; index += 0.1) {

                if (multiplier > (info.currentPayout / index) &&
                    (info.currentPayout / index) > 1.01) {
                    info.difficulty = index;
                    info.currentPayout /= info.difficulty;
                    break;
                }
            }
            //}
        } else {
            info.losses -= (info.currentBet) * (info.currentPayout - 1);

            if (info.losses <= 0) {
                info.losses = 0;
                info.payoutDifficulty = info.basePayoutDifficulty
            } else {
                info.payoutDifficulty++;
            }

            info.difficulty = 1;

            info.run = false;
        }


    }

    for (let i = 0; i < info.payouts.length; i++) {
        info.payouts[i].maxLosses = info.payouts[i].payout * info.payoutDifficulty;

        if (multiplier < info.payouts[i].payout) {
            info.payouts[i].losses++;
            // console.log('in');
        } else {
            info.payouts[i].losses = 0;
            // console.log('out');
        }


        if (info.payouts[i].losses >= info.payouts[i].maxLosses && !info.run) {
            info.currentPayout = info.payouts[i].payout;
            info.run = true;
        }

        if (info.payouts[i].maxLosses - info.payouts[i].losses > 0 && info.payouts[i].maxLosses - info.payouts[i].losses < info.batchSize) {
            info.batchSize = info.payouts[i].maxLosses - info.payouts[i].losses;
        }

    }

    info.currentBet = getNextBet(info.losses, info.currentPayout * info.difficulty);

    // console.log(`Bet: ${info.currentBet} | Payout: ${info.currentPayout} | Multiplier: ${multiplier} | Difficulty: ${info.difficulty} | PayoutDifficulty: ${info.payoutDifficulty} | Losses: ${info.losses}`);
    base();
}

function getNextBet(vlosses, vpayout) {
    return Math.min(info.maxBet, (info.currentBalance / info.baseDivider) + (vlosses / (vpayout - 1)));
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
        if (info.run) {
            engine.bet(roundBit(info.currentBet), info.currentPayout);
        }
    });

} else {

    // bustadice functions
    this.stop = function () { };
    (async () => {
        while (true) {

            if (info.skips < info.batchSize) {
                break;
            }

            if (!info.run) {

                let batch = [];

                for (let i = 0; i < info.batchSize; i++) {
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

                info.skips -= info.batchSize;
            } else {
                try {
                    let result = await this.bet(roundBit(info.currentBet), info.currentPayout);
                    balance = result.balance;
                    getResult(result.multiplier);
                } catch (e) {
                    console.log("error in bet");
                    console.log(e);
                }
            }
        }
        while (info.skips >= 0) {
            try {
                if (info.run) {
                    let result = await this.bet(roundBit(info.currentBet), info.currentPayout);
                    balance = result.balance;
                    getResult(result.multiplier);
                } else {
                    let result = await this.skip();
                    getResult(result.multiplier);
                    info.skips--;
                }
            } catch (e) {
                console.log("error in last");
                console.log(e);
                break;
            }
        }
        base(true);
    })();
}