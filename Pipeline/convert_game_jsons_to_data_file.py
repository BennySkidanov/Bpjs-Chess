import json
import sqlite3
import statistics
import random
import pandas as pd
import ast

POP_SIZE = 150  # population size
ELITISM = 2
GENERATIONS = 100  # maximal number of generations to run GA
TOURNAMENT_SIZE = 5  # size of tournament for tournament selection
PROB_MUTATION = 0.1  # bitwise probability of mutation
GENOME_SIZE = 25
WEIGHT_RANGE_MIN = -10
WEIGHT_RANGE_MAX = 10

NUMBER_OF_ANALYZED_GAMES = 23400
NONE_VALUE = -1
game = {}
CHECK_SIGN = '+'
MATE_SIGN = '#'
TAKES_SIGN = 'x'

# Categories to help classify chosen move better
STRENGTHEN_CENTER_LABEL = 1
DEVELOP_PIECES_LABEL = 2
FIANCHETTO_LABEL = 3
PAWN_STRUCTURE_LABEL = 4
TAKES_MOVE_LABEL = 5
OTHER = 6

prefix_dictionary = {"Pawn": "", "Knight": "N", "Bishop": "B", "Rook": "R", "Queen": "Q", "King": "K"}
columns_single_move = ["Game number", "Move number", "Move Description",
                       "Piece Advisor: Pawn", "Piece Advisor: Bishop", "Piece Advisor: Knight",
                       "Piece Advisor: Rook", "Piece Advisor: Queen",
                       "Piece Moves Counter: Pawn moves", "Piece Moves Counter: Bishop moves",
                       "Piece Moves Counter: Knight moves",
                       "Piece Moves Counter: Rook moves", "Piece Moves Counter: Queen moves",
                       u"Strategy Advisor: Center", "Strategy Advisor: Develop", "Strategy Advisor: Fianchetto",
                       "Strategy Counter: Center strengthen moves", "Strategy Counter: Developing moves",
                       "Strategy Counter: Fianchetto moves",
                       "Game Plan Counter: Scholars Mate", "Game Plan Counter: Deceiving Scholars Mate",
                       "Game Plan Counter: Fried Liver Attack",
                       "Game Plan Counter: Capturing Space", "Game Plan Counter: Strengthen Pawn Structure",
                       "Moves Counter: Attacking", "Moves Counter: Defending",
                       "Moves Counter: Preventing b4, g4 Attacks",
                       "Developing the queen too early"]

original_columns_single_move_length = len(columns_single_move)

conn = sqlite3.connect('chess_moves.db')
cursor = conn.cursor()


def create_db():
    # Create the table
    cursor.execute('''CREATE TABLE IF NOT EXISTS chess_moves (
                        Game_number INTEGER,
                        Move_number INTEGER,
                        Move_Description TEXT,
                        Piece_Advisor_Pawn INTEGER,
                        Piece_Advisor_Bishop INTEGER,
                        Piece_Advisor_Knight INTEGER,
                        Piece_Advisor_Rook INTEGER,
                        Piece_Advisor_Queen INTEGER,
                        Piece_Moves_Counter_Pawn_moves INTEGER,
                        Piece_Moves_Counter_Bishop_moves INTEGER,
                        Piece_Moves_Counter_Knight_moves INTEGER,
                        Piece_Moves_Counter_Rook_moves INTEGER,
                        Piece_Moves_Counter_Queen_moves INTEGER,
                        Strategy_Advisor_Center INTEGER,
                        Strategy_Advisor_Develop INTEGER,
                        Strategy_Advisor_Fianchetto INTEGER,
                        Strategy_Counter_Center_strengthen_moves INTEGER,
                        Strategy_Counter_Developing_moves INTEGER,
                        Strategy_Counter_Fianchetto_moves INTEGER,
                        Game_Plan_Counter_Scholars_Mate INTEGER,
                        Game_Plan_Counter_Deceiving_Scholars_Mate INTEGER,
                        Game_Plan_Counter_Fried_Liver_Attack INTEGER,
                        Game_Plan_Counter_Capturing_Space INTEGER,
                        Game_Plan_Counter_Strengthen_Pawn_Structure INTEGER,
                        Moves_Counter_Attacking INTEGER,
                        Moves_Counter_Defending INTEGER,
                        Moves_Counter_Preventing_b4_g4_Attacks INTEGER,
                        Developing_the_queen_too_early INTEGER
                    )''')

    # Add LOOK_AHEAD columns dynamically
    for att_index in range(3, GENOME_SIZE):
        cursor.execute('''ALTER TABLE chess_moves ADD COLUMN LOOK_AHEAD_{} INTEGER'''.format(
            columns_single_move[att_index].replace(" ", "").replace(":", "_")))

    cursor.execute('''ALTER TABLE chess_moves ADD COLUMN Y INTEGER''')


