var config = {

};
let baseWager = 10,
    basePayout = 2.5;
// let window = this;
// Object.entries(config).forEach((c)=>window[c[0]]=eval(c[1].value));
let wager = baseWager, payout = basePayout, results = [], timeout = 0;
let upperThreshold = 1.9, lowerThreshold = 1.6;
let span = Math.round((Math.log(1 / 1e6) / Math.log(1 - (0.95 / basePayout))));

Array.prototype.quantile = function (q = 0.5) {
    let data = this.slice().sort((a, b) => a - b);
    let pos = (data.length - 1) * q;
    let base = Math.floor(pos);
    if (data[base + 1] !== undefined) {
        return data[base] + (pos - base) * (data[base + 1] - data[base]);
    }
    return data[base];
}

Array.prototype.movingAvg = function (len = 1) {
    return this.slice().map((num, idx, arr) => arr
        .slice(idx, idx + len)
        .reduce((a, b) => a + b, 0) / len);
};

Array.prototype.standardDeviation = function (q = 0.5) {
    return Math.sqrt(this
        .map(x => Math.pow(x - this.median(), 2))
        .reduce((a, b) => a + b, 0) / this.length);
}

Array.prototype.median = function () {
    let data = this.slice().sort((a, b) => a - b);
    return data[Math.floor(data.length / 2)];
}

Array.prototype.average = function () {
    return this.reduce((a, b) => a + b, 0) / this.length;
}

Array.prototype.variance = function (q = 0.5) {
    let avg = this.average();
    return (this
        .map(x => Math.pow(x - avg, 2))
        .reduce((a, b) => a + b, 0) / this.length);
}

Array.prototype.rollRegressionWin = function () {
    var arr = new Array();
    for (i in this) {
        if (i != "regressionWin") {
            arr[i] = this[i];
        }
    }
    var countLR = arr.length - 1;
    var sumX = 0, sumY = 0;
    var sumXSquared = 0, sumYSquared = 0, sumXY = 0;
    for (i = 0; i < arr.length; i++) {
        var point = arr[i];
        sumX += point[0];
        sumY += point[1];
        sumXY += point[0] * point[1];
        sumXSquared += point[0] * point[0];
        sumYSquared += point[1] * point[1];
    }
    var a = (countLR * sumXY - sumX * sumY) / (countLR * sumXSquared - sumX * sumX);
    var b = (sumY - a * sumX) / countLR;
    var x = (Math.max(...arr.map(x => x[0])) + 1);
    var y = (a * x + b) / x;
    return y;
};

let win = false, winLast = true, loseLast = true;
let regwins = [], mavg = [];

engine.on('GAME_STARTING', () => {
    let med = results.slice(-span).quantile();
    let sdev = results.slice(-span).standardDeviation();
    let fmlist = results.map((val, ind, arr) => arr[ind + 1] - arr[ind]).slice(0, -1);
    mavg = fmlist.movingAvg().slice(-1)[0];
    regwins = results.slice(-mavg).movingAvg();
    let winchance = regwins.slice(-1)[0];
    if (med <= upperThreshold && med >= lowerThreshold && timeout < 1 && winchance > 1.5) {
        engine.bet(roundBit(wager), payout);
    }
    if (timeout > 0) timeout--;
});

engine.on('GAME_ENDED', () => {
    let lastGame = engine.history.first();
    results.push(lastGame.bust);
    winLast = (lastGame.cashedAt > 0);
    loseLast = (lastGame.cashedAt < 0);
    if (lastGame.bust >= payout) timeout = 3;
    if (!lastGame.wager) return;
    if (lastGame.cashedAt) {
        wager = baseWager;
        if (results.slice(-3).quantile() >= payout) timeout = 3;
    } else {
        wager *= (payout / (payout - 1));
        if (!win) { upperThreshold += 0.1; }
        if (win) { lowerThreshold -= 0.1; }
        if (upperThreshold > 1.9 || regwins.slice(-1)[0] < 1.5) {
            win = false;
            upperThreshold = 1.9;
        }
        if (lowerThreshold < 1.6 || regwins.slice(-1)[0] < 1.5) {
            win = true;
            lowerThreshold = 1.6;
        }
    }
    if (upperThreshold > 2.5) upperThreshold = 2.5;
    if (upperThreshold < 1.6) upperThreshold = 1.6;
    if (lowerThreshold < 1.2) lowerThreshold = 1.2;
    if (lowerThreshold > 2) lowerThreshold = 2;

});
function roundBit(bet) { return Math.max(100, Math.round(bet / 100) * 100); }