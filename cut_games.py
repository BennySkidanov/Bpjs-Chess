import argparse
import os
import chess
import chess.pgn

def filter_pgn(input_pgn, output_pgn):
    with open(input_pgn, 'r') as pgn_file:
        while True:
            pgn_game = chess.pgn.read_game(pgn_file)
            #print("DEBUG - pgn_game: ", pgn_game.mainline_moves())
            if pgn_game is None:
                break
            board = pgn_game.board()
            filtered_game = chess.pgn.Game()
            castling_moves = 0
            total_moves = 0
            had_checkmate = False
            check_board= board.copy()
            second_castling_index = 0
            for move in pgn_game.mainline_moves():
                total_moves += 1
                if board.is_castling(move):
                    castling_moves += 1
                    if castling_moves == 2:
                        second_castling_index = total_moves
                board.push(move)
            #print(board)
            #print(pgn_game.headers["Result"] + " " + pgn_game.headers["White"] + " - " + pgn_game.headers["Black"])
            #print("Total moves: " + str(total_moves) + ", castling moves: " + str(castling_moves) + ", checkmate: " + str(had_checkmate))
            #if had_checkmate == False:
                #continue no need to checkmate because a lot of data is lost
            if castling_moves == 2:
                node = filtered_game
                moves_counted = 0
                for move in pgn_game.mainline_moves():
                    node = node.add_variation(move)
                    moves_counted += 1
                    if moves_counted == second_castling_index:
                        break
            elif total_moves >= 20:
                moves_count = 0
                node = filtered_game
                for move in pgn_game.mainline_moves():
                    node = node.add_variation(move)
                    moves_count += 1
                    if moves_count == 20:
                        break
            else:  # Not enough moves
                continue

            filtered_game.headers = pgn_game.headers
            #print("DEBUG - filtered_game: ", filtered_game.mainline_moves())
            with open(output_pgn, 'a') as output_file:
                output_file.write(str(filtered_game) + "\n\n")

# def process_directory(input_dir, output_dir):
#     if not os.path.exists(output_dir):
#         os.makedirs(output_dir)
#
#     for file_name in os.listdir(input_dir):
#         if file_name.endswith(".pgn"):
#             input_file_path = os.path.join(input_dir, file_name)
#             print("Processing " + input_file_path)
#             output_file_path = os.path.join(output_dir, file_name)
#             print("Writing to " + output_file_path)
#             filter_pgn(input_file_path, output_file_path)

if __name__ == "__main__":
    # parser = argparse.ArgumentParser(description='Cuts pgn games')
    # parser.add_argument('input_dir', help='Path to the input directory containing PGN files')
    # parser.add_argument('output_dir', help='Path to the output directory for processed PGN files')
    #
    # args = parser.parse_args()
    #
    # input_directory = args.input_dir
    # output_directory = args.output_dir

    #process_directory(input_directory, output_directory)
    filter_pgn("Check/38_2018.pgn", "Check/38_2018_cut_after.pgn")