def add_row_to_db(row):
    insert_statement = f'''INSERT INTO chess_moves (Game_number, Move_number, Move_Description, 
                                        Piece_Advisor_Pawn, Piece_Advisor_Bishop, Piece_Advisor_Knight, Piece_Advisor_Rook, Piece_Advisor_Queen, 
                                        Piece_Moves_Counter_Pawn_moves, Piece_Moves_Counter_Bishop_moves, Piece_Moves_Counter_Knight_moves, 
                                        Piece_Moves_Counter_Rook_moves, Piece_Moves_Counter_Queen_moves, Strategy_Advisor_Center, 
                                        Strategy_Advisor_Develop, Strategy_Advisor_Fianchetto, Strategy_Counter_Center_strengthen_moves, 
                                        Strategy_Counter_Developing_moves, Strategy_Counter_Fianchetto_moves, Game_Plan_Counter_Scholars_Mate, 
                                        Game_Plan_Counter_Deceiving_Scholars_Mate, Game_Plan_Counter_Fried_Liver_Attack, Game_Plan_Counter_Capturing_Space, 
                                        Game_Plan_Counter_Strengthen_Pawn_Structure, Moves_Counter_Attacking, Moves_Counter_Defending, 
                                        Moves_Counter_Preventing_b4_g4_Attacks, Developing_the_queen_too_early'''

    # Dynamically add placeholders for LOOK_AHEAD attributes
    for i in range(3, GENOME_SIZE):
        insert_statement += f', LOOK_AHEAD_{columns_single_move[i].replace(" ", "").replace(":", "_")}'

    insert_statement += ', Y)'

    # Add VALUES clause with placeholders for all attributes including LOOK_AHEAD
    insert_statement += 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?'

    # Add placeholders for LOOK_AHEAD attributes
    for _ in range(3, GENOME_SIZE):
        insert_statement += ', ?'
    insert_statement += ')'

    # Prepare values for the SQL INSERT statement
    values = (game_number, move_number, selectable_move_str, row["Piece Advisor: Pawn"], row["Piece Advisor: Bishop"],
              row["Piece Advisor: Knight"], row["Piece Advisor: Rook"], row["Piece Advisor: Queen"],
              row["Piece Moves Counter: Pawn moves"], row["Piece Moves Counter: Bishop moves"],
              row["Piece Moves Counter: Knight moves"], row["Piece Moves Counter: Rook moves"],
              row["Piece Moves Counter: Queen moves"], row["Strategy Advisor: Center"],
              row["Strategy Advisor: Develop"], row["Strategy Advisor: Fianchetto"],
              row["Strategy Counter: Center strengthen moves"], row["Strategy Counter: Developing moves"],
              row["Strategy Counter: Fianchetto moves"], row["Game Plan Counter: Scholars Mate"],
              row["Game Plan Counter: Deceiving Scholars Mate"], row["Game Plan Counter: Fried Liver Attack"],
              row["Game Plan Counter: Capturing Space"], row["Game Plan Counter: Strengthen Pawn Structure"],
              row["Moves Counter: Attacking"], row["Moves Counter: Defending"],
              row["Moves Counter: Preventing b4, g4 Attacks"], row["Developing the queen too early"])


    # Add values of LOOK_AHEAD attributes to the values tuple

    counter = 0
    for _ in range(3, GENOME_SIZE):
        values += (row[columns_single_move[counter + original_columns_single_move_length]],)
        counter += 1

    values += (row['Y'],)


    # Execute the SQL INSERT statement with row data
    cursor.execute(insert_statement, values)


def filter_major_attributes(attributes):
    major_attributes = {}
    for attribute in attributes:
        if not attribute.startswith('CTX'):
            major_attributes[attribute] = attributes[attribute]
    return major_attributes


