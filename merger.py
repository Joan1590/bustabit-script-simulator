"""
This module provides a class for merging a script with hyperparameters.
"""
import os
import misc

class Merger:
    """
    A class for merging a script with hyperparameters.

    Attributes:
    - enginefile (str): the name of the engine file to use for merging
    - tempdir (str): the name of the temporary directory to use for storing the merged script
    - script_path (str): the path to the script file to merge
    - hyperparameters (dict): a dictionary of hyperparameters to use for merging
    """

    enginefile = 'engine.js'
    tempdir = None

    def __init__(self, script_path, tempdir, hyperparameters=None):
        """
        Initializes a new instance of the Merger class.

        Parameters:
        - script_path (str): the path to the script file to merge
        - tempdir (str): the name of the temporary directory to use for storing the merged script
        - hyperparameters (dict): a dictionary of hyperparameters to use for merging
        """
        self.script_path = script_path
        self.tempdir = tempdir
        self.hyperparameters = hyperparameters

    def get_script(self):
        """
        Loads the script data, extracts the configuration from the script,
        updates the configuration with hyperparameters, and escapes backticks
        in the script.

        Returns:
        - script_lines (list): a list of lines representing the script
        - config_lines (list): a list of lines representing the configuration
        """
        # Load the script data
        data = misc.loadFile(self.script_path)

        # Extract the configuration from the script
        config = []
        for i, line in enumerate(data):
            if line.strip() == "var config = {":
                for config_line in data[i:]:
                    config.append(config_line)
                    if config_line.strip() == "};":
                        break

        # Update the configuration with hyperparameters
        if self.hyperparameters:
            for param, value in self.hyperparameters.items():
                # Update the value in the config lines
                for i, line in enumerate(config):
                    if line.strip().startswith(f'{param}:'):
                        # Find the value in the line
                        start = line.find('value:')
                        end = line.find(',', start)
                        if end == -1:
                            end = line.find('}', start)
                        old_value = line[start:end]
                        # Replace the value in the line
                        new_value = f'value: {value}'
                        config[i] = config[i].replace(old_value, new_value)
                        break

        # Escape backticks in the script
        for i, line in enumerate(data):
            data[i] = line.replace("`", "\\\\`")

        # Prepare the script and config lines
        config_lines = config
        script_lines = ["var scriptText = `"] + data + ["`;"]
        return script_lines, config_lines

    def merge(self):
        """
        Merges the script with hyperparameters and writes the merged script to file.
        """
        print("Merging with hyperparameters:", self.hyperparameters)
        script, config = self.get_script()
        engine = misc.loadFile(self.enginefile)
        temp = engine[:3] + config + ["\\n"] + script + ["\\n"] + engine[3:len(engine)]

        # Writing the merged script to file
        with open(os.getcwd() + "/" + self.tempdir + "/script.js", "w", encoding="utf-8") as file:
            for line in temp:
                file.write(line)
        print(f"'{self.script_path}' merged with hyperparameters")
