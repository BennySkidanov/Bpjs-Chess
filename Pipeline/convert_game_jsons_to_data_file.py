import json
import math
import os
import re
import sqlite3
import pandas as pd
from typing import Dict, List, Any, Tuple


class ChessMoveAnalyzer:
    """Main class for analyzing chess moves and storing them in database."""

    # Configuration constants
    GAMES_PER_FILE = 500

    # Train/validation/test split ratios
    TRAIN_RATIO = 0.7
    VAL_RATIO = 0.15
    TEST_RATIO = 0.15

    # Fixed columns (first 4)
    FIXED_COLUMNS = [
        "Game_number",
        "Move_number",
        "Move_Description",
        "Y"
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

    def __init__(self, output_base_path: str = '../ParquetData',
                 games_directory: str = '../GameSequences1500/WithSelectablesFixed',
                 total_games: int = 1000):
        """Initialize the analyzer with output directory and game directory."""
        self.output_base_path = output_base_path
        self.games_directory = games_directory
        self.total_games = total_games

        # Calculate splits
        self.train_games = int(total_games * self.TRAIN_RATIO)
        self.val_games = int(total_games * self.VAL_RATIO)
        self.test_games = total_games - self.train_games - self.val_games

        # Calculate number of files needed for each split
        self.train_files = math.ceil(self.train_games / self.GAMES_PER_FILE)
        self.val_files = math.ceil(self.val_games / self.GAMES_PER_FILE)
        self.test_files = math.ceil(self.test_games / self.GAMES_PER_FILE)

        print(f"Dataset split:")
        print(f"  Train: {self.train_games} games ({self.train_files} files)")
        print(f"  Validation: {self.val_games} games ({self.val_files} files)")
        print(f"  Test: {self.test_games} games ({self.test_files} files)")

        # Generate all column names
        self.all_columns = self._generate_all_columns()
        self.look_ahead_columns = [f"LOOK_AHEAD_{col}" for col in self.FEATURE_COLUMNS]

        # Create output directories
        self._create_output_directories()

        # Initialize data storage
        self.current_data = []
        self.current_game_count = 0
        self.current_split = 'train'
        self.current_file_index = 0

    def _generate_all_columns(self) -> List[str]:
        """Generate complete list of column names."""
        return (self.FIXED_COLUMNS +
                self.FEATURE_COLUMNS +
                [f"LOOK_AHEAD_{col}" for col in self.FEATURE_COLUMNS])

    def _create_output_directories(self) -> None:
        """Create output directories for train/val/test splits."""
        for split in ['train', 'val', 'test']:
            split_path = os.path.join(self.output_base_path, split)
            os.makedirs(split_path, exist_ok=True)

    def _get_current_split(self, game_number: int) -> str:
        """Determine which split the current game belongs to."""
        if game_number <= self.train_games:
            return 'train'
        elif game_number <= self.train_games + self.val_games:
            return 'val'
        else:
            return 'test'

    def _save_current_batch(self) -> None:
        """Save current batch of data to Parquet file."""
        if not self.current_data:
            return

        # Create DataFrame
        df = pd.DataFrame(self.current_data)

        # Ensure all columns are present
        for col in self.all_columns:
            if col not in df.columns:
                if col in self.FEATURE_COLUMNS + self.look_ahead_columns:
                    df[col] = 0.0
                elif col in ['Game_number', 'Move_number', 'Y']:
                    df[col] = 0
                else:
                    df[col] = ""

        # Reorder columns
        df = df[self.all_columns]

        # Save to Parquet
        filename = f"{self.current_split}_batch_{self.current_file_index:03d}.parquet"
        filepath = os.path.join(self.output_base_path, self.current_split, filename)


        df.to_parquet(filepath, index=False, engine='pyarrow')
        print(f"Saved {len(df)} rows to {filepath}")

        # Reset current data
        self.current_data = []
        self.current_game_count = 0

    def _check_and_save_batch(self, game_number: int) -> None:
        """Check if we need to save current batch and start a new one."""
        new_split = self._get_current_split(game_number)

        # If we've reached the games per file limit OR switched splits
        if (self.current_game_count >= self.GAMES_PER_FILE or
                new_split != self.current_split):

            # Save current batch
            self._save_current_batch()

            # Update split and file index
            if new_split != self.current_split:
                self.current_split = new_split
                self.current_file_index = 0
            else:
                self.current_file_index += 1


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
            'Y': 1 if move_data['move_played_event'] == selectable_event else 0
        }

        #row['Board_State'] = self.draw_board_from_cells(move_data['board_cells'])

        # Add feature columns from major attributes
        for feature_col in self.FEATURE_COLUMNS:
            # Convert database column name back to original feature name
            original_key = feature_col.replace('__', ', ').replace('_', ' ').replace(' Feature ', ' Feature: ').replace(' Counter ', ' Counter: ').replace(' Advisor ', ' Advisor: ')
            #print(original_key)
            row[feature_col] = major_attributes.get(original_key, -1)
        # Add look-ahead columns
        for i, feature_col in enumerate(self.FEATURE_COLUMNS):
            look_ahead_col = f"LOOK_AHEAD_{feature_col}"
            original_key = feature_col.replace('__', ', ').replace('_', ' ').replace(' Feature ', ' Feature: ').replace(' Counter ', ' Counter: ').replace(' Advisor ', ' Advisor: ')
            #print(look_ahead_col)
            row[look_ahead_col] = look_ahead_data.get(original_key, -1)

        return row

    def load_game_data(self, game_path: str, game_index: int) -> Dict[str, Dict[str, Any]]:
        """Load and process game data from JSON file."""
        with open(game_path, 'r') as file:
            json_data = json.load(file)

        games_data = {}
        counter = 1
        #white = True
        #print(f"Game index {game_index} \n\n")

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

            #print(f"Move index {counter} White: {white}")
            if not white:
                counter += 1
        #print("\n\n\n\n")
        return games_data

    def process_games(self) -> None:
        """Main processing function to analyze games and create Parquet files."""
        print("Starting chess move analysis...")
        print(f"Processing {self.total_games} games total")

        # Process each game
        for game_index in range(1, self.total_games + 1):
            game_path = os.path.join(self.games_directory, f'Game{game_index}.json')

            if not os.path.exists(game_path):
                print(f"Warning: Game file {game_path} not found")
                continue

            # Check if we need to save current batch before processing new game
            self._check_and_save_batch(game_index)

            # Load game data
            games_data = self.load_game_data(game_path, game_index)

            # Process each move
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
                        self.current_data.append(row_data)

            # Increment game count for current batch
            self.current_game_count += 1

            if game_index % 1000 == 0:
                print(f"Processed {game_index} games")

        # Save any remaining data
        self._save_current_batch()
        print("Analysis complete!")

    def get_dataset_info(self) -> Dict[str, Any]:
        """Get information about the created dataset."""
        info = {
            'total_games': self.total_games,
            'games_per_file': self.GAMES_PER_FILE,
            'splits': {
                'train': {
                    'games': self.train_games,
                    'files': self.train_files,
                    'ratio': self.TRAIN_RATIO
                },
                'val': {
                    'games': self.val_games,
                    'files': self.val_files,
                    'ratio': self.VAL_RATIO
                },
                'test': {
                    'games': self.test_games,
                    'files': self.test_files,
                    'ratio': self.TEST_RATIO
                }
            },
            'columns': self.all_columns,
            'output_path': self.output_base_path
        }
        return info


def main():
    """Main execution function."""
    print(f"Current working directory: {os.getcwd()}")

    try:
        # Configuration
        output_path = "../ParquetData/1500"
        game_directory = "../GameSequences1500/WithSelectablesAfterFix"
        total_games = 5000  # Change this to your actual number of games

        # Create analyzer and process games
        analyzer = ChessMoveAnalyzer(
            output_base_path=output_path,
            games_directory=game_directory,
            total_games=total_games
        )

        analyzer.process_games()

        # Print dataset information
        info = analyzer.get_dataset_info()
        print("\nDataset Information:")
        print(f"Total games: {info['total_games']}")
        print(f"Games per file: {info['games_per_file']}")
        print(f"Output directory: {info['output_path']}")
        print("\nSplit details:")
        for split_name, split_info in info['splits'].items():
            print(
                f"  {split_name}: {split_info['games']} games in {split_info['files']} files ({split_info['ratio']:.1%})")

        print("\nData processing completed successfully!")

    except Exception as e:
        print(f"Error occurred: {str(e)}")
        raise


if __name__ == '__main__':
    main()