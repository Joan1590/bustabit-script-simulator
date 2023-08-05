// Area of script data
import CryptoJS from 'crypto-js'
import Table from 'cli-table3'
import EventEmitter from 'events'
import { SimProfiler } from '../SimProfiler.js';

globalThis.runTimes = { contextSetup: 0, gameGeneration: 0, scriptSetup: 0, simRunning: 0, simFinalize: 0, simResults: 0 }
globalThis.logFuncs = { log: console.log, warn: console.warn, info: console.info, error: console.error, debug: console.debug }

const profiler = new SimProfiler(logFuncs.log);

function hashToBust(seed) {
  const nBits = 52
  const hmac = CryptoJS.HmacSHA256(CryptoJS.enc.Hex.parse(seed), '0000000000000000004d6ec16dafe9d8370958664c1dc422f452892264c59526')
  seed = hmac.toString(CryptoJS.enc.Hex)
  seed = seed.slice(0, nBits / 4)
  const r = parseInt(seed, 16)
  let X = r / Math.pow(2, nBits)
  X = 99 / (1 - X)
  const result = Math.floor(X)
  return Math.max(1, result / 100)
}

function hashToBusts(seed, amount) {
  if (isNaN(amount) || amount <= 0) {
    throw new TypeError('amount must be a number larger than zero.')
  }
  let prevHash = seed
  const result = []
  result.unshift({ hash: prevHash, bust: hashToBust(String(prevHash)) })
  for (let index = 0; index < amount; index++) {
    let hash = String(CryptoJS.SHA256(String(prevHash)))
    let bust = hashToBust(hash)
    result.unshift({ hash, bust })
    prevHash = hash
  }
  return result
}

class SimulatedHistory {
  constructor(size) {
    this.data = new Array(size);
    this.size = size;
  }
  get length() { return this.data.length }
  get start() { return 0 }
  get end() { return this.size - 1; }
  first() { return this.size > 0 ? this.data[0] : null }
  last() { return this.size > 0 ? this.data[this.size - 1] : null }
  toArray() { return this.data.slice() }
  addGame(game) {
    for (let i = this.length - 1; i > 0; i--) {
      this.data[i] = this.data[i - 1];
    }
    this.data[0] = game;
  }
}

class SimulatedEngine extends EventEmitter {
  constructor() {
    super()
    this._userInfo = {
      uname: 'Anonymous',
      balance: 0,
      balanceATH: 0,
      balanceATL: 0,
      gamesTotal: 0,
      gamesPlayed: 0,
      gamesSkipped: 0,
      gamesWon: 0,
      gamesLost: 0,
      sinceWin: 0,
      winStreak: 0,
      sinceLose: 0,
      loseStreak: 0,
      streakSum: 0,
      sumWagers: 0,
      highBet: 0,
      lowBet: 0,
      avgBet: 0,
      highPayout: 0,
      lowPayout: 0,
      avgPayout: 0,
      resilience: [],
      pastWagers: [],
      profit: 0,
      profitATH: 0,
      profitATL: 0,
      profitPerHour: 0,
      duration: 0,
      durationRec: 0
    }
    this.history = new SimulatedHistory(50)
    this.bet = this.bet.bind(this)
  }

  getCurrentBet() {
    if (!this.next) return undefined
    return { wager: this.next.wager, payout: this.next.payout }
  }

  isBetQueued() {
    return !!this.next
  }

  cancelQueuedBet() {
    this.next = undefined
  }

  bet(wager, payout) {
    // 'bet' returns a Promise, just like on bustabit
    return new Promise((resolve, reject) => {
      this.next = { wager, payout: Math.round(payout * 100) / 100, isAuto: true, resolve, reject }
    }).catch(error => console.error(error))
  }

}

function evalScript() {
  const { config, engine, userInfo, log, stop, gameResultFromHash, SHA256 } = this // eslint-disable-line no-unused-vars
  // eslint-disable-next-line
  eval(arguments[0])
}

