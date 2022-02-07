// Area of cryptohashes
import CryptoJS from 'crypto-js'
import fs from 'fs'

const baseBustabit = '0000000000000000004d6ec16dafe9d8370958664c1dc422f452892264c59526';

const gameResult = (seed, salt) => {
  const nBits = 52; // number of most significant bits to use

  // 1. HMAC_SHA256(message=seed, key=salt)  
  const hmac = CryptoJS.HmacSHA256(CryptoJS.enc.Hex.parse(seed), salt);
  seed = hmac.toString(CryptoJS.enc.Hex);

  // 2. r = 52 most significant bits
  seed = seed.slice(0, nBits / 4);
  const r = parseInt(seed, 16);

  // 3. X = r / 2^52
  let X = r / Math.pow(2, nBits); // uniformly distributed in [0; 1)

  // 4. X = 99 / (1-X)
  X = 99 / (1 - X);

  // 5. return max(trunc(X), 100)
  const result = Math.floor(X);
  return Math.max(1, result / 100);
}

// Config

function isInt(n) {
  return Number(n) === n && n % 1 === 0;
}

function isNumber(n) {
  return Number(n) === n;
}

const userInfo = { balance: 0 };

class Game {
  constructor(id, hash, wager) {
    this.id = id;
    this.hash = hash;
    this.bust = 0;
    this.cashedAt = undefined;
    this.wager = wager;
  }
}

class History {
  constructor() {
    this.history = [];
  }

  first() {
    return this.history[0];
  }

  last() {
    return this.history[this.history.length - 1];
  }

  toArray() {
    return this.history;
  }

  push(game) {
    this.history.unshift(game);
    if (this.history.length > 50) this.history.splice(-1, 1);
  }
}

class Engine {
  constructor(balance, games, displayCrashes) {
    this.games = games;
    this.gamePlayed = 0;
    this.gameSkipped = 0;
    this.index = 0;
    userInfo.balance = balance * 100;
    this.startingBalance = userInfo.balance;
    this.atl = userInfo.balance;
    this.ath = userInfo.balance;
    this.crash = userInfo.balance;
    this.crashInfo = undefined;
    this.crashList = [];
    this.displayCrashes = displayCrashes === 'true';
    this.gameState = 'GAME_INIT';
    this.gameStateOn = new Object();
    this.currentBet = undefined;
    this.currentPayout = undefined;
    this.history = new History();
  }

  get getState() {
    return this;
  }

  get getCurrentBet() {
    return this.currentBet;
  }

  isBetQueued() {
    return this.currentBet !== null;
  }

  cancelQueuedBet() {
    if (this.gameState === 'GAME_STARTING' && this.currentBet !== null) {
      this.currentBet = undefined;
      this.currentPayout = undefined;
      this.history.history.splice(0, 1);
    }
  }

  get gameState() {
    return this._gameState;
  }

  set gameState(value) {
    this._gameState = value;

    for (var prop in this.gameStateOn) {
      if (!this.gameStateOn.hasOwnProperty(prop)) continue;
      if (prop === this.gameState) this.gameStateOn[this.gameState]();
    }
  }

  bet(satoshis, payout) {
    if (this.gameState !== 'GAME_STARTING') {
      console.log('Error: cannot bet now');
      return;
    }
    if (!isInt(satoshis)) throw 'bet must be an Integer';
    if (!isNumber(payout)) throw 'payout must be a number';
    if (userInfo.balance - satoshis < 0) {
      this.logs();
      throw 'no enough bits (' + Math.round(userInfo.balance / 100) + '); bet: ' + satoshis;
    } else {
      userInfo.balance -= satoshis;
    }

    this.currentBet = satoshis;
    this.currentPayout = payout;
  }

  on(gameState, listener) {
    this.gameStateOn[gameState] = listener;
    console.log('Listener of ' + gameState + ' set');
  }

  removeListener(gameState, listener) {
    delete this.gameStateOn[gameState]
    console.log('Listener of ' + gameState + ' removed');
  }

