import json
import re

number_of_pgns = 5

special_castling_keys = ['O-O-O', 'O-O']

pgn_data_file = open(r'PGNData.txt', 'r')
lines = pgn_data_file.readlines()


def filter_pgns():
    for pgn_index in range(1, number_of_pgns + 1):
        pgn_json = open('Data_one_game/Game' + str(pgn_index) + ".json")
        pgn_data = json.load(pgn_json)
        pgn_line = lines[pgn_index - 1]
        pgn_line_tokens = re.split(' ', pgn_line)[1::2]
        number_of_castles = pgn_line_tokens.count('O-O') + pgn_line_tokens.count('O-O-O')
        if number_of_castles == 2:  # Both players have castled
            last_castle_move_index = max(loc for loc, val in enumerate(pgn_line_tokens) if val == 'O-O' or val == 'O-O-O')
            updated_pgn_data = pgn_data[:last_castle_move_index + 1]
            pass
        else:  # Cut 10 moves
            updated_pgn_data = pgn_data[:20]

        with open("Data_mixed_updated_filtered/Game" + str(pgn_index) + ".json", "w") as jsonFile:
            json.dump(updated_pgn_data, jsonFile)
        pgn_json.close()


if __name__ == '__main__':
    filter_pgns()