function simulate(text, config, startingBalance, gameHash, gameAmount, scriptLogging) {
  return new Promise((resolve, reject) => {
    logFuncs.log(`Setting up simulation environment..`)
    profiler.start('Environment Setup')
    let logMessages = '';
    let shouldStop = false;
    let shouldStopReason = undefined;

    const engine = new SimulatedEngine()
    const userInfo = engine._userInfo

    const log = function () {
      let msg = Array.prototype.slice.call(arguments)
      logMessages += msg.join(' ') + '\n'
      msg.unshift('LOG:')
      logFuncs.log(...msg)
    }

    const stop = function (reason) {
      shouldStopReason = reason
      shouldStop = true
    }

    const gameResultFromHash = function (hash) {
      return hashToBust(hash);
    }

    const SHA256 = function (value) {
      return String(CryptoJS.SHA256(String(value)));
    }

    if (!scriptLogging) {
      console.log = console.warn = console.info = console.error = console.debug = function () { return }
      log(`Script logging is disabled`)
    }

    engine.on('error', (e) => {
      log(`Error: ${e}`)
      endSimulation()
    })

    log('Script starting')

    userInfo.balance = startingBalance
    userInfo.balanceATH = startingBalance
    userInfo.balanceATL = startingBalance

    const results = {
      duration: 0,
      startingBalance: startingBalance,
      balance: startingBalance, balanceATH: startingBalance, balanceATL: startingBalance,
      gamesTotal: 0, gamesPlayed: 0, gamesSkipped: 0, gamesWon: 0, gamesLost: 0,
      highBet: 0, lowBet: 0, avgBet: 0,
      highPayout: 0, lowPayout: 0, avgPayout: 0, favPayout: 0,
      winStreak: 0, loseStreak: 0, streakSum: 0,
      profit: 0, profitPerHour: 0, profitPerDay: 0, profitATH: 0, profitATL: 0,
      message: '', log: logMessages
    }
    const context = { config, engine, userInfo, log: (!scriptLogging ? () => { } : log), stop, gameResultFromHash, SHA256 }
    runTimes.contextSetup = profiler.stop('Environment Setup')
    profiler.start('Game Result Generation')
    const games = hashToBusts(gameHash, gameAmount + engine.history.size);
    const gamesLen = games.length;

    for (let i = 0; i < engine.history.size; i++) {
      const g = games[i];
      engine.history.addGame({ id: i, hash: g.hash, bust: g.bust, wager: 0, cashedAt: 0, isSimulation: true })
    }
    runTimes.gameGeneration = profiler.stop('Game Result Generation')
    profiler.start('Script Setup')
    evalScript.call(context, text)
    runTimes.scriptSetup = profiler.stop('Script Setup')
    profiler.start('Simulation')
    nextGame(engine.history.size - 1)

    function nextGame(id) {
      id++
      setImmediate(() => {
        if (id < gamesLen && !shouldStop) {
          doGame(id)
        } else {
          endSimulation()
        }
      })
    }

    function endSimulation() {
      runTimes.simRunning = profiler.stop('Simulation')
      profiler.start('Cleanup')
      if (!!scriptLogging) {
        console.log = logFuncs.log
        console.warn = logFuncs.warn
        console.info = logFuncs.info
        console.error = logFuncs.error
        console.debug = logFuncs.debug
      }
      if (shouldStop && shouldStopReason) {
        log(shouldStopReason)
      }

      if (userInfo.streakSum < userInfo.sumWagers) {
        userInfo.streakSum = userInfo.sumWagers
      }

      results.duration = userInfo.duration
      results.durationRec = userInfo.durationRec
      results.startingBalance = startingBalance
      results.balance = userInfo.balance
      results.gamesTotal = userInfo.gamesTotal
      results.gamesPlayed = userInfo.gamesPlayed
      results.gamesSkipped = userInfo.gamesSkipped
      results.gamesWon = userInfo.gamesWon
      results.gamesLost = userInfo.gamesLost
      results.profit = userInfo.profit
      results.highBet = userInfo.highBet
      results.lowBet = userInfo.lowBet
      results.avgBet = userInfo.avgBet
      let allWagers = userInfo.pastWagers.map(a => a.wager);
      let topWagers = allWagers.reduce((a, b) => (a[b] = (a[b] ? a[b] + 1 : 1), a), {});
      results.favBet = Object.entries(topWagers).reduce((a, b) => (b[1] > a[1] ? b : a), [null, 0])[0];
      results.medBet = allWagers.sort((a, b) => (a - b))[Math.floor(allWagers.length / 2)];
      results.highPayout = userInfo.highPayout
      results.lowPayout = userInfo.lowPayout
      results.avgPayout = userInfo.avgPayout
      let allPayouts = userInfo.pastWagers.map(a => a.payout);
      let topPayouts = allPayouts.reduce((a, b) => (a[b] = (a[b] ? a[b] + 1 : 1), a), {});
      results.favPayout = Object.entries(topPayouts).reduce((a, b) => (b[1] > a[1] ? b : a), [null, 0])[0];
      results.medPayout = allPayouts.sort((a, b) => a - b)[Math.floor(allPayouts.length / 2)];
      results.streakSum = userInfo.streakSum
      results.loseStreak = userInfo.loseStreak
      results.winStreak = userInfo.winStreak
      results.profitATH = userInfo.profitATH
      results.profitATL = userInfo.profitATL
      results.balanceATH = userInfo.balanceATH
      results.balanceATL = userInfo.balanceATL
      results.profitPerHour = results.profit / (results.duration / (1000 * 60 * 60))
      results.profitPerDay = results.profit / (results.duration / (1000 * 60 * 60 * 24))
      results.message = `${userInfo.gamesPlayed} Games played. ${results.profit > 0 ? 'Won' : 'Lost'} ${(results.profit / 100)} bits. ${results.message || ''}`
      //results.history = engine.history
      //results.scriptLog = logMessages
      runTimes.simFinalize = profiler.stop('Cleanup')
      resolve(results)
    }

    function doGame(id) {
      const game = games[id]
      game.id = id
      game.isSimulation = false
      game.wager = 0
      game.cashedAt = 0
      userInfo.gamesTotal++;

      // set gameState, just like bustabit
      engine.gameState = 'GAME_STARTING'
      engine.gameId = id
      // emit event, just like bustabit
      engine.emit('GAME_STARTING', { gameId: id })

      // engine.next is set when engine.bet(wager, payout) is called
      // probably just like bustabit
      const bet = engine.next
      engine.next = null

      if (bet) {
        // reject with specific strings, just like bustabit
        if (isNaN(bet.wager) || bet.wager < 100 || (bet.wager % 100 !== 0)) {
          bet.reject('INVALID_BET')
          return endSimulation()
        }
        if (isNaN(bet.payout)) {
          bet.reject('cannot parse JSON')
          return endSimulation()
        }
        if (userInfo.balance - bet.wager < 0) {
          bet.reject('BET_TOO_BIG')
          userInfo.sumWagers += bet.wager
          return endSimulation()
        }
        if (bet.payout <= 1) {
          bet.reject('payout is too low')
          return endSimulation()
        }

        // decrease balance, just like bustabit

        if (bet.wager > 0) {
          userInfo.balance -= bet.wager
          userInfo.gamesPlayed++
          userInfo.sumWagers += bet.wager
        }
        // resolve with null, just like bustabit
        bet.resolve(null)

        // emit event, just like bustabit
        engine.emit('BET_PLACED', {
          uname: userInfo.uname,
          wager: bet.wager,
          payout: bet.payout
        })
      }

      engine.emit('GAME_STARTED', null)

      // set gameState, just like bustabit
      engine.gameState = 'GAME_IN_PROGRESS'

      // set wager and cashedAt, just like bustabit
      // eslint-disable-next-line no-sequences
      game.wager = game.cashedAt = 0
      if (bet) {
        game.wager = bet.wager
        if (bet.payout <= game.bust) {
          game.cashedAt = bet.payout
        }
      }

      if (game.wager !== 0) {
        // update balance, just like bustabit
        userInfo.balance += game.cashedAt * game.wager

        // update ATL/ATH stats if new balance surpasses it
        if (userInfo.balance < userInfo.balanceATL) { userInfo.balanceATL = userInfo.balance }
        if (userInfo.balance > userInfo.balanceATH) { userInfo.balanceATH = userInfo.balance }

        // update the net profit stat
        userInfo.profit = userInfo.balance - startingBalance

        // update the wager ATL/ATH stats
        if (!userInfo.lowBet || game.wager < userInfo.lowBet) { userInfo.lowBet = game.wager }
        if (!userInfo.highBet || game.wager > userInfo.highBet) { userInfo.highBet = game.wager }

        if (!userInfo.avgBet) userInfo.avgBet = game.wager;
        else userInfo.avgBet = (userInfo.avgBet * (userInfo.gamesPlayed - 1) + game.wager) / userInfo.gamesPlayed;

        if (!userInfo.lowPayout || bet.payout < userInfo.lowPayout) { userInfo.lowPayout = bet.payout }
        if (!userInfo.highPayout || bet.payout > userInfo.highPayout) { userInfo.highPayout = bet.payout }

        if (!userInfo.avgPayout) userInfo.avgPayout = bet.payout;
        else userInfo.avgPayout = (userInfo.avgPayout * (userInfo.gamesPlayed - 1) + bet.payout) / userInfo.gamesPlayed;

        userInfo.pastWagers.push({ "game": userInfo.gamesTotal, "wager": bet.wager, "payout": bet.payout });

        // update the profit ATL/ATH stats
        if (userInfo.profit < userInfo.profitATL) { userInfo.profitATL = userInfo.profit }
        if (userInfo.profit > userInfo.profitATH) { userInfo.profitATH = userInfo.profit }

        if (game.cashedAt > 0) {
          // won!
          userInfo.gamesWon++;
          userInfo.sinceWin = 0
          userInfo.sinceLose++

          if (userInfo.sinceLose > userInfo.winStreak) {
            userInfo.winStreak = userInfo.sinceLose
          }
          if (userInfo.streakSum < userInfo.sumWagers) {
            userInfo.streakSum = userInfo.sumWagers
          }

          userInfo.sumWagers = 0
          // emit event, just like bustabit
          engine.emit('CASHED_OUT', {
            uname: userInfo.uname,
            cashedAt: game.cashedAt,
            wager: game.wager
          });
        } else {
          // lost
          userInfo.gamesLost++;
          userInfo.sinceLose = 0
          userInfo.sinceWin++
          if (userInfo.sinceWin > userInfo.loseStreak) {
            userInfo.loseStreak = userInfo.sinceWin
          }
        }
      } else {
        userInfo.gamesSkipped++;
      }

      // add game to history, just like bustabit
      engine.history.addGame(game);

      // game duration is derived from bust value
      userInfo.duration += Math.log(game.bust) / 0.00006

      // set gameState, just like bustabit
      engine.gameState = 'GAME_ENDED'
      // emit event, just like bustabit
      engine.emit('GAME_ENDED', { hash: game.hash, bust: game.bust })

      nextGame(id)
    }
  });
}

