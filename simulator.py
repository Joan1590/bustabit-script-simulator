from tokenize import String
import misc
import merger
import cleaner
import argparse
import subprocess

class Simulator:
    tempdir = "./.temp"
    args = []

    def __init__(self, args):
        self.args = args

        # cleaner.Cleaner(self.args, self.tempdir).clean()
        merger.Merger(self.args, self.tempdir).merge()

    def start(self):
        print("Starting...")
        print(self.args)
        subprocess.run(["node", self.tempdir + "/" + "script.js", str(self.args.balance * 100), str(self.args.hash).lower(), str(self.args.games), str(self.args.logs)])

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("script",           help="Path to script file to be simulated.", type=misc.isFileExist)
    parser.add_argument("-b", "--balance",  help="Amount of initial balance to start the simulation with.", type=int, default=10000)
    parser.add_argument("-e", "--hash",     help="Ending hash to generate the games from.", type=str, default='rand')
    parser.add_argument("-g", "--games",    help="Number of games to be played in the simulation", type=int, default=10000)
    parser.add_argument("-l", "--logs",     help="Enable the script log output to the console.", action='store_true')
    Simulator(parser.parse_args()).start()
    exit(0)