# columns_names = ['selectable_events', 'major_attributes', 'look_ahead_attributes', 'event_played']

if __name__ == '__main__':
    create_db()

    games_data = {}

    for analyzed_game_index in range(1, NUMBER_OF_ANALYZED_GAMES + 1):
        single_game_path = '../GameSequences/Game' + str(analyzed_game_index) + '.json'
        # single_game_path = '[Daniel:DataFileName]/Game' + str(analyzed_game_index) + '.json'

        single_game_json = open(single_game_path)  # Obtain the JSON object which the path points to
        json_obj = json.load(single_game_json)

        counter = 1
        white = True

        for move_description in json_obj:
            # Dictionary which contains the 4 parts of every move - notice that the attributes value is filtered to get rid of all 'CTX' attributes
            move = {'move_selectable_events': move_description['SelectableEvents'],
                    'move_major_attributes': filter_major_attributes(move_description['CurrentAttributes']),
                    'move_look_ahead': move_description['SelectableEventsLookAhead'],
                    'move_played_event': move_description['SelectedEvent']}

            # print("move_selectable_event length => " + str(len(move['move_selectable_events'])))

            games_data['game_' + str(analyzed_game_index) + '_move_' + str(counter) + "_" + (
                "White" if white else "Black")] = move

            if not white:
                counter += 1

            white = not white

        single_game_json.close()

    print("Game Description is Ready")

    # data_len = len(games_data)  # Number of rows in dataset
    selectable_moves_max_length = NONE_VALUE

    for move in games_data.values():
        if len(move['move_selectable_events']) > selectable_moves_max_length:
            selectable_moves_max_length = len(move['move_selectable_events'])

    for att_index in range(3, GENOME_SIZE):
        columns_single_move.append("LOOK_AHEAD - " + columns_single_move[att_index])

    columns_single_move.append("Y")

    loop_counter = 0

    df_single_move = pd.DataFrame(columns=columns_single_move)

    index_single_move = 0

    print("Starting Loop!")

    for move_key, move_value in games_data.items():
        loop_counter += 1
        if loop_counter % 1000 == 0:
            print("Analyzed 1000 Moves")  # Debug purposes, can be ignored or deleted

        tokens = move_key.split('_')
        game_number = int(tokens[1])
        move_number = int(tokens[3])
        white_turn = True if tokens[4] == "White" else False
        if white_turn:
            move = (games_data[
                "game_" + str(game_number) + "_move_" + str(move_number) + ("_White" if white_turn else "_Black")])

            for index in range(0, len(move['move_selectable_events'])):
                row = {}

                att = 0
                for current_att_key, current_att_value in move['move_major_attributes'].items():
                    row[current_att_key] = current_att_value

                look_ahead_dict = ((move['move_look_ahead'][index])['Attributes'])[0]
                for look_ahead_attribute_index in range(len(look_ahead_dict)):
                    key = columns_single_move[look_ahead_attribute_index + 3]
                    row["LOOK_AHEAD - " + key] = look_ahead_dict[key]

                row['Y'] = 1 if move['move_played_event'] == move['move_selectable_events'][index] else 0
                selectable_move_str = ""
                if isinstance(move['move_selectable_events'][index]['data']['piece'], str):
                    selectable_move_str = prefix_dictionary[move['move_selectable_events'][index]['data']['piece']] + \
                                          move['move_selectable_events'][index]['data']['dst']
                else:
                    # print("HI")
                    selectable_move_str = prefix_dictionary[
                                              move['move_selectable_events'][index]['data']['piece']['subtype']] + \
                                          move['move_selectable_events'][index]['data']['dst']
                # print(selectable_move_str + "," + str(game_number) + "," + str(move_number))
                row['Move Description'] = selectable_move_str
                row["Move number"] = move_number
                row["Game number"] = game_number
                add_row_to_db(row)

    conn.commit()
    conn.close()

#                 df_single_move.loc[index_single_move] = row
#                 index_single_move += 1
#
# df_single_move.drop_duplicates(inplace=True)
# test = df_single_move.reset_index(drop=True)
# df_single_move.reset_index(drop=True, inplace=True)
#
# df_single_move.to_excel("my_new_test.xlsx")

print('\nData Is Ready!!')
