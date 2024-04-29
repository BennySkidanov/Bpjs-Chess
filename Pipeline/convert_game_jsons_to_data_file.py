import json
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

NUMBER_OF_ANALYZED_GAMES = 300
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


def classify_label(chosen_move, attributes):
    label = OTHER

    return label


def calculate_state_grade(individual, attributes):
    ret_val = 0
    # values = [int(weight * attributes[0][dic]) for weight, dic in zip(individual, attributes[0])]

    # ret_val = sum(values)
    i = 0
    for key in attributes[0].keys():
        if individual[i] is None:
            print("HI")
        if attributes[0][key] is None:
            print("HH")
        ret_val += individual[i] * attributes[0][key]
        i += 1

    # print("fitness = " + str(ret_val))
    return ret_val


def fitness(individual, game):
    # Individual = Array of weights, e.g. [ 1, 8, 4, 6, 7, 2, 1, ... ]
    action_grades = {}
    for move_key, move_desc in game.items():
        action_grades[move_key] = {}
        for move_index in range(0, len(move_desc["move_selectable_events"])):
            for move_dict in move_desc["move_look_ahead"]:
                # if move_dict['event'] == move_desc["move_selectable_events"][move_index]:
                # 'data': {'piece': 'Pawn', 'src': 'd2', 'dst': 'd3'}
                look_ahead_key = str(move_dict['event']['data']['piece']) + " " + str(move_dict['event']['data']['dst'])
                action_grades[move_key][look_ahead_key] = calculate_state_grade(individual, move_dict['Attributes'])

    # Created dictionary

    # Todo - calculate the probability of the chosen event to be chosen (1 - x/x*)
    # In order to calculate the probability of the chosen event to be chosen we need to sum up all R \ B event values,
    # divide each value by the sum and get a probability

    probabilities = {}
    for (move, grades) in action_grades.items():
        probabilities[move] = {}
        values_sum = sum(action_grades[move].values())
        for event in grades.keys():
            probabilities[move][event] = round(grades[event] / values_sum, 3)

    # chosen_event_err_probability = 1 - probabilities[chosen_event['data']['piece'] + " " + chosen_event['data'][
    # 'dst']]

    # Todo - calculate mean square error and return it as the fitness of the individual

    mse_sum = 0  # Mean Squared Error
    mse_counter = 0
    fitness_counter = 0
    # number_of_selectable_events = float(len(game[key_fitness]["move_selectable_events"]))
    # played_event_key = game[key_fitness]["move_played_event"]['data']['piece'] + " " + \
    #                    game[key_fitness]["move_played_event"]['data']['dst']

    for move_number, events_probabilities in probabilities.items():
        max_prob = max(events_probabilities.values())
        max_prob_key = None
        for e in events_probabilities.keys():
            if events_probabilities[e] == max_prob:
                max_prob_key = e
                break
        played_event = str(game[move_number]['move_played_event']['data']['piece']) + " " + \
                       str(game[move_number]["move_played_event"]['data']['dst'])
        if played_event == max_prob_key:
            fitness_counter += 1

    fitness_val = float(fitness_counter) / float(len(game))

    return fitness_val


def init_individual(range_min, range_max, genome_size):
    import numpy as np
    individual = np.random.randint(range_min, range_max, size=genome_size)
    return list(individual)


def init_population(population_size, genome_size):
    population = []
    for i in range(0, population_size):
        population.append(init_individual(WEIGHT_RANGE_MIN, WEIGHT_RANGE_MAX, genome_size))
    return population


def selection(population, key, game):  # select one individual using tournament selection
    tournament = [random.choice(population) for i in range(TOURNAMENT_SIZE)]
    fitnesses = [fitness(tournament[i], game) for i in range(TOURNAMENT_SIZE)]
    return tournament[fitnesses.index(max(fitnesses))]


def crossover(parent1, parent2):  # single-point crossover
    xo_point = random.randint(1, GENOME_SIZE - 1)
    return ([
        parent1[0:xo_point] + parent2[xo_point:GENOME_SIZE],
        parent2[0:xo_point] + parent1[xo_point:GENOME_SIZE]])


def mutation(individual):  # bitwise mutation with probability PROB_MUTATION
    return individual


def print_population(population_for_printing, key, pop_size, data_len, game):
    # fitnesses = [fitness(population_for_printing[index], key) for index in range(pop_size)]
    fitnesses = []
    for index in range(pop_size):
        fitnesses.append(fitness(population_for_printing[index], game))

    # print(list(zip(population_for_printing, fitnesses)))

    print("Best => " + str(max(fitnesses)) + ",\t Worst => " + str(min(fitnesses)) +
          ",\t Avg => " + str(statistics.mean(fitnesses)) +
          ",\t Median => " + str(statistics.median(fitnesses)))

    for index in range(pop_size):
        if fitnesses[index] == max(fitnesses):
            return population_for_printing[index]