  logs() {
    console.log('\n\x1b[1m-----------------------------------');
    console.log(' Game Played : ' + this.gamePlayed);
    console.log(' Game Skiped : '+ this.gameSkipped);
    console.log(' Starting Balance : ' + Math.round(this.startingBalance / 100));
    console.log(' Profit ATL : ' + (Math.round(this.atl / 100) - Math.round(this.startingBalance / 100)));
    console.log(' Profit ATH : ' + (Math.round(this.ath / 100) - Math.round(this.startingBalance / 100)));
    let profit = Math.round(userInfo.balance / 100) - Math.round(this.startingBalance / 100);
    if (profit > 0) {
      console.log(' Profit : \x1b[32m' + profit + '\x1b[0m\x1b[1m');
    } else {
      console.log(' Profit : \x1b[31m' + profit + '\x1b[0m\x1b[1m');
    }
    console.log(' Profit per Day : ' + Math.round((userInfo.balance - this.startingBalance) / 100 / (this.gamePlayed / 3800)));
    console.log(' Profit per Hour : ' + Math.round((userInfo.balance - this.startingBalance) / (this.gamePlayed / 3800) / 24) / 100);
    console.log(' Balance : ' + Math.round(userInfo.balance / 100));
    console.log('-----------------------------------\n\x1b[0m');
  }

  crashes() {
    console.log('List of the 25 biggest crashes (lowest ATL every 1000 games without counting profit):');
    console.log('ATL:GAMEID:HASH:BUST');
    this.crashList
      .sort(function (a, b) {
        return parseFloat(a[0]) - parseFloat(b[0]);
      })
      .splice(0, 25)
      .forEach(function (item) {
        console.log(item[0] + ':' + item[1] + ':' + item[2] + ':' + item[3]);
      });
  }

  onGameStarting() {
    //
  }

  onGameStarted() {
    let temp = this.games[this.index].split(':');
    let game = new Game(temp[0], temp[1], 0);
    this.history.push(game);

    this.history.first().bust = this.games[this.index].split(':')[2];

    if (this.currentPayout) {
      if (this.history.first().bust >= this.currentPayout) {
        // Won
        userInfo.balance += this.currentBet * this.currentPayout;
        this.history.first().cashedAt = this.currentPayout;
      }
    }else{
      this.gameSkipped++;
    }
  }

  onGameEnded() {
    this.atl = Math.min(this.atl, userInfo.balance);
    this.ath = Math.max(this.ath, userInfo.balance);
    if (userInfo.balance < this.crash) {
      this.crash = userInfo.balance;
      this.crashInfo = this.games[this.index].split(':');
    }
    this.currentBet = undefined;
    this.currentPayout = undefined;
    this.index++;
    this.gamePlayed++;
    if (this.gamePlayed % 1000 == 0 && this.crashInfo !== undefined) {
      this.crashInfo.unshift((this.crash - userInfo.balance) / 100);
      this.crashList.push(this.crashInfo);
      this.crash = userInfo.balance;
    }
  }

  gameLoop() {
    this.index = 0;
    while (this.index < this.games.length) {
      while (this.games[this.index].split(':').length != 3 || this.games[this.index][0] === '#') {
        this.index++;
        if (this.games[this.index] === undefined) break;
      }
      if (this.games[this.index] === undefined) break;
      this.gameState = 'GAME_STARTING';
      this.onGameStarting();
      this.gameState = 'GAME_STARTED';
      this.onGameStarted();
      this.gameState = 'GAME_ENDED';
      this.onGameEnded();
    }
    this.logs();
    if (this.displayCrashes) this.crashes();
  }
}

function gameResults(gameHash, gameAmount) {
  let games = [];
  let prevHash = gameHash;
  for (let index = 0; index < gameAmount; index++) {
    let hash = String(CryptoJS.SHA256(String(prevHash)));
    let bust = gameResult(hash, '0000000000000000004d6ec16dafe9d8370958664c1dc422f452892264c59526');

    games.push(`${index + 1}:${gameHash}:${bust}`);

    prevHash = hash;
  }

  return games;
}

function loadGames(hash, balance, displayCrashes) {

  var games = gameResults(hash, 1000);
  var engine = new Engine(balance, games.reverse(), displayCrashes);

  // Script

  try {
    engine.gameLoop();
    process.exit(0);
  } catch (err) {
    console.log('Error : ' + err);
    console.log('Simulation stopped');
    process.exit(1);
  }
}

if (process.argv[2] === undefined) {
  console.log('Invalid arguments');
  process.exit(1);
} else {
  loadGames(process.argv[2], parseInt(process.argv[3]), process.argv[4]);
}
