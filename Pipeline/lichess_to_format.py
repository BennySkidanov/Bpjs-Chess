def extract_moves_from_pgn(pgn):
    moves = []
    lines = pgn.split('\n')
    for line in lines:
        if line.strip().startswith('1.'):
            moves.append(line.strip())
    return moves

def main():
    input_file = "../14_2017.pgn"
    output_file = "../PGNData.txt"

    with open(input_file, "r") as file:
        pgn_data = file.read()

    games = pgn_data.strip().split('[Event')[1:]  # Exclude first empty item

    with open(output_file, "w") as file:
        for game in games:
            moves = extract_moves_from_pgn(game)
            moves = "".join(moves)
            if moves:  # Check if moves are present before writing to file
                file.write(moves + '\n')

if __name__ == "__main__":
    main()