def filter_major_attributes(attributes):
    major_attributes = {}
    for attribute in attributes:
        if not attribute.startswith('CTX'):
            major_attributes[attribute] = attributes[attribute]
    return major_attributes


def run_GA(pop_size, generations, tournament_size, mutation_probability, genome_size, key, data_len, game):
    random.seed()  # initialize internal state of random number generator
    population = init_population(pop_size, genome_size)  # generation 0

    best_individual_in_population = []

    for gen in range(1, generations + 1):
        print("Generation ", gen)

        best_individual_in_population = print_population(population, key, pop_size, data_len, game)

        nextgen_population = []

        for i in range(int(pop_size / 2)):
            parent1 = selection(population, key, game)
            parent2 = selection(population, key, game)
            offspring = crossover(parent1, parent2)
            nextgen_population.append(mutation(offspring[0]))
            nextgen_population.append(mutation(offspring[1]))
        population = nextgen_population

    return best_individual_in_population  # best individual last gen


# columns_names = ['selectable_events', 'major_attributes', 'look_ahead_attributes', 'event_played']

if __name__ == '__main__':

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

            games_data['game_' + str(analyzed_game_index) + '_move_' + str(counter) + "_" + ("White" if white else "Black")] = move

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

    # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Start: Games Description file => Python Dictionary ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    # games_pgn_dictionary = {}
    # game_index = 1
    # with open("GamesDescription.txt") as file:
    #     for line in file:
    #         game_dictionary = ast.literal_eval(line)
    #         games_pgn_dictionary["game_" + str(game_index)] = game_dictionary['pgn']
    #         game_index += 1
    #
    # games_modular_pgn_dictionary = {}
    #
    # for game_dict_index, game_pgn in games_pgn_dictionary.items():
    #     modular_pgn = game_pgn.replace("...", ".").split(" ")[1::2]
    #     games_modular_pgn_dictionary[game_dict_index] = modular_pgn
    #
    # # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ End: Games Description file => Python Dictionary ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    #
    # # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Pandas ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    #
    # num_of_columns = selectable_moves_max_length * GENOME_SIZE
    # num_of_rows = len(games_data)
    #
    # # columns = ["nothing", "takes", "check", "mate", "PGN_move"]
    # # columns.extend(list(games_data["game_1_move_1_White"]["move_major_attributes"].keys()))
    # # for index in range(1, selectable_moves_max_length):
    # #     columns.append("s_move_" + str(index) + "_description")
    # #     for att in range(1, GENOME_SIZE + 1):
    # #         columns.append("s_move_" + str(index) + "_att_" + str(att))
    # #
    # # columns.append("Y")
    #
    # """df = pd.DataFrame(columns=columns)
    # i = 0
    # for move_key, move_value in games_data.items():
    #     tokens = move_key.split('_')
    #     # print(tokens)
    #     game_number = int(tokens[1])
    #     move_number = int(tokens[3])
    #     white_turn = True if tokens[4] == "White" else False
    #     # print("game_" + str(game) + "_move_" + str(move) + "_" + ("White" if white_turn else "Black") + "\n")
    #     move_in_pgn = ((games_modular_pgn_dictionary["game_" + str(game_number)])[(move_number * 2) - 2 if white_turn else (move_number * 2 - 1)])
    #     check = 1 if move_in_pgn[-1] == '+' else 0
    #     mate = 1 if move_in_pgn[-1] == '#' else 0
    #     takes = 1 if 'x' in move_in_pgn else 0
    #     nothing = 1 if check == 0 and mate == 0 and takes == 0 else 0
    #     s_move = 1
    #     row = {"nothing": nothing, "takes": takes, "check": check, "mate": mate, "PGN_move": move_in_pgn}
    #     row.update(
    #         (games_data["game_" + str(game_number) + "_move_" + str(move_number) + ("_White" if white_turn else "_Black")])["move_major_attributes"])
    #     for index in range(0, selectable_moves_max_length):
    #         if index < len(move_value['move_look_ahead']):
    #             row["s_move_" + str(index) + "_description"] = str((move_value['move_look_ahead'][index])['event']['data']['piece']) + " " + \
    #                                                            str((move_value['move_look_ahead'][index])['event']['data']['dst'])
    #             look_ahead = list(
    #                 move_value['move_look_ahead'][index]['Attributes'][0].values())  # Create look ahead for each s_move
    #         else:
    #             row["s_move_" + str(index) + "_description"] = NONE_VALUE
    #             look_ahead = [NONE_VALUE] * GENOME_SIZE
    #         att = 1
    #         for attribute in look_ahead:
    #             row["s_move_" + str(index) + "_att_" + str(att)] = attribute
    #             att += 1
    #         s_move += 1
    #
    #     # if type((((move_value["move_played_event"])['data'])['piece'])) is not dict:
    #     #     row["Y"] = str(((move_value["move_played_event"])['data'])['piece']) + " " + str(
    #     #         ((move_value["move_played_event"])['data'])['dst'])
    #     # else:
    #     #     row["Y"] = str(
    #     #         (((move_value["move_played_event"])['data'])['piece'])['subtype']) + " " + str(
    #     #         ((move_value["move_played_event"])['data'])['dst'])
    #
    #     move = (games_data["game_" + str(game_number) + "_move_" + str(move_number) + ("_White" if white_turn else "_Black")])
    #     row['Y'] = classify_label((move['move_played_event'])['data'], move['move_major_attributes'])
    #     # (games_data["game_" + str(game_number) + "_move_" + str(move_number) + ("_White" if white_turn else "_Black")][
    #     # 'move_selectable_events']).index(
    #     # games_data["game_" + str(game_number) + "_move_" + str(move_number) + ("_White" if white_turn else "_Black")]['move_played_event'])
    #
    #     df.loc[i] = row
    #     i += 1
    #
    # df.to_excel("data.xlsx")"""

    # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Pandas ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    columns_single_move = ["Game number", "Move number", "Move Description",
                           "Piece Advisor: Pawn", "Piece Advisor: Bishop", "Piece Advisor: Knight", "Piece Advisor: Rook", "Piece Advisor: Queen",
                           "Piece Moves Counter: Pawn moves", "Piece Moves Counter: Bishop moves", "Piece Moves Counter: Knight moves",
                           "Piece Moves Counter: Rook moves", "Piece Moves Counter: Queen moves",
                           u"Strategy Advisor: Center", "Strategy Advisor: Develop", "Strategy Advisor: Fianchetto",
                           "Strategy Counter: Center strengthen moves", "Strategy Counter: Developing moves", "Strategy Counter: Fianchetto moves",
                           "Game Plan Counter: Scholars Mate", "Game Plan Counter: Deceiving Scholars Mate", "Game Plan Counter: Fried Liver Attack",
                           "Game Plan Counter: Capturing Space", "Game Plan Counter: Strengthen Pawn Structure",
                           "Moves Counter: Attacking", "Moves Counter: Defending", "Moves Counter: Preventing b4, g4 Attacks",
                           "Developing the queen too early"
                           ]

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
            move = (games_data["game_" + str(game_number) + "_move_" + str(move_number) + ("_White" if white_turn else "_Black")])

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
                    selectable_move_str = prefix_dictionary[move['move_selectable_events'][index]['data']['piece']['subtype']] + \
                                          move['move_selectable_events'][index]['data']['dst']
                # print(selectable_move_str + "," + str(game_number) + "," + str(move_number))
                row['Move Description'] = selectable_move_str
                row["Move number"] = move_number
                row["Game number"] = game_number
                df_single_move.loc[index_single_move] = row
                index_single_move += 1

