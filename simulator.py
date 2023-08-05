
"""
A class to simulate the game using the user script
"""
import os
import dukpy
import merger
import cleaner

class Simulator:
    """
    A class to simulate the game using the user script
    """
    def __init__(self, args):
        """
        Initializes the Simulator instance with the given arguments.
        """
        self.args = args
        self.balance = args.balance
        self.hash = args.hash
        self.games = args.games
        self.logs = args.logs
        self.merger = merger.Merger(os.path.abspath(args.script), self.logs)
        self.cleaner = cleaner.Cleaner(self.logs, self.merger.tempdir)

def start(self):
    """
    Starts the simulation
    """
    # Merging the engine with the user script
    merged_script_path = self.merger.merge()

    # Reading the merged JavaScript code
    with open(merged_script_path, 'r', encoding='utf-8') as merged_file:
        merged_code = merged_file.read()

    # Executing the merged JavaScript code using dukpy
    result = dukpy.evaljs(merged_code)

    # Performing cleanup
    self.cleaner.clean()

    return result

def __repr__(self):
    """
    Returns a string representation of the Simulator instance.
    """
    return f'Simulator(args={self.args}, balance={self.balance}, ' \
           f'hash={self.hash}, games={self.games}, logs={self.logs})'
