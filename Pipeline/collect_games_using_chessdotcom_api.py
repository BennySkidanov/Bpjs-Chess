import ast
from tabulate import tabulate
from chessdotcom import *
import requests
import re
import pandas as pd
from pprint import pprint
import json

index_difference = 5

NUMBER_OF_GAMES = 300

# action items :
# 1. create pgn - v
# 2. csv ( check if there is something that converts automatically ) - v
# 3. request -> wait for ( bp ) , main should get pgn and create external events for every move (or using b-thread) - v
# 4. run games and generate a row in database for every state -

# using a data json, filtering of suitable games can be made
data_json = {
    "rated": True,
    "time_class": "rapid",
    "rules": "chess",
    "white": {
        "min_rating": 0,
        "max_rating": 0,
        "result": "win"
    },
    "black": {
        "min_rating": 0,
        "max_rating": 0,
        "result": "checkmated"
    }
}


def get_player_games(username, count):
    response = get_player_game_archives(username)

    list_of_games_endpoints = response.json['archives']

    number_of_games_endpoints = len(list_of_games_endpoints)

    player_games = return_suitable_games(list_of_games_endpoints, count, username)

    player_games_moves = []

    for i in range(0, len(player_games)):
        moves = generate_a_list_of_game_moves_from(player_games, i)
        # player_games[i]['moves'] = moves
        # player_games_moves.append(moves)
        # Games = clear_games_without_checkmate_ending(player_games_moves)
        PGN = format_game_to_pgn(moves)
        player_games[i]['PGN'] = PGN

        tokens = player_games[i]["url"].split("/")
        player_games[i]["game_id"] = tokens[-1]
        del player_games[i]['pgn']

    js = json.dumps(player_games, indent=2)
    # print(js)
    # val = ast.literal_eval(js)
    # val1 = json.loads(json.dumps(val))
    df = pd.DataFrame.from_dict(player_games)
    print(tabulate(df, headers='keys', tablefmt='psql'))

    id_and_pgn_list = []
    for game in player_games:
        id_and_pgn_list.append({"game_id": game["game_id"], "pgn": game["PGN"]})

    return id_and_pgn_list

    # return list<game> game:{id, player1id, player2id, ..., pgn:..}


def return_suitable_games(list_of_games_endpoints, count, username):
    num_of_games = 0
    suitable_games = []
    for archive in list_of_games_endpoints:
        response = requests.get(archive)
        games_json = response.json()
        games_list = games_json['games']
        for game in games_list:
            if is_qualifying_game(data_json["white"]["min_rating"], data_json["white"]["max_rating"], username, game):
                num_of_games += 1
                pgn_tokens = game['pgn'].split("\n")
                tokens = pgn_tokens[:-3]
                for token in tokens:
                    key = token.split("\"")[0][1:-1]
                    value = token.split("\"")[1]
                    game[key] = value
                suitable_games.append(game)

            if num_of_games >= count:
                return suitable_games


def game_properties_check(game):
    if game["rated"] == data_json["rated"]:
        if game["time_class"] == data_json["time_class"]:
            if game["rules"] == data_json["rules"]:
                if game["white"]["result"] == data_json["white"]["result"] and game["black"]["result"] == \
                        data_json["black"]["result"] or game["white"]["result"] == data_json["black"]["result"] and \
                        game["black"]["result"] == data_json["white"]["result"]:
                    return True
    return False


def is_qualifying_game(min_rating, max_rating, username, game):
    if is_rating_in_range(min_rating, max_rating, username, game):
        if game_properties_check(game):
            return True

    return False


def is_rating_in_range(min_rating, max_rating, username, game):
    white_player = game['white']
    black_player = game['black']
    if min_rating <= white_player['rating'] <= max_rating and min_rating <= black_player['rating'] <= max_rating:
        return True
    return False


def is_game_finished_properly(pgn):
    return True


def get_players_in_rating_range(min, max, minNumberOfGames):
    return "list of usernames"


def generate_database(minscore, maxscore, numberofplayers, numberofgamesperplayer):
    return "list of usernames"


def generate_a_list_of_game_moves_from(games_list, index):
    game_pgn = games_list[index]['pgn']

    pgn = game_pgn.split('\n\n')[1]

    splitted = re.split('{| }| ', pgn)

    index = 1

    l = len(splitted)

    moves = []

    while index < l:
        moves.append(splitted[index])
        index += index_difference

    return moves


def clear_games_without_checkmate_ending(moves_list):
    new_moves_list = []

    for i in range(0, len(moves_list)):
        if len(moves_list[i]) == 0:
            continue
        final_move = moves_list[i][-1]
        last_char = final_move[-1]
        if final_move[-1] == '#':
            new_moves_list.append(moves_list[i])
        else:
            continue

    return new_moves_list


def format_game_to_pgn(moves):
    PGN = ""
    counter = 1
    for i in range(0, len(moves), 2):
        PGN += (str(counter) + ". " + moves[i] + " ")
        if i + 1 < len(moves):
            PGN += (str(counter) + "... " + moves[i + 1] + " ")
        counter += 1

    return PGN


def main(username):
    data_json["white"]["min_rating"] = 1000
    data_json["black"]["min_rating"] = 1000
    data_json["white"]["max_rating"] = 1600
    data_json["black"]["max_rating"] = 1600
    Client.request_config['headers']['User-Agent'] = 'My Python Application. Contact me at email@example.com'

    id_and_pgn_list = get_player_games(username, NUMBER_OF_GAMES)
    from pprint import pprint
    pprint(id_and_pgn_list)

    with open('GamesDescription.txt', 'w') as f:
        for item in id_and_pgn_list:
            f.write("%s\n" % item)

    with open('PGNData.txt', 'w') as data_file:
        for item in id_and_pgn_list:
            data_file.write("%s\n" % item['pgn'])


if __name__ == "__main__":
    main("berlinm")  # player username on www.chess.com