df_single_move.drop_duplicates(inplace=True)
test = df_single_move.reset_index(drop=True)
df_single_move.reset_index(drop=True, inplace=True)

df_single_move.to_excel("my_new_test.xlsx")
# df_single_move.to_excel("[YourDataFileName].xlsx")


# for key, move in game.items():
#     print("Move Inspected : " + str(key))
#     # time.sleep(3)
# key = "move"
# best_individual = run_GA(POP_SIZE, GENERATIONS, TOURNAMENT_SIZE, PROB_MUTATION, GENOME_SIZE, key, data_len, game)
# print("Best individual of this move: " + str(best_individual))
# time.sleep(3)
#
# for move_num, move_info in game.items():
#
#     print("\nMove:", move_num)
#
#     for key in move_info:
#         print(key + ':', (move_info[key]))

print('\nData Is Ready!!')

# clf = DecisionTreeClassifier()
# Y = df['Y']
# print(Y)

# Todo : Action Items
# Todo : 1. Normalize Data
# Todo : 2. Divide D\ata by move number ( 1/3, 1/3, 1/3 )
# Todo : 3. Divide Data to 70% train, 30% test, cross validation, by move number
# Todo : 4. Run Linear Regression, Decision Tree Regression , tiny GP, all get Sc(a)
# Todo : 5. Run Decision Tree Classifier , get ( sc, [(a1, sc(a1),... , (an, sc(an)] )
