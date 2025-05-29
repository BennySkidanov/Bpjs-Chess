import json
import os
import re
import sqlite3
import pandas as pd
from typing import Dict, List, Any, Tuple


class ChessMoveAnalyzer:
    """Main class for analyzing chess moves and storing them in database."""

    # Configuration constants
    POP_SIZE = 150
    ELITISM = 2
    GENERATIONS = 100
    TOURNAMENT_SIZE = 5
    PROB_MUTATION = 0.1
    GENOME_SIZE = 34
    WEIGHT_RANGE_MIN = -10
    WEIGHT_RANGE_MAX = 10
    NUMBER_OF_ANALYZED_GAMES = 1
    NONE_VALUE = -1

    # Chess notation constants
    CHECK_SIGN = '+'
    MATE_SIGN = '#'
    TAKES_SIGN = 'x'

    # Fixed columns (first 7)
    FIXED_COLUMNS = [
        "Game_number",
        "Move_number",
        "Move_Description",
        "Board_State",
        "Predicted_Percentage",
        "Actual_Percentage",
        "SHAP"
    ]

    # Feature columns based on your new features
    FEATURE_COLUMNS = [
        "Piece_Exchange_Feature_Unworthy_Exchange",
        "Game_Plan_Counter_Scholars_Mate",
        "Game_Plan_Counter_Deceiving_Scholars_Mate",
        "Developing_the_queen_too_early",
        "Strategy_Counter_Fianchetto_moves",
        "Game_Plan_Counter_Fried_Liver_Attack",
        "Piece_Moves_Counter_Knight_moves",
        "Piece_Exchange_Feature_Worthwhile_Exchange",
        "Strategy_Counter_Developing_moves",
        "Moves_Counter_Preventing_b4__g4_Attacks",
        "Strategy_Counter_Center_strengthen_moves",
        "Piece_Exchange_Feature_Free_Piece",
        "Piece_Moves_Counter_Bishop_moves",
        "Game_Plan_Counter_Capturing_Space",
        "Piece_Moves_Counter_Queen_moves",
        "Moves_Counter_Pinning",
        "Piece_Moves_Counter_Rook_moves",
        "Moves_Counter_Defending",
        "Piece_Moves_Counter_Pawn_moves",
        "Moves_Counter_Attacking",
        "Game_Plan_Counter_Strengthen_Pawn_Structure",
        "Piece_Exchange_Feature_Even_Exchange"
    ]

    # Piece mappings
    PIECE_DICT = {
        1: 'K', 2: 'k', 3: 'Q', 4: 'q',
        5: 'B', 6: 'B', 7: 'b', 8: 'b',
        9: 'N', 10: 'N', 11: 'n', 12: 'n',
        13: 'R', 14: 'R', 15: 'r', 16: 'r',
        21: 'P', 22: 'P', 23: 'P', 24: 'P', 25: 'P', 26: 'P', 27: 'P', 28: 'P',
        31: 'p', 32: 'p', 33: 'p', 34: 'p', 35: 'p', 36: 'p', 37: 'p', 38: 'p'
    }

    PREFIX_DICTIONARY = {
        "Pawn": "", "Knight": "N", "Bishop": "B",
        "Rook": "R", "Queen": "Q", "King": "K"
    }

    def __init__(self, db_path: str = '../DB/1500/Explanations/chess_moves_test.db',
                 games_directory: str = '../GameSequences1500/WithSelectablesForExplanation'):
        """Initialize the analyzer with database connection and game directory."""
        self.db_path = db_path
        self.games_directory = games_directory
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()

        # Generate all column names
        self.all_columns = self._generate_all_columns()
        self.look_ahead_columns = [f"LOOK_AHEAD_{col}" for col in self.FEATURE_COLUMNS]
        print(self.all_columns)

    def _generate_all_columns(self) -> List[str]:
        """Generate complete list of column names."""
        return (self.FIXED_COLUMNS +
                self.FEATURE_COLUMNS +
                [f"LOOK_AHEAD_{col}" for col in self.FEATURE_COLUMNS] +
                ["Y"])

    def create_database_table(self) -> None:
        """Create the chess_moves table with all required columns."""
        # Build column definitions
        column_definitions = []

        # Fixed columns with their types
        column_types = {
            "Game_number": "INTEGER",
            "Move_number": "INTEGER",
            "Move_Description": "TEXT",
            "Board_State": "TEXT",
            "Predicted_Percentage": "FLOAT",
            "Actual_Percentage": "FLOAT",
            "SHAP": "BLOB"
        }

        for col in self.FIXED_COLUMNS:
            column_definitions.append(f"{col} {column_types[col]}")

        # Feature columns (all INTEGER)
        for col in self.FEATURE_COLUMNS:
            column_definitions.append(f"{col} FLOAT")

        # Look-ahead columns (all INTEGER)
        for col in self.look_ahead_columns:
            column_definitions.append(f"{col} FLOAT")

        # Target column
        column_definitions.append("Y INTEGER")

        # Create table
        create_sql = f"""
        CREATE TABLE IF NOT EXISTS chess_moves (
            {', '.join(column_definitions)}
        )"""

        self.cursor.execute(create_sql)
        self.conn.commit()

    def filter_major_attributes(self, attributes: Dict[str, Any]) -> Dict[str, Any]:
        """Filter out CTX attributes from move attributes."""
        return {k: v for k, v in attributes.items() if not k.startswith('CTX')}

    def get_board_state(self, attributes: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract board cell information from attributes."""
        cells = []
        pattern = r"^CTX\.Entity:\s[a-z]\d"
        for attribute, value in attributes.items():
            if re.match(pattern, attribute):
                cells.append(value)
        return cells

    def draw_board_from_cells(self, cells: List[Dict[str, Any]]) -> str:
        """Convert cell data to ASCII board representation."""
        board = [["." for _ in range(8)] for _ in range(8)]

        for cell in cells:
            if 'pieceId' in cell:
                piece_id = int(cell['pieceId'].split('_')[1])
                piece = self.PIECE_DICT.get(piece_id, '?')
                row = int(cell['j']) - 1
                col = ord(cell['i']) - ord('a')
                if 0 <= row < 8 and 0 <= col < 8:
                    board[row][col] = piece

        lines = ["  +---+---+---+---+---+---+---+---+"]
        for rank in range(7, -1, -1):
            row_str = f"{rank + 1} | " + " | ".join(board[rank]) + " |"
            lines.append(row_str)
            lines.append("  +---+---+---+---+---+---+---+---+")
        lines.append("    a   b   c   d   e   f   g   h")

        return "\n".join(lines)

    def format_move_description(self, selectable_event: Dict[str, Any]) -> str:
        """Format move description from selectable event data."""
        try:
            piece_data = selectable_event['data']['piece']
            dst_data = selectable_event['data']['dst']

            if isinstance(piece_data, str):
                piece_prefix = self.PREFIX_DICTIONARY.get(piece_data, "")
                dst = dst_data['id'] if isinstance(dst_data, dict) else str(dst_data)
            else:
                piece_prefix = self.PREFIX_DICTIONARY.get(piece_data.get('subtype', ''), "")
                dst = dst_data if isinstance(dst_data, str) else str(dst_data)

            return f"{piece_prefix}{dst}"
        except (KeyError, TypeError):
            return "Unknown"

    def create_row_data(self, move_data: Dict[str, Any], selectable_index: int,
                        game_number: int, move_number: int) -> Dict[str, Any]:
        """Create a complete row of data for database insertion."""
        selectable_event = move_data['move_selectable_events'][selectable_index]
        major_attributes = move_data['move_major_attributes']
        look_ahead_data = move_data['move_look_ahead'][selectable_index]['Attributes'][0]

        # Initialize row with fixed columns
        row = {
            'Game_number': game_number,
            'Move_number': move_number,
            'Move_Description': self.format_move_description(selectable_event),
            'Predicted_Percentage': 0.0,
            'Actual_Percentage': 0.0,
            'SHAP': None,
            'Y': 1 if move_data['move_played_event'] == selectable_event else 0
        }

        row['Board_State'] = self.draw_board_from_cells(move_data['board_cells'])

        # Add feature columns from major attributes
        for feature_col in self.FEATURE_COLUMNS:
            # Convert database column name back to original feature name
            original_key = feature_col.replace('__', ', ').replace('_', ' ').replace(' Feature ', ' Feature: ').replace(' Counter ', ' Counter: ')
            #print(original_key)
            row[feature_col] = major_attributes.get(original_key, -1)
        # Add look-ahead columns
        for i, feature_col in enumerate(self.FEATURE_COLUMNS):
            look_ahead_col = f"LOOK_AHEAD_{feature_col}"
            original_key = feature_col.replace('__', ', ').replace('_', ' ').replace(' Feature ', ' Feature: ').replace(' Counter ', ' Counter: ')
            #print(look_ahead_col)
            row[look_ahead_col] = look_ahead_data.get(original_key, -1)

        return row

    def insert_row(self, row_data: Dict[str, Any]) -> None:
        """Insert a single row into the database."""
        columns = list(row_data.keys())
        placeholders = ', '.join(['?' for _ in columns])
        column_names = ', '.join(columns)

        sql = f"INSERT INTO chess_moves ({column_names}) VALUES ({placeholders})"
        values = tuple(row_data[col] for col in columns)

        self.cursor.execute(sql, values)

    def load_game_data(self, game_path: str, game_index: int) -> Dict[str, Dict[str, Any]]:
        """Load and process game data from JSON file."""
        with open(game_path, 'r') as file:
            json_data = json.load(file)

        games_data = {}
        counter = 1
        white = True
        print(f"Game index {game_index} \n\n")

        for move_description in json_data:
            white = move_description['SelectedEvent']["data"]["color"] == "White"
            move = {
                'move_selectable_events': move_description['SelectableEvents'],
                'move_major_attributes': self.filter_major_attributes(
                    move_description['CurrentAttributes']
                ),
                'move_look_ahead': move_description['SelectableEventsLookAhead'],
                'move_played_event': move_description['SelectedEvent'],
                'board_cells': self.get_board_state(move_description['CurrentAttributes'])
            }

            game_key = f"game_{game_index}_move_{counter}_{'White' if white else 'Black'}"
            games_data[game_key] = move

            print("White: ", white)
            if not white:
                counter += 1
        print("\n\n\n\n")
        return games_data

    def process_games(self) -> None:
        """Main processing function to analyze games and populate database."""
        print("Starting chess move analysis...")

        # Create database table
        self.create_database_table()

        # Process each game
        for game_index in range(1, self.NUMBER_OF_ANALYZED_GAMES + 1):
            game_path = os.path.join(self.games_directory, f'Game{game_index}.json')

            if not os.path.exists(game_path):
                print(f"Warning: Game file {game_path} not found")
                continue

            # Load game data
            games_data = self.load_game_data(game_path, game_index)

            # Process each move
            move_count = 0
            for move_key, move_data in games_data.items():
                # Parse move key
                tokens = move_key.split('_')
                game_number = int(tokens[1])
                move_number = int(tokens[3])
                is_white_turn = tokens[4] == "White"

                # Only process white moves for now (as in original code)
                if is_white_turn:
                    # Process each selectable move
                    for selectable_index in range(len(move_data['move_selectable_events'])):
                        row_data = self.create_row_data(
                            move_data, selectable_index, game_number, move_number
                        )
                        self.insert_row(row_data)
                        move_count += 1

                        if move_count % 1000 == 0:
                            pass
                            #print(f"Processed {game_index} game {move_count} moves")

        # Commit changes
        self.conn.commit()
        print("Analysis complete!")

    def close(self) -> None:
        """Close database connection."""
        if self.conn:
            self.conn.close()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()


def main():
    """Main execution function."""
    print(f"Current working directory: {os.getcwd()}")

    try:
        db_path = "../DB/1500/WithSelectablesAfterFix/chess_moves_test.db"
        game_directory = f"../GameSequences1500/WithSelectablesAfterFix"
        with ChessMoveAnalyzer(db_path, game_directory) as analyzer:
            analyzer.process_games()
        print("Data processing completed successfully!")

    except Exception as e:
        print(f"Error occurred: {str(e)}")
        raise


if __name__ == '__main__':
    main()