function formatBalance(amount) {
  return (Number(amount) / 100).toFixed(2) + ' bits';
}

function formatPayout(payout) {
  return Number(payout).toFixed(2) + 'x';
}

function formatGames(amount) {
  return `${Math.trunc(amount)} games`;
}

function printResults(results) {
  profiler.start('Reporting Results');
  logFuncs.log('\n\x1b[1m----------- simulation ended -----------')
  var resultTable = new Table({ colWidths: [20, 15, 15, 16, 16, 17] });
  resultTable.push(
    [{ colSpan: 1, rowSpan: 2, vAlign: 'bottom', hAlign: 'right', content: 'Games' }, 'Games Skipped', 'Games Wagered', 'Games Won', 'Games Lost', 'Games Total'],
    [
      formatGames(results.gamesSkipped),
      formatGames(results.gamesPlayed),
      formatGames(results.gamesWon),
      formatGames(results.gamesLost),
      formatGames(results.gamesTotal)
    ], [
    { hAlign: 'right', content: 'Ratios' },
    `${((results.gamesSkipped / results.gamesTotal) * 100).toFixed(2)}% / All`,
    `${((results.gamesPlayed / results.gamesTotal) * 100).toFixed(2)}% / All`,
    `${((results.gamesWon / results.gamesPlayed) * 100).toFixed(2)}% / Bets`,
    `${((results.gamesLost / results.gamesPlayed) * 100).toFixed(2)}% / Bets`,
    ''
  ])
  logFuncs.log(resultTable.toString())
  var resultTable = new Table({ colWidths: [20, 20, 20, 20, 20] });
  resultTable.push([
    { colSpan: 1, rowSpan: 3, vAlign: 'center', hAlign: 'right', content: 'Longest Streaks' },
    { colSpan: 2, rowSpan: 1, hAlign: 'center', content: 'Losing' },
    { colSpan: 2, rowSpan: 1, hAlign: 'center', content: 'Winning' }
  ], [
    { hAlign: 'center', content: 'Length' },
    { hAlign: 'center', content: 'Cost' },
    { hAlign: 'center', content: 'Length' },
    { hAlign: 'center', content: 'Earn' }],
    [
      formatGames(results.loseStreak),
      formatBalance(results.streakSum),
      formatGames(results.winStreak),
      'TODO'
    ]
  );
  logFuncs.log(resultTable.toString());
  resultTable = new Table({ colWidths: [20, 20, 20, 20, 20] });
  resultTable.push(
    [{ colSpan: 1, rowSpan: 2, vAlign: 'bottom', hAlign: 'right', content: 'Balance' }, "Starting", "Ending", "ATH", "ATL"],
    [
      formatBalance(results.startingBalance),
      formatBalance(results.balance),
      formatBalance(results.balanceATH),
      formatBalance(results.balanceATL)
    ])
  logFuncs.log(resultTable.toString())
  resultTable = new Table({ colWidths: [20, 15, 15, 16, 16, 17] });
  resultTable.push(
    [{ colSpan: 1, rowSpan: 2, vAlign: 'bottom', hAlign: 'right', content: 'Wager' }, "Lowest", "Highest", "Mean", "Median", "Mode"],
    [
      formatBalance(results.lowBet),
      formatBalance(results.highBet),
      formatBalance(results.avgBet),
      formatBalance(results.medBet),
      formatBalance(results.favBet)],
    [
      { colSpan: 1, hAlign: 'right', content: 'Payout' },
      formatPayout(results.lowPayout),
      formatPayout(results.highPayout),
      formatPayout(results.avgPayout),
      formatPayout(results.medPayout),
      formatPayout(results.favPayout),
    ])
  logFuncs.log(resultTable.toString())
  resultTable = new Table({ colWidths: [20, 20, 20, 20, 20] });
  resultTable.push(
    [
      { colSpan: 1, rowSpan: 1, hAlign: 'center', content: 'Total Profit' },
      { colSpan: 1, rowSpan: 1, hAlign: 'center', content: 'Profit ATL' },
      { colSpan: 1, rowSpan: 1, hAlign: 'center', content: 'Profit ATH' },
      { colSpan: 1, rowSpan: 1, hAlign: 'center', content: 'Profit per Hour' },
      { colSpan: 1, rowSpan: 1, hAlign: 'center', content: 'Profit per Day' }
    ], [
    { colSpan: 1, rowSpan: 1, hAlign: 'center', content: formatBalance(results.profit) },
    { colSpan: 1, rowSpan: 1, hAlign: 'center', content: formatBalance(results.profitATL) },
    { colSpan: 1, rowSpan: 1, hAlign: 'center', content: formatBalance(results.profitATH) },
    { colSpan: 1, rowSpan: 1, hAlign: 'center', content: formatBalance(results.profitPerHour) },
    { colSpan: 1, rowSpan: 1, hAlign: 'center', content: formatBalance(results.profitPerDay) }
  ]);
  logFuncs.log(resultTable.toString());

  resultTable = new Table({ colWidths: [20, 20, 20, 20, 20] });
  logFuncs.log('----------------------------------------\n\x1b[0m');
  runTimes.simResults = profiler.stop('Reporting Results');
  let totalTime = Object.values(runTimes).reduce((a, b) => a + b);
  logFuncs.log(`LOG: Took ${totalTime}ms total`)
}
if (process.argv.length < 5) {
  console.log('Invalid arguments')
  process.exit(1)
} else {
  let h = process.argv[3];
  if (!h || h == "rand" || h == "") {
    h = String(CryptoJS.SHA256(String(Math.random().toString() + Date.now())))
  }
  simulate(scriptText, config, Number(process.argv[2]), h, Number(process.argv[4]), (process.argv[5] !== "False")).then(printResults)